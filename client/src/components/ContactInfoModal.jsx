import { avatarColor, formatLastSeen } from '../utils/helpers';

export default function ContactInfoModal({ name, accountMissing, info, onClose, onDeleteChat }) {
  const initial = accountMissing ? '?' : name[0];
  const color = accountMissing ? '#6b6f76' : avatarColor(name);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Contact info</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="contact-avatar-wrap">
          <div className="avatar contact-avatar" style={{ background: color }}>
            {initial}
          </div>
          {info?.online && <span className="presence-dot" />}
        </div>

        <div className="contact-name">{name}</div>

        {accountMissing ? (
          <p className="contact-status">This account no longer exists.</p>
        ) : !info ? (
          <p className="contact-status">Loading info...</p>
        ) : (
          <>
            <p className={`contact-status ${info.online ? 'online' : ''}`}>
              {info.online ? 'online' : formatLastSeen(info.lastSeen)}
            </p>

            <div className="contact-section">
              <h4>Member since</h4>
              <div className="contact-row">
                {new Date(info.createdAt).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="contact-section">
              <h4>Groups in common</h4>
              {info.sharedGroups.length === 0 ? (
                <div className="contact-row contact-muted">No groups in common</div>
              ) : (
                <ul className="contact-groups">
                  {info.sharedGroups.map((g) => (
                    <li key={g._id} className="contact-row">{g.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <button className="danger-btn contact-delete" onClick={onDeleteChat}>
          Delete chat
        </button>
      </div>
    </div>
  );
}
