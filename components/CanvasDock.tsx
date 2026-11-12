'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CheckSquare2, CircleHelp, Ellipsis, FolderOpen, GitBranch, Hand, Link2, MousePointer2, Pencil, Plus, Redo2, ScanText, Undo2, Upload, X } from 'lucide-react';
import { graphShortcutScope } from '@/lib/keyboard';
import type { Language } from '@/lib/types';
import './canvas-dock.css';

interface CanvasDockProps {
  language: Language;
  selectedTitle?: string;
  selectionSettings?: ReactNode;
  multiSelectMode?: boolean;
  onMultiSelectModeChange?: (active: boolean) => void;
  isTask?: boolean;
  editing: boolean;
  tool: 'select' | 'hand';
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: 'select' | 'hand') => void;
  onNewThought: () => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onNewLink: () => void;
  onUpload: () => void;
  onSibling: () => void;
  onChild: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onDeselect: () => void;
  onHelp: () => void;
}

/** One action surface. Graph hints appear only while graph shortcuts are active. */
export default function CanvasDock(props: CanvasDockProps) {
  const { language, selectedTitle, editing, tool, menuOpen, setMenuOpen } = props;
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const selected = selectedTitle !== undefined;
  const [graphFocused, setGraphFocused] = useState(false);
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => {
      const scope = graphShortcutScope(document.activeElement);
      setGraphFocused(scope === 'canvas' || scope === 'node');
    };
    const blur = () => setGraphFocused(false);
    update();
    const frame = requestAnimationFrame(update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', update);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update); window.removeEventListener('blur', blur); window.removeEventListener('focus', update); };
  }, [selectedTitle, editing, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !more.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside, true); };
  }, [menuOpen, setMenuOpen]);

  const run = (action: () => void) => { setMenuOpen(false); action(); };
  if (editing) return null;

  return <div className="canvas-dock" data-selected={selected} data-shortcuts-active={graphFocused}>
    {selected && <div className="dock-selection"><span className="dock-selection-label">{L('ادامهٔ فکر', 'Continue thought')}</span><strong dir="auto">{selectedTitle || L('بدون عنوان', 'Untitled')}</strong>{props.selectionSettings}<button type="button" onClick={props.onDeselect} aria-label={L('پایان انتخاب فکر', 'Clear thought selection')} title={L('پایان انتخاب', 'Clear selection')}><X size={13} /></button></div>}
    <div className="dock-actions" role="group" aria-label={selected ? L('ادامهٔ این فکر', 'Continue this thought') : L('ساختن روی بوم', 'Create on the canvas')}>
      {selected ? <>
        <button type="button" className="dock-primary" onClick={props.onChild} title={L('زیرشاخهٔ تازه از این فکر · Tab روی بوم', 'Create a child · Tab on the canvas')}><GitBranch size={17} /><span>{props.isTask ? L('ساب‌تسک', 'Subtask') : L('زیرشاخه', 'Branch')}</span></button>
        <button type="button" className="dock-secondary" onClick={props.onSibling} title={L('فکر هم‌سطح · Enter روی بوم', 'Sibling thought · Enter on the canvas')}><Plus size={17} /><span>{L('هم‌سطح', 'Sibling')}</span></button>
        <button type="button" className="dock-secondary dock-details" onClick={props.onDetails} title={L('باز کردن متن و جزئیات · Shift + Enter روی فکر', 'Open notes & details · Shift + Enter on the thought')}><ScanText size={17} /><span>{L('باز کردن', 'Open')}</span></button>
      </> : <button type="button" className="dock-primary" onClick={props.onNewThought} title={L('یک فکر تازه · Enter روی بوم', 'A new thought · Enter on the canvas')}><Plus size={18} /><span>{L('فکر تازه', 'New thought')}</span></button>}
      <div className="dock-more-wrap">
        <button ref={more} type="button" className="dock-icon" aria-label={L('گزینه‌های بیشتر', 'More actions')} aria-controls={menuOpen ? menuId : undefined} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} title={L('تسک، پروژه، فایل و ابزارها', 'Tasks, projects, files and tools')}><Ellipsis size={19} /></button>
        {menuOpen && <div ref={menu} id={menuId} className="dock-menu" role="region" aria-label={L('گزینه‌های بیشتر', 'More actions')}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); more.current?.focus(); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
            }
          }} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== more.current) setMenuOpen(false); }}>
          {selected && <><button type="button" onClick={() => run(props.onEdit)}><Pencil size={16} /><span>{L('ویرایش عنوان', 'Edit title')}</span><kbd>F2</kbd></button><button type="button" onClick={() => run(props.onNewThought)}><Plus size={16} /><span>{L('فکر مستقل تازه', 'New independent thought')}</span></button></>}
          <button type="button" onClick={() => run(props.onNewTask)}><CheckSquare2 size={16} /><span>{L('تسک تازه', 'New task')}</span></button>
          <button type="button" onClick={() => run(props.onNewProject)}><FolderOpen size={16} /><span>{L('پروژهٔ تازه', 'New project')}</span></button>
          <button type="button" onClick={() => run(props.onNewLink)}><Link2 size={16} /><span>{L('افزودن لینک', 'Add a link')}</span></button>
          <button type="button" onClick={() => run(props.onUpload)}><Upload size={16} /><span>{L('تصویر، ویدیو یا فایل', 'Image, video or file')}</span></button>
          <div className="dock-menu-divider" />
          {props.onMultiSelectModeChange && <button type="button" aria-pressed={!!props.multiSelectMode} onClick={() => run(() => props.onMultiSelectModeChange?.(!props.multiSelectMode))}><CheckSquare2 size={16} /><span>{L('انتخاب چندتایی', 'Select multiple thoughts')}</span>{props.multiSelectMode && <i />}</button>}
          <button type="button" aria-pressed={tool === 'select'} onClick={() => run(() => props.onToolChange('select'))}><MousePointer2 size={16} /><span>{L('انتخاب و جابه‌جایی فکر', 'Select and move thoughts')}</span>{tool === 'select' && <i />}</button>
          <button type="button" aria-pressed={tool === 'hand'} onClick={() => run(() => props.onToolChange('hand'))}><Hand size={16} /><span>{L('حرکت کل بوم', 'Pan the canvas')}</span>{tool === 'hand' && <i />}</button>
        </div>}
      </div>
      <span className="dock-divider" />
      <button type="button" className="dock-icon" onClick={props.onUndo} disabled={!props.canUndo} aria-label={L('بازگردانی', 'Undo')} title={L('بازگردانی تغییر بوم', 'Undo canvas change')}><Undo2 size={17} /></button>
      <button type="button" className="dock-icon dock-redo" onClick={props.onRedo} disabled={!props.canRedo} aria-label={L('انجام دوباره', 'Redo')} title={L('انجام دوباره', 'Redo')}><Redo2 size={17} /></button>
      <button type="button" className="dock-icon dock-help" onClick={props.onHelp} aria-label={L('راهنمای میانبرها', 'Shortcut guide')} title={L('راهنمای میانبرها', 'Shortcut guide')}><CircleHelp size={17} /></button>
    </div>
    <div className="dock-hint" aria-live="off">
      {props.multiSelectMode ? <><span>{L('انتخاب چندتایی · لمس فکرها یا کشیدن کادر', 'Multi-select · tap thoughts or draw a box')}</span><button type="button" className="dock-end-selection" onClick={() => props.onMultiSelectModeChange?.(false)}>{L('پایان', 'Done')}</button></> : graphFocused ? <><span className="dock-scope">{L('روی بوم', 'On canvas')}</span><span><kbd>Enter</kbd>{selected ? L('هم‌سطح', 'sibling') : L('فکر تازه', 'new thought')}</span>{selected ? <><span><kbd>Tab</kbd>{L('زیرشاخه', 'branch')}</span><span><kbd>Esc</kbd>{L('پایان انتخاب', 'clear selection')}</span></> : <span><kbd>F</kbd>{L('نمایش همه', 'fit all')}</span>}</> : <span>{tool === 'hand' ? L('حالت حرکت بوم · ابزار انتخاب در منوی بیشتر', 'Pan mode · selection tool is in More actions') : L('مکث روی فکر: پیش‌نمایش · کلیک: باز کردن', 'Hover to preview · click to open')}</span>}
    </div>
  </div>;
}
