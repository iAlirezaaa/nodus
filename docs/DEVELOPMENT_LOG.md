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

## 2026-11-17 00:12 UTC — ND-023: durable JSON restore (scope before implementation)

Run `nodus-auto-20261117T001041Z-nd023-gates`; continuing `feat/nd-023-github-pages-local-first` at `2ed4a601bf5c58959a28cc5a8bd0a47bff7a943f`, tree `dc6fa7dc75936fcdb553da85e099989fb2589e27`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Sites source/tree/audience unverified: current authorized Sites skill/tool absent; do not touch deployment or user data.

**Problem:** static Pages import switches `state.doc` and announces success before IndexedDB saves; the write may fail, or an earlier queued snapshot may race and replace the imported backup. A reload can silently revert the just-imported work. **Acceptance:** on valid, user-confirmed import, wait for queued saves and durably commit IndexedDB before replacing the visible graph/history; on rejected save preserve original graph, selection, undo/future and report failure; concurrent graph edits/Undo cannot overwrite a pending import; successful import adds one Undo snapshot and retains FA/EN/keyboard/nested paths and existing storage schema. **Slice:** add restore transaction and focused native Node tests, run every available gate; no main/Sites/Pages update without exact build and real 4173 UI + IndexedDB reload. **Boundaries:** only `pages/index.html`, new focused regression test and ND-023 docs. Branch remains In progress until verified.

## 2026-11-17 00:16 UTC — ND-023: durable local backup import, branch only

Run `nodus-auto-20261117T001041Z-nd023-gates`. Scope commit `db730356c22b4ecb90c8bcc7f01aa5c085f9c36a`, code commit `fb8edee47a32f159665331c09ee2e34f9aefc20e`, tree `6330d4ed275098f0cb8f0923e1e5ed93e4ba84f1`. Pages previously showed success before import was stored; now old writes drain first, import commits to IndexedDB before in-memory replacement, and failure leaves graph/Undo/selection untouched. Pending edits/Undo/Redo and concurrent imports cannot race it; local schema/backup format and authenticated Site untouched.

**Current verification:** native Node22 fixture 5/5 PASS (exact helper, synthetic page), actual committed GitHub function evaluation V8 5/5 PASS, full inline JS syntax PASS and CSP digest self-check. Checked-in native test, whole app TypeScript/build and real IndexedDB reload on `127.0.0.1:4173` NOT run; source checkout DNS unavailable, browser connector needs originating browser. No fresh screenshot or Site source/tree/audience verification. **In progress; no main, gh-pages or Site deployment**. Previous Pages version `099b9755` remains deployed and the original Site is unmodified. See [import durability QA](ND-023-IMPORT-DURABILITY-QA.md). Next restore full checkout and browser gates, then independent review, guarded release and synchronization.

**Follow-on risk recorded (not implemented):** `ND-024` — on startup, `init()` catches invalid IndexedDB data and substitutes `blank()` while still allowing later `mutate()` writes. A later edit may overwrite the original corrupt but recoverable record; require a recovery lock and actual reload/backup tests before declaring fixed. This is a source-level risk, not yet a reproduced browser failure. Added as Ready, after current in-progress verification.

## 2026-11-17T01:16 UTC — ND-024: protect corrupt startup data (scope before source edit)

Run `nodus-auto-20261117T011507Z-nd024-recovery`; main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; dependency branch `feat/nd-023-github-pages-local-first@5900a5c2015917a82b3fcd48ebeb28e8f03b4080`, tree `ebb476fc6c0204683ec5e8fe0e71ff5e4351b0f2`; new branch `fix/nd-024-startup-storage-recovery` forked from dependency (not main because `pages/index.html` and pending storage fixes only exist there). Sites source/tree and audience inaccessible in this session; no publication.

**Observed issue:** Pages startup `load()` reads IndexedDB `workspace/main` and validates it, but `init()` catches any validation rejection and substitutes `blank()` while enabling edits. The first edit queues that blank graph over the recoverable raw record; falsy corrupt values also silently become a blank document. **Acceptance:** recognize missing record distinctly from malformed record; block edits, Undo/Redo and writes after corrupt-data detection; preserve the original IndexedDB record; present FA/EN keyboard-accessible recovery UI with raw JSON export before allowing an explicitly confirmed backup import or fresh reset; failed recovery save keeps original document locked; successful recovery restores normal operations with clean Undo history; local database/schema/key and D1/R2 unchanged. **This slice:** local-first `pages/index.html` only plus source-level native regression test, QA/report; full React TypeScript/build and real 4173 browser/IndexedDB must pass before merge or publication. **Boundaries:** do not alter Site/main/gh-pages, audience, unrelated repositories, automation schedule or user data. Screenshot: none yet.

## 2026-11-17 01:22 UTC — ND-024: invalid startup record quarantine, branch-only

Run `nodus-auto-20261117T011507Z-nd024-recovery`. Source commit `19b9dc3634d066f756129f3a5633ff16e422aeb1`, tree `1c336d2490879dde2a1a6d07f6c3bd2334f0ccb3` on `fix/nd-024-startup-storage-recovery` (forked from incomplete ND-023 Pages local-first). Raw invalid IndexedDB records are now retained and edits/Undo/Redo/saving blocked until user exports raw JSON and explicitly imports or starts fresh; failed save preserves recovery lock. CSP recomputed, inline syntax passes, 19/19 isolated V8 checks passed. Seven native Node regression cases were added but **NOT RUN**. Native full tests, TypeScript, build, 4173 browser/actual IndexedDB reload, screenshots and Sites source/tree are **Blocked** by unavailable checkout/DNS and current Sites/browser access. The user-facing Site and `gh-pages` are unchanged. **In progress; not Verified/Released.** See [ND-024 QA](ND-024-STARTUP-RECOVERY-QA.md). Next: native checks, live local IndexedDB reload and independent review before guarded publication.


## 2026-11-17 02:16 UTC — ND-024 follow-up: raw recovery export integrity (scope before code)

Run `nodus-auto-20261117T021442Z-nd024-native-qa`. Base `fix/nd-024-startup-storage-recovery` `e4bcabb6122e4ad47e50a8f6e2da4c9ac0a33624`, tree `a58738cad54c72de87e4c91d9ba581095001a79e`; main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; Site source/head/tree/audience **UNVERIFIED** (current Sites skill unavailable). Lease owned on the separate control branch. Existing ND-024 corruption quarantine stays **In progress / unreleased**.

**Demonstrated data-risk to test:** IndexedDB structured clones may contain Map, Date, Set, Blob, undefined properties, sparse arrays or non-finite numbers. `downloadRecovery()` currently calls plain `JSON.stringify` and marks `backupTaken=true` even when JSON silently drops or converts those values. This could enable replacement of the only raw record using an incomplete backup.

**Acceptance:** for pure JSON trees, preserve original export/confirmation flow; for non-JSON-safe or circular stored records, refuse a misleading "successful" recovery export, leave `backupTaken=false`, and keep import/reset disabled. Verify old-vs-new against exact GitHub JS, check CSP SHA-256 and unchanged persistence keys; add checked-in regression. Re-run native tests, TypeScript/build, and real 4173 IndexedDB/browser if a usable checkout becomes available. Do not release without those gates and an independent review.

**This slice:** lossless JSON export preflight in `pages/index.html` and focused regression test on the existing ND-024 branch; docs/roadmap/checkpoint afterward. No migration, remote auth, live workspace, deployment, or GitHub Pages ref changes.


## 2026-11-17 02:20 UTC — ND-024 raw recovery JSON integrity implemented; blocked release

Run `nodus-auto-20261117T021442Z-nd024-native-qa`. Source commit [`aa30d4d`](https://github.com/iAlirezaaa/nodus/commit/aa30d4d9b725e9d1eb731a4a7bc6940e1d7c79a8), test-extraction correction [`c62d7e6`](https://github.com/iAlirezaaa/nodus/commit/c62d7e6f5b006eca6f6c37aff368c0005226d669), tree `4447da71670553facc9109efb50c653ab92da50d`; branch `fix/nd-024-startup-storage-recovery` only. Code is in `pages/index.html`, safeguard `serializeRecoverySafely` called by the existing recovery download control. Added `tests/pages-recovery-json-integrity.test.mjs` for plain JSON, silent lossy structured clones and cyclic/shared references. No IndexedDB key, schema, remote account, owner data, Site identity or publication changed.

**Actual red/green:** direct V8 execution of the *previous exact GitHub* download function reproduced **5/5 unsafe successful-unlock cases**: Map, Date, sparse array, undefined property, and non-finite number silently lost/changed during JSON stringify; valid Persian JSON remained exportable. On patched exact GitHub source **15/15 V8 checks passed** for positive and negative records (including Set, typed arrays, alias/cycle). The corrected checked-in regression source ran **3/3 under a V8 harness with Node module facades**; this is *not* native Node execution. Inline JS syntax compiled, the previous CSP digest was independently matched, and the updated digest `sha256-bRaPLVx0vbm5sPN/LBeIPekYEfmT5/kZkXloTdAI1SA=` recomputed and matched the changed source. No CSP weakening.

**Blocked release gates:** native checked-in Node tests + full suite, TypeScript 5.9.3, React production build, isolated `127.0.0.1:4173` browser with actual IndexedDB corruption/download/reload and desktop/390px FA/EN screenshots, independent review, and Sites source/tree/audience verification. `git ls-remote` failed `Could not resolve host: github.com`; available repository connector did permit guarded code commits. Current connected repository metadata reports **public** visibility despite request describing private; not changed. Existing main `26fafac0`, `gh-pages` `099b9755`, and hosted Site are untouched. **Status In progress, NOT Verified or Released.** See [raw JSON QA](ND-024-RAW-JSON-QA.md). Next: obtain authorized full checkout and native/4173 browser QA, investigate a lossless non-JSON backup path if raw-only recovery is needed, then independent review and source-tree synchronization before any publication.

## 2026-11-17 03:13 UTC — ND-024: distinguish present undefined IndexedDB data (scope before edit)

Run `nodus-auto-20261117T0312Z-nd024-native-gates`; branch `fix/nd-024-startup-storage-recovery`, observed base `470966047ebb13cb1643d921540b24e1a699864d` tree `abfdff496b284abfd22430d91253fdb3ed34cba8`; main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; Site head/tree/audience **UNVERIFIED** because connected Sites action requires interactive authorization. Lease owned separately on `automation/nodus-control`.

**Problem:** the static Pages `load()` treats `get('main').result === undefined` as proof that a record is absent, but IndexedDB permits a present key holding the structured-clone value `undefined`. A blank workspace can then open and a later save overwrite the stored record. **Acceptance:** distinguish key absence using `getKey('main')` (or equivalent) within the same read transaction; truly missing key opens blank; present undefined and other invalid records enter corrupt-data recovery without any writes; on key-check error fail closed; preserve existing database/key, FA/EN, recovery lock, export, reset and source CSP. **Slice:** targeted loader fix plus native Node behavioral regression against the exact committed inline function; inspect 4173 if available; no publication unless all real browser/IndexedDB, app build and Sites gates pass. **Boundaries:** only ND-024 branch `pages/index.html`, focused test, architecture/QA/roadmap/log; no `main`, `gh-pages`, original Site, audience or owner data changes.
