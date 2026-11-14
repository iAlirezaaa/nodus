import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedWorkspaceStore } from '../hooks/shared-workspace-store.ts';
import { SharedFixtureServer, fixtureProfiles, type FixtureActor, type FixtureRequest } from './browser/shared-fixture-server.ts';
import { addEdge, addNode, makeNode } from '../lib/graph.ts';
import type { Workspace } from '../lib/types.ts';

const workspace = (): Workspace => ({ version: 1, homeBoardId: 'root',
  boards: [{ id: 'root', title: 'Shared board', description: '', parentNodeId: null, createdAt: '2026-01-01' }],
  nodes: ['first', 'second'].map((id, index) => ({ id, boardId: 'root', kind: 'note', title: `${id} original`, text: '', x: index * 400, y: 0, width: 244, height: 172, color: 'sage', asset: null, url: '', childBoardId: null, createdAt: '2026-01-01' })), edges: [] });
function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
function fixture() {
  const server = new SharedFixtureServer();
  server.state.rooms[0].document = workspace();
  return server;
}
function fetcher(server: SharedFixtureServer, actor: FixtureActor | (() => FixtureActor), intercept?: (request: FixtureRequest, next: () => Response) => Promise<Response>): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'https://fixture.invalid');
    const request: FixtureRequest = { path: url.pathname + url.search, method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) };
    const next = () => { const response = server.handle(typeof actor === 'function' ? actor() : actor, request); return Response.json(response.body, { status: response.status }); };
    return intercept ? intercept(request, next) : next();
  };
}
function store(server: SharedFixtureServer, actor: FixtureActor, options: Partial<ConstructorParameters<typeof SharedWorkspaceStore>[0]> = {}) {
  return new SharedWorkspaceStore({ roomId: 'fixture-room', language: 'en', storage: memoryStorage(), debounceMs: 60_000, pollMs: 0, fetcher: fetcher(server, actor), ...options });
}
const edit = (id: string, patch: Partial<Workspace['nodes'][number]>) => (doc: Workspace): Workspace => ({ ...doc, nodes: doc.nodes.map(node => node.id === id ? { ...node, ...patch } : node) });
const node = (doc: Workspace | null, id = 'first') => doc!.nodes.find(item => item.id === id)!;
const canonical = (server: SharedFixtureServer) => server.state.rooms[0].document;

test('concurrent disjoint fields converge, including pending edits rebased by a poll', async () => {
  const server = fixture(), a = store(server, 'owner'), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]);
  a.update(edit('first', { title: 'Owner title' }));
  b.update(edit('first', { text: 'Peer notes' }));
  await b.flush(); await a.poll();
  assert.equal(node(a.exportDraft()).title, 'Owner title');
  assert.equal(node(a.exportDraft()).text, 'Peer notes');
  assert.equal(a.hasPendingChanges(), true);
  await a.flush(); await b.poll();
  assert.deepEqual(a.exportDraft(), b.exportDraft());
  assert.equal(node(canonical(server)).title, 'Owner title');
  assert.equal(node(canonical(server)).text, 'Peer notes');
  assert.equal(a.getSnapshot().saveState, 'saved');
  a.suspend(); b.suspend();
});

test('overlapping edits keep the local draft; recovery keeps both versions with new identifiers', async () => {
  const server = fixture(), storage = memoryStorage(), a = store(server, 'owner', { storage }), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]);
  a.update(edit('first', { title: 'My unsaved version' })); b.update(edit('first', { title: 'Peer version' }));
  await b.flush(); await a.flush();
  assert.equal(a.getSnapshot().saveState, 'conflict');
  assert.equal(a.hasPendingChanges(), true);
  assert.equal(node(a.exportDraft()).title, 'My unsaved version');
  assert.equal(node(canonical(server)).title, 'Peer version');
  assert.ok(storage.getItem('nodus:shared:draft:fixture-collab-owner:fixture-room'));
  a.update(edit('first', { text: 'Keep writing after conflict' }));
  await a.reload();
  assert.equal(node(a.exportDraft()).title, 'Peer version');
  assert.equal(a.getSnapshot().hasRecovery, true);
  assert.equal(node(a.getRecoveryDocument()).text, 'Keep writing after conflict');
  await a.recoverDraft();
  assert.equal(canonical(server).nodes.length, 4);
  assert.equal(node(canonical(server)).title, 'Peer version');
  const recovered = canonical(server).nodes.find(item => item.title === 'My unsaved version')!;
  assert.notEqual(recovered.id, 'first'); assert.equal(recovered.text, 'Keep writing after conflict');
  assert.equal(a.getSnapshot().hasRecovery, false);
  assert.equal(storage.values.size, 0);
  a.suspend(); b.suspend();
});

test('own undo and redo preserve peer edits and reject an undo of an overwritten field', async () => {
  const server = fixture(), a = store(server, 'owner'), b = store(server, 'editor');
  await a.load(); a.update(edit('first', { title: 'Owner title' })); await a.flush();
  await b.load(); b.update(edit('first', { text: 'Peer text' })); await b.flush(); await a.poll();
  a.undo(); await a.flush();
  assert.equal(node(canonical(server)).title, 'first original'); assert.equal(node(canonical(server)).text, 'Peer text');
  a.redo(); await a.flush();
  assert.equal(node(canonical(server)).title, 'Owner title'); assert.equal(node(canonical(server)).text, 'Peer text');
  await b.poll(); b.update(edit('first', { title: 'Peer later title' })); await b.flush(); await a.poll();
  const writes = server.state.writes;
  a.undo(); await a.flush();
  assert.equal(node(a.exportDraft()).title, 'Peer later title');
  assert.equal(server.state.writes, writes);
  assert.match(a.getSnapshot().error ?? '', /cannot replace/);
  a.suspend(); b.suspend();
});

test('undo cannot delete an own node that has acquired a peer connection', async () => {
  const server = fixture(), a = store(server, 'owner'), b = store(server, 'editor');
  await a.load(); const added = makeNode('root', 'note', 200, 500, { title: 'New thought' });
  a.update(doc => addNode(doc, added)); await a.flush();
  await b.load(); b.update(doc => addEdge(doc, 'first', added.id)); await b.flush(); await a.poll();
  a.undo();
  assert.ok(a.exportDraft()!.nodes.some(item => item.id === added.id));
  assert.equal(a.exportDraft()!.edges.length, 1);
  assert.equal(a.hasPendingChanges(), false);
  assert.match(a.getSnapshot().error ?? '', /cannot replace/);
  a.suspend(); b.suspend();
});

test('edits made during a PATCH use a second guarded batch and keep peer fields', async () => {
  const server = fixture(); let release!: () => void; let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  let first = true; const requests: unknown[] = [];
  const a = store(server, 'owner', { fetcher: fetcher(server, 'owner', async (request, next) => {
    if (request.method === 'PATCH') { requests.push(request.body); if (first) { first = false; started(); await new Promise<void>(resolve => { release = resolve; }); } }
    return next();
  }) }), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]);
  a.update(edit('first', { title: 'First local' })); const saving = a.flush(); await began;
  a.update(edit('first', { title: 'Latest local' }));
  b.update(edit('first', { text: 'Peer arrived during flight' })); await b.flush();
  release(); await saving;
  assert.equal(requests.length, 2);
  assert.equal(node(canonical(server)).title, 'Latest local');
  assert.equal(node(canonical(server)).text, 'Peer arrived during flight');
  assert.equal(a.hasPendingChanges(), false);
  a.suspend(); b.suspend();
});

test('lost acknowledgement retries the same operationId without double applying, then sends later edits', async () => {
  const server = fixture(), ids: string[] = []; let lose = true;
  const a = store(server, 'owner', { fetcher: fetcher(server, 'owner', async (request, next) => {
    const response = next();
    if (request.method === 'PATCH') { ids.push((request.body as { operationId: string }).operationId); if (lose) { lose = false; throw new TypeError('Response lost'); } }
    return response;
  }) });
  await a.load(); a.update(edit('first', { title: 'Committed before response loss' })); await a.flush();
  assert.equal(a.getSnapshot().saveState, 'offline'); assert.equal(a.hasPendingChanges(), true); assert.equal(server.state.writes, 1);
  a.update(edit('second', { text: 'Typed while offline' })); await a.retry();
  assert.equal(ids[0], ids[1]); assert.notEqual(ids[1], ids[2]);
  assert.equal(server.state.writes, 2); assert.equal(node(canonical(server), 'second').text, 'Typed while offline');
  assert.equal(a.hasPendingChanges(), false); a.suspend();
});

test('inline pause freezes untouched peer fields in PATCH acknowledgements across Enter to another draft', async () => {
  const server = fixture(), a = store(server, 'owner'), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]);
  a.setRemotePaused(true);
  b.update(edit('second', { title: 'Peer changed next title' })); await b.flush();
  a.update(edit('first', { title: 'First inline commit' })); await a.flush();
  assert.equal(a.getSnapshot().saveState, 'saved');
  assert.equal(node(a.exportDraft(), 'second').title, 'second original', 'The next input still sees its original editing baseline.');
  a.update(edit('second', { title: 'Second inline commit' })); await a.flush();
  assert.equal(a.getSnapshot().saveState, 'conflict');
  assert.equal(node(canonical(server), 'second').title, 'Peer changed next title');
  assert.equal(node(a.exportDraft(), 'second').title, 'Second inline commit');
  assert.equal(node(canonical(server)).title, 'First inline commit');
  a.setRemotePaused(false); a.suspend(); b.suspend();
});

test('unpausing applies deferred peer data without replacing pending disjoint edits', async () => {
  const server = fixture(), a = store(server, 'owner'), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]); a.setRemotePaused(true);
  b.update(edit('second', { title: 'Peer title' })); await b.flush();
  a.update(edit('first', { title: 'Own title' })); await a.flush();
  a.update(edit('first', { text: 'Unsent own notes' })); a.setRemotePaused(false);
  assert.equal(node(a.exportDraft(), 'second').title, 'Peer title');
  assert.equal(node(a.exportDraft()).text, 'Unsent own notes');
  await a.flush(); assert.equal(a.hasPendingChanges(), false);
  a.suspend(); b.suspend();
});

test('a GET already in flight cannot overwrite a newly opened inline editor', async () => {
  const server = fixture(); let release!: () => void, began!: () => void, delay = false;
  const waiting = new Promise<void>(resolve => { began = resolve; });
  const a = store(server, 'owner', { fetcher: fetcher(server, 'owner', async (request, next) => {
    if (delay && request.method === 'GET') { began(); await new Promise<void>(resolve => { release = resolve; }); }
    return next();
  }) }), b = store(server, 'editor');
  await Promise.all([a.load(), b.load()]); b.update(edit('first', { title: 'Peer revised' })); await b.flush();
  delay = true; const polling = a.poll(); await waiting; a.setRemotePaused(true); release(); await polling;
  assert.equal(node(a.exportDraft()).title, 'first original');
  a.suspend(); b.suspend();
});

test('drafts stay scoped to room and account; account changes freeze writes until explicit reload', async () => {
  const server = fixture(), storage = memoryStorage(); let actor: FixtureActor = 'owner';
  const a = store(server, 'owner', { storage, fetcher: fetcher(server, () => actor) });
  await a.load(); a.update(edit('first', { title: 'Private pending owner edit' }));
  actor = 'editor'; await a.poll();
  assert.equal(a.getSnapshot().readOnly, true); assert.equal(a.hasPendingChanges(), true);
  const local = a.exportDraft(); a.update(edit('first', { title: 'Should not run' })); assert.equal(a.exportDraft(), local);
  assert.ok(storage.getItem('nodus:shared:draft:fixture-collab-owner:fixture-room'));
  await a.reload(); assert.equal(a.getUserId(), fixtureProfiles.editor.userId); assert.equal(a.getSnapshot().hasRecovery, false);
  assert.equal(node(a.exportDraft()).title, 'first original');
  server.state.rooms.push({ ...server.state.rooms[0], id: 'another-room' });
  const other = store(server, 'owner', { storage, roomId: 'another-room' }); await other.load();
  assert.equal(other.getSnapshot().hasRecovery, false); assert.equal(other.getRecoveryDocument(), null);
  a.suspend(); other.suspend();
});

test('revocation makes the room read-only while preserving an unsent editor draft', async () => {
  const server = fixture(), storage = memoryStorage(), b = store(server, 'editor', { storage });
  await b.load(); b.update(edit('first', { title: 'Retained after revoke' }));
  server.handle('owner', { path: '/api/rooms/fixture-room/members', method: 'DELETE', headers: { 'x-nodus-user-id': fixtureProfiles.owner.userId }, body: { email: fixtureProfiles.editor.email } });
  await b.flush();
  assert.equal(b.getSnapshot().readOnly, true); assert.equal(b.hasPendingChanges(), true);
  assert.equal(node(b.exportDraft()).title, 'Retained after revoke');
  assert.ok(storage.getItem('nodus:shared:draft:fixture-collab-editor:fixture-room'));
  assert.equal(node(canonical(server)).title, 'first original'); b.suspend();
});

test('suspend ignores stale load and write responses and retains recoverable data', async () => {
  const server = fixture(); let releaseLoad!: () => void, beginLoad!: () => void;
  const startedLoad = new Promise<void>(resolve => { beginLoad = resolve; });
  const unloaded = store(server, 'owner', { fetcher: fetcher(server, 'owner', async (_request, next) => { beginLoad(); await new Promise<void>(resolve => { releaseLoad = resolve; }); return next(); }) });
  const load = unloaded.load(); await startedLoad; unloaded.suspend(); releaseLoad(); await load;
  assert.equal(unloaded.exportDraft(), null);
  const storage = memoryStorage(); let releaseSave!: () => void, beginSave!: () => void;
  const startedSave = new Promise<void>(resolve => { beginSave = resolve; });
  const savingStore = store(server, 'owner', { storage, fetcher: fetcher(server, 'owner', async (request, next) => {
    if (request.method === 'PATCH') { beginSave(); await new Promise<void>(resolve => { releaseSave = resolve; }); }
    return next();
  }) });
  await savingStore.load(); savingStore.update(edit('first', { title: 'Old room outgoing draft' }));
  const saving = savingStore.flush(); await startedSave; savingStore.suspend(); releaseSave(); await saving;
  assert.equal(savingStore.hasPendingChanges(), true);
  assert.ok(storage.getItem('nodus:shared:draft:fixture-collab-owner:fixture-room'));
});

test('storage errors remain visible and hidden rooms do not poll', async () => {
  const server = fixture(); let reads = 0;
  const a = store(server, 'owner', { storage: { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('quota'); } },
    fetcher: fetcher(server, 'owner', async (request, next) => { if (request.method === 'GET') reads++; return next(); }) });
  await a.load(); a.update(edit('first', { title: 'Unprotected edit' }));
  assert.match(a.getSnapshot().draftWarning ?? '', /Keep this page open/);
  a.setVisible(false); await a.poll(); assert.equal(reads, 1); a.suspend();
});
