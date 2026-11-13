import type { GraphNode, Workspace } from './types';

export const SEARCH_PAGE_SIZE = 70;
export interface ThoughtSearchPage { visible: GraphNode[]; total: number; offset: number; }

/** Compare mixed Persian/Arabic keyboard spellings without rewriting saved content. */
function normalizeSearchText(value: string): string {
  const normalized = value.normalize('NFKC')
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/\u0643/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/\u200C/g, '')
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
  const phrase = rawQuery.match(/^(?:"([^"]*)"|“([^”]*)”|«([^»]*)»)$/u);
  const isPhrase = phrase !== null;
  // Normalize pasted line breaks/tabs only inside balanced quoted phrases.
  // Unquoted matching and saved graph data remain unchanged.
  const compareText = isPhrase
    ? (value: string) => normalizeSearchText(value).replace(/\s+/gu, ' ').trim()
    : normalizeSearchText;
  const needle = compareText(isPhrase ? (phrase[1] ?? phrase[2] ?? phrase[3]) : rawQuery);
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : SEARCH_PAGE_SIZE;
  let start = cap > 0 && Number.isFinite(offset) ? Math.floor(Math.max(0, offset) / cap) * cap : 0;
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
  const normalizedPaths = needle && boardPaths
    ? new Map(Array.from(boardPaths, ([id, path]) => {
      const normalized = compareText(path);
      return [id, { normalized, compact: compactNormalized(normalized) }] as const;
    }))
    : null;
  // Separators apply only to the fallback: exact titles and paths retain punctuation.
  const keywords = needle.split(/[\s,;،؛]+/u).filter(Boolean);
  const hasPersianKeywords = keywords.some(word => /[\u0600-\u06FF]/u.test(word));
  const ranked: GraphNode[][] = Array.from({ length: 9 }, () => []);
  const includes = (value: string, compactValue?: string): boolean =>
    value.includes(needle) ||
    (persianPhraseNeedle.length > 0 && foldPersianSpaces(value).includes(persianPhraseNeedle)) ||
    (compactNeedle.length > 0 && (compactValue ?? compactNormalized(value)).includes(compactNeedle));
  for (const node of nodes) {
    if (!needle) { ranked[0].push(node); continue; }
    const title = compareText(node.title);
    const compactTitle = compactNormalized(title);
    const foldedTitle = persianPhraseNeedle ? foldPersianSpaces(title) : '';
    const path = normalizedPaths?.get(node.boardId);
    let rank = -1;
    if (title === needle || (persianPhraseNeedle.length > 0 && foldedTitle === persianPhraseNeedle) || (compactNeedle.length > 0 && compactTitle === compactNeedle)) rank = 0;
    else if (title.startsWith(needle) || (persianPhraseNeedle.length > 0 && foldedTitle.startsWith(persianPhraseNeedle)) || (compactNeedle.length > 0 && compactTitle.startsWith(compactNeedle))) rank = 1;
    else if (includes(title, compactTitle)) rank = 2;
    else if (path && includes(path.normalized, path.compact)) rank = 3;
    else {
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
          // Decode destination text only for matching. Form-style + denotes
          // a space in query parameters, but remains literal in paths/fragments.
          // Never rewrite or fetch a saved URL.
          let decodedUrl = url;
          const queryAt = rawUrl.indexOf('?');
          const fragmentAt = rawUrl.indexOf('#');
          let comparableUrl = rawUrl;
          if (queryAt >= 0 && (fragmentAt < 0 || queryAt < fragmentAt)) {
            const queryEnd = fragmentAt >= 0 ? fragmentAt : rawUrl.length;
            comparableUrl = rawUrl.slice(0, queryAt + 1)
              + rawUrl.slice(queryAt + 1, queryEnd).replace(/\+/g, ' ')
              + rawUrl.slice(queryEnd);
          }
          if (comparableUrl !== rawUrl || rawUrl.includes('%')) {
            try { decodedUrl = compareText(decodeURIComponent(comparableUrl)); }
            catch { /* Malformed imported escapes still match their raw text. */ }
          }
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
