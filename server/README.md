[← Back to project overview](../README.md)

# Chat App — Backend

Real-time chat API built with Express, Socket.IO, and MongoDB (Mongoose).

## Features

- JWT-based authentication (signup/login), with bcrypt-hashed passwords
- Real-time messaging via Socket.IO, scoped to per-conversation rooms
- One-to-one DMs and group conversations; DMs require an accepted friend request
- Message delivery/read receipts, typing indicators, message editing and deletion
- Replies: a message can reference an earlier message in the same conversation; the server resolves the original's sender and text whenever messages are sent or loaded
- Emoji reactions: a fixed set of six emoji, one reaction per person per message, written atomically and broadcast as the message's full reaction list
- Presence: online status and "last seen" shared with friends
- Group membership management (add/remove members, creator-only removal), with join/leave system messages
- Delete chat (hide-for-requester, or hard-delete when the other DM participant's account no longer exists) and account deletion
- Rate limiting, Helmet security headers, CORS locked to a single origin, request size limits

## Tech stack

- Node.js, Express
- Socket.IO
- MongoDB + Mongoose
- JWT (jsonwebtoken), bcryptjs
- express-rate-limit, helmet

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in this folder:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_string
CLIENT_URL=http://localhost:5173
PORT=3001
```
`PORT` is optional (defaults to 3001). `CLIENT_URL` must match the frontend's origin exactly, since it is the only origin CORS and Socket.IO accept.

3. Run in development (auto-restart on file changes):
```bash
npm run dev
```

4. Run in production:
```bash
npm start
```

## Testing

```bash
npm test          # run everything once
npm run test:watch  # re-run on every save
```

- Tests use Vitest, Supertest (REST routes), `socket.io-client` (real-time events) and `mongodb-memory-server`, a MongoDB that lives in memory for the test run. The first run downloads a MongoDB binary, so it takes longer; later runs reuse it.
- `tests/setup.js` sets safe environment values (including an unreachable `MONGO_URI`) so tests can never reach a real database.
- The auth rate limiter and the bcrypt cost are relaxed in test mode; `tests/ratelimit.test.js` turns the limiter back on to test it.
- Shared helpers: `tests/helpers.js` (create users, make friends), `tests/socketHelpers.js` (real server on a random port, test sockets), `tests/chatWorld.js` (a ready-made scene with two friends chatting).

## API overview

- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/users/search?q=` — search users by username
- `GET /api/users/:id` — contact info (username, last seen, shared groups); accepted friends only
- `DELETE /api/users/me` — delete own account
- `GET /api/friends`, `GET /api/friends/requests`, `GET /api/friends/requests/sent`, `POST /api/friends/request`, `POST /api/friends/requests/:id/accept`, `POST /api/friends/requests/:id/decline`
- `GET /api/conversations`, `POST /api/conversations/dm`, `POST /api/conversations/group`
- `POST /api/conversations/:id/members`, `DELETE /api/conversations/:id/members/:userId`
- `DELETE /api/conversations/:id`
- `GET /api/messages/:conversationId` — up to 100 messages, with each reply's original resolved
- `GET /health`

All routes except `/auth` and `/health` require an `Authorization: Bearer <token>` header. Socket connections are authenticated with the same token.

## Socket events

**Client → Server:** `chat message` (optionally with `replyTo`), `typing`, `stop typing`, `messages read`, `edit message`, `delete message`, `react message`, `join conversation`

**Server → Client:** `chat message`, `typing`, `stop typing`, `read update`, `delivered update`, `message edited`, `message deleted`, `reactions update`, `edit error`, `presence`, `conversation added`, `member added`, `member removed`, `removed from group`, `friend request received`, `friend request accepted`

## Rules the server enforces

- **Messages:** 1–5000 characters; only members of a conversation can send to it.
- **Replies:** the original must exist in the same conversation and must not be deleted or a system message; otherwise the reply is rejected.
- **Reactions:** the emoji must be one of the six allowed (`REACTION_EMOJIS` in `index.js`); only members can react, and not on deleted or system messages. Tapping your current emoji removes it, tapping a different one replaces it. Deleting a message hides its reactions.
- **Editing:** only the sender, within 15 minutes; failures come back as an `edit error` event.
- **Deleting:** only the sender; the text is stripped from every response and the message is shown as deleted.
- **Auth:** usernames are 3–20 characters, passwords at least 8; passwords are hashed with bcrypt (cost 12); tokens expire after 7 days; auth routes are limited to 20 requests per 15 minutes per IP.
- **Requests:** JSON bodies are capped at 50 KB.

## Data models

- **User** — username (unique), hashed password, last seen
- **Conversation** — DM or group, members, creator (groups), last-message preview, per-user hidden flag
- **Message** — conversation, sender, text, timestamp, read/delivered lists, edited/deleted/system flags, `replyTo` reference, reactions (`{ user, emoji }` list)
- **FriendRequest** — from, to, status (pending / accepted; declined requests are deleted)