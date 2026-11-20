# ND-013 — Zone title visibility in distant overviews (branch candidate)

## Result — 2026-11-20T02:35:20.565Z

**Status: In progress / release Blocked.** New branch `feat/nd-013-zone-overview-headings` was created from current released main `4a7fc65524c53cf8ad58762a3eab90c692c45c3a` (tree `de5294e65cc6809d300e24e11417856d60bc6355`), rather than silently replacing older divergent ND-011/013 feature branches. Pre-edit scoping commit: `3c570e08e00ee75cb973efa4b08790c616bdff80`.

**Source:** code + corrected regression tests [`8094def08bf9ab7e537e5e27f5ab490f0ccb275f`](https://github.com/iAlirezaaa/nodus/commit/8094def08bf9ab7e537e5e27f5ab490f0ccb275f), tree `ff3e0359a29dd547660b8c1f4aba151d648ccef7`. Current published v13 remains unchanged. No source merge, Site save, publication or owner-data write in this invocation.

## User-visible candidate

The existing Zone title/edit button previously scaled with the graph, leaving a nominal 44-world-pixel control only **6.6 physical pixels** tall at overview zoom `0.15`. The candidate computes a screen-space header layout for the visible Zone and applies an inverse scale only to its edit header. It keeps the original Zone outline and membership in world coordinates. At distant zoom, the title stays legible with a **44px** hit target and safe 12px screen margins, including narrow 390px layouts and RTL. It does not create a second/floating document node or a new editor; users retain **Zone heading → edit**. Zoom `>=0.65` retains existing detailed layout.

**Code boundaries:** pure `lib/zone-header-layout.ts` computes position/scale from existing Zone bounds, viewport and direction; `components/Canvas.tsx` passes ephemeral CSS properties; `components/zones.css` restores screen-sized visual dimensions. No schema changes, new animation timers, collaboration operations, graph edits, migration or per-frame persistence.

## Fresh checks

| Gate | Result |
| --- | --- |
| Git object parity | Exact GitHub helper SHA `4b77b4aa7820f14b9ca3204c15ff76fddf787d29` and checked-in corrected test SHA `5b02462292352d5c2f01bd238c36df6725431e02` verified with local `git hash-object` on actual test inputs. |
| Targeted native behavior | **4/4 PASS** Node 22.16.0 `node --experimental-strip-types --test tests/zone-header-layout.test.ts`, using byte-identical GitHub blobs. Tested distant LTR target width/height, mobile RTL, partly visible large group, invalid/fully offscreen groups and unchanged pure inputs. |
| Failure and correction | Initial exact source tests **3/4 PASS**: strict floating equality failed on `44.00000000000001`; corrected to an epsilon comparison and re-ran **4/4 PASS**. This was a test precision fix, not a claim of application UI behavior. |
| Isolated TypeScript | `tsc --noEmit --strict --target es2022 --module esnext lib/zone-header-layout.ts` **PASS** (system TypeScript 5.8.3; not the project's pinned 5.9.3). |
| Full checked-in suite / project TypeScript / production build | **NOT RUN / Blocked:** complete package checkout and installed dependencies unavailable in this runtime. The prior release's 261 tests are historical and are not this run's count. |
| Real Nodus browser and screenshot at 127.0.0.1:4173 | **NOT RUN / Blocked:** no actual app preview or full runtime available; no screenshot is claimed or attached. Fixed port was not repurposed. |
| FA/EN real form focus, Enter/Tab, drag/pan, Undo, reload, mobile, physical touch/IME | **NOT RUN** end-to-end. Pure geometry is direction-aware and does not call graph-edit functions; integration behavior still requires QA. |
| Reduced motion / hidden tab / per-frame saves | No new animation loop/timer introduced by this diff. Actual browser visibility/reduced-motion and write-counter measurements **NOT RUN**. |
| Two real production accounts and collaboration access/conflict | **NOT RUN**; no live user data used. Existing v13 collaboration logic was not edited. |
| Original Sites source/audience/tree | **UNKNOWN** in this run: the current authorized Sites skill is not installed. Native Site version 13 and owner-only policy were previously recorded; not newly verified. |

**Next:** recover authorized Sites source/audience head/tree, a full verified checkout and port 4173 preview; exercise FA/EN desktop+390px browser with actual screenshots, keyboard, Undo, focus, and no graph saves on pan/zoom; independently review overlap and click targets in 20/100/500-node scenes; run full Node/TypeScript/build; then reconcile and guard main/Site release. Until then this is **branch-only, not Verified, not Released**.

## 2026-11-20T03:17Z — continuation acceptance plan

Medium-zoom Zone headers (65%–99.9%) still have sub-44-pixel hit targets; the next bounded branch slice extends the same inverse-scale layout below 100% while retaining the descriptive text in the intermediate zoom band. Exact code, tests and unavailable gates will be recorded below after implementation. Original Site v13 remains untouched.

## 2026-11-20 03:20 UTC — medium-zoom follow-up result

**Status: In progress / Blocked for release.** The same branch `feat/nd-013-zone-overview-headings` now includes the middle zoom band. Code [`738cca0`](https://github.com/iAlirezaaa/nodus/commit/738cca015a961f11a90221c94066d713099c3fae), tree `d8652525002261a3c9cc6c199b6c8fbc0776d125`. Existing controls remain Zone heading → edit. No release was attempted or implied.

**Changed behavior:** below 65% = overview (header screen-sized, description hidden); 65% to less than 100% = compact (header screen-sized, description visible); 100% and above = full world-size header (at least 44px physically by zoom). The intermediate band previously had 44 × zoom = 28.6 to 43.96px target heights. CSS applies inverse scale to overview and compact only; the pure helper projects title position in both directions. No persistence, mutation, timer or animation frame writes added.

**Fresh checks (only these):** Node 22.16.0 source-identical `node --experimental-strip-types --test tests/zone-header-layout.test.ts` **5/5 PASS** (one new test with zoom .15/.649/.65/.85/.999, RTL/LTR, 390px and default/invalid mode checks, plus four existing tests). Exact local `git hash-object` matches GitHub helper `02b1f887897f8bb74a024dae1a9c5e20f854705e` and test `b1625e54ed020fc65bc7cce7bb2ad17fbc9ddbe9`. Isolated TypeScript 5.8.3 `tsc --noEmit --strict --target es2022 --module esnext lib/zone-header-layout.ts` PASS. Reviewed the GitHub four-file diff for persistence separation; **not an independent review**.

**Unverified/blocked:** complete project checked-in tests, project TypeScript, build, Chromium 4173 desktop/390px screenshots, actual CSS rendering/description overflow/overlap at viewport bottom, native IME/touch, keyboard focus/drag/pan/Undo/save/reload, reduced-motion and actual hidden-tab/write-counter measurements; two genuine authenticated production users and collaboration conflicts; native Sites head/tree/audience. No available native Sites skill; local git checkout cannot access github.com (DNS resolution failed) and full dependencies unavailable. No screenshot, live account or production code test is claimed. Site v13 and audience are only previous-history evidence, **not newly inspected**. GitHub reports public despite requested private status. No force updates or repo visibility changes.

**Next precise gate:** restore permitted full checkout and native Sites access; run full tests/TS/build and actual 4173 responsive/pointer/keyboard screenshot QA, independently review bottom-clamp/collisions, then reconcile fresh main/Site trees and consider guarded release.

## 2026-11-20 04:15 UTC — compact bottom-edge regression and fix

**Status:** In progress on `feat/nd-013-zone-overview-headings`, release **Blocked**. Code [`b27f6e4`](https://github.com/iAlirezaaa/nodus/commit/b27f6e44405a206bcc5a2151698783e858e99e26) tree `48f41b8d1913bda0049ecb8b825ce90db80219ec`. New `tests/zone-header-bottom-edge.test.ts` preserves expected CSS line heights (estimated 113px, tested conservatively as 116px), width 390px, target 44px, plus 12px bottom clearance for both RTL/LTR at zoom 0.65/0.85/0.999. Previous 88px reserve positioned bottom at about **872px** on a **844px** viewport with maximum title+description. Compact now reserves **128px**; overview keeps **88px**. Tiny compact viewports <140px decline the projection.

**Red/green checked:** Exact old GitHub helper blob `02b1f887897f8bb74a024dae1a9c5e20f854705e` with new tests: **2/3 PASS**, failing the bottom-edge case. New GitHub helper blob `c0363106854d2ac41df49280a41225551d4e74db` and test blob `7b95cc325ff8da42caeb082f3679644b74694327`, both matched local git hashes, returned **4/4 PASS** using Node 22.16.0 `node --experimental-strip-types --test tests/zone-header-bottom-edge.test.ts`. Isolated helper TypeScript 5.8.3 strict/noEmit **PASS**. This run does not relabel earlier 5/5 or 261/261 tests as fresh.

**Not done / release gates:** Full repository tests, project TypeScript/build, actual 4173 UI/390px screenshot and real text metrics, keyboard/IME/focus, drag/pan/Undo/save/reload, real reduced/hidden tab, per-frame network/persistence counter, independent review and two real production accounts. The environment has no verified complete checkout/dependencies; `git ls-remote` failed DNS, and no current native Sites skill was available for source/audience/tree. No screenshot, actual browser proof, deployment/version ID or live feature claim. Previously deployed Site v13 was **not modified**. The GitHub repository currently reports public, contrary to requested private; unchanged.

**Next:** recover the authorized Sites skill and full repository checkout, run the blocked gates and capture actual screenshot before any main merge/Site save or publish.

## 2026-11-20T05:20:55.967Z — cross-Zone heading collision avoidance (branch only)

**User-visible candidate:** When two partially overlapping Zone outlines independently clamp their screen-size labels to the same pixel rectangle, one label obscures the other. The new pure `zoneOverviewHeaderPlacements` orders visible Zones deterministically, keeps an 8px separation between edit-header rectangles, tries the nearest valid vertical position (bounded to approximately one header height), and omits a saturated title rather than rendering an overlapping/sub-44px control. The Zone data, boundary, member nodes and connections remain intact. Hidden titles are still available from **Board toolbar → Zones**. At 100%+ zoom, the original full header layout remains unchanged.

**Files / actual code:** `lib/zone-header-layout.ts`, `components/Canvas.tsx`, `tests/zone-header-collision.test.ts`. Commit [`12f9131`](https://github.com/iAlirezaaa/nodus/commit/12f9131651a8c7b2e957b1e89139b6356b475a7a), tree `4f3e1817bfe974ecbe0f5cb07cfaa2ce93ae5084`. Source blob `b04633b5b50b4573c3da95179f5f83608cfadffd`, regression test `3d462d63a783d2c07dca98d1aab387e01e5ae494`; both match local `git hash-object` after reread. Previous single-Zone layout remains in place and its API unchanged. No CSS, SQL, shared protocol, saved positions, Undo or Site edits.

**Verification in this run:** exact-byte source isolated `node --experimental-strip-types --test tests/zone-header-collision.test.ts` on Node 22.16.0: **5/5 PASS**; first local revision 4/5 PASS due only to floating-point subtraction in a deep-equality expectation, resolved by returning the original placement when no collision. Isolated helper `tsc --noEmit --strict --target es2022 --module esnext lib/zone-header-layout.ts` TypeScript 5.8.3: **PASS**. Synthetic pure computation at 390px, zoom .65: 20/100/500 Zone scenes (60 calls each) yielded p95 0.574/0.213/0.633ms on this runtime, a helper-only measurement **not a canvas frame-rate or user experience benchmark**. FA/EN directional booleans, .2/.65/.85/.999 zoom, offscreen groups, viewport boundaries, saturated collision, stable ordering and untouched input objects covered by targeted tests.

**Still blocked:** full checked-in tests, project TypeScript 5.9.3, production build, actual Nodus Chromium on the **fixed `http://127.0.0.1:4173/`** in FA/EN at desktop/390px, rendered CSS/label overlap/toolbar interactions, screenshot (**none this run**), focus/Enter/Tab/IME, drag/pan, Undo, save/reload, physical touch, hidden/reduced-motion presentation and per-frame document-write counters. No two real authenticated accounts were used; no collaboration/access result claimed. Current native Sites source/tree/audience and packaged artifact were not available because Sites skill list is empty; previous v13 deployment is historical, **not newly verified**. GitHub metadata currently returns `visibility=public`, contrary to requested private scope; no permission changes attempted. No release, merge or publish, gate **Blocked**. Independent integrated UI review pending.

**Next:** recover authorized full Nodus checkout and Sites source/audience, run native suite and complete build, use real Nodus on 4173 for screenshots and pointer/keyboard/mobile checks, independently review overlapping heading/toolbar interactions, and only then consider guarded GitHub main/Site parity and publication.

## 2026-11-20T06:20:46.435Z — selected-Zone heading priority (pre-edit scope)

When collision removal would hide the header of the Zone containing a selected node, keep that Zone's edit heading first while allowing only nonselected overlapping headers to be suppressed. The saved graph and Zone members never change. Test two identical overlapping groups with one selected, reverse input order, LTR/RTL, 390px, 44px targets and no selection regression. Code boundaries: pure `lib/zone-header-layout.ts` and Canvas presentational selection; no Site update. Full browser/production gates remain Blocked pending authorized runtime and source access.
