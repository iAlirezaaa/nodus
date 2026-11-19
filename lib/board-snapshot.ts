import type { Workspace } from './types';
import { pruneBoardZoneMembers } from './zones';

/** Sharing a board includes only its nested projects, never its sibling spaces. */
export function snapshotBoard(document: Workspace, boardId: string): Workspace {
  const root = document.boards.find(board => board.id === boardId);
  if (!root) throw new Error('The board is no longer available.');
  const byBoard = new Map<string, typeof document.nodes>();
  for (const node of document.nodes) {
    const list = byBoard.get(node.boardId) ?? [];
    list.push(node); byBoard.set(node.boardId, list);
  }
  const included = new Set<string>(), pending = [boardId];
  while (pending.length) {
    const id = pending.pop()!;
    if (included.has(id)) continue;
    included.add(id);
    for (const node of byBoard.get(id) ?? []) if (node.childBoardId) pending.push(node.childBoardId);
  }
  return {
    version: 1, homeBoardId: boardId,
    boards: document.boards.filter(board => included.has(board.id)).map(board => {
      const scoped = pruneBoardZoneMembers(board, new Set((byBoard.get(board.id) ?? []).map(node => node.id)));
      return board.id === boardId ? { ...scoped, parentNodeId: null } : scoped;
    }),
    nodes: document.nodes.filter(node => included.has(node.boardId)),
    edges: document.edges.filter(edge => included.has(edge.boardId)),
  };
}
