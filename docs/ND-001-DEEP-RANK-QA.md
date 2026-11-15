# ND-001 — Deep-page rank reuse QA (branch only)

Date: 2026-11-15T23:22Z. Branch: `fix/nd-001-search-clarity`. Scope-before-source commit: [19bec76](https://github.com/iAlirezaaa/nodus/commit/19bec76bcfff0f2e22b02caab47e9f0e9142e13c). Code: [96bcddc](https://github.com/iAlirezaaa/nodus/commit/96bcddc24ef5f72b88c45a3a019350922434f5bf), tree `8e38aa0b303ae3d36fbaa7fb143065a96f61005a`.

## Problem and implementation

Deep search pages sometimes require a second pass after calculating the exact number of matches and tier boundaries. Previously this pass called `rankNode` again and recomputed each visited node's search normalization. The change records one byte of tier data per input node for **requested deep pages only** (255 = no match); a first-page query retains its prior single-pass behavior. The bounded 70-result page and exact total remain, without retaining GraphNode references for every match. The rank array consumes ~N bytes while the synchronous search executes; it is not stored, published, or written to persistence. No controls, schema, keyboard or saved graph were modified.

## Direct evidence and limitations

- Actual committed source blob `4e7e56d1853d1763fd0db4a34374704d91def3ef`; new tests added to blob `b70c367069911102c76c2901a4dd4c75dd0d8925`.
- **2/2 newly checked-in regression test bodies passed** against the exact committed search function using **mechanical TS syntax removal into V8**; non-target URL/annotation helpers were replaced with stubs. First test checks read-count and last-page IDs; second checks the page boundary between exact-title and note matches.
- Baseline branch code read 151 title getters **302 times** for a synthetic third page of 151 matches; the new code read them **151 times**, with identical 11-item final page and exact total 151. This measures title getter access, not total CPU time or UI fps.
- **1,890** deterministic before/after comparisons (45 synthetic sets × 7 queries × 6 offsets) preserved total, clamped offset and item IDs/order. No screenshot or production-user fixture was substituted.
- GitHub Actions [43774195580](https://github.com/iAlirezaaa/nodus/actions/runs/43774195580): workflow concluded **failure**, job steps unavailable. Not a successful native test run.
- Full `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, repository TS 5.9.3 and production build **NOT RUN**. Local GitHub DNS failed; no complete checkout. `127.0.0.1:4173` **connection refused**; real FA/EN desktop and 390px browser, focus, IME, Enter/Tab, Undo, save/reload, screenshot and real two-account flows **NOT RUN**.
- Sites skill not exposed; current Site head/tree **UNVERIFIED**. Last Site baseline is historical, not a current comparison. No live audience, user data or D1/R2 bindings modified. No new version/deployment ID.

**Gate / next action:** ND-001 **In progress**, release **Blocked**. Keep only on `fix/nd-001-search-clarity`; main `26fafac05c320ed5db30a0ee908dd816714acdd9` unchanged. Restore native checkout and run full Node+TS+build, browser at port 4173 with screenshots, authenticated Site tree reconciliation and independent review before guarded main/Sites deployment. ND-002 follows a stable ND-001 release.
