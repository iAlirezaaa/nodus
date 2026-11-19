/** Local-only viewport preferences must never use bare board IDs across identities. */
export function canvasViewportStorageKey(scope?: string): string | null {
  // The caller supplies userId:roomId-or-personal:boardId. No authenticated
  // identity means no durable local read/write, including legacy board-only keys.
  if (!scope?.trim()) return null;
  return `nodus:view:v2:${encodeURIComponent(scope)}`;
}
