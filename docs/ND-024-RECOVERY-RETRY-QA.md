# ND-024 — non-destructive retry of IndexedDB quarantine (branch only)

Run: nodus-auto-20261117T0411Z-nd024-verification; 2026-11-17 04:13 UTC.

## Problem and slice

The existing startup recovery alert correctly blocks writes for corrupt records, but on unavailable JSON backup (including a *present* `undefined` IndexedDB value) its only action was disabled, the disabled Download button received focus and Tab could fall out of the dialog. An external repair or transient read failure required closing/reloading the page with no in-dialog safe re-check.

A **Retry reading stored data / تلاش دوباره برای خواندن** button now remains available in the quarantined dialog. It only calls the existing IndexedDB `load()` reader. Successful validation restores the read document/board and clears stale session Undo; failure retains quarantine without changing the document or the stored record, and invalidates prior download consent if the record might have changed. Pending retries are serialized; on a non-exportable raw record the retry button—not a disabled download button—receives keyboard focus. No migration, DB write, reset, API/auth or collaboration change.

## Current verification

- Current exact inline JS compiled in V8, and source-exact retry logic passed **11 assertions** in an isolated V8 harness (valid read; no write; unlock + focus + reset history; invalid read remains locked; prior backup approval revoked; concurrent retry blocked).
- SHA-256 in Content Security Policy independently recalculated and matched before and after source change. Old hash: `lgcTAJAM9DG/EmyLV5DW2MP8TWjgnhI09THYo950yYc=`; new hash: `bq9zZ4n5WN1nT7pOMxteGAQB7H6df2sWtYWf+RfDIgc=`.
- Three new source-exact Node test cases were committed to `tests/pages-startup-recovery.test.mjs`; **native Node runner not executed**, because Git clone DNS failed on this runtime. Historical test totals were not reused.
- Full TypeScript, production build, actual IndexedDB/reload at **127.0.0.1:4173**, FA/EN/390 px browser, and real screenshots **NOT RUN**: no full checkout or authorized Site browser. Site source HEAD/tree/audience **UNVERIFIED**: connector requires interactive input. No new Site/GitHub Pages publication.

## Status

**In progress (branch only), not Verified or Released.** Main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` and authenticated Site were not changed. Continue by recovering a complete checkout, running Node tests + TypeScript + production build, checking IndexedDB retry and Tab/IME at the reserved 4173 address, capturing real desktop/mobile screenshots, and independently reviewing before guarded release.

### Independent static/accessibility source review (same run, 04:14 UTC)

Re-read the **committed** GitHub source and evaluated the actual `showRecovery()` function against a synthetic DOM: **6/6 assertions pass** — non-exportable raw record focuses the new retry button, exportable record focuses Download, retry remains enabled in either case, Import/Reset stay disabled until backup, Persian label is correct, and the new CSP marker is present. This is a source-exact **DOM mock**, not a real 4173 browser, not an authenticated session and not a genuine IndexedDB transaction.

Implementation commit: [`cafdbe423cbc`](https://github.com/iAlirezaaa/nodus/commit/cafdbe423cbcca8ac061cf8588ca1e75486aded4); source tree `c94f0889ebfb050497ebbd70f5975054de1b5d85`. No deployment, screenshot or publication ID. Source `main` and original hosted Site unchanged/unchecked respectively.
