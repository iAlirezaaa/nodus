import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173';
const artifacts = 'artifacts/nd011-browser';
const storageKey = 'nodus:ui-fixture:clarity:server:v1';
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' },
});
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-5000); });
server.stderr.on('data', chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-5000); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Vite exited early: ' + serverOutput);
    try {
      const response = await fetch(base + '/tests/browser/clarity-session.html', { signal: AbortSignal.timeout(1200) });
      if (response.ok) { ready = true; break; }
    } catch { /* next attempt */ }
    await delay(1000);
  }
  assert(ready, 'Reserved port 4173 was not ready. ' + serverOutput);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(base + '/tests/browser/clarity-session.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-node="clarity-root"]').waitFor({ timeout: 45000 });
  const snapshot = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), storageKey);
  const initial = await snapshot();
  assert(initial?.document?.nodes?.length >= 8, 'Synthetic fixture failed to initialize');
  await page.getByRole('button', { name: 'افزودن قالب آماده' }).click();
  await page.locator('[data-starter-template="production"]').click();
  assert((await page.locator('.starter-preview li').count()) === 8, 'Production template preview must show eight editable nodes');
  await page.screenshot({ path: artifacts + '/template-preview-fa-desktop.png', fullPage: false });
  await page.getByRole('button', { name: 'افزودن به همین بوم' }).click();
  await page.waitForFunction(({key, total}) => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.document?.nodes?.length === total, {key: storageKey, total: initial.document.nodes.length + 8}, { timeout: 25000 });
  const afterInsert = await snapshot();
  assert(afterInsert.document.nodes.length === initial.document.nodes.length + 8, 'Template must append exactly eight nodes');
  assert(afterInsert.document.nodes.some(n => n.title === 'پروژهٔ انیمیشن'), 'Production root must be editable and present');
  await page.screenshot({ path: artifacts + '/template-applied-fa-desktop.png' });
  const undo = page.locator('.toast-undo');
  await undo.waitFor({ timeout: 7000 });
  await undo.click();
  await page.waitForFunction(({key, total}) => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.document?.nodes?.length === total, {key: storageKey, total: initial.document.nodes.length}, { timeout: 25000 });
  await page.getByRole('button', { name: 'افزودن قالب آماده' }).click();
  await page.locator('[data-starter-template="brainstorm"]').click();
  await page.getByRole('button', { name: 'افزودن به همین بوم' }).click();
  await page.waitForFunction(({key, total}) => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.document?.nodes?.length === total, {key: storageKey, total: initial.document.nodes.length + 6}, { timeout: 25000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-node]').first().waitFor();
  assert((await snapshot()).document.nodes.length === initial.document.nodes.length + 6, 'Persisted template must survive reload');
  await page.evaluate(key => {
    const state = JSON.parse(sessionStorage.getItem(key));
    const root = state.document.nodes.find(n => n.id === 'clarity-root');
    for (let i = 0; i < 100; i++) {
      state.document.nodes.push({ ...root, id: 'nd011-dense-' + i, boardId: 'clarity-home',
        childBoardId: null, task: undefined, annotations: undefined, title: 'Dense idea ' + i,
        x: (i % 10) * 330 - 1400, y: Math.floor(i / 10) * 240 - 800 });
      state.document.edges.push({ id: 'nd011-dense-link-' + i, boardId: 'clarity-home',
        sourceId: 'clarity-root', targetId: 'nd011-dense-' + i, label: '' });
    }
    state.revision++;
    state.updatedAt = new Date().toISOString();
    sessionStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-canvas]').waitFor({ timeout: 45000 });
  // Search navigates and focuses the source thought even when the graph exceeds the viewport.
  await page.locator('.sidebar-search').click();
  await page.locator('.search-box input').fill('پروژهٔ بعدی من');
  await page.locator('.search-results button').first().click();
  await page.getByRole('button', { name: 'نمای خوانای شبکه' }).click();
  await page.locator('[data-canvas][data-spotlight="true"]').waitFor();
  const denseStats = await page.evaluate(key => {
    const state = JSON.parse(sessionStorage.getItem(key));
    return { writes: state.writes, nodes: state.document.nodes.length,
      highlighted: document.querySelectorAll('[data-node][data-spotlight-member="true"]').length,
      dimmed: document.querySelectorAll('[data-node][data-spotlight-member="false"]').length };
  }, storageKey);
  assert(denseStats.nodes >= 110, 'Dense fixture should contain over 100 nodes');
  assert(denseStats.highlighted >= 1, 'Selected thought must remain visually emphasized');
  await page.screenshot({ path: artifacts + '/dense-reading-fa-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: artifacts + '/dense-reading-fa-mobile-390.png' });
  const mobile = await page.evaluate(() => ({ width: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth }));
  assert(!mobile.overflow, 'Mobile document must not overflow horizontally');
  const prev = (await snapshot()).writes;
  const next = page.getByRole('button', { name: 'همسایه‌های بعدی' });
  await next.click();
  await delay(250);
  assert((await snapshot()).writes === prev, 'Changing the reading page must not write the document');
  await page.locator('.language-button').click();
  await page.screenshot({ path: artifacts + '/dense-reading-en-mobile-390.png' });
  const final = await snapshot();
  assert(final.document.nodes.length === denseStats.nodes, 'Reading mode must preserve every node');
  assert(final.writes === prev, 'Presentation and language toggles must not cause graph writes');
  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log(JSON.stringify({ result: 'PASS', scenarios: 10, fixture: 'real NodusApp with synthetic session-storage API',
    host: base, fixedDenseNodes: denseStats.nodes, mobile, screenshots: 5, lastWrites: final.writes }));
  await context.close();
} catch (error) {
  console.error('ND-011/013 UI verification FAILED:', error, serverOutput);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
