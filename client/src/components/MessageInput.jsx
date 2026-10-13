import { useEffect, useRef, useState } from 'react';
import { isMobile } from '../utils/helpers';
import { EMOJI_CATEGORIES, loadRecent, saveRecent } from '../utils/emojis';

export default function MessageInput({ input, onChange, onSubmit, inputRef, username, replyingTo, onCancelReply, onEmoji }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [category, setCategory] = useState(0); // which section is highlighted in the tab row
  const [recent, setRecent] = useState(loadRecent);
  const panelRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const scrollRef = useRef(null);
  const sectionRefs = useRef([]);
  const scrollLocked = useRef(false); // ignore scroll-spy while a tab click is smooth-scrolling

  // "Recent" is only listed when there is something in it
  const sections = [...(recent.length ? [{ name: 'Recent', icon: '🕘', emojis: recent }] : []), ...EMOJI_CATEGORIES];

  function toggleEmoji() {
    if (!showEmoji) {
      setRecent(loadRecent()); // refresh only when opening, so the grid never jumps while you pick
      setCategory(0);
    }
    setShowEmoji((v) => !v);
  }

  function pickEmoji(emoji) {
    onEmoji(emoji);
    saveRecent(emoji);
  }

  // Click a tab: highlight it and scroll its section to the top
  function goToSection(i) {
    setCategory(i);
    scrollLocked.current = true;
    setTimeout(() => {
      scrollLocked.current = false;
    }, 700);
    scrollRef.current?.scrollTo({ top: sectionRefs.current[i].offsetTop, behavior: 'smooth' });
  }

  // While scrolling: highlight the last section whose top has passed the top edge
  function handleEmojiScroll(e) {
    if (scrollLocked.current) return;
    const box = e.currentTarget;
    let active = 0;
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 2) {
      active = sections.length - 1; // scrolled all the way down
    } else {
      sectionRefs.current.forEach((el, i) => {
        if (el && el.offsetTop <= box.scrollTop + 8) active = i;
      });
    }
    setCategory(active);
  }

  // Close the picker when you press/tap anywhere outside it
  useEffect(() => {
    if (!showEmoji) return;
    function onPointerDown(e) {
      if (panelRef.current?.contains(e.target) || emojiBtnRef.current?.contains(e.target)) return;
      setShowEmoji(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showEmoji]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (showEmoji) {
        setShowEmoji(false);
        return;
      }
      if (replyingTo) {
        onCancelReply();
        return;
      }
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
        {showEmoji && (
          <div className="emoji-panel" ref={panelRef}>
            <div className="emoji-tabs">
              {sections.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  title={s.name}
                  className={`emoji-tab ${i === category ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToSection(i)}
                >
                  {s.icon}
                </button>
              ))}
            </div>
            <div className="emoji-scroll" ref={scrollRef} onScroll={handleEmojiScroll}>
              {sections.map((s, i) => (
                <div key={s.name} ref={(el) => (sectionRefs.current[i] = el)}>
                  <div className="emoji-section-title">{s.name}</div>
                  <div className="emoji-grid">
                    {s.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="emoji-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="input-shell">
          <button
            type="button"
            ref={emojiBtnRef}
            className={`emoji-btn ${showEmoji ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleEmoji}
            aria-label="Emoji"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
              <circle cx="9" cy="10" r="0.6" fill="currentColor" />
              <circle cx="15" cy="10" r="0.6" fill="currentColor" />
            </svg>
          </button>
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