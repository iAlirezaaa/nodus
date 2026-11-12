import { env } from 'cloudflare:workers';
import { createRoom, listRooms, requireRoomIdentity } from '../../../lib/server/collaboration';
import { ApiError, errorResponse, json } from '../../../lib/server/errors';
import { assertExpectedIdentity, assertSameOrigin, readLimitedJson } from '../../../lib/server/security';
import { MAX_WORKSPACE_BYTES } from '../../../lib/server/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared workspace storage is temporarily unavailable.');
    return json(await listRooms(env.DB, identity));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    assertExpectedIdentity(request, identity.userId); assertSameOrigin(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared workspace storage is temporarily unavailable.');
    return json(await createRoom(env.DB, identity, await readLimitedJson(request, MAX_WORKSPACE_BYTES + 1024)), 201);
  } catch (error) { return errorResponse(error); }
}
