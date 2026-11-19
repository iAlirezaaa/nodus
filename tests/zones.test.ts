import test from 'node:test';
import assert from 'node:assert/strict';
import { createZone, updateZone, removeZone, MAX_ZONES_PER_BOARD, MAX_ZONE_DESCRIPTION_LENGTH, MAX_ZONE_TITLE_LENGTH } from '../lib/zones.ts';
import { addEdge, addNode, deleteNode, ensureChildBoard, makeNode } from '../lib/graph.ts';
import { deleteSelectedNodes } from '../lib/node-selection.ts';
import { deletePersonalSpace } from '../lib/personal-spaces.ts';
import { patchNode } from '../lib/node-features.ts';
import { snapshotBoard } from '../lib/board-snapshot.ts';
import { copyWorkspaceAsRoots } from '../hooks/workspace-store.ts';
import { applyWorkspaceOperations, diffWorkspace, invertOperations, validateOperations } from '../lib/collaboration.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import type { GraphZone, Workspace } from '../lib/types.ts';

const now = '2026-11-19T22:30:00.000Z';
function workspace(): Workspace {
  let doc: Workspace = {
    version: 1, homeBoardId: 'root',
    boards: [
      { id: 'root', title: 'داستان', description: '', parentNodeId: null, createdAt: now },
      { id: 'other', title: 'Private unrelated space', description: '', parentNodeId: null, createdAt: now },
    ],
    nodes: ['story', 'film', 'series', 'decoupage'].map((id, index) => makeNode('root', 'note', index * 320, 120, { id, title: id, createdAt: now })),
    edges: [],
  };
  doc = addNode(doc, makeNode('other', 'note', 20, 30, { id: 'other-node' }));
  for (const [source, target] of [['story', 'film'], ['story', 'series'], ['story', 'decoupage'], ['decoupage', 'film'], ['decoupage', 'series'], ['series', 'story']]) doc = addEdge(doc, source, target);
  return doc;
}
const input = (nodeIds = ['story', 'film', 'decoupage']) => ({ title: 'تولید فیلم', description: 'داستان مشترک\nدکوپاژ، ریتم و تصویر', color: 'violet' as const, nodeIds });
const zones = (doc: Workspace, boardId = 'root') => doc.boards.find(board => board.id === boardId)!.zones ?? [];
const withZone = () => createZone(workspace(), 'root', input(), 'film-zone');

test('old version-one documents remain unchanged and optional zone/presentation fields round-trip as Unicode JSON', () => {
  const old = workspace(), before = JSON.stringify(old);
  assert.equal(validateWorkspace(old), old);
  assert.equal(JSON.stringify(old), before);
  assert.ok(old.boards.every(board => !Object.hasOwn(board, 'zones')));
  const next = patchNode(createZone(old, 'root', input(), 'film-zone'), 'story', { presentation: 'card' });
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(next))), next);
  assert.equal(next.version, 1);
  assert.equal(zones(next)[0].description, input().description);
});

test('creating zones preserves nonlinear cycles, node identities, geometry and all existing connections', () => {
  const base = workspace(), members = input();
  const next = createZone(base, 'root', members, 'film-zone');
  assert.equal(next.nodes, base.nodes); assert.equal(next.edges, base.edges);
  assert.equal(base.boards[0].zones, undefined);
  members.nodeIds.push('series');
  assert.deepEqual(zones(next)[0].nodeIds, ['story', 'film', 'decoupage']);
  assert.equal(validateWorkspace(next), next);
  const second = createZone(next, 'root', { ...input(['story', 'series', 'decoupage']), title: 'سریال' }, 'series-zone');
  assert.equal(zones(second).filter(zone => zone.nodeIds.includes('story')).length, 2);
  assert.equal(second.nodes.length, base.nodes.length);
  assert.deepEqual(second.edges, base.edges);
  validateWorkspace(second);
});

test('editing zone metadata and membership is one immutable edit with no node/edge rewrite', () => {
  const base = withZone(), members = ['story', 'series'];
  const next = updateZone(base, 'root', 'film-zone', { description: 'متن تازه با نیم‌فاصله', nodeIds: members });
  assert.equal(next.nodes, base.nodes); assert.equal(next.edges, base.edges);
  assert.equal(zones(base)[0].description, input().description);
  assert.equal(zones(next)[0].title, input().title);
  assert.equal(zones(next)[0].description, 'متن تازه با نیم‌فاصله');
  members.pop(); assert.deepEqual(zones(next)[0].nodeIds, ['story', 'series']);
  assert.equal(updateZone(next, 'root', 'film-zone', { nodeIds: ['story', 'series'] }), next);
  assert.equal(updateZone(next, 'other', 'missing', { title: 'No edit' }), next);
  assert.equal(updateZone(next, 'missing', 'film-zone', { title: 'No edit' }), next);
  validateWorkspace(next);
});

test('removing a zone keeps linked ideas and their media; removing missing zones is a no-op', () => {
  const base = withZone();
  base.nodes[0].asset = { id: 'script', name: 'film.pdf', mime: 'application/pdf', size: 100, url: '/api/assets/script' };
  const next = removeZone(base, 'root', 'film-zone');
  assert.deepEqual(zones(next), []); assert.equal(next.nodes, base.nodes); assert.equal(next.edges, base.edges);
  assert.equal(next.nodes[0].asset, base.nodes[0].asset);
  assert.equal(removeZone(next, 'root', 'film-zone'), next);
  assert.equal(removeZone(next, 'missing', 'film-zone'), next);
  validateWorkspace(next);
});

test('zone creation rejects missing boards, empty selection, duplicate IDs and invalid or cross-board members', () => {
  const base = withZone();
  assert.throws(() => createZone(base, 'missing', input()));
  assert.throws(() => createZone(base, 'root', input(), 'film-zone'));
  for (const nodeIds of [[], ['missing'], ['other-node'], ['story', 'story']]) assert.throws(() => createZone(base, 'root', input(nodeIds), 'bad'));
  for (const nodeIds of [['missing'], ['other-node'], ['story', 'story']]) assert.throws(() => updateZone(base, 'root', 'film-zone', { nodeIds }));
  assert.deepEqual(zones(updateZone(base, 'root', 'film-zone', { nodeIds: [] }))[0].nodeIds, []);
});

test('authoritative validation bounds zone fields and rejects malformed membership without altering the document', () => {
  const changes: Array<(zone: Record<string, unknown>, doc: Workspace) => void> = [
    zone => { zone.id = ''; }, zone => { zone.title = '  '; }, zone => { zone.title = null; },
    zone => { zone.title = 'x'.repeat(MAX_ZONE_TITLE_LENGTH + 1); },
    zone => { zone.description = 'x'.repeat(MAX_ZONE_DESCRIPTION_LENGTH + 1); }, zone => { zone.description = null; },
    zone => { zone.color = 'ultraviolet'; }, zone => { zone.nodeIds = ['other-node']; },
    zone => { zone.nodeIds = ['story', 'story']; }, zone => { zone.nodeIds = ['missing']; },
    zone => { zone.nodeIds = null; }, zone => { zone.nodeIds = [23]; },
    (zone, doc) => { doc.boards[0].zones!.push({ ...zone } as unknown as GraphZone); },
  ];
  for (const change of changes) {
    const doc = withZone(); change(zones(doc)[0] as unknown as Record<string, unknown>, doc);
    assert.throws(() => validateWorkspace(doc), (error: unknown) => (error as { status: number }).status === 400);
  }
  const doc = withZone(); doc.boards[0].zones = Array.from({ length: MAX_ZONES_PER_BOARD + 1 }, (_, i) => ({ ...input(), id: `zone-${i}` }));
  assert.throws(() => validateWorkspace(doc));
  assert.throws(() => updateZone(withZone(), 'root', 'film-zone', { title: null } as unknown as { title: string }));
});

test('single-node deletion cleans every zone membership while preserving empty groups and linked neighbors', () => {
  const base = createZone(withZone(), 'root', { ...input(['story']), title: 'Shared concept' }, 'shared');
  const next = deleteNode(base, 'story');
  assert.deepEqual(zones(next)[0].nodeIds, ['film', 'decoupage']);
  assert.deepEqual(zones(next)[1].nodeIds, []);
  assert.equal(zones(next)[1].description, input().description);
  assert.ok(next.nodes.some(node => node.id === 'film'));
  assert.ok(next.edges.some(edge => edge.sourceId === 'decoupage' && edge.targetId === 'film'));
  assert.deepEqual(zones(base)[1].nodeIds, ['story']);
  validateWorkspace(next);
});

test('batch deletion removes members and contained boards without discarding surviving zone metadata', () => {
  const nested = ensureChildBoard(withZone(), 'film');
  let base = addNode(nested.document, makeNode(nested.boardId, 'note', 0, 0, { id: 'shot' }));
  base = createZone(base, nested.boardId, input(['shot']), 'shots-zone');
  const next = deleteSelectedNodes(base, 'root', ['film', 'story']);
  assert.ok(!next.boards.some(board => board.id === nested.boardId));
  assert.deepEqual(zones(next)[0].nodeIds, ['decoupage']);
  assert.equal(zones(next)[0].description, input().description);
  assert.ok(next.nodes.some(node => node.id === 'other-node'));
  validateWorkspace(next);
});

test('deleting a personal space retains unrelated zones and never borrows their members', () => {
  const base = createZone(withZone(), 'other', input(['other-node']), 'private');
  const next = deletePersonalSpace(base, 'root', 'en');
  assert.equal(next.homeBoardId, 'other');
  assert.deepEqual(zones(next, 'other'), zones(base, 'other'));
  assert.equal(next.nodes.length, 1);
  validateWorkspace(next);
});

test('board sharing keeps only scoped zones and presentation, excluding unrelated root metadata', () => {
  const nested = ensureChildBoard(withZone(), 'film');
  let base = addNode(nested.document, makeNode(nested.boardId, 'note', 0, 0, { id: 'shot', presentation: 'card' }));
  base = createZone(base, nested.boardId, input(['shot']), 'shots-zone');
  const shared = snapshotBoard(base, nested.boardId);
  assert.equal(shared.boards.length, 1);
  assert.deepEqual(zones(shared, nested.boardId), zones(base, nested.boardId));
  assert.equal(shared.nodes[0].presentation, 'card');
  assert.equal(shared.boards[0].parentNodeId, null);
  validateWorkspace(shared);
});

test('import/recovery remaps zone and member IDs without pointing at existing or source ideas', () => {
  const source = patchNode(withZone(), 'story', { presentation: 'card' }), current = workspace();
  const sourceBefore = JSON.stringify(source), next = copyWorkspaceAsRoots(current, source, 'en');
  const imported = next.boards.find(board => board.zones?.length)!;
  const zone = imported.zones![0];
  assert.notEqual(zone.id, 'film-zone'); assert.notEqual(imported.id, 'root');
  assert.equal(zone.title, input().title); assert.equal(zone.description, input().description);
  assert.ok(zone.nodeIds.every(id => !source.nodes.some(node => node.id === id)));
  assert.ok(zone.nodeIds.every(id => next.nodes.some(node => node.id === id && node.boardId === imported.id)));
  assert.equal(next.nodes.find(node => node.id === zone.nodeIds[0])?.presentation, 'card');
  assert.equal(JSON.stringify(source), sourceBefore);
  validateWorkspace(next);
});

test('individual presentation changes preserve identity, geometry, content, media and cyclic edges; inheritance restores cleanly', () => {
  const base = withZone(), before = base.nodes.find(node => node.id === 'story')!;
  const card = patchNode(base, 'story', { presentation: 'card' });
  assert.deepEqual(card.nodes[0], { ...before, presentation: 'card' });
  assert.equal(card.edges, base.edges); assert.equal(card.boards, base.boards);
  const neuron = patchNode(card, 'story', { presentation: 'neuron' });
  const inherited = patchNode(neuron, 'story', { presentation: undefined });
  assert.deepEqual(inherited.nodes, base.nodes);
  assert.equal(Object.hasOwn(inherited.nodes[0], 'presentation'), false);
  assert.throws(() => patchNode(base, 'story', { presentation: 'unsupported' } as never));
  const corrupt = structuredClone(base); (corrupt.nodes[0] as unknown as Record<string, unknown>).presentation = 'unsupported';
  assert.throws(() => validateWorkspace(corrupt));
});

test('two-session zone edits and unrelated node edits merge, with atomic conflict for concurrent zone edits', () => {
  const base = withZone(), mine = updateZone(base, 'root', 'film-zone', { description: 'My description' });
  const peer = patchNode(base, 'series', { text: 'Peer content', presentation: 'card' });
  const merged = applyWorkspaceOperations(peer, diffWorkspace(base, mine));
  assert.equal(merged.conflicts.length, 0);
  assert.equal(zones(merged.document)[0].description, 'My description');
  assert.equal(merged.document.nodes.find(node => node.id === 'series')?.text, 'Peer content');
  assert.equal(merged.document.nodes.find(node => node.id === 'series')?.presentation, 'card');
  validateWorkspace(merged.document);
  const conflicting = updateZone(peer, 'root', 'film-zone', { title: 'Peer title' });
  const blocked = applyWorkspaceOperations(conflicting, diffWorkspace(base, patchNode(mine, 'film', { title: 'Also local' })));
  assert.equal(blocked.conflicts.length, 1); assert.equal(blocked.document, conflicting);
  assert.equal(blocked.document.nodes.find(node => node.id === 'film')?.title, 'film');
});

test('zone and presentation operations undo/redo through guarded protocol without permanent empty metadata', () => {
  const base = workspace(), next = patchNode(createZone(base, 'root', input(), 'film-zone'), 'story', { presentation: 'card' });
  const operations = diffWorkspace(base, next);
  assert.deepEqual(operations.map(operation => operation.path), [['zones'], ['presentation']]);
  const applied = applyWorkspaceOperations(base, operations);
  assert.equal(applied.conflicts.length, 0); assert.deepEqual(applied.document, next);
  assert.equal(applyWorkspaceOperations(applied.document, operations).document, applied.document);
  const undone = applyWorkspaceOperations(applied.document, invertOperations(operations));
  assert.deepEqual(undone.document, base);
  assert.equal(Object.hasOwn(undone.document.boards[0], 'zones'), false);
  const redone = applyWorkspaceOperations(undone.document, operations);
  assert.deepEqual(redone.document, next);
  assert.throws(() => validateOperations([{ ...operations[0], path: ['zones', '0'] }]));
});
