# ND-001 — malformed recovered text search safety (2026-11-16)

**Status:** In progress on `fix/nd-001-search-clarity`; **release Blocked**, no change to live Site, main or owner data.

## Problem and acceptance

Recovered/legacy records can have a number/object/boolean in a field normally typed as a string. The pre-change exact GitHub module `lib/thought-search.ts` blob `dd08dc08623e493d863e1a51436d1936d43f9b02` threw `TypeError: value.normalize is not a function` for a numeric, object or boolean input (3/3 reproduced in a V8 runtime after mechanically removing its one function type annotation). `search-result-preview.ts` called `.trim()` on malformed note text and `comparableSearchUrl` on malformed URL values; the nested board walker called `.trim()` on malformed board titles.

Acceptance for this bounded slice: invalid fields do not crash search/preview; valid sibling results and comments remain discoverable; 151 results remain 70/70/11 with accurate count and no duplicate; missing/invalid board titles use the existing localized untitled fallback; all recovered graph values remain unchanged. No persistence/schema/auth/keyboard/animation change.

## Implemented (read-only)

- `normalizeSearchText` ignores non-string comparison input instead of attempting `.normalize()`. Original storage is untouched.
- `searchThoughts` and `searchResultPreview` accept only string URLs before decoding; preview reads note text only when it is a string.
- `buildBoardPaths` uses `untitled` if an imported board title cannot be trimmed.
- Four targeted regression tests in `tests/thought-search-malformed-text.test.ts` cover 151 malformed recovered thoughts, valid sibling hits and URLs, nested path fallback, Persian/English previews and source immutability.

Functional code/test commit [954e2cf](https://github.com/iAlirezaaa/nodus/commit/954e2cf2c277aafac3738370a7665520199d9747), tree `adaa6dc0f8b6128ef9a6479ed6a2c45aff0ce06f`. Exact committed blob IDs: `thought-search.ts d2cffabab22a97621c5f98878941feb40ac6bde3`, `search-result-preview.ts 379e2f43e466b59750eac0258eff1becee48cc86`, `tests/thought-search-malformed-text.test.ts 58827e82864065fd3a8254a76f892824d2deec16`.

## Checks actually performed

- Exact committed source mechanically transformed from TS to runnable JavaScript in a V8 isolate, with non-target URL, quote-parser, annotation and excerpt-bounds dependencies substituted: **7/7 focused assertions passed**, including 151 items across 70/70/11, previewing a valid later comment, derived nested path fallback, unchanged source JSON, Persian/Arabic spelling and late result identity.
- The **four registered regression test cases** also executed after mechanical TS removal in that same isolated V8 harness: **4/4 passed**. This is not native Node.js test-runner coverage and uses stubs for non-target dependencies.
- The old exact normalizer threw for number, object and boolean; the patched normalizer returned `''` for malformed input without affecting valid `كيان` normalization.
- GitHub compare `a9d28e0..954e2cf` showed only two source files and the new test file changed.
- [GitHub Actions 43887779981](https://github.com/iAlirezaaa/nodus/actions/runs/43887779981) failed **before runner start** (`runner_id=0`, `steps=[]`). No Node repository tests, TypeScript 5.9.3 project check or production build executed.

**Not verified / release gates:** No authorized Nodus Sites project checkout/version/tree, no Site source comparison, no real Nodus preview at `http://127.0.0.1:4173/`, no desktop or 390px browser evidence or screenshot, no FA/EN IME/Undo/save/reload smoke test, and no two authenticated accounts. Screenshot: **NONE**. Deployment ID/version: **NONE**. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; Site current head/tree **UNVERIFIED** (baseline Site version 11 is historical only).

## Next

Recover complete source checkout + dependency runtime and supported authenticated Sites tooling without changing port 4173 or an existing preview. Run native full tests, `tsc --noEmit`, production build and real FA/EN browser/390px screenshots. Resolve errors, independently review, compare actual Site/GitHub trees, then perform a guarded merge and matching publish. ND-002 focus mode follows only after ND-001 gate recovery.
