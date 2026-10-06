[← Back to project overview](../README.md)

# Chat App — Backend

Real-time chat API built with Express, Socket.IO, and MongoDB (Mongoose).

## Features

- JWT-based authentication (signup/login), with bcrypt-hashed passwords
- Real-time messaging via Socket.IO, scoped to per-conversation rooms
- One-to-one DMs and group conversations; DMs require an accepted friend request
- Message delivery/read receipts, typing indicators, message editing and deletion
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
```

3. Run in development (auto-restart on file changes):
```bash
   npm run dev
```

4. Run in production:
```bash
   npm start
```

Server runs on port 3001 by default.

## API overview

- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/users/search?q=` — search users by username
- `DELETE /api/users/me` — delete own account
- `GET /api/friends`, `GET /api/friends/requests`, `POST /api/friends/request`, `POST /api/friends/requests/:id/accept`, `POST /api/friends/requests/:id/decline`
- `GET /api/conversations`, `POST /api/conversations/dm`, `POST /api/conversations/group`
- `POST /api/conversations/:id/members`, `DELETE /api/conversations/:id/members/:userId`
- `DELETE /api/conversations/:id`
- `GET /api/messages/:conversationId`
- `GET /health`

All routes except `/auth` and `/health` require an `Authorization: Bearer <token>` header.

## Socket events

**Client → Server:** `chat message`, `typing`, `stop typing`, `messages read`, `edit message`, `delete message`, `join conversation`

**Server → Client:** `chat message`, `typing`, `stop typing`, `read update`, `delivered update`, `message edited`, `message deleted`, `edit error`, `conversation added`, `member added`, `member removed`, `removed from group`, `friend request received`, `friend request accepted`