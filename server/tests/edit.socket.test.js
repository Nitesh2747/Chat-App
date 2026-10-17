import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Message from '../models/Message.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { as, makeFriends } from './helpers.js';
import { startSocketServer, stopSocketServer, waitForEvent, waitForRoom, pause } from './socketHelpers.js';
import { createChatWorld } from './chatWorld.js';

beforeAll(async () => {
  await connectDb();
  await startSocketServer();
});
afterAll(async () => {
  await stopSocketServer();
  await disconnectDb();
});
beforeEach(clearDb);

const MINUTE = 60 * 1000;

describe('editing messages', () => {
  let alice, carol, convoId, aliceSocket, bobSocket, message;

  beforeEach(async () => {
    ({ alice, carol, convoId, aliceSocket, bobSocket } = await createChatWorld());
    message = await Message.create({ conversation: convoId, user: 'alice', text: 'original' });
  });

  afterEach(() => {
    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  function editAsAlice(text, extra = {}) {
    aliceSocket.emit('edit message', { conversationId: convoId, messageId: message._id.toString(), text, ...extra });
  }

  it('lets the sender edit, and tells everyone in the chat', async () => {
    const edited = waitForEvent(bobSocket, 'message edited');
    editAsAlice('fixed typo');

    const event = await edited;
    expect(event.messageId).toBe(message._id.toString());
    expect(event.text).toBe('fixed typo');

    const saved = await Message.findById(message._id);
    expect(saved.text).toBe('fixed typo');
    expect(saved.edited).toBe(true);
  });

  it('still allows an edit 14 minutes after sending', async () => {
    await Message.updateOne({ _id: message._id }, { timestamp: new Date(Date.now() - 14 * MINUTE) });

    const edited = waitForEvent(bobSocket, 'message edited');
    editAsAlice('just in time');

    expect((await edited).text).toBe('just in time');
  });

  it('refuses an edit 16 minutes after sending', async () => {
    await Message.updateOne({ _id: message._id }, { timestamp: new Date(Date.now() - 16 * MINUTE) });

    const error = waitForEvent(aliceSocket, 'edit error');
    editAsAlice('too late');

    expect((await error).error).toBe('Edit window has expired');
    expect((await Message.findById(message._id)).text).toBe('original');
  });

  it('refuses an edit from someone who did not write the message', async () => {
    const error = waitForEvent(bobSocket, 'edit error');
    bobSocket.emit('edit message', { conversationId: convoId, messageId: message._id.toString(), text: 'hacked' });

    expect((await error).error).toBe('Not your message');
    expect((await Message.findById(message._id)).text).toBe('original');
  });

  it('refuses to edit a message using a different conversation’s id', async () => {
    await makeFriends(alice, carol);
    const other = await as(alice).post('/api/conversations/dm').send({ userId: carol.id });
    await waitForRoom(other.body._id, 1);

    const error = waitForEvent(aliceSocket, 'edit error');
    editAsAlice('sneaky', { conversationId: other.body._id });

    expect((await error).error).toBe('Message not found');
    expect((await Message.findById(message._id)).text).toBe('original');
  });

  it('ignores an edit to empty text', async () => {
    editAsAlice('   ');
    await pause();

    expect((await Message.findById(message._id)).text).toBe('original');
  });

  it('refuses to edit a message that was already deleted', async () => {
    await Message.updateOne({ _id: message._id }, { deleted: true });

    editAsAlice('back from the dead');
    await pause();

    const saved = await Message.findById(message._id);
    expect(saved.text).toBe('original');
    expect(saved.edited).toBe(false);
  });
});