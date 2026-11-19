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

## 2026-11-19 — ND-011 + ND-013: scoped template starters and dense-graph readability (in progress)

**User problem:** Too many interconnected nodes become illegible. Hades requests additional useful templates and clearer reading/navigation, not just new decorative styles.

**Observed bases:** GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9` with tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; branch `feat/nd-011-templates-and-dense-graph` starts at this exact head. Previous ND-024 remains separate and unfinished on `fix/nd-024-startup-storage-recovery`. Original Site `appgprj_6af58606fb9c81918541f056a898c1a2`: head/tree/audience **unverified** because native Sites skill is unavailable; preserve its source, audience and user data. Lease belongs to `nodus-chat-20261118T234654-nd011-density` on `automation/nodus-control`.

**Acceptance and planned slice:** (1) Add several named, editable starter graph templates (brainstorming, research, project production, task planning) with Persian/English names and a clear preview of how many nodes/links each inserts; apply only on explicit confirmation, append to active board without replacing existing ideas, and allow one Undo. (2) Add a readable dense-network mode that preserves the entire saved graph, makes the selected idea and immediate links legible and clearly reports hidden/dimmed context; preserve pan/drag/keyboard/focus and RTL/LTR, with no frame-by-frame writes. (3) Verify relevant Node behavior, TypeScript, production build, desktop/mobile browser screenshots, large synthetic boards and save/reload. If the 4173 or browser/site gate is blocked, keep feature on branch only.

**Files/boundaries:** Existing workspace and graph mutations stay inside `hooks/use-workspace.ts` and validated graph helpers; canvas presentation/selection changes in `components/Canvas.tsx` and contextual controls. No schema/auth/permission/asset deletion, no change to shared-room access or Site. Tests/README/architecture/QA must reflect actually run checks.

**Status:** ND-011 In progress, ND-013 In progress (owner request supersedes lower-priority queue); neither Verified nor Released. No publication attempted. **Next:** inspect source, implement the bounded graph-template insertion and dense graph highlighting, then test and checkpoint.

## 2026-11-19 02:16 UTC — ND-011/ND-013 browser regression resumed (scoping checkpoint)

**Run:** `nodus-auto-20261119T0213Z-nd011-resume`; lease `automation/nodus-control` acquired with guarded fast-forward. Active branch `feat/nd-011-templates-and-dense-graph`, observed branch `761143b948429c8bddeee893d9e4fd49a5751820`, tree `8f1e7789fd2bfd5f87f27cd97fbe83af35454fcf`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Hosted Site head/tree/audience still unavailable via authorized native Sites skill, so no publish or source overwrite.

**Concrete failure:** GitHub Actions browser job #135235452567 on run #44427333185 failed after real Chromium/fixture interaction: at 390px, `.sidebar-scrim` intercepted the enabled `همسایه‌های بعدی` reading-page button. The responsive sidebar remains open when an already-open desktop viewport narrows; it is only closed on first mount. Tests, TypeScript and production build job passed on that branch run, but browser gate failed.

**Slice and acceptance:** Close the overlay when the viewport crosses the mobile breakpoint, without closing a drawer the user manually opens at a steady mobile width; preserve desktop and focus/keyboard/search navigation, pan/drag and zero workspace writes. Add a real browser assertion for desktop-to-390px transition and reading pager click; require fresh CI native tests/TypeScript/build and browser screenshots on fixed port 4173. Until verified: **In progress on branch, not Released.** No backend/schema/owner-data mutation. Next: implement/test and reconcile Site parity/access independently.

## 2026-11-19 02:22 UTC — ND-013 responsive reading access repaired, CI verified on branch

**Visible improvement:** At the responsive boundary (desktop to width ≤849px), an already-open navigation drawer now closes instead of leaving its full-page scrim over the canvas reading/paging controls. Explicitly opening and closing the drawer at 390px still works. This is local presentation state: no document mutation, migration, permission or stored-data change. Control location is the canvas **Readable network view / نمای خوانای شبکه** beside the layout button; the navigation reopen button remains in the top bar.

**Branch/code:** `feat/nd-011-templates-and-dense-graph`; original main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). Scoping commit `e2b8b78fd19beb5a7dcccf3c179ed9b0ed4cf67d`; source/test commit `841fdeb5923b2a4fda05b4a2d13aede885329f67`, tree `0a26507c561788a97d8c65ff74d246f734b05e45`. The prior code had failing real browser QA [run 44427333185](https://github.com/iAlirezaaa/nodus/actions/runs/44427333185) because `.sidebar-scrim` intercepted a mobile neighbor-pager click.

**Fresh verification:** [GitHub Actions run 44443104827](https://github.com/iAlirezaaa/nodus/actions/runs/44443104827) completed **success** against exact code head `841fdeb`: **224/224 checked-in native Node tests pass**, project TypeScript check passes, production build passes. Real Chromium rendered **NodusApp** (synthetic session-storage fixture, not a real user) at **http://127.0.0.1:4173/**; reported 10 smoke scenarios PASS, a fixed 116-node dense scene, 390px viewport with no horizontal overflow, live desktop-to-mobile drawer dismissal, explicit mobile drawer reopen/close, neighbor-pager click, template preview/apply/Undo/reload, FA→EN and no additional workspace writes for paging/language switching. The browser runner used reduced-motion mode. Its fixture reported lastWrites=3, **not** zero total writes; its check asserts zero *additional* writes for non-document operations, not every possible motion frame.

**Real screenshots:** Five Chromium images in [artifact 14492830556](https://github.com/iAlirezaaa/nodus/actions/runs/44443104827/artifacts/14492830556): `template-preview-fa-desktop.png`, `template-applied-fa-desktop.png`, `dense-reading-fa-desktop.png`, `dense-reading-fa-mobile-390.png` and `dense-reading-en-mobile-390.png`. The FA/EN mobile and FA desktop screenshots were visually inspected. On the dense mobile scene some node captions still crowd the board header, so ND-013's visual-polish/20/100/500-node criteria remain **In progress**, not fully Verified.

**Release/sync gate: Blocked.** Authorized native Sites source/history/tree/audience access was not provided in this environment; it is unsafe to replace the existing hosted Site. Real authenticated owner access, two distinct real user accounts, read-only/revocation and independent integration review were **not** exercised. `main`, hosted Site, production data and access policies were not modified. The repository API reports visibility `public` although the owner specifies private; no unapproved visibility change occurred. Deployment/version IDs: **none**, status **NOT ATTEMPTED**. Correct current states: ND-011 and ND-013 **In progress on feature branch, not Released**. Existing ND-024 stays on its separate branch.

**Next:** Independently review this code and visible mobile header overlap, validate all 20/100/500-node fixed scenes and genuine account/permission flows, obtain authorized Site tree/audience, then reconcile source trees before any merge or publication. See [ND-011/ND-013 responsive QA](ND-011-ND-013-RESPONSIVE-QA.md).

## 2026-11-19 03:14 UTC — ND-013 mobile heading/pager readability (scoping before source change)

**Run:** `nodus-auto-20261119T0309Z-nd013-label-polish`; ownership confirmed by guarded control ref `38001cf7e7f76c47bf0ce6dbfe271c94a1a6d599`. **Branch:** `feat/nd-011-templates-and-dense-graph` at `f6d2a75a727d5990584f9f63a8fca7fbfa3892f5` (tree `7fbd9e83ed580fdbbd18256e704f7cf264c65516`); main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). Original Site source/tree and audience: **unverified; no access through installed Sites skills**.

**Problem:** The actual 390 px Persian Chromium screenshot shows a single-line, strongly truncated board title beside three icon buttons; an absolutely positioned neighbor pager crowds the same heading. A long title and 320–390 px widths need a clearer hierarchy without taking over the canvas.

**Slice / acceptance:** On this existing feature branch, make the small-screen heading responsive: board title visibly readable on up to two lines, controls on their own row, neighbor pager non-overlapping with both heading and buttons, and magnetic launcher outside the heading. Keep Persian/English direction, keyboard focus, next/previous pager and graph document unchanged; preserve reduced-motion behavior. Extend exact-UI Chromium fixture at 390/320 px to assert no layout collisions or horizontal overflow and exercise pager; require checked-in tests, TypeScript/build and real screenshot via CI. This is **In progress**, not a release. If browser or original Site gating cannot be completed, keep only on branch.

**Boundaries:** `app/globals.css` mobile presentation and `tests/browser/nd011-template-browser-smoke.mjs` regression; no schema, graph, storage, API, sharing, authentication, animation loops, or owner data mutation. Next: implement, run CI and reconcile unverified Site.

## 2026-11-19 03:23 UTC — ND-013: mobile title and neighbor pager readability, branch-only checked

**Run / status:** `nodus-auto-20261119T0309Z-nd013-label-polish`; ND-013 remains **In progress**, not Verified/Released; ND-011 remains In progress. Observed main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`); feature branch `feat/nd-011-templates-and-dense-graph`, scoping commit `86f3351`, code/test commits `d03127b` and **`1abe0c36671222daee8f1a9974a0a95a4ce686b8`** (tree **`1a17f2e00ab5af73e2cfb9f6a93209a4b0fd0165`**).

**Change / location:** On narrow screens (≤650px), the existing canvas header now places the board title above its action controls; a long heading wraps to at most two lines instead of being cut to a ~170px strip, and the reading neighbor pager flows in the header rather than hovering over the title. Its full shown/total count wraps instead of ellipsizing. The magnetic launcher remains below the header. The controls remain the existing **Readable network view / نمای خوانای شبکه** and previous/next neighbors, not a new feature. Changes limited to `app/globals.css` and `tests/browser/nd011-template-browser-smoke.mjs`. No graph, persistence, keyboard, schema, permissions or animation-loop mutation.

**Fresh verification on exact code SHA:** [Actions run 44450769365](https://github.com/iAlirezaaa/nodus/actions/runs/44450769365): **SUCCESS** (both jobs). Checked-in native Node **224/224 PASS**, TypeScript `--noEmit` **PASS**, production build **PASS**. Real Chromium rendered the NodusApp UI at **http://127.0.0.1:4173/** using an **artificial session-storage fixture**, not real authenticated users: **10 smoke scenarios PASS**, a 116-node synthetic scene, desktop→390→320px; geometry checks confirm mobile title ≤2 lines, no title/actions or pager/magnet overlap, no truncated pager count, no document horizontal overflow, and previous/next neighbor button works. Existing template preview/apply/one Undo/reload, FA→EN, explicit drawer, reduced-motion browser setting and no *additional* document writes from pager/language changes remain checked. The fixture ends with `lastWrites:3` from intentional template edits, **not zero writes total**.

**Actual screenshot evidence:** [CI artifact 14495242952](https://github.com/iAlirezaaa/nodus/actions/runs/44450769365/artifacts/14495242952), six PNGs: `dense-reading-fa-mobile-320.png`, `dense-reading-fa-mobile-390.png`, `dense-reading-en-mobile-390.png`, `dense-reading-fa-desktop.png`, `template-preview-fa-desktop.png`, `template-applied-fa-desktop.png`. FA 320/390 and EN 390 screenshots individually inspected: title and pager are no longer obscured by each other; dense graph background can still visually approach header and needs the broader ND-013 density review. Runner console's older fixed `screenshots:5` counter is stale; the uploaded artifact actually contains **six** files.

**Blocked/non-release:** No authorized native Sites skill was installed, so original Site `appgprj_6af58606fb9c81918541f056a898c1a2` source HEAD/tree, audience, deployment/version and source parity remain **UNVERIFIED**; no hosted deploy or GitHub main merge. Two separate genuine authenticated accounts, revocation/conflicts, independent integration review, 20/100/500 density/performance scenes, reduced-motion-off/hidden-tab motion matrix remain **NOT RUN**. The GitHub API still reports repository visibility `public`, contrary to requested `private`; unchanged. Deployment/version ID: **none**. Next: review 20/100/500 density screenshots and complete native Sites parity/audience and genuine access gates before integration/publication.

## 2026-11-19 04:13 UTC — ND-013 range-aware reading pager, scoping checkpoint

**Problem:** In a dense network, the reading pager currently says only “Showing 10 of 500 neighbors” on each page. At a glance the user cannot tell which ordered slice is visible, especially after switching pages. This is a presentation-only clarity defect on the active ND-011/ND-013 branch, not a reason to add persistence writes.

**Acceptance for this bounded slice:** For 0, 20, 100, and 500 connected neighbors, report the inclusive 1-based range for the current clamped page, correctly handle partial last pages, retain the total and number of pages; language FA/EN and displayed project title remain legible; page navigation must not modify nodes/edges, graph selection, viewport, saved state or Undo. Preserve task-linked, cycle and cross-board filtering. Add focused behavioral tests and run accessible TypeScript and test gates; run the **real** Nodus UI on fixed 4173 and capture screenshots only if a valid checkout/browser is available; otherwise record browser as Blocked and do not publish.

**Observed heads/plan:** GitHub `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; active branch before scope `d7c0faa7f4ad97d9381d0d42eabe5dedb058bf41` / tree `ecc6a772a5f3fd78effd20780f1d3b1949f110ef`. Original hosted Site head/tree/audience unverified (no available Sites skill), no release. Lease `nodus-auto-20261119T041208-nd013-density` on `automation/nodus-control`. Implement and test only the inclusive neighbor-range caption in `lib/graph-spotlight.ts`, `components/NodusApp.tsx`, and behavioral tests on the *same* branch; no data schema, authorization, assets, or live-owner writes. Native full-suite/real screenshot/independent integration are separate gates, not inferred from an isolated helper check.

## 2026-11-19 06:16 UTC — ND-013 mobile pager touch safety (pre-edit scope)

**Run/lease:** `nodus-auto-20261119T061212Z-nd013-continue`; control branch `automation/nodus-control` held by this run. **Branch:** `feat/nd-011-templates-and-dense-graph` from `4920460743e65f4d024c43308825446be72929d9` / tree `8fa1c7998c64b05bcaf67827e437dcd8b4ca2d2c`. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Sites source tree/audience and version are unverified because the native Sites skill is not installed; no release intended.

**Problem:** ND-013's phone reading pager uses 32×34px previous/next tap targets. On a dense 20/100/500-node board, these targets are small for accurate tapping although the title and range now fit at 320/390px. Goal is a bounded, usable mobile interaction improvement without adding persistent state or changing graph topology.

**Slice and acceptance:** Raise pager tap targets to at least **44×44 CSS px on mobile** (retain desktop compactness). On real Chromium 4173 NodusApp fixture at 320/390px check measured target dimensions, no horizontal overflow and no collisions with the board title/adjacent actions or magnet, preserve previous/next 1-based neighbor-range semantics, FA/EN, no additional writes for page changes, Undo and save/reload. Node tests, TypeScript/build and real screenshots are required before claiming UI verification. Check 20/100/500 scene matrix. Reduced-motion unchanged; keyboard native focus stays intact. This run does not touch API, graph, auth, collaboration, schema, or the original Site; keep branch In progress until gates.

**Plan:** Update only `app/globals.css` and existing `tests/browser/nd011-template-browser-smoke.mjs`, then append checked facts to QA/roadmap/log. If CI/browser fails, repair or leave blocked on branch. No unverified main merge or Site deployment.

## 2026-11-19 06:24 UTC — ND-013 mobile pager tap area, verified fixture only

**Run:** `nodus-auto-20261119T061212Z-nd013-continue`. ND-013 **In progress → In progress** on `feat/nd-011-templates-and-dense-graph`. Owned lease on `automation/nodus-control`; main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; original Site tree/audience **UNVERIFIED** due to missing authorized Sites skill. Pre-edit scope `5282822`; code/test `7c67bc0c03f52ad5f0a18800ef03ca27ac7a1ec1` tree `a7411bceb99786249fa419b4b6c73cb187650259`.

**User-visible slice:** mobile readable-network pager previous/next touch targets grew from 32×34px to at least 44×44px on widths ≤650px. Location: existing Read/مطالعه neighbor pager in board header. Only `app/globals.css` and exact-UI Chromium regression assertions changed, no graph/data/shortcut/network change. Preserves natural keyboard button focus, RTL/LTR, pagination, Undo, saved graph and reduced motion.

**Observed gates:** [Actions 44470894917](https://github.com/iAlirezaaa/nodus/actions/runs/44470894917) SUCCESS at exact code SHA: **225/225 native tests**, TypeScript and production build PASS, real NodusApp Chromium synthetic fixture on reserved `127.0.0.1:4173` 10/10 PASS incl 320/390px touch size, overlap/overflow, FA/EN, pager clicks without extra document writes and template save/reload/Undo. Fixed board scenes 20/100/500 nodes rendered with 9/89/489 actual neighbors (not equal to all board nodes). [Nine real browser screenshots](https://github.com/iAlirezaaa/nodus/actions/runs/44470894917/artifacts/14505165084); mobile FA 320 and EN 390 images independently opened. 390px EN still has density label/title crowding, next fix needed. Tests used fixture state, not real login or two real accounts; device touch, non-reduced/hidden motion and independent integration review not run.

**Version/publication:** NONE, unchanged original Site and GitHub main; ND-013 **not Verified/Released**. Repo API currently reports visibility `public` despite desired private; no visibility or audience changes made. **Next:** address mobile header/background caption crowding in ND-013, finish genuine account/permission and motion gates, inspect Sites tree/audience, then reconcile/sync only verified stable result.

## 2026-11-19 07:18 UTC — ND-013 mobile reading heading shield (scope, before source edit)

**Run:** `nodus-auto-20261119T0717Z-nd013-visual-density`; exclusive control lease acquired from `3a058ca` with guarded CAS. Continue `feat/nd-011-templates-and-dense-graph` from `18c7cad05388c7a6964dddf936528c83c8adf179` tree `8cac51da627ad27210f6391cf58164e560288dfc`; main `26fafac` tree `cf93a13`. Original Site source/head/audience unavailable because no Sites skill is installed; original Site remains untouched.

**Observed problem:** In prior real Chromium EN 390px capture, highlighted background graph captions still approach/overlap the board heading even after title/pager layout and 44px controls were fixed. A mobile-only, reading-mode-only background shield can protect the title's visual contrast without changing graph geometry or persistence.

**Acceptance for this bounded slice:** In reading mode at 320/390px, heading title and buttons remain above node captions on an opaque-to-transparent fade; shield is absent outside reading mode and cannot intercept pointer events. Preserve pager 44px touch area, no overflow/overlap, FA/EN and existing fixture's no-additional-write/Undo/reload assertions. Run native tests, TypeScript, build and real 4173 browser smoke via exact-commit Actions; screenshot must be inspected or explicitly remain unverified. No main/Site release absent source parity, independent review and authenticated gates.

**Plan:** Add explicit `is-reading` heading state in `components/NodusApp.tsx`, narrow-screen presentation-only shield in `app/globals.css` and browser CSS assertions in `tests/browser/nd011-template-browser-smoke.mjs`. Check in a separate code commit on the same feature branch; status remains In progress until all gates complete.

## 2026-11-19 07:27 UTC — ND-013 heading contrast, verified branch-only slice

**Run and state:** `nodus-auto-20261119T0717Z-nd013-visual-density`, ND-013 remains **In progress** (not Verified/Released); branch `feat/nd-011-templates-and-dense-graph`. Scoping commit `d60e6a7` tree `5bece525`; exact code+browser regression commit [`aa18cbd00bf84f1012ba2fd6628fe1816a3a9ed9`](https://github.com/iAlirezaaa/nodus/commit/aa18cbd00bf84f1012ba2fd6628fe1816a3a9ed9), tree `d4d922d0a28349691c200dbc338158de985e1f16`. Main unchanged at `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.

**User-visible change:** Only when mobile reading mode is on, the board heading has a subtle background-to-transparent shield behind its title and neighbor controls. Underlying network captions no longer compete with the heading in the top region; reading mode off does not render this shield. The pseudo-element never intercepts pointer events. Toggle location: the existing “مطالعه / Read” button in the canvas heading; no new toolbar button, persistence field, API or schema. Native CSS/theme variables support FA/EN and no new animation/write loop is introduced.

**Actual checks:** [GitHub Actions run 44479036046](https://github.com/iAlirezaaa/nodus/actions/runs/44479036046) completed **SUCCESS** at exact code HEAD: **225/225 native Node tests**, TypeScript `--noEmit` PASS, production build PASS, real Chromium NodusApp fixture on **http://127.0.0.1:4173/** **10/10** smoke scenarios PASS. New 320/390px assertions confirm only active reading mode draws a non-hit-testing gradient; exit removes it with zero additional document writes. Existing title/pager 44px, no overflow or collision, FA/EN language switch, template apply/Undo/reload, selected count and fixed 20/100/500-node scene checks still pass. `lastWrites=3` are the three intentional fixture document edits, not an animation write count.

**Screenshots:** real browser artifact [14506964035](https://github.com/iAlirezaaa/nodus/actions/runs/44479036046/artifacts/14506964035), nine PNG files including `dense-reading-fa-mobile-320.png`, `dense-reading-fa-mobile-390.png` and `dense-reading-en-mobile-390.png`. FA 320 and EN 390 screenshots downloaded and visually inspected; top title region is legible without evident overlay from graph captions; a peripheral label remains clipped at the extreme left of EN 390, so dense-graph readability is **not** universally complete. The full density performance budget (p95/fps) remains unmeasured.

**Blocked release gates:** Current original Site source HEAD/tree, audience, D1/R2 and version unavailable because native Sites skill is not installed; hosted screenshot and two actual authenticated users with permission/revocation/conflict not tested; independent integration review and full non-reduced/hidden-page motion QA still pending. Original Site and user data untouched. GitHub repo visibility currently reports `public` despite private intention; no access policy changed. No merge, Site save, publish or deployment ID.

**Next:** Resolve remaining extreme-edge label clipping while safeguarding selection/focus; then complete independent review, Site source/audience parity and authenticated gates before considering guarded release. Screenshots and fixture results are not proof of a real production login.
