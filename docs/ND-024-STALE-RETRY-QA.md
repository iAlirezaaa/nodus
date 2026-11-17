# ND-024 — revoke stale raw backup after an interrupted IndexedDB reread

**Run:** `nodus-auto-20261117T061359Z-nd024-native`, 2026-11-17 06:18 UTC. **Status:** In progress — branch-only; publication gate **Blocked**.

## Risk reproduced

When a malformed IndexedDB record had previously been captured, `retryRecovery()` could receive a later *generic* read/open rejection. Before this fix, the catch reused `previous.raw` and `previous.rawAvailable`, offering a download of data that was not proven to still match the store. The download could then turn on Import/Reset while a newer or otherwise unreadable record might exist. Source-exact red V8 check: on generic read failure, `rawAvailable=true` survived from a previous observation.

## Bounded change and user-facing result

In `pages/index.html`, an unsuccessful read now enables raw recovery export **only for a newly captured** `CorruptWorkspaceError` raw value. A generic error drops the unverified raw snapshot, sets `rawAvailable=false` and `backupTaken=false`, preserves the quarantine and document, and leaves the existing **Retry reading stored data / تلاش دوباره برای خواندن** available. A valid retry still restores the graph, resets stale Undo history and unlocks without performing a write. Database name `nodus-pages-v1`, record key `workspace/main`, schema and original authenticated Site are unchanged.

## Verified this run

- **Red/green (source-exact V8):** before fix generic retry kept stale `rawAvailable=true`; after fix it becomes false while document, selection, history and read-only behavior remain unchanged.
- **Committed source-exact V8 checks:** **23/23 PASS** across Persian/English synthetic contexts, generic failure, captured fresh corrupt record, undefined raw record, success, no writes, code/CSP presence and regression-file presence. These are mock-context tests, **not a real browser**.
- **Node.js v22 native isolated behavior:** **5/5 PASS** after correcting one *harness-only* cross-realm array deep-equality assertion; copied the exact 1,349-character committed `retryRecovery` function into an isolated `node --test` harness. Covers transient failure, new invalid raw, undefined raw, success and concurrent-retry guard. This **does not imply** the checked-in native suite was run.
- **Checked-in regression:** two `node:test` cases added to `tests/pages-startup-recovery.test.mjs`; these specific committed-file tests and whole-project suite were **NOT RUN** because a full source checkout could not be obtained in this environment.
- **CSP / compilation:** the original inline script digest recomputed and matched `Qr1BGGJuRHpF//gds/3jhGN6nPwcK0ZclFwo481Ij3o=`; new inline source digest `YwsyvHG1qKJPQoggT8GuZPsUUdBTujX249tZOsLppX0=` was computed, written to the existing CSP and rechecked; full committed inline JavaScript compiled. CSP was not loosened.
- **Source commit** [`ae4466cd65d741a9eb7eae3ce5cdb274e7afbe35`](https://github.com/iAlirezaaa/nodus/commit/ae4466cd65d741a9eb7eae3ce5cdb274e7afbe35); **tree** `e2ab299457939ded15b532a0cdf501a8ad86bf06`; **HTML blob** `f3a386aa1ee39452e4c5c9e46eb6d17f66a25765`, **regression blob** `61c4abeff4469b8049d1789848d737c3581103f8`.
- **Unchanged remote heads:** `main@26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`); `gh-pages@099b9755292a00f4aecdee2c06d4c0007a886678` (tree `1833868acf143be22bfb54efe46853b0e8dbde6d`).

## Blocked release gates / next action

`git ls-remote` cannot resolve `github.com` in the local runtime; full native checked-in tests, TypeScript 5.9.3, production build, real `http://127.0.0.1:4173/` IndexedDB reload, FA/EN focus/IME, desktop and 390px screenshots, independent review, and current hosted Site source tree/audience reconciliation were **not** completed. No actual screenshot or browser session. Current hosted Site connector/skill was not exposed, so Site HEAD/tree and audience are **UNVERIFIED**. No deployment, version ID or new released functionality. Preserve the branch, recover full checkout and browser testing, then independently review and reconcile both source trees before integration or publication.
