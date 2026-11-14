export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: error.code, message: error.message, ...error.details }, error.status);
  }
  console.error('Nodus API request failed:', error instanceof Error ? error.message : 'Unknown error');
  return json({ error: 'server_error', message: 'The server could not complete this request. Your local changes have not been discarded.' }, 500);
}
