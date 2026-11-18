import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'must test the exact production inline script');
const source = script.split('\n').find(line => line.startsWith('function getDB()'));
assert.ok(source, 'must use the exact production getDB handler');

function fixture() {
  let created = 0, aborted = 0, closed = 0;
  const connection = {
    objectStoreNames: { contains: () => false },
    createObjectStore: () => { created++; },
    close: () => { closed++; },
  };
  const req = { result: connection, transaction: { abort: () => { aborted++; } } };
  const indexedDB = { open(name, version) {
    assert.equal(name, 'nodus-pages-v1');
    assert.equal(version, 1);
    return req;
  } };
  const state = {localConflict:false,unsavedChanges:false,doc:{title:'draft'},history:['undo'],future:['redo']};
  const notices=[];
  const context = {indexedDB,Error,db:null,state,saveStatus:msg=>notices.push(msg),toast:msg=>notices.push(msg),L:(fa,en)=>en};
  const getDB = vm.runInNewContext('(' + source + ')', context);
  return { req, connection, getDB, context, state, notices, counts: () => ({ created, aborted, closed }) };
}

test('exact source script parses and inline CSP matches SHA-256', () => {
  new vm.Script(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1], createHash('sha256').update(script).digest('base64'));
});

test('blocked database upgrade fails promptly rather than hanging startup', async () => {
  const f = fixture(), pending = f.getDB();
  f.req.onblocked();
  await assert.rejects(pending, /blocked by another tab/);
  assert.deepEqual(f.counts(), { created: 0, aborted: 0, closed: 0 });
});

test('a delayed upgrade after blocked open is aborted and a late connection is closed', async () => {
  const f = fixture(), pending = f.getDB();
  f.req.onblocked();
  await assert.rejects(pending, /blocked by another tab/);
  f.req.onupgradeneeded();
  f.req.onsuccess();
  assert.deepEqual(f.counts(), { created: 0, aborted: 1, closed: 1 });
});

test('ordinary upgrade and open still resolve one usable connection', async () => {
  const f = fixture(), pending = f.getDB();
  f.req.onupgradeneeded();
  f.req.onsuccess();
  assert.equal(await pending, f.connection);
  assert.deepEqual(f.counts(), { created: 1, aborted: 0, closed: 0 });
});

test('open failures reject and never upgrade or hand out an editable workspace', async () => {
  const f = fixture(), pending = f.getDB();
  f.req.error = new Error('disk inaccessible');
  f.req.onerror();
  await assert.rejects(pending, /disk inaccessible/);
  assert.deepEqual(f.counts(), { created: 0, aborted: 0, closed: 0 });
  const denied = vm.runInNewContext('(' + source + ')', { indexedDB: { open: () => { throw new Error('denied'); } }, Error });
  await assert.rejects(denied(), /denied/);
});

test('a real active versionchange closes the handle and quarantines edits without replacing draft or Undo', async () => {
  const f = fixture(); const promise=f.getDB();f.req.onsuccess();assert.equal(await promise,f.connection);
  f.context.db=f.connection;
  const doc=f.state.doc,history=f.state.history,future=f.state.future;
  f.connection.onversionchange({oldVersion:1,newVersion:2});
  assert.equal(f.counts().closed,1);assert.equal(f.context.db,null);
  assert.equal(f.state.localConflict,true);assert.equal(f.state.unsavedChanges,true);
  assert.equal(f.state.doc,doc);assert.equal(f.state.history,history);assert.equal(f.state.future,future);
  assert.match(f.notices.join(' '),/export JSON and reload/);
});

test('a stale connection versionchange never clears a newer active connection', async () => {
  const f=fixture();const p=f.getDB();f.req.onsuccess();await p;
  const replacement={close(){throw Error('new handle must stay open')}};
  f.context.db=replacement;
  f.connection.onversionchange({oldVersion:1,newVersion:2});
  assert.equal(f.counts().closed,1);assert.equal(f.context.db,replacement);
  assert.equal(f.state.localConflict,false);assert.equal(f.state.unsavedChanges,false);
  assert.equal(f.notices.length,0);
});

test('versionchange with a throwing close is still fail-closed for its active document', async () => {
  const f=fixture();const p=f.getDB();f.req.onsuccess();await p;
  f.connection.close=()=>{throw Error('driver refused close')};
  f.context.db=f.connection;
  assert.doesNotThrow(()=>f.connection.onversionchange({oldVersion:1,newVersion:2}));
  assert.equal(f.context.db,null);assert.equal(f.state.localConflict,true);
  assert.equal(f.state.unsavedChanges,true);
});

test('startup versionchange closes a connection even if load has not assigned its global handle yet', async () => {
  const f=fixture();const p=f.getDB();f.req.onsuccess();await p;
  f.connection.onversionchange({oldVersion:1,newVersion:2});
  assert.equal(f.counts().closed,1);
  assert.equal(f.context.db,null);
  assert.equal(f.state.localConflict,false);
});
