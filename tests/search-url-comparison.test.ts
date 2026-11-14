import test from 'node:test';
import assert from 'node:assert/strict';
import { comparableSearchUrl } from '../lib/search-url-comparison.ts';

test('valid percent-encoded Persian link text is readable to search', () => {
  assert.equal(comparableSearchUrl('https://example.com/%D9%86%D9%88%D8%AF'), 'https://example.com/نود');
});
test('invalid literal percent escapes do not suppress a valid Persian path', () => {
  assert.equal(comparableSearchUrl('https://example.com/%GG/%D9%86%D9%88%D8%AF'), 'https://example.com/%GG/نود');
});
test('one invalid UTF-8 escape does not hide the adjacent valid UTF-8 scalar', () => {
  assert.equal(comparableSearchUrl('https://example.com/%FF%D9%86%D9%88%D8%AF'), 'https://example.com/%FFنود');
});
test('a bad escape between encoded words leaves later English text available', () => {
  assert.equal(comparableSearchUrl('https://example.com/story%20%FFboard'), 'https://example.com/story %FFboard');
});
test('query plus represents a space, including before a fragment', () => {
  assert.equal(comparableSearchUrl('https://example.com/?q=blue+hour#private'), 'https://example.com/?q=blue hour#private');
});
test('path and fragment plus signs remain literal', () => {
  assert.equal(comparableSearchUrl('https://example.com/blue+hour#nice+day'), 'https://example.com/blue+hour#nice+day');
});
test('an entirely malformed escape retains the raw original even with query plus', () => {
  const raw = 'https://example.com/?q=blue+hour&invalid=%GG';
  assert.equal(comparableSearchUrl(raw), raw);
});
test('plain ASCII and Unicode links do not change', () => {
  for (const url of ['https://example.com/story-board', 'https://example.com/نود'])
    assert.equal(comparableSearchUrl(url), url);
});
test('input stays immutable and comparison cannot disclose credentials itself', () => {
  const url = 'https://example.com/%GG/%D9%86%D9%88%D8%AF?token=PRIVATE';
  const before = url;
  assert.equal(comparableSearchUrl(url), 'https://example.com/%GG/نود?token=PRIVATE');
  assert.equal(url, before);
});
