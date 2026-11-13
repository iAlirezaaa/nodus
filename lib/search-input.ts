/** Search keyboard intent is separate from the canvas Enter/Tab shortcuts. */
export function shouldActivateSearchResult(key: string, isComposing: boolean, keyCode: number): boolean {
  // Safari and some IMEs can emit Enter/229 while committing a composition.
  return key === 'Enter' && !isComposing && keyCode !== 229;
}

/** Never navigate to a stale deferred-query result immediately after typing. */
export function firstSearchResultForEnter<T>(
  typedQuery: string,
  displayedQuery: string,
  visiblePage: readonly T[],
  searchCurrentQuery: (query: string) => readonly T[],
): T | undefined {
  return (typedQuery === displayedQuery ? visiblePage : searchCurrentQuery(typedQuery))[0];
}
