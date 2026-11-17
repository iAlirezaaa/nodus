# ND-024 — atomic ordinary autosave conflict guard

**2026-11-17 · pre-edit scope · nodus-auto-20261117T111306Z-nd024-native · In progress / no release**
Branch `fix/nd-024-startup-storage-recovery` from observed head `29710c20058ac4d03270cfab684ae5fd3c9ca2ec`, tree `9820cf48930c6862f78d7295171f401295c811e5`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Hosted Sites head/tree unavailable; no Site change authorized until verified.

## Reproduced risk to investigate

Existing normal `queueSave` calls an **unconditional** IndexedDB `persist(snapshot)` after its debounce/queue. The ordinary JSON Import path has a compare-and-write guard, but another tab's newer ordinary save can still be overwritten by this path. This is a data-loss bug, not a new feature.

## Acceptance

1. Each normal autosave compares the last acknowledged raw baseline with current IndexedDB `workspace/main` in **the same readwrite transaction** as `put`.
2. Sequential saves from this tab retain the ordered baseline and continue to pass; genuinely absent workspace may be created only if the key remains absent.
3. A foreign update/creation/deletion/present-undefined or unsafe record causes **no put**, latches `localConflict`, preserves in-memory graph/Undo, retains the unsaved-exit warning and allows JSON export.
4. Real native focused Node regression(s), plus TypeScript/build and real 4173 browser/IndexedDB/FA-EN/mobile/screenshot before release. Never call a mock test full browser proof.
5. No authentication, shared D1/R2, schema, motion, keyboard, main, Pages publication or Site change in this slice.

## Planned slice

Reuse the already-tested atomic `persistImportIfUnchanged` helper for ordinary `persist`, pass the last acknowledged `state.storedBaseline` **at queue execution time**, catch named conflicts in `queueSave`, add regression for normal autosave and serial edits. Test changes and record exact gates. Leave incomplete code on this branch.

## Verification record

Not run yet. Screenshot: NONE. Deployment/version: NONE.
