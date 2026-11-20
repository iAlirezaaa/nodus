/** Pure screen-space Zone heading layout; no graph or viewport persistence. */
export interface ZoneHeaderBounds { x: number; y: number; width: number; height: number }
export interface ZoneHeaderViewport { x: number; y: number; zoom: number; width: number; height: number }
export interface ZoneHeaderPlacement { left: number; top: number; width: number; scale: number }

/** Keep description at medium zoom, but enlarge the edit target until 100% zoom. */
export type ZoneHeaderDetail = 'overview' | 'compact' | 'full';
export function zoneHeaderDetail(zoom: number): ZoneHeaderDetail {
  if (!Number.isFinite(zoom) || zoom <= 0) return 'full';
  return zoom < .65 ? 'overview' : zoom < 1 ? 'compact' : 'full';
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function zoneOverviewHeaderPlacement(
  bounds: ZoneHeaderBounds,
  viewport: ZoneHeaderViewport,
  rtl: boolean,
): ZoneHeaderPlacement | null {
  const values = [bounds.x, bounds.y, bounds.width, bounds.height, viewport.x, viewport.y,
    viewport.width, viewport.height, viewport.zoom];
  if (!values.every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0 ||
      viewport.width < 144 || viewport.height < 120 || viewport.zoom <= 0) return null;

  const { zoom } = viewport;
  const left = bounds.x * zoom + viewport.x;
  const right = (bounds.x + bounds.width) * zoom + viewport.x;
  const top = bounds.y * zoom + viewport.y;
  const bottom = (bounds.y + bounds.height) * zoom + viewport.y;
  if (![left, right, top, bottom].every(Number.isFinite) ||
      right <= 0 || left >= viewport.width || bottom <= 0 || top >= viewport.height) return null;

  // Keep titles readable even when the group outline is narrower than a title.
  const width = Math.min(viewport.width - 24, 288, Math.max(168, (bounds.width - 36) * zoom));
  const preferredX = rtl ? right - 18 * zoom - width : left + 18 * zoom;
  const screenX = clamp(preferredX, 12, viewport.width - width - 12);
  // At compact zoom the visible two-line description adds ~45px to the title.
  // Reserve 116px of header plus 12px bottom clearance; overview hides it.
  const bottomReserve = zoneHeaderDetail(zoom) === 'compact' ? 128 : 88;
  if (viewport.height < bottomReserve + 12) return null;
  const screenY = clamp(top + 12 * zoom, 12, viewport.height - bottomReserve);
  return {
    left: (screenX - left) / zoom,
    top: (screenY - top) / zoom,
    width,
    scale: 1 / zoom,
  };
}

/**
 * Arrange independent Zone headings without covering another Zone's edit target.
 * Dense clusters may omit a heading; the Zone remains available in the Zones panel.
 * This returns presentation-only offsets, never changes graph or viewport data.
 */
export function zoneOverviewHeaderPlacements(
  zones: readonly { id: string; bounds: ZoneHeaderBounds }[],
  viewport: ZoneHeaderViewport,
  rtl: boolean,
  priorityZoneIds?: ReadonlySet<string>,
): Map<string, ZoneHeaderPlacement> {
  const result = new Map<string, ZoneHeaderPlacement>();
  const detail = zoneHeaderDetail(viewport.zoom);
  if (detail === 'full') return result;
  const height = detail === 'compact' ? 116 : 72; // CSS two-line bounds, with a small font-metric allowance.
  const gutter = 8;
  const maxY = viewport.height - height - 12;
  const proposals = zones.flatMap(({ id, bounds }) => {
    const placement = zoneOverviewHeaderPlacement(bounds, viewport, rtl);
    if (!placement) return [];
    return [{ id, bounds, placement,
      left: (bounds.x + placement.left) * viewport.zoom + viewport.x,
      top: (bounds.y + placement.top) * viewport.zoom + viewport.y }];
  }).sort((a, b) =>
    // Selected ideas should keep their Zone's direct edit affordance at dense zoom.
    Number(Boolean(priorityZoneIds?.has(b.id))) - Number(Boolean(priorityZoneIds?.has(a.id))) ||
    a.top - b.top || (rtl ? b.left - a.left : a.left - b.left) || a.id.localeCompare(b.id));
  const occupied: { left: number; top: number; right: number; bottom: number }[] = [];
  for (const item of proposals) {
    const right = item.left + item.placement.width;
    const overlappingX = occupied.filter(rect => item.left < rect.right + gutter && right + gutter > rect.left);
    const options = [item.top];
    for (const rect of overlappingX) options.push(rect.bottom + gutter, rect.top - height - gutter);
    options.sort((a, b) => Math.abs(a - item.top) - Math.abs(b - item.top) || a - b);
    const y = options.find(candidate => candidate >= 12 && candidate <= maxY + 1e-8 &&
      Math.abs(candidate - item.top) <= height + 16 && overlappingX.every(rect =>
        candidate >= rect.bottom + gutter || candidate + height + gutter <= rect.top));
    if (y === undefined) continue;
    occupied.push({ left: item.left, top: y, right, bottom: y + height });
    result.set(item.id, y === item.top ? item.placement : { ...item.placement, top: (y - (item.bounds.y * viewport.zoom + viewport.y)) / viewport.zoom });
  }
  return result;
}
