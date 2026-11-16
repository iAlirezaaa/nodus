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
