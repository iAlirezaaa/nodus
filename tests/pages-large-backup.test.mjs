import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Local-first Pages script must exist');
const setupLine = script.split('\n').find(line => line.includes("$('import-file').onchange="));
assert.ok(setupLine, 'JSON import handler must exist');
const handler = setupLine.slice(setupLine.indexOf("$('import-file').onchange="));

async function simulate(size, { text = '{"version":1}', confirm = true, recovery = null } = {}) {
  const calls = { reads: 0, replacements: 0, confirmations: 0, messages: [] };
  const file = { size, async text() { calls.reads++; return text; } };
  const input = { files: [file], value: 'chosen.json' };
  const fakeState = { storageRecovery: recovery };
  new Function('$', 'state', 'toast', 'L', 'validate', 'window', 'restoreLocalDocument', handler)(
    () => input, fakeState, message => calls.messages.push(message), (_fa, en) => en,
    parsed => parsed, { confirm: () => { calls.confirmations++; return confirm; } },
    async () => { calls.replacements++; return true; }
  );
  await input.onchange({ target: input });
  assert.equal(input.value, '', 'File selection clears for a subsequent attempt');
  return calls;
}

test('ND-024 a 20 MiB media-containing backup reaches the guarded restore path', async () => {
  const result = await simulate(20 * 1024 * 1024);
  assert.deepEqual([result.reads, result.confirmations, result.replacements], [1, 1, 1]);
});
test('ND-024 64 MiB boundary is accepted but one byte more is refused before reading', async () => {
  const accepted = await simulate(64 * 1024 * 1024);
  assert.equal(accepted.replacements, 1);
  const rejected = await simulate(64 * 1024 * 1024 + 1);
  assert.deepEqual([rejected.reads, rejected.confirmations, rejected.replacements], [0, 0, 0]);
  assert.match(rejected.messages[0], /64 MB/);
});
test('ND-024 invalid JSON, cancelled confirmation and recovery lock do not overwrite', async () => {
  const invalid = await simulate(20 * 1024 * 1024, { text: 'not-json' });
  assert.deepEqual([invalid.reads, invalid.confirmations, invalid.replacements], [1, 0, 0]);
  const cancelled = await simulate(20 * 1024 * 1024, { confirm: false });
  assert.deepEqual([cancelled.reads, cancelled.confirmations, cancelled.replacements], [1, 1, 0]);
  const locked = await simulate(20 * 1024 * 1024, { recovery: { backupTaken: false } });
  assert.deepEqual([locked.reads, locked.confirmations, locked.replacements], [0, 0, 0]);
});
test('ND-024 import size limit keeps inline JavaScript parseable and CSP exact', () => {
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1], createHash('sha256').update(script).digest('base64'));
});
