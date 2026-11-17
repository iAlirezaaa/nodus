# ND-024 — overlapping JSON backup import (unreleased)

## Pre-edit scope — 2026-11-17 22:13 UTC

Run: `nodus-auto-20261117T2210Z-nd024-native`. Branch: `fix/nd-024-startup-storage-recovery`, observed head `a42dd97ef87851c3d243edfd91b95837fb456107`, tree `03339c9d644d5dfc354d3b5ce3a57b1fbfc699f8`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Sites head/tree/audience unverified; no deployment.

**Problem:** Pages/local-first **Import JSON** awaits `file.text()` but does not invalidate older pending reads. Selecting A, then B, then B completing before A can prompt and restore obsolete A after newer B. This risks unintended workspace replacement.

**Acceptance:** each new selection—including later invalid or oversized selection—supersedes an earlier pending read; stale completion never prompts, persists, changes document, or adds Undo. Latest valid import retains 64 MiB cap, validation, explicit confirmation, local-recovery safety, FA/EN messages, and guarded IndexedDB transaction. No storage schema, keyboard/IME, graph, motion or Site change.

**Slice:** patch only the existing import handler in `pages/index.html`; add `tests/pages-import-overlap.test.mjs` with deferred `file.text()` and no-write checks; verify source-exact native Node cases, full script syntax and CSP. Before any release require checked-in native suite, TypeScript/build, real FA/EN 4173 desktop/390 px browser screenshot, two-tab IndexedDB/reload, independent review and Sites tree/audience parity. This run cannot claim those unavailable gates. **Status:** In progress / publication Blocked / screenshot NONE / deployment NONE.

## Post-edit evidence — 2026-11-17 22:19 UTC

**Implemented on branch only:** [scope](https://github.com/iAlirezaaa/nodus/commit/1b30d2b76064ded50327961043a92e83c0dd28e8) · [source and tests](https://github.com/iAlirezaaa/nodus/commit/84710cc00f009adda7dd7904c956f277ede385da) (tree `428c1c8363899d7a995cf61033f042924052f4e0`, `pages/index.html` blob `4d3a7283a02215dbf1091ef83a60a64b99122d65`, `tests/pages-import-overlap.test.mjs` blob `fa5144662bbd53c511025c5b8e61aee0f72d1413`). Existing optional static Pages **Import JSON** handler now sets an ephemeral Symbol token on every file-selection event, including empty, unsupported and oversized selections; after awaiting `file.text()`, an obsolete request exits before validation/confirmation or `restoreLocalDocument`. The error path suppresses stale rejection toasts as well. This transient token is not saved or transmitted, and no new control/persistent field was added. The existing 64 MiB cap, raw-recovery export prerequisite, explicit replacement confirmation and IndexedDB compare-and-write guard are unchanged.

**Reproduced before fix:** Exact previous GitHub 768-character handler imported B and then incorrectly prompted/imported stale A when A's `file.text()` finished last. Oversize or malformed later selection also allowed stale A to import. After fix, an outdated pending read produces zero confirmation, restores, graph writes, save/Undo effects or error toasts. An already-started durable restore is a separate in-progress transaction; this slice does **not** claim preemption/cancellation after `restoreLocalDocument` has begun.

**Actual verification:**

| Gate | Result |
| --- | --- |
| Native Node 22.16.0 isolated handler harness, exact GitHub text fingerprint `length=976, FNV1a32=dd0a9e91` | **6/6 PASS**, latest choice, malformed or oversized later choice, stale rejection, ordinary import and text fingerprint. This is an extracted-handler harness, **not** the checked-in native test runner. |
| Seven checked-in regression test bodies fetched from the actual source/test blobs | **7/7 PASS in isolated V8 with Node test/assert/crypto facades**, including six behavioral cases and full-script parse. The CSP mock in this facade is not an independent cryptographic check; see next line. |
| Whole HTML inline JavaScript | **PASS** V8 parse of exact newly committed source (66,850 script characters). |
| CSP | **PASS** fresh pure-JS SHA-256 computation on the full inline script (baseline digest first matched); new digest `sha256-cnqa0EbjtdF0kceFWoOsLzbh1s3TP7WifmNXYVdlNcY=` written to CSP and reread from exact source blob. No relaxation. |
| Complete checked-in native suite and project TypeScript/build | **NOT RUN / Blocked**: git clone DNS failure; no authorized complete checkout. Node 22 and global `tsc 5.8.3` exist but are not the checked-in project and do not satisfy this gate. |
| Real `http://127.0.0.1:4173/`, FA/EN desktop/390 px, screenshot, real import/reload/IndexedDB two tabs | **NOT RUN / Blocked**: no server listening on the required port; Browser connector requires originating browser context. **Screenshot NONE**. No fixture proves production authentication or two real accounts. |
| Site source head/tree/audience, independent review, publish | **UNVERIFIED / NOT RUN**: current Sites skill/action unavailable; no merge/deployment/version. |

**State:** ND-024 **In progress** on `fix/nd-024-startup-storage-recovery`; release gate **Blocked**, **not Verified/Released**. Current GitHub `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Live Site `https://nodus-hades.ialirezaaa.chatgpt.site/` and existing audience/owner data unchanged; current Site tree unknown, **not synchronized**. Branch code is not a live feature. GitHub repository currently reports **public**; visibility not changed.

**Next:** authorized complete checkout → run checked-in native tests, project TypeScript/build → real 4173 FA/EN mobile/desktop import A/B and two-tab IndexedDB reload with screenshots → independent review and fresh main/Site tree reconciliation → guarded merge and deployment only after all gates pass. Consider a separately scoped follow-up if a newer selection during an *already-started* restore must also win.
