import { Fragment } from 'react';
import MessageMenu from './MessageMenu.jsx';
import { avatarColor, canEdit, isMobile, REACTION_EMOJIS } from '../utils/helpers';

// [{emoji, count, mine, users}] in a stable order, only emoji that have at least one reaction
function groupReactions(reactions = [], me) {
  return REACTION_EMOJIS.map((emoji) => {
    const users = reactions.filter((r) => r.emoji === emoji).map((r) => r.user);
    return { emoji, count: users.length, mine: users.includes(me), users };
  }).filter((g) => g.count > 0);
}

// Scroll to the original message and flash it
function jumpTo(id) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('highlight');
  void el.offsetWidth; // restart the animation if it's already running
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 1600);
}

// ---- Swipe a bubble to the right to reply (touch screens) ----
const SWIPE_TRIGGER = 60; // px you must drag before it counts as a reply
const SWIPE_MAX = 80; // the bubble stops following the finger here
let swipe = null; // the touch in progress (only one finger at a time)

function springBack(el) {
  el.style.transition = 'transform 0.2s ease';
  el.style.transform = '';
  el.style.removeProperty('--swipe');
  el.classList.remove('swipe-ready');
  setTimeout(() => {
    el.style.transition = '';
  }, 200);
}

function swipeStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  swipe = { x: t.clientX, y: t.clientY, el: e.currentTarget, dx: 0, active: false, buzzed: false };
}

function swipeMove(e) {
  if (!swipe) return;
  const t = e.touches[0];
  const dx = t.clientX - swipe.x;
  const dy = t.clientY - swipe.y;

  if (!swipe.active) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      swipe = null; // mostly vertical: the user is just scrolling
      return;
    }
    if (dx > 10 && dx > Math.abs(dy)) swipe.active = true;
    else return;
  }

  swipe.dx = Math.min(Math.max(dx, 0), SWIPE_MAX);
  swipe.el.style.transform = `translateX(${swipe.dx}px)`;
  swipe.el.style.setProperty('--swipe', Math.min(swipe.dx / SWIPE_TRIGGER, 1)); // 0 → 1 as you drag
  swipe.el.classList.toggle('swipe-ready', swipe.dx >= SWIPE_TRIGGER);
  if (swipe.dx >= SWIPE_TRIGGER && !swipe.buzzed) {
    swipe.buzzed = true;
    navigator.vibrate?.(15);
  }
}

function swipeEnd(msg, onReply) {
  if (!swipe) return;
  const { el, dx, active } = swipe;
  swipe = null;
  if (!active) return;
  springBack(el);
  if (dx >= SWIPE_TRIGGER) onReply(msg);
}

function swipeCancel() {
  if (!swipe) return;
  if (swipe.active) springBack(swipe.el);
  swipe = null;
}

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
  onReply,
  onReact,
}) {
  // Originals older than the loaded history aren't in the DOM, so their quotes can't jump
  const loadedIds = new Set(messages.map((m) => m._id));

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
              <div id={`msg-${msg._id}`}
                className={`msg ${msg.user === username ? 'mine' : 'theirs'} ${isGrouped ? 'grouped' : ''}`}
                onTouchStart={msg.deleted || editingId === msg._id ? undefined : swipeStart}
                onTouchMove={swipeMove}
                onTouchEnd={() => swipeEnd(msg, onReply)}
                onTouchCancel={swipeCancel}
              >
                {!msg.deleted && (
                  <span className="swipe-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14L4 9l5-5" />
                      <path d="M4 9h10a6 6 0 0 1 6 6v3" />
                    </svg>
                  </span>
                )}
                {msg.user !== username && !isGrouped && (
                  <div className="msg-sender" style={{ color: avatarColor(msg.user) }}>
                    {msg.user}
                  </div>
                )}

                {!msg.deleted && (
                  <MessageMenu
                    reactions={{
                      emojis: REACTION_EMOJIS,
                      current: msg.reactions?.find((r) => r.user === username)?.emoji,
                      onPick: (emoji) => onReact(msg, emoji),
                    }}
                    items={[
                      { label: 'Reply', onClick: () => onReply(msg) },
                      ...(canEdit(msg, username)
                        ? [{ label: 'Edit', onClick: () => onStartEdit(msg) }]
                        : []),
                      ...(msg.user === username
                        ? [{ label: 'Delete', onClick: () => onDelete(msg), danger: true }]
                        : []),
                    ]}
                  />
                )}

                {msg.replyTo && !msg.deleted && (
                  <div
                    className={`reply-quote ${loadedIds.has(msg.replyTo._id) ? 'clickable' : ''}`}
                    onClick={() => loadedIds.has(msg.replyTo._id) && jumpTo(msg.replyTo._id)}
                  >
                    <div className="reply-quote-name">
                      {msg.replyTo.user === username ? 'You' : msg.replyTo.user}
                    </div>
                    <div className="reply-quote-text">
                      {msg.replyTo.deleted ? 'This message was deleted' : msg.replyTo.text}
                    </div>
                  </div>
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

                {!msg.deleted && msg.reactions?.length > 0 && (
                  <div className="reactions">
                    {groupReactions(msg.reactions, username).map((g) => (
                      <button
                        key={g.emoji}
                        type="button"
                        className={`reaction-chip ${g.mine ? 'mine' : ''}`}
                        title={g.users.join(', ')}
                        onClick={() => onReact(msg, g.emoji)}
                      >
                        <span className="reaction-emoji">{g.emoji}</span>
                        <span className="reaction-count">{g.count}</span>
                      </button>
                    ))}
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