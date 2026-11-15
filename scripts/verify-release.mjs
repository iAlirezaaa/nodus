/**
 * Cross-platform, fail-fast release verification. Runs the same three gates
 * locally and in CI without shell-dependent test globs or npm binary shims.
 * Does not deploy, modify documents or start a preview server.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = readdirSync(path.join(root, 'tests'))
  .filter(name => /\.test\.(?:ts|mjs)$/.test(name))
  .sort();
if (names.length === 0) {
  console.error('Release gate aborted: no .test.ts or .test.mjs files found.');
  process.exit(1);
}

const gates = [
  ['Native repository tests', [
    '--import', './tests/server-loader.mjs', '--test',
    ...names.map(name => path.join('tests', name)),
  ]],
  ['Project TypeScript', ['./node_modules/typescript/bin/tsc', '--noEmit']],
  ['Production build', ['./scripts/run-framework.mjs', 'build']],
];
console.log('Nodus release verification: ' + names.length + ' test files; fail-fast order is tests, TypeScript, build.');
for (const [label, args] of gates) {
  console.log('\n>>> ' + label);
  const result = spawnSync(process.execPath, args, {
    cwd: root, stdio: 'inherit', env: process.env, shell: false,
  });
  if (result.error) {
    console.error('Release gate could not start ' + label + ': ' + result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('Release gate blocked by ' + label + ' (exit ' + (result.status ?? 'signal') + ').');
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
}
console.log('\nAll three release gates passed.');
