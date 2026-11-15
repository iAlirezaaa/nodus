# ND-001 — stop deep-page search rescans after all windows fill

## Before editing
- Scope recorded in development log at [b15afd5](https://github.com/iAlirezaaa/nodus/commit/b15afd50210f39e0749405af391b280f3893a134), controlled by lease `nodus-20261115T171900562Z-nd001-rescan-shortcircuit-11`.
- Main `26fafac05c320ed5db30a0ee908dd816714acdd9`; continue `fix/nd-001-search-clarity`. Current Sites HEAD/tree UNVERIFIED, no presumed sync.
- Problem: deep result pages rank every trailing node again even after filling requested windows; first pass already counted all hits.
- Acceptance: true result count, relevance and insertion order, 70-result pages, stale/deep offsets, Persian/English data, document immutability. No schema/UI/keyboard/permission/motion changes.

## Implemented, branch only
- [Code and tests a035f2d](https://github.com/iAlirezaaa/nodus/commit/a035f2d1bd5ef45c831668ce761c8a71589f8028), tree `257d63fe5092c1a247b5d8a68fd321dfac6dbb7c`; source blob `47883ffc49c023bf92068fbf339c0c564c4a3033`, test blob `54449449eae58129dcf4193bba1d4464732a3f12`.
- Second ranking pass decrements a local counter only upon collecting a requested result; stops at zero. First pass still counts every result; no extra graph objects retained. Existing workload read-count regression updated and one cross-tier total/order/read-count/non-mutation test added.

## Actual checks (not the full repository suite)
- Local Node.js 22.16 **isolated algorithm-level** harness: **3/3 pass**, including two fixed scenes and **600 deterministic random parity comparisons** against the previous loop. Prior 1,200 same-tier deep page: 2,400 classifier reads; revised: **2,180**. Two-tier 600-result page at offset 70: 1,200 reads → **740**; all 600 still counted and the same 70 IDs displayed.
- A synthetic harness generator initially produced a tier above the engine's 0–9 valid range; corrected and reran all tests successfully. No source-code failure was observed.
- Isolated TypeScript **5.8.3** strict probe for the edited loop passed. Exact committed GitHub file blobs were re-read and the intended source/test fragments confirmed. These checks do **not** constitute native execution of the entire checked-in test file, project TypeScript or the production build.
- Native full Node24 tests: NOT RUN; TypeScript project 5.9.3: NOT RUN; production build: NOT RUN. Historic 205 tests not counted.

## Release and next
- No listener on `http://127.0.0.1:4173/`; real FA/EN desktop and 390px screenshots: **NONE**. IME/Enter/Tab/focus, Undo, save/reload and two authenticated real users not verified. This slice is algorithm-only.
- Sites skill list was empty; connected browser rejected the read because the originating browser context was missing. Authenticated current Sites tree UNKNOWN. No Site changes, upload, version, deployment, audience changes or owner-data writes. GitHub main unchanged.
- ND-001 In progress, **publication Blocked**; not Verified/Released. Next: authorized complete checkout, full native tests/TS/build, real FA/EN browser at 4173, authenticated Sites tree reconciliation and independent review before guarded main/Sites merge-publish. ND-002 afterward.
