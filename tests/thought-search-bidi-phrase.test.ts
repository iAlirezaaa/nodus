import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function node(id: string, title: string, text = '', boardId = 'root'): GraphNode {
  return { id, title, text, boardId, asset: null } as GraphNode;
}
function board(id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] {
  return { id, title, parentNodeId, description: '', createdAt: '2026-11-14T00:00:00.000Z' };
}

test('copied RTL wrappers preserve exact field-local phrase matches and avoid cross-field false positives', () => {
  const nodes = [
    node('title', 'سلام دنیا'),
    node('notes', 'Other title', 'سلام دنیا'),
    node('cross', 'سلام', 'دنیا'),
    node('unrelated', 'Some other note'),
  ];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '\u200F«سلام دنیا»\u200E').visible.map(n => n.id), ['title', 'notes']);
  assert.equal(searchThoughts(nodes, '\u200F«سلام دنیا»\u200E').total, 2);
  assert.equal(JSON.stringify(nodes), before);
});

test('bidi-wrapped quoted English phrase searches nested project paths without changing ancestry', () => {
  const doc = {
    boards: [board('root', 'Studio'), board('nested', 'the red fox', 'owner')],
    nodes: [
      { ...node('owner', 'Project'), childBoardId: 'nested' },
      node('inside', 'Take 07', '', 'nested'),
      node('outside', 'Take 08', '', 'root'),
    ],
  };
  const paths = buildBoardPaths(doc, 'Untitled');
  const query = '\u202B “the red fox” \u202C';
  assert.equal(paths.get('nested'), 'Studio / the red fox');
  assert.deepEqual(searchThoughts(doc.nodes, query, 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.equal(paths.get('nested'), 'Studio / the red fox');
});

test('151 copied and wrapped Persian phrase matches remain page-capped and honestly counted', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => node(String(i), 'فصل اول'));
  const query = '\u2067  «فصل اول» \u2069';
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, query, SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
});

test('empty quotes inside copied formatting remain zero results while truly blank searches browse', () => {
  const nodes = [node('n', 'Hello world')];
  assert.equal(searchThoughts(nodes, '\u200F«»\u200E').total, 0);
  assert.equal(searchThoughts(nodes, '\u2067\u200F').total, 0);
  assert.equal(searchThoughts(nodes, '  ').total, 1);
});

test('unbalanced mixed-direction quote does not become a phrase', () => {
  const nodes = [node('n', 'سلام دنیا')];
  assert.equal(searchThoughts(nodes, '\u200F«سلام دنیا\u200E').total, 0);
});
