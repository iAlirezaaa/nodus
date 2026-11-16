# ND-023 — Atomic document mutation guard (branch-only)
Run: nodus-auto-20261116T2314Z-nd023-parity · 2026-11-16 UTC · scoped BEFORE source edits in development log commit `083a374a728dda2d800fd17514f1aff2c47d129b`

## User-visible defect
In the independent static, local-first Pages edition, `mutate(fn)` directly modified canonical `state.doc`. If a handler changed a field then threw, its partial change remained in memory outside Undo/history and without a save. A later successful edit could accidentally store the damaged document. This is a **data-integrity** fix, not a new UI feature or a change to the authenticated Nodus Site.

## Exact code and source verification
- Existing source: `pages/index.html` blob `4ba369259c2b2830ad88e5ad697ba550134e77a8`; separately recovered local JS/CSS rebuilt byte-for-byte to that Git blob BEFORE editing.
- New code commit `8f6e61e2049b5238dfba84ff35ab086b5698f6d7`, tree `b9300699430ba04d6fd54fa166c7a0e45a069506`; artifact blob `898e4845a1d5c6a5a619aeb7481f9a785939f6e4`, native regression test blob `df5ff77e5909dcf2330bef9b2d687741d553b660`.
- `mutate` now clones the serialized document BEFORE invoking the handler. Only a successful changed draft replaces canonical state; history/queueSave/render execute once AFTER success. Failed or no-op edits do not stop magnetic preview or alter persistence. Existing JSON storage version and import/export format are unchanged.
- Rebuilt the self-contained HTML via the previously verified build script; SHA-256 CSP script digest is `Hl0df4+dcJxHAyFdW6xxWB/Xo93nJPKltCPPNCxPVNM=`. No CSP weakening, network access, secret, URL, port or storage schema change.

## Actual verification for this run
- **Before patch:** native Node 22 regression 1/3 passed, 2/3 **failed as expected**, proving partial data mutation and its accidental later save.
- **After patch:** same native Node 22 tests 3/3 pass, plus existing 15/15 local-first logic/parity tests = **18/18** (current run, not historic React 205).
- `node --check` of extracted static JS and graph logic passed; deterministic static bundle rebuild and CSP digest validation passed.
- Chromium browser rendered the actual rebuilt HTML at desktop 1365×900 and mobile 390×844 using **mocked IndexedDB/localStorage**, with **24/24** fixture UI checks, no page JS errors and no mobile horizontal overflow. Covered FA/EN labels, Enter/Tab, nested project, selection, task changes, Undo, magnetic preview without document writes, PDF, search and backup. Screenshots saved locally as `/mnt/data/nodus_nd023_atomic_run/parity_desktop.png` (SHA-256 `84083ed45b6a0f98f77667e1eb044379b1eae0b2c6a76d43e730a3229619f56b`) and `parity_mobile.png` (SHA-256 `26d327e7739c6b84b2381d7383b11a6426b1cb2d50f1e867710ee26a297d4c56`); these are **mock-storage fixtures, NOT real hosted URL screenshots**.
- Attempted fresh local Nodus test server on **127.0.0.1:4173**, then stopped only that temporary server; Chromium `page.goto` failed `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Real IndexedDB reload, IME hardware/mobile and production login remain **NOT VERIFIED**.
- Native original React full test suite, project TypeScript 5.9.3/typecheck and original production build **NOT RUN**: no dependency checkout from private/source GitHub DNS; static JS-only targeted checks are not a substitute. Sites source/tree/audience read returned a requirement for interactive input; Site synchronization is UNVERIFIED.

## Release gate and next action
**Branch-only / ND-023 In progress.** Do not update `gh-pages` or the original ChatGPT Site yet. Deployed Pages `gh-pages@099b9755292a00f4aecdee2c06d4c0007a886678` still serves original tested bundle `4ba369...`; the new `898e...` artifact is NOT live. Next: restore permitted real 4173/hosted browser and IndexedDB save/reload verification, read canonical Sites tree under an authorized non-interactive session, then independently review the tested version before guarded publication. Preserve private user data and the original Site's audience. GitHub repository visibility observed **public**, contrary to the owner instruction describing it as private; no change made.
