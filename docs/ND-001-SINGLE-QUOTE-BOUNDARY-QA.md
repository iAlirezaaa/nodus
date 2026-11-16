# ND-001 — ambiguous nested single-quote boundaries

Date: 2026-11-16. Branch: `fix/nd-001-search-clarity`. Status: **In progress / release Blocked** (branch only).

## Reproduced problem

The old exact parser interpreted `'Forest' 'Lighting'` as `Forest' 'Lighting` and `‘فصل’ ‘دوم’` as `فصل’ ‘دوم`. These are separately quoted fragments, not a balanced *single* phrase. Both incorrect matches reproduced on the exact baseline GitHub parser blob `9d48ee56ba476389ad5bfbaf90ea9d09b3551315`; 2/8 targeted old-parser expectations failed.

## Bounded change and acceptance

`lib/search-phrase.ts` now recognizes straight/curly single-quoted phrases only when internal matching apostrophes occur between letters or numbers; unescaped nested quotation punctuation is not silently merged. The parser still accepts `'don't stop'`, `'Director's cut'`, `‘I’m ready’`, blank balanced quotes, RTL wrappers, Word low-double quotes, ordinary double quotes and Persian guillemets. Regression checks are registered in `tests/search-phrase.test.ts`. Original saved strings, results paging, graph positions, Enter/Tab/IME handlers, persistence, permissions, collaboration and port 4173 were not modified.

Code commit: [`26f2fd19a325e29ba5931e3cd0174cf66f0b5adb`](https://github.com/iAlirezaaa/nodus/commit/26f2fd19a325e29ba5931e3cd0174cf66f0b5adb); tree `1161c25dc08583caac45512d6339450b1f618802`; source blob `d87b4305d23cd0189359cad8bd63f3933587c39d`; test blob `27b4e83b9a73555332f73b85f41869ff1f0dc1b5`. GitHub main observed `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.

## Actual verification

- **Red:** Old exact parser in V8 failed 2 new cases (`'Forest' 'Lighting'`, `‘فصل’ ‘دوم’`), while six existing behaviors passed.
- **Green, native Node:** Node.js **22.16.0** with experimental type stripping ran 26 focused independent cases: **26 passed, 0 failed**. The local source byte-for-byte matches GitHub blob `d87b4305d23cd0189359cad8bd63f3933587c39d` via `git hash-object`.
- **Checked-in test evaluation:** The exact GitHub `tests/search-phrase.test.ts` (including the two newly registered groups) was executed in an isolated V8 harness using a minimal `node:test`/assert shim: **31/31 passed**. These are **not** 31 Native Node project tests and must not be counted as full-project verification.
- **Limited TypeScript:** Global `tsc 5.8.3 --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck search-phrase.ts` passed, isolated from the project. Full TypeScript 5.9.3 was not run.
- **Port:** `ss` showed no listener on `127.0.0.1:4173`; no preview was started or moved. No screenshots were captured.

## Blocked gates and deployment

- No authenticated Nodus checkout/dependencies in this environment; local `git ls-remote` cannot resolve `github.com`. Full native `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, whole-project TypeScript 5.9.3, `npm run build` and independent app review were **NOT RUN**.
- GitHub Actions prior [run 43896996159](https://github.com/iAlirezaaa/nodus/actions/runs/43896996159) failed before runner steps; details returned an empty step list. This does not certify code failure or success.
- No authorized ChatGPT Sites source action or installed Sites skill was exposed. Site HEAD/tree, deployed version and GitHub/Sites tree equality **UNVERIFIED**. Real FA/EN desktop and 390px browser, focus/IME/Enter/Tab/Undo/reload and screenshot **NOT RUN**. No real signed-in account, two-session access test or real touch-device result is claimed.
- **No main merge, Site save/publish, data/audience change or new deployment/version.** Status stays `In progress` with release `Blocked`.

**Next:** Restore authorized native checkout/CI runner and Sites source access. Run complete tests/TS5.9.3/build and real 4173 browser checks; compare Site/GitHub trees and obtain independent review before guarded merge/publication. Continue ND-002 only after release gates are resolved.
