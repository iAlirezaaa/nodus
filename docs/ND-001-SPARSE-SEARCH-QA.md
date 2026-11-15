# ND-001 — safe derived search for sparse imported records

**Status:** In progress; branch-only. **Publication:** Blocked. Recorded 2026-11-15T18:32:05.834Z UTC.

## Problem, boundaries and acceptance

Nodus' derived search ranked legacy/imported nodes by normalizing `title` and `text` as if every record were fully populated. A single missing value raised a runtime TypeError and prevented finding other valid thoughts. Full nested-board path building likewise used `title.trim()` on an absent board title. These invalid data are not silently repaired; the graph's canonical validation and persistence rules remain unchanged.

**Bounded fix:** Treat a missing node title/note as an empty string for comparison, and a missing board title as the caller-provided untitled label for derived paths. The existing branch `fix/nd-001-search-clarity` is continued; this is not a new feature branch. No user graph edits, schema, API, keyboard, selection, collaboration, animation, or live-Site changes.

**Acceptance:** A malformed legacy record cannot prevent later valid results; 71 matching thoughts still split 70/1 with honest totals; empty browse remains available; a nested board with missing title renders a stable Persian fallback path; frozen source records remain unchanged; ordinary ranked results stay identical.

## Exact source and checks

- Scoped before edit: [f213c876](https://github.com/iAlirezaaa/nodus/commit/f213c87637ca23d53a3a3856aa13e096489575d3).
- Implementation and 3 new regression cases: [2bd7523](https://github.com/iAlirezaaa/nodus/commit/2bd7523e8a7222a874686b52131ad29be23191b7).
- Test fixture type boundary: [7b69238](https://github.com/iAlirezaaa/nodus/commit/7b6923884a473a05b5a9da50278de1d123bad0eb); tree `97ffb4e2b34ac804a4b4d3694bc3ca7240ee26d8`.
- Exact fetched GitHub blobs: previous helper `47883ffc49c023bf92068fbf339c0c564c4a3033`, revised helper `a4ea68fba55c59d676a0a41f587c59ba5993763e`, committed regression test `b426f357a31b73850ca087afe0fc805a0342d156`.
- **Red/green:** In a JS V8 test harness that removes TypeScript syntax and stubs non-target dependencies, the three *committed test scenarios* fail **0/3 passing** on the prior helper (two missing-value normalize TypeErrors and one missing-board-title trim TypeError). All **3/3 pass** on the revised helper. This is not the native Node test runner and does not prove the entire repository's tests.
- **Behavioral parity:** **3,200 deterministic comparisons** across 100 synthetic, valid FA/EN workspaces and query/page variants produced identical result counts, ordering, windows and graph content for old and revised helpers. These were V8 isolated tests, not app UI tests.
- **TypeScript:** Limited strict TypeScript 5.8.3 probe of guard expressions and test-type boundary passed; it is not `tsc` for the repository or TS5.9.3.
- **CI evidence:** [GitHub Actions run 43746828598](https://github.com/iAlirezaaa/nodus/actions/runs/43746828598) completed as failure with `runner_id=0`, `steps=[]`. **No native tests, project typecheck or build ran on CI**.

## Pending release gates

- Full native Node24 project suite: **NOT RUN**. Project TypeScript 5.9.3: **NOT RUN**. Production build: **NOT RUN**.
- Real browser on `http://127.0.0.1:4173/`, desktop/390px, FA/EN IME/Enter/Tab/focus/Undo/save/reload: **NOT RUN**; no listener available. Screenshot: **NONE**.
- Current authenticated Sites source HEAD/tree: **UNKNOWN**. No Sites skill exposed and connected Browser requires an originating browser context. Historic version/tree is not asserted current or equal to GitHub. No Site save/publish/version, audience change or owner-data mutation. Two real authenticated accounts not tested.
- `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Source change and QA remain on `fix/nd-001-search-clarity`. Status remains **ND-001 In progress; release Blocked**.

**Next:** Recover authorized full checkout/Node24 dependencies, execute complete tests/TS5.9.3/build, inspect real FA/EN desktop/mobile on 4173 with screenshot, reconcile authenticated Site HEAD/tree and independent review, then guarded main merge/Site publication of ND-001. Begin ND-002 only after these gates.
