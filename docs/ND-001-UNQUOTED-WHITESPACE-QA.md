# ND-001 — unquoted whitespace search relevance QA

Date: 2026-11-15T22:20:30.320Z. Branch: `fix/nd-001-search-clarity`. Scope-first commit `862f27d3cc3cec8bd948ab3fbfbe36c32f8f60f0`. Implementation: [`a1ebed96f06d5784e220095815d860be63f9821f`](https://github.com/iAlirezaaa/nodus/commit/a1ebed96f06d5784e220095815d860be63f9821f); implementation tree `36d8b3a9bc531e13de0996100a37757d6b28b7c9`.

## Reproduced problem and user-facing effect

The existing Ctrl/Cmd+K Search had different relevance for copied unquoted `camera   lens` versus `camera lens`. On the prior branch head the pasted query returned `prefix, exact, note, split` for fixture ordering `split, prefix, exact, note`; the ordinary query returned `exact, prefix, note, split`. Extra whitespace could make exact titles harder to locate even though results were counted. This change folds Unicode whitespace in derived comparison strings of unquoted queries and content to a single space, aligning `searchThoughts` and `searchResultPreview`. It does not rewrite stored content, change IDs, send writes or change keyboard shortcuts.

## Checks actually performed

- Exact committed GitHub source and new checked-in test file, **mechanically stripped of TS syntax and executed in V8**: **5/5 passed** — exact/prefix ranking (spaces, tab/newline, NBSP), nested project path, multiline attachment name, quoted phrase field isolation, 70/70/11 paging and content immutability, and URL-only safe source label. `URL` global is not present in this V8 isolate; a limited **hostname-only URL shim** was used. Thus this is not a native browser or actual Node URL check. Initial 4/5 outcome with absent `URL` was a harness limitation, not silently presented as a product bug.
- Independent 250 randomized node fixtures × 6 queries × 6 page requests = **9,000** comparisons between 70-item pages and an unbounded full-result oracle, **0 mismatches**. This is pagination consistency, not an independent specification or a performance benchmark.
- Pre-patch relevance mismatch was reproduced on exact prior GitHub source. The adjusted ranking and total 151 with page lengths 70/70/11 were observed from the revised actual search function in V8.
- Native full project suite `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`: **NOT RUN**. Project TypeScript 5.9.3: **NOT RUN**. Production build: **NOT RUN**. Local checkout unavailable because `github.com` DNS fails; Node 22.16 and TypeScript 5.8.3 exist but do not establish successful project build.
- `http://127.0.0.1:4173/`: **connection refused**. Browser connector: **originating browser context unavailable**. Current Sites-specific skill: **not returned by skill listing**. Public Site URL was inaccessible to the web fetch tool; the authenticated Site source/HEAD/tree was **NOT** inspected. No FA/EN desktop or 390px browser, screenshot, real IME/Enter/Tab/Undo/save/reload, or two-authenticated-account evidence. Screenshots **NONE**, Site version/deployment **NONE**.

## Release decision

**ND-001 In progress; publication Blocked; branch-only.** GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` unchanged in this run. Site `appgprj_6af58606fb9c81918541f056a898c1a2`, audience, existing D1/R2 bindings and owner data untouched. Next recover authorized repository/Sites native runtime, run full suite/TypeScript/build and real 4173 browser screenshots, inspect Site HEAD/tree and independently review before guarded main+Site publication; then ND-002.
