import { makeNode, uid } from './graph.ts';
import { assertNodeFeatureMetadata, assertTaskParent } from './node-features.ts';
import type { GraphNode, Language, Workspace } from './types';

export type ThoughtRelation = 'child' | 'sibling';

const NODE_LIMIT = 5000;
const EDGE_LIMIT = 20000;
const COORDINATE_LIMIT = 1e7;
const HORIZONTAL_GAP = 104;
const VERTICAL_GAP = 48;
const CLEARANCE = 28;
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const KINDS = new Set(['note', 'image', 'video', 'audio', 'pdf', 'file', 'link', 'project']);
const COLORS = new Set(['sage', 'blue', 'amber', 'rose', 'violet', 'gray']);

function bounded(value: number): number {
  return Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, value));
}

function hasGeometry(node: GraphNode): boolean {
  return Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.width) && Number.isFinite(node.height) && node.width > 0 && node.height > 0;
}

/** Tasks use explicit ancestry; other thoughts use an incoming graph connection. */
export function getThoughtParent(document: Workspace, nodeId: string): GraphNode | null {
  const node = document.nodes.find(item => item.id === nodeId);
  if (!node) return null;
  const sameBoard = new Map(document.nodes.filter(item => item.boardId === node.boardId).map(item => [item.id, item]));
  if (node.task) {
    const parent = node.task.parentId ? sameBoard.get(node.task.parentId) : undefined;
    return parent?.task && parent.id !== node.id ? parent : null;
  }
  for (const edge of document.edges) {
    if (edge.targetId !== nodeId || edge.boardId !== node.boardId || edge.sourceId === nodeId) continue;
    const parent = sameBoard.get(edge.sourceId);
    if (parent) return parent;
  }
  return null;
}

/** Find a free vertical interval without making existing ideas jump as the user types. */
function freeInColumn(x: number, y: number, width: number, height: number, occupied: GraphNode[]): number | null {
  const blockers = occupied
    .filter(node => x < node.x + node.width + CLEARANCE && x + width + CLEARANCE > node.x)
    .sort((a, b) => a.y - b.y || a.height - b.height || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let below = bounded(y);
  for (const block of blockers) {
    if (block.y + block.height + CLEARANCE <= below) continue;
    if (block.y >= below + height + CLEARANCE) break;
    below = block.y + block.height + CLEARANCE;
    if (below > COORDINATE_LIMIT) break;
  }
  if (below <= COORDINATE_LIMIT) return below;

  // Near the coordinate boundary, look upward instead of producing an unsavable node.
  let above = bounded(y);
  const descending = [...blockers].sort((a, b) => (b.y + b.height) - (a.y + a.height));
  for (const block of descending) {
    if (block.y >= above + height + CLEARANCE) continue;
    if (block.y + block.height + CLEARANCE <= above) break;
    above = block.y - height - CLEARANCE;
    if (above < -COORDINATE_LIMIT) break;
  }
  return above >= -COORDINATE_LIMIT ? above : null;
}

function availablePosition(
  x: number,
  y: number,
  node: GraphNode,
  occupied: GraphNode[],
  direction: number,
): { x: number; y: number } {
  const preferredX = bounded(x);
  const stride = Math.max(node.width, ...occupied.map(item => item.width)) + HORIZONTAL_GAP;
  const tried = new Set<number>();
  // This is bounded even for a malformed or extraordinarily crowded imported board.
  for (let column = 0; column <= occupied.length + 1; column++) {
    for (const side of column === 0 ? [0] : [direction, -direction]) {
      const candidateX = bounded(preferredX + side * column * stride);
      if (tried.has(candidateX)) continue;
      tried.add(candidateX);
      const candidateY = freeInColumn(candidateX, y, node.width, node.height, occupied);
      if (candidateY !== null) return { x: candidateX, y: candidateY };
    }
  }
  throw new Error('There is no free space within this board’s supported coordinate range.');
}

function checkCapacity(document: Workspace, createsEdge: boolean): void {
  if (document.nodes.length >= NODE_LIMIT) throw new Error('This workspace has reached the 5,000-node limit.');
  if (document.edges.length + (createsEdge ? 1 : 0) > EDGE_LIMIT) throw new Error('This workspace has reached the 20,000-connection limit.');
}

/**
 * Plan an ephemeral, empty-title note. Anchor is the desired center when there is
 * no valid source on this board. No content or graph state is changed here.
 */
export function prepareThought(
  document: Workspace,
  boardId: string,
  sourceId: string | null,
  relation: ThoughtRelation,
  options: { anchor?: { x: number; y: number }; language?: Language; asTask?: boolean } = {},
): { node: GraphNode; parentId: string | null } {
  if (!document.boards.some(board => board.id === boardId)) throw new Error('The selected board no longer exists.');
  const source = sourceId ? document.nodes.find(item => item.id === sourceId && item.boardId === boardId) ?? null : null;
  const parent = source ? relation === 'child' ? source : getThoughtParent(document, source.id) : null;
  checkCapacity(document, parent !== null);
  const task = source?.task || options.asTask ? {
    status: 'todo' as const,
    parentId: source?.task ? relation === 'child' ? source.id : source.task.parentId : null,
  } : undefined;
  const node = makeNode(boardId, 'note', 0, 0, { title: '', text: '', color: source?.color ?? 'sage', ...(task ? { task } : {}) });
  const direction = (options.language ?? 'fa') === 'fa' ? -1 : 1;
  let x: number;
  let y: number;
  if (source) {
    if (relation === 'child') {
      x = direction > 0 ? source.x + source.width + HORIZONTAL_GAP : source.x - node.width - HORIZONTAL_GAP;
      y = source.y + (source.height - node.height) / 2;
    } else {
      x = source.x + (source.width - node.width) / 2;
      y = source.y + source.height + VERTICAL_GAP;
    }
  } else {
    const anchor = options.anchor ?? { x: 0, y: 0 };
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) throw new Error('The new thought needs a valid canvas position.');
    x = anchor.x - node.width / 2;
    y = anchor.y - node.height / 2;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('The source thought has an invalid canvas position.');
  const occupied = document.nodes.filter(item => item.boardId === boardId && hasGeometry(item));
  const position = availablePosition(x, y, node, occupied, direction);
  return { node: { ...node, ...position }, parentId: parent?.id ?? null };
}

function assertIdentifier(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) throw new Error(`${name} is not a valid identifier.`);
}

function assertText(value: unknown, name: string, maximum: number, nonempty = false): asserts value is string {
  if (typeof value !== 'string' || value.length > maximum || (nonempty && !value.trim())) throw new Error(`${name} is invalid or exceeds ${maximum} characters.`);
}

/** Only the new node is checked; the existing document was validated on load/save. */
function validateNewNode(node: GraphNode, document: Workspace): void {
  assertIdentifier(node.id, 'Thought ID');
  assertIdentifier(node.boardId, 'Board ID');
  if (!KINDS.has(node.kind)) throw new Error('This thought type is not supported.');
  if (!COLORS.has(node.color)) throw new Error('This thought color is not supported.');
  assertText(node.title, 'Thought title', 500);
  assertText(node.text, 'Thought text', 100000);
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || Math.abs(node.x) > COORDINATE_LIMIT || Math.abs(node.y) > COORDINATE_LIMIT) throw new Error('The thought position is outside the supported range.');
  if (!Number.isFinite(node.width) || !Number.isFinite(node.height) || node.width < 32 || node.width > 4096 || node.height < 32 || node.height > 4096) throw new Error('The thought size is outside the supported range.');
  assertText(node.createdAt, 'Creation date', 40, true);
  if (!Number.isFinite(Date.parse(node.createdAt))) throw new Error('The thought needs a valid creation date.');
  assertText(node.url, 'Thought link', 8192);
  if (node.url) {
    let url: URL;
    try { url = new URL(node.url); }
    catch { throw new Error('Thought links must use a valid http or https URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Thought links must use http or https and cannot contain credentials.');
  }
  if (node.asset !== null) {
    if (!node.asset || typeof node.asset !== 'object') throw new Error('The attached file is invalid.');
    assertIdentifier(node.asset.id, 'File ID');
    assertText(node.asset.name, 'File name', 512, true);
    assertText(node.asset.mime, 'File type', 128, true);
    if (!Number.isInteger(node.asset.size) || node.asset.size < 1 || node.asset.size > 25 * 1024 * 1024) throw new Error('Files must be nonempty and no larger than 25 MiB.');
    if (node.asset.url !== `/api/assets/${node.asset.id}`) throw new Error('The file URL does not match its attachment.');
  }
  if (node.childBoardId !== null) {
    assertIdentifier(node.childBoardId, 'Nested project ID');
    const child = document.boards.find(board => board.id === node.childBoardId);
    if (!child || child.parentNodeId !== node.id || document.nodes.some(item => item.childBoardId === child.id)) throw new Error('The nested project does not belong to this thought.');
    let containing = document.boards.find(board => board.id === node.boardId);
    const seen = new Set<string>();
    while (containing) {
      if (containing.id === child.id || seen.has(containing.id)) throw new Error('A project cannot contain itself.');
      seen.add(containing.id);
      const owner = document.nodes.find(item => item.id === containing!.parentNodeId);
      containing = owner ? document.boards.find(board => board.id === owner.boardId) : undefined;
    }
  }
  assertNodeFeatureMetadata(node);
  assertTaskParent(document, node);
}

/** Commit the note and its connection together, or throw without changing either. */
export function insertThought(document: Workspace, node: GraphNode, parentId: string | null): Workspace {
  checkCapacity(document, parentId !== null);
  if (!document.boards.some(board => board.id === node.boardId)) throw new Error('The selected board no longer exists.');
  if (document.nodes.some(item => item.id === node.id)) throw new Error('This thought has already been added.');
  const parent = parentId === null ? null : document.nodes.find(item => item.id === parentId);
  if (parentId !== null && (!parent || parent.boardId !== node.boardId || parentId === node.id)) throw new Error('The parent thought must exist on the same board.');
  validateNewNode(node, document);
  const storedNode = { ...node, asset: node.asset ? { ...node.asset } : null,
    ...(node.task ? { task: { ...node.task } } : {}),
    ...(node.annotations ? { annotations: node.annotations.map(annotation => ({ ...annotation })) } : {}),
  };
  return {
    ...document,
    nodes: [...document.nodes, storedNode],
    edges: parent ? [...document.edges, { id: uid(), boardId: node.boardId, sourceId: parent.id, targetId: node.id, label: '' }] : document.edges,
  };
}

/** Physical arrow directions; aligned rows/columns win, with a stable ID tie-break. */
export function findDirectionalNode(
  nodes: GraphNode[],
  currentId: string,
  direction: 'left' | 'right' | 'up' | 'down',
): string | null {
  const current = nodes.find(node => node.id === currentId);
  if (!current || !hasGeometry(current)) return null;
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  let winner: { id: string; beam: number; score: number; forward: number; cross: number } | null = null;
  for (const candidate of nodes) {
    if (candidate.id === currentId || candidate.boardId !== current.boardId || !hasGeometry(candidate)) continue;
    const dx = candidate.x + candidate.width / 2 - centerX;
    const dy = candidate.y + candidate.height / 2 - centerY;
    const forward = (horizontal ? dx : dy) * sign;
    if (forward <= 0) continue;
    const cross = Math.abs(horizontal ? dy : dx);
    const currentStart = horizontal ? current.y : current.x;
    const currentEnd = currentStart + (horizontal ? current.height : current.width);
    const candidateStart = horizontal ? candidate.y : candidate.x;
    const candidateEnd = candidateStart + (horizontal ? candidate.height : candidate.width);
    const crossGap = Math.max(0, Math.max(currentStart, candidateStart) - Math.min(currentEnd, candidateEnd));
    const primaryGap = Math.max(0, forward - ((horizontal ? current.width + candidate.width : current.height + candidate.height) / 2));
    const beam = crossGap === 0 ? 0 : 1;
    const score = primaryGap * primaryGap + 2 * crossGap * crossGap + .1 * cross * cross;
    if (!winner || beam < winner.beam || (beam === winner.beam && (score < winner.score || (score === winner.score && (forward < winner.forward || (forward === winner.forward && (cross < winner.cross || (cross === winner.cross && candidate.id < winner.id)))))))) {
      winner = { id: candidate.id, beam, score, forward, cross };
    }
  }
  return winner?.id ?? null;
}
