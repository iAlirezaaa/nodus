# ND-001 — bounded search ranking memory: scope and QA

## Scope recorded before implementation

- Run: `nodus-20261115T141911Z-nd001-bounded-page-11` (2026-11-15 UTC); branch `fix/nd-001-search-clarity`, starting head `2e20f6705bb4ecd9fcc0ead9880dc7a125e55a71` / tree `445cb1f2f4be72a3a052cc41da88708ce74fe69f`. Stable main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Problem: `searchThoughts` counts all matches but retains `min(nodes.length, offset + pageSize)` **per ranking tier**. Deep and stale offsets can keep thousands of node references, despite only 70 visible results.
- Acceptance: true total; complete tier and document-order stability; 0/70/71/151 and deep multi-tier pages; clamping stale offsets after result shrink; arbitrary positive limit and zero cap; quoted Persian and full nested paths; source graph unchanged. Bounded retained node references must be proportional to the visible page, never the requested offset or total match count.
- Slice: pure `lib/thought-search.ts` classification/paging plus `tests/thought-search-workload.test.ts` regression. No UI, persistence, schema, shared state, shortcuts, motion, new services, or public release.
- Gate: full native repo tests, TypeScript 5.9.3, production build, actual 4173 browser screenshots, and authenticated Sites head/tree are **not yet verified**. Branch only; publication Blocked until all checks pass. Two real authenticated accounts are not claimed.

## Execution evidence

Pending implementation and independent comparison; append rather than retrospectively claiming checks.
