import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts, normalizeSearchText } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const thought = (id: string, title: string, text = '', boardId = 'root', filename = '', annotations: {quote: string; body: string}[] = []): GraphNode =>
  ({ id, title, text, boardId, asset: filename ? {name: filename} : null, annotations, url: '' }) as GraphNode;

test('ordinary apostrophe finds pasted curly punctuation in titles and notes', () => {
  const nodes = [thought('note', 'Unrelated', 'Director’s note'), thought('title', 'Director‘s note')];
  const results = searchThoughts(nodes, "director's note");
  assert.deepEqual(results.visible.map(n => n.id), ['title', 'note']);
  assert.equal(results.total, 2);
  assert.equal(searchThoughts([thought('left', 'L‘artiste')], "l'artiste").total, 1);
});

test('filename, nested project path and annotation remain searchable without joining fields', () => {
  const nodes = [
    thought('file', 'Other', '', 'root', 'Director’s plan.pdf'),
    thought('path', 'Other', '', 'nested'),
    thought('comment', 'Other', '', 'root', '', [{quote: '', body: 'Director’s note'}]),
    thought('split', 'Director', 's note'),
  ];
  const paths = new Map([['nested', 'Root / Director’s note']]);
  assert.deepEqual(searchThoughts(nodes, "director's plan", 70, 0, paths).visible.map(n => n.id), ['file']);
  assert.deepEqual(searchThoughts(nodes, "director's note", 70, 0, paths).visible.map(n => n.id), ['path', 'comment']);
  assert.deepEqual(searchThoughts(nodes, '"director\'s note"', 70, 0, paths).visible.map(n => n.id), ['path', 'comment']);
});

test('quotation boundaries remain meaningful and pasted data stay untouched', () => {
  const nodes = [thought('curly', 'Don’t stop'), thought('plain', "Don't stop"), thought('other', 'Dont stop')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '"don\'t stop"').visible.map(n => n.id), ['curly', 'plain']);
  assert.equal(searchThoughts([nodes[0]], 'dont stop').total, 0);
  assert.equal(JSON.stringify(nodes), before);
  assert.equal(normalizeSearchText('👩‍💻'), '👩‍💻');
});

test('honest 151-match counts and stable 70/70/11 pages with pasted punctuation', () => {
  const nodes = Array.from({length: 151}, (_, i) => thought(String(i), 'Director’s note'));
  const original = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, "director's note", SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), original);
});
