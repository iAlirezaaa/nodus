import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore -- Node's native TypeScript test runner requires the source extension.
import { WorkspaceStore, copyWorkspaceAsRoots } from '../hooks/workspace-store.ts';
import type { Workspace } from '../lib/types';

function workspace(title = 'Cloud idea'): Workspace {
  return {
    version: 1, homeBoardId: 'root',
    boards: [{ id: 'root', title: 'My board', description: '', parentNodeId: null, createdAt: '2026-01-01' }],
    nodes: [{ id: 'node', boardId: 'root', kind: 'note', title, text: '', x: 0, y: 0, width: 244, height: 172,
      color: 'sage', asset: null, url: '', childBoardId: null, createdAt: '2026-01-01' }], edges: [],
  };
}
function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const remote = (document: Workspace | null, revision = 1, userId = 'owner') => json({ document, revision, updatedAt: '2026-01-01', userId });
function edit(title: string) { return (doc: Workspace): Workspace => ({ ...doc, nodes: doc.nodes.map(node => ({ ...node, title })) }); }

test('serializes edits made during an in-flight save with the acknowledged revision', async () => {
  const writes: { document: Workspace; revision: number }[] = [];
  let release!: (response: Response) => void;
  let saved = workspace();
  const store = new WorkspaceStore({ makeWorkspace: workspace, storage: memoryStorage(), debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(saved);
      assert.equal(new Headers(init.headers).get('X-Nodus-User-Id'), 'owner');
      const payload = JSON.parse(String(init.body)); writes.push(payload);
      if (writes.length === 1) return new Promise<Response>(resolve => { release = resolve; });
      saved = payload.document;
      return json({ revision: 3, updatedAt: 'second' });
    }) as typeof fetch,
  });
  await store.load();
  store.update(edit('First edit'));
  const saving = store.flush();
  await Promise.resolve();
  store.update(edit('Latest edit'));
  assert.equal(store.getSnapshot().saveState, 'saving');
  release(json({ revision: 2, updatedAt: 'first' }));
  await saving;
  assert.equal(writes.length, 2);
  assert.equal(writes[0].document.nodes[0].title, 'First edit');
  assert.equal(writes[1].document.nodes[0].title, 'Latest edit');
  assert.equal(writes[1].revision, 2);
  assert.equal(store.getSnapshot().saveState, 'saved');
  assert.equal(store.hasPendingChanges(), false);
  store.suspend();
});

test('initial request failure never creates a seed workspace or sends a write', async () => {
  let seeds = 0;
  let requests = 0;
  const store = new WorkspaceStore({ makeWorkspace: () => { seeds++; return workspace(); }, storage: memoryStorage(),
    fetcher: (async () => { requests++; return json({ error: 'Sign in required.' }, 401); }) as typeof fetch });
  await store.load();
  assert.equal(seeds, 0);
  assert.equal(requests, 1);
  assert.equal(store.getSnapshot().document, null);
  assert.equal(store.getSnapshot().saveState, 'offline');
  assert.match(store.getSnapshot().error ?? '', /Sign in/);
  store.suspend();
});

test('first-use workspace is saved and only becomes saved after acknowledgement', async () => {
  let writes = 0;
  const store = new WorkspaceStore({ makeWorkspace: workspace, storage: memoryStorage(), debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(null, 0);
      writes++;
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.revision, 0);
      return json({ revision: 1, updatedAt: 'first' });
    }) as typeof fetch });
  await store.load();
  assert.equal(store.getSnapshot().saveState, 'pending');
  await store.flush();
  assert.equal(writes, 1);
  assert.equal(store.getSnapshot().saveState, 'saved');
  store.suspend();
});

test('conflicts stop writes until explicitly resolved, preserving both versions with new IDs', async () => {
  let conflict = true;
  let writes = 0;
  let saved = workspace('Original');
  const store = new WorkspaceStore({ makeWorkspace: workspace, storage: memoryStorage(), debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(saved, conflict ? 1 : 2);
      writes++;
      if (conflict) return json({ error: 'Another tab saved first.' }, 409);
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.revision, 2);
      saved = payload.document;
      return json({ revision: 3, updatedAt: 'merged' });
    }) as typeof fetch });
  await store.load();
  store.update(edit('Local edit'));
  await store.flush();
  assert.equal(store.getSnapshot().saveState, 'conflict');
  store.update(edit('Local edit retained'));
  await store.flush();
  await store.retry();
  assert.equal(writes, 1);
  saved = workspace('Other tab'); conflict = false;
  await store.resolveConflict();
  assert.equal(saved.nodes.length, 2);
  assert.equal(saved.nodes[0].title, 'Other tab');
  assert.equal(saved.nodes[1].title, 'Local edit retained');
  assert.notEqual(saved.nodes[1].id, 'node');
  assert.notEqual(saved.boards[1].id, 'root');
  assert.equal(saved.homeBoardId, 'root');
  assert.equal(store.getSnapshot().saveState, 'saved');
  store.suspend();
});

test('offline draft survives reload and same-revision recovery waits for acknowledgement', async () => {
  const storage = memoryStorage();
  const first = new WorkspaceStore({ makeWorkspace: workspace, storage, debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(workspace(), 7);
      throw new Error('Network unavailable');
    }) as typeof fetch });
  await first.load(); first.update(edit('Recover this thought')); await first.flush(); first.suspend();
  assert.equal(first.getSnapshot().saveState, 'offline');
  let restored: Workspace | null = null;
  const second = new WorkspaceStore({ makeWorkspace: workspace, storage, debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(workspace(), 7);
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.revision, 7); restored = payload.document;
      return json({ revision: 8, updatedAt: 'recovered' });
    }) as typeof fetch });
  await second.load();
  assert.equal(second.getSnapshot().document?.nodes[0].title, 'Cloud idea');
  assert.equal(second.getSnapshot().hasRecovery, true);
  assert.equal(second.getRecoveryDocument()?.nodes[0].title, 'Recover this thought');
  await second.recoverDraft();
  assert.equal((restored as Workspace | null)?.nodes[0].title, 'Recover this thought');
  assert.equal(second.getSnapshot().hasRecovery, false);
  assert.equal(storage.values.size, 0);
  second.suspend();
});

test('drafts are account-scoped and quota errors remain visible', async () => {
  const storage = memoryStorage();
  const owner = new WorkspaceStore({ makeWorkspace: workspace, storage, debounceMs: 60_000,
    fetcher: (async () => remote(workspace(), 1, 'owner')) as typeof fetch });
  await owner.load(); owner.update(edit('Private owner idea')); owner.suspend();
  const visitor = new WorkspaceStore({ makeWorkspace: workspace, storage, debounceMs: 60_000,
    fetcher: (async () => remote(workspace(), 1, 'visitor')) as typeof fetch });
  await visitor.load();
  assert.equal(visitor.getSnapshot().hasRecovery, false);
  assert.equal(visitor.getRecoveryDocument(), null);
  visitor.suspend();
  const full = new WorkspaceStore({ makeWorkspace: workspace,
    storage: { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('quota'); } }, debounceMs: 60_000,
    fetcher: (async () => remote(workspace())) as typeof fetch });
  await full.load(); full.update(edit('Unsaved'));
  assert.match(full.getSnapshot().draftWarning ?? '', /recovery storage/);
  full.suspend();
});

test('recovered roots preserve nested containment and asset references', () => {
  const source = workspace();
  source.nodes[0].childBoardId = 'child';
  source.nodes[0].asset = { id: 'asset', mime: 'image/png', name: 'reference.png', size: 10, url: '/api/assets/asset' };
  source.boards.push({ id: 'child', title: 'Nested project', description: '', parentNodeId: 'node', createdAt: '2026' });
  source.nodes.push({ ...source.nodes[0], id: 'child-node', boardId: 'child', title: 'Inside', childBoardId: null });
  const copied = copyWorkspaceAsRoots(workspace('Server'), source, 'en');
  const rootCopy = copied.nodes[1]; const childCopy = copied.nodes[2];
  const childBoard = copied.boards.find(board => board.id === rootCopy.childBoardId)!;
  assert.equal(childBoard.parentNodeId, rootCopy.id);
  assert.equal(childCopy.boardId, childBoard.id);
  assert.equal(rootCopy.asset?.id, 'asset');
  assert.equal(new Set(copied.nodes.map(node => node.id)).size, copied.nodes.length);
  assert.match(copied.boards[1].title, /Recovered/);
});

test('undo and redo persist through the same save queue', async () => {
  let revision = 1;
  let cloud = workspace();
  const store = new WorkspaceStore({ makeWorkspace: workspace, storage: memoryStorage(), debounceMs: 60_000,
    fetcher: (async (_url, init) => {
      if (init?.method !== 'PUT') return remote(cloud, revision);
      const body = JSON.parse(String(init.body)); assert.equal(body.revision, revision);
      cloud = body.document; return json({ revision: ++revision, updatedAt: 'now' });
    }) as typeof fetch });
  await store.load(); store.update(edit('A')); store.update(edit('B'));
  store.undo(); await store.flush(); assert.equal(cloud.nodes[0].title, 'A');
  assert.equal(store.getSnapshot().canRedo, true);
  store.redo(); await store.flush(); assert.equal(cloud.nodes[0].title, 'B');
  store.suspend();
});

test('default browser fetch keeps the global receiver for load and save', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async function (this: unknown, _input: RequestInfo | URL, init?: RequestInit) {
    assert.equal(this, globalThis, 'Native Window.fetch must not be invoked with WorkspaceStore as its receiver.');
    requests.push(init?.method ?? 'GET');
    return init?.method === 'PUT' ? json({ revision: 2, updatedAt: 'saved' }) : remote(workspace());
  };
  const store = new WorkspaceStore({ makeWorkspace: workspace, storage: memoryStorage(), debounceMs: 60_000 });
  try {
    await store.load();
    assert.equal(store.getSnapshot().error, null);
    store.update(edit('After load'));
    await store.flush();
    assert.equal(store.getSnapshot().saveState, 'saved');
    assert.deepEqual(requests, ['GET', 'PUT']);
  } finally {
    store.suspend();
    globalThis.fetch = originalFetch;
  }
});
