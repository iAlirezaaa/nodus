import assert from 'node:assert/strict';
import test from 'node:test';
import { makeNode } from '../lib/graph.ts';
import { deleteZoneDraft, saveZoneDraft, ZoneEditConflict } from '../lib/zone-editor.ts';
import { nodeUsesNeuron, zoneBounds } from '../lib/zone-geometry.ts';
import { createZone, updateZone } from '../lib/zones.ts';
import type { GraphNode, GraphZone, Workspace } from '../lib/types.ts';

const input = { title: 'داستان مشترک', description: 'یک فکر، چند ارتباط', color: 'violet' as const, nodeIds: ['story', 'film'] };
function fixture(): Workspace {
  const document: Workspace = {
    version: 1, homeBoardId: 'root',
    boards: [{ id: 'root', title: 'Story', description: '', parentNodeId: null, createdAt: '2026-11-19T22:00:00.000Z' }],
    nodes: [makeNode('root', 'note', -200, 100, { id: 'story' }), makeNode('root', 'note', 150, -80, { id: 'film' })],
    edges: [{ id: 'story-film', boardId: 'root', sourceId: 'story', targetId: 'film', label: 'shared story' }],
  };
  return createZone(document, 'root', input, 'story-zone');
}
const original = (document: Workspace): GraphZone => structuredClone(document.boards[0].zones![0]);

test('zone editor checks its source snapshot inside the transaction and retains unrelated latest content', () => {
  const base = fixture(), source = original(base);
  const latest: Workspace = { ...base, nodes: base.nodes.map(node => node.id === 'film' ? { ...node, text: 'Peer wrote this', presentation: 'card' } : node) };
  const next = saveZoneDraft(latest, 'root', 'story-zone', { ...input, description: 'شرح تازه با نیم‌فاصله' }, source);
  assert.equal(next.nodes, latest.nodes);
  assert.equal(next.edges, latest.edges);
  assert.equal(next.nodes[1].text, 'Peer wrote this');
  assert.equal(next.nodes[1].presentation, 'card');
  assert.equal(next.boards[0].zones![0].description, 'شرح تازه با نیم‌فاصله');
  assert.deepEqual(source, original(base));
});

test('zone editor refuses stale metadata, changed membership, missing source and a removed zone or board', () => {
  const base = fixture(), source = original(base);
  const variants = [
    updateZone(base, 'root', 'story-zone', { title: 'Peer title' }),
    updateZone(base, 'root', 'story-zone', { nodeIds: ['story'] }),
    { ...base, boards: [{ ...base.boards[0], zones: [] }] },
    { ...base, boards: [] },
  ];
  for (const current of variants) {
    const unchanged = JSON.stringify(current);
    assert.throws(() => saveZoneDraft(current, 'root', 'story-zone', input, source), ZoneEditConflict);
    assert.throws(() => deleteZoneDraft(current, 'root', 'story-zone', source), ZoneEditConflict);
    assert.equal(JSON.stringify(current), unchanged);
  }
  assert.throws(() => saveZoneDraft(base, 'root', 'story-zone', input), ZoneEditConflict);
  assert.throws(() => deleteZoneDraft(base, 'root', 'story-zone'), ZoneEditConflict);
});

test('editing one zone retains another zone created after the editor opened', () => {
  const base = fixture(), source = original(base);
  const current = createZone(base, 'root', { ...input, title: 'Peer zone', nodeIds: ['story'] }, 'peer-zone');
  const next = saveZoneDraft(current, 'root', 'story-zone', { ...input, description: 'Updated' }, source);
  assert.equal(next.boards[0].zones!.length, 2);
  assert.equal(next.boards[0].zones![1], current.boards[0].zones![1]);
  assert.equal(next.nodes, current.nodes);
  assert.equal(next.edges, current.edges);
});

test('confirmed zone deletion removes only the matching group and leaves graph and peer zones intact', () => {
  const base = fixture(), source = original(base);
  const current = createZone(base, 'root', { ...input, nodeIds: ['film'] }, 'second-zone');
  const next = deleteZoneDraft(current, 'root', 'story-zone', source);
  assert.deepEqual(next.boards[0].zones!.map(zone => zone.id), ['second-zone']);
  assert.equal(next.nodes, current.nodes);
  assert.equal(next.edges, current.edges);
  assert.equal(current.boards[0].zones!.length, 2);
});

test('new zone drafts require current live members while empty existing groups can update their description', () => {
  const base = fixture();
  const created = saveZoneDraft(base, 'root', null, { ...input, title: 'New zone' });
  assert.equal(created.boards[0].zones!.length, 2);
  const removedMember = { ...base, nodes: base.nodes.filter(node => node.id !== 'film'), edges: [] };
  assert.throws(() => saveZoneDraft(removedMember, 'root', null, input));
  const empty = updateZone(base, 'root', 'story-zone', { nodeIds: [] });
  const edited = saveZoneDraft(empty, 'root', 'story-zone', { ...input, description: 'Still an editable group', nodeIds: [] }, original(empty));
  assert.deepEqual(edited.boards[0].zones![0].nodeIds, []);
  assert.equal(edited.boards[0].zones![0].description, 'Still an editable group');
});

test('individual node display overrides either canvas mode without changing graph fields', () => {
  for (const canvasMode of [true, false]) {
    for (const presentation of [undefined, 'neuron', 'card'] as const) {
      const node = makeNode('root', 'image', -100, 40, { id: 'media', presentation });
      const before = structuredClone(node);
      assert.equal(nodeUsesNeuron(node, canvasMode), presentation === undefined ? canvasMode : presentation === 'neuron');
      assert.deepEqual(node, before);
    }
  }
});

test('zone bounds enclose mixed projected cards and neurons while leaving all source geometry untouched', () => {
  type Rectangle = Pick<GraphNode, 'x' | 'y' | 'width' | 'height'>;
  const projections = new Map<string, Rectangle>([
    ['story', { x: -400, y: -180, width: 22, height: 22 }],
    ['film', { x: 100, y: 220, width: 340, height: 240 }],
    ['unrelated', { x: 5000, y: 5000, width: 600, height: 800 }],
  ]);
  const before = structuredClone(projections);
  const result = zoneBounds({ nodeIds: ['story', 'film'] }, projections)!;
  for (const id of ['story', 'film']) {
    const member = projections.get(id)!;
    assert.ok(result.x < member.x && result.y < member.y);
    assert.ok(result.x + result.width > member.x + member.width);
    assert.ok(result.y + result.height > member.y + member.height);
  }
  assert.ok(result.x + result.width < projections.get('unrelated')!.x);
  assert.deepEqual(projections, before);
  assert.ok(result.y + 100 < Math.min(projections.get('story')!.y, projections.get('film')!.y), 'The group reserves space for its header above the members.');
});

test('empty or no-longer-visible membership has no canvas box; valid members still determine bounds', () => {
  const projections = new Map([['story', { x: -30, y: 20, width: 22, height: 22 }]]);
  assert.equal(zoneBounds({ nodeIds: [] }, projections), null);
  assert.equal(zoneBounds({ nodeIds: ['missing'] }, projections), null);
  const one = zoneBounds({ nodeIds: ['story'] }, projections)!;
  assert.deepEqual(zoneBounds({ nodeIds: ['story', 'missing'] }, projections), one);
  assert.ok(one.width >= 250, 'A single dot still provides a usable width for its zone heading.');
});
