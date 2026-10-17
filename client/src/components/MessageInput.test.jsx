import { createRef } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from './MessageInput';

// jsdom has no layout engine, so it doesn't implement scrolling. Give it a stand-in.
beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    localStorage.clear(); // "recent emoji" are stored here and would leak between tests
    window.innerWidth = 1024; // desktop
});

// Render the component with spy functions for every callback it receives
function renderInput(props = {}) {
    const handlers = {
        onChange: vi.fn(),
        onSubmit: vi.fn((e) => e.preventDefault()),
        onCancelReply: vi.fn(),
        onEmoji: vi.fn(),
    };
    render(
        <MessageInput
            input=""
            inputRef={createRef()}
            username="alice"
            replyingTo={null}
            {...handlers}
            {...props}
        />
    );
    return { user: userEvent.setup(), ...handlers };
}

const textbox = () => screen.getByPlaceholderText('Type a message');
const sendButton = () => screen.getByRole('button', { name: 'Send' });
const emojiButton = () => screen.getByRole('button', { name: 'Emoji' });

describe('sending', () => {
    it('has the Send button disabled while the box is empty', () => {
        renderInput({ input: '' });
        expect(sendButton()).toBeDisabled();
    });

    it('has the Send button disabled for spaces only', () => {
        renderInput({ input: '   ' });
        expect(sendButton()).toBeDisabled();
    });

    it('enables Send once there is text, and clicking it submits', async () => {
        const { user, onSubmit } = renderInput({ input: 'hello' });

        expect(sendButton()).toBeEnabled();
        await user.click(sendButton());
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('submits when Enter is pressed on a desktop-sized screen', async () => {
        const { user, onSubmit } = renderInput({ input: 'hello' });

        await user.click(textbox());
        await user.keyboard('{Enter}');
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not submit on Shift+Enter (that makes a new line)', async () => {
        const { user, onSubmit } = renderInput({ input: 'hello' });

        await user.click(textbox());
        await user.keyboard('{Shift>}{Enter}{/Shift}');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on Enter on a phone-sized screen', async () => {
        window.innerWidth = 500;
        const { user, onSubmit } = renderInput({ input: 'hello' });

        await user.click(textbox());
        await user.keyboard('{Enter}');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('reports what is typed through onChange', async () => {
        const { user, onChange } = renderInput();

        await user.type(textbox(), 'hi');
        expect(onChange).toHaveBeenCalledTimes(2); // once per character
    });
});

describe('reply bar', () => {
    const original = { _id: 'm1', user: 'bob', text: 'want pizza?' };

    it('is hidden when you are not replying to anything', () => {
        renderInput({ replyingTo: null });
        expect(screen.queryByText(/Replying to/)).not.toBeInTheDocument();
    });

    it('shows who and what you are replying to', () => {
        renderInput({ replyingTo: original });

        expect(screen.getByText('Replying to bob')).toBeInTheDocument();
        expect(screen.getByText('want pizza?')).toBeInTheDocument();
    });

    it('says "yourself" when replying to your own message', () => {
        renderInput({ replyingTo: { ...original, user: 'alice' } });
        expect(screen.getByText('Replying to yourself')).toBeInTheDocument();
    });

    it('cancels with the ✕ button', async () => {
        const { user, onCancelReply } = renderInput({ replyingTo: original });

        await user.click(screen.getByRole('button', { name: 'Cancel reply' }));
        expect(onCancelReply).toHaveBeenCalledTimes(1);
    });

    it('cancels with the Escape key', async () => {
        const { user, onCancelReply } = renderInput({ replyingTo: original });

        await user.click(textbox());
        await user.keyboard('{Escape}');
        expect(onCancelReply).toHaveBeenCalledTimes(1);
    });
});

describe('emoji picker', () => {
    it('is closed at first and opens from the smiley button', async () => {
        const { user } = renderInput();
        expect(screen.queryByTitle('Gestures')).not.toBeInTheDocument();

        await user.click(emojiButton());
        expect(screen.getByTitle('Gestures')).toBeInTheDocument();
    });

    it('closes when the smiley button is clicked again', async () => {
        const { user } = renderInput();

        await user.click(emojiButton());
        await user.click(emojiButton());
        expect(screen.queryByTitle('Gestures')).not.toBeInTheDocument();
    });

    it('closes when you click somewhere outside it', async () => {
        const { user } = renderInput();

        await user.click(emojiButton());
        await user.click(document.body);
        expect(screen.queryByTitle('Gestures')).not.toBeInTheDocument();
    });

    it('hands the chosen emoji to onEmoji', async () => {
        const { user, onEmoji } = renderInput();

        await user.click(emojiButton());
        await user.click(screen.getByRole('button', { name: '😂' }));
        expect(onEmoji).toHaveBeenCalledWith('😂');
    });

    it('stays open after picking, so you can pick several', async () => {
        const { user, onEmoji } = renderInput();

        await user.click(emojiButton());
        await user.click(screen.getByRole('button', { name: '😂' }));
        await user.click(screen.getByRole('button', { name: '🥳' }));

        expect(onEmoji).toHaveBeenCalledTimes(2);
        expect(screen.getByTitle('Gestures')).toBeInTheDocument();
    });

    it('highlights a category tab and scrolls to it when clicked', async () => {
        const { user } = renderInput();
        await user.click(emojiButton());

        await user.click(screen.getByTitle('Gestures'));
        expect(screen.getByTitle('Gestures')).toHaveClass('active');
        expect(screen.getByTitle('Smileys')).not.toHaveClass('active');
        expect(Element.prototype.scrollTo).toHaveBeenCalled();
    });

    it('first Escape closes the picker, the second cancels the reply', async () => {
        const reply = { _id: 'm1', user: 'bob', text: 'want pizza?' };
        const { user, onCancelReply } = renderInput({ replyingTo: reply });

        await user.click(emojiButton());
        textbox().focus(); // clicking the box would count as an outside click, so focus it directly

        await user.keyboard('{Escape}');
        expect(screen.queryByTitle('Gestures')).not.toBeInTheDocument();
        expect(onCancelReply).not.toHaveBeenCalled();

        await user.keyboard('{Escape}');
        expect(onCancelReply).toHaveBeenCalledTimes(1);
    });

    it('remembers picked emoji and lists them under "Recent" next time', async () => {
        const { user } = renderInput();
        expect(screen.queryByTitle('Recent')).not.toBeInTheDocument();

        await user.click(emojiButton()); // open
        expect(screen.queryByTitle('Recent')).not.toBeInTheDocument(); // nothing used yet
        await user.click(screen.getByRole('button', { name: '😂' }));
        await user.click(emojiButton()); // close
        await user.click(emojiButton()); // open again

        expect(screen.getByTitle('Recent')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('chat-recent-emoji'))).toEqual(['😂']);
    });
});