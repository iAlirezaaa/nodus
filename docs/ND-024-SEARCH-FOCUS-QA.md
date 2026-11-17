# ND-024 — Search-dialog focus restoration (pre-edit scope)

Run: `nodus-auto-20261117T1320Z-nd024-native-gates-11`; 2026-11-17 13:23 UTC. Status: **In progress**; release **Blocked**.

## Baseline and boundary

- Branch: `fix/nd-024-startup-storage-recovery` at `18e6cb161380c9485eded6dbdd0a7774a4651bbc`; tree `f3f985e97fd44efb1544ce65dc6827291ac671ee`.
- Main: `26fafac05c320ed5db30a0ee908dd816714acdd9`; tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Site project `appgprj_6af58606fb9c81918541f056a898c1a2`: source head, tree and audience unverified; **do not publish** without authorized Sites checks.
- Full native checkout blocked by container GitHub DNS; `127.0.0.1:4173` connection refused. Current Sites skills unavailable; browser connection requires initiating browser context. No screenshot/real IndexedDB evidence.

## User problem and evidence to reproduce

The Pages search dialog closes with `hidden=true` on Escape, Close, and backdrop. Keyboard focus can remain on its now-hidden search input/Close button. Graph shortcuts and Tab flow then become confusing or inaccessible even though the modal is no longer visible. Opening search from a focused graph card and returning to it needs to preserve the card context without unexpectedly moving the canvas.

## Acceptance

1. On Escape, Close or backdrop, focus returns to the opener if still mounted, or the corresponding current card if rerendered, or a safe visible graph/toolbar fallback.
2. Selecting a search result retains its existing behavior: navigate to its nested board, select it, and focus it; do not restore the old opener after selecting a result.
3. Repeated opens/closes leave no stale focus target; no document writes purely for focus. Native button/Tab/IME shortcuts, selection, pan/drag, Undo, FA/EN and 390px behavior remain intact.
4. Source-exact red/green focused test with a checked-in regression. Confirm entire inline JS syntax and CSP digest. Native full suite, project TypeScript/build, actual 4173 browser and screenshot, real IndexedDB, independent review and Sites parity are separate release gates.

## Bounded slice

Continue `fix/nd-024-startup-storage-recovery`; change only search-dialog focus lifecycle in `pages/index.html` and add `tests/pages-search-focus.test.mjs`. Keep recovery logic, persisted schema, public gh-pages, hosted Site, main and owner data unchanged. No publication without complete gates.

## Pending verification

No test pass or deployment claimed at scoping. Screenshot: **NONE**. Release version/deployment: **NONE**.
