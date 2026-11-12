'use client';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, AudioLines, File as FileIcon, FileText, Image as ImageIcon, Layers, Link2, Play, Plus, StickyNote, Video } from 'lucide-react';
import { fitViewport } from '@/lib/graph';
import type { GraphEdge, GraphNode, Language, NodeKind, Viewport, Workspace } from '@/lib/types';

export const kindIcons={note:StickyNote,image:ImageIcon,video:Video,audio:AudioLines,pdf:FileText,file:FileIcon,link:Link2,project:Layers};
export const kindName=(kind:NodeKind,language:Language)=>({note:['یادداشت','Note'],image:['تصویر','Image'],video:['ویدیو','Video'],audio:['صدا','Audio'],pdf:['پی‌دی‌اف','PDF'],file:['فایل','File'],link:['لینک','Link'],project:['پروژه','Project']}[kind][language==='fa'?0:1]);
export interface CanvasHandle {fit:()=>void;zoomBy:(factor:number)=>void;focusNode:(id:string)=>void;getCenter:()=>{x:number;y:number};}
interface Props {document:Workspace;boardId:string;selectedId:string|null;selectedEdgeId:string|null;language:Language;tool:'select'|'hand';connectFrom:string|null;onSelect:(id:string|null)=>void;onSelectEdge:(id:string)=>void;onOpen:(id:string)=>void;onMove:(id:string,x:number,y:number)=>void;onConnect:(source:string,target:string)=>void;onStartConnect:(id:string)=>void;onBranch:(id:string)=>void;onCreate:(x:number,y:number)=>void;onDropFiles:(files:File[],point:{x:number;y:number})=>void;onZoomChange:(zoom:number)=>void;}
type Gesture={mode:'pan'|'node';pointerId:number;id?:string;startX:number;startY:number;worldX:number;worldY:number;x:number;y:number;moved:boolean;};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const fitPadding=(width:number,height:number)=>Math.max(16,Math.min(90,width*.07,height*.12));
const colors:Record<string,string>={sage:'#b5ccaf',blue:'#91b7df',amber:'#e5bf82',rose:'#dc9d99',violet:'#bbb0e0',gray:'#9da5a9'};
type ProjectMiniature={nodes:GraphNode[];edges:GraphEdge[]};
const EMPTY_MINIATURE:ProjectMiniature={nodes:[],edges:[]};

const Canvas=forwardRef<CanvasHandle,Props>(function Canvas(props,ref){
  const {document:doc,boardId,language,selectedId,connectFrom,tool}=props;
  const fa=language==='fa'; const L=(faText:string,en:string)=>fa?faText:en;
  const surface=useRef<HTMLDivElement>(null);
  const viewRef=useRef<Viewport>({x:0,y:0,zoom:1}); const [view,setViewState]=useState<Viewport>(viewRef.current);
  const [size,setSize]=useState({width:1200,height:800}); const [moving,setMoving]=useState<{id:string;x:number;y:number}|null>(null);
  const gesture=useRef<Gesture|null>(null); const pointers=useRef(new Map<number,{x:number;y:number}>());
  const captures=useRef(new Map<number,Element>());const movingRef=useRef<{id:string;x:number;y:number}|null>(null);
  const pinch=useRef<{ids:[number,number];distance:number;zoom:number;worldX:number;worldY:number}|null>(null);
  const measuredSize=useRef<{width:number;height:number}|null>(null);const suppressClickUntil=useRef(0);
  const [space,setSpace]=useState(false); const [dragOver,setDragOver]=useState(false); const [animating,setAnimating]=useState(false);
  const animationTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const views=useRef<Record<string,Viewport>>({}); const initialized=useRef('');
  const baseNodes=useMemo(()=>doc.nodes.filter(n=>n.boardId===boardId),[doc.nodes,boardId]);
  const nodes=useMemo(()=>baseNodes.map(n=>moving?.id===n.id?{...n,x:moving.x,y:moving.y}:n),[baseNodes,moving]);
  const nodeMap=useMemo(()=>new Map(nodes.map(n=>[n.id,n])),[nodes]);
  const edges=useMemo(()=>doc.edges.filter(e=>e.boardId===boardId),[doc.edges,boardId]);
  const zoomFloor=useMemo(()=>Math.min(.15,fitViewport(baseNodes,size.width,size.height,fitPadding(size.width,size.height)).zoom*.5),[baseNodes,size]);
  const zoomFloorRef=useRef(zoomFloor);zoomFloorRef.current=zoomFloor;
  const zoomCallback=useRef(props.onZoomChange);zoomCallback.current=props.onZoomChange;
  const setView=useCallback((next:Viewport,animate=false)=>{
    if(!Number.isFinite(next.x)||!Number.isFinite(next.y)||!Number.isFinite(next.zoom)||next.zoom<=0)return;
    viewRef.current=next;setViewState(next);views.current[boardId]=next;zoomCallback.current(next.zoom);
    if(animationTimer.current){clearTimeout(animationTimer.current);animationTimer.current=null;}
    setAnimating(animate);if(animate)animationTimer.current=setTimeout(()=>{setAnimating(false);animationTimer.current=null;},350);
  },[boardId]);
  const point=(clientX:number,clientY:number)=>{const r=surface.current?.getBoundingClientRect();return {x:(clientX-(r?.left??0)-viewRef.current.x)/viewRef.current.zoom,y:(clientY-(r?.top??0)-viewRef.current.y)/viewRef.current.zoom};};
  const zoomAt=useCallback((nextZoom:number,cx:number,cy:number,animate=false)=>{const v=viewRef.current;const z=clamp(nextZoom,zoomFloorRef.current,2.5);setView({x:cx-(cx-v.x)*z/v.zoom,y:cy-(cy-v.y)*z/v.zoom,zoom:z},animate);},[setView]);
  const fit=useCallback(()=>{setView(fitViewport(baseNodes,size.width,size.height,fitPadding(size.width,size.height)),true);},[baseNodes,size,setView]);
  useImperativeHandle(ref,()=>({fit,zoomBy:(factor)=>zoomAt(viewRef.current.zoom*factor,size.width/2,size.height/2,true),focusNode:(id)=>{const n=baseNodes.find(n=>n.id===id);if(n){const z=Math.min(1.15,Math.max(.7,viewRef.current.zoom));setView({x:size.width/2-(n.x+n.width/2)*z,y:size.height/2-(n.y+n.height/2)*z,zoom:z},true);}},getCenter:()=>({x:(size.width/2-viewRef.current.x)/viewRef.current.zoom,y:(size.height/2-viewRef.current.y)/viewRef.current.zoom})}),[fit,zoomAt,size,baseNodes,setView]);
  useEffect(()=>{
    const el=surface.current;if(!el)return;
    const ob=new ResizeObserver(([entry])=>{const next={width:entry.contentRect.width,height:entry.contentRect.height};if(next.width<=0||next.height<=0)return;const previous=measuredSize.current;measuredSize.current=next;if(previous&&(previous.width!==next.width||previous.height!==next.height))setView({...viewRef.current,x:viewRef.current.x+(next.width-previous.width)/2,y:viewRef.current.y+(next.height-previous.height)/2});setSize(next);});ob.observe(el);
    const wheel=(e:WheelEvent)=>{e.preventDefault();const r=el.getBoundingClientRect();const unit=e.deltaMode===1?16:e.deltaMode===2?r.height:1;const dx=e.deltaX*unit,dy=e.deltaY*unit;if(!e.ctrlKey&&!e.metaKey&&(e.shiftKey||Math.abs(dx)>Math.abs(dy)*.6)){setView({...viewRef.current,x:viewRef.current.x-(e.shiftKey&&dx===0?dy:dx),y:viewRef.current.y-(e.shiftKey?0:dy)});}else zoomAt(viewRef.current.zoom*Math.exp(-dy*.0015),e.clientX-r.left,e.clientY-r.top);};
    el.addEventListener('wheel',wheel,{passive:false});return()=>{ob.disconnect();el.removeEventListener('wheel',wheel);};
  },[zoomAt,setView]);
  useEffect(()=>{
    if(initialized.current===boardId||!surface.current)return; initialized.current=boardId;gesture.current=null;pinch.current=null;pointers.current.clear();movingRef.current=null;setMoving(null);for(const [id,element] of captures.current){try{if(element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{}}captures.current.clear();
    const r=surface.current.getBoundingClientRect();let saved=views.current[boardId];
    if(!saved)try{saved=JSON.parse(localStorage.getItem(`nodus:view:${boardId}`)??'null');}catch{}
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&Number.isFinite(saved.zoom)&&saved.zoom>0&&saved.zoom<=2.5)setView(saved);else setView(fitViewport(baseNodes,r.width,r.height,fitPadding(r.width,r.height)));
  },[boardId,baseNodes,setView]);
  useEffect(()=>{const id=setTimeout(()=>{try{localStorage.setItem(`nodus:view:${boardId}`,JSON.stringify(view));}catch{}},300);return()=>clearTimeout(id);},[view,boardId]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if(e.code!=='Space')return;if(e.type==='keyup'){setSpace(false);return;}if((e.target as Element)?.closest('button,a,input,textarea,select,[role="button"],[contenteditable="true"]'))return;e.preventDefault();setSpace(true);};
    const blur=()=>{setSpace(false);gesture.current=null;pinch.current=null;pointers.current.clear();movingRef.current=null;setMoving(null);for(const [id,element] of captures.current){try{if(element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{}}captures.current.clear();};window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>()=>{if(animationTimer.current)clearTimeout(animationTimer.current);for(const [id,element] of captures.current){try{if(element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{}}captures.current.clear();},[]);
  const updateMoving=(next:{id:string;x:number;y:number}|null)=>{movingRef.current=next;setMoving(next);};
  const release=(id:number)=>{const element=captures.current.get(id);captures.current.delete(id);try{if(element?.hasPointerCapture(id))element.releasePointerCapture(id);}catch{}};
  const beginPinch=()=>{const entries=[...pointers.current.entries()];if(entries.length<2)return;const [[firstId,a],[secondId,b]]=entries;const p=point((a.x+b.x)/2,(a.y+b.y)/2);pinch.current={ids:[firstId,secondId],distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:viewRef.current.zoom,worldX:p.x,worldY:p.y};gesture.current=null;};
  const start=(e:React.PointerEvent,id?:string)=>{
    if(e.button!==0&&e.button!==1)return;const target=e.target as Element;const forcePan=tool==='hand'||space||e.button===1;if(target.closest('button,a,input,textarea,select,[contenteditable="true"]')||(!forcePan&&target.closest('[data-edge]')))return;
    e.preventDefault();e.stopPropagation();if(animationTimer.current){clearTimeout(animationTimer.current);animationTimer.current=null;}setAnimating(false);if(id&&!forcePan)(e.currentTarget as HTMLElement).focus({preventScroll:true});
    // Capture on the original node so the browser preserves its click/double-click target.
    try{e.currentTarget.setPointerCapture(e.pointerId);captures.current.set(e.pointerId,e.currentTarget);}catch{}
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size>=2){if(movingRef.current){const pending=movingRef.current;props.onMove(pending.id,pending.x,pending.y);updateMoving(null);}if(!pinch.current)beginPinch();return;}
    const pan=!id||forcePan;const n=id?nodeMap.get(id):null;if(!pan&&!n)return;const p=point(e.clientX,e.clientY);
    gesture.current={mode:pan?'pan':'node',pointerId:e.pointerId,id,startX:e.clientX,startY:e.clientY,worldX:p.x,worldY:p.y,x:pan?viewRef.current.x:n!.x,y:pan?viewRef.current.y:n!.y,moved:false};
  };
  const move=(e:React.PointerEvent)=>{
    if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch.current){const p=pinch.current,a=pointers.current.get(p.ids[0]),b=pointers.current.get(p.ids[1]);if(a&&b&&surface.current){const r=surface.current.getBoundingClientRect();const z=clamp(p.zoom*Math.hypot(a.x-b.x,a.y-b.y)/p.distance,zoomFloorRef.current,2.5);setView({x:(a.x+b.x)/2-r.left-p.worldX*z,y:(a.y+b.y)/2-r.top-p.worldY*z,zoom:z});}return;}
    const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY;if(Math.hypot(dx,dy)>4)g.moved=true;
    if(g.mode==='pan')setView({...viewRef.current,x:g.x+dx,y:g.y+dy});else if(g.id&&g.moved){const p=point(e.clientX,e.clientY);updateMoving({id:g.id,x:g.x+p.x-g.worldX,y:g.y+p.y-g.worldY});}
  };
  const end=(e:React.PointerEvent)=>{
    if(!pointers.current.has(e.pointerId))return;pointers.current.delete(e.pointerId);release(e.pointerId);
    if(pinch.current){suppressClickUntil.current=Date.now()+350;if(!pinch.current.ids.includes(e.pointerId))return;pinch.current=null;gesture.current=null;if(pointers.current.size>=2)beginPinch();else if(pointers.current.size===1){const [[pointerId,p]]=pointers.current.entries();const world=point(p.x,p.y);gesture.current={mode:'pan',pointerId,startX:p.x,startY:p.y,worldX:world.x,worldY:world.y,x:viewRef.current.x,y:viewRef.current.y,moved:true};}return;}
    const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;gesture.current=null;
    if(g.moved)suppressClickUntil.current=Date.now()+250;
    if(g.mode==='node'&&g.id){if(g.moved){const p=point(e.clientX,e.clientY);props.onMove(g.id,g.x+p.x-g.worldX,g.y+p.y-g.worldY);}else if(connectFrom&&connectFrom!==g.id)props.onConnect(connectFrom,g.id);else props.onSelect(g.id);}else if(!g.moved)props.onSelect(null);updateMoving(null);
  };
  const cancel=()=>{pointers.current.clear();pinch.current=null;gesture.current=null;updateMoving(null);for(const id of captures.current.keys())release(id);};
  const capturedNodes=new Set([...captures.current.values()].map(element=>element.getAttribute('data-node')).filter(Boolean));
  const visibleNodes=nodes.filter(n=>{if(capturedNodes.has(n.id))return true;const x=n.x*view.zoom+view.x,y=n.y*view.zoom+view.y;return x+n.width*view.zoom>-150&&x<size.width+150&&y+n.height*view.zoom>-150&&y<size.height+150;});
  const visibleSet=new Set(visibleNodes.map(n=>n.id)); const detail=view.zoom>.52; const miniature=view.zoom<.28;
  const connectionCounts=useMemo(()=>{const counts=new Map<string,number>();for(const edge of edges){counts.set(edge.sourceId,(counts.get(edge.sourceId)??0)+1);counts.set(edge.targetId,(counts.get(edge.targetId)??0)+1);}return counts;},[edges]);
  const childCount=useMemo(()=>{const counts=new Map<string,number>();for(const n of doc.nodes)counts.set(n.boardId,(counts.get(n.boardId)??0)+1);return counts;},[doc.nodes]);
  const projectMiniatures=useMemo(()=>{
    const previews=new Map<string,ProjectMiniature>();
    const included=new Map<string,Set<string>>();
    for(const node of baseNodes)if(node.childBoardId){previews.set(node.childBoardId,{nodes:[],edges:[]});included.set(node.childBoardId,new Set());}
    for(const node of doc.nodes){const preview=previews.get(node.boardId);if(preview&&preview.nodes.length<80){preview.nodes.push(node);included.get(node.boardId)!.add(node.id);}}
    for(const edge of doc.edges){const preview=previews.get(edge.boardId),ids=included.get(edge.boardId);if(preview&&ids?.has(edge.sourceId)&&ids.has(edge.targetId))preview.edges.push(edge);}
    return previews;
  },[baseNodes,doc.nodes,doc.edges]);
  return <div className={`canvas ${tool==='hand'||space?'hand-mode':''} ${connectFrom?'connect-mode':''} ${dragOver?'is-dragover':''}`} ref={surface} onPointerDown={e=>start(e)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={e=>{if(pointers.current.has(e.pointerId))cancel();}} onDoubleClick={e=>{if(Date.now()<suppressClickUntil.current||(e.target as Element).closest('[data-node],button,[data-edge]'))return;const p=point(e.clientX,e.clientY);props.onCreate(p.x,p.y);}} onDragOver={e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();setDragOver(true);}}} onDragLeave={e=>{if(!(e.relatedTarget instanceof Node)||!e.currentTarget.contains(e.relatedTarget))setDragOver(false);}} onDrop={e=>{e.preventDefault();setDragOver(false);const files=Array.from(e.dataTransfer.files);if(files.length)props.onDropFiles(files,point(e.clientX,e.clientY));}} style={{backgroundSize:`${28*view.zoom}px ${28*view.zoom}px`,backgroundPosition:`${view.x}px ${view.y}px`}} role="region" aria-label={L('بوم ایده‌ها؛ گره‌ها را جابه‌جا کنید و با ابزارها زوم کنید','Idea canvas; move nodes and use the zoom controls')}>
    <div className="canvas-atmosphere" aria-hidden="true"/>
    <div className={`canvas-world ${animating?'is-animating':''}`} style={{transform:`translate3d(${view.x}px,${view.y}px,0) scale(${view.zoom})`}}>
      <svg className="connections" aria-label={L('ارتباط‌ها','Connections')}>{edges.map(edge=>{const a=nodeMap.get(edge.sourceId),b=nodeMap.get(edge.targetId);if(!a||!b)return null;const geometry=connectionGeometry(a,b);if(!visibleSet.has(a.id)&&!visibleSet.has(b.id)){const bounds=geometry.bounds;if(bounds.maxX*view.zoom+view.x< -100||bounds.minX*view.zoom+view.x>size.width+100||bounds.maxY*view.zoom+view.y< -100||bounds.minY*view.zoom+view.y>size.height+100)return null;}return <Connection key={edge.id} a={a} b={b} geometry={geometry} edge={edge} selected={props.selectedEdgeId===edge.id} onSelect={()=>{if(Date.now()>=suppressClickUntil.current)props.onSelectEdge(edge.id);}} label={L('ویرایش ارتباط','Edit connection')}/>;})}</svg>
      {visibleNodes.map(node=>{const Icon=kindIcons[node.kind];const selected=selectedId===node.id;const isProject=!!node.childBoardId;
        return <article data-node={node.id} key={node.id} className={`thought-node tone-${node.color} kind-${node.kind} ${selected?'selected':''} ${connectFrom===node.id?'connecting':''} ${detail?'detailed':'compact'} ${miniature?'miniature':''} ${isProject?'contains-project':''}`} style={{left:node.x,top:node.y,width:node.width,height:node.height,'--node-accent':colors[node.color]} as React.CSSProperties} tabIndex={0} role="button" aria-label={`${node.title||L('بدون عنوان','Untitled')} · ${kindName(node.kind,language)}`} aria-pressed={selected} onPointerDown={e=>start(e,node.id)} onDoubleClick={e=>{e.stopPropagation();if(Date.now()<suppressClickUntil.current||(e.target as Element).closest('button,a'))return;if(isProject)props.onOpen(node.id);else props.onSelect(node.id);}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(connectFrom&&connectFrom!==node.id)props.onConnect(connectFrom,node.id);else props.onSelect(node.id);}if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&isProject){e.preventDefault();props.onOpen(node.id);}}}>
          <div className="node-topline"><span className="node-kind"><Icon size={14}/>{kindName(node.kind,language)}</span><span className="node-dot"/></div>
          {detail&&node.asset&&node.kind==='image'&&<div className="node-image"><img src={node.asset.url} alt={node.title} loading="lazy" draggable={false}/></div>}
          {detail&&node.asset&&node.kind==='video'&&<div className="node-image node-video"><video src={node.asset.url} preload="metadata" muted playsInline/><span><Play size={20} fill="currentColor"/></span></div>}
          <h3 dir="auto">{node.title||L('بدون عنوان','Untitled')}</h3>
          {detail&&<>{isProject?<ProjectPreview boardId={node.childBoardId!} miniature={projectMiniatures.get(node.childBoardId!)??EMPTY_MINIATURE} total={childCount.get(node.childBoardId!)??0} language={language}/>:(!node.asset||!['image','video'].includes(node.kind))&&<p className="node-excerpt" dir="auto">{node.text||node.asset?.name||node.url||L('یک فکر تازه، یک امکان تازه.','A new thought. A new possibility.')}</p>}
            {node.kind==='audio'&&<div className="audio-wave" aria-hidden="true">{Array.from({length:30},(_,i)=><i key={i} style={{height:`${8+Math.sin(i*1.7)*8+((i*7)%17)}px`}}/>)}</div>}
            {node.kind==='pdf'&&<div className="pdf-label"><FileText size={16}/><span>PDF DOCUMENT</span></div>}
          </>}
          <div className="node-footer">{isProject?<button className="open-project" onClick={e=>{e.stopPropagation();props.onOpen(node.id);}}>{childCount.get(node.childBoardId!)??0} {L('گره درون پروژه','nodes inside')}<ArrowUpRight size={14}/></button>:<span className="node-connection-count">{connectionCounts.get(node.id)??0} {L('ارتباط','connections')}</span>}
            <button className="node-branch" aria-label={L(`افزودن شاخه به ${node.title}`,`Add branch to ${node.title}`)} onClick={e=>{e.stopPropagation();props.onBranch(node.id);}}><Plus size={15}/></button>
          </div>
          <button className="node-port port-right" aria-label={L(`اتصال از ${node.title}`,`Connect from ${node.title}`)} title={L('اتصال به یک گره دیگر','Connect to another node')} onClick={e=>{e.stopPropagation();props.onStartConnect(node.id);}}/>
          <button className="node-port port-left" aria-label={L(`اتصال به ${node.title}`,`Connect to ${node.title}`)} onClick={e=>{e.stopPropagation();if(connectFrom&&connectFrom!==node.id)props.onConnect(connectFrom,node.id);else props.onStartConnect(node.id);}}/>
        </article>;
      })}
    </div>
    {nodes.length===0&&<div className="canvas-empty"><div className="empty-orbit"><span/><span/><Plus size={26}/></div><h2>{L('این‌جا جای فکر بعدی توست.','Room for your next thought.')}</h2><p>{L('روی بوم دوبار بزن یا اولین فایل را این‌جا رها کن.','Double-click anywhere, or drop your first file here.')}</p><button className="primary-button" onClick={()=>props.onCreate((size.width/2-view.x)/view.zoom,(size.height/2-view.y)/view.zoom)}><Plus size={17}/>{L('اولین ایده','First idea')}</button></div>}
    {dragOver&&<div className="drop-overlay"><div><Plus size={35}/><h2>{L('رها کن تا بخشی از فکرهایت شود','Drop it into your thinking')}</h2><p>{L('تصویر، ویدیو، صدا، PDF یا هر فایل دیگر','Images, videos, audio, PDFs, and other files')}</p></div></div>}
    <div className="canvas-coordinate" aria-hidden="true">{Math.round(-view.x/view.zoom)} , {Math.round(-view.y/view.zoom)}<span>∞</span></div>
  </div>;
});
const ProjectPreview=memo(function ProjectPreview({boardId,miniature,total,language}:{boardId:string;miniature:ProjectMiniature;total:number;language:Language}){
  const drawing=useMemo(()=>{
    if(miniature.nodes.length===0)return null;
    const byId=new Map(miniature.nodes.map(node=>[node.id,node]));
    const paths=miniature.edges.flatMap(edge=>{const source=byId.get(edge.sourceId),target=byId.get(edge.targetId);return source&&target?[{id:edge.id,...connectionGeometry(source,target)}]:[];});
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const node of miniature.nodes){minX=Math.min(minX,node.x);minY=Math.min(minY,node.y);maxX=Math.max(maxX,node.x+node.width);maxY=Math.max(maxY,node.y+node.height);}
    for(const path of paths){minX=Math.min(minX,path.bounds.minX);minY=Math.min(minY,path.bounds.minY);maxX=Math.max(maxX,path.bounds.maxX);maxY=Math.max(maxY,path.bounds.maxY);}
    const scale=Math.min(184/Math.max(1,maxX-minX),48/Math.max(1,maxY-minY));
    return {paths,scale,x:100-(minX+maxX)*scale/2,y:30-(minY+maxY)*scale/2};
  },[miniature]);
  const label=language==='fa'?(total?`نمای پروژه؛ ${Math.min(total,80)} از ${total} گره`:'پروژهٔ خالی؛ آمادهٔ اولین ایده'):(total?`Project preview; ${Math.min(total,80)} of ${total} nodes`:'Empty project, ready for its first idea');
  return <div className="project-preview" aria-hidden="true"><svg viewBox="0 0 200 60" data-preview-board={boardId}><title>{label}</title>{drawing?<g transform={`translate(${drawing.x} ${drawing.y}) scale(${drawing.scale})`}>
    {drawing.paths.map(path=><path key={path.id} data-preview-edge={path.id} d={path.d} vectorEffect="non-scaling-stroke" strokeWidth={.65}/>)}
    {miniature.nodes.map(node=><rect key={node.id} data-preview-node={node.id} x={node.x} y={node.y} width={node.width} height={node.height} rx={Math.min(18,node.width/8,node.height/8)} fill={colors[node.color]} fillOpacity={node.childBoardId?.32:.17} stroke={colors[node.color]} strokeWidth={node.childBoardId?1:.7} vectorEffect="non-scaling-stroke"/>)}
  </g>:<g><rect x="80" y="16" width="40" height="28" rx="7" fill="none" strokeDasharray="3 3" opacity=".55"/><path d="M95 30 H105 M100 25 V35"/></g>}</svg></div>;
});
function connectionGeometry(a:GraphNode,b:GraphNode){
  const dx=b.x+b.width/2-a.x-a.width/2,dy=b.y+b.height/2-a.y-a.height/2;let ax:number,ay:number,bx:number,by:number,cx1:number,cy1:number,cx2:number,cy2:number;
  if(Math.abs(dx)>Math.abs(dy)*.7){ax=a.x+(dx>=0?a.width:0);ay=a.y+a.height/2;bx=b.x+(dx>=0?0:b.width);by=b.y+b.height/2;const c=Math.max(70,Math.abs(bx-ax)*.5)*(dx>=0?1:-1);cx1=ax+c;cy1=ay;cx2=bx-c;cy2=by;}
  else{ax=a.x+a.width/2;ay=a.y+(dy>=0?a.height:0);bx=b.x+b.width/2;by=b.y+(dy>=0?0:b.height);const c=Math.max(60,Math.abs(by-ay)*.5)*(dy>=0?1:-1);cx1=ax;cy1=ay+c;cx2=bx;cy2=by-c;}
  return {ax,ay,bx,by,d:`M ${ax} ${ay} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${by}`,bounds:{minX:Math.min(ax,bx,cx1,cx2),minY:Math.min(ay,by,cy1,cy2),maxX:Math.max(ax,bx,cx1,cx2),maxY:Math.max(ay,by,cy1,cy2)}};
}
function Connection({a,b,geometry,edge,selected,onSelect,label}:{a:GraphNode;b:GraphNode;geometry:ReturnType<typeof connectionGeometry>;edge:GraphEdge;selected:boolean;onSelect:()=>void;label:string}){
  const {ax,ay,bx,by,d}=geometry;
  return <g data-edge={edge.id} className={`connection ${selected?'selected':''}`} onClick={e=>{e.stopPropagation();onSelect();}} role="button" tabIndex={0} aria-label={`${label}: ${a.title} → ${b.title}`} aria-pressed={selected} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect();}}}><path className="connection-hit" d={d} vectorEffect="non-scaling-stroke"/><path className="connection-line" d={d}/><circle cx={ax} cy={ay} r={3}/><circle cx={bx} cy={by} r={3}/>{edge.label&&<g className="connection-caption" transform={`translate(${(ax+bx)/2},${(ay+by)/2})`}><rect x={-Math.min(100,edge.label.length*4+12)} y="-13" width={Math.min(200,edge.label.length*8+24)} height="26" rx="13"/><text textAnchor="middle" dominantBaseline="central">{edge.label.slice(0,26)}</text></g>}</g>;
}
export default Canvas;
