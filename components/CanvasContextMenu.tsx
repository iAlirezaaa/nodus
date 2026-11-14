'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Language } from '@/lib/types';
import './interaction-tools.css';

export interface ContextAction { id: string; label: string; hint?: string; danger?: boolean; disabled?: boolean; separator?: boolean; run: () => void; }
export default function CanvasContextMenu({ x, y, title, actions, language, onDismiss }: {
  x: number; y: number; title: string; actions: ContextAction[]; language: Language; onDismiss: (restoreFocus?: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const close = useRef(onDismiss); close.current = onDismiss;
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const element = menu.current; if (!element) return;
    const box = element.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) });
    element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
  }, [x, y]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) close.current(false); };
    const dismiss = () => close.current(false);
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => { window.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', dismiss); window.removeEventListener('blur', dismiss); };
  }, []);
  return <div ref={menu} className="canvas-context-menu" style={position} role="menu" aria-label={language === 'fa' ? 'عملیات بوم' : 'Canvas actions'}
    onContextMenu={event => event.preventDefault()} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onDismiss(true); return; }
      if (event.key === 'Tab') { onDismiss(false); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }}>
    <div className="context-heading" dir="auto">{title}</div>
    {actions.map(action => <div key={action.id} className={action.separator ? 'context-section' : undefined} role="none"><button type="button" role="menuitem" disabled={action.disabled} className={action.danger ? 'danger' : ''} onClick={() => { onDismiss(false); action.run(); }}><span>{action.label}</span>{action.hint && <kbd>{action.hint}</kbd>}</button></div>)}
  </div>;
}
