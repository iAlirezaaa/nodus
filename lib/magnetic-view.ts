import type { Workspace } from './types';

export interface MagneticPlacement {
  id: string;
  boardId: string;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

/** A magnetic view is local until explicitly applied as one guarded undo step. */
export function applyMagneticView(document: Workspace, boardId: string, placements: readonly MagneticPlacement[]): { document: Workspace; conflict: boolean } {
  if (!document.boards.some(board => board.id === boardId)) return { document, conflict: true };
  const nodes = new Map(document.nodes.map(node => [node.id, node]));
  const changes = new Map<string, MagneticPlacement>();
  for (const position of placements) {
    const node = nodes.get(position.id);
    if (!node || node.boardId !== boardId || position.boardId !== boardId || changes.has(position.id)
      || node.x !== position.baseX || node.y !== position.baseY
      || ![position.x, position.y].every(value => Number.isFinite(value) && Math.abs(value) <= 1e7)) return { document, conflict: true };
    changes.set(position.id, position);
  }
  let changed = false;
  const updated = document.nodes.map(node => {
    const at = changes.get(node.id);
    if (!at || (Math.abs(at.x - node.x) < .05 && Math.abs(at.y - node.y) < .05)) return node;
    changed = true;
    return { ...node, x: Math.round(at.x * 100) / 100, y: Math.round(at.y * 100) / 100 };
  });
  if (!changed) return { document, conflict: false };
  return { document: { ...document, nodes: updated, boards: document.boards.map(board => {
    if (board.id !== boardId || !board.layout) return board;
    const { layout: _layout, ...rest } = board;
    return rest;
  }) }, conflict: false };
}
