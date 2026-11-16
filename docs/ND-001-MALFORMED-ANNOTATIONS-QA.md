# ND-001 — search over malformed recovered annotations

Scope recorded before application edits in guarded control lease `nodus-20261116T113022Z-nd001-gates` (2026-11-16T11:30:22Z). Existing feature branch: `fix/nd-001-search-clarity`. Starting head `05a8096d7a124ab4f2b0e42f157150db09962ffc`, tree `203266c2e0234b0de287f0876bc2189a7747e298`.

## Problem, acceptance, bounded slice

Legacy/partially recovered annotations with a null entry, missing body/quote, invalid field types or non-array annotation collection can throw in `anyAnnotationFieldMatches` and independently in the Search result preview. A single bad record may hide otherwise valid results.

Acceptance: skip only malformed entries/fields and still match valid later comments/quotes; keep exact phrase field boundaries; preserve honest totals (151 -> 70/70/11), original graph bytes, nested paths, focus/keyboard shortcuts, persistence and collaboration. No schema, data migration, animation, UI control or network write. Patch `lib/search-annotations.ts` and `lib/search-result-preview.ts`, add native helper/preview/paging regressions on the existing ND-001 branch.

## Evidence and release gates

- Exact prior GitHub helper `d45686b45c2684079009cd81024d39a4151fa852` was fetched and its SHA checked against local `git hash-object`; native Node.js 22.16.0 old helper **1/5 pass**, corrected helper **5/5 pass** using `node --experimental-strip-types --test tests/search-annotations-missing-fields.test.ts`. Isolated TypeScript 5.8.3 strict on patched helper: **PASS**, not project-wide TypeScript 5.9.3.
- Exact fetched preview source mechanically stripped of type annotations in isolated V8 with stubbed non-target dependencies: four scenarios checked; old code threw in 2, corrected code threw in 0. This is **not native project-level preview integration**.
- New checked-in tests for helper, Search preview and 151-result integrated paging have **not all been executed** as the full repository suite. 151/70/70/11 and keyboard/IME/Undo are *acceptance assertions*, not reported app-verified in this run.
- Last inspected [Actions 43815676402](https://github.com/iAlirezaaa/nodus/actions/runs/43815676402) failed at 06:16:53 UTC within 2s, `runner_id=0`, `steps=[]`. No tests, TS or build executed there.
- Full native project tests, TypeScript 5.9.3, production build, real `http://127.0.0.1:4173/` browser (FA/EN desktop + 390px, focus/IME/Enter/Tab/Undo/save+reload), real screenshot and authenticated Site current HEAD/tree remain **Blocked / NOT RUN**. The private GitHub clone cannot resolve here, Sites skill inventory is empty, browser tab context is unavailable and 4173 has no Nodus listener. Screenshot: **NONE**.
- `main` head `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Sites source/tree **UNVERIFIED**; historical version 11 is not parity evidence. New deployment/version: **NONE**. Production audience and data untouched.

**Status:** ND-001 **In progress**, release **Blocked**, **feature-branch only**; not Verified or Released. Next: recover Nodus full checkout and authenticated Sites access, run full native/TS/build gates, browser screenshots and independent review, reconcile GitHub/Sites trees, then guarded integration and publication before ND-002.


## Committed branch result
Source+tests+docs commit: [dd7b4f64](https://github.com/iAlirezaaa/nodus/commit/dd7b4f64e3ad11b384b42eeb44643e503b7d5843), tree `463e7366ed89b42034c25b05e6c37029369fc7b2`. Exact committed helper blob `e8e7d987a8ecdc79914f4be81edb56145350b351`, preview `ba7648a22481893acb33e521cc14afed4e5f99a4`, focused test `e57169ae594ddde7b1e1b3a665117e4e787a3ea8`. Seven isolated V8 helper probes against committed source passed, complementing 5/5 local native Node22 and limited TS5.8.3. [CI 43860009045](https://github.com/iAlirezaaa/nodus/actions/runs/43860009045) failed without runnable test/build steps. Screenshot none, release version/deployment none; branch-only.
