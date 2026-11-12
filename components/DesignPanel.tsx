'use client';
import { useId, useMemo, useState } from 'react';
import { ArrowDownWideNarrow, Check, Network, Palette, RotateCcw, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { DEFAULT_CANVAS_DESIGN, suggestLayouts, type CanvasDesign, type LayoutKind, type LayoutOptions } from '@/lib/layouts';
import type { GraphEdge, GraphNode, Language, NodeColor } from '@/lib/types';
import './design-panel.css';

const kinds: LayoutKind[] = ['neural','tree','orbit','grid','timeline','kanban'];
const labels: Record<LayoutKind, [string,string]> = { neural:['شبکهٔ نورونی','Neural network'], tree:['شاخه‌های فکر','Thought tree'], orbit:['مدار ایده‌ها','Idea orbits'], grid:['میز ایده‌ها','Idea grid'], timeline:['خط زمان','Timeline'], kanban:['مسیر انجام کار','Task lanes'] };
const descriptions: Record<LayoutKind, [string,string]> = {
  neural:['فکرهای مرتبط جذب هم می‌شوند؛ نقطه‌ها جا برای نفس کشیدن دارند.','Related thoughts attract; nodes keep a comfortable distance.'],
  tree:['از فکر اصلی به شاخه‌ها و جزئیات برس.','Follow an idea into branches and details.'],
  orbit:['فکرهای مرکزی را در حلقه‌ای از ارتباط‌ها ببین.','Place connected ideas around their central thoughts.'],
  grid:['مرور مرتب برای نوشته‌ها و مرجع‌های تصویری.','Scan notes and visual references in tidy rows.'],
  timeline:['ایده‌ها را بر اساس تاریخ انتخابی یا زمان ساخت مرور کن.','Follow scheduled dates or the order ideas were created.'],
  kanban:['انجام‌نشده، در حال انجام، انجام‌شده و ایده‌های آزاد.','To do, in progress, done, and untracked ideas.'],
};
export const layoutName = (kind: LayoutKind, language: Language) => labels[kind][language === 'fa' ? 0 : 1];
const colors: NodeColor[] = ['sage','blue','amber','rose','violet','gray'];
const colorNames = { sage:['مریم‌گلی','Sage'],blue:['آبی','Blue'],amber:['کهربایی','Amber'],rose:['گلبهی','Rose'],violet:['بنفش','Violet'],gray:['خاکستری','Gray'] };

function LayoutSketch({ kind }: { kind: LayoutKind }) {
  const points: Record<LayoutKind, number[][]> = {
    neural:[[28,35],[64,20],[99,38],[61,56],[126,16],[139,57]], tree:[[82,12],[40,38],[124,38],[22,65],[57,65],[106,65],[143,65]],
    orbit:[[82,39],[82,7],[118,20],[122,57],[82,71],[43,57],[44,20]], grid:[[39,20],[82,20],[125,20],[39,57],[82,57],[125,57]],
    timeline:[[23,27],[57,52],[92,27],[128,52],[147,27]], kanban:[[31,22],[31,49],[81,22],[81,49],[131,22]],
  };
  const links: Record<LayoutKind, number[][]> = { neural:[[0,1],[1,2],[0,3],[3,2],[2,4],[2,5],[1,4]], tree:[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]], orbit:[[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]], grid:[],timeline:[[0,1],[1,2],[2,3],[3,4]],kanban:[] };
  const nodes = points[kind];
  return <svg viewBox="0 0 166 80" fill="none" aria-hidden="true" className={`layout-sketch sketch-${kind}`}>
    {kind === 'timeline' && <path d="M10 39H156" className="sketch-guide" />}
    {kind === 'kanban' && [6,56,106].map(x=><rect key={x} x={x} y={5} width={48} height={69} rx={7} className="sketch-lane" />)}
    {links[kind].map(([a,b],i)=><path key={i} d={`M${nodes[a][0]} ${nodes[a][1]} Q${nodes[b][0]} ${nodes[a][1]} ${nodes[b][0]} ${nodes[b][1]}`} className="sketch-edge"/>)}
    {nodes.map(([x,y],i)=>(kind === 'grid' || kind === 'kanban') ? <rect key={i} x={x-13} y={y-8} width={26} height={16} rx={4} className="sketch-node"/> : <g key={i}><circle cx={x} cy={y} r={i===0?7:4.5} className="sketch-node"/>{kind==='neural'&&<circle cx={x} cy={y} r={i===0?12:8} className="sketch-halo"/>}</g>)}
  </svg>;
}

export default function DesignPanel({ nodes, edges, design, options, language, persistenceError, onDesign, onApply, onClose }: {
  nodes: GraphNode[]; edges: GraphEdge[]; design: CanvasDesign; options: LayoutOptions; language: Language; persistenceError?: boolean;
  onDesign: (design: CanvasDesign) => void; onApply: (options: LayoutOptions) => void; onClose: () => void;
}) {
  const L = (fa:string,en:string) => language === 'fa' ? fa : en;
  const tabId = useId();
  const [tab,setTab] = useState<'layout'|'appearance'>('layout');
  const [draft,setDraft] = useState(options);
  const recommendations = useMemo(()=>suggestLayouts(nodes,edges),[nodes,edges]);
  const suggested = useMemo(()=>new Map(recommendations.slice(0,2).map(item=>[item.kind,item])),[recommendations]);
  return <Modal title={L('بوم را شبیه فکر خودت کن','Make room for the way you think')} onClose={onClose} wide>
    <div className="design-panel">
      <p className="design-intro">{L('یک نگاه تازه به همان ایده‌ها. چیدمان را عوض کن یا ظاهر شخصی خودت را بساز.','The same ideas, seen differently. Choose a layout or shape your own view.')}</p>
      <div className="design-tabs" role="tablist" aria-label={L('تنظیمات بوم','Canvas settings')} onKeyDown={event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const next=event.key==='Home'?'layout':event.key==='End'?'appearance':tab==='layout'?'appearance':'layout';
        setTab(next);event.currentTarget.querySelector<HTMLButtonElement>(`[data-design-tab="${next}"]`)?.focus();
      }}>
        <button type="button" role="tab" id={`${tabId}-layout`} data-design-tab="layout" aria-controls={`${tabId}-panel`} tabIndex={tab==='layout'?0:-1} aria-selected={tab==='layout'} onClick={()=>setTab('layout')}><Network size={16}/>{L('چیدمان ایده‌ها','Idea layout')}</button>
        <button type="button" role="tab" id={`${tabId}-appearance`} data-design-tab="appearance" aria-controls={`${tabId}-panel`} tabIndex={tab==='appearance'?0:-1} aria-selected={tab==='appearance'} onClick={()=>setTab('appearance')}><Palette size={16}/>{L('ظاهر شخصی','Personal style')}</button>
      </div>
      {persistenceError && <p className="design-storage-note" role="status">{L('این ظاهر فعلاً در همین صفحه می‌ماند؛ ذخیرهٔ تنظیمات روی دستگاه ممکن نشد.','This view works for this session; preferences could not be saved on this device.')}</p>}
      {tab === 'layout' ? <section className="design-layout-section" id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-layout`}>
        <div className="design-section-label"><Sparkles size={14}/><span>{L('پیشنهادها بر اساس محتوای همین بوم','Suggestions for the content on this board')}</span></div>
        <div className="layout-options">{kinds.map(kind=>{const suggestion=suggested.get(kind);return <button type="button" key={kind} className={`layout-option ${draft.kind===kind?'is-chosen':''}`} aria-pressed={draft.kind===kind} onClick={()=>setDraft({...draft,kind})}>
          <LayoutSketch kind={kind}/><span className="layout-option-title">{layoutName(kind,language)}{draft.kind===kind&&<Check size={15}/>}</span>
          <span className="layout-option-description">{descriptions[kind][language==='fa'?0:1]}</span>
          {suggestion&&<span className="layout-recommendation"><Sparkles size={11}/>{suggestion.reason[language]}</span>}
        </button>;})}</div>
        <div className="layout-controls">
          <label>{L('مرتب‌سازی بر اساس','Sort by')}<select value={draft.sort} onChange={event=>setDraft({...draft,sort:event.target.value as LayoutOptions['sort']})}>
            <option value="created">{L('زمان ساخت','Creation date')}</option><option value="title">{L('عنوان ایده','Title')}</option><option value="kind">{L('نوع محتوا','Content type')}</option><option value="color">{L('رنگ گره','Node color')}</option><option value="status">{L('وضعیت تسک','Task status')}</option>
          </select></label>
          <label>{L('ترتیب','Order')}<select value={draft.direction} onChange={event=>setDraft({...draft,direction:event.target.value as LayoutOptions['direction']})}><option value="asc">{L('رو به جلو','Ascending')}</option><option value="desc">{L('برعکس','Descending')}</option></select></label>
          <label className="layout-spacing">{L('فاصلهٔ ایده‌ها','Idea spacing')}<input aria-label={L('فاصلهٔ ایده‌ها','Idea spacing')} type="range" min="24" max="240" step="12" value={draft.spacing} onChange={event=>setDraft({...draft,spacing:Number(event.target.value)})}/><span>{L('نزدیک‌تر','Closer')}<i/>{L('بازتر','Wider')}</span></label>
        </div>
        <p className="layout-note">{draft.kind==='timeline'?L('تاریخ هر ایده را از جزئیات آن تعیین کن، سپس چیدمان را اعمال کن. ایده‌های بدون تاریخ از زمان ساخت استفاده می‌کنند.','Choose dates in each idea’s Details, then apply the layout. Undated ideas use their creation date.'):draft.kind==='kanban'?L('ستون‌ها بر اساس وضعیت فعلی ساخته می‌شوند. بعد از تغییر وضعیت تسک، چیدمان را دوباره اعمال کن؛ کشیدن کارت وضعیت را عوض نمی‌کند.','Lanes use the current task status. Apply the layout again after changing statuses; dragging a card does not change its status.'):draft.kind==='neural'?L('جاذبهٔ اتصال‌ها و دافعهٔ گره‌ها، شبکه را در یک مرحله مرتب می‌کند؛ بعد از آن بوم ثابت و قابل ویرایش است.','Connection attraction and node repulsion settle the network in one pass; the board then stays still and editable.'):L('چیدمان، جای گره‌ها را تغییر می‌دهد و با بازگردانی قابل برگشت است.','Layout changes node positions and can be undone.')}</p>
        <footer className="design-footer"><span>{nodes.length.toLocaleString(language==='fa'?'fa':'en')} {L('ایده در این بوم','ideas on this board')}</span><button type="button" className="primary-button" disabled={!nodes.length} onClick={()=>onApply({...draft,language})}><ArrowDownWideNarrow size={16}/>{L('اعمال چیدمان','Apply layout')}</button></footer>
      </section> : <section className="design-appearance-section" id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-appearance`}>
        <div className="appearance-preview" data-style={design.nodeStyle} style={{'--preview-accent':`var(--${design.accent})`} as React.CSSProperties}><LayoutSketch kind={design.nodeStyle==='neuron'?'neural':'grid'}/><div><strong>{L('فکرهایت، به زبان خودت','Your thoughts, in your own language')}</strong><p>{L('ظاهر برای خودت است؛ ایده‌ها و ارتباط‌ها مشترک می‌مانند.','Your view is personal; the thoughts and connections stay shared.')}</p></div></div>
        <fieldset className="design-choice"><legend>{L('نمایش گره‌ها','Node presentation')}</legend><div>{(['neuron','cards'] as const).map(style=><button type="button" key={style} aria-pressed={design.nodeStyle===style} onClick={()=>onDesign({...design,nodeStyle:style})}>{style==='neuron'?L('نورون‌های ساده','Simple neurons'):L('کارت‌های محتوا','Content cards')}{design.nodeStyle===style&&<Check size={14}/>}</button>)}</div></fieldset>
        <div className="appearance-fields">
          <label>{L('پس‌زمینه','Background')}<select value={design.background} onChange={event=>onDesign({...design,background:event.target.value as CanvasDesign['background']})}><option value="dots">{L('نقطه‌ها','Dots')}</option><option value="grid">{L('شبکهٔ ظریف','Fine grid')}</option><option value="none">{L('ساده','Plain')}</option></select></label>
          <label>{L('اندازهٔ نمایش','Visual density')}<select value={design.density} onChange={event=>onDesign({...design,density:event.target.value as CanvasDesign['density']})}><option value="compact">{L('جمع‌وجور','Compact')}</option><option value="comfortable">{L('متعادل','Balanced')}</option><option value="spacious">{L('خواناتر','More spacious')}</option></select></label>
        </div>
        <fieldset className="design-colors"><legend>{L('رنگ تأکیدی','Accent color')}</legend><div>{colors.map(color=><button type="button" key={color} className={`design-color tone-${color}`} style={{'--choice-color':`var(--${color})`} as React.CSSProperties} aria-label={colorNames[color][language==='fa'?0:1]} aria-pressed={design.accent===color} onClick={()=>onDesign({...design,accent:color})}>{design.accent===color&&<Check size={15}/>}</button>)}</div></fieldset>
        <label className="design-toggle"><input type="checkbox" checked={design.connectionLabels} onChange={event=>onDesign({...design,connectionLabels:event.target.checked})}/><span>{L('نمایش عنوان ارتباط‌ها','Show connection labels')}</span></label>
        <footer className="design-footer"><button type="button" className="text-link" onClick={()=>onDesign({...DEFAULT_CANVAS_DESIGN})}><RotateCcw size={14}/>{L('ظاهر پیش‌فرض','Reset appearance')}</button><button type="button" className="primary-button" onClick={onClose}>{L('تمام','Done')}</button></footer>
      </section>}
    </div>
  </Modal>;
}
