import { createRef } from 'react';
import { vi } from 'vitest';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageList from '../components/MessageList';

// A message with sensible defaults; override only what a test cares about
export function makeMsg(overrides = {}) {
    return { _id: 'm1', user: 'bob', text: 'hello', timestamp: Date.now(), reactions: [], ...overrides };
}

// Render the list as "alice", with a spy for every callback
export function renderList(messages, props = {}) {
    const handlers = {
        onReply: vi.fn(),
        onReact: vi.fn(),
        onStartEdit: vi.fn(),
        onDelete: vi.fn(),
        onSubmitEdit: vi.fn(),
        onCancelEdit: vi.fn(),
        onEditTextChange: vi.fn(),
    };
    render(
        <MessageList
            messages={messages}
            username="alice"
            unreadMarker={null}
            editingId={null}
            editText=""
            editInputRef={createRef()}
            bottomRef={createRef()}
            {...handlers}
            {...props}
        />
    );
    return { user: userEvent.setup(), ...handlers };
}

// Each bubble has the id "msg-<message id>", so tests can look inside one specific message
export const bubble = (id) => within(document.getElementById(`msg-${id}`));