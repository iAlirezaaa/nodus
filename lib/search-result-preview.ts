import type { GraphNode } from './types';
import { normalizeSearchText } from './thought-search';
import { parseQuotedSearchPhrase } from './search-phrase';
import { annotationKeywordsMatch } from './search-annotations';
import { searchExcerptBounds } from './search-excerpt-bounds';
import { comparableSearchUrl } from './search-url-comparison';

export type SearchResultPreviewKind = 'title' | 'project' | 'multiple' | 'comment' | 'quote' | 'note' | 'file' | 'link';
export interface SearchResultPreview { kind: SearchResultPreviewKind; text: string; }

/** Derived explanation for a search hit. Never writes to the graph or drafts. */
export function searchResultPreview(
  node: Pick<GraphNode, 'text' | 'annotations' | 'asset' | 'url'> & Partial<Pick<GraphNode, 'title'>>,
  query: string,
  boardPath = '',
): SearchResultPreview | null {
  const phrase = parseQuotedSearchPhrase(query);
  const isPhrase = phrase !== null;
  // Mirror engine whitespace comparison for accurate source labels/excerpts.
  const compare = (value: string) => normalizeSearchText(value).replace(/\s+/gu, ' ').trim();
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
  // Keep the preview's *kind* consistent with searchThoughts' tiers:
  // direct filename (4), note (5), URL (6), unordered/cross-field keywords (8),
  // annotations (9). Unordered terms in a note must not override a stronger
  // direct URL match; a filename must not lose to a directly matching note.
  const matchesDirectly = (value: string) => {
    if (typeof value !== 'string' || !value) return false;
    const normalized = compare(value);
    return normalized.includes(needle)
      || (persianPhraseNeedle.length > 0 && folded(normalized).includes(persianPhraseNeedle))
      || (compactNeedle.length > 0 && compact(normalized).includes(compactNeedle));
  };
  const matchesKeywords = (value: string) =>
    typeof value === 'string' && Boolean(value) && !isPhrase && annotationKeywordsMatch(compare(value), keywords);
  // The search engine ranks direct title and full project path before files
  // and notes. Report those sources, not an unrelated note or attachment.
  // The result row already renders title and project location independently.
  if (matchesDirectly(node.title ?? '')) return { kind: 'title', text: '' };
  if (matchesDirectly(boardPath)) return { kind: 'project', text: '' };
  const filename = node.asset?.name ?? '';
  if (matchesDirectly(filename)) return preview('file', filename);
  if (matchesDirectly(note)) return preview('note', note);
  // Keep the explanation aligned with searchThoughts' ranking:
  // direct URL (tier 6) > contiguous cross-field (7) > unordered words (8).
  const savedUrl = node.url ?? '';
  const decodedUrl = savedUrl ? comparableSearchUrl(savedUrl) : '';
  const linkPreview = (): SearchResultPreview => {
    let hostname = 'URL';
    try { hostname = new URL(savedUrl).hostname || 'URL'; } catch { /* Relative/legacy URL: generic label. */ }
    // Never show a signed path, query, fragment, user info or saved URL.
    return preview('link', hostname);
  };
  if (savedUrl && (matchesDirectly(savedUrl) || matchesDirectly(decodedUrl))) return linkPreview();
  const title = compare(node.title ?? '');
  // Keep original whitespace for the tier-7 check, matching searchThoughts.
  const description = compare(node.text ?? '');
  const file = compare(filename);
  // This has a higher rank than unordered words in any individual field.
  if (!isPhrase && (title + ' ' + description + ' ' + file).includes(needle))
    return { kind: 'multiple', text: '' };
  if (savedUrl && (matchesKeywords(savedUrl) || (decodedUrl !== savedUrl && matchesKeywords(decodedUrl))))
    return linkPreview();
  if (matchesKeywords(note)) return preview('note', note);
  if (matchesKeywords(filename)) return preview('file', filename);
  // Tier 8: words can be found across fields, including project ancestry.
  if (!isPhrase) {
    const project = compare(boardPath);
    const rawUrl = compare(savedUrl);
    const decoded = compare(decodedUrl);
    const fields = [title, description, file, rawUrl, ...(decoded !== rawUrl ? [decoded] : []), project];
    const splitKeywords = keywords.length > 1 && keywords.every(word =>
      fields.some(field => field.includes(word)) ||
      (/[\u0600-\u06FF]/u.test(word) && fields.some(field =>
        field.replace(/([\u0600-\u06FF])\s+(?=[\u0600-\u06FF])/gu, '$1').includes(word))));
    if (splitKeywords) return { kind: 'multiple', text: '' };
  }
  // Comments and quotes have the lowest rank, and phrases remain field-local.
  for (const annotation of Array.isArray(node.annotations) ? node.annotations : []) {
    if (!annotation || typeof annotation !== 'object') continue;
    if (typeof annotation.body === 'string' && (matchesDirectly(annotation.body) || matchesKeywords(annotation.body)))
      return preview('comment', annotation.body);
    if (typeof annotation.quote === 'string' && (matchesDirectly(annotation.quote) || matchesKeywords(annotation.quote)))
      return preview('quote', annotation.quote);
  }
  return note ? preview('note', note) : null;
}
