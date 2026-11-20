import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173';
const artifacts = 'artifacts/nd027-browser';
const storageKey = 'nodus:ui-fixture:neural-zones:server:v1';
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' },
});
let output = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk.toString()).slice(-6000); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
let browser;
const pageErrors = [];
async function verifyAtlas(context, label, options = {}) {
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(label + ': ' + error.message));
  await page.goto(base + '/tests/browser/neural-zones-fixture.html' + (options.dense ? '?nd027-dense=1' : ''),
    { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-node="fixture-story"]').waitFor({ timeout: 45000 });
  const read = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), storageKey);
  const first = await read();
  assert(first?.document?.boards?.[0]?.zones?.length === 2, label + ': expected two authentic fixture Zones');
  if (options.english) {
    await page.locator('.language-button').click();
    await page.waitForFunction(() => document.querySelector('.app-shell')?.getAttribute('dir') === 'ltr');
  }
  if (options.dense) {
    const denseSnapshot = await read();
    assert(denseSnapshot.document.nodes.length >= 100,
      label + ': validated DEV fixture should contain at least 100 nodes; found ' + denseSnapshot.document.nodes.length);
  }
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-canvas]').getAttribute('data-atlas-overview') === 'true') break;
    await page.locator('.zoom-controls .icon-button').first().click();
  }
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-atlas-overview') === 'true', null, { timeout: 5000 });
  const badge = page.locator('[data-zone-overview]');
  await badge.first().waitFor({ timeout: 5000 });
  const labels = await badge.evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(), canvas = el.closest('.canvas').getBoundingClientRect();
    return { id: el.dataset.zoneOverview, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      width: r.width, height: r.height, canvasLeft: canvas.left, canvasRight: canvas.right,
      canvasTop: canvas.top, canvasBottom: canvas.bottom };
  }));
  assert(labels.length >= 1 && labels.length <= 48, label + ': missing finite Zone overview badges ' + JSON.stringify(labels));
  for (let i = 0; i < labels.length; i++) {
    const a = labels[i];
    assert(Math.abs(a.height - 44) <= 1, label + ': chips must remain 44px at any zoom');
    assert(a.left >= a.canvasLeft + 11 && a.right <= a.canvasRight - 11, label + ': badge out of horizontal viewport');
    for (let j = i + 1; j < labels.length; j++) {
      const b = labels[j];
      assert(a.right + 7 <= b.left || b.right + 7 <= a.left || a.bottom + 7 <= b.top || b.bottom + 7 <= a.top,
        label + ': Zone labels overlap ' + JSON.stringify([a, b]));
    }
  }
  if (options.dense) assert(await page.locator('[data-canvas]').getAttribute('data-atlas-dense') === 'true',
    label + ': dense graph presentation flag missing');
  const before = (await read()).writes;
  await page.screenshot({ path: artifacts + '/' + label + '.png', fullPage: false });
  await badge.first().click();
  await page.locator('.zones-panel').waitFor({ timeout: 7000 });
  assert((await read()).writes === before, label + ': zoom, overview and opening editor must not write graph data');
  await page.close();
  return { label, badges: labels.length, writes: before };
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite exited early: ' + output);
    try {
      const response = await fetch(base + '/tests/browser/neural-zones-fixture.html', { signal: AbortSignal.timeout(1200) });
      if (response.ok) { ready = true; break; }
    } catch { /* retry */ }
    await sleep(1000);
  }
  assert(ready, 'Reserved port 4173 was unavailable: ' + output);
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const { name, size, options } of [
    { name: 'atlas-fa-desktop', size: { width: 1280, height: 800 }, options: {} },
    { name: 'atlas-en-desktop', size: { width: 1280, height: 800 }, options: { english: true } },
    { name: 'atlas-fa-mobile-390', size: { width: 390, height: 844 }, options: {} },
    { name: 'atlas-fa-dense-desktop', size: { width: 1280, height: 800 }, options: { dense: true } },
  ]) {
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
    results.push(await verifyAtlas(context, name, options));
    await context.close();
  }
  assert(pageErrors.length === 0, 'Uncaught browser errors: ' + pageErrors.join(' | '));
  console.log(JSON.stringify({ result: 'PASS', fixture: 'real NodusApp + synthetic isolated session storage',
    host: base, scenarios: results.length, screenshots: results.length, results }));
} catch (error) {
  console.error('ND-027 atlas browser QA FAILED:', error, output);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
