import type { GraphEdge, GraphNode } from './types';

/** Read-only neighborhood pagination. All thoughts remain in the actual graph and editable. */
export interface GraphSpotlight {
  focusId: string;
  nodeIds: ReadonlySet<string>;
  edgeIds: ReadonlySet<string>;
  neighborCount: number;
  page: number;
  pageCount: number;
  shown: number;
}
export function graphSpotlight(
  nodes: readonly GraphNode[], edges: readonly GraphEdge[], focusId: string | null,
  requestedPage = 0, pageSize = 10,
): GraphSpotlight | null {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const focus = focusId ? byId.get(focusId) : undefined;
  if (!focus) return null;
  const neighbors = new Set<string>();
  const add = (id: string) => { if (id !== focusId && byId.has(id)) neighbors.add(id); };
  for (const edge of edges) {
    if (edge.boardId !== focus.boardId) continue;
    if (edge.sourceId === focusId) add(edge.targetId);
    if (edge.targetId === focusId) add(edge.sourceId);
  }
  for (const node of nodes) {
    if (node.task?.parentId === focusId) add(node.id);
    if (focus.task?.parentId === node.id) add(node.id);
  }
  const ordered = [...neighbors].sort((a, b) => {
    const left = byId.get(a)!, right = byId.get(b)!;
    return left.title.localeCompare(right.title) || a.localeCompare(b);
  });
  const limit = Math.max(1, Math.min(30, Math.floor(pageSize) || 10));
  const pageCount = Math.max(1, Math.ceil(ordered.length / limit));
  const page = Math.min(pageCount - 1, Math.max(0, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const displayed = ordered.slice(page * limit, (page + 1) * limit);
  const nodeIds = new Set([focusId!, ...displayed]);
  const edgeIds = new Set(edges.filter(edge => edge.boardId === focus.boardId &&
    ((edge.sourceId === focusId && nodeIds.has(edge.targetId)) || (edge.targetId === focusId && nodeIds.has(edge.sourceId))))
    .map(edge => edge.id));
  return { focusId: focusId!, nodeIds, edgeIds, neighborCount: ordered.length, page, pageCount, shown: displayed.length };
}
