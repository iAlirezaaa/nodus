/// <reference types="vite/client" />
import { SharedFixtureServer, fixtureProfiles, seedSharedFixture, type FixtureActor, type FixtureReply, type FixtureRequest, type SharedFixtureState } from './shared-fixture-server';
import { validateWorkspace } from '../../lib/server/validation';

export interface SharedFixtureBridge { request(actor: FixtureActor, request: FixtureRequest): Promise<FixtureReply>; }
declare global { interface Window { __nodusSharedFixture?: SharedFixtureBridge; } }
if (!import.meta.env.DEV || !['/tests/browser/shared-fixture.html', '/tests/browser/shared-fixture'].includes(location.pathname)) throw new Error('The shared UI fixture only runs from its isolated development page.');
const KEY = 'nodus:ui-fixture:shared:server:v1';
function restore(): SharedFixtureState {
  try {
    const state = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as SharedFixtureState | null;
    if (state?.version === 1 && Array.isArray(state.rooms) && state.personal?.owner && state.personal?.editor) {
      for (const item of [...state.rooms, state.personal.owner, state.personal.editor]) { validateWorkspace(item.document); if (item.document.nodes.some(node => node.asset !== null)) throw new Error('Real assets are not allowed in this fixture.'); }
      return state;
    }
  } catch { /* Only synthetic state is reseeded. */ }
  return seedSharedFixture();
}
const status = document.getElementById('fixture-status')!;
const ownerOffline = document.getElementById('owner-offline') as HTMLInputElement;
const editorOffline = document.getElementById('editor-offline') as HTMLInputElement;
const dropButton = document.getElementById('drop-ack')!;
let dropAcknowledgement = false;
let server = new SharedFixtureServer(restore(), state => { sessionStorage.setItem(KEY, JSON.stringify(state)); });
function badge() {
  const room = server.state.rooms.find(item => item.id === 'fixture-room')!;
  status.textContent = `writes ${server.state.writes} · revision ${room.revision} · nodes ${room.document.nodes.length} · edges ${room.document.edges.length}`;
  status.dataset.writeCount = String(server.state.writes); status.dataset.revision = String(room.revision);
  status.dataset.nodeCount = String(room.document.nodes.length); status.dataset.edgeCount = String(room.document.edges.length);
}
const bridge: SharedFixtureBridge = { async request(actor, request) {
  if (!['owner', 'editor'].includes(actor)) throw new Error('Unknown synthetic actor.');
  if (actor === 'owner' ? ownerOffline.checked : editorOffline.checked) throw new TypeError('Synthetic network is offline. Your local changes remain in this fixture.');
  const result = server.handle(actor, request); badge();
  if (actor === 'owner' && request.method === 'PATCH' && result.status === 200 && dropAcknowledgement) {
    dropAcknowledgement = false; dropButton.textContent = 'Drop next A save response';
    throw new TypeError('Synthetic response lost after the server committed the operation. Retry is safe.');
  }
  return structuredClone(result);
} };
window.__nodusSharedFixture = bridge;
function openFrames() {
  for (const actor of ['owner', 'editor'] as const) (document.getElementById(`session-${actor}`) as HTMLIFrameElement).src = `./shared-session.html?actor=${actor}&room=fixture-room`;
}
function reset() {
  // Destroy both old sessions before replacing their synthetic canonical state.
  for (const actor of ['owner', 'editor'] as const) (document.getElementById(`session-${actor}`) as HTMLIFrameElement).src = 'about:blank';
  const prefixes = Object.values(fixtureProfiles).flatMap(profile => [`nodus:shared:draft:${profile.userId}:`, `nodus:shared:recovery:${profile.userId}:`, `nodus:annotation-draft:v1:${encodeURIComponent(`${profile.userId}:`)}`]);
  for (const key of Object.keys(sessionStorage)) if (prefixes.some(prefix => key.startsWith(prefix))) sessionStorage.removeItem(key);
  server = new SharedFixtureServer(seedSharedFixture(), state => { sessionStorage.setItem(KEY, JSON.stringify(state)); });
  sessionStorage.setItem(KEY, JSON.stringify(server.state)); ownerOffline.checked = false; editorOffline.checked = false; dropAcknowledgement = false;
  dropButton.textContent = 'Drop next A save response'; badge(); openFrames();
}
document.getElementById('fixture-reset')!.addEventListener('click', reset);
document.getElementById('mobile-frames')!.addEventListener('change', event => {
  document.body.classList.toggle('mobile-frames', (event.currentTarget as HTMLInputElement).checked);
});
dropButton.addEventListener('click', () => { dropAcknowledgement = !dropAcknowledgement; dropButton.textContent = dropAcknowledgement ? 'Next A save response will be dropped' : 'Drop next A save response'; });
for (const [control, actor] of [[ownerOffline, 'owner'], [editorOffline, 'editor']] as const) control.addEventListener('change', () => { if (!control.checked) (document.getElementById(`session-${actor}`) as HTMLIFrameElement).contentWindow?.dispatchEvent(new Event('online')); });
badge(); openFrames();
if (import.meta.hot) import.meta.hot.dispose(() => { if (window.__nodusSharedFixture === bridge) delete window.__nodusSharedFixture; });
