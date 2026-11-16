# ND-001 — quoted-keyword search preview parity (branch only)

Date: 2026-11-16 UTC. Status: **In progress**; release **Blocked**. The deployed Site is unchanged.

## Problem / acceptance

The ND-001 search engine already removed token-boundary quotes from separate copied words, but the result-preview generator split the raw query and retained those quote marks. An actual matching thought might therefore display an unrelated opening note or no source label at all. For `‘Forest’ ‘Lighting’`, user-visible source must identify the matched note (including distant excerpts), combined title/note fields, matching comment or safe URL hostname. Balanced quoted phrases remain contiguous within a field. All canonical user data, result totals, 70-item page bounds and permissions remain unchanged.

## Delivered source

- Scoped first in [c5d5ee2645a4b22d84f80030b83c13065f2191b2](https://github.com/iAlirezaaa/nodus/commit/c5d5ee2645a4b22d84f80030b83c13065f2191b2).
- Code and 4 regression tests in [5f06fd1411f5c41d07774ed17bbc8a25b071c53c](https://github.com/iAlirezaaa/nodus/commit/5f06fd1411f5c41d07774ed17bbc8a25b071c53c), tree `1740fbac7312940f32136ff9311ab756b6752875`. Source blob `c62a4d3788e8e3e1b3696f050e2c234ece8ab161`, test blob `f2cd94a575d9ad14ce260600a26aacb3acf65c96`.
- `lib/search-result-preview.ts` reuses `searchKeywords(needle)` already used by `lib/thought-search.ts`. No new controls or graph/document writes. Relevant UI is the existing `Find your thought` dialog, opened via Ctrl/Cmd+K on the graph or the Search button.

## Checks actually performed

- 5 scenarios against original GitHub source mechanically stripped of TypeScript reproduced incorrect/absent provenance in **3** cases: cross-field match reported unrelated note; URL-only match had no explanation; comment-only match reported unrelated note. The note/whole-phrase cases already passed and stayed correct.
- On the newly committed GitHub blobs, **11/11 targeted V8 checks PASS**: deep-note excerpt, separate straight/curly quotes, cross-field source, comment source, host-only signed URL label, exact-phrase boundaries, direct-title priority, URL decoding, Persian project path and frozen input. Actual source functions were used after narrow mechanical TS erasure; URL host parsing was a test shim because the isolate does not provide the browser `URL` global. This is a focused behavioral check, **not** the full Native Node suite or a visual browser test.
- Four new assertions groups are checked into `tests/search-result-preview.test.ts`, but were **not run as native repository tests**. Project TypeScript 5.9.3, full Node suite and production build **NOT RUN** due no authenticated checkout/dependencies and GitHub DNS unavailable in local runtime. Isolated TypeScript was **not run** for this source change. Do not reuse the historical 205 tests as current results.
- [GitHub Actions 43939150751](https://github.com/iAlirezaaa/nodus/actions/runs/43939150751) for the exact code commit concluded failure before runner steps: `steps: null`, no logs. It supplies neither pass nor fail evidence about code behavior.
- Port `http://127.0.0.1:4173/` had no Nodus listener; no preview was started or commandeered. Real FA/EN desktop/390px browser, keyboard/IME/Undo/save/reload, screenshot, and two authenticated accounts: **NOT TESTED**; screenshot **NONE**.
- No authenticated Sites skill/tool available. Live Site project `appgprj_6af58606fb9c81918541f056a898c1a2` current head/tree/audience and content equivalence: **UNVERIFIED**. No Site save/deploy; version/deployment ID **NONE**. GitHub main remained `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.

## Next gate

Restore full project checkout/runtime or CI runners; run native tests, TypeScript 5.9.3, build and real 4173 desktop/mobile UI including screenshots. Read current Sites source tree with an authorized tool, preserve its audience/data, independently review and only then guarded merge/publish. ND-002 follows after ND-001 release.
