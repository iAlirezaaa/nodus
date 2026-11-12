import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionGeometry, type EdgeGeometryOptions, type EdgeRectangle } from '../lib/edge-geometry.ts';

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
