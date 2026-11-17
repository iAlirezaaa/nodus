# ND-024 — fail closed when IndexedDB cannot be read (branch only)

Run: `nodus-auto-20261117T0517Z-nd024-integrity`, 2026-11-17 05:20 UTC.

## Reproduced problem

The prior static edition's `init()` quarantined only named `CorruptWorkspaceError` exceptions. Ordinary IndexedDB connection/read failures displayed an editable blank document. If storage became writable later, the first edit could replace the previously unreadable data. Source-exact old V8 repro: both generic open/read errors left `storageRecovery === null`.

## Change

Every startup `load()` failure now opens the existing recovery lock. For unknown raw records, Download / Import / Reset stay disabled; safe Retry is focused, and FA/EN UI explicitly explains why raw export is not yet possible. For corrupt but captured data, raw backup continues to be offered. Valid startup remains editable. No IndexedDB write, migration, source-data mutation, schema, collaboration or authentication change.

## Verification for this run

- **Exact-source V8 red/green:** 2/2 old generic failure scenarios demonstrated missing lock; patched cases 4/4 passed (open error, read error, corrupt raw, normal load).
- **Exact-source lock gates:** 2/2 guarded mutation and queued save checks passed with read failure.
- **Exact-source UI mock:** 4/4 FA/EN × raw available/unavailable assertions passed; focus, disabled recovery actions and contextual hint inspected.
- **JavaScript compilation and CSP:** inline script compiled; original SHA-256 was recomputed and matched the checked-in CSP before modification. Updated CSP must match script (verified in follow-up committed-tree QA).
- **Checked-in regression:** three Node `node:test` cases added to `tests/pages-startup-recovery.test.mjs` for open/read failure, ordinary startup and FA/EN recovery hint. **Native checked-in suite not run** (no GitHub checkout; local GitHub DNS resolution fails). These are additional tests, not a claim of a fresh full-suite pass.
- **Blocked gates:** TypeScript 5.9.3, production build, real `http://127.0.0.1:4173/` browser with IndexedDB/reload, keyboard/IME, desktop/390px screenshots, real authentication and Sites tree/audience. Hosted Site status requires interactive authorization. No deployment ID or screenshot.

## Disposition

**In progress, branch only / release Blocked.** Main and hosted Site unchanged. Confirm complete source checkout, native tests, full project typecheck/build and real 4173 recovery/retry/browser before any independent release review.
