# ND-001 — Search match context legibility on narrow screens (branch only)

**Run:** `nodus-auto-20261116T0419Z-nd001-native-verify-11` on 2026-11-16. **Branch:** `fix/nd-001-search-clarity`. **Source:** [5f0665a](https://github.com/iAlirezaaa/nodus/commit/5f0665a81bf75a9dc5729274dcc1c307bea0918c), tree `ed1c0d3a823b8ab64624042ff0e41173618cae15`, CSS blob `8d6a3f24f7b78c76b57a0ca2242644ad2ab58784`. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`).

## User-visible problem and implementation

The Search dialog already displayed full nested project paths but applied `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` to the contextual matching excerpt. At 390px this can conceal the matched note/file/comment/location text explaining *why* a result was found. In the existing `@media (max-width: 650px)` block of `app/globals.css`, `.search-results > button .search-result-context` now overrides to `white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere`. Desktop layout, title/path wrapping, actual search/paging/selection, data and persistence were not changed; no new control.

## Actual checks and blocked verification

- Compared exact prior CSS blob `bad9537d5813ea1dca2bc18bf46006b532f2a759` with exact newly committed CSS blob `8d6a3f24f7b78c76b57a0ca2242644ad2ab58784`: **7/7 source-level deterministic checks passed** (balanced braces before/after, old single-line truncation, mobile multi-line rule, unchanged desktop rule, CSS-only/no graph source modification, exact committed blob). This is **not** browser layout validation, CSS engine rendering, or a screenshot.
- [Actions 43803803719](https://github.com/iAlirezaaa/nodus/actions/runs/43803803719) for source `5f0665a` failed **before runner steps** (`steps=null`; no observed test execution). This does not indicate a TypeScript/build/test pass or a code failure.
- Full native Node project suite, TypeScript 5.9.3 and production build: **NOT RUN**. Private checkout unavailable due container GitHub DNS failure. Local `http://127.0.0.1:4173/` returned connection refused (rechecked 2026-11-16 04:26 UTC). Browser connector requires originating browser context. Real FA/EN desktop and 390px UI, IME/Enter/Tab, Undo/save/reload and screenshots: **NOT RUN; screenshot NONE**. Two real accounts: **NOT TESTED** (not applicable to the CSS-only change).
- Sites skill discovery returned no available Sites actions; authenticated current Site head/tree, saved version, deployment ID and GitHub equivalence are **UNVERIFIED**. No merge or publication; Site audience and owner data untouched by this run.

**State:** ND-001 `In progress`, visual/release gate `Blocked`; source improvement is committed on the feature branch only, **not Verified/Released**. Next: recover complete authorized checkout/Node24 and authenticated Sites, run native suite/TS/build and real 4173 FA/EN desktop/390px screenshots with keyboard/save, independently review, reconcile Site tree, then guarded merge/deploy. Only afterward advance ND-002.
