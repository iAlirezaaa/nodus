import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function thought(id: string, title: string, boardId = 'home'): GraphNode {
  return { id, title, boardId, text: '', asset: null, url: null } as GraphNode;
}
const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), i === 9 ? 'کتاب ۱۲' : 'Idea ' + i));

for (const query of ['""', '“”', '«»', '«   »', '\u200f', '\u061c', '\u0640', '\u0651', '\u200c']) {
  test('normalized-empty explicit query does not expose an all-results browse: ' + JSON.stringify(query), () => {
    assert.deepEqual(searchThoughts(nodes, query), { visible: [], total: 0, offset: 0 });
    assert.deepEqual(searchThoughts(nodes, query, SEARCH_PAGE_SIZE, 140), { visible: [], total: 0, offset: 0 });
  });
}

test('actually blank query keeps browse and exact 70/70/11 page boundaries', () => {
  assert.deepEqual([0, 70, 140].map(offset => {
    const page = searchThoughts(nodes, '   ', SEARCH_PAGE_SIZE, offset);
    return [page.total, page.offset, page.visible.length];
  }), [[151,0,70], [151,70,70], [151,140,11]]);
  assert.deepEqual(searchThoughts(nodes, '').visible.map(node => node.id), nodes.slice(0,70).map(node => node.id));
});

test('valid Persian and English query, project path and source identity remain intact', () => {
  const doc = {
    boards: [{ id: 'home', title: 'خانه', parentNodeId: null, description: '', createdAt: '2026-11-14T00:00:00Z' }],
    nodes,
  } as Pick<Workspace, 'boards'|'nodes'>;
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.deepEqual(searchThoughts(nodes, 'كتاب 12').visible.map(node => node.id), ['9']);
  assert.deepEqual(searchThoughts(nodes, '«کتاب ۱۲»').visible.map(node => node.id), ['9']);
  assert.equal(searchThoughts(nodes, 'idea').total, 150);
  assert.equal(searchThoughts(nodes, 'خانه', SEARCH_PAGE_SIZE, 0, paths).total, 151);
  assert.equal(nodes[9].title, 'کتاب ۱۲');
});
