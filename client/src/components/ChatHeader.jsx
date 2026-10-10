import { convoLabel, formatLastSeen } from '../utils/helpers';

export default function ChatHeader({
  activeConvo,
  username,
  typingUsers,
  contactInfo,
  onToggleSidebar,
  onShowMembers,
  onShowContactInfo,
}) {
  const isDm = Boolean(activeConvo) && !activeConvo.isGroup;
  const typing = typingUsers.length > 0;
  const showOnline = isDm && !typing && contactInfo?.online;

  return (
    <header className="chat-header">
      <button className="menu-toggle" onClick={onToggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div
        className={`chat-title ${activeConvo?.isGroup ? 'clickable' : ''}`}
        onClick={() => activeConvo?.isGroup && onShowMembers()}
      >
        <h2>{activeConvo ? convoLabel(activeConvo, username) : 'Select a chat'}</h2>
        {activeConvo && (
          <span className={`chat-status ${typing ? 'typing' : ''} ${showOnline ? 'online' : ''}`}>
            {typing ? (
              <>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing`
                  : typingUsers.length === 2
                    ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
                    : 'Several people are typing'}
                <span className="dots"><i></i><i></i><i></i></span>
              </>
            ) : activeConvo.isGroup ? (
              `${activeConvo.members.length} members`
            ) : contactInfo ? (
              contactInfo.online ? 'online' : formatLastSeen(contactInfo.lastSeen)
            ) : (
              ''
            )}
          </span>
        )}
      </div>
      {isDm && (
        <button
          className="header-info-btn"
          onClick={onShowContactInfo}
          title="Contact info"
          aria-label="Contact info"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="16" />
            <circle cx="12" cy="8" r="0.6" fill="currentColor" />
          </svg>
        </button>
      )}
    </header>
  );
}
