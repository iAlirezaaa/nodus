import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneOverviewHeaderPlacements, zoneOverviewHeaderPlacement, zoneHeaderDetail } from '../lib/zone-header-layout.ts';

const viewport = { x: 0, y: 0, zoom: .85, width: 390, height: 844 };
const group = { x: 30, y: 400 / .85, width: 280, height: 300 };
const box = (id: string, bounds = group) => ({ id, bounds });
const rect = (id: string, groups: readonly ReturnType<typeof box>[], vp = viewport, rtl = false) => {
  const placement = zoneOverviewHeaderPlacements(groups, vp, rtl).get(id);
  if (!placement) return null;
  const bounds = groups.find(g => g.id === id)!.bounds;
  const left = (bounds.x + placement.left) * vp.zoom + vp.x;
  const top = (bounds.y + placement.top) * vp.zoom + vp.y;
  return { left, right: left + placement.width, top, bottom: top + (zoneHeaderDetail(vp.zoom) === 'compact' ? 116 : 72), height: 44 * placement.scale * vp.zoom };
};
const separated = (a: NonNullable<ReturnType<typeof rect>>, b: NonNullable<ReturnType<typeof rect>>) =>
  a.right + 7.99 <= b.left || b.right + 7.99 <= a.left || a.bottom + 7.99 <= b.top || b.bottom + 7.99 <= a.top;

test('two overlapping Zone labels keep distinct 44px click targets at medium zoom', () => {
  const groups = [box('a'), box('b')];
  const a = rect('a', groups)!;
  const b = rect('b', groups)!;
  assert.ok(a && b);
  assert.ok(separated(a, b), 'clickable headings must not overlap');
  assert.ok(a.top >= 12 && b.top >= 12 && a.bottom <= 832 && b.bottom <= 832);
  assert.ok(Math.abs(a.height - 44) < 1e-8 && Math.abs(b.height - 44) < 1e-8);
});

test('header order is deterministic with same geometry even when zone input is reversed', () => {
  const one = [box('z'), box('a')];
  const two = [...one].reverse();
  for (const rtl of [true, false]) {
    for (const zoom of [.2, .65, .85, .999]) {
      const vp = { ...viewport, zoom };
      const actual = zoneOverviewHeaderPlacements(one, vp, rtl);
      const reversed = zoneOverviewHeaderPlacements(two, vp, rtl);
      assert.deepEqual([...actual.entries()].sort(), [...reversed.entries()].sort());
    }
  }
});

test('unrelated separated zones preserve original placement and document inputs', () => {
  const groups = [box('upper', { ...group, y: 10 }), box('lower', { ...group, y: 650 })];
  const before = structuredClone({ groups, viewport });
  const computed = zoneOverviewHeaderPlacements(groups, viewport, true);
  for (const { id, bounds } of groups) assert.deepEqual(computed.get(id), zoneOverviewHeaderPlacement(bounds, viewport, true));
  assert.deepEqual({ groups, viewport }, before);
});

test('saturated Zone stack omits a blocked label instead of overlapping or hiding its underlying zone data', () => {
  const vp = { ...viewport, x: 0, y: 0 };
  const nearBottom = { ...group, y: 760 / vp.zoom };
  const groups = ['a', 'b', 'c', 'd'].map(id => box(id, nearBottom));
  const placements = zoneOverviewHeaderPlacements(groups, vp, false);
  assert.ok(placements.size >= 1 && placements.size < 4);
  for (const id of placements.keys()) {
    const r = rect(id, groups, vp)!;
    assert.ok(r.top >= 12 && r.bottom <= 832);
  }
  const rectangles = [...placements.keys()].map(id => rect(id, groups, vp)!);
  for (let i = 0; i < rectangles.length; i++) for (let j = i+1; j < rectangles.length; j++) assert.ok(separated(rectangles[i], rectangles[j]));
  assert.deepEqual(groups.map(g=>g.id),['a','b','c','d']);
});

test('fully invisible or invalid groups do not gain ghost headers and full zoom is unchanged', () => {
  const groups = [box('visible'), box('far', { ...group, x: 200000 }), box('bad', { ...group, width: NaN })];
  const computed = zoneOverviewHeaderPlacements(groups, viewport, false);
  assert.deepEqual([...computed.keys()], ['visible']);
  assert.equal(zoneOverviewHeaderPlacements(groups, {...viewport, zoom:1}, false).size,0);
  assert.equal(zoneOverviewHeaderPlacements(groups, {...viewport, zoom:0}, false).size,0);
});
