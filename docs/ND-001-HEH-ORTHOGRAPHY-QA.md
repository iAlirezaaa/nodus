# ND-001 — final-heh keyboard spelling comparison QA

Scoped 2026-11-15T19:17:06.055Z on `fix/nd-001-search-clarity` from `032f9b96918373cd6f8a45a5cf4e10b01f694e21` (tree `da58bcfe1249cec36e7c5b33aa6b1cfcd0e21872`).

## Problem and acceptance

Persian titles, notes and nested paths using final `ه` may be pasted/search-typed with Arabic `ة` or Persian heh-with-yeh-above `ۀ`. Search should compare these variants both ways without rewriting graph content. Preserve title relevance, 70-item pages, quoted phrase behavior, URL and annotation matching. Validate with tests before recommending release.

## Verification status

**Source commit:** [`bf215f8f46eed176c1320f14e143c670fdf23575`](https://github.com/iAlirezaaa/nodus/commit/bf215f8f46eed176c1320f14e143c670fdf23575); tree `f32f43ce23435d46635024659cbb89accbaf1e5c`. Previous search blob `a4ea68fba55c59d676a0a41f587c59ba5993763e`; revised `41af4f3a0ce2ec9e55aa8d2229c8da8f3c3d63da`; new tests `87e7b156eaaf7c87e1d71e3a2fa179969711fc44` (`tests/thought-search-final-heh.test.ts`, **6 registered tests**).

- **Red/green:** 5/5 old-source final-heh equivalence cases failed; 5/5 passed with the revised exact normalizer. No migration or data rewrites.
- **Behavioral:** 19/19 direct checks passed in isolated V8 using the exact GitHub `searchThoughts`, `buildBoardPaths`, normalization, and actual quote/explicit-query modules with only unused URL and annotation helpers stubbed. Coverage: bidirectional spelling, notes, reciprocal nested paths, quoted phrases, 151 hits with 70/70/11 pages and original order, earlier Persian/Arabic digits, emoji ZWJ. This was **not** the registered Node test runner.
- **Limited native/toolchain:** Node.js 22.16.0 ran **5/5** assertions on a manually transcribed standalone normalization excerpt; strict TypeScript 5.8.3 checked that same excerpt successfully. The complete GitHub module and six checked-in tests were **not** executed in this local runtime.
- **Release gate:** [GitHub Actions 43751703476](https://github.com/iAlirezaaa/nodus/actions/runs/43751703476) failed before runner/steps (`logs_url:null`). Full native Node24 suite, TS5.9.3 project, production build **NOT RUN**. Port `127.0.0.1:4173` refused; FA/EN desktop/390px screenshot, IME/Enter/Tab/Undo/save/reload, two real accounts **NOT RUN**. Current authenticated Sites head/tree, existing audience and deployment/version **UNVERIFIED**; screenshot **NONE**, deployment **NONE**.

Status: **ND-001 In progress; publication Blocked; branch-only**. No `main` or Site source mutation, graph/storage changes, nor live release. Next: full project gates and real browser, compare Sites/GitHub tree, independent review, guarded merge and matching deploy before ND-002.
