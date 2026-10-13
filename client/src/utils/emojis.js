// Emoji shown in the composer picker, grouped by category.
export const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
      '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
      '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩',
      '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🤗', '🤔', '🤭', '🤫', '😶', '😐', '😑', '😬', '🙄', '😯', '😮', '😲',
      '🥱', '😴', '🤤', '😪', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
    ],
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👋',
      '🤚', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '💪', '🫶', '🤲', '👀', '🧠', '🫡', '🤦',
      '🤷', '🙋', '💃', '🕺',
    ],
  },
  {
    name: 'Hearts & symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗',
      '💖', '💘', '💝', '✨', '🔥', '💯', '⭐', '🌟', '🎉', '🎊', '✅', '❌', '❓', '❗',
      '💤', '💥', '💫', '💦',
    ],
  },
  {
    name: 'Animals & food',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸',
      '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦄', '🐝', '🦋', '🐢', '🐙', '🐬', '🐳',
      '🍎', '🍌', '🍉', '🍓', '🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🍪', '🎂', '🍫', '☕',
    ],
  },
  {
    name: 'Activities & objects',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '🎾', '🏐', '🎮', '🎧', '🎤', '🎬', '🎨', '📚', '💻', '📱', '📷',
      '🎁', '🎈', '🏆', '🥇', '🚗', '✈️', '🚀', '🌍', '🌈', '☀️', '🌙', '⛄', '💡', '🔑',
    ],
  },
];

// ---- Recently used emoji (kept in this browser's localStorage) ----
const RECENT_KEY = 'chat-recent-emoji';
const RECENT_MAX = 24;

export function loadRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(saved) ? saved.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecent(emoji) {
  try {
    const next = [emoji, ...loadRecent().filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode etc.): recents just won't be remembered
  }
}