# ND-001 — low-double quote phrase input QA

Scope recorded before editing application source. UTC: 2026-11-16T06:15:42.976Z.

## Problem / expected user effect
German-style low-double-quotation pairs copied from documents (`„…“` and `„…”`) do not parse as exact quoted phrases. The existing Search dialog can return zero hits for `„Ёрема сцена“` despite a matching title, or treat quote punctuation as literal unquoted terms. This is a search-input fidelity defect for multilingual project notes, not a new search control.

## Acceptance
- Parse both common low-double openings with their correct upper closing quote, including copied outer bidi/zero-width separators.
- Keep interior text and apostrophes exactly intact; empty balanced phrases remain explicit zero-match searches.
- Reject unbalanced/mismatched quotes and trailing content; do not concatenate matches across unrelated title/note/file fields.
- Preserve Russian Ё/Е comparisons, real total and 70/70/11 pages, nested path search and original stored data; no schema/persistence, UI shortcut, selection or collaboration change.
- Native focused parser regression and isolated TypeScript when available; attempt exact-source integration tests. Full repo tests, project TypeScript 5.9.3, build, real 4173 desktop/mobile and Sites head/tree are required release gates.

## Planned bounded slice
Continue `fix/nd-001-search-clarity` from `7ad985b1ac52ea65b8b44e17092a41bcda125850`, with main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Adjust only `lib/search-phrase.ts` and focused parser/search regression; then update this QA, `docs/ROADMAP.md` and `docs/DEVELOPMENT_LOG.md`. Site current head/tree: UNVERIFIED; no publish before gates. Screenshot: none yet. Deployment: none.

## Outcome — 2026-11-16T06:18:13.108Z

- **Code + tests:** [81b3544](https://github.com/iAlirezaaa/nodus/commit/81b35443d7aad6123f483125eb596f049d719624), code tree `0ef76a9b9ecc0e91487fde680e0e9f24c5873602`, parser blob `9d48ee56ba476389ad5bfbaf90ea9d09b3551315`. Adds the bounded `„…“` / `„…”` parser alternative and 3 parser plus 2 search-engine test cases. No new control: existing Search dialog, when/if released.
- **Red/green:** isolated local copy of exact previous GitHub parser blob `5dd16121596357d03449e0fc883b401f140f4dd8` failed **4/5** new native Node22.16 parser scenarios (1/5 passed); exact updated blob `9d48ee56ba476389ad5bfbaf90ea9d09b3551315` passed **5/5** native Node22.16 `--experimental-strip-types` cases. Both local parser copies independently matched GitHub `git hash-object` before/after. Isolated parser TypeScript 5.8.3 strict `--noEmit` **PASS**. These five scenarios exercise quote pair recognition, bidi-wrapped Persian content, malformed/unbalanced rejection, and explicitly empty phrase.
- **Registered but NOT executed natively:** 3 new assertions/groups in `tests/search-phrase.test.ts` and 2 integration test groups in `tests/thought-search-phrases.test.ts`, including 151 hits paged as 70/70/11, rank ordering, field boundaries, stable data. Local focused 5/5 is **not** the complete repository suite or the checked-in test file as a whole.
- **Blocked release checks:** no local Nodus checkout/dependencies; GitHub DNS unavailable in isolated container, Node 22 rather than project build Node 24, complete native repository tests / project TS5.9.3 / production build **NOT RUN**. Port `127.0.0.1:4173` refused; real FA/EN desktop and 390px browser, IME/Enter/Tab/Undo/save/reload and screenshot **NOT RUN**. Authenticated Sites skill/tools not available; current Site HEAD/tree **UNVERIFIED**, historical Site v11 not proof. No two real signed-in account checks; no collaboration model changed. Screenshot **NONE**, deployment/version **NONE**.
- **Disposition:** ND-001 remains **In progress; release Blocked**, **branch only**. `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`); live Site, audience, owner data and port unchanged. Next: recover native project runtime, run complete tests/tsc/build, real 4173 browser/screenshots and Sites HEAD/tree diff, independent review, guarded merge and publish before ND-002.
