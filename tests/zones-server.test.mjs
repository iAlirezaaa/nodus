import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createZone, updateZone } from '../lib/zones.ts';
import { deleteNode, makeNode } from '../lib/graph.ts';
import { patchNode } from '../lib/node-features.ts';
import { diffWorkspace } from '../lib/collaboration.ts';
import { createRoom, addRoomMember, removeRoomMember, patchRoom, readRoom } from '../lib/server/collaboration.ts';
import { saveWorkspace, loadWorkspace } from '../lib/server/store.ts';

const owner = { userId: 'zone-owner', email: 'zone-owner@example.test', name: 'Owner fixture' };
const editor = { userId: 'zone-editor', email: 'zone-editor@example.test', name: 'Editor fixture' };
const workspace = () => ({
  version: 1, homeBoardId: 'root',
  boards: [{ id: 'root', title: 'داستان', description: '', parentNodeId: null, createdAt: '2026-11-19T22:30:00.000Z' }],
  nodes: ['story', 'film', 'series'].map((id, index) => makeNode('root', 'note', index * 300, 0, { id, title: id })), edges: [],
});
const input = { title: 'سینما و داستان', description: 'یک ایده، چند ارتباط', color: 'violet', nodeIds: ['story', 'film'] };
const payload = (base, next, revision = 1) => ({ revision, operations: diffWorkspace(base, next), operationId: crypto.randomUUID() });

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const directory = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, directory), 'utf8'));
  const db = {
    prepare(sql) {
      const bound = (values = []) => ({
        sql, values, bind: (...next) => bound(next),
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values), success: true, meta: {} }; },
        async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
      });
      return bound();
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(({ sql, values }) => ({ success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }));
        sqlite.exec('COMMIT'); return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { db, sqlite };
}
async function shared(db, document = workspace()) {
  const { room } = await createRoom(db, owner, { title: 'Zone collaboration fixtures', document });
  await addRoomMember(db, owner, room.id, { email: editor.email });
  return room;
}

test('SQLite personal save/reload preserves new metadata while old documents remain readable and accounts stay isolated', async () => {
  const { db, sqlite } = database();
  try {
    const old = workspace(); await saveWorkspace(db, owner.userId, old, 0);
    assert.deepEqual((await loadWorkspace(db, owner.userId)).document, old);
    const next = patchNode(createZone(old, 'root', input, 'zone'), 'story', { presentation: 'card' });
    await saveWorkspace(db, owner.userId, next, 1);
    const loaded = await loadWorkspace(db, owner.userId);
    assert.equal(loaded.revision, 2); assert.deepEqual(loaded.document, next);
    assert.equal((await loadWorkspace(db, editor.userId)).document, null);
    await assert.rejects(saveWorkspace(db, owner.userId, old, 1), error => error.status === 409);
    assert.deepEqual((await loadWorkspace(db, owner.userId)).document, next);
  } finally { sqlite.close(); }
});

test('SQLite shared zone metadata merges with peer presentation/content edits and same-board zone conflicts reject atomically', async () => {
  const { db, sqlite } = database();
  try {
    const base = createZone(workspace(), 'root', input, 'zone'), room = await shared(db, base);
    const mine = updateZone(base, 'root', 'zone', { description: 'Owner description' });
    const peer = patchNode(base, 'series', { text: 'Editor notes', presentation: 'card' });
    await Promise.all([patchRoom(db, owner, room.id, payload(base, mine)), patchRoom(db, editor, room.id, payload(base, peer))]);
    const latest = await readRoom(db, owner, room.id);
    assert.equal(latest.revision, 3);
    assert.equal(latest.document.boards[0].zones[0].description, 'Owner description');
    assert.equal(latest.document.nodes[2].presentation, 'card'); assert.equal(latest.document.nodes[2].text, 'Editor notes');
    const stale = patchNode(updateZone(base, 'root', 'zone', { title: 'Conflicting editor title' }), 'film', { title: 'Must stay local' });
    await assert.rejects(patchRoom(db, editor, room.id, payload(base, stale)), error => error.status === 409 && error.code === 'collaboration_conflict');
    assert.deepEqual(await readRoom(db, owner, room.id), latest);
  } finally { sqlite.close(); }
});

test('a stale zone reference cannot resurrect a peer-deleted member or partially commit other edits; revoked members cannot edit zones', async () => {
  const { db, sqlite } = database();
  try {
    const base = workspace(), room = await shared(db, base);
    const removed = deleteNode(base, 'film');
    await patchRoom(db, editor, room.id, payload(base, removed));
    const stale = patchNode(createZone(base, 'root', input, 'zone'), 'story', { text: 'Must remain local with stale zone' });
    await assert.rejects(patchRoom(db, owner, room.id, payload(base, stale)), error => error.status === 409 && error.code === 'collaboration_conflict');
    const latest = await readRoom(db, owner, room.id);
    assert.equal(latest.revision, 2); assert.deepEqual(latest.document, removed);
    const valid = createZone(removed, 'root', { ...input, nodeIds: ['story'] }, 'zone');
    await removeRoomMember(db, owner, room.id, { email: editor.email });
    await assert.rejects(patchRoom(db, editor, room.id, payload(removed, valid, 2)), error => error.status === 404);
    assert.deepEqual((await readRoom(db, owner, room.id)).document, removed);
  } finally { sqlite.close(); }
});

test('a concurrent new zone prevents stale node deletion from silently discarding peer membership', async () => {
  const { db, sqlite } = database();
  try {
    const base = workspace(), room = await shared(db, base);
    const peer = createZone(base, 'root', input, 'zone');
    await patchRoom(db, editor, room.id, payload(base, peer));
    const stale = patchNode(deleteNode(base, 'film'), 'series', { title: 'Do not partially save' });
    await assert.rejects(patchRoom(db, owner, room.id, payload(base, stale)), error => error.status === 409 && error.code === 'collaboration_conflict');
    const latest = await readRoom(db, owner, room.id);
    assert.equal(latest.revision, 2); assert.deepEqual(latest.document, peer);
  } finally { sqlite.close(); }
});
