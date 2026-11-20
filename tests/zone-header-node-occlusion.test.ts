import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneOverviewHeaderPlacements, type ZoneHeaderScreenRect } from '../lib/zone-header-layout.ts';

const viewport = { x: 0, y: 0, zoom: .85, width: 390, height: 844 };
const zone = { id: 'selected', bounds: { x: 30, y: 400 / .85, width: 280, height: 310 } };
const topLeft = (p: { left: number; top: number; width: number }, zoom = .85) => ({
  left: (zone.bounds.x + p.left) * zoom,
  top: (zone.bounds.y + p.top) * zoom,
  right: (zone.bounds.x + p.left) * zoom + p.width,
  bottom: (zone.bounds.y + p.top) * zoom + (zoom < .65 ? 72 : 116),
});
const clears = (a: ZoneHeaderScreenRect, b: ZoneHeaderScreenRect) =>
  a.right + 7.99 <= b.left || b.right + 7.99 <= a.left ||
  a.bottom + 7.99 <= b.top || b.bottom + 7.99 <= a.top;

test('selected idea cannot mask its Zone edit heading when nearby clear space exists', () => {
  const obstacle = { left: 50, right: 180, top: 415, bottom: 470 };
  const old = zoneOverviewHeaderPlacements([zone], viewport, false, new Set(['selected'])).get('selected')!;
  assert.equal(clears(topLeft(old), obstacle), false, 'regression fixture intersects the original heading');
  const next = zoneOverviewHeaderPlacements([zone], viewport, false, new Set(['selected']), [obstacle]).get('selected');
  assert.ok(next, 'nearby space must retain an edit heading');
  assert.ok(clears(topLeft(next!), obstacle), 'Zone title and node hit targets must be separated');
  assert.equal(Math.round(44 * next!.scale * viewport.zoom), 44);
});

test('safe fallback suppresses a heading rather than covering a broad selected node', () => {
  const obstacle = { left: 12, right: 378, top: 200, bottom: 730 };
  const placed = zoneOverviewHeaderPlacements([zone], viewport, true, new Set(['selected']), [obstacle]);
  assert.equal(placed.has('selected'), false, 'zone remains in document and panel, heading omitted only');
  assert.equal(zone.id, 'selected');
});

test('missing or malformed node obstacles preserve exact existing Zone placements', () => {
  const previous = zoneOverviewHeaderPlacements([zone], viewport, false, new Set(['selected']));
  const bad = [{ left: NaN, right: 100, top: 200, bottom: 300 },
    { left: 5000, right: 5100, top: 5000, bottom: 5100 },
    { left: 100, right: 99, top: 100, bottom: 200 }];
  assert.deepEqual(zoneOverviewHeaderPlacements([zone], viewport, false, new Set(['selected']), []), previous);
  assert.deepEqual(zoneOverviewHeaderPlacements([zone], viewport, false, new Set(['selected']), bad), previous);
});

test('occlusion avoidance is deterministic in FA/EN at compact and overview zoom', () => {
  const before = structuredClone({ zone, viewport });
  for (const rtl of [true, false]) for (const zoom of [.2, .65, .85, .999]) {
    const vp = { ...viewport, zoom };
    const bounds = { ...zone.bounds, y: 400 / zoom };
    const group = { ...zone, bounds };
    const obstacle = { left: 40, right: 220, top: 400, bottom: 455 };
    const a = zoneOverviewHeaderPlacements([group], vp, rtl, new Set([zone.id]), [obstacle]);
    const b = zoneOverviewHeaderPlacements([group], vp, rtl, new Set([zone.id]), [obstacle]);
    assert.deepEqual(a, b);
    if (a.has(zone.id)) {
      const p = a.get(zone.id)!;
      const screen = { left: (bounds.x + p.left) * zoom, top: (bounds.y + p.top) * zoom,
        right: (bounds.x + p.left) * zoom + p.width,
        bottom: (bounds.y + p.top) * zoom + (zoom < .65 ? 72 : 116) };
      assert.ok(clears(screen, obstacle), `no selected-node overlap: zoom=${zoom}, rtl=${rtl}`);
      assert.ok(screen.top >= 12 - 1e-8 && screen.bottom <= viewport.height - 12 + 1e-8);
    }
  }
  assert.deepEqual({ zone, viewport }, before, 'projection cannot alter document or view objects');
});
