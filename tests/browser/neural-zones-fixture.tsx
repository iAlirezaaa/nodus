/// <reference types="vite/client" />
/**
 * The real NodusApp with an isolated synthetic workspace. This page cannot read
 * owner APIs, drafts or preferences. State is confined to sessionStorage, and
 * the two mock media endpoints exist only in Vite's serve-only fixture plugin.
 */
import { createRoot, type Root } from 'react-dom/client';
import NodusApp from '../../components/NodusApp';
import { makeNode } from '../../lib/graph';
import { createZone } from '../../lib/zones';
import { MAX_WORKSPACE_BYTES, validateSavePayload, validateWorkspace } from '../../lib/server/validation';
import type { AssetMeta, Workspace } from '../../lib/types';
import '../../app/globals.css';

const USER_ID = 'fixture-neural-zones-nd026';
const STORAGE_KEY = 'nodus:ui-fixture:neural-zones:server:v1';
const PREFERENCE_PREFIX = 'nodus:ui-fixture:neural-zones:preferences:';
const ROOT_BOARD = 'fixture-neural-zones-root';
const FILM_BOARD = 'fixture-neural-zones-film';
const ASSETS: AssetMeta[] = [
  { id: 'nodus-fixture-reference-nd026', name: 'storyboard-reference.png', mime: 'image/png', size: 4453, url: '/api/assets/nodus-fixture-reference-nd026' },
  { id: 'nodus-fixture-script-nd026', name: 'story-notes.txt', mime: 'text/plain', size: 101, url: '/api/assets/nodus-fixture-script-nd026' },
];
const assetIndex = new Map(ASSETS.map(asset => [asset.id, asset]));
interface FixtureServer { fixtureVersion: 1; userId: typeof USER_ID; document: Workspace; revision: number; writes: number; updatedAt: string; }

if (!import.meta.env.DEV || !['/tests/browser/neural-zones-fixture.html', '/tests/browser/neural-zones-fixture'].includes(location.pathname)) throw new Error('This fixture only runs on its isolated Vite development page.');

const originalFetch = window.fetch.bind(window);
const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
// The actual application still uses Storage normally, but only in this page its
// "local" persistence is scoped to a synthetic prefix inside sessionStorage.
const preferenceKeys = () => Object.keys(sessionStorage).filter(key => key.startsWith(PREFERENCE_PREFIX));
const isolatedLocalStorage: Storage = {
  get length() { return preferenceKeys().length; },
  key(index) { const key = preferenceKeys()[index]; return key ? key.slice(PREFERENCE_PREFIX.length) : null; },
  getItem(key) { return sessionStorage.getItem(PREFERENCE_PREFIX + key); },
  setItem(key, value) { sessionStorage.setItem(PREFERENCE_PREFIX + key, value); },
  removeItem(key) { sessionStorage.removeItem(PREFERENCE_PREFIX + key); },
  clear() { for (const key of preferenceKeys()) sessionStorage.removeItem(key); },
};
Object.defineProperty(window, 'localStorage', { configurable: true, value: isolatedLocalStorage });

const host = document.getElementById('fixture-root');
const badge = document.getElementById('fixture-badge');
const status = document.getElementById('fixture-status');
const projection = document.getElementById('fixture-document');
const resetButton = document.getElementById('fixture-reset');
const reducedMotionButton = document.getElementById('fixture-reduced-motion');
const hiddenPageButton = document.getElementById('fixture-hidden-page');
if (!host || !badge || !status || !projection || !resetButton || !reducedMotionButton || !hiddenPageButton) throw new Error('The neural fixture HTML is incomplete.');

// Explicit synthetic environment controls, confined to this development page.
// Unrelated media queries and the real browser's event listener implementations
// are preserved. This does not emulate CSS media queries or OS tab visibility.
const originalMatchMedia = window.matchMedia.bind(window);
const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
const motionQueries = new Map<MediaQueryList, PropertyDescriptor | undefined>();
let simulateReducedMotion = false;
let simulateHiddenPage = false;
const fixtureMatchMedia: typeof matchMedia = query => {
  const media = originalMatchMedia(query);
  if (!/^\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/.test(query.trim())) return media;
  motionQueries.set(media, Object.getOwnPropertyDescriptor(media, 'matches'));
  Object.defineProperty(media, 'matches', { configurable: true, get: () => simulateReducedMotion || originalMatchMedia(query).matches });
  return media;
};
window.matchMedia = fixtureMatchMedia;
function restoreVisibilityProperties() {
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor); else Reflect.deleteProperty(document, 'hidden');
  if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor); else Reflect.deleteProperty(document, 'visibilityState');
}
function toggleReducedMotion() {
  const previous = new Map([...motionQueries.keys()].map(media => [media, media.matches]));
  simulateReducedMotion = !simulateReducedMotion;
  for (const media of motionQueries.keys()) {
    if (previous.get(media) !== media.matches) media.dispatchEvent(new MediaQueryListEvent('change', { media: media.media, matches: media.matches }));
  }
  updateStatus();
}
function toggleHiddenPage() {
  simulateHiddenPage = !simulateHiddenPage;
  if (simulateHiddenPage) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  } else restoreVisibilityProperties();
  document.dispatchEvent(new Event('visibilitychange'));
  updateStatus();
}
function restoreEnvironment() {
  simulateReducedMotion = false; simulateHiddenPage = false;
  restoreVisibilityProperties();
  if (window.matchMedia === fixtureMatchMedia) window.matchMedia = originalMatchMedia;
  for (const [media, descriptor] of motionQueries) {
    if (descriptor) Object.defineProperty(media, 'matches', descriptor); else Reflect.deleteProperty(media, 'matches');
  }
  motionQueries.clear();
}

function seed(): FixtureServer {
  const now = '2026-11-19T22:30:00.000Z';
  const node = (id: string, title: string, x: number, y: number, color: 'sage' | 'blue' | 'amber' | 'rose' | 'violet' | 'gray') => makeNode(ROOT_BOARD, 'note', x, y, { id, title, color, createdAt: now });
  let document: Workspace = {
    version: 1, homeBoardId: ROOT_BOARD,
    boards: [
      { id: ROOT_BOARD, title: 'شبکهٔ داستان', description: 'دادهٔ ساختگی برای بررسی نود، کارت و Zone؛ داستان در چند مسیر مشترک است.', parentNodeId: null, createdAt: now },
      { id: FILM_BOARD, title: 'فیلم سینمایی', description: 'پروژهٔ تو‌در‌توی آزمایشی', parentNodeId: 'fixture-film', createdAt: now },
    ],
    nodes: [
      { ...node('fixture-story', 'داستان · Story', 30, 0, 'violet'), text: 'یک مفهوم مشترک میان کتاب، فیلم، سریال و تیزر. ارتباط‌ها چندبه‌چند هستند.' },
      { ...node('fixture-decoupage', 'دکوپاژ', 50, 320, 'blue'), text: 'از داستان به انتخاب شات‌ها، تصویر و ریتم؛ مرتبط با سینما و سریال.' },
      { ...node('fixture-film', 'فیلم سینمایی', 400, -160, 'blue'), kind: 'project', childBoardId: FILM_BOARD, text: 'فیلم‌نامه، اجرا و ساخت تصویر در پروژهٔ داخلی.' },
      { ...node('fixture-series', 'سریال', 400, 220, 'amber'), text: 'یک داستان در چند قسمت؛ دکوپاژ و شخصیت‌های مشترک.' },
      { ...node('fixture-book', 'کتاب', -380, -180, 'sage'), text: 'روایت، فصل‌ها و شخصیت‌ها.' },
      { ...node('fixture-teaser', 'ایدهٔ تیزر', -380, 300, 'rose'), text: 'یک ایدهٔ کوتاه با ریشه در همان داستان.' },
      { ...node('fixture-character', 'شخصیت اصلی', -380, 50, 'violet'), text: 'هویت، هدف و کشمکش شخصیت.' },
      { ...node('fixture-image', 'مرجع استوری‌بورد', 700, -160, 'blue'), kind: 'image', presentation: 'card', height: 240, asset: ASSETS[0], text: 'تصویر شماتیک ساختگی برای بررسی کارت رسانه.' },
      { ...node('fixture-file', 'یادداشت فیلم‌نامه', 700, 220, 'amber'), kind: 'file', presentation: 'card', height: 190, asset: ASSETS[1], text: 'فایل متنی آزمایشی با ارتباط مشترک داستان و دکوپاژ.' },
      makeNode(FILM_BOARD, 'note', 0, 0, { id: 'fixture-film-shot', title: 'سکانس اول', text: 'محتوای ساختگی پروژهٔ داخلی.', color: 'blue', createdAt: now }),
    ],
    edges: [],
  };
  const pairs = [
    ['story', 'film'], ['story', 'series'], ['story', 'book'], ['story', 'teaser'], ['story', 'character'], ['story', 'decoupage'],
    ['decoupage', 'film'], ['decoupage', 'series'], ['decoupage', 'image'], ['film', 'image'], ['series', 'file'], ['book', 'character'], ['series', 'story'],
  ];
  document.edges = pairs.map(([source, target], index) => ({ id: `fixture-edge-${index}`, boardId: ROOT_BOARD, sourceId: `fixture-${source}`, targetId: `fixture-${target}`, label: '' }));
  document = createZone(document, ROOT_BOARD, { title: 'آفرینش داستان', description: 'روایت، شخصیت و ایده‌هایی که به قالب‌های مختلف می‌رسند.', color: 'sage', nodeIds: ['fixture-book', 'fixture-character', 'fixture-teaser'] }, 'fixture-zone-ideas');
  document = createZone(document, ROOT_BOARD, { title: 'تولید تصویر', description: 'فیلم و سریال با مرجع تصویری و یادداشت‌های متصل؛ داستان و دکوپاژ بین مسیرها مشترک‌اند.', color: 'blue', nodeIds: ['fixture-film', 'fixture-series', 'fixture-image', 'fixture-file'] }, 'fixture-zone-production');
  validateWorkspace(document);
  return { fixtureVersion: 1, userId: USER_ID, document, revision: 0, writes: 0, updatedAt: now };
}

function assertFixtureAssets(document: Workspace): void {
  for (const node of document.nodes) {
    if (!node.asset) continue;
    const allowed = assetIndex.get(node.asset.id);
    if (!allowed || Object.keys(allowed).some(key => node.asset![key as keyof AssetMeta] !== allowed[key as keyof AssetMeta])) throw new Error('Only the two synthetic fixture media references are allowed.');
  }
}
function persist(next: FixtureServer) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
function restore(): FixtureServer {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as FixtureServer | null;
    if (saved?.fixtureVersion === 1 && saved.userId === USER_ID && Number.isSafeInteger(saved.revision) && saved.revision >= 0 && Number.isSafeInteger(saved.writes) && saved.writes >= 0) {
      validateWorkspace(saved.document); assertFixtureAssets(saved.document); return saved;
    }
  } catch { /* This reset is limited to synthetic session state. */ }
  const initial = seed(); persist(initial); return initial;
}
let server = restore();
let epoch = 0;
let appRoot: Root;
let blockedRequests = 0;

function updateStatus() {
  const zoneCount = server.document.boards.reduce((sum, board) => sum + (board.zones?.length ?? 0), 0);
  Object.assign(badge!.dataset, { fixtureUser: USER_ID, writes: String(server.writes), revision: String(server.revision), nodes: String(server.document.nodes.length), edges: String(server.document.edges.length), zones: String(zoneCount), blockedRequests: String(blockedRequests), simulatedReducedMotion: String(simulateReducedMotion), simulatedHiddenPage: String(simulateHiddenPage) });
  reducedMotionButton!.setAttribute('aria-pressed', String(simulateReducedMotion));
  hiddenPageButton!.setAttribute('aria-pressed', String(simulateHiddenPage));
  status!.textContent = `SYNTHETIC FIXTURE · writes ${server.writes} · nodes ${server.document.nodes.length} · zones ${zoneCount} · SIMULATED reduced=${simulateReducedMotion ? 'ON' : 'off'} hidden=${simulateHiddenPage ? 'ON' : 'off'}`;
  projection!.textContent = JSON.stringify({ source: 'Synthetic fixture; no authenticated account', simulation: { reducedMotion: simulateReducedMotion, hiddenPage: simulateHiddenPage }, revision: server.revision, writes: server.writes, document: server.document }, null, 2);
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Nodus-Test-Fixture': USER_ID } });
const fixtureFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (!/^\/api(?:\/|$)/.test(url.pathname)) return originalFetch(input, init);
  if (url.origin !== location.origin) return json({ error: 'fixture_isolation', message: 'Cross-origin APIs are disabled in this fixture.' }, 403);
  const request = new Request(input instanceof Request ? input : url.href, init);
  const requestEpoch = epoch;
  if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
  if (ASSETS.some(asset => asset.url === url.pathname) && ['GET', 'HEAD'].includes(request.method)) return originalFetch(input, init);
  if (url.pathname === '/api/rooms' && request.method === 'GET') return json({ rooms: [], userId: USER_ID, email: 'neural-zones@fixture.test' });
  if (url.pathname !== '/api/workspace') {
    blockedRequests += 1; updateStatus();
    return json({ error: 'fixture_api_disabled', message: 'Owner APIs, uploads and shared-room mutations are disabled in this synthetic fixture.' }, 501);
  }
  if (request.method === 'GET') return json({ userId: USER_ID, document: server.document, revision: server.revision, updatedAt: server.updatedAt });
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed', message: 'Use GET or PUT.' }, 405);
  if (request.headers.get('X-Nodus-User-Id') !== USER_ID) return json({ error: 'account_changed', message: 'This save must use the synthetic fixture identity.' }, 401);
  try {
    const body = await request.text();
    if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
    if (requestEpoch !== epoch) return json({ error: 'fixture_reset', message: 'This request belongs to the fixture before reset.' }, 409);
    if (new TextEncoder().encode(body).byteLength > MAX_WORKSPACE_BYTES) return json({ error: 'request_too_large', message: 'The fixture workspace exceeds 5 MiB.' }, 413);
    const payload = validateSavePayload(JSON.parse(body)); assertFixtureAssets(payload.document);
    if (payload.revision !== server.revision) return json({ error: 'revision_conflict', message: 'The synthetic workspace changed after this read.', revision: server.revision }, 409);
    const next = { ...server, document: payload.document, revision: server.revision + 1, writes: server.writes + 1, updatedAt: new Date().toISOString() };
    persist(next); server = next; updateStatus();
    return json({ revision: server.revision, updatedAt: server.updatedAt });
  } catch (error) { return json({ error: 'invalid_fixture_save', message: error instanceof Error ? error.message : 'Invalid synthetic save.' }, 400); }
};
window.fetch = fixtureFetch;
appRoot = createRoot(host);
appRoot.render(<NodusApp />);
updateStatus();

function resetFixture() {
  epoch += 1; appRoot.unmount();
  restoreEnvironment();
  isolatedLocalStorage.clear();
  const annotationPrefix = `nodus:annotation-draft:v1:${encodeURIComponent(`${USER_ID}:personal`)}:`;
  for (const key of Object.keys(sessionStorage)) if (key.startsWith(annotationPrefix)) sessionStorage.removeItem(key);
  server = seed(); persist(server); location.reload();
}
resetButton.addEventListener('click', resetFixture);
reducedMotionButton.addEventListener('click', toggleReducedMotion);
hiddenPageButton.addEventListener('click', toggleHiddenPage);
if (import.meta.hot) import.meta.hot.dispose(() => {
  epoch += 1; appRoot.unmount(); resetButton.removeEventListener('click', resetFixture);
  reducedMotionButton.removeEventListener('click', toggleReducedMotion); hiddenPageButton.removeEventListener('click', toggleHiddenPage);
  restoreEnvironment();
  if (window.fetch === fixtureFetch) window.fetch = originalFetch;
  if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor); else Reflect.deleteProperty(window, 'localStorage');
});
