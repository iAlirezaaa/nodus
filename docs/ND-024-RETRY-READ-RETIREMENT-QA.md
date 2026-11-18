# ND-024 — fail-closed recovery Retry after retired read

Date: 2026-11-18. **Status: In progress on `fix/nd-024-startup-storage-recovery`; original hosted Site release Blocked.**

## Reproduced issue and acceptance

The optional static Pages build's `retryRecovery()` awaited `load()` and immediately declared local storage ready, removed its recovery lock, and replaced the in-memory document/history. The successful `load()` could be followed by a stale-connection `onversionchange` notification before the Retry continuation. A source-exact V8 replay of the prior committed inline handler returned **true** and switched document from `old` to `new` despite `state.localConflict=true`. This is a deterministic synthesized interleaving, **not an observed owner-data incident or a genuine two-account test**.

The acceptance is to report **false**, preserve current document, Undo/Redo, dirty status and raw export, mark retained raw snapshot stale (so import/reset require a fresh read), keep the recovery overlay active, and allow a later healthy Retry to succeed. The feature remains optional Pages-local; server D1/R2, auth, schema, media, keyboard, motion and owner data are not modified.

## Code and deterministic red/green

- Scope recorded before code in [scoping commit `0fd1814`](https://github.com/iAlirezaaa/nodus/commit/0fd18141caba9a58ffca7da6e89fa1ca768d64dd).
- [Test-only `fdf1210`](https://github.com/iAlirezaaa/nodus/commit/fdf1210b93440f993147e04248fdf32e1eff65e4) added 4 source-exact cases (`tests/pages-retry-read-retirement.test.mjs`). [Actual red CI `44420494661`](https://github.com/iAlirezaaa/nodus/actions/runs/44420494661) reported 2 failures for the retired-read cases while unaffected healthy case passed. Separate source-exact V8 old handler also reproduced `true` plus dismissal of recovery during conflict.
- [Code `bd2d407`](https://github.com/iAlirezaaa/nodus/commit/bd2d4078cba4b60d53e7e9eaff26295f80f20987), tree `f8aab81f556d788fc88e37f346235ab84dabbe16`, changes one condition immediately after the awaited read: `if(state.localConflict) throw localImportConflict(...)`. Existing catch keeps prior raw available for JSON export but `staleRaw=true` and `backupTaken=false`. A fresh healthy read resets the conflict and proceeds normally. CSP script digest updated and checked.
- First code run had **409/410 Node** due only to a test-harness cross-VM-realm `assert.deepStrictEqual([], vmArray)` mismatch, not a product failure. [Test correction `c61e813`](https://github.com/iAlirezaaa/nodus/commit/c61e81349420447c9943948961c841dc34802cef) compares array lengths. Final code+test tree `dcb3b73ff9636cc7b283476c9837edac4a7a66f9`.
- [Exact-code CI `44421113986`](https://github.com/iAlirezaaa/nodus/actions/runs/44421113986): checked-in **410/410 Node PASS**, TypeScript `tsc --noEmit` PASS, production build PASS (job log inspected). Chromium real browser on exact `http://127.0.0.1:4173/` still **PENDING / installing Chromium at documentation checkpoint**. Its fixture tests are separate from two genuine authenticated accounts, and do not inject this new microtask race. Screenshot path **pending browser artifact**; no new UI layout control was added.

## Release and remaining gates

GitHub `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). Native Sites skill registry returned empty, so current original Site HEAD/tree/audience and its active release cannot be read or reconciled. Genuine two-account access/revocation, independent integration review and original Site screenshot were **not** performed. GitHub metadata reports repo visibility public, inconsistent with the intended private setting; no settings changed. **Deployment ID/version: NONE.** No main, original Site, owner data or gh-pages write. Next: reconcile browser CI, original Site source/audience and independent/account gates before a guarded integration. ND-025 mobile Fit readability remains next afterward.
