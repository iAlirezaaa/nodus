# ND-001 — Typographic dashes in search (branch-only)

**Run:** `nodus-auto-20261116T0318Z-nd001-release-gates-12`. **Time:** 2026-11-16T03:26:06.896Z. **Branch:** `fix/nd-001-search-clarity`. **Source/test commit:** [3cfe623](https://github.com/iAlirezaaa/nodus/commit/3cfe623cfa45e31c67c208114111e31c0f8e0dd7), tree `e7d6948ab74377616a0e59326a51a03ad79f11cf`. **Main:** `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.

## User-visible fix

Word/PDF text frequently contains U+2010–U+2015 hyphens/dashes and U+2212 minus. The existing Search previously missed queries typed with a regular hyphen in titles, notes, attachment names, annotation comments and nested project paths. The shared read-only `normalizeSearchText` now compares these characters as a keyboard hyphen; original text and stored graph are never modified. The existing Search dialog and source labels are reused; no new UI control.

## Actual checks (do not equate with native suite)

- Exact GitHub baseline blob `1ad8dee30993c59a5f5fd1767f91f35bdc521682`: **0/6** normalization parity examples matched (three Unicode hyphens, two dashes, mathematical minus). Exact committed updated blob `b3197c0fc9797f884c2d2c3fe27a09b2d33364c4`: **6/6** parity examples matched, including Persian.
- Mechanically converted **actual committed** `lib/thought-search.ts` to executable JS inside an isolated V8 function, stubbing only non-target URL decoding and annotation-keyword helpers: **5/5 field-specific red→green** search scenarios (title/note/filename/comment/nested path). A real quoted phrase matched; non-dash arrow punctuation remained distinct. **151** mixed-page results preserved total and `70/70/11` windows with 151 unique IDs.
- Mechanically converted **actual committed** `lib/search-result-preview.ts` (blob `cb64fefabbdcea8de870c76c8b3326df7cd2ecea`) with simple non-target snippet-boundary, URL and annotation stubs: **5/5** derived source-kind explanations `title/note/file/comment/project` passed. These are targeted isolated comparisons, **not** real app/browser tests.
- **4 new native `node:test` cases registered** in `tests/thought-search-typographic-dashes.test.ts` (blob `555a194af64319825d65c258d356ebbee8a7fce3`); native execution **NOT RUN**.
- The full Node24 repository suite, project TypeScript 5.9.3 and production build: **NOT RUN**. Available Node v22.16.0, tsc v5.8.3; no private checkout because GitHub DNS fails. Port 127.0.0.1:4173: **connection refused**. Browser access requires originating context. Sites skill discovery: empty. Real FA/EN desktop/mobile 390px, keyboard IME/Enter/Tab, Undo/save/reload, screenshot and two authenticated users: **NOT RUN**. Screenshot: **NONE**.
- [GitHub Actions 43797962809](https://github.com/iAlirezaaa/nodus/actions/runs/43797962809) `failure`, job `steps=[]`, `runner_id=0` on `ubuntu-24.04`; this is **not** a passed build or a reported test failure. Authenticated Sites current head/tree, parity, deployment/version: **UNVERIFIED**. No merge, save or deployment.

**Status:** ND-001 `In progress`, publication gate `Blocked`, branch-only; not `Verified` or `Released`. GitHub main, hosted Site, audience and owner data unchanged. Next: obtain native source checkout + full tests/TS5.9.3/build, real 4173 FA/EN desktop/mobile screenshot and keyboard/save verification, authenticated Sites source/tree reconciliation, independent review, then guarded merge/deploy. ND-002 only afterward.
