# ND-024 — IndexedDB readonly transaction completion gate

## Scope registered before source modification — 2026-11-18T12:14:44.655Z

- **Problem (reproduced by inspection):** `pages/index.html` `load()` resolves the snapshot from an individual IndexedDB `get()`/`getKey()` success callback, before the surrounding readonly transaction completes. A subsequent `abort` or `error` can arrive after the UI already accepts the snapshot, so the app can leave recovery mode with an unverified storage read.
- **Acceptance:** startup and retry only accept the snapshot after the readonly transaction completes successfully. A late abort/error (including after `get` or `getKey` success) must reject and keep local editing/autosave blocked; do not create a blank editable workspace, delete data, or alter owner IndexedDB. Successful present and genuinely absent keys remain distinct (including an existing undefined-valued key). No new keyboard, motion or schema behavior.
- **Slice:** change only local-first `pages/index.html` `load()`, update inline CSP SHA256, add source-exact Node test that covers success, missing, key-present-undefined, late abort/error and recovery; document CI and fixed-port browser result. This is an optional Pages branch, **not** the private authenticated Site.
- **Branch:** `fix/nd-024-startup-storage-recovery`, observed source HEAD `65b3f5638c82dedb23bf1c5203fdbab31f3ed8a5` tree `95005d34973d7e27cfa3be7826e6bd644bf68071`, main `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`, control owned by `nodus-auto-20261118T121131Z-nd024-integrity`.
- **Publication gates:** native full Node, TS, production build, 4173 Chromium, independent review and original Sites head/tree/audience plus two real accounts. Site skill list empty; hosted source/permissions unverified. Keep branch-only and mark blocked gates accurately.

## Actual implementation and verification

Pending.
