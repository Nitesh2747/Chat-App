import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { REACTION_EMOJIS } from '../index.js';
import { as, makeFriends } from './helpers.js';
import { createChatWorld } from './chatWorld.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { startSocketServer, stopSocketServer, connectSocket, waitForEvent, waitForRoom, pause } from './socketHelpers.js';

beforeAll(async () => {
    await connectDb();
    await startSocketServer();
});
afterAll(async () => {
    await stopSocketServer();
    await disconnectDb();
});
beforeEach(clearDb);

const [THUMBS_UP, HEART, LAUGH] = REACTION_EMOJIS;

describe('reactions', () => {
    let alice, bob, carol, convoId, aliceSocket, bobSocket, message;

    beforeEach(async () => {
        ({ alice, bob, carol, convoId, aliceSocket, bobSocket } = await createChatWorld());
        message = await Message.create({ conversation: convoId, user: 'alice', text: 'react to me' });
    });

    afterEach(() => {
        aliceSocket.disconnect();
        bobSocket.disconnect();
    });

    function react(socket, emoji, extra = {}) {
        socket.emit('react message', { conversationId: convoId, messageId: message._id.toString(), emoji, ...extra });
    }

    async function storedReactions() {
        const saved = await Message.findById(message._id);
        return saved.reactions.map((r) => ({ user: r.user, emoji: r.emoji }));
    }

    it('adds a reaction and sends the full list to everyone in the chat', async () => {
        const update = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP);

        const event = await update;
        expect(event.messageId).toBe(message._id.toString());
        expect(event.reactions).toEqual([{ user: 'bob', emoji: THUMBS_UP }]);
    });

    it('removes the reaction when the same emoji is tapped again', async () => {
        const first = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP);
        await first;

        const second = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP);

        expect((await second).reactions).toEqual([]);
        expect(await storedReactions()).toEqual([]);
    });

    it('replaces the reaction when a different emoji is tapped (one per person)', async () => {
        const first = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP);
        await first;

        const second = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, HEART);

        expect((await second).reactions).toEqual([{ user: 'bob', emoji: HEART }]);
    });

    it('keeps reactions from different people side by side', async () => {
        const first = waitForEvent(bobSocket, 'reactions update');
        react(aliceSocket, HEART);
        await first;

        const second = waitForEvent(bobSocket, 'reactions update');
        react(bobSocket, LAUGH);

        expect((await second).reactions).toEqual([
            { user: 'alice', emoji: HEART },
            { user: 'bob', emoji: LAUGH },
        ]);
    });

    it('does not lose a reaction when two people react at the same instant', async () => {
        react(aliceSocket, HEART);
        react(bobSocket, LAUGH);

        await vi.waitFor(async () => {
            expect(await storedReactions()).toHaveLength(2);
        });
        const users = (await storedReactions()).map((r) => r.user).sort();
        expect(users).toEqual(['alice', 'bob']);
    });

    it('accepts every emoji in the allowed list', async () => {
        for (const emoji of REACTION_EMOJIS) {
            const update = waitForEvent(aliceSocket, 'reactions update');
            react(bobSocket, emoji);
            expect((await update).reactions).toEqual([{ user: 'bob', emoji }]);
            const cleared = waitForEvent(aliceSocket, 'reactions update');
            react(bobSocket, emoji); // tap again to remove, ready for the next one
            await cleared;
        }
    });

    it('rejects an emoji that is not in the allowed list', async () => {
        react(bobSocket, '💩');
        react(bobSocket, 'thumbs-up');
        await pause();

        expect(await storedReactions()).toEqual([]);
    });

    it('rejects a reaction to a deleted message', async () => {
        await Message.updateOne({ _id: message._id }, { deleted: true });

        react(bobSocket, THUMBS_UP);
        await pause();

        expect(await storedReactions()).toEqual([]);
    });

    it('rejects a reaction to a system message', async () => {
        await Message.updateOne({ _id: message._id }, { system: true });

        react(bobSocket, THUMBS_UP);
        await pause();

        expect(await storedReactions()).toEqual([]);
    });

    it('rejects a reaction from someone who is not in the conversation', async () => {
        const carolSocket = await connectSocket(carol);
        react(carolSocket, THUMBS_UP);
        await pause();
        carolSocket.disconnect();

        expect(await storedReactions()).toEqual([]);
    });

    it('rejects a reaction that uses a different conversation’s id', async () => {
        await makeFriends(alice, carol);
        const other = await as(alice).post('/api/conversations/dm').send({ userId: carol.id });
        await waitForRoom(other.body._id, 1);

        react(aliceSocket, THUMBS_UP, { conversationId: other.body._id });
        await pause();

        expect(await storedReactions()).toEqual([]);
    });

    it('works on old messages that were saved before reactions existed', async () => {
        const { insertedId } = await Message.collection.insertOne({
            conversation: new mongoose.Types.ObjectId(convoId),
            user: 'alice',
            text: 'from the old days',
            timestamp: new Date(),
            system: false,
            deleted: false,
        });

        const update = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP, { messageId: insertedId.toString() });

        expect((await update).reactions).toEqual([{ user: 'bob', emoji: THUMBS_UP }]);
    });

    it('hides the reactions of a message once it is deleted', async () => {
        const update = waitForEvent(aliceSocket, 'reactions update');
        react(bobSocket, THUMBS_UP);
        await update;

        await Message.updateOne({ _id: message._id }, { deleted: true });

        const history = await as(bob).get(`/api/messages/${convoId}`);
        const shown = history.body.find((m) => m._id === message._id.toString());
        expect(shown.reactions).toEqual([]);
    });
});