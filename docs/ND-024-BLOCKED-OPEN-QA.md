# ND-024 — blocked IndexedDB opening fails closed (branch-only)

## Problem and bounded implementation

The optional **local-first Pages** edition used an IndexedDB open request without an `onblocked` handler. A different browser tab retaining a connection could prevent schema upgrade and leave the initial load pending indefinitely. This is not a new feature or an authenticated Site behavior.

Before editing source, the acceptance checks and branch were registered in [the development log](DEVELOPMENT_LOG.md) at scope commit [`446ff148`](https://github.com/iAlirezaaa/nodus/commit/446ff148b975cd06150b324faf632a7e3c705557). Code change [`f823d327`](https://github.com/iAlirezaaa/nodus/commit/f823d327c87ae04af765ef23dc8e5f128132fbf7) modifies only `pages/index.html` `getDB()` and its inline CSP SHA-256. A blocked open rejects promptly; the existing startup catch opens **Safe data recovery**, leaving editing and autosave frozen. A late `onupgradeneeded` aborts instead of creating a new workspace, and a late success closes the handle without accepting the connection. Ordinary upgrade, synchronous denial and errors retain explicit handling.

The new source-exact Node tests live in `tests/pages-db-open-blocked.test.mjs`; extraction correction [`de84f25c`](https://github.com/iAlirezaaa/nodus/commit/de84f25ccaadb73c300535b3896360b8ac9cd7d9). The actual-browser fault-injected case and screenshot were added at [`c083d236`](https://github.com/iAlirezaaa/nodus/commit/c083d23635762ea5055b84fca61cfc87bc2860cf), tree `8185adee828e666babed6fe71bb14ef1c5a13472`.

## Actual verification

- [Exact source GitHub Actions #44324587436](https://github.com/iAlirezaaa/nodus/actions/runs/44324587436) **completed success** on `c083d236`: **377/377 checked-in native Node tests**, project TypeScript `tsc --noEmit` PASS, production build PASS.
- The same exact source completed **17/17 real Chromium Pages fixture scenario groups** on **`http://127.0.0.1:4173/`**. Additional 390×844 Persian-page scenario injects a blocked `indexedDB.open` event; asserts the recovery modal visible, reset disabled, no accepted nodes, no created store, late upgrade aborted and late connection closed. Existing tests cover save/reload, two fixture tabs, keyboard and synthetic composition, FA/EN, RTL/LTR, mobile, preferences and motion; these do not imply real authenticated account coverage.
- [Actual screenshot archive #14437091473](https://github.com/iAlirezaaa/nodus/actions/runs/44324587436/artifacts/14437091473), including `nd024-blocked-open-recovery-fa-mobile.png`. **Visually inspected in this run:** the 390px recovery modal is visible with disabled destructive controls and readable Persian instructions; the low-priority error detail remains English in the Persian interface. That localization limitation is not counted as resolved and belongs with existing ND-025 polish.
- Earlier [Actions #44304249280](https://github.com/iAlirezaaa/nodus/actions/runs/44304249280) reconciled the previous 7 test timing failures: **372/372 native Node, TS/build and 16/16 Chromium groups PASS** on the preceding source. Do not confuse these historical counts with the **377/377 / 17/17** of this code change.
- Four independent exact-handler V8 scenarios were also run before the source push; these are not counted as native checked-in tests.

## Publication gate

**ND-024 In progress, branch-only; release Blocked.** The original authenticated Sites source **HEAD/tree**, audience and deployed version cannot be inspected with the available Sites skills, which returned no authorized Sites skill. True two-account auth/collaboration, revocation, independent code review and original Site browser checks remain **UNVERIFIED**. The only browser evidence is from a separate Pages fixture and synthetic blocked-open event. No new Site version or deployment ID, no `main` merge, no original Site or owner-data write. GitHub reports **public** visibility, at odds with the intended private repository; this run did not change settings.

**Next:** obtain authorized native Sites read/audience + actual source parity, review the pending ND-024 branch against current main, verify two authenticated accounts before any guarded release. Then continue ND-025 mobile Fit readability/language controls without treating this safety fix as a new released feature.
