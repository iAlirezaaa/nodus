import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages inline script must exist');
const line = script.split('\n').find(s => s.includes("$('media-file').onchange=async e=>"));
assert.ok(line, 'Media input event must exist');
const handler = line.slice(line.indexOf("$('media-file').onchange=async e=>"));

async function simulate({ selection = 'A', changedSelection, changedBoard = false, valid = true, failRead = false, size = 100 } = {}) {
  const doc = { nodes: [{ id: 'A' }, { id: 'B' }] };
  const state = { selected: selection, boardId: 'home' };
  const input = { files: [{ size, name: 'sample.png' }], value: 'chosen' };
  const calls = { reads: 0, writes: 0, messages: [] };
  const readers = [];
  class FakeFileReader {
    readAsDataURL() { calls.reads++; readers.push(this); }
  }
  new Function('$', 'state', 'toast', 'L', 'mutate', 'byId', 'FileReader', handler)(
    () => input,
    state,
    message => calls.messages.push(message),
    (_fa, en) => en,
    fn => { calls.writes++; fn(doc); },
    (d, id) => d.nodes.find(n => n.id === id),
    FakeFileReader
  );
  const pending = input.onchange({ target: input });
  if (changedSelection !== undefined) state.selected = changedSelection;
  if (changedBoard) state.boardId = 'other';
  if (readers.length) {
    const reader = readers[0];
    reader.result = valid ? 'data:image/png;base64,AA==' : 'data:text/html;base64,AA==';
    if (failRead) reader.onerror();
    else reader.onload();
  }
  await pending;
  assert.equal(input.value, '', 'File picker must reset to allow retry');
  return { ...calls, attached: doc.nodes.filter(n => n.media).map(n => n.id) };
}

test('ND-024 stable media read attaches only to intended node', async () => {
  const result = await simulate();
  assert.deepEqual(result.attached, ['A']);
  assert.equal(result.writes, 1);
});
test('ND-024 changing selected thought during FileReader never attaches to the newly selected thought', async () => {
  const result = await simulate({ changedSelection: 'B' });
  assert.deepEqual(result.attached, []);
  assert.equal(result.writes, 0);
  assert.match(result.messages[0], /Selection changed/);
});
test('ND-024 clearing selection during pending media read cancels without a write', async () => {
  const result = await simulate({ changedSelection: null });
  assert.equal(result.writes, 0);
  assert.deepEqual(result.attached, []);
});
test('ND-024 switching project while reading cancels even if selected ID is unchanged', async () => {
  const result = await simulate({ changedBoard: true });
  assert.equal(result.writes, 0);
});
test('ND-024 missing initial selection cancels before reading', async () => {
  const result = await simulate({ selection: null });
  assert.deepEqual([result.reads, result.writes], [0, 0]);
  assert.match(result.messages[0], /Select a thought/);
});
test('ND-024 oversize file and invalid type never reach mutation', async () => {
  const over = await simulate({ size: 5 * 1024 * 1024 + 1 });
  assert.deepEqual([over.reads, over.writes], [0, 0]);
  const wrongMime = await simulate({ valid: false });
  assert.deepEqual([wrongMime.reads, wrongMime.writes], [1, 0]);
});
test('ND-024 FileReader failure never attaches media or records undo', async () => {
  const result = await simulate({ failRead: true });
  assert.deepEqual([result.reads, result.writes], [1, 0]);
});
test('ND-024 inline JavaScript remains parseable and CSP SHA-256 matches bytes', () => {
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1], createHash('sha256').update(script).digest('base64'));
});

async function concurrentReads({ failure = false, oversized = false, switchThought = false } = {}) {
  const state = { selected: 'A', boardId: 'root' };
  const doc = { nodes: [{ id: 'A' }, { id: 'B' }] };
  const input = { files: [], value: 'previous' };
  const readers = [], notices = [];
  let writes = 0;
  class DeferredReader {
    readAsDataURL(file) { this.file = file; readers.push(this); }
  }
  new Function('$', 'state', 'toast', 'L', 'mutate', 'byId', 'FileReader', handler)(
    () => input, state, message => notices.push(message),
    (_fa, en) => en,
    fn => { writes++; fn(doc); },
    (d, id) => d.nodes.find(n => n.id === id), DeferredReader
  );
  const choose = (name, size = 100) => {
    input.files = [{ name, size }];
    input.value = name;
    return input.onchange({ target: input });
  };
  const old = choose('older.png');
  assert.equal(readers.length, 1);
  if (switchThought) state.selected = 'B';
  const latest = choose('newer.png', oversized ? 5 * 1024 * 1024 + 1 : 100);
  if (readers.length === 2) {
    readers[1].result = 'data:image/png;base64,Qg==';
    if (failure) readers[1].onerror();
    else readers[1].onload();
  }
  await latest;
  readers[0].result = 'data:image/png;base64,QQ==';
  readers[0].onload();
  await old;
  return { doc, writes, notices, reads: readers.length, input };
}

test('ND-024 superseded file reading does not overwrite the most recent selection', async () => {
  const result = await concurrentReads();
  assert.equal(result.writes, 1);
  assert.equal(result.doc.nodes[0].mediaName, 'newer.png');
  assert.equal(result.doc.nodes[0].media, 'data:image/png;base64,Qg==');
  assert.deepEqual(result.notices, []);
  assert.equal(result.input.value, '');
});
test('ND-024 latest read failure invalidates older pending reads', async () => {
  const result = await concurrentReads({ failure: true });
  assert.equal(result.writes, 0);
  assert.equal(result.doc.nodes[0].media, undefined);
  assert.equal(result.notices.length, 1);
});
test('ND-024 latest oversized selection invalidates older pending reads', async () => {
  const result = await concurrentReads({ oversized: true });
  assert.equal(result.reads, 1);
  assert.equal(result.writes, 0);
  assert.equal(result.doc.nodes[0].media, undefined);
  assert.equal(result.notices.length, 1);
});
test('ND-024 concurrent reads on A then B attach only to the new target', async () => {
  const result = await concurrentReads({ switchThought: true });
  assert.equal(result.writes, 1);
  assert.equal(result.doc.nodes[0].media, undefined);
  assert.equal(result.doc.nodes[1].mediaName, 'newer.png');
});
