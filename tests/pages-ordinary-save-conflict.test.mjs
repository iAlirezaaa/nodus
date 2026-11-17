import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages inline source is required');
const names = ['serializeRecoverySafely', 'localImportConflict', 'persistImportIfUnchanged', 'persist', 'queueSave', 'warnOnUnsavedExit'];
function source(name) {
  const line = script.split('\n').find(s => s.startsWith('function ' + name + '(') || s.startsWith('async function ' + name + '('));
  assert.ok(line, 'Missing exact production function: ' + name);
  return line;
}
function storeDB(record, present = record !== undefined) {
  let current = record;
  let exists = present;
  let failWrite = false;
  let failKey = false;
  const writes = [];
  const request = (value, error = null) => {
    const req = {result: value, error};
    queueMicrotask(() => error ? req.onerror?.() : req.onsuccess?.());
    return req;
  };
  const db = {transaction: () => {
    const tx = {
      objectStore: () => ({
        get: () => request(exists ? current : undefined),
        getKey: () => request(exists ? 'main' : undefined, failKey ? Error('Key probe denied') : null),
        put: snapshot => {
          if (failWrite) throw Error('Quota exceeded');
          writes.push(snapshot);
          current = snapshot;
          exists = true;
          queueMicrotask(() => tx.oncomplete?.());
        }
      }),
      abort: () => queueMicrotask(() => tx.onabort?.())
    };
    return tx;
  }};
  return {
    db, writes, get current() { return current; },
    remote: value => { current = value; exists = true; },
    remove: () => { current = undefined; exists = false; },
    putFailure: value => { failWrite = value; },
    keyFailure: value => { failKey = value; }
  };
}
function runtime(store, doc, baseline, queue = Promise.resolve(true)) {
  const state = {doc, storedBaseline: baseline, saveQueue: queue, localConflict: false, storageRecovery: null,
    unsavedChanges: true, history: ['undo'], future: ['redo']};
  const status = [];
  const fn = new Function('db', 'state', 'copy', 'saveStatus', 'L', 'toast', 'console',
    [...names.map(source), 'return {queueSave, warnOnUnsavedExit}'].join('\n'));
  const api = fn(store.db, state, structuredClone, value => status.push(value), (fa, en) => en, () => {}, {error: () => {}});
  return {state, status, ...api};
}
const original = {version: 1, homeBoardId: 'root', boards: [{id: 'root', title: 'Original'}], nodes: [], edges: []};
const edited = {...original, boards: [{id: 'root', title: 'My edit'}]};
const foreign = {...original, boards: [{id: 'root', title: 'Other tab newer'}]};

test('ND-024 ordinary autosave refuses foreign update atomically and keeps draft/Undo', async () => {
  const store = storeDB(foreign);
  const app = runtime(store, edited, original);
  assert.equal(await app.queueSave(), false);
  assert.equal(store.writes.length, 0);
  assert.deepEqual(store.current, foreign);
  assert.equal(app.state.localConflict, true);
  assert.equal(app.state.unsavedChanges, true);
  assert.deepEqual(app.state.history, ['undo']);
  assert.deepEqual(app.state.future, ['redo']);
  let prevented = false;
  app.warnOnUnsavedExit({preventDefault: () => {prevented = true;}, returnValue: undefined});
  assert.equal(prevented, true);
  assert.match(app.status.at(-1), /conflict/i);
});
test('ND-024 truly absent first record and serial self-saves update the baseline', async () => {
  const store = storeDB(undefined, false);
  const app = runtime(store, edited, null);
  assert.equal(await app.queueSave(), true);
  assert.equal(store.writes.length, 1);
  assert.deepEqual(app.state.storedBaseline, edited);
  const next = {...original, boards: [{id: 'root', title: 'Next local edit'}]};
  app.state.doc = next;
  app.state.unsavedChanges = true;
  assert.equal(await app.queueSave(), true);
  assert.equal(store.writes.length, 2);
  assert.deepEqual(store.current, next);
  assert.deepEqual(app.state.storedBaseline, next);
  assert.equal(app.state.unsavedChanges, false);
});
test('ND-024 present undefined and foreign deletion are conflicts, not blank writes', async () => {
  for (const [record, present, baseline] of [[undefined, true, null], [undefined, false, original]]) {
    const store = storeDB(record, present);
    const app = runtime(store, edited, baseline);
    assert.equal(await app.queueSave(), false);
    assert.equal(store.writes.length, 0);
    assert.equal(app.state.localConflict, true);
  }
});
test('ND-024 queued save checks DB at execution time and blocks later queued writes', async () => {
  const store = storeDB(original);
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  const app = runtime(store, edited, original, gate);
  const first = app.queueSave();
  app.state.doc = {...original, boards: [{id: 'root', title: 'Second draft'}]};
  app.state.unsavedChanges = true;
  const second = app.queueSave();
  store.remote(foreign);
  release(true);
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
  assert.equal(store.writes.length, 0);
  assert.deepEqual(store.current, foreign);
  assert.equal(app.state.localConflict, true);
});
test('ND-024 quota error does not falsely classify a tab conflict; retry can save', async () => {
  const store = storeDB(original);
  store.putFailure(true);
  const app = runtime(store, edited, original);
  assert.equal(await app.queueSave(), false);
  assert.equal(app.state.localConflict, false);
  assert.equal(app.state.unsavedChanges, true);
  assert.equal(store.writes.length, 0);
  store.putFailure(false);
  assert.equal(await app.queueSave(), true);
  assert.equal(store.writes.length, 1);
  assert.equal(app.state.unsavedChanges, false);
});
test('ND-024 failed key probe never creates an unobserved blank workspace', async () => {
  const store = storeDB(undefined, false);
  store.keyFailure(true);
  const app = runtime(store, edited, null);
  assert.equal(await app.queueSave(), false);
  assert.equal(store.writes.length, 0);
  assert.equal(app.state.unsavedChanges, true);
});
test('ND-024 inline source compiles and CSP digest matches exact saved script', () => {
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],
    createHash('sha256').update(script).digest('base64'));
  new Function(script);
});
