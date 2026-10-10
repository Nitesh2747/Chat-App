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

export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function canEdit(msg, username) {
  return msg.user === username && Date.now() - msg.timestamp <= EDIT_WINDOW_MS;
}

export const MOBILE_BREAKPOINT = 700;

export function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

export function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'offline';
  const d = new Date(lastSeen);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) return `last seen today at ${time}`;
  if (d >= startOfYesterday) return `last seen yesterday at ${time}`;
  return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
}
