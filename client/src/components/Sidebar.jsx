import UserMenu from './UserMenu.jsx';
import ConvoMenu from './ConvoMenu.jsx';
import { avatarColor, convoLabel } from '../utils/helpers';

export default function Sidebar({
  username,
  onSelect,
  onLogout,
  onNewChat,
  activeConvo,
  sidebarOpen,
  onDeleteChat,
  conversations,
  onCloseSidebar,
  onOpenRequests,
  onDeleteAccount,
  pendingRequestCount,
}) {
  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="current-user">
            <UserMenu username={username} onLogout={onLogout} onDeleteAccount={onDeleteAccount} />
            <span className="current-user-name">{username}</span>
          </div>
          <div className="sidebar-actions">
            <span className="sidebar-title">Direct Messages</span>
            <div className="sidebar-action-buttons">
              <button
                className="new-chat-btn requests-btn"
                onClick={() => { onCloseSidebar(); onOpenRequests(); }}
                title="Friend requests"
              >
                🔔
                {pendingRequestCount > 0 && <span className="requests-badge">{pendingRequestCount}</span>}
              </button>
              <button
                className="new-chat-btn"
                onClick={() => { onCloseSidebar(); onNewChat(); }}
                title="New chat"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <ul className="user-list">
          {conversations.map((c) => (
            <li
              key={c._id}
              className={`user-item convo-item ${activeConvo?._id === c._id ? 'active' : ''}`}
              onClick={() => onSelect(c)}
            >
              <div className="avatar" style={{ background: avatarColor(convoLabel(c, username)) }}>
                {convoLabel(c, username)[0]}
              </div>
              <div className="convo-info">
                <span className="convo-name">{convoLabel(c, username)}</span>
                {c.lastMessage && (
                  <span className="convo-preview">
                    {c.isGroup ? (
                      <>{c.lastMessage.user === username ? 'You' : c.lastMessage.user}: {c.lastMessage.text}</>
                    ) : c.lastMessage.user === username ? (
                      <>
                        <span className={`preview-ticks ${c.lastMessage.status === 'read' ? 'read' : ''}`}>
                          {c.lastMessage.status === 'sent' ? '✓' : '✓✓'}
                        </span>{' '}
                        {c.lastMessage.text}
                      </>
                    ) : (
                      c.lastMessage.text
                    )}
                  </span>
                )}
              </div>
              {c.unreadCount > 0 && (
                <span className="unread-badge">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
              )}
              <ConvoMenu onDeleteChat={() => onDeleteChat(c._id)} />
            </li>
          ))}
        </ul>
      </aside>
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={onCloseSidebar} />
    </>
  )
}