# ND-024 — import acknowledgment when IndexedDB retires during restore

Date: 2026-11-18. **Status: In progress on `fix/nd-024-startup-storage-recovery`; original hosted Site release Blocked.**

## Reproduced failure

The existing optional static Pages edition (NOT the D1-backed authenticated original Site) could acknowledge a backup import after its local IndexedDB handle retired. Source-exact V8 replay of the previously committed `restoreLocalDocument()` started a delayed local import, injected the same `localConflict=true` signal used by `onversionchange` after the transaction's persistence promise settled but before the success continuation, and observed **true**, replaced in-memory document and baseline, reset redo/dirty and displayed **Saved · local**. This is a deterministic synthetic race, not an observed production incident or test on owner data.

## Bounded correction

The importer now checks `localConflict` immediately after awaiting the queued autosave and **again after IndexedDB import/recovery persistence resolves**, before mutating the in-memory document, previous stored baseline, history or success label. A retired session returns false through the existing conflict/recovery catch and preserves document/Undo/Redo/dirty state; normal healthy import and corruption-recovery import still complete. Already committed IndexedDB transactions are not rolled back; stale success is not claimed and JSON export/reload remains the safe path. No new controls, schema changes, D1/R2 updates, keyboard/IME or animation changes.

- Pre-edit scoping: [6f1efca](https://github.com/iAlirezaaa/nodus/commit/6f1efca9556bfa1d25ed0009bd0b79df6be2f210).
- Code and six new checked-in tests: [d7da535](https://github.com/iAlirezaaa/nodus/commit/d7da535bcba35aa8d1be35d72dcb24277da4dcb1), tree `995461a93812e25b4c183bf75ce91a190dfc6a37`, source blob `cfac26aed5491fcf3ffc47cedf0402ae4735bb09`, test blob `31c324a9964a10caf7c968062c2988fc7ab94613`; tests `tests/pages-import-retirement.test.mjs`.
- Exact production inline script parses; regenerated CSP SHA-256 `6fq3b7uX6TXh0HdDmGnSpYpOcZOGtKghQ6y2FRc/e98=` compared against the embedded policy. Source-exact old replay returned `true`, `Saved · local` and switched document; patched replay returned `false`, kept prior document and dirty flag, and did not render a new document.
- [Native CI #44411601919](https://github.com/iAlirezaaa/nodus/actions/runs/44411601919): **406/406 Node tests, 0 failures** in the inspected job log; TypeScript `tsc --noEmit` PASS and production build PASS. Six tests are new in this run; prior 400 are historical baseline verified in the same current run.
- Chromium 4173 fixture: **PENDING at checkpoint; Chromium install in progress**. Do not call the new microtask interleaving a genuine two-account browser test. No newly completed current-run browser screenshots at this checkpoint; earlier screenshots are historical, not fresh verification.
- Native Sites skills exposed no Site source/head/tree/audience read. Original Site source and audience, authenticated two-user/revocation test, independent review and original Site screenshot **UNVERIFIED/BLOCKED**. GitHub reports repo visibility **public** despite declared private scope; settings unchanged.

**Deployment/version:** NONE; no `main` merge, original Site publication, `gh-pages` push or owner-data mutation. **Next:** reconcile current browser job and screenshots; inspect authorized original Sites head/tree/audience plus real-account gates, then review and consider guarded integration. ND-025 mobile Fit readability follows.
