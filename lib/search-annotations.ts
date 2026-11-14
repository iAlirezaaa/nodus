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
  return (annotations ?? []).some(annotation =>
    matchesField(annotation.quote) || matchesField(annotation.body));
}
