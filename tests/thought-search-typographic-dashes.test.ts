import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, normalizeSearchText, searchThoughts } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', boardId = 'root', other: Partial<GraphNode> = {}): GraphNode {
  return { id, title, text, boardId, url: null, asset: null, annotations: [], ...other } as GraphNode;
}

test('ASCII hyphens find copied Word/PDF dashes in all existing searchable fields', () => {
  const nodes = [
    thought('title', 'Storyboard–Review'),
    thought('note', 'Other', 'Scene—12'),
    thought('file', 'Other', '', 'root', { asset: { name: 'Camera‑Angle.pdf' } as GraphNode['asset'] }),
    thought('annotation', 'Other', '', 'root', { annotations: [{ quote: '', body: 'Lighting−Pass' }] as GraphNode['annotations'] }),
    thought('path', 'Other', '', 'child'),
  ];
  const paths = new Map([['child', 'ایده–پردازی']]);
  const original = JSON.stringify(nodes);
  const cases = [
    ['title', 'storyboard-review'],
    ['note', 'scene-12'],
    ['file', 'camera-angle'],
    ['annotation', 'lighting-pass'],
    ['path', 'ایده-پردازی'],
  ] as const;
  for (const [id, query] of cases) {
    const hits = searchThoughts(nodes, query, SEARCH_PAGE_SIZE, 0, paths);
    assert.deepEqual(hits.visible.map(node => node.id), [id], query);
    assert.equal(hits.total, 1, query);
  }
  assert.equal(JSON.stringify(nodes), original, 'search must not rewrite user content');
});

test('search explanations agree with the matching field and do not expose unrelated sources', () => {
  assert.deepEqual(searchResultPreview(thought('a', 'Storyboard–Review'), 'storyboard-review'),
    { kind: 'title', text: '' });
  assert.equal(searchResultPreview(thought('b', 'Other', 'Scene—12'), 'scene-12')?.kind, 'note');
  assert.equal(searchResultPreview(
    thought('c', 'Other', '', 'root', { asset: { name: 'Camera‑Angle.pdf' } as GraphNode['asset'] }),
    'camera-angle')?.kind, 'file');
  assert.deepEqual(searchResultPreview(thought('d', 'Other'), 'ایده-پردازی', 'ایده–پردازی'),
    { kind: 'project', text: '' });
  assert.equal(searchResultPreview(thought('e', 'Other', '', 'root', {
    annotations: [{ quote: '', body: 'Lighting−Pass' }] as GraphNode['annotations'],
  }), 'lighting-pass')?.kind, 'comment');
});

test('quoted phrases keep boundaries; unrelated punctuation and emoji are unchanged', () => {
  assert.deepEqual(searchThoughts([thought('a', 'Scene—12')], '"scene-12"').visible.map(n => n.id), ['a']);
  assert.equal(searchThoughts([thought('b', 'Scene→12')], '"scene-12"').total, 0);
  assert.equal(searchThoughts([thought('c', 'Scene / 12')], '"scene-12"').total, 0);
  assert.equal(normalizeSearchText('👩‍💻'), '👩‍💻');
  assert.equal(normalizeSearchText('Lighting−Pass'), 'lighting-pass');
  assert.equal(normalizeSearchText('Camera‑Angle'), 'camera-angle');
});

test('151 typographic-dash titles maintain honest totals and 70/70/11 pages', () => {
  const nodes = Array.from({ length: 151 }, (_, index) => thought(String(index), 'Shot–Plan'));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'shot-plan', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]),
    [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)), nodes.map(node => node.id));
  assert.equal(JSON.stringify(nodes), before);
});
