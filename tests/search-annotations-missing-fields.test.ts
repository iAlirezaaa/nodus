import test from 'node:test';
import assert from 'node:assert/strict';
import { anyAnnotationFieldMatches, annotationKeywordsMatch } from '../lib/search-annotations.ts';

const search = (entries: unknown, query: string) =>
  anyAnnotationFieldMatches(entries as Parameters<typeof anyAnnotationFieldMatches>[0],
    field => field.toLowerCase().includes(query));

test('a null legacy annotation does not hide the subsequent valid Persian comment', () => {
  const entries = [null, { quote: 'نما', body: 'اصلاح نور صحنه' }];
  const original = JSON.stringify(entries);
  assert.equal(search(entries, 'اصلاح'), true);
  assert.equal(JSON.stringify(entries), original);
});

test('a missing quote still allows searching the available comment body', () => {
  assert.equal(search([{ body: 'Forest lighting' }], 'lighting'), true);
  assert.equal(search([{ quote: 'lighting' }], 'lighting'), true);
});

test('invalid non-string comment values are skipped without suppressing valid later entries', () => {
  const entries = [{ quote: 42, body: false }, { quote: 'frame', body: 'Lighting approved' }];
  assert.equal(search(entries, 'lighting'), true);
  assert.equal(search([{ quote: 42, body: false }], 'lighting'), false);
});

test('an invalid annotations container cannot crash search', () => {
  assert.equal(search({ quote: 'lighting', body: 'lighting' }, 'lighting'), false);
  assert.equal(search('lighting', 'lighting'), false);
});

test('healthy annotations keep field-local phrases and unordered keyword semantics', () => {
  const entries = [{ quote: 'frame 10', body: 'Revise lighting' }];
  assert.equal(search(entries, 'revise'), true);
  assert.equal(search(entries, 'frame 10 revise'), false);
  assert.equal(annotationKeywordsMatch('Revise lighting'.toLowerCase(), ['lighting', 'revise']), true);
});
