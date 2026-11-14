import { env } from 'cloudflare:workers';
import { addRoomMember, removeRoomMember, requireRoomIdentity } from '../../../../../lib/server/collaboration';
import { ApiError, errorResponse, json } from '../../../../../lib/server/errors';
import { assertExpectedIdentity, assertSameOrigin, readLimitedJson } from '../../../../../lib/server/security';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

async function membership(request: Request, context: RouteContext, remove: boolean): Promise<Response> {
  try {
    const identity = requireRoomIdentity(request);
    assertExpectedIdentity(request, identity.userId); assertSameOrigin(request);
    if (!env.DB) throw new ApiError(503, 'storage_unavailable', 'Shared workspace storage is temporarily unavailable.');
    const { id } = await context.params, input = await readLimitedJson(request, 4096);
    return json(await (remove ? removeRoomMember : addRoomMember)(env.DB, identity, id, input));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: RouteContext) { return membership(request, context, false); }
export async function DELETE(request: Request, context: RouteContext) { return membership(request, context, true); }
