import test from 'node:test';
import assert from 'node:assert/strict';
import { searchExcerptBounds } from '../lib/search-excerpt-bounds.ts';

const snippet = (text: string, desiredStart: number) => {
  const { start, end } = searchExcerptBounds(text, desiredStart);
  return { start, end, text: text.slice(start, end) };
};

test('does not begin inside a ZWJ astronaut emoji sequence', () => {
  const prefix = 'x'.repeat(40);
  const result = snippet(prefix + '👩‍💻' + 'نقشه', prefix.length + 3);
  assert.equal(result.start, prefix.length);
  assert.ok(result.text.startsWith('👩‍💻'));
  assert.ok(result.text.includes('نقشه'));
});

test('does not end inside a family emoji sequence', () => {
  const text = 'x'.repeat(94) + '👨‍👩‍👧‍👦' + 'نتیجه';
  const result = snippet(text, 0);
  assert.equal(result.end, 94);
  assert.equal(result.text, 'x'.repeat(94));
  assert.ok(result.end-result.start <= 96);
});

test('regional indicator flag is one visible grapheme at start', () => {
  const text = 'x'.repeat(20)+'🇷🇺'+'Note';
  const result = snippet(text, 22);
  assert.equal(result.start, 20);
  assert.ok(result.text.startsWith('🇷🇺'));
});

test('a combining mark at the start keeps its base character', () => {
  const text = 'x'.repeat(20) + 'e\u0301' + 'Search';
  const result = snippet(text, 21);
  assert.equal(result.start, 20);
  assert.ok(result.text.startsWith('e\u0301'));
});

test('ASCII offsets and bounded Persian passage remain unchanged', () => {
  const text = 'x'.repeat(180)+'دسته بندی '+ 'z'.repeat(100);
  const result = snippet(text, 154);
  assert.deepEqual({start:result.start,end:result.end},{start:154,end:250});
  assert.ok(result.text.includes('دسته بندی'));
  assert.ok(result.text.length<=96);
});
