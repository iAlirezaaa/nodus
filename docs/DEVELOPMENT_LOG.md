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

## 2026-11-16 — ND-013 dense-graph readability + ND-023 GitHub hosting assessment

**Run:** `nodus-chat-20261116T205036881Z-nd013-pages`. Direct owner request to keep growing graphs readable on phones and publish a GitHub-hosted version. Lease acquired using `automation/nodus-control` compare-and-set; concurrent source branch `fix/nd-001-search-clarity` preserved.

**Before → after:** ND-013 `Queued → In progress` on `feat/nd-013-dense-graph-readability`, GitHub Pages/full app request `ND-023 Blocked`; **no release**.

**Changed:** Distant views of large graphs suppress unreadable unselected labels, retaining dots/connections; selected/hovered/focused titles expand with contrast; coarse touch target floor; horizontal canvas bounds apply to captions and inline title editors at high zoom and alongside sidebars. View-only changes; no schema, storage or shortcut changes.

**QA:** 9/9 exact-source Node tests, isolated TypeScript 5.8.3 helper, and 5 synthetic Chromium fixture configurations pass. An edge-clipping issue at 390px/zoom 1.6 was observed and repaired. See `docs/ND-013-DENSE-READABILITY-QA.md` for measurements and explicit limits.

**GitHub/Sites:** GitHub source contains branch code. Existing auth/API/D1/R2 cannot run as a complete app on static GitHub Pages. Authenticated Site source/tree and audience not inspected; no public host configured. No production data accessed or deployed. Full native suite, TypeScript 5.9.3, build and real 4173 app screenshots are Blocked/not run, so `main` and Site are untouched.

**Source implementation commit/tree:** `fb0a9ed1cbd4ea0ae9a652c02e2e6529cc33da2a` / `273514ff05105a85832a908f46cb2bd3dc1ee7f5`; release ID **NONE**; screenshot only local synthetic fixtures.

**Next:** Real app QA/build and independent review before merge/deploy; reconcile GitHub/Sites head+tree; choose an authorized dynamic hosting option for ND-023 that preserves access and persistence.
