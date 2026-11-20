import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutZoneOverviewBadges, type ZoneOverviewBadge, type ZoneOverviewProjection } from '../lib/zone-overview.ts';

const zone = (id: string, x: number, y: number, members: string[] = ['story']): ZoneOverviewProjection => ({
  zone: { id, title: 'زون ' + id, description: 'توضیح فارسی با نیم‌فاصله', color: 'violet', nodeIds: members },
  box: { x, y, width: 360, height: 310 },
});
const screen = { width: 390, height: 844, x: 24, y: 100, zoom: .35 };
const overlaps = (a: ZoneOverviewBadge, b: ZoneOverviewBadge) => a.left < b.left + b.width + 8
  && a.left + a.width + 8 > b.left && a.top < b.top + b.height + 8 && a.top + a.height + 8 > b.top;

test('nearly identical zones yield distinct bounded 44px labels on narrow screens', () => {
  const source = [zone('film', 40, 120), zone('series', 44, 122), zone('research', 42, 128)];
  const original = structuredClone(source);
  const badges = layoutZoneOverviewBadges(source, screen);
  assert.equal(badges.length, 3);
  for (const b of badges) {
    assert.ok(b.left >= 12 && b.left + b.width <= screen.width - 12);
    assert.ok(b.top >= 144 && b.top + b.height <= screen.height - 100);
    assert.equal(b.height, 44);
  }
  for (let i = 0; i < badges.length; i++) for (let j = i + 1; j < badges.length; j++) assert.ok(!overlaps(badges[i], badges[j]));
  assert.deepEqual(source, original);
  assert.deepEqual(layoutZoneOverviewBadges(source, screen), badges);
});
test('offscreen zones are culled and a shared node keeps its original membership count', () => {
  const zones = [zone('film', 0, 100, ['story', 'film']), zone('series', 80, 120, ['story', 'series']), zone('far', 99999, 99999)];
  const badges = layoutZoneOverviewBadges(zones, { ...screen, width: 1280 });
  assert.deepEqual(badges.map(b=>b.id).sort(), ['film', 'series']);
  assert.deepEqual(badges.map(b=>b.count), [2, 2]);
  assert.ok(badges.every(b=>b.description.includes('نیم‌فاصله')));
});
test('invalid, zero and space-constrained viewports return no bad geometry', () => {
  assert.deepEqual(layoutZoneOverviewBadges([zone('x', 0, 0)], { ...screen, zoom: 0 }), []);
  assert.deepEqual(layoutZoneOverviewBadges([zone('x', 0, 0)], { ...screen, x: Number.NaN }), []);
  assert.deepEqual(layoutZoneOverviewBadges([zone('x', 0, 0)], { ...screen, width: 120 }), []);
  assert.deepEqual(layoutZoneOverviewBadges([zone('x', 0, 0)], { ...screen, height: 230 }), []);
});
test('desktop badges avoid header and dock without changing the underlying document', () => {
  const input = [zone('a', 0, 0), zone('b', 3, 3)], original = JSON.stringify(input);
  const badges = layoutZoneOverviewBadges(input, { ...screen, width: 1280, height: 720, x: 500 });
  assert.equal(badges.length, 2);
  assert.ok(badges.every(b => b.top >= 106 && b.top + b.height <= 720 - 74));
  assert.equal(JSON.stringify(input), original);
});
test('dense atlas has finite, unique, non-overlapping labels', () => {
  const zones = Array.from({ length: 200 }, (_, i) => zone('zone-'+i, 10+i*.1, 40+i*.1));
  const badges = layoutZoneOverviewBadges(zones, { ...screen, width: 1280, height: 1200, x: 400 });
  assert.ok(badges.length > 0 && badges.length <= 48);
  assert.equal(new Set(badges.map(b=>b.id)).size, badges.length);
  for (let i = 0; i < badges.length; i++) for (let j = i + 1; j < badges.length; j++) assert.ok(!overlaps(badges[i], badges[j]));
});
