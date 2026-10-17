import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
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

describe('deleting messages', () => {
    let alice, bob, carol, convoId, aliceSocket, bobSocket;

    beforeEach(async () => {
        ({ alice, bob, carol, convoId, aliceSocket, bobSocket } = await createChatWorld());
    });

    afterEach(() => {
        aliceSocket.disconnect();
        bobSocket.disconnect();
    });

    // Send through the real socket flow so the conversation's "last message" gets updated too
    async function sendFromAlice(text) {
        const received = waitForEvent(bobSocket, 'chat message');
        aliceSocket.emit('chat message', { conversationId: convoId, text });
        return received;
    }

    async function previewSeenByBob() {
        const list = await as(bob).get('/api/conversations');
        return list.body.find((c) => c._id === convoId).lastMessage.text;
    }

    it('lets the sender delete, and tells everyone in the chat', async () => {
        const msg = await sendFromAlice('oops wrong chat');

        const deleted = waitForEvent(bobSocket, 'message deleted');
        aliceSocket.emit('delete message', { conversationId: convoId, messageId: msg._id });

        expect((await deleted).messageId).toBe(msg._id);
        expect((await Message.findById(msg._id)).deleted).toBe(true);
    });

    it('no longer returns the text of a deleted message', async () => {
        const msg = await sendFromAlice('secret');
        const deleted = waitForEvent(bobSocket, 'message deleted');
        aliceSocket.emit('delete message', { conversationId: convoId, messageId: msg._id });
        await deleted;

        const history = await as(bob).get(`/api/messages/${convoId}`);
        const gone = history.body.find((m) => m._id === msg._id);
        expect(gone.deleted).toBe(true);
        expect(gone.text).toBe('');
    });

    it('refuses a delete from someone who did not write the message', async () => {
        const msg = await sendFromAlice('mine');

        bobSocket.emit('delete message', { conversationId: convoId, messageId: msg._id });
        await pause();

        expect((await Message.findById(msg._id)).deleted).toBe(false);
    });

    it('refuses to delete a message using a different conversation’s id', async () => {
        const msg = await sendFromAlice('mine');
        await makeFriends(alice, carol);
        const other = await as(alice).post('/api/conversations/dm').send({ userId: carol.id });
        await waitForRoom(other.body._id, 1);

        aliceSocket.emit('delete message', { conversationId: other.body._id, messageId: msg._id });
        await pause();

        expect((await Message.findById(msg._id)).deleted).toBe(false);
    });

    it('updates the sidebar preview when the last message is deleted', async () => {
        const msg = await sendFromAlice('about to vanish');
        expect(await previewSeenByBob()).toBe('about to vanish');

        aliceSocket.emit('delete message', { conversationId: convoId, messageId: msg._id });

        await vi.waitFor(async () => {
            expect(await previewSeenByBob()).toBe('This message was deleted');
        });
    });

    it('leaves the preview alone when an older message is deleted', async () => {
        const first = await sendFromAlice('first');
        await sendFromAlice('second');

        const deleted = waitForEvent(bobSocket, 'message deleted');
        aliceSocket.emit('delete message', { conversationId: convoId, messageId: first._id });
        await deleted;
        await pause();

        expect(await previewSeenByBob()).toBe('second');
    });
});