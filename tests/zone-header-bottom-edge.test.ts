import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneHeaderDetail, zoneOverviewHeaderPlacement } from '../lib/zone-header-layout.ts';

const screenTop = (zoneTop: number, zoom: number, top: number) => (zoneTop + top) * zoom;

// From actual zones.css maximum clamped content: 2 title lines (14px/1.7),
// 2 description lines (13px/1.7), 16px padding, 3px gap, 2px borders = 112.8px.
// Allow 116px for rounding/font metrics, plus 12px screen clearance.
const COMPACT_HEADER_HEIGHT = 116;
const OVERVIEW_HEADER_HEIGHT = 72;

test('compact Zone heading stays fully inside 390px screen with long title/description at bottom edge', () => {
  for (const zoom of [.65, .85, .999]) {
    for (const rtl of [true, false]) {
      const bounds = { x: 20, y: 760 / zoom, width: 310, height: 300 };
      const viewport = { x: 0, y: 0, zoom, width: 390, height: 844 };
      assert.equal(zoneHeaderDetail(zoom), 'compact');
      const p = zoneOverviewHeaderPlacement(bounds, viewport, rtl);
      assert.ok(p, `visible compact heading at ${zoom}`);
      const y = screenTop(bounds.y, zoom, p.top);
      assert.ok(y >= 12, 'top clearance');
      assert.ok(y + COMPACT_HEADER_HEIGHT <= viewport.height - 12 + 1e-8,
        `heading bottom ${y + COMPACT_HEADER_HEIGHT}px overflowed screen at zoom ${zoom}, rtl=${rtl}`);
      assert.ok(Math.abs(44 * p.scale * zoom - 44) < 1e-8, 'edit target remains 44px');
    }
  }
});

test('overview Zone heading retains its smaller layout and 12px bottom clearance', () => {
  for (const rtl of [true, false]) {
    const bounds = { x: 20, y: 760 / .15, width: 310, height: 500 };
    const viewport = { x: 0, y: 0, zoom: .15, width: 390, height: 844 };
    assert.equal(zoneHeaderDetail(.15), 'overview');
    const p = zoneOverviewHeaderPlacement(bounds, viewport, rtl);
    assert.ok(p);
    const y = screenTop(bounds.y, viewport.zoom, p.top);
    assert.ok(y + OVERVIEW_HEADER_HEIGHT <= viewport.height - 12 + 1e-8);
  }
});

test('compact Zone heading projects without modifying saved graph coordinates or viewport', () => {
  const bounds = { x: 24, y: 760 / .85, width: 310, height: 300 };
  const viewport = { x: 0, y: 0, zoom: .85, width: 390, height: 844 };
  const before = structuredClone({ bounds, viewport });
  const p = zoneOverviewHeaderPlacement(bounds, viewport, true);
  assert.ok(p);
  assert.deepEqual({ bounds, viewport }, before);
  assert.equal(typeof p.left, 'number');
});

test('compact heading never projects outside a viewport too short for its full text', () => {
  const bounds = { x: 0, y: 0, width: 500, height: 300 };
  assert.equal(zoneOverviewHeaderPlacement(bounds, { x: 0, y: 0, zoom: .85, width: 390, height: 139 }, false), null);
  assert.ok(zoneOverviewHeaderPlacement(bounds, { x: 0, y: 0, zoom: .85, width: 390, height: 140 }, false));
});
