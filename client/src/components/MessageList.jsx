import { Fragment } from 'react';
import MessageMenu from './MessageMenu.jsx';
import { avatarColor, canEdit, isMobile } from '../utils/helpers';

export default function MessageList({
  messages,
  username,
  unreadMarker,
  editingId,
  editText,
  onEditTextChange,
  editInputRef,
  bottomRef,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}) {
  return (
    <div className="messages">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isGrouped =
          prev &&
          !prev.system &&
          !msg.system &&
          prev.user === msg.user &&
          msg.timestamp - prev.timestamp < 5 * 60 * 1000;

        return (
          <Fragment key={msg._id || i}>
            {unreadMarker?.id === msg._id && (
              <div className="unread-divider">
                <span>
                  {unreadMarker.count} unread message{unreadMarker.count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {msg.system ? (
              <div className="system-msg">{msg.text}</div>
            ) : (
              <div
                className={`msg ${msg.user === username ? 'mine' : 'theirs'} ${isGrouped ? 'grouped' : ''
                  }`}
              >
                {msg.user !== username && !isGrouped && (
                  <div className="msg-sender" style={{ color: avatarColor(msg.user) }}>
                    {msg.user}
                  </div>
                )}

                {msg.user === username && !msg.deleted && (
                  <MessageMenu
                    items={[
                      ...(canEdit(msg, username)
                        ? [{ label: 'Edit', onClick: () => onStartEdit(msg) }]
                        : []),
                      { label: 'Delete', onClick: () => onDelete(msg), danger: true },
                    ]}
                  />
                )}

                {msg.deleted ? (
                  <div className="msg-text deleted-text">This message was deleted</div>
                ) : editingId === msg._id ? (
                  <div className="edit-wrap">
                    <textarea
                      ref={editInputRef}
                      className="edit-input"
                      value={editText}
                      onChange={(e) => onEditTextChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
                          e.preventDefault();
                          onSubmitEdit(msg);
                        }
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      onBlur={() => {
                        if (!isMobile()) onSubmitEdit(msg);
                      }}
                      rows={1}
                    />
                    <div className="edit-actions">
                      <button type="button" className="edit-cancel" onClick={() => onCancelEdit()}>
                        Cancel
                      </button>
                      <button type="button" className="edit-save" onClick={() => onSubmitEdit(msg)}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="msg-text" onDoubleClick={() => onStartEdit(msg)}>
                    {msg.text}
                    {msg.edited && <span className="edited-label"> (edited)</span>}
                  </div>
                )}

                <div className="msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.user === username && (
                    <span className={`ticks ${msg.readBy?.length ? 'read' : ''}`}>
                      {msg.readBy?.length || msg.deliveredTo?.length ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}