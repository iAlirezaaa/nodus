# ND-024 — prevent lossy JSON recovery backup from enabling reset (branch-only)

Run: `nodus-auto-20261117T021442Z-nd024-native-qa`, 2026-11-17 02:20 UTC. Scope entry first: [`e237dfb`](https://github.com/iAlirezaaa/nodus/commit/e237dfbc891bed2b95029bcb17f74ee5ceb2999a); implementation [`aa30d4d`](https://github.com/iAlirezaaa/nodus/commit/aa30d4d9b725e9d1eb731a4a7bc6940e1d7c79a8); corrected checked-in regression [`c62d7e6`](https://github.com/iAlirezaaa/nodus/commit/c62d7e6f5b006eca6f6c37aff368c0005226d669) (tree `4447da71670553facc9109efb50c653ab92da50d`). Base main `26fafac05c320ed5db30a0ee908dd816714acdd9`. This branch is based on the unfinished local-only Pages branch, not stable main.

## User-visible protection

A present but corrupt IndexedDB record must be backed up before replacement. The earlier `downloadRecovery()` used `JSON.stringify` as if a successful call guaranteed faithful copying. Browser IndexedDB accepts structured-clone types beyond JSON: `Map`, `Set`, `Date`, typed arrays, absent/sparse array elements, undefined properties and special numbers. Standard `JSON.stringify` may silently convert those values; the previous code then enabled the reset/import controls, risking irreversible loss of the original bytes after user confirmation.

Added `serializeRecoverySafely(raw)` with recursive strict JSON-value checks for plain-object/array/primitives, including alias and cycle rejection. If a conversion would be lossy it refuses export, leaves `storageRecovery.backupTaken=false`, disables the import/reset path and keeps the raw IndexedDB record untouched. Ordinary JSON and Persian text still export normally. The existing safe confirmation and durability flow is unchanged. This is a *refusal* safeguard, **not** a new lossless serializer for non-JSON types. No migration or network API changed.

## Current checks (do not conflate with old runs)

| Check | Observed |
| --- | --- |
| Old exact GitHub `downloadRecovery()`, V8 mocked browser | 5/5 unsafe input classes *incorrectly* yielded download success and unlocked reset; explicit red reproduction. Plain Persian JSON exported. |
| New exact source `downloadRecovery()` + `serializeRecoverySafely()`, V8 | 15/15 cases pass. Ordinary JSON/null/number allowed; Map, Set, Date, typed array, undefined, sparse/extra array, NaN/Infinity/-0, alias and cycle refused. |
| Checked-in `tests/pages-recovery-json-integrity.test.mjs` | 3/3 behavior cases passed *under V8 with Node module facades*, not the native Node runner; fourth CSP test not run in that harness. Four native Node tests are committed, **NOT RUN natively**. |
| Inline JS compile and CSP | PASS. Baseline `sha256-AeR4GkZUx8U4KEg010mNLyqrtBFw8fiyT7uaf6I/XT0=` independently matched; updated `sha256-bRaPLVx0vbm5sPN/LBeIPekYEfmT5/kZkXloTdAI1SA=` matched patched exact HTML. |
| Native full suite, TypeScript, production build | **NOT RUN** (checkout unavailable; no validation claim). |
| Browser FA/EN desktop, 390px, actual IndexedDB, reload, IME, focus, Undo | **NOT RUN**. No fresh real screenshot; no browser session taken from another project. |
| Site source/tree/audience and two authenticated users | **UNVERIFIED**; not applicable to the static local-only safeguard for collaboration; no deployment. |

Source access check: `git ls-remote https://github.com/iAlirezaaa/nodus.git HEAD` failed DNS resolution for `github.com`. GitHub connector permitted read/guarded write; the current Sites skill returned no usable action. `http://127.0.0.1:4173/` remains the required isolated preview URL and was not reallocated. The GitHub repository currently reports public visibility; this run did not modify it. Main `26fafac0`, Pages deployment `099b9755`, and ChatGPT Site remain unchanged.

## Status and next action

**In progress — branch only, no publication version/deployment ID, no current screenshot.** Native checked-in tests, full TypeScript/build, actual IndexedDB/browser save/reload and independent review are release blockers. Next run must get a valid source checkout, exercise blocked gates on 4173 (in both languages and 390px), then reconcile the actual source trees and preserve Site audience. Never replace raw records that cannot be exported losslessly; the next useful improvement may be a reversible structured-clone backup format instead of silent JSON conversion.
