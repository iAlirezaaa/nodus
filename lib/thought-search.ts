import type { GraphNode, Workspace } from './types';

export const SEARCH_PAGE_SIZE = 70;
export interface ThoughtSearchPage { visible: GraphNode[]; total: number; offset: number; }

/** Count all matches and return one bounded page, without mutating or saving the graph. */
export function searchThoughts(nodes: readonly GraphNode[], query: string, limit = SEARCH_PAGE_SIZE, offset = 0): ThoughtSearchPage {
  const needle = query.trim().toLocaleLowerCase();
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_PAGE_SIZE;
  let start = cap > 0 && Number.isFinite(offset) ? Math.floor(Math.max(0, offset) / cap) * cap : 0;
  const matches = (node: GraphNode) => !needle || (node.title + ' ' + node.text + ' ' + (node.asset?.name ?? '')).toLocaleLowerCase().includes(needle);
  const visible: GraphNode[] = [];
  let total = 0;
  for (const node of nodes) {
    if (!matches(node)) continue;
    if (total >= start && visible.length < cap) visible.push(node);
    total++;
  }
  // A document can shrink while a later page is open. Recover the last
  // non-empty page instead of showing an empty list with a positive total.
  if (cap > 0 && total > 0 && start >= total) {
    start = Math.floor((total - 1) / cap) * cap;
    let index = 0;
    for (const node of nodes) {
      if (!matches(node)) continue;
      if (index >= start && visible.length < cap) visible.push(node);
      index++;
    }
  }
  return { visible, total, offset: start };
}

/** Build full root-to-board locations with guards for malformed imported containment. */
export function buildBoardPaths(document: Pick<Workspace, 'boards' | 'nodes'>, untitled: string): Map<string, string> {
  const boardById = new Map(document.boards.map(board => [board.id, board]));
  const nodeBoardById = new Map(document.nodes.map(node => [node.id, node.boardId]));
  const paths = new Map<string, string>();
  for (const board of document.boards) {
    const pending: string[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined = board.id;
    while (cursor && boardById.has(cursor) && !paths.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      pending.push(cursor);
      const current: Workspace['boards'][number] = boardById.get(cursor)!;
      cursor = current.parentNodeId ? nodeBoardById.get(current.parentNodeId) : undefined;
    }
    let path = (cursor && paths.get(cursor)) || '';
    while (pending.length) {
      const id = pending.pop()!;
      const title = boardById.get(id)?.title.trim() || untitled;
      path = path ? path + ' / ' + title : title;
      paths.set(id, path);
    }
  }
  return paths;
}
