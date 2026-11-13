import type { GraphNode, Workspace } from './types';

export const SEARCH_PAGE_SIZE = 70;
export interface ThoughtSearchPage { visible: GraphNode[]; total: number; offset: number; }

/** Compare mixed Persian/Arabic keyboard spellings without rewriting saved content. */
function normalizeSearchText(value: string): string {
  return value.normalize('NFKC')
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/\u0643/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/\u200C/g, '')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit =>
      String.fromCharCode(48 + digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06F0 ? 0x06F0 : 0x0660)))
    .toLocaleLowerCase();
}

/** Ignore display separators in a comparison only; never rewrite saved titles. */
function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/[\s\/\\._-]+/g, '');
}

/** Count all matches and return one bounded page, without mutating or saving the graph. */
export function searchThoughts(nodes: readonly GraphNode[], query: string, limit = SEARCH_PAGE_SIZE, offset = 0, boardPaths?: ReadonlyMap<string, string>): ThoughtSearchPage {
  const needle = normalizeSearchText(query.trim());
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_PAGE_SIZE;
  let start = cap > 0 && Number.isFinite(offset) ? Math.floor(Math.max(0, offset) / cap) * cap : 0;
  // Normalize each board path once, not once per result. Paths are location
  // labels for this workspace only; they never become saved node content.
  const compactNeedle = compactSearchText(query.trim());
  const normalizedPaths = needle && boardPaths
    ? new Map(Array.from(boardPaths, ([id, path]) => {
      const normalized = normalizeSearchText(path);
      return [id, { normalized, compact: compactSearchText(path) }] as const;
    }))
    : null;
  const matches = (node: GraphNode) => {
    if (!needle) return true;
    // Preserve the existing exact text match, including its field boundaries.
    const existingText = normalizeSearchText(node.title + ' ' + node.text + ' ' + (node.asset?.name ?? ''));
    if (existingText.includes(needle)) return true;
    const path = normalizedPaths?.get(node.boardId);
    if (path?.normalized.includes(needle)) return true;
    // The fallback must NOT join unrelated title, note and asset fields.
    return compactNeedle.length > 0 && (
      [node.title, node.text, node.asset?.name].some(field => typeof field === 'string' && compactSearchText(field).includes(compactNeedle))
      || (path?.compact.includes(compactNeedle) ?? false)
    );
  };
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
