import test from 'node:test';
import assert from 'node:assert/strict';
import { anyAnnotationFieldMatches } from '../lib/search-annotations.ts';

test('no annotation is a safe non-match', () => {
  assert.equal(anyAnnotationFieldMatches(undefined, text => text.includes('note')), false);
  assert.equal(anyAnnotationFieldMatches([], text => text.includes('note')), false);
});

test('searching comment body finds the owning annotated idea', () => {
  const items = [{ quote: 'frame 10', body: 'Check camera spacing in scene 14' }];
  assert.equal(anyAnnotationFieldMatches(items, text => text.includes('camera spacing')), true);
  assert.equal(anyAnnotationFieldMatches(items, text => text.includes('nothing')), false);
});

test('searching the original selected quote is supported', () => {
  assert.equal(anyAnnotationFieldMatches([{ quote: 'lighting pass', body: 'approved' }],
    text => text.includes('lighting pass')), true);
});

test('quoted phrase is not invented by joining quote and comment', () => {
  const items = [{ quote: 'moonlight', body: 'reflections' }];
  assert.equal(anyAnnotationFieldMatches(items, text => text.includes('moonlight reflections')), false);
});

test('quoted phrase is not invented by joining separate annotations', () => {
  const items = [{ quote: 'part one', body: 'A' }, { quote: 'part two', body: 'B' }];
  assert.equal(anyAnnotationFieldMatches(items, text => text.includes('part one part two')), false);
});

test('callback can provide Persian and English comparison without mutating content', () => {
  const entries = Object.freeze([Object.freeze({ quote: 'ایدهٔ اصلی', body: 'Final LIGHTING review' })]);
  const before = JSON.stringify(entries);
  assert.equal(anyAnnotationFieldMatches(entries, text => text.toLowerCase().includes('lighting')), true);
  assert.equal(anyAnnotationFieldMatches(entries, text => text.includes('اصلی')), true);
  assert.equal(JSON.stringify(entries), before);
});
