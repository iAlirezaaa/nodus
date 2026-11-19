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
  // Real browser motion gate: moving between full motion, reduced motion and
  // a simulated hidden document must not write graph data or keep entry classes.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-motion') === 'on');
  await page.getByRole('button', { name: 'افزودن قالب آماده' }).click();
  await page.locator('[data-starter-template="brainstorm"]').click();
  await page.getByRole('button', { name: 'افزودن به همین بوم' }).click();
  await page.waitForFunction(({key, total}) => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.document?.nodes?.length === total, {key: storageKey, total: initial.document.nodes.length + 6}, { timeout: 25000 });
  await page.waitForFunction(() => document.querySelector('[data-node].is-entering') !== null, null, { timeout: 6000 });
  await page.screenshot({ path: artifacts + '/new-nodes-motion-normal-fa-desktop.png' });
  // Live entry classes on the home board cannot outlive navigation to a
  // nested board. Navigate by the real search/breadcrumb UI, without remount.
  const writesBeforeNestedNavigation = (await snapshot()).writes;
  await page.locator('.sidebar-search').click();
  await page.locator('.search-box input').fill('طرح اولیه');
  await page.locator('.search-results button').first().click();
  await page.locator('[data-node="clarity-inner-start"]').waitFor({ timeout: 10000 });
  assert(await page.locator('[data-node="clarity-root"]').count() === 0,
    'Nested navigation must remove home-board nodes from the canvas');
  assert((await snapshot()).writes === writesBeforeNestedNavigation,
    'Navigating to a nested board must not write the document');
  const nestedCountBefore = (await snapshot()).document.nodes.length;
  await page.getByRole('button', { name: 'افزودن قالب آماده' }).click();
  await page.locator('[data-starter-template="brainstorm"]').click();
  await page.getByRole('button', { name: 'افزودن به همین بوم' }).click();
  await page.waitForFunction(({key,total}) =>
    JSON.parse(sessionStorage.getItem(key) ?? 'null')?.document?.nodes?.length === total,
    {key: storageKey, total: nestedCountBefore + 6}, { timeout: 25000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-node].is-entering').length > 0,
    null, { timeout: 6000 });
  const nestedInserted = await snapshot();
  assert(nestedInserted.document.nodes.filter(node => node.boardId === 'clarity-design-board').length === 8,
    'Nested template must preserve both original notes and add six only inside that board');
  await page.screenshot({ path: artifacts + '/new-nodes-motion-nested-fa-desktop.png' });
  await page.locator('.breadcrumbs').getByRole('button', { name: 'یک ایده، چند مسیر' }).click();
  await page.locator('[data-node="clarity-root"]').waitFor({ timeout: 10000 });
  assert(await page.locator('[data-node="clarity-inner-start"]').count() === 0,
    'Returning home must not show nested-board nodes');
  await page.locator('.sidebar-search').click();
  await page.locator('.search-box input').fill('طرح اولیه');
  await page.locator('.search-results button').first().click();
  await page.locator('[data-node="clarity-inner-start"]').waitFor({ timeout: 10000 });
  assert(await page.locator('[data-node].is-entering').count() === 0,
    'Re-entering a populated nested board must not replay a stale entry animation');
  assert((await snapshot()).writes === nestedInserted.writes,
    'Returning between boards must not write the document');
  await page.locator('.breadcrumbs').getByRole('button', { name: 'یک ایده، چند مسیر' }).click();
  await page.locator('[data-node="clarity-root"]').waitFor({ timeout: 10000 });
  const beforeMotionPrefsWrites = (await snapshot()).writes;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-motion') === 'off' && !document.querySelector('[data-node].is-entering'));
  assert((await snapshot()).writes === beforeMotionPrefsWrites, 'Reduced motion must not save graph data');
  await page.screenshot({ path: artifacts + '/new-nodes-motion-reduced-fa-desktop.png' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-motion') === 'on');
  await page.evaluate(() => {
    // Simulate a background tab deterministically; not a physical tab-switch claim.
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-motion') === 'off' && !document.querySelector('[data-node].is-entering'));
  assert((await snapshot()).writes === beforeMotionPrefsWrites, 'Hidden document must not save graph data');
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-canvas]')?.getAttribute('data-motion') === 'off');
  assert((await snapshot()).writes === beforeMotionPrefsWrites, 'Switching presentation motion must not change persisted nodes');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-node]').first().waitFor();
  assert((await snapshot()).document.nodes.length === initial.document.nodes.length + 12, 'Both home and nested templates must survive reload');
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
      const pagerButtons = [rect('.canvas-heading .reading-pages button:first-child'), rect('.canvas-heading .reading-pages button:last-child')];
      const titleElement = document.querySelector('.canvas-heading h1');
      const headingElement = document.querySelector('.canvas-heading');
      const headerShield = getComputedStyle(headingElement, '::before');
      const lineHeight = Number.parseFloat(getComputedStyle(titleElement).lineHeight);
      return { viewport: innerWidth, titleWhiteSpace: getComputedStyle(titleElement).whiteSpace,
        titleLines: title.height / lineHeight, titleOutside: title.left < 0 || title.right > innerWidth,
        headerShieldVisible: headingElement.classList.contains('is-reading') &&
          headerShield.content !== 'none' && headerShield.backgroundImage.includes('linear-gradient') &&
          headerShield.pointerEvents === 'none',
        titleActionsOverlap: overlaps(title, actions),
        pagerLayoutOverlap: overlaps(pager, layoutButton),
        pagerMagnetOverlap: overlaps(pager, magnetic),
        pagerOutside: pager.left < 0 || pager.right > innerWidth,
        pagerTapTargetsSmall: pagerButtons.some(button => button.right - button.left < 44 || button.height < 44),
        pagerTapTargetsOutside: pagerButtons.some(button => button.left < 0 || button.right > innerWidth),
        pagerCountClipped: (() => { const label = document.querySelector('.reading-pages > span'); return label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1; })(),
        documentOverflows: document.documentElement.scrollWidth > innerWidth };
    });
    assert(!layout.titleOutside && layout.titleWhiteSpace === 'normal' && layout.titleLines <= 2.2,
      'Mobile title must remain legible within two lines: ' + JSON.stringify(layout));
    assert(layout.headerShieldVisible, 'Mobile reading heading must shield title without intercepting pointer events: ' + JSON.stringify(layout));
    assert(!layout.titleActionsOverlap && !layout.pagerLayoutOverlap && !layout.pagerMagnetOverlap && !layout.pagerOutside && !layout.pagerTapTargetsSmall && !layout.pagerTapTargetsOutside && !layout.pagerCountClipped && !layout.documentOverflows,
      'Mobile reading controls collide or overflow at ' + width + 'px: ' + JSON.stringify(layout));
    // Readable captions whose node centers are on-screen must remain inside the
    // mobile viewport. Offscreen nodes are intentionally not shifted into view.
    const captions = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[data-canvas][data-spotlight="true"] [data-node][data-spotlight-member="true"]')];
      return nodes.flatMap(node => {
        const caption = node.querySelector('.neuron-caption');
        if (!caption || !node.querySelector('.neuron-label')) return [];
        const rect = node.getBoundingClientRect(), bounds = caption.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        return center < 0 || center > innerWidth ? [] : [{ left: bounds.left, right: bounds.right, center }];
      });
    });
    assert(captions.every(caption => caption.left >= 8 && caption.right <= width - 8),
      'Readable captions may not clip at viewport edges (' + width + 'px): ' + JSON.stringify(captions));
    // Exercise the actual mobile neuron CSS above-core state with an isolated DOM
    // fixture override. Pure geometry tests separately cover React's side decision.
    const aboveRule = await page.evaluate(() => {
      const node = [...document.querySelectorAll('[data-canvas][data-spotlight="true"] .node-neuron[data-spotlight-member="true"]')]
        .find(item => { const box = item.getBoundingClientRect(); return box.width > 0 && box.top < innerHeight && box.bottom > 0; });
      if (!node) return null;
      const original = node.getAttribute('data-caption-side');
      const label = node.querySelector('.neuron-caption'), core = node.querySelector('.neuron-core');
      node.setAttribute('data-caption-side', 'above');
      const style = getComputedStyle(label);
      const labelBox = label.getBoundingClientRect(), coreBox = core.getBoundingClientRect();
      const result = { bottom: style.bottom, origin: style.transformOrigin,
        originOnBottom: Math.abs(Number.parseFloat(style.transformOrigin.split(' ')[1]) - label.offsetHeight) < 2,
        labelBottom: labelBox.bottom, coreTop: coreBox.top };
      if (original === null) node.removeAttribute('data-caption-side'); else node.setAttribute('data-caption-side', original);
      return result;
    });
    if (aboveRule) assert(aboveRule.originOnBottom && Number.isFinite(Number.parseFloat(aboveRule.bottom)) &&
      aboveRule.labelBottom <= aboveRule.coreTop + 1,
      'Above-core reading captions must not cover the source neuron: ' + JSON.stringify(aboveRule));
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
  // Exiting reading mode must remove the mobile overlay immediately, without saving or
  // stealing clicks from ordinary node editing and graph navigation.
  await page.getByRole('button', { name: 'Readable network view' }).click();
  assert(await page.locator('.canvas-heading.is-reading').count() === 0, 'Reading shield must be removed on exit');
  const exitedShield = await page.locator('.canvas-heading').evaluate(el => getComputedStyle(el, '::before').content);
  assert(exitedShield === 'none', 'Inactive mobile heading must have no generated shield');
  assert((await snapshot()).writes === prev, 'Closing reading mode must not write the document');
  // Deterministic 20/100/500 neighbor matrix uses the real NodusApp on the fixed 4173 port.
  // Session data here is an isolated fixture, never a genuine signed-in user or shared room.
  await page.locator('.language-button').click(); // restore Persian before the scene matrix
  const denseMatrix = [];
  for (const count of [20, 100, 500]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const scene = await page.evaluate(({ key, count }) => {
      const state = JSON.parse(sessionStorage.getItem(key));
      const root = state.document.nodes.find(n => n.id === 'clarity-root');
      state.document.nodes = state.document.nodes.filter(n => !n.id.startsWith('nd011-dense-'));
      state.document.edges = state.document.edges.filter(e => !e.id.startsWith('nd011-dense-link-'));
      const baseBoardNodes = state.document.nodes.filter(n => n.boardId === 'clarity-home').length;
      for (let i = 0; i < Math.max(0, count - baseBoardNodes); i++) {
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
      return { boardNodes: state.document.nodes.filter(n => n.boardId === 'clarity-home').length,
        documentNodes: state.document.nodes.length, neighbors: adjacent.size, writes: state.writes };
    }, { key: storageKey, count });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-canvas]').waitFor({ timeout: 45000 });
    await page.locator('.sidebar-search').click();
    await page.locator('.search-box input').fill('پروژهٔ بعدی من');
    await page.locator('.search-results button').first().click();
    await page.getByRole('button', { name: 'نمای خوانای شبکه' }).click();
    await page.locator('[data-canvas][data-spotlight="true"]').waitFor();
    const caption = await page.locator('.reading-pages > span').innerText();
    assert(scene.boardNodes === count, 'Fixed graph should have exactly '+count+' nodes on active board: '+JSON.stringify(scene));
    const expectedCaption = scene.neighbors ? '1–' + Math.min(10, scene.neighbors) + ' از ' + scene.neighbors + ' همسایه' : 'همسایه‌ای نیست';
    assert(caption.includes(expectedCaption),
      'Unexpected range for the '+count+'-neighbor graph: '+caption+' / '+JSON.stringify(scene));
    assert((await snapshot()).writes === scene.writes, 'Read-only matrix must not cause document writes');
    assert(await page.locator('[data-node][data-spotlight-member="true"]').count() >= 1,
      'Focus must remain highlighted in the '+count+'-neighbor graph');
    await page.screenshot({ path: artifacts + '/dense-reading-' + count + '-fa-desktop.png' });
    denseMatrix.push({ boardNodes: scene.boardNodes, documentNodes: scene.documentNodes, observedNeighbors: scene.neighbors, caption });
  }

  // Genuine React auto-placement regression. Prior tests manually forced the
  // attribute, proving CSS only; this pans a real selected neuron into the
  // bottom gutter and checks the attribute set by Canvas itself.
  const autoFlipEvidence = [];
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const focusedNeuron = '[data-canvas][data-spotlight="true"] .node-neuron.selected[data-spotlight-member="true"]';
    await page.locator(focusedNeuron).waitFor({ timeout: 10000 });
    const beforeWrites = (await snapshot()).writes;
    for (let attempt = 0; attempt < 5; attempt++) {
      const geometry = await page.locator(focusedNeuron).evaluate(node => {
        const surface = node.closest('[data-canvas]');
        const core = node.querySelector('.neuron-core');
        const bounds = core.getBoundingClientRect(), area = surface.getBoundingClientRect();
        return { centerY: (bounds.top + bounds.bottom) / 2,
          targetY: area.bottom - 62, area: { left: area.left, top: area.top, right: area.right, bottom: area.bottom } };
      });
      const difference = geometry.targetY - geometry.centerY;
      if (Math.abs(difference) <= 10) break;
      const dy = Math.max(-180, Math.min(180, difference));
      // Middle-button pan deliberately works over a densely packed neuron: regular left drag would edit it.
      // The visible canvas on mobile can be almost completely covered by nodes.
      // Prefer the selected neuron's interactive core (middle button forces pan),
      // then other cores and a systematic canvas scan; never pan a popup/button.
      await page.mouse.move(1, 1);
      const origin = await page.evaluate(() => {
        const surface = document.querySelector('[data-canvas]');
        if (!surface) return null;
        const bounds = surface.getBoundingClientRect();
        const permitted = (x, y) => {
          if (x < bounds.left + 3 || x > bounds.right - 3 || y < bounds.top + 3 || y > bounds.bottom - 3) return false;
          const hit = document.elementFromPoint(x, y);
          return hit && surface.contains(hit) &&
            !hit.closest('button,a,input,textarea,select,video,audio,[contenteditable="true"],[data-edge-bend],[data-node-preview]');
        };
        for (const core of surface.querySelectorAll('.node-neuron.selected .neuron-core, .node-neuron .neuron-core')) {
          const box = core.getBoundingClientRect();
          const x = box.left + box.width / 2, y = box.top + box.height / 2;
          if (permitted(x, y)) return { x, y, kind: 'visible-neuron-core' };
        }
        for (let yi = 1; yi < 16; yi++) {
          for (let xi = 1; xi < 16; xi++) {
            const x = bounds.left + bounds.width * xi / 16, y = bounds.top + bounds.height * yi / 16;
            if (permitted(x, y)) return { x, y, kind: 'canvas-surface' };
          }
        }
        return null;
      });
      assert(origin !== null, 'No browser-hit-tested canvas or neuron available for middle-button pan at ' + width + 'px');
      await page.mouse.move(origin.x, origin.y);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(origin.x, origin.y + dy, { steps: 12 });
      await page.mouse.up({ button: 'middle' });
      await delay(120);
    }
    const auto = await page.locator(focusedNeuron).evaluate(node => {
      const core = node.querySelector('.neuron-core').getBoundingClientRect();
      const caption = node.querySelector('.neuron-caption').getBoundingClientRect();
      const area = node.closest('[data-canvas]').getBoundingClientRect();
      return { side: node.dataset.captionSide, centerY: (core.top + core.bottom)/2,
        coreTop: core.top, captionTop: caption.top, captionBottom: caption.bottom,
        areaTop: area.top, areaBottom: area.bottom };
    });
    assert(auto.side === 'above', 'React must auto-flip the bottom-edge mobile reading caption: ' + JSON.stringify({ width, auto }));
    assert(auto.captionBottom <= auto.coreTop + 2 && auto.captionTop >= auto.areaTop + 6,
      'Automatically flipped caption must fit above the core within the canvas: ' + JSON.stringify({ width, auto }));
    assert((await snapshot()).writes === beforeWrites, 'Panning/auto-caption placement must not save the workspace');
    assert(await page.locator('.node-hover-preview').count() === 0,
      'Middle-button panning must not leave a preview covering the readable network at ' + width + 'px');
    await page.screenshot({ path: artifacts + '/dense-reading-auto-flip-fa-mobile-' + width + '.png' });
    autoFlipEvidence.push({ width, ...auto });
  }
  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log(JSON.stringify({ result: 'PASS', scenarios: 12, fixture: 'real NodusApp with synthetic session-storage API',
    host: base, fixedDenseNodes: denseStats.nodes, mobile, denseMatrix, autoFlipEvidence, screenshots: 14, lastWrites: final.writes }));
  await context.close();
} catch (error) {
  console.error('ND-011/013 UI verification FAILED:', error, serverOutput);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
