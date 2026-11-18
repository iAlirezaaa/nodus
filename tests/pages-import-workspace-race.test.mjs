import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const start = html.indexOf('<script>'), end = html.indexOf('</script>', start);
assert.ok(start >= 0 && end > start, 'actual Pages inline script exists');
const script = html.slice(start + '<script>'.length, end);
const line = script.split('\n').find(s => s.includes("$('import-file').onchange=async e=>"));
assert.ok(line, 'actual Import JSON handler exists');
const handler = line.slice(line.indexOf("$('import-file').onchange=async e=>"));

function fixture() {
  const input = { files: [], value: '' };
  const state = { doc: { version: 1 }, boardId: 'root', storageRecovery: null, restorePending: false, localConflict: false };
  const toasts = [], restored = [], confirmations = [];
  new Function('$', 'state', 'toast', 'L', 'validate', 'restoreLocalDocument', 'window', handler)(
    () => input, state, message => toasts.push(message),
    (_fa, english) => english, value => value,
    async value => { restored.push(value); return true; },
    { confirm: message => { confirmations.push(message); return true; } }
  );
  function choose(id, { deferred = true, size = 128 } = {}) {
    let finish, fail;
    const file = {
      size, reads: 0,
      text() {
        this.reads++;
        if (!deferred) return Promise.resolve(JSON.stringify({ id }));
        return new Promise((resolve, reject) => {
          finish = () => resolve(JSON.stringify({ id }));
          fail = () => reject(Error('Failed to read file'));
        });
      }
    };
    input.files = [file]; input.value = id;
    const done = input.onchange({ target: input });
    return { file, done, finish: () => finish(), fail: () => fail() };
  }
  return { input, state, toasts, restored, confirmations, choose };
}
async function rejectsChangedContext(change) {
  const x = fixture(), a = x.choose('backup-A');
  change(x.state); a.finish(); await a.done;
  assert.deepEqual(x.restored, [], 'stale backup must never be restored');
  assert.equal(x.confirmations.length, 0, 'no replacement confirmation after a workspace change');
  assert.match(x.toasts.join(' '), /Workspace changed while reading the backup/);
}
test('ND-024 document edit invalidates pending JSON read', () =>
  rejectsChangedContext(s => { s.doc = { version: 1, edited: true }; }));
test('ND-024 navigation invalidates pending JSON read', () =>
  rejectsChangedContext(s => { s.boardId = 'nested-board'; }));
test('ND-024 recovery-state change invalidates pending JSON read', () =>
  rejectsChangedContext(s => { s.storageRecovery = { backupTaken: true }; }));
test('ND-024 in-flight restore invalidates pending JSON read', () =>
  rejectsChangedContext(s => { s.restorePending = true; }));
test('ND-024 cross-tab conflict invalidates pending JSON read', () =>
  rejectsChangedContext(s => { s.localConflict = true; }));
test('ND-024 stale read error does not mislabel a changed workspace', async () => {
  const x = fixture(), a = x.choose('backup-A');
  x.state.doc = { version: 1, edited: true }; a.fail(); await a.done;
  assert.equal(x.confirmations.length, 0);
  assert.deepEqual(x.restored, []);
  assert.match(x.toasts.join(' '), /Workspace changed/);
  assert.doesNotMatch(x.toasts.join(' '), /Invalid backup/);
});
test('ND-024 normal import confirms and restores once', async () => {
  const x = fixture(), a = x.choose('backup-A');
  a.finish(); await a.done;
  assert.equal(x.confirmations.length, 1);
  assert.deepEqual(x.restored, [{ id: 'backup-A' }]);
  assert.deepEqual(x.toasts, []);
});
test('ND-024 newest backup selection still wins over prior read', async () => {
  const x = fixture(), a = x.choose('backup-A'), b = x.choose('backup-B');
  b.finish(); await b.done; a.finish(); await a.done;
  assert.equal(x.confirmations.length, 1);
  assert.deepEqual(x.restored, [{ id: 'backup-B' }]);
  assert.deepEqual(x.toasts, []);
});
test('ND-024 oversized later selection cancels stale pending backup', async () => {
  const x = fixture(), a = x.choose('backup-A');
  const b = x.choose('too-large', { size: 64 * 1024 * 1024 + 1 });
  await b.done; a.finish(); await a.done;
  assert.equal(x.confirmations.length, 0);
  assert.deepEqual(x.restored, []);
  assert.equal(b.file.reads, 0);
});
test('ND-024 complete inline JS syntax and CSP SHA256 digest', () => {
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],
    createHash('sha256').update(script).digest('base64'));
});
