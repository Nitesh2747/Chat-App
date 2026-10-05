import { convoLabel } from '../utils/helpers';

export default function ChatHeader({ activeConvo, username, typingUsers, onToggleSidebar, onShowMembers }) {
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
          <span className={`chat-status ${typingUsers.length ? 'typing' : ''}`}>
            {typingUsers.length ? (
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
            ) : (
              'Tap for info'
            )}
          </span>
        )}
      </div>
    </header>
  );
}