/**
 * Tokenize an unquoted search without treating punctuation around copied
 * individually quoted terms as part of each word.  Do not fold a single
 * balanced phrase here: the caller handles it as an exact search separately.
 * Apostrophes within a word (don't, L'atelier) remain meaningful characters.
 * Comparison-only; never modify a query or the source graph in storage.
 */
export function searchKeywords(normalizedQuery: string): string[] {
  return normalizedQuery
    .replace(/(^|[\s,;،؛])['‘’"“”„«»]+(?=[^\s,;،؛])/gu, '$1')
    .replace(/(?<=[^\s,;،؛])['‘’"“”„«»]+(?=$|[\s,;،؛])/gu, '')
    .split(/[\s,;،؛]+/u)
    .filter(Boolean);
}
