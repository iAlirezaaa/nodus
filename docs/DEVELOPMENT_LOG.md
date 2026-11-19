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
