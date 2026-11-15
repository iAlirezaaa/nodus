import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

// Legacy/corrupt imported rows must not crash a *derived* search or mutate
// the original data; canonical graph validation remains independent.
const node = (id: string, title: unknown, text: unknown): GraphNode =>
  Object.freeze({ id, boardId: 'root', title, text, asset: null, annotations: null }) as unknown as GraphNode;

test('one missing title does not block results from valid thoughts', () => {
  const malformed = node('legacy', undefined, undefined);
  const normal = node('normal', 'Camera layout', 'Planning in Persian');
  const nodes = Object.freeze([malformed, normal]);
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'camera').visible.map(n => n.id), ['normal']);
  assert.deepEqual(searchThoughts(nodes, 'persian').visible.map(n => n.id), ['normal']);
  assert.deepEqual(searchThoughts(nodes, 'not found'), { visible: [], total: 0, offset: 0 });
  assert.deepEqual(searchThoughts(nodes, '').visible.map(n => n.id), ['legacy', 'normal']);
  assert.equal(JSON.stringify(nodes), before, 'lookup must not repair/write imported data');
});

test('a missing note must not interrupt valid title matches or later pages', () => {
  const malformed = node('legacy-note', 'Archive', undefined);
  const valid = Array.from({ length: 71 }, (_, i) => node(String(i), 'ایده Camera ' + i, 'note ' + i));
  const nodes = Object.freeze([malformed, ...valid]);
  const original = JSON.stringify(nodes);
  const first = searchThoughts(nodes, 'camera', SEARCH_PAGE_SIZE, 0);
  const second = searchThoughts(nodes, 'camera', SEARCH_PAGE_SIZE, 70);
  assert.deepEqual([first.total, first.visible.length, first.offset], [71, 70, 0]);
  assert.deepEqual([second.total, second.visible.length, second.offset], [71, 1, 70]);
  assert.deepEqual([...first.visible, ...second.visible].map(n => n.id), valid.map(n => n.id));
  assert.equal(JSON.stringify(nodes), original);
});

test('missing legacy board titles use fallback without losing valid nested ancestry', () => {
  const board = (id: string, title: unknown, parentNodeId: string | null) =>
    ({ id, title, parentNodeId, description: '', createdAt: '2026-11-15T00:00:00Z' }) as Workspace['boards'][number];
  const doc = Object.freeze({
    boards: Object.freeze([board('root', undefined, null), board('child', null, 'owner'), board('sibling', 'Studio', null)]),
    nodes: Object.freeze([{ id: 'owner', title: '', text: '', boardId: 'root', childBoardId: 'child' } as GraphNode]),
  });
  const original = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'بدون عنوان');
  assert.equal(paths.get('root'), 'بدون عنوان');
  assert.equal(paths.get('child'), 'بدون عنوان / بدون عنوان');
  assert.equal(paths.get('sibling'), 'Studio');
  assert.equal(JSON.stringify(doc), original);
});
