# ND-024 — Search dialog Tab containment (2026-11-17)

## Pre-edit scope · In progress / release Blocked

Run: `nodus-auto-20261117T151621-nd024-qa`. Source branch: `fix/nd-024-startup-storage-recovery`, observed HEAD `c4af18b7915f8649de0d613186472bb55a75dd92`, tree `1318330ab49a60a613de2a4d56f1f4576441be3f`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current Site head/tree/audience: **UNVERIFIED** (Sites skill unavailable); Site and owner data are not to be modified.

**Problem:** Search has `aria-modal=true`, yet pressing Tab from its last result or from the input when no results exist escapes into background controls; Shift+Tab from Close can likewise leave the dialog. Background graph shortcuts may run while the dialog is visible if focus escapes. This is a keyboard/focus regression, independent of stored document data.

**Acceptance:** Tab and Shift+Tab wrap among the dialog's enabled controls, including dynamically rendered search results; a stray external focus is recovered; Escape restores prior focus, result selection maintains destination focus, input Enter/IME remains native. No graph writes or undo changes; source-exact old/new behavioral tests, JavaScript syntax, CSP integrity, native test attempt, TypeScript/build, real 4173 browser desktop/FA/EN/mobile screenshot remain individually recorded. Block release if latter gates unavailable.

**Slice:** Continue this branch, implement a bounded keyboard-only focus trap in `pages/index.html`, add source-exact regressions to `tests/pages-search-focus.test.mjs`. Update roadmap, log and QA; no main/Site publishing without full gates.

**Initial QA:** no tests yet this run. Screenshot: NONE. Deployment/version: NONE. Real authenticated user/two-account evidence: NONE.
