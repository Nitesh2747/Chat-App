[← Back to project overview](../README.md)

# Chat App — Frontend

React client for a real-time WhatsApp/Discord-inspired chat app.

## Features

- Login/signup with persistent sessions
- Real-time one-to-one and group messaging, with friend-request-gated DMs
- Searchable user lookup (no open user directory)
- Group management: add members anytime, creator-only member removal, join/leave notices
- Typing indicators, online status and last seen, delivered/read receipts, unread badges and message previews
- Multi-line messages (Shift+Enter on desktop, Enter inserts a new line on mobile)
- Replies: quoted block in the bubble, "Replying to…" bar above the composer (✕ or Esc cancels), tap a quote to jump to and highlight the original; quotes update live when the original is edited or deleted
- Emoji reactions: pick from the ⋮ menu, shown as chips under the message; tap a chip to toggle your reaction
- Message editing (15-minute window) and permanent deletion, both reflected live in the chat and the sidebar preview
- Per-message ⋮ menu: Reply and React on every message, Edit and Delete on your own
- Swipe a message to the right on touch screens to reply
- Friend contact-info modal (last seen, shared groups)
- Delete chat (hidden for you, or permanently removed if the other user deleted their account) and account deletion
- Responsive layout with a mobile sidebar drawer
- Dark (Discord and Telegram inspired) custom theme

## Tech stack

- React 19 (Vite)
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

The backend (see `../server/README.md`) must be running and reachable at `VITE_API_URL`.

## Project structure

```
src/
  components/   UI components: Auth, Sidebar, ChatHeader, MessageList, MessageInput,
                MessageMenu, ConvoMenu, UserMenu, NewChat, FriendRequestsModal,
                GroupMembersModal, ContactInfoModal
  data/         api.js (REST calls), socket.js (Socket.IO client instance)
  utils/        shared helpers (avatarColor, convoLabel, canEdit, isMobile, REACTION_EMOJIS)
  style/        index.css (theme variables, reset, base styles) and App.css (styles for all components)
  App.jsx       top-level state, socket event handlers, and layout
```