# ND-024 — restore large local JSON backups safely

## Pre-edit scope (2026-11-17T19:14:54.626Z)
- **Problem:** UI permits 5 MiB media attachments but rejects a 20+ MiB backup containing three such files because JSON import is capped at 15 MiB.
- **Acceptance:** Import accepts backed-up files through **64 MiB**, refuses larger files **before** reading, keeps parse/validation/confirmation/transaction conflict gates; maintains FA/EN warning and no change to other workflows.
- **Bounded branch:** `fix/nd-024-startup-storage-recovery`, base `aab929f23fb9a3a30b68c4b063ac7c8562f86aaf`, tree `3038dbd809ea54317e068d1bb14aed9ed2f47a0a`.
- **Verification before implementation:** Not run. Browser screenshot NONE; Site HEAD/tree/audience UNVERIFIED; deployment NONE.
