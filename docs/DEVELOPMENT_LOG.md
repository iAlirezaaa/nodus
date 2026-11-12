# Nodus development log

This log records actual development and publication outcomes. Future runs read the newest entry together with [the roadmap](ROADMAP.md) and [the development loop](DEVELOPMENT_LOOP.md). Historical tests are not a claim that those checks ran again in a later documentation-only change.

## 2026-11-12 — ND-000: establish the continuous-development plan

**Request:** Hourly development across usability, capabilities, design, personalization and animation. New branches for special/large changes. Update the roadmap whenever a capability becomes available.

**Baseline inspected:** GitHub main `f0958145973a130a0041604cb08f36925fe19e26`; Site source `04db17cd56bf56f157c4371eaa05dd91a1c7e61a`; common tree `4a00c185218e8a627dfccf9c60ae32cc1b10b54b`. Site version 11 had a successful publication. The current application already includes multi-selection and personal-space deletion. Its previous engineering pass recorded 205 passing automated tests, TypeScript, a production build and the two linked browser QA reports.

**Plan added:** Twenty-two concrete roadmap items with acceptance criteria, dependencies and branch paths; explicit status distinction between work in progress, verification and actual release; a per-run workflow with guarded source synchronization, overlap lease, behavioral verification and persistent checkpoints. README links to the plan. Verification wording now links the completed selection/deletion browser report instead of leaving that pass described as pending.

**Product-code scope:** Documentation and automation setup only. No application feature is marked newly released by this entry; no historical tests are presented as newly executed. The first product slice is ND-001, honest search-result counts and full project paths, followed by focus mode and collapsible branches on separate feature branches.

**Automation record (confirmed by the native create result):** `توسعهٔ ساعتی Nodus`, ID `Automation_7d6aae4eda24819196a386dcb94e59d8`, enabled, `RRULE:FREQ=HOURLY;INTERVAL=1`, exact schedule. Created 2026-11-12 at 16:14:21 UTC; the returned next run is `2026-11-12T20:44:20+03:30` in `Asia/Tehran`. The environment selection is inherited; returned environment details were unavailable, which is not evidence of a completed run. No scheduled development run has been claimed by this setup entry.

**Ownership control:** The separate `automation/nodus-control` branch was initialized with an idle lease at commit `13c255c2a0c999ba7937d2d36404fde4dfbe440e`. Cross-run state belongs to that branch, never the application source. Setup source/commit and synchronization outcomes are supplied by the actual native results and checkpoint, not invented in this pre-commit entry.

## Entry template for each future run

```text
Date/time and run ID:
Roadmap ID / title:
Status before → after:
Base GitHub head / Site source / common tree:
Branch and lease ownership:
User problem and bounded change:
Acceptance criteria checked:
Tests, measurements and screenshots (actual results):
Commit/tree and deployment/version (or pending checkpoint):
Roadmap/help/architecture updates:
Limitations or blockers:
Next concrete action:
```

## 2026-11-12 — ND-001: honest search result counts and project paths (in progress)

**Run:** `nodus-auto-20261112-run01-nd001`; work branch `fix/nd-001-search-clarity`; base GitHub `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Site checkpoint source `eb8a9ad1f470447bf15634efbaa47531924901c5` (saved version 11+documentation deployment); live tree has not been freshly fetched in this run because Sites actions are not exposed here.

**Problem:** Search silently truncates to 70 while the meta reads `matches.length`, misrepresenting total hits, and shows only the immediate board name rather than nested project ancestry. The first 70 matching nodes are reachable but later hits cannot be opened from search.

**Intended slice:** Count all matching nodes with a bounded initial page of 70, provide an explicit next-results action, and display a complete root-to-board location per result. Preserve existing title/text/asset-name matching, search selection, keyboard handling, FA/EN labels, and graph persistence. No user document writes or schema changes.

**Acceptance:** 0/70/71/151+ matches report correct visible and total counts; further matches can be opened; deep nested and duplicate-titled boards display full location; Persian and English search behave as before; defensive malformed containment cannot loop. Run targeted logic tests, TypeScript, production build and real desktop/mobile app inspection before marking Verified or merging/publishing. A missing test or UI preview is a Blocked verification gate, not a pass.

**Checkpoint:** Implement in a pure helper plus search dialog integration; add regression tests. UI browser, full repository typecheck/build and Site release require a supported checkout and Site runtime and may remain blocked in this execution. Keep change on this branch until gates pass.

**Run 1 outcome (2026-11-12, branch only):** Search logic and dialog integration committed to `fix/nd-001-search-clarity`; current feature commit `e8c143d1e9ca756b33093fc919e8dfb22fb04d62`. Exact count beyond 70, Show more, complete project paths and wrapped narrow-layout labels implemented. Isolated tests **5 passed / 0 failed**, exact helper and test blob SHAs verified, isolated helper TS with stub types passed. Full app TypeScript, full tests, production build, browser screenshots and Sites source/deployment were **not available**; no release or GitHub main merge. [QA detail](ND-001-SEARCH-QA.md). Next: restore supported runtime, validate, reconcile live source and release only after gates pass.


**Run 2 scope (ND-001, 2026-11-12 18:20 UTC):** Continue `fix/nd-001-search-clarity` from GitHub feature head `c7e28788650e67c2d9c327817160ad8cced15f23`, tree `85f09c3e2a77054016943b4d2bd8681784d640ab`; main stays `26fafac05c320ed5db30a0ee908dd816714acdd9`. The last run's 70-at-a-time **cumulative** Show more leaves all earlier result buttons mounted; with the 5,000-node limit a repeated search can eventually render thousands of buttons. This run will use **bounded forward/backward pages** (at most 70 rendered results) while keeping exact global totals and full project paths; prevent page drift after query or document changes. Acceptance: 151 matches produce 70/70/11 with stable non-overlapping IDs, out-of-range offset clamps safely, query edits reset page, and keyboard-accessible FA/EN previous/next controls do not mutate document data. Scope: search helper, search dialog and targeted tests/docs; no data model or Site access changes. Repository TypeScript/build, desktop/390px screenshots and GitHub/Sites reconciliation are still required before Verified or Released. No other feature work starts while this one remains open.


**Run 2 implementation outcome (2026-11-12 UTC; feature branch only):** Replaced cumulative Show more results with a **bounded 70-results-per-page** previous/next navigation and a visible current-page indicator. Actual counts and full nested project paths remain, with a visible range (e.g. 71–140 of 151). The results list resets scroll to top when paging and resets offset when search text, search dialog or launch context changes. When the document shrinks, a stale page offset recovers to the last non-empty page. No schema, shared operations or saved graph changes. Source is in commit `1a005f25e4655f72aff131eec7afa7ddfbb50df3` and tree `04957681690b642d508b49607a08fa9342bc65f4` before this documentation commit.

**Run 2 verification:** Node.js 22.16.0 with type stripping: **8/8 target tests passed** (the five earlier cases plus bounded paging, doc shrink and invalid offset); isolated helper TypeScript 5.8.3 with a minimal Workspace/GraphNode type stub: **passed** after adding an explicit board-item annotation. Exact tested Git object hashes: helper `fa5a01520a49cd63009f8fba0ffb414b97aa792c`, tests `3f6d589a9f12e1bf5d33f4e2cc36bb9aac82acb5`. Isolated harness did not load full Nodus project types/dependencies. Full suite, repository TypeScript 5.9, build, actual desktop/390px UI/screenshot and Sites reconciliation/publication **not run** because no authenticated Sites tool, supported checkout or connected browser was available. **Status remains In progress, release blocked**; `main` and Site were not changed. Further checks and deployment remain the next action.

**Run 3 scope (ND-001, 2026-11-12 19:15 UTC):** Continue fix/nd-001-search-clarity from `05f1ca2eefd6dc7e93e40c48490eb201475a70f8`, main `26fafac05c320ed5db30a0ee908dd816714acdd9`. User-visible gap: search text entered on Arabic/Persian keyboard layouts may not match the visually identical Persian letter variants or numerals in existing ideas. This run adds read-only Unicode normalization inside search matching, not document/title mutation, without altering search order, 70-item paging, nested project paths, Enter/Tab or persistence. Acceptance: both directions for Arabic/Persian ی/ي and ک/ك, Arabic/Persian/ASCII digits and optional Arabic vowel marks; original graph and node strings remain untouched; existing eight paging/path tests retain coverage. Plan: add focused regression cases, run the exact target file and helper-only TypeScript; full app build, authenticated Site state and real-browser screenshots remain explicit release gates. No premature merge or publication.
