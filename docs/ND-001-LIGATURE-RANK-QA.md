# ND-001 — Latin ligature and Persian phrase relevance QA

Date 2026-11-15T21:25:16.772Z; feature `fix/nd-001-search-clarity`. Scope-first [9b312fe](https://github.com/iAlirezaaa/nodus/commit/9b312fef83b1902ba31282b62947a30b2e3f0e48) and [5087c63](https://github.com/iAlirezaaa/nodus/commit/5087c63b8a9ddcb5797cc0a28c2920152095c90c); code/tests [9efc8ac](https://github.com/iAlirezaaa/nodus/commit/9efc8acc6493cf8c853a92a8423ec9861e368788), [041754b](https://github.com/iAlirezaaa/nodus/commit/041754bbd6fb7342692ae1ef6c5c53d2b57f1e24); tested source tree `6562e2475474e2706f9d28471b0228cdae14f06e`.

## Behavior and user control

Existing Ctrl/Cmd+K Search («فکرت را پیدا کن»); no new button. `lib/thought-search.ts` comparison-only normalizer equates Latin `œ/æ/ß` with `oe/ae/ss` (after lowercase), including `Cœur/coeur`, `Æther/aether`, and `Straße/strasse`; saved text, IDs, URLs, project paths and media remain unchanged. Exact-equivalent titles for quoted Persian phrases using spaces/ZWNJ/joined spelling now outrank longer prefixes; previously checked-in test received `prefix, exact, note` instead of `exact, prefix, note`. Plain and English search semantics remain. Existing 70-result page cap and total counts are preserved.

## Checks actually performed

- Original exact GitHub normalizer: five selected ligature equivalences **failed 5/5**; patched: **5/5 pass**. Five unrelated normalization invariants also pass.
- Original checked-in Persian spacing tests on exact prior GitHub source in isolated V8: **10/11 pass**, one real relevance regression. Patched: **11/11 pass**.
- Final exact GitHub `lib/thought-search.ts`, `lib/search-phrase.ts`, `lib/search-query-state.ts` and four exact checked-in test files were mechanically TS-syntax-erased and run in an isolated V8 environment: **27/27 passed** (6 new ligature, 5 existing soft-hyphen, 11 existing Persian phrase spacing, 5 new ranking). This covered title/note/file, reciprocal nested project path, quotes, strict field isolation, source immutability, and 151 results in 70/70/11 pages. URL/annotation helpers were stubbed but **not exercised**. These are **not native project Node tests or TypeScript compilation**.
- Native repository full test suite: **NOT RUN**. Project TypeScript **5.9.3**: **NOT RUN**. Production build: **NOT RUN**. Node 22.16.0 and global TS 5.8.3 were present locally, but no complete authorized private checkout; `github.com` DNS was unavailable. Previous [Actions 43757601417](https://github.com/iAlirezaaa/nodus/actions/runs/43757601417) failed with job steps=null before any tests.
- Port `127.0.0.1:4173`: **connection refused**. Browser connector: no originating browser context. Current Sites skill discovery: **empty**. **No real FA/EN desktop or 390px browser, screenshot, IME, Enter/Tab, Undo, save/reload or authenticated two-user evidence**. Screenshot **NONE**, Site current head/tree **UNVERIFIED**. Fixture/V8 tests are not real-account tests.

## Release gate

**ND-001 In progress; publication Blocked, branch-only.** GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` unchanged. Site ID `appgprj_6af58606fb9c81918541f056a898c1a2`, bindings D1 DB / R2 BUCKET retained; Site audience and owner data untouched. New deployment/version **NONE**; current Site tree unknown. Next recover complete authorized repo runtime, full Node tests/TS5.9.3/build, port-4173 real desktop/mobile screenshot/keyboard/save QA and authenticated Sites tree reconciliation, obtain independent review, then guarded main+Sites release; ND-002 after.
