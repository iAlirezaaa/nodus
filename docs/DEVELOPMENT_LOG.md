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

## 2026-11-16 23:14 UTC — ND-023: atomic local-first edits (scope recorded before code)

Run `nodus-auto-20261116T2314Z-nd023-parity`; source branch `feat/nd-023-github-pages-local-first` at `3b1a30297d7922d6920d70baaef6665d7da8dc84`, tree `9cb50eff7ec4b43f847e35476cda840205e4d552`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; existing Site head/tree and audience could not be read (Sites action requests interactive input). Original GitHub Pages deployed asset `4ba369259c2b2830ad88e5ad697ba550134e77a8` remains untouched.

**User-visible problem:** the Pages edition calls `mutate(fn)` directly on canonical `state.doc`; if an edit throws after a partial write, the corrupt change survives in memory without save, Undo or render. A subsequent successful edit may persist that unintended change. **Acceptance:** perform each graph edit on a detached copy; on throw leave document, history, save state and rendered selection unchanged; on success retain one Undo, one queued save and existing nested/FA/EN/IME/keyboard behavior. **This run's slice:** implement an atomic document mutation helper used by Pages `mutate`, add targeted native regression (red/green), regenerate the self-contained CSP-hashed bundle from exact-source-matched prior build, inspect browser/4173 if available; do not publish or claim verified before real UI/reload and Site gates. **Boundaries:** only `pages/index.html` / optional Pages test source and ND-023 QA/docs; no original app API/auth, no D1/R2, no original Site, no `gh-pages` publication without gates.

**Initial gate:** run-local snapshot rebuilt byte-for-byte to GitHub asset blob `4ba369259c2b2830ad88e5ad697ba550134e77a8` (`git hash-object`), Node v22.16.0 available; GitHub Pages external URL/real IndexedDB and authorized Sites source still UNVERIFIED. Final outcomes below are not preclaimed.

## 2026-11-16 23:19 UTC — ND-023: atomic Pages edits implemented; publish blocked

Source commit [`8f6e61e`](https://github.com/iAlirezaaa/nodus/commit/8f6e61e2049b5238dfba84ff35ab086b5698f6d7), tree `b9300699430ba04d6fd54fa166c7a0e45a069506`; replaced in-place edit of canonical Pages graph with detached transaction draft; thrown partial mutations can no longer leak into a future save, and valid edits preserve a single Undo/save. Source bundle `898e4845a1d5c6a5a619aeb7481f9a785939f6e4`; new checked-in regression `tests/pages-atomic-mutation.test.mjs`. Red 1/3 (two expected failures) -> green **3/3**, local-first existing 15/15 => **18/18 current native Node tests**; exact rebuilt HTML fixture **24/24 Chromium mocked-storage UI** at desktop + 390px, no JS errors, both screenshot hashes in `docs/ND-023-ATOMIC-MUTATION-QA.md`. CSP and JS syntax pass. The real `http://127.0.0.1:4173/` browser navigation was attempted and **BLOCKED** by administrator; real IndexedDB reload, authorized Sites head/tree, original React TypeScript and full build remain unverified. Original Site/main and `gh-pages` publication unchanged; **In progress / branch only**, no release or version ID for new code. Next: real browser and persistence QA, independent review, guarded Pages publication only after release gates. GitHub repo is currently public; no visibility change made.
