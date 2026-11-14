import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWorkspaceOperations, diffWorkspace } from '../lib/collaboration.ts';
import { createWorkspace } from '../lib/graph.ts';
import { arrangeWorkspace, DEFAULT_LAYOUT_OPTIONS } from '../lib/layouts.ts';
import { snapshotBoard } from '../lib/board-snapshot.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import { copyWorkspaceAsRoots } from '../hooks/workspace-store.ts';
import { SharedWorkspaceStore } from '../hooks/shared-workspace-store.ts';
import { SharedFixtureServer, type FixtureActor } from './browser/shared-fixture-server.ts';
import type { BoardLayout, Workspace } from '../lib/types.ts';

const originalLayout: BoardLayout = { kind: 'grid', sort: 'created', direction: 'asc', spacing: 72, language: 'en' };
const laneLayout: BoardLayout = { kind: 'kanban', sort: 'status', direction: 'asc', spacing: 96, language: 'fa', columnStep: 500 };
const root = (document: Workspace) => document.boards.find(board => board.id === document.homeBoardId)!;
function baseline() {
  const document = createWorkspace('en');
  root(document).layout = { ...originalLayout };
  return document;
}
function store(server: SharedFixtureServer, actor: FixtureActor) {
  return new SharedWorkspaceStore({ roomId: 'fixture-room', language: 'en', storage: null, pollMs: 0, debounceMs: 60_000,
    fetcher: async (input, init) => {
      const result = server.handle(actor, { path: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
      return Response.json(result.body, { status: result.status });
    } });
}

test('layout metadata is one guarded field and commits atomically with node positions', () => {
  const base = baseline(), planned = structuredClone(base);
  root(planned).layout = { ...laneLayout };
  for (const node of planned.nodes) if (node.boardId === planned.homeBoardId) { node.x += 400; node.y -= 200; }
  const operations = diffWorkspace(base, planned);
  const layoutOperations = operations.filter(operation => operation.target === 'board');
  assert.equal(layoutOperations.length, 1);
  assert.deepEqual(layoutOperations[0].path, ['layout']);
  const peer = structuredClone(base); peer.nodes[0].text = 'Unrelated peer notes';
  const combined = applyWorkspaceOperations(peer, operations);
  assert.equal(combined.conflicts.length, 0); validateWorkspace(combined.document);
  assert.deepEqual(root(combined.document).layout, laneLayout);
  assert.equal(combined.document.nodes[0].x, planned.nodes[0].x);
  assert.equal(combined.document.nodes[0].text, 'Unrelated peer notes');

  const conflictingMetadata = structuredClone(peer);
  root(conflictingMetadata).layout = { ...originalLayout, language: 'fa' };
  const metadataConflict = applyWorkspaceOperations(conflictingMetadata, operations);
  assert.equal(metadataConflict.document, conflictingMetadata, 'A metadata conflict must not partially move nodes.');
  assert.ok(metadataConflict.conflicts.some(conflict => conflict.target === 'board'));

  const conflictingPosition = structuredClone(peer); conflictingPosition.nodes[0].x += 1;
  const positionConflict = applyWorkspaceOperations(conflictingPosition, operations);
  assert.equal(positionConflict.document, conflictingPosition, 'A position conflict must not publish new guides.');
  assert.deepEqual(root(positionConflict.document).layout, originalLayout);
  assert.ok(positionConflict.conflicts.some(conflict => conflict.target === 'node'));
  assert.deepEqual(root(base).layout, originalLayout);
});

test('own layout undo restores guides and coordinates together, preserves peer text, and refuses a newer peer layout', async () => {
  const server = new SharedFixtureServer(); server.state.rooms[0].document = baseline();
  const before = structuredClone(server.state.rooms[0].document), a = store(server, 'owner'), b = store(server, 'editor');
  try {
    await Promise.all([a.load(), b.load()]);
    a.update(document => arrangeWorkspace(document, document.homeBoardId, { ...DEFAULT_LAYOUT_OPTIONS, kind: 'kanban', spacing: 96, language: 'fa' }));
    await a.flush();
    assert.equal(root(a.exportDraft()!).layout?.kind, 'kanban');
    assert.equal(root(a.exportDraft()!).layout?.language, 'fa');
    assert.ok((root(a.exportDraft()!).layout?.columnStep ?? 0) > 0);
    await b.poll(); b.update(document => ({ ...document, nodes: document.nodes.map((node, index) => index === 0 ? { ...node, text: 'Peer text remains through layout undo' } : node) }));
    await b.flush(); await a.poll(); a.undo(); await a.flush();
    const undone = server.state.rooms[0].document;
    assert.deepEqual(root(undone).layout, originalLayout);
    assert.deepEqual(undone.nodes.map(node => [node.id, node.x, node.y]), before.nodes.map(node => [node.id, node.x, node.y]));
    assert.equal(undone.nodes[0].text, 'Peer text remains through layout undo');
    a.redo(); await a.flush(); await b.poll();
    b.update(document => arrangeWorkspace(document, document.homeBoardId, { ...DEFAULT_LAYOUT_OPTIONS, kind: 'tree', language: 'en' }));
    await b.flush(); await a.poll();
    const peerLayout = a.exportDraft(); a.undo();
    assert.equal(a.exportDraft(), peerLayout);
    assert.match(a.getSnapshot().error ?? '', /cannot replace/);
    assert.equal(a.hasPendingChanges(), false);
  } finally { a.suspend(); b.suspend(); }
});

test('layout validation rejects invalid metadata and keeps older documents without layout valid', () => {
  const oldDocument = createWorkspace('en');
  assert.equal(validateWorkspace(oldDocument), oldDocument);
  assert.ok(oldDocument.boards.every(board => board.layout === undefined));
  const valid = baseline(); root(valid).layout = { ...laneLayout };
  assert.equal(validateWorkspace(valid), valid);
  const invalid: unknown[] = [null, [], { ...laneLayout, kind: 'invented' }, { ...laneLayout, sort: 'random' },
    { ...laneLayout, direction: 'rtl' }, { ...laneLayout, language: 'de' }, { ...laneLayout, spacing: 23 },
    { ...laneLayout, spacing: 241 }, { ...laneLayout, spacing: NaN }, { ...laneLayout, columnStep: 31 },
    { ...laneLayout, columnStep: 10001 }, { ...laneLayout, columnStep: Infinity }];
  for (const layout of invalid) {
    const bad = structuredClone(valid); Object.assign(root(bad), { layout });
    assert.throws(() => validateWorkspace(bad), /board\.layout/);
  }
});

test('subtree sharing and JSON import/recovery preserve identifier-free layout metadata while remapping graph IDs', () => {
  const source = baseline(), nested = source.boards.find(board => board.parentNodeId)!;
  root(source).layout = { ...laneLayout };
  nested.layout = { ...originalLayout, kind: 'timeline', language: 'fa' };
  const nestedShare = snapshotBoard(source, nested.id);
  assert.equal(root(nestedShare).parentNodeId, null);
  assert.deepEqual(root(nestedShare).layout, nested.layout);
  validateWorkspace(nestedShare);
  const exported = JSON.parse(JSON.stringify({ document: source })) as { document: Workspace };
  const imported = validateWorkspace(exported.document), current = createWorkspace('en');
  const copied = copyWorkspaceAsRoots(current, imported, 'fa');
  validateWorkspace(copied);
  const copiedBoards = copied.boards.slice(current.boards.length);
  assert.equal(copiedBoards.length, imported.boards.length);
  copiedBoards.forEach((board, index) => {
    assert.notEqual(board.id, imported.boards[index].id);
    assert.deepEqual(board.layout, imported.boards[index].layout);
    assert.ok(Object.keys(board.layout ?? {}).every(key => ['kind', 'sort', 'direction', 'spacing', 'language', 'columnStep'].includes(key)));
  });
  assert.deepEqual(root(source).layout, laneLayout);
});
