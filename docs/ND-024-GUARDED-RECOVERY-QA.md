# ND-024 — atomic, stale-safe recovery replacement (branch only)

**Run:** `nodus-auto-20261117T071214Z-nd024-gates`, 2026-11-17. **Status:** In progress / release gate **Blocked**, no deployment. Code commit [`21b71458`](https://github.com/iAlirezaaa/nodus/commit/21b71458eb8fc796d46c4e8ee0929c9de2f99691), code tree `79f975c110b4a710f49b78c24203a4125818bea5`, HTML blob `48a0467f2f2e2ffab6ce77aff2c7b9d84ecec103`; checked-in tests corrected in [`327e9d0`](https://github.com/iAlirezaaa/nodus/commit/327e9d0ddd980a31e1975fa81b853386b46c775f), tree `4e7eb73e4d19c00389ab6f8b62deb578958e8b1b`.

## Reproduced issue

The Pages-only safe-recovery dialog backed up a malformed IndexedDB record, but Import JSON and Start fresh subsequently called unguarded `persist()`. Another tab could change or remove `workspace/main` after the backup. The old exact `restoreLocalDocument` function was exercised with a changed synthetic record and still called its unconditional writer (one write). This is a mock, not a native two-tab browser test.

## Implemented

`persistRecoveryIfUnchanged(snapshot, originalRaw)` in `pages/index.html` opens a single **readwrite** transaction, reads `workspace/main`, compares its lossless JSON serialization with the exact raw value previously backed up, and only queues `put` if unchanged. Changed/missing/unreadable/unsupported data or failed put aborts/rejects. `restoreLocalDocument` now uses this transactional writer in recovery mode only; on uncertainty, it preserves the prior document, Undo, future and selection and revokes backup/reset permission until a fresh Retry. Successful same-record replacement waits for transaction completion before unlocking. Ordinary non-quarantined restore continues using the previous persistence path. Database name `nodus-pages-v1`, key, graph schema and hosted Site remain unchanged. The only affected control is the existing bilingual recovery modal (Import or Start fresh after raw backup); no new control is claimed.

## Actual verification

- **Pre-fix red:** source-exact old restore invoked an unconditional writer despite a changed backing record (1 mock write).
- **After fix:** 9/9 source-exact V8 checks passed, including same raw, changed raw, removed record, alternate-tab update before transaction read callback, read failure, rejected put, old behavior reproduction, regression-file presence and full inline JavaScript syntax. Changed/deleted/failure cases produced **zero** mock writes and retained in-memory document/Undo; same raw produced one write.
- **Focused guard verification before commit:** 6/6 direct V8 cases passed (identical, changed, missing, read failure, put failure, non-JSON Map). They do not prove real IndexedDB transaction behavior.
- **Checked-in native regression source:** three new `node:test` cases in `tests/pages-startup-recovery.test.mjs` (transaction scenarios, stale backup consent and normal restore) and one existing harness stub corrected. These checked-in tests **were NOT RUN** with Node because an authorized complete repository checkout is absent. Historical counts are not current tests.
- **CSP / parsing:** exact pre-edit script hash verified; modified inline JavaScript parsed successfully; new SHA-256 CSP digest matched `mm45wR4rOI09RvFv5vg2KocxnMnq/KySqLz5BacbgaM=` (CSP not broadened).
- **Environment:** Node v22.16.0 and system TypeScript 5.8.3 present; `git ls-remote` failed DNS resolution for github.com, so full source tests, project TypeScript 5.9.3 and production build **NOT RUN**. Port `127.0.0.1:4173` had no serving process; there was no genuine Nodus browser session, real IndexedDB reload, FA/EN/IME or mobile/desktop screenshot. Browser connector required an originating extension context; current Sites source head/tree and audience remain **UNVERIFIED**. No two real authenticated users were tested, and Pages local-first has no authenticated online collaboration.

## Release gate and next action

No `main`, `gh-pages`, hosted Site or owner data update; deployment/version **NONE**; screenshot **NONE**. Complete the checked-in Node tests/full suite, TypeScript and build in a complete authorized checkout, exercise true two-tab IndexedDB conflicts plus recovery/reload at **4173**, capture real screenshots if needed, independently review and reconcile Site source tree/audience before any guarded merge/publish. The GitHub metadata still reports repository visibility `public` contrary to the requested private scope; this setting was not changed.
