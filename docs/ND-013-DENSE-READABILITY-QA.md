# ND-013 — dense graph/mobile readability (scoped before code)

Run: nodus-chat-20261116T205036881Z-nd013-pages · 2026-11-16 UTC

Problem: at distant zoom the current neural view still offers truncated, unreadably tiny labels in large graphs; selecting a long Persian/English title on a 390px phone only shows two lines. Preserve the graph as a spatial overview without changing saved node geometry.

Branch: `feat/nd-013-dense-graph-readability` from main `26fafac05c320ed5db30a0ee908dd816714acdd9`; source tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Existing ND-001 stays on its own unpublished branch.

Acceptance for this bounded slice:
- The 20-node layout retains its existing overview labels.
- At 100/500 nodes, low zoom shows neurons and edges but suppresses unreadable *unselected* captions; selected/focused/hovered node title remains visible, with full phrase and mobile multi-line wrapping.
- At 390px, selected captions have contrast and a capped width; coarse-pointer core tap area is at least 44px without enlarging visual dots. Preserve RTL/LTR, IME, Enter/Tab, pan, drag, undo, persistence and motion settings.
- Recheck 20, 100 and 500 synthetic cases, FA and EN; TypeScript/build/full tests and real 4173 screenshots before release. A screenshot of a CSS fixture is not proof of the real app.

Scope of source change: presentation-only `components/Canvas.tsx` and `components/canvas-design.css`; no data model, storage, new dependencies, server endpoints or network writes.

GitHub site request: inspect hosting contract and auth before publishing. GitHub Pages cannot run the existing authenticated Next/Cloudflare Worker API or its D1/R2 persistence. Do not expose private workspaces, copy auth tokens, replace the Site or present a static redirect as the full app. GitHub-hosted production remains blocked pending a compatible server deployment and permission review; GitHub remains the source repo.

Status before implementation: **In progress / branch only**, release **Blocked**, no screenshots or tests claimed.

## Implemented branch slice — 2026-11-16

- Source branch: `feat/nd-013-dense-graph-readability` from main `26fafac05c320ed5db30a0ee908dd816714acdd9`.
- Implementation head before this documentation commit: `fb0a9ed1cbd4ea0ae9a652c02e2e6529cc33da2a`, tree `273514ff05105a85832a908f46cb2bd3dc1ee7f5`.
- Controls: `lib/canvas-label-detail.ts` chooses **full / compact / overview** based on node count and zoom. `components/Canvas.tsx` uses the view-only policy and calculates a horizontal caption shift for the active, hovered, or keyboard-roved node; no node coordinates or persistence change.
- `components/canvas-design.css` hides only unfocused/unselected captions and badges at distant zoom on boards over 24 nodes. Active captions retain a readable 5-line panel. In narrow viewports and split views, labels and inline title editors are clamped to the actual canvas width, not just the browser window; coarse-pointer core hit areas have a 44px screen-size floor.

### Executed checks (not historical claims)

- **9/9 native Node 22.16.0 focused tests PASS**, checked-in `tests/canvas-label-detail.test.ts`, with exact local Git blob SHA `68ccc89a7d61056ab70dc5efcab7df20d89dc4d8` and helper SHA `6545cf9bf911958a2489814b636c646403601fa9`. Earlier failed newly added assertion was corrected before recording this pass.
- Global **TypeScript 5.8.3 isolated helper** `--strict --noEmit` PASS. The project expects TS 5.9.3; a project-wide typecheck was **NOT RUN**.
- **Real Chromium, synthetic CSS+HTML fixture only**, five setups: 390×844 at 100 nodes/zoom .3; 1280×800 at 500 nodes/zoom .3; 390×844 at 20 nodes/zoom .3; 390×844 at 100 nodes/zoom .85 and 1.6. Persian/English titles, focused unfocused node visibility, at least 44 CSS px coarse hit area, no horizontal page overflow, and selected caption + inline editor within screen bounds passed. At 390 px/zoom 1.6, selected English label measured **left 16 px, right 374 px** after the edge-clamp fix.
- Screenshots were captured in the isolated runtime under `/mnt/data/nodus_nd013_mobile_fixture.png`, `/mnt/data/nodus_nd013_mobile_zoom_fixture.png`, `/mnt/data/nodus_nd013_mobile_english_fixture.png`, `/mnt/data/nodus_nd013_desktop_fixture.png`, and `/mnt/data/nodus_nd013_20nodes_fixture.png`. They are **not source-controlled production screenshots**. They illustrate CSS behavior with synthetic dots; they do **not** prove that NodusApp, login, pan/drag, inline IME, data save, or Site deployment works.

### Release gates and limitations

- `http://127.0.0.1:4173/`: no Nodus listener was found in this execution; the real application UI, IME, pan/drag, Undo, reload, FA/EN auth and mobile screenshot gates are **Blocked / NOT RUN**. No port was changed or taken.
- Native full test suite `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, TypeScript 5.9.3 for the entire app, and `npm run build` are **NOT RUN** because a complete private repository checkout/runtime was unavailable in this execution. Do not infer success from focused tests.
- No real authenticated two-user collaboration test; no document data or external Site touched.
- GitHub Pages cannot execute the existing authenticated dynamic Next/Cloudflare Worker handlers or the D1/R2 persistence contract. The existing GitHub project is the private **source**; no new public GitHub Pages site, CI deployment, independent server, audience change or migration was activated. See `docs/GITHUB-HOSTING.md`.
- Status: **ND-013 In progress, branch only / release Blocked**. ND-001 remains separately In progress and unshipped. `main` and live Site remain unchanged.

Next: restore an authorized full checkout and real 4173 FA/EN 390px/desktop NodusApp browser QA (including IME, selection, keyboard, pan/drag, undo, save/reload and reduced motion); run full native tests, TS 5.9.3 and build, inspect Sites head/tree and audience; independent review before guarded merge/publish. For ND-023 select a server-capable hosting/auth strategy and authorize any public GitHub Pages audience separately.
