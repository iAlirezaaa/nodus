import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function recovered(id: string): GraphNode {
  return {
    id, boardId: 'root', title: 42, text: { unexpected: 'value' },
    asset: { name: ['not a filename'] }, url: 17,
    annotations: [null, { quote: null, body: 'اصلاح نور' }],
  } as unknown as GraphNode;
}

test('malformed imported fields cannot crash a late valid comment or falsify 151 results', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => recovered(String(i)));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'اصلاح', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]),
    [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)), nodes.map(node => node.id));
  assert.deepEqual(searchResultPreview(nodes[0], 'اصلاح'), { kind: 'comment', text: 'اصلاح نور' });
  assert.equal(JSON.stringify(nodes), before, 'search must not repair or overwrite damaged records');
});

test('unusable title, note, filename and URL are ignored without hiding healthy thoughts', () => {
  const bad = recovered('broken');
  const good = { id: 'ok', boardId: 'root', title: 'تصویر نهایی', text: 'یادداشت',
    url: 'https://example.org/lighting', asset: { name: 'storyboard.pdf' } } as GraphNode;
  const nodes = [bad, good];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'نهایی').visible.map(node => node.id), ['ok']);
  assert.deepEqual(searchThoughts(nodes, 'storyboard.pdf').visible.map(node => node.id), ['ok']);
  assert.deepEqual(searchThoughts(nodes, 'lighting').visible.map(node => node.id), ['ok']);
  assert.equal(searchThoughts(nodes, 'not a filename').total, 0);
  assert.equal(searchThoughts(nodes, 'https').total, 1);
  assert.equal(searchResultPreview(bad, 'irrelevant'), null);
  assert.equal(JSON.stringify(nodes), before);
});

test('bad imported board titles use untitled fallback through nested paths and cycles', () => {
  const nodes = [{ id: 'owner', boardId: 'root', title: 'Parent', childBoardId: 'child' },
    { id: 'inside', boardId: 'child', title: 'Inside' }] as GraphNode[];
  const boards = [
    { id: 'root', title: 99, parentNodeId: null },
    { id: 'child', title: false, parentNodeId: 'owner' },
  ] as unknown as Workspace['boards'];
  const snapshot = JSON.stringify({ nodes, boards });
  const paths = buildBoardPaths({ nodes, boards }, 'بدون عنوان');
  assert.equal(paths.get('root'), 'بدون عنوان');
  assert.equal(paths.get('child'), 'بدون عنوان / بدون عنوان');
  assert.deepEqual(searchThoughts(nodes, 'بدون عنوان', 70, 0, paths).visible.map(node => node.id), ['owner', 'inside']);
  assert.equal(JSON.stringify({ nodes, boards }), snapshot);
});

test('valid Persian and English source fields still supply readable result previews', () => {
  const node = { id:'healthy', boardId:'root', title:'Lighting', text:'نور صحنه',
    asset: { name:'Storyboard.pdf' }, url:'https://example.com/lighting' } as GraphNode;
  assert.deepEqual(searchResultPreview(node, 'نور'), { kind:'note', text:'نور صحنه' });
  assert.deepEqual(searchThoughts([node], 'Storyboard').visible.map(n=>n.id), ['healthy']);
  assert.equal(searchThoughts([node], 'missing').total, 0);
});
