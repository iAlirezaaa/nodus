import type { GraphNode, Workspace } from './types';
import { parseQuotedSearchPhrase } from './search-phrase';
import { comparableSearchUrl } from './search-url-comparison';
import { hasExplicitSearchQuery } from './search-query-state';
import { anyAnnotationFieldMatches, annotationKeywordsMatch } from './search-annotations';

export const SEARCH_PAGE_SIZE = 70;
export interface ThoughtSearchPage { visible: GraphNode[]; total: number; offset: number; }

/** Compare mixed Persian/Arabic keyboard spellings without rewriting saved content. */
export function normalizeSearchText(value: string): string {
  const normalized = value.normalize('NFKC')
    // Arabic hamzated/wasla alef and plain Persian alef are equivalent for
    // finding ideas; preserve madda (آ) and all persisted spelling.
    .replace(/[\u0623\u0625\u0671]/g, 'ا')
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/\u0643/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    // Copied RTL/LTR directional marks alter display order, not search content.
    .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, '')
    .replace(/\u200C/g, '')
    // Some Persian/Arabic editors paste a zero-width JOINER between letters.
    // Ignore it only for Arabic-script word comparison: joined emoji (e.g.
    // woman technologist) and non-Arabic sequences must keep U+200D.
    .replace(/(?<=\p{Script=Arabic})\u200D(?=\p{Script=Arabic})/gu, '')
    // Invisible copy/paste separators must not break ordinary word search.
    // Preserve U+200D: it joins emoji sequences and is meaningful content.
    .replace(/[\u200B\u2060\uFEFF]/gu, '')
    // Arabic numeric percent, decimal and grouping marks equal their ASCII
    // counterparts in search comparisons; never rewrite stored strings.
    .replace(/\u066A/g, '%')
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit =>
      String.fromCharCode(48 + digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06F0 ? 0x06F0 : 0x0660)))
    // Case-fold independently of the viewer’s UI locale (e.g. Turkish I/ı).
    .toLowerCase();
  // Only normalize Latin-accent candidates: ordinary Persian and ASCII
  // searches should not pay for another full Unicode normalization pass.
  if (!/[\u00C0-\u024F\u1E00-\u1EFF\u0300-\u036F]/u.test(normalized)) return normalized;
  // Fold accents on Latin letters, not Greek/Arabic/other script marks.
  // This changes comparison strings only, never stored graph content.
  return normalized.normalize('NFKD').replace(/([a-z])[\u0300-\u036F]+/g, '$1').normalize('NFC');
}

/** Count all matches and return one bounded page, without mutating or saving the graph. */
export function searchThoughts(nodes: readonly GraphNode[], query: string, limit = SEARCH_PAGE_SIZE, offset = 0, boardPaths?: ReadonlyMap<string, string>): ThoughtSearchPage {
  const rawQuery = query.trim();
  // Balanced quotation marks request a contiguous phrase, not unordered
  // keywords assembled from unrelated title/note/file/project fields.
  const phrase = parseQuotedSearchPhrase(query);
  const isPhrase = phrase !== null;
  // Normalize pasted line breaks/tabs only inside balanced quoted phrases.
  // Unquoted matching and saved graph data remain unchanged.
  const compareText = isPhrase
    ? (value: string) => normalizeSearchText(value).replace(/\s+/gu, ' ').trim()
    : normalizeSearchText;
  const needle = compareText(isPhrase ? phrase : rawQuery);
  // An explicit query that normalizes to nothing must not become an
  // empty-query browse of every private thought in this workspace.
  // String.trim() treats U+FEFF as whitespace. An explicitly pasted
  // formatting-only query still means 'no matches', not 'browse everything'.
  if (hasExplicitSearchQuery(query) && !needle)
    return { visible: [], total: 0, offset: 0 };
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_PAGE_SIZE;
  let start = cap > 0 && Number.isFinite(offset) ? Math.floor(Math.max(0, offset) / cap) * cap : 0;
  if (!needle) {
    const total = nodes.length;
    if (total === 0) start = 0;
    else if (cap > 0 && start >= total) start = Math.floor((total - 1) / cap) * cap;
    return { visible: cap > 0 ? nodes.slice(start, start + cap) : [], total, offset: start };
  }
  // A board path and query are immutable during a search. Reuse their
  // normalized forms across all ranking tiers without touching saved text.
  const compactNormalized = (value: string) => value.replace(/[\s\/\\._-]+/g, '');
  const compactNeedle = isPhrase ? '' : compactNormalized(needle);
  // A Persian quoted phrase may be typed with spaces, ZWNJ or joined
  // spellings. Fold those boundaries for comparisons within each field only.
  // Latin word boundaries, punctuation and phrase order remain strict.
  const foldPersianSpaces = (value: string) =>
    value.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF0-9])/gu, '$1');
  const persianPhraseNeedle = isPhrase && /[\u0600-\u06FF]/u.test(needle)
    ? foldPersianSpaces(needle) : '';
  // A workspace can have thousands of nested or currently empty boards.
  // Only normalize locations belonging to encountered nodes, and do it once
  // per board even when a deep result page needs a second ranking pass.
  const normalizedPaths = boardPaths
    ? new Map<string, { normalized: string; compact: string } | null>()
    : null;
  const pathFor = (boardId: string) => {
    if (!normalizedPaths || !boardPaths) return undefined;
    if (normalizedPaths.has(boardId)) return normalizedPaths.get(boardId) ?? undefined;
    const raw = boardPaths.get(boardId);
    if (raw === undefined) {
      normalizedPaths.set(boardId, null);
      return undefined;
    }
    const normalized = compareText(raw);
    const path = { normalized, compact: compactNormalized(normalized) };
    normalizedPaths.set(boardId, path);
    return path;
  };
  // Separators apply only to the fallback: exact titles and paths retain punctuation.
  const keywords = needle.split(/[\s,;،؛]+/u).filter(Boolean);
  const hasPersianKeywords = keywords.some(word => /[\u0600-\u06FF]/u.test(word));
  // Count every hit, but keep only the prefix needed by the requested page.
  // Retaining every matching node defeats bounded paging on large projects.
  const tierCounts = Array<number>(10).fill(0);
  // Only the first page of each tier is cached. Deep-page results are
  // collected in a second pass after all tier sizes are known.
  const includes = (value: string, compactValue?: string): boolean =>
    value.includes(needle) ||
    (persianPhraseNeedle.length > 0 && foldPersianSpaces(value).includes(persianPhraseNeedle)) ||
    (compactNeedle.length > 0 && (compactValue ?? compactNormalized(value)).includes(compactNeedle));
  const rankNode = (node: GraphNode): number => {
    const title = compareText(node.title);
    const compactTitle = compactNormalized(title);
    // A direct title match outranks every project path. Avoid even reading
    // that path when its location cannot affect this thought's ranking.
    const directTitleRank = title === needle ? 0
      : title.startsWith(needle) ? 1
      : includes(title, compactTitle) ? 2
      : -1;
    const path = directTitleRank < 0 ? pathFor(node.boardId) : undefined;
    let rank = directTitleRank;
    if (rank < 0 && path && includes(path.normalized, path.compact)) rank = 3;
    if (rank < 0) {
      // Only normalize slower file/note/URL fields after title and path miss.
      // Cross-field and unordered-keyword tiers reuse the same values.
      const file = compareText(node.asset?.name ?? '');
      if (includes(file)) rank = 4;
      else {
        const note = compareText(node.text);
        if (includes(note)) rank = 5;
        else {
          // Saved link destinations are user content, too; searching for a
          // domain must find a link even when its title omits the address.
          const rawUrl = node.url ?? '';
          const url = compareText(rawUrl);
          const decodedUrl = compareText(comparableSearchUrl(rawUrl));
          if (includes(url) || (decodedUrl !== url && includes(decodedUrl))) rank = 6;
          else if (!isPhrase && (title + ' ' + note + ' ' + file).includes(needle)) rank = 7;
          else if (!isPhrase && keywords.length > 1) {
            const fields = [title, note, file, url, ...(decodedUrl !== url ? [decodedUrl] : []), path?.normalized ?? ''];
            const joinedFields = hasPersianKeywords
              ? fields.map(field => field.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF])/gu, '$1'))
              : [];
            if (keywords.every(word => fields.some(field => field.includes(word)) ||
              (/[\u0600-\u06FF]/u.test(word) && joinedFields.some(field => field.includes(word))))) rank = 8;
          }
        }
      }
    }
    // Comments and selected quotes are discoverable even when the note text
    // has since changed. Keep each field isolated for exact-phrase semantics
    // and leave prior title/path/notes ordering untouched.
    if (rank < 0 && anyAnnotationFieldMatches(node.annotations, value => {
      const text = compareText(value);
      return includes(text) || (!isPhrase && annotationKeywordsMatch(text, keywords));
    })) rank = 9;
    return rank;
  };
  const cached: GraphNode[][] = Array.from({ length: tierCounts.length }, () => []);
  for (const node of nodes) {
    const tier = rankNode(node);
    if (tier < 0) continue;
    tierCounts[tier]++;
    if (cached[tier].length < cap) cached[tier].push(node);
  }
  const total = tierCounts.reduce((count, size) => count + size, 0);
  // A stale page is not meaningful when the last matching thought disappears.
  if (total === 0) start = 0;
  else if (cap > 0 && start >= total) start = Math.floor((total - 1) / cap) * cap;
  // Determine the exact relevance-tier slices only after total counts are
  // known; even an out-of-range offset must not retain all matching nodes.
  const windows = tierCounts.map(() => ({ skip: 0, take: 0 }));
  let seen = 0;
  for (let tier = 0; tier < tierCounts.length; tier++) {
    const first = Math.max(start, seen);
    const end = Math.min(start + cap, seen + tierCounts[tier]);
    if (cap > 0 && end > first)
      windows[tier] = { skip: first - seen, take: end - first };
    seen += tierCounts[tier];
  }
  const requiresRescan = windows.some((window, tier) =>
    window.take > 0 && window.skip + window.take > cached[tier].length);
  let pageBuckets = cached;
  if (requiresRescan) {
    pageBuckets = Array.from({ length: tierCounts.length }, () => []);
    const indexes = Array<number>(tierCounts.length).fill(0);
    // Total matches are already counted. Stop ranking once every requested
    // tier window is full, instead of revisiting unrelated trailing thoughts.
    let remaining = windows.reduce((sum, window) => sum + window.take, 0);
    for (const node of nodes) {
      const tier = rankNode(node);
      if (tier < 0 || windows[tier].take === 0) continue;
      const position = indexes[tier]++;
      if (position >= windows[tier].skip &&
          position < windows[tier].skip + windows[tier].take) {
        pageBuckets[tier].push(node);
        if (--remaining === 0) break;
      }
    }
  }
  const visible: GraphNode[] = [];
  for (let tier = 0; tier < windows.length; tier++) {
    const { skip, take } = windows[tier];
    if (!take) continue;
    const first = requiresRescan ? 0 : skip;
    visible.push(...pageBuckets[tier].slice(first, first + take));
  }
  return { visible, total, offset: start };
}

/** Build full root-to-board locations with guards for malformed imported containment. */
export function buildBoardPaths(document: Pick<Workspace, 'boards' | 'nodes'>, untitled: string): Map<string, string> {
  const boardById = new Map(document.boards.map(board => [board.id, board]));
  const nodeById = new Map(document.nodes.map(node => [node.id, node]));
  const paths = new Map<string, string>();
  for (const board of document.boards) {
    const pending: string[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined = board.id;
    while (cursor && boardById.has(cursor) && !paths.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      pending.push(cursor);
      const current: Workspace['boards'][number] = boardById.get(cursor)!;
      // Containment must be reciprocal. A stale/forged parentNodeId is not a
      // license to label this board as belonging to a different root space.
      const owner = current.parentNodeId ? nodeById.get(current.parentNodeId) : undefined;
      cursor = owner?.childBoardId === current.id && boardById.has(owner.boardId)
        ? owner.boardId : undefined;
    }
    // Malformed imports may contain a reciprocal parent cycle. Treat every
    // cycle member as its own root rather than inventing order-dependent
    // ancestry; descendants outside the cycle still inherit their owner path.
    if (cursor && visited.has(cursor)) {
      const cycleStart = pending.indexOf(cursor);
      for (const id of pending.slice(cycleStart)) {
        paths.set(id, boardById.get(id)!.title.trim() || untitled);
      }
      pending.length = cycleStart;
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
