import { isMobile } from '../utils/helpers';

export default function MessageInput({ input, onChange, onSubmit, inputRef, username, replyingTo, onCancelReply }) {
  function handleKeyDown(e) {
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  return (
    <>
      {replyingTo && (
        <div className="reply-strip">
          <div className="reply-strip-body">
            <div className="reply-strip-name">
              Replying to {replyingTo.user === username ? 'yourself' : replyingTo.user}
            </div>
            <div className="reply-strip-text">{replyingTo.text}</div>
          </div>
          <button type="button" className="reply-strip-close" onClick={onCancelReply} aria-label="Cancel reply">
            ✕
          </button>
        </div>
      )}

      <form className="input-bar" onSubmit={onSubmit}>
        <div className="input-shell">
          <textarea
            ref={inputRef}
            className="message-input"
            value={input}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
          />
          <button type="submit" className="send-btn" disabled={!input.trim()} aria-label="Send">
            <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor" style={{ transform: 'translate(-2px, 0px)' }}>
              <path d="M22 2L2 11l7 3 2 7 4-5 5 3 2-17z" />
            </svg>
          </button>
        </div>
      </form>
    </>
  );
}
