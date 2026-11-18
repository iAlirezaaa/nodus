# ND-024 — Retain raw recovery backup after a transient IndexedDB restore failure

**Date:** 2026-11-18 UTC · **Status:** In progress / branch-only; not released.
**Branch:** `fix/nd-024-startup-storage-recovery` · **Run:** `nodus-auto-20261118T0811Z-nd024-integrity`.

## Problem and delivered change

In the separate static Nodus Pages/local-first edition, the recovery dialog already required the user to download losslessly serializable raw IndexedDB data before replacing a corrupt record. Previously, even a temporary quota error during the guarded replacement discarded that already verified raw snapshot and backup confirmation. The user could not retry safely without a new reload/backup action.

The existing **Safe data recovery → Download raw data → Import JSON / Start new workspace** flow now keeps the exported raw record, `rawAvailable`, and `backupTaken` after a transient failed write while leaving the quarantine, graph, selection, history and persisted data unchanged. A detected changed raw IndexedDB record still raises `LocalRecoveryConflictError`, invalidates stale backup consent, blocks replacement and requires a new read. A guarded comparison and transaction completion remain mandatory before unlocking. No schema, D1/R2, authenticated accounts, or motion changes.

## Changes, negative test and verified evidence

- Scope before changes: [49420d9](https://github.com/iAlirezaaa/nodus/commit/49420d9b0d8aff148e003b4db841a29da6bce021).
- Initial code/test [c6c49d4](https://github.com/iAlirezaaa/nodus/commit/c6c49d4dcd9146c3bdadb976ca28a334778d5702) ran **330/332 native tests** (2 failures). One was a cross-realm VM assertion in a new test; the other was a real stale-backup consent regression expectation. These were corrected, not omitted.
- Final source and tests: [8f4ca2f](https://github.com/iAlirezaaa/nodus/commit/8f4ca2febe3003c5a7e2824ab671afa634d32c71), source CSP SHA256 `KQbpXdhYIe8hLnKKuVHvEK4NPaf44tRL5uUyuzpAdJo=`.
- Real Chromium/IndexedDB fixture expansion: [e4d44e5](https://github.com/iAlirezaaa/nodus/commit/e4d44e5d838f4ba0be1976ace35eca1b20e97d12), tree `0e53ce6be46b3580dbfe1304127b78a1cbf13adf`.
- [GitHub Actions run 44266591852](https://github.com/iAlirezaaa/nodus/actions/runs/44266591852) on that exact source: **332/332 checked-in Node tests PASS**, 0 failed/0 skipped; project TypeScript (`tsc --noEmit`) **PASS**; production build **PASS**.
- Same successful Actions run: **13/13 actual Chromium scenario groups PASS** on `http://127.0.0.1:4173/`. New isolated-context test creates a corrupt IndexedDB record, downloads its raw JSON, triggers a quota error on restore, confirms the raw backup consent and recovery lock persist with zero graph/Undo writes, retries successfully and confirms reload persistence. Existing two-tab conflict, FA/EN desktop/mobile 390px, Enter/Tab, synthetic IME composition, media-read failure, calm/off/reduced-motion no-write checks continue to pass.
- [Screenshot artifact #14411775183](https://github.com/iAlirezaaa/nodus/actions/runs/44266591852/artifacts/14411775183): seven real Chromium PNGs, including the new `nd024-recovery-quota-retry.png`. Images were produced by Playwright; visual inspection of the ZIP by this run was not performed.

## Remaining release gates

These are **fixture/browser checks in the standalone Pages edition**, not tests of the authenticated live Nodus Site, two real user accounts, a physical Persian IME, or a touch device. Native Sites skill list was empty; connected Browser refused access without an originating browser. The live Site HEAD/tree/audience and independent authenticated permission review remain **Blocked/UNVERIFIED**; no source-tree parity claim is made.

`main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` with tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. No merge, production/Pages deployment or new release/version ID; owner data not touched. GitHub reports repository visibility `public`, contrary to the expected private status; it was not changed.

**Next:** inspect authenticated Sites source/tree/audience and two permitted account sessions; obtain independent integration review. Merge/publish only after all gates pass. ND-025 mobile Fit text legibility remains queued.
