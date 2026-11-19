/// <reference types="vite/client" />
/** Isolated synthetic API for the real NodusApp. No production imports point here. */
import { createRoot, type Root } from 'react-dom/client';
import NodusApp from '../../components/NodusApp';
import { validateSavePayload, validateWorkspace, MAX_WORKSPACE_BYTES } from '../../lib/server/validation';
import { createClarityWorkspace, CLARITY_FIXTURE_USER, CLARITY_STORAGE_KEY } from './clarity-scene';
import type { Workspace } from '../../lib/types';
import '../../app/globals.css';

if (!import.meta.env.DEV || !['/tests/browser/clarity-session.html', '/tests/browser/clarity-session'].includes(location.pathname)) throw new Error('The clarity-node fixture runs only from its isolated Vite development page.');

interface SyntheticServer { version: 1; userId: typeof CLARITY_FIXTURE_USER; document: Workspace; revision: number; writes: number; updatedAt: string; }
const seed = (): SyntheticServer => ({ version: 1, userId: CLARITY_FIXTURE_USER, document: createClarityWorkspace(), revision: 0, writes: 0, updatedAt: new Date().toISOString() });
function persist(next: SyntheticServer) { sessionStorage.setItem(CLARITY_STORAGE_KEY, JSON.stringify(next)); }
function restore(): SyntheticServer {
  try {
    const data = JSON.parse(sessionStorage.getItem(CLARITY_STORAGE_KEY) ?? 'null') as SyntheticServer | null;
    if (data?.version === 1 && data.userId === CLARITY_FIXTURE_USER && Number.isSafeInteger(data.revision) && data.revision >= 0 && Number.isSafeInteger(data.writes) && data.writes >= 0) {
      validateWorkspace(data.document);
      if (data.document.nodes.some(node => node.asset !== null)) throw new Error('The isolated fixture has no assets.');
      return data;
    }
  } catch { /* Only synthetic fixture state can be reset here. */ }
  const state = seed(); persist(state); return state;
}
let server = restore();
let epoch = 0;
const originalFetch = window.fetch.bind(window);
const host = document.getElementById('fixture-root');
if (!host) throw new Error('The clarity fixture HTML is incomplete.');
let appRoot: Root;

function updateStatus() {
  const detail = { type: 'nodus-clarity-fixture:status', writes: server.writes, revision: server.revision,
    nodes: server.document.nodes.length, edges: server.document.edges.length };
  const text = `writes ${detail.writes} · revision ${detail.revision} · nodes ${detail.nodes} · edges ${detail.edges}`;
  if (parent !== window) parent.postMessage({ ...detail, text }, location.origin);
  document.documentElement.dataset.fixtureUser = CLARITY_FIXTURE_USER;
  document.documentElement.dataset.fixtureRevision = String(server.revision);
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Nodus-Test-Fixture': CLARITY_FIXTURE_USER } });
const fixtureFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (!/^\/api(?:\/|$)/.test(url.pathname)) return originalFetch(input, init);
  if (url.origin !== location.origin) return json({ error: 'fixture_isolation', message: 'This fixture cannot call another application API origin.' }, 403);
  const request = new Request(input instanceof Request ? input : url.href, init);
  const requestEpoch = epoch;
  if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
  if (url.pathname === '/api/rooms' && request.method === 'GET') return json({ rooms: [], userId: CLARITY_FIXTURE_USER, email: 'clarity-nodes@fixture.test' });
  if (url.pathname !== '/api/workspace') return json({ error: 'fixture_api_disabled', message: 'Only the synthetic workspace API is enabled. Attachments and shared-room writes are disabled in this test page.' }, 501);
  if (request.method === 'GET') return json({ userId: CLARITY_FIXTURE_USER, document: server.document, revision: server.revision, updatedAt: server.updatedAt });
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed', message: 'Use GET or PUT.' }, 405);
  if (request.headers.get('X-Nodus-User-Id') !== CLARITY_FIXTURE_USER) return json({ error: 'account_changed', message: 'The synthetic account identity changed.' }, 401);
  try {
    const body = await request.text();
    if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
    if (requestEpoch !== epoch) return json({ error: 'fixture_reset', message: 'This request belongs to the fixture before reset.' }, 409);
    if (new TextEncoder().encode(body).byteLength > MAX_WORKSPACE_BYTES) return json({ error: 'request_too_large', message: 'The synthetic workspace exceeds 5 MiB.' }, 413);
    const payload = validateSavePayload(JSON.parse(body));
    if (payload.document.nodes.some(node => node.asset !== null)) return json({ error: 'fixture_assets_disabled', message: 'This synthetic scene has no attachment references.' }, 400);
    if (payload.revision !== server.revision) return json({ error: 'revision_conflict', message: 'The synthetic workspace changed after this read.', revision: server.revision }, 409);
    const next = { ...server, document: payload.document, revision: server.revision + 1, writes: server.writes + 1, updatedAt: new Date().toISOString() };
    persist(next); server = next; updateStatus();
    return json({ revision: server.revision, updatedAt: server.updatedAt });
  } catch (error) { return json({ error: 'invalid_fixture_save', message: error instanceof Error ? error.message : 'Invalid synthetic save.' }, 400); }
};
window.fetch = fixtureFetch;
function mount() { appRoot = createRoot(host!); appRoot.render(<NodusApp />); updateStatus(); }
function resetFixture() {
  epoch += 1; appRoot.unmount();
  for (const key of [`nodus:workspace:draft:${CLARITY_FIXTURE_USER}`, `nodus:workspace:recovery:${CLARITY_FIXTURE_USER}`]) localStorage.removeItem(key);
  const viewScope = encodeURIComponent(`${CLARITY_FIXTURE_USER}:personal:`);
  for (const key of Object.keys(localStorage)) if (key.startsWith(`nodus:magnetic-view:v1:${viewScope}`) || key.startsWith(`nodus:canvas-design:v1:${viewScope}`) || key.startsWith(`nodus:view:v2:${viewScope}`)) localStorage.removeItem(key);
  for (const board of server.document.boards) localStorage.removeItem(`nodus:view:${board.id}`);
  if (server.document.boards.some(board => board.id === localStorage.getItem('nodus:board'))) localStorage.removeItem('nodus:board');
  const annotationPrefix = `nodus:annotation-draft:v1:${encodeURIComponent(`${CLARITY_FIXTURE_USER}:personal`)}:`;
  for (const key of Object.keys(sessionStorage)) if (key.startsWith(annotationPrefix)) sessionStorage.removeItem(key);
  server = seed(); persist(server);
  // Deterministic node IDs intentionally repeat across resets. A fresh module
  // instance also clears the annotation editor's in-memory draft cache.
  location.reload();
}
const message = (event: MessageEvent) => { if (event.source === parent && parent !== window && event.origin === location.origin && event.data?.type === 'nodus-clarity-fixture:reset') resetFixture(); };
window.addEventListener('message', message);
mount();
if (import.meta.hot) import.meta.hot.dispose(() => { epoch += 1; appRoot.unmount(); window.removeEventListener('message', message); if (window.fetch === fixtureFetch) window.fetch = originalFetch; });
