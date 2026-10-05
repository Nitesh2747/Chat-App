import { useEffect, useState } from 'react';
import { getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../data/api.js';
import { avatarColor } from '../utils/helpers';

export default function FriendRequestsModal({ onClose, onRequestHandled }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getFriendRequests().then(setRequests).catch((err) => setError(err.message));
  }, []);

  async function handleAccept(req) {
    try {
      await acceptFriendRequest(req._id);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      onRequestHandled?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDecline(req) {
    try {
      await declineFriendRequest(req._id);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      onRequestHandled?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Friend requests</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {requests.length === 0 ? (
          <p className="modal-hint">No pending requests</p>
        ) : (
          <ul className="pick-list">
            {requests.map((r) => (
              <li key={r._id} className="pick-item">
                <div className="member-row">
                  <div className="avatar" style={{ background: avatarColor(r.from.username) }}>
                    {r.from.username[0]}
                  </div>
                  <span>{r.from.username}</span>
                </div>
                <div className="request-actions">
                  <button onClick={() => handleAccept(r)}>Accept</button>
                  <button onClick={() => handleDecline(r)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}