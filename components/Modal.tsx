'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  hideHeader?: boolean;
  initialFocus?: string;
  restoreFocus?: () => void;
}

const focusable = 'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex]';

export default function Modal({ title, children, onClose, wide = false, className = '', hideHeader = false, initialFocus, restoreFocus }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  const restoreRef = useRef(restoreFocus);
  const backdropDown = useRef(false);
  closeRef.current = onClose;
  restoreRef.current = restoreFocus;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const isTopmost = () => Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).at(-1) === ref.current;
    const controls = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(focusable) ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
    const frame = requestAnimationFrame(() => {
      if (!isTopmost()) return;
      (initialFocus ? ref.current?.querySelector<HTMLElement>(initialFocus) : null)?.focus({ preventScroll: true });
      if (!ref.current?.contains(document.activeElement)) (controls()[0] ?? ref.current)?.focus({ preventScroll: true });
    });
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || !isTopmost()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = controls();
      if (!elements.length) { event.preventDefault(); ref.current?.focus(); return; }
      const current = document.activeElement;
      const outside = !ref.current?.contains(current) || !elements.includes(current as HTMLElement);
      if (event.shiftKey && (current === elements[0] || outside || current === ref.current)) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && (current === elements.at(-1) || outside)) { event.preventDefault(); elements[0].focus(); }
    };
    const containFocus = (event: FocusEvent) => {
      if (!isTopmost() || ref.current?.contains(event.target as Node)) return;
      (controls()[0] ?? ref.current)?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', containFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', key);
      document.removeEventListener('focusin', containFocus);
      if (restoreRef.current) restoreRef.current();
      else if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
    };
  }, [initialFocus]);

  return <div className={`modal-backdrop ${className ? `${className}-backdrop` : ''}`} onPointerDown={event => { backdropDown.current = event.button === 0 && event.target === event.currentTarget; }} onPointerUp={event => {
    if (backdropDown.current && event.target === event.currentTarget) closeRef.current();
    backdropDown.current = false;
  }} onPointerCancel={() => { backdropDown.current = false; }}>
    <div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
      {hideHeader ? <h2 id={id} className="sr-only">{title}</h2> : <header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close / بستن" onClick={onClose}><X size={19} /></button></header>}
      {children}
    </div>
  </div>;
}
