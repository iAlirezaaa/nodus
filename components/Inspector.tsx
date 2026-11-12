'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, ExternalLink, GitBranch, Highlighter, Layers, Link2, ListTodo, MessageSquarePlus, Move, Paperclip, Pencil, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { GraphNode, Language, NodeAnnotation, NodeAppearance, NodeColor, TaskStatus, Workspace } from '@/lib/types';
import { kindIcons, kindName } from './Canvas';
import NodeAnnotations, { type AnnotationSelection, type NodeAnnotationsHandle } from './NodeAnnotations';
import TaskDetails from './TaskDetails';
import './node-details.css';
import './node-dialog.css';

const tones: NodeColor[] = ['sage', 'blue', 'amber', 'rose', 'violet', 'gray'];
const colorNames = { sage: ['مریم‌گلی', 'Sage'], blue: ['آبی', 'Blue'], amber: ['کهربایی', 'Amber'], rose: ['گلبهی', 'Rose'], violet: ['بنفش', 'Violet'], gray: ['خاکستری', 'Gray'] };

export interface InspectorProps {
  node: GraphNode;
  document: Workspace;
  language: Language;
  onChange: (patch: Partial<GraphNode>) => boolean;
  onClose: () => void;
  onOpen: () => void;
  onBranch: () => void;
  onConnect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAttach: () => void;
  onSelect: (id: string) => void;
  draftScope?: string;
  onDraftDirtyChange?: (dirty: boolean) => void;
  onTaskStatus?: (id: string, status: TaskStatus) => void;
  onMakeTask?: () => void;
  onRemoveTask?: () => void;
  onAddSubtask?: () => void;
  onToggleSubtask?: (id: string) => void;
  onEditTitle?: () => void;
  readOnly?: boolean;
}

export interface InspectorHandle { flushPending: () => boolean; }

const Inspector = forwardRef<InspectorHandle, InspectorProps>(function Inspector({ node, document: doc, language, onChange, onClose, onOpen, onBranch, onConnect, onDuplicate, onDelete, onAttach, onSelect, draftScope, onDraftDirtyChange, onTaskStatus, onMakeTask, onRemoveTask, onAddSubtask, onToggleSubtask, onEditTitle, readOnly = false }, ref) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const Icon = node.task ? ListTodo : kindIcons[node.kind];
  const kindLabel = node.task ? node.task.parentId ? L('ساب‌تسک', 'Subtask') : L('تسک', 'Task') : kindName(node.kind, language);
  const links = useMemo(() => doc.edges.filter(edge => edge.sourceId === node.id || edge.targetId === node.id), [doc.edges, node.id]);
  const nodesById = useMemo(() => new Map(doc.nodes.map(item => [item.id, item])), [doc.nodes]);
  const directBranches = useMemo(() => new Set([...links.filter(edge => edge.sourceId === node.id).map(edge => edge.targetId), ...doc.nodes.filter(item => item.task?.parentId === node.id).map(item => item.id)]).size, [links, doc.nodes, node.id]);
  const asset = node.asset;
  const titleInput = useRef<HTMLInputElement>(null);
  const notesInput = useRef<HTMLTextAreaElement>(null);
  const annotations = useRef<NodeAnnotationsHandle>(null);
  const position = useRef<InspectorHandle>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const drafts = useRef({ url: false, position: false, annotation: false });
  const reportDirty = useCallback((field: keyof typeof drafts.current, dirty: boolean) => { drafts.current[field] = dirty; onDraftDirtyChange?.(Object.values(drafts.current).some(Boolean)); }, [onDraftDirtyChange]);
  useEffect(() => () => onDraftDirtyChange?.(false), [onDraftDirtyChange]);
  const [selection, setSelection] = useState<AnnotationSelection | null>(null);
  const [urlDraft, setUrlDraft] = useState(node.url);
  const urlValue = useRef(node.url);
  const urlBase = useRef(node.url);
  const [urlError, setUrlError] = useState('');
  useEffect(() => { if (!drafts.current.url) { urlValue.current = node.url; urlBase.current = node.url; setUrlDraft(node.url); setUrlError(''); } }, [node.id, node.url]);
  useEffect(() => { setSelection(null); }, [node.id]);

  const captureSelection = (field: 'title' | 'text', element: HTMLInputElement | HTMLTextAreaElement) => {
    const start = element.selectionStart ?? 0, end = element.selectionEnd ?? 0;
    if (end <= start) { setSelection(previous => previous?.field === field ? null : previous); return; }
    const quote = element.value.slice(start, end);
    setSelection({ nodeId: node.id, field, start, end, quote, sourceText: element.value });
  };
  const activeSelection = selection?.nodeId === node.id && node[selection.field].slice(selection.start, selection.end) === selection.quote ? selection : null;
  const selectionAction = (field: 'title' | 'text') => activeSelection?.field === field && <div className="nd-selection-action">
    <span dir="auto"><Highlighter size={13} />{activeSelection.quote.length > 60 ? `${activeSelection.quote.slice(0, 60)}…` : activeSelection.quote}</span>
    <button type="button" disabled={readOnly} onMouseDown={event => event.preventDefault()} onClick={() => annotations.current?.start(activeSelection)} aria-controls={`annotations-${node.id}`}><MessageSquarePlus size={14} />{L('افزودن نظر', 'Add annotation')}</button>
  </div>;
  const focusQuote = (annotation: NodeAnnotation) => {
    if (annotation.orphaned || node[annotation.field].slice(annotation.start, annotation.end) !== annotation.quote) return;
    const element = annotation.field === 'title' ? titleInput.current : notesInput.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    element.setSelectionRange(annotation.start, annotation.end);
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setSelection({ nodeId: node.id, field: annotation.field, start: annotation.start, end: annotation.end, quote: annotation.quote, sourceText: node[annotation.field] });
  };
  const commitUrl = () => {
    if (node.kind !== 'link' || !drafts.current.url) return true;
    const value = urlValue.current.trim();
    try {
      if (value) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('url'); }
      if (!onChange({ url: value })) { setUrlError(L('تغییر ثبت نشد؛ پس از آماده‌شدن فضا دوباره تلاش کن.', 'The change was not accepted. Try again when the workspace is ready.')); return false; }
      urlValue.current = value; urlBase.current = value; setUrlDraft(value); setUrlError(''); reportDirty('url', false); return true;
    } catch { setUrlError(L('یک نشانی کامل با http:// یا https:// وارد کن. برای لغو ویرایش، Escape بزن.', 'Enter a complete address starting with http:// or https://. Press Escape to discard this field edit.')); return false; }
  };
  useImperativeHandle(ref, () => ({ flushPending: () => { if (!commitUrl()) { urlInput.current?.focus(); return false; } return position.current?.flushPending() ?? true; } }));
  const childCount = doc.nodes.filter(item => item.boardId === node.childBoardId).length;

  return <section className={`inspector node-dialog-editor tone-${node.color}`} style={{ "--node-color": `var(--${node.color})` } as React.CSSProperties} aria-label={L('ویرایش گره', 'Node editor')}>
    <div className="inspector-header" data-node-dialog-intro tabIndex={-1}><span><i className="node-dialog-spark" aria-hidden="true" /><Icon size={17} />{kindLabel}<small>{L('فضای یک فکر', 'A thought, up close')}</small></span><div>{onEditTitle && <button className="icon-button" onClick={onEditTitle} disabled={readOnly} aria-label={L('ویرایش سریع روی بوم', 'Edit inline on canvas')} title={L('ویرایش سریع روی بوم · F2', 'Edit inline on canvas · F2')}><Pencil size={16} /></button>}<button className="icon-button" onClick={onDuplicate} disabled={readOnly} aria-label={L('تکثیر گره', 'Duplicate node')} title={L('تکثیر', 'Duplicate')}><Copy size={16} /></button><button className="icon-button" onClick={onClose} aria-label={L('بستن ویرایشگر', 'Close editor')}><X size={19} /></button></div></div>
    <div className="inspector-content">
      <div className="node-dialog-main">
      <div className="editor-eyebrow">{L('فضای یک فکر', 'A THOUGHT, UP CLOSE')}</div>
      <label className="sr-only" htmlFor="node-title">{L('عنوان', 'Title')}</label>
      <input ref={titleInput} id="node-title" readOnly={readOnly} className="node-title-input" dir="auto" value={node.title} maxLength={500} placeholder={L('عنوان ایده…', 'Name this thought…')} onChange={event => { setSelection(null); onChange({ title: event.target.value }); }} onSelect={event => captureSelection('title', event.currentTarget)} onPointerUp={event => captureSelection('title', event.currentTarget)} onKeyUp={event => captureSelection('title', event.currentTarget)} />
      {selectionAction('title')}
      <div className="node-dialog-metrics"><span><GitBranch size={13} /><b>{directBranches}</b>{L('شاخه', 'branches')}</span>{childCount > 0 && <span><Layers size={13} /><b>{childCount}</b>{L('گره داخلی', 'inside')}</span>}{!!node.annotations?.length && <span><MessageSquarePlus size={13} /><b>{node.annotations.length}</b>{L('نظر', 'annotations')}</span>}</div>
      {asset && <div className={`asset-preview preview-${node.kind}`}>
        {node.kind === 'image' ? <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={node.title} /></a> : node.kind === 'video' ? <video key={asset.id} controls playsInline preload="metadata" src={asset.url} /> : node.kind === 'audio' ? <audio key={asset.id} controls preload="metadata" src={asset.url} /> : node.kind === 'pdf' ? <iframe key={asset.id} title={node.title || asset.name} src={`${asset.url}#toolbar=1&navpanes=0`} /> : <div className="file-preview"><Icon size={34} /><span dir="auto">{asset.name}</span></div>}
        <div className="asset-info"><span dir="auto" title={asset.name}>{asset.name}</span><a href={`${asset.url}?download=1`} download={asset.name} aria-label={L('دانلود فایل اصلی', 'Download original file')}><Download size={15} /></a><a href={asset.url} target="_blank" rel="noreferrer" aria-label={L('بازکردن فایل', 'Open file')}><ExternalLink size={15} /></a></div>
        <div className="asset-size">{(asset.size / (1024 * 1024)).toFixed(asset.size > 1024 * 1024 ? 1 : 2)} MB · {asset.mime}</div>
      </div>}
      {node.kind === 'link' && <label className="field-label">{L('نشانی وب', 'Web address')}<input ref={urlInput} readOnly={readOnly} type="url" dir="ltr" className="text-input" value={urlDraft} onChange={event => { urlValue.current = event.target.value; setUrlDraft(event.target.value); reportDirty('url', event.target.value.trim() !== urlBase.current); }} onBlur={commitUrl} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === 'Escape' && drafts.current.url) { event.preventDefault(); event.stopPropagation(); urlValue.current = urlBase.current; setUrlDraft(urlBase.current); setUrlError(''); reportDirty('url', false); }
      }} aria-invalid={!!urlError} placeholder="https://…" />{urlError && <small className="field-error" role="alert">{urlError}</small>}{/^https?:\/\//i.test(node.url) && <a className="text-link" href={node.url} target="_blank" rel="noopener noreferrer">{L('بازکردن لینک', 'Open link')}<ArrowUpRight size={14} /></a>}</label>}
      <label className="field-label notes-label" htmlFor="node-text">{L('یادداشت و جزئیات', 'Notes & details')}</label>
      <textarea ref={notesInput} id="node-text" readOnly={readOnly} dir="auto" className="node-text-input" value={node.text} maxLength={100000} placeholder={L('هر چیزی که به این ایده مربوط است…\nسطرهای جدا می‌توانند به شاخه تبدیل شوند.', 'Anything that belongs to this thought…\nSeparate lines can become branches.')} onChange={event => { setSelection(null); onChange({ text: event.target.value }); }} onSelect={event => captureSelection('text', event.currentTarget)} onPointerUp={event => captureSelection('text', event.currentTarget)} onKeyUp={event => captureSelection('text', event.currentTarget)} />
      {selectionAction('text')}
      <NodeAnnotations key={`${draftScope ?? ''}:${node.id}`} ref={annotations} node={node} language={language} draftScope={draftScope} selection={activeSelection} onChange={next => onChange({ annotations: next })} onSelectRange={focusQuote} onDraftDirtyChange={dirty => reportDirty('annotation', dirty)} />
      </div>
      <div className="node-dialog-rail">
      <div className="node-dialog-section-label">{L('ادامهٔ این فکر', 'KEEP THIS THOUGHT MOVING')}</div>
      <button className={`project-entry ${node.childBoardId ? 'has-project' : ''}`} onClick={onOpen} disabled={readOnly && !node.childBoardId}><span className="project-entry-icon"><Layers size={21} /></span><span><strong>{node.childBoardId ? L('وارد پروژه شو', 'Enter project') : L('یک جهان داخل این ایده', 'Make room inside this thought')}</strong><small>{node.childBoardId ? `${childCount} ${L('گره · بوم مستقل', 'nodes · its own canvas')}` : L('محتوا بماند؛ یک بوم تازه هم باز شود.', 'Keep the content. Open a canvas within it.')}</small></span><ArrowUpRight size={18} /></button>
      <div className="inspector-actions"><button disabled={readOnly} onClick={onBranch}><GitBranch size={16} />{L('رشد شاخه‌ها', 'Grow branches')}</button><button disabled={readOnly} onClick={onConnect}><Link2 size={16} />{L('اتصال', 'Connect')}</button><button disabled={readOnly} onClick={onAttach}><Paperclip size={16} />{L('پیوست فایل', 'Attach file')}</button></div>
      <TaskDetails node={node} document={doc} language={language} onSelect={onSelect} onTaskStatus={readOnly ? undefined : onTaskStatus ?? ((id, status) => { if (id === node.id) onChange({ task: { status, parentId: node.task?.parentId ?? null } }); })} onMakeTask={readOnly ? undefined : onMakeTask ?? (() => { onChange({ task: { status: 'todo', parentId: null } }); })} onRemoveTask={readOnly ? undefined : onRemoveTask} onAddSubtask={readOnly ? undefined : onAddSubtask} onToggleSubtask={readOnly ? undefined : onToggleSubtask} />
      <div className="node-dialog-customize"><h3>{L('رنگ و نمایش', 'Color & presentation')}</h3><div className="color-picker" aria-label={L('رنگ گره', 'Node color')}>{tones.map(color => <button key={color} className={`color-dot tone-${color} ${node.color === color ? 'active' : ''}`} aria-label={colorNames[color][language === 'fa' ? 0 : 1]} aria-pressed={node.color === color} disabled={readOnly} onClick={() => onChange({ color })}>{node.color === color && <Check size={12} />}</button>)}</div></div>
      <AppearanceAndPosition key={node.id} readOnly={readOnly} ref={position} node={node} language={language} onChange={onChange} onDirtyChange={dirty => reportDirty('position', dirty)} />
      <label className="field-label timeline-date-label">{L('تاریخ روی تایم‌لاین', 'Timeline date')}<input type="date" disabled={readOnly} className="text-input" dir="ltr" min="0001-01-01" max="9999-12-31" value={node.scheduledAt ?? ''} aria-label={L('تاریخ روی تایم‌لاین', 'Timeline date')} onInput={event => { if (event.currentTarget.validity.valid) onChange({ scheduledAt: event.currentTarget.value || undefined }); }} onChange={event => onChange({ scheduledAt: event.target.value || undefined })} /><small>{L('بدون تاریخ انتخابی، زمان ساخت ایده استفاده می‌شود.', 'Uses the creation date when no date is chosen.')}</small></label>
      {links.length > 0 && <section className="relations"><h3>{L('فکرهای مرتبط', 'Connected thoughts')}<span>{links.length}</span></h3>{links.map(edge => { const other = nodesById.get(edge.sourceId === node.id ? edge.targetId : edge.sourceId); return other ? <button key={edge.id} onClick={() => onSelect(other.id)}><span className={`tiny-color tone-${other.color}`} /><span dir="auto">{other.title || L('بدون عنوان', 'Untitled')}</span><ArrowUpRight size={14} /></button> : null; })}</section>}
      </div>
    </div>
    <div className="inspector-bottom"><span>{L('تغییرات ذخیره می‌شوند؛ نظر تازه دکمهٔ ذخیره دارد.', 'Changes save automatically; annotations use Save.')}</span><button className="icon-button danger" onClick={onDelete} disabled={readOnly} aria-label={L('حذف گره', 'Delete node')}><Trash2 size={17} /></button></div>
  </section>;
});

export default Inspector;

const AppearanceAndPosition = forwardRef<InspectorHandle, Pick<InspectorProps, 'node' | 'language' | 'onChange' | 'readOnly'> & { onDirtyChange: (dirty: boolean) => void }>(function AppearanceAndPosition({ node, language, onChange, onDirtyChange, readOnly }, ref) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const [coordinates, setCoordinates] = useState({ x: String(node.x), y: String(node.y) });
  const [errors, setErrors] = useState<{ x?: string; y?: string }>({});
  const values = useRef(coordinates);
  const accepted = useRef({ x: node.x, y: node.y });
  const dirty = useRef(new Set<'x' | 'y'>());
  const fields = useRef<Partial<Record<'x' | 'y', HTMLInputElement | null>>>({});
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const next = { ...values.current };
    for (const axis of ['x', 'y'] as const) if (!dirty.current.has(axis)) { next[axis] = String(node[axis]); accepted.current[axis] = node[axis]; }
    values.current = next; setCoordinates(next);
  }, [node.x, node.y]);
  const commit = (axes: readonly ('x' | 'y')[], focusError = false) => {
    const patch: Partial<GraphNode> = {};
    const nextErrors: typeof errors = {};
    for (const axis of axes) {
      if (!dirty.current.has(axis)) continue;
      const value = values.current[axis], number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || Math.abs(number) > 1e7) nextErrors[axis] = L('عددی بین −۱۰٬۰۰۰٬۰۰۰ و ۱۰٬۰۰۰٬۰۰۰ وارد کن؛ Escape ویرایش این عدد را لغو می‌کند.', 'Enter a number between −10,000,000 and 10,000,000. Escape cancels this field edit.');
      else patch[axis] = number;
    }
    const invalid = (['x', 'y'] as const).find(axis => nextErrors[axis]);
    if (invalid) { setErrors(current => ({ ...current, ...nextErrors })); if (focusError) { if (details.current) details.current.open = true; fields.current[invalid]?.focus(); } return false; }
    if (Object.keys(patch).length && !onChange(patch)) { setErrors({ x: L('جابه‌جایی ثبت نشد؛ دوباره تلاش کن.', 'The move was not accepted. Try again.') }); return false; }
    for (const axis of axes) { if (patch[axis] !== undefined) { accepted.current[axis] = patch[axis]!; values.current[axis] = String(patch[axis]); } dirty.current.delete(axis); }
    setCoordinates({ ...values.current }); setErrors(current => ({ ...current, ...Object.fromEntries(axes.map(axis => [axis, undefined])) })); onDirtyChange(dirty.current.size > 0); return true;
  };
  useImperativeHandle(ref, () => ({ flushPending: () => commit(['x', 'y'], true) }));
  return <details className="nd-appearance-details" ref={details}><summary><SlidersHorizontal size={14} />{L('شکل و جایگاه گره', 'Appearance & position')}</summary><div className="nd-appearance-content">
    <label className="nd-label" htmlFor={`node-appearance-${node.id}`}>{L('شکل نمایش', 'Node appearance')}</label>
    <select disabled={readOnly} id={`node-appearance-${node.id}`} className="nd-select" value={node.appearance ?? 'card'} onChange={event => onChange({ appearance: event.target.value as NodeAppearance })}><option value="card">{L('کارت', 'Card')}</option><option value="sticky">{L('یادداشت چسبان', 'Sticky note')}</option><option value="outline">{L('کادر خطی', 'Outline')}</option></select>
    <div className="nd-position-heading"><Move size={13} /><span>{L('مختصات روی بوم', 'Canvas coordinates')}</span></div>
    <div className="nd-position-fields">{(['x', 'y'] as const).map(axis => <label key={axis}><span>{axis.toUpperCase()}</span><input ref={element => { fields.current[axis] = element; }} readOnly={readOnly} type="number" dir="ltr" min={-1e7} max={1e7} step="any" value={coordinates[axis]} aria-label={L(`مختصات ${axis.toUpperCase()}`, `${axis.toUpperCase()} position`)} aria-invalid={!!errors[axis]} onChange={event => { const value = event.target.value; values.current = { ...values.current, [axis]: value }; if (value.trim() && Number(value) === accepted.current[axis]) dirty.current.delete(axis); else dirty.current.add(axis); setCoordinates({ ...values.current }); onDirtyChange(dirty.current.size > 0); }} onBlur={() => commit([axis])} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); }
      if (event.key === 'Escape' && dirty.current.has(axis)) { event.preventDefault(); event.stopPropagation(); values.current = { ...values.current, [axis]: String(accepted.current[axis]) }; dirty.current.delete(axis); setCoordinates({ ...values.current }); setErrors(current => ({ ...current, [axis]: undefined })); onDirtyChange(dirty.current.size > 0); }
    }} /></label>)}</div>
    {(errors.x || errors.y) && <p className="nd-coordinate-error" role="alert">{errors.x || errors.y}</p>}
  </div></details>;
});
