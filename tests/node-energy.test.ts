import test from 'node:test';
import assert from 'node:assert/strict';
import { nodeEnergy } from '../lib/node-energy.ts';
import { buildNodeGrowth, defaultNodeGrowth } from '../lib/node-growth.ts';
import type { GraphNode, Workspace } from '../lib/types';

test('an isolated note remains gently animated and visibly lit', () => {
  const idle = nodeEnergy();
  assert.deepEqual(idle, nodeEnergy(defaultNodeGrowth));
  assert.equal(idle.strength, 0);
  assert.ok(idle.glow > 0);
  for (const duration of [idle.pulseDuration, idle.orbitDuration, idle.signalDuration]) {
    assert.ok(Number.isFinite(duration) && duration > 0);
  }
});

test('more connected work strengthens light and speeds motion without flashing at high degree', () => {
  const samples = [0, 1, 5, 20, 100, 5000].map(mass => nodeEnergy({ mass }));
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1], current = samples[index];
    assert.ok(current.strength > previous.strength);
    assert.ok(current.glow > previous.glow);
    assert.ok(current.pulseDuration < previous.pulseDuration);
    assert.ok(current.orbitDuration < previous.orbitDuration);
    assert.ok(current.signalDuration < previous.signalDuration);
  }
  for (const sample of [...samples, nodeEnergy({ mass: Number.MAX_VALUE })]) {
    assert.ok(sample.strength >= 0 && sample.strength <= 1);
    assert.ok(sample.glow >= 0.24 && sample.glow <= 0.76);
    assert.ok(sample.pulseDuration >= 2.6 - 1e-12 && sample.pulseDuration <= 5.6);
    assert.ok(sample.orbitDuration >= 7 && sample.orbitDuration <= 16);
    assert.ok(sample.signalDuration >= 2.8 - 1e-12 && sample.signalDuration <= 6.2);
  }
  assert.ok(samples[3].pulseDuration < samples[0].pulseDuration * 0.7, 'A 20-connection hub visibly differs from an isolated thought.');
});

test('incoming notes and explicit tasks drive the same motion as outgoing connections', () => {
  const time = '2026-11-12T00:00:00.000Z';
  const makeNode = (id: string): GraphNode => ({ id, boardId: 'root', kind: 'note', title: id, text: '', x: 0, y: 0, width: 244, height: 172, color: 'sage', asset: null, url: '', childBoardId: null, createdAt: time });
  const doc: Workspace = {
    version: 1, homeBoardId: 'root', boards: [{ id: 'root', parentNodeId: null, title: 'Root', description: '', createdAt: time }],
    nodes: [makeNode('hub'), ...Array.from({ length: 20 }, (_, index) => makeNode(`n-${index}`))], edges: [],
  };
  const outgoing = { ...doc, edges: doc.nodes.slice(1).map(node => ({ id: node.id, boardId: 'root', sourceId: 'hub', targetId: node.id, label: '' })) };
  const incoming = { ...outgoing, edges: outgoing.edges.map(edge => ({ ...edge, sourceId: edge.targetId, targetId: edge.sourceId })) };
  const tasks: Workspace = { ...doc, nodes: doc.nodes.map(node => ({ ...node, task: { status: 'todo', parentId: node.id === 'hub' ? null : 'hub' } })) };
  const expected = nodeEnergy(buildNodeGrowth(outgoing).get('hub')!);
  assert.deepEqual(nodeEnergy(buildNodeGrowth(incoming).get('hub')!), expected);
  assert.deepEqual(nodeEnergy(buildNodeGrowth(tasks).get('hub')!), expected);
  assert.ok(expected.strength > nodeEnergy(buildNodeGrowth(doc).get('hub')!).strength);
});

test('motion remains finite when given invalid negative mass or an unbounded upper input', () => {
  assert.deepEqual(nodeEnergy({ mass: -10 }), nodeEnergy());
  assert.deepEqual(nodeEnergy({ mass: NaN }), nodeEnergy());
  for (const value of Object.values(nodeEnergy({ mass: Infinity }))) assert.ok(Number.isFinite(value));
});
