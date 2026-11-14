import { ApiError } from './errors';

export function requireIdentity(request: Request): string {
  // Hosted Sites dispatch strips client-supplied identity headers and supplies the
  // authenticated identity. The app never invents a development or shared user.
  const userId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!userId || !email || userId.length > 256) {
    throw new ApiError(401, 'authentication_required', 'Sign in with ChatGPT to open your workspace.');
  }
  return userId;
}

export function assertExpectedIdentity(request: Request, authenticatedUserId: string): void {
  // A tab can outlive its sign-in session. Revision equality alone is not proof
  // that its document belongs to the account now authenticated by the gateway.
  const expectedUserId = request.headers.get('x-nodus-user-id');
  if (!expectedUserId || expectedUserId !== authenticatedUserId) {
    throw new ApiError(401, 'account_changed', 'Your signed-in account changed or could not be confirmed. Reload this page before saving; your existing local draft has been preserved.');
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    throw new ApiError(403, 'origin_rejected', 'Cross-site writes are not allowed.');
  }
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(403, 'origin_rejected', 'This request came from a different origin.');
  }
}

export async function readLimitedBytes(request: Request, maximum: number): Promise<Uint8Array> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > maximum) {
    throw new ApiError(413, 'request_too_large', 'The request exceeds the supported size.');
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new ApiError(413, 'request_too_large', 'The request exceeds the supported size.');
      }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function readLimitedJson(request: Request, maximum: number): Promise<unknown> {
  const type = request.headers.get('content-type')?.split(';')[0].trim();
  if (type !== 'application/json') throw new ApiError(415, 'json_required', 'Send application/json.');
  const bytes = await readLimitedBytes(request, maximum);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, 'invalid_json', 'The request is not valid JSON.'); }
}
