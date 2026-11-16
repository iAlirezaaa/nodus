import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const buildFixture = () => {
  const folder = { id: 'owner', boardId: 'root', title: 'پروژه', childBoardId: 'child' } as GraphNode;
  const nested = Array.from({ length: 151 }, (_, i) =>
    ({ id: 'inside-' + i, boardId: 'child', title: 'یادداشت ' + i, text: '' } as GraphNode));
  const boards = [
    { id: 'root', title: 'ریشه', parentNodeId: null },
    { id: 'child', title: 'پروژه', parentNodeId: 'owner' },
  ] as Workspace['boards'];
  const nodes = [folder, ...nested];
  return { nodes, nested, boards, paths: buildBoardPaths({ nodes, boards }, 'بدون عنوان') };
};

test('copied RTL breadcrumb separators locate all nested nodes with honest pages and no writes', () => {
  const fixture = buildFixture();
  const snapshot = JSON.stringify({ nodes: fixture.nodes, boards: fixture.boards });
  assert.equal(fixture.paths.get('child'), 'ریشه / پروژه');
  for (const query of ['ریشه › پروژه', 'ریشه > پروژه', 'ریشه / پروژه']) {
    const pages = [0, 70, 140].map(offset =>
      searchThoughts(fixture.nodes, query, SEARCH_PAGE_SIZE, offset, fixture.paths));
    assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]),
      [[151, 0, 70], [151, 70, 70], [151, 140, 11]], query);
    assert.deepEqual(pages.flatMap(p => p.visible.map(node => node.id)),
      fixture.nested.map(node => node.id), query);
    assert.deepEqual(searchResultPreview(fixture.nested[0], query, fixture.paths.get('child')),
      { kind: 'project', text: '' }, query);
  }
  assert.equal(JSON.stringify({ nodes: fixture.nodes, boards: fixture.boards }), snapshot);
});

test('quoted breadcrumb punctuation remains a literal phrase and does not match unrelated paths', () => {
  const { nodes, paths } = buildFixture();
  for (const quote of ['"ریشه › پروژه"', '"ریشه > پروژه"']) {
    assert.equal(searchThoughts(nodes, quote, 70, 0, paths).total, 0);
  }
  const exact = { id: 'exact', boardId: 'root', title: 'ریشه › پروژه' } as GraphNode;
  const hits = searchThoughts([...nodes, exact], 'ریشه › پروژه', 70, 0, paths);
  assert.equal(hits.total, 152);
  assert.equal(hits.visible[0]?.id, 'exact', 'direct title relevance stays first');
  assert.deepEqual(searchResultPreview(exact, 'ریشه › پروژه', paths.get('root')),
    { kind: 'title', text: '' });
  assert.deepEqual(searchThoughts([...nodes, exact], '"ریشه › پروژه"', 70, 0, paths)
    .visible.map(node => node.id), ['exact']);
});

test('English nested paths accept copied chevrons without altering stored board titles', () => {
  const nested = { id: 'inside', boardId: 'child', title: 'Shot list' } as GraphNode;
  const paths = new Map([['child', 'Studio / Film / Scenes']]);
  for (const query of ['Studio > Film > Scenes', 'Studio › Film › Scenes']) {
    const page = searchThoughts([nested], query, 70, 0, paths);
    assert.equal(page.total, 1);
    assert.equal(page.visible[0]?.id, 'inside');
    assert.deepEqual(searchResultPreview(nested, query, paths.get('child')),
      { kind: 'project', text: '' });
  }
  assert.equal(paths.get('child'), 'Studio / Film / Scenes');
});
