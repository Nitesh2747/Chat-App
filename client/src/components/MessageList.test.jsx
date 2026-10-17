import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { REACTION_EMOJIS } from '../utils/helpers';
import { makeMsg, renderList, bubble } from '../test/messageList';

const [THUMBS_UP, HEART] = REACTION_EMOJIS;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn(); // jsdom can't scroll
});

describe('what a message looks like', () => {
    it('shows the text and the sender’s name for other people’s messages', () => {
        renderList([makeMsg({ user: 'bob', text: 'hi alice' })]);

        expect(screen.getByText('hi alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('does not show a name above your own messages', () => {
        renderList([makeMsg({ user: 'alice', text: 'my message' })]);

        expect(screen.getByText('my message')).toBeInTheDocument();
        expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });

    it('shows the sender’s name only once for a run of messages', () => {
        const t = Date.now();
        renderList([
            makeMsg({ _id: 'm1', user: 'bob', text: 'one', timestamp: t }),
            makeMsg({ _id: 'm2', user: 'bob', text: 'two', timestamp: t + 1000 }),
        ]);

        expect(screen.getAllByText('bob')).toHaveLength(1);
    });

    it('shows the name again when someone else spoke in between', () => {
        const t = Date.now();
        renderList([
            makeMsg({ _id: 'm1', user: 'bob', text: 'one', timestamp: t }),
            makeMsg({ _id: 'm2', user: 'alice', text: 'two', timestamp: t + 1000 }),
            makeMsg({ _id: 'm3', user: 'bob', text: 'three', timestamp: t + 2000 }),
        ]);

        expect(screen.getAllByText('bob')).toHaveLength(2);
    });

    it('shows system messages as plain notices without a menu', () => {
        renderList([makeMsg({ user: 'system', text: 'carol joined the group', system: true })]);

        expect(screen.getByText('carol joined the group')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Message options' })).not.toBeInTheDocument();
    });

    it('labels edited messages', () => {
        renderList([makeMsg({ edited: true })]);
        expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('shows a deleted message as a notice, with no menu and no reactions', () => {
        renderList([
            makeMsg({ deleted: true, text: '', reactions: [{ user: 'carol', emoji: THUMBS_UP }] }),
        ]);

        expect(screen.getByText('This message was deleted')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Message options' })).not.toBeInTheDocument();
        expect(screen.queryByTitle('carol')).not.toBeInTheDocument();
    });
});

describe('delivery ticks', () => {
    it('shows one tick for a message that has not reached anyone yet', () => {
        renderList([makeMsg({ user: 'alice', deliveredTo: [], readBy: [] })]);
        expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows two ticks once it is delivered', () => {
        renderList([makeMsg({ user: 'alice', deliveredTo: ['bob'], readBy: [] })]);
        expect(screen.getByText('✓✓')).toBeInTheDocument();
        expect(screen.getByText('✓✓')).not.toHaveClass('read');
    });

    it('marks the ticks as read once someone has read it', () => {
        renderList([makeMsg({ user: 'alice', deliveredTo: ['bob'], readBy: ['bob'] })]);
        expect(screen.getByText('✓✓')).toHaveClass('read');
    });

    it('shows no ticks on other people’s messages', () => {
        renderList([makeMsg({ user: 'bob' })]);
        expect(screen.queryByText('✓')).not.toBeInTheDocument();
        expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    });
});

describe('unread divider', () => {
    const messages = [makeMsg({ _id: 'm1' }), makeMsg({ _id: 'm2', text: 'new one' })];

    it('says how many messages are unread', () => {
        renderList(messages, { unreadMarker: { id: 'm2', count: 3 } });
        expect(screen.getByText('3 unread messages')).toBeInTheDocument();
    });

    it('uses the singular for a single unread message', () => {
        renderList(messages, { unreadMarker: { id: 'm2', count: 1 } });
        expect(screen.getByText('1 unread message')).toBeInTheDocument();
    });

    it('is absent when there is no marker', () => {
        renderList(messages);
        expect(screen.queryByText(/unread message/)).not.toBeInTheDocument();
    });
});

describe('reply quotes', () => {
    const original = { _id: 'm1', user: 'bob', text: 'want pizza?' };

    it('quotes the original sender and text inside the reply', () => {
        renderList([
            makeMsg({ _id: 'm1', user: 'bob', text: 'want pizza?' }),
            makeMsg({ _id: 'm2', user: 'alice', text: 'yes!', replyTo: original }),
        ]);

        const reply = bubble('m2');
        expect(reply.getByText('bob')).toBeInTheDocument();
        expect(reply.getByText('want pizza?')).toBeInTheDocument();
    });

    it('calls it "You" when you are quoting your own message', () => {
        renderList([
            makeMsg({ _id: 'm1', user: 'alice', text: 'my idea' }),
            makeMsg({ _id: 'm2', user: 'bob', text: 'agreed', replyTo: { _id: 'm1', user: 'alice', text: 'my idea' } }),
        ]);

        expect(bubble('m2').getByText('You')).toBeInTheDocument();
    });

    it('shows "This message was deleted" when the quoted message is gone', () => {
        renderList([
            makeMsg({ _id: 'm2', user: 'alice', text: 'ok', replyTo: { ...original, text: '', deleted: true } }),
        ]);

        expect(bubble('m2').getByText('This message was deleted')).toBeInTheDocument();
        expect(screen.queryByText('want pizza?')).not.toBeInTheDocument();
    });

    it('jumps to the original and highlights it when the quote is clicked', async () => {
        const { user } = renderList([
            makeMsg({ _id: 'm1', user: 'bob', text: 'want pizza?' }),
            makeMsg({ _id: 'm2', user: 'alice', text: 'yes!', replyTo: original }),
        ]);

        await user.click(bubble('m2').getByText('want pizza?'));

        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        expect(document.getElementById('msg-m1')).toHaveClass('highlight');
    });

    it('cannot jump when the original is older than the loaded history', async () => {
        const { user } = renderList([
            makeMsg({ _id: 'm2', user: 'alice', text: 'yes!', replyTo: original }),
        ]);

        await user.click(screen.getByText('want pizza?'));

        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
        expect(screen.getByText('want pizza?').closest('.reply-quote')).not.toHaveClass('clickable');
    });
});

describe('reaction chips', () => {
    it('shows no chips when nobody reacted', () => {
        renderList([makeMsg({ reactions: [] })]);
        expect(screen.queryByTitle(/bob|carol|alice/)).not.toBeInTheDocument();
    });

    it('groups reactions by emoji and shows the count', () => {
        renderList([
            makeMsg({
                reactions: [
                    { user: 'bob', emoji: THUMBS_UP },
                    { user: 'carol', emoji: THUMBS_UP },
                    { user: 'dave', emoji: HEART },
                ],
            }),
        ]);

        const thumbs = screen.getByTitle('bob, carol'); // the tooltip lists who reacted
        expect(thumbs).toHaveTextContent(THUMBS_UP);
        expect(thumbs).toHaveTextContent('2');
        expect(screen.getByTitle('dave')).toHaveTextContent('1');
    });

    it('highlights the chip you reacted with, and only that one', () => {
        renderList([
            makeMsg({
                reactions: [
                    { user: 'alice', emoji: HEART },
                    { user: 'bob', emoji: THUMBS_UP },
                ],
            }),
        ]);

        expect(screen.getByTitle('alice')).toHaveClass('mine');
        expect(screen.getByTitle('bob')).not.toHaveClass('mine');
    });

    it('toggles your reaction when a chip is tapped', async () => {
        const msg = makeMsg({ reactions: [{ user: 'bob', emoji: THUMBS_UP }] });
        const { user, onReact } = renderList([msg]);

        await user.click(screen.getByTitle('bob'));
        expect(onReact).toHaveBeenCalledWith(msg, THUMBS_UP);
    });
});