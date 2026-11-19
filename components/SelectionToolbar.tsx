'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, Circle, CircleDashed, CircleDot, Group, Layers, Lightbulb, Redo2, Trash2, Undo2, X } from 'lucide-react';
import type { Language, NodeColor, TaskStatus } from '@/lib/types';
import './selection-toolbar.css';

export interface SelectionToolbarProps {
  count: number;
  language: Language;
  color: NodeColor | null;
  status: TaskStatus | 'mixed' | null;
  readOnly?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onColor: (color: NodeColor) => void;
  onStatus: (status: TaskStatus | null) => void;
  onDelete: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCreateZone?: () => void;
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

/** Selection actions stay in the canvas section, including their local popovers. */
export default function SelectionToolbar({ count, language, color, status, readOnly = false, canUndo, canRedo, onColor, onStatus, onDelete, onClear, onUndo, onRedo, onCreateZone }: SelectionToolbarProps) {
  const [open, setOpen] = useState<'color' | 'status' | null>(null);
  const root = useRef<HTMLElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const statusTrigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const panelHeadingId = useId();
  const selectionHeadingId = useId();
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const number = new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(count);
  const colorOption = COLORS.find(option => option.value === color);
  const statusOption = STATUSES.find(option => option.value === status);
  const colorLabel = colorOption ? L(colorOption.fa, colorOption.en) : L('چندرنگ', 'Mixed colors');
  const statusLabel = statusOption ? L(statusOption.fa, statusOption.en) : L('متفاوت', 'Mixed status');
  const StatusIcon = statusOption?.Icon ?? CircleDashed;
  const selectionLabel = L(`${number} فکر انتخاب شده`, `${number} thoughts selected`);

  useEffect(() => { setOpen(null); }, [count]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const chosen = panel.current?.querySelector<HTMLButtonElement>('[data-selection-choice][aria-pressed="true"]:not(:disabled)');
      const first = panel.current?.querySelector<HTMLButtonElement>('[data-selection-choice]:not(:disabled)');
      (chosen ?? first ?? panel.current)?.focus({ preventScroll: true });
    });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside, true);
    };
  }, [open]);

  const close = () => {
    const target = open === 'color' ? paletteTrigger.current : statusTrigger.current;
    setOpen(null);
    target?.focus({ preventScroll: true });
  };

  if (count < 2) return null;

  return <section ref={root} className="selection-toolbar" data-selection-toolbar dir={language === 'fa' ? 'rtl' : 'ltr'} aria-labelledby={selectionHeadingId}
    onKeyDown={event => {
      if (!open) return;
      event.stopPropagation();
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }}
    onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(null);
    }}>
    <div className="selection-toolbar-heading">
      <Layers size={14} aria-hidden="true" />
      <span id={selectionHeadingId} aria-live="polite" aria-atomic="true">{selectionLabel}</span>
      {readOnly && <small>{L('فقط مشاهده', 'View only')}</small>}
      <button type="button" className="selection-toolbar-clear" onClick={onClear} aria-label={L('پایان انتخاب گروه', 'Clear selection')} title={L('پایان انتخاب گروه', 'Clear selection')}><X size={14} aria-hidden="true" /></button>
    </div>
    <div className="selection-toolbar-actions" role="group" aria-label={L('ویرایش فکرهای انتخاب‌شده', 'Edit selected thoughts')}>
      <button ref={paletteTrigger} type="button" className="selection-toolbar-action" aria-expanded={open === 'color'} aria-controls={open === 'color' ? panelId : undefined}
        aria-label={`${L('رنگ انتخاب‌ها', 'Selection color')}: ${colorLabel}`} title={`${L('رنگ انتخاب‌ها', 'Selection color')}: ${colorLabel}`}
        onClick={() => setOpen(open === 'color' ? null : 'color')}>
        <span className="selection-toolbar-dot" data-color={color ?? 'mixed'} aria-hidden="true" /><span>{colorLabel}</span><ChevronDown size={11} aria-hidden="true" />
      </button>
      <button ref={statusTrigger} type="button" className="selection-toolbar-action selection-toolbar-status-trigger" data-status={status ?? 'idea'} aria-expanded={open === 'status'} aria-controls={open === 'status' ? panelId : undefined}
        aria-label={`${L('وضعیت انتخاب‌ها', 'Selection status')}: ${statusLabel}`} title={`${L('وضعیت انتخاب‌ها', 'Selection status')}: ${statusLabel}`}
        onClick={() => setOpen(open === 'status' ? null : 'status')}>
        <StatusIcon size={14} aria-hidden="true" /><span>{statusLabel}</span><ChevronDown size={11} aria-hidden="true" />
      </button>
      <button type="button" className="selection-toolbar-icon selection-toolbar-delete" disabled={readOnly} onClick={() => { if (!readOnly) onDelete(); }}
        aria-label={L(`حذف ${number} فکر انتخاب‌شده`, `Delete ${number} selected thoughts`)} title={L('حذف انتخاب‌ها', 'Delete selection')}><Trash2 size={16} aria-hidden="true" /></button>
      <span className="selection-toolbar-divider" aria-hidden="true" />
      <button type="button" className="selection-toolbar-icon" disabled={readOnly || !canUndo} onClick={() => { if (!readOnly && canUndo) onUndo(); }}
        aria-label={L('بازگردانی', 'Undo')} title={L('بازگردانی', 'Undo')}><Undo2 size={17} aria-hidden="true" /></button>
      <button type="button" className="selection-toolbar-icon" disabled={readOnly || !canRedo} onClick={() => { if (!readOnly && canRedo) onRedo(); }}
        aria-label={L('انجام دوباره', 'Redo')} title={L('انجام دوباره', 'Redo')}><Redo2 size={17} aria-hidden="true" /></button>
    </div>
    {onCreateZone && <button type="button" className="selection-toolbar-create-zone" disabled={readOnly}
      onClick={() => { if (!readOnly) { setOpen(null); onCreateZone(); } }}>
      <Group size={16} aria-hidden="true" /><span>{L('ساخت Zone از انتخاب‌ها', 'Create zone from selection')}</span>
    </button>}
    <div className="selection-toolbar-hint">
      <span><kbd>Shift</kbd>{L(' + کلیک یا کشیدنِ کادر: افزودن به انتخاب', ' + click or drag a box to add')}</span>
      <span>{L('فکرِ انتخاب‌شده را بکش تا گروه جابه‌جا شود.', 'Drag a selected thought to move the group.')}</span>
    </div>
    {open && <div ref={panel} id={panelId} className="selection-toolbar-popover" role="region" aria-labelledby={panelHeadingId} tabIndex={-1}>
      <div className="selection-toolbar-popover-heading">
        <h3 id={panelHeadingId}>{open === 'color' ? L('رنگ انتخاب‌ها', 'Selection color') : L('وضعیت انتخاب‌ها', 'Selection status')}</h3>
        <button type="button" className="selection-toolbar-close" aria-label={L('بستن گزینه‌های انتخاب', 'Close selection options')} onClick={close}><X size={14} aria-hidden="true" /></button>
      </div>
      <p className="selection-toolbar-current">{open === 'color' ? colorLabel : statusLabel}{readOnly && <> · {L('فقط مشاهده', 'View only')}</>}</p>
      {open === 'color' ? <div className="selection-toolbar-palette" role="group" aria-label={L('انتخاب رنگ برای گروه', 'Choose a color for the group')}>
        {COLORS.map(option => <button key={option.value} type="button" className="selection-toolbar-swatch" data-selection-choice data-color={option.value}
          aria-label={L(option.fa, option.en)} title={L(option.fa, option.en)} aria-pressed={color === option.value} disabled={readOnly}
          onClick={() => { if (!readOnly && color !== option.value) onColor(option.value); }}>
          <span aria-hidden="true">{color === option.value && <Check size={16} strokeWidth={2.5} />}</span>
        </button>)}
      </div> : <div className="selection-toolbar-statuses" role="group" aria-label={L('انتخاب وضعیت برای گروه', 'Choose a status for the group')}>
        {STATUSES.map(({ value, fa, en, Icon }) => <button key={value ?? 'idea'} type="button" className="selection-toolbar-status" data-selection-choice data-status={value ?? 'idea'}
          aria-pressed={status === value} disabled={readOnly} onClick={() => { if (!readOnly && status !== value) onStatus(value); }}>
          <Icon size={15} aria-hidden="true" /><span>{L(fa, en)}</span>{status === value && <Check size={12} className="selection-toolbar-status-check" aria-hidden="true" />}
        </button>)}
      </div>}
      <p className="selection-toolbar-note">{readOnly ? L('رنگ و وضعیت این گروه فقط قابل مشاهده است.', 'This group’s color and status are view only.') : L(`این تغییر روی هر ${number} فکر اعمال می‌شود.`, `Applies to all ${number} selected thoughts.`)}</p>
    </div>}
  </section>;
}
