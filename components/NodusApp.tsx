'use client';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Check, CheckSquare2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Cloud, CloudOff, Command, Download, Ellipsis, File as FileIcon, FolderOpen, GitBranch, Hand, Image as ImageIcon, Layers, Link2, LoaderCircle, Magnet, Maximize, Menu, Moon, MousePointer2, Network, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Redo2, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, Undo2, Upload, Users, X, ZoomIn, ZoomOut } from 'lucide-react';
import Canvas, { CanvasHandle, type CanvasContextMenuPayload, kindIcons, kindName } from './Canvas';
import Inspector, { type InspectorHandle } from './Inspector';
import CanvasContextMenu, { type ContextAction } from './CanvasContextMenu';
import EdgeInspector from './EdgeInspector';
import DesignPanel, { layoutName } from './DesignPanel';
import CollaborationPanel from './CollaborationPanel';
import Modal, { type ModalOrigin } from './Modal';
import MagneticPanel from './MagneticPanel';
import CanvasDock from './CanvasDock';
import SelectionToolbar from './SelectionToolbar';
import NodeQuickSettings from './NodeQuickSettings';
import ShortcutGuide from './ShortcutGuide';
import './shortcut-guide.css';
import type { MagneticViewState } from '@/hooks/use-magnetic-canvas';
import { applyMagneticView, type MagneticPlacement } from '@/lib/magnetic-view';
import { updateSelectedNodes, deleteSelectedNodes } from '@/lib/node-selection';
import { inspectPersonalSpace, deletePersonalSpace } from '@/lib/personal-spaces';
import { useWorkspace } from '@/hooks/use-workspace';
import { useCollaborationPresence } from '@/hooks/use-collaboration-presence';
import { useCanvasPreferences } from '@/hooks/use-canvas-preferences';
import { useThoughtFlow } from '@/hooks/use-thought-flow';
import { findDirectionalNode, getThoughtParent } from '@/lib/flow';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '@/lib/thought-search';
import { graphShortcutScope, isEditableTarget, resolveGraphShortcut } from '@/lib/keyboard';
import { patchNode, convertToTask, removeTask, setTaskStatus } from '@/lib/node-features';
import { copyWorkspaceAsRoots } from '@/hooks/workspace-store';
import { addBranches, addEdge, addNode, boardTrail, deleteNode, ensureChildBoard, makeNode, uid } from '@/lib/graph';
import { arrangeWorkspace, layoutGuides, type LayoutOptions } from '@/lib/layouts';
import { snapshotBoard } from '@/lib/board-snapshot';
import { validateWorkspace } from '@/lib/server/validation';
import { MAX_UPLOAD_BYTES } from '@/lib/types';
import type { AssetMeta, GraphEdge, GraphNode, Language, NodeColor, NodeKind, TaskStatus, Workspace } from '@/lib/types';

type Dialog='search'|'branches'|'help'|'new-board'|'rename'|'delete-node'|'delete-selection'|'delete-space'|'export'|'design'|'collaboration'|null;
function BrandMark(){return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M9 26V10L27 26V10" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="10" r="3" fill="currentColor"/><circle cx="27" cy="26" r="3" fill="currentColor"/><circle cx="27" cy="10" r="2.2" fill="currentColor"/></svg>;}
function fileKind(mime:string):NodeKind{return mime.startsWith('image/')&&mime!=='image/svg+xml'?'image':mime.startsWith('video/')?'video':mime.startsWith('audio/')?'audio':mime==='application/pdf'?'pdf':'file';}
function downloadJson(data:unknown,name:string){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob);const a=window.document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}

export default function NodusApp({initialRoomId=null}:{initialRoomId?:string|null}={}){
  const [language,setLanguage]=useState<Language>('fa'); const L=useCallback((fa:string,en:string)=>language==='fa'?fa:en,[language]);
  const [theme,setTheme]=useState<'dark'|'light'>('dark');
  const [roomId,setRoomId]=useState<string|null>(initialRoomId);
  const ws=useWorkspace(language,roomId);const doc=ws.document;
  const [activeBoard,setActiveBoard]=useState('');const [selected,setSelectedPrimary]=useState<string|null>(null);const [selectedEdge,setSelectedEdge]=useState<string|null>(null);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);const [multiSelectMode,setMultiSelectMode]=useState(false);
  const [pendingDeleteSelection,setPendingDeleteSelection]=useState<{boardId:string;ids:string[]}|null>(null);
  const [targetSpaceId,setTargetSpaceId]=useState<string|null>(null);
  // Every existing single-node transition also ends a group selection. Group
  // gestures update the primary focus independently through selectMany below.
  const setSelected=useCallback((id:string|null)=>{setSelectedPrimary(id);setSelectedIds(id?[id]:[]);setMultiSelectMode(false);},[]);
  const [inspectorOpen,setInspectorOpen]=useState(false);const inspector=useRef<InspectorHandle>(null);const detailsFocus=useRef('[data-node-dialog-intro]');const restoreDetailsFocus=useRef(false);const finishFlowRef=useRef<()=>boolean>(()=>true);const navigationFrame=useRef<number|null>(null);
  const [inspectorClosing,setInspectorClosing]=useState(false);const [detailsOrigin,setDetailsOrigin]=useState<ModalOrigin|null>(null);
  const [magnetOpen,setMagnetOpen]=useState(false);const magnetButton=useRef<HTMLButtonElement>(null);
  const [magneticState,setMagneticState]=useState<MagneticViewState>({status:'paused',dirty:false,pinnedCount:0,persistenceError:false});
  const receiveMagneticState=useCallback((next:MagneticViewState)=>setMagneticState(previous=>previous.status===next.status&&previous.dirty===next.dirty&&previous.pinnedCount===next.pinnedCount&&previous.persistenceError===next.persistenceError?previous:next),[]);
  const [contextMenu,setContextMenu]=useState<CanvasContextMenuPayload|null>(null);
  const [annotationDraft,setAnnotationDraft]=useState(false);const [toastUndo,setToastUndo]=useState(false);
  const [sidebar,setSidebar]=useState(true);const [tool,setTool]=useState<'select'|'hand'>('select');const [connectFrom,setConnectFrom]=useState<string|null>(null);
  const [zoom,setZoom]=useState(1);const [dialog,setDialog]=useState<Dialog>(null);const [addMenu,setAddMenu]=useState(false);const [query,setQuery]=useState('');const [searchLimit,setSearchLimit]=useState(SEARCH_PAGE_SIZE);
  const [branchSource,setBranchSource]=useState<string|null>(null);const [branchText,setBranchText]=useState('');const [boardName,setBoardName]=useState('');
  const [toast,setToast]=useState<string|null>(null);const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [uploading,setUploading]=useState<{current:number;total:number;name:string}|null>(null);const [uploadErrors,setUploadErrors]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);const canvas=useRef<CanvasHandle>(null);const filesInput=useRef<HTMLInputElement>(null);const importInput=useRef<HTMLInputElement>(null);const attachTarget=useRef<string|null>(null);
  const boardId=doc?.boards.some(b=>b.id===activeBoard)?activeBoard:doc?.homeBoardId??'';
  const boardMap=useMemo(()=>new Map(doc?.boards.map(b=>[b.id,b])??[]),[doc?.boards]);
  const nodeMap=useMemo(()=>new Map(doc?.nodes.map(n=>[n.id,n])??[]),[doc?.nodes]);
  const board=boardMap.get(boardId);const selectedNode=selected?nodeMap.get(selected):undefined;const node=selectedNode?.boardId===boardId?selectedNode:undefined;
  const edge=doc?.edges.find(e=>e.id===selectedEdge&&e.boardId===boardId);
  const nodes=useMemo(()=>doc?.nodes.filter(n=>n.boardId===boardId)??[],[doc?.nodes,boardId]);
  const edges=useMemo(()=>doc?.edges.filter(e=>e.boardId===boardId)??[],[doc?.edges,boardId]);
  const selectionNodes=useMemo(()=>selectedIds.flatMap(id=>{const item=nodeMap.get(id);return item?.boardId===boardId?[item]:[];}),[selectedIds,nodeMap,boardId]);
  const selectionIds=useMemo(()=>selectionNodes.map(item=>item.id),[selectionNodes]);
  const selectionColor:NodeColor|null=selectionNodes.length&&selectionNodes.every(item=>item.color===selectionNodes[0].color)?selectionNodes[0].color:null;
  const selectionStatus:TaskStatus|'mixed'|null=selectionNodes.length&&selectionNodes.every(item=>(item.task?.status??null)===(selectionNodes[0].task?.status??null))?selectionNodes[0].task?.status??null:'mixed';
  const canvasScope=ws.getUserId()?`${ws.getUserId()}:${roomId??'personal'}:${boardId}`:'';
  const preferences=useCanvasPreferences(canvasScope,language);
  const activeLayout=board?.layout;
  const guides=useMemo(()=>doc&&activeLayout?layoutGuides(doc,boardId,activeLayout,language):[],[doc,boardId,activeLayout,language]);
  const presence=useCollaborationPresence(ws.readOnly||ws.loading?null:roomId,ws.getUserId()||null,boardId||null,selected);
  const shareDocument=useMemo(()=>dialog==='collaboration'&&doc&&boardId?snapshotBoard(doc,boardId):null,[dialog,doc,boardId]);
  const roots=useMemo(()=>doc?.boards.filter(b=>!b.parentNodeId)??[],[doc?.boards]);const trail=useMemo(()=>doc?boardTrail(doc,boardId):[],[doc?.boards,doc?.nodes,boardId]);
  const boardCounts=useMemo(()=>{const counts=new Map<string,number>();for(const n of doc?.nodes??[])counts.set(n.boardId,(counts.get(n.boardId)??0)+1);return counts;},[doc?.nodes]);
  const notice=useCallback((message:string,undo=false)=>{setToast(message);setToastUndo(undo);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),undo?7000:4500);},[]);
  useEffect(()=>{try{const lang=localStorage.getItem('nodus:language');if(lang==='en'||lang==='fa')setLanguage(lang);const t=localStorage.getItem('nodus:theme');if(t==='dark'||t==='light')setTheme(t);if(window.innerWidth<850)setSidebar(false);}catch{}},[]);
  useEffect(()=>{window.document.documentElement.lang=language;try{localStorage.setItem('nodus:language',language);localStorage.setItem('nodus:theme',theme);}catch{}},[language,theme]);
  useEffect(()=>{if(dialog!=='search')setSearchLimit(SEARCH_PAGE_SIZE);},[dialog]);
  useEffect(()=>{if(doc&&!activeBoard){let saved='';try{saved=localStorage.getItem('nodus:board')??'';}catch{}setActiveBoard(doc.boards.some(b=>b.id===saved)?saved:doc.homeBoardId);}},[doc,activeBoard]);
  useEffect(()=>{if(boardId)try{localStorage.setItem('nodus:board',boardId);}catch{}},[boardId]);
  const selectNode=useCallback((id:string|null)=>{setSelected(id);setSelectedEdge(null);setContextMenu(null);if(id===null)setInspectorOpen(false);},[setSelected]);
  const selectMany=useCallback((ids:string[],primaryId?:string)=>{
    if(!finishFlowRef.current())return;
    const next=[...new Set(ids)].filter(id=>nodeMap.get(id)?.boardId===boardId), included=new Set(next);
    setSelectedIds(previous=>previous.length===next.length&&previous.every((id,index)=>id===next[index])?previous:next);
    setSelectedPrimary(previous=>primaryId&&included.has(primaryId)?primaryId:previous&&included.has(previous)?previous:next[next.length-1]??null);
    setSelectedEdge(null);setContextMenu(null);setInspectorOpen(false);setAddMenu(false);setConnectFrom(null);setTool('select');
  },[nodeMap,boardId]);
  const changeMultiSelectMode=useCallback((active:boolean)=>{
    if(!finishFlowRef.current())return;
    if(!active)setSelected(selected);
    setMultiSelectMode(active);setTool('select');setAddMenu(false);setContextMenu(null);setSelectedEdge(null);setConnectFrom(null);
    requestAnimationFrame(()=>canvas.current?.focusSurface());
  },[selected,setSelected]);
  const showDetails=useCallback((id:string,focusEditor=false)=>{if(!finishFlowRef.current()||(inspector.current&&!inspector.current.flushPending()))return;if(!ws.exportDraft()?.nodes.some(item=>item.id===id))return;detailsFocus.current=focusEditor?'#node-text':'[data-node-dialog-intro]';restoreDetailsFocus.current=false;setDetailsOrigin(canvas.current?.getNodeRect(id)??null);setInspectorClosing(false);setSelected(id);setSelectedEdge(null);setContextMenu(null);setDialog(null);setInspectorOpen(true);setAddMenu(false);},[ws.exportDraft,setSelected]);
  const closeDetails=useCallback(()=>{if(inspectorClosing||(inspector.current&&!inspector.current.flushPending()))return;setInspectorClosing(true);},[inspectorClosing]);
  const finishCloseDetails=useCallback(()=>{restoreDetailsFocus.current=true;setInspectorOpen(false);setInspectorClosing(false);void ws.flush();},[ws.flush]);
  const leaveDetails=useCallback((action:()=>void)=>{if(inspector.current&&!inspector.current.flushPending())return;restoreDetailsFocus.current=false;setInspectorClosing(false);setInspectorOpen(false);action();},[]);
  const startFlow=useCallback(()=>{ws.setRemotePaused(true);if(navigationFrame.current!==null){cancelAnimationFrame(navigationFrame.current);navigationFrame.current=null;}setContextMenu(null);setInspectorOpen(false);setSelectedEdge(null);setConnectFrom(null);setAddMenu(false);setTool('select');},[ws.setRemotePaused]);
  const flow=useThoughtFlow({document:doc,boardId,language,canvas,getDocument:ws.exportDraft,getUserId:ws.getUserId,update:ws.update,select:selectNode,onStart:startFlow,onDetails:showDetails,notice});
  const closeMagnet=useCallback(()=>{setMagnetOpen(false);requestAnimationFrame(()=>magnetButton.current?.focus({preventScroll:true}));},[]);
  const toggleMagnet=()=>{if(!flow.finish())return;setMagnetOpen(!magnetOpen);setAddMenu(false);};
  const restoreMagnet=()=>{preferences.setMagnetic({...preferences.magnetic,enabled:false});canvas.current?.resetMagnetic();};
  const applyMagnet=()=>{
    if(ws.readOnly||flow.editing)return;
    const placements=canvas.current?.getMagneticPlacements()??[];if(!placements.length)return;
    let accepted=false,conflict=false;
    try{ws.update(current=>{const result=applyMagneticView(current,boardId,placements);conflict=result.conflict;accepted=!conflict;return result.document;});
      if(conflict){notice(L('جای بعضی نودها تغییر کرده است؛ به چیدمان ذخیره‌شده برگرد و دوباره تنظیم کن.','Some node positions changed. Restore the saved layout and rebalance.'));return;}
      if(!accepted)return;preferences.setMagnetic({...preferences.magnetic,enabled:false});canvas.current?.resetMagnetic(true);notice(L('چیدمان مگنتی ثبت شد.','The magnetic layout is saved.'),true);
    }catch(error){notice(error instanceof Error?error.message:String(error));}
  };
  useEffect(()=>{setMagnetOpen(false);setInspectorClosing(false);setMultiSelectMode(false);setPendingDeleteSelection(null);},[boardId,roomId]);
  useEffect(()=>{ws.setRemotePaused(flow.editing||annotationDraft);},[flow.editing,annotationDraft,ws.setRemotePaused]);
  useEffect(()=>()=>ws.setRemotePaused(false),[ws.setRemotePaused]);
  const changeAnnotationDraft=useCallback((dirty:boolean)=>{if(dirty)ws.setRemotePaused(true);setAnnotationDraft(dirty);},[ws.setRemotePaused]);
  const switchRoom=useCallback(async(id:string|null)=>{
    if(id===roomId){setDialog(null);return;}
    if(!flow.finish())return;
    await ws.flush();
    if(ws.hasPendingChanges()&&(!ws.readOnly||!!ws.draftWarning)){notice(L('پیش از تغییر فضا، ذخیره یا بازیابی تغییرات فعلی را کامل کن.','Finish saving or recovering your changes before switching spaces.'));return;}
    flow.clear();setDialog(null);setContextMenu(null);setSelected(null);setSelectedEdge(null);setInspectorOpen(false);setActiveBoard('');setConnectFrom(null);setAddMenu(false);
    const next=new URL(window.location.href);if(id)next.searchParams.set('room',id);else next.searchParams.delete('room');window.history.replaceState(null,'',next);setRoomId(id);
  },[roomId,flow.finish,flow.clear,ws.flush,ws.hasPendingChanges,ws.readOnly,ws.draftWarning,notice,L,setSelected]);
  const savedError=doc&&ws.saveState==='saved'?ws.error:null;
  useEffect(()=>{if(savedError)notice(savedError);},[savedError,notice]);
  const applyLayout=useCallback((options:LayoutOptions)=>{
    if(!flow.finish())return;
    try{let applied=false;ws.update(current=>{const next=arrangeWorkspace(current,boardId,options);applied=true;return next;});if(!applied){notice(L('فضا هنوز برای تغییر آماده نیست.','This workspace is not ready for changes yet.'));return;}preferences.setMagnetic({...preferences.magnetic,enabled:false});canvas.current?.resetMagnetic();preferences.setLayout(options);setDialog(null);setSelectedEdge(null);setTimeout(()=>canvas.current?.fit(),40);notice(L('چیدمان تازه اعمال شد.','The new layout is ready.'),true);}catch(error){notice(error instanceof Error?error.message:String(error));}
  },[boardId,flow.finish,ws.update,preferences.setLayout,preferences.setMagnetic,preferences.magnetic,notice,L]);
  finishFlowRef.current=flow.finish;
  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{
      if(!finishFlowRef.current()||(inspector.current&&!inspector.current.flushPending())){event.preventDefault();event.returnValue='';}
    };
    window.addEventListener('beforeunload',beforeUnload,true);
    return()=>window.removeEventListener('beforeunload',beforeUnload,true);
  },[]);
  const navigate=useCallback((id:string)=>{if(!flow.finish())return;void ws.flush();flow.clear();setContextMenu(null);setActiveBoard(id);setSelected(null);setSelectedEdge(null);setConnectFrom(null);setAddMenu(false);setInspectorOpen(false);if(window.innerWidth<850)setSidebar(false);if(navigationFrame.current!==null)cancelAnimationFrame(navigationFrame.current);navigationFrame.current=requestAnimationFrame(()=>{navigationFrame.current=null;canvas.current?.focusSurface();});},[ws.flush,flow.finish,flow.clear,setSelected]);
  useEffect(()=>()=>{if(navigationFrame.current!==null)cancelAnimationFrame(navigationFrame.current);if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
  useEffect(()=>{
    if(flow.editing)return;
    if(selectedIds.length!==selectionIds.length)setSelectedIds(selectionIds);
    if(selected&&!node){setSelectedPrimary(selectionIds[0]??null);setInspectorOpen(false);}
  },[selected,node,flow.editing,selectedIds.length,selectionIds]);
  const changeNode=useCallback((id:string,patch:Partial<GraphNode>)=>{let applied=false;try{ws.update(current=>{if(!current.nodes.some(n=>n.id===id))return current;const next=patchNode(current,id,patch);applied=true;return next;});if(!applied)notice(L('فضا هنوز آمادهٔ ثبت تغییر نیست؛ نوشته‌ات را نگه دار و دوباره تلاش کن.','The workspace is not ready to accept this change. Keep your draft and try again.'));return applied;}catch(error){notice(error instanceof Error?error.message:String(error));return false;}},[ws.update,notice,L]);
  const updateNode=(patch:Partial<GraphNode>)=>node?changeNode(node.id,patch):false;
  const taskStatus=useCallback((id:string,status:TaskStatus)=>{try{ws.update(current=>setTaskStatus(current,id,status));}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.update,notice]);
  const toggleTask=useCallback((id:string)=>{const target=ws.exportDraft()?.nodes.find(n=>n.id===id);if(target?.task)taskStatus(id,target.task.status==='done'?'todo':'done');},[ws.exportDraft,taskStatus]);
  const cycleTask=useCallback((id:string)=>{const target=ws.exportDraft()?.nodes.find(n=>n.id===id);if(target?.task)taskStatus(id,target.task.status==='todo'?'doing':target.task.status==='doing'?'done':'todo');},[ws.exportDraft,taskStatus]);
  const makeTask=useCallback((id:string)=>{try{ws.update(current=>convertToTask(current,id));}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.update,notice]);
  const unmakeTask=useCallback((id:string)=>{try{ws.update(current=>removeTask(current,id));}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.update,notice]);
  const quickStatus=useCallback((id:string,status:TaskStatus|null)=>{if(ws.readOnly)return;try{ws.update(current=>status===null?removeTask(current,id):setTaskStatus(convertToTask(current,id),id,status));}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.readOnly,ws.update,notice]);
  const updateSelection=useCallback((patch:{color?:NodeColor;status?:TaskStatus|null})=>{
    if(ws.readOnly||!selectionIds.length)return;
    try{ws.update(current=>updateSelectedNodes(current,boardId,selectionIds,patch));}
    catch(error){notice(error instanceof Error?error.message:String(error));}
  },[ws,boardId,selectionIds,notice]);
  const add=(kind:NodeKind='note',position?:{x:number;y:number},content?:{title?:string;text?:string;url?:string})=>{
    if(!doc||!boardId)return;if(kind==='note'&&!content){flow.begin(null,'sibling',position);return;}if(doc.nodes.length>=5000){notice(L('این فضا به سقف ۵۰۰۰ گره رسیده است.','This workspace has reached the 5,000-node limit.'));return;}
    const p=position??canvas.current?.getCenter()??{x:0,y:0};
    const n=makeNode(boardId,kind,p.x-122,p.y-86,{title:content?.title??(kind==='project'?L('پروژهٔ تازه','New project'):kind==='link'?L('یک لینک تازه','A new link'):L('یک فکر تازه','A new thought')),text:content?.text??'',url:content?.url??'',color:kind==='project'?'violet':kind==='link'?'blue':'sage',height:kind==='project'?198:172});
    ws.update(current=>{let next=addNode(current,n);if(kind==='project')next=ensureChildBoard(next,n.id).document;return next;});setSelected(n.id);setSelectedEdge(null);setAddMenu(false);setInspectorOpen(kind!=='note');setInspectorClosing(false);setDetailsOrigin(null);detailsFocus.current='#node-title';restoreDetailsFocus.current=false;requestAnimationFrame(()=>canvas.current?.revealNode(n.id,false));
  };
  const openNode=useCallback((id:string)=>{const current=ws.exportDraft();if(!current)return;try{const result=ensureChildBoard(current,id);if(result.document!==current)ws.update(()=>result.document);navigate(result.boardId);}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.exportDraft,ws.update,navigate,notice]);
  const connect=useCallback((source:string,target:string)=>{const current=ws.exportDraft();if(!current)return;const next=addEdge(current,source,target);if(next===current)notice(L('این ارتباط از قبل وجود دارد یا معتبر نیست.','This connection already exists or is not valid.'));else{ws.update(()=>next);notice(L('ارتباط ساخته شد.','Connection created.'));}setConnectFrom(null);},[ws.exportDraft,ws.update,notice,L]);
  const beginConnect=useCallback((id:string)=>{setConnectFrom(id);setSelected(null);setSelectedEdge(null);setInspectorOpen(false);setTool('select');},[setSelected]);
  const branch=(id:string)=>{setBranchSource(id);setBranchText('');setDialog('branches');setAddMenu(false);};
  const grow=()=>{if(!doc||!branchSource)return;const titles=branchText.split('\n').map(s=>s.trim()).filter(Boolean);if(!titles.length)return;if(titles.some(t=>t.length>300)||doc.nodes.length+titles.length>5000){notice(L('هر عنوان تا ۳۰۰ نویسه و کل فضا تا ۵۰۰۰ گره پشتیبانی می‌شود.','Use titles up to 300 characters, within the 5,000-node workspace limit.'));return;}ws.update(current=>addBranches(current,branchSource,titles));setDialog(null);notice(L(`${titles.length} شاخه ساخته شد.`,`${titles.length} branches created.`));setTimeout(()=>canvas.current?.fit(),60);};
  const extractBranches=()=>{const n=doc?.nodes.find(n=>n.id===branchSource);if(!n)return;const lines=n.text.split(/\r?\n|[؛;]|(?<=[.!?؟])\s+/).map(s=>s.replace(/^\s*(?:[-*•#]+|\d+[.)]|[۰-۹]+[.)])\s*/,'').trim()).filter(s=>s.length>2).map(s=>s.slice(0,300));setBranchText(lines.join('\n'));if(!lines.length)notice(L('اول در یادداشت گره چند ایده یا سطر بنویس.','Write a few ideas or lines in the node first.'));};
  const makeBoard=()=>{if(!doc||!boardName.trim())return;const id=uid();ws.update(current=>({...current,boards:[...current.boards,{id,title:boardName.trim(),description:'',parentNodeId:null,createdAt:new Date().toISOString()}]}));navigate(id);setDialog(null);};
  const rename=()=>{const name=boardName.trim();if(!name||!board)return;ws.update(current=>{const next={...current,boards:current.boards.map(b=>b.id===boardId?{...b,title:name}:b)};return board.parentNodeId?patchNode(next,board.parentNodeId,{title:name}):next;});setDialog(null);};
  const duplicateNode=(id:string)=>{const source=ws.exportDraft()?.nodes.find(n=>n.id===id);if(!source)return;const copy={...source,id:uid(),x:Math.min(1e7,source.x+45),y:Math.min(1e7,source.y+45),childBoardId:null,task:source.task?{...source.task,parentId:null}:undefined,annotations:source.annotations?.map(a=>({...a,id:uid()})),createdAt:new Date().toISOString()};let applied=false;try{ws.update(current=>{if(current.nodes.length>=5000)throw new Error(L('این فضا به سقف ۵۰۰۰ گره رسیده است.','This workspace has reached the 5,000-node limit.'));const next=patchNode(addNode(current,copy),copy.id,{title:source.title.slice(0,490)+L(' · کپی',' · Copy')});applied=true;return next;});if(!applied)return;selectNode(copy.id);requestAnimationFrame(()=>canvas.current?.revealNode(copy.id));notice(source.childBoardId?L('محتوا کپی شد؛ بوم داخلی متعلق به گره اصلی است.','Content copied. The nested canvas stays with the original.'):L('گره کپی شد.','Node duplicated.'));}catch(error){notice(error instanceof Error?error.message:String(error));}};
  const duplicate=()=>{if(node)duplicateNode(node.id);};
  const deleteNodeNow=useCallback((id:string)=>{let applied=false;ws.update(current=>{const next=deleteNode(current,id);applied=next!==current;return next;});if(!applied)return;flow.clear();setSelected(null);setInspectorOpen(false);setContextMenu(null);setDialog(null);requestAnimationFrame(()=>canvas.current?.focusSurface());notice(L('گره حذف شد.','Thought deleted.'),true);},[ws.update,flow.clear,notice,L,setSelected]);
  const requestDeleteNode=useCallback((id:string)=>{if(!flow.finish())return;const current=ws.exportDraft();const target=current?.nodes.find(n=>n.id===id);if(!current||!target)return;setSelected(id);setSelectedEdge(null);setContextMenu(null);if(target.childBoardId&&current.nodes.length-deleteNode(current,id).nodes.length>1)setDialog('delete-node');else deleteNodeNow(id);},[flow.finish,ws.exportDraft,deleteNodeNow,setSelected]);
  const deleteSelectionNow=useCallback((ids:readonly string[],targetBoard=boardId)=>{
    if(ws.readOnly||targetBoard!==boardId)return;
    let removed=0;
    try{ws.update(current=>{const next=deleteSelectedNodes(current,targetBoard,ids);removed=current.nodes.length-next.nodes.length;return next;});}
    catch(error){notice(error instanceof Error?error.message:String(error));return;}
    setPendingDeleteSelection(null);setDialog(null);
    if(!removed)return;
    flow.clear();setSelected(null);setSelectedEdge(null);setInspectorOpen(false);setContextMenu(null);
    requestAnimationFrame(()=>canvas.current?.focusSurface());notice(L(`${removed} گره حذف شد.`,`${removed} nodes deleted.`),true);
  },[ws,boardId,flow,notice,L,setSelected]);
  const requestDeleteSelection=useCallback(()=>{
    if(ws.readOnly||!flow.finish())return;
    const current=ws.exportDraft();if(!current)return;
    const existing=new Set(current.nodes.filter(item=>item.boardId===boardId).map(item=>item.id));
    const ids=selectionIds.filter(id=>existing.has(id));if(!ids.length)return;
    const removed=current.nodes.length-deleteSelectedNodes(current,boardId,ids).nodes.length;
    setContextMenu(null);setAddMenu(false);
    if(removed>ids.length){setPendingDeleteSelection({boardId,ids});setDialog('delete-selection');}
    else deleteSelectionNow(ids);
  },[ws,flow,boardId,selectionIds,deleteSelectionNow]);
  const requestDeleteSpace=useCallback((id:string)=>{
    if(roomId!==null||ws.readOnly||!flow.finish()||(inspector.current&&!inspector.current.flushPending()))return;
    const current=ws.exportDraft();if(!current||!inspectPersonalSpace(current,id))return;
    setTargetSpaceId(id);setContextMenu(null);setAddMenu(false);setInspectorOpen(false);setDialog('delete-space');
  },[roomId,ws,flow]);
  const removeSpace=useCallback(()=>{
    if(roomId!==null||ws.readOnly||!targetSpaceId)return;
    let changed=false,nextBoard:string|null=null;
    try{ws.update(current=>{
      const contents=inspectPersonalSpace(current,targetSpaceId);if(!contents)return current;
      const next=deletePersonalSpace(current,targetSpaceId,language);changed=next!==current;
      if(contents.boardIds.includes(boardId))nextBoard=next.homeBoardId;
      return next;
    });}catch(error){notice(error instanceof Error?error.message:String(error));return;}
    setDialog(null);setTargetSpaceId(null);
    if(!changed)return;
    if(nextBoard)navigate(nextBoard);else requestAnimationFrame(()=>canvas.current?.focusSurface());
    notice(L('فضا و محتوای آن حذف شد.','The space and its contents were deleted.'),true);
  },[roomId,ws,targetSpaceId,language,boardId,navigate,notice,L]);
  const remove=()=>{if(node)deleteNodeNow(node.id);};
  const deleteEdge=useCallback((id:string)=>{let applied=false;ws.update(current=>{if(!current.edges.some(e=>e.id===id))return current;applied=true;return {...current,edges:current.edges.filter(e=>e.id!==id)};});if(!applied)return;setSelectedEdge(null);setContextMenu(null);canvas.current?.focusSurface();notice(L('ارتباط حذف شد.','Connection deleted.'),true);},[ws.update,notice,L]);
  const changeEdge=useCallback((id:string,patch:Partial<GraphEdge>)=>{try{if(patch.bend){if(!Number.isFinite(patch.bend.x)||!Number.isFinite(patch.bend.y))throw new Error(L('مختصات مسیر معتبر نیست.','The connection coordinates are invalid.'));patch={...patch,bend:{x:Math.max(-1e7,Math.min(1e7,patch.bend.x)),y:Math.max(-1e7,Math.min(1e7,patch.bend.y))}};}ws.update(current=>{const original=current.edges.find(e=>e.id===id);if(!original)return current;const next={...original,...patch};const source=current.nodes.find(n=>n.id===next.sourceId),target=current.nodes.find(n=>n.id===next.targetId);if(!source||!target||source.id===target.id||source.boardId!==original.boardId||target.boardId!==original.boardId||current.edges.some(e=>e.id!==id&&e.sourceId===next.sourceId&&e.targetId===next.targetId))throw new Error(L('مبدأ و مقصد باید متفاوت و در همین بوم باشند؛ این ارتباط نباید تکراری باشد.','Use two different thoughts on this canvas without duplicating an existing connection.'));return {...current,edges:current.edges.map(e=>e.id===id?next:e)};});}catch(error){notice(error instanceof Error?error.message:String(error));}},[ws.update,notice,L]);
  const bendEdge=useCallback((id:string,point:{x:number;y:number}|null)=>changeEdge(id,{bend:point??undefined}),[changeEdge]);
  const pickFiles=(target:string|null=null)=>{attachTarget.current=target;setAddMenu(false);if(filesInput.current){filesInput.current.multiple=!target;filesInput.current.click();}};
  const uploadFiles=async(files:File[],position?:{x:number;y:number},target:string|null=null)=>{
    if(!doc||!files.length||uploading)return;const uploadOwner=ws.getUserId();const destination=boardId;const p=position??canvas.current?.getCenter()??{x:0,y:0};const failures:string[]=[];setUploadErrors([]);
    for(let i=0;i<files.length;i++){
      const file=files[i];if((ws.exportDraft()?.nodes.length??0)>=5000&&!target){failures.push(`${file.name}: ${L('فضا به سقف تعداد گره‌ها رسیده است.','Workspace node limit reached.')}`);continue;}if(file.size>MAX_UPLOAD_BYTES||file.size===0){failures.push(`${file.name}: ${L('فایل باید خالی نباشد و حداکثر ۲۵ مگابایت باشد.','File must be nonempty and at most 25 MiB.')}`);continue;}
      setUploading({current:i+1,total:files.length,name:file.name});
      try{const form=new FormData();form.append('file',file);const response=await fetch('/api/assets',{method:'POST',headers:{'X-Nodus-User-Id':uploadOwner},body:form});const data=await response.json() as AssetMeta & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??'Upload failed');if(ws.getUserId()!==uploadOwner)throw new Error(L('حساب در زمان بارگذاری تغییر کرد. فایل به فضای فعلی اضافه نشد.','The account changed during upload. The file was not added to the current workspace.'));const asset=data as AssetMeta;const kind=fileKind(asset.mime);const height=['image','video'].includes(kind)?284:['pdf','audio'].includes(kind)?220:172;
        ws.update(current=>{if(target&&i===0&&current.nodes.some(n=>n.id===target))return {...current,nodes:current.nodes.map(n=>n.id===target?{...n,kind,asset,height,title:n.title||file.name}:n)};const actualBoard=current.boards.some(b=>b.id===destination)?destination:current.homeBoardId;const n=makeNode(actualBoard,kind,p.x-122+(i%3)*292,p.y-100+Math.floor(i/3)*332,{title:file.name,asset,height,color:kind==='image'?'rose':kind==='video'?'blue':kind==='pdf'?'amber':'gray'});return addNode(current,n);});
      }catch(error){failures.push(`${file.name}: ${error instanceof Error?error.message:String(error)}`);}
    }
    setUploading(null);setUploadErrors(failures);if(failures.length<files.length)notice(L('فایل‌ها اضافه شدند.','Files added.'));if(!target)setTimeout(()=>canvas.current?.fit(),60);
  };
  const exportStructure=()=>{const data=ws.exportDraft()??doc;if(data)downloadJson({format:'nodus-graph',exportedAt:new Date().toISOString(),note:'Graph structure and file references only; original media is stored separately.',document:data},`nodus-${new Date().toISOString().slice(0,10)}.json`);};
  const importStructure=async(file:File)=>{if(!doc)return;setBusy(true);try{if(file.size>5*1024*1024)throw new Error(L('فایل ساختار باید کمتر از ۵ مگابایت باشد.','Graph file must be smaller than 5 MiB.'));const raw=JSON.parse(await file.text());const imported=validateWorkspace(raw.document??raw);const ids=[...new Set(imported.nodes.flatMap(n=>n.asset?[n.asset.id]:[]))];for(const id of ids){const r=await fetch(`/api/assets/${id}`,{method:'HEAD'});if(!r.ok)throw new Error(L('فایل‌های پیوست این خروجی در حساب فعلی در دسترس نیستند. ساختار فعلی تغییر نکرد.','The attachments in this export are not available in this account. Your current workspace was not changed.'));}ws.update(current=>{const merged=copyWorkspaceAsRoots(current,imported,language);validateWorkspace(merged);return merged;});setDialog(null);notice(L('ساختار در پروژه‌های جدا وارد شد.','Imported as separate projects.'));}catch(error){notice(error instanceof Error?error.message:String(error));}finally{setBusy(false);}};
  const quickChild=useCallback((id:string)=>flow.begin(id,'child'),[flow.begin]);
  const createAt=useCallback((x:number,y:number)=>flow.begin(null,'sibling',{x,y}),[flow.begin]);
  const selectEdge=useCallback((id:string)=>{setSelected(null);setSelectedEdge(id);setContextMenu(null);setInspectorOpen(false);},[setSelected]);
  const openContext=useCallback((payload:CanvasContextMenuPayload)=>{if(!flow.finish())return;flow.clear();if(payload.kind==='node'&&payload.id){if(selectionIds.length>1&&selectionIds.includes(payload.id)){setSelectedPrimary(payload.id);setSelectedEdge(null);}else selectNode(payload.id);}else if(payload.kind==='edge'&&payload.id)selectEdge(payload.id);else selectNode(null);setAddMenu(false);setContextMenu(payload);},[flow.finish,flow.clear,selectNode,selectEdge,selectionIds]);
  const dismissContext=(restore=false)=>{const previous=contextMenu;setContextMenu(null);if(restore){if(previous?.kind==='node'&&previous.id)canvas.current?.revealNode(previous.id);else canvas.current?.focusSurface();}};
  const moveNode=useCallback((id:string,x:number,y:number)=>ws.update(current=>{const n=current.nodes.find(n=>n.id===id);return !n||(n.x===x&&n.y===y)?current:{...current,nodes:current.nodes.map(n=>n.id===id?{...n,x,y}:n)};}),[ws.update]);
  const moveMany=useCallback((placements:MagneticPlacement[])=>{
    if(ws.readOnly||!placements.length)return;
    let accepted=false,conflict=false;
    try{ws.update(current=>{const result=applyMagneticView(current,boardId,placements);accepted=true;conflict=result.conflict;return result.document;});
      if(conflict)notice(L('جای بعضی از گره‌های انتخاب‌شده تغییر کرده است؛ انتخاب را دوباره جابه‌جا کن.','Some selected nodes moved while you were dragging. Move the selection again.'));
      else if(!accepted)notice(L('فضا هنوز برای جابه‌جایی آماده نیست.','This workspace is not ready to move the selection yet.'));
    }catch(error){notice(error instanceof Error?error.message:String(error));}
  },[ws,boardId,notice,L]);
  const uploadRef=useRef(uploadFiles);uploadRef.current=uploadFiles;
  const dropFiles=useCallback((files:File[],point:{x:number;y:number})=>{void uploadRef.current(files,point);},[]);
  const keyboardRef=useRef<(e:KeyboardEvent)=>void>(()=>{});
  const pasteRef=useRef<(e:ClipboardEvent)=>void>(()=>{});
  // React's node handler and the window listener share exactly one dispatcher.
  // A consumed native event cannot run again when it reaches the window.
  const cardKey=useCallback((_id:string,event:React.KeyboardEvent<HTMLElement>)=>{
    if(event.target===event.currentTarget)keyboardRef.current(event.nativeEvent);
  },[]);
  keyboardRef.current=(event:KeyboardEvent)=>{
    if(event.defaultPrevented||event.isComposing||event.keyCode===229||dialog||inspectorOpen||contextMenu)return;
    const target=event.target instanceof Element?event.target:null;
    const plainEscape=event.key==='Escape'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey;
    if(addMenu){
      if(plainEscape){event.preventDefault();event.stopPropagation();setAddMenu(false);window.document.querySelector<HTMLButtonElement>('.dock-more-wrap > button')?.focus({preventScroll:true});}
      return;
    }
    if(target?.closest('.edge-inspector')){
      if(plainEscape){event.preventDefault();event.stopPropagation();setSelectedEdge(null);canvas.current?.focusSurface();}
      return;
    }
    const scope=graphShortcutScope(target);
    if(scope==='text'||scope==='control'||scope==='outside')return;
    const current=ws.exportDraft();
    const focusedNodeId=scope==='node'?target?.getAttribute('data-node'):scope==='canvas'?node?.id:null;
    const focusedNode=focusedNodeId?current?.nodes.find(item=>item.id===focusedNodeId&&item.boardId===boardId):undefined;
    const focusedEdgeId=scope==='edge'?target?.getAttribute('data-edge'):scope==='canvas'?edge?.id:null;
    const focusedEdge=focusedEdgeId?current?.edges.find(item=>item.id===focusedEdgeId&&item.boardId===boardId):undefined;
    const parent=current&&focusedNode?getThoughtParent(current,focusedNode.id):null;
    const action=resolveGraphShortcut(event,{scope,hasNode:!!focusedNode,hasEdge:!!focusedEdge,hasParent:!!parent});
    if(!action||action==='pan')return;
    event.preventDefault();event.stopPropagation();
    switch(action){
      case 'ignore':return;
      case 'search':if(flow.finish()){setDialog('search');setQuery('');}return;
      case 'select-all':selectMany(nodes.map(item=>item.id),focusedNode?.id);canvas.current?.focusSurface();return;
      case 'undo':flow.clear();ws.undo();canvas.current?.focusSurface();return;
      case 'redo':flow.clear();ws.redo();canvas.current?.focusSurface();return;
      case 'sibling':flow.begin(focusedNode?.id??null,'sibling');return;
      case 'child':if(focusedNode)flow.begin(focusedNode.id,'child');return;
      case 'parent':if(parent){selectNode(parent.id);canvas.current?.revealNode(parent.id);}return;
      case 'details':if(focusedNode)showDetails(focusedNode.id,event.key!==' ');return;
      case 'project':if(focusedNode)openNode(focusedNode.id);return;
      case 'edit':if(focusedNode)flow.edit(focusedNode.id);return;
      case 'clear':setSelected(null);setSelectedEdge(null);setConnectFrom(null);setAddMenu(false);canvas.current?.focusSurface();return;
      case 'delete':if(selectionIds.length>1&&(scope==='canvas'||focusedNode&&selectionIds.includes(focusedNode.id)))requestDeleteSelection();else if(focusedNode)requestDeleteNode(focusedNode.id);else if(focusedEdge)deleteEdge(focusedEdge.id);return;
      case 'new-thought':flow.begin();return;
      case 'new-task':flow.beginTask();return;
      case 'fit':canvas.current?.fit();return;
      case 'hand':setTool('hand');return;
      case 'select':setTool('select');return;
      case 'left':case 'right':case 'up':case 'down':{
        if(!current)return;
        const viewNodes=(canvas.current?.positionDocument(current)??current).nodes.filter(item=>item.boardId===boardId);
        let next:string|null=null;
        if(focusedNode)next=findDirectionalNode(viewNodes,focusedNode.id,action);
        else{
          const center=canvas.current?.getCenter()??{x:0,y:0};let best=Infinity;
          for(const item of viewNodes){const distance=(item.x+item.width/2-center.x)**2+(item.y+item.height/2-center.y)**2;if(distance<best){best=distance;next=item.id;}}
        }
        if(next){selectNode(next);canvas.current?.revealNode(next);}
        return;
      }
    }
  };
  pasteRef.current=(e:ClipboardEvent)=>{if(e.defaultPrevented||isEditableTarget(e.target)||!['canvas','node','edge'].includes(graphShortcutScope(e.target))||dialog||inspectorOpen||contextMenu||addMenu)return;const fs=Array.from(e.clipboardData?.files??[]);if(fs.length){e.preventDefault();void uploadFiles(fs);return;}const text=e.clipboardData?.getData('text/plain');if(text&&doc){e.preventDefault();if(text.length>100000){notice(L('این متن طولانی است؛ آن را به صورت فایل اضافه کن.','This text is too long; add it as a file.'));return;}let url='';try{const u=new URL(text.trim());if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)url=u.href;}catch{}add(url?'link':'note',undefined,{title:bookTitle(text),text:url?'':text,url});}};
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>keyboardRef.current(e);const paste=(e:ClipboardEvent)=>pasteRef.current(e);
    window.addEventListener('keydown',key);window.addEventListener('paste',paste);
    return()=>{window.removeEventListener('keydown',key);window.removeEventListener('paste',paste);};
  },[]);
  const deferredQuery=useDeferredValue(query);
  const searchPage=useMemo(()=>doc&&dialog==='search'?searchThoughts(doc.nodes,deferredQuery,searchLimit):{visible:[] as GraphNode[],total:0},[doc?.nodes,dialog,deferredQuery,searchLimit]);
  const matches=searchPage.visible;
  const searchPaths=useMemo(()=>doc&&dialog==='search'?buildBoardPaths(doc,L('بدون عنوان','Untitled')):new Map<string,string>(),[doc?.nodes,doc?.boards,dialog,L]);
  const focusResult=(n:GraphNode)=>{navigate(n.boardId);setSelected(n.id);setDialog(null);requestAnimationFrame(()=>canvas.current?.revealNode(n.id));};
  const branchNode=doc?.nodes.find(n=>n.id===branchSource);const branchCount=branchText.split('\n').filter(s=>s.trim()).length;
  const descendants=useMemo(()=>dialog==='delete-node'&&node&&doc?doc.nodes.length-deleteNode(doc,node.id).nodes.length-1:0,[dialog,node,doc]);
  const deleteSelectionSummary=useMemo(()=>{
    if(dialog!=='delete-selection'||!pendingDeleteSelection||!doc)return {count:0,nested:0};
    const ids=new Set(pendingDeleteSelection.ids);
    const count=doc.nodes.filter(item=>item.boardId===pendingDeleteSelection.boardId&&ids.has(item.id)).length;
    const removed=doc.nodes.length-deleteSelectedNodes(doc,pendingDeleteSelection.boardId,pendingDeleteSelection.ids).nodes.length;
    return {count,nested:Math.max(0,removed-count)};
  },[dialog,pendingDeleteSelection,doc]);
  const targetSpace=targetSpaceId?boardMap.get(targetSpaceId):undefined;
  const targetSpaceContents=useMemo(()=>dialog==='delete-space'&&doc&&targetSpaceId?inspectPersonalSpace(doc,targetSpaceId):null,[dialog,doc,targetSpaceId]);
  const writing=flow.dirty||annotationDraft;
  const stateLabel=writing?L('در حال نوشتن…','Writing…'):!doc?(ws.loading?L('در حال بازکردن فضا','Opening workspace…'):L('فضا باز نشده','Workspace not loaded')):{saved:L('ذخیره شد','All changes saved'),saving:L('در حال ذخیره','Saving…'),pending:L('در انتظار ذخیره','Changes pending'),offline:L('ذخیره انجام نشد','Save interrupted'),conflict:L('اختلاف نسخه','Version conflict')}[ws.saveState];
  const title=board?.title||L('فضای فکر','Thinking space');
  const boardTasks=useMemo(()=>nodes.reduce((count,n)=>n.task?{total:count.total+1,done:count.done+(n.task.status==='done'?1:0)}:count,{total:0,done:0}),[nodes]);
  const menuNode=contextMenu?.kind==='node'?nodeMap.get(contextMenu.id??''):undefined;
  const menuEdge=contextMenu?.kind==='edge'?doc?.edges.find(e=>e.id===contextMenu.id):undefined;
  const contextHasGroup=!!menuNode&&selectionIds.length>1&&selectionIds.includes(menuNode.id);
  const contextActions:ContextAction[]=menuNode?[
    {id:'edit',label:L('ویرایش عنوان','Edit title'),hint:'F2',run:()=>flow.edit(menuNode.id)},
    {id:'details',label:L('متن و یادداشت روی نوشته','Notes & text annotations'),hint:'Shift Enter',run:()=>showDetails(menuNode.id)},
    {id:'next',label:menuNode.task?L('تسک هم‌سطح','Sibling task'):L('فکر هم‌سطح','Sibling thought'),hint:'Enter',run:()=>flow.begin(menuNode.id,'sibling')},
    {id:'child',label:menuNode.task?L('ساب‌تسک تازه','New subtask'):L('زیرشاخهٔ تازه','New child'),hint:'Tab',run:()=>flow.begin(menuNode.id,'child')},
    menuNode.task?{id:'task',label:menuNode.task.status==='done'?L('بازگشایی تسک','Reopen task'):L('علامت انجام‌شده','Mark complete'),separator:true,run:()=>toggleTask(menuNode.id)}:{id:'task',label:L('تبدیل به تسک','Make a task'),separator:true,run:()=>makeTask(menuNode.id)},
    {id:'project',label:L('ورود به پروژهٔ داخلی','Open nested project'),hint:'Ctrl Enter',run:()=>openNode(menuNode.id)},
    {id:'connect',label:L('اتصال به فکر دیگر','Connect to another thought'),run:()=>beginConnect(menuNode.id)},
    {id:'pin',label:canvas.current?.isMagneticPinned(menuNode.id)?L('آزاد کردن در شبکهٔ مگنتی','Unpin from magnetic graph'):L('ثابت نگه‌داشتن در شبکهٔ مگنتی','Pin in magnetic graph'),run:()=>canvas.current?.toggleMagneticPin(menuNode.id)},
    {id:'card',label:L('ظاهر: کارت','Style: card'),separator:true,run:()=>changeNode(menuNode.id,{appearance:'card'})},
    {id:'sticky',label:L('ظاهر: برگهٔ یادداشت','Style: sticky note'),run:()=>changeNode(menuNode.id,{appearance:'sticky'})},
    {id:'outline',label:L('ظاهر: کادر ساده','Style: outline'),run:()=>changeNode(menuNode.id,{appearance:'outline'})},
    {id:'duplicate',label:L('تکثیر','Duplicate'),separator:true,run:()=>duplicateNode(menuNode.id)},
    {id:'delete',label:contextHasGroup?L(`حذف ${selectionIds.length} گره انتخاب‌شده`,`Delete ${selectionIds.length} selected nodes`):L('حذف گره','Delete thought'),hint:'Delete',danger:true,disabled:ws.readOnly,run:()=>contextHasGroup?requestDeleteSelection():requestDeleteNode(menuNode.id)},
  ]:menuEdge?[
    {id:'edit',label:L('ویرایش مسیر و استایل','Edit path & style'),run:()=>selectEdge(menuEdge.id)},
    {id:'reverse',label:L('برعکس کردن جهت','Reverse direction'),run:()=>changeEdge(menuEdge.id,{sourceId:menuEdge.targetId,targetId:menuEdge.sourceId})},
    {id:'reset',label:L('برگرداندن مسیر خودکار','Reset path'),disabled:!menuEdge.bend,run:()=>bendEdge(menuEdge.id,null)},
    {id:'light',label:menuEdge.animated===false?L('روشن کردن نور مسیر','Enable traveling light'):L('خاموش کردن نور مسیر','Disable traveling light'),run:()=>changeEdge(menuEdge.id,{animated:menuEdge.animated===false})},
    {id:'delete',label:L('حذف ارتباط','Delete connection'),hint:'Delete',danger:true,separator:true,run:()=>deleteEdge(menuEdge.id)},
  ]:contextMenu?[
    {id:'thought',label:L('فکر تازه در این نقطه','New thought here'),run:()=>flow.begin(null,'sibling',contextMenu.world)},
    {id:'task',label:L('تسک تازه در این نقطه','New task here'),run:()=>flow.beginTask(null,'sibling',contextMenu.world)},
    {id:'project',label:L('پروژهٔ تازه','New project'),run:()=>add('project',contextMenu.world)},
    {id:'fit',label:L('نمایش تمام بوم','Fit canvas'),hint:'F',separator:true,run:()=>canvas.current?.fit()},
    {id:'undo',label:L('بازگردانی','Undo'),hint:'Ctrl Z',disabled:!ws.canUndo,run:()=>ws.undo()},
  ]:[];
  return <div className={`app-shell ${sidebar?'sidebar-open':'sidebar-closed'} ${flow.editing?'flow-editing':''}`} data-theme={theme} dir={language==='fa'?'rtl':'ltr'}>
    <input ref={filesInput} type="file" className="sr-only" tabIndex={-1} multiple onChange={e=>{const files=Array.from(e.target.files??[]);const target=attachTarget.current;attachTarget.current=null;e.target.value='';void uploadFiles(files,undefined,target);}}/>
    <input ref={importInput} type="file" className="sr-only" tabIndex={-1} accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void importStructure(f);}}/>
    {sidebar&&<><button className="sidebar-scrim" inert={!!dialog||inspectorOpen} aria-label={L('بستن فهرست','Close navigation')} onClick={()=>setSidebar(false)}/><aside className="sidebar" inert={!!dialog||inspectorOpen}>
      <div className="brand"><span className="brand-symbol"><BrandMark/></span><div><strong>Nodus</strong><small>CONNECTED THINKING</small></div><button className="icon-button sidebar-close" onClick={()=>setSidebar(false)} aria-label={L('بستن فهرست','Close sidebar')}><PanelLeftClose size={17}/></button></div>
      <button className="sidebar-search" onClick={()=>{setQuery('');setDialog('search');}}><Search size={16}/><span>{L('جست‌وجو در فکرها','Find a thought')}</span><kbd>⌘K</kbd></button>
      <div className="nav-section-label"><span>{L('فضاهای من','MY SPACES')}</span><button className="icon-button small" onClick={()=>{setBoardName('');setDialog('new-board');}} aria-label={L('فضای تازه','New space')}><Plus size={16}/></button></div>
      <nav className="space-list" aria-label={L('پروژه‌ها','Projects')}>{roots.map(b=><div key={b.id}><div className="space-row"><button className={`space-item ${trail[0]?.id===b.id?'active':''}`} onClick={()=>navigate(b.id)}><span className="space-icon"><Network size={17}/></span><span dir="auto">{b.title||L('بدون عنوان','Untitled')}</span><small>{boardCounts.get(b.id)??0}</small></button>{roomId===null&&!ws.readOnly&&<button type="button" className="icon-button small space-delete" onClick={()=>requestDeleteSpace(b.id)} aria-label={L(`حذف فضای ${b.title||'بدون عنوان'}`,`Delete space ${b.title||'Untitled'}`)} title={L('حذف این فضای شخصی','Delete this personal space')}><Trash2 size={14}/></button>}</div>{trail[0]?.id===b.id&&trail.slice(1).map((child,i)=><button key={child.id} className={`nested-space ${boardId===child.id?'active':''}`} style={{paddingInlineStart:24+i*12}} onClick={()=>navigate(child.id)}><Layers size={13}/><span dir="auto">{child.title}</span></button>)}</div>)}</nav>
      <button className="new-space-button" onClick={()=>{setBoardName('');setDialog('new-board');}}><Plus size={16}/>{L('یک فضای تازه','Create a space')}</button>
      <div className="sidebar-spacer"/>
      <div className="sidebar-note"><div className="small-orbit" aria-hidden="true"><i/><i/><i/></div><p>{L('فکرها خطی نیستند.','Thoughts aren’t linear.')}<br/><strong>{L('فضایشان بده.','Give them room.')}</strong></p></div>
      <button className="sidebar-action" disabled={!doc} onClick={()=>{if(flow.finish())setDialog('collaboration');}}><Users size={16}/>{L('فضاهای مشترک','Shared spaces')}</button>
      <button className="sidebar-action" onClick={()=>setDialog('export')}><ArrowDownToLine size={16}/>{L('ورود و خروج داده','Import & export')}</button>
      <button className="sidebar-action" onClick={()=>setDialog('help')}><CircleHelp size={16}/>{L('راهنما و میانبرها','Guide & shortcuts')}</button>
      <div className="account-card"><div className="avatar">{(presence.profileLabel||L('من','Me')).slice(0,1)}</div><div><strong>{presence.profileLabel||L('من','Me')}</strong><small><ShieldCheck size={11}/>{roomId?L('فضای مشترک','Shared workspace'):L('فضای خصوصی','Private workspace')}</small></div><button className="icon-button" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={L('تغییر روشنایی ظاهر','Toggle color theme')} title={L('ظاهر روشن / تیره','Light / dark theme')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button></div>
    </aside></>}
    <main className="main-area" inert={!!dialog||inspectorOpen}>
      <header className="topbar"><div className="topbar-location">{!sidebar&&<button className="icon-button" onClick={()=>setSidebar(true)} aria-label={L('بازکردن فهرست','Open sidebar')}><PanelLeftOpen size={19}/></button>}<nav className="breadcrumbs" aria-label={L('مسیر پروژه','Project path')}><span className="breadcrumb-home">{roomId?L('فضای مشترک','Shared space'):L('فضای من','Workspace')}</span>{trail.map((b,i)=><span className="breadcrumb-part" key={b.id}>{language==='fa'?<ChevronLeft size={13}/>:<ChevronRight size={13}/>}<button onClick={()=>navigate(b.id)} aria-current={i===trail.length-1?'page':undefined} dir="auto">{b.title||L('بدون عنوان','Untitled')}</button></span>)}</nav></div>
        <div className="topbar-actions">{roomId&&!doc&&<button className="collaboration-launch" onClick={()=>void switchRoom(null)}><ArrowLeft size={15}/>{L('فضای شخصی','Personal space')}</button>}{doc&&<button className="collaboration-launch" onClick={()=>{if(flow.finish())setDialog('collaboration');}} aria-label={L('همکاری و اشتراک‌گذاری','Collaborate and share')} title={presence.error??(roomId?L('افراد حاضر و دسترسی‌ها','People and access'):L('همکاری روی یک بوم مشترک','Work together on a shared board'))}><Users size={16}/>{roomId&&<i className="presence-live-dot" style={presence.status==='error'?{background:'var(--warning)'}:undefined}/>}<span className="collaboration-label">{roomId?`${new Set([ws.getUserId(),...presence.peers.map(peer=>peer.userId)]).size} ${L('نفر در فضا','in this space')}`:L('همکاری','Collaborate')}</span></button>}<span className={`save-status status-${writing?'pending':ws.saveState}`} title={writing?stateLabel:ws.updatedAt?new Date(ws.updatedAt).toLocaleString(language==='fa'?'fa-IR':'en-US'):stateLabel}>{writing?<Pencil size={14}/>:ws.saveState==='saving'?<LoaderCircle size={14} className="spin"/>:ws.saveState==='saved'?<Cloud size={15}/>:<CloudOff size={15}/>}<span>{stateLabel}</span></span><span className="topbar-divider"/><button className="language-button" onClick={()=>setLanguage(language==='fa'?'en':'fa')} aria-label={L('Switch to English','تغییر به فارسی')}>{language==='fa'?'EN':'فا'}</button><button className="icon-button mobile-search" onClick={()=>setDialog('search')} aria-label={L('جست‌وجو','Search')}><Search size={18}/></button><button className="secondary-button header-export" onClick={()=>setDialog('export')}><Upload size={14}/>{L('خروجی','Export')}</button></div>
      </header>
      {doc&&(ws.saveState==='offline'||ws.saveState==='conflict'||ws.hasRecovery||ws.draftWarning)&&<div className="status-banner" role="status"><div><strong>{ws.readOnly?L('دسترسی ویرایش این فضا در دسترس نیست؛ نسخهٔ بازشده در این صفحه حفظ شده است.','This space is no longer editable; the copy open on this page is preserved.'):ws.saveState==='conflict'?L('این بخش توسط شخص یا پنجرهٔ دیگری هم تغییر کرده است.','This content was also changed by another person or tab.'):ws.saveState==='offline'?L('تغییرات هنوز روی سرور ذخیره نشده‌اند.','Your changes have not reached the server yet.'):ws.hasRecovery?L('یک پیش‌نویس قابل بازیابی روی این دستگاه وجود دارد.','A recoverable draft is available on this device.'):L('ذخیرهٔ پشتیبان روی این دستگاه در دسترس نیست.','Device recovery storage is unavailable.')}</strong>{ws.error&&<small dir="auto">{ws.error}</small>}{ws.draftWarning&&<small>{ws.draftWarning}</small>}</div><div className="banner-actions">{ws.saveState==='conflict'?<><button onClick={()=>void ws.resolveConflict()}>{L('هر دو نسخه بمانند','Keep both versions')}</button><button onClick={()=>void ws.reload()}>{L('نسخهٔ سرور','Load server version')}</button></>:ws.saveState==='offline'?<><button onClick={()=>void ws.retry()}>{L('تلاش دوباره','Retry save')}</button><button onClick={()=>void ws.reload()}>{L('بارگذاری دوباره','Reload workspace')}</button></>:null}{ws.hasRecovery&&<><button onClick={()=>void ws.recoverDraft()}>{L('بازیابی پیش‌نویس','Recover draft')}</button><button onClick={()=>ws.discardDraft()}>{L('نادیده گرفتن','Dismiss')}</button></>}<button onClick={exportStructure}>{L('دریافت JSON','Download JSON')}</button></div></div>}
      <div className="workspace-body">
        <section className="canvas-section">
          {doc&&board?<><div className="canvas-heading"><div><span className="eyebrow">{trail.length>1?L('درون یک ایده','INSIDE AN IDEA'):L('بومِ زندهٔ تو','YOUR LIVING CANVAS')}</span><div className="canvas-title-row"><h1 dir="auto">{title}</h1><button className="icon-button small" onClick={()=>{setBoardName(title);setDialog('rename');}} aria-label={L('تغییر نام فضا','Rename space')}><Pencil size={13}/></button></div><p>{nodes.length} {L('گره','nodes')}<span>·</span>{edges.length} {L('ارتباط','connections')}<span>·</span>{boardTasks.total?<span className="task-board-count">{boardTasks.done}/{boardTasks.total} {L('تسک انجام‌شده','tasks done')}</span>:L('امکان‌های تازه','room to grow')}{activeLayout&&<span className="canvas-view-caption">{layoutName(activeLayout.kind,language)}</span>}</p></div><button className="icon-button arrange-button" onClick={()=>{if(flow.finish())setDialog('design');}} title={L('چیدمان و ظاهر بوم','Canvas layout and style')} aria-label={L('چیدمان و ظاهر بوم','Canvas layout and style')}><Settings2 size={17}/><span>{L('چیدمان','Layout')}</span></button></div>
          <Canvas ref={canvas} document={flow.canvasDocument??doc} boardId={boardId} selectedId={selected} selectedIds={selectionIds} multiSelectMode={multiSelectMode} selectedEdgeId={selectedEdge} language={language} tool={tool} connectFrom={connectFrom} onSelect={selectNode} onSelectMany={selectMany} onSelectEdge={selectEdge} onOpen={openNode} onMove={moveNode} onMoveMany={moveMany} onConnect={connect} onStartConnect={beginConnect} onBranch={quickChild} onCreate={createAt} onDropFiles={dropFiles} onZoomChange={setZoom} inlineEdit={flow.inlineEdit} onEdit={flow.edit} onEditCommit={flow.commit} onEditDirtyChange={flow.onDirtyChange} onNodeKeyDown={cardKey} onDetails={showDetails} onToggleTask={ws.readOnly?undefined:cycleTask} onContextMenu={openContext} onEdgeBend={bendEdge} onDeleteEdge={deleteEdge} design={preferences.design} guides={preferences.magnetic.enabled||magneticState.dirty?[]:guides} peers={presence.peers} onPointerPresence={presence.reportPointer} magnetic={preferences.magnetic} magneticScope={canvasScope} interactionsPaused={!!dialog||inspectorOpen||!!contextMenu} onMagneticState={receiveMagneticState}/>
          {connectFrom&&<div className="connect-banner"><Link2 size={15}/><span>{L('حالا روی گره مقصد بزن.','Now choose the destination node.')}</span><button className="icon-button small" onClick={()=>setConnectFrom(null)} aria-label={L('لغو اتصال','Cancel connection')}><X size={16}/></button></div>}
          {edge&&<EdgeInspector edge={edge} nodes={nodes} language={language} onChange={patch=>changeEdge(edge.id,patch)} onDelete={()=>deleteEdge(edge.id)} onClose={()=>{setSelectedEdge(null);canvas.current?.focusSurface();}}/>}
          <div className="magnetic-ui" style={{'--magnetic-accent':`var(--${preferences.design.accent})`} as React.CSSProperties}>
            <button ref={magnetButton} type="button" className={`magnet-launch ${preferences.magnetic.enabled?'is-enabled':''}`} onClick={toggleMagnet} aria-label={L('حالت مگنتی','Magnetic mode')} aria-expanded={magnetOpen} title={L('مگنتِ فکرها؛ جذب و فاصله‌گیری زنده','Thought magnets; live attraction and repulsion')}><Magnet size={17}/><span>{L('مگنت','Magnets')}</span><i data-status={magneticState.status}/></button>
            {magnetOpen&&!flow.editing&&!inspectorOpen&&!dialog&&!contextMenu&&!selectedEdge&&<MagneticPanel settings={preferences.magnetic} onChange={preferences.setMagnetic} language={language} status={magneticState.status} pinnedCount={magneticState.pinnedCount} onReheat={()=>canvas.current?.reheatMagnetic()} onApply={applyMagnet} onReset={restoreMagnet} onClose={closeMagnet} canApply={!ws.readOnly&&!flow.editing} dirty={magneticState.dirty} persistenceError={magneticState.persistenceError||preferences.persistenceError}/>}
          </div>
          {!connectFrom&&!inspectorOpen&&(selectionNodes.length>1?<SelectionToolbar count={selectionNodes.length} language={language} color={selectionColor} status={selectionStatus} readOnly={ws.readOnly} canUndo={ws.canUndo} canRedo={ws.canRedo}
            onColor={color=>updateSelection({color})} onStatus={status=>updateSelection({status})} onDelete={requestDeleteSelection}
            onClear={()=>{selectNode(null);canvas.current?.focusSurface();}} onUndo={()=>{if(!ws.readOnly)ws.undo();canvas.current?.focusSurface();}} onRedo={()=>{if(!ws.readOnly)ws.redo();canvas.current?.focusSurface();}}/>
          :<CanvasDock language={language} selectedTitle={node?.title} isTask={!!node?.task} editing={flow.editing} tool={tool} menuOpen={addMenu} setMenuOpen={setAddMenu} multiSelectMode={multiSelectMode} onMultiSelectModeChange={changeMultiSelectMode}
            selectionSettings={node&&<NodeQuickSettings key={node.id} nodeId={node.id} color={node.color} status={node.task?.status??null} language={language} readOnly={ws.readOnly} onColor={color=>{if(!ws.readOnly)changeNode(node.id,{color});}} onStatus={status=>quickStatus(node.id,status)}/>}
            canUndo={ws.canUndo} canRedo={ws.canRedo} onUndo={()=>ws.undo()} onRedo={()=>ws.redo()} onToolChange={next=>{setTool(next);canvas.current?.focusSurface();}}
            onNewThought={()=>flow.begin()} onNewTask={()=>flow.beginTask()} onNewProject={()=>add('project')} onNewLink={()=>add('link')} onUpload={()=>pickFiles()}
            onSibling={()=>{if(node)flow.begin(node.id,'sibling');}} onChild={()=>{if(node)flow.begin(node.id,'child');}} onEdit={()=>{if(node)flow.edit(node.id);}}
            onDetails={()=>{if(node)showDetails(node.id);}} onDeselect={()=>{selectNode(null);canvas.current?.focusSurface();}} onHelp={()=>setDialog('help')}/>)}
          <div className="zoom-controls"><button className="icon-button" onClick={()=>canvas.current?.zoomBy(.8)} aria-label={L('کوچک‌نمایی','Zoom out')}><ZoomOut size={17}/></button><button className="zoom-value" onClick={()=>canvas.current?.fit()} title={L('دیدن همهٔ گره‌ها','Fit all nodes')}>{Math.round(zoom*100)}%</button><button className="icon-button" onClick={()=>canvas.current?.zoomBy(1.25)} aria-label={L('بزرگ‌نمایی','Zoom in')}><ZoomIn size={17}/></button><span/><button className="icon-button" onClick={()=>canvas.current?.fit()} aria-label={L('نمایش تمام بوم','Fit canvas')} title={L('تمام بوم · F','Fit canvas · F')}><Maximize size={16}/></button></div>

          </>:<div className="loading-state"><span className="brand-symbol"><BrandMark/></span><h1>Nodus</h1>{ws.loading?<><LoaderCircle className="spin" size={23}/><p>{L('فضای فکرهایت در حال بازشدن است…','Opening your thinking space…')}</p></>:<><h2>{L('فضایت هنوز بارگذاری نشده است','Your workspace could not be loaded')}</h2><p dir="auto">{ws.error}</p><div><button className="primary-button" onClick={()=>void ws.retry()}>{L('تلاش دوباره','Try again')}</button><a className="secondary-button" href="/signin-with-chatgpt?return_to=%2F" target="_top">{L('ورود با ChatGPT','Sign in with ChatGPT')}</a></div></>}</div>}
        </section>
      </div>
    </main>
    {node&&doc&&inspectorOpen&&!dialog&&<Modal key={node.id} title={node.title||L('محتوای فکر','Thought details')} className="node-dialog" hideHeader initialFocus={detailsFocus.current} motionOrigin={detailsOrigin} closing={inspectorClosing} onExited={finishCloseDetails} onClose={closeDetails} restoreFocus={()=>{if(restoreDetailsFocus.current){restoreDetailsFocus.current=false;canvas.current?.revealNode(node.id);}}}>
      <Inspector ref={inspector} readOnly={ws.readOnly} node={node} document={doc} language={language} onChange={updateNode} onClose={closeDetails} onOpen={()=>leaveDetails(()=>openNode(node.id))} onBranch={()=>leaveDetails(()=>branch(node.id))} onConnect={()=>leaveDetails(()=>{beginConnect(node.id);requestAnimationFrame(()=>canvas.current?.focusSurface());})} onDuplicate={()=>leaveDetails(duplicate)} onDelete={()=>leaveDetails(()=>requestDeleteNode(node.id))} onTaskStatus={taskStatus} onMakeTask={()=>makeTask(node.id)} onRemoveTask={()=>unmakeTask(node.id)} onAddSubtask={()=>leaveDetails(()=>flow.beginTask(node.id,'child'))} onToggleSubtask={toggleTask} draftScope={`${ws.getUserId()}:${roomId??'personal'}`} onDraftDirtyChange={changeAnnotationDraft} onAttach={()=>pickFiles(node.id)} onSelect={showDetails} onEditTitle={()=>leaveDetails(()=>flow.edit(node.id))}/>
    </Modal>}
    {uploading&&<div className="upload-status" role="status"><LoaderCircle size={19} className="spin"/><div><strong>{L('بارگذاری','Uploading')} {uploading.current}/{uploading.total}</strong><span dir="auto">{uploading.name}</span></div></div>}
    {!!uploadErrors.length&&<div className="upload-errors" role="alert"><header><strong>{L('بعضی فایل‌ها اضافه نشدند','Some files were not added')}</strong><button className="icon-button small" onClick={()=>setUploadErrors([])} aria-label={L('بستن','Close')}><X size={16}/></button></header>{uploadErrors.map((error,i)=><p key={i} dir="auto">{error}</p>)}</div>}
    {contextMenu&&<CanvasContextMenu key={`${contextMenu.kind}:${contextMenu.id??'canvas'}:${contextMenu.clientX}:${contextMenu.clientY}`} x={contextMenu.clientX} y={contextMenu.clientY} title={menuNode?.title??menuEdge?.label??L('ادامهٔ فکر','Keep thinking')} actions={contextActions} language={language} onDismiss={dismissContext}/>}
    {toast&&<div className="toast" role="status"><Check size={15}/><span>{toast}</span>{toastUndo&&ws.canUndo&&<button className="toast-undo" onClick={()=>{ws.undo();setToast(null);}}>{L('بازگردانی','Undo')}</button>}<button onClick={()=>setToast(null)} aria-label={L('بستن پیام','Dismiss message')}><X size={14}/></button></div>}
    {dialog==='design'&&doc&&<DesignPanel nodes={nodes} edges={edges} design={preferences.design} options={activeLayout??preferences.layout} language={language} persistenceError={preferences.persistenceError} onDesign={preferences.setDesign} onApply={applyLayout} onClose={()=>setDialog(null)}/>}
    {dialog==='collaboration'&&shareDocument&&<CollaborationPanel roomId={roomId} room={ws.room} members={ws.members} currentDocument={shareDocument} language={language} userId={ws.getUserId()||null} onSwitchRoom={switchRoom} onNotice={notice} onClose={()=>setDialog(null)}/>}
    {dialog==='search'&&<Modal title={L('فکرت را پیدا کن','Find your thought')} onClose={()=>setDialog(null)} wide><div className="search-box"><Search size={20}/><input autoFocus value={query} onChange={e=>{setQuery(e.target.value);setSearchLimit(SEARCH_PAGE_SIZE);}} placeholder={L('عنوان، متن یا نام فایل…','Title, content, or filename…')} aria-label={L('جست‌وجو در همهٔ پروژه‌ها','Search every project')}/><kbd>ESC</kbd></div><div className="search-meta" aria-live="polite">{L('در همهٔ فضاها و پروژه‌های داخلی','Across every space and nested project')} · {matches.length<searchPage.total?L('نمایش '+matches.length+' از '+searchPage.total+' نتیجه','Showing '+matches.length+' of '+searchPage.total+' results'):L(searchPage.total+' نتیجه',searchPage.total+' results')}</div><div className="search-results">{matches.map(n=>{const Icon=kindIcons[n.kind];return <button key={n.id} onClick={()=>focusResult(n)}><span className={`result-icon tone-${n.color}`}><Icon size={20}/></span><span><strong dir="auto">{n.title||L('بدون عنوان','Untitled')}</strong><small className="search-result-path" dir="auto" title={searchPaths.get(n.boardId)??''}>{searchPaths.get(n.boardId)??L('مسیر نامشخص','Unknown location')} · {n.text.slice(0,65)||kindName(n.kind,language)}</small></span><ArrowUpRight size={16}/></button>;})}{!matches.length&&<p className="empty-message">{query.trim()?L('هنوز چیزی با این عبارت پیدا نشد.','No thoughts match that search.'):L('هنوز فکری در این فضاها نیست.','There are no thoughts in these spaces yet.')}</p>}{matches.length<searchPage.total&&<div className="search-more"><button type="button" className="secondary-button" onClick={()=>setSearchLimit(previous=>Math.min(searchPage.total,previous+SEARCH_PAGE_SIZE))}>{L('نمایش نتایج بیشتر','Show more results')} ({Math.min(SEARCH_PAGE_SIZE,searchPage.total-matches.length)})</button></div>}</div></Modal>}
    {dialog==='branches'&&<Modal title={L('بگذار ایده‌ات رشد کند','Give your idea room to grow')} onClose={()=>setDialog(null)}><div className="modal-body"><div className="branch-origin"><GitBranch size={18}/><span dir="auto">{branchNode?.title}</span></div><p className="dialog-description">{L('عنوان هر شاخه را در یک سطر بنویس. همه به همین گره وصل می‌شوند.','Write one branch title per line. Each one connects to this thought.')}</p><textarea className="branch-textarea" dir="auto" value={branchText} onChange={e=>setBranchText(e.target.value)} placeholder={L('اولین مسیر فکر…\nیک امکان دیگر…\nیک سؤال تازه…','The first direction…\nAnother possibility…\nA new question…')} autoFocus aria-label={L('عنوان شاخه‌ها، هر سطر یک شاخه','Branch titles, one per line')}/><div className="branch-caption"><button className="text-link" onClick={extractBranches}><FileIcon size={14}/>{L('از سطرهای یادداشت پر کن','Use lines from this note')}</button><span>{branchCount} {L('شاخه','branches')}</span></div><div className="dialog-footer"><button className="secondary-button" onClick={()=>setDialog(null)}>{L('انصراف','Cancel')}</button><button className="primary-button" disabled={!branchCount} onClick={grow}><GitBranch size={17}/>{L('ساخت شاخه‌ها','Grow branches')}</button></div></div></Modal>}
    {(dialog==='new-board'||dialog==='rename')&&<Modal title={dialog==='new-board'?L('فضایی برای یک شروع تازه','A space for a new beginning'):L('نام این فضا','Name this space')} onClose={()=>setDialog(null)}><form className="modal-body" onSubmit={e=>{e.preventDefault();dialog==='new-board'?makeBoard():rename();}}><label className="field-label">{L('نام فضا','Space name')}<input className="text-input large-input" autoFocus value={boardName} maxLength={250} onChange={e=>setBoardName(e.target.value)} placeholder={L('مثلاً: فیلم بعدی، ایده‌های من…','e.g. My next film, open questions…')} dir="auto"/></label><p className="dialog-description">{L('یک بوم مستقل برای فکرها، فایل‌ها و پروژه‌هایی که به هم مربوط‌اند.','An independent canvas for related thoughts, files, and projects.')}</p><div className="dialog-footer"><button type="button" className="secondary-button" onClick={()=>setDialog(null)}>{L('انصراف','Cancel')}</button><button type="submit" className="primary-button" disabled={!boardName.trim()}>{dialog==='new-board'?L('ساخت فضا','Create space'):L('ذخیرهٔ نام','Save name')}</button></div></form></Modal>}
    {dialog==='delete-space'&&<Modal title={L('این فضای شخصی حذف شود؟','Delete this personal space?')} onClose={()=>{setDialog(null);setTargetSpaceId(null);}}><div className="modal-body"><p className="delete-title" dir="auto">{targetSpace?.title||L('فضای شخصی','Personal space')}</p><p className="dialog-description">{targetSpaceContents?L(`این فضا شامل ${targetSpaceContents.nodeCount} گره و ${targetSpaceContents.projectCount} بومِ پروژهٔ داخلی است. همهٔ آن‌ها و ارتباط‌هایشان حذف می‌شوند.`,`This space contains ${targetSpaceContents.nodeCount} nodes and ${targetSpaceContents.projectCount} nested project canvases. They and their connections will be removed.`):L('این فضا دیگر در دسترس نیست.','This space is no longer available.')}</p>{targetSpaceContents&&roots.length===1&&<p className="dialog-description">{L('این آخرین فضای شخصی است؛ یک فضای خالی تازه جایگزین آن می‌شود.','This is your last personal space. A new empty space will replace it.')}</p>}<p className="dialog-description">{L('با یک بازگردانی، کل فضا و محتوای آن برمی‌گردد.','One undo restores the entire space and its contents.')}</p><div className="dialog-footer"><button className="secondary-button" onClick={()=>{setDialog(null);setTargetSpaceId(null);}}>{L('نگهش دار','Keep it')}</button><button className="danger-button" disabled={roomId!==null||ws.readOnly||!targetSpaceContents} onClick={removeSpace}><Trash2 size={16}/>{L('حذف فضا','Delete space')}</button></div></div></Modal>}
    {dialog==='delete-selection'&&pendingDeleteSelection&&<Modal title={L('گره‌های انتخاب‌شده حذف شوند؟','Delete the selected nodes?')} onClose={()=>{setDialog(null);setPendingDeleteSelection(null);}}><div className="modal-body"><p className="delete-title">{L(`${deleteSelectionSummary.count} گره انتخاب‌شده`,`${deleteSelectionSummary.count} selected nodes`)}</p><p className="dialog-description">{L(`این انتخاب شامل پروژه‌هایی با ${deleteSelectionSummary.nested} گره داخلی است؛ آن‌ها و ارتباط‌های وابسته هم حذف می‌شوند.`,`This selection includes projects with ${deleteSelectionSummary.nested} nested nodes. Those nodes and their connections will also be removed.`)}{' '}{L('کل حذف با یک بازگردانی برمی‌گردد.','One undo restores the entire deletion.')}</p><div className="dialog-footer"><button className="secondary-button" onClick={()=>{setDialog(null);setPendingDeleteSelection(null);}}>{L('نگهشان دار','Keep them')}</button><button className="danger-button" disabled={ws.readOnly||!deleteSelectionSummary.count} onClick={()=>deleteSelectionNow(pendingDeleteSelection.ids,pendingDeleteSelection.boardId)}><Trash2 size={16}/>{L('حذف انتخاب‌شده‌ها','Delete selection')}</button></div></div></Modal>}
    {dialog==='delete-node'&&node&&<Modal title={L('این گره حذف شود؟','Delete this thought?')} onClose={()=>setDialog(null)}><div className="modal-body"><p className="delete-title" dir="auto">{node.title}</p><p className="dialog-description">{descendants?L(`این گره یک پروژه با ${descendants} گره داخلی است؛ آن‌ها هم حذف می‌شوند.`, `This project contains ${descendants} nested nodes. They will also be removed.`):L('ارتباط‌های این گره هم برداشته می‌شوند.','Its connections will also be removed.')}{' '}{L('پس از حذف می‌توانی از بازگردانی استفاده کنی.','You can undo this action afterward.')}</p><div className="dialog-footer"><button className="secondary-button" onClick={()=>setDialog(null)}>{L('نگهش دار','Keep it')}</button><button className="danger-button" onClick={remove}><Trash2 size={16}/>{L('حذف گره','Delete thought')}</button></div></div></Modal>}
    {dialog==='export'&&<Modal title={L('فکرهایت در اختیار توست','Your thoughts, in your hands')} onClose={()=>setDialog(null)}><div className="modal-body"><p className="dialog-description">{L('پروژه‌ها، یادداشت‌ها، مختصات و ارتباط‌ها را به صورت JSON دریافت یا دوباره وارد کن. فایل‌های اصلی رسانه داخل این خروجی نیستند؛ از پنل هر گره جدا دانلودشان کن.','Export or import your projects, notes, positions, and connections as JSON. Original media bytes are not included; download them from each node’s editor.')}</p><button className="export-option" onClick={exportStructure} disabled={!doc}><Download size={23}/><span><strong>{L('دریافت ساختار JSON','Export graph structure')}</strong><small>{L('همهٔ پروژه‌ها و ارجاع فایل‌ها','All projects and attachment references')}</small></span><ArrowUpRight size={17}/></button><button className="export-option" disabled={busy||!doc} onClick={()=>importInput.current?.click()}><Upload size={23}/><span><strong>{busy?L('در حال بررسی…','Checking…'):L('ورود یک خروجی قبلی','Import an earlier export')}</strong><small>{L('به صورت پروژه‌های جدا، کنار محتوای فعلی','Adds separate projects alongside your current work')}</small></span></button><p className="fine-print">{L('ارجاع فایل‌های واردشده باید متعلق به همین حساب و این اپ باشند.','Imported attachments must already belong to this account in this app.')}</p></div></Modal>}
    {dialog==='help'&&<Modal title={L('راهنمای کوتاه نودوس','A quick guide to Nodus')} onClose={()=>setDialog(null)} wide><ShortcutGuide language={language}/></Modal>}
  </div>;
}
function bookTitle(text:string){return text.trim().split('\n')[0].slice(0,100)||'Untitled';}
