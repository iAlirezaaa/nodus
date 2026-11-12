import type { GraphNode, Workspace } from './types';

export const SEARCH_PAGE_SIZE = 70;
export interface ThoughtSearchPage { visible: GraphNode[]; total: number; }

/** Count every match while bounding the rendered page; never mutate the graph. */
export function searchThoughts(nodes: readonly GraphNode[], query: string, limit = SEARCH_PAGE_SIZE): ThoughtSearchPage {
  const needle = query.trim().toLocaleLowerCase();
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_PAGE_SIZE;
  const visible: GraphNode[] = [];
  let total = 0;
  for (const node of nodes) {
    if (needle && !(node.title + ' ' + node.text + ' ' + (node.asset?.name ?? '')).toLocaleLowerCase().includes(needle)) continue;
    total++;
    if (visible.length < cap) visible.push(node);
  }
  return { visible, total };
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
      const current = boardById.get(cursor)!;
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
