# ND-024 — queued save acknowledgment when storage retires

Date: 2026-11-18. Status: **In progress / code checked in on feature branch; original Site release Blocked**.

## Reproduced defect

Source-exact isolated test of the prior `pages/index.html` `queueSave()` forced a delayed persistence resolution, then set `state.localConflict=true` (the event signal used when `onversionchange` retires the active IndexedDB connection) before the promise continuation. Previous code returned `true`, set `unsavedChanges=false`, updated the baseline, and displayed `Saved · local` despite the conflict. This is a *deterministic synthetic interleaving*, not a confirmed actual owner-data loss incident.

## Bounded correction and acceptance

In the optional static local-first Pages edition, the existing success continuation now rechecks `state.localConflict` **after persistence resolves**, throwing the normal `LocalImportConflictError` instead of incorrectly acknowledging a retired session. The existing catch leaves the draft dirty, does not replace the previous stored baseline or Undo, returns `false`, shows conflict and advises JSON export/reload. A second queued save cannot start another write after the conflict. Healthy saves still succeed; no graph/IME/keyboard/RTL/motion/schema/database-name change.

- Scoping: [0e57b955](https://github.com/iAlirezaaa/nodus/commit/0e57b955ecb354f55a83d1fb110214dbaee8733f).
- Source and four focused checked-in cases: [001f9d37](https://github.com/iAlirezaaa/nodus/commit/001f9d37abb51f6f4b9bc3d7ea348b0ad8830921), tree `f9e611cd3a275ae1dc12a7d621e7eafbf717ccd9`, source blob `c0710bb4095691f26b45ddb423d3d90317dae8a3`, tests `tests/pages-queued-save-retirement.test.mjs`.
- Red/green source-exact V8: OLD `true / dirty=false / baseline=new / Saved`, PATCHED `false / dirty=true / baseline=old / Save conflict`; ordinary patched save `true / dirty=false / baseline=new`. Actual inline script parses and computed CSP SHA-256 matches its embedded digest.
- [GitHub Actions run 44400340804](https://github.com/iAlirezaaa/nodus/actions/runs/44400340804): native job **SUCCESS**; job log reports **400 tests, 400 pass**, TypeScript and production build steps completed successfully. Chromium job **IN PROGRESS as of 21:27 UTC**; do not infer a pass until it finishes. Exact browser address is reserved `http://127.0.0.1:4173/`, unchanged. No newly reviewed screenshot yet; visual layout unchanged.
- Original Site `appgprj_6af58606fb9c81918541f056a898c1a2`: current HEAD/tree/audience and exact parity **UNVERIFIED** (native Sites skill unavailable); two actual authenticated users/permission revocation and independent integration review **NOT RUN**. Fixture tabs are not real owner accounts. Original GitHub main `26fafac0`, Site source, D1/R2 bindings, public audience, and owner data were **not changed**. GitHub metadata reports the repository **public**, contrary to intended private; settings unchanged.

**Deployment/version:** NONE. Do not promote branch into hosted Site without the blocked gates. Next reconcile the running browser job/screenshots, then verify authorized Site parity, genuine accounts and independent review; afterward ND-025 mobile Fit.

## Verified code/fixture CI follow-up — 2026-11-18 21:31 UTC

The second/current [Actions run **44401913634**](https://github.com/iAlirezaaa/nodus/actions/runs/44401913634), on exact documentation+code HEAD `fa7aa859be2e030228d151336afc498231584235`, **completed SUCCESS** for both jobs. Checked-in Node **400/400**, failures 0, TypeScript `tsc --noEmit` and production build PASS. Real Chromium smoke on exact `http://127.0.0.1:4173/` **19/19 scenario groups PASS**: FA/EN, 390px mobile, IndexedDB save/reload, two fixture tabs/versionchange and conflict, Enter/Tab/Escape, synthetic (not native physical) Persian composition, magnetic calm/off/reduced motion with zero graph writes, recovery safety. [Actual Chromium screenshot artifact #14472701827](https://github.com/iAlirezaaa/nodus/actions/runs/44401913634/artifacts/14472701827) uploaded successfully; individual images **not separately visually inspected this run** (no visible control changed). This smoke exercises existing flows; the new after-save microtask race is proven by exact-source native Node regression, not separately forced in browser. A preceding Actions run 44400340804 was cancelled by the newer documentation push before browser execution, and is **not** the CI pass claim.

These are **branch verification results**, not original authenticated Sites source parity or deployment. The original Site source tree/audience, two genuine authenticated accounts and independent integration review remain unverified/Blocked. Site/main/gh-pages/owner data unchanged; deployment/version NONE.
