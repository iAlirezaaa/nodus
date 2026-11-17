import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages inline script exists');
const line = script.split('\n').find(text => text.includes("$('import-file').onchange=async e=>"));
assert.ok(line, 'Import JSON handler exists');
const handler = line.slice(line.indexOf("$('import-file').onchange=async e=>"));

function fixture() {
  const state = { storageRecovery: null };
  const input = { value: '', files: [] };
  const events = [];
  const confirmations = [];
  const $ = name => { assert.equal(name, 'import-file'); return input; };
  new Function('$', 'state', 'toast', 'L', 'validate', 'restoreLocalDocument', 'window', handler)(
    $, state, message => events.push({ type: 'toast', message }),
    (_fa, en) => en,
    data => data,
    async data => { events.push({ type: 'restore', data }); return true; },
    { confirm: message => { confirmations.push(message); return true; } }
  );
  function choose(name, options = {}) {
    let resolve, reject;
    const file = {
      name, size: options.size ?? 100,
      text: () => new Promise((res, rej) => { resolve = res; reject = rej; })
    };
    input.files = [file];
    input.value = name;
    const done = input.onchange({ target: input });
    return {
      done,
      complete: () => resolve(options.malformed ? '{broken' : JSON.stringify({ id: name })),
      fail: () => reject(new Error('File read failed'))
    };
  }
  return { state, input, events, confirmations, choose };
}

test('ND-024 latest JSON choice wins when older read completes last', async () => {
  const x = fixture();
  const old = x.choose('old'); const newest = x.choose('new');
  newest.complete(); await newest.done;
  old.complete(); await old.done;
  assert.deepEqual(x.events.filter(e => e.type === 'restore').map(e => e.data.id), ['new']);
  assert.equal(x.confirmations.length, 1);
  assert.equal(x.input.value, '');
});

test('ND-024 invalid later JSON selection also cancels pending older file', async () => {
  const x = fixture();
  const old = x.choose('old'); const newest = x.choose('new', { malformed: true });
  newest.complete(); await newest.done; old.complete(); await old.done;
  assert.equal(x.events.filter(e => e.type === 'restore').length, 0);
  assert.equal(x.confirmations.length, 0);
  assert.equal(x.events.filter(e => e.type === 'toast').length, 1);
});

test('ND-024 oversize later file invalidates earlier pending JSON read before file.text', async () => {
  const x = fixture(); const old = x.choose('old'); const latest = x.choose('too-big', { size: 64 * 1024 * 1024 + 1 });
  await latest.done; old.complete(); await old.done;
  assert.equal(x.confirmations.length, 0);
  assert.equal(x.events.filter(e => e.type === 'restore').length, 0);
  assert.match(x.events[0].message, /64 MB/);
});

test('ND-024 stale failed read does not show misleading error after newer import', async () => {
  const x = fixture(); const old = x.choose('old'); const newest = x.choose('new');
  newest.complete(); await newest.done; old.fail(); await old.done;
  assert.deepEqual(x.events.map(e => e.type), ['restore']);
  assert.equal(x.confirmations.length, 1);
});

test('ND-024 ordinary single-file import keeps existing confirmation and restore', async () => {
  const x = fixture(); const current = x.choose('ordinary');
  current.complete(); await current.done;
  assert.deepEqual(x.events.map(e => e.data?.id), ['ordinary']);
  assert.equal(x.confirmations.length, 1);
});

test('ND-024 recovery guard still requires downloading raw data before importing', async () => {
  const x = fixture(); x.state.storageRecovery = { backupTaken: false };
  const current = x.choose('blocked'); await current.done;
  assert.equal(x.events.length, 1);
  assert.match(x.events[0].message, /Download the raw recovery data/);
  assert.equal(x.confirmations.length, 0);
});

test('ND-024 inline script parses and CSP remains matched', () => {
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1], createHash('sha256').update(script).digest('base64'));
});
