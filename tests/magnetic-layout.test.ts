import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMagneticSimulation, DEFAULT_MAGNETIC_SETTINGS, normalizeMagneticSettings,
  reheatMagneticSimulation, stepMagneticSimulation, updateMagneticSettings,
  type MagneticPoint, type MagneticSettings, type MagneticSimulation,
} from '../lib/magnetic-layout.ts';

const frame = 1000 / 60;
const settings = (patch: Partial<MagneticSettings> = {}): MagneticSettings => ({ ...DEFAULT_MAGNETIC_SETTINGS, enabled: true, ...patch });
const point = (id: string, x = 0, y = 0, radius = 12, mass = 1): MagneticPoint => ({ id, x, y, radius, mass });
const pair = [point('a', -400), point('b', 400)];
const link = [{ sourceId: 'a', targetId: 'b' }];
const positions = (simulation: MagneticSimulation) => [...simulation.bodies.values()].map(({ id, x, y }) => ({ id, x, y }));
const distance = (simulation: MagneticSimulation, a = 'a', b = 'b') => {
  const first = simulation.bodies.get(a)!, second = simulation.bodies.get(b)!;
  return Math.hypot(first.x - second.x, first.y - second.y);
};
function settle(simulation: MagneticSimulation, pins?: ReadonlyMap<string, { x: number; y: number }>) {
  let frames = 0;
  while (frames < 600 && stepMagneticSimulation(simulation, frame, pins)) frames++;
  assert.ok(frames < 500, 'A burst must release the animation loop within its bounded lifetime.');
  assert.equal(simulation.active, false);
  return frames;
}

test('magnet preferences reject invalid storage data and clamp finite controls', () => {
  assert.deepEqual(normalizeMagneticSettings(null), DEFAULT_MAGNETIC_SETTINGS);
  assert.deepEqual(normalizeMagneticSettings({ enabled: 'yes', attraction: NaN, repulsion: Infinity, center: '1', distance: {} }), DEFAULT_MAGNETIC_SETTINGS);
  assert.deepEqual(normalizeMagneticSettings({ enabled: true, attraction: 4, repulsion: -8, center: .25, distance: 9999 }),
    { enabled: true, attraction: 1, repulsion: 0, center: .25, distance: 420 });
  assert.equal(normalizeMagneticSettings({ distance: -100 }).distance, 60);
  assert.ok(Object.isFrozen(DEFAULT_MAGNETIC_SETTINGS));
});

test('simulation owns its bodies and leaves graph inputs untouched, including empty and single-node views', () => {
  const points = pair.map(item => Object.freeze({ ...item })), links = link.map(item => Object.freeze({ ...item }));
  const before = JSON.stringify({ points, links });
  const simulation = createMagneticSimulation(points, links, settings());
  stepMagneticSimulation(simulation, frame);
  assert.equal(JSON.stringify({ points, links }), before);
  assert.notEqual(simulation.bodies.get('a'), points[0]);
  for (const nodes of [[], [point('only', 120, 340)]]) {
    const single = createMagneticSimulation(nodes, [], settings());
    assert.equal(stepMagneticSimulation(single, frame), false);
    if (nodes.length) assert.deepEqual(positions(single), [{ id: 'only', x: 120, y: 340 }]);
  }
});

test('connected thoughts attract and settle near a readable spring distance', () => {
  const simulation = createMagneticSimulation(pair, link, settings());
  const frames = settle(simulation);
  assert.ok(frames > 1, 'The layout should animate rather than jump to its answer.');
  assert.ok(distance(simulation) > 195 && distance(simulation) < 240);
  assert.ok(Math.abs(simulation.bodies.get('a')!.x + simulation.bodies.get('b')!.x) < .001, 'A balanced pair preserves its center.');
  assert.equal(simulation.energy, 0);
  const frozen = positions(simulation);
  for (let i = 0; i < 20; i++) assert.equal(stepMagneticSimulation(simulation, frame), false);
  assert.deepEqual(positions(simulation), frozen, 'Sleeping simulations have no idle drift.');
});

test('link distance and attraction controls change the actual force result', () => {
  const short = createMagneticSimulation(pair, link, settings({ distance: 60 }));
  const long = createMagneticSimulation(pair, link, settings({ distance: 420 }));
  settle(short); settle(long);
  assert.ok(distance(long) - distance(short) > 250);
  const loose = createMagneticSimulation(pair, link, settings({ attraction: .1, repulsion: 0, center: 0 }));
  const tight = createMagneticSimulation(pair, link, settings({ attraction: .9, repulsion: 0, center: 0 }));
  for (let i = 0; i < 20; i++) { stepMagneticSimulation(loose, frame); stepMagneticSimulation(tight, frame); }
  assert.ok(distance(tight) + 100 < distance(loose), 'Stronger links pull neighbors together more quickly.');
});

test('unlinked thoughts repel, and center strength controls the spread', () => {
  const nearby = [point('a', -25), point('b', 25)];
  const staticView = createMagneticSimulation(nearby, [], settings({ attraction: 0, repulsion: 0, center: 0 }));
  const repelling = createMagneticSimulation(nearby, [], settings({ attraction: 0, repulsion: 1, center: 0 }));
  settle(staticView); settle(repelling);
  assert.equal(distance(staticView), 50);
  assert.ok(distance(repelling) > 180);
  const centered = createMagneticSimulation(pair, [], settings({ attraction: 0, repulsion: 0, center: 1 }));
  const uncentered = createMagneticSimulation(pair, [], settings({ attraction: 0, repulsion: 0, center: 0 }));
  for (let i = 0; i < 60; i++) { stepMagneticSimulation(centered, frame); stepMagneticSimulation(uncentered, frame); }
  assert.ok(distance(centered) + 100 < distance(uncentered));
});

test('grown nodes have greater inertia without changing their original data', () => {
  const simulation = createMagneticSimulation([point('a', -400, 0, 12, 4), point('b', 400)], link, settings({ repulsion: 0, center: 0 }));
  stepMagneticSimulation(simulation, frame);
  const heavyTravel = simulation.bodies.get('a')!.x + 400, lightTravel = 400 - simulation.bodies.get('b')!.x;
  assert.ok(heavyTravel > 0 && lightTravel > heavyTravel * 3.9);
});

test('pins follow the pointer exactly while connected neighbors respond, then release cleanly', () => {
  const simulation = createMagneticSimulation([point('a'), point('b', 200)], link, settings());
  const pins = new Map([['a', { x: -300, y: 80 }]]);
  for (let i = 0; i < 40; i++) {
    stepMagneticSimulation(simulation, frame, pins);
    assert.deepEqual({ x: simulation.bodies.get('a')!.x, y: simulation.bodies.get('a')!.y }, pins.get('a'));
  }
  assert.ok(simulation.bodies.get('b')!.x < 100, 'Dragging one node pulls its neighbor.');
  pins.set('a', { x: -400, y: 150 });
  assert.equal(stepMagneticSimulation(simulation, frame, pins), true);
  assert.equal(simulation.bodies.get('a')!.x, -400);
  assert.ok(simulation.elapsedMs < frame * 2, 'A changed drag pin starts a new bounded burst.');
  settle(simulation, pins);
  const fixed = positions(simulation);
  assert.equal(stepMagneticSimulation(simulation, frame, pins), false, 'An unchanged pin does not wake a settled graph.');
  assert.deepEqual(positions(simulation), fixed);
  assert.equal(stepMagneticSimulation(simulation, frame), true, 'Releasing the pin allows the network to relax.');
  assert.notEqual(simulation.bodies.get('a')!.x, -400);
});

test('all-pinned networks stop immediately and ignore invalid or missing drag targets', () => {
  const simulation = createMagneticSimulation(pair, link, settings());
  const pins = new Map([['a', { x: 0, y: 10 }], ['b', { x: 200, y: 20 }], ['missing', { x: 100, y: 100 }]]);
  assert.equal(stepMagneticSimulation(simulation, frame, pins), false);
  assert.deepEqual(positions(simulation), [{ id: 'a', x: 0, y: 10 }, { id: 'b', x: 200, y: 20 }]);
  const invalid = createMagneticSimulation(pair, link, settings());
  stepMagneticSimulation(invalid, frame, new Map([['a', { x: NaN, y: Infinity }]]));
  assert.ok(Number.isFinite(invalid.bodies.get('a')!.x));
});

test('radius-aware collisions separate coincident cards and are deterministic', () => {
  const points = [point('wide', 0, 0, 90), point('medium', 0, 0, 60), point('small', 0, 0, 25)];
  const first = createMagneticSimulation(points, [], settings({ attraction: 0, repulsion: 0, center: 0 }));
  const second = createMagneticSimulation([...points].reverse(), [], settings({ attraction: 0, repulsion: 0, center: 0 }));
  settle(first); settle(second);
  assert.deepEqual(positions(first), positions(second));
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    assert.ok(distance(first, points[i].id, points[j].id) >= points[i].radius + points[j].radius + 10);
  }
});

test('self, duplicate, reversed and dangling links do not multiply attraction', () => {
  const clean = createMagneticSimulation(pair, link, settings());
  const noisy = createMagneticSimulation(pair, [...link, ...link, { sourceId: 'b', targetId: 'a' },
    { sourceId: 'a', targetId: 'a' }, { sourceId: 'a', targetId: 'missing' }, { sourceId: 'missing', targetId: 'b' }], settings());
  for (let i = 0; i < 40; i++) { stepMagneticSimulation(clean, frame); stepMagneticSimulation(noisy, frame); }
  assert.deepEqual(positions(clean), positions(noisy));
});

test('pause preserves positions; changed controls reheat and unchanged controls do not', () => {
  const simulation = createMagneticSimulation(pair, link, settings());
  for (let i = 0; i < 10; i++) stepMagneticSimulation(simulation, frame);
  updateMagneticSettings(simulation, settings({ enabled: false }));
  const paused = positions(simulation);
  assert.equal(stepMagneticSimulation(simulation, frame), false);
  assert.deepEqual(positions(simulation), paused);
  assert.ok([...simulation.bodies.values()].every(body => body.vx === 0 && body.vy === 0));
  updateMagneticSettings(simulation, settings({ distance: 420 }));
  assert.equal(simulation.active, true);
  assert.equal(simulation.elapsedMs, 0);
  stepMagneticSimulation(simulation, frame);
  const elapsed = simulation.elapsedMs;
  updateMagneticSettings(simulation, settings({ distance: 420 }));
  assert.equal(simulation.elapsedMs, elapsed);
  settle(simulation);
  reheatMagneticSimulation(simulation);
  assert.equal(simulation.active, true);
});

test('bounded substeps handle frame stalls and match a steady frame rate', () => {
  const fast = createMagneticSimulation(pair, link, settings()), slow = createMagneticSimulation(pair, link, settings());
  for (let i = 0; i < 40; i++) stepMagneticSimulation(fast, frame);
  for (let i = 0; i < 20; i++) stepMagneticSimulation(slow, frame * 2);
  assert.ok(Math.abs(distance(fast) - distance(slow)) < .001);
  const stalled = createMagneticSimulation(pair, link, settings());
  stepMagneticSimulation(stalled, 600000);
  assert.ok(stalled.elapsedMs <= 50);
  assert.ok(Math.abs(stalled.bodies.get('a')!.x + 400) <= 66.001, 'A resumed tab never integrates minutes of velocity in one frame.');
  stepMagneticSimulation(stalled, NaN);
  const before = positions(stalled);
  stepMagneticSimulation(stalled, 0);
  assert.deepEqual(positions(stalled), before);
  assert.ok([...stalled.bodies.values()].every(body => Number.isFinite(body.x) && Number.isFinite(body.y)));
});

test('malformed coordinates and large forces remain inside finite world bounds', () => {
  const simulation = createMagneticSimulation([point('a', NaN, Infinity, Infinity, NaN), point('b', -1e90, 1e90, -20, -10)], link,
    settings({ attraction: 1, repulsion: 1, center: 1, distance: 60 }));
  for (let i = 0; i < 40; i++) stepMagneticSimulation(simulation, 50);
  for (const body of simulation.bodies.values()) {
    assert.ok(Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.vx) && Number.isFinite(body.vy));
    assert.ok(Math.abs(body.x) <= 1e7 && Math.abs(body.y) <= 1e7);
    assert.ok(body.radius >= 1 && body.mass > 0);
    assert.ok(Math.hypot(body.vx, body.vy) <= 22.001);
  }
});

test('large graphs and coincident buckets use bounded spatial work rather than all pairs', () => {
  for (const coincident of [false, true]) {
    const count = 5000;
    const nodes = Array.from({ length: count }, (_, index) => point(`n-${index}`, coincident ? 0 : index % 100 * 40, coincident ? 0 : Math.floor(index / 100) * 40));
    const links = nodes.slice(1).map((node, index) => ({ sourceId: nodes[index].id, targetId: node.id }));
    const simulation = createMagneticSimulation(nodes, links, settings());
    for (let i = 0; i < 3; i++) {
      assert.equal(stepMagneticSimulation(simulation, frame), true);
      const stats = simulation.diagnostics;
      assert.ok(stats.treeCells < count * 20);
      assert.ok(stats.forceVisits < count * 192);
      assert.ok(stats.collisionVisits <= count * 112);
      assert.ok(stats.collisionPairs <= count * 32);
      assert.ok([...simulation.bodies.values()].every(body => Number.isFinite(body.x) && Number.isFinite(body.y)));
    }
  }
});

test('a persistently busy network still yields within the hard burst limit', () => {
  const nodes = Array.from({ length: 80 }, (_, index) => point(`n-${index}`, index % 10 * 4, Math.floor(index / 10) * 4, 50));
  const simulation = createMagneticSimulation(nodes, [], settings({ repulsion: 1, center: 1 }));
  settle(simulation);
  assert.ok(simulation.elapsedMs <= 8000 + frame);
});
