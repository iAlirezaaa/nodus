# ND-024 — concurrent media read integrity (unreleased)

## Problem and scope

At **2026-11-17 21:21 UTC**, the optional local-first Pages **Details → Media** control allowed two FileReader tasks for the same thought to overlap. Selecting `older.png`, then `newer.png`, and resolving the newer reader first caused the older read to overwrite the newer attachment. The prepatch source-exact **native Node 22.16.0** harness failed 2 of 3 cases: last-choice-wins and failed-newer-read-cancels-old; ordinary single upload passed. Exact old extracted handler length 1152 UTF-16 units, FNV1a32 `8a628511` matched GitHub.

Acceptance: newest selection supersedes any earlier pending FileReader for the same picker, even when the latter finishes out-of-order or fails MIME/size/read validation. Stale completions must never mutate the graph, save, enter Undo history or show misleading notifications; ordinary latest selection must preserve the existing behavior, FA/EN messages, selected node/board binding and media restrictions.

## Implemented on branch only

- Existing branch `fix/nd-024-startup-storage-recovery`, [pre-edit scope](https://github.com/iAlirezaaa/nodus/commit/88963f7421ef20270708e7f5508855e1aa92706e), [source+test commit](https://github.com/iAlirezaaa/nodus/commit/15c8363ffef6cea32dde6be7799d19b3576b7ab4), tree `333840627051260a498ca6df3e927c58f510014f`.
- Static `pages/index.html`: each file change assigns a unique Symbol token to the existing file input. After the asynchronous read resolves, a superseded token returns before MIME notification or `mutate`; the existing selection/board check remains. Selecting an oversized or unsupported later file also supersedes the older request. This token lives only in DOM memory, not the document schema or storage.
- `tests/pages-media-selection.test.mjs` adds four explicit overlapping-reader cases to eight existing tests. Source blob `2b62c437c42299be8346f5ef832d76033c2728bd`, tests blob `9fc71c530bc074e7951cad84773ed6665549aebd`.

## Actual checks

| Check | Result |
| --- | --- |
| Before/after native Node 22 isolated handler harness | **Before 1/3 PASS, after 3/3 PASS**; first selection completes last, newer failure, ordinary upload. Handler copied verbatim; GitHub/local FNV1a32 both `d56e3874` for patched 1276-char handler. This is a native isolated harness, not native checked-in suite. |
| Checked-in tests fetched from exact GitHub commit | **12/12 PASS in independent V8 with Node test/assert/fs/crypto facades**, including four new race checks; **not** native Node test runner. |
| Whole inline script | **PASS** V8 parse of full 66K script from GitHub. |
| CSP | **PASS** independent pure-JS SHA-256 over exact fetched inline script matches `sha256-fYrl35UGADrLoOjG9IrY5Zylwc9qG5R+gJRm/e09h/Y=`; no relaxation. |
| Native checked-in test file, full suite, TypeScript 5.9.3, production build | **NOT RUN / Blocked**: native complete checkout unavailable (GitHub DNS resolution failure). |
| Real port 4173 desktop/390px FA/EN browser, screenshot, media picker, keyboard/IME, save/reload, two-tab IndexedDB | **NOT RUN / Blocked**: no process listened on 4173; connected Browser tool requires original browser context. No screenshot captured. |
| Sites source head/tree/audience, deployment, independent review | **UNVERIFIED**: no authorized Sites skill/action was listed; no review/deployment. |

The 12 tests exercise a controlled FileReader fixture, **not** live IndexedDB, real browser DOM or two real authenticated users. This change does not touch Enter/Tab/IME handlers, pan/drag, collaboration, reduced-motion handling, animation timers or persistent graph schema; those wider workflows were not re-tested. The new token creates no per-frame writes. `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; Site source/current audience remain unknown and were not changed. **Status ND-024: In progress (branch only), release Blocked, screenshot NONE, deployed version/ID NONE.**

**Next:** obtain authorized full native checkout and Sites tooling; run checked-in Node tests, TypeScript/build and the real 4173 browser at FA/EN desktop/390px with two-tab IndexedDB/reload and screenshot, complete independent review, reconcile GitHub/Sites tree before any release.
