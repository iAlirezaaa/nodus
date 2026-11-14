import type { GraphNode } from './types';
import { normalizeSearchText } from './thought-search';
import { parseQuotedSearchPhrase } from './search-phrase';
import { annotationKeywordsMatch } from './search-annotations';
import { searchExcerptBounds } from './search-excerpt-bounds';

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
    if (index < 0 && needle) {
      // Raw substring offsets miss visually equivalent matches:
      // إسلام/اسلام, کتاب‌ها/کتابها, Résumé/resume, or Persian joined phrases.
      // Locate the corresponding source position without a per-character map.
      const candidates: { token: string; fold: (s: string) => string }[] = [
        { token: needle, fold: compare },
        ...(persianPhraseNeedle ? [{ token: persianPhraseNeedle, fold: (s: string) => folded(compare(s)) }] : []),
        ...(compactNeedle ? [{ token: compactNeedle, fold: (s: string) => compact(compare(s)) }] : []),
        ...(!isPhrase ? keywords.map(token => ({ token, fold: compare })) : []),
      ];
      for (const candidate of candidates) {
        const matchAt = candidate.fold(source).indexOf(candidate.token);
        if (matchAt < 0) continue;
        let low = 0;
        let high = source.length;
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          if (candidate.fold(source.slice(0, mid)).length <= matchAt) low = mid + 1;
          else high = mid;
        }
        index = Math.max(0, low - 1);
        break;
      }
    }
    const { start, end } = searchExcerptBounds(source, Math.max(0, (index < 0 ? 0 : index) - 26));
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
  if (node.url) {
    // URL search also checks valid percent-encoded text and form-style query
    // spaces. Derive only a comparison value; never display a signed URL.
    const rawUrl = node.url;
    const queryAt = rawUrl.indexOf('?');
    const fragmentAt = rawUrl.indexOf('#');
    const queryEnd = fragmentAt >= 0 ? fragmentAt : rawUrl.length;
    const comparable = queryAt >= 0 && (fragmentAt < 0 || queryAt < fragmentAt)
      ? rawUrl.slice(0, queryAt + 1) + rawUrl.slice(queryAt + 1, queryEnd).replace(/\+/g, ' ') + rawUrl.slice(queryEnd)
      : rawUrl;
    let decoded = comparable;
    try { decoded = decodeURIComponent(comparable); } catch { /* Keep original on malformed percent escapes. */ }
    if (matches(rawUrl) || matches(decoded)) {
      // Never echo the query string, fragment or embedded credentials.
      let hostname = 'URL';
      try { hostname = new URL(rawUrl).hostname || 'URL'; } catch { /* Relative/legacy URL: generic label. */ }
      return preview('link', hostname);
    }
  }
  return note ? preview('note', note) : null;
}
