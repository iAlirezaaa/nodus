import type { Board, GraphNode, GraphZone, Workspace } from './types';

export const MAX_ZONES_PER_BOARD = 200;
export const MAX_ZONE_TITLE_LENGTH = 120;
export const MAX_ZONE_DESCRIPTION_LENGTH = 2000;
export const MAX_ZONE_MEMBERS = 5000;

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const COLORS = new Set(['sage', 'blue', 'amber', 'rose', 'violet', 'gray']);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export type ZoneInput = Omit<GraphZone, 'id'>;
export type ZonePatch = Partial<ZoneInput>;

/** Same validation for client edits and authoritative personal/shared saves. */
export function assertBoardZones(board: Pick<Board, 'id' | 'zones'>, nodes: ReadonlyMap<string, Pick<GraphNode, 'boardId'>>): void {
  if (board.zones === undefined) return;
  if (!Array.isArray(board.zones) || board.zones.length > MAX_ZONES_PER_BOARD) throw new Error(`A board supports up to ${MAX_ZONES_PER_BOARD} zones.`);
  const ids = new Set<string>();
  for (const zone of board.zones) {
    if (!object(zone) || typeof zone.id !== 'string' || !ID.test(zone.id)) throw new Error('A zone needs a valid identifier.');
    if (ids.has(zone.id)) throw new Error('Zone identifiers must be unique within their board.');
    ids.add(zone.id);
    if (typeof zone.title !== 'string' || !zone.title.trim() || zone.title.length > MAX_ZONE_TITLE_LENGTH) throw new Error(`A zone needs a title of up to ${MAX_ZONE_TITLE_LENGTH} characters.`);
    if (typeof zone.description !== 'string' || zone.description.length > MAX_ZONE_DESCRIPTION_LENGTH) throw new Error(`Zone descriptions support up to ${MAX_ZONE_DESCRIPTION_LENGTH} characters.`);
    if (!COLORS.has(zone.color as string)) throw new Error('The zone color is not supported.');
    if (!Array.isArray(zone.nodeIds) || zone.nodeIds.length > MAX_ZONE_MEMBERS) throw new Error(`A zone supports up to ${MAX_ZONE_MEMBERS} members.`);
    const members = new Set<string>();
    for (const id of zone.nodeIds) {
      if (typeof id !== 'string' || !ID.test(id) || nodes.get(id)?.boardId !== board.id) throw new Error('Zone members must be existing nodes on the same board.');
      if (members.has(id)) throw new Error('A node cannot appear twice in the same zone.');
      members.add(id);
    }
  }
}

function replaceZones(document: Workspace, board: Board, zones: GraphZone[]): Workspace {
  const next = { ...board, zones };
  assertBoardZones(next, new Map(document.nodes.map(node => [node.id, node])));
  return { ...document, boards: document.boards.map(item => item.id === board.id ? next : item) };
}

/** A single immutable edit; neither nodes nor edges are rewritten. */
export function createZone(document: Workspace, boardId: string, input: ZoneInput, id: string = globalThis.crypto.randomUUID()): Workspace {
  const board = document.boards.find(item => item.id === boardId);
  if (!board) throw new Error('The board is no longer available.');
  if (!Array.isArray(input.nodeIds) || !input.nodeIds.length) throw new Error('Select at least one node to create a zone.');
  const zone: GraphZone = { id, title: input.title, description: input.description, color: input.color, nodeIds: [...input.nodeIds] };
  return replaceZones(document, board, [...(board.zones ?? []), zone]);
}

/** Empty groups remain editable after their final member is removed. */
export function updateZone(document: Workspace, boardId: string, zoneId: string, patch: ZonePatch): Workspace {
  const board = document.boards.find(item => item.id === boardId);
  const original = board?.zones?.find(zone => zone.id === zoneId);
  if (!board || !original) return document;
  const zone: GraphZone = {
    id: original.id,
    title: patch.title === undefined ? original.title : patch.title,
    description: patch.description === undefined ? original.description : patch.description,
    color: patch.color === undefined ? original.color : patch.color,
    nodeIds: patch.nodeIds === undefined ? original.nodeIds : [...patch.nodeIds],
  };
  const unchanged = zone.title === original.title && zone.description === original.description && zone.color === original.color
    && zone.nodeIds.length === original.nodeIds.length && zone.nodeIds.every((id, index) => id === original.nodeIds[index]);
  if (unchanged) return document;
  return replaceZones(document, board, board.zones!.map(item => item.id === zoneId ? zone : item));
}

/** Removing a visual group never removes its ideas, attachments or connections. */
export function removeZone(document: Workspace, boardId: string, zoneId: string): Workspace {
  const board = document.boards.find(item => item.id === boardId);
  if (!board?.zones?.some(zone => zone.id === zoneId)) return document;
  return { ...document, boards: document.boards.map(item => item.id === boardId ? { ...item, zones: item.zones!.filter(zone => zone.id !== zoneId) } : item) };
}

/** Keep zone metadata, including empty groups; only discard unavailable members. */
export function pruneBoardZoneMembers(board: Board, availableNodeIds: ReadonlySet<string>): Board {
  if (!board.zones?.length) return board;
  let changed = false;
  const zones = board.zones.map(zone => {
    const nodeIds = zone.nodeIds.filter(id => availableNodeIds.has(id));
    if (nodeIds.length === zone.nodeIds.length) return zone;
    changed = true;
    return { ...zone, nodeIds };
  });
  return changed ? { ...board, zones } : board;
}
