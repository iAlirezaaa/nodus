import { env } from 'cloudflare:workers';
import { ApiError, errorResponse } from '../../../../lib/server/errors';
import { canInline, contentDisposition, parseRange } from '../../../../lib/server/files';
import { requireIdentity } from '../../../../lib/server/security';
import { findReadableAsset } from '../../../../lib/server/store';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ id: string }> };

async function serve(request: Request, context: RouteContext, headOnly: boolean): Promise<Response> {
  try {
    const userId = requireIdentity(request);
    if (!env.DB || !env.BUCKET) throw new ApiError(503, 'storage_unavailable', 'File storage is temporarily unavailable.');
    const { id } = await context.params;
    const asset = await findReadableAsset(env.DB, userId, request.headers.get('oai-authenticated-user-email')!, id);
    if (!asset) throw new ApiError(404, 'file_not_found', 'This file does not exist in your workspace.');
    const metadata = await env.BUCKET.head(asset.storage_key);
    if (!metadata) throw new ApiError(404, 'file_not_found', 'The original file is unavailable.');
    const headers = new Headers({
      'Content-Type': asset.mime,
      'Content-Disposition': contentDisposition(asset.name, new URL(request.url).searchParams.has('download') || !canInline(asset.mime)),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'private, no-store',
      'Accept-Ranges': 'bytes',
      'ETag': metadata.httpEtag,
    });
    const ifRange = request.headers.get('if-range');
    const range = parseRange(!ifRange || ifRange === metadata.httpEtag ? request.headers.get('range') : null, asset.size);
    headers.set('Content-Length', String(range?.length ?? asset.size));
    if (range) headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${asset.size}`);
    if (headOnly) return new Response(null, { status: range ? 206 : 200, headers });
    const object = await env.BUCKET.get(asset.storage_key, range ? { range } : undefined);
    if (!object) throw new ApiError(404, 'file_not_found', 'The original file is unavailable.');
    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch (error) {
    const response = errorResponse(error);
    if (error instanceof ApiError && error.status === 416) response.headers.set('Content-Range', `bytes */${error.details.size}`);
    return response;
  }
}

export async function GET(request: Request, context: RouteContext) { return serve(request, context, false); }
export async function HEAD(request: Request, context: RouteContext) { return serve(request, context, true); }
