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
