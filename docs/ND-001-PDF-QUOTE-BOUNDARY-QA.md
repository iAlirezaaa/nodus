# ND-001 — PDF soft-hyphen boundary around exact search phrases

**Run:** `nodus-auto-20261116T0119Z-nd001-gates-12` (2026-11-16 UTC). Existing branch `fix/nd-001-search-clarity`. Scoped BEFORE application edit in development log commit `d84dec046187d787d214b503bb985f473948c6aa`. Code/test commit [ae88e88](https://github.com/iAlirezaaa/nodus/commit/ae88e887ba62b5b418d1fb7698316a022c23f8f4), code tree `15b5adb2abf552cb90657d9a8de32be6f3984610`.

## User-visible problem and behavior

Copied PDF/web text can carry invisible SOFT HYPHEN U+00AD immediately outside balanced quotation marks. The existing search normalizer already ignores U+00AD **inside** ordinary search text, but `parseQuotedSearchPhrase` rejected `\u00AD"Forest Lighting"\u00AD` or `\u00AD«پروژه نور»\u00AD` as a quoted phrase. This false miss made an existing project/title hard to find. The parser now strips U+00AD only at the outer input boundaries before recognizing balanced Persian, straight and curly quotes. It retains original interior characters for subsequent search comparison, and unbalanced/mixed text remains non-phrase. No graph/SQL/R2 data, server endpoint, shortcut, animation, account or Site is modified.

## Verification — evidence, not a release claim

- Exact **old** GitHub parser blob `0ffbb736da256837c379f7ccc4def0693562ea62` was reconstructed locally and `git hash-object` confirmed the match. Native Node 22.16.0 with `--experimental-strip-types`: **1/4 passed, 3/4 failed** on four targeted boundary cases.
- Exact **new** parser blob `5dd16121596357d03449e0fc883b401f140f4dd8` and combined existing-plus-new test blob `056743f32306c34935a9810e4b3bd77d507e3e87` were verified by `git hash-object`. Native `node --experimental-strip-types --test tests/search-phrase.test.ts` equivalent path in isolated fixture: **26/26 passed** (22 existing + 4 new); the four standalone focused tests also passed 4/4. This is the actual parser module and tests, not a proxy implementation, but **not** the full Nodus project test suite.
- Standalone strict TypeScript `tsc 5.8.3 --strict --noEmit --target ES2022 --module ESNext --moduleResolution bundler` for the exact parser passed. It is **not** project TypeScript 5.9.3.
- One new end-to-end `searchThoughts` regression case was registered in `tests/thought-search-soft-hyphen.test.ts` (blob `50284247e7eed17cd09f648fd806b43eca1270f1`) for English/Persian quoted phrases, cross-field isolation, and source immutability. **It was not executed natively** because the full authenticated checkout and loader were unavailable.
- Local `git ls-remote` failed DNS resolution of github.com; no full private checkout. Node 22.16.0, not target Node 24, is available. Full native tests, TypeScript 5.9.3, production build: **NOT RUN**. Port `http://127.0.0.1:4173/` refused connections. Real FA/EN desktop, 390px mobile, IME/Enter/Tab, focus/selection, Undo, save/reload and screenshots: **NOT RUN / screenshot NONE**. No two authenticated real-account sessions were used.
- Current Sites HEAD/tree remains **UNVERIFIED** (no current Sites skill; connected Browser requires an originating context). Historical Site versions do not establish current equivalence; no deployment/version ID was created. Current GitHub `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` unchanged.

**Status:** ND-001 `In progress`; publication `Blocked`; branch only, not Verified or Released.

**Next gate:** Recover authorized full checkout and run native Node24 project tests, TS 5.9.3 and production build. Test 4173 genuine FA/EN desktop and 390px browser + screenshot/keyboard/IME/Undo/reload, fetch current authenticated Sites HEAD/tree, reconcile changes, independently review before guarded merge and matching Site publication. ND-002 starts after release.
