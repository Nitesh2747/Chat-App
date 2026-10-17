import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { connectDb, clearDb, disconnectDb } from './db.js';
import { createUser, as } from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
beforeEach(clearDb);

describe('friend requests', () => {
  let alice, bob;

  beforeEach(async () => {
    alice = await createUser('alice');
    bob = await createUser('bob');
  });

  it('requires a login token', async () => {
    const res = await request(app).get('/api/friends');
    expect(res.status).toBe(401);
  });

  it('sends a request that shows up as incoming for bob and sent for alice', async () => {
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    expect(sent.status).toBe(201);
    expect(sent.body.status).toBe('pending');

    const incoming = await as(bob).get('/api/friends/requests');
    expect(incoming.body).toHaveLength(1);
    expect(incoming.body[0].from.username).toBe('alice');

    const outgoing = await as(alice).get('/api/friends/requests/sent');
    expect(outgoing.body).toEqual([bob.id]);
  });

  it('does not make them friends until bob accepts', async () => {
    await as(alice).post('/api/friends/request').send({ userId: bob.id });

    const friends = await as(alice).get('/api/friends');
    expect(friends.body).toEqual([]);
  });

  it('rejects a request to yourself', async () => {
    const res = await as(alice).post('/api/friends/request').send({ userId: alice.id });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid user id', async () => {
    const res = await as(alice).post('/api/friends/request').send({ userId: 'not-an-id' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a user that does not exist', async () => {
    const res = await as(alice)
      .post('/api/friends/request')
      .send({ userId: '64b7f0f0f0f0f0f0f0f0f0f0' });
    expect(res.status).toBe(404);
  });

  it('rejects sending the same request twice', async () => {
    await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const again = await as(alice).post('/api/friends/request').send({ userId: bob.id });

    expect(again.status).toBe(409);
    expect(again.body.error).toBe('Request already sent');
  });

  it('lets bob accept, after which both see each other as friends', async () => {
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const accepted = await as(bob).post(`/api/friends/requests/${sent.body._id}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('accepted');

    const aliceFriends = await as(alice).get('/api/friends');
    const bobFriends = await as(bob).get('/api/friends');
    expect(aliceFriends.body.map((f) => f.username)).toEqual(['bob']);
    expect(bobFriends.body.map((f) => f.username)).toEqual(['alice']);
  });

  it('does not let the sender accept their own request', async () => {
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const res = await as(alice).post(`/api/friends/requests/${sent.body._id}/accept`);
    expect(res.status).toBe(404);
  });

  it('does not let a third person accept the request', async () => {
    const carol = await createUser('carol');
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const res = await as(carol).post(`/api/friends/requests/${sent.body._id}/accept`);
    expect(res.status).toBe(404);
  });

  it('accepts automatically when both people send each other a request', async () => {
    await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const reverse = await as(bob).post('/api/friends/request').send({ userId: alice.id });

    expect(reverse.status).toBe(200);
    expect(reverse.body.status).toBe('accepted');
    const friends = await as(alice).get('/api/friends');
    expect(friends.body.map((f) => f.username)).toEqual(['bob']);
  });

  it('removes a declined request so it can be sent again later', async () => {
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    const declined = await as(bob).post(`/api/friends/requests/${sent.body._id}/decline`);
    expect(declined.status).toBe(200);

    const incoming = await as(bob).get('/api/friends/requests');
    expect(incoming.body).toEqual([]);

    const again = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    expect(again.status).toBe(201);
  });

  it('reports "Already friends" once the request was accepted', async () => {
    const sent = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    await as(bob).post(`/api/friends/requests/${sent.body._id}/accept`);

    const again = await as(alice).post('/api/friends/request').send({ userId: bob.id });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('Already friends');
  });
});