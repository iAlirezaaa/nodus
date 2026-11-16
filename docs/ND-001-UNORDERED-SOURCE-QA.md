# ND-001 — honest unordered source labels for title and full project ancestry

Date: 2026-11-16 UTC. Roadmap: **In progress**. Release: **Blocked**; only feature branch `fix/nd-001-search-clarity`. Site and owner data unchanged.

## User problem, choice and source

In the existing Find your thought dialog, searching unordered title terms such as `forest lighting` for **Forest camera Lighting** correctly found the thought but falsely described the hit as *Multiple fields*. The same happened for an actual full ancestry path such as **Studio / Forest / Storyboard / Lighting**, whose matching terms are entirely inside that one path. The source label affects the user's ability to find a thought in a large nested workspace.

The scope/acceptance/branch were recorded *before source edits* in [scope commit 7547f58a](https://github.com/iAlirezaaa/nodus/commit/7547f58a1d630fdfd1a47384571e49e7319f88eb). Implementation and 3 new regression test groups: [code commit 1f2977c6](https://github.com/iAlirezaaa/nodus/commit/1f2977c63dcbb699a66e67f66c6498becf867645), source tree `d69bb36e4a2464e74ca7ef067c4b46fc167d98a1`, source blob `9f1b852074799da9254571408361bd56b8450c60`, test blob `84803242f352a3e6f69a0ddcd981972fb1562f33`.

`lib/search-result-preview.ts` now prefers `title` when all unordered words are in the one title, or `project` when all are in one full project path. These checks run **after** stronger direct filename/note/link and contiguous cross-field tiers and **before** the existing unordered multi-field fallback. Saved graph, URLs, permissions, search ranking/count/paging, keyboard/IME, and data persistence were not modified. No new controls: Search/Ctrl-Cmd+K remains the user entry point.

## Checks performed this invocation

- **Old-source reproduction:** 4/4 representative EN/FA, straight/curly quote title/path scenarios previously said `multiple` instead of `title` / `project`. The changed source returns the correct provenance.
- **New-source focused checks:** **10/10 PASS** against all 7 exact GitHub pure-helper source files after mechanical TypeScript erasure in V8. Coverage: unordered title, copied quotes, deep ancestry, Persian quoted ancestry, genuinely cross-field explanation, stronger direct note and filename, signed-link hostname-only explanation, comment-only hit, balanced exact phrase, and frozen input JSON identity in each case. This is not a native repository run. A minimal hostname parser shim was supplied only because V8 tool isolates lack the `URL` global; actual browser/Node semantics have **not** been exercised here.
- **New committed regression tests:** 3 groups added to `tests/search-result-preview.test.ts`; **not run natively**. Existing tests are not counted as newly executed. Search engine and `SEARCH_PAGE_SIZE=70` source files were unchanged; this targeted preview change does **not** prove re-running the 151-hit/70-70-11 suite.
- **GitHub CI:** [Actions 43949352983](https://github.com/iAlirezaaa/nodus/actions/runs/43949352983) for exact code commit completed with failure at `2026-11-16T20:23:57Z`; job `133587387603` has `runner_id=0`, no runner name and **0 steps**. Therefore **no tests, TypeScript or build ran**. The same pre-run pattern was recorded on the previous attempt. Cause is not confirmed; do not claim a code/test failure or passed gate.
- **Local full environment:** `git` and Node 22.16.0 available; `tsc` 5.8.3 global only, no repository checkout/dependencies; outbound `api.github.com` DNS resolution failed. Native full tests, project TS 5.9.3, and production build **NOT RUN**.
- **UI / Sites:** port `127.0.0.1:4173` refused connection; did not start a preview or take another user's browser. FA/EN desktop and 390px, IME/Enter/Tab/Undo/save/reload, authenticated two-account sessions, visual screenshot **NOT RUN**; screenshot **NONE**. No current authenticated Sites head/tree/audience tool or Site skill available, so current content-tree equality and audience **UNVERIFIED**. No merge to main, no deployment, version ID **NONE**.

## Next gate

Obtain a working checkout/dependencies or functional GitHub-hosted runner; run native repository tests, TypeScript 5.9.3 and build, then actual 4173 desktop/mobile Search with screenshots and persistence/IME tests. Fetch authenticated current Site source/audience, compare content trees, independently review and release via guarded synchronization if all required checks pass. ND-002 begins afterward. Keep this slice on the existing branch until then.
