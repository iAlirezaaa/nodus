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

## Result — 2026-11-17 11:18 UTC

**Code:** [`46a642a956972b7c74675b8c20cdfc842dc2c1a3`](https://github.com/iAlirezaaa/nodus/commit/46a642a956972b7c74675b8c20cdfc842dc2c1a3), source tree `f056e888cbd81cd91995deb31522b14b634b6b77`, source blob `c46defd368393fd2bb492655c5047fdf0fdd888f`. New test blob `a733524aa899fb74bcf7933abb1476efe4c5cacd`. No deployed version.

### Actual change

`persist(snapshot,baseline)` now delegates to the existing guarded IndexedDB compare-and-put helper. `queueSave` supplies the last acknowledged `state.storedBaseline` **when its serialized save executes**, not at schedule time. If another tab has stored a new, missing or incompatible record, this transaction rejects before writing. The named conflict latches `localConflict`, leaves local memory/Undo intact, marks unsaved changes, displays a clear FA/EN save-conflict status and offers the already-existing JSON export / reload path. Later queued saves also refuse writes. Ordinary quota failures remain retryable, not false conflicts.

There is no new button or shortcut: this behavior applies to the existing **automatic local save / Save** action. The HTML inline CSP digest was updated to `sha256-9dd81SJkQ4m6zxrJLnGrGQEZwfia2E6CwK0JRkRxAQA=` without loosening policy. No schema, migration, service data, D1/R2, collaboration or motion changes.

### Executed tests and strict limits

- **Before:** V8 execution of the exact pre-fix GitHub `persist` (blob `2c6d99f8cc41ab4e5554eb645502207aeb2defb8`) returned success and made **one overwrite** of a foreign record; no conflict was reported.
- **After:** V8 execution of the patched source: foreign record **0 writes**, conflict latched, draft/Undo and departure guard retained; two consecutive own saves **2 successful writes** with refreshed baseline.
- **Native Node.js 22.16.0: 6/6 focused tests PASS** (foreign edit, serial own writes, foreign deletion/present-undefined, two pending saves, quota retry, unknown baseline/key denial). These run from an **extracted test-only script**, not from a complete repository checkout. All six extracted one-line production functions were mechanically compared to the exact GitHub source by FNV-1a; concatenated fingerprint `d4436501` matches. The local test file is not a committed production test artifact; the 7 newly committed `tests/pages-ordinary-save-conflict.test.mjs` test cases remain **NOT executed by the native runner**.
- Entire new inline script **parses successfully** in V8; SHA-256 was recalculated for the changed script using a separately validated pure-JS implementation (old digest matched the original stored CSP digest).
- **NOT RUN / Blocked:** full native Node suite, project TypeScript 5.9.3, production build, local real IndexedDB / two browser tabs / reload, FA+EN desktop/390px UI screenshots, accessibility/IME/Enter/Tab, independent review, two real signed-in accounts. The actual `127.0.0.1:4173` refused connections; do not infer a browser pass from isolated test data.
- GitHub checkout remains unavailable due to DNS failure for github.com. Sites skill/action is absent in this execution; the hosted URL is inaccessible to the web reader. Hosted Site HEAD/tree/audience and actual synchronization are **UNVERIFIED**. Main `26fafac05c320ed5db30a0ee908dd816714acdd9` unchanged; no merge, Site publish, gh-pages push or user-data mutation.
- GitHub repo metadata still reports `public` despite desired private scope; visibility was not changed.

**Gate:** ND-024 **In progress**, release **Blocked**. Screenshot **NONE**, Site version/deployment ID **NONE**, actual production activation **NONE**.

**Next:** recover an authorized full checkout, run the newly checked-in native 7-test file, full suite, project TypeScript and build. Verify two *actual* browser tabs against 4173 IndexedDB (including save, conflicts, export, reload) and capture FA/EN/390px screenshots. Independently review, compare exact GitHub/Sites trees and audience, then guarded merge and deployment only if green.
