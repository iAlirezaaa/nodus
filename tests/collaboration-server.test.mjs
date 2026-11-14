import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createRoom, listRooms, readRoom, patchRoom, addRoomMember, removeRoomMember, getPresence, putPresence, requireRoomIdentity, normalizeMemberEmail, PRESENCE_TTL_MS } from '../lib/server/collaboration.ts';
import { diffWorkspace } from '../lib/collaboration.ts';
import { findReadableAsset, loadWorkspace, saveWorkspace, MAX_PERSISTED_DOCUMENT_BYTES } from '../lib/server/store.ts';

const owner = { userId: 'owner', email: 'owner@example.com', name: 'Owner' };
const editor = { userId: 'editor', email: 'editor@example.com', name: 'Editor' };
const outsider = { userId: 'stranger', email: 'stranger@example.com', name: 'Stranger' };
const now = '2026-11-12T00:00:00.000Z';
const node = id => ({ id, boardId: 'root', kind: 'note', title: id, text: '', x: 0, y: 0, width: 244, height: 172, color: 'sage', asset: null, url: '', childBoardId: null, createdAt: now });
const workspace = () => ({ version: 1, homeBoardId: 'root', boards: [{ id: 'root', title: 'Root', description: '', parentNodeId: null, createdAt: now }], nodes: [node('a'), node('b')], edges: [] });
const payload = (base, next, revision = 1, operationId = crypto.randomUUID()) => ({ revision, operations: diffWorkspace(base, next), operationId });
const status = value => error => error.status === value;

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const directory = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, directory), 'utf8'));
  let beforeBatch = null, beforeFirst = null;
  const db = {
    prepare(sql) {
      function bound(values = []) { return {
        sql, values,
        bind(...next) { return bound(next); },
        async first() {
          if (beforeFirst && beforeFirst.predicate(sql)) { const interceptor = beforeFirst; beforeFirst = null; await interceptor.handler(); }
          return sqlite.prepare(sql).get(...values) ?? null;
        },
        async all() { return { results: sqlite.prepare(sql).all(...values), success: true, meta: {} }; },
        async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
      }; }
      return bound();
    },
    async batch(statements) {
      if (beforeBatch) { const handler = beforeBatch; beforeBatch = null; handler(statements); }
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(({ sql, values }) => { const value = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(value.changes) } }; });
        sqlite.exec('COMMIT'); return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { db, sqlite, beforeBatch: callback => { beforeBatch = callback; }, beforeFirst: (predicate, handler) => { beforeFirst = { predicate, handler }; } };
}
async function shared(db, document = workspace()) {
  const { room } = await createRoom(db, owner, { title: 'Shared ideas', document });
  await addRoomMember(db, owner, room.id, { email: ' Editor@Example.COM ' });
  return { room, document };
}
function addAsset(sqlite, id, userId) {
  const asset = { id, name: `${id}.pdf`, mime: 'application/pdf', size: 100, url: `/api/assets/${id}` };
  sqlite.prepare('INSERT INTO assets (id, user_id, storage_key, name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, `assets/${id}`, asset.name, asset.mime, asset.size, now);
  return asset;
}

test('shared creation is isolated from private data and conditional reads still return membership/identity', async () => {
  const { db, sqlite } = database();
  try {
    const base = workspace(); await saveWorkspace(db, owner.userId, base, 0);
    const { room } = await shared(db, base), next = structuredClone(base); next.nodes[0].title = 'Only shared';
    await patchRoom(db, editor, room.id, payload(base, next));
    assert.equal((await loadWorkspace(db, owner.userId)).document.nodes[0].title, 'a');
    const polled = await readRoom(db, editor, room.id, 2);
    assert.equal(polled.unchanged, true); assert.equal(polled.userId, editor.userId); assert.equal(polled.room.role, 'editor'); assert.equal(polled.members.length, 2); assert.equal('document' in polled, false);
    assert.equal((await listRooms(db, owner)).rooms[0].role, 'owner'); assert.equal((await listRooms(db, editor)).rooms[0].role, 'editor'); assert.equal((await listRooms(db, outsider)).rooms.length, 0);
  } finally { sqlite.close(); }
});

test('simultaneous two-identity disjoint edits merge while same-field edits return the latest intact document', async () => {
  const { db, sqlite } = database();
  try {
    const { room, document: base } = await shared(db), mine = structuredClone(base), theirs = structuredClone(base);
    mine.nodes[0].title = 'Owner title'; theirs.nodes[0].text = 'Editor notes';
    await Promise.all([patchRoom(db, owner, room.id, payload(base, mine)), patchRoom(db, editor, room.id, payload(base, theirs))]);
    const latest = await readRoom(db, owner, room.id);
    assert.equal(latest.revision, 3); assert.equal(latest.document.nodes[0].title, 'Owner title'); assert.equal(latest.document.nodes[0].text, 'Editor notes');
    const conflicting = structuredClone(base); conflicting.nodes[0].title = 'Stale editor title'; conflicting.nodes[1].text = 'Must also stay local';
    await assert.rejects(patchRoom(db, editor, room.id, payload(base, conflicting)), error => {
      assert.equal(error.status, 409); assert.equal(error.code, 'collaboration_conflict'); assert.equal(error.details.document.nodes[0].title, 'Owner title'); assert.equal(error.details.document.nodes[1].text, ''); assert.equal(error.details.revision, 3); return true;
    });
    assert.equal((await readRoom(db, editor, room.id)).revision, 3);
  } finally { sqlite.close(); }
});

test('a durable operation receipt makes a lost-response retry safe after later peer edits', async () => {
  const { db, sqlite } = database();
  try {
    const { room, document: base } = await shared(db), mine = structuredClone(base), theirs = structuredClone(base);
    mine.nodes[0].title = 'Acknowledgement lost'; theirs.nodes[1].text = 'Later peer edit';
    const request = payload(base, mine, 1, 'retry-key');
    await patchRoom(db, owner, room.id, request); await patchRoom(db, editor, room.id, payload(base, theirs));
    const retry = await patchRoom(db, owner, room.id, JSON.parse(JSON.stringify(request)));
    assert.equal(retry.revision, 3); assert.equal(retry.document.nodes[1].text, 'Later peer edit');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM room_operations').get().count, 2);
    await assert.rejects(patchRoom(db, owner, room.id, { ...request, operations: [] }), error => error.code === 'operation_id_reused');
  } finally { sqlite.close(); }
});

test('concurrent identical retries never acknowledge a pre-commit snapshot; receipt ownership is immutable', async () => {
  const state = database(); const { db, sqlite } = state;
  try {
    const { room, document: base } = await shared(db), mine = structuredClone(base); mine.nodes[0].title = 'Committed before receipt lookup';
    const request = payload(base, mine, 1, 'concurrent-receipt');
    state.beforeFirst(sql => sql.startsWith('SELECT request_hash'), () => patchRoom(db, owner, room.id, request));
    const acknowledged = await patchRoom(db, owner, room.id, request);
    assert.equal(acknowledged.revision, 2); assert.equal(acknowledged.document.nodes[0].title, 'Committed before receipt lookup');
    const peer = structuredClone(base); peer.nodes[1].text = 'Different member, same operation identifier';
    const peerResult = await patchRoom(db, editor, room.id, payload(base, peer, 1, 'concurrent-receipt'));
    assert.equal(peerResult.revision, 3); assert.equal(peerResult.document.nodes[1].text, peer.nodes[1].text);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM room_operations').get().count, 2);
    await assert.rejects(readRoom(db, { ...outsider, email: owner.email }, room.id), status(404));
  } finally { sqlite.close(); }
});

test('document, receipt, and shared asset index roll back together when a transactional statement fails', async () => {
  const { db, sqlite } = database();
  try {
    const { room, document: base } = await shared(db), next = structuredClone(base); next.nodes[0].asset = addAsset(sqlite, 'new-file', owner.userId);
    const request = payload(base, next, 1, 'rollback-key');
    sqlite.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON room_operations BEGIN SELECT RAISE(ABORT, 'injected receipt failure'); END;");
    await assert.rejects(patchRoom(db, owner, room.id, request), /injected receipt failure/);
    assert.equal((await readRoom(db, owner, room.id)).revision, 1); assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM room_operations').get().count, 0); assert.equal(await findReadableAsset(db, editor.userId, editor.email, 'new-file'), null);
    sqlite.exec('DROP TRIGGER fail_receipt');
    assert.equal((await patchRoom(db, owner, room.id, request)).revision, 2); assert.ok(await findReadableAsset(db, editor.userId, editor.email, 'new-file'));
  } finally { sqlite.close(); }
});

test('uninvited and revoked identities cannot read, edit, manage members, or publish presence', async () => {
  const { db, sqlite } = database();
  try {
    const { room, document: base } = await shared(db), next = structuredClone(base); next.nodes[0].title = 'No';
    for (const action of [() => readRoom(db, outsider, room.id), () => patchRoom(db, outsider, room.id, payload(base, next)), () => getPresence(db, outsider, room.id)]) await assert.rejects(action(), status(404));
    await assert.rejects(addRoomMember(db, editor, room.id, { email: outsider.email }), status(403));
    await assert.rejects(removeRoomMember(db, editor, room.id, { email: owner.email }), status(403));
    await assert.rejects(removeRoomMember(db, owner, room.id, { email: owner.email }), status(400));
    await removeRoomMember(db, owner, room.id, { email: editor.email });
    await assert.rejects(readRoom(db, editor, room.id), status(404)); await assert.rejects(patchRoom(db, editor, room.id, payload(base, next)), status(404));
    await assert.rejects(putPresence(db, editor, room.id, { sessionId: 'session', boardId: 'root', x: 1, y: 2, selectedNodeId: null }), status(404));
  } finally { sqlite.close(); }
});

test('membership is rechecked atomically when access is revoked between load and commit', async () => {
  const databaseState = database(); const { db, sqlite } = databaseState;
  try {
    const { room, document: base } = await shared(db), next = structuredClone(base); next.nodes[0].title = 'After revocation';
    databaseState.beforeBatch(() => sqlite.prepare('DELETE FROM room_members WHERE room_id = ? AND email = ?').run(room.id, editor.email));
    await assert.rejects(patchRoom(db, editor, room.id, payload(base, next)), status(404));
    const latest = await readRoom(db, owner, room.id); assert.equal(latest.revision, 1); assert.equal(latest.document.nodes[0].title, 'a');
  } finally { sqlite.close(); }
});

test('deleting an item with a newer peer reference fails instead of losing the reference or peer content', async () => {
  const { db, sqlite } = database();
  try {
    const { room, document: base } = await shared(db), peer = structuredClone(base), remove = structuredClone(base);
    peer.edges.push({ id: 'peer-edge', boardId: 'root', sourceId: 'a', targetId: 'b', label: 'New relationship' }); remove.nodes = remove.nodes.filter(item => item.id !== 'a');
    await patchRoom(db, editor, room.id, payload(base, peer));
    await assert.rejects(patchRoom(db, owner, room.id, payload(base, remove)), error => error.status === 409 && error.details.document.edges[0].id === 'peer-edge');
    assert.equal((await readRoom(db, owner, room.id)).document.nodes.length, 2);
  } finally { sqlite.close(); }
});

test('presence derives identity, expires at TTL, cleans stale rows, and immediately hides revoked peers', async () => {
  const { db, sqlite } = database();
  try {
    const { room } = await shared(db), clock = 1_800_000_000_000;
    const presence = { sessionId: 'tab-a', boardId: 'root', x: 12, y: -35, selectedNodeId: 'a', name: 'Forged Owner', userId: owner.userId };
    await putPresence(db, editor, room.id, presence, clock);
    const peers = (await getPresence(db, owner, room.id, clock + 1)).peers;
    assert.equal(peers.length, 1); assert.equal(peers[0].userId, editor.userId); assert.equal(peers[0].name, editor.name); assert.match(peers[0].color, /^#[0-9a-f]{6}$/);
    assert.equal((await getPresence(db, owner, room.id, clock + PRESENCE_TTL_MS)).peers.length, 0);
    await putPresence(db, owner, room.id, { ...presence, sessionId: 'owner-tab', x: null, y: null }, clock + PRESENCE_TTL_MS);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM room_presence').get().count, 1);
    await putPresence(db, editor, room.id, presence, clock + PRESENCE_TTL_MS + 1);
    await removeRoomMember(db, owner, room.id, { email: editor.email });
    assert.equal((await getPresence(db, owner, room.id, clock + PRESENCE_TTL_MS + 2)).peers.length, 1);
    await assert.rejects(putPresence(db, owner, room.id, { ...presence, x: Infinity }, clock), status(400));
    await assert.rejects(putPresence(db, owner, room.id, { ...presence, x: null }, clock), status(400));
  } finally { sqlite.close(); }
});

test('only current room references share assets; uploads by editors are shareable and unrelated files stay private', async () => {
  const { db, sqlite } = database();
  try {
    const base = workspace(), sharedFile = addAsset(sqlite, 'shared-owner', owner.userId), privateFile = addAsset(sqlite, 'private-owner', owner.userId), editorFile = addAsset(sqlite, 'editor-upload', editor.userId);
    base.nodes[0].asset = sharedFile; const { room } = await shared(db, base);
    assert.ok(await findReadableAsset(db, editor.userId, editor.email, sharedFile.id));
    assert.equal(await findReadableAsset(db, editor.userId, editor.email, privateFile.id), null); assert.equal(await findReadableAsset(db, outsider.userId, outsider.email, sharedFile.id), null);
    assert.equal(await findReadableAsset(db, outsider.userId, owner.email, sharedFile.id), null);
    const stolen = structuredClone(base); stolen.nodes[1].asset = privateFile;
    await assert.rejects(patchRoom(db, editor, room.id, payload(base, stolen)), error => error.code === 'unknown_asset');
    await assert.rejects(createRoom(db, editor, { title: 'Not mine', document: base }), error => error.code === 'unknown_asset');
    const uploaded = structuredClone(base); uploaded.nodes[1].asset = editorFile;
    await patchRoom(db, editor, room.id, payload(base, uploaded)); assert.ok(await findReadableAsset(db, owner.userId, owner.email, editorFile.id));
    const removed = structuredClone(uploaded); removed.nodes[0].asset = null;
    await patchRoom(db, owner, room.id, payload(uploaded, removed, 2)); assert.equal(await findReadableAsset(db, editor.userId, editor.email, sharedFile.id), null);
    assert.ok(await findReadableAsset(db, owner.userId, owner.email, sharedFile.id));
    await removeRoomMember(db, owner, room.id, { email: editor.email });
    assert.equal(await findReadableAsset(db, editor.userId, editor.email, sharedFile.id), null);
    assert.ok(await findReadableAsset(db, editor.userId, editor.email, editorFile.id));
    await assert.rejects(saveWorkspace(db, owner.userId, uploaded, 0), error => error.code === 'unknown_asset');
  } finally { sqlite.close(); }
});

test('room identity uses authenticated headers and normalizes membership emails', () => {
  assert.equal(normalizeMemberEmail('  Editor@Example.COM '), editor.email);
  for (const email of ['', 'bad', 'x@y', 'x\n@y.example']) assert.throws(() => normalizeMemberEmail(email), status(400));
  const identity = requireRoomIdentity(new Request('https://nodus.test/api/rooms', { headers: { 'oai-authenticated-user-id': 'account', 'oai-authenticated-user-email': 'PERSON@example.com', 'oai-authenticated-user-full-name': encodeURIComponent('نام من'), 'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8' } }));
  assert.deepEqual(identity, { userId: 'account', email: 'person@example.com', name: 'نام من' });
  assert.throws(() => requireRoomIdentity(new Request('https://nodus.test/api/rooms')), status(401));
});

test('private and shared writes enforce the same byte limit without preventing reads of an existing graph', async () => {
  const { db, sqlite } = database();
  try {
    const base = workspace(); base.nodes = Array.from({ length: 20 }, (_, index) => ({ ...node(`large-${index}`), text: 'x'.repeat(90_000) }));
    let remaining = MAX_PERSISTED_DOCUMENT_BYTES - new TextEncoder().encode(JSON.stringify(base)).byteLength;
    for (const item of base.nodes) { const extra = Math.min(remaining, 100000 - item.text.length); item.text += 'x'.repeat(extra); remaining -= extra; }
    assert.equal(remaining, 0); assert.equal(new TextEncoder().encode(JSON.stringify(base)).byteLength, MAX_PERSISTED_DOCUMENT_BYTES);
    await saveWorkspace(db, owner.userId, base, 0);
    const larger = structuredClone(base); larger.nodes[0].title += 'ی';
    await assert.rejects(saveWorkspace(db, owner.userId, larger, 1), error => error.status === 413 && error.code === 'workspace_too_large');
    await assert.rejects(createRoom(db, owner, { title: 'Too big', document: larger }), status(413));
    assert.equal((await loadWorkspace(db, owner.userId)).revision, 1);
    sqlite.prepare('UPDATE workspaces SET document = ? WHERE user_id = ?').run(JSON.stringify(larger), owner.userId);
    assert.equal((await loadWorkspace(db, owner.userId)).document.nodes[0].title, larger.nodes[0].title);
  } finally { sqlite.close(); }
});
