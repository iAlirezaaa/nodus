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
  // The document's insertion order is not a useful relevance ranking on busy
  // boards: a matching title must not be buried under hundreds of note hits.
  // Eight stable buckets retain original order among equally useful results.
  // The final fallback finds all keywords in any order, beneath phrase matches.
  const keywords = needle.split(/\s+/u).filter(Boolean);
  const ranked: GraphNode[][] = Array.from({ length: 8 }, () => []);
  const hit = (field: string | undefined, compact = true): boolean =>
    typeof field === 'string' && (normalizeSearchText(field).includes(needle) ||
      (compact && compactNeedle.length > 0 && compactSearchText(field).includes(compactNeedle)));
  for (const node of nodes) {
    if (!needle) { ranked[0].push(node); continue; }
    const title = normalizeSearchText(node.title);
    const compactTitle = compactSearchText(node.title);
    const titleIsExact = title === needle || (compactNeedle.length > 0 && compactTitle === compactNeedle);
    const titleStarts = title.startsWith(needle) || (compactNeedle.length > 0 && compactTitle.startsWith(compactNeedle));
    const path = normalizedPaths?.get(node.boardId);
    let rank = -1;
    if (titleIsExact) rank = 0;
    else if (titleStarts) rank = 1;
    else if (hit(node.title)) rank = 2;
    else if (path?.normalized.includes(needle) || (compactNeedle.length > 0 && path?.compact.includes(compactNeedle))) rank = 3;
    else if (hit(node.asset?.name)) rank = 4;
    else if (hit(node.text)) rank = 5;
    // Maintain the preexisting exact cross-field query behavior, without
    // inventing new *compact* matches across unrelated fields.
    else if (normalizeSearchText(node.title + ' ' + node.text + ' ' + (node.asset?.name ?? '')).includes(needle)) rank = 6;
    else if (keywords.length > 1) {
      // A thought can be found even when people remember its words in a
      // different order or across title, notes, attachment and project path.
      // This only reads fields from the supplied workspace; it never joins
      // separate thoughts or writes to the underlying document.
      const fields = [title, normalizeSearchText(node.text), normalizeSearchText(node.asset?.name ?? ''), path?.normalized ?? ''];
      // Only join Persian letters separated by spaces inside a single field.
      // Preserve punctuation so split Latin fragments cannot fabricate hits.
      const hasPersian = keywords.some(word => /[\u0600-\u06FF]/u.test(word));
      const joinedFields = hasPersian
        ? fields.map(field => field.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF])/gu, '$1'))
        : [];
      if (keywords.every(word => fields.some(field => field.includes(word)) ||
        (/[\u0600-\u06FF]/u.test(word) && joinedFields.some(field => field.includes(word))))) rank = 7;
    }
    if (rank >= 0) ranked[rank].push(node);
  }
  const total = ranked.reduce((count, bucket) => count + bucket.length, 0);
  if (cap > 0 && total > 0 && start >= total) start = Math.floor((total - 1) / cap) * cap;
  const visible: GraphNode[] = [];
  let seen = 0;
  for (const bucket of ranked) {
    if (cap > 0 && visible.length < cap && start < seen + bucket.length) {
      const first = Math.max(0, start - seen);
      visible.push(...bucket.slice(first, first + cap - visible.length));
    }
    seen += bucket.length;
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
