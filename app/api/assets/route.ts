import { env } from 'cloudflare:workers';
import { ApiError, errorResponse, json } from '../../../lib/server/errors';
import { cleanFileName, detectedMime, readUploadedFile } from '../../../lib/server/files';
import { assertExpectedIdentity, assertSameOrigin, requireIdentity } from '../../../lib/server/security';
import { assetMeta, type StoredAsset } from '../../../lib/server/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = requireIdentity(request);
    assertExpectedIdentity(request, userId);
    assertSameOrigin(request);
    if (!env.DB || !env.BUCKET) throw new ApiError(503, 'storage_unavailable', 'File storage is temporarily unavailable.');
    const file = await readUploadedFile(request);
    const id = crypto.randomUUID();
    const name = cleanFileName(file.name);
    const mime = await detectedMime(file);
    const storageKey = `assets/${id}`;
    const asset: StoredAsset = { id, user_id: userId, storage_key: storageKey, name, mime, size: file.size, created_at: new Date().toISOString() };
    // A bounded ArrayBuffer gives R2 an exact content length; multipart File
    // streams do not consistently carry the length metadata R2 requires.
    await env.BUCKET.put(storageKey, await file.arrayBuffer(), { httpMetadata: { contentType: mime }, customMetadata: { assetId: id } });
    try {
      await env.DB.prepare('INSERT INTO assets (id, user_id, storage_key, name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, userId, storageKey, name, mime, file.size, asset.created_at).run();
    } catch (error) {
      await env.BUCKET.delete(storageKey).catch(() => undefined);
      throw error;
    }
    return json(assetMeta(asset), 201);
  } catch (error) { return errorResponse(error); }
}
