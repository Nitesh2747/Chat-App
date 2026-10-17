import Message from '../models/Message.js';
import { as, makeFriends } from './helpers.js';
import { createChatWorld } from './chatWorld.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { startSocketServer, stopSocketServer, waitForEvent, pause } from './socketHelpers.js';

beforeAll(async () => {
  await connectDb();
  await startSocketServer();
});
afterAll(async () => {
  await stopSocketServer();
  await disconnectDb();
});
beforeEach(clearDb);

describe('replies', () => {
  let alice, carol, convoId, aliceSocket, bobSocket;

  beforeEach(async () => {
    ({ alice, carol, convoId, aliceSocket, bobSocket } = await createChatWorld());
  });

  afterEach(() => {
    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('stores a reference to the original and sends it with the original’s sender and text', async () => {
    const original = await Message.create({ conversation: convoId, user: 'bob', text: 'want pizza?' });

    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'yes!', replyTo: original._id.toString() });
    const msg = await received;

    expect(msg.text).toBe('yes!');
    expect(msg.replyTo._id).toBe(original._id.toString());
    expect(msg.replyTo.user).toBe('bob');
    expect(msg.replyTo.text).toBe('want pizza?');
  });

  it('keeps the quote when the chat history is loaded later', async () => {
    const original = await Message.create({ conversation: convoId, user: 'bob', text: 'want pizza?' });
    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'yes!', replyTo: original._id.toString() });
    await received;

    const history = await as(alice).get(`/api/messages/${convoId}`);
    const reply = history.body.find((m) => m.text === 'yes!');
    expect(reply.replyTo.text).toBe('want pizza?');
  });

  it('hides the quoted text once the original is deleted', async () => {
    const original = await Message.create({ conversation: convoId, user: 'bob', text: 'secret plan' });
    const received = waitForEvent(bobSocket, 'chat message');
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'ok', replyTo: original._id.toString() });
    await received;

    await Message.updateOne({ _id: original._id }, { deleted: true });

    const history = await as(alice).get(`/api/messages/${convoId}`);
    const reply = history.body.find((m) => m.text === 'ok');
    expect(reply.replyTo.deleted).toBe(true);
    expect(reply.replyTo.text).toBe('');
  });

  it('rejects a reply to a message from a different conversation', async () => {
    // alice also chats with carol; a message in THAT chat must not be quotable here
    await makeFriends(alice, carol);
    const other = await as(alice).post('/api/conversations/dm').send({ userId: carol.id });
    const secret = await Message.create({ conversation: other.body._id, user: 'carol', text: 'private to alice and carol' });

    aliceSocket.emit('chat message', { conversationId: convoId, text: 'sneaky', replyTo: secret._id.toString() });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });

  it('rejects a reply to a deleted message', async () => {
    const gone = await Message.create({ conversation: convoId, user: 'bob', text: 'oops', deleted: true });

    aliceSocket.emit('chat message', { conversationId: convoId, text: 'reply', replyTo: gone._id.toString() });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId, text: 'reply' })).toBe(0);
  });

  it('rejects a reply to a system message', async () => {
    const notice = await Message.create({ conversation: convoId, user: 'alice', text: 'alice joined', system: true });

    aliceSocket.emit('chat message', { conversationId: convoId, text: 'reply', replyTo: notice._id.toString() });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId, text: 'reply' })).toBe(0);
  });

  it('rejects a reply that points at an invalid id', async () => {
    aliceSocket.emit('chat message', { conversationId: convoId, text: 'reply', replyTo: 'not-an-id' });
    await pause();

    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });
});