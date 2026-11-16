import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const thought = (id: string, title: string, text = ''): GraphNode =>
  ({ id, boardId: 'root', title, text, asset: null }) as GraphNode;

test('separately quoted terms find 151 results across bounded pages', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Forest scene Lighting ' + i));
  const original = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, "‘Forest' 'Lighting’", 70, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]),
    [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)), nodes.map(node => node.id));
  assert.equal(JSON.stringify(nodes), original, 'search must not save or repair content');
});

test('Persian and multilingual individually quoted terms remain unordered', () => {
  const nodes = [thought('persian', 'فصل تدوین دوم'), thought('english', 'Forest camera Lighting'),
    thought('split-fields', 'Forest', 'Lighting notes'), thought('not-related', 'Other')];
  assert.deepEqual(searchThoughts(nodes, '‘فصل’ ‘دوم’').visible.map(node => node.id), ['persian']);
  assert.deepEqual(searchThoughts(nodes, '"Forest" "Lighting"').visible.map(node => node.id),
    ['english', 'split-fields']);
  assert.deepEqual(searchThoughts(nodes, "'Forest Lighting'").visible.map(node => node.id), []);
});

test('internal apostrophes and direct literal quote-title relevance survive', () => {
  const nodes = [thought('literal', "‘forest' 'lighting’"),
    thought('apostrophe', "Don't lose L'atelier"), thought('mixed', 'forest camera lighting')];
  assert.deepEqual(searchThoughts(nodes, "‘forest' 'lighting’").visible.map(node => node.id),
    ['literal', 'mixed']);
  assert.deepEqual(searchThoughts(nodes, "don't").visible.map(node => node.id), ['apostrophe']);
});
