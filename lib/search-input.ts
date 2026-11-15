/** Search keyboard intent is separate from the canvas Enter/Tab shortcuts. */
export function shouldActivateSearchResult(key: string, isComposing: boolean, keyCode: number, modifiers?: Readonly<{ altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }>): boolean {
  // Safari and some IMEs can emit Enter/229 while committing a composition.
  return key === 'Enter' && !isComposing && keyCode !== 229
    && !modifiers?.altKey && !modifiers?.ctrlKey && !modifiers?.metaKey && !modifiers?.shiftKey;
}

/** Never navigate to a stale deferred-query result immediately after typing. */
export function firstSearchResultForEnter<T>(
  typedQuery: string,
  displayedQuery: string,
  visiblePage: readonly T[],
  searchCurrentQuery: (query: string) => readonly T[],
): T | undefined {
  // Blank Search intentionally browses all workspace thoughts, but pressing
  // Enter without a search must not open an unrelated first node. In
  // particular, clearing a query can leave a stale deferred page briefly.
  if (!typedQuery.trim()) return undefined;
  return (typedQuery === displayedQuery ? visiblePage : searchCurrentQuery(typedQuery))[0];
}

/** Hide deferred-query results until they correspond to the visible input. */
export function visibleSearchResultsForQuery<T>(typedQuery: string, displayedQuery: string, visiblePage: readonly T[]): readonly T[] {
  return typedQuery === displayedQuery ? visiblePage : [];
}

/** Restore the user's visible page choice after the result set shrinks.
 * Ignore a temporarily stale deferred-query page while typing.
 */
export function searchOffsetCorrection(requestedOffset: number, resolvedOffset: number, queryPending: boolean): number | null {
  return queryPending || requestedOffset === resolvedOffset ? null : resolvedOffset;
}

/** Complete a search-result transition only if leaving the current canvas is
 * safe. A rejected inline-title commit must not close Search or select/reveal
 * an item on a board that was never opened. Pure UI orchestration, no writes. */
export function activateSearchResult<T>(
  target: T,
  navigate: (target: T) => boolean,
  select: (target: T) => void,
  closeSearch: () => void,
  reveal: (target: T) => void,
  isAvailable?: (target: T) => boolean,
): boolean {
  // A search hit can become stale after a local edit or a room revision.
  // Validate its identity before navigation, selection and dialog dismissal.
  if (isAvailable && !isAvailable(target)) return false;
  if (!navigate(target)) return false;
  select(target);
  closeSearch();
  reveal(target);
  return true;
}
