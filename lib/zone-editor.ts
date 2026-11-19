import type { GraphZone, Workspace } from './types';
import { createZone, removeZone, updateZone, type ZoneInput } from './zones';

export class ZoneEditConflict extends Error {}

function assertCurrent(document: Workspace, boardId: string, zoneId: string, original?: GraphZone | null) {
  const current = document.boards.find(board => board.id === boardId)?.zones?.find(zone => zone.id === zoneId);
  if (!current || !original || JSON.stringify(current) !== JSON.stringify(original)) throw new ZoneEditConflict('The zone changed while this editor was open.');
}

/** Check the editor snapshot inside the workspace transaction, not just at render time. */
export function saveZoneDraft(document: Workspace, boardId: string, zoneId: string | null, input: ZoneInput, original?: GraphZone | null): Workspace {
  if (!zoneId) return createZone(document, boardId, input);
  assertCurrent(document, boardId, zoneId, original);
  return updateZone(document, boardId, zoneId, input);
}

export function deleteZoneDraft(document: Workspace, boardId: string, zoneId: string, original?: GraphZone): Workspace {
  assertCurrent(document, boardId, zoneId, original);
  return removeZone(document, boardId, zoneId);
}
