'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Frame, Plus, Scan, Search, Trash2, X } from 'lucide-react';
import type { GraphNode, GraphZone, Language, NodeColor } from '@/lib/types';
import './zones.css';

export interface ZoneInput {
  title: string;
  description: string;
  color: NodeColor;
  nodeIds: string[];
}

interface ZonePanelProps {
  language: Language;
  zones: GraphZone[];
  /** Only nodes on the current board. */
  nodes: GraphNode[];
  selectedIds: string[];
  readOnly: boolean;
  initialZoneId?: string | null;
  onSave: (zoneId: string | null, input: ZoneInput, original?: GraphZone | null) => boolean;
  onDelete: (zoneId: string, original?: GraphZone) => boolean;
  onSelectMembers: (ids: string[]) => void;
  /** Lets the containing Modal preserve an unsaved draft when closing. */
  onDirtyChange?: (dirty: boolean) => void;
}

interface Editor {
  id: string | null;
  draft: ZoneInput;
  original: string;
  source: string | null;
}
type Destination = { kind: 'new' } | { kind: 'zone'; id: string } | { kind: 'close' };

const COLORS: NodeColor[] = ['sage', 'blue', 'amber', 'rose', 'violet', 'gray'];
const COLOR_NAMES: Record<NodeColor, [string, string]> = {
  sage: ['مریم‌گلی', 'Sage'], blue: ['آبی', 'Blue'], amber: ['کهربایی', 'Amber'],
  rose: ['گلبهی', 'Rose'], violet: ['بنفش', 'Violet'], gray: ['خاکستری', 'Gray'],
};
const inputFrom = (zone: GraphZone): ZoneInput => ({
  title: zone.title, description: zone.description, color: zone.color, nodeIds: [...zone.nodeIds],
});
function editZone(zone: GraphZone): Editor {
  const draft = inputFrom(zone);
  return { id: zone.id, draft, original: JSON.stringify(draft), source: JSON.stringify(zone) };
}
function newZone(nodeIds: string[]): Editor {
  const draft: ZoneInput = { title: '', description: '', color: 'violet', nodeIds: [...new Set(nodeIds)] };
  return { id: null, draft, original: JSON.stringify(draft), source: null };
}

/** This is Modal content, not another dialog. No changes persist until Save. */
export default function ZonePanel({ language, zones, nodes, selectedIds, readOnly, initialZoneId, onSave, onDelete, onSelectMembers, onDirtyChange }: ZonePanelProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const uid = useId();
  const liveIds = useMemo(() => new Set(nodes.map(node => node.id)), [nodes]);
  const selection = selectedIds.filter(id => liveIds.has(id));
  const [editor, setEditor] = useState<Editor | null>(() => {
    const initial = zones.find(zone => zone.id === initialZoneId);
    return initial ? editZone(initial) : !readOnly && selection.length ? newZone(selection) : null;
  });
  const [pending, setPending] = useState<Destination | null>(null);
  const [removePrompt, setRemovePrompt] = useState(false);
  const [query, setQuery] = useState('');
  const [memberLimit, setMemberLimit] = useState(100);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const dirty = !!editor && JSON.stringify(editor.draft) !== editor.original;
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  useEffect(() => { dirtyCallback.current?.(dirty); }, [dirty]);
  useEffect(() => () => { dirtyCallback.current?.(false); }, []);

  const existing = editor?.id ? zones.find(zone => zone.id === editor.id) : null;
  const stale = !!editor?.id && (!existing || JSON.stringify(existing) !== editor.source);
  const members = editor?.draft.nodeIds.filter(id => liveIds.has(id)) ?? [];
  const memberSet = new Set(members);
  const normalize = (text: string) => text.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLocaleLowerCase().trim();
  const visibleNodes = useMemo(() => {
    const term = normalize(query);
    return term ? nodes.filter(node => normalize(node.title).includes(term)) : nodes;
  }, [query, nodes]);

  function open(destination: Destination) {
    setPending(null); setError(''); setSavedNotice(''); setRemovePrompt(false); setQuery(''); setMemberLimit(100);
    if (destination.kind === 'close') { setEditor(null); requestAnimationFrame(() => libraryRef.current?.focus({ preventScroll: true })); return; }
    if (destination.kind === 'new') setEditor(newZone(selection));
    else {
      const zone = zones.find(item => item.id === destination.id);
      if (!zone) return;
      setEditor(editZone(zone));
    }
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }
  function request(destination: Destination) {
    if (destination.kind === 'zone' && destination.id === editor?.id && !stale) return;
    if (dirty) { setPending(destination); setRemovePrompt(false); return; }
    open(destination);
  }
  function change(patch: Partial<ZoneInput>) {
    if (readOnly || !editor) return;
    setEditor({ ...editor, draft: { ...editor.draft, ...patch } });
    setError(''); setSavedNotice('');
  }
  function save() {
    if (readOnly || !editor || stale) return;
    if (!editor.draft.title.trim() || (!members.length && editor.id === null)) {
      setError(L('عنوان لازم است؛ برای Zone تازه دست‌کم یک نود انتخاب کن.', 'A title is required; choose at least one node for a new zone.'));
      return;
    }
    const input = { ...editor.draft, title: editor.draft.title.trim(), nodeIds: members };
    if (!onSave(editor.id, input, editor.source ? JSON.parse(editor.source) as GraphZone : null)) {
      setError(L('ثبت تغییر ممکن نشد؛ نوشته‌هایت حفظ شده‌اند.', 'Changes could not be saved. Your draft is still here.'));
      return;
    }
    setEditor(null); setPending(null); setQuery('');
    setSavedNotice(L('Zone ذخیره شد. نودها و ارتباط‌هایشان در جای خود ماندند.', 'Zone saved. Nodes and their connections stayed in place.'));
    requestAnimationFrame(() => feedbackRef.current?.focus({ preventScroll: true }));
  }
  function remove() {
    if (readOnly || !editor?.id || stale) return;
    if (!onDelete(editor.id, editor.source ? JSON.parse(editor.source) as GraphZone : undefined)) {
      setError(L('حذف Zone ممکن نشد؛ دوباره تلاش کن.', 'The zone could not be removed. Try again.'));
      return;
    }
    setEditor(null); setRemovePrompt(false); setPending(null);
    setSavedNotice(L('Zone حذف شد؛ همهٔ نودها و ارتباط‌ها باقی ماندند.', 'Zone removed. All nodes and connections were kept.'));
    requestAnimationFrame(() => feedbackRef.current?.focus({ preventScroll: true }));
  }

  return <div className="zones-panel" dir={language === 'fa' ? 'rtl' : 'ltr'} onKeyDown={event => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (pending || removePrompt) {
      event.preventDefault(); event.stopPropagation(); setPending(null); setRemovePrompt(false);
    }
  }}>
    <p className="zones-intro">{L('چند فکر را در یک محدوده جمع کن؛ ارتباط‌هایشان آزاد می‌مانند.', 'Give related thoughts a home while keeping their connections open.')}</p>
    <div className="zones-workspace" data-editing={!!editor}>
      <section className="zones-library" ref={libraryRef} tabIndex={-1} aria-label={L('Zoneهای این بوم', 'Zones on this board')}>
        <div className="zones-library-heading"><span>{L('محدوده‌ها', 'Zones')}</span><span className="zones-count">{zones.length.toLocaleString(language === 'fa' ? 'fa' : 'en')}</span></div>
        {!readOnly && <button type="button" className="zones-create" onClick={() => request({ kind: 'new' })} disabled={!nodes.length}>
          <Plus size={17} /><span>{selection.length ? L('Zone از انتخاب', 'Zone from selection') : L('Zone تازه', 'New zone')}</span>
          {!!selection.length && <span className="zones-count">{selection.length.toLocaleString(language === 'fa' ? 'fa' : 'en')}</span>}
        </button>}
        <div className="zones-list">
          {zones.map(zone => <button type="button" className="zones-list-item" data-color={zone.color} key={zone.id} aria-pressed={editor?.id === zone.id} onClick={() => request({ kind: 'zone', id: zone.id })}>
            <Frame size={18} /><span className="zones-list-copy"><strong dir="auto">{zone.title}</strong>{zone.description && <span dir="auto">{zone.description}</span>}<small>{zone.nodeIds.filter(id => liveIds.has(id)).length.toLocaleString(language === 'fa' ? 'fa' : 'en')} {L('نود', 'nodes')}</small></span>
          </button>)}
          {!zones.length && <div className="zones-empty"><Frame size={28} /><strong>{L('جایی برای فکرهای مرتبط', 'A place for related thoughts')}</strong><p>{nodes.length ? L('یک Zone بساز و نودهایش را انتخاب کن. هر نود می‌تواند در چند Zone باشد.', 'Create a zone and choose its nodes. A node can belong to several zones.') : L('اول چند نود روی بوم بساز، بعد آن‌ها را گروه‌بندی کن.', 'Add a few nodes to your canvas, then group them here.')}</p></div>}
        </div>
      </section>

      <section className="zones-details" aria-label={L('جزئیات Zone', 'Zone details')}>
        {savedNotice && <p className="zones-feedback" ref={feedbackRef} tabIndex={-1} role="status"><Check size={17} /><span>{savedNotice}</span></p>}
        {!editor ? <div className="zones-welcome"><div className="zones-welcome-mark" aria-hidden="true"><Frame size={38} /></div><h3>{L('ساختار روشن، فکر آزاد', 'Clear structure. Open thinking.')}</h3><p>{L('Zone عنوان و توضیح خودش را دارد. نودهای مشترک و اتصال‌های میان محدوده‌ها دست‌نخورده می‌مانند.', 'Each zone has a title and description. Shared nodes and connections across zones stay intact.')}</p>{!!zones.length && <p className="zones-welcome-hint">{L('یک Zone را برای دیدن یا ویرایش انتخاب کن.', 'Choose a zone to view or edit it.')}</p>}</div> : <>
          <div className="zones-editor-heading"><h3>{editor.id ? L('ویرایش Zone', 'Edit zone') : L('Zone تازه', 'New zone')}</h3><button type="button" className="zones-close-editor" aria-label={L('بستن ویرایش Zone', 'Close zone editor')} onClick={() => request({ kind: 'close' })}><X size={18} /></button></div>
          {pending && <div className="zones-confirm" role="alert"><p>{L('تغییرهای این Zone هنوز ذخیره نشده‌اند.', 'This zone has unsaved changes.')}</p><div><button type="button" className="secondary-button" onClick={() => setPending(null)}>{L('ادامهٔ ویرایش', 'Keep editing')}</button><button type="button" className="text-link" onClick={() => open(pending)}>{L('کنارگذاشتن تغییرها', 'Discard changes')}</button></div></div>}
          {stale && <div className="zones-confirm" role="status"><p>{L('این Zone در جای دیگری تغییر کرده یا حذف شده است. پیش‌نویس تو حفظ شده؛ برای ویرایش نسخهٔ تازه، آن را دوباره باز کن.', 'This zone changed elsewhere or was removed. Your draft is preserved; reopen the latest zone before editing.')}</p>{existing && <button type="button" className="secondary-button" onClick={() => request({ kind: 'zone', id: existing.id })}>{L('بازکردن نسخهٔ تازه', 'Open latest version')}</button>}</div>}
          <form className="zones-form" onSubmit={event => { event.preventDefault(); save(); }} onKeyDown={event => {
            // Enter while an IME composes must never submit a form. Native Tab
            // and textarea line breaks remain untouched inside the Modal.
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault();
          }}>
            <label htmlFor={`${uid}-title`}>{L('عنوان', 'Title')}<input ref={titleRef} id={`${uid}-title`} value={editor.draft.title} onChange={event => change({ title: event.target.value })} maxLength={120} readOnly={readOnly} required placeholder={L('مثلاً داستان و روایت', 'For example, Story and narrative')} dir="auto" /></label>
            <label htmlFor={`${uid}-description`}>{L('توضیحات', 'Description')}<textarea id={`${uid}-description`} value={editor.draft.description} onChange={event => change({ description: event.target.value })} maxLength={2000} readOnly={readOnly} rows={3} placeholder={L('این محدوده دربارهٔ چیست و نودها چطور به هم مربوط‌اند؟', 'What belongs here, and how are these thoughts related?')} dir="auto" /></label>
            <fieldset className="zones-colors" disabled={readOnly}><legend>{L('رنگ محدوده', 'Zone color')}</legend><div>{COLORS.map(color => <button type="button" key={color} data-color={color} aria-label={COLOR_NAMES[color][language === 'fa' ? 0 : 1]} aria-pressed={editor.draft.color === color} onClick={() => change({ color })}><span>{editor.draft.color === color && <Check size={16} />}</span></button>)}</div></fieldset>
            <fieldset className="zones-members"><legend>{L('نودهای این Zone', 'Nodes in this zone')} <span className="zones-count">{members.length.toLocaleString(language === 'fa' ? 'fa' : 'en')}</span></legend>
              <label className="zones-member-search" htmlFor={`${uid}-search`}><Search size={16} /><input id={`${uid}-search`} type="search" value={query} onChange={event => { setQuery(event.target.value); setMemberLimit(100); }} placeholder={L('جست‌وجوی نودها', 'Find nodes')} aria-label={L('جست‌وجوی نودها برای Zone', 'Find nodes for this zone')} /></label>
              {!readOnly && !!selection.length && <button type="button" className="zones-use-selection" onClick={() => change({ nodeIds: [...new Set([...members, ...selection])] })}><Plus size={15} />{L('افزودن انتخاب بوم', 'Add canvas selection')}</button>}
              <div className="zones-member-list">{visibleNodes.slice(0, memberLimit).map(node => <label key={node.id} className="zones-member-row"><input type="checkbox" checked={memberSet.has(node.id)} disabled={readOnly} onChange={event => change({ nodeIds: event.target.checked ? [...members, node.id] : members.filter(id => id !== node.id) })} /><span className="zones-node-dot" data-color={node.color} /><span dir="auto">{node.title || L('بدون عنوان', 'Untitled')}</span></label>)}{!visibleNodes.length && <p className="zones-no-match">{L('نودی با این نام پیدا نشد.', 'No nodes match this search.')}</p>}</div>
              {visibleNodes.length > memberLimit && <div className="zones-more-members"><span>{L(`نمایش ${memberLimit.toLocaleString('fa')} از ${visibleNodes.length.toLocaleString('fa')} نود`, `Showing ${memberLimit.toLocaleString('en')} of ${visibleNodes.length.toLocaleString('en')} nodes`)}</span><button type="button" onClick={() => setMemberLimit(limit => limit + 100)}>{L('نمایش بیشتر', 'Show more')}</button></div>}
            </fieldset>
            {error && <p className="zones-error" role="alert">{error}</p>}
            <footer className="zones-actions">
              <button type="button" className="secondary-button" disabled={!members.length || dirty || stale} onClick={() => onSelectMembers(members)}><Scan size={16} />{L('نمایش روی بوم', 'Show on canvas')}</button>
              {!readOnly && <button type="submit" className="primary-button" disabled={!editor.draft.title.trim() || (!members.length && editor.id === null) || stale}><Check size={16} />{L('ذخیرهٔ Zone', 'Save zone')}</button>}
            </footer>
          </form>
          {!!editor.id && !readOnly && <div className="zones-remove">
            {removePrompt ? <div className="zones-confirm"><p>{L('فقط محدوده حذف می‌شود؛ نودها، فایل‌ها و ارتباط‌ها باقی می‌مانند.', 'Only the zone is removed. Nodes, files and connections stay on the canvas.')}</p><div><button type="button" className="secondary-button" onClick={() => setRemovePrompt(false)}>{L('انصراف', 'Cancel')}</button><button type="button" className="danger-button" disabled={stale} onClick={remove}>{L('حذف Zone', 'Remove zone')}</button></div></div> : <button type="button" className="zones-remove-button" disabled={stale} onClick={() => { setRemovePrompt(true); setPending(null); }}><Trash2 size={15} />{L('حذف فقط محدوده', 'Remove zone only')}</button>}
          </div>}
        </>}
      </section>
    </div>
  </div>;
}
