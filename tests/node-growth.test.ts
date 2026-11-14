import test from 'node:test';
import assert from 'node:assert/strict';
import type { Board, GraphEdge, GraphNode, Workspace } from '../lib/types';
import { deleteNode } from '../lib/graph.ts';
import { buildNodeGrowth, cardGrowthScale, defaultNodeGrowth, projectCardNode } from '../lib/node-growth.ts';

const time = '2026-11-12T00:00:00.000Z';
function node(id: string, boardId = 'root', patch: Partial<GraphNode> = {}): GraphNode {
  return { id, boardId, kind: 'note', title: id, text: '', x: 0, y: 0, width: 244, height: 172,
    color: 'sage', asset: null, url: '', childBoardId: null, createdAt: time, ...patch };
}
function board(id: string, parentNodeId: string | null = null): Board {
  return { id, parentNodeId, title: id, description: '', createdAt: time };
}
function edge(sourceId: string, targetId: string, boardId = 'root', id = `${sourceId}-${targetId}`): GraphEdge {
  return { id, boardId, sourceId, targetId, label: '' };
}
function workspace(nodes: GraphNode[], edges: GraphEdge[] = [], boards = [board('root')]): Workspace {
  return { version: 1, homeBoardId: 'root', boards, nodes, edges };
}
function star(count: number): Workspace {
  const children = Array.from({ length: count }, (_, index) => node(`child-${index}`));
  return workspace([node('parent'), ...children], children.map(child => edge('parent', child.id)));
}

test('shared card projection preserves the saved center and dimensions while restraining visual growth', () => {
  const original = node('card', 'root', { x: 30, y: -50 });
  const before = structuredClone(original);
  assert.equal(projectCardNode(original), original);
  assert.equal(cardGrowthScale(defaultNodeGrowth), 1);
  const maximum = { ...defaultNodeGrowth, scale: 2.8 };
  assert.equal(cardGrowthScale(maximum), 1.63);
  const visible = projectCardNode(original, maximum);
  assert.equal(visible.width, original.width * 1.63);
  assert.equal(visible.height, original.height * 1.63);
  assert.ok(Math.abs(visible.x + visible.width / 2 - (original.x + original.width / 2)) < 1e-9);
  assert.ok(Math.abs(visible.y + visible.height / 2 - (original.y + original.height / 2)) < 1e-9);
  assert.deepEqual(original, before);
  assert.deepEqual({ ...visible, x: original.x, y: original.y, width: original.width, height: original.height }, original);
});

test('links grow both ends without changing saved rectangles or treating content length as weight', () => {
  const doc = workspace([node('parent'), node('leaf', 'root', { text: 'long content '.repeat(1000), width: 500 }), node('isolated')], [edge('parent', 'leaf')]);
  const original = JSON.stringify(doc);
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.size, 3);
  assert.equal(growth.get('parent')!.direct, 1);
  assert.equal(growth.get('parent')!.incoming, 0);
  assert.equal(growth.get('parent')!.connections, 1);
  assert.equal(growth.get('parent')!.descendants, 1);
  assert.ok(growth.get('parent')!.scale > 1);
  assert.equal(growth.get('leaf')!.direct, 0);
  assert.equal(growth.get('leaf')!.incoming, 1);
  assert.equal(growth.get('leaf')!.connections, 1);
  assert.equal(growth.get('leaf')!.descendants, 0);
  assert.equal(growth.get('leaf')!.scale, growth.get('parent')!.scale);
  assert.deepEqual(growth.get('isolated'), defaultNodeGrowth);
  assert.ok(Object.isFrozen(defaultNodeGrowth));
  assert.equal(JSON.stringify(doc), original);
  assert.equal(buildNodeGrowth(workspace([])).size, 0);
});

test('deduplicates graph and explicit task children while ignoring self, dangling and cross-board links', () => {
  const doc = workspace([
    node('parent', 'root', { task: { status: 'todo', parentId: null } }),
    node('one', 'root', { task: { status: 'done', parentId: 'parent' } }),
    node('two', 'root', { task: { status: 'doing', parentId: 'parent' } }),
    node('three'),
    node('foreign', 'other', { task: { status: 'todo', parentId: 'parent' } }),
  ], [edge('parent', 'one'), edge('parent', 'one', 'root', 'duplicate'), edge('parent', 'three'),
    edge('parent', 'parent'), edge('parent', 'missing'), edge('missing', 'parent'),
    edge('parent', 'foreign'), edge('parent', 'foreign', 'other'), edge('one', 'two', 'other')],
  [board('root'), board('other')]);
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.get('parent')!.direct, 3);
  assert.equal(growth.get('parent')!.connections, 3);
  assert.equal(growth.get('parent')!.descendants, 3);
  for (const id of ['one', 'two', 'three']) {
    assert.equal(growth.get(id)!.incoming, 1);
    assert.equal(growth.get(id)!.connections, 1);
    assert.equal(growth.get(id)!.mass, 1);
  }
  assert.deepEqual(growth.get('foreign'), defaultNodeGrowth);
});

test('incoming hubs grow as much as outgoing hubs while retaining directed branch counts', () => {
  for (const count of [1, 5, 20, 200, 5000]) {
    const outgoing = star(count);
    const incoming = { ...outgoing, edges: outgoing.edges.map(item => ({ ...item, sourceId: item.targetId, targetId: item.sourceId })) };
    const hub = buildNodeGrowth(incoming).get('parent')!;
    const source = buildNodeGrowth(outgoing).get('parent')!;
    assert.equal(hub.direct, 0);
    assert.equal(hub.descendants, 0);
    assert.equal(hub.incoming, count);
    assert.equal(hub.connections, count);
    assert.equal(hub.mass, source.mass);
    assert.equal(hub.scale, source.scale);
  }
});

test('reciprocal, duplicate and explicit task relationships count each neighbor only once', () => {
  const doc = workspace([
    node('a', 'root', { task: { status: 'todo', parentId: null } }),
    node('b', 'root', { task: { status: 'doing', parentId: 'a' } }),
    node('c'),
  ], [edge('a', 'b'), edge('a', 'b', 'root', 'again'), edge('b', 'a'), edge('b', 'a', 'root', 'reverse-again'), edge('c', 'a')]);
  const growth = buildNodeGrowth(doc);
  const a = growth.get('a')!, b = growth.get('b')!;
  assert.equal(a.direct, 1);
  assert.equal(a.incoming, 2);
  assert.equal(a.connections, 2);
  assert.equal(a.mass, 2);
  assert.equal(b.direct, 1);
  assert.equal(b.incoming, 1);
  assert.equal(b.connections, 1);
  assert.equal(b.mass, 1);
});

test('adding a reverse edge in a cycle cannot make a node shrink', () => {
  const doc = workspace(['a', 'b', 'c'].map(id => node(id)), [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]);
  const before = buildNodeGrowth(doc);
  const after = buildNodeGrowth({ ...doc, edges: [...doc.edges, edge('a', 'c')] });
  for (const id of ['a', 'b', 'c']) {
    assert.equal(after.get(id)!.connections, before.get(id)!.connections);
    assert.equal(after.get(id)!.mass, before.get(id)!.mass);
    assert.equal(after.get(id)!.scale, before.get(id)!.scale);
  }
  assert.equal(after.get('a')!.direct, before.get('a')!.direct + 1);
});

test('diamonds and directed cycles count each reachable child once and exclude the source', () => {
  const doc = workspace(['a', 'b', 'c', 'd', 'e'].map(id => node(id)), [
    edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd'), edge('d', 'b'), edge('d', 'e'),
  ]);
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.get('a')!.direct, 2);
  assert.equal(growth.get('a')!.descendants, 4);
  assert.equal(growth.get('b')!.descendants, 2);
  assert.equal(growth.get('c')!.descendants, 3);
  assert.equal(growth.get('d')!.descendants, 2);
  assert.equal(growth.get('e')!.incoming, 1);
  assert.equal(growth.get('e')!.connections, 1);
  assert.equal(growth.get('e')!.descendants, 0);
  assert.equal(growth.get('a')!.mass, 2.7);
});

test('distinguishes exactly 128 descendants from 129+, retaining the real direct count', () => {
  for (const count of [127, 128, 129, 300]) {
    const growth = buildNodeGrowth(star(count)).get('parent')!;
    assert.equal(growth.direct, count);
    assert.equal(growth.descendants, Math.min(128, count));
    assert.equal(growth.descendantsCapped, count > 128);
    assert.equal(growth.mass, count);
  }
  // A cycle contains its source, so a 129-node cycle has exactly 128 descendants.
  for (const count of [129, 130]) {
    const nodes = Array.from({ length: count }, (_, index) => node(`n-${index}`));
    const edges = nodes.map((item, index) => edge(item.id, nodes[(index + 1) % count].id));
    for (const growth of buildNodeGrowth(workspace(nodes, edges)).values()) {
      assert.equal(growth.descendants, 128);
      assert.equal(growth.descendantsCapped, count === 130);
    }
  }
});

test('a contained project counts its own nested contents without including sibling boards', () => {
  const doc = workspace([
    node('project', 'root', { childBoardId: 'inner', kind: 'project' }), node('sibling'),
    node('inside', 'inner'), node('subproject', 'inner', { childBoardId: 'deep' }),
    node('deep-idea', 'deep'), node('unrelated', 'elsewhere'),
    node('empty-project', 'root', { childBoardId: 'empty' }), node('missing-project', 'root', { childBoardId: 'missing' }),
  ], [], [board('root'), board('inner', 'project'), board('deep', 'subproject'), board('elsewhere'), board('empty', 'empty-project')]);
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.get('project')!.nested, 3);
  assert.equal(growth.get('project')!.mass, 1.5);
  assert.equal(growth.get('subproject')!.nested, 1);
  assert.equal(growth.get('project')!.descendants, 0, 'Containment is separate from on-board branches.');
  for (const id of ['sibling', 'inside', 'deep-idea', 'unrelated', 'empty-project', 'missing-project']) {
    assert.deepEqual(growth.get(id), defaultNodeGrowth);
  }
});

test('malformed shared subboards and containment cycles stay finite and never double count', () => {
  const doc = workspace([
    node('portal', 'root', { childBoardId: 'a' }),
    node('a-to-b', 'a', { childBoardId: 'b' }), node('a-to-c', 'a', { childBoardId: 'c' }),
    node('b-to-c', 'b', { childBoardId: 'c' }), node('content', 'c'),
  ], [], ['root', 'a', 'b', 'c'].map(id => board(id)));
  let growth = buildNodeGrowth(doc);
  assert.equal(growth.get('portal')!.nested, 4, 'The shared c board is counted once.');
  assert.equal(growth.get('a-to-b')!.nested, 2);
  assert.equal(growth.get('a-to-c')!.nested, 1);
  doc.nodes[4].childBoardId = 'a';
  growth = buildNodeGrowth(doc);
  assert.equal(growth.get('portal')!.nested, 4);
  for (const id of ['a-to-b', 'a-to-c', 'b-to-c', 'content']) {
    assert.equal(growth.get(id)!.nested, 3, 'A containment cycle excludes only the source node itself.');
    assert.ok(Number.isFinite(growth.get(id)!.scale));
  }
  const self = workspace([node('self', 'root', { childBoardId: 'root' })]);
  assert.deepEqual(buildNodeGrowth(self).get('self'), defaultNodeGrowth);
});

test('deleting a branch or contained project immediately reduces surviving growth', () => {
  const original = workspace([
    node('parent', 'root', { task: { status: 'todo', parentId: null } }),
    node('leaf', 'root', { task: { status: 'todo', parentId: 'parent' } }),
    node('project', 'root', { childBoardId: 'inner' }), node('contained', 'inner'),
  ], [edge('parent', 'leaf'), edge('parent', 'project')], [board('root'), board('inner', 'project')]);
  const before = buildNodeGrowth(original);
  const afterLeaf = deleteNode(original, 'leaf');
  const afterLeafGrowth = buildNodeGrowth(afterLeaf);
  assert.equal(before.get('parent')!.direct, 2);
  assert.equal(afterLeafGrowth.get('parent')!.direct, 1);
  assert.ok(afterLeafGrowth.get('parent')!.scale < before.get('parent')!.scale);
  const afterProject = deleteNode(afterLeaf, 'project');
  assert.deepEqual(buildNodeGrowth(afterProject).get('parent'), defaultNodeGrowth);
  assert.equal(buildNodeGrowth(afterProject).has('contained'), false);
  assert.equal(original.nodes.length, 4);
  assert.equal(before.get('project')!.nested, 1);
});

test('deleting incoming connections shrinks the hub and restoring the document restores its exact growth', () => {
  const original = workspace([node('a'), node('b'), node('hub')], [edge('a', 'hub'), edge('b', 'hub')]);
  const snapshot = structuredClone(original);
  const before = buildNodeGrowth(original).get('hub')!;
  const oneRemoved = buildNodeGrowth(deleteNode(original, 'a')).get('hub')!;
  const bothRemoved = buildNodeGrowth(deleteNode(deleteNode(original, 'a'), 'b')).get('hub')!;
  assert.equal(before.connections, 2);
  assert.equal(oneRemoved.connections, 1);
  assert.ok(oneRemoved.scale < before.scale);
  assert.deepEqual(bothRemoved, defaultNodeGrowth);
  assert.deepEqual(buildNodeGrowth(snapshot).get('hub'), before);
  assert.deepEqual(original, snapshot, 'Derived growth and deletion keep undo history intact.');
});

test('scale grows smoothly and visibly for 1, 5 and 20 branches while staying bounded', () => {
  const scales = [0, 1, 5, 20, 100, 5000].map(count => buildNodeGrowth(star(count)).get('parent')!.scale);
  assert.equal(scales[0], 1);
  assert.ok(Math.abs(scales[1] - 1.398) < 0.01);
  assert.ok(Math.abs(scales[2] - 1.771) < 0.01);
  assert.ok(Math.abs(scales[3] - 2.212) < 0.01);
  for (let index = 1; index < scales.length; index++) {
    assert.ok(scales[index] > scales[index - 1]);
    assert.ok(Number.isFinite(scales[index]) && scales[index] <= 2.8);
  }
});

test('permuting nodes, boards and connections leaves every derived metric unchanged', () => {
  const doc = workspace([
    node('a', 'root', { childBoardId: 'inner' }), node('b'), node('c'), node('d'), node('inside', 'inner'),
  ], [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd'), edge('d', 'b')], [board('root'), board('inner', 'a')]);
  const reordered = { ...doc, nodes: [...doc.nodes].reverse(), edges: [...doc.edges].reverse(), boards: [...doc.boards].reverse() };
  assert.deepEqual(Object.fromEntries(buildNodeGrowth(doc)), Object.fromEntries(buildNodeGrowth(reordered)));
});

test('a 5,000-node graph with thousands of roots sharing a dense cycle keeps exact uncapped counts', () => {
  const cycleSize = 120;
  const nodes = Array.from({ length: 5000 }, (_, index) => node(`n-${index}`));
  const edges: GraphEdge[] = [];
  for (let source = 0; source < cycleSize; source++) {
    for (let target = 0; target < cycleSize; target++) {
      if (source !== target) edges.push(edge(nodes[source].id, nodes[target].id));
    }
  }
  for (let index = cycleSize; index < nodes.length; index++) edges.push(edge(nodes[index].id, nodes[0].id));
  assert.ok(edges.length <= 20000);
  const growth = buildNodeGrowth(workspace(nodes, edges));
  assert.equal(growth.size, 5000);
  assert.equal(growth.get('n-0')!.direct, 119);
  assert.equal(growth.get('n-0')!.incoming, 4999);
  assert.equal(growth.get('n-0')!.connections, 4999);
  assert.equal(growth.get('n-0')!.descendants, 119);
  for (let index = cycleSize; index < nodes.length; index++) {
    const item = growth.get(`n-${index}`)!;
    assert.equal(item.direct, 1);
    assert.equal(item.descendants, 120);
    assert.equal(item.descendantsCapped, false);
    assert.ok(Number.isFinite(item.scale) && item.scale >= 1 && item.scale <= 2.8);
  }
});

test('long branch chains cap correctly without recursive graph traversal', () => {
  const nodes = Array.from({ length: 5000 }, (_, index) => node(`n-${index}`));
  const doc = workspace(nodes, nodes.slice(1).map((item, index) => edge(nodes[index].id, item.id)));
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.get('n-0')!.descendants, 128);
  assert.equal(growth.get('n-0')!.descendantsCapped, true);
  assert.equal(growth.get('n-4871')!.descendants, 128);
  assert.equal(growth.get('n-4871')!.descendantsCapped, false);
  assert.equal(growth.get('n-4998')!.descendants, 1);
  assert.equal(growth.get('n-4999')!.incoming, 1);
  assert.equal(growth.get('n-4999')!.connections, 1);
  assert.equal(growth.get('n-4999')!.descendants, 0);
});

test('very deep contained projects count exactly without stack growth or quadratic ancestor walks', () => {
  // Deliberately deeper than accepted documents to catch accidental recursive DFS.
  const count = 12000;
  const boards = Array.from({ length: count }, (_, index) => board(`b-${index}`, index ? `n-${index - 1}` : null));
  const nodes = boards.map((item, index) => node(`n-${index}`, item.id, { childBoardId: index + 1 < count ? boards[index + 1].id : null }));
  const doc = { ...workspace(nodes, [], boards), homeBoardId: 'b-0' };
  const growth = buildNodeGrowth(doc);
  assert.equal(growth.get('n-0')!.nested, count - 1);
  assert.equal(growth.get('n-6000')!.nested, count - 6001);
  assert.equal(growth.get('n-11998')!.nested, 1);
  assert.deepEqual(growth.get('n-11999'), defaultNodeGrowth);
});
