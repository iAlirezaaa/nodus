import test from 'node:test';
import assert from 'node:assert/strict';
import type { Board, GraphEdge, GraphNode, NodeColor, TaskStatus, Workspace } from '../lib/types';
import { deleteNode } from '../lib/graph.ts';
import { defaultNodeGrowth, projectCardNode } from '../lib/node-growth.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import { deleteSelectedNodes, mergeNodeSelection, nodesInSelection, selectionRectangle, updateSelectedNodes } from '../lib/node-selection.ts';

const createdAt = '2026-11-12T12:00:00.000Z';
function node(id: string, patch: Partial<GraphNode> = {}): GraphNode {
  return { id, boardId: 'root', kind: 'note', title: id, text: 'Keep this text', x: 0, y: 0, width: 244, height: 172,
    color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch };
}
function board(id: string, parentNodeId: string | null = null): Board {
  return { id, title: id, description: '', parentNodeId, createdAt };
}
function edge(sourceId: string, targetId: string, boardId = 'root'): GraphEdge {
  return { id: `${sourceId}-${targetId}`, boardId, sourceId, targetId, label: '' };
}
function workspace(nodes: GraphNode[], edges: GraphEdge[] = [], boards = [board('root')]): Workspace {
  return { version: 1, homeBoardId: 'root', nodes, edges, boards };
}

test('marquee bounds normalize all four drag directions and reject non-finite positions', () => {
  const expected = { x: -30, y: -20, width: 90, height: 60 };
  for (const [a, b] of [
    [{ x: -30, y: -20 }, { x: 60, y: 40 }], [{ x: 60, y: 40 }, { x: -30, y: -20 }],
    [{ x: -30, y: 40 }, { x: 60, y: -20 }], [{ x: 60, y: -20 }, { x: -30, y: 40 }],
  ]) assert.deepEqual(selectionRectangle(a, b), expected);
  for (const a of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: -Infinity, y: 0 }]) {
    assert.deepEqual(selectionRectangle(a, { x: 10, y: 10 }), { x: 0, y: 0, width: 0, height: 0 });
  }
  assert.deepEqual(selectionRectangle({ x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 10 }), { x: 0, y: 0, width: 0, height: 0 });
});

test('range selection includes partial overlap, deduplicates IDs and excludes boundary-only contact', () => {
  const nodes = [
    node('partial', { x: 0, y: 0, width: 20, height: 20 }),
    node('inside', { x: 15, y: 15, width: 5, height: 5 }),
    node('partial', { x: 30, y: 20, width: 20, height: 20 }),
    node('right-touch', { x: 40, y: 15, width: 10, height: 10 }),
    node('bottom-touch', { x: 10, y: 30, width: 10, height: 10 }),
    node('outside', { x: 60, y: 60, width: 10, height: 10 }),
  ];
  assert.deepEqual(nodesInSelection(nodes, selectionRectangle({ x: 40, y: 30 }, { x: 10, y: 10 })), ['partial', 'inside']);
  assert.deepEqual(nodesInSelection(nodes, { x: 10, y: 10, width: 0, height: 20 }), []);
  assert.deepEqual(nodesInSelection(nodes, { x: 10, y: 10, width: 20, height: 0 }), []);
});

test('range selection uses passed projected bounds rather than saved card dimensions', () => {
  const saved = node('grown', { x: 0, y: 0, width: 100, height: 100 });
  const projected = projectCardNode(saved, { ...defaultNodeGrowth, scale: 2.8 });
  const rect = selectionRectangle({ x: -25, y: -25 }, { x: -10, y: -10 });
  assert.deepEqual(nodesInSelection([saved], rect), []);
  assert.deepEqual(nodesInSelection([projected], rect), ['grown']);
  assert.equal(saved.x, 0);
  assert.equal(saved.width, 100);
});

test('invalid geometry cannot select invisible or infinite nodes', () => {
  const rect = { x: -10, y: -10, width: 30, height: 30 };
  const valid = node('valid', { width: 10, height: 10 });
  const invalid = [
    node('nan', { x: NaN }), node('infinite', { y: Infinity }), node('negative', { width: -5 }),
    node('zero', { height: 0 }), node('overflow', { x: Number.MAX_VALUE, width: Number.MAX_VALUE }),
  ];
  assert.deepEqual(nodesInSelection([...invalid, valid], rect), ['valid']);
  for (const patch of [{ x: NaN }, { y: Infinity }, { width: -1 }, { height: -1 }, { width: Infinity }]) {
    assert.deepEqual(nodesInSelection([valid], { ...rect, ...patch }), []);
  }
});

test('replace, add and toggle keep stable unique selections without mutating their inputs', () => {
  const existing = Object.freeze(['a', 'b', 'a']);
  const hits = Object.freeze(['b', 'c', 'b', 'c', 'd']);
  assert.deepEqual(mergeNodeSelection(existing, hits, 'replace'), ['b', 'c', 'd']);
  assert.deepEqual(mergeNodeSelection(existing, hits, 'add'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(mergeNodeSelection(existing, hits, 'toggle'), ['a', 'c', 'd']);
  assert.deepEqual(mergeNodeSelection(existing, [], 'replace'), []);
  assert.deepEqual(mergeNodeSelection(existing, [], 'toggle'), ['a', 'b']);
  assert.deepEqual(mergeNodeSelection(['a', 'b'], ['b', 'b'], 'toggle'), ['a']);
  assert.deepEqual(existing, ['a', 'b', 'a']);
  assert.deepEqual(hits, ['b', 'c', 'b', 'c', 'd']);
});

test('bulk appearance and status edits are scoped, preserve ancestry, and convert plain notes into root tasks', () => {
  const original = workspace([
    node('parent', { task: { status: 'doing', parentId: null } }),
    node('child', { task: { status: 'todo', parentId: 'parent' }, scheduledAt: '2026-12-01' }),
    node('plain'), node('untouched'), node('foreign', { boardId: 'other' }),
  ], [edge('parent', 'child')], [board('root'), board('other')]);
  const snapshot = structuredClone(original);
  const result = updateSelectedNodes(original, 'root', ['child', 'plain', 'child', 'missing', 'foreign'], { color: 'violet', status: 'done' });
  assert.equal(result.nodes[1].color, 'violet');
  assert.deepEqual(result.nodes[1].task, { status: 'done', parentId: 'parent' });
  assert.equal(result.nodes[1].scheduledAt, '2026-12-01');
  assert.deepEqual(result.nodes[2].task, { status: 'done', parentId: null });
  assert.equal(result.nodes[2].text, 'Keep this text');
  for (const index of [0, 3, 4]) assert.equal(result.nodes[index], original.nodes[index]);
  assert.equal(result.edges, original.edges);
  assert.equal(result.boards, original.boards);
  assert.deepEqual(original, snapshot);
  assert.equal(validateWorkspace(result), result);
});

test('removing task status from multiple ancestors promotes surviving subtasks once without removing graph links', () => {
  const original = workspace([
    node('a', { task: { status: 'doing', parentId: null } }),
    node('b', { task: { status: 'todo', parentId: 'a' } }),
    node('c', { task: { status: 'done', parentId: 'b' } }),
    node('d', { task: { status: 'todo', parentId: 'a' } }),
    node('e', { task: { status: 'doing', parentId: 'c' } }),
  ], [edge('a', 'b'), edge('b', 'c'), edge('a', 'd'), edge('c', 'e')]);
  const result = updateSelectedNodes(original, 'root', ['a', 'b'], { status: null, color: 'rose' });
  for (const index of [0, 1]) {
    assert.equal(Object.hasOwn(result.nodes[index], 'task'), false);
    assert.equal(result.nodes[index].color, 'rose');
  }
  assert.deepEqual(result.nodes[2].task, { status: 'done', parentId: null });
  assert.deepEqual(result.nodes[3].task, { status: 'todo', parentId: null });
  assert.equal(result.nodes[2].color, original.nodes[2].color);
  assert.equal(result.nodes[4], original.nodes[4]);
  assert.equal(result.edges, original.edges);
  assert.equal(validateWorkspace(result), result);
});

test('empty, stale, foreign-board and already-applied updates retain document identity', () => {
  const doc = workspace([node('plain'), node('task', { task: { status: 'doing', parentId: null } }), node('foreign', { boardId: 'other' })], [], [board('root'), board('other')]);
  for (const ids of [[], ['missing'], ['foreign']]) {
    assert.equal(updateSelectedNodes(doc, 'root', ids, { color: 'rose', status: 'todo' }), doc);
    assert.equal(deleteSelectedNodes(doc, 'root', ids), doc);
  }
  assert.equal(updateSelectedNodes(doc, 'missing-board', ['plain'], { color: 'rose' }), doc);
  assert.equal(deleteSelectedNodes(doc, 'missing-board', ['plain']), doc);
  assert.equal(updateSelectedNodes(doc, 'root', ['plain'], {}), doc);
  assert.equal(updateSelectedNodes(doc, 'root', ['plain'], { color: 'sage', status: null }), doc);
  assert.equal(updateSelectedNodes(doc, 'root', ['task'], { color: 'sage', status: 'doing' }), doc);
});

test('invalid bulk values fail atomically before changing any selected node', () => {
  const doc = workspace([node('a'), node('b')]);
  const snapshot = structuredClone(doc);
  assert.throws(() => updateSelectedNodes(doc, 'root', ['a', 'b'], { color: 'invalid' as NodeColor }), /color/);
  assert.throws(() => updateSelectedNodes(doc, 'root', ['a', 'b'], { color: 'blue', status: 'invalid' as TaskStatus }), /status/);
  assert.deepEqual(doc, snapshot);
});

test('bulk delete matches existing containment semantics while preserving linked nodes and other boards', () => {
  const original = workspace([
    node('project', { kind: 'project', childBoardId: 'inner', task: { status: 'doing', parentId: null } }),
    node('remove-also'), node('linked'),
    node('child', { task: { status: 'todo', parentId: 'project' } }),
    node('grandchild', { task: { status: 'done', parentId: 'child' } }),
    node('inner-project', { boardId: 'inner', kind: 'project', childBoardId: 'deep' }),
    node('inside', { boardId: 'inner' }), node('deep-note', { boardId: 'deep' }),
    node('foreign', { boardId: 'other' }),
  ], [edge('project', 'linked'), edge('project', 'child'), edge('child', 'grandchild'), edge('remove-also', 'linked'), edge('inner-project', 'inside', 'inner')],
  [board('root'), board('inner', 'project'), board('deep', 'inner-project'), board('other')]);
  const snapshot = structuredClone(original);
  const result = deleteSelectedNodes(original, 'root', ['project', 'remove-also', 'project', 'foreign', 'missing']);
  assert.deepEqual(result.nodes.map(item => item.id), ['linked', 'child', 'grandchild', 'foreign']);
  assert.deepEqual(result.boards.map(item => item.id), ['root', 'other']);
  assert.deepEqual(result.edges.map(item => item.id), ['child-grandchild']);
  assert.deepEqual(result.nodes[1].task, { status: 'todo', parentId: null });
  assert.deepEqual(result.nodes[2].task, { status: 'done', parentId: 'child' });
  assert.equal(result.nodes[0], original.nodes[2]);
  assert.equal(result.nodes[3], original.nodes[8]);
  assert.deepEqual(result, deleteNode(deleteNode(original, 'project'), 'remove-also'));
  assert.deepEqual(original, snapshot);
  assert.equal(validateWorkspace(result), result);
});

test('selecting a task parent and child deletes only those tasks and promotes the remaining grandchild', () => {
  const original = workspace([
    node('a', { task: { status: 'doing', parentId: null } }),
    node('b', { task: { status: 'todo', parentId: 'a' } }),
    node('c', { task: { status: 'done', parentId: 'b' } }), node('linked'),
  ], [edge('a', 'b'), edge('b', 'c'), edge('a', 'linked'), edge('c', 'linked')]);
  const result = deleteSelectedNodes(original, 'root', ['b', 'a']);
  assert.deepEqual(result.nodes.map(item => item.id), ['c', 'linked']);
  assert.deepEqual(result.nodes[0].task, { status: 'done', parentId: null });
  assert.deepEqual(result.edges.map(item => item.id), ['c-linked']);
  assert.equal(validateWorkspace(result), result);
});

test('malformed shared containment and cycles cannot delete home or leave surviving project pointers dangling', () => {
  const doc = workspace([
    node('remove', { childBoardId: 'inner' }), node('keep', { childBoardId: 'inner' }),
    node('cycle', { boardId: 'inner', childBoardId: 'root' }), node('extra', { boardId: 'owned-only' }),
  ], [], [board('root', 'cycle'), board('inner', 'remove'), board('owned-only', 'remove')]);
  const result = deleteSelectedNodes(doc, 'root', ['remove']);
  assert.deepEqual(result.boards.map(item => item.id), ['root']);
  assert.deepEqual(result.nodes.map(item => item.id), ['keep']);
  assert.equal(result.nodes[0].childBoardId, null);
  assert.equal(result.homeBoardId, 'root');
});

test('5,000-node edits, range selection and deletion stay bounded and form one immutable result', () => {
  const nodes = Array.from({ length: 5000 }, (_, index) => node(`n-${index}`, {
    x: index % 100 * 300, y: Math.floor(index / 100) * 220,
    task: { status: 'todo', parentId: index ? `n-${index - 1}` : null },
  }));
  const doc = workspace([...nodes, node('foreign', { boardId: 'other' })], [], [board('root'), board('other')]);
  const ids = nodesInSelection(nodes, { x: -1, y: -1, width: 30200, height: 11200 });
  assert.equal(ids.length, 5000);
  const updated = updateSelectedNodes(doc, 'root', ids, { color: 'blue', status: 'done' });
  assert.ok(updated.nodes.slice(0, 5000).every(item => item.color === 'blue' && item.task?.status === 'done'));
  assert.equal(updated.nodes[5000], doc.nodes[5000]);
  assert.equal(updated.nodes[4999].task?.parentId, 'n-4998');
  const removed = deleteSelectedNodes(doc, 'root', [...ids, ...ids]);
  assert.deepEqual(removed.nodes, [doc.nodes[5000]]);
  assert.equal(removed.boards, doc.boards);
  assert.equal(doc.nodes.length, 5001, 'The input remains the complete snapshot for a single undo.');
  assert.equal(doc.nodes[0].color, 'sage');
});

test('deep project deletion uses an iterative containment traversal', () => {
  const count = 5000;
  const boards = Array.from({ length: count }, (_, index) => board(index ? `b-${index}` : 'root', index ? `n-${index - 1}` : null));
  const nodes = boards.map((item, index) => node(`n-${index}`, { boardId: item.id, childBoardId: boards[index + 1]?.id ?? null }));
  const doc = workspace(nodes, [], boards);
  const result = deleteSelectedNodes(doc, 'root', ['n-0']);
  assert.equal(result.nodes.length, 0);
  assert.deepEqual(result.boards, [doc.boards[0]]);
  assert.equal(doc.nodes.length, count);
});
