import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { validateWorkspace, validateSavePayload, isSafeWebUrl } from '../lib/server/validation.ts';
import { requireIdentity, assertExpectedIdentity, assertSameOrigin, readLimitedJson } from '../lib/server/security.ts';
import { canInline, detectedMime, parseRange, readUploadedFile } from '../lib/server/files.ts';
import { loadWorkspace, saveWorkspace, findAsset } from '../lib/server/store.ts';

const now = '2026-11-12T00:00:00.000Z';
const board = (id, parentNodeId = null) => ({ id, title: id, description: '', parentNodeId, createdAt: now });
const node = (id, boardId = 'root') => ({ id, boardId, kind: 'note', title: id, text: '', x: 0, y: 0, width: 244, height: 172, color: 'sage', asset: null, url: '', childBoardId: null, createdAt: now });
function workspace() { return { version: 1, homeBoardId: 'root', boards: [board('root')], nodes: [node('a'), node('b')], edges: [{ id: 'edge', boardId: 'root', sourceId: 'a', targetId: 'b', label: '' }] }; }
const expectStatus = status => error => error.status === status;

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const directory = new URL('../drizzle/', import.meta.url);
  assert.ok(existsSync(directory), 'Generate the schema migration before persistence tests.');
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, directory), 'utf8'));
  const db = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    function bound(values = []) { return {
      bind(...next) { return bound(next); },
      async first() { return statement.get(...values) ?? null; },
      async all() { return { results: statement.all(...values), success: true, meta: {} }; },
      async run() { const result = statement.run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    }; }
    return bound();
  } };
  return { db, sqlite };
}

test('accepts arbitrary graph cycles and 25 branches, independently from nesting', () => {
  const doc = workspace();
  doc.edges.push({ id: 'back', boardId: 'root', sourceId: 'b', targetId: 'a', label: '' });
  for (let i = 0; i < 25; i++) {
    doc.nodes.push(node(`branch-${i}`));
    doc.edges.push({ id: `branch-edge-${i}`, boardId: 'root', sourceId: 'a', targetId: `branch-${i}`, label: '' });
  }
  doc.nodes[0].childBoardId = 'nested';
  doc.boards.push(board('nested', 'a'));
  doc.nodes.push(node('child', 'nested'));
  assert.equal(validateWorkspace(doc), doc);
});

test('rejects missing references, cross-board edges, duplicate ids, non-finite positions, unsafe links', () => {
  const cases = [
    doc => { doc.edges[0].targetId = 'missing'; },
    doc => { doc.boards.push(board('other')); doc.nodes[1].boardId = 'other'; },
    doc => { doc.nodes.push(structuredClone(doc.nodes[0])); },
    doc => { doc.nodes[0].x = NaN; },
    doc => { doc.nodes[0].url = 'javascript:alert(1)'; },
    doc => { doc.nodes[0].asset = { id: 'asset', name: 'x', mime: 'image/png', size: 8, url: 'https://evil.test/x' }; },
  ];
  for (const change of cases) { const doc = workspace(); change(doc); assert.throws(() => validateWorkspace(doc), expectStatus(400)); }
  assert.equal(isSafeWebUrl('https://example.com/path?q=1'), true);
  assert.equal(isSafeWebUrl('https://user:password@example.com'), false);
});

test('rejects broken reciprocal containment and containment cycles', () => {
  const broken = workspace();
  broken.nodes[0].childBoardId = 'child'; broken.boards.push(board('child'));
  assert.throws(() => validateWorkspace(broken), expectStatus(400));
  const cyclic = workspace();
  cyclic.boards.push(board('one', 'n2'), board('two', 'n1'));
  const first = node('n1', 'one'); first.childBoardId = 'two';
  const second = node('n2', 'two'); second.childBoardId = 'one';
  cyclic.nodes.push(first, second);
  assert.throws(() => validateWorkspace(cyclic), expectStatus(400));
});

test('save payload requires an integer revision', () => {
  for (const revision of [-1, 0.5, '0', null]) assert.throws(() => validateSavePayload({ document: workspace(), revision }), expectStatus(400));
  assert.equal(validateSavePayload({ document: workspace(), revision: 0 }).revision, 0);
});

test('authentication and cross-origin protection reject unauthorized writes', () => {
  const request = new Request('https://nodus.test/api/workspace');
  assert.throws(() => requireIdentity(request), expectStatus(401));
  assert.throws(() => requireIdentity(new Request(request, { headers: { 'oai-authenticated-user-id': 'owner' } })), expectStatus(401));
  assert.equal(requireIdentity(new Request(request, { headers: { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.com' } })), 'owner');
  assert.throws(() => assertSameOrigin(new Request(request, { headers: { Origin: 'https://evil.test' } })), expectStatus(403));
  assert.throws(() => assertSameOrigin(new Request(request, { headers: { 'Sec-Fetch-Site': 'cross-site' } })), expectStatus(403));
  assertSameOrigin(new Request(request, { headers: { Origin: 'https://nodus.test' } }));
});

test('streamed JSON body cannot evade its size limit', async () => {
  const request = new Request('https://nodus.test/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(100) }) });
  await assert.rejects(readLimitedJson(request, 30), expectStatus(413));
});

test('a tab cannot save its old account document after the authenticated account changes', () => {
  const request = expected => new Request('https://nodus.test/api/workspace', {
    method: 'PUT', headers: { 'oai-authenticated-user-id': 'new-account', 'oai-authenticated-user-email': 'new@example.com', ...(expected ? { 'X-Nodus-User-Id': expected } : {}) },
  });
  const stale = request('old-account');
  assert.throws(() => assertExpectedIdentity(stale, requireIdentity(stale)), error => error.status === 401 && error.code === 'account_changed');
  const missing = request(null);
  assert.throws(() => assertExpectedIdentity(missing, requireIdentity(missing)), expectStatus(401));
  const current = request('new-account');
  assertExpectedIdentity(current, requireIdentity(current));
});

test('only detected safe files become inline content', async () => {
  const fakePng = new File(['<svg onload="alert(1)"></svg>'], 'danger.png', { type: 'image/png' });
  assert.equal(await detectedMime(fakePng), 'application/octet-stream');
  assert.equal(canInline('image/svg+xml'), false);
  assert.equal(canInline('text/html'), false);
  assert.equal(canInline(await detectedMime(new File(['%PDF-1.7\n'], 'a.pdf', { type: 'application/pdf' }))), true);
  const form = new FormData(); form.append('file', new File(['hello'], 'hello.txt'));
  const uploaded = await readUploadedFile(new Request('https://nodus.test/api/assets', { method: 'POST', body: form }));
  assert.equal(await uploaded.text(), 'hello');
});

test('media byte ranges handle full, open, suffix, clamping and invalid ranges', () => {
  assert.equal(parseRange(null, 100), null);
  assert.deepEqual(parseRange('bytes=20-29', 100), { offset: 20, length: 10 });
  assert.deepEqual(parseRange('bytes=20-', 100), { offset: 20, length: 80 });
  assert.deepEqual(parseRange('bytes=-15', 100), { offset: 85, length: 15 });
  assert.deepEqual(parseRange('bytes=90-200', 100), { offset: 90, length: 10 });
  for (const range of ['bytes=100-', 'bytes=-0', 'bytes=50-10', 'bytes=0-1,4-5', 'bananas']) assert.throws(() => parseRange(range, 100), expectStatus(416));
});

test('actual SQLite save is isolated by user and rejects stale creation/update revisions', async () => {
  const { db, sqlite } = database();
  try {
    assert.deepEqual(await loadWorkspace(db, 'owner'), { document: null, revision: 0, updatedAt: null, userId: 'owner' });
    const document = workspace();
    assert.equal((await saveWorkspace(db, 'owner', document, 0)).revision, 1);
    await assert.rejects(saveWorkspace(db, 'owner', document, 0), expectStatus(409));
    const newer = structuredClone(document); newer.nodes[0].title = 'new title';
    assert.equal((await saveWorkspace(db, 'owner', newer, 1)).revision, 2);
    await assert.rejects(saveWorkspace(db, 'owner', document, 1), error => error.status === 409 && error.details.revision === 2);
    assert.equal((await loadWorkspace(db, 'owner')).document.nodes[0].title, 'new title');
    assert.equal((await loadWorkspace(db, 'stranger')).document, null);
    assert.equal((await saveWorkspace(db, 'stranger', document, 0)).revision, 1);
    assert.equal((await loadWorkspace(db, 'owner')).revision, 2);
  } finally { sqlite.close(); }
});

test('asset references must exist, match originals and belong to the saving user', async () => {
  const { db, sqlite } = database();
  try {
    sqlite.prepare('INSERT INTO assets (id, user_id, storage_key, name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('asset', 'owner', 'assets/asset', 'original.pdf', 'application/pdf', 100, now);
    const doc = workspace();
    doc.nodes[0].asset = { id: 'asset', name: 'original.pdf', mime: 'application/pdf', size: 100, url: '/api/assets/asset' };
    await saveWorkspace(db, 'owner', doc, 0);
    await assert.rejects(saveWorkspace(db, 'stranger', doc, 0), expectStatus(400));
    assert.equal(await findAsset(db, 'stranger', 'asset'), null);
    doc.nodes[0].asset.mime = 'image/png';
    await assert.rejects(saveWorkspace(db, 'owner', doc, 1), expectStatus(400));
  } finally { sqlite.close(); }
});
