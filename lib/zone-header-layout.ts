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
