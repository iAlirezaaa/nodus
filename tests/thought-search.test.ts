import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function thought(id: string, title: string, boardId = 'root', text = '', assetName?: string): GraphNode {
  return { id, boardId, title, text, asset: assetName ? { name: assetName } : null } as GraphNode;
}
function board(id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] {
  return { id, title, parentNodeId, description: '', createdAt: '2026-11-12T00:00:00.000Z' };
}
test('search counts 151 hits but first renders 70, then 140, then all', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Idea ' + i));
  const first = searchThoughts(nodes, 'idea');
  assert.equal(first.total, 151);
  assert.equal(first.visible.length, SEARCH_PAGE_SIZE);
  assert.deepEqual(first.visible.map(n => n.id), nodes.slice(0, 70).map(n => n.id));
  assert.equal(searchThoughts(nodes, 'idea', 140).visible.length, 140);
  const last = searchThoughts(nodes, 'idea', 210);
  assert.equal(last.visible.length, 151);
  assert.equal(last.visible.at(-1)?.id, '150');
});
test('zero, 70 and 71 results are honestly counted and limits are bounded', () => {
  const nodes = Array.from({ length: 71 }, (_, i) => thought(String(i), 'Find me'));
  assert.deepEqual(searchThoughts(nodes, 'absent'), { visible: [], total: 0, offset: 0 });
  assert.equal(searchThoughts(nodes.slice(0, 70), 'find').total, 70);
  assert.equal(searchThoughts(nodes, 'find').total, 71);
  assert.equal(searchThoughts(nodes, 'find').visible.length, 70);
  assert.equal(searchThoughts(nodes, 'find', 0).visible.length, 0);
  assert.equal(searchThoughts(nodes, 'find', -10).visible.length, 0);
  assert.equal(searchThoughts([], '').total, 0);
});
test('Persian title, English notes and attachment filename search remain intact', () => {
  const nodes = [thought('a', 'سلام دنیا'), thought('b', 'One', 'root', 'Long english NOTE'), thought('c', 'Reference', 'root', '', 'Storyboard.PDF')];
  assert.deepEqual(searchThoughts(nodes, 'سلام').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts(nodes, 'note').visible.map(n => n.id), ['b']);
  assert.deepEqual(searchThoughts(nodes, 'PDF').visible.map(n => n.id), ['c']);
  assert.equal(searchThoughts(nodes, '  ').total, 3);
});
test('nested full paths disambiguate same-titled boards across different roots', () => {
  const doc = { boards: [board('root', 'Studio'), board('child', 'Episode', 'parent'), board('grand', 'Shot 12', 'container'), board('other', 'Episode')], nodes: [thought('parent', 'Container', 'root'), thought('container', 'Container 2', 'child')] };
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.get('root'), 'Studio');
  assert.equal(paths.get('child'), 'Studio / Episode');
  assert.equal(paths.get('grand'), 'Studio / Episode / Shot 12');
  assert.equal(paths.get('other'), 'Episode');
});
test('broken parent pointers and cycles terminate without unbounded traversal', () => {
  const doc = { boards: [board('a', '', 'in-b'), board('b', 'B', 'in-a'), board('orphan', 'Orphan', 'missing')], nodes: [thought('in-b', 'Cross', 'b'), thought('in-a', 'Cross', 'a')] };
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.size, 3);
  assert.ok(paths.get('a')?.includes('Untitled'));
  assert.ok(paths.get('b')?.includes('B'));
  assert.equal(paths.get('orphan'), 'Orphan');
});

test('pages stay bounded and access all 151 matches without duplication', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Brainstorm ' + i));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'brainstorm', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => page.visible.length), [70, 70, 11]);
  assert.deepEqual(pages.map(page => page.offset), [0, 70, 140]);
  assert.ok(pages.every(page => page.total === 151));
  assert.deepEqual(pages.flatMap(page => page.visible.map(n => n.id)), nodes.map(n => n.id));
});

test('out-of-range page after document shrink clamps to last non-empty page', () => {
  const nodes = Array.from({ length: 81 }, (_, i) => thought(String(i), 'Search ' + i));
  const page = searchThoughts(nodes, 'search', SEARCH_PAGE_SIZE, 140);
  assert.equal(page.offset, 70);
  assert.equal(page.visible.length, 11);
  assert.deepEqual(page.visible.map(n => n.id), nodes.slice(70).map(n => n.id));
  assert.deepEqual(searchThoughts(nodes, 'missing', SEARCH_PAGE_SIZE, 140), { visible: [], total: 0, offset: 140 });
});

test('invalid offsets, partial pages and zero cap are safe', () => {
  const nodes = Array.from({ length: 9 }, (_, i) => thought(String(i), 'Idea ' + i));
  assert.equal(searchThoughts(nodes, 'idea', 3, -10).offset, 0);
  assert.deepEqual(searchThoughts(nodes, 'idea', 3, 4).visible.map(n => n.id), ['3', '4', '5']);
  assert.equal(searchThoughts(nodes, 'idea', 3, Number.POSITIVE_INFINITY).offset, 0);
  assert.deepEqual(searchThoughts(nodes, 'idea', 0, 100), { visible: [], total: 9, offset: 0 });
});
