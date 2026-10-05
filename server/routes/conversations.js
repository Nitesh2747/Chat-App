import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { addUserToRoom, removeUserFromRoom, emitToUser, io } from '../index.js';
import Conversation from '../models/Conversation.js';
import requireAuth from '../middleware/requireAuth.js';
import FriendRequest from '../models/FriendRequest.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: req.user.id,
      hiddenFor: { $ne: req.user.id },
    }).populate('members', 'username').sort({ lastMessageAt: -1 });

    const counts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversations.map((c) => c._id) },
          user: { $ne: req.user.username },
          readBy: { $ne: req.user.username },
          system: { $ne: true }, // Exclude system messages from unread count
        },
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    const result = conversations.map((c) => ({
      ...c.toObject(),
      unreadCount: countMap[c._id.toString()] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Start (or reopen) a one-to-one chat
router.post('/dm', async (req, res) => {
  const { userId } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid user' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot start a chat with yourself' });
  }

  try {
    const other = await User.findById(userId);
    if (!other) return res.status(404).json({ error: 'User not found' });

    const isFriend = await FriendRequest.findOne({
      status: 'accepted',
      $or: [
        { from: req.user.id, to: userId },
        { from: userId, to: req.user.id },
      ],
    });
    if (!isFriend) return res.status(403).json({ error: 'You must be friends to start a chat' });

    const dmKey = [req.user.id, userId].sort().join('_');
    let conversation = await Conversation.findOne({ dmKey });

    if (!conversation) {
      try {
        conversation = await Conversation.create({
          isGroup: false,
          dmKey,
          members: [req.user.id, userId],
          createdBy: req.user.id,
        });
        [req.user.id, userId].forEach((id) => addUserToRoom(id, conversation._id.toString()));
      } catch (err) {
        if (err.code !== 11000) throw err;
        conversation = await Conversation.findOne({ dmKey });
      }
    }

    await conversation.populate('members', 'username');
    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Create a group
router.post('/group', async (req, res) => {
  const { name, memberIds } = req.body;

  if (!name?.trim() || name.trim().length > 40) {
    return res.status(400).json({ error: 'Group name must be 1-40 characters' });
  }
  if (!Array.isArray(memberIds) || !memberIds.every((id) => mongoose.isValidObjectId(id))) {
    return res.status(400).json({ error: 'Invalid members' });
  }

  const others = [...new Set(memberIds)].filter((id) => id !== req.user.id);
  if (others.length < 2) {
    return res.status(400).json({ error: 'A group needs at least 2 other members' });
  }

  try {
    const found = await User.countDocuments({ _id: { $in: others } });
    if (found !== others.length) {
      return res.status(404).json({ error: 'One or more users not found' });
    }

    const conversation = await Conversation.create({
      isGroup: true,
      name: name.trim(),
      members: [req.user.id, ...others],
      createdBy: req.user.id,
    });

    [req.user.id, ...others].forEach((id) => addUserToRoom(id, conversation._id.toString()));

    await conversation.populate('members', 'username');
    res.status(201).json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/:id/members', async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid user' });
  }

  try {
    const convo = await Conversation.findOne({ _id: req.params.id, members: req.user.id, isGroup: true });
    if (!convo) return res.status(403).json({ error: 'Not a member of this group' });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (convo.members.some((m) => m.toString() === userId)) {
      return res.status(409).json({ error: 'Already a member' });
    }

    convo.members.push(userId);
    await convo.save();
    await convo.populate('members', 'username');

    addUserToRoom(userId, convo._id.toString());
    emitToUser(userId, 'conversation added', {});
    io.to(convo._id.toString()).emit('member added', {
      conversationId: convo._id.toString(),
      member: { _id: target._id, username: target.username },
    });

    const sysMsg = await Message.create({
      conversation: convo._id,
      user: req.user.username,
      text: `${req.user.username} added ${target.username}`,
      system: true,
    });
    io.to(convo._id.toString()).emit('chat message', sysMsg);

    res.json(convo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!convo) return res.status(404).json({ error: 'Group not found' });
    if (convo.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can remove members' });
    }
    if (req.params.userId === convo.createdBy.toString()) {
      return res.status(400).json({ error: "The creator can't remove themselves" });
    }

    const targetUser = await User.findById(req.params.userId);

    convo.members = convo.members.filter((m) => m.toString() !== req.params.userId);
    await convo.save();

    removeUserFromRoom(req.params.userId, convo._id.toString());
    emitToUser(req.params.userId, 'removed from group', { conversationId: convo._id.toString() });
    io.to(convo._id.toString()).emit('member removed', {
      conversationId: convo._id.toString(),
      userId: req.params.userId,
    });

    const sysMsg = await Message.create({
      conversation: convo._id,
      user: req.user.username,
      text: `${req.user.username} removed ${targetUser?.username || 'a member'}`,
      system: true,
    });
    io.to(convo._id.toString()).emit('chat message', sysMsg);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, members: req.user.id });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    if (!convo.isGroup) {
      const otherId = convo.members.find((m) => m.toString() !== req.user.id);
      const otherExists = otherId && (await User.exists({ _id: otherId }));
      if (!otherExists) {
        await Message.deleteMany({ conversation: convo._id });
        await convo.deleteOne();
        return res.json({ success: true, hardDeleted: true });
      }
    }

    await Conversation.findByIdAndUpdate(convo._id, { $addToSet: { hiddenFor: req.user.id } });
    res.json({ success: true, hardDeleted: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
export default router;