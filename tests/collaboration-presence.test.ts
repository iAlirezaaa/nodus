import test from 'node:test';
import assert from 'node:assert/strict';
import { CollaborationPresence } from '../hooks/collaboration-presence.ts';
import { SharedFixtureServer, fixtureProfiles, type FixtureActor, type FixtureRequest } from './browser/shared-fixture-server.ts';

function network(server: SharedFixtureServer, actor: FixtureActor, calls: FixtureRequest[] = []): typeof fetch {
  return async (input, init) => {
    const request: FixtureRequest = { path: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) };
    calls.push(request); const response = server.handle(actor, request); return Response.json(response.body, { status: response.status });
  };
}

test('two identities exchange actual world-space cursors, selections, and authenticated profile labels', async () => {
  const server = new SharedFixtureServer(), boardId = server.state.rooms[0].document.homeBoardId;
  const selected = server.state.rooms[0].document.nodes.find(node => node.boardId === boardId)!.id;
  const calls: FixtureRequest[] = [];
  const a = new CollaborationPresence({ roomId: 'fixture-room', userId: fixtureProfiles.owner.userId, sessionId: 'session-a', fetcher: network(server, 'owner', calls), pollMs: 0, heartbeatMs: 0 });
  const b = new CollaborationPresence({ roomId: 'fixture-room', userId: fixtureProfiles.editor.userId, sessionId: 'session-b', fetcher: network(server, 'editor'), pollMs: 0, heartbeatMs: 0 });
  a.setContext(boardId, selected); b.setContext(boardId, null); a.start(); b.start();
  a.reportPointer({ x: 123, y: -250 }); await a.send(); await b.send(); await b.refresh();
  assert.equal(b.getSnapshot().status, 'connected');
  assert.equal(b.getSnapshot().peers.length, 1);
  assert.equal(b.getSnapshot().peers[0].x, 123); assert.equal(b.getSnapshot().peers[0].y, -250);
  assert.equal(b.getSnapshot().peers[0].selectedNodeId, selected);
  assert.equal(a.getSnapshot().profileLabel, fixtureProfiles.owner.name);
  assert.equal(calls[0].headers['x-nodus-user-id'], fixtureProfiles.owner.userId);
  a.reportPointer(null); await a.send(); await b.refresh(); assert.equal(b.getSnapshot().peers[0].x, null);
  a.stop(); b.stop();
});

test('hidden presence sends nothing, unknown draft selections sanitize, and old cursors expire', async () => {
  const server = new SharedFixtureServer(), boardId = server.state.rooms[0].document.homeBoardId, calls: FixtureRequest[] = [];
  let now = Date.now();
  const a = new CollaborationPresence({ roomId: 'fixture-room', userId: fixtureProfiles.owner.userId, sessionId: 'session-a', now: () => now, fetcher: network(server, 'owner', calls), pollMs: 0, heartbeatMs: 0 });
  a.setContext(boardId, 'ephemeral-inline-draft'); a.start(); await a.send();
  assert.equal((server.handle('editor', { path: '/api/rooms/fixture-room/presence', method: 'GET', headers: {} }).body as { peers: { selectedNodeId: string | null }[] }).peers[0].selectedNodeId, null);
  a.setVisible(false); const count = calls.length; a.reportPointer({ x: 400, y: 200 }); await a.send(); await a.refresh(); assert.equal(calls.length, count);
  a.setVisible(true); await a.send();
  now += 20_000; await a.refresh(); assert.equal(a.getSnapshot().peers.length, 0); a.stop();
});

test('presence access errors are visible and stop further requests', async () => {
  const server = new SharedFixtureServer(), boardId = server.state.rooms[0].document.homeBoardId, calls: FixtureRequest[] = [];
  const b = new CollaborationPresence({ roomId: 'fixture-room', userId: fixtureProfiles.editor.userId, fetcher: network(server, 'editor', calls), pollMs: 0, heartbeatMs: 0 });
  b.setContext(boardId, null); b.start(); await b.send();
  server.handle('owner', { path: '/api/rooms/fixture-room/members', method: 'DELETE', headers: { 'x-nodus-user-id': fixtureProfiles.owner.userId }, body: { email: fixtureProfiles.editor.email } });
  await b.refresh(); assert.equal(b.getSnapshot().status, 'error'); assert.match(b.getSnapshot().error ?? '', /unavailable/);
  const count = calls.length; b.reportPointer({ x: 1, y: 2 }); await b.send(); await b.refresh(); assert.equal(calls.length, count); b.stop();
});

test('stopped presence ignores an in-flight response', async () => {
  let release!: (response: Response) => void, started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const presence = new CollaborationPresence({ roomId: 'fixture-room', userId: 'fixture-collab-owner', pollMs: 0, heartbeatMs: 0,
    fetcher: (async () => { started(); return new Promise<Response>(resolve => { release = resolve; }); }) as typeof fetch });
  presence.setContext('root', null); presence.start(); const sending = presence.send(); await began;
  presence.stop(); const before = presence.getSnapshot(); release(Response.json({ peers: [] })); await sending;
  assert.equal(presence.getSnapshot(), before);
});
