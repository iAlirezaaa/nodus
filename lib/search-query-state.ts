/** True when a user explicitly searched, even if trim() removes a pasted BOM.
 * Shared by the search engine and empty-state copy; never touches saved data.
 */
export function hasExplicitSearchQuery(query: string): boolean {
  return query.trim().length > 0 || /[\u200B\u2060\uFEFF]/u.test(query);
}
