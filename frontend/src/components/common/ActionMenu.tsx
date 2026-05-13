import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

interface Action {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: Action[];
}

export default function ActionMenu({ actions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, placedTop: false });

  const updatePosition = () => {
    const trigger = triggerButtonRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth ?? 176;
    const menuHeight = menu?.offsetHeight ?? Math.max(actions.length * 42, 120);
    const viewportPadding = 8;

    const shouldPlaceTop = rect.bottom + menuHeight + 8 > window.innerHeight && rect.top - menuHeight - 8 > viewportPadding;
    const top = shouldPlaceTop
      ? Math.max(viewportPadding, rect.top - menuHeight - 6)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + 6);
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setPosition({
      top,
      left,
      placedTop: shouldPlaceTop,
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const clickedTrigger = triggerWrapRef.current?.contains(e.target as Node) ?? false;
      const clickedMenu = menuRef.current?.contains(e.target as Node) ?? false;
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const rafId = window.requestAnimationFrame(updatePosition);
    const onViewportChange = () => updatePosition();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, actions.length]);

  return (
    <div ref={triggerWrapRef} className="relative inline-block">
      <button
        ref={triggerButtonRef}
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-150"
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={`fixed w-44 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[95] animate-in fade-in duration-150 ${
              position.placedTop ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'
            }`}
            style={{ top: position.top, left: position.left }}
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                  action.variant === 'danger'
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {action.icon && <span className="[&>*]:w-3.5 [&>*]:h-3.5">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
