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
