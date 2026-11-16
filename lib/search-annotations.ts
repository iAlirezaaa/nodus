/**
 * Look for a search hit within one annotation field at a time. An exact phrase
 * must never be assembled from a quote, another comment, or unrelated nodes.
 * Matching and normalization are supplied by the parent search; no data writes.
 */
export type SearchAnnotation = Readonly<{ quote: string; body: string }>;

export function anyAnnotationFieldMatches(
  annotations: readonly SearchAnnotation[] | null | undefined,
  matchesField: (text: string) => boolean,
): boolean {
  // A malformed older import must not hide unrelated valid comments.
  if (!Array.isArray(annotations)) return false;
  return annotations.some(annotation => annotation != null && (
    (typeof annotation.quote === 'string' && matchesField(annotation.quote)) ||
    (typeof annotation.body === 'string' && matchesField(annotation.body))));
}

/** Match unordered, already-normalized query words only inside one field.
 * A caller must not use this fallback for a balanced quoted exact phrase.
 * Do not concatenate a quote, comment or different annotations.
 */
export function annotationKeywordsMatch(field: string, keywords: readonly string[]): boolean {
  if (keywords.length < 2 || keywords.some(word => !word)) return false;
  // Match Persian joined/spaced compounds without changing the saved comment.
  const folded = field.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF])/gu, '$1');
  return keywords.every(word => field.includes(word) ||
    (/[\u0600-\u06FF]/u.test(word) && folded.includes(word)));
}
