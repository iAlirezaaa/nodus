import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function board(id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] {
  return { id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00.000Z' };
}
function node(id: string, boardId: string, childBoardId: string | null = null): GraphNode {
  return { id, boardId, childBoardId, title: id, text: '', asset: null } as GraphNode;
}
function invalidCycle(order: string[]) {
  const byId = {
    a: board('a', 'Alpha', 'from-b'),
    b: board('b', 'Beta', 'from-a'),
    tail: board('tail', 'Tail', 'from-tail'),
  };
  return {
    boards: order.map(id => byId[id as keyof typeof byId]),
    nodes: [
      node('from-a', 'a', 'b'),
      node('from-b', 'b', 'a'),
      node('from-tail', 'a', 'tail'),
      node('idea', 'a'),
      node('nested', 'tail'),
    ],
  };
}
for (const order of [['a', 'b', 'tail'], ['tail', 'b', 'a'], ['b', 'tail', 'a']]) {
  test('cyclic containment has truthful, order-independent paths: ' + order.join('-'), () => {
    const doc = invalidCycle(order);
    const paths = buildBoardPaths(doc, 'Untitled');
    assert.equal(paths.get('a'), 'Alpha');
    assert.equal(paths.get('b'), 'Beta');
    assert.equal(paths.get('tail'), 'Alpha / Tail');
    assert.deepEqual(searchThoughts([doc.nodes[3]], 'Beta', 70, 0, paths).visible, []);
    assert.deepEqual(searchThoughts([doc.nodes[4]], 'Alpha', 70, 0, paths).visible.map(n => n.id), ['nested']);
    assert.equal(doc.boards.find(b => b.id === 'a')?.parentNodeId, 'from-b');
  });
}
test('valid deep project paths and normal title search stay unchanged', () => {
  const doc = {
    boards: [board('root', 'Studio'), board('child', 'Episode', 'owner'), board('grand', 'Shot 12', 'inner')],
    nodes: [node('owner', 'root', 'child'), node('inner', 'child', 'grand'), node('take', 'grand')],
  };
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.get('grand'), 'Studio / Episode / Shot 12');
  assert.deepEqual(searchThoughts([doc.nodes[2]], 'Studio', 70, 0, paths).visible.map(n => n.id), ['take']);
});
