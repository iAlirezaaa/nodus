import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneOverviewHeaderPlacement } from '../lib/zone-header-layout.ts';

const bounds = { x: -300, y: -180, width: 680, height: 540 };
const visible = { x: 320, y: 190, width: 1280, height: 800, zoom: .15 };

function screenRect(viewport: typeof visible, p: NonNullable<ReturnType<typeof zoneOverviewHeaderPlacement>>) {
  return {
    left: (bounds.x + p.left) * viewport.zoom + viewport.x,
    top: (bounds.y + p.top) * viewport.zoom + viewport.y,
    width: p.width * p.scale * viewport.zoom,
    targetHeight: 44 * p.scale * viewport.zoom,
  };
}

test('distant LTR Zone title and hit target are readable with no input writes', () => {
  const oldBounds = structuredClone(bounds), oldView = structuredClone(visible);
  const p = zoneOverviewHeaderPlacement(bounds, visible, false);
  assert.ok(p);
  const rect = screenRect(visible, p);
  assert.ok(rect.left >= 12 && rect.left + rect.width <= visible.width - 12);
  assert.ok(rect.top >= 12 && rect.top <= visible.height - 88);
  assert.ok(rect.width >= 168 && rect.width <= 288);
  assert.equal(rect.targetHeight, 44);
  assert.deepEqual(bounds, oldBounds);
  assert.deepEqual(visible, oldView);
});

test('RTL Zone heading anchors from the right at 390px mobile size', () => {
  const viewport = { x: 80, y: 260, width: 390, height: 844, zoom: .2 };
  const ltr = zoneOverviewHeaderPlacement(bounds, viewport, false)!;
  const rtl = zoneOverviewHeaderPlacement(bounds, viewport, true)!;
  const l = screenRect(viewport, ltr), r = screenRect(viewport, rtl);
  assert.ok(l.left >= 12 && l.left + l.width <= 378);
  assert.ok(r.left >= 12 && r.left + r.width <= 378);
  assert.ok(r.left <= l.left);
  assert.equal(r.targetHeight, 44);
});

test('partially visible tall Zone keeps header within mobile viewport', () => {
  const area = { x: -300, y: -1400, width: 1600, height: 2000 };
  const viewport = { x: 145, y: 600, width: 390, height: 844, zoom: .4 };
  const p = zoneOverviewHeaderPlacement(area, viewport, false)!;
  const left = (area.x + p.left) * viewport.zoom + viewport.x;
  const top = (area.y + p.top) * viewport.zoom + viewport.y;
  assert.ok(left >= 12 - 1e-8 && left + p.width <= 378 + 1e-8);
  assert.ok(top >= 12 - 1e-8 && top <= viewport.height - 88 + 1e-8);
});

test('invalid or fully invisible Zone never creates floating header', () => {
  for (const area of [
    { x: -100000, y: 0, width: 100, height: 100 },
    { x: 100000, y: 0, width: 100, height: 100 },
    { x: 0, y: -100000, width: 100, height: 100 },
    { x: 0, y: 100000, width: 100, height: 100 },
    { x: NaN, y: 0, width: 100, height: 100 },
    { x: 0, y: 0, width: 0, height: 100 },
  ]) assert.equal(zoneOverviewHeaderPlacement(area, visible, false), null);
  assert.equal(zoneOverviewHeaderPlacement(bounds, { ...visible, zoom: 0 }, true), null);
  assert.equal(zoneOverviewHeaderPlacement(bounds, { ...visible, x: Infinity }, true), null);
  assert.equal(zoneOverviewHeaderPlacement(bounds, { ...visible, width: 90 }, true), null);
});
