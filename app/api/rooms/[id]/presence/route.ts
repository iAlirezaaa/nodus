import { env } from 'cloudflare:workers';
import { getPresence, putPresence, requireRoomIdentity } from '../../../../../lib/server/collaboration';
import { ApiError, errorResponse, json } from '../../../../../lib/server/errors';
import { assertExpectedIdentity, assertSameOrigin, readLimitedJson } from '../../../../../lib/server/security';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared presence is temporarily unavailable.');
    const { id } = await context.params;
    return json(await getPresence(env.DB, identity, id));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    assertExpectedIdentity(request, identity.userId); assertSameOrigin(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared presence is temporarily unavailable.');
    const { id } = await context.params;
    return json(await putPresence(env.DB, identity, id, await readLimitedJson(request, 4096)));
  } catch (error) { return errorResponse(error); }
}
