'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { CanvasHandle, InlineEditAction } from '@/components/Canvas';
import { getThoughtParent, insertThought, prepareThought, type ThoughtRelation } from '@/lib/flow';
import { patchNode } from '@/lib/node-features';
import type { GraphNode, Language, Workspace } from '@/lib/types';

interface FlowOptions {
  document: Workspace | null;
  boardId: string;
  language: Language;
  canvas: RefObject<CanvasHandle | null>;
  getDocument: () => Workspace | null;
  getUserId: () => string;
  update: (updater: (document: Workspace) => Workspace) => void;
  select: (id: string | null) => void;
  onStart: () => void;
  onDetails: (id: string) => void;
  notice: (message: string) => void;
}

interface ThoughtDraft {
  node: GraphNode;
  parentId: string | null;
  originId: string | null;
  existing: boolean;
  initialValue: string;
  selectAll: boolean;
  session: number;
  owner: string;
}

/** A new blank card is only a view draft. It enters history/storage once it has a title. */
export function useThoughtFlow(options: FlowOptions) {
  const current = useRef(options);
  current.current = options;
  const [draft, setDraft] = useState<ThoughtDraft | null>(null);
  const draftRef = useRef<ThoughtDraft | null>(null);
  const session = useRef(0);
  const [dirty, setDirty] = useState(false);
  const frame = useRef<number | null>(null);

  const replace = useCallback((next: ThoughtDraft | null) => {
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    draftRef.current = next;
    setDraft(next);
    setDirty(!!next && (next.existing ? next.initialValue !== next.node.title : !!next.initialValue.trim()));
  }, []);

  const reveal = useCallback((id: string | null, focus = true, minimumZoom = 0) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (id) current.current.canvas.current?.revealNode(id, focus, minimumZoom);
      else current.current.canvas.current?.focusSurface();
    });
  }, []);

  const beginFromDocument = useCallback((document: Workspace, sourceId: string | null, relation: ThoughtRelation, anchor?: { x: number; y: number }, initialValue = '', asTask = false) => {
    const config = current.current;
    const source = sourceId ? document.nodes.find(node => node.id === sourceId) : null;
    const boardId = source?.boardId ?? config.boardId;
    if (!document.boards.some(board => board.id === boardId)) return;
    const planned = prepareThought(document, boardId, sourceId, relation, {
      anchor: anchor ?? config.canvas.current?.getCenter(), language: config.language, asTask,
    });
    replace({ ...planned, originId: sourceId, existing: false, initialValue,
      selectAll: false, session: ++session.current, owner: config.getUserId() });
    config.onStart();
    config.select(planned.node.id);
  }, [replace]);

  const begin = useCallback((sourceId: string | null = null, relation: ThoughtRelation = 'sibling', anchor?: { x: number; y: number }, initialValue = '', asTask = false) => {
    const config = current.current;
    const document = config.getDocument();
    if (!document) return;
    try { beginFromDocument(document, sourceId, relation, anchor, initialValue, asTask); }
    catch (error) { config.notice(error instanceof Error ? error.message : String(error)); }
  }, [beginFromDocument]);

  const beginTask = useCallback((sourceId: string | null = null, relation: ThoughtRelation = 'sibling', anchor?: { x: number; y: number }) => begin(sourceId, relation, anchor, '', true), [begin]);

  const edit = useCallback((id: string, initialValue?: string) => {
    const config = current.current;
    const document = config.getDocument();
    const node = document?.nodes.find(item => item.id === id && item.boardId === config.boardId);
    if (!document || !node) return;
    replace({ node, parentId: getThoughtParent(document, id)?.id ?? null, originId: id,
      existing: true, initialValue: initialValue ?? node.title, selectAll: initialValue === undefined,
      session: ++session.current, owner: config.getUserId() });
    config.onStart();
    config.select(id);
  }, [replace]);

  const commit = useCallback((id: string, rawTitle: string, action: InlineEditAction) => {
    const config = current.current;
    const active = draftRef.current;
    if (!active || active.node.id !== id) return; // A previous editor's blur must not finish the next one.
    const document = config.getDocument();
    if (!document || active.owner !== config.getUserId() || !document.boards.some(board => board.id === active.node.boardId)) {
      replace(null);
      return;
    }
    const title = rawTitle.trim().slice(0, 500);
    const fromInput = typeof window !== 'undefined' && window.document.activeElement?.matches('[data-inline-title]');
    if (action === 'cancel' || (!active.existing && !title)) {
      // Enter/Tab on a blank draft is a no-op, not an endless chain of empty notes.
      if (!title && (action === 'sibling' || action === 'child')) {
        replace({ ...active, initialValue: '', selectAll: false, session: ++session.current });
        return;
      }
      replace(null);
      const target = action === 'parent' ? active.parentId : active.originId;
      config.select(target && document.nodes.some(node => node.id === target) ? target : null);
      if (fromInput) reveal(target);
      return;
    }

    let committed = document;
    let applied = false;
    try {
      config.update(latest => {
        applied = true;
        committed = latest;
        if (active.existing) {
          const original = latest.nodes.find(node => node.id === id);
          if (!original) return latest;
          committed = original.title === title ? latest : patchNode(latest, id, { title });
        } else {
          committed = insertThought(latest, { ...active.node, title }, active.parentId);
        }
        return committed;
      });
      if (!applied) {
        replace({ ...active, initialValue: rawTitle, selectAll: false, session: ++session.current });
        return;
      }
    } catch (error) {
      // Keep the entered text editable if a limit prevents the atomic commit.
      replace({ ...active, initialValue: rawTitle, selectAll: false, session: ++session.current });
      config.notice(error instanceof Error ? error.message : String(error));
      return;
    }
    replace(null);
    if (!committed.nodes.some(node => node.id === id)) return;
    config.select(id);
    if (action === 'sibling' || action === 'child') {
      try { beginFromDocument(committed, id, action); }
      catch (error) { config.notice(error instanceof Error ? error.message : String(error)); reveal(id); }
    } else if (action === 'parent') {
      const parent = getThoughtParent(committed, id);
      config.select(parent?.id ?? id);
      reveal(parent?.id ?? id);
    } else if (action === 'details') {
      config.onDetails(id);
    } else if (fromInput && window.document.visibilityState !== 'hidden') {
      reveal(id);
    }
  }, [replace, reveal, beginFromDocument]);

  const finish = useCallback(() => {
    const active = draftRef.current;
    if (!active) return true;
    const input = window.document.querySelector<HTMLInputElement>('[data-inline-title]');
    commit(active.node.id, input?.value ?? active.initialValue, 'finish');
    return draftRef.current === null;
  }, [commit]);
  const clear = useCallback(() => {
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    replace(null);
  }, [replace]);
  const onDirtyChange = useCallback((id: string, value: boolean) => {
    if (draftRef.current?.node.id === id) setDirty(value);
  }, []);

  useEffect(() => {
    if (!draft) return;
    if (draft.node.boardId !== options.boardId || draft.owner !== options.getUserId()
      || (draft.existing && !options.document?.nodes.some(node => node.id === draft.node.id))) {
      replace(null);
      return;
    }
    reveal(draft.node.id, false, 1);
  }, [draft, options.boardId, options.document, options.getUserId, replace, reveal]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const canvasDocument = useMemo(() => {
    const document = options.document;
    if (!document || !draft || draft.existing || draft.node.boardId !== options.boardId) return document;
    return { ...document, nodes: [...document.nodes, draft.node], edges: draft.parentId ? [...document.edges, {
      id: `draft-${draft.node.id}`, boardId: draft.node.boardId, sourceId: draft.parentId, targetId: draft.node.id, label: '',
    }] : document.edges };
  }, [options.document, options.boardId, draft]);
  const inlineEdit = useMemo(() => draft ? {
    nodeId: draft.node.id, initialValue: draft.initialValue, session: draft.session, selectAll: draft.selectAll,
  } : null, [draft]);

  return { begin, beginTask, edit, commit, finish, clear, onDirtyChange, canvasDocument, inlineEdit, editing: !!draft, dirty };
}
