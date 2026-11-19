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
  // A navigation sidebar open at desktop width must not cover canvas controls after narrowing.
  await page.locator('.sidebar-scrim').waitFor({ state: 'detached', timeout: 5000 });
  // Header/pager regression: no dense-reading controls may cover the board name at 390 or 320px.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector);
        if (!element) throw new Error('Missing reading control: ' + selector);
        const b = element.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, height: b.height };
      };
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const title = rect('.canvas-heading h1');
      const actions = rect('.canvas-heading .canvas-reading-actions');
      const pager = rect('.canvas-heading .reading-pages');
      const magnetic = rect('.magnet-launch');
      const layoutButton = rect('.canvas-reading-actions .arrange-button:last-child');
      const titleElement = document.querySelector('.canvas-heading h1');
      const lineHeight = Number.parseFloat(getComputedStyle(titleElement).lineHeight);
      return { viewport: innerWidth, titleWhiteSpace: getComputedStyle(titleElement).whiteSpace,
        titleLines: title.height / lineHeight, titleOutside: title.left < 0 || title.right > innerWidth,
        titleActionsOverlap: overlaps(title, actions),
        pagerLayoutOverlap: overlaps(pager, layoutButton),
        pagerMagnetOverlap: overlaps(pager, magnetic),
        pagerOutside: pager.left < 0 || pager.right > innerWidth,
        pagerCountClipped: (() => { const label = document.querySelector('.reading-pages > span'); return label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1; })(),
        documentOverflows: document.documentElement.scrollWidth > innerWidth };
    });
    assert(!layout.titleOutside && layout.titleWhiteSpace === 'normal' && layout.titleLines <= 2.2,
      'Mobile title must remain legible within two lines: ' + JSON.stringify(layout));
    assert(!layout.titleActionsOverlap && !layout.pagerLayoutOverlap && !layout.pagerMagnetOverlap && !layout.pagerOutside && !layout.pagerCountClipped && !layout.documentOverflows,
      'Mobile reading controls collide or overflow at ' + width + 'px: ' + JSON.stringify(layout));
    await page.screenshot({ path: artifacts + '/dense-reading-fa-mobile-' + width + '.png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // The drawer can still be opened intentionally at mobile width and dismissed normally.
  await page.getByRole('button', { name: 'بازکردن فهرست' }).click();
  assert(await page.locator('.sidebar-scrim').isVisible(), 'Mobile navigation must remain available by explicit action');
  await page.locator('.sidebar-close').click();
  await page.locator('.sidebar-scrim').waitFor({ state: 'detached', timeout: 5000 });
  const mobile = await page.evaluate(() => ({ width: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth }));
  assert(!mobile.overflow, 'Mobile document must not overflow horizontally');
  const prev = (await snapshot()).writes;
  const next = page.getByRole('button', { name: 'همسایه‌های بعدی' });
  await next.click();
  await delay(250);
  const secondCaption = await page.locator('.reading-pages > span').innerText();
  assert(/11–20/.test(secondCaption), 'Pager must expose the inclusive range after next: '+secondCaption);
  assert((await snapshot()).writes === prev, 'Changing the reading page must not write the document');
  await page.locator('.language-button').click();
  const englishCaption = await page.locator('.reading-pages > span').innerText();
  assert(/11–20 of \d+ neighbors/.test(englishCaption), 'English reading page must give its exact range: '+englishCaption);
  await page.screenshot({ path: artifacts + '/dense-reading-en-mobile-390.png' });
  const final = await snapshot();
  assert(final.document.nodes.length === denseStats.nodes, 'Reading mode must preserve every node');
  assert(final.writes === prev, 'Presentation and language toggles must not cause graph writes');
  // Deterministic 20/100/500 neighbor matrix uses the real NodusApp on the fixed 4173 port.
  // Session data here is an isolated fixture, never a genuine signed-in user or shared room.
  await page.locator('.language-button').click(); // restore Persian before the scene matrix
  const denseMatrix = [];
  for (const count of [20, 500]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const scene = await page.evaluate(({ key, count }) => {
      const state = JSON.parse(sessionStorage.getItem(key));
      const root = state.document.nodes.find(n => n.id === 'clarity-root');
      state.document.nodes = state.document.nodes.filter(n => !n.id.startsWith('nd011-dense-'));
      state.document.edges = state.document.edges.filter(e => !e.id.startsWith('nd011-dense-link-'));
      for (let i = 0; i < count; i++) {
        state.document.nodes.push({ ...root, id: 'nd011-dense-' + i, boardId: 'clarity-home',
          childBoardId: null, task: undefined, annotations: undefined, title: 'Dense idea ' + i,
          x: (i % 25) * 160 - 1800, y: Math.floor(i / 25) * 180 - 900 });
        state.document.edges.push({ id: 'nd011-dense-link-' + i, boardId: 'clarity-home',
          sourceId: 'clarity-root', targetId: 'nd011-dense-' + i, label: '' });
      }
      const adjacent = new Set(state.document.edges.filter(e => e.boardId === 'clarity-home' &&
        (e.sourceId === 'clarity-root' || e.targetId === 'clarity-root'))
        .map(e => e.sourceId === 'clarity-root' ? e.targetId : e.sourceId).filter(id => id !== 'clarity-root'));
      state.revision++;
      state.updatedAt = new Date().toISOString();
      sessionStorage.setItem(key, JSON.stringify(state));
      return { nodes: state.document.nodes.length, neighbors: adjacent.size, writes: state.writes };
    }, { key: storageKey, count });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-canvas]').waitFor({ timeout: 45000 });
    await page.locator('.sidebar-search').click();
    await page.locator('.search-box input').fill('پروژهٔ بعدی من');
    await page.locator('.search-results button').first().click();
    await page.getByRole('button', { name: 'نمای خوانای شبکه' }).click();
    await page.locator('[data-canvas][data-spotlight="true"]').waitFor();
    const caption = await page.locator('.reading-pages > span').innerText();
    assert(caption.includes('1–10 از ' + scene.neighbors + ' همسایه'),
      'Unexpected range for the '+count+'-neighbor graph: '+caption+' / '+JSON.stringify(scene));
    assert((await snapshot()).writes === scene.writes, 'Read-only matrix must not cause document writes');
    assert(await page.locator('[data-node][data-spotlight-member="true"]').count() >= 1,
      'Focus must remain highlighted in the '+count+'-neighbor graph');
    await page.screenshot({ path: artifacts + '/dense-reading-' + count + '-fa-desktop.png' });
    denseMatrix.push({ requestedNeighbors: count, observedNeighbors: scene.neighbors, nodes: scene.nodes, caption });
  }
  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log(JSON.stringify({ result: 'PASS', scenarios: 10, fixture: 'real NodusApp with synthetic session-storage API',
    host: base, fixedDenseNodes: denseStats.nodes, mobile, denseMatrix, screenshots: 8, lastWrites: final.writes }));
  await context.close();
} catch (error) {
  console.error('ND-011/013 UI verification FAILED:', error, serverOutput);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
