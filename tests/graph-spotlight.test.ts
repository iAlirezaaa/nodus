import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNode } from '../lib/graph.ts';
import { graphSpotlight } from '../lib/graph-spotlight.ts';
import type { GraphEdge, GraphNode } from '../lib/types.ts';

function star(neighbors: number) {
  const hub = makeNode('home', 'note', 0, 0, { id: 'hub', title: 'Hub' });
  const nodes: GraphNode[] = [hub, ...Array.from({ length: neighbors }, (_, i) => makeNode('home', 'note', 0, 0, {
    id: 'n' + i, title: 'Idea ' + String(i).padStart(4, '0'),
  }))];
  const edges: GraphEdge[] = nodes.slice(1).map((node, i) => ({ id: 'e' + i, boardId: 'home', sourceId: hub.id, targetId: node.id, label: '' }));
  return { nodes, edges };
}

for (const count of [20, 100, 500]) {
  test(count + ' linked ideas have truthful counts and bounded reading pages', () => {
    const { nodes, edges } = star(count);
    const before = JSON.stringify({ nodes, edges });
    const first = graphSpotlight(nodes, edges, 'hub', 0, 10)!;
    const last = graphSpotlight(nodes, edges, 'hub', 999999, 10)!;
    assert.equal(first.neighborCount, count);
    assert.equal(first.pageCount, Math.ceil(count / 10));
    assert.equal(first.shown, 10);
    assert.equal(first.nodeIds.size, 11);
    assert.equal(first.edgeIds.size, 10);
    assert.equal(last.page, first.pageCount - 1);
    assert.equal(last.nodeIds.size, 11);
    assert.ok(first.nodeIds.has('hub'));
    assert.ok(last.nodeIds.has('hub'));
    assert.equal(JSON.stringify({ nodes, edges }), before);
  });
}

test('pagination reveals other neighbors without hiding or deleting real nodes', () => {
  const { nodes, edges } = star(37);
  const first = graphSpotlight(nodes, edges, 'hub', 0, 10)!;
  const second = graphSpotlight(nodes, edges, 'hub', 1, 10)!;
  assert.equal(first.neighborCount, 37);
  assert.equal(second.neighborCount, 37);
  assert.equal(first.pageCount, 4);
  assert.equal([...first.nodeIds].filter(id => id !== 'hub' && second.nodeIds.has(id)).length, 0);
  assert.equal(nodes.length, 38);
  assert.equal(edges.length, 37);
});

test('cycles, duplicate/reverse links, missing cross-board ids, and task parents count once', () => {
  const hub = makeNode('home', 'note', 0, 0, { id: 'hub' });
  const a = makeNode('home', 'note', 0, 0, { id: 'a' });
  const b = makeNode('home', 'note', 0, 0, { id: 'b', task: { status: 'todo', parentId: 'hub' } });
  const foreign = makeNode('foreign', 'note', 0, 0, { id: 'foreign' });
  const edges: GraphEdge[] = [
    { id: '1', boardId: 'home', sourceId: 'hub', targetId: 'a', label: '' },
    { id: '2', boardId: 'home', sourceId: 'a', targetId: 'hub', label: '' },
    { id: '3', boardId: 'home', sourceId: 'hub', targetId: 'foreign', label: '' },
    { id: '4', boardId: 'foreign', sourceId: 'foreign', targetId: 'hub', label: '' },
    { id: '5', boardId: 'home', sourceId: 'hub', targetId: 'hub', label: '' },
  ];
  const spot = graphSpotlight([hub, a, b, foreign], edges, 'hub')!;
  assert.equal(spot.neighborCount, 2);
  assert.equal(spot.nodeIds.size, 3);
  assert.equal(spot.edgeIds.size, 2);
  assert.equal(graphSpotlight([hub,a,b], edges, 'missing'), null);
});
