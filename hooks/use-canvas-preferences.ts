'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CANVAS_DESIGN, DEFAULT_LAYOUT_OPTIONS, type CanvasDesign, type LayoutOptions } from '@/lib/layouts';
import type { Language } from '@/lib/types';

interface Preferences { key: string; design: CanvasDesign; layout: LayoutOptions; applied: boolean; }
function defaults(key: string): Preferences { return { key, design: { ...DEFAULT_CANVAS_DESIGN }, layout: { ...DEFAULT_LAYOUT_OPTIONS }, applied: false }; }
function read(key: string): Preferences {
  const result = defaults(key);
  if (!key) return result;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved?.version !== 1) return result;
    const d = saved.design ?? {}, l = saved.layout ?? {};
    if (['neuron','cards'].includes(d.nodeStyle)) result.design.nodeStyle = d.nodeStyle;
    if (['dots','grid','none'].includes(d.background)) result.design.background = d.background;
    if (['compact','comfortable','spacious'].includes(d.density)) result.design.density = d.density;
    if (['sage','blue','amber','rose','violet','gray'].includes(d.accent)) result.design.accent = d.accent;
    if (typeof d.connectionLabels === 'boolean') result.design.connectionLabels = d.connectionLabels;
    if (['neural','tree','orbit','grid','timeline','kanban'].includes(l.kind)) result.layout.kind = l.kind;
    if (['created','title','kind','color','status'].includes(l.sort)) result.layout.sort = l.sort;
    if (['asc','desc'].includes(l.direction)) result.layout.direction = l.direction;
    if (typeof l.spacing === 'number' && Number.isFinite(l.spacing)) result.layout.spacing = Math.max(24, Math.min(240, l.spacing));
    result.applied = saved.applied === true;
  } catch { /* The current view remains usable without saved preferences. */ }
  return result;
}
export function useCanvasPreferences(scope: string, language: Language) {
  const key = scope ? `nodus:canvas-design:v1:${encodeURIComponent(scope)}` : '';
  const [state, setState] = useState<Preferences>(() => defaults(''));
  const [persistenceError, setPersistenceError] = useState(false);
  const latest = useRef(state);
  useEffect(() => { const next = read(key); latest.current = next; setState(next); setPersistenceError(false); }, [key]);
  const current = state.key === key ? state : defaults(key);
  const write = useCallback((change: Partial<Preferences>) => {
    const previous = latest.current.key === key ? latest.current : read(key);
    const next = { ...previous, ...change, key }; latest.current = next; setState(next);
    if (key) try { localStorage.setItem(key, JSON.stringify({ version: 1, design: next.design, layout: next.layout, applied: next.applied })); setPersistenceError(false); }
    catch { setPersistenceError(true); }
  }, [key]);
  const setDesign = useCallback((design: CanvasDesign) => write({ design }), [write]);
  const setLayout = useCallback((layout: LayoutOptions) => write({ layout, applied: true }), [write]);
  const layout = useMemo(() => ({ ...current.layout, language }), [current.layout, language]);
  return { design: current.design, layout, hasLayout: current.applied, persistenceError, setDesign, setLayout };
}
