import { uid } from './graph';
import { pruneBoardZoneMembers } from './zones';
import type { Board, Language, Workspace } from './types';

export interface PersonalSpaceInfo {
  /** The root first, followed by all boards contained in that space. */
  boardIds: string[];
  nodeCount: number;
  /** Contained project boards; the root space itself is not a project. */
  projectCount: number;
}

/** Inspect only a root space. Board ownership keeps unrelated roots out of the subtree. */
export function inspectPersonalSpace(document: Workspace, rootBoardId: string): PersonalSpaceInfo | null {
  const root = document.boards.find(board => board.id === rootBoardId);
  if (!root || root.parentNodeId !== null) return null;

  const nodeBoards = new Map(document.nodes.map(node => [node.id, node.boardId]));
  const children = new Map<string, string[]>();
  for (const board of document.boards) {
    if (board.parentNodeId === null) continue;
    const parentBoardId = nodeBoards.get(board.parentNodeId);
    if (!parentBoardId || parentBoardId === board.id) continue;
    const group = children.get(parentBoardId) ?? [];
    group.push(board.id);
    children.set(parentBoardId, group);
  }

  const included = new Set([rootBoardId]);
  const boardIds = [rootBoardId];
  for (let index = 0; index < boardIds.length; index++) {
    for (const childId of children.get(boardIds[index]) ?? []) {
      if (included.has(childId)) continue;
      included.add(childId);
      boardIds.push(childId);
    }
  }
  let nodeCount = 0;
  for (const node of document.nodes) if (included.has(node.boardId)) nodeCount++;
  return { boardIds, nodeCount, projectCount: boardIds.length - 1 };
}

/**
 * One immutable document edit for a personal root and its contained projects.
 * Missing/nested targets are identity no-ops. Asset references in the previous
 * document remain available to undo; this helper never deletes stored files.
 */
export function deletePersonalSpace(document: Workspace, rootBoardId: string, language: Language = 'fa'): Workspace {
  const space = inspectPersonalSpace(document, rootBoardId);
  if (!space) return document;
  const removedBoards = new Set(space.boardIds);
  const removedNodes = new Set<string>();
  for (const node of document.nodes) if (removedBoards.has(node.boardId)) removedNodes.add(node.id);

  const available = new Set(document.nodes.filter(node => !removedNodes.has(node.id)).map(node => node.id));
  const boards = document.boards.filter(board => !removedBoards.has(board.id)).map(board => pruneBoardZoneMembers(board, available));
  const nodes = document.nodes.filter(node => !removedNodes.has(node.id)).map(node => {
    // Valid workspaces cannot point across roots, but a stale reference must not
    // become a dangling task or project pointer after removing its destination.
    let next = node.childBoardId && removedBoards.has(node.childBoardId) ? { ...node, childBoardId: null } : node;
    if (next.task?.parentId && removedNodes.has(next.task.parentId)) next = { ...next, task: { ...next.task, parentId: null } };
    return next;
  });
  const edges = document.edges.filter(edge => !removedBoards.has(edge.boardId) && !removedNodes.has(edge.sourceId) && !removedNodes.has(edge.targetId));
  let home = boards.find(board => board.id === document.homeBoardId && board.parentNodeId === null)
    ?? boards.find(board => board.parentNodeId === null);
  if (!home) {
    const blank: Board = {
      id: uid(), title: language === 'fa' ? 'فضای فکر تازه' : 'New thinking space',
      description: '', parentNodeId: null, createdAt: new Date().toISOString(),
    };
    boards.push(blank);
    home = blank;
  }
  return { ...document, homeBoardId: home.id, boards, nodes, edges };
}
