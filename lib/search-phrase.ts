/** Recognize a balanced quoted search after ignoring copied outer direction marks.
 * The phrase contents are preserved for the normal search comparison pipeline.
 * This never mutates a user's text, graph or stored URL.
 */
export function parseQuotedSearchPhrase(query: string): string | null {
  // Text copied between RTL and LTR editors can carry direction isolates or
  // invisible separators outside the actual quotation marks. Only trim these
  // at the query boundary; text *inside* the quotes remains unchanged.
  const candidate = query.replace(/^[\s\u061C\u00AD\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]+|[\s\u061C\u00AD\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]+$/gu, '');
  // Also accept low-double opening quotes used in copied multilingual notes.
  const paired = candidate.match(/^(?:"([^"]*)"|“([^”]*)”|«([^»]*)»|„([^“”]*)[“”])$/u);
  if (paired) return paired[1] ?? paired[2] ?? paired[3] ?? paired[4] ?? '';

  // A single quote inside a word is an apostrophe, not another quote pair.
  // But separately quoted words are NOT one contiguous exact phrase.
  // Reject ambiguous nested punctuation rather than silently merging terms.
  // Pasted content may mix straight and curly delimiters. Reject boundary
  // quotes of either style, while keeping intra-word apostrophes of both
  // styles (don't, I’m, L'atelier) inside one genuinely contiguous phrase.
  const hasBoundaryQuote = (text: string) =>
    /‘|(?<![\p{L}\p{N}])['’]|['’](?![\p{L}\p{N}])/u.test(text);
  const single = candidate.match(/^'([\s\S]*)'$/u);
  if (single) return hasBoundaryQuote(single[1]) ? null : single[1];
  const curlySingle = candidate.match(/^‘([\s\S]*)’$/u);
  if (curlySingle) return hasBoundaryQuote(curlySingle[1]) ? null : curlySingle[1];
  return null;
}
