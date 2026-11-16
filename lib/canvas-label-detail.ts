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
