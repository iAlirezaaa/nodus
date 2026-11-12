import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWorkspaceOperations, diffWorkspace, equalJSON, invertOperations, validateOperations, type WorkspaceOperation } from '../lib/collaboration.ts';
import { createWorkspace } from '../lib/graph.ts';

test('guarded disjoint fields merge without replacing peer edits; overlapping fields conflict atomically', () => {
  const base = createWorkspace('en'), mine = structuredClone(base), peer = structuredClone(base);
  mine.nodes[0].title = 'My title'; mine.nodes[1].text = 'My notes';
  peer.nodes[0].text = 'Peer notes';
  const merged = applyWorkspaceOperations(peer, diffWorkspace(base, mine));
  assert.equal(merged.conflicts.length, 0); assert.equal(merged.document.nodes[0].title, 'My title'); assert.equal(merged.document.nodes[0].text, 'Peer notes');
  assert.equal(peer.nodes[0].title, base.nodes[0].title);
  peer.nodes[0].title = 'Peer title';
  const blocked = applyWorkspaceOperations(peer, diffWorkspace(base, mine));
  assert.equal(blocked.conflicts.length, 1); assert.equal(blocked.document, peer); assert.equal(blocked.document.nodes[1].text, base.nodes[1].text);
});

test('task status and timeline date diff independently; absent metadata can be removed and restored', () => {
  const base = createWorkspace('en'); base.nodes[0].task = { status: 'todo', parentId: null };
  const mine = structuredClone(base), peer = structuredClone(base);
  mine.nodes[0].task!.status = 'doing'; mine.nodes[0].scheduledAt = '2026-11-15';
  peer.nodes[0].task!.parentId = 'peer-parent';
  const operations = diffWorkspace(base, mine);
  assert.deepEqual(operations.map(op => op.path), [['task', 'status'], ['scheduledAt']]);
  const merged = applyWorkspaceOperations(peer, operations).document;
  assert.equal(merged.nodes[0].task!.parentId, 'peer-parent'); assert.equal(merged.nodes[0].task!.status, 'doing');
  const reversed = applyWorkspaceOperations(merged, invertOperations(operations));
  assert.equal(reversed.conflicts.length, 0); assert.equal(reversed.document.nodes[0].scheduledAt, undefined); assert.equal(reversed.document.nodes[0].task!.status, 'todo');
  assert.equal(reversed.document.nodes[0].task!.parentId, 'peer-parent');
});

test('whole-entity deletion refuses to erase a peer edit and duplicate creation is guarded', () => {
  const base = createWorkspace('en'), deleted = structuredClone(base), peer = structuredClone(base);
  const id = base.nodes[0].id; deleted.nodes = deleted.nodes.filter(node => node.id !== id); peer.nodes[0].text = 'Keep this peer work';
  const operations = diffWorkspace(base, deleted);
  assert.equal(applyWorkspaceOperations(peer, operations).conflicts.length, 1);
  const absent = applyWorkspaceOperations(base, operations).document;
  assert.equal(applyWorkspaceOperations(absent, operations).document, absent);
  const recreate = invertOperations(operations);
  assert.equal(applyWorkspaceOperations(base, recreate).document, base);
  assert.equal(applyWorkspaceOperations(peer, recreate).conflicts.length, 1);
});

test('guard equality is key-order independent and already-applied patches are no-ops', () => {
  const base = createWorkspace('en'), next = structuredClone(base); next.nodes[0].title = 'Updated';
  const operations = diffWorkspace(base, next), applied = applyWorkspaceOperations(base, operations).document;
  assert.equal(applyWorkspaceOperations(applied, operations).document, applied);
  assert.equal(equalJSON({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), true);
  assert.equal(equalJSON({ a: null }, {}), false);
  assert.equal(diffWorkspace(base, base).length, 0);
});

test('unsafe, overlapping, non-finite and immutable-identifier operations are rejected', () => {
  const base = createWorkspace('en'), next = structuredClone(base); next.nodes[0].title = 'Updated';
  const operation = diffWorkspace(base, next)[0];
  for (const path of [['__proto__'], ['id'], ['annotations', '0'], ['task', 'constructor'], ['madeUpField']]) {
    assert.throws(() => validateOperations([{ ...operation, path }]));
  }
  assert.throws(() => validateOperations([operation, operation]));
  assert.throws(() => validateOperations([{ ...operation, after: { exists: true, value: NaN } }]));
  assert.throws(() => validateOperations([{ ...operation, after: { exists: false, value: null } }]));
  assert.throws(() => validateOperations([{ ...operation, after: { exists: true, value: JSON.parse('{"__proto__":{"polluted":true}}') } }]));
  const ancestor: WorkspaceOperation = { ...operation, path: ['task'], before: { exists: false }, after: { exists: true, value: { status: 'todo', parentId: null } } };
  assert.throws(() => validateOperations([ancestor, { ...operation, path: ['task', 'status'] }]));
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('annotation arrays conflict as a field and removing task metadata cannot recreate a peer-removed parent object', () => {
  const base = createWorkspace('en'); base.nodes[0].task = { status: 'todo', parentId: null };
  const changed = structuredClone(base); changed.nodes[0].task!.status = 'done';
  const removed = structuredClone(base); delete removed.nodes[0].task;
  assert.equal(applyWorkspaceOperations(removed, diffWorkspace(base, changed)).conflicts.length, 1);
  const a = structuredClone(base), b = structuredClone(base);
  a.nodes[0].annotations = []; b.nodes[0].annotations = [{ id: 'comment', field: 'text', start: 0, end: 0, quote: 'old', body: 'Peer comment', color: 'sage', resolved: false, orphaned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  assert.equal(applyWorkspaceOperations(b, diffWorkspace(base, a)).conflicts.length, 1);
});
