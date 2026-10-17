import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  avatarColor,
  convoLabel,
  canEdit,
  isMobile,
  formatLastSeen,
  EDIT_WINDOW_MS,
  MOBILE_BREAKPOINT,
} from './helpers';

afterEach(() => {
  vi.useRealTimers();
});

describe('avatarColor', () => {
  it('gives the same name the same color every time', () => {
    expect(avatarColor('alice')).toBe(avatarColor('alice'));
  });

  it('gives different names different colors', () => {
    expect(avatarColor('alice')).not.toBe(avatarColor('bob'));
  });

  it('returns a valid hsl color', () => {
    expect(avatarColor('alice')).toMatch(/^hsl\(\d+ 55% 45%\)$/);
  });
});

describe('convoLabel', () => {
  it('uses the group name for groups', () => {
    const group = { isGroup: true, name: 'Weekend plans', members: [] };
    expect(convoLabel(group, 'alice')).toBe('Weekend plans');
  });

  it('shows the other person’s name for a DM', () => {
    const dm = { isGroup: false, members: [{ username: 'alice' }, { username: 'bob' }] };
    expect(convoLabel(dm, 'alice')).toBe('bob');
    expect(convoLabel(dm, 'bob')).toBe('alice');
  });

  it('shows "Deleted User" when the other person’s account is gone', () => {
    const dm = { isGroup: false, members: [{ username: 'alice' }, null] };
    expect(convoLabel(dm, 'alice')).toBe('Deleted User');
  });
});

describe('canEdit', () => {
  const NOW = new Date('2026-06-15T12:00:00').getTime();

  function setup() {
    vi.useFakeTimers();
    vi.setSystemTime(NOW); // freeze "now" so the tests never depend on the real clock
  }

  it('allows the sender to edit a fresh message', () => {
    setup();
    expect(canEdit({ user: 'alice', timestamp: NOW - 60 * 1000 }, 'alice')).toBe(true);
  });

  it('does not allow editing someone else’s message', () => {
    setup();
    expect(canEdit({ user: 'bob', timestamp: NOW - 60 * 1000 }, 'alice')).toBe(false);
  });

  it('allows an edit exactly at the 15-minute limit', () => {
    setup();
    expect(canEdit({ user: 'alice', timestamp: NOW - EDIT_WINDOW_MS }, 'alice')).toBe(true);
  });

  it('refuses an edit one second after the limit', () => {
    setup();
    expect(canEdit({ user: 'alice', timestamp: NOW - EDIT_WINDOW_MS - 1000 }, 'alice')).toBe(false);
  });
});

describe('isMobile', () => {
  it('is true at the breakpoint width and below', () => {
    window.innerWidth = MOBILE_BREAKPOINT;
    expect(isMobile()).toBe(true);
  });

  it('is false just above the breakpoint', () => {
    window.innerWidth = MOBILE_BREAKPOINT + 1;
    expect(isMobile()).toBe(false);
  });
});

describe('formatLastSeen', () => {
  function setup() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00')); // a Monday, noon
  }

  it('says offline when there is no last-seen time', () => {
    expect(formatLastSeen(undefined)).toBe('offline');
    expect(formatLastSeen(null)).toBe('offline');
  });

  it('says "today" for earlier the same day', () => {
    setup();
    expect(formatLastSeen(new Date('2026-06-15T09:30:00'))).toMatch(/^last seen today at /);
  });

  it('says "yesterday" for the day before', () => {
    setup();
    expect(formatLastSeen(new Date('2026-06-14T21:15:00'))).toMatch(/^last seen yesterday at /);
  });

  it('shows the date for anything older', () => {
    setup();
    const text = formatLastSeen(new Date('2026-06-01T08:00:00'));
    expect(text).toMatch(/^last seen /);
    expect(text).not.toMatch(/today|yesterday/);
  });
});