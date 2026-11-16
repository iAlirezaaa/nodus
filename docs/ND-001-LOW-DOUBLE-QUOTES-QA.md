# ND-001 — low-double quote phrase input QA

Scope recorded before editing application source. UTC: 2026-11-16T06:15:42.976Z.

## Problem / expected user effect
German-style low-double-quotation pairs copied from documents (`„…“` and `„…”`) do not parse as exact quoted phrases. The existing Search dialog can return zero hits for `„Ёрема сцена“` despite a matching title, or treat quote punctuation as literal unquoted terms. This is a search-input fidelity defect for multilingual project notes, not a new search control.

## Acceptance
- Parse both common low-double openings with their correct upper closing quote, including copied outer bidi/zero-width separators.
- Keep interior text and apostrophes exactly intact; empty balanced phrases remain explicit zero-match searches.
- Reject unbalanced/mismatched quotes and trailing content; do not concatenate matches across unrelated title/note/file fields.
- Preserve Russian Ё/Е comparisons, real total and 70/70/11 pages, nested path search and original stored data; no schema/persistence, UI shortcut, selection or collaboration change.
- Native focused parser regression and isolated TypeScript when available; attempt exact-source integration tests. Full repo tests, project TypeScript 5.9.3, build, real 4173 desktop/mobile and Sites head/tree are required release gates.

## Planned bounded slice
Continue `fix/nd-001-search-clarity` from `7ad985b1ac52ea65b8b44e17092a41bcda125850`, with main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Adjust only `lib/search-phrase.ts` and focused parser/search regression; then update this QA, `docs/ROADMAP.md` and `docs/DEVELOPMENT_LOG.md`. Site current head/tree: UNVERIFIED; no publish before gates. Screenshot: none yet. Deployment: none.
