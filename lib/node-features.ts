import type { GraphNode, NodeAnnotation, TaskStatus, Workspace } from './types';

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const STATUSES = new Set(['todo', 'doing', 'done']);
const APPEARANCES = new Set(['card', 'sticky', 'outline']);
const COLORS = new Set(['sage', 'blue', 'amber', 'rose', 'violet', 'gray']);
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validDate(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= 40 && Number.isFinite(Date.parse(value));
}

/** Shared by incremental client mutations and the authoritative save validator. */
export function assertNodeFeatureMetadata(node: Pick<GraphNode, 'title' | 'text' | 'task' | 'appearance' | 'annotations'>): void {
  if (node.appearance !== undefined && !APPEARANCES.has(node.appearance)) throw new Error('The node appearance is not supported.');
  if (node.task !== undefined) {
    if (!object(node.task) || !STATUSES.has(node.task.status as string)
      || (node.task.parentId !== null && (typeof node.task.parentId !== 'string' || !ID.test(node.task.parentId)))) {
      throw new Error('A task needs a supported status and a valid parent identifier or null.');
    }
  }
  if (node.annotations === undefined) return;
  if (!Array.isArray(node.annotations) || node.annotations.length > 200) throw new Error('A node supports up to 200 annotations.');
  const ids = new Set<string>();
  for (const annotation of node.annotations) {
    if (!object(annotation) || typeof annotation.id !== 'string' || !ID.test(annotation.id)) throw new Error('An annotation needs a valid identifier.');
    if (ids.has(annotation.id)) throw new Error('Annotation identifiers must be unique within their node.');
    ids.add(annotation.id);
    if (annotation.field !== 'title' && annotation.field !== 'text') throw new Error('Annotations must refer to the title or text.');
    const content = node[annotation.field];
    const quoteLimit = annotation.field === 'title' ? 500 : 100000;
    if (typeof annotation.quote !== 'string' || !annotation.quote.length || annotation.quote.length > quoteLimit) throw new Error('The selected annotation quote is empty or too long.');
    if (typeof annotation.body !== 'string' || annotation.body.length > 10000) throw new Error('Annotation comments support up to 10,000 characters.');
    if (!COLORS.has(annotation.color as string) || typeof annotation.resolved !== 'boolean'
      || (annotation.orphaned !== undefined && typeof annotation.orphaned !== 'boolean')) throw new Error('Annotation color and state are invalid.');
    if (!validDate(annotation.createdAt) || !validDate(annotation.updatedAt)) throw new Error('Annotations need valid creation and update dates.');
    if (!Number.isInteger(annotation.start) || !Number.isInteger(annotation.end)
      || annotation.start < 0 || annotation.end < annotation.start || annotation.end > content.length) {
      throw new Error('Annotation positions must be bounded integer offsets within their source field.');
    }
    if (!annotation.orphaned && (annotation.end === annotation.start || content.slice(annotation.start, annotation.end) !== annotation.quote)) {
      throw new Error('An attached annotation must match its exact selected quote.');
    }
  }
}

/** Validate a changed task's ancestry without interpreting ordinary graph edges. */
export function assertTaskParent(document: Workspace, node: GraphNode): void {
  if (!node.task || node.task.parentId === null) return;
  const nodes = new Map(document.nodes.map(item => [item.id, item]));
  const seen = new Set<string>([node.id]);
  let parentId: string | null = node.task.parentId;
  while (parentId !== null) {
    if (seen.has(parentId)) throw new Error('Task parents cannot form a cycle.');
    seen.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent?.task || parent.boardId !== node.boardId) throw new Error('A task parent must be another task on the same board.');
    parentId = parent.task.parentId;
  }
}

/**
 * Preserve anchored text through an unambiguous edit. A changed/deleted quote is
 * retained as an orphan; searching for identical text elsewhere could attach a
 * comment to the wrong occurrence. Repeated-character edit alignments are also
 * treated conservatively. Previously orphaned comments never silently reattach.
 */
export function reanchorAnnotations(
  annotations: NodeAnnotation[],
  field: NodeAnnotation['field'],
  before: string,
  after: string,
  now = new Date().toISOString(),
): NodeAnnotation[] {
  if (before === after || !annotations.some(annotation => annotation.field === field)) return annotations;
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  // Deliberately allow overlap with the prefix. Overlap detects several equally
  // valid insertion/deletion positions in repeated text such as "echo echo".
  let suffix = 0;
  while (suffix < before.length && suffix < after.length && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const delta = after.length - before.length;
  const changedStart = Math.min(prefix, before.length - suffix, after.length - suffix);
  const changedEnd = Math.max(before.length - suffix, prefix + Math.max(0, -delta));
  let changed = false;
  const next = annotations.map(annotation => {
    if (annotation.field !== field) return annotation;
    let start = annotation.start, end = annotation.end;
    let orphaned = annotation.orphaned === true;
    const validAnchor = Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start
      && end <= before.length && before.slice(start, end) === annotation.quote;
    if (!orphaned && validAnchor) {
      if (end <= changedStart) { /* The edit is entirely after the quote. */ }
      else if (start >= changedEnd) { start += delta; end += delta; }
      else orphaned = true;
      if (!orphaned && after.slice(start, end) !== annotation.quote) orphaned = true;
    } else orphaned = true;
    if (orphaned) {
      start = clamp(Number.isFinite(start) ? start : 0, 0, after.length);
      end = clamp(Number.isFinite(end) ? end : start, start, after.length);
    }
    if (start === annotation.start && end === annotation.end && orphaned === (annotation.orphaned === true)) return annotation;
    changed = true;
    return { ...annotation, start, end, ...(orphaned ? { orphaned: true } : {}), updatedAt: now };
  });
  return changed ? next : annotations;
}

/** Patch node content and its annotations together; keep a contained board's name in sync. */
export function patchNode(document: Workspace, id: string, patch: Partial<GraphNode>): Workspace {
  const original = document.nodes.find(node => node.id === id);
  if (!original) return document;
  if ((patch.id !== undefined && patch.id !== id) || (patch.boardId !== undefined && patch.boardId !== original.boardId)) {
    throw new Error('A content edit cannot change a node’s identifier or containing board.');
  }
  if (Object.entries(patch).every(([key, value]) => Object.is(original[key as keyof GraphNode], value))) return document;
  const next: GraphNode = { ...original, ...patch };
  if (typeof next.title !== 'string' || next.title.length > 500 || typeof next.text !== 'string' || next.text.length > 100000) throw new Error('Node title or text exceeds its supported length.');
  if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || Math.abs(next.x) > 1e7 || Math.abs(next.y) > 1e7) throw new Error('Node coordinates must be finite and within the supported canvas range.');
  if (!Number.isFinite(next.width) || !Number.isFinite(next.height) || next.width < 32 || next.width > 4096 || next.height < 32 || next.height > 4096) throw new Error('Node dimensions must be between 32 and 4096.');
  if (next.annotations) {
    let annotations = next.annotations;
    if (next.title !== original.title) annotations = reanchorAnnotations(annotations, 'title', original.title, next.title);
    if (next.text !== original.text) annotations = reanchorAnnotations(annotations, 'text', original.text, next.text);
    next.annotations = annotations;
  }
  if (next.task === undefined) delete next.task;
  if (next.appearance === undefined) delete next.appearance;
  if (next.annotations === undefined) delete next.annotations;
  assertNodeFeatureMetadata(next);
  if (next.task?.parentId !== original.task?.parentId) assertTaskParent(document, next);
  const removedTask = !!original.task && !next.task;
  return {
    ...document,
    nodes: document.nodes.map(node => node.id === id ? next
      : removedTask && node.task?.parentId === id ? { ...node, task: { ...node.task, parentId: null } } : node),
    boards: next.title !== original.title && next.childBoardId
      ? document.boards.map(board => board.id === next.childBoardId ? { ...board, title: next.title } : board)
      : document.boards,
  };
}

export function convertToTask(document: Workspace, id: string): Workspace {
  const node = document.nodes.find(item => item.id === id);
  return !node || node.task ? document : patchNode(document, id, { task: { status: 'todo', parentId: null } });
}

export function setTaskStatus(document: Workspace, id: string, status: TaskStatus): Workspace {
  if (!STATUSES.has(status)) throw new Error('The task status is not supported.');
  const node = document.nodes.find(item => item.id === id);
  return !node?.task || node.task.status === status ? document : patchNode(document, id, { task: { ...node.task, status } });
}

export function removeTask(document: Workspace, id: string): Workspace {
  const node = document.nodes.find(item => item.id === id);
  return !node?.task ? document : patchNode(document, id, { task: undefined });
}

export interface TaskProgress { done: number; total: number; percent: number; }
export function taskProgress(document: Workspace, id: string): TaskProgress {
  const root = document.nodes.find(node => node.id === id);
  if (!root?.task) return { done: 0, total: 0, percent: 0 };
  const children = new Map<string, GraphNode[]>();
  for (const node of document.nodes) {
    if (!node.task?.parentId || node.boardId !== root.boardId) continue;
    const group = children.get(node.task.parentId) ?? [];
    group.push(node); children.set(node.task.parentId, group);
  }
  const seen = new Set([id]);
  const queue = [...(children.get(id) ?? [])];
  let done = 0, total = 0;
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index];
    if (seen.has(node.id)) continue;
    seen.add(node.id); total++;
    if (node.task?.status === 'done') done++;
    queue.push(...(children.get(node.id) ?? []));
  }
  return { done, total, percent: total ? Math.round(done * 100 / total) : 0 };
}
