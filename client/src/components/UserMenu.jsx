import { useEffect, useRef, useState } from 'react';
import { avatarColor } from '../utils/helpers';

export default function UserMenu({ username, onLogout, onDeleteAccount }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="avatar user-menu-trigger"
        style={{ background: avatarColor(username) }}
        onClick={() => setOpen((o) => !o)}
      >
        {username[0]}
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-name">{username}</div>

          <button className="user-menu-item" onClick={onLogout}>
            Log out
          </button>

          {!confirming ? (
            <button className="user-menu-item danger" onClick={() => setConfirming(true)}>
              Delete account
            </button>
          ) : (
            <div className="user-menu-confirm">
              <p>Delete your account? This cannot be undone.</p>
              <div className="user-menu-confirm-actions">
                <button className="user-menu-item" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button className="user-menu-item danger" onClick={onDeleteAccount}>
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}