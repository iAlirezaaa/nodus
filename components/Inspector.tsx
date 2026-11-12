'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, ExternalLink, FileText, GitBranch, Layers, Link2, Paperclip, Trash2, X } from 'lucide-react';
import type { GraphNode, Language, NodeColor, Workspace } from '@/lib/types';
import { kindIcons, kindName } from './Canvas';

const tones:NodeColor[]=['sage','blue','amber','rose','violet','gray'];
const colorNames={sage:['مریم‌گلی','Sage'],blue:['آبی','Blue'],amber:['کهربایی','Amber'],rose:['گلبهی','Rose'],violet:['بنفش','Violet'],gray:['خاکستری','Gray']};
export default function Inspector({node,document:doc,language,onChange,onClose,onOpen,onBranch,onConnect,onDuplicate,onDelete,onAttach,onSelect}:{node:GraphNode;document:Workspace;language:Language;onChange:(patch:Partial<GraphNode>)=>void;onClose:()=>void;onOpen:()=>void;onBranch:()=>void;onConnect:()=>void;onDuplicate:()=>void;onDelete:()=>void;onAttach:()=>void;onSelect:(id:string)=>void}){
  const L=(fa:string,en:string)=>language==='fa'?fa:en;const Icon=kindIcons[node.kind];
  const links=doc.edges.filter(e=>e.sourceId===node.id||e.targetId===node.id);
  const asset=node.asset;
  const [urlDraft,setUrlDraft]=useState(node.url);
  const [urlError,setUrlError]=useState(false);
  useEffect(()=>{setUrlDraft(node.url);setUrlError(false);},[node.id,node.url]);
  const commitUrl=()=>{const value=urlDraft.trim();try{if(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('url');}setUrlError(false);onChange({url:value});}catch{setUrlError(true);}};
  const childCount=doc.nodes.filter(n=>n.boardId===node.childBoardId).length;
  return <aside className="inspector" aria-label={L('ویرایش گره','Node editor')}>
    <div className="inspector-header"><span><Icon size={17}/>{kindName(node.kind,language)}</span><div><button className="icon-button" onClick={onDuplicate} aria-label={L('تکثیر گره','Duplicate node')} title={L('تکثیر','Duplicate')}><Copy size={16}/></button><button className="icon-button" onClick={onClose} aria-label={L('بستن ویرایشگر','Close editor')}><X size={19}/></button></div></div>
    <div className="inspector-content">
      <div className="editor-eyebrow">{L('فضای یک فکر','A THOUGHT, UP CLOSE')}</div>
      <label className="sr-only" htmlFor="node-title">{L('عنوان','Title')}</label><input id="node-title" className="node-title-input" dir="auto" value={node.title} maxLength={300} placeholder={L('عنوان ایده…','Name this thought…')} onChange={e=>onChange({title:e.target.value})}/>
      <div className="color-picker" aria-label={L('رنگ گره','Node color')}>{tones.map(c=><button key={c} className={`color-dot tone-${c} ${node.color===c?'active':''}`} aria-label={colorNames[c][language==='fa'?0:1]} aria-pressed={node.color===c} onClick={()=>onChange({color:c})}>{node.color===c&&<Check size={12}/>}</button>)}</div>
      {asset&&<div className={`asset-preview preview-${node.kind}`}>
        {node.kind==='image'?<a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={node.title}/></a>:node.kind==='video'?<video key={asset.id} controls playsInline preload="metadata" src={asset.url}/>:node.kind==='audio'?<audio key={asset.id} controls preload="metadata" src={asset.url}/>:node.kind==='pdf'?<iframe key={asset.id} title={node.title||asset.name} src={`${asset.url}#toolbar=1&navpanes=0`}/>:<div className="file-preview"><Icon size={34}/><span dir="auto">{asset.name}</span></div>}
        <div className="asset-info"><span dir="auto" title={asset.name}>{asset.name}</span><a href={`${asset.url}?download=1`} download={asset.name} aria-label={L('دانلود فایل اصلی','Download original file')}><Download size={15}/></a><a href={asset.url} target="_blank" rel="noreferrer" aria-label={L('بازکردن فایل','Open file')}><ExternalLink size={15}/></a></div>
        <div className="asset-size">{(asset.size/(1024*1024)).toFixed(asset.size>1024*1024?1:2)} MB · {asset.mime}</div>
      </div>}
      {node.kind==='link'&&<label className="field-label">{L('نشانی وب','Web address')}<input type="url" dir="ltr" className="text-input" value={urlDraft} onChange={e=>setUrlDraft(e.target.value)} onBlur={commitUrl} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={urlError} placeholder="https://…"/>{urlError&&<small className="field-error">{L('یک نشانی کامل با https:// وارد کن.','Enter a complete address starting with https://.')}</small>}{/^https?:\/\//i.test(node.url)&&<a className="text-link" href={node.url} target="_blank" rel="noopener noreferrer">{L('بازکردن لینک','Open link')}<ArrowUpRight size={14}/></a>}</label>}
      <label className="field-label notes-label" htmlFor="node-text">{L('یادداشت و جزئیات','Notes & details')}</label>
      <textarea id="node-text" dir="auto" className="node-text-input" value={node.text} maxLength={100000} placeholder={L('هر چیزی که به این ایده مربوط است…\nسطرهای جدا می‌توانند به شاخه تبدیل شوند.','Anything that belongs to this thought…\nSeparate lines can become branches.')} onChange={e=>onChange({text:e.target.value})}/>
      <button className={`project-entry ${node.childBoardId?'has-project':''}`} onClick={onOpen}><span className="project-entry-icon"><Layers size={21}/></span><span><strong>{node.childBoardId?L('وارد پروژه شو','Enter project'):L('یک جهان داخل این ایده','Make room inside this thought')}</strong><small>{node.childBoardId?`${childCount} ${L('گره · بوم مستقل','nodes · its own canvas')}`:L('محتوا بماند؛ یک بوم تازه هم باز شود.','Keep the content. Open a canvas within it.')}</small></span><ArrowUpRight size={18}/></button>
      <div className="inspector-actions"><button onClick={onBranch}><GitBranch size={16}/>{L('رشد شاخه‌ها','Grow branches')}</button><button onClick={onConnect}><Link2 size={16}/>{L('اتصال','Connect')}</button><button onClick={onAttach}><Paperclip size={16}/>{L('پیوست فایل','Attach file')}</button></div>
      {links.length>0&&<section className="relations"><h3>{L('فکرهای مرتبط','Connected thoughts')}<span>{links.length}</span></h3>{links.map(e=>{const other=doc.nodes.find(n=>n.id===(e.sourceId===node.id?e.targetId:e.sourceId));return other?<button key={e.id} onClick={()=>onSelect(other.id)}><span className={`tiny-color tone-${other.color}`}/><span dir="auto">{other.title||L('بدون عنوان','Untitled')}</span><ArrowUpRight size={14}/></button>:null;})}</section>}
    </div>
    <div className="inspector-bottom"><span>{L('تغییرات خودکار ذخیره می‌شوند','Changes save automatically')}</span><button className="icon-button danger" onClick={onDelete} aria-label={L('حذف گره','Delete node')}><Trash2 size={17}/></button></div>
  </aside>;
}
