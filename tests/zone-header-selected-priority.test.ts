import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneOverviewHeaderPlacements } from '../lib/zone-header-layout.ts';

const viewport = { x: 0, y: 0, zoom: .85, width: 390, height: 844 };
const box = { x: 30, y: 760 / .85, width: 310, height: 280 };
const zones = ['a', 'b', 'c', 'd'].map(id => ({ id, bounds: box }));

test('selected Zone edit heading stays available even when saturated labels would omit it', () => {
  const previous = zoneOverviewHeaderPlacements(zones, viewport, false);
  assert.equal(previous.has('d'), false, 'baseline geometric order omits last heading');
  const chosen = zoneOverviewHeaderPlacements(zones, viewport, false, new Set(['d']));
  assert.equal(chosen.has('d'), true, 'selection makes last Zone directly editable');
  assert.equal(chosen.size, previous.size, 'does not add overlap or erase Zone data');
  assert.deepEqual(zones.map(item => item.id), ['a', 'b', 'c', 'd']);
});

test('prioritized placement remains separated, screen-safe and deterministic in FA/EN mobile modes', () => {
  for (const rtl of [true, false]) for (const zoom of [.2, .65, .85, .999]) {
    const vp = { ...viewport, zoom };
    const base = zones.map(item => ({ ...item, bounds: { ...item.bounds, y: 760 / zoom } }));
    const priorities = new Set(['d']);
    const first = zoneOverviewHeaderPlacements(base, vp, rtl, priorities);
    const reversed = zoneOverviewHeaderPlacements([...base].reverse(), vp, rtl, priorities);
    assert.deepEqual([...first.entries()].sort(), [...reversed.entries()].sort(), `stable at ${zoom}, rtl=${rtl}`);
    assert.ok(first.has('d'));
    const height = zoom < .65 ? 72 : 116;
    const placed = [...first.entries()].map(([id, p]) => ({ id,
      left: (base[0].bounds.x + p.left) * zoom + vp.x,
      top: (base[0].bounds.y + p.top) * zoom + vp.y,
      right: (base[0].bounds.x + p.left) * zoom + vp.x + p.width,
      bottom: (base[0].bounds.y + p.top) * zoom + vp.y + height,
      target: 44 * p.scale * zoom,
    }));
    for (const a of placed) {
      assert.ok(a.left >= 12 - 1e-8 && a.right <= 378 + 1e-8);
      assert.ok(a.top >= 12 - 1e-8 && a.bottom <= 832 + 1e-8);
      assert.ok(Math.abs(a.target - 44) < 1e-8);
    }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      assert.ok(a.right + 7.99 <= b.left || b.right + 7.99 <= a.left ||
        a.bottom + 7.99 <= b.top || b.bottom + 7.99 <= a.top);
    }
  }
});

test('omitting selection remains backward-compatible, even for nonmatching priority IDs', () => {
  const plain = zoneOverviewHeaderPlacements(zones, viewport, false);
  assert.deepEqual(zoneOverviewHeaderPlacements(zones, viewport, false, new Set()), plain);
  assert.deepEqual(zoneOverviewHeaderPlacements(zones, viewport, false, new Set(['absent'])), plain);
  const before = structuredClone({ zones, viewport });
  zoneOverviewHeaderPlacements(zones, viewport, true, new Set(['d']));
  assert.deepEqual({ zones, viewport }, before);
});

test('full zoom remains unchanged and only visible selected zones can receive headings', () => {
  assert.equal(zoneOverviewHeaderPlacements(zones, { ...viewport, zoom: 1 }, false, new Set(['d'])).size, 0);
  const offscreen = { id: 'offscreen', bounds: { x: 50000, y: 10000, width: 200, height: 200 } };
  const selected = zoneOverviewHeaderPlacements([...zones, offscreen], viewport, true, new Set(['offscreen', 'd']));
  assert.equal(selected.has('offscreen'), false);
  assert.ok(selected.has('d'));
});
