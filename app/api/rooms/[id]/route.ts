import { env } from 'cloudflare:workers';
import { MAX_ROOM_PATCH_BYTES, patchRoom, readRoom, requireRoomIdentity } from '../../../../lib/server/collaboration';
import { ApiError, errorResponse, json } from '../../../../lib/server/errors';
import { assertExpectedIdentity, assertSameOrigin, readLimitedJson } from '../../../../lib/server/security';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared workspace storage is temporarily unavailable.');
    const { id } = await context.params;
    const value = new URL(request.url).searchParams.get('since');
    const since = value === null ? undefined : Number(value);
    if (since !== undefined && (!Number.isSafeInteger(since) || since < 0 || value === '')) throw new ApiError(400, 'invalid_revision', 'The requested room revision is invalid.');
    return json(await readRoom(env.DB, identity, id, since));
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    assertExpectedIdentity(request, identity.userId); assertSameOrigin(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared workspace storage is temporarily unavailable.');
    const { id } = await context.params;
    return json(await patchRoom(env.DB, identity, id, await readLimitedJson(request, MAX_ROOM_PATCH_BYTES)));
  } catch (error) { return errorResponse(error); }
}
