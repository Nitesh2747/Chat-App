import { io as connect } from 'socket.io-client';
import { vi } from 'vitest';
import { httpServer, io } from '../index.js';

let url;

// Start the real server on a random free port (port 0 = "pick any free one")
export async function startSocketServer() {
  await new Promise((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${httpServer.address().port}`;
}

// Also disconnects every client that is still connected
export function stopSocketServer() {
  return new Promise((resolve) => io.close(resolve));
}

// Open a logged-in socket connection for this user
export function connectSocket(user) {
  return new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { token: user.token }, forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

// Resolves with the payload the next time `event` arrives, fails after 2 seconds
export function waitForEvent(socket, event, ms = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// The server joins a socket to its conversation rooms a moment after it connects. Wait for that.
export function waitForRoom(conversationId, memberCount) {
  return vi.waitFor(() => {
    const room = io.sockets.adapter.rooms.get(conversationId);
    if ((room?.size || 0) < memberCount) throw new Error('room not ready yet');
  });
}

// For "nothing should happen" tests: give the server a moment, then check
export const pause = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));