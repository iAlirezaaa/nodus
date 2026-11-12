import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotBoard } from '../lib/board-snapshot.ts';
import { isCalendarDate } from '../lib/calendar.ts';
import { patchNode } from '../lib/node-features.ts';
import { createWorkspace, ensureChildBoard, makeNode, addNode } from '../lib/graph.ts';
import { validateWorkspace } from '../lib/server/validation.ts';

test('a shared board snapshot excludes unrelated spaces and preserves its nested content', () => {
  let document = createWorkspace('en');
  const rootNode = document.nodes.find(node => node.boardId === document.homeBoardId)!;
  const nested = ensureChildBoard(document, rootNode.id); document = nested.document;
  const inner = makeNode(nested.boardId, 'note', 0, 0, { title: 'Only shared content' });
  document = addNode(document, inner);
  const snapshot = snapshotBoard(document, nested.boardId);
  assert.equal(snapshot.homeBoardId, nested.boardId);
  assert.equal(snapshot.boards.find(board => board.id === nested.boardId)?.parentNodeId, null);
  assert.ok(snapshot.nodes.some(node => node.id === inner.id));
  assert.ok(snapshot.nodes.every(node => node.boardId !== document.homeBoardId));
  assert.equal(document.boards.find(board => board.id === nested.boardId)?.parentNodeId, rootNode.id);
  validateWorkspace(snapshot);
});

test('timeline dates reject overflow days and remain optional for old workspaces', () => {
  assert.ok(isCalendarDate('2028-02-29'));
  for (const value of ['2027-02-29', '2026-13-01', '2026-04-31', '0000-01-01', 'tomorrow', '2026-01-01T00:00:00Z', null]) assert.equal(isCalendarDate(value), false);
  const document = createWorkspace('en'), id = document.nodes[0].id;
  const updated = patchNode(document, id, { scheduledAt: '2027-01-02' });
  validateWorkspace(updated);
  assert.equal(updated.nodes.find(node => node.id === id)?.scheduledAt, '2027-01-02');
  assert.throws(() => patchNode(document, id, { scheduledAt: '2027-02-29' }));
  const cleared = patchNode(updated, id, { scheduledAt: undefined });
  assert.equal(cleared.nodes.find(node => node.id === id)?.scheduledAt, undefined);
  validateWorkspace(cleared);
});
