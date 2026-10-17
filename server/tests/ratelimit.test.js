import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

// Every other test file switches the limiter off; this one turns it back on.
beforeAll(() => {
    process.env.DISABLE_RATE_LIMIT = 'false';
});
afterAll(() => {
    process.env.DISABLE_RATE_LIMIT = 'true';
});

// An invalid signup is rejected immediately (400), so it costs nothing but still counts as an attempt
const badSignup = () => request(app).post('/api/auth/signup').send({});

describe('auth rate limiting', () => {
    it('allows 20 attempts, then answers 429 Too Many Requests', async () => {
        for (let i = 0; i < 20; i++) {
            const res = await badSignup();
            expect(res.status).toBe(400); // rejected for the bad input, not for the rate
        }

        const blocked = await badSignup();
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toBe('Too many attempts, please try again later');
    });

    it('keeps blocking, and login shares the same allowance as signup', async () => {
        const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
        expect(res.status).toBe(429);
    });

    it('only limits the auth routes, not the rest of the app', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });
});