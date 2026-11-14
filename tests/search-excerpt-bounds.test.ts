import test from 'node:test';
import assert from 'node:assert/strict';
import { searchExcerptBounds } from '../lib/search-excerpt-bounds.ts';

function excerpt(text: string, hit: string) {
  const index = text.indexOf(hit);
  const { start, end } = searchExcerptBounds(text, Math.max(0, index - 26));
  return text.slice(start, end);
}

test('start boundary includes a complete emoji when the original slice would start at its low surrogate', () => {
  const text = 'x'.repeat(153) + '😀' + 'x'.repeat(25) + 'نقشه';
  const result = excerpt(text, 'نقشه');
  assert.ok(result.startsWith('😀'), JSON.stringify(result));
  assert.ok(result.includes('نقشه'));
  assert.equal(result.includes('\uDE00'), true); // legitimate pair is kept, not a lone surrogate
  assert.equal([...result].includes('\uDE00'), false);
});

test('end boundary excludes a truncated emoji without losing the matched word', () => {
  const text = 'x'.repeat(180) + 'target' + 'x'.repeat(63) + '😀' + 'tail';
  const result = excerpt(text, 'target');
  assert.ok(result.includes('target'));
  assert.equal([...result].some(ch => /^[\uD800-\uDFFF]$/u.test(ch)), false);
  assert.ok(!result.includes('😀'));
});

test('ASCII notes retain the existing 96-unit window and offsets', () => {
  const text = 'x'.repeat(180) + 'aperture' + 'z'.repeat(100);
  const bounds = searchExcerptBounds(text, 154);
  assert.deepEqual(bounds, { start: 154, end: 250 });
  assert.equal(text.slice(bounds.start, bounds.end).length, 96);
});

test('mixed Persian/emoji text remains unchanged and the window stays bounded', () => {
  const text = 'x'.repeat(153) + '👩‍💻' + 'x'.repeat(23) + 'سلام';
  const before = text;
  const bounds = searchExcerptBounds(text, 154);
  const result = text.slice(bounds.start, bounds.end);
  assert.equal(text, before);
  assert.equal(result.length <= 96, true);
  assert.equal([...result].some(ch => /^[\uD800-\uDFFF]$/u.test(ch)), false);
});
