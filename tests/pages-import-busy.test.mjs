import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages script exists');
const line = script.split('\n').find(s => s.includes("$('import-file').onchange=async e=>"));
assert.ok(line, 'JSON picker handler exists');
const handler = line.slice(line.indexOf("$('import-file').onchange=async e=>"));

function fixture() {
  const input = { files: [], value: '' };
  const state = { restorePending: false, storageRecovery: null };
  const events = [], confirmations = [], finishes = [];
  const $ = id => { assert.equal(id, 'import-file'); return input; };
  new Function('$', 'state', 'toast', 'L', 'validate', 'restoreLocalDocument', 'window', handler)(
    $, state,
    message => events.push({ type: 'toast', message }),
    (_fa, english) => english,
    data => data,
    async data => {
      events.push({ type: 'attempt', id: data.id });
      if (state.restorePending) return false;
      state.restorePending = true;
      return new Promise(resolve => finishes.push(() => {
        state.restorePending = false;
        events.push({ type: 'completed', id: data.id });
        resolve(true);
      }));
    },
    { confirm: message => { confirmations.push(message); return true; } }
  );
  function choose(id, options = {}) {
    let finishRead;
    const file = {
      size: options.size ?? 100, reads: 0,
      text() {
        this.reads++;
        return options.deferRead
          ? new Promise(resolve => { finishRead = () => resolve(JSON.stringify({ id })); })
          : Promise.resolve(JSON.stringify({ id }));
      }
    };
    input.files = [file]; input.value = id;
    const done = input.onchange({ target: input });
    return { done, file, finishRead: () => finishRead() };
  }
  return { state, input, events, confirmations, finishes, choose };
}
async function settle() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

test('ND-024 in-progress restore blocks second import before file reading or confirmation', async () => {
  const x = fixture();
  const first = x.choose('A'); await settle();
  assert.equal(x.state.restorePending, true);
  const second = x.choose('B'); await second.done;
  assert.equal(second.file.reads, 0);
  assert.equal(x.confirmations.length, 1);
  assert.deepEqual(x.events.filter(e => e.type === 'attempt').map(e => e.id), ['A']);
  assert.match(x.events.find(e => e.type === 'toast')?.message ?? '', /restore is still running/);
  x.finishes[0](); await first.done;
});

test('ND-024 busy restores reject oversized replacement before parsing', async () => {
  const x = fixture(), first = x.choose('A'); await settle();
  const second = x.choose('big', { size: 64 * 1024 * 1024 + 1 });
  await second.done;
  assert.equal(second.file.reads, 0);
  assert.equal(x.confirmations.length, 1);
  assert.match(x.events.find(e => e.type === 'toast')?.message ?? '', /restore is still running/);
  x.finishes[0](); await first.done;
});

test('ND-024 cancelling the picker while restore is pending remains silent', async () => {
  const x = fixture(), first = x.choose('A'); await settle();
  x.input.files = [];
  await x.input.onchange({ target: x.input });
  assert.equal(x.confirmations.length, 1);
  assert.equal(x.events.filter(e => e.type === 'toast').length, 0);
  x.finishes[0](); await first.done;
});

test('ND-024 latest selection still wins over an earlier unfinished file read', async () => {
  const x = fixture(), first = x.choose('A', { deferRead: true });
  const second = x.choose('B'); await settle();
  assert.deepEqual(x.events.filter(e => e.type === 'attempt').map(e => e.id), ['B']);
  x.finishes[0](); await second.done;
  first.finishRead(); await first.done;
  assert.deepEqual(x.events.filter(e => e.type === 'attempt').map(e => e.id), ['B']);
  assert.equal(x.confirmations.length, 1);
});

test('ND-024 a normal import still confirms once and restores', async () => {
  const x = fixture(), first = x.choose('ordinary'); await settle();
  assert.equal(x.confirmations.length, 1);
  assert.deepEqual(x.events.filter(e => e.type === 'attempt').map(e => e.id), ['ordinary']);
  x.finishes[0](); await first.done;
});

test('ND-024 entire inline script parses and CSP matches bytes', () => {
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],
    createHash('sha256').update(script).digest('base64'));
});
