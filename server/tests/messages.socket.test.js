import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Message from '../models/Message.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { createUser, as, makeFriends } from './helpers.js';
import {
  startSocketServer,
  stopSocketServer,
  connectSocket,
  waitForEvent,
  waitForRoom,
  pause,
} from './socketHelpers.js';

beforeAll(async () => {
  await connectDb();
  await startSocketServer();
});
afterAll(async () => {
  await stopSocketServer();
  await disconnectDb();
});
beforeEach(clearDb);

describe('sending messages over sockets', () => {
  let alice, bob, carol, convoId, aliceSocket, bobSocket;

  beforeEach(async () => {
    alice = await createUser('alice');
    bob = await createUser('bob');
    carol = await createUser('carol');
    await makeFriends(alice, bob);
    const dm = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
    convoId = dm.body._id;

    aliceSocket = await connectSocket(alice);
    bobSocket = await connectSocket(bob);
    await waitForRoom(convoId, 2);
  });

  afterEach(() => {
    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('delivers a message to the other person in real time', async () => {
    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'hello bob' });

    const msg = await received;
    expect(msg.text).toBe('hello bob');
    expect(msg.user).toBe('alice');
    expect(msg.conversation).toBe(convoId);
  });

  it('saves the message and marks it delivered to the online recipient', async () => {
    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'hello bob' });
    await received;

    const saved = await Message.findOne({ conversation: convoId });
    expect(saved.user).toBe('alice');
    expect(saved.deliveredTo).toEqual(['bob']);
  });

  it('trims spaces around the text', async () => {
    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: '   hi   ' });

    expect((await received).text).toBe('hi');
  });

  it('ignores an empty message', async () => {
    aliceSocket.emit('chat message', { conversationId: convoId, text: '   ' });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });

  it('ignores a message over 5000 characters', async () => {
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'a'.repeat(5001) });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });

  it('ignores a message sent to a conversation you are not part of', async () => {
    const carolSocket = await connectSocket(carol);
    carolSocket.emit('chat message', { conversationId: convoId, text: 'let me in' });
    await pause();
    carolSocket.disconnect();

    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });
});