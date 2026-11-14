import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const thought = (id: string, title: string, text = '', boardId = 'root', filename?: string): GraphNode =>
  ({ id, boardId, title, text, asset: filename ? { name: filename } : null }) as GraphNode;

test('Persian quoted spaced phrase locates ZWNJ and joined title spellings', () => {
  const nodes = [thought('zwnj', 'کتاب‌های من'), thought('joined', 'کتابهای من')];
  assert.deepEqual(searchThoughts(nodes, '«کتاب های من»').visible.map(n => n.id), ['zwnj', 'joined']);
});

test('Persian ZWNJ and joined quoted queries both find the spaced spelling', () => {
  const nodes = [thought('spaced', 'کتاب های من')];
  assert.deepEqual(searchThoughts(nodes, '«کتاب‌های من»').visible.map(n => n.id), ['spaced']);
  assert.deepEqual(searchThoughts(nodes, '«کتابهای من»').visible.map(n => n.id), ['spaced']);
});

test('Persian quoted phrase finds compounds within notes and filenames', () => {
  const nodes = [thought('note', 'ایده', 'نور‌پردازی صحنه'), thought('file', 'پیوست', '', 'root', 'کار‌های من.pdf')];
  assert.deepEqual(searchThoughts(nodes, '«نور پردازی صحنه»').visible.map(n => n.id), ['note']);
  assert.deepEqual(searchThoughts(nodes, '«کار های من»').visible.map(n => n.id), ['file']);
});

test('Persian quoted phrase works in a complete nested project path', () => {
  const paths = new Map([['child', 'استودیو / برنامه‌های من']]);
  assert.deepEqual(searchThoughts([thought('node', 'یادداشت', '', 'child')], '«برنامه های من»', 70, 0, paths).visible.map(n => n.id), ['node']);
});

test('equivalent exact titles still rank ahead of prefix, path, file and notes', () => {
  const nodes = [thought('note', 'غیره', 'کتاب‌های من'), thought('prefix', 'کتاب‌های من (تکمیلی)'), thought('exact', 'کتابهای من')];
  assert.deepEqual(searchThoughts(nodes, '«کتاب های من»').visible.map(n => n.id), ['exact', 'prefix', 'note']);
});

test('quoted phrase never stitches together different fields or jumps punctuation', () => {
  const nodes = [thought('fields', 'کتاب', 'های من'), thought('comma', 'کتاب،های من'), thought('hyphen', 'کتاب-های من')];
  assert.equal(searchThoughts(nodes, '«کتاب های من»').total, 0);
});

test('English quoted phrases keep strict word boundaries and order', () => {
  const nodes = [thought('joined', 'forestlighting'), thought('reversed', 'lighting forest'), thought('exact', 'forest lighting')];
  assert.deepEqual(searchThoughts(nodes, '"forest lighting"').visible.map(n => n.id), ['exact']);
});

test('Persian quoted numerals remain keyboard independent', () => {
  const nodes = [thought('a', 'پلان۳'), thought('b', 'پلان ۴')];
  assert.deepEqual(searchThoughts(nodes, '«پلان 3»').visible.map(n => n.id), ['a']);
});

test('all 151 Persian phrase hits remain countable across exact 70/70/11 pages', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'کتاب‌های من'));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '«کتاب های من»', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)), nodes.map(node => node.id));
});

test('search leaves saved Persian content and caller-owned project paths unchanged', () => {
  const nodes = [thought('a', 'کتاب‌های من')], paths = new Map([['root', 'برنامه‌های من']]);
  const beforeNodes = JSON.stringify(nodes), beforePaths = JSON.stringify([...paths]);
  assert.equal(searchThoughts(nodes, '«کتاب های من»', 70, 0, paths).total, 1);
  assert.equal(JSON.stringify(nodes), beforeNodes);
  assert.equal(JSON.stringify([...paths]), beforePaths);
});

test('ordinary unquoted compound search remains available', () => {
  assert.equal(searchThoughts([thought('a', 'کتاب‌های من')], 'کتاب هاي من').total, 1);
});
