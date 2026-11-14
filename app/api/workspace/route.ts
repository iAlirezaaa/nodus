import { env } from 'cloudflare:workers';
import { ApiError, errorResponse, json } from '../../../lib/server/errors';
import { assertExpectedIdentity, assertSameOrigin, readLimitedJson, requireIdentity } from '../../../lib/server/security';
import { loadWorkspace, saveWorkspace } from '../../../lib/server/store';
import { MAX_WORKSPACE_BYTES, validateSavePayload } from '../../../lib/server/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = requireIdentity(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Workspace storage is temporarily unavailable.');
    return json(await loadWorkspace(env.DB, userId));
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const userId = requireIdentity(request);
    assertExpectedIdentity(request, userId);
    assertSameOrigin(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Workspace storage is temporarily unavailable.');
    const payload = validateSavePayload(await readLimitedJson(request, MAX_WORKSPACE_BYTES));
    return json(await saveWorkspace(env.DB, userId, payload.document, payload.revision));
  } catch (error) { return errorResponse(error); }
}
