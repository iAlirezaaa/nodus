/**
 * Pure view-only label policy. No graph edits, persistence or layout changes.
 *
 * A distant view of a large board is a map of connections, not hundreds of
 * illegible captions. Selected/focused/hovered titles remain readable in CSS.
 */
export type CanvasLabelDetail = 'full' | 'compact' | 'overview';

export function canvasLabelDetail(nodeCount: number, zoom: number): CanvasLabelDetail {
  if (nodeCount > 24 && zoom < 0.45) return 'overview';
  if (zoom < 0.7 || (nodeCount >= 100 && zoom < 0.9)) return 'compact';
  return 'full';
}

/** Horizontal screen-edge protection for a focused neural caption.
 * Return a world-space offset; the persisted node position is untouched.
 * At zoom > 1, a caption grows in screen pixels, so its entire predicted
 * maximum width must remain inside the available viewport.
 */
export function neuronCaptionShift(centerX: number, viewX: number, zoom: number, canvasWidth: number): number {
  if (!Number.isFinite(centerX) || !Number.isFinite(viewX) || !Number.isFinite(zoom) || !Number.isFinite(canvasWidth) || zoom <= 0 || canvasWidth <= 32) return 0;
  const halfLabel = Math.min(250 * Math.max(1, zoom), canvasWidth - 32) / 2;
  const screenCenter = centerX * zoom + viewX;
  const clamped = Math.min(canvasWidth - 16 - halfLabel, Math.max(16 + halfLabel, screenCenter));
  return (clamped - screenCenter) / zoom;
}
