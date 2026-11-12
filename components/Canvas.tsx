'use client';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, AudioLines, Check, Circle, CircleDot, File as FileIcon, FileText, Image as ImageIcon, Layers, Link2, MessageSquareText, Play, Plus, StickyNote, Video } from 'lucide-react';
import { fitViewport } from '@/lib/graph';
import { connectionGeometry, type EdgePoint } from '@/lib/edge-geometry';
import type { GraphEdge, GraphNode, Language, NodeKind, Viewport, Workspace } from '@/lib/types';
import './canvas-flow.css';

export const kindIcons = { note: StickyNote, image: ImageIcon, video: Video, audio: AudioLines, pdf: FileText, file: FileIcon, link: Link2, project: Layers };
export const kindName = (kind: NodeKind, language: Language) => ({ note: ['یادداشت', 'Note'], image: ['تصویر', 'Image'], video: ['ویدیو', 'Video'], audio: ['صدا', 'Audio'], pdf: ['پی‌دی‌اف', 'PDF'], file: ['فایل', 'File'], link: ['لینک', 'Link'], project: ['پروژه', 'Project'] }[kind][language === 'fa' ? 0 : 1]);
export type InlineEditAction = 'finish' | 'sibling' | 'child' | 'parent' | 'details' | 'cancel';
export interface InlineEditSession { nodeId: string; initialValue: string; session: number; selectAll?: boolean; }
export interface CanvasContextMenuPayload { kind: 'node' | 'edge' | 'canvas'; id?: string; clientX: number; clientY: number; world: { x: number; y: number }; }
export interface CanvasHandle {
  fit: () => void;
  zoomBy: (factor: number) => void;
  focusNode: (id: string) => void;
  revealNode: (id: string, focus?: boolean, minimumZoom?: number) => void;
  focusSurface: () => void;
  getCenter: () => { x: number; y: number };
}
interface Props {
  document: Workspace;
  boardId: string;
  selectedId: string | null;
  selectedEdgeId: string | null;
  language: Language;
  tool: 'select' | 'hand';
  connectFrom: string | null;
  inlineEdit?: InlineEditSession | null;
  onEdit?: (id: string) => void;
  onDetails?: (id: string) => void;
  onEditCommit?: (id: string, title: string, action: InlineEditAction) => void;
  onEditDirtyChange?: (id: string, dirty: boolean) => void;
  onNodeKeyDown?: (id: string, event: React.KeyboardEvent<HTMLElement>) => void;
  onToggleTask?: (id: string) => void;
  onContextMenu?: (payload: CanvasContextMenuPayload) => void;
  onEdgeBend?: (id: string, point: { x: number; y: number } | null) => void;
  onDeleteEdge?: (id: string) => void;
  onSelect: (id: string | null) => void;
  onSelectEdge: (id: string) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (source: string, target: string) => void;
  onStartConnect: (id: string) => void;
  onBranch: (id: string) => void;
  onCreate: (x: number, y: number) => void;
  onDropFiles: (files: File[], point: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}
type Gesture = { mode: 'pan' | 'node'; pointerId: number; id?: string; startX: number; startY: number; worldX: number; worldY: number; x: number; y: number; moved: boolean };
type MovingNode = { id: string; x: number; y: number } | null;
type ProjectMiniature = { nodes: GraphNode[]; edges: GraphEdge[] };
type EdgeDrawing = { edge: GraphEdge; source: GraphNode; target: GraphNode; geometry: ReturnType<typeof connectionGeometry> };
type TaskProgress = { done: number; total: number };
type RecentGraphItems = { nodes: Set<string>; edges: Set<string> };
type CardDispatch = {
  pointerDown: (event: React.PointerEvent<HTMLElement>, id: string) => void;
  doubleClick: (event: React.MouseEvent<HTMLElement>, node: GraphNode) => void;
  keyDown: (id: string, event: React.KeyboardEvent<HTMLElement>) => void;
  focus: (id: string) => void;
  open: (id: string) => void;
  details: (id: string) => void;
  toggleTask: (id: string) => void;
  contextMenu: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  branch: (id: string) => void;
  port: (id: string, targetPort: boolean) => void;
  commit: (id: string, title: string, action: InlineEditAction) => void;
  dirty: (id: string, dirty: boolean) => void;
};
type EdgeDispatch = {
  select: (id: string) => void;
  remove: (id: string) => void;
  bend: (id: string, point: EdgePoint | null) => void;
  point: (clientX: number, clientY: number) => EdgePoint;
  contextMenu: (event: React.MouseEvent<SVGElement>, id: string) => void;
  keyboardMenu: (event: React.KeyboardEvent<SVGElement>, id: string) => boolean;
  setBending: (id: string, active: boolean) => void;
};
const EMPTY_MINIATURE: ProjectMiniature = { nodes: [], edges: [] };
const EMPTY_RECENT: RecentGraphItems = { nodes: new Set(), edges: new Set() };
const INITIAL_VIEW: Viewport = { x: 0, y: 0, zoom: 1 };
const colors: Record<string, string> = { sage: '#b5ccaf', blue: '#91b7df', amber: '#e5bf82', rose: '#dc9d99', violet: '#bbb0e0', gray: '#9da5a9' };
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const fitPadding = (width: number, height: number) => Math.max(16, Math.min(90, width * .07, height * .12));
const isTextInput = (target: EventTarget | null) => target instanceof Element && !!target.closest('input,textarea,select,[contenteditable="true"]');
const isContextKey = (event: React.KeyboardEvent) => event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
function useCanvasMotion() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllowed(!preference.matches && !document.hidden);
    update(); preference.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    return () => { preference.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return allowed;
}
function useRecentGraphItems(nodes: GraphNode[], edges: GraphEdge[], boardId: string) {
  const known = useRef<{ boardId: string; nodes: Set<string>; edges: Set<string> } | null>(null);
  const pending = useRef<RecentGraphItems>({ nodes: new Set(), edges: new Set() });
  const current = useRef(EMPTY_RECENT);
  const frame = useRef<number | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recent, setRecent] = useState(EMPTY_RECENT);
  useEffect(() => {
    const next = { boardId, nodes: new Set(nodes.map(node => node.id)), edges: new Set(edges.map(edge => edge.id)) };
    const previous = known.current; known.current = next;
    if (!previous || previous.boardId !== boardId) {
      pending.current = { nodes: new Set(), edges: new Set() }; current.current = EMPTY_RECENT;
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
      return;
    }
    for (const id of next.nodes) if (!previous.nodes.has(id)) pending.current.nodes.add(id);
    for (const id of next.edges) if (!previous.edges.has(id)) pending.current.edges.add(id);
    if ((!pending.current.nodes.size && !pending.current.edges.size) || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const added = {
        nodes: new Set([...current.current.nodes, ...pending.current.nodes].slice(-32)),
        edges: new Set([...current.current.edges, ...pending.current.edges].slice(-48)),
      };
      pending.current = { nodes: new Set(), edges: new Set() }; current.current = added; setRecent(added);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { current.current = EMPTY_RECENT; setRecent(EMPTY_RECENT); timer.current = null; }, 4000);
    });
  }, [nodes, edges, boardId]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); if (timer.current) clearTimeout(timer.current); }, []);
  return recent;
}
function revealDelta(start: number, end: number, minimum: number, maximum: number) {
  if (end - start <= maximum - minimum) return start < minimum ? minimum - start : end > maximum ? maximum - end : 0;
  // An oversized card cannot fit without changing zoom: expose the nearest edge.
  return start > minimum ? minimum - start : end < maximum ? maximum - end : 0;
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  const { document: doc, boardId, language, selectedId, connectFrom, tool } = props;
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const propsRef = useRef(props);
  const boardRef = useRef(boardId);
  useLayoutEffect(() => { propsRef.current = props; boardRef.current = boardId; }, [props, boardId]);
  const surface = useRef<HTMLDivElement>(null);
  const cardElements = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  const viewRef = useRef<Viewport>(INITIAL_VIEW);
  const [view, setViewState] = useState<Viewport>(INITIAL_VIEW);
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const measuredSize = useRef<{ width: number; height: number } | null>(null);
  const [moving, setMoving] = useState<MovingNode>(null);
  const movingRef = useRef<MovingNode>(null);
  const bendingEdge = useRef<string | null>(null);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const [space, setSpace] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [animating, setAnimating] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const captures = useRef(new Map<number, Element>());
  const [capturedNodes, setCapturedNodes] = useState<Set<string>>(() => new Set());
  const pinch = useRef<{ ids: [number, number]; distance: number; zoom: number; worldX: number; worldY: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const views = useRef<Record<string, Viewport>>({});
  const initialized = useRef('');
  const frame = useRef<number | null>(null);
  const pendingView = useRef<Viewport | null>(null);
  const movingDirty = useRef(false);
  const lastNotifiedZoom = useRef(1);

  const baseNodes = useMemo(() => doc.nodes.filter(node => node.boardId === boardId), [doc.nodes, boardId]);
  const baseNodeMap = useMemo(() => new Map(baseNodes.map(node => [node.id, node])), [baseNodes]);
  const nodes = useMemo(() => moving ? baseNodes.map(node => node.id === moving.id ? { ...node, x: moving.x, y: moving.y } : node) : baseNodes, [baseNodes, moving]);
  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const edges = useMemo(() => doc.edges.filter(edge => edge.boardId === boardId), [doc.edges, boardId]);
  const motionAllowed = useCanvasMotion();
  const recentItems = useRecentGraphItems(baseNodes, edges, boardId);
  const zoomFloor = useMemo(() => Math.min(.15, fitViewport(baseNodes, size.width, size.height, fitPadding(size.width, size.height)).zoom * .5), [baseNodes, size]);
  const zoomFloorRef = useRef(zoomFloor);
  useLayoutEffect(() => { zoomFloorRef.current = zoomFloor; }, [zoomFloor]);

  const flushFrame = useCallback(() => {
    frame.current = null;
    const next = pendingView.current;
    pendingView.current = null;
    if (next) {
      setViewState(next);
      if (next.zoom !== lastNotifiedZoom.current) {
        lastNotifiedZoom.current = next.zoom;
        propsRef.current.onZoomChange(next.zoom);
      }
    }
    if (movingDirty.current) { movingDirty.current = false; setMoving(movingRef.current); }
  }, []);
  const scheduleFrame = useCallback(() => { if (frame.current === null) frame.current = requestAnimationFrame(flushFrame); }, [flushFrame]);
  const flushImmediately = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); flushFrame(); }, [flushFrame]);
  const stopAnimation = useCallback(() => {
    if (animationTimer.current) { clearTimeout(animationTimer.current); animationTimer.current = null; }
    setAnimating(false);
  }, []);
  const setView = useCallback((next: Viewport, animate = false, immediate = false) => {
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || !Number.isFinite(next.zoom) || next.zoom <= 0) return;
    viewRef.current = next; views.current[boardRef.current] = next; pendingView.current = next;
    if (animate) {
      if (animationTimer.current) clearTimeout(animationTimer.current);
      setAnimating(true);
      animationTimer.current = setTimeout(() => { setAnimating(false); animationTimer.current = null; }, 350);
    } else stopAnimation();
    if (animate || immediate) flushImmediately(); else scheduleFrame();
  }, [flushImmediately, scheduleFrame, stopAnimation]);
  const updateMoving = useCallback((next: MovingNode, immediate = false) => {
    movingRef.current = next; movingDirty.current = true;
    if (immediate) flushImmediately(); else scheduleFrame();
  }, [flushImmediately, scheduleFrame]);
  const point = useCallback((clientX: number, clientY: number) => {
    const rect = surface.current?.getBoundingClientRect();
    return { x: (clientX - (rect?.left ?? 0) - viewRef.current.x) / viewRef.current.zoom, y: (clientY - (rect?.top ?? 0) - viewRef.current.y) / viewRef.current.zoom };
  }, []);
  const contextMenu = useCallback((event: React.MouseEvent<Element>, kind: CanvasContextMenuPayload['kind'], id?: string) => {
    if (!propsRef.current.onContextMenu || isTextInput(event.target)) return;
    event.preventDefault(); event.stopPropagation();
    propsRef.current.onContextMenu({ kind, id, clientX: event.clientX, clientY: event.clientY, world: point(event.clientX, event.clientY) });
  }, [point]);
  const keyboardMenu = useCallback((event: React.KeyboardEvent<Element>, kind: CanvasContextMenuPayload['kind'], id?: string) => {
    if (!isContextKey(event) || !propsRef.current.onContextMenu || isTextInput(event.target)) return false;
    event.preventDefault(); event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect(), canvasBounds = surface.current?.getBoundingClientRect();
    const clientX = clamp(bounds.left + bounds.width / 2, (canvasBounds?.left ?? 0) + 20, (canvasBounds?.right ?? window.innerWidth) - 20);
    const clientY = clamp(bounds.top + bounds.height / 2, (canvasBounds?.top ?? 0) + 20, (canvasBounds?.bottom ?? window.innerHeight) - 20);
    propsRef.current.onContextMenu({ kind, id, clientX, clientY, world: point(clientX, clientY) });
    return true;
  }, [point]);
  const zoomAt = useCallback((nextZoom: number, cx: number, cy: number, animate = false) => {
    const current = viewRef.current, zoom = clamp(nextZoom, zoomFloorRef.current, 2.5);
    setView({ x: cx - (cx - current.x) * zoom / current.zoom, y: cy - (cy - current.y) * zoom / current.zoom, zoom }, animate);
  }, [setView]);
  const fit = useCallback(() => setView(fitViewport(baseNodes, size.width, size.height, fitPadding(size.width, size.height)), true), [baseNodes, size, setView]);
  const registerCard = useCallback((id: string, element: HTMLElement | null) => {
    if (element) cardElements.current.set(id, element); else cardElements.current.delete(id);
  }, []);
  const focusCard = useCallback((id: string) => {
    const element = cardElements.current.get(id);
    if (!element) { pendingFocus.current = id; return; }
    // An inline editor owns focus while typing; do not focus its containing card.
    if (propsRef.current.inlineEdit?.nodeId !== id) element.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, []);
  const revealNode = useCallback((id: string, focus = true, minimumZoom = 0) => {
    const node = baseNodeMap.get(id); if (!node) return;
    const bounds = measuredSize.current ?? size;
    const marginX = Math.min(44, bounds.width * .09), top = Math.min(134, bounds.height * .23), bottom = Math.min(bounds.width <= 650 ? 220 : 195, bounds.height * .35);
    const previous = viewRef.current;
    // Enter writing at a readable scale, then keep that scale across the thought chain.
    const zoom = Math.max(previous.zoom, Math.min(minimumZoom, (bounds.width - marginX * 2) / node.width, 2.5));
    const current = zoom === previous.zoom ? previous : {
      x: bounds.width / 2 - (node.x + node.width / 2) * zoom,
      y: (top + bounds.height - bottom) / 2 - (node.y + node.height / 2) * zoom,
      zoom,
    };
    const left = node.x * current.zoom + current.x, upper = node.y * current.zoom + current.y;
    const dx = revealDelta(left, left + node.width * current.zoom, marginX, bounds.width - marginX);
    const dy = revealDelta(upper, upper + node.height * current.zoom, top, bounds.height - bottom);
    if (focus) pendingFocus.current = id;
    if (dx || dy || zoom !== previous.zoom) setView({ ...current, x: current.x + dx, y: current.y + dy }, true);
    if (focus) focusCard(id);
  }, [baseNodeMap, size, setView, focusCard]);
  useImperativeHandle(ref, () => ({
    fit, revealNode,
    focusSurface: () => { pendingFocus.current = null; setFocusedCard(null); surface.current?.focus({ preventScroll: true }); },
    zoomBy: factor => zoomAt(viewRef.current.zoom * factor, size.width / 2, size.height / 2, true),
    focusNode: id => {
      const node = baseNodeMap.get(id); if (!node) return;
      const zoom = Math.min(1.15, Math.max(.7, viewRef.current.zoom));
      setView({ x: size.width / 2 - (node.x + node.width / 2) * zoom, y: size.height / 2 - (node.y + node.height / 2) * zoom, zoom }, true);
    },
    getCenter: () => ({ x: (size.width / 2 - viewRef.current.x) / viewRef.current.zoom, y: (size.height / 2 - viewRef.current.y) / viewRef.current.zoom }),
  }), [fit, revealNode, zoomAt, size, baseNodeMap, setView]);

  const updateCapturedNodes = useCallback(() => {
    const next = new Set([...captures.current.values()].map(element => element.getAttribute('data-node')).filter((id): id is string => !!id));
    setCapturedNodes(previous => previous.size === next.size && [...previous].every(id => next.has(id)) ? previous : next);
  }, []);
  const release = useCallback((id: number, notify = true) => {
    const element = captures.current.get(id); captures.current.delete(id);
    try { if (element?.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* Capture may already be lost. */ }
    if (notify) updateCapturedNodes();
  }, [updateCapturedNodes]);
  const cancel = useCallback(() => {
    pointers.current.clear(); pinch.current = null; gesture.current = null; updateMoving(null, true);
    for (const id of captures.current.keys()) release(id, false);
    updateCapturedNodes();
  }, [updateMoving, release, updateCapturedNodes]);
  useEffect(() => {
    const element = surface.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      if (next.width <= 0 || next.height <= 0) return;
      const previous = measuredSize.current; measuredSize.current = next;
      if (previous && (previous.width !== next.width || previous.height !== next.height)) setView({ ...viewRef.current, x: viewRef.current.x + (next.width - previous.width) / 2, y: viewRef.current.y + (next.height - previous.height) / 2 });
      setSize(next);
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      if (bendingEdge.current) { event.preventDefault(); return; }
      if ((event.target as Element)?.closest('input,textarea,select,[contenteditable="true"]')) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect(), unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const dx = event.deltaX * unit, dy = event.deltaY * unit;
      if (!event.ctrlKey && !event.metaKey && (event.shiftKey || Math.abs(dx) > Math.abs(dy) * .6)) setView({ ...viewRef.current, x: viewRef.current.x - (event.shiftKey && dx === 0 ? dy : dx), y: viewRef.current.y - (event.shiftKey ? 0 : dy) });
      else zoomAt(viewRef.current.zoom * Math.exp(-dy * .0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); };
  }, [zoomAt, setView]);
  useLayoutEffect(() => {
    if (initialized.current === boardId || !surface.current) return;
    initialized.current = boardId; cancel(); setFocusedCard(null); pendingFocus.current = null;
    const rect = surface.current.getBoundingClientRect();
    let saved = views.current[boardId];
    if (!saved) try { saved = JSON.parse(localStorage.getItem(`nodus:view:${boardId}`) ?? 'null'); } catch { /* Unavailable local preferences. */ }
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom) && saved.zoom > 0 && saved.zoom <= 2.5) setView(saved, false, true);
    else setView(fitViewport(baseNodes, rect.width, rect.height, fitPadding(rect.width, rect.height)), false, true);
  }, [boardId, baseNodes, setView, cancel]);
  useEffect(() => {
    const timer = setTimeout(() => { try { localStorage.setItem(`nodus:view:${boardId}`, JSON.stringify(view)); } catch { /* Preference storage is optional. */ } }, 300);
    return () => clearTimeout(timer);
  }, [view, boardId]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (event.type === 'keyup') { setSpace(false); return; }
      if ((event.target as Element)?.closest('button,a,input,textarea,select,[role="button"],[contenteditable="true"]')) return;
      event.preventDefault(); setSpace(true);
    };
    const blur = () => { setSpace(false); cancel(); };
    window.addEventListener('keydown', key); window.addEventListener('keyup', key); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', blur); };
  }, [cancel]);
  useEffect(() => () => {
    if (animationTimer.current) clearTimeout(animationTimer.current);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    for (const id of captures.current.keys()) release(id, false);
  }, [release]);

  const beginPinch = () => {
    const entries = [...pointers.current.entries()]; if (entries.length < 2) return;
    const [[firstId, a], [secondId, b]] = entries, at = point((a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch.current = { ids: [firstId, secondId], distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: viewRef.current.zoom, worldX: at.x, worldY: at.y }; gesture.current = null;
  };
  const start = (event: React.PointerEvent<HTMLElement>, id?: string) => {
    if (bendingEdge.current) return;
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as Element, forcePan = tool === 'hand' || space || event.button === 1;
    if (target.closest('button,a,input,textarea,select,[contenteditable="true"],[data-edge-bend]') || (!forcePan && target.closest('[data-edge]'))) return;
    event.preventDefault(); event.stopPropagation(); stopAnimation();
    if (id && !forcePan) event.currentTarget.focus({ preventScroll: true });
    else if (!id) surface.current?.focus({ preventScroll: true });
    try { event.currentTarget.setPointerCapture(event.pointerId); captures.current.set(event.pointerId, event.currentTarget); updateCapturedNodes(); } catch { /* Browsers can decline capture. */ }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      if (movingRef.current) { const pending = movingRef.current; propsRef.current.onMove(pending.id, pending.x, pending.y); updateMoving(null); }
      if (!pinch.current) beginPinch(); return;
    }
    const pan = !id || forcePan, node = id ? nodeMap.get(id) : null; if (!pan && !node) return;
    const at = point(event.clientX, event.clientY);
    gesture.current = { mode: pan ? 'pan' : 'node', pointerId: event.pointerId, id, startX: event.clientX, startY: event.clientY, worldX: at.x, worldY: at.y, x: pan ? viewRef.current.x : node!.x, y: pan ? viewRef.current.y : node!.y, moved: false };
  };
  const move = (event: React.PointerEvent) => {
    if (bendingEdge.current) return;
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current) {
      const current = pinch.current, a = pointers.current.get(current.ids[0]), b = pointers.current.get(current.ids[1]);
      if (a && b && surface.current) {
        const rect = surface.current.getBoundingClientRect(), zoom = clamp(current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / current.distance, zoomFloorRef.current, 2.5);
        setView({ x: (a.x + b.x) / 2 - rect.left - current.worldX * zoom, y: (a.y + b.y) / 2 - rect.top - current.worldY * zoom, zoom });
      }
      return;
    }
    const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) > 4) current.moved = true;
    if (current.mode === 'pan') setView({ ...viewRef.current, x: current.x + dx, y: current.y + dy });
    else if (current.id && current.moved) { const at = point(event.clientX, event.clientY); updateMoving({ id: current.id, x: current.x + at.x - current.worldX, y: current.y + at.y - current.worldY }); }
  };
  const end = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId); release(event.pointerId);
    if (pinch.current) {
      suppressClickUntil.current = Date.now() + 350;
      if (!pinch.current.ids.includes(event.pointerId)) return;
      pinch.current = null; gesture.current = null;
      if (pointers.current.size >= 2) beginPinch();
      else if (pointers.current.size === 1) {
        const [[pointerId, at]] = pointers.current.entries(), world = point(at.x, at.y);
        gesture.current = { mode: 'pan', pointerId, startX: at.x, startY: at.y, worldX: world.x, worldY: world.y, x: viewRef.current.x, y: viewRef.current.y, moved: true };
      }
      return;
    }
    const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return; gesture.current = null;
    if (current.moved) suppressClickUntil.current = Date.now() + 250;
    if (current.mode === 'node' && current.id) {
      if (current.moved) { const at = point(event.clientX, event.clientY); propsRef.current.onMove(current.id, current.x + at.x - current.worldX, current.y + at.y - current.worldY); }
      else if (propsRef.current.connectFrom && propsRef.current.connectFrom !== current.id) propsRef.current.onConnect(propsRef.current.connectFrom, current.id);
      else propsRef.current.onSelect(current.id);
    } else if (!current.moved) propsRef.current.onSelect(null);
    updateMoving(null, true);
  };

  // Stable dispatch objects let React.memo skip unchanged cards on viewport frames.
  const pointerStartRef = useRef(start);
  useLayoutEffect(() => { pointerStartRef.current = start; });
  const cardDispatch = useMemo<CardDispatch>(() => ({
    pointerDown: (event, id) => pointerStartRef.current(event, id),
    doubleClick: (event, node) => {
      event.stopPropagation();
      if (Date.now() < suppressClickUntil.current || (event.target as Element).closest('button,a,input,textarea')) return;
      if (node.childBoardId) propsRef.current.onOpen(node.id);
      else if (node.kind === 'note' && propsRef.current.onEdit) propsRef.current.onEdit(node.id);
      else if (propsRef.current.onDetails) propsRef.current.onDetails(node.id);
      else propsRef.current.onSelect(node.id);
    },
    keyDown: (id, event) => { if (!keyboardMenu(event, 'node', id) && event.target === event.currentTarget) propsRef.current.onNodeKeyDown?.(id, event); },
    focus: id => setFocusedCard(id),
    open: id => propsRef.current.onOpen(id),
    details: id => (propsRef.current.onDetails ?? propsRef.current.onSelect)(id),
    toggleTask: id => propsRef.current.onToggleTask?.(id),
    contextMenu: (event, id) => contextMenu(event, 'node', id),
    branch: id => propsRef.current.onBranch(id),
    port: (id, targetPort) => {
      const source = propsRef.current.connectFrom;
      if (targetPort && source && source !== id) propsRef.current.onConnect(source, id); else propsRef.current.onStartConnect(id);
    },
    commit: (id, title, action) => propsRef.current.onEditCommit?.(id, title, action),
    dirty: (id, dirty) => propsRef.current.onEditDirtyChange?.(id, dirty),
  }), [contextMenu, keyboardMenu]);
  const selectEdge = useCallback((id: string) => { if (Date.now() >= suppressClickUntil.current) propsRef.current.onSelectEdge(id); }, []);
  const edgeDispatch = useMemo<EdgeDispatch>(() => ({
    select: selectEdge,
    remove: id => propsRef.current.onDeleteEdge?.(id),
    bend: (id, bend) => propsRef.current.onEdgeBend?.(id, bend),
    point,
    contextMenu: (event, id) => contextMenu(event, 'edge', id),
    keyboardMenu: (event, id) => keyboardMenu(event, 'edge', id),
    setBending: (id, active) => { if (active) { cancel(); bendingEdge.current = id; } else if (bendingEdge.current === id) bendingEdge.current = null; },
  }), [selectEdge, point, contextMenu, keyboardMenu, cancel]);
  const visibleNodes = nodes.filter(node => {
    if (capturedNodes.has(node.id) || props.inlineEdit?.nodeId === node.id || focusedCard === node.id) return true;
    const x = node.x * view.zoom + view.x, y = node.y * view.zoom + view.y;
    return x + node.width * view.zoom > -150 && x < size.width + 150 && y + node.height * view.zoom > -150 && y < size.height + 150;
  });
  const visibleSet = new Set(visibleNodes.map(node => node.id));
  const rovingId = props.inlineEdit?.nodeId ?? (selectedId && visibleSet.has(selectedId) ? selectedId : !props.selectedEdgeId && focusedCard && visibleSet.has(focusedCard) ? focusedCard : null);
  const detail = view.zoom > .52, miniature = view.zoom < .28;
  useLayoutEffect(() => { if (pendingFocus.current) focusCard(pendingFocus.current); }, [view, nodes, focusCard]);

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of edges) { counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1); counts.set(edge.targetId, (counts.get(edge.targetId) ?? 0) + 1); }
    return counts;
  }, [edges]);
  const taskProgress = useMemo(() => {
    const counts = new Map<string, TaskProgress>();
    for (const node of baseNodes) {
      const parentId = node.task?.parentId; if (!parentId || !baseNodeMap.has(parentId)) continue;
      const previous = counts.get(parentId) ?? { done: 0, total: 0 };
      counts.set(parentId, { done: previous.done + (node.task?.status === 'done' ? 1 : 0), total: previous.total + 1 });
    }
    return counts;
  }, [baseNodes, baseNodeMap]);
  const childCount = useMemo(() => { const counts = new Map<string, number>(); for (const node of doc.nodes) counts.set(node.boardId, (counts.get(node.boardId) ?? 0) + 1); return counts; }, [doc.nodes]);
  const projectMiniatures = useMemo(() => {
    const previews = new Map<string, ProjectMiniature>(), included = new Map<string, Set<string>>();
    for (const node of baseNodes) if (node.childBoardId) { previews.set(node.childBoardId, { nodes: [], edges: [] }); included.set(node.childBoardId, new Set()); }
    for (const node of doc.nodes) { const preview = previews.get(node.boardId); if (preview && preview.nodes.length < 80) { preview.nodes.push(node); included.get(node.boardId)!.add(node.id); } }
    for (const edge of doc.edges) { const preview = previews.get(edge.boardId), ids = included.get(edge.boardId); if (preview && ids?.has(edge.sourceId) && ids.has(edge.targetId)) preview.edges.push(edge); }
    return previews;
  }, [baseNodes, doc.nodes, doc.edges]);
  // Geometry is independent of the viewport. Dragging recomputes only incident edges.
  const baseEdgeDrawings = useMemo<EdgeDrawing[]>(() => edges.flatMap(edge => {
    const source = baseNodeMap.get(edge.sourceId), target = baseNodeMap.get(edge.targetId);
    return source && target ? [{ edge, source, target, geometry: connectionGeometry(source, target, edge) }] : [];
  }), [edges, baseNodeMap]);
  const edgeDrawings = useMemo(() => !moving ? baseEdgeDrawings : baseEdgeDrawings.map(drawing => {
    if (drawing.edge.sourceId !== moving.id && drawing.edge.targetId !== moving.id) return drawing;
    const source = nodeMap.get(drawing.edge.sourceId), target = nodeMap.get(drawing.edge.targetId);
    return source && target ? { ...drawing, source, target, geometry: connectionGeometry(source, target, drawing.edge) } : drawing;
  }), [baseEdgeDrawings, moving, nodeMap]);
  const visibleEdges = edgeDrawings.filter(({ edge, geometry }) => {
    if (props.selectedEdgeId === edge.id) return true;
    if (visibleSet.has(edge.sourceId) || visibleSet.has(edge.targetId)) return true;
    const bounds = geometry.bounds;
    return !(bounds.maxX * view.zoom + view.x < -100 || bounds.minX * view.zoom + view.x > size.width + 100 || bounds.maxY * view.zoom + view.y < -100 || bounds.minY * view.zoom + view.y > size.height + 100);
  });
  const signalIds = new Set<string>();
  if (motionAllowed) {
    const eligible = visibleEdges.filter(({ edge }) => edge.animated !== false);
    for (const matches of [
      (edge: GraphEdge) => edge.id === props.selectedEdgeId,
      (edge: GraphEdge) => edge.sourceId === selectedId,
      (edge: GraphEdge) => recentItems.edges.has(edge.id),
      (edge: GraphEdge) => edge.animated === true,
    ]) for (const { edge } of eligible) if (signalIds.size < 24 && matches(edge)) signalIds.add(edge.id);
  }

  return <div data-canvas data-motion={motionAllowed ? 'on' : 'off'} tabIndex={0} className={`canvas ${tool === 'hand' || space ? 'hand-mode' : ''} ${connectFrom ? 'connect-mode' : ''} ${dragOver ? 'is-dragover' : ''}`} ref={surface}
    onPointerDown={event => start(event)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}
    onLostPointerCapture={event => { if (pointers.current.has(event.pointerId)) cancel(); }}
    onContextMenu={event => { if (!(event.target as Element).closest('[data-node],[data-edge]')) contextMenu(event, 'canvas'); }}
    onKeyDown={event => { if (!(event.target as Element).closest('[data-node],[data-edge]')) keyboardMenu(event, 'canvas'); }}
    onDoubleClick={event => { if (Date.now() < suppressClickUntil.current || (event.target as Element).closest('[data-node],button,[data-edge]')) return; const at = point(event.clientX, event.clientY); propsRef.current.onCreate(at.x, at.y); }}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragOver(true); } }}
    onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragOver(false); }}
    onDrop={event => { event.preventDefault(); setDragOver(false); const files = Array.from(event.dataTransfer.files); if (files.length) propsRef.current.onDropFiles(files, point(event.clientX, event.clientY)); }}
    style={{ backgroundSize: `${28 * view.zoom}px ${28 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
    role="region" aria-label={L('بوم ایده‌ها؛ Enter برای ایدهٔ بعدی، Tab روی گره برای زیرشاخه؛ برای خروج از بوم Escape و سپس Tab بزنید.', 'Idea canvas; Enter for the next idea, Tab on a node for a child; press Escape then Tab to leave the canvas.')}>
    <div className="canvas-atmosphere" aria-hidden="true" />
    <div className={`canvas-world ${animating ? 'is-animating' : ''}`} style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.zoom})` }}>
      <svg className="connections" aria-label={L('ارتباط‌ها', 'Connections')}>{visibleEdges.map(drawing => <Connection key={drawing.edge.id} drawing={drawing} selected={props.selectedEdgeId === drawing.edge.id} dispatch={edgeDispatch} language={language} signal={signalIds.has(drawing.edge.id)} handleScale={props.selectedEdgeId === drawing.edge.id ? 1 / view.zoom : 1} canBend={!!props.onEdgeBend} canDelete={!!props.onDeleteEdge} />)}</svg>
      {visibleNodes.map(node => <NodeCard key={node.id} node={node} selected={selectedId === node.id} connecting={connectFrom === node.id} detail={detail} miniature={miniature} language={language} tabStop={rovingId === node.id}
        edit={props.inlineEdit?.nodeId === node.id ? props.inlineEdit : null} dispatch={cardDispatch} register={registerCard}
        entering={motionAllowed && recentItems.nodes.has(node.id)} canToggleTask={!!props.onToggleTask} taskDone={taskProgress.get(node.id)?.done ?? 0} taskTotal={taskProgress.get(node.id)?.total ?? 0}
        connectionCount={connectionCounts.get(node.id) ?? 0} projectCount={node.childBoardId ? childCount.get(node.childBoardId) ?? 0 : 0} projectMiniature={node.childBoardId ? projectMiniatures.get(node.childBoardId) ?? EMPTY_MINIATURE : EMPTY_MINIATURE} />)}
    </div>
    {nodes.length === 0 && <div className="canvas-empty"><div className="empty-orbit"><span /><span /><Plus size={26} /></div><h2>{L('این‌جا جای فکر بعدی توست.', 'Room for your next thought.')}</h2><p>{L('Enter بزن و فکرت را بنویس، یا اولین فایل را این‌جا رها کن.', 'Press Enter to write your thought, or drop your first file here.')}</p><button className="primary-button" onClick={() => propsRef.current.onCreate((size.width / 2 - view.x) / view.zoom, (size.height / 2 - view.y) / view.zoom)}><Plus size={17} />{L('اولین ایده', 'First idea')}</button></div>}
    {dragOver && <div className="drop-overlay"><div><Plus size={35} /><h2>{L('رها کن تا بخشی از فکرهایت شود', 'Drop it into your thinking')}</h2><p>{L('تصویر، ویدیو، صدا، PDF یا هر فایل دیگر', 'Images, videos, audio, PDFs, and other files')}</p></div></div>}
    <div className="canvas-coordinate" aria-hidden="true">{Math.round(-view.x / view.zoom)} , {Math.round(-view.y / view.zoom)}<span>∞</span></div>
  </div>;
});

interface NodeCardProps {
  node: GraphNode; selected: boolean; connecting: boolean; detail: boolean; miniature: boolean; language: Language; tabStop: boolean;
  edit: InlineEditSession | null; dispatch: CardDispatch; register: (id: string, element: HTMLElement | null) => void;
  connectionCount: number; projectCount: number; projectMiniature: ProjectMiniature;
  entering: boolean; canToggleTask: boolean; taskDone: number; taskTotal: number;
}
const NodeCard = memo(function NodeCard({ node, selected, connecting, detail, miniature, language, tabStop, edit, dispatch, register, connectionCount, projectCount, projectMiniature, entering, canToggleTask, taskDone, taskTotal }: NodeCardProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const Icon = kindIcons[node.kind], isProject = !!node.childBoardId;
  const status = node.task?.status, annotations = node.annotations?.length ?? 0;
  const kindLabel = node.task ? node.task.parentId ? L('ساب‌تسک', 'Subtask') : L('تسک', 'Task') : kindName(node.kind, language);
  const statusLabel = status === 'done' ? L('انجام شد', 'Done') : status === 'doing' ? L('در حال انجام', 'Doing') : L('انجام‌نشده', 'To do');
  const nextStatusLabel = status === 'todo' ? L('در حال انجام', 'Doing') : status === 'doing' ? L('انجام شد', 'Done') : L('انجام‌نشده', 'To do');
  const registerElement = useCallback((element: HTMLElement | null) => register(node.id, element), [node.id, register]);
  return <article data-node={node.id} ref={registerElement} className={`thought-node tone-${node.color} kind-${node.kind} appearance-${node.appearance ?? 'card'} ${selected ? 'selected' : ''} ${connecting ? 'connecting' : ''} ${detail ? 'detailed' : 'compact'} ${miniature ? 'miniature' : ''} ${isProject ? 'contains-project' : ''} ${edit ? 'is-inline-editing' : ''} ${status ? `has-task task-${status}` : ''} ${taskTotal ? 'has-task-progress' : ''} ${entering ? 'is-entering' : ''}`}
    style={{ left: node.x, top: node.y, width: node.width, height: node.height, '--node-accent': colors[node.color] } as React.CSSProperties}
    tabIndex={tabStop && !edit ? 0 : -1} role="button" aria-label={`${node.title || L('بدون عنوان', 'Untitled')} · ${kindLabel}${status ? ` · ${statusLabel}` : ''}`} aria-pressed={selected}
    onFocus={event => { if (event.target === event.currentTarget) dispatch.focus(node.id); }}
    onPointerDown={event => dispatch.pointerDown(event, node.id)} onDoubleClick={event => dispatch.doubleClick(event, node)} onKeyDown={event => dispatch.keyDown(node.id, event)} onContextMenu={event => dispatch.contextMenu(event, node.id)}>
    <div className="node-topline"><span className="node-kind"><Icon size={14} />{kindLabel}</span>{status ? <button type="button" className={`node-task-toggle status-${status}`} data-task-toggle={node.id} tabIndex={tabStop ? 0 : -1} disabled={!canToggleTask} aria-label={L(`وضعیت: ${statusLabel}؛ تغییر به ${nextStatusLabel}`, `Status: ${statusLabel}; change to ${nextStatusLabel}`)} aria-pressed={status === 'done' ? true : status === 'doing' ? 'mixed' : false} title={statusLabel} onClick={event => { event.stopPropagation(); dispatch.toggleTask(node.id); }}>{status === 'done' ? <Check size={13} /> : status === 'doing' ? <CircleDot size={13} /> : <Circle size={13} />}<span>{statusLabel}</span></button> : <span className="node-dot" />}</div>
    {detail && node.asset && node.kind === 'image' && <div className="node-image"><img src={node.asset.url} alt={node.title} loading="lazy" draggable={false} /></div>}
    {detail && node.asset && node.kind === 'video' && <div className="node-image node-video"><video src={node.asset.url} preload="metadata" muted playsInline /><span><Play size={20} fill="currentColor" /></span></div>}
    {edit ? <InlineTitleEditor key={`${node.id}:${edit.session}`} nodeId={node.id} savedTitle={node.title} edit={edit} language={language} dispatch={dispatch} /> : <h3 dir="auto" data-node-title>{node.title || L('بدون عنوان', 'Untitled')}</h3>}
    {detail && <>{isProject ? <ProjectPreview boardId={node.childBoardId!} miniature={projectMiniature} total={projectCount} language={language} /> : (!node.asset || !['image', 'video'].includes(node.kind)) && <p className="node-excerpt" dir="auto">{node.text || node.asset?.name || node.url || L('یک فکر تازه، یک امکان تازه.', 'A new thought. A new possibility.')}</p>}
      {node.kind === 'audio' && <div className="audio-wave" aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <i key={index} style={{ height: `${8 + Math.sin(index * 1.7) * 8 + ((index * 7) % 17)}px` }} />)}</div>}
      {node.kind === 'pdf' && <div className="pdf-label"><FileText size={16} /><span>PDF DOCUMENT</span></div>}
    </>}
    {detail && status && taskTotal > 0 && <div className="node-task-progress"><progress max={taskTotal} value={taskDone} aria-label={L(`${taskDone} از ${taskTotal} زیرکار انجام شده`, `${taskDone} of ${taskTotal} subtasks done`)} /><span>{taskDone}/{taskTotal} {L('انجام شد', 'done')}</span></div>}
    <div className="node-footer">{isProject ? <button className="open-project" tabIndex={tabStop ? 0 : -1} onClick={event => { event.stopPropagation(); dispatch.open(node.id); }}>{projectCount} {L('گره درون پروژه', 'nodes inside')}<ArrowUpRight size={14} /></button> : <span className="node-connection-count">{connectionCount} {L('ارتباط', 'connections')}</span>}
      <span className="node-footer-actions">
        {annotations > 0 && <button className="node-annotation-badge" tabIndex={tabStop ? 0 : -1} aria-label={L(`${annotations} یادداشت حاشیه‌ای؛ باز کردن جزئیات`, `${annotations} annotations; open details`)} title={L(`${annotations} یادداشت حاشیه‌ای`, `${annotations} annotations`)} onClick={event => { event.stopPropagation(); dispatch.details(node.id); }}><MessageSquareText size={12} /><span>{annotations}</span></button>}
        {selected && !edit && <button className="node-details" tabIndex={tabStop ? 0 : -1} title={L('جزئیات · Shift Enter', 'Details · Shift Enter')} aria-label={L(`جزئیات ${node.title}`, `Details for ${node.title}`)} onClick={event => { event.stopPropagation(); dispatch.details(node.id); }}>{L('جزئیات', 'Details')}</button>}
        <button className="node-branch" tabIndex={tabStop ? 0 : -1} aria-label={L(`افزودن زیرشاخه به ${node.title}`, `Add child to ${node.title}`)} title={L('زیرشاخهٔ تازه · Tab', 'New child · Tab')} onClick={event => { event.stopPropagation(); dispatch.branch(node.id); }}><Plus size={15} /></button>
      </span>
    </div>
    {(edit || (selected && tabStop)) && <div className="node-key-hint" aria-hidden="true"><span><kbd>Enter</kbd>{L('بعدی', 'next')}</span><span><kbd>Tab</kbd>{L('زیرشاخه', 'child')}</span>{edit && <span><kbd>Esc</kbd>{L('پایان', 'finish')}</span>}</div>}
    <button className="node-port port-right" tabIndex={tabStop ? 0 : -1} aria-label={L(`اتصال از ${node.title}`, `Connect from ${node.title}`)} title={L('اتصال به یک گره دیگر', 'Connect to another node')} onClick={event => { event.stopPropagation(); dispatch.port(node.id, false); }} />
    <button className="node-port port-left" tabIndex={tabStop ? 0 : -1} aria-label={L(`اتصال به ${node.title}`, `Connect to ${node.title}`)} onClick={event => { event.stopPropagation(); dispatch.port(node.id, true); }} />
  </article>;
});

function InlineTitleEditor({ nodeId, savedTitle, edit, language, dispatch }: { nodeId: string; savedTitle: string; edit: InlineEditSession; language: Language; dispatch: CardDispatch }) {
  const [value, setValue] = useState(edit.initialValue.slice(0, 500));
  const input = useRef<HTMLInputElement>(null);
  const originalTitle = useRef(savedTitle);
  const composing = useRef(false), committed = useRef(false), dirty = useRef(value !== savedTitle), blurredDuringComposition = useRef(false);
  const valueRef = useRef(value);
  const dispatchRef = useRef(dispatch);
  useLayoutEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  const commit = useCallback((action: InlineEditAction, fromDOM = false) => {
    if (committed.current) return;
    committed.current = true;
    const title = (fromDOM ? input.current?.value ?? valueRef.current : valueRef.current).slice(0, 500);
    if (dirty.current) { dirty.current = false; dispatchRef.current.dirty(nodeId, false); }
    dispatchRef.current.commit(nodeId, title, action);
  }, [nodeId]);
  useLayoutEffect(() => {
    const element = input.current; if (!element) return;
    element.focus({ preventScroll: true });
    if (edit.selectAll) element.select(); else element.setSelectionRange(element.value.length, element.value.length);
  }, [edit.session, edit.nodeId, edit.selectAll]);
  useEffect(() => {
    if (dirty.current) dispatchRef.current.dirty(nodeId, true);
    const visibility = () => { if (document.visibilityState === 'hidden' && !composing.current) commit('finish', true); };
    // Capture precedes the store's beforeunload listener; pagehide is a fallback.
    // Either also retains the latest DOM value if an IME was interrupted.
    const departing = () => commit('finish', true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', departing); window.addEventListener('beforeunload', departing, true);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', departing); window.removeEventListener('beforeunload', departing, true); };
  }, [commit, nodeId]);
  const change = (next: string) => {
    valueRef.current = next; setValue(next);
    const changed = next !== originalTitle.current;
    if (changed !== dirty.current) { dirty.current = changed; dispatchRef.current.dirty(nodeId, changed); }
  };
  return <div className="inline-title-editor">
    <input ref={input} data-inline-title data-inline-node={nodeId} value={value} dir="auto" maxLength={500} className="inline-title-input" autoComplete="off" autoCorrect="off" spellCheck={false}
      aria-label={language === 'fa' ? 'عنوان ایده؛ Enter برای بعدی و Tab برای زیرشاخه' : 'Idea title; Enter for next thought, Tab for child'}
      placeholder={language === 'fa' ? 'فکرت را بنویس…' : 'Write your thought…'}
      onChange={event => change(event.target.value)}
      onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
      onFocus={() => { blurredDuringComposition.current = false; }}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => {
        composing.current = false; change(event.currentTarget.value);
        if (blurredDuringComposition.current || document.visibilityState === 'hidden') commit('finish', true);
      }}
      onBlur={() => { if (composing.current) blurredDuringComposition.current = true; else commit('finish', true); }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.repeat && (event.key === 'Enter' || event.key === 'Tab')) { event.preventDefault(); event.stopPropagation(); return; }
        let action: InlineEditAction | null = null;
        if (event.key === 'Enter') action = event.shiftKey ? 'details' : 'sibling';
        else if (event.key === 'Tab') action = event.shiftKey ? 'parent' : 'child';
        else if (event.key === 'Escape') action = valueRef.current.trim() ? 'finish' : 'cancel';
        if (action) { event.preventDefault(); event.stopPropagation(); commit(action, true); }
      }} />
  </div>;
}

const ProjectPreview = memo(function ProjectPreview({ boardId, miniature, total, language }: { boardId: string; miniature: ProjectMiniature; total: number; language: Language }) {
  const drawing = useMemo(() => {
    if (miniature.nodes.length === 0) return null;
    const byId = new Map(miniature.nodes.map(node => [node.id, node]));
    const paths = miniature.edges.flatMap(edge => { const source = byId.get(edge.sourceId), target = byId.get(edge.targetId); return source && target ? [{ id: edge.id, edge, ...connectionGeometry(source, target, edge) }] : []; });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of miniature.nodes) { minX = Math.min(minX, node.x); minY = Math.min(minY, node.y); maxX = Math.max(maxX, node.x + node.width); maxY = Math.max(maxY, node.y + node.height); }
    for (const path of paths) { minX = Math.min(minX, path.bounds.minX); minY = Math.min(minY, path.bounds.minY); maxX = Math.max(maxX, path.bounds.maxX); maxY = Math.max(maxY, path.bounds.maxY); }
    const scale = Math.min(184 / Math.max(1, maxX - minX), 48 / Math.max(1, maxY - minY));
    return { paths, scale, x: 100 - (minX + maxX) * scale / 2, y: 30 - (minY + maxY) * scale / 2 };
  }, [miniature]);
  const label = language === 'fa' ? (total ? `نمای پروژه؛ ${Math.min(total, 80)} از ${total} گره` : 'پروژهٔ خالی؛ آمادهٔ اولین ایده') : (total ? `Project preview; ${Math.min(total, 80)} of ${total} nodes` : 'Empty project, ready for its first idea');
  return <div className="project-preview" aria-hidden="true"><svg viewBox="0 0 200 60" data-preview-board={boardId}><title>{label}</title>{drawing ? <g transform={`translate(${drawing.x} ${drawing.y}) scale(${drawing.scale})`}>
    {drawing.paths.map(path => <path key={path.id} data-preview-edge={path.id} d={path.d} vectorEffect="non-scaling-stroke" strokeWidth={.65} stroke={path.edge.color ? colors[path.edge.color] : undefined} strokeDasharray={path.edge.stroke === 'dashed' ? '3 2' : path.edge.stroke === 'dotted' ? '.5 2' : undefined} />)}
    {miniature.nodes.map(node => <rect key={node.id} data-preview-node={node.id} x={node.x} y={node.y} width={node.width} height={node.height} rx={Math.min(18, node.width / 8, node.height / 8)} fill={colors[node.color]} fillOpacity={node.childBoardId ? .32 : .17} stroke={colors[node.color]} strokeWidth={node.childBoardId ? 1 : .7} vectorEffect="non-scaling-stroke" />)}
  </g> : <g><rect x="80" y="16" width="40" height="28" rx="7" fill="none" strokeDasharray="3 3" opacity=".55" /><path d="M95 30 H105 M100 25 V35" /></g>}</svg></div>;
});
interface ConnectionProps { drawing: EdgeDrawing; selected: boolean; dispatch: EdgeDispatch; language: Language; signal: boolean; handleScale: number; canBend: boolean; canDelete: boolean; }
type BendGesture = { pointerId: number; element: SVGElement; origin: EdgePoint; handle: EdgePoint; clientX: number; clientY: number; moved: boolean };
const Connection = memo(function Connection({ drawing, selected, dispatch, language, signal, handleScale, canBend, canDelete }: ConnectionProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const { edge, source, target } = drawing;
  const [preview, setPreview] = useState<EdgePoint | null>(null);
  const previewRef = useRef<EdgePoint | null>(null), frame = useRef<number | null>(null);
  const drag = useRef<BendGesture | null>(null);
  const current = useRef({ drawing, dispatch });
  useLayoutEffect(() => { current.current = { drawing, dispatch }; }, [drawing, dispatch]);
  const geometry = useMemo(() => preview ? connectionGeometry(source, target, { ...edge, bend: preview }) : drawing.geometry, [preview, source, target, edge, drawing.geometry]);
  const { ax, ay, bx, by, d, midpoint } = geometry;
  const color = edge.color ? colors[edge.color] : selected ? 'var(--accent)' : 'var(--connection)';
  const signalColor = edge.color ? colors[edge.color] : 'var(--accent)';
  const width = edge.width ?? 2;
  const dash = edge.stroke === 'dashed' ? `${width + 7} ${width + 4}` : edge.stroke === 'dotted' ? `.01 ${Math.max(5, width * 2.4)}` : undefined;
  const phase = (edge.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 13) * .25;
  const clearDrag = useCallback((reset = true) => {
    const active = drag.current; drag.current = null; previewRef.current = null;
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    if (active) {
      try { if (active.element.hasPointerCapture(active.pointerId)) active.element.releasePointerCapture(active.pointerId); } catch { /* Capture can be lost when the board changes. */ }
      current.current.dispatch.setBending(current.current.drawing.edge.id, false);
    }
    if (reset) setPreview(null);
  }, []);
  useEffect(() => {
    const blur = () => clearDrag(); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('blur', blur); clearDrag(false); };
  }, [clearDrag]);
  useEffect(() => { if (selected) return () => clearDrag(); }, [selected, clearDrag]);
  const dragPoint = (event: React.PointerEvent<SVGElement>, active: BendGesture) => {
    const at = dispatch.point(event.clientX, event.clientY);
    return { x: active.handle.x + at.x - active.origin.x, y: active.handle.y + at.y - active.origin.y };
  };
  const finishDrag = (event: React.PointerEvent<SVGElement>) => {
    const active = drag.current; if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const next = dragPoint(event, active), moved = active.moved || Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) > 2;
    clearDrag();
    if (moved) dispatch.bend(edge.id, next);
  };
  return <g data-edge={edge.id} className={`connection ${selected ? 'selected' : ''} ${preview ? 'is-bending' : ''}`} style={{ '--edge-color': color } as React.CSSProperties}
    onClick={event => { event.stopPropagation(); if ((event.target as Element).closest('[data-edge-bend]')) return; event.currentTarget.focus({ preventScroll: true }); dispatch.select(edge.id); }}
    onContextMenu={event => { clearDrag(); dispatch.contextMenu(event, edge.id); }} role="button" tabIndex={selected ? 0 : -1}
    aria-label={`${L('ارتباط', 'Connection')}: ${source.title} → ${target.title}${edge.label ? ` · ${edge.label}` : ''}`} aria-pressed={selected}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (dispatch.keyboardMenu(event, edge.id) || event.target !== event.currentTarget || event.altKey) return;
      if (canDelete && (event.ctrlKey || event.metaKey) && event.key === 'Delete') { event.preventDefault(); event.stopPropagation(); dispatch.remove(edge.id); return; }
      if (event.ctrlKey || event.metaKey) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); dispatch.select(edge.id); }
      if (canDelete && (event.key === 'Delete' || event.key === 'Backspace')) { event.preventDefault(); event.stopPropagation(); dispatch.remove(edge.id); }
    }}>
    <path className="connection-hit" d={d} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 24 }} />
    <path className="connection-line" d={d} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={{ stroke: color, strokeWidth: width }} />
    <circle className="connection-endpoint" cx={ax} cy={ay} r={3} style={{ fill: color }} /><circle className="connection-endpoint" cx={bx} cy={by} r={3} style={{ fill: color }} />
    {signal && !preview && <circle className="connection-signal" r={2.25} aria-hidden="true" style={{ fill: signalColor, stroke: 'none' }}>
      <animateMotion path={d} dur="4.5s" begin={`-${phase}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;.7;.7;0" keyTimes="0;.12;.82;1" dur="4.5s" begin={`-${phase}s`} repeatCount="indefinite" />
    </circle>}
    {edge.label && <g className="connection-caption" transform={`translate(${midpoint.x},${midpoint.y - (selected && canBend ? 24 * handleScale : 0)})`}><rect x={-Math.min(100, edge.label.length * 4 + 12)} y="-13" width={Math.min(200, edge.label.length * 8 + 24)} height="26" rx="13" /><text textAnchor="middle" dominantBaseline="central">{edge.label.slice(0, 26)}</text></g>}
    {selected && canBend && <g data-edge-bend={edge.id} className="connection-bend-handle" transform={`translate(${midpoint.x} ${midpoint.y}) scale(${handleScale})`} role="button" tabIndex={0}
      aria-label={L('تغییر مسیر ارتباط؛ بکشید یا از کلیدهای جهت استفاده کنید؛ Delete مسیر را بازنشانی می‌کند.', 'Bend connection; drag or use arrow keys; Delete resets its path.')} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Delete Backspace"
      onClick={event => { event.preventDefault(); event.stopPropagation(); }}
      onPointerDown={event => {
        if (event.button !== 0 || drag.current) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.focus({ preventScroll: true });
        dispatch.setBending(edge.id, true);
        drag.current = { pointerId: event.pointerId, element: event.currentTarget, origin: dispatch.point(event.clientX, event.clientY), handle: { ...midpoint }, clientX: event.clientX, clientY: event.clientY, moved: false };
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Cancellation still restores the persisted path. */ }
      }}
      onPointerMove={event => {
        const active = drag.current; if (!active || active.pointerId !== event.pointerId) return;
        event.preventDefault(); event.stopPropagation();
        active.moved ||= Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) > 2;
        if (!active.moved) return;
        previewRef.current = dragPoint(event, active);
        if (frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; setPreview(previewRef.current); });
      }}
      onPointerUp={finishDrag}
      onPointerLeave={event => { if (drag.current?.pointerId === event.pointerId && !event.currentTarget.hasPointerCapture(event.pointerId)) clearDrag(); }}
      onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) { event.stopPropagation(); clearDrag(); } }}
      onLostPointerCapture={event => { if (drag.current?.pointerId === event.pointerId) clearDrag(); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        if (dispatch.keyboardMenu(event, edge.id) || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); event.stopPropagation(); clearDrag(); dispatch.bend(edge.id, null); return; }
        if (event.key === 'Escape' && drag.current) { event.preventDefault(); event.stopPropagation(); clearDrag(); return; }
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (direction) { event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 32 : 8; dispatch.bend(edge.id, { x: midpoint.x + direction[0] * step, y: midpoint.y + direction[1] * step }); }
      }}>
      <title>{L('مسیر را بکشید؛ Delete برای بازنشانی', 'Drag the path; Delete to reset')}</title>
      <circle className="connection-handle-hit" r={16} /><circle className="connection-handle-dot" r={5} />
    </g>}
  </g>;
});
export default memo(Canvas);
