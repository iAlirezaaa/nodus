# ND-001 — Curly apostrophes in copied search text (branch-only QA)

**Run:** nodus-auto-20261116T0015Z-nd001-gates-11, 2026-11-16 UTC. Branch: `fix/nd-001-search-clarity`. Pre-edit scope commit `36dfe1e278d5d7a2a38c50fd35b5583d513bc5c0`; code and 4 new native-test cases `14a05cba33733754065d1d6306d760fb4eb9d092`; code tree `2bd2b48100fee72700c06a26dcba72e5fa811d35`. Source blob `a1c140d3f136f9ef0c1c0d02f7e4f67ba83ecd26`, test blob `d8e7c1453982e923e9f56015b7bc363232f51a0a`.

## Problem and bounded fix

`Director’s note` (U+2019) and `L‘artiste` (U+2018) copied from documents did not compare with the ordinary keyboard apostrophe. `normalizeSearchText` now folds just U+2018/U+2019 to U+0027 for **search comparisons**; original titles, notes, filenames, project paths, annotations and stored workspace data are not altered. There is no new UI control or migration. Existing Search dialog is the user entry point.

## Evidence (not native project verification)

- **Red/green:** Five direct original-normalizer equivalence scenarios returned false for curly-vs-keyboard apostrophes; the candidate normalizer returned true for all five before commit.
- **7/7 pass** on the exact committed `searchThoughts` source with mechanical TypeScript syntax removal in isolated V8: title, note, file, nested path, annotation, quoted query and a negative punctuation-boundary case. Unrelated URL and annotation-keyword helpers were stubbed; this is not a native full-module or browser test.
- Synthetic 151 title hits returned exact pages **70/70/11**, total 151 and matching IDs/order; original strings remained intact; emoji ZWJ was preserved. **Four** native `node:test` regression cases were committed in `tests/thought-search-apostrophes.test.ts` but were **not run natively**.
- GitHub Actions [run 43779847985](https://github.com/iAlirezaaa/nodus/actions/runs/43779847985) concluded **failure** with job steps unavailable. No tests, TypeScript or build can be claimed from CI.
- Complete repository Node tests, project TypeScript 5.9.3 and production build: **NOT RUN** (no full authorized private checkout; GitHub DNS unavailable locally). The available local TypeScript 5.8.3 does not substitute for the project gate.
- `http://127.0.0.1:4173/`: **connection refused**. Real FA/EN desktop and 390px UI, IME, Enter/Tab, focus, selection, Undo, save/reload and screenshots: **NOT RUN** (screenshot **NONE**). Two authenticated production accounts: **NOT RUN**.
- Current authenticated Sites source HEAD/tree unavailable: `skills__list` returned no Sites skill and Browser requires originating browser context. GitHub and Site trees **UNVERIFIED**; historical Site IDs are not equality evidence. Current production deployment/version **NONE**.

**Status:** ND-001 **In progress**, publication **Blocked**. Only feature branch changed. GitHub `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` unchanged; existing Site audience, data, D1/R2 bindings and deployment untouched.

**Next action:** recover authorized full checkout and native Node 24 tests, TypeScript 5.9.3, production build; real desktop/mobile browser at port 4173 with screenshots and keyboard/IME/Undo/save QA; fetch current Sites source tree, compare to GitHub, independently review and guarded merge/publish. Only then ND-002.
