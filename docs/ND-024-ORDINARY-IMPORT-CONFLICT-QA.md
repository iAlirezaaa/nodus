# ND-024 — ordinary JSON import must not overwrite newer local data

**2026-11-17 10:19 UTC** · Run `nodus-auto-20261117T1012Z-nd024-11` · **In progress / release Blocked** · `fix/nd-024-startup-storage-recovery`

## Risk and acceptance

Prior local-first source `ce4b80bf19e4066721a0ca8c8de04651f7f21999` let an ordinary confirmed JSON import use unconditional `persist(copy(parsed))`. If another tab modified `IndexedDB workspace/main` after this tab loaded it, the first tab could replace the newer record without seeing the conflict. The existing quarantined-recovery path had a separate compare-and-write guard; the normal import did not.

New source/code commit [`04ae00fa`](https://github.com/iAlirezaaa/nodus/commit/04ae00fa3025bdefc1686fbf139dd3770e86f8eb) tree `a58d31d74b37af1b9deae78314fdb9fd6bbdad93`. Scope commit: [`df981fba`](https://github.com/iAlirezaaa/nodus/commit/df981fba5dabd9fe11f48d7d78cff5b0c617fc55).

- `load` records a last-observed raw snapshot or explicit missing-record sentinel. A successfully committed `queueSave` updates that stored baseline.
- Ordinary Import waits for pending local saves, then compares current database bytes using lossless JSON serialization in the **same IndexedDB readwrite transaction** as the conditional `put`. A missing record uses `getKey`; `undefined` stored values are not missing keys.
- Changed, deleted, newly created, mismatched or unsafe records cause no Import `put`. The session keeps its current visible document, selection, Undo/Redo; future saves pause on a confirmed conflict so a later edit cannot silently overwrite the other tab. **JSON Export remains available**; user should export before reload.
- A truly empty initial store and an unchanged record may be imported normally. An ordinary write error remains a write error, not a false successful import. No schema/migration, auth, collaboration, keyboard/IME, motion, app-hosted Site, gh-pages, or audience change.

## Executed verification, separately scoped

- **Pre-fix red (exact predecessor function, V8 mock):** stale normal import returned true and caused **1 write**, replacing the in-memory graph. **Post-fix green:** same conflict returns false, **0 writes**, unchanged graph/Undo/selection; `localConflict=true` and unsaved warning armed.
- **10/10 V8 atomic-transaction cases PASS** on exact candidate source: unchanged existing, changed existing, removed existing, truly missing initial, foreign newly created, present-`undefined`, denied key check, write failure, undefined baseline, and non-lossless altered record.
- **6/6 new checked-in test cases executed via isolated V8 harness PASS**, reading the exact final GitHub source and `tests/pages-import-conflict.test.mjs`. This is **not native Node's test runner**. Existing `tests/pages-startup-recovery.test.mjs` harness updated to pass a state object to `load` and mock the new import guard; full existing suite NOT RUN.
- Source inline JavaScript parses. CSP SHA-256 recomputed and compared: `sha256-9BRkldDjGeDXP7TrB+eeavPt2dZzSSUfb5fCJxavK3g=`. No `unsafe-inline` added.
- Actual `http://127.0.0.1:4173/`: no server listened (curl connection refused); no UI started, no screenshot. Two actual IndexedDB tabs and browser reload **NOT RUN**.
- Project TypeScript, complete native Node suite, production build, independent review, Site HEAD/tree/audience parity **NOT RUN / UNVERIFIED**. Neither two real authenticated users nor physical mobile were tested.

## Delivery

GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`, unchanged. Site source/HEAD/tree **UNVERIFIED** due to no current authorized Sites action/skill. `gh-pages` and hosted Site untouched. Deployment ID **NONE**; version ID **NONE**; screenshot **NONE**. Source remains only on `fix/nd-024-startup-storage-recovery`, not Verified or Released. Repository metadata reports visibility `public` (owner asked for private); no setting changed.

**Next:** obtain authorized full checkout + Sites source; run native Node focused/full tests, TypeScript and build; load real 4173 page and verify success/failure/foreign writer/absent key with two isolated browser tabs, FA/EN, RTL/LTR and 390 px; capture real screenshot; independently review, then guarded integration and publication only if all gates pass.
