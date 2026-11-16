# ND-001 — Direct navigation to deep search pages (branch-only QA)

**Run:** `nodus-auto-20261116T211254431Z-nd001` · 2026-11-16 UTC / 2026-11-17 Asia/Tehran  
**Branch:** `fix/nd-001-search-clarity`  
**Scope commit:** [cfc2165](https://github.com/iAlirezaaa/nodus/commit/cfc21658b366045b83977e941c5d0ca9ef9901c2)  
**Implementation:** [6fb571a](https://github.com/iAlirezaaa/nodus/commit/6fb571a064f04eade5ad96f36e46b33373f2af32); [IME guard review correction b24290c](https://github.com/iAlirezaaa/nodus/commit/b24290cbb1fe4571aee55b1f631126fb62b13c35) · source tree `d4c77563843ace29ca4df1777c1c78bd4e34fbce`.

## User problem and change

Existing Search (sidebar / Ctrl-Cmd+K) already counts all matches and pages them in groups of 70 while displaying full nested-project paths. Reaching page 43 previously required 42 Next actions. The Search dialog now provides a labelled direct page-number input between Previous and Next. The input is a 44px-high touch target, explicitly focusable, uses a numeric mobile keyboard, accepts ASCII, Persian (۰–۹) and Arabic-Indic (٠–٩) digits and clamps to the last actual page. The existing relevance ordering, stored nodes, connections, permissions, title editor and board navigation were not changed. Invalid or incomplete page strings restore the current displayed page.

The pure parser in `lib/search-pagination.ts` returns only a zero-based result-page offset, never writing document or browser storage. The dialog only changes component state (`searchOffset`, `searchPageInput`) and scroll position; Enter reuses the existing search-input IME/composition/modifier guard. The selected page input tracks search query resets and Previous/Next.

## Evidence from this run

| Check | Actual result |
| --- | --- |
| Four focused native Node 22.16 test groups on the exact committed GitHub helper/test blobs | **4/4 PASS** via `node --experimental-strip-types --test tests/search-pagination.test.ts` |
| Blob integrity for local test copies | Git object hashes matched `lib/search-pagination.ts` blob `d120491ed580d69fd1cf554b3e90c935a496915f` and test blob `5b61d273082123508e5edb9952a0b065f7e94f9a` |
| Isolated helper TypeScript | **PASS**, local TypeScript 5.8.3 `--strict --noEmit`; **not** project TypeScript 5.9.3 |
| Native full repository tests | **NOT RUN**; complete private checkout/dependencies unavailable |
| Repository TypeScript 5.9.3 and production build | **NOT RUN / BLOCKED**, not a release gate pass |
| Real 4173 FA/EN desktop + 390px browser, screenshot | **NOT RUN / NONE**; no 4173 listener, browser connector lacks originating extension context |
| Real IME / Enter / Tab / focus / Undo / save-reload / RTL-LTR / mobile taps | **NOT RUN**; helper and source review do not substitute for these browser checks |
| Two real accounts | **NOT TESTED**; no collaboration behavior changed |
| Authenticated Sites current source head/tree and audience | **UNVERIFIED**; Sites project read/publish capability unavailable; historical tree not accepted as fresh evidence |
| Site deployment/version | **NONE**; no merge to main, no publish or data migration |

**Status:** ND-001 **In progress** on `fix/nd-001-search-clarity`; independent browser/source-parity release gates **Blocked**. The input is implemented in branch source, **not active on the existing hosted Site**. No new screenshot exists; do not cite historical screenshots as verification.

**Next action:** Recover native full checkout with dependency install and port `127.0.0.1:4173` owned by Nodus; run full test suite, project TypeScript 5.9.3 and production build; test Search in real FA/EN desktop + 390px browsers including IME/Enter/Tab, Next/Previous, page input after query shrink, focus, save/reload and screenshot. Obtain current authenticated Sites source/tree/audience and compare content with GitHub main before independent review, guarded merge and deployment. Then begin ND-002 focus mode; do not prematurely mark Released.
