import { isMobile } from '../utils/helpers';

export default function MessageInput({ input, onChange, onSubmit, inputRef }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  return (
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
  );
}