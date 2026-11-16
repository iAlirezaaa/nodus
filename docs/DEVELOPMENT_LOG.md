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

## 2026-11-16 — ND-023 GitHub Pages local-first bundle

Run `nodus-chat-20261116T212717316Z-nd023-pages`; user explicitly requested GitHub Pages and no external hosting. Source `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` and Sites project unchanged; feature branch `feat/nd-023-github-pages-local-first`.

Created a single-file Nodus local-first app at `pages/index.html`, using browser IndexedDB rather than ChatGPT-only API. Features include add/edit/child/link, nested project boards, pan/zoom, FA/EN, local JSON backup/import and small media. Readability on 390px mobile reviewed.

**Actual checks:** 7/7 pure-graph Node 22 tests, Node syntax checks, exact bundle desktop/mobile synthetic Chromium test with a stub IndexedDB; 0 JS errors and no horizontal overflow. **Unverified:** real browser URL/load/reload and persistent IndexedDB, GitHub Pages DNS, full canonical app behavior, real auth/collaboration, original TypeScript build. No Site backend changes or data migration.

No Pages settings write action available in connected GitHub plugin. Pages API from GitHub repository read reports `has_pages=false`. Plan/visibility constraints require user action; no public link claimed as active. Next create static-only `gh-pages` branch, then activate GitHub Pages branch/root in repository settings if eligible. Publication remains **Blocked** until public URL verified.

**Publishing checkpoint (ND-023):** Source branch commit `15d21790229bb38d73531d5e9a30fee0ade5f02f`; static-only `gh-pages` commit `4b3ec8839f6bb1f56f2677b5c6c398ad7a4c61bb`, tree `0a75d4de97167cbca38093fef45e4255d67ed100`, one index.html blob `74eb0a158bd9fc1b567e3d2c0953b9c26b474770`. `has_pages=false` after branch creation. **Not Released**. Repository private; no Site data copied. GitHub Settings Pages requires activation and paid plan eligibility may apply; no user auth or repo visibility change made. See `docs/ND-023-PAGES-LOCAL-QA.md`.

## 2026-11-16 — ND-023: recover core client-side Nodus features for GitHub Pages

Run `nodus-chat-20261116T215438984Z-nd023-parity`. Public Pages baseline `gh-pages@4b3ec8839f6bb1f56f2677b5c6c398ad7a4c61bb`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`. Expanded the standalone `pages/index.html` preserving `nodus-pages-v1` storage key and export/import: six graph layouts, magnetic preview (zero document writes in frames), three-state tasks, hierarchy/progress, grouped selection/color/drag/delete, comments, media/PDF, appearance preferences and mobile readability. Existing ChatGPT Site/DB and main unchanged.

QA: 15/15 Node tests; 24/24 exact bundled Chromium set_content UI checks with mocked storage; JS syntax and CSP hash checks pass. Real 4173 navigation blocked by Chromium policy and real browser IndexedDB persistence unverified. No false claims about full online collaboration. Source HTML blob `4ba369259c2b2830ad88e5ad697ba550134e77a8`; publication pending guarded gh-pages update/Actions/public verification.

Next: restore native live-URL/IndexedDB and real IME QA; online shared rooms/files require an external server unavailable on GitHub Pages.

## 2026-11-16 — ND-023 GitHub Pages deployment

The tested client-only Pages bundle was published with guarded `gh-pages` update: `099b9755292a00f4aecdee2c06d4c0007a886678`, tree `1833868acf143be22bfb54efe46853b0e8dbde6d`, content blob `4ba369259c2b2830ad88e5ad697ba550134e77a8`. GitHub Pages build and deployment [run 43968961185](https://github.com/iAlirezaaa/nodus/actions/runs/43968961185) completed **success**. External browser opening of the public URL was inaccessible; real IndexedDB and native IME were **not** verified. The hosted React Site/main remain untouched. Online collaboration/account sync/file backend cannot be implemented by a GitHub Pages-only deployment. Next: on-device URL/IndexedDB verification, then continue parity fixes and missing behaviors on feature branch.
