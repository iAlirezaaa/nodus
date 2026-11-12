'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createMagneticSimulation, reheatMagneticSimulation, stepMagneticSimulation, updateMagneticSettings, type MagneticPoint, type MagneticSettings } from '@/lib/magnetic-layout';
import type { MagneticPlacement } from '@/lib/magnetic-view';
import type { GraphEdge, GraphNode, Workspace } from '@/lib/types';

type Point = { x: number; y: number };
type Simulation = ReturnType<typeof createMagneticSimulation>;
export interface MagneticViewState { status: 'running' | 'settled' | 'paused'; dirty: boolean; pinnedCount: number; persistenceError: boolean; }
interface Options {
  scope: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  points: MagneticPoint[];
  settings: MagneticSettings;
  blocked: boolean;
  motionAllowed: boolean;
  dragging: { id: string; x: number; y: number } | null;
}
interface Model { scope: string; nodes: Map<string, GraphNode>; simulation: Simulation | null; pins: Set<string>; }
interface Snapshot { scope: string; positions: Map<string, Point>; pinned: Set<string>; active: boolean; dirty: boolean; }
const emptySnapshot = (scope: string): Snapshot => ({ scope, positions: new Map(), pinned: new Set(), active: false, dirty: false });
const keyFor = (scope: string) => `nodus:magnetic-view:v1:${encodeURIComponent(scope)}`;
const storedCoordinate = (value: number) => Math.round(Math.max(-1e7, Math.min(1e7, Number.isFinite(value) ? value : 0)) * 100) / 100;

export function useMagneticCanvas(options: Options) {
  const latest = useRef(options); latest.current = options;
  const model = useRef<Model>({ scope: '', nodes: new Map(), simulation: null, pins: new Set() });
  const [snapshot, setSnapshot] = useState<Snapshot>(() => emptySnapshot(''));
  const [wake, setWake] = useState(0);
  const [persistenceError, setPersistenceError] = useState(false);
  const frame = useRef<number | null>(null);
  const dragIdentity = useRef<string | null>(null);
  const stop = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  const capture = useCallback(() => {
    const current = model.current;
    const positions = new Map<string, Point>(); let dirty = false;
    for (const [id, body] of current.simulation?.bodies ?? []) {
      const node = current.nodes.get(id); if (!node) continue;
      const x = storedCoordinate(body.x - node.width / 2);
      const y = storedCoordinate(body.y - node.height / 2);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      positions.set(id, { x, y });
      if (Math.abs(x - node.x) > .5 || Math.abs(y - node.y) > .5) dirty = true;
    }
    setSnapshot({ scope: current.scope, positions, pinned: new Set(current.pins), active: !!current.simulation?.active, dirty });
  }, []);
  const persist = useCallback(() => {
    const current = model.current;
    if (!current.scope) return;
    const positions: MagneticPlacement[] = [];
    for (const [id, body] of current.simulation?.bodies ?? []) {
      const node = current.nodes.get(id); if (!node) continue;
      positions.push({ id, boardId: node.boardId, baseX: node.x, baseY: node.y,
        x: storedCoordinate(body.x - node.width / 2), y: storedCoordinate(body.y - node.height / 2) });
    }
    try { localStorage.setItem(keyFor(current.scope), JSON.stringify({ version: 1, positions, pins: [...current.pins] })); setPersistenceError(false); }
    catch { setPersistenceError(true); }
  }, []);

  // Text edits do not rebuild or reheat the force graph. Only topology and physical
  // bounds enter this key, keeping typing cheap even in a large workspace.
  const geometryKey = useMemo(() => JSON.stringify([options.points.map(p => [p.id,p.x,p.y,p.radius,p.mass]), options.edges.map(e => [e.sourceId,e.targetId]), options.nodes.map(n => [n.id,n.width,n.height,n.task?.parentId])]), [options.points, options.edges, options.nodes]);
  useEffect(() => {
    stop();
    const { scope, nodes, points, edges, settings } = latest.current;
    const previous = model.current;
    const changedScope = previous.scope !== scope;
    if (changedScope) persist();
    const base = new Map(nodes.map(node => [node.id, node]));
    const pins = new Set(changedScope ? [] : [...previous.pins].filter(id => base.has(id)));
    const restored = new Map<string, MagneticPlacement>();
    if (changedScope && scope) try {
      const saved = JSON.parse(localStorage.getItem(keyFor(scope)) ?? 'null');
      if (saved?.version === 1 && Array.isArray(saved.positions) && saved.positions.length <= 5000) {
        for (const p of saved.positions) {
          const node = base.get(p?.id);
          if (node && p.boardId === node.boardId && p.baseX === node.x && p.baseY === node.y && [p.x,p.y].every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e7)) restored.set(p.id, p);
        }
        if (Array.isArray(saved.pins)) for (const id of saved.pins) if (typeof id === 'string' && base.has(id)) pins.add(id);
      }
    } catch { /* A damaged or unavailable personal view never changes the graph. */ }
    const shouldCreate = settings.enabled || (!changedScope && !!previous.simulation) || restored.size > 0 || pins.size > 0;
    const seeded = points.map(point => {
      const node = base.get(point.id), prior = previous.nodes.get(point.id), body = !changedScope ? previous.simulation?.bodies.get(point.id) : undefined;
      const saved = restored.get(point.id);
      if (body && node && prior && node.x === prior.x && node.y === prior.y) return { ...point, x: body.x, y: body.y };
      if (saved && node) return { ...point, x: saved.x + node.width / 2, y: saved.y + node.height / 2 };
      return point;
    });
    const links = [...edges, ...nodes.filter(n => n.task?.parentId).map(n => ({ sourceId: n.task!.parentId!, targetId: n.id }))];
    model.current = { scope, nodes: base, pins, simulation: shouldCreate ? createMagneticSimulation(seeded, links, settings, changedScope ? undefined : previous.simulation ?? undefined) : null };
    capture(); setWake(value => value + 1);
  }, [options.scope, geometryKey, capture, persist, stop]);

  useEffect(() => {
    const current = model.current;
    if (!current.simulation && options.settings.enabled) {
      const { nodes, edges, points, scope, settings } = latest.current;
      current.scope = scope; current.nodes = new Map(nodes.map(n => [n.id,n]));
      current.simulation = createMagneticSimulation(points, [...edges,...nodes.filter(n => n.task?.parentId).map(n => ({sourceId:n.task!.parentId!,targetId:n.id}))], settings);
    } else if (current.simulation) updateMagneticSettings(current.simulation, options.settings);
    capture(); setWake(value => value + 1);
  }, [options.settings.enabled, options.settings.attraction, options.settings.repulsion, options.settings.center, options.settings.distance, capture]);

  useEffect(() => {
    stop();
    if (!options.settings.enabled || options.blocked || !options.motionAllowed || !model.current.simulation?.active) { persist(); return; }
    let previous = 0;
    const tick = (now: number) => {
      frame.current = null;
      const config = latest.current, current = model.current;
      if (!current.simulation || current.scope !== config.scope || !config.settings.enabled || config.blocked || !config.motionAllowed) return;
      const interval = config.nodes.length > 1200 ? 1000 / 15 : config.nodes.length > 150 ? 1000 / 30 : 1000 / 60;
      if (previous && now - previous < interval - 1) { frame.current = requestAnimationFrame(tick); return; }
      const dt = previous ? now - previous : 1000 / 60; previous = now;
      const held = new Map<string, Point>();
      for (const id of current.pins) { const body = current.simulation.bodies.get(id); if (body) held.set(id, {x:body.x,y:body.y}); }
      if (config.dragging) { const node = current.nodes.get(config.dragging.id); if (node) held.set(node.id, { x: config.dragging.x + node.width / 2, y: config.dragging.y + node.height / 2 }); }
      const active = stepMagneticSimulation(current.simulation, dt, held);
      capture();
      if (active) frame.current = requestAnimationFrame(tick); else persist();
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [options.scope, options.settings.enabled, options.blocked, options.motionAllowed, wake, capture, persist, stop]);

  useEffect(() => {
    const started = (options.dragging?.id ?? null) !== dragIdentity.current;
    dragIdentity.current = options.dragging?.id ?? null;
    const simulation = model.current.simulation;
    if (!options.dragging || !simulation || (!started && simulation.active)) return;
    // A held pointer can outlive the cooling burst. Moving it again must wake
    // its neighbors even though the pointer and dragged node have not changed.
    reheatMagneticSimulation(simulation); setWake(value => value + 1);
  }, [options.dragging?.id,options.dragging?.x,options.dragging?.y]);
  useEffect(() => {
    const departing = () => persist();
    const visibility = () => { if (document.hidden) persist(); };
    window.addEventListener('pagehide', departing); window.addEventListener('beforeunload', departing); document.addEventListener('visibilitychange', visibility);
    return () => { stop(); persist(); window.removeEventListener('pagehide', departing); window.removeEventListener('beforeunload', departing); document.removeEventListener('visibilitychange', visibility); };
  }, [persist, stop]);

  const reheat = useCallback(() => { if (model.current.simulation) { reheatMagneticSimulation(model.current.simulation); capture(); setWake(v => v + 1); } }, [capture]);
  const reset = useCallback((preservePins = false) => {
    stop(); const current = model.current; current.simulation = null;
    if (!preservePins) current.pins.clear();
    try { if (current.scope) localStorage.removeItem(keyFor(current.scope)); } catch { setPersistenceError(true); }
    capture();
  }, [capture, stop]);
  const togglePin = useCallback((id: string) => {
    const current = model.current; if (!current.nodes.has(id)) return;
    if (current.pins.has(id)) current.pins.delete(id); else current.pins.add(id);
    if (current.simulation) reheatMagneticSimulation(current.simulation);
    capture(); persist(); setWake(v => v + 1);
  }, [capture, persist]);
  const getPlacements = useCallback((): MagneticPlacement[] => {
    const current = model.current; if (current.scope !== latest.current.scope) return [];
    return [...current.simulation?.bodies ?? []].flatMap(([id,body]) => {
      const node = current.nodes.get(id); return node ? [{ id, boardId: node.boardId, baseX: node.x, baseY: node.y, x: storedCoordinate(body.x - node.width / 2), y: storedCoordinate(body.y - node.height / 2) }] : [];
    });
  }, []);
  const positionDocument = useCallback((document: Workspace): Workspace => {
    const placements = new Map(getPlacements().map(p => [p.id,p]));
    if (!placements.size) return document;
    return { ...document, nodes: document.nodes.map(node => { const p = placements.get(node.id); return p && p.boardId === node.boardId ? { ...node, x: p.x, y: p.y } : node; }) };
  }, [getPlacements]);
  const current = snapshot.scope === options.scope ? snapshot : emptySnapshot(options.scope);
  const positionedNodes = useMemo(() => options.nodes.map(node => { const p = current.positions.get(node.id); return p && (p.x !== node.x || p.y !== node.y) ? { ...node, x:p.x, y:p.y } : node; }), [options.nodes,current.positions]);
  const status: MagneticViewState['status'] = !options.settings.enabled || options.blocked || !options.motionAllowed ? 'paused' : current.active ? 'running' : 'settled';
  return { nodes: positionedNodes, pinned: current.pinned, hasPositions: current.positions.size > 0,
    status, dirty: current.dirty, pinnedCount: current.pinned.size, persistenceError, reheat, reset, togglePin, getPlacements, positionDocument };
}
