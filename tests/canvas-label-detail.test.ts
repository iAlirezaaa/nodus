import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasLabelDetail, neuronCaptionShift } from '../lib/canvas-label-detail.ts';

test('small 20-node boards retain original labels even when zoomed far out', () => {
  assert.equal(canvasLabelDetail(20, 0.2), 'compact');
  assert.equal(canvasLabelDetail(20, 1), 'full');
});
test('a 100-node board becomes a connection overview only when labels are unreadable', () => {
  assert.equal(canvasLabelDetail(100, 0.2), 'overview');
  assert.equal(canvasLabelDetail(100, 0.449), 'overview');
  assert.equal(canvasLabelDetail(100, 0.45), 'compact');
  assert.equal(canvasLabelDetail(100, 0.85), 'compact');
  assert.equal(canvasLabelDetail(100, 0.9), 'full');
});
test('a 500-node graph follows the same overview rule without counting hidden data', () => {
  assert.equal(canvasLabelDetail(500, 0.25), 'overview');
  assert.equal(canvasLabelDetail(500, 0.6), 'compact');
  assert.equal(canvasLabelDetail(500, 1), 'full');
});
test('boards of 24 and 25 nodes have a predictable boundary', () => {
  assert.equal(canvasLabelDetail(24, 0.3), 'compact');
  assert.equal(canvasLabelDetail(25, 0.3), 'overview');
  assert.equal(canvasLabelDetail(99, 0.85), 'full');
});

test('neural captions stay within a 390px screen after zooming in', () => {
  const shift = neuronCaptionShift(14, 195, 1.6, 390);
  assert.ok(Math.abs(shift + 14) < 0.001);
  assert.equal(neuronCaptionShift(14, 195, 0.3, 390), 0);
});
test('a label near either mobile edge receives a bounded world-space shift', () => {
  const left = neuronCaptionShift(-480, 195, 0.3, 390);
  const right = neuronCaptionShift(480, 195, 0.3, 390);
  assert.ok(left > 0);
  assert.ok(right < 0);
  assert.ok(Number.isFinite(left) && Number.isFinite(right));
});
test('caption shift avoids invalid zoom and does not mutate the graph', () => {
  assert.equal(neuronCaptionShift(14, 0, 0, 390), 0);
  assert.equal(neuronCaptionShift(14, 0, 1, 30), 0);
});

test('a split canvas uses its own width rather than the window width', () => {
  assert.ok(Math.abs(neuronCaptionShift(14, 120, 1.6, 240) + 14) < 0.001);
  assert.equal(neuronCaptionShift(0, 120, 1, 240), 0);
});

test('editing and reading share an edge-safe 250px maximum caption budget', () => {
  assert.equal(neuronCaptionShift(-100, 120, 1, 240), 100);
  assert.equal(neuronCaptionShift(14, 195, 1.6, 390), -14);
});
