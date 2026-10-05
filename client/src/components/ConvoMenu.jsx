import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConvoMenu({ onDeleteChat }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
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
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        setOpen((o) => !o);
    }

    return (
        <div className="convo-menu-wrapper">
            <button ref={triggerRef} className="convo-menu-trigger" onClick={handleToggle}>
                ⋮
            </button>
            {open &&
                createPortal(
                    <div ref={menuRef} className="convo-menu-dropdown" style={{ top: pos.top, right: pos.right }}>
                        <button
                            className="user-menu-item danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                onDeleteChat();
                            }}
                        >
                            Delete chat
                        </button>
                    </div>,
                    document.body
                )}
        </div>
    );
}