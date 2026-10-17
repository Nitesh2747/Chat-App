import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index.js';
import User from '../models/User.js';
import { connectDb, clearDb, disconnectDb } from './db.js';

beforeAll(connectDb);
afterAll(disconnectDb);
beforeEach(clearDb);

const validUser = { username: 'alice', password: 'password123' };

function signup(body) {
  return request(app).post('/api/auth/signup').send(body);
}

function login(body) {
  return request(app).post('/api/auth/login').send(body);
}

describe('POST /api/auth/signup', () => {
  it('creates a user and returns a valid token', async () => {
    const res = await signup(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('alice');
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.username).toBe('alice');
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await signup(validUser);

    const saved = await User.findOne({ username: 'alice' });
    expect(saved.passwordHash).not.toBe(validUser.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a username shorter than 3 characters', async () => {
    const res = await signup({ ...validUser, username: 'ab' });
    expect(res.status).toBe(400);
  });

  it('rejects a username longer than 20 characters', async () => {
    const res = await signup({ ...validUser, username: 'a'.repeat(21) });
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await signup({ ...validUser, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    expect((await signup({ password: 'password123' })).status).toBe(400);
    expect((await signup({ username: 'alice' })).status).toBe(400);
  });

  it('rejects a duplicate username with 409', async () => {
    await signup(validUser);
    const res = await signup(validUser);
    expect(res.status).toBe(409);
  });

  it('treats usernames as case-insensitive', async () => {
    await signup(validUser);
    const res = await signup({ ...validUser, username: 'ALICE' });
    expect(res.status).toBe(409);
  });

  it('rejects a username that is not a string', async () => {
    const res = await signup({ username: 12345, password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await signup(validUser);
  });

  it('logs in with the right credentials', async () => {
    const res = await login(validUser);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).username).toBe('alice');
  });

  it('ignores letter case and spaces in the username', async () => {
    const res = await login({ username: '  ALICE ', password: 'password123' });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login({ username: 'alice', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('gives the same error for an unknown user as for a wrong password', async () => {
    const wrongPassword = await login({ username: 'alice', password: 'wrong-password' });
    const unknownUser = await login({ username: 'nobody', password: 'password123' });

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body.error).toBe(wrongPassword.body.error);
  });

  it('rejects a missing password with 400 instead of crashing', async () => {
    const res = await login({ username: 'alice' });
    expect(res.status).toBe(400);
  });
});