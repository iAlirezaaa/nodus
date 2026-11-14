import { ApiError } from './errors';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 1024 * 1024;

export async function readUploadedFile(request: Request): Promise<File> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    throw new ApiError(415, 'multipart_required', 'Upload one file using multipart/form-data.');
  }
  const declaredSize = Number(request.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_MULTIPART_BYTES) throw new ApiError(413, 'file_too_large', 'Files can be up to 25 MiB.');
  if (!request.body) throw new ApiError(400, 'file_required', 'Choose a file to upload.');
  let total = 0;
  const limited = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > MAX_MULTIPART_BYTES) throw new ApiError(413, 'file_too_large', 'Files can be up to 25 MiB.');
      controller.enqueue(chunk);
    },
  }));
  let form: FormData;
  try {
    form = await new Response(limited, { headers: { 'Content-Type': contentType } }).formData();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (total > MAX_MULTIPART_BYTES) throw new ApiError(413, 'file_too_large', 'Files can be up to 25 MiB.');
    throw new ApiError(400, 'invalid_upload', 'The upload could not be read. Try choosing the file again.');
  }
  const entry = form.get('file');
  if (!entry || typeof entry === 'string') throw new ApiError(400, 'file_required', 'Choose a file to upload.');
  if (form.getAll('file').length !== 1) throw new ApiError(400, 'one_file_required', 'Upload one file per request.');
  if (entry.size === 0) throw new ApiError(400, 'empty_file', 'Empty files cannot be uploaded.');
  if (entry.size > MAX_FILE_BYTES) throw new ApiError(413, 'file_too_large', 'Files can be up to 25 MiB.');
  return entry;
}

export function cleanFileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 255).trim() || 'attachment';
}

export async function detectedMime(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 40).arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(bytes);
  const match = (...signature: number[]) => signature.every((n, i) => bytes[i] === n);
  if (match(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (match(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (/^GIF8[79]a/.test(ascii)) return 'image/gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  if (ascii.startsWith('%PDF-')) return 'application/pdf';
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12);
    if (['avif', 'avis'].includes(brand)) return 'image/avif';
    if (['M4A ', 'M4B ', 'M4P '].includes(brand)) return 'audio/mp4';
    if (brand === 'qt  ') return 'video/quicktime';
    if (['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'M4V ', 'MSNV', 'dash', '3gp4', '3gp5', '3gp6', '3g2a', '3g2b'].includes(brand)) {
      return file.type === 'audio/mp4' ? 'audio/mp4' : 'video/mp4';
    }
    // HEIC and other ISO containers remain downloadable instead of being
    // misidentified as videos when the browser cannot preview their format.
    return 'application/octet-stream';
  }
  if (match(0x1a, 0x45, 0xdf, 0xa3)) return file.type === 'audio/webm' ? 'audio/webm' : 'video/webm';
  if (ascii.startsWith('OggS')) return file.type === 'video/ogg' ? 'video/ogg' : 'audio/ogg';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio/wav';
  if (ascii.startsWith('fLaC')) return 'audio/flac';
  if (ascii.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  // Unknown files, HTML and SVG remain original byte-for-byte attachments; no
  // browser-supplied MIME can promote them into executable same-origin content.
  return 'application/octet-stream';
}

export function canInline(mime: string): boolean {
  return /^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|mp4|webm|ogg|wav|flac)|application\/pdf)$/.test(mime);
}

export function contentDisposition(name: string, download: boolean): string {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${download ? 'attachment' : 'inline'}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function parseRange(value: string | null, size: number): { offset: number; length: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) throw new ApiError(416, 'invalid_range', 'The requested byte range is not available.', { size });
  let start: number, end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new ApiError(416, 'invalid_range', 'The requested byte range is not available.', { size });
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) throw new ApiError(416, 'invalid_range', 'The requested byte range is not available.', { size });
    end = Math.min(end, size - 1);
  }
  return { offset: start, length: end - start + 1 };
}
