const BASE = `${import.meta.env.VITE_API_URL}/api`;

export function apiFetch(path, options = {}) {
  const auth = JSON.parse(localStorage.getItem('chat-auth') || 'null');

  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  });
}

export function getConversations() {
  return apiFetch('/conversations');
}

export function getMessages(conversationId) {
  return apiFetch(`/messages/${conversationId}`);
}

export function searchUsers(query) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
}

export function startDm(userId) {
  return apiFetch('/conversations/dm', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function createGroup(name, memberIds) {
  return apiFetch('/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
}

export function deleteAccount() {
  return apiFetch('/users/me', { method: 'DELETE' });
}

export function getFriends() {
  return apiFetch('/friends');
}

export function getFriendRequests() {
  return apiFetch('/friends/requests');
}

export function getSentRequests() {
  return apiFetch('/friends/requests/sent');
}

export function sendFriendRequest(userId) {
  return apiFetch('/friends/request', { method: 'POST', body: JSON.stringify({ userId }) });
}

export function acceptFriendRequest(id) {
  return apiFetch(`/friends/requests/${id}/accept`, { method: 'POST' });
}

export function declineFriendRequest(id) {
  return apiFetch(`/friends/requests/${id}/decline`, { method: 'POST' });
}

export function addGroupMember(conversationId, userId) {
  return apiFetch(`/conversations/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeGroupMember(conversationId, userId) {
  return apiFetch(`/conversations/${conversationId}/members/${userId}`, { method: 'DELETE' });
}

export function deleteChat(conversationId) {
  return apiFetch(`/conversations/${conversationId}`, { method: 'DELETE' });
}
