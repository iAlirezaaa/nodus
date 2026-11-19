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

## 2026-11-19 06:24 UTC — 44px mobile neighbor pager, fixed-scene follow-through

**Status:** ND-013 **In progress on feature branch**, not Verified/Released. Control lease held by `nodus-auto-20261119T061212Z-nd013-continue`; original GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). The original Site's current tree and audience cannot be read through an installed Sites skill; no merge, Site save/publish or production data mutation.

**Code/branch:** scoped in `5282822fd8cfaad0209f40d3580f695f6d971f1a` and implemented `7c67bc0c03f52ad5f0a18800ef03ca27ac7a1ec1` (tree `a7411bceb99786249fa419b4b6c73cb187650259`), branch `feat/nd-011-templates-and-dense-graph`. Mobile previously had 32×34px pager click targets. A narrow-screen CSS override makes both previous/next targets 44×44px minimum (including disabled button), without adding graph state/writes. The real Chromium test at 320 and 390px now measures the click rectangles, catches title/pager/action/magnet collision and clipped counts, and retains next-page click and FA/EN controls.

**Fresh exact-code evidence:** [CI run 44470894917](https://github.com/iAlirezaaa/nodus/actions/runs/44470894917) **SUCCESS** on `7c67bc0`: 225/225 native Node tests, TypeScript noEmit PASS, production build PASS. Real NodusApp Chromium on **http://127.0.0.1:4173/** with *synthetic session-storage API fixture*, not genuine login: 10/10 smoke scenarios PASS; 320/390px touch/overflow/overlap assertions PASS, FA/EN and neighbor paging, template apply/Undo/reload and no additional document writes for purely presentational actions. `lastWrites=3` are expected document edits in the fixture. Browser `reducedMotion: 'reduce'`; non-reduced and hidden-page animation matrices were not run.

**Fixed-scene matrix:** on the exact UI the 20, 100 and 500 **board-node** scenes contain 9, 89 and 489 direct neighbors of the focused node respectively (other original nodes are not neighbors). The captions show `1–9 از 9 همسایه · 1/1`, `1–10 از 89 همسایه · 1/9`, and `1–10 از 489 همسایه · 1/49`; this is correctly not a claim of 20/100/500 directly linked neighbors. The 500-node scene is an end-to-end interaction/render smoke, not a measured p95/fps claim.

**Screenshot proof:** nine real Chromium PNGs in [artifact 14505165084](https://github.com/iAlirezaaa/nodus/actions/runs/44470894917/artifacts/14505165084): `dense-reading-fa-mobile-320.png`, `dense-reading-fa-mobile-390.png`, `dense-reading-en-mobile-390.png`, `dense-reading-{20,100,500}-fa-desktop.png`, `dense-reading-fa-desktop.png`, and two template captures. FA mobile 320px and EN mobile 390px were opened and visually reviewed; tap buttons occupy larger footprints and no clipping is apparent. In the 390px English picture some background graph labels still approach/overlap the title region: **remaining ND-013 crowding work**, not a passed final visual audit. Real touch hardware was not tested.

**Release blockers / next:** original Site head/tree/audience/version unavailable; two actual authenticated accounts, read-only/revocation/conflict tests and independent feature integration review absent. Need implement/test suppression or safe placement of dense graph captions near the mobile header, verify both motion modes and hidden page, then compare exact GitHub/Sites trees and permissions before guarded main+Site release. No hosted deployment/version ID exists for this slice.

## 2026-11-19 07:27 UTC — active-reading mobile heading shield

Commit [`aa18cbd`](https://github.com/iAlirezaaa/nodus/commit/aa18cbd00bf84f1012ba2fd6628fe1816a3a9ed9) (tree `d4d922d`) adds `canvas-heading.is-reading` only while reading; at ≤650px a noninteractive, opaque-to-transparent backdrop keeps background graph labels from visually crossing the board heading. The backdrop is static, uses `var(--bg)`, has no data writes and is absent on exit. New browser assertions check the pseudo-element in 320/390px viewports, then off-state removal and unchanged write count.

[Exact GitHub CI run 44479036046](https://github.com/iAlirezaaa/nodus/actions/runs/44479036046): 225/225 Node + TypeScript/build PASS; 10 real NodusApp Chromium smoke scenarios PASS on exact 4173 with synthetic API session data only. [Nine real screenshot PNGs in artifact 14506964035](https://github.com/iAlirezaaa/nodus/actions/runs/44479036046/artifacts/14506964035); FA 320 / EN 390 inspected and contrast improved. Remaining EN 390 peripheral text clipping and original Site/two real-account/motion/independent review gates are **unverified**. Branch-only **In progress**, no production Site deployment.
