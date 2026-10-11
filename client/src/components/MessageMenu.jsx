import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function MessageMenu({ items, reactions }) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e) {
            if (
                menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    function handleToggle(e) {
        e.stopPropagation();
        anchorRef.current = triggerRef.current.getBoundingClientRect();
        setOpen((o) => !o);
    }

    // Runs when the dropdown mounts: right-align it to the ⋮ button, keep it fully on screen, and open it upwards when there is no room below.
    const placeMenu = useCallback((node) => {
        menuRef.current = node;
        if (!node || !anchorRef.current) return;
        const a = anchorRef.current;
        const { width, height } = node.getBoundingClientRect();
        const margin = 8;
        const left = Math.min(Math.max(a.right - width, margin), window.innerWidth - width - margin);
        let top = a.bottom + 4;
        if (top + height > window.innerHeight - margin) top = Math.max(margin, a.top - height - 4);
        node.style.left = `${left}px`;
        node.style.top = `${top}px`;
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="message-menu-wrapper">
            <button ref={triggerRef} className="message-menu-trigger" onClick={handleToggle}>
                ⋮
            </button>
            {open &&
                createPortal(
                    <div ref={placeMenu} className="convo-menu-dropdown message-dropdown">
                        {reactions && (
                            <div className="menu-emoji-row">
                                {reactions.emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        className={`menu-emoji ${reactions.current === emoji ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpen(false);
                                            reactions.onPick(emoji);
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                        {items.map((item, i) => (
                            <button
                                key={i}
                                className={`user-menu-item ${item.danger ? 'danger' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen(false);
                                    item.onClick();
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}