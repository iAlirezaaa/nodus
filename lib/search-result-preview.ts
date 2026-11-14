import type { GraphNode } from './types';
import { normalizeSearchText } from './thought-search';
import { parseQuotedSearchPhrase } from './search-phrase';
import { annotationKeywordsMatch } from './search-annotations';

export type SearchResultPreviewKind = 'comment' | 'quote' | 'note' | 'file' | 'link';
export interface SearchResultPreview { kind: SearchResultPreviewKind; text: string; }

/** Derived explanation for a search hit. Never writes to the graph or drafts. */
export function searchResultPreview(
  node: Pick<GraphNode, 'text' | 'annotations' | 'asset' | 'url'>,
  query: string,
): SearchResultPreview | null {
  const phrase = parseQuotedSearchPhrase(query);
  const isPhrase = phrase !== null;
  const compare = (value: string) => {
    const normalized = normalizeSearchText(value);
    return isPhrase ? normalized.replace(/\s+/gu, ' ').trim() : normalized;
  };
  const needle = compare(isPhrase ? phrase : query.trim());
  // The empty Search dialog is a browse view: retain its ordinary note preview.
  const excerpt = (value: string) => {
    const source = value.replace(/\s+/gu, ' ').trim();
    if (!source) return '';
    const rawNeedle = (isPhrase ? phrase : query).replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, '').trim();
    const lowered = source.toLowerCase();
    let index = rawNeedle ? lowered.indexOf(rawNeedle.toLowerCase()) : 0;
    if (index < 0) {
      for (const word of rawNeedle.split(/[\s,;،؛]+/u).filter(Boolean)) {
        index = lowered.indexOf(word.toLowerCase());
        if (index >= 0) break;
      }
    }
    const start = Math.max(0, (index < 0 ? 0 : index) - 26);
    const end = Math.min(source.length, start + 96);
    return (start ? '…' : '') + source.slice(start, end).trim() + (end < source.length ? '…' : '');
  };
  const preview = (kind: SearchResultPreviewKind, value: string): SearchResultPreview => ({ kind, text: excerpt(value) });
  const note = node.text?.trim() ?? '';
  if (!needle) return query.trim() ? null : note ? preview('note', note) : null;
  const compact = (value: string) => value.replace(/[\s\/\\._-]+/g, '');
  const compactNeedle = isPhrase ? '' : compact(needle);
  const folded = (value: string) => value.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF0-9])/gu, '$1');
  const persianPhraseNeedle = isPhrase && /[\u0600-\u06FF]/u.test(needle) ? folded(needle) : '';
  const keywords = needle.split(/[\s,;،؛]+/u).filter(Boolean);
  const matches = (value: string) => {
    if (!value) return false;
    const normalized = compare(value);
    return normalized.includes(needle)
      || (persianPhraseNeedle.length > 0 && folded(normalized).includes(persianPhraseNeedle))
      || (compactNeedle.length > 0 && compact(normalized).includes(compactNeedle))
      || (!isPhrase && annotationKeywordsMatch(normalized, keywords));
  };
  // An annotation-only result must show the reason it was found, rather than
  // unrelated opening note text or a generic node-kind label.
  for (const annotation of node.annotations ?? []) {
    if (matches(annotation.body)) return preview('comment', annotation.body);
    if (matches(annotation.quote)) return preview('quote', annotation.quote);
  }
  if (matches(note)) return preview('note', note);
  if (node.asset?.name && matches(node.asset.name)) return preview('file', node.asset.name);
  if (node.url && matches(node.url)) {
    // A saved link may contain signed query strings, credentials or fragments.
    // Search may match them, but the result row should not echo private tokens.
    let hostname = 'URL';
    try { hostname = new URL(node.url).hostname || 'URL'; } catch { /* Relative/legacy URL: generic label. */ }
    return preview('link', hostname);
  }
  return note ? preview('note', note) : null;
}
