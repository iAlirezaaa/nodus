/** Pure visual offset; never changes node coordinates or graph data. */
export function clampReadingCaptionShift(
  screenCenter: number, viewportWidth: number, zoom: number, labelScale: number, maxLabelWidth: number,
): number {
  if (![screenCenter, viewportWidth, zoom, labelScale, maxLabelWidth].every(Number.isFinite) ||
      viewportWidth <= 24 || zoom <= 0 || labelScale <= 0 || maxLabelWidth <= 0 ||
      screenCenter < 0 || screenCenter > viewportWidth) return 0;
  // CSS bounds the mobile reading caption to maxLabelWidth. At this scale
  // there is at least a 12px viewport gutter on each side.
  const halfWidth = Math.min(viewportWidth - 24, maxLabelWidth * zoom * labelScale) / 2;
  const left = 12 + halfWidth;
  const right = viewportWidth - 12 - halfWidth;
  const target = Math.max(left, Math.min(right, screenCenter));
  return (target - screenCenter) / zoom;
}

/**
 * Visual-only placement for labels near the bottom of a narrow reading canvas.
 * Inputs are screen pixels; never change persisted graph geometry.
 * Keep the default below-core placement unless the full caption fits above.
 */
export function shouldPlaceReadingCaptionAbove(
  screenCenterY: number, viewportHeight: number, coreRadiusPx: number, captionHeightPx: number,
): boolean {
  if (![screenCenterY, viewportHeight, coreRadiusPx, captionHeightPx].every(Number.isFinite) ||
      viewportHeight <= 24 || coreRadiusPx < 0 || captionHeightPx <= 0 ||
      screenCenterY < 0 || screenCenterY > viewportHeight) return false;
  const gutter = 12;
  const availableBelow = viewportHeight - screenCenterY - coreRadiusPx - gutter;
  const availableAbove = screenCenterY - coreRadiusPx - gutter;
  return availableBelow < captionHeightPx && availableAbove >= captionHeightPx;
}
