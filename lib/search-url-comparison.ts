/**
 * Derive only a read-only URL comparison string for search results.
 * An invalid escape must not hide valid UTF-8 elsewhere in the URL.
 * Saved links and URLs shown to the user are never rewritten by this helper.
 */
export function comparableSearchUrl(rawUrl: string): string {
  const queryAt = rawUrl.indexOf('?');
  const fragmentAt = rawUrl.indexOf('#');
  let comparable = rawUrl;
  if (queryAt >= 0 && (fragmentAt < 0 || queryAt < fragmentAt)) {
    const queryEnd = fragmentAt >= 0 ? fragmentAt : rawUrl.length;
    comparable = rawUrl.slice(0, queryAt + 1)
      + rawUrl.slice(queryAt + 1, queryEnd).replace(/\+/g, ' ')
      + rawUrl.slice(queryEnd);
  }
  if (comparable === rawUrl && !rawUrl.includes('%')) return rawUrl;

  let decoded = comparable;
  let recovered = false;
  try {
    decoded = decodeURIComponent(comparable);
    recovered = true;
  } catch {
    // Decode independent valid runs without letting a bad percent escape or
    // invalid UTF-8 byte consume a later, valid Persian/Latin code point.
    decoded = comparable.replace(/(?:%[0-9a-fA-F]{2})+/g, run => {
      const escapes = run.match(/%[0-9a-fA-F]{2}/g) ?? [];
      let result = '';
      for (let i = 0; i < escapes.length;) {
        let scalar = '';
        let consumed = 0;
        for (let width = 1; width <= 4 && i + width <= escapes.length; width++) {
          try {
            scalar = decodeURIComponent(escapes.slice(i, i + width).join(''));
            consumed = width;
            break;
          } catch { /* Try a complete UTF-8 scalar before falling back. */ }
        }
        if (consumed) {
          result += scalar;
          recovered = true;
          i += consumed;
        } else {
          result += escapes[i++];
        }
      }
      return result;
    });
  }
  // Invalid percent escapes must not cancel valid form-style query spaces.
  // If no scalar was decoded, retain malformed bytes but use the already
  // derived comparison string (only query + becomes space, never stored URL).
  return recovered ? decoded : comparable;
}
