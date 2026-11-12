/// <reference types="vite/client" />

/**
 * Development-only browser fixture. Its fake API belongs to this page alone.
 * Nothing here changes the production API, authentication, or application hooks.
 * This file is outside public/ and is not a production entrypoint.
 */
import { createRoot, type Root } from 'react-dom/client';
import NodusApp from '../../components/NodusApp';
import { createWorkspace } from '../../lib/graph';
import { MAX_WORKSPACE_BYTES, validateSavePayload, validateWorkspace } from '../../lib/server/validation';
import type { Workspace } from '../../lib/types';
import '../../app/globals.css';

const USER_ID = 'fixture-flow-test';
const STORAGE_KEY = 'nodus:ui-fixture:flow:server:v1';

interface FixtureServer {
  fixtureVersion: 1;
  userId: typeof USER_ID;
  document: Workspace;
  revision: number;
  writes: number;
  updatedAt: string;
}

if (!import.meta.env.DEV) throw new Error('The flow UI fixture is available only in Vite development.');
if (!['/tests/browser/flow-fixture.html', '/tests/browser/flow-fixture'].includes(window.location.pathname)) throw new Error('The flow fixture must run from its isolated test page.');

const originalFetch = window.fetch.bind(window);
const host = window.document.getElementById('fixture-root');
const badge = window.document.getElementById('fixture-badge');
const status = window.document.getElementById('fixture-status');
const resetButton = window.document.getElementById('fixture-reset');
if (!host || !badge || !status || !resetButton) throw new Error('The UI fixture HTML is incomplete.');

function seed(): FixtureServer {
  const document = createWorkspace('fa');
  document.boards = document.boards.map(board => board.id === document.homeBoardId
    ? { ...board, title: 'UI test fixture · فضای فکر من', description: 'Synthetic development test data. No real workspace or account data is used.' }
    : board);
  return { fixtureVersion: 1, userId: USER_ID, document, revision: 0, writes: 0, updatedAt: new Date().toISOString() };
}

function persist(next: FixtureServer): void {
  // Only this fixture key is used for the fake server; refresh preserves its CAS revision.
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function restore(): FixtureServer {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as FixtureServer;
      if (saved.fixtureVersion !== 1 || saved.userId !== USER_ID || !Number.isSafeInteger(saved.revision)
        || saved.revision < 0 || !Number.isSafeInteger(saved.writes) || saved.writes < 0) throw new Error('Invalid fixture state.');
      validateWorkspace(saved.document);
      if (saved.document.nodes.some(node => node.asset !== null)) throw new Error('The fixture cannot load real attachment references.');
      return saved;
    }
  } catch {
    // Corrupt synthetic state can safely be reseeded; real account keys are never read.
  }
  const initial = seed();
  persist(initial);
  return initial;
}

let server = restore();
let appRoot: Root;
let blockedAssetRequests = 0;

function updateBadge(): void {
  badge!.dataset.fixtureUser = USER_ID;
  badge!.dataset.writeCount = String(server.writes);
  badge!.dataset.revision = String(server.revision);
  badge!.dataset.nodeCount = String(server.document.nodes.length);
  badge!.dataset.edgeCount = String(server.document.edges.length);
  badge!.dataset.boardCount = String(server.document.boards.length);
  badge!.dataset.blockedAssetRequests = String(blockedAssetRequests);
  status!.textContent = `UI test fixture · writes ${server.writes} · revision ${server.revision} · nodes ${server.document.nodes.length} · edges ${server.document.edges.length}`;
}

function json(value: unknown, code = 200): Response {
  return Response.json(value, { status: code, headers: { 'Cache-Control': 'no-store', 'X-Nodus-Test-Fixture': USER_ID } });
}

const fixtureFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  const path = url.pathname.replace(/\/+$/, '');

  // Attachments are deliberately unsupported, and must never reach a real API.
  if (/^\/api\/assets(?:\/|$)/.test(path)) {
    blockedAssetRequests += 1;
    updateBadge();
    return json({ error: 'fixture_assets_disabled', message: 'Attachments are disabled in this synthetic UI fixture.' }, 501);
  }
  if (!/^\/api\/workspace(?:\/|$)/.test(path)) return originalFetch(input, init);
  if (url.origin !== window.location.origin || path !== '/api/workspace') return json({ error: 'fixture_isolation', message: 'This test page cannot access another workspace API.' }, 403);

  const request = new Request(input instanceof Request ? input : url.href, init);
  if (request.signal.aborted) throw new DOMException('The fixture request was aborted.', 'AbortError');
  if (request.method === 'GET') return json({ userId: USER_ID, document: server.document, revision: server.revision, updatedAt: server.updatedAt });
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed', message: 'The fixture supports GET and PUT only.' }, 405);
  if (request.headers.get('X-Nodus-User-Id') !== USER_ID) return json({ error: 'fixture_account_mismatch', message: 'The synthetic fixture identity does not match this save.' }, 401);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_WORKSPACE_BYTES) return json({ error: 'request_too_large', message: 'The fixture save exceeds 5 MiB.' }, 413);
    const payload = validateSavePayload(JSON.parse(body));
    if (payload.document.nodes.some(node => node.asset !== null)) return json({ error: 'fixture_assets_disabled', message: 'Synthetic fixture workspaces cannot reference real attachments.' }, 400);
    if (payload.revision !== server.revision) return json({ error: 'revision_conflict', message: 'This fixture workspace changed after your last read.', revision: server.revision }, 409);
    const next: FixtureServer = { ...server, document: payload.document, revision: server.revision + 1, writes: server.writes + 1, updatedAt: new Date().toISOString() };
    // There is no await between the revision check and write: concurrent PUTs have CAS semantics.
    persist(next);
    server = next;
    updateBadge();
    return json({ revision: server.revision, updatedAt: server.updatedAt });
  } catch (error) {
    return json({ error: 'invalid_fixture_save', message: error instanceof Error ? error.message : 'The fixture could not validate this save.' }, 400);
  }
};

window.fetch = fixtureFetch;
updateBadge();
appRoot = createRoot(host);
appRoot.render(<NodusApp />);

function resetFixture(): void {
  // Unmount first so the old store cannot enqueue a write after the reset.
  appRoot.unmount();
  window.localStorage.removeItem(`nodus:workspace:draft:${USER_ID}`);
  window.localStorage.removeItem(`nodus:workspace:recovery:${USER_ID}`);
  server = seed();
  persist(server);
  blockedAssetRequests = 0;
  updateBadge();
  appRoot = createRoot(host!);
  appRoot.render(<NodusApp />);
}
resetButton.addEventListener('click', resetFixture);

if (import.meta.hot) import.meta.hot.dispose(() => {
  appRoot.unmount();
  resetButton.removeEventListener('click', resetFixture);
  if (window.fetch === fixtureFetch) window.fetch = originalFetch;
});
