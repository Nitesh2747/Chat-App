// Runs before every test file, before the app is imported.
import { vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.MONGO_URI = 'mongodb://127.0.0.1:1/never-used'; // throwaway temp db

// Hide the server's "User connected" log lines so test output stays readable
vi.spyOn(console, 'log').mockImplementation(() => {});