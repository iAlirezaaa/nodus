import type { GraphNode, GraphZone } from './types';

export function nodeUsesNeuron(node: Pick<GraphNode, 'presentation'>, canvasIsNeural: boolean): boolean {
  return node.presentation ? node.presentation === 'neuron' : canvasIsNeural;
}

/** View geometry only: changing display mode or membership never moves stored nodes. */
export function zoneBounds(zone: Pick<GraphZone, 'nodeIds'>, projections: ReadonlyMap<string, Pick<GraphNode, 'x' | 'y' | 'width' | 'height'>>) {
  const members = zone.nodeIds.flatMap(id => { const node = projections.get(id); return node ? [node] : []; });
  if (!members.length) return null;
  const left = Math.min(...members.map(node => node.x));
  const top = Math.min(...members.map(node => node.y));
  const right = Math.max(...members.map(node => node.x + node.width));
  const bottom = Math.max(...members.map(node => node.y + node.height));
  return { x: left - 32, y: top - 126, width: Math.max(290, right - left + 64), height: bottom - top + 158 };
}
