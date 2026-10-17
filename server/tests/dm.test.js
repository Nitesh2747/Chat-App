import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { createUser, as, makeFriends } from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
beforeEach(clearDb);

describe('POST /api/conversations/dm', () => {
    let alice, bob;

    beforeEach(async () => {
        alice = await createUser('alice');
        bob = await createUser('bob');
    });

    it('requires a login token', async () => {
        const res = await request(app).post('/api/conversations/dm').send({ userId: bob.id });
        expect(res.status).toBe(401);
    });

    it('refuses to start a chat with someone who is not a friend', async () => {
        const res = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
        expect(res.status).toBe(403);
    });

    it('refuses while the friend request is still pending', async () => {
        await as(alice).post('/api/friends/request').send({ userId: bob.id });

        const res = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
        expect(res.status).toBe(403);
    });

    it('creates a DM once they are friends', async () => {
        await makeFriends(alice, bob);

        const res = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
        expect(res.status).toBe(200);
        expect(res.body.isGroup).toBe(false);
        expect(res.body.members.map((m) => m.username).sort()).toEqual(['alice', 'bob']);
    });

    it('gives both people the same conversation instead of creating duplicates', async () => {
        await makeFriends(alice, bob);

        const fromAlice = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
        const fromAliceAgain = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
        const fromBob = await as(bob).post('/api/conversations/dm').send({ userId: alice.id });

        expect(fromAliceAgain.body._id).toBe(fromAlice.body._id);
        expect(fromBob.body._id).toBe(fromAlice.body._id);
    });

    it('rejects a chat with yourself', async () => {
        const res = await as(alice).post('/api/conversations/dm').send({ userId: alice.id });
        expect(res.status).toBe(400);
    });

    it('rejects an invalid user id', async () => {
        const res = await as(alice).post('/api/conversations/dm').send({ userId: 'nope' });
        expect(res.status).toBe(400);
    });

    it('returns 404 for a user that does not exist', async () => {
        const res = await as(alice)
            .post('/api/conversations/dm')
            .send({ userId: '64b7f0f0f0f0f0f0f0f0f0f0' });
        expect(res.status).toBe(404);
    });

    it('does not let a third person into someone else’s friendship', async () => {
        const carol = await createUser('carol');
        await makeFriends(alice, bob);

        const res = await as(carol).post('/api/conversations/dm').send({ userId: bob.id });
        expect(res.status).toBe(403);
    });
});