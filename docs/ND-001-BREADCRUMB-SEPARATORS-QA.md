# ND-001 — copied breadcrumb separators QA (unreleased)

Date: 2026-11-16 UTC. Scope: existing feature branch `fix/nd-001-search-clarity`, main unchanged. [Code and tests](https://github.com/iAlirezaaa/nodus/commit/49918ff1313edbabfb40eb9bf1f7ea3822d5de13), tree `9675b45cf18674e056c599ef7feaa66582f17696`.

## User problem and correction

Project location `ریشه / پروژه` could not be found with the visually copied/typed `ریشه › پروژه` or `ریشه > پروژه`: 0 matches despite 151 existing nodes. Unquoted compact matching recognizes the two chevrons in the same way as a slash. The preview explains the hit as **project path**. Exact quoted phrase matching remains strict. Titles, original paths, URLs and stored graph data are unchanged.

## Checks actually performed

- **Before:** exact previous GitHub search blob `d2cffabab22a97621c5f98878941feb40ac6bde3` under a V8 TS-erasure harness: both chevron queries returned **0/151**; slash returned **151/151**.
- **After:** exact committed search blob `cb56eaad39a6488af3eba6159da68963d4adc995` and preview blob `706257ac37d898c8564b034cb09068af1b85fda3` transformed mechanically from TypeScript to JavaScript with URL, annotation and excerpt helpers stubbed: **7/7 focused V8 scenarios passed**. Two Persian chevrons and slash returned 151, page offsets 0/70/140 gave **70/70/11** in stable order, preview was `project`, quoted chevron returned 0, direct title outranked project-only hits, and the two English chevrons found the nested path.
- **Registered, not run natively:** three tests in `tests/thought-search-breadcrumbs.test.ts` (blob `626dec1315a16db4a3539493842644b392f1632a`) also assert workspace immutability, original path preservation and literal quotes. The V8 fixture is not a complete application, TS project check, Node integration or authenticated UI test.
- Independent GitHub diff confirms precisely two one-line source changes plus a 62-line regression test file; no schema, layout, storage or other production source changed.

## Release gates

- [GitHub Actions 43896996159](https://github.com/iAlirezaaa/nodus/actions/runs/43896996159) failed before any runner steps; this is not an application test assertion failure.
- Native full suite, TS 5.9.3 whole-project and production build: **NOT RUN**. Local GitHub DNS failed; no full checkout/locked dependencies.
- Test `http://127.0.0.1:4173/`: no Nodus server. Real desktop/390px FA/EN, keyboard/IME, focus/drag/pan/Undo/save+reload and screenshot: **NOT RUN**; screenshot **NONE**.
- Authenticated Site `appgprj_6af58606fb9c81918541f056a898c1a2` current HEAD/tree: **UNVERIFIED**; Sites skill list empty. No authorized deployment, publication ID or version. Two real accounts **NOT TESTED** (fixtures are not real accounts).

**Disposition:** ND-001 **In progress; publication Blocked**. Do not merge or publish on these limited checks. Restore full native CI/runtime and Sites access, independently review, compare actual GitHub/Sites trees and then safely release.
