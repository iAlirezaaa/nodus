/** Bound a read-only search snippet to 96 UTF-16 units without splitting a
 * visible Unicode character (joined emoji, flags or combining sequences).
 * Older browsers without Intl.Segmenter retain surrogate-safe boundaries. */
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

export function searchExcerptBounds(text: string, desiredStart: number): { start: number; end: number } {
  let start = Math.max(0, Math.min(text.length, desiredStart));
  const isLowSurrogate = (index: number) => {
    const code = text.charCodeAt(index);
    return code >= 0xDC00 && code <= 0xDFFF;
  };
  if (segmenter) {
    // containing() resolves the full grapheme at a UTF-16 offset; a raw slice
    // might otherwise leave only half of a family emoji or a detached mark.
    const segments = segmenter.segment(text);
    if (start < text.length) start = segments.containing(start)?.index ?? start;
    // A very long single grapheme (e.g. pasted text with hundreds of
    // combining marks) can span the entire 96-unit window. Snapping both
    // boundaries backwards then produces an empty preview even if useful
    // matched text follows. Skip only such oversized whole graphemes instead
    // of cutting through them or returning an unbounded excerpt.
    while (start < text.length) {
      let end = Math.min(text.length, start + 96);
      if (end < text.length) end = segments.containing(end)?.index ?? end;
      if (end > start) return { start, end };
      const oversized = segments.containing(start);
      const next = oversized ? oversized.index + oversized.segment.length : text.length;
      if (next <= start || next >= text.length) break;
      start = next;
    }
    // A document consisting solely of an oversized grapheme has no intact
    // nonempty excerpt within the 96-unit budget.
    return { start, end: start };
  }
  if (start > 0 && start < text.length && isLowSurrogate(start)) start--;
  let end = Math.min(text.length, start + 96);
  if (end < text.length && isLowSurrogate(end)) end--;
  return { start, end };
}
