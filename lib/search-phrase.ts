/** Recognize a balanced quoted search after ignoring copied outer direction marks.
 * The phrase contents are preserved for the normal search comparison pipeline.
 * This never mutates a user's text, graph or stored URL.
 */
export function parseQuotedSearchPhrase(query: string): string | null {
  // Text copied between RTL and LTR editors can carry direction isolates or
  // invisible separators outside the actual quotation marks. Only trim these
  // at the query boundary; text *inside* the quotes remains unchanged.
  const candidate = query.replace(/^[\s\u061C\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]+|[\s\u061C\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]+$/gu, '');
  const phrase = candidate.match(/^(?:"([^"]*)"|“([^”]*)”|«([^»]*)»|'([\s\S]*)'|‘([\s\S]*)’)$/u);
  return phrase ? (phrase[1] ?? phrase[2] ?? phrase[3] ?? phrase[4] ?? phrase[5] ?? '') : null;
}
