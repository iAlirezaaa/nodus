# ND-024 / Keyboard context guard — pre-edit scope

Run nodus-auto-20261117T121944642Z-nd024-review; recorded 2026-11-17T12:22:36.203Z. **In progress; release Blocked**.

## Observed source and ownership
Feature branch `fix/nd-024-startup-storage-recovery`, head `b5aee78a55f6482e3bb09e46671f7496213f064c`, tree `267f3c77e9bf37631db7c37ff4622813880b6bf0`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Control lease head `ba29524b5f5be3a66413cffbcbe4d3779410bc66`. Hosted Sites head/tree/audience UNVERIFIED (no authorized Sites skill in this environment).

## Reproduced source issue and intended user behavior
On static Nodus Pages, document-level keydown intercepts **Enter** on focused Save/Export/Delete and other buttons, creates a graph node instead of letting the button activate, and can create a *second* sibling on an already-handled focused node. **Shift+Tab** on a focused node creates a child instead of moving focus backward. The global graph shortcut listener does not respect earlier handlers' `defaultPrevented`, IME, or the actual graph focus.

## This run's bounded slice
Keep the existing ND-024 data-protection branch; change only the Pages document keydown handler (and if needed node handler) to scope graph shortcuts to canvas/node focus; honor native form/button/toolbar/dialog behavior, `defaultPrevented` and IME; retain intentional canvas/node Enter/Tab/Undo and recovery focus lock. Add source-exact regression tests; preserve CSP integrity and previous document data. No schema/auth/repo visibility/Site/main/gh-pages change.

## Acceptance and verification gates
1. Enter on focused non-graph button remains native and creates zero nodes; Ctrl+Z in a focused input/toolbar does not consume graph Undo.
2. Focused canvas Enter creates exactly one thought; focused node Enter creates exactly one sibling despite event bubbling; F2/Delete likewise are not doubled.
3. Tab on selected focused node creates one child; Shift+Tab remains native backwards focus (no child); Enter during composition is not interpreted as a graph command.
4. Search-modal/recovery-modal priority, focus, FA/EN, desktop/390px behavior stay intact. No graph write on mere keyboard focus.
5. Run source-exact red/green and checked-in focused tests. Full native suite, TypeScript, build, real 4173 FA/EN screenshot, storage/reload and Sites parity must be separately verified before release.

## Verification results
Pending. Real screenshot NONE. New version/deployment NONE. Gate **Blocked** until completed.

## Implemented and tested — 2026-11-17T12:35:06.479Z

**Source:** `pages/index.html` on `fix/nd-024-startup-storage-recovery`. Source/test commit [`7e646c2f`](https://github.com/iAlirezaaa/nodus/commit/7e646c2fb429b985712f1982521e28339633b2af), tree `6956f4d244b4cba3e7904ee99f36e6611f618d88`; corrected checked-in test commit [`d8f0a39d`](https://github.com/iAlirezaaa/nodus/commit/d8f0a39def33595848dc27bdfb93f891f73f25f0), tree `70cabc206eb4eae586621efca9034c4a92bcfa53`. Original inline JS blob `c46defd368393fd2bb492655c5047fdf0fdd888f`.

**Actual behavior change:** document-level graph shortcuts now exit if a prior handler prevented the event, if IME composition is active, or if focus is outside the canvas/idea card. The existing search and recovery modal guards remain before graph-focus checks. Forward Tab on a focused selected idea still creates a child; Shift+Tab is native backwards navigation. Node-local Enter/F2/Delete handlers prevent default, so document bubbling cannot execute a second graph edit. Toolbar, Save/Export/Delete buttons, inspector fields and selects retain native keyboard behavior. No saved document or storage-schema change, no new shortcut or control.

**Exact-source red/green:** old GitHub handler failed **8 of 12** scoped interaction scenarios (focused button Enter; toolbar Ctrl+Z; bubbled node Enter, F2 and Delete; node Shift+Tab; IME Enter; already-handled canvas Enter). Patched exact source passes **12/12** under isolated V8 event/DOM mocks. The five newly checked-in `node:test` cases were additionally run under an isolated V8 Node-facade harness: **5/5 passed**; **native Node module runner was NOT run**. This is not a browser screenshot or authenticated-session proof. Full source inline JavaScript compiled with `new Function`; independent SHA-256 implementation was checked against the original CSP and recomputed to `sha256-sGddm7tzOcgzZDQxfJti9yUmpqEW+XG2kvAS1lcVVQE=`. Source was re-read from GitHub after the commit.

**Blocked release gates:** the required native checkout and full Node suite, TypeScript 5.9.3, production build, real `http://127.0.0.1:4173/` browser interaction (localhost connection refused), true IndexedDB two-tab save/reload, FA/EN and 390px screenshots, independent review and current Site HEAD/tree/audience (current Sites skill unavailable). No screenshot, release ID or deployment ID. Main `26fafac05c320ed5db30a0ee908dd816714acdd9` and the existing Site were not modified. GitHub metadata reports **public**, contrary to requested private state; visibility was left unchanged.

**Disposition:** ND-024 **In progress; release Blocked**. Only branch changes. Next: recover full authorized checkout and Site source; run checked-in native tests, TS/build and 4173 keyboard/IME, IndexedDB and FA/EN/390px screenshot checks; independently review, compare exact trees and audience, then guarded integration/publication only if green.
