import test from 'node:test';
import assert from 'node:assert/strict';
import { clampReadingCaptionShift } from '../lib/graph-caption-placement.ts';

test('reading captions stay in the 320px mobile viewport at both edges', () => {
  const viewport = 320, width = 235, scale = 1;
  for (const center of [15, 38, 160, 285, 315]) {
    const shift = clampReadingCaptionShift(center, viewport, 1, scale, width);
    const renderedCenter = center + shift;
    assert.ok(renderedCenter - width / 2 >= 12 - 0.00001);
    assert.ok(renderedCenter + width / 2 <= viewport - 12 + 0.00001);
  }
});

test('zoom compensation yields screen-space bounds without moving node positions', () => {
  for (const [zoom, labelScale, cssWidth] of [[0.5, 2, 235], [2, 1, 148], [0.2, 5, 235]]) {
    const screenCenter = 30, viewport = 320;
    const before = JSON.stringify({ zoom, labelScale, screenCenter, viewport, cssWidth });
    const shift = clampReadingCaptionShift(screenCenter, viewport, zoom, labelScale, cssWidth);
    const center = screenCenter + shift * zoom, half = zoom * labelScale * cssWidth / 2;
    assert.ok(center - half >= 12 - 0.00001, String([zoom, labelScale, center, half]));
    assert.ok(center + half <= viewport - 12 + 0.00001);
    assert.equal(JSON.stringify({ zoom, labelScale, screenCenter, viewport, cssWidth }), before);
  }
});

test('centered and entirely offscreen captions are not changed', () => {
  assert.equal(clampReadingCaptionShift(160, 320, 1, 1, 235), 0);
  assert.equal(clampReadingCaptionShift(-15, 320, 1, 1, 235), 0);
  assert.equal(clampReadingCaptionShift(340, 320, 1, 1, 235), 0);
});

test('invalid geometry cannot create a NaN transform', () => {
  for (const bad of [NaN, Infinity, -1, 0]) assert.equal(clampReadingCaptionShift(8, 320, bad, 1, 235), 0);
  assert.equal(clampReadingCaptionShift(20, 0, 1, 1, 235), 0);
});
