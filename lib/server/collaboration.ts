import type { PresencePayload, PresencePeer, RoomMember, RoomPatchPayload, RoomPatchResult, RoomSnapshot, RoomSummary, RoomUnchanged, WorkspaceOperation } from '../collaboration';
import { applyWorkspaceOperations, validateOperations } from '../collaboration';
import type { Workspace } from '../types';
import { ApiError } from './errors';
import { requireIdentity } from './security';
import { assertOwnedAssets, serializeWorkspace, type StoredAsset } from './store';
import { referencedAssets, validateWorkspace } from './validation';

export const MAX_ROOM_PATCH_BYTES = 12 * 1024 * 1024;
export const PRESENCE_TTL_MS = 15_000;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const MAX_MEMBERS = 20;
const colors = ['#82cba1', '#91b9ef', '#e0b875', '#e49aac', '#b6a3eb', '#7ed2d7'];
const permitted = "(owner_user_id = ? OR EXISTS (SELECT 1 FROM room_members WHERE room_id = rooms.id AND email = ? AND role = 'editor'))";
export interface RoomIdentity { userId: string; email: string; name: string; }
interface StoredRoom { id: string; owner_user_id: string; owner_email: string; title: string; document: string; revision: number; updated_at: string; }
interface StoredPresence { session_id: string; user_id: string; name: string; color: string; board_id: string; x: number | null; y: number | null; selected_node_id: string | null; updated_at: number; }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function normalizeMemberEmail(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'invalid_email', 'Enter the collaborator’s sign-in email.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ApiError(400, 'invalid_email', 'Enter a valid sign-in email address.');
  return email;
}

export function requireRoomIdentity(request: Request): RoomIdentity {
  const userId = requireIdentity(request);
  let email: string;
  try { email = normalizeMemberEmail(request.headers.get('oai-authenticated-user-email')); }
  catch { throw new ApiError(401, 'authentication_required', 'Sign in with a verified email to use shared rooms.'); }
  let name = request.headers.get('oai-authenticated-user-full-name') ?? '';
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(name); } catch { name = ''; }
  } else name = '';
  name = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) || email.split('@')[0];
  return { userId, email, name };
}

function summary(room: StoredRoom, identity: RoomIdentity): RoomSummary {
  return { id: room.id, title: room.title, role: room.owner_user_id === identity.userId ? 'owner' : 'editor', updatedAt: room.updated_at };
}
function noRoom(): never { throw new ApiError(404, 'room_not_found', 'This shared room is unavailable or your access has been removed.'); }
async function requireRoom(db: D1Database, identity: RoomIdentity, roomId: string): Promise<StoredRoom> {
  if (!ID.test(roomId)) noRoom();
  const row = await db.prepare(`SELECT id, owner_user_id, owner_email, title, document, revision, updated_at FROM rooms WHERE id = ? AND ${permitted}`)
    .bind(roomId, identity.userId, identity.email).first<StoredRoom>();
  if (!row) noRoom();
  return row;
}
async function members(db: D1Database, roomId: string): Promise<RoomMember[]> {
  const result = await db.prepare("SELECT email, role FROM room_members WHERE room_id = ? ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, email").bind(roomId).all<RoomMember>();
  return result.results;
}
function assetIndexStatement(db: D1Database, roomId: string, operationKey?: string): D1PreparedStatement {
  return db.prepare(`INSERT OR IGNORE INTO room_assets (room_id, asset_id)
    SELECT rooms.id, json_extract(node.value, '$.asset.id') FROM rooms, json_each(rooms.document, '$.nodes') AS node
    WHERE rooms.id = ? ${operationKey ? 'AND rooms.last_operation_key = ?' : ''} AND json_extract(node.value, '$.asset.id') IS NOT NULL`)
    .bind(roomId, ...(operationKey ? [operationKey] : []));
}

export async function listRooms(db: D1Database, identity: RoomIdentity) {
  const result = await db.prepare(`SELECT id, owner_user_id, owner_email, title, updated_at FROM rooms WHERE ${permitted} ORDER BY updated_at DESC, id`)
    .bind(identity.userId, identity.email).all<StoredRoom>();
  return { rooms: result.results.map(room => summary(room, identity)), userId: identity.userId, email: identity.email };
}

export async function createRoom(db: D1Database, identity: RoomIdentity, input: unknown) {
  if (!record(input) || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200) throw new ApiError(400, 'invalid_room', 'Give the shared room a title of up to 200 characters.');
  const document = validateWorkspace(input.document), serialized = serializeWorkspace(document);
  await assertOwnedAssets(db, identity.userId, document);
  const id = crypto.randomUUID(), now = new Date().toISOString(), title = input.title.trim();
  // The graph is a serialized copy. It never points back to the private workspace.
  await db.batch([
    db.prepare('INSERT INTO rooms (id, owner_user_id, owner_email, title, document, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .bind(id, identity.userId, identity.email, title, serialized, now, now),
    db.prepare("INSERT INTO room_members (room_id, email, role, created_at) VALUES (?, ?, 'owner', ?)").bind(id, identity.email, now),
    assetIndexStatement(db, id),
  ]);
  return { room: { id, title, role: 'owner' as const, updatedAt: now } };
}

export async function readRoom(db: D1Database, identity: RoomIdentity, roomId: string, since?: number): Promise<RoomSnapshot | RoomUnchanged> {
  const room = await requireRoom(db, identity, roomId);
  const common = { revision: room.revision, updatedAt: room.updated_at, userId: identity.userId, room: summary(room, identity), members: await members(db, roomId) };
  return since === room.revision ? { unchanged: true, ...common } : { document: JSON.parse(room.document) as Workspace, ...common };
}

export function validateRoomPatch(input: unknown): RoomPatchPayload {
  if (!record(input) || !Number.isSafeInteger(input.revision) || (input.revision as number) < 1 || typeof input.operationId !== 'string' || !ID.test(input.operationId)) throw new ApiError(400, 'invalid_commit', 'A shared commit needs a valid revision and unique operation identifier.');
  let operations: WorkspaceOperation[];
  try { operations = validateOperations(input.operations); }
  catch (error) { throw new ApiError(400, 'invalid_operations', error instanceof Error ? error.message : 'The field operations are invalid.'); }
  return { revision: input.revision as number, operationId: input.operationId, operations };
}

async function requestHash(payload: RoomPatchPayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function assertRoomAssets(db: D1Database, identity: RoomIdentity, current: Workspace, next: Workspace): Promise<void> {
  const references = referencedAssets(next), alreadyShared = new Set(referencedAssets(current).map(asset => asset.id));
  const ids = [...new Set(references.map(asset => asset.id))], available = new Map<string, StoredAsset>();
  if (ids.length) {
    const result = await db.prepare('SELECT id, user_id, storage_key, name, mime, size, created_at FROM assets WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<StoredAsset>();
    for (const asset of result.results) available.set(asset.id, asset);
  }
  for (const reference of references) {
    const asset = available.get(reference.id);
    if (!asset || (asset.user_id !== identity.userId && !alreadyShared.has(asset.id))) throw new ApiError(400, 'unknown_asset', 'A file must already be shared in this room or uploaded by your account.');
    if (asset.name !== reference.name || asset.mime !== reference.mime || asset.size !== reference.size || reference.url !== `/api/assets/${asset.id}`) throw new ApiError(400, 'invalid_asset', 'Attachment metadata does not match the original file.');
  }
}

function result(room: StoredRoom, identity: RoomIdentity, operationId: string): RoomPatchResult {
  return { document: JSON.parse(room.document) as Workspace, revision: room.revision, updatedAt: room.updated_at, userId: identity.userId, operationId };
}
function conflict(room: StoredRoom, identity: RoomIdentity, payload: RoomPatchPayload, conflicts: unknown, message = 'Another person changed the same content. Your local draft is preserved; compare it with the current room before trying again.'): never {
  throw new ApiError(409, 'collaboration_conflict', message, { ...result(room, identity, payload.operationId), conflicts });
}

export async function patchRoom(db: D1Database, identity: RoomIdentity, roomId: string, input: unknown): Promise<RoomPatchResult> {
  const payload = validateRoomPatch(input), hash = await requestHash(payload);
  for (let attempt = 0; attempt < 5; attempt++) {
    const room = await requireRoom(db, identity, roomId);
    const applied = await db.prepare('SELECT request_hash FROM room_operations WHERE room_id = ? AND user_id = ? AND operation_id = ?').bind(roomId, identity.userId, payload.operationId).first<{ request_hash: string }>();
    if (applied) {
      // A concurrent retry may have read the room immediately before its first
      // request committed. The receipt proves acknowledgement only after a fresh
      // authorized read; returning that earlier row could omit the accepted edit.
      const acknowledged = await requireRoom(db, identity, roomId);
      if (applied.request_hash !== hash) throw new ApiError(409, 'operation_id_reused', 'This operation identifier was already used for different content.', { ...result(acknowledged, identity, payload.operationId), conflicts: [] });
      return result(acknowledged, identity, payload.operationId);
    }
    if (payload.revision > room.revision) throw new ApiError(400, 'future_revision', 'This commit refers to a revision that does not exist. Reload the room.');
    const current = JSON.parse(room.document) as Workspace;
    const merged = applyWorkspaceOperations(current, payload.operations);
    if (merged.conflicts.length) conflict(room, identity, payload, merged.conflicts);
    try { validateWorkspace(merged.document); }
    catch (error) {
      if (payload.revision === room.revision) throw error;
      conflict(room, identity, payload, [{ index: -1, target: 'workspace', path: [], reason: error instanceof Error ? error.message : 'The merged graph has invalid references.' }], 'The room structure changed while you were editing. Your draft was kept; applying this change would remove or break another person’s work.');
    }
    await assertRoomAssets(db, identity, current, merged.document);
    const serialized = serializeWorkspace(merged.document), now = new Date().toISOString(), key = crypto.randomUUID();
    // D1 batches are transactions. A per-attempt marker makes the following
    // idempotency log and asset-index changes conditional on this exact CAS.
    const committed = await db.batch([
      db.prepare(`UPDATE rooms SET document = ?, revision = revision + 1, updated_at = ?, last_operation_key = ?
        WHERE id = ? AND revision = ? AND ${permitted}
        AND NOT EXISTS (SELECT 1 FROM room_operations WHERE room_id = rooms.id AND user_id = ? AND operation_id = ?)`)
        .bind(serialized, now, key, roomId, room.revision, identity.userId, identity.email, identity.userId, payload.operationId),
      db.prepare(`INSERT INTO room_operations (room_id, user_id, operation_id, request_hash, revision, created_at)
        SELECT id, ?, ?, ?, revision, ? FROM rooms WHERE id = ? AND last_operation_key = ?`)
        .bind(identity.userId, payload.operationId, hash, now, roomId, key),
      db.prepare('DELETE FROM room_assets WHERE room_id = ? AND EXISTS (SELECT 1 FROM rooms WHERE id = ? AND last_operation_key = ?)').bind(roomId, roomId, key),
      assetIndexStatement(db, roomId, key),
    ]);
    if (committed[0].meta.changes) return result(await requireRoom(db, identity, roomId), identity, payload.operationId);
  }
  const latest = await requireRoom(db, identity, roomId);
  conflict(latest, identity, payload, [], 'The room is receiving changes quickly. Your draft is preserved; retry after receiving the latest revision.');
}

export async function addRoomMember(db: D1Database, identity: RoomIdentity, roomId: string, input: unknown) {
  const room = await requireRoom(db, identity, roomId);
  if (room.owner_user_id !== identity.userId) throw new ApiError(403, 'owner_required', 'Only the room owner can change its members.');
  const email = normalizeMemberEmail(record(input) ? input.email : undefined);
  const existing = await members(db, roomId);
  if (existing.some(member => member.email === email)) return { members: existing };
  const added = await db.prepare(`INSERT INTO room_members (room_id, email, role, created_at)
    SELECT id, ?, 'editor', ? FROM rooms WHERE id = ? AND owner_user_id = ?
    AND (SELECT COUNT(*) FROM room_members WHERE room_id = rooms.id) < ? ON CONFLICT(room_id, email) DO NOTHING`)
    .bind(email, new Date().toISOString(), roomId, identity.userId, MAX_MEMBERS).run();
  if (!added.meta.changes && !(await members(db, roomId)).some(member => member.email === email)) throw new ApiError(400, 'member_limit', `A room supports up to ${MAX_MEMBERS} members.`);
  return { members: await members(db, roomId) };
}

export async function removeRoomMember(db: D1Database, identity: RoomIdentity, roomId: string, input: unknown) {
  const room = await requireRoom(db, identity, roomId);
  if (room.owner_user_id !== identity.userId) throw new ApiError(403, 'owner_required', 'Only the room owner can change its members.');
  const email = normalizeMemberEmail(record(input) ? input.email : undefined);
  if (email === room.owner_email) throw new ApiError(400, 'owner_membership', 'The owner cannot be removed from their room.');
  await db.batch([
    db.prepare("DELETE FROM room_members WHERE room_id = ? AND email = ? AND role = 'editor' AND EXISTS (SELECT 1 FROM rooms WHERE id = ? AND owner_user_id = ?)").bind(roomId, email, roomId, identity.userId),
    db.prepare('DELETE FROM room_presence WHERE room_id = ? AND email = ? AND NOT EXISTS (SELECT 1 FROM room_members WHERE room_id = ? AND email = ?)').bind(roomId, email, roomId, email),
  ]);
  return { members: await members(db, roomId) };
}

function colorFor(userId: string) { let hash = 0; for (const char of userId) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0; return colors[hash % colors.length]; }
function presenceInput(input: unknown): PresencePayload {
  if (!record(input) || typeof input.sessionId !== 'string' || !ID.test(input.sessionId) || typeof input.boardId !== 'string' || !ID.test(input.boardId)
    || (input.selectedNodeId !== null && (typeof input.selectedNodeId !== 'string' || !ID.test(input.selectedNodeId)))) throw new ApiError(400, 'invalid_presence', 'Presence needs a valid session, board, and selection.');
  const coordinate = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e7;
  if (!((input.x === null && input.y === null) || (coordinate(input.x) && coordinate(input.y)))) throw new ApiError(400, 'invalid_presence', 'Cursor coordinates must both be finite and bounded, or both null.');
  return { sessionId: input.sessionId, boardId: input.boardId, x: input.x as number | null, y: input.y as number | null, selectedNodeId: input.selectedNodeId as string | null };
}
async function activePresence(db: D1Database, identity: RoomIdentity, roomId: string, now: number): Promise<PresencePeer[]> {
  const rows = await db.prepare(`SELECT p.session_id, p.user_id, p.name, p.color, p.board_id, p.x, p.y, p.selected_node_id, p.updated_at
    FROM room_presence p JOIN rooms r ON r.id = p.room_id WHERE p.room_id = ? AND p.updated_at > ?
    AND (r.owner_user_id = ? OR EXISTS (SELECT 1 FROM room_members m WHERE m.room_id = r.id AND m.email = ? AND m.role = 'editor'))
    AND (r.owner_user_id = p.user_id OR EXISTS (SELECT 1 FROM room_members m WHERE m.room_id = p.room_id AND m.email = p.email AND m.role = 'editor'))
    ORDER BY p.updated_at DESC, p.session_id LIMIT 160`).bind(roomId, now - PRESENCE_TTL_MS, identity.userId, identity.email).all<StoredPresence>();
  return rows.results.map(peer => ({ sessionId: peer.session_id, userId: peer.user_id, name: peer.name, color: peer.color, boardId: peer.board_id, x: peer.x, y: peer.y, selectedNodeId: peer.selected_node_id, updatedAt: new Date(peer.updated_at).toISOString() }));
}

export async function getPresence(db: D1Database, identity: RoomIdentity, roomId: string, now = Date.now()) {
  await requireRoom(db, identity, roomId);
  return { peers: await activePresence(db, identity, roomId, now) };
}
export async function putPresence(db: D1Database, identity: RoomIdentity, roomId: string, input: unknown, now = Date.now()) {
  const room = await requireRoom(db, identity, roomId), presence = presenceInput(input), document = JSON.parse(room.document) as Workspace;
  if (!document.boards.some(board => board.id === presence.boardId)) throw new ApiError(400, 'invalid_presence', 'That board is no longer in this room.');
  const selected = presence.selectedNodeId && document.nodes.some(node => node.id === presence.selectedNodeId && node.boardId === presence.boardId) ? presence.selectedNodeId : null;
  const updates = await db.batch([
    db.prepare('DELETE FROM room_presence WHERE room_id = ? AND updated_at <= ?').bind(roomId, now - PRESENCE_TTL_MS),
    db.prepare(`INSERT INTO room_presence (room_id, user_id, session_id, email, name, color, board_id, x, y, selected_node_id, updated_at)
      SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM rooms WHERE id = ? AND ${permitted}
      AND ((SELECT COUNT(*) FROM room_presence WHERE room_id = rooms.id AND user_id = ?) < 8
        OR EXISTS (SELECT 1 FROM room_presence WHERE room_id = rooms.id AND user_id = ? AND session_id = ?))
      ON CONFLICT(room_id, user_id, session_id) DO UPDATE SET email = excluded.email, name = excluded.name, color = excluded.color,
        board_id = excluded.board_id, x = excluded.x, y = excluded.y, selected_node_id = excluded.selected_node_id, updated_at = excluded.updated_at`)
      .bind(identity.userId, presence.sessionId, identity.email, identity.name, colorFor(identity.userId), presence.boardId, presence.x, presence.y, selected, now,
        roomId, identity.userId, identity.email, identity.userId, identity.userId, presence.sessionId),
  ]);
  if (!updates[1].meta.changes) { await requireRoom(db, identity, roomId); throw new ApiError(429, 'presence_limit', 'Too many active sessions for this room. Close another tab or wait a moment.'); }
  return { peers: await activePresence(db, identity, roomId, now) };
}
