import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchText, searchThoughts, buildBoardPaths, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const node = (id: string, title: string, text = '', boardId = 'root', filename?: string): GraphNode =>
  ({ id, title, text, boardId, asset: filename ? { name: filename } : null, annotations: [] }) as GraphNode;
const board = (id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-16T00:00:00Z' }) as Workspace['boards'][number];

test('Russian ё/е comparison is case-insensitive but preserves other Cyrillic distinctions', () => {
  assert.equal(normalizeSearchText('ЁРЁМА'), normalizeSearchText('Ерема'));
  assert.equal(normalizeSearchText('ёлка'), 'елка');
  assert.notEqual(normalizeSearchText('Йога'), normalizeSearchText('Иога'));
  assert.notEqual(normalizeSearchText('журавль'), normalizeSearchText('журавли'));
  assert.equal(normalizeSearchText('کتاب‌ها'), normalizeSearchText('كتابها'));
  assert.equal(normalizeSearchText('Résumé'), 'resume');
});

test('ordinary Russian queries find titles, notes and filenames with unchanged tier priority', () => {
  const nodes = [
    node('note', 'Other', 'Ёлка в кадре'),
    node('file', 'Other', '', 'root', 'Ёлка-reference.png'),
    node('title', 'Ёлка'),
    node('irrelevant', 'Йога'),
  ];
  const original = JSON.stringify(nodes);
  const result = searchThoughts(nodes, 'елка');
  assert.equal(result.total, 3);
  assert.deepEqual(result.visible.map(hit => hit.id), ['title', 'file', 'note']);
  assert.equal(searchResultPreview(nodes[1], 'елка')?.kind, 'file');
  assert.ok(searchResultPreview(nodes[1], 'елка')?.text.includes('Ёлка'));
  assert.equal(JSON.stringify(nodes), original);
});

test('reciprocal nested Russian project paths and comments are searchable without storage edits', () => {
  const owner = { ...node('parent', 'Container'), childBoardId: 'inner' };
  const leaf = node('leaf', 'Sketch', '', 'inner');
  const commented = { ...node('comment', 'Other'), annotations: [{ id: 'a', quote: 'съёмка', body: 'Замечание: ёлка', createdAt: '2026-11-16' }] };
  const document = { nodes: [owner, leaf, commented], boards: [board('root', 'Студия'), board('inner', 'Проект Ёрема', 'parent')] };
  const original = JSON.stringify(document);
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.get('inner'), 'Студия / Проект Ёрема');
  assert.deepEqual(searchThoughts(document.nodes, 'проект ерема', 70, 0, paths).visible.map(hit => hit.id), ['leaf']);
  assert.deepEqual(searchThoughts(document.nodes, 'елка').visible.map(hit => hit.id), ['comment']);
  assert.equal(searchResultPreview(commented, 'елка')?.kind, 'comment');
  assert.equal(JSON.stringify(document), original);
});

test('balanced Russian phrase stays contiguous and does not combine unrelated terms', () => {
  const nodes = [
    node('spread', 'Ёрема ... сцена'),
    node('exact', 'Ёрема сцена'),
    node('note', 'Other', 'Ёрема сцена'),
  ];
  assert.deepEqual(searchThoughts(nodes, '«Ерема сцена»').visible.map(hit => hit.id), ['exact', 'note']);
  assert.equal(searchThoughts(nodes, '«Ерема кадр»').total, 0);
});

test('151 Russian ё-titled matches retain truthful counts, order and 70/70/11 pagination', () => {
  const nodes = Array.from({ length: 151 }, (_, index) => node(String(index), 'Ёлка ' + index));
  const original = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'елка', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]),
    [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(hit => hit.id)), nodes.map(hit => hit.id));
  assert.deepEqual(searchThoughts(nodes.slice(0, 71), 'елка', SEARCH_PAGE_SIZE, 140).visible.map(hit => hit.id), ['70']);
  assert.equal(JSON.stringify(nodes), original);
});
