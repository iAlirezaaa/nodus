# ND-001 — Russian Ё/Е equivalence in search (unreleased)

**Status:** In progress; release Blocked. **Date:** 2026-11-16, scoped by [22f9734](https://github.com/iAlirezaaa/nodus/commit/22f973448e747d9bbe8a9847739953e0c0c04398) before editing. **Feature branch:** `fix/nd-001-search-clarity`.

## Problem and correction

Typing ordinary Russian `Ерема` did not find the saved title `Ёрема`; similarly `елка` missed `ёлка`, even though Russian users often omit the dots in search queries. Exact old source blob `b3197c0fc9797f884c2d2c3fe27a09b2d33364c4` demonstrates the misses.

`normalizeSearchText` in `lib/thought-search.ts` now folds Cyrillic `ё` into `е` *after* locale-independent lowercasing for read-only search comparison. It leaves other Cyrillic letters distinct (`Йога` remains different from `Иога`), and leaves source titles, file metadata, notes, annotations, identities and storage untouched. The existing Search dialog is the control. Matching should work for titles, file names, notes, nested project paths and comment/quote text, including balanced quoted phrases. This adds no UI control, data migration, network endpoint or animation.

Code [e1b9b63](https://github.com/iAlirezaaa/nodus/commit/e1b9b63923c91ab7fe6b5928e63f962b51726a92), source tree `e9cf7ab565e316ed2fbc969b8308af9f9fef2aca`; typed annotation fixture correction [cc5b210](https://github.com/iAlirezaaa/nodus/commit/cc5b210434cdc869127655d0b9f3b8bef5f4d026), final code/test tree `fc9b6aa0c38d1ca9f115ef81bba7b2f8c97cb6d4`, code blob `dd08dc08623e493d863e1a51436d1936d43f9b02`, tests blob `0ce00710b6c695e2d105e5302622c486b161f2db`.

## Checks and their boundaries

- **Source-level V8:** Original exact GitHub module vs revised exact GitHub module, mechanically stripped of TypeScript; direct annotation field callback and URL/comparison non-target dependencies were stubbed. **9/12 assertions RED on old source, 12/12 GREEN on patched source**, including titles, notes, attachment names, nested reciprocal project paths, annotations, balanced quoted phrases, rank tiers, 151 matches paged 70/70/11, unrelated Cyrillic letter distinctions and no graph mutation. This is **not** a full native application test.
- **Native isolated Node 22:** **6/6** normalization assertions passed from a manually extracted equivalent TypeScript function in a temporary local harness; **TypeScript 5.8.3 strict check passed for that isolated excerpt**. It is not the checked-in full module TypeScript project.
- **Regression source:** Five `node:test` cases registered in `tests/thought-search-russian-yo.test.ts`; these newly committed cases were **NOT executed natively** because the project checkout and dependencies remain unavailable.
- **CI:** [GitHub Actions run 43809153251](https://github.com/iAlirezaaa/nodus/actions/runs/43809153251) concluded failure **before runner steps** (`steps=null`). This is not a test failure or test success.
- **NOT RUN / UNVERIFIED:** Full native repository test count, TypeScript 5.9.3 project check, production build, actual FA/EN desktop and 390px UI, IME/Enter/Tab/Undo/save/reload, 4173 browser (connection refused), screenshot (NONE), authenticated Site HEAD/tree comparison, two real user sessions, independent review, deployment/version (NONE).

The original local checkout was not assumed; fresh `git ls-remote` fails GitHub DNS. `skills__list` returns no Sites skill; Browser requires an originating browser context. Historical Site version 11 is not present-day source equivalence. Neither `main`, the Site, its audience nor owner data were modified.

**Next:** Recover authorized complete project runtime, run native suite + TS5.9.3 + build, verify FA/EN 4173 desktop and mobile screenshots and keyboard/IME/storage; compare live Site and GitHub trees, independent review and guarded release of ND-001. Only then ND-002 focus mode.
