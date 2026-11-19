import type { GraphNode, NodeColor, TaskStatus, Workspace } from './types';
import { pruneBoardZoneMembers } from './zones';

export type SelectionPoint = { x: number; y: number };
export type SelectionRectangle = SelectionPoint & { width: number; height: number };
export type SelectedNodePatch = { color?: NodeColor; status?: TaskStatus | null };

const COLORS = new Set<NodeColor>(['sage', 'blue', 'amber', 'rose', 'violet', 'gray']);
const STATUSES = new Set<TaskStatus>(['todo', 'doing', 'done']);

/** Normalize every drag direction. Invalid coordinates produce an empty selection. */
export function selectionRectangle(a: SelectionPoint, b: SelectionPoint): SelectionRectangle {
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return { x: 0, y: 0, width: 0, height: 0 };
  const width = Math.abs(b.x - a.x), height = Math.abs(b.y - a.y);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width, height };
}

/** Any positive-area intersection counts; callers supply the visible projected geometry. */
export function nodesInSelection(
  nodes: readonly Pick<GraphNode, 'id' | 'x' | 'y' | 'width' | 'height'>[],
  rect: SelectionRectangle,
): string[] {
  const right = rect.x + rect.width, bottom = rect.y + rect.height;
  if (![rect.x, rect.y, rect.width, rect.height, right, bottom].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return [];
  const hits = new Set<string>();
  for (const node of nodes) {
    const nodeRight = node.x + node.width, nodeBottom = node.y + node.height;
    if (![node.x, node.y, node.width, node.height, nodeRight, nodeBottom].every(Number.isFinite) || node.width <= 0 || node.height <= 0) continue;
    if (node.x < right && nodeRight > rect.x && node.y < bottom && nodeBottom > rect.y) hits.add(node.id);
  }
  return [...hits];
}

/** Preserve selection order and toggle a hit only once, even if its ID is repeated. */
export function mergeNodeSelection(existing: readonly string[], hits: readonly string[], mode: 'replace' | 'add' | 'toggle'): string[] {
  if (mode === 'replace') return [...new Set(hits)];
  const selected = new Set(existing);
  for (const id of new Set(hits)) {
    if (mode === 'toggle' && selected.has(id)) selected.delete(id);
    else selected.add(id);
  }
  return [...selected];
}

function scopedSelection(document: Workspace, boardId: string, ids: readonly string[]): Set<string> {
  if (!ids.length || !document.boards.some(board => board.id === boardId)) return new Set();
  const requested = new Set(ids), selected = new Set<string>();
  for (const node of document.nodes) if (node.boardId === boardId && requested.has(node.id)) selected.add(node.id);
  return selected;
}

/** One immutable transaction for color/status edits, including task creation/removal. */
export function updateSelectedNodes(document: Workspace, boardId: string, ids: readonly string[], patch: SelectedNodePatch): Workspace {
  if (patch.color === undefined && patch.status === undefined) return document;
  const selected = scopedSelection(document, boardId, ids);
  if (!selected.size) return document;
  if (patch.color !== undefined && !COLORS.has(patch.color)) throw new Error('The node color is not supported.');
  if (patch.status !== undefined && patch.status !== null && !STATUSES.has(patch.status)) throw new Error('The task status is not supported.');
  const removedTasks = new Set<string>();
  if (patch.status === null) {
    for (const node of document.nodes) if (selected.has(node.id) && node.task) removedTasks.add(node.id);
  }
  let changed = false;
  const nodes = document.nodes.map(node => {
    let next = node;
    if (selected.has(node.id)) {
      if (patch.color !== undefined && patch.color !== next.color) next = { ...next, color: patch.color };
      if (patch.status === null && next.task) {
        next = { ...next };
        delete next.task;
      } else if (patch.status !== undefined && patch.status !== null && next.task?.status !== patch.status) {
        next = { ...next, task: { status: patch.status, parentId: next.task?.parentId ?? null } };
      }
    }
    if (next.task?.parentId && removedTasks.has(next.task.parentId)) next = { ...next, task: { ...next.task, parentId: null } };
    if (next !== node) changed = true;
    return next;
  });
  return changed ? { ...document, nodes } : document;
}

/**
 * Delete a selection as one transaction. Contained boards cascade, ordinary graph
 * neighbors survive, and remaining task children become independent tasks.
 * Indices keep overlapping selections and deep projects linear in document size.
 */
export function deleteSelectedNodes(document: Workspace, boardId: string, ids: readonly string[]): Workspace {
  const removedNodes = scopedSelection(document, boardId, ids);
  if (!removedNodes.size) return document;
  const removedBoards = new Set<string>();
  const byId = new Map(document.nodes.map(node => [node.id, node]));
  const boardIds = new Set(document.boards.map(board => board.id));
  const boardNodes = new Map<string, string[]>();
  const ownedBoards = new Map<string, string[]>();
  for (const node of document.nodes) {
    const group = boardNodes.get(node.boardId) ?? [];
    group.push(node.id); boardNodes.set(node.boardId, group);
  }
  for (const board of document.boards) {
    if (!board.parentNodeId) continue;
    const group = ownedBoards.get(board.parentNodeId) ?? [];
    group.push(board.id); ownedBoards.set(board.parentNodeId, group);
  }
  const queue = [...removedNodes];
  const removeBoard = (id: string) => {
    // Defensive against imported containment cycles, including a reference home.
    if (id === document.homeBoardId || removedBoards.has(id) || !boardIds.has(id)) return;
    removedBoards.add(id);
    for (const nodeId of boardNodes.get(id) ?? []) {
      if (removedNodes.has(nodeId)) continue;
      removedNodes.add(nodeId); queue.push(nodeId);
    }
  };
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const owned of ownedBoards.get(id) ?? []) removeBoard(owned);
    const childBoard = byId.get(id)?.childBoardId;
    if (childBoard) removeBoard(childBoard);
  }
  const nodes: GraphNode[] = [];
  for (const node of document.nodes) {
    if (removedNodes.has(node.id) || removedBoards.has(node.boardId)) continue;
    let next = node.childBoardId && removedBoards.has(node.childBoardId) ? { ...node, childBoardId: null } : node;
    if (next.task?.parentId && removedNodes.has(next.task.parentId)) next = { ...next, task: { ...next.task, parentId: null } };
    nodes.push(next);
  }
  const edges = document.edges.filter(edge => !removedBoards.has(edge.boardId) && !removedNodes.has(edge.sourceId) && !removedNodes.has(edge.targetId));
  const survivingBoards = removedBoards.size ? document.boards.filter(board => !removedBoards.has(board.id)) : document.boards;
  let zonesChanged = false;
  const boards = survivingBoards.map(board => {
    if (!board.zones?.length) return board;
    const next = pruneBoardZoneMembers(board, new Set((boardNodes.get(board.id) ?? []).filter(id => !removedNodes.has(id))));
    if (next !== board) zonesChanged = true;
    return next;
  });
  return {
    ...document,
    boards: zonesChanged ? boards : survivingBoards,
    nodes,
    edges: edges.length === document.edges.length ? document.edges : edges,
  };
}
