# ND-011 + ND-013 responsive reading regression — 2026-11-19

Status: **In progress on feature branch; original Site release Blocked**. No Site production deployment or data write was attempted.

## Reproducible failure and correction

- Baseline: real GitHub Actions Chromium smoke on branch commit `761143b948429c8bddeee893d9e4fd49a5751820`, [run 44427333185](https://github.com/iAlirezaaa/nodus/actions/runs/44427333185), browser job `135235452567` **failed**. The viewport was changed from 1280×800 to 390×844 while the desktop navigation sidebar remained open. `.sidebar-scrim` intercepted the enabled `همسایه‌های بعدی` button (Playwright pointer-interception timeout).
- Correction: `components/NodusApp.tsx` closes sidebar only when crossing into `max-width: 849px`, in addition to closing initially on a narrow mount. The `matchMedia` listener is removed on unmount. It does not prevent explicit drawer opening on a stable mobile viewport.
- New browser regression: `tests/browser/nd011-template-browser-smoke.mjs` asserts scrim detaches after desktop→390px, manually reopens/closes mobile drawer, clicks next neighbor page without force and checks no additional document writes. Template apply, one Undo, reload and FA/EN are still exercised in the same real NodusApp fixture.

## Exact branch evidence

- Feature branch: `feat/nd-011-templates-and-dense-graph`.
- Pre-edit scoping commit: `e2b8b78fd19beb5a7dcccf3c179ed9b0ed4cf67d`.
- Fixed code+test commit: `841fdeb5923b2a4fda05b4a2d13aede885329f67`; full tree `0a26507c561788a97d8c65ff74d246f734b05e45`.
- [Run 44443104827 — SUCCESS](https://github.com/iAlirezaaa/nodus/actions/runs/44443104827), exact HEAD `841fdeb`: **224/224** native Node tests passing, TypeScript `--noEmit` passing, production build passing. Browser job `135288669140`: Chromium real `NodusApp`, **10 passing smoke scenarios**, 116-node dense scene, viewport 390px, no horizontal document overflow, **http://127.0.0.1:4173/**, `reducedMotion: 'reduce'`. Its logged `lastWrites: 3` includes legitimate fixture document edits; the pager/language follow-up asserts *no additional* writes.
- [Five real Chromium screenshots](https://github.com/iAlirezaaa/nodus/actions/runs/44443104827/artifacts/14492830556) (`template-preview-fa-desktop.png`, `template-applied-fa-desktop.png`, `dense-reading-fa-desktop.png`, `dense-reading-fa-mobile-390.png`, `dense-reading-en-mobile-390.png`), retained until 2026-12-03 by the run artifact policy. Mobile FA/EN and desktop FA reviewed; caption clutter near the mobile heading remains a visible ND-013 issue, not a successful 500-node performance claim.

## Gates not yet cleared

- GitHub and **original** hosted Sites source tree parity, original audience/auth policy, hosted version ID: **unverified** (native Sites skill unavailable). No deployment.
- **Two real authenticated accounts, revocation/readonly, conflict**: not run. The browser data is explicitly **synthetic**, not production or a genuine login.
- 20/100/500-node comparative scene screenshots; performance budget and reduced-motion *off*, hidden-page freeze/no-write-per-frame matrix: not fully run in this slice.
- Independent interaction/code review of whole ND-011/013 feature: not done. Thus **not Verified or Released**.
- API reports the GitHub repository as **public** contrary to the designated private scope; permission not changed.

**Next:** audit fixed mobile header/caption overlap and broader graph states, review real-account flows, independently inspect source, restore authorized Sites access to compare trees and audience, then consider guarded main integration and corresponding Site publication only after gates pass.

## 2026-11-19 03:23 UTC — additional 320/390px header and pager QA

**Code under test:** `feat/nd-011-templates-and-dense-graph` commit [`1abe0c36671222daee8f1a9974a0a95a4ce686b8`](https://github.com/iAlirezaaa/nodus/commit/1abe0c36671222daee8f1a9974a0a95a4ce686b8), source tree `1a17f2e00ab5af73e2cfb9f6a93209a4b0fd0165`; code/test predecessor `d03127b`, pre-edit scoping `86f3351`. The header uses a two-row narrow layout with an up-to-two-line title; reading pagination is in flow and its count is not truncated, magnet control follows below.

**Observed:** [Actions run 44450769365](https://github.com/iAlirezaaa/nodus/actions/runs/44450769365) completed **SUCCESS**: native Node 224/224, TypeScript and production build PASS. Real Chromium and NodusApp (synthetic logged-in fixture only) on `127.0.0.1:4173` ran 10 smoke scenarios PASS, with new DOM rectangle/no-overlap/no-overflow/count-clipping assertions at 390 and 320px, one Undo/reload, reading pager, FA/EN toggle, and no extra graph writes for presentational changes. `reducedMotion:'reduce'` used. Fixture `lastWrites:3` includes three deliberate document mutations.

**Six real screenshot PNGs** were uploaded as [artifact 14495242952](https://github.com/iAlirezaaa/nodus/actions/runs/44450769365/artifacts/14495242952). The screenshot filenames are `dense-reading-fa-mobile-320.png`, `dense-reading-fa-mobile-390.png`, `dense-reading-en-mobile-390.png`, `dense-reading-fa-desktop.png`, `template-preview-fa-desktop.png`, `template-applied-fa-desktop.png`. FA at 320 and 390px and EN at 390px were inspected; heading and pager no longer collide. The existing printed `screenshots:5` is a hardcoded old console metric and not the actual artifact count.

**Still Blocked:** original Site current source tree/audience and real two-account/revocation verification, independent review and 20/100/500 density matrix, non-reduced/hidden-page motion verification. No original Site version, new deployment or release. Keep ND-011 and ND-013 In progress on feature branch; `main` and owner data unchanged.
