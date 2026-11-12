'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, ExternalLink, GitBranch, Highlighter, Layers, Link2, MessageSquarePlus, Move, Paperclip, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { GraphNode, Language, NodeAnnotation, NodeAppearance, NodeColor, TaskStatus, Workspace } from '@/lib/types';
import { kindIcons, kindName } from './Canvas';
import NodeAnnotations, { type AnnotationSelection, type NodeAnnotationsHandle } from './NodeAnnotations';
import TaskDetails from './TaskDetails';
import './node-details.css';

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
}

export default function Inspector({ node, document: doc, language, onChange, onClose, onOpen, onBranch, onConnect, onDuplicate, onDelete, onAttach, onSelect, draftScope, onDraftDirtyChange, onTaskStatus, onMakeTask, onRemoveTask, onAddSubtask, onToggleSubtask }: InspectorProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const Icon = kindIcons[node.kind];
  const links = doc.edges.filter(edge => edge.sourceId === node.id || edge.targetId === node.id);
  const asset = node.asset;
  const titleInput = useRef<HTMLInputElement>(null);
  const notesInput = useRef<HTMLTextAreaElement>(null);
  const annotations = useRef<NodeAnnotationsHandle>(null);
  const [selection, setSelection] = useState<AnnotationSelection | null>(null);
  const [urlDraft, setUrlDraft] = useState(node.url);
  const [urlError, setUrlError] = useState('');
  useEffect(() => { setUrlDraft(node.url); setUrlError(''); }, [node.id, node.url]);
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
    <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => annotations.current?.start(activeSelection)} aria-controls={`annotations-${node.id}`}><MessageSquarePlus size={14} />{L('افزودن نظر', 'Add annotation')}</button>
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
    const value = urlDraft.trim();
    try {
      if (value) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('url'); }
      if (!onChange({ url: value })) { setUrlError(L('تغییر ثبت نشد؛ پس از آماده‌شدن فضا دوباره تلاش کن.', 'The change was not accepted. Try again when the workspace is ready.')); return; }
      setUrlError('');
    } catch { setUrlError(L('یک نشانی کامل با http:// یا https:// وارد کن.', 'Enter a complete address starting with http:// or https://.')); }
  };
  const childCount = doc.nodes.filter(item => item.boardId === node.childBoardId).length;

  return <aside className="inspector" aria-label={L('ویرایش گره', 'Node editor')}>
    <div className="inspector-header"><span><Icon size={17} />{kindName(node.kind, language)}</span><div><button className="icon-button" onClick={onDuplicate} aria-label={L('تکثیر گره', 'Duplicate node')} title={L('تکثیر', 'Duplicate')}><Copy size={16} /></button><button className="icon-button" onClick={onClose} aria-label={L('بستن ویرایشگر', 'Close editor')}><X size={19} /></button></div></div>
    <div className="inspector-content">
      <div className="editor-eyebrow">{L('فضای یک فکر', 'A THOUGHT, UP CLOSE')}</div>
      <label className="sr-only" htmlFor="node-title">{L('عنوان', 'Title')}</label>
      <input ref={titleInput} id="node-title" className="node-title-input" dir="auto" value={node.title} maxLength={500} placeholder={L('عنوان ایده…', 'Name this thought…')} onChange={event => { setSelection(null); onChange({ title: event.target.value }); }} onSelect={event => captureSelection('title', event.currentTarget)} onPointerUp={event => captureSelection('title', event.currentTarget)} onKeyUp={event => captureSelection('title', event.currentTarget)} />
      {selectionAction('title')}
      <div className="color-picker" aria-label={L('رنگ گره', 'Node color')}>{tones.map(color => <button key={color} className={`color-dot tone-${color} ${node.color === color ? 'active' : ''}`} aria-label={colorNames[color][language === 'fa' ? 0 : 1]} aria-pressed={node.color === color} onClick={() => onChange({ color })}>{node.color === color && <Check size={12} />}</button>)}</div>
      <AppearanceAndPosition key={node.id} node={node} language={language} onChange={onChange} />
      <label className="field-label timeline-date-label">{L('تاریخ روی تایم‌لاین', 'Timeline date')}<input type="date" className="text-input" dir="ltr" min="0001-01-01" max="9999-12-31" value={node.scheduledAt ?? ''} aria-label={L('تاریخ روی تایم‌لاین', 'Timeline date')} onInput={event => { if (event.currentTarget.validity.valid) onChange({ scheduledAt: event.currentTarget.value || undefined }); }} onChange={event => onChange({ scheduledAt: event.target.value || undefined })} /><small>{L('بدون تاریخ انتخابی، زمان ساخت ایده استفاده می‌شود.', 'Uses the creation date when no date is chosen.')}</small></label>
      {asset && <div className={`asset-preview preview-${node.kind}`}>
        {node.kind === 'image' ? <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={node.title} /></a> : node.kind === 'video' ? <video key={asset.id} controls playsInline preload="metadata" src={asset.url} /> : node.kind === 'audio' ? <audio key={asset.id} controls preload="metadata" src={asset.url} /> : node.kind === 'pdf' ? <iframe key={asset.id} title={node.title || asset.name} src={`${asset.url}#toolbar=1&navpanes=0`} /> : <div className="file-preview"><Icon size={34} /><span dir="auto">{asset.name}</span></div>}
        <div className="asset-info"><span dir="auto" title={asset.name}>{asset.name}</span><a href={`${asset.url}?download=1`} download={asset.name} aria-label={L('دانلود فایل اصلی', 'Download original file')}><Download size={15} /></a><a href={asset.url} target="_blank" rel="noreferrer" aria-label={L('بازکردن فایل', 'Open file')}><ExternalLink size={15} /></a></div>
        <div className="asset-size">{(asset.size / (1024 * 1024)).toFixed(asset.size > 1024 * 1024 ? 1 : 2)} MB · {asset.mime}</div>
      </div>}
      {node.kind === 'link' && <label className="field-label">{L('نشانی وب', 'Web address')}<input type="url" dir="ltr" className="text-input" value={urlDraft} onChange={event => setUrlDraft(event.target.value)} onBlur={commitUrl} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-invalid={!!urlError} placeholder="https://…" />{urlError && <small className="field-error">{urlError}</small>}{/^https?:\/\//i.test(node.url) && <a className="text-link" href={node.url} target="_blank" rel="noopener noreferrer">{L('بازکردن لینک', 'Open link')}<ArrowUpRight size={14} /></a>}</label>}
      <label className="field-label notes-label" htmlFor="node-text">{L('یادداشت و جزئیات', 'Notes & details')}</label>
      <textarea ref={notesInput} id="node-text" dir="auto" className="node-text-input" value={node.text} maxLength={100000} placeholder={L('هر چیزی که به این ایده مربوط است…\nسطرهای جدا می‌توانند به شاخه تبدیل شوند.', 'Anything that belongs to this thought…\nSeparate lines can become branches.')} onChange={event => { setSelection(null); onChange({ text: event.target.value }); }} onSelect={event => captureSelection('text', event.currentTarget)} onPointerUp={event => captureSelection('text', event.currentTarget)} onKeyUp={event => captureSelection('text', event.currentTarget)} />
      {selectionAction('text')}
      <TaskDetails node={node} document={doc} language={language} onSelect={onSelect} onTaskStatus={onTaskStatus ?? ((id, status) => { if (id === node.id) onChange({ task: { status, parentId: node.task?.parentId ?? null } }); })} onMakeTask={onMakeTask ?? (() => { onChange({ task: { status: 'todo', parentId: null } }); })} onRemoveTask={onRemoveTask} onAddSubtask={onAddSubtask} onToggleSubtask={onToggleSubtask} />
      <NodeAnnotations key={`${draftScope ?? ''}:${node.id}`} ref={annotations} node={node} language={language} draftScope={draftScope} selection={activeSelection} onChange={next => onChange({ annotations: next })} onSelectRange={focusQuote} onDraftDirtyChange={onDraftDirtyChange} />
      <button className={`project-entry ${node.childBoardId ? 'has-project' : ''}`} onClick={onOpen}><span className="project-entry-icon"><Layers size={21} /></span><span><strong>{node.childBoardId ? L('وارد پروژه شو', 'Enter project') : L('یک جهان داخل این ایده', 'Make room inside this thought')}</strong><small>{node.childBoardId ? `${childCount} ${L('گره · بوم مستقل', 'nodes · its own canvas')}` : L('محتوا بماند؛ یک بوم تازه هم باز شود.', 'Keep the content. Open a canvas within it.')}</small></span><ArrowUpRight size={18} /></button>
      <div className="inspector-actions"><button onClick={onBranch}><GitBranch size={16} />{L('رشد شاخه‌ها', 'Grow branches')}</button><button onClick={onConnect}><Link2 size={16} />{L('اتصال', 'Connect')}</button><button onClick={onAttach}><Paperclip size={16} />{L('پیوست فایل', 'Attach file')}</button></div>
      {links.length > 0 && <section className="relations"><h3>{L('فکرهای مرتبط', 'Connected thoughts')}<span>{links.length}</span></h3>{links.map(edge => { const other = doc.nodes.find(item => item.id === (edge.sourceId === node.id ? edge.targetId : edge.sourceId)); return other ? <button key={edge.id} onClick={() => onSelect(other.id)}><span className={`tiny-color tone-${other.color}`} /><span dir="auto">{other.title || L('بدون عنوان', 'Untitled')}</span><ArrowUpRight size={14} /></button> : null; })}</section>}
    </div>
    <div className="inspector-bottom"><span>{L('تغییرات ذخیره می‌شوند؛ نظر تازه دکمهٔ ذخیره دارد.', 'Changes save automatically; annotations use Save.')}</span><button className="icon-button danger" onClick={onDelete} aria-label={L('حذف گره', 'Delete node')}><Trash2 size={17} /></button></div>
  </aside>;
}

function AppearanceAndPosition({ node, language, onChange }: Pick<InspectorProps, 'node' | 'language' | 'onChange'>) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const [coordinates, setCoordinates] = useState({ x: String(node.x), y: String(node.y) });
  const [errors, setErrors] = useState<{ x?: string; y?: string }>({});
  const editing = useRef(new Set<'x' | 'y'>());
  const cancelBlur = useRef(new Set<'x' | 'y'>());
  useEffect(() => { if (!editing.current.has('x')) setCoordinates(current => ({ ...current, x: String(node.x) })); }, [node.x]);
  useEffect(() => { if (!editing.current.has('y')) setCoordinates(current => ({ ...current, y: String(node.y) })); }, [node.y]);
  const commit = (axis: 'x' | 'y', value: string) => {
    editing.current.delete(axis);
    if (cancelBlur.current.delete(axis)) return;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || Math.abs(number) > 1e7) { setErrors(current => ({ ...current, [axis]: L('عددی بین −۱۰٬۰۰۰٬۰۰۰ و ۱۰٬۰۰۰٬۰۰۰ وارد کن.', 'Enter a number between −10,000,000 and 10,000,000.') })); return; }
    if (number !== node[axis] && !onChange({ [axis]: number })) { setErrors(current => ({ ...current, [axis]: L('جابه‌جایی ثبت نشد؛ دوباره تلاش کن.', 'The move was not accepted. Try again.') })); return; }
    setCoordinates(current => ({ ...current, [axis]: String(number) }));
    setErrors(current => ({ ...current, [axis]: undefined }));
  };
  return <details className="nd-appearance-details"><summary><SlidersHorizontal size={14} />{L('شکل و جایگاه گره', 'Appearance & position')}</summary><div className="nd-appearance-content">
    <label className="nd-label" htmlFor={`node-appearance-${node.id}`}>{L('شکل نمایش', 'Node appearance')}</label>
    <select id={`node-appearance-${node.id}`} className="nd-select" value={node.appearance ?? 'card'} onChange={event => onChange({ appearance: event.target.value as NodeAppearance })}><option value="card">{L('کارت', 'Card')}</option><option value="sticky">{L('یادداشت چسبان', 'Sticky note')}</option><option value="outline">{L('کادر خطی', 'Outline')}</option></select>
    <div className="nd-position-heading"><Move size={13} /><span>{L('مختصات روی بوم', 'Canvas coordinates')}</span></div>
    <div className="nd-position-fields">{(['x', 'y'] as const).map(axis => <label key={axis}><span>{axis.toUpperCase()}</span><input type="number" dir="ltr" min={-1e7} max={1e7} step="any" value={coordinates[axis]} aria-label={L(`مختصات ${axis.toUpperCase()}`, `${axis.toUpperCase()} position`)} aria-invalid={!!errors[axis]} onFocus={() => editing.current.add(axis)} onChange={event => { const value = event.target.value; setCoordinates(current => ({ ...current, [axis]: value })); }} onBlur={event => commit(axis, event.currentTarget.value)} onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelBlur.current.add(axis); setCoordinates(current => ({ ...current, [axis]: String(node[axis]) })); setErrors(current => ({ ...current, [axis]: undefined })); event.currentTarget.blur(); }
    }} /></label>)}</div>
    {(errors.x || errors.y) && <p className="nd-coordinate-error" role="alert">{errors.x || errors.y}</p>}
  </div></details>;
}
