'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, Circle, CircleDot, Lightbulb, X } from 'lucide-react';
import type { Language, NodeColor, TaskStatus } from '@/lib/types';
import './node-quick-settings.css';

export interface NodeQuickSettingsProps {
  nodeId: string;
  color: NodeColor;
  status: TaskStatus | null;
  language: Language;
  readOnly?: boolean;
  onColor: (color: NodeColor) => void;
  onStatus: (status: TaskStatus | null) => void;
}

const COLORS: { value: NodeColor; fa: string; en: string }[] = [
  { value: 'sage', fa: 'مریم‌گلی', en: 'Sage' },
  { value: 'blue', fa: 'آبی', en: 'Blue' },
  { value: 'amber', fa: 'کهربایی', en: 'Amber' },
  { value: 'rose', fa: 'گلبهی', en: 'Rose' },
  { value: 'violet', fa: 'بنفش', en: 'Violet' },
  { value: 'gray', fa: 'خاکستری', en: 'Gray' },
];

const STATUSES = [
  { value: null, fa: 'ایده', en: 'Idea', Icon: Lightbulb },
  { value: 'todo', fa: 'انجام‌نشده', en: 'To do', Icon: Circle },
  { value: 'doing', fa: 'در حال انجام', en: 'In progress', Icon: CircleDot },
  { value: 'done', fa: 'انجام‌شده', en: 'Done', Icon: CheckCircle2 },
] as const;

/** Small selection control; its popover stays inside the dock and modal inert scope. */
export default function NodeQuickSettings({ nodeId, color, status, language, readOnly = false, onColor, onStatus }: NodeQuickSettingsProps) {
  const [openForNodeId, setOpenForNodeId] = useState<string | null>(null);
  const open = openForNodeId === nodeId;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();
  const colorHeadingId = useId();
  const statusHeadingId = useId();
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const currentColor = COLORS.find(item => item.value === color)!;
  const currentStatus = STATUSES.find(item => item.value === status)!;
  const statusLabel = L(currentStatus.fa, currentStatus.en);
  const colorLabel = L(currentColor.fa, currentColor.en);

  useEffect(() => { setOpenForNodeId(null); }, [nodeId]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const selected = panel.current?.querySelector<HTMLButtonElement>('[data-color-choice][aria-pressed="true"]:not(:disabled)');
      (selected ?? panel.current)?.focus({ preventScroll: true });
    });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpenForNodeId(null);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside, true);
    };
  }, [open]);

  const close = () => {
    setOpenForNodeId(null);
    trigger.current?.focus({ preventScroll: true });
  };

  return <div ref={root} className="node-quick-settings" dir={language === 'fa' ? 'rtl' : 'ltr'}
    onKeyDown={event => {
      if (!open) return;
      event.stopPropagation();
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }}
    onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpenForNodeId(null);
    }}>
    <button ref={trigger} type="button" className="node-quick-trigger" data-status={status ?? 'idea'}
      aria-expanded={open} aria-controls={open ? panelId : undefined}
      aria-label={`${L('رنگ و وضعیت فکر', 'Thought color and status')}: ${colorLabel}${L('، ', ', ')}${statusLabel}`}
      title={readOnly ? L('مشاهدهٔ رنگ و وضعیت', 'View color and status') : L('تغییر رنگ و وضعیت', 'Change color and status')}
      onClick={() => setOpenForNodeId(open ? null : nodeId)}>
      <span className="node-quick-color-dot" data-color={color} aria-hidden="true" />
      <span>{statusLabel}</span>
      <ChevronDown size={11} aria-hidden="true" />
    </button>
    {open && <div ref={panel} id={panelId} className="node-quick-panel" role="region" aria-labelledby={headingId} tabIndex={-1}>
      <div className="node-quick-heading">
        <h3 id={headingId}>{L('رنگ و وضعیت', 'Color & status')}</h3>
        {readOnly && <span>{L('فقط مشاهده', 'View only')}</span>}
        <button type="button" className="node-quick-close" aria-label={L('بستن رنگ و وضعیت', 'Close color and status')} onClick={close}><X size={14} aria-hidden="true" /></button>
      </div>
      <div className="node-quick-section-heading"><span id={colorHeadingId}>{L('رنگ فکر', 'Thought color')}</span><span>{colorLabel}</span></div>
      <div className="node-quick-palette" role="group" aria-labelledby={colorHeadingId}>
        {COLORS.map(item => <button key={item.value} type="button" className="node-quick-swatch" data-color-choice data-color={item.value}
          aria-label={L(item.fa, item.en)} title={L(item.fa, item.en)} aria-pressed={color === item.value} disabled={readOnly}
          onClick={() => { if (!readOnly && item.value !== color) onColor(item.value); }}>
          <span aria-hidden="true">{color === item.value && <Check size={16} strokeWidth={2.5} />}</span>
        </button>)}
      </div>
      <div className="node-quick-section-heading node-quick-status-heading"><span id={statusHeadingId}>{L('وضعیت انجام', 'Task status')}</span></div>
      <div className="node-quick-statuses" role="group" aria-labelledby={statusHeadingId}>
        {STATUSES.map(({ value, fa, en, Icon }) => <button key={value ?? 'idea'} type="button" className="node-quick-status"
          data-status={value ?? 'idea'} aria-pressed={status === value} disabled={readOnly}
          onClick={() => { if (!readOnly && value !== status) onStatus(value); }}>
          <Icon size={15} aria-hidden="true" /><span>{L(fa, en)}</span>
          {status === value && <Check size={12} className="node-quick-status-check" aria-hidden="true" />}
        </button>)}
      </div>
      <p className="node-quick-note">{L('ایده: بدون وضعیت انجام · بقیه: تسک قابل پیگیری', 'Idea has no task status. Other states track a task.')}</p>
    </div>}
  </div>;
}
