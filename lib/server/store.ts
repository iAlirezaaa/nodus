import type { AssetMeta, Workspace } from '../types';
import { ApiError } from './errors';
import { referencedAssets } from './validation';

export interface StoredAsset { id: string; user_id: string; storage_key: string; name: string; mime: string; size: number; created_at: string; }
interface StoredWorkspace { document: string; revision: number; updated_at: string; }

// D1 limits a complete row to 2,000,000 bytes. Leave room for identifiers,
// titles, revision metadata, and SQLite record overhead without rejecting reads.
export const MAX_PERSISTED_DOCUMENT_BYTES = 1_900_000;
export function serializeWorkspace(document: Workspace): string {
  const serialized = JSON.stringify(document);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PERSISTED_DOCUMENT_BYTES) {
    throw new ApiError(413, 'workspace_too_large', 'The graph exceeds the 1.9 MB storage limit. Media files are stored separately. Export a backup or split the graph into smaller workspaces.');
  }
  return serialized;
}

export function assetMeta(asset: StoredAsset): AssetMeta {
  return { id: asset.id, name: asset.name, mime: asset.mime, size: asset.size, url: `/api/assets/${asset.id}` };
}

export async function loadWorkspace(db: D1Database, userId: string) {
  const row = await db.prepare('SELECT document, revision, updated_at FROM workspaces WHERE user_id = ?').bind(userId).first<StoredWorkspace>();
  return { document: row ? JSON.parse(row.document) as Workspace : null, revision: row?.revision ?? 0, updatedAt: row?.updated_at ?? null, userId };
}

export async function assertOwnedAssets(db: D1Database, userId: string, document: Workspace): Promise<void> {
  const references = referencedAssets(document);
  const ids = [...new Set(references.map(asset => asset.id))];
  const owned = new Map<string, StoredAsset>();
  if (ids.length) {
    // A bounded JSON id list uses two bindings and one query, including when
    // thousands of referenced files would exceed D1's per-request query limit.
    const result = await db.prepare('SELECT id, user_id, storage_key, name, mime, size, created_at FROM assets WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))').bind(userId, JSON.stringify(ids)).all<StoredAsset>();
    for (const asset of result.results) owned.set(asset.id, asset);
  }
  for (const reference of references) {
    const asset = owned.get(reference.id);
    if (!asset) throw new ApiError(400, 'unknown_asset', 'An attached file is missing or does not belong to your account.');
    if (asset.name !== reference.name || asset.mime !== reference.mime || asset.size !== reference.size || reference.url !== `/api/assets/${asset.id}`) {
      throw new ApiError(400, 'invalid_asset', 'Attachment metadata does not match the original file.');
    }
  }
}

export async function saveWorkspace(db: D1Database, userId: string, document: Workspace, revision: number) {
  const serialized = serializeWorkspace(document);
  await assertOwnedAssets(db, userId, document);
  const updatedAt = new Date().toISOString();
  // Both creation and update are conditional, single SQLite statements. A second
  // tab can never silently replace a document saved after its last read.
  const result = revision === 0
    ? await db.prepare('INSERT INTO workspaces (user_id, document, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING').bind(userId, serialized, updatedAt).run()
    : await db.prepare('UPDATE workspaces SET document = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(serialized, updatedAt, userId, revision).run();
  if (!result.meta.changes) {
    const current = await db.prepare('SELECT revision FROM workspaces WHERE user_id = ?').bind(userId).first<{ revision: number }>();
    throw new ApiError(409, 'revision_conflict', 'This workspace changed in another tab. Keep your local copy, then reload the current server version.', { revision: current?.revision ?? 0 });
  }
  return { revision: revision + 1, updatedAt };
}

export async function findAsset(db: D1Database, userId: string, assetId: string): Promise<StoredAsset | null> {
  return db.prepare('SELECT id, user_id, storage_key, name, mime, size, created_at FROM assets WHERE id = ? AND user_id = ?').bind(assetId, userId).first<StoredAsset>();
}

/** Sharing grants access only to a currently referenced file in a current room. */
export async function findReadableAsset(db: D1Database, userId: string, email: string, assetId: string): Promise<StoredAsset | null> {
  const owned = await findAsset(db, userId, assetId);
  if (owned) return owned;
  return db.prepare(`SELECT a.id, a.user_id, a.storage_key, a.name, a.mime, a.size, a.created_at
    FROM assets a JOIN room_assets ra ON ra.asset_id = a.id JOIN rooms r ON r.id = ra.room_id
    WHERE a.id = ? AND (r.owner_user_id = ? OR EXISTS (SELECT 1 FROM room_members m WHERE m.room_id = r.id AND m.email = ? AND m.role = 'editor'))
    AND EXISTS (SELECT 1 FROM json_each(r.document, '$.nodes') node WHERE json_extract(node.value, '$.asset.id') = a.id)
    LIMIT 1`).bind(assetId, userId, email.trim().toLowerCase()).first<StoredAsset>();
}
