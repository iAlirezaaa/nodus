import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMagneticView, type MagneticPlacement } from '../lib/magnetic-view.ts';
import { makeNode } from '../lib/graph.ts';
import { WorkspaceStore } from '../hooks/workspace-store.ts';
import { applyWorkspaceOperations, diffWorkspace, invertOperations } from '../lib/collaboration.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const createdAt = '2026-11-12T00:00:00.000Z';
function fixture(): Workspace {
  return {
    version: 1, homeBoardId: 'home',
    boards: [
      { id: 'home', title: 'Ideas', description: 'Keep the board content', parentNodeId: null, createdAt,
        layout: { kind: 'timeline', sort: 'created', direction: 'asc', spacing: 72, language: 'fa' } },
      { id: 'other', title: 'Another board', description: '', parentNodeId: null, createdAt,
        layout: { kind: 'grid', sort: 'title', direction: 'desc', spacing: 96, language: 'en' } },
    ],
    nodes: [
      makeNode('home', 'note', 12, 24, { id: 'a', title: 'A', text: 'Keep this note', createdAt,
        task: { status: 'doing', parentId: null }, appearance: 'outline', scheduledAt: '2026-11-13',
        annotations: [{ id: 'comment', field: 'text', start: 0, end: 4, quote: 'Keep', body: 'A saved comment', color: 'blue', resolved: false, createdAt, updatedAt: createdAt }] }),
      makeNode('home', 'note', 350, -80, { id: 'b', title: 'B', text: 'Second note', color: 'rose', createdAt }),
      makeNode('other', 'note', 42, 90, { id: 'foreign', title: 'Other board note', createdAt }),
    ],
    edges: [{ id: 'ab', boardId: 'home', sourceId: 'a', targetId: 'b', label: 'Keep this connection', route: 'elbow', stroke: 'dashed', animated: false, bend: { x: 150, y: 40 } }],
  };
}
function place(node: GraphNode, x = node.x, y = node.y): MagneticPlacement {
  return { id: node.id, boardId: node.boardId, baseX: node.x, baseY: node.y, x, y };
}
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) freezeDeep(item); }
  return value;
}
function coordinates(document: Workspace) { return document.nodes.map(({ id, x, y }) => ({ id, x, y })); }

test('applying a personal view changes only requested coordinates and its board guides', () => {
  const document = fixture();
  // The view must never rebuild an entity from a whitelist and lose its metadata.
  Object.assign(document.nodes[0], { pinned: true, customMetadata: { source: 'existing extension' } });
  Object.assign(document.boards[0], { customMetadata: { ownerLabel: 'Keep me' } });
  const original = structuredClone(document);
  freezeDeep(document);
  const placements = freezeDeep([place(document.nodes[0], 523.456, -432.123), place(document.nodes[1], 800.25, 120.5)]);
  const result = applyMagneticView(document, 'home', placements);
  assert.equal(result.conflict, false);
  assert.notEqual(result.document, document);
  assert.deepEqual(result.document.nodes[0], { ...original.nodes[0], x: 523.46, y: -432.12 });
  assert.deepEqual(result.document.nodes[1], { ...original.nodes[1], x: 800.25, y: 120.5 });
  assert.equal(result.document.nodes[2], document.nodes[2], 'Other boards keep their original node objects.');
  assert.equal(result.document.edges, document.edges, 'Magnet application does not rebuild links or their bends.');
  assert.equal(result.document.nodes[0].task, document.nodes[0].task);
  assert.equal(result.document.nodes[0].annotations, document.nodes[0].annotations);
  assert.equal(result.document.boards[1], document.boards[1]);
  const { layout: _layout, ...expectedBoard } = original.boards[0];
  assert.deepEqual(result.document.boards[0], expectedBoard);
  assert.equal(result.document.boards[0].layout, undefined);
  assert.deepEqual(document, original, 'The undo snapshot and all nested input data remain untouched.');
  assert.deepEqual(placements[0], { id: 'a', boardId: 'home', baseX: 12, baseY: 24, x: 523.456, y: -432.123 });
});

test('empty, identical and subpixel views preserve identity and existing layout metadata', () => {
  const document = freezeDeep(fixture());
  const candidates: MagneticPlacement[][] = [[], [place(document.nodes[0])],
    [place(document.nodes[0], 12.04, 23.96), place(document.nodes[1], 350.01, -80.02)]];
  for (const placements of candidates) {
    const result = applyMagneticView(document, 'home', placements);
    assert.equal(result.conflict, false);
    assert.equal(result.document, document, 'A no-op must not create an undo entry or strip timeline guides.');
    assert.equal(result.document.boards[0].layout, document.boards[0].layout);
  }
  const withoutLayout = fixture(); delete withoutLayout.boards[0].layout;
  const moved = applyMagneticView(withoutLayout, 'home', [place(withoutLayout.nodes[0], 60, 80)]);
  assert.equal(moved.document.boards[0], withoutLayout.boards[0], 'An unarranged board needs no metadata rewrite.');
});

test('stale, removed, foreign and duplicated placements reject the complete batch', () => {
  const document = freezeDeep(fixture());
  const first = place(document.nodes[0], 500, 600), second = place(document.nodes[1], 900, 700);
  const cases: [string, MagneticPlacement[]][] = [
    ['stale X', [first, { ...second, baseX: second.baseX + 1 }]],
    ['stale Y', [first, { ...second, baseY: second.baseY - 1 }]],
    ['removed node', [first, { ...second, id: 'removed' }]],
    ['foreign node', [first, place(document.nodes[2], 50, 60)]],
    ['forged board', [first, { ...second, boardId: 'other' }]],
    ['duplicate node', [first, { ...first, x: 700 }]],
  ];
  for (const [reason, placements] of cases) {
    const result = applyMagneticView(document, 'home', placements);
    assert.equal(result.conflict, true, reason);
    assert.equal(result.document, document, `${reason}: an earlier valid placement must not be partially applied.`);
    assert.deepEqual(coordinates(result.document), coordinates(document));
    assert.equal(result.document.boards[0].layout, document.boards[0].layout);
  }
  assert.deepEqual(applyMagneticView(document, 'missing-board', []), { document, conflict: true });
});

test('nonfinite, out-of-range and invalid baseline coordinates cannot enter a saved layout', () => {
  const document = freezeDeep(fixture());
  const first = place(document.nodes[0], 200, 300), second = place(document.nodes[1], 700, 800);
  const invalid = [NaN, Infinity, -Infinity, 1e7 + .01, -1e7 - .01];
  for (const axis of ['x', 'y'] as const) for (const value of invalid) {
    const result = applyMagneticView(document, 'home', [first, { ...second, [axis]: value }]);
    assert.equal(result.conflict, true, `${axis} = ${value}`);
    assert.equal(result.document, document, 'No partial movement may survive failed validation.');
  }
  for (const baseline of [{ baseX: NaN }, { baseY: Infinity }]) {
    assert.equal(applyMagneticView(document, 'home', [{ ...first, ...baseline }]).conflict, true);
  }
  const boundary = applyMagneticView(document, 'home', [place(document.nodes[0], -1e7, 1e7)]);
  assert.equal(boundary.conflict, false);
  assert.equal(boundary.document.nodes[0].x, -1e7);
  assert.equal(boundary.document.nodes[0].y, 1e7);
});

test('a peer content edit is preserved, while a peer move refuses the old view', () => {
  const baseline = fixture();
  const placements = baseline.nodes.filter(node => node.boardId === 'home').map(node => place(node, node.x + 400, node.y - 200));
  const latest = structuredClone(baseline); latest.nodes[0].text = 'Peer has edited this note'; latest.nodes[1].color = 'violet';
  const applied = applyMagneticView(latest, 'home', placements);
  assert.equal(applied.conflict, false);
  assert.equal(applied.document.nodes[0].text, 'Peer has edited this note');
  assert.equal(applied.document.nodes[1].color, 'violet');
  const movedByPeer = structuredClone(latest); movedByPeer.nodes[1].x += 1;
  const rejected = applyMagneticView(movedByPeer, 'home', placements);
  assert.equal(rejected.conflict, true);
  assert.equal(rejected.document, movedByPeer);
});

test('the complete arrangement is one undoable workspace snapshot, including removal of guides', async () => {
  const original = fixture();
  const store = new WorkspaceStore({ storage: null, debounceMs: 60_000, makeWorkspace: () => original,
    fetcher: async () => Response.json({ document: original, revision: 1, userId: 'fixture-owner', updatedAt: createdAt }),
  });
  try {
    await store.load();
    const before = store.exportDraft()!;
    store.update(document => applyMagneticView(document, 'home', [place(document.nodes[0], 700, 400), place(document.nodes[1], -200, 800)]).document);
    const arranged = store.exportDraft()!;
    assert.equal(arranged.nodes[0].x, 700); assert.equal(arranged.nodes[1].y, 800);
    assert.equal(arranged.boards[0].layout, undefined);
    assert.equal(store.getSnapshot().canUndo, true);
    store.undo();
    assert.deepEqual(store.exportDraft(), before, 'One undo restores both nodes and the timeline together.');
    assert.equal(store.getSnapshot().canUndo, false);
    assert.equal(store.getSnapshot().canRedo, true);
    store.redo();
    assert.deepEqual(store.exportDraft(), arranged);
    const state = store.exportDraft()!;
    store.update(document => applyMagneticView(document, 'home', [place(document.nodes[0])]).document);
    assert.equal(store.exportDraft(), state);
    store.undo(); assert.deepEqual(store.exportDraft(), before, 'A no-op apply did not add another history entry.');
  } finally { store.suspend(); }
});

test('shared guarded undo restores magnetic positions and guides without erasing peer text', () => {
  const baseline = fixture();
  const arranged = applyMagneticView(baseline, 'home', [place(baseline.nodes[0], 410, 310), place(baseline.nodes[1], -90, 790)]).document;
  const operations = diffWorkspace(baseline, arranged);
  assert.ok(operations.some(operation => operation.target === 'board' && operation.path[0] === 'layout'));
  assert.equal(new Set(operations.filter(operation => operation.target === 'node').map(operation => operation.id)).size, 2);
  const peer = structuredClone(arranged); peer.nodes[0].text = 'This peer edit must survive undo';
  const undo = applyWorkspaceOperations(peer, invertOperations(operations));
  assert.deepEqual(undo.conflicts, []);
  assert.deepEqual(coordinates(undo.document), coordinates(baseline));
  assert.deepEqual(undo.document.boards[0].layout, baseline.boards[0].layout);
  assert.equal(undo.document.nodes[0].text, 'This peer edit must survive undo');
  peer.nodes[1].y += 17;
  const rejected = applyWorkspaceOperations(peer, invertOperations(operations));
  assert.ok(rejected.conflicts.length > 0);
  assert.equal(rejected.document, peer, 'A later peer move blocks the whole guarded layout undo.');
});
