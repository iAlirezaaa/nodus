# ND-001 — skip unnecessary paths for direct title matches (2026-11-15)

## Scope committed before source edit

- Run: `nodus-20261115T161900Z-nd001-path-shortcircuit-12`; branch `fix/nd-001-search-clarity`, starting head `6ff625ee37f1c852a6c97f0f9ff35fbf54e8c025` / tree `2d226b5e9eadba677091846d6fde7b9702c80a3b`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`. Authenticated Sites tree **unverified**, no assumed sync.
- Problem: `rankNode` calls `pathFor(node.boardId)` before testing an exact/prefix/substring match against the thought's title. Even those high-priority title matches cause unnecessary project-path Map reads and text normalization on each search; deep pages can repeat the work.
- Acceptance: matching titles need no path reads, while lower-tier path searches and cross-field searches still rank/count/paginate identically, including Persian text, missing paths, and >70 results. Read-only search; no data, keyboard, UI, storage, collaboration or movement changes. Reproduce the unnecessary reads before fix, add focused native Node regressions, confirm behavior and TypeScript to extent available.
- Slice: move `pathFor` evaluation to title-miss branch only; extend `tests/thought-search-lazy-paths.test.ts`. Leave incomplete source on feature branch.
- Publication: **Blocked** pending full original Node 24 suite, project TypeScript 5.9.3, production build, actual 4173 FA/EN browser and screenshot, authenticated Sites HEAD/tree and independent review. Existing Site audience and owner data remain unchanged.

## Outcome

Pending implementation and verification.
