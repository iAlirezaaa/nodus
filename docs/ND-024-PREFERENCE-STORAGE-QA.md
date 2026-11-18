# ND-024 — Blocked localStorage must not prevent the standalone app from loading

**Date:** 2026-11-18 UTC. **Status:** In progress / feature branch only; **not** a hosted Site release. Branch `fix/nd-024-startup-storage-recovery`, scope [d2d6028](https://github.com/iAlirezaaa/nodus/commit/d2d602845de85493c4ca7d5556c3a6496e80f99a).

## Problem and bounded implementation

The optional Pages/local-first client read `localStorage` language and theme preferences before the IndexedDB startup/recovery try/catch. A `SecurityError` on `getItem` could halt `init()` without rendering any graph or recovery controls, even with intact IndexedDB. A denied `setItem` aborted the language/theme button handler before re-rendering.

`pages/index.html` now routes only language/theme reads through `readPreference` and writes through `writePreference`, with try/catch fallback. Denied reads default to FA/dark; denied writes keep in-memory UI changes visible for the current session but those preferences necessarily return to defaults after reload. The existing design preference storage already guarded access. Crucially, graph persistence stays in IndexedDB, and preference switching creates no graph/Undo writes. Normal successful storage retains preference persistence. The script's CSP SHA-256 changed from `KQbpXdhYIe8hLnKKuVHvEK4NPaf44tRL5uUyuzpAdJo=` to `BqGGJ5iCYW0lESNbaftZ+8wje+dZIOAuzlpONCoXGwM=`, independently calculated from the full UTF-8 inline script before pushing.

**Change:** [3b10e81](https://github.com/iAlirezaaa/nodus/commit/3b10e81e621b6d6eadc3c01f08d207877f5bcd35) tree `9e39f8de225944e2ed186c10f33b09489e3d86ad`; isolated test-harness correction [87968cb](https://github.com/iAlirezaaa/nodus/commit/87968cb9866f62e97fc0c2d4c1879e79b57931ee). This does not change the original React Site, D1/R2, schema, authorization, user data or animation.

## Actual tests and evidence

- First [CI run #44269593423](https://github.com/iAlirezaaa/nodus/actions/runs/44269593423) had **331/334 checked-in Node tests**; 3 old VM-isolated startup harness cases lacked the new exact `readPreference` production function in their test context. This was a real test failure, not a source boot failure; harness fixed in `87968cb` without weakening assertions. TypeScript and production build **passed** in that run.
- The browser job in the same run was **successful**: **14/14 real Chromium/IndexedDB fixture scenario groups** on required `http://127.0.0.1:4173/`, using a new isolated browser profile that throws on both `localStorage.getItem` and `setItem`. The app booted, created a Persian thought saved in IndexedDB, toggled FA→EN and dark→light with zero preference-caused document writes or Undo changes, and reloaded the saved thought. Existing synthetic IME, Enter/Tab, two-tab conflicts, media/recovery, motion/reduced-motion and 390px cases also passed. Browser [artifact #14411024617](https://github.com/iAlirezaaa/nodus/actions/runs/44269593423/artifacts/14411024617) holds eight actual PNGs including `nd024-denied-preferences-mobile.png`. Downloaded ZIP and **visually inspected** that 390×844 PNG: English light-theme Thought details shows the persisted Persian title and no page-error screen. This is not a physical touch device.
- A second exact-head [CI run #44269841376](https://github.com/iAlirezaaa/nodus/actions/runs/44269841376) after the harness correction has **334/334 checked-in native Node tests, TypeScript `--noEmit` and production build PASS**. Its own Chromium job remains **running at this checkpoint**; do not claim its final browser outcome until the run completes. The production `pages/index.html` blob and browser test are unchanged between these two commits.

## Release gates and next action

Native Sites skill list was empty and Browser requires an originating browser context. Actual hosted Site source HEAD/tree, audience, distinct authenticated accounts and independent integration review remain **Blocked/UNVERIFIED**. Source Github `main` is `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. No merge, Site/Pages deployment, version ID or owner-data write. GitHub metadata reports repo visibility **public**, contrary to private target; access settings left unchanged.

**Next:** check the exact-head browser run, reconcile native Sites tree and audience, inspect genuine two-account permission cases and obtain independent review before guarded integration. Separately address ND-025 mobile Fit readability; do not treat an isolated Pages screenshot as hosted Site verification.
