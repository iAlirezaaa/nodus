'use client';

import { useState } from 'react';
import { Check, GitBranch, Layers, Plus } from 'lucide-react';
import Modal from './Modal';
import { STARTER_TEMPLATES, STARTER_TEMPLATE_IDS, type StarterTemplateId } from '@/lib/starter-templates';
import type { Language } from '@/lib/types';
import './starter-templates.css';

export default function TemplatePanel({ language, canApply, onApply, onClose }: {
  language: Language;
  canApply: boolean;
  onApply: (id: StarterTemplateId) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<StarterTemplateId>('brainstorm');
  const template = STARTER_TEMPLATES[selected];
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const itemCount = template.items.length;
  return <Modal title={L('از یک نقشهٔ آماده شروع کن', 'Start with a thinking template')} onClose={onClose} wide initialFocus="[data-starter-template]">
    <div className="starter-template-panel">
      <p className="dialog-description">{L('قالب‌ها فقط گره‌های قابل‌ویرایش به همین بوم اضافه می‌کنند؛ چیزی حذف یا جایگزین نمی‌شود.', 'Templates add editable thoughts to this board. Nothing already here is removed or replaced.')}</p>
      <div className="starter-template-picker" role="group" aria-label={L('انتخاب قالب', 'Choose a template')}>
        {STARTER_TEMPLATE_IDS.map(id => {
          const entry = STARTER_TEMPLATES[id];
          return <button key={id} type="button" data-starter-template={id} className={selected === id ? 'is-selected' : ''}
            aria-pressed={selected === id} onClick={() => setSelected(id)}>
            <span><strong>{entry.title[language]}</strong>{selected === id && <Check size={14} />}</span>
            <small>{entry.description[language]}</small>
          </button>;
        })}
      </div>
      <section className="starter-preview" aria-label={L('پیش‌نمایش ساختار', 'Structure preview')}>
        <header><Layers size={16} /><strong>{template.title[language]}</strong><span>{itemCount} {L('گره', 'nodes')} · {itemCount - 1} {L('ارتباط', 'links')}</span></header>
        <ul>{template.items.map((item, index) => <li key={index} style={{ marginInlineStart: (item.depth * 18) + 'px' }}><i style={{ background: 'var(--' + item.color + ')' }} aria-hidden="true" /> <span dir="auto">{item.title[language]}</span>{index === 0 && <small>{L('ریشه', 'root')}</small>}</li>)}</ul>
        {selected === 'production' && <p className="starter-project-note">{L('ریشه یک پروژهٔ واقعی با بوم داخلی خالی است؛ هشت گره و هفت ارتباط روی همین بوم باقی می‌مانند.', 'The root is a real project with an empty inner board; all eight thoughts and seven links stay on this canvas.')}</p>}
      </section>
      <div className="dialog-footer">
        <button type="button" className="secondary-button" onClick={onClose}>{L('انصراف', 'Cancel')}</button>
        <button type="button" className="primary-button" disabled={!canApply} onClick={() => onApply(selected)}><Plus size={16}/>{L('افزودن به همین بوم', 'Add to this board')}</button>
      </div>
      <p className="starter-undo-note"><GitBranch size={14}/>{L('تمام قالب با یک بازگردانی (Undo) حذف می‌شود.', 'A single Undo removes the entire new template.')}</p>
    </div>
  </Modal>;
}
