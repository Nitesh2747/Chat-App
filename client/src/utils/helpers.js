export function avatarColor(name) {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return `hsl(${hash % 360} 55% 45%)`;
}

export function convoLabel(convo, myUsername) {
  if (convo.isGroup) return convo.name;
  const other = convo.members.find((m) => m && m.username !== myUsername);
  return other?.username ?? 'Deleted User';
}

export const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 * 60 * 1000 = 5 minutes

export function canEdit(msg, username) {
  return msg.user === username && Date.now() - msg.timestamp <= EDIT_WINDOW_MS;
}