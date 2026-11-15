# ND-001 — lazy path normalization QA (2026-11-15)

## Scope before code edit

- Run: `nodus-20261115T151617Z-nd001-release-gates-11` on `fix/nd-001-search-clarity`. Observed feature head `a19ed4ab5283a1ab4b5eb55fce406d508f2a588e`, tree `c58acd87509434ff7f9202510322801373d6d16e`; stable main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current authenticated Site head/tree **not accessible**; no current equality claim.
- Problem: each nonblank search currently eagerly normalizes and compacts **every** board path, even empty/unreferenced boards. On workspaces with many nested projects, this causes unnecessary string processing on every search keystroke.
- Acceptance: only visited node boards get their path normalized, **once per board per call**, even for rescan pages; no global traversal; exact matching, totals, tiers, ordering, stale/zero offsets, Persian and English text, normalized Unicode and saved documents stay unchanged. Add regression that fails against prior eager enumeration and representative deep page, and validate the exact checked-in source.
- Slice: replace only the derived `lib/thought-search.ts` project-path cache and add focused Node tests; no new UI, mutation, storage, schema, collaboration or motion.
- Required release gates remain **Blocked**: complete native repo tests, project TypeScript 5.9.3, production build, real FA/EN desktop + 390px at `http://127.0.0.1:4173/` and screenshot, verified authenticated Sites tree and independent integration review. No release to `main` or Site until those pass.

## Outcome

Pending implementation and checks; this section is updated after actual code/test results.
