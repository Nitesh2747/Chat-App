import { useState } from 'react';
import { avatarColor } from '../utils/helpers';
import { searchUsers, addGroupMember, removeGroupMember } from '../data/api.js';

export default function GroupMembersModal({ convo, username, myId, onClose, onMemberRemoved }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const isCreator = convo.createdBy === myId;

  function handleSearchChange(val) {
    setQuery(val);
    if (val.trim().length < 2) return setResults([]);
    searchUsers(val.trim())
      .then((users) => users.filter((u) => !convo.members.some((m) => m._id === u._id)))
      .then(setResults)
      .catch((err) => setError(err.message));
  }

  async function handleAdd(user) {
    try {
      await addGroupMember(convo._id, user._id);
      setQuery('');
      setResults([]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(member) {
    try {
      await removeGroupMember(convo._id, member._id);
      onMemberRemoved?.(member._id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{convo.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="modal-hint">{convo.members.length} members</p>

        {error && <div className="auth-error">{error}</div>}

        <ul className="pick-list">
          {convo.members.map((m) => (
            <li key={m._id} className="pick-item">
              <div className="member-row">
                <div className="avatar" style={{ background: avatarColor(m.username) }}>
                  {m.username[0]}
                </div>
                <span>
                  {m.username === username ? `${m.username} (you)` : m.username}
                  {m._id === convo.createdBy && ' · creator'}
                </span>
              </div>
              {isCreator && m._id !== convo.createdBy && (
                <button className="danger-btn" onClick={() => handleRemove(m)}>Remove</button>
              )}
            </li>
          ))}
        </ul>

        <input
          className="search-input"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Add someone..."
        />
        {results.length > 0 && (
          <ul className="pick-list">
            {results.map((u) => (
              <li key={u._id} className="pick-item">
                <span>{u.username}</span>
                <button onClick={() => handleAdd(u)}>Add</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}