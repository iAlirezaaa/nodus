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
