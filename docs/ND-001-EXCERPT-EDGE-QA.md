# ND-001: overlong Unicode grapheme search excerpts

## Scope (before source edit; 2026-11-15 UTC)

- Branch: `fix/nd-001-search-clarity`; observed head `f6ba5eacbb0c04d0520abe7b9ceec9baf8ab2b21`, tree `38b6876c5248868cdf80500c3f7154e3b92d98be`. Stable main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current authenticated Site head/tree not available; historical Site version is not proof of synchronization.
- **User-visible problem, reproduced:** `searchExcerptBounds` snaps both ends of a 96-UTF-16-unit excerpt to the start of a >96-unit grapheme, resulting in an empty snippet even if a matching search word follows it. The existing code explicitly documents this limitation. The exact prior GitHub helper source in Node 22 fails the focused regression (1 passed, 1 failed).
- **Acceptance:** If a giant whole grapheme would give an empty preview, advance past that one grapheme to show following intact text when available. No partial graphemes with `Intl.Segmenter`, no unbounded excerpt, <=96 UTF-16 units for normal cases; older-browser fallback remains surrogate-safe. Keep search result count, 70-item paging, matching order, original workspace data, signed URL redaction, focus/Enter/Tab/IME, Undo, pan/drag, RTL/LTR, collaboration and persistence unchanged.
- **This slice:** One pure excerpt-boundary repair, native Node behavior regression and result-preview integration regression; helper TypeScript. Keep on feature branch pending independent review, full suite/project TypeScript 5.9.3 and build, real FA/EN browser at 127.0.0.1:4173 (desktop + 390px, screenshot, keyboard/IME/save-reload/Undo), and authenticated Sites head/tree reconciliation.
- CI run 43652424743 finished failure without runner steps; no usable full test/build result. Local GitHub DNS and 4173 are unavailable. No Site deployment/version in this run, no audience/data change.

## Outcome

Pending. This section will be updated with exact source commit/tree and observed QA without conflating branch-only work with a release.
