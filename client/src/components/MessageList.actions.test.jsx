import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { REACTION_EMOJIS } from '../utils/helpers';
import { makeMsg, renderList, bubble } from '../test/messageList';

const MINUTE = 60 * 1000;
const [THUMBS_UP, HEART] = REACTION_EMOJIS;

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.innerWidth = 1024; // desktop
});

// Click the ⋮ button of one specific message
const openMenu = (user, id) => user.click(bubble(id).getByRole('button', { name: 'Message options' }));
const menuItem = (name) => screen.queryByRole('button', { name });

describe('message menu: who gets which actions', () => {
    it('offers only Reply (plus reactions) on someone else’s message', async () => {
        const { user } = renderList([makeMsg({ user: 'bob' })]);
        await openMenu(user, 'm1');

        expect(menuItem('Reply')).toBeInTheDocument();
        expect(menuItem('Edit')).not.toBeInTheDocument();
        expect(menuItem('Delete')).not.toBeInTheDocument();
    });

    it('offers Reply, Edit and Delete on your own fresh message', async () => {
        const { user } = renderList([makeMsg({ user: 'alice' })]);
        await openMenu(user, 'm1');

        expect(menuItem('Reply')).toBeInTheDocument();
        expect(menuItem('Edit')).toBeInTheDocument();
        expect(menuItem('Delete')).toBeInTheDocument();
    });

    it('drops Edit once your message is older than 15 minutes', async () => {
        const { user } = renderList([makeMsg({ user: 'alice', timestamp: Date.now() - 20 * MINUTE })]);
        await openMenu(user, 'm1');

        expect(menuItem('Reply')).toBeInTheDocument();
        expect(menuItem('Delete')).toBeInTheDocument();
        expect(menuItem('Edit')).not.toBeInTheDocument();
    });

    it('only opens the menu of the message you clicked', async () => {
        const { user } = renderList([
            makeMsg({ _id: 'm1', user: 'bob' }),
            makeMsg({ _id: 'm2', user: 'alice', text: 'mine' }),
        ]);
        await openMenu(user, 'm1');

        expect(screen.getAllByRole('button', { name: 'Reply' })).toHaveLength(1);
        expect(menuItem('Delete')).not.toBeInTheDocument(); // m2's actions are not showing
    });

    it('closes when you click somewhere else', async () => {
        const { user } = renderList([makeMsg()]);
        await openMenu(user, 'm1');
        await user.click(document.body);

        expect(menuItem('Reply')).not.toBeInTheDocument();
    });
});

describe('message menu: running the actions', () => {
    it('Reply hands the message to onReply and closes the menu', async () => {
        const msg = makeMsg();
        const { user, onReply } = renderList([msg]);

        await openMenu(user, 'm1');
        await user.click(menuItem('Reply'));

        expect(onReply).toHaveBeenCalledWith(msg);
        expect(menuItem('Reply')).not.toBeInTheDocument();
    });

    it('Edit hands the message to onStartEdit', async () => {
        const msg = makeMsg({ user: 'alice' });
        const { user, onStartEdit } = renderList([msg]);

        await openMenu(user, 'm1');
        await user.click(menuItem('Edit'));
        expect(onStartEdit).toHaveBeenCalledWith(msg);
    });

    it('Delete hands the message to onDelete', async () => {
        const msg = makeMsg({ user: 'alice' });
        const { user, onDelete } = renderList([msg]);

        await openMenu(user, 'm1');
        await user.click(menuItem('Delete'));
        expect(onDelete).toHaveBeenCalledWith(msg);
    });
});

describe('message menu: emoji row', () => {
    it('lists every allowed reaction emoji', async () => {
        const { user } = renderList([makeMsg()]);
        await openMenu(user, 'm1');

        for (const emoji of REACTION_EMOJIS) {
            expect(menuItem(emoji)).toBeInTheDocument();
        }
    });

    it('sends the picked emoji to onReact and closes the menu', async () => {
        const msg = makeMsg();
        const { user, onReact } = renderList([msg]);

        await openMenu(user, 'm1');
        await user.click(menuItem(THUMBS_UP));

        expect(onReact).toHaveBeenCalledWith(msg, THUMBS_UP);
        expect(menuItem('Reply')).not.toBeInTheDocument();
    });

    it('highlights the emoji you already reacted with', async () => {
        const { user } = renderList([makeMsg({ reactions: [{ user: 'alice', emoji: HEART }] })]);
        await openMenu(user, 'm1');

        expect(menuItem(HEART)).toHaveClass('active');
        expect(menuItem(THUMBS_UP)).not.toHaveClass('active');
    });
});

describe('editing a message', () => {
    const mine = makeMsg({ user: 'alice', text: 'original text' });
    const editing = { editingId: 'm1', editText: 'draft' };

    it('swaps the text for an edit box holding the draft', () => {
        renderList([mine], editing);

        expect(screen.getByRole('textbox')).toHaveValue('draft');
        expect(screen.queryByText('original text')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('reports typing through onEditTextChange', async () => {
        const { user, onEditTextChange } = renderList([mine], editing);

        await user.type(screen.getByRole('textbox'), '!');
        expect(onEditTextChange).toHaveBeenCalledWith('draft!');
    });

    it('Save submits the edit exactly once', async () => {
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox')); // the real app focuses the box when editing starts
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(onSubmitEdit).toHaveBeenCalledTimes(1);
        expect(onSubmitEdit).toHaveBeenCalledWith(mine);
    });

    it('Cancel throws the edit away instead of saving it', async () => {
        const { user, onSubmitEdit, onCancelEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancelEdit).toHaveBeenCalled();
        expect(onSubmitEdit).not.toHaveBeenCalled();
    });

    it('Enter saves on a desktop-sized screen', async () => {
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.keyboard('{Enter}');
        expect(onSubmitEdit).toHaveBeenCalledWith(mine);
    });

    it('Shift+Enter does not save (it adds a new line)', async () => {
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.keyboard('{Shift>}{Enter}{/Shift}');
        expect(onSubmitEdit).not.toHaveBeenCalled();
    });

    it('Enter does not save on a phone-sized screen', async () => {
        window.innerWidth = 500;
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.keyboard('{Enter}');
        expect(onSubmitEdit).not.toHaveBeenCalled();
    });

    it('Escape cancels', async () => {
        const { user, onCancelEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.keyboard('{Escape}');
        expect(onCancelEdit).toHaveBeenCalledTimes(1);
    });

    it('clicking away saves the edit on desktop', async () => {
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.click(document.body);
        expect(onSubmitEdit).toHaveBeenCalledTimes(1);
    });

    it('clicking away does not save on a phone', async () => {
        window.innerWidth = 500;
        const { user, onSubmitEdit } = renderList([mine], editing);

        await user.click(screen.getByRole('textbox'));
        await user.click(document.body);
        expect(onSubmitEdit).not.toHaveBeenCalled();
    });
});

describe('swipe right to reply', () => {
    const msg = makeMsg();
    const touch = (x, y) => ({ touches: [{ clientX: x, clientY: y }] });

    // Drag a finger from (0,0) to (dx,dy) on the bubble, then lift it
    function swipe(el, dx, dy = 0) {
        fireEvent.touchStart(el, touch(0, 0));
        fireEvent.touchMove(el, touch(dx, dy));
        fireEvent.touchEnd(el);
    }

    const el = () => document.getElementById('msg-m1');

    it('replies when dragged far enough to the right', () => {
        const { onReply } = renderList([msg]);

        swipe(el(), 70);
        expect(onReply).toHaveBeenCalledWith(msg);
    });

    it('does nothing when not dragged far enough', () => {
        const { onReply } = renderList([msg]);

        swipe(el(), 30);
        expect(onReply).not.toHaveBeenCalled();
    });

    it('treats a mostly vertical drag as scrolling, not a swipe', () => {
        const { onReply } = renderList([msg]);

        swipe(el(), 15, 60);
        expect(onReply).not.toHaveBeenCalled();
    });

    it('ignores swipes to the left', () => {
        const { onReply } = renderList([msg]);

        swipe(el(), -80);
        expect(onReply).not.toHaveBeenCalled();
    });

    it('slides the bubble with the finger, then springs back', () => {
        renderList([msg]);

        fireEvent.touchStart(el(), touch(0, 0));
        fireEvent.touchMove(el(), touch(40, 0));
        expect(el().style.transform).toBe('translateX(40px)');
        expect(el()).not.toHaveClass('swipe-ready');

        fireEvent.touchMove(el(), touch(65, 0));
        expect(el()).toHaveClass('swipe-ready'); // past the trigger distance

        fireEvent.touchEnd(el());
        expect(el().style.transform).toBe('');
    });

    it('cannot be swiped once the message is deleted', () => {
        const { onReply } = renderList([makeMsg({ deleted: true, text: '' })]);

        swipe(el(), 70);
        expect(onReply).not.toHaveBeenCalled();
    });

    it('cannot be swiped while that message is being edited', () => {
        const { onReply } = renderList([makeMsg({ user: 'alice' })], { editingId: 'm1', editText: 'x' });

        swipe(el(), 70);
        expect(onReply).not.toHaveBeenCalled();
    });
});