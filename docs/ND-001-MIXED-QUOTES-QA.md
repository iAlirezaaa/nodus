# ND-001 — mixed straight/curly single-quote boundaries (branch only)

Date: 2026-11-16. Branch: `fix/nd-001-search-clarity`. State: **In progress / release Blocked**. This is not a live Nodus feature.

## Reproduced problem and behavior

Mixed quotation styles from copied notes, e.g. `‘Forest' 'Lighting’`, `'Forest’ ‘Lighting'`, `‘فصل' 'دوم’` and `'مرحله’ ‘اول'`, were incorrectly accepted as one contiguous quoted search phrase. This could suppress ordinary matching rather than treating separate quoted fragments as ordinary input. It is a **read-only query interpretation issue**, not a persistence defect.

The parser now treats single quote punctuation of either type as an interior boundary **unless it sits between Unicode letters/numbers**; this preserves `don't`, `I’m`, `L'atelier`, balanced Persian/English phrases and internally double-quoted text. It does not rewrite query/source strings, stored records, result paging, graph positions, annotations, URLs, focus, IME/Enter/Tab, keyboard shortcuts, saves, permissions or collaboration.

## Exact code, evidence and limitations

- Before: exact old GitHub blob `d87b4305d23cd0189359cad8bd63f3933587c39d` checked locally by `git hash-object`. Native Node.js 22.16.0 focused suite: **8/12 pass, 4/12 fail**, with all four failures from mixed quote boundaries.
- After: `lib/search-phrase.ts` blob `f98cffc10d76c860cac756b58e293ed8e3122844` and checked-in `tests/search-phrase.test.ts` blob `d09d9721548f164aacccb9cec043fed1dcd493c1` independently confirmed by `git hash-object` against GitHub. Targeted Node.js 22.16.0 **12/12 pass**. **33/33 real Native Node.js** checked-in parser tests pass using `node --experimental-strip-types --test tests/search-phrase.test.ts` in a temporary isolated folder with only the exact two repository files.
- Limited `tsc 5.8.3 --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler lib/search-phrase.ts` **PASS**. Project-wide TypeScript 5.9.3 **NOT RUN**.
- Source/tests commit: [`e81088fae568dadf271acffd30adefc34e51bd6f`](https://github.com/iAlirezaaa/nodus/commit/e81088fae568dadf271acffd30adefc34e51bd6f), tree `5ed5e97768cb03a53190ec6bb539f185897c9edc`; main unchanged `26fafac05c320ed5db30a0ee908dd816714acdd9`.
- [Actions run 43918820591](https://github.com/iAlirezaaa/nodus/actions/runs/43918820591) failed before runner steps (`steps=null`, `logs_url=null`), not from an executed test. No evidence of full suite, project TypeScript or production build success.
- Native full `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, `npm run verify:release`, app build and independent integrated app review are **NOT RUN**: no authenticated full Nodus checkout/dependencies here; local `git ls-remote` cannot resolve github.com.
- `127.0.0.1:4173`: no listener; no Nodus preview was started. Real FA/EN desktop and 390px browser, IME, focus, undo, reload, saved data, screenshots: **NOT RUN**; screenshot **NONE**. No authenticated users, two-session collaboration or mobile hardware test is claimed.
- Sites source HEAD/tree, published version and GitHub/Sites parity **UNVERIFIED**: current Sites source tool/skill unavailable. **No main merge, Site save/publish, audience/data change, release or new deployment ID.**

## Next

Restore full source and dependency/runtime access or functioning GitHub Actions runner; run native full suite, project TypeScript 5.9.3 and build. Recover authorized Sites source and verify tree parity, then exercise real port-4173 browser FA/EN desktop and mobile with screenshots and a separate review before guarded integration/publication. ND-002 remains Ready until ND-001 is actually released.
