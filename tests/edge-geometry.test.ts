import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionGeometry, connectionMayIntersectViewport, type EdgeGeometryOptions, type EdgeRectangle } from '../lib/edge-geometry.ts';

const source: EdgeRectangle = { x: 0, y: 0, width: 100, height: 80 };
const target: EdgeRectangle = { x: 400, y: 160, width: 120, height: 100 };
const numbers = (d: string) => d.match(/-?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi)!.map(Number);
function assertBounded(options: EdgeGeometryOptions, a = source, b = target) {
  const geometry = connectionGeometry(a, b, options);
  const values = numbers(geometry.d);
  for (let index = 0; index < values.length; index += 2) {
    assert.ok(Number.isFinite(values[index]) && Number.isFinite(values[index + 1]));
    assert.ok(values[index] >= geometry.bounds.minX && values[index] <= geometry.bounds.maxX);
    assert.ok(values[index + 1] >= geometry.bounds.minY && values[index + 1] <= geometry.bounds.maxY);
  }
  assert.deepEqual(values.slice(0, 2), [geometry.ax, geometry.ay]);
  assert.deepEqual(values.slice(-2), [geometry.bx, geometry.by]);
  return geometry;
}

test('default curve keeps source-to-target rectangle anchors and a true cubic midpoint', () => {
  const geometry = assertBounded({});
  assert.equal(geometry.d, 'M 100 40 C 250 40, 250 210, 400 210');
  assert.deepEqual(geometry.midpoint, { x: 250, y: 125 });
  const values = numbers(geometry.d);
  assert.equal((values[0] + 3 * values[2] + 3 * values[4] + values[6]) / 8, geometry.midpoint.x);
  assert.equal((values[1] + 3 * values[3] + 3 * values[5] + values[7]) / 8, geometry.midpoint.y);
});

test('straight paths use line segments and preserve an explicit bend', () => {
  assert.equal(assertBounded({ route: 'straight' }).d, 'M 100 40 L 400 210');
  const bend = { x: -80, y: 420 };
  const geometry = assertBounded({ route: 'straight', bend });
  assert.equal(geometry.d, 'M 100 40 L -80 420 L 400 210');
  assert.deepEqual(geometry.midpoint, bend);
});

test('elbow paths stay orthogonal, pass through the handle, and reach both anchors', () => {
  for (const bend of [undefined, { x: 700, y: -200 }]) {
    const geometry = assertBounded({ route: 'elbow', bend });
    const values = numbers(geometry.d);
    for (let index = 2; index < values.length; index += 2) assert.ok(values[index] === values[index - 2] || values[index + 1] === values[index - 1]);
    if (bend) assert.ok(values.some((value, index) => index % 2 === 0 && value === bend.x && values[index + 1] === bend.y));
  }
});

test('curved bends pass through the handle with collinear tangents and bounded controls', () => {
  const bend = { x: 80, y: -300 };
  const geometry = assertBounded({ route: 'curve', bend });
  assert.deepEqual(geometry.midpoint, bend);
  const values = numbers(geometry.d);
  assert.equal(values.length, 14);
  assert.deepEqual(values.slice(6, 8), [bend.x, bend.y]);
  const incoming = { x: bend.x - values[4], y: bend.y - values[5] };
  const outgoing = { x: values[8] - bend.x, y: values[9] - bend.y };
  assert.ok(Math.abs(incoming.x * outgoing.y - incoming.y * outgoing.x) < 1e-8);
  assert.ok(incoming.x * outgoing.x + incoming.y * outgoing.y > 0);
});

test('vertical, reversed, overlapping and distant routes remain finite with conservative bounds', () => {
  const destinations = [
    { x: 0, y: 300, width: 100, height: 80 }, { x: -500, y: 0, width: 100, height: 80 },
    { x: 0, y: -300, width: 100, height: 80 }, { ...source },
    { x: 1e7, y: -1e7, width: 100, height: 80 },
  ];
  for (const destination of destinations) for (const route of ['curve', 'straight', 'elbow'] as const) {
    assertBounded({ route }, source, destination);
    assertBounded({ route, bend: { x: 0, y: 0 } }, source, destination);
  }
});

test('invalid optional bends fall back to the automatic path without mutating inputs', () => {
  const options: EdgeGeometryOptions = { route: 'curve', bend: { x: Number.NaN, y: 1 } };
  assert.deepEqual(connectionGeometry(source, target, options), connectionGeometry(source, target));
  assert.deepEqual(source, { x: 0, y: 0, width: 100, height: 80 });
  assert.ok(Number.isNaN(options.bend!.x));
});

test('broad-phase culling retains a connection crossing the viewport with both nodes outside', () => {
  const a = { x: -1200, y: 10, width: 80, height: 80 }, b = { x: 1200, y: 10, width: 80, height: 80 };
  const viewport = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  for (const route of ['curve', 'straight', 'elbow'] as const) {
    assert.equal(connectionMayIntersectViewport(a, b, { route }, viewport), true);
    assert.equal(connectionMayIntersectViewport(b, a, { route }, viewport), true);
  }
  assert.equal(connectionMayIntersectViewport({ ...a, x: 10, y: -1200 }, { ...b, x: 10, y: 1200 }, {}, viewport), true);
});

test('broad-phase culling delegates explicit bends even when both endpoints are far away', () => {
  const a = { ...source, x: 5000, y: 5000 }, b = { ...target, x: 5500, y: 5500 };
  const viewport = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  for (const route of ['curve', 'straight', 'elbow'] as const) {
    assert.equal(connectionMayIntersectViewport(a, b, { route, bend: { x: 0, y: 0 } }, viewport), true);
    assert.equal(connectionMayIntersectViewport(a, b, { route, bend: { x: 9000, y: 9000 } }, viewport), true);
  }
});

test('overlapping rectangles retain cubic controls outside the endpoint union', () => {
  const a = { x: 100, y: 0, width: 300, height: 100 }, b = { x: 150, y: 0, width: 300, height: 100 };
  const bounds = connectionGeometry(a, b).bounds;
  assert.ok(bounds.minX < a.x && bounds.maxX > b.x + b.width);
  for (const x of [bounds.minX, bounds.maxX]) {
    assert.equal(connectionMayIntersectViewport(a, b, {}, { minX: x, maxX: x, minY: 50, maxY: 50 }), true,
      'A tangent control touching a viewport boundary must be retained.');
  }
  const verticalA = { x: 0, y: 100, width: 100, height: 300 }, verticalB = { x: 0, y: 150, width: 100, height: 300 };
  const vertical = connectionGeometry(verticalA, verticalB).bounds;
  assert.ok(vertical.minY < verticalA.y && vertical.maxY > verticalB.y + verticalB.height);
  assert.equal(connectionMayIntersectViewport(verticalA, verticalB, {}, { minX: 50, maxX: 50, minY: vertical.maxY, maxY: vertical.maxY }), true);
});

test('broad-phase culling rejects safely distant unbent paths without mutating geometry inputs', () => {
  const viewport = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  const a = { ...source, x: 5000, y: 5000 }, b = { ...target, x: 5500, y: 5100 };
  const original = JSON.stringify({ a, b, viewport });
  for (const route of ['curve', 'straight', 'elbow'] as const) assert.equal(connectionMayIntersectViewport(a, b, { route }, viewport), false);
  assert.equal(connectionMayIntersectViewport({ ...a, x: -5000 }, { ...b, x: -5500 }, {}, viewport), false);
  assert.equal(JSON.stringify({ a, b, viewport }), original);
  assert.equal(connectionMayIntersectViewport({ ...a, x: NaN }, b, {}, viewport), true, 'Malformed coordinates must not create false-negative culling.');
});

test('deterministic varied rectangles never cull a viewport intersecting actual control bounds', () => {
  let seed = 0x1a2b3c4d;
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  const rectangle = (): EdgeRectangle => ({ x: (random() - .5) * 20000, y: (random() - .5) * 20000, width: 1 + random() * 1500, height: 1 + random() * 1500 });
  for (let index = 0; index < 1200; index++) {
    const a = rectangle(), b = index % 3 ? rectangle() : { ...a, x: a.x + (random() - .5) * a.width, y: a.y + (random() - .5) * a.height };
    const options: EdgeGeometryOptions = { route: (['curve', 'straight', 'elbow'] as const)[index % 3] };
    const bounds = connectionGeometry(a, b, options).bounds;
    const x = bounds.minX + (bounds.maxX - bounds.minX) * random(), y = bounds.minY + (bounds.maxY - bounds.minY) * random();
    const viewport = { minX: x - random() * 100, minY: y - random() * 100, maxX: x + random() * 100, maxY: y + random() * 100 };
    assert.equal(connectionMayIntersectViewport(a, b, options, viewport), true);
    for (const [cx, cy] of [[bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]]) {
      assert.equal(connectionMayIntersectViewport(a, b, options, { minX: cx, maxX: cx, minY: cy, maxY: cy }), true,
        `Conservative envelope lost the control bounds for rectangle sample ${index}.`);
    }
  }
});
