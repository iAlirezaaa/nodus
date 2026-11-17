# ND-024 — overlapping JSON backup import (unreleased)

## Pre-edit scope — 2026-11-17 22:13 UTC

Run: `nodus-auto-20261117T2210Z-nd024-native`. Branch: `fix/nd-024-startup-storage-recovery`, observed head `a42dd97ef87851c3d243edfd91b95837fb456107`, tree `03339c9d644d5dfc354d3b5ce3a57b1fbfc699f8`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Sites head/tree/audience unverified; no deployment.

**Problem:** Pages/local-first **Import JSON** awaits `file.text()` but does not invalidate older pending reads. Selecting A, then B, then B completing before A can prompt and restore obsolete A after newer B. This risks unintended workspace replacement.

**Acceptance:** each new selection—including later invalid or oversized selection—supersedes an earlier pending read; stale completion never prompts, persists, changes document, or adds Undo. Latest valid import retains 64 MiB cap, validation, explicit confirmation, local-recovery safety, FA/EN messages, and guarded IndexedDB transaction. No storage schema, keyboard/IME, graph, motion or Site change.

**Slice:** patch only the existing import handler in `pages/index.html`; add `tests/pages-import-overlap.test.mjs` with deferred `file.text()` and no-write checks; verify source-exact native Node cases, full script syntax and CSP. Before any release require checked-in native suite, TypeScript/build, real FA/EN 4173 desktop/390 px browser screenshot, two-tab IndexedDB/reload, independent review and Sites tree/audience parity. This run cannot claim those unavailable gates. **Status:** In progress / publication Blocked / screenshot NONE / deployment NONE.

## Post-edit evidence

Pending actual implementation and verification.
