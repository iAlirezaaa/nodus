import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', assetName?: string, boardId = 'root'): GraphNode {
  return { id, title, text, boardId, asset: assetName ? { name: assetName } : null } as GraphNode;
}

test('quoted English phrase finds words separated by pasted line breaks and tabs within a title', () => {
  assert.deepEqual(searchThoughts([thought('t', 'Forest\n\t Lighting')], '"forest lighting"').visible.map(n => n.id), ['t']);
});

test('Persian guillemet phrase finds multiline note without rewriting it', () => {
  const nodes = [thought('fa', 'ایده', 'صحنه\n\t نور')];
  const old = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '«صحنه نور»').visible.map(n => n.id), ['fa']);
  assert.equal(JSON.stringify(nodes), old);
});

test('quoted phrase can find adjacent filename words split by whitespace', () => {
  assert.deepEqual(searchThoughts([thought('file', 'asset', '', 'shot  \n  list.pdf')], '"shot list"').visible.map(n => n.id), ['file']);
});

test('quoted phrase locates a complete nested board path with line breaks', () => {
  const paths = new Map([['root', 'Studio / Forest\nLighting']]);
  assert.deepEqual(searchThoughts([thought('path', 'Canvas')], '"forest lighting"', 70, 0, paths).visible.map(n => n.id), ['path']);
});

test('extra spaces inside balanced quotes do not change phrase meaning', () => {
  assert.deepEqual(searchThoughts([thought('trim', 'forest lighting')], '"  forest  lighting  "').visible.map(n => n.id), ['trim']);
});

test('quoted whitespace never joins distinct fields or jumps punctuation/order', () => {
  const nodes = [thought('cross', 'forest', 'lighting'), thought('reverse', 'lighting forest'), thought('punct', 'forest, lighting')];
  assert.equal(searchThoughts(nodes, '"forest lighting"').total, 0);
});

test('multiline phrase counts every hit across 70/70/11 pages', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'forest\n lighting'));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '"forest lighting"', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(n => n.id)), nodes.map(n => n.id));
});

test('unquoted search remains unchanged and still handles compact words', () => {
  const nodes = [thought('a', 'forest\nlighting'), thought('b', 'forest lighting')];
  assert.equal(searchThoughts(nodes, 'forest lighting').total, 2);
  assert.deepEqual(searchThoughts(nodes, 'forestlighting').visible.map(n => n.id), ['a', 'b']);
});

test('search is read-only, including graph nodes and caller-owned paths', () => {
  const nodes = [thought('a', 'forest\nlighting')], paths = new Map([['root', 'Studio / Forest\nLighting']]);
  const beforeNodes = JSON.stringify(nodes), beforePaths = JSON.stringify([...paths]);
  searchThoughts(nodes, '"forest lighting"', 70, 0, paths);
  assert.equal(JSON.stringify(nodes), beforeNodes);
  assert.equal(JSON.stringify([...paths]), beforePaths);
});
