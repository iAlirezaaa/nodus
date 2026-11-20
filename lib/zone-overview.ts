import type { GraphZone } from './types';

export interface ZoneOverviewProjection {
  zone: Pick<GraphZone, 'id' | 'title' | 'description' | 'color' | 'nodeIds'>;
  box: { x: number; y: number; width: number; height: number };
}
export interface ZoneOverviewViewport { width: number; height: number; x: number; y: number; zoom: number }
export interface ZoneOverviewBadge {
  id: string; title: string; description: string; color: GraphZone['color']; count: number;
  left: number; top: number; width: number; height: number;
}

const MAX_BADGES = 48;
const GAP = 8;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const overlap = (a: ZoneOverviewBadge, b: ZoneOverviewBadge) =>
  a.left < b.left + b.width + GAP && a.left + a.width + GAP > b.left
  && a.top < b.top + b.height + GAP && a.top + a.height + GAP > b.top;

/** Pure, screen-space layout for far-zoom Zone headers; never changes saved graph data. */
export function layoutZoneOverviewBadges(
  projections: readonly ZoneOverviewProjection[], viewport: ZoneOverviewViewport,
): ZoneOverviewBadge[] {
  const { width, height, x, y, zoom } = viewport;
  if (![width, height, x, y, zoom].every(Number.isFinite) || width < 160 || height < 235 || zoom <= 0) return [];
  const mobile = width <= 650;
  const chipWidth = Math.min(mobile ? 178 : 216, width - 24);
  const chipHeight = 44, minTop = mobile ? 144 : 106, maxTop = height - (mobile ? 100 : 74) - chipHeight;
  if (maxTop < minTop) return [];
  const candidates = projections.flatMap(({ zone, box }) => {
    if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) return [];
    const screenX = box.x * zoom + x, screenY = box.y * zoom + y;
    if (screenX + box.width * zoom < -32 || screenX > width + 32
      || screenY + box.height * zoom < -32 || screenY > height + 32) return [];
    return [{ zone, screenX, screenY }];
  }).sort((a, b) => a.screenY - b.screenY || a.screenX - b.screenX || a.zone.id.localeCompare(b.zone.id));
  const result: ZoneOverviewBadge[] = [], step = chipHeight + GAP;
  const steps = Math.max(1, Math.ceil((maxTop - minTop) / step) + 1);
  for (const { zone, screenX, screenY } of candidates) {
    if (result.length >= MAX_BADGES) break;
    const anchorLeft = clamp(screenX + 12, 12, width - chipWidth - 12);
    const anchorTop = clamp(screenY + 12, minTop, maxTop);
    let chosen: ZoneOverviewBadge | null = null;
    for (const shiftX of [0, -(chipWidth + GAP), chipWidth + GAP]) {
      if (chosen) break;
      const left = clamp(anchorLeft + shiftX, 12, width - chipWidth - 12);
      for (let i = 0; i < steps * 2 + 1; i++) {
        const slot = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2);
        const top = anchorTop + slot * step;
        if (top < minTop || top > maxTop) continue;
        const badge: ZoneOverviewBadge = {
          id: zone.id, title: zone.title, description: zone.description ?? '', color: zone.color,
          count: zone.nodeIds.length, left, top, width: chipWidth, height: chipHeight,
        };
        if (!result.some(existing => overlap(badge, existing))) { chosen = badge; break; }
      }
    }
    if (chosen) result.push(chosen);
  }
  return result;
}
