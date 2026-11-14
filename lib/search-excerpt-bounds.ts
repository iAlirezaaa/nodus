/** Keep search-result snippets within a 96-code-unit budget without splitting
 * a UTF-16 surrogate pair at either edge. This never edits the original text. */
export function searchExcerptBounds(text: string, desiredStart: number): { start: number; end: number } {
  let start = Math.max(0, Math.min(text.length, desiredStart));
  const isLowSurrogate = (index: number) => {
    const code = text.charCodeAt(index);
    return code >= 0xDC00 && code <= 0xDFFF;
  };
  if (start > 0 && start < text.length && isLowSurrogate(start)) start--;
  let end = Math.min(text.length, start + 96);
  if (end < text.length && isLowSurrogate(end)) end--;
  return { start, end };
}
