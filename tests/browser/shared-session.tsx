/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client';
import NodusApp from '../../components/NodusApp';
import type { SharedFixtureBridge } from './shared-fixture';
import type { FixtureActor } from './shared-fixture-server';
import '../../app/globals.css';

if (!import.meta.env.DEV || !['/tests/browser/shared-session.html', '/tests/browser/shared-session'].includes(location.pathname)) throw new Error('This synthetic session is development-only.');
const actor = new URLSearchParams(location.search).get('actor') as FixtureActor;
if (!['owner', 'editor'].includes(actor) || parent === window || parent.location.origin !== location.origin) throw new Error('Open this session through the isolated shared fixture.');
const bridge = (parent as Window & { __nodusSharedFixture?: SharedFixtureBridge }).__nodusSharedFixture;
if (!bridge) throw new Error('The synthetic shared server is unavailable.');
const originalFetch = window.fetch.bind(window);
const fixtureFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (!/^\/api(?:\/|$)/.test(url.pathname)) return originalFetch(input, init);
  if (url.origin !== location.origin) return Response.json({ error: 'fixture_isolation', message: 'This fixture cannot call another API origin.' }, { status: 403 });
  const request = new Request(input instanceof Request ? input : url.href, init);
  if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
  const text = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  const result = await bridge.request(actor, { path: url.pathname + url.search, method: request.method, headers: Object.fromEntries(request.headers.entries()), ...(text ? { body: JSON.parse(text) } : {}) });
  if (request.signal.aborted) throw new DOMException('The synthetic request was aborted.', 'AbortError');
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store', 'X-Nodus-Test-Fixture': actor } });
};
window.fetch = fixtureFetch;
const root = createRoot(document.getElementById('fixture-root')!);
root.render(<NodusApp initialRoomId={new URL(window.location.href).searchParams.get('room')} />);
if (import.meta.hot) import.meta.hot.dispose(() => { root.unmount(); if (window.fetch === fixtureFetch) window.fetch = originalFetch; });
