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
