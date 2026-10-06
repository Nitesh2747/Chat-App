import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Message from './models/Message.js';
import authRouter from './routes/auth.js';
import rateLimit from 'express-rate-limit';
import usersRouter from './routes/users.js';
import friendsRouter from './routes/friends.js';
import messagesRouter from './routes/messages.js';
import Conversation from './models/Conversation.js';
import conversationsRouter from './routes/conversations.js';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

app.use(helmet());
app.use(express.static('public'));
app.use(express.json({ limit: '50kb' }));
app.use(cors({ origin: process.env.CLIENT_URL }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', usersRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/conversations', conversationsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const onlineUsers = {}; // socket.id -> username
const userSockets = {}; // userId -> Set of socket.id
const typingByConversation = {}; // conversationId -> Set of usernames
const uniqueOnline = () => [...new Set(Object.values(onlineUsers))];
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function addUserToRoom(userId, roomId) {
  const socketIds = userSockets[userId];
  if (!socketIds) return;
  socketIds.forEach((id) => {
    const s = io.sockets.sockets.get(id);
    if (s) {
      s.join(roomId);
      s.emit('conversation added');
    }
  });
}

export function removeUserFromRoom(userId, roomId) {
  const socketIds = userSockets[userId];
  if (!socketIds) return;
  socketIds.forEach((id) => io.sockets.sockets.get(id)?.leave(roomId));
}

export function emitToUser(userId, event, payload) {
  const socketIds = userSockets[userId];
  if (!socketIds) return;
  socketIds.forEach((id) => io.sockets.sockets.get(id)?.emit(event, payload));
}

function getOnlineMembersInRoom(conversationId, excludeUsername) {
  const socketIds = io.sockets.adapter.rooms.get(conversationId) || new Set();
  const usernames = new Set();
  socketIds.forEach((id) => {
    const u = onlineUsers[id];
    if (u && u !== excludeUsername) usernames.add(u);
  });
  return [...usernames];
}

io.on('connection', (socket) => {
  const username = socket.user.username;
  onlineUsers[socket.id] = username;
  const userId = socket.user.id;
  if (!userSockets[userId])
    userSockets[userId] = new Set();
  userSockets[userId].add(socket.id);
  console.log('User connected:', username, socket.id);

  const roomsReady = Conversation.find({ members: socket.user.id })
    .then(async (convos) => {
      convos.forEach((c) => socket.join(c._id.toString()));
      const conversationIds = convos.map((c) => c._id);

      const result = await Message.updateMany(
        {
          conversation: { $in: conversationIds },
          user: { $ne: username },
          deliveredTo: { $ne: username },
        },
        { $addToSet: { deliveredTo: username } }
      );

      if (result.modifiedCount > 0) {
        const affected = await Message.find({
          conversation: { $in: conversationIds },
          deliveredTo: username,
          user: { $ne: username },
        }).select('_id conversation');

        const byConvo = {};
        affected.forEach((m) => {
          const key = m.conversation.toString();
          (byConvo[key] ||= []).push(m._id);
        });

        Object.entries(byConvo).forEach(async ([convId, ids]) => {
          io.to(convId).emit('delivered update', { conversationId: convId, ids, deliveredTo: username });
          const convo = await Conversation.findById(convId);
          if (convo?.lastMessage?.status === 'sent' && ids.map(String).includes(convo.lastMessage.messageId?.toString())) {
            await Conversation.findByIdAndUpdate(convId, { $set: { 'lastMessage.status': 'delivered' } });
          }
        });
      }
    })
    .catch((err) => console.error('Failed to join rooms:', err));

  socket.on('chat message', async ({ conversationId, text }) => {
    await roomsReady;
    if (!text?.trim() || text.length > 5000 || !socket.rooms.has(conversationId)) return;

    try {
      const deliveredTo = getOnlineMembersInRoom(conversationId, username);
      const saved = await Message.create({
        conversation: conversationId,
        user: username,
        text,
        deliveredTo,
      });
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          lastMessageAt: new Date(),
          lastMessage: {
            text: saved.text,
            user: saved.user,
            timestamp: saved.timestamp,
            messageId: saved._id,
            status: deliveredTo.length > 0 ? 'delivered' : 'sent',
          },
          hiddenFor: [],
        },
      });
      io.to(conversationId).emit('chat message', saved);
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  });

  socket.on('typing', async (conversationId) => {
    await roomsReady;
    if (!socket.rooms.has(conversationId)) return;

    if (!typingByConversation[conversationId]) {
      typingByConversation[conversationId] = new Set();
    }
    typingByConversation[conversationId].add(username);
    socket.to(conversationId).emit('typing', { conversationId, username });
  });

  socket.on('stop typing', async (conversationId) => {
    await roomsReady;
    if (!socket.rooms.has(conversationId)) return;

    typingByConversation[conversationId]?.delete(username);
    socket.to(conversationId).emit('stop typing', { conversationId, username });
  });

  socket.on('edit message', async ({ conversationId, messageId, text }) => {
    await roomsReady;
    if (!text?.trim() || text.length > 5000 || !socket.rooms.has(conversationId)) return;

    try {
      const message = await Message.findById(messageId);
      if (!message || message.conversation.toString() !== conversationId) {
        return socket.emit('edit error', { messageId, error: 'Message not found' });
      }
      if (message.user !== username) {
        return socket.emit('edit error', { messageId, error: 'Not your message' });
      }
      if (Date.now() - message.timestamp > EDIT_WINDOW_MS) {
        return socket.emit('edit error', { messageId, error: 'Edit window has expired' });
      }

      message.text = text.trim();
      message.edited = true;
      await message.save();

      io.to(conversationId).emit('message edited', {
        conversationId,
        messageId: message._id,
        text: message.text,
      });
      const convo = await Conversation.findById(conversationId);
      if (convo?.lastMessage?.messageId?.toString() === message._id.toString()) {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { 'lastMessage.text': message.text },
        });
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  });

  socket.on('delete message', async ({ conversationId, messageId }) => {
    await roomsReady;
    if (!socket.rooms.has(conversationId)) return;

    try {
      const message = await Message.findById(messageId);
      if (!message || message.conversation.toString() !== conversationId) return;
      if (message.user !== username) return;

      message.deleted = true;
      await message.save();

      io.to(conversationId).emit('message deleted', { conversationId, messageId: message._id });

      const convo = await Conversation.findById(conversationId);
      if (convo?.lastMessage?.messageId?.toString() === message._id.toString()) {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            lastMessage: {
              text: 'This message was deleted',
              user: username,
              timestamp: message.timestamp,
              messageId: message._id,
            },
          },
        });
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  });

  socket.on('messages read', async ({ conversationId, ids }) => {
    await roomsReady;
    if (!socket.rooms.has(conversationId) || !Array.isArray(ids)) return;
    try {
      await Message.updateMany(
        { _id: { $in: ids }, conversation: conversationId, user: { $ne: username } },
        { $addToSet: { readBy: username, deliveredTo: username } }
      );
      const convo = await Conversation.findById(conversationId);
      if (convo?.lastMessage?.messageId?.toString() === undefined) {
        // no-op guard, convo may lack lastMessage
      } else if (ids.map(String).includes(convo.lastMessage.messageId?.toString())) {
        await Conversation.findByIdAndUpdate(conversationId, { $set: { 'lastMessage.status': 'read' } });
      }
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`lastRead.${username}`]: Date.now() },
      });
      io.to(conversationId).emit('read update', { conversationId, ids, reader: username });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  });

  socket.on('join conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    userSockets[userId]?.delete(socket.id);
    if (userSockets[userId]?.size === 0)
      delete userSockets[userId];
    io.emit('online users', uniqueOnline());
    console.log('User disconnected:', username, socket.id);
    Object.entries(typingByConversation).forEach(([conversationId, typers]) => {
      if (typers.has(username)) {
        typers.delete(username);
        socket.to(conversationId).emit('stop typing', { conversationId, username });
      }
    });
  });

  io.emit('online users', uniqueOnline());
});

const PORT = 3001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));