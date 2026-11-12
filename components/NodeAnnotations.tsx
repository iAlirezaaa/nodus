'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, Highlighter, Link2, MessageSquare, Pencil, RotateCcw, Save, Trash2, Unlink, X } from 'lucide-react';
import { assertNodeFeatureMetadata, reanchorAnnotations } from '@/lib/node-features';
import type { GraphNode, Language, NodeAnnotation, NodeColor } from '@/lib/types';

export interface AnnotationSelection {
  nodeId: string;
  field: 'title' | 'text';
  start: number;
  end: number;
  quote: string;
  sourceText: string;
}
export interface NodeAnnotationsHandle { start: (selection: AnnotationSelection) => void; }
interface Props {
  node: GraphNode;
  language: Language;
  draftScope?: string;
  selection: AnnotationSelection | null;
  onChange: (annotations: NodeAnnotation[]) => boolean;
  onSelectRange: (annotation: NodeAnnotation) => void;
  onDraftDirtyChange?: (dirty: boolean) => void;
}
interface AnnotationDraft {
  version: 1;
  nodeId: string;
  mode: 'new' | 'edit';
  annotation: NodeAnnotation;
  sourceText: string;
  baseBody: string;
  baseColor: NodeColor;
  anchorEdited?: boolean;
}

const tones: NodeColor[] = ['sage', 'blue', 'amber', 'rose', 'violet', 'gray'];
const toneNames: Record<NodeColor, [string, string]> = { sage: ['مریم‌گلی', 'Sage'], blue: ['آبی', 'Blue'], amber: ['کهربایی', 'Amber'], rose: ['گلبهی', 'Rose'], violet: ['بنفش', 'Violet'], gray: ['خاکستری', 'Gray'] };
const memoryDrafts = new Map<string, AnnotationDraft | null>();
const unprotectedDrafts = new Set<string>();
let departureGuardAttached = false;
const dirtyDraft = (draft: AnnotationDraft | null) => !!draft && (draft.anchorEdited === true || (draft.mode === 'new' ? draft.annotation.body.trim().length > 0 : draft.annotation.body !== draft.baseBody || draft.annotation.color !== draft.baseColor));

function warnBeforeDeparture(event: BeforeUnloadEvent) {
  if (!unprotectedDrafts.size) return;
  event.preventDefault();
  event.returnValue = '';
}
function protectDraft(key: string, protect: boolean) {
  if (typeof window === 'undefined') return;
  if (protect) unprotectedDrafts.add(key); else unprotectedDrafts.delete(key);
  if (unprotectedDrafts.size && !departureGuardAttached) { window.addEventListener('beforeunload', warnBeforeDeparture); departureGuardAttached = true; }
  if (!unprotectedDrafts.size && departureGuardAttached) { window.removeEventListener('beforeunload', warnBeforeDeparture); departureGuardAttached = false; }
}
function rememberDraft(key: string, draft: AnnotationDraft | null, persistent: boolean): boolean {
  memoryDrafts.set(key, draft);
  try {
    if (!persistent) { protectDraft(key, dirtyDraft(draft)); return !dirtyDraft(draft); }
    if (draft) window.sessionStorage.setItem(key, JSON.stringify(draft));
    else window.sessionStorage.removeItem(key);
    protectDraft(key, false);
    return true;
  } catch { protectDraft(key, dirtyDraft(draft)); return false; }
}
function readDraft(key: string, node: GraphNode, persistent: boolean): AnnotationDraft | null {
  try {
    const value = memoryDrafts.has(key) ? memoryDrafts.get(key) : persistent ? JSON.parse(window.sessionStorage.getItem(key) ?? 'null') : null;
    if (!value || value.version !== 1 || value.nodeId !== node.id || !['new', 'edit'].includes(value.mode)
      || typeof value.sourceText !== 'string' || value.sourceText.length > 100000 || typeof value.baseBody !== 'string' || value.baseBody.length > 10000 || !tones.includes(value.baseColor)) return null;
    const draft = value as AnnotationDraft;
    const field = draft.annotation?.field;
    if (field !== 'title' && field !== 'text') return null;
    assertNodeFeatureMetadata({ ...node, [field]: draft.sourceText, annotations: [draft.annotation] });
    const posted = node.annotations?.find(item => item.id === draft.annotation.id);
    if (draft.mode === 'new' && posted?.body === draft.annotation.body && posted.color === draft.annotation.color && posted.quote === draft.annotation.quote) return null;
    return { ...draft, annotation: reanchorAnnotations([draft.annotation], field, draft.sourceText, node[field])[0], sourceText: node[field] };
  } catch { return null; }
}
const previewQuote = (quote: string, maximum = 320) => quote.length > maximum ? `${quote.slice(0, maximum)}…` : quote;
const markStyle = (color: NodeColor) => ({ '--annotation-color': `var(--${color})` }) as React.CSSProperties;

const NodeAnnotations = forwardRef<NodeAnnotationsHandle, Props>(function NodeAnnotations({ node, language, draftScope, selection, onChange, onSelectRange, onDraftDirtyChange }, ref) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const key = `nodus:annotation-draft:v1:${encodeURIComponent(draftScope || `session-${node.boardId}`)}:${node.id}`;
  const persistent = !!draftScope;
  const [draft, setDraft] = useState<AnnotationDraft | null>(() => readDraft(key, node, persistent));
  const draftRef = useRef(draft);
  const [storageError, setStorageError] = useState(false);
  const [error, setError] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const focusDraft = useRef(false);
  const dirtyCallback = useRef(onDraftDirtyChange);
  useLayoutEffect(() => { dirtyCallback.current = onDraftDirtyChange; }, [onDraftDirtyChange]);
  const annotations = node.annotations ?? [];
  const dirty = dirtyDraft(draft);
  const activeSelection = selection?.nodeId === node.id && selection.end > selection.start && node[selection.field].slice(selection.start, selection.end) === selection.quote ? selection : null;

  const replaceDraft = useCallback((next: AnnotationDraft | null) => {
    draftRef.current = next;
    setDraft(next);
    setStorageError(!rememberDraft(key, next, persistent));
  }, [key, persistent]);

  useEffect(() => {
    const current = draftRef.current;
    if (!current) return;
    const source = node[current.annotation.field];
    if (source !== current.sourceText) replaceDraft({ ...current, annotation: reanchorAnnotations([current.annotation], current.annotation.field, current.sourceText, source)[0], sourceText: source });
  }, [node.title, node.text, replaceDraft]);
  useEffect(() => { dirtyCallback.current?.(dirty); }, [dirty]);
  useEffect(() => () => { rememberDraft(key, draftRef.current, persistent); dirtyCallback.current?.(false); }, [key, persistent]);
  useEffect(() => {
    if (!draft || !focusDraft.current) return;
    focusDraft.current = false;
    const frame = requestAnimationFrame(() => { form.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); commentInput.current?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [draft]);

  const focusExistingDraft = () => { form.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); commentInput.current?.focus({ preventScroll: true }); };
  const start = (range: AnnotationSelection) => {
    if (range.nodeId !== node.id || range.end <= range.start || node[range.field].slice(range.start, range.end) !== range.quote) { setError(L('متن تغییر کرده است؛ بخش موردنظر را دوباره انتخاب کن.', 'The source changed. Select the text again.')); return; }
    if (dirtyDraft(draftRef.current)) { setError(L('ابتدا پیش‌نویس فعلی را ذخیره یا لغو کن. انتخاب تازه همچنان در دسترس است.', 'Save or cancel the current draft first. Your new selection is still available.')); focusExistingDraft(); return; }
    if (annotations.length >= 200) { setError(L('هر گره حداکثر ۲۰۰ نظر دارد.', 'A node supports up to 200 annotations.')); return; }
    const now = new Date().toISOString();
    const annotation: NodeAnnotation = { id: crypto.randomUUID(), field: range.field, start: range.start, end: range.end, quote: range.quote, body: '', color: 'amber', resolved: false, createdAt: now, updatedAt: now };
    setError(''); focusDraft.current = true;
    replaceDraft({ version: 1, nodeId: node.id, mode: 'new', annotation, sourceText: node[range.field], baseBody: '', baseColor: 'amber' });
  };
  useImperativeHandle(ref, () => ({ start }));

  const edit = (annotation: NodeAnnotation) => {
    if (draftRef.current?.annotation.id === annotation.id) { focusExistingDraft(); return; }
    if (dirtyDraft(draftRef.current)) { setError(L('پیش‌نویس فعلی را پیش از ویرایش نظر دیگر ذخیره یا لغو کن.', 'Save or cancel your current draft before editing another annotation.')); focusExistingDraft(); return; }
    setError(''); focusDraft.current = true;
    replaceDraft({ version: 1, nodeId: node.id, mode: 'edit', annotation: { ...annotation }, sourceText: node[annotation.field], baseBody: annotation.body, baseColor: annotation.color });
  };
  const publish = (next: NodeAnnotation[]) => {
    assertNodeFeatureMetadata({ ...node, annotations: next });
    if (!onChange(next)) throw new Error(L('تغییر هنوز پذیرفته نشده است؛ پیش‌نویس محفوظ است. پس از آماده‌شدن فضا دوباره تلاش کن.', 'The change has not been accepted. Your draft is kept; try again when the workspace is ready.'));
  };
  const save = () => {
    const current = draftRef.current;
    if (!current || !current.annotation.body.trim()) return;
    try {
      const original = annotations.find(item => item.id === current.annotation.id);
      if (!original && annotations.length >= 200) throw new Error(L('هر گره حداکثر ۲۰۰ نظر دارد.', 'A node supports up to 200 annotations.'));
      const now = new Date().toISOString();
      const anchored = reanchorAnnotations([current.annotation], current.annotation.field, current.sourceText, node[current.annotation.field], now)[0];
      const saved: NodeAnnotation = {
        ...anchored,
        id: original?.id ?? (current.mode === 'edit' ? crypto.randomUUID() : anchored.id),
        body: current.annotation.body.trim(),
        resolved: original?.resolved ?? false,
        createdAt: original?.createdAt ?? anchored.createdAt,
        updatedAt: now,
      };
      publish(original ? annotations.map(item => item.id === original.id ? saved : item) : [...annotations, saved]);
      replaceDraft(null); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : L('نظر ذخیره نشد؛ پیش‌نویس محفوظ است.', 'The annotation was not saved. Your draft is kept.')); }
  };
  const changeState = (annotation: NodeAnnotation) => {
    try { publish(annotations.map(item => item.id === annotation.id ? { ...item, resolved: !item.resolved, updatedAt: new Date().toISOString() } : item)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : L('تغییر انجام نشد.', 'The change could not be saved.')); }
  };
  const remove = (annotation: NodeAnnotation) => {
    try { publish(annotations.filter(item => item.id !== annotation.id)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : L('حذف انجام نشد.', 'The annotation could not be removed.')); }
  };
  const reattachDraft = () => {
    const current = draftRef.current;
    if (!current || !activeSelection) return;
    replaceDraft({ ...current, anchorEdited: true, sourceText: node[activeSelection.field], annotation: { ...current.annotation, field: activeSelection.field, start: activeSelection.start, end: activeSelection.end, quote: activeSelection.quote, orphaned: false } });
    setError('');
  };
  const resolved = annotations.filter(item => item.resolved).length;
  const visible = showResolved ? annotations : annotations.filter(item => !item.resolved);
  const original = draft?.mode === 'edit' ? annotations.find(item => item.id === draft.annotation.id) : undefined;
  const externallyChanged = original && draft && (original.body !== draft.baseBody || original.color !== draft.baseColor);

  return <section className="nd-section nd-annotations" aria-labelledby={`annotations-${node.id}`}>
    <div className="nd-section-heading"><h3 id={`annotations-${node.id}`}><MessageSquare size={16} />{L('نظر روی متن', 'Text annotations')}</h3><span className="nd-count">{annotations.length}</span></div>
    <p className="nd-helper">{L('بخشی از عنوان یا یادداشت را انتخاب کن و «افزودن نظر» را بزن.', 'Select text in the title or notes, then choose Add annotation.')}</p>
    {error && <p className="nd-notice nd-notice-error" role="alert"><AlertCircle size={15} /><span>{error}</span></p>}
    {storageError && <p className="nd-notice nd-notice-error" role="alert"><AlertCircle size={15} /><span>{L('نسخهٔ محلی پیش‌نویس ذخیره نشد. تا ذخیره یا لغو نظر، این صفحه را باز نگه دار.', 'A local draft copy could not be saved. Keep this page open until you save or cancel the annotation.')}</span></p>}
    {draft && <div className="nd-annotation-editor" ref={form}>
      <div className="nd-draft-heading"><span><Pencil size={13} />{L('پیش‌نویس ذخیره‌نشده', 'Unposted draft')}</span><button type="button" className="nd-icon-action" aria-label={L('لغو پیش‌نویس نظر', 'Cancel annotation draft')} onClick={() => { replaceDraft(null); setError(''); }}><X size={15} /></button></div>
      <blockquote className="nd-annotation-quote" dir="auto" style={markStyle(draft.annotation.color)}>{previewQuote(draft.annotation.quote)}</blockquote>
      {draft.annotation.orphaned && <p className="nd-notice"><Unlink size={14} /><span>{L('متن اصلی تغییر کرده است. نظر نگه داشته می‌شود؛ برای اتصال دوباره، متن را انتخاب کن.', 'The source text changed. Your comment is kept; select text to attach it again.')}</span></p>}
      {draft.mode === 'edit' && !original && <p className="nd-notice"><AlertCircle size={14} /><span>{L('نظر اصلی دیگر در گره نیست؛ می‌توانی این پیش‌نویس را به‌صورت نظر تازه ذخیره کنی.', 'The original annotation is no longer on this node. You can save this draft as a new annotation.')}</span></p>}
      {externallyChanged && <p className="nd-notice"><AlertCircle size={14} /><span>{L('نظر اصلی تغییر کرده است؛ ذخیرهٔ پیش‌نویس، متن و رنگ آن را جایگزین می‌کند.', 'The original annotation changed. Saving this draft replaces its comment and color.')}</span></p>}
      {activeSelection && <button type="button" className="nd-quiet-action" onMouseDown={event => event.preventDefault()} onClick={reattachDraft}><Link2 size={14} />{L('اتصال به متن انتخاب‌شده', 'Attach to selected text')}</button>}
      <label className="nd-label" htmlFor={`annotation-body-${node.id}`}>{L('متن نظر', 'Comment')}</label>
      <textarea ref={commentInput} id={`annotation-body-${node.id}`} className="nd-comment-input" dir="auto" value={draft.annotation.body} maxLength={10000} placeholder={L('نظرت دربارهٔ این بخش چیست؟', 'What would you like to note about this passage?')} onChange={event => { const current = draftRef.current; if (current) replaceDraft({ ...current, annotation: { ...current.annotation, body: event.target.value } }); }} />
      <div className="nd-annotation-colors" role="group" aria-label={L('رنگ نشانه‌گذاری', 'Highlight color')}>{tones.map(color => <button key={color} type="button" className={`nd-highlight-color tone-${color}`} style={markStyle(color)} aria-label={toneNames[color][language === 'fa' ? 0 : 1]} aria-pressed={draft.annotation.color === color} onClick={() => { const current = draftRef.current; if (current) replaceDraft({ ...current, annotation: { ...current.annotation, color } }); }}>{draft.annotation.color === color && <Check size={13} />}</button>)}</div>
      <div className="nd-editor-footer"><span>{draft.annotation.body.length.toLocaleString(language === 'fa' ? 'fa' : 'en')} / {L('۱۰٬۰۰۰', '10,000')}</span><div><button type="button" className="nd-quiet-action" onClick={() => { replaceDraft(null); setError(''); }}>{L('لغو', 'Cancel')}</button><button type="button" className="nd-action nd-action-primary" disabled={!draft.annotation.body.trim()} onClick={save}><Save size={14} />{draft.mode === 'edit' && !original ? L('ذخیرهٔ نظر تازه', 'Save as new') : L('ذخیرهٔ نظر', 'Save annotation')}</button></div></div>
    </div>}
    {resolved > 0 && <label className="nd-resolved-filter"><input type="checkbox" checked={showResolved} onChange={event => setShowResolved(event.target.checked)} />{L('نمایش نظرهای بررسی‌شده', 'Show resolved annotations')}<span>{resolved}</span></label>}
    {visible.length > 0 ? <ul className="nd-annotation-list">{visible.map(annotation => <li key={annotation.id} className={`nd-annotation-item ${annotation.resolved ? 'is-resolved' : ''}`} style={markStyle(annotation.color)}>
      <div className="nd-annotation-meta"><span>{annotation.field === 'title' ? L('عنوان', 'Title') : L('یادداشت', 'Notes')}</span>{annotation.orphaned ? <span className="nd-orphan-label"><Unlink size={12} />{L('متن اصلی تغییر کرده', 'Source changed')}</span> : annotation.resolved ? <span><CheckCheck size={12} />{L('بررسی‌شده', 'Resolved')}</span> : null}</div>
      <button type="button" className="nd-quote-link" disabled={annotation.orphaned === true} onClick={() => onSelectRange(annotation)} title={annotation.orphaned ? L('این نظر فعلاً به متن فعلی متصل نیست.', 'This annotation is no longer attached to the current text.') : L('انتخاب این بخش در متن اصلی', 'Select this passage in the original text')}><blockquote className="nd-annotation-quote" dir="auto">{previewQuote(annotation.quote)}</blockquote></button>
      <p className="nd-annotation-body" dir="auto">{annotation.body}</p>
      <div className="nd-annotation-actions"><button type="button" onClick={() => edit(annotation)}><Pencil size={13} />{L('ویرایش', 'Edit')}</button><button type="button" onClick={() => changeState(annotation)} aria-pressed={annotation.resolved}>{annotation.resolved ? <RotateCcw size={13} /> : <CheckCheck size={13} />}{annotation.resolved ? L('بازگشایی', 'Reopen') : L('بررسی شد', 'Resolve')}</button><button type="button" className="nd-remove-annotation" onClick={() => remove(annotation)} aria-label={L('حذف نظر؛ قابل بازگردانی', 'Delete annotation; undo is available')} title={L('حذف نظر؛ با بازگردانی قابل بازیابی است.', 'Delete this annotation. Undo can restore it.')}><Trash2 size={13} /></button></div>
    </li>)}</ul> : <p className="nd-empty-copy">{annotations.length ? L('همهٔ نظرها بررسی شده‌اند.', 'All annotations are resolved.') : L('هنوز نظری روی متن ثبت نشده است.', 'No text annotations yet.')}</p>}
    {annotations.some(annotation => !annotation.orphaned) && <details className="nd-marked-preview" open={showPreview} onToggle={event => setShowPreview(event.currentTarget.open)}><summary><Highlighter size={14} />{L('نمای متن نشانه‌گذاری‌شده', 'Read highlighted text')}</summary>{showPreview && <>{(['title', 'text'] as const).map(field => annotations.some(annotation => annotation.field === field && !annotation.orphaned) ? <div key={field}><h4>{field === 'title' ? L('عنوان', 'Title') : L('یادداشت', 'Notes')}</h4><MarkedText text={node[field]} annotations={annotations.filter(annotation => annotation.field === field && !annotation.orphaned)} /></div> : null)}</>}</details>}
  </section>;
});

function MarkedText({ text, annotations }: { text: string; annotations: NodeAnnotation[] }) {
  const segments = useMemo(() => {
    const attached = annotations.filter(annotation => annotation.start >= 0 && annotation.end <= text.length && text.slice(annotation.start, annotation.end) === annotation.quote);
    const points = [...new Set([0, text.length, ...attached.flatMap(annotation => [annotation.start, annotation.end])])].sort((a, b) => a - b);
    return points.slice(0, -1).map((start, index) => ({ start, end: points[index + 1], annotation: attached.find(annotation => annotation.start <= start && annotation.end >= points[index + 1]) }));
  }, [text, annotations]);
  return <p className="nd-highlighted-text" dir="auto">{segments.map(segment => segment.annotation ? <mark key={segment.start} style={markStyle(segment.annotation.color)} title={previewQuote(segment.annotation.body, 220)}>{text.slice(segment.start, segment.end)}</mark> : <span key={segment.start}>{text.slice(segment.start, segment.end)}</span>)}</p>;
}

export default NodeAnnotations;
