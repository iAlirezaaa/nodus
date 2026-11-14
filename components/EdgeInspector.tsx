'use client';
import { ArrowLeftRight, RotateCcw, Trash2, X } from 'lucide-react';
import type { GraphEdge, GraphNode, Language, NodeColor } from '@/lib/types';
import './interaction-tools.css';

const tones: NodeColor[] = ['sage', 'blue', 'amber', 'rose', 'violet', 'gray'];
const names = { sage: ['مریم‌گلی','Sage'], blue: ['آبی','Blue'], amber: ['کهربایی','Amber'], rose: ['گلبهی','Rose'], violet: ['بنفش','Violet'], gray: ['خاکستری','Gray'] };
export default function EdgeInspector({ edge, nodes, language, onChange, onDelete, onClose }: {
  edge: GraphEdge; nodes: GraphNode[]; language: Language; onChange: (patch: Partial<GraphEdge>) => void; onDelete: () => void; onClose: () => void;
}) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  return <aside className="edge-inspector" aria-label={L('ویرایش اتصال','Connection editor')}>
    <header><strong>{L('مسیرِ یک ارتباط','Shape this connection')}</strong><button className="icon-button small" onClick={onClose} aria-label={L('بستن ویرایشگر اتصال','Close connection editor')}><X size={17}/></button></header>
    <label className="field-label">{L('عنوان ارتباط','Connection label')}<input className="text-input" dir="auto" value={edge.label} maxLength={500} onChange={e => onChange({ label: e.target.value })} placeholder={L('مثلاً: الهام گرفته از','e.g. inspired by')}/></label>
    <div className="connection-endpoints">
      <label className="field-label">{L('از فکر','From thought')}<select value={edge.sourceId} onChange={e => onChange({ sourceId: e.target.value })}>{nodes.filter(n => n.id !== edge.targetId).map(n => <option key={n.id} value={n.id}>{n.title || L('بدون عنوان','Untitled')}</option>)}</select></label>
      <button className="icon-button small" onClick={() => onChange({ sourceId: edge.targetId, targetId: edge.sourceId })} aria-label={L('برعکس کردن جهت اتصال','Reverse connection direction')}><ArrowLeftRight size={17}/></button>
      <label className="field-label">{L('به فکر','To thought')}<select value={edge.targetId} onChange={e => onChange({ targetId: e.target.value })}>{nodes.filter(n => n.id !== edge.sourceId).map(n => <option key={n.id} value={n.id}>{n.title || L('بدون عنوان','Untitled')}</option>)}</select></label>
    </div>
    <div className="connection-style-grid">
      <label className="field-label">{L('مسیر اتصال','Connection route')}<select value={edge.route ?? 'curve'} onChange={e => onChange({ route: e.target.value as GraphEdge['route'] })}><option value="curve">{L('منحنی','Curve')}</option><option value="straight">{L('مستقیم','Straight')}</option><option value="elbow">{L('زاویه‌دار','Elbow')}</option></select></label>
      <label className="field-label">{L('استایل خط','Line style')}<select value={edge.stroke ?? 'solid'} onChange={e => onChange({ stroke: e.target.value as GraphEdge['stroke'] })}><option value="solid">{L('پیوسته','Solid')}</option><option value="dashed">{L('خط‌چین','Dashed')}</option><option value="dotted">{L('نقطه‌چین','Dotted')}</option></select></label>
    </div>
    <div className="connection-color-row"><span>{L('رنگ','Color')}</span><div className="color-picker">{tones.map(color => <button key={color} className={`color-dot tone-${color} ${(edge.color ?? 'sage') === color ? 'active' : ''}`} aria-label={L(`رنگ اتصال: ${names[color][0]}`,`Connection color: ${names[color][1]}`)} aria-pressed={(edge.color ?? 'sage') === color} onClick={() => onChange({ color })}/>)}</div></div>
    <label className="connection-width">{L('ضخامت','Width')}<input type="range" min="1" max="5" step="0.5" value={edge.width ?? 2} onChange={e => onChange({ width: Number(e.target.value) })}/><output>{edge.width ?? 2}</output></label>
    <label className="connection-motion"><input type="checkbox" checked={edge.animated !== false} onChange={e => onChange({ animated: e.target.checked })}/><span>{L('حرکت نور در مسیر این فکر','Light travels along this thought')}</span></label>
    <p className="connection-hint">{L('نقطهٔ وسط اتصال را بکش تا مسیر عوض شود. جهت‌نماها هم آن را حرکت می‌دهند.','Drag the connection’s middle handle to reshape its path. Arrow keys move it too.')}</p>
    <footer><button className="secondary-button" disabled={!edge.bend} onClick={() => onChange({ bend: undefined })}><RotateCcw size={14}/>{L('مسیر خودکار','Reset path')}</button><button className="icon-button danger" onClick={onDelete} aria-label={L('حذف ارتباط','Delete connection')} title="Delete"><Trash2 size={17}/></button></footer>
  </aside>;
}
