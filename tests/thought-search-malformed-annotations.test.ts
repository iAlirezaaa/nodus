import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode } from '../lib/types.ts';

test('151 recovered thoughts with incomplete annotations retain search count, pages and previews', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => ({
    id: String(i), boardId: 'root', title: 'Other', text: '',
    annotations: [null, { body: 'اصلاح نور', quote: undefined }],
  })) as unknown as GraphNode[];
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'اصلاح', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)), nodes.map(node => node.id));
  assert.deepEqual(searchResultPreview(nodes[0], 'اصلاح'), { kind: 'comment', text: 'اصلاح نور' });
  assert.equal(JSON.stringify(nodes), before, 'derived search never repairs or writes original imported records');
});
