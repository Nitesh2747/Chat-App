# Chat App — Frontend

React client for a real-time WhatsApp/Discord-inspired chat app.

## Features

- Login/signup with persistent sessions
- Real-time one-to-one and group messaging
- Friend requests, searchable user lookup
- Typing indicators, delivered/read receipts, unread badges
- Message editing (15-minute window) and permanent deletion
- Responsive layout with a mobile sidebar drawer
- Dark, Discord-inspired custom theme

## Tech stack

- React (Vite)
- Socket.IO client
- Plain CSS (no framework)

## Setup

1. Install dependencies:
```bash
   npm install
```

2. Create a `.env` file in this folder:
```
   VITE_API_URL=http://localhost:3001
```

3. Run the dev server:
```bash
   npm run dev
```

4. Build for production:
```bash
   npm run build
```

## Project structure

src/<br>
components/   UI components (Sidebar, ChatHeader, MessageList, modals, menus)<br>
data/         api.js (REST calls), socket.js (Socket.IO client instance)<br>
utils/        shared helpers (avatarColor, convoLabel, canEdit)<br>
style/        global CSS<br>
App.jsx       top-level state, effects, and layout

Requires the backend (see `../server/README.md`) running and reachable at `VITE_API_URL`.