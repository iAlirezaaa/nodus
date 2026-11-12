'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalOrigin = { x: number; y: number; width: number; height: number };

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  hideHeader?: boolean;
  initialFocus?: string;
  restoreFocus?: () => void;
  motionOrigin?: ModalOrigin | null;
  closing?: boolean;
  onExited?: () => void;
}

const focusable = 'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex]';

export default function Modal({ title, children, onClose, wide = false, className = '', hideHeader = false, initialFocus, restoreFocus, motionOrigin, closing = false, onExited }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  const restoreRef = useRef(restoreFocus);
  const exitRef = useRef(onExited);
  const closingRef = useRef(closing);
  const exitFinished = useRef(false);
  const backdropDown = useRef(false);
  const isNodeDialog = className.split(/\s+/).includes('node-dialog');
  closeRef.current = onClose;
  restoreRef.current = restoreFocus;
  exitRef.current = onExited;
  closingRef.current = closing;

  const requestClose = useCallback(() => {
    if (!closingRef.current) closeRef.current();
  }, []);
  const finishExit = useCallback(() => {
    if (!closingRef.current || exitFinished.current) return;
    exitFinished.current = true;
    exitRef.current?.();
  }, []);

  useLayoutEffect(() => {
    if (!isNodeDialog) return;
    const element = ref.current;
    if (!element) return;
    const measureOrigin = () => {
      const width = element.offsetWidth, height = element.offsetHeight;
      const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
      const origin = motionOrigin;
      const usable = origin && [origin.x, origin.y, origin.width, origin.height].every(Number.isFinite)
        && origin.width > 0 && origin.height > 0 && origin.x + origin.width > 0
        && origin.y + origin.height > 0 && origin.x < viewportWidth && origin.y < viewportHeight;
      if (!usable || !width || !height) {
        element.style.removeProperty('--dialog-origin-x');
        element.style.removeProperty('--dialog-origin-y');
        element.style.removeProperty('--dialog-origin-scale');
        element.dataset.motionOrigin = 'center';
        return;
      }
      // offset dimensions stay untransformed while the entrance animation runs.
      const parent = element.offsetParent?.getBoundingClientRect();
      const centerX = (parent?.left ?? 0) + element.offsetLeft + width / 2;
      const centerY = (parent?.top ?? 0) + element.offsetTop + height / 2;
      const x = Math.max(-viewportWidth, Math.min(viewportWidth, origin.x + origin.width / 2 - centerX));
      const y = Math.max(-viewportHeight, Math.min(viewportHeight, origin.y + origin.height / 2 - centerY));
      const scale = Math.max(.08, Math.min(.42, Math.sqrt(origin.width * origin.height / (width * height))));
      element.style.setProperty('--dialog-origin-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--dialog-origin-y', `${y.toFixed(2)}px`);
      element.style.setProperty('--dialog-origin-scale', scale.toFixed(4));
      element.dataset.motionOrigin = 'node';
    };
    measureOrigin();
    window.addEventListener('resize', measureOrigin);
    return () => window.removeEventListener('resize', measureOrigin);
  }, [isNodeDialog, motionOrigin?.x, motionOrigin?.y, motionOrigin?.width, motionOrigin?.height]);

  useEffect(() => {
    exitFinished.current = false;
    if (!closing) return;
    backdropDown.current = false;
    ref.current?.focus({ preventScroll: true });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishIfReduced = () => { if (reducedMotion.matches) finishExit(); };
    // Animation events are an optimization; hiding a tab must not strand a dialog.
    const timer = window.setTimeout(finishExit, isNodeDialog && !reducedMotion.matches ? 260 : 0);
    reducedMotion.addEventListener('change', finishIfReduced);
    return () => { window.clearTimeout(timer); reducedMotion.removeEventListener('change', finishIfReduced); };
  }, [closing, isNodeDialog, finishExit]);

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
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestClose(); return; }
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
  }, [initialFocus, requestClose]);

  return <div className={`modal-backdrop ${className ? `${className}-backdrop` : ''}`} data-state={closing ? 'closing' : 'open'} onPointerDown={event => { backdropDown.current = !closingRef.current && event.button === 0 && event.target === event.currentTarget; }} onPointerUp={event => {
    if (backdropDown.current && event.target === event.currentTarget) requestClose();
    backdropDown.current = false;
  }} onPointerCancel={() => { backdropDown.current = false; }}>
    <div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} data-state={closing ? 'closing' : 'open'} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
      onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === 'node-dialog-depart') finishExit(); }}
      onKeyDownCapture={event => { if (closing) { event.preventDefault(); event.stopPropagation(); } }}
      onPointerDownCapture={event => { if (closing) { event.preventDefault(); event.stopPropagation(); } }}>
      {hideHeader ? <h2 id={id} className="sr-only">{title}</h2> : <header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close / بستن" onClick={requestClose}><X size={19} /></button></header>}
      {isNodeDialog ? <div className="node-dialog-content" inert={closing || undefined}>{children}</div> : children}
    </div>
  </div>;
}
