import request from 'supertest';
import { app } from '../index.js';

// Sign up a user through the real API and return what the tests need
export async function createUser(username, password = 'password123') {
  const res = await request(app).post('/api/auth/signup').send({ username, password });
  return { id: res.body.user.id, username, token: res.body.token };
}

// Requests that already carry this user's login token:  as(alice).post('/api/friends/request')
export function as(user) {
  const withToken = (method) => (url) =>
    request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
  return { get: withToken('get'), post: withToken('post'), delete: withToken('delete') };
}

// Make two users friends (A sends a request, B accepts)
export async function makeFriends(a, b) {
  const sent = await as(a).post('/api/friends/request').send({ userId: b.id });
  await as(b).post(`/api/friends/requests/${sent.body._id}/accept`);
}