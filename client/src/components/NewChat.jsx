import { useEffect, useState } from 'react';
import { searchUsers, startDm, createGroup, getFriends, getSentRequests, sendFriendRequest } from '../data/api.js';

export default function NewChat({ onCreated, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentIds, setSentIds] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getFriends().then(setFriends).catch(() => {});
    getSentRequests().then((ids) => setSentIds(new Set(ids))).catch(() => {});
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(query.trim()).then(setResults).catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function toggleUser(user) {
    setSelected((prev) =>
      prev.some((u) => u._id === user._id) ? prev.filter((u) => u._id !== user._id) : [...prev, user]
    );
  }

  async function handleDm(user) {
    setLoading(true);
    setError('');
    try {
      const convo = await startDm(user._id);
      onCreated(convo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFriend(user) {
    try {
      await sendFriendRequest(user._id);
      setSentIds((prev) => new Set(prev).add(user._id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const convo = await createGroup(groupName, selected.map((u) => u._id));
      onCreated(convo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New chat</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          autoFocus
        />

        {selected.length > 0 && (
          <div className="selected-pills">
            {selected.map((u) => (
              <span key={u._id} className="selected-pill" onClick={() => toggleUser(u)}>
                {u.username} ✕
              </span>
            ))}
          </div>
        )}

        <ul className="pick-list">
          {results.map((u) => {
            const isFriend = friends.some((f) => f._id === u._id);
            const isPending = sentIds.has(u._id);
            return (
              <li key={u._id} className={`pick-item ${selected.some((s) => s._id === u._id) ? 'selected' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.some((s) => s._id === u._id)}
                    onChange={() => toggleUser(u)}
                  />
                  {u.username}
                </label>
                {isFriend ? (
                  <button disabled={loading} onClick={() => handleDm(u)}>Chat</button>
                ) : isPending ? (
                  <button disabled>Requested</button>
                ) : (
                  <button disabled={loading} onClick={() => handleAddFriend(u)}>Add Friend</button>
                )}
              </li>
            );
          })}
          {query.trim().length >= 3 && results.length === 0 && (
            <p className="modal-hint">No users found</p>
          )}
        </ul>

        <form className="group-form" onSubmit={handleCreateGroup}>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            maxLength={40}
          />
          <button type="submit" disabled={loading || !groupName.trim() || selected.length < 2}>
            Create group ({selected.length})
          </button>
        </form>
      </div>
    </div>
  );
}