# ND-001 — search result counting and nested project paths

Status: **In progress; release gates blocked** (2026-11-12, first scheduled development run).

## Changed code

- New pure `lib/thought-search.ts`: counts **all** matches and returns a bounded visible page; the full root-to-board path index handles malformed parent pointers/cycles.
- `components/NodusApp.tsx`: search initially displays 70, reports visible/total separately, adds a keyboard-accessible **Show more results** button and displays the full root → nested project path in both FA and EN. Search navigation still uses the existing `focusResult` callback.
- `app/globals.css`: full project paths wrap on narrow screens instead of being reduced to an unreadable ellipsis.
- New regression tests: `tests/thought-search.test.ts`.

No graph persistence, schema, authentication, collaboration protocol or user data was modified.

## Checks actually run

1. **5/5 passed** using Node.js **22.16.0** with `node --experimental-strip-types --test tests/thought-search.test.ts` in an isolated validation directory. Assertions cover 0, 70, 71, 151 matching nodes and later pages; Persian title/English note/asset filename matching; root-to-nested paths with duplicate board names; malformed/cyclic containment.
2. **Isolated helper TypeScript** passed with global TypeScript **5.8.3** and a minimal domain-type stub. This is **not** the repo's TypeScript 5.9.3 project-wide check.
3. Validated that the two actual GitHub file blobs match the exact tested local bytes:
   - `lib/thought-search.ts` Git blob `8efa5f83058a5053d08a67e222c2eb917bc1712f`
   - `tests/thought-search.test.ts` Git blob `352f3686d2b23c1c628e37d0a4c57544d0d87498`

## Not run / blocked gates

- Full repository tests, repository TypeScript and production build: the isolated runtime has no Nodus checkout or dependencies, and network access cannot resolve GitHub. No tests outside the five above are claimed as executed.
- Real `NodusApp` browser test and screenshots at desktop/390px, FA/EN input focus, keyboard selection and scrolling: a Nodus preview or Sites runtime was unavailable. Port `127.0.0.1:4173` was unoccupied and not reassigned. A screenshot of a mockup is not an acceptable substitute.
- Site project source/tree, publication version and live behavior: no Sites actions available in this invocation. No deployment attempted. No claim that GitHub and Site trees currently match.
- Two real signed-in accounts and physical mobile input were not examined; this search fix does not change the collaboration protocol.

## Next release action

Restore the supported Sites checkout/runtime without disturbing another project, run the complete test command, `npx tsc --noEmit`, production build, and real UI checks with screenshots at desktop and mobile. Repair any failures. Confirm current main and Site trees and safely sync, then advance ND-001 from In progress to Verified/Released only after direct evidence. Keep work on `fix/nd-001-search-clarity` meanwhile.


## Run 2: bounded results paging (2026-11-12)

- Scope: Search pages of 70 replace repeatedly appended 70-button batches. Controls: **Previous / Next** (فارسی: **قبلی / بعدی**) at the bottom of the search results, with page number and a precise displayed range. Searching starts at page one; each page change scrolls the result list back to its top.
- Only results for the current page are mounted; 151 matches yield 70, 70, 11 across three pages, preserving order without duplicate IDs. A stale page after document shrink clamps to the last available page. Full root-to-board paths remain readable and tooltip text is retained.
- **Test run on Node.js 22.16.0:** `node --experimental-strip-types --test tests/thought-search.test.ts` — **8 passed, 0 failed**; target test file and helper were copied byte-for-byte to an isolated directory and each local `git hash-object` matched its GitHub blob SHA.
- **Helper-only typecheck:** Global TypeScript 5.8.3, `tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck lib/thought-search.ts`, using a minimal local type stub — passed. The initial check exposed TS7022 in the existing board walker inference; commit `1a005f25e4655f72aff131eec7afa7ddfbb50df3` adds an explicit type, and recheck passed. This is **not** project-wide TypeScript 5.9.3 validation.
- Branch source commit `1a005f25e4655f72aff131eec7afa7ddfbb50df3`; tree `04957681690b642d508b49607a08fa9342bc65f4`; helper Git blob `fa5a01520a49cd63009f8fba0ffb414b97aa792c`; test Git blob `3f6d589a9f12e1bf5d33f4e2cc36bb9aac82acb5`.
- **Blocked gates:** No Nodus runtime or authenticated Sites action in this environment; full Nodus suite, app TypeScript and production build, desktop/390px screenshot, keyboard/focus/RTL browser evidence, Site source tree comparison, and publication **were not performed**. No screenshot was fabricated. Port 4173 was not changed or occupied by this run. No real two-account sign-in or mobile hardware test was attempted.
- **Release:** Not Verified, not merged, not deployed. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9`. Next: restore the supported checkout and Site tool, exercise both language modes and keyboard result selection in real browser, run complete project checks, reconcile GitHub/Site tree and publish if successful.

## Run 3: Persian/Arabic keyboard-tolerant matching (2026-11-12)

- Added comparison-only `normalizeSearchText` in `lib/thought-search.ts`: NFKC normalization, Arabic yeh/alef-maqsura to Persian yeh (`ي/ى → ی`), Arabic kaf to Persian kaf (`ك → ک`), removing Arabic vowel marks and tatweel, ignoring ZWNJ inside terms, and mapping Arabic-Indic/Persian digits to Western digits. Stored node titles, notes, assets and document identities are never rewritten. Existing 70-result paging, global counts and board paths remain untouched.
- The matching is still substring-based; this is not stemming, transliteration or fuzzy search. Search results retain their source order.
- **Actually executed:** Node.js 22.16.0 `node --experimental-strip-types --test tests/thought-search.test.ts` in an isolated directory: **11 passed, 0 failed**, including the preceding 8 cases and 3 added Unicode regression tests. Exact isolated test/helper bytes confirmed by `git hash-object` against repository blobs: `ce09169b9ff1b06468233a01d2885e81537ea8b0` and `3187515f99dbafe1c547cc80f615612c12cb584c`.
- **Helper-only** TypeScript 5.8.3: `tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck lib/thought-search.ts` passed with an explicitly minimal local `GraphNode/Workspace` type stub. Not a project-level TypeScript 5.9.3 check.
- Additional six isolated test cases passed in a separate local Unicode/paging harness. A synthetic Node.js 22 run searching 5,000 text-bearing fixture nodes took ~41–62 ms per query over four warm/cold repetitions on this runtime; this is **not** a browser/mobile performance measurement or a guarantee.
- New application-code commit: `18b60d9214eba7884bedb07f073c1e6c02f918a6`, tree `7171a0d9419f6794201e94e7adf8dc8cf8d9772f` before this documentation update.
- **Release gates still blocked/not run:** full Nodus tests, repo TypeScript 5.9.3, production build, real app FA/EN keyboard/IME and desktop/390px browser screenshots, authenticated Sites source/head/tree reconciliation and Site publication. No installed Nodus checkout, app dependencies or authorized Sites actions were available in this invocation. No screenshot or production-user test is claimed.
- Status: **In progress; branch only, not Verified/Released**. Main and live Site remain unchanged by this run. Next: restore authorized Site runtime, test the real search input including IME and language switching, complete repo checks, compare source trees, then merge and release only with verified evidence.

## Run 4: find thoughts by their project location (2026-11-12)

**User-visible slice (branch only):** Search now also matches the current authorized document's root-to-nested-board location. Example: searching `Studio` locates thoughts inside `Studio / Episode / Shot 12`, even when their own title and notes do not contain "Studio". Matching supports the Persian/Arabic keyboard variants and numerals from run 3. A per-search normalized board-path map is reused for nodes in the same board. The current 70-item pagination, counts, node order and selected-node navigation stay intact. Only ephemeral search text is inspected; no document, persistence, schema, authentication or shared operation is modified.

**Scope-label correction:** A private document can contain multiple personal root spaces, whereas shared rooms have separate documents. The dialog now says **"Across all spaces and nested projects in this workspace"** (FA: `در تمام فضاها و پروژه‌های داخلی این محیط`) rather than suggesting a cross-account or cross-room search. The placeholder mentions project paths; the accessible input label and empty state describe the same scope.

**Code commits:** `f8644d337c880248becf4b8af67912492c7b158e`, `4e67b21bcfd089a38fffcc40aa868f97df666be2` (source tree `50238864b7ace82d18792aebd0b9c16dd2d5f230` before QA-documentation commit). GitHub blobs retrieved after commit matched the locally tested exact source bytes: helper `ab9d8d414286e21e321bff01a49313616cdf49b4`, tests `ce003521c55154f49cc592871d7bce98dc7579a8`; actual domain types `8502a312ebb550ca00122cf441c382c3b49253b0`.

**Actual verification (isolated source):**
- Node.js `22.16.0` with `node --experimental-strip-types --test tests/thought-search.test.ts`: **14 passed / 0 failed**; 11 previously existing cases plus 3 new cases for root/nested location search, keyboard normalization of paths without mutation, exact 151-result pagination (70/70/11), and missing map entries. Tests execute the exact GitHub helper/test blobs, not a separately rewritten approximation.
- Global TypeScript `5.8.3` `tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck lib/thought-search.ts`: **passed with the actual repository `lib/types.ts`**, not a stub. This still does **not** replace the full project TypeScript `5.9.3` check.
- Synthetic Node.js benchmark: 5,000 notes, 100 board paths, 20 `episode` queries for offset 70; median **3.32 ms**, p95 **7.86 ms** on this isolated runtime. These are helper CPU times and **not** browser render/input-latency measurements.
- Static integration inspection: `NodusApp` computes paths before the paged results, passes the map to the helper, and keeps the existing `focusResult` navigation and Prev/Next controls. This is **not** a browser interaction or JSX project build test.

**Release gates not run / blocked:** no authenticated Sites tools, complete Nodus checkout/dependencies or supported app preview were available. Therefore full repository tests, TypeScript 5.9.3, production build, actual FA/EN desktop and 390px IME/focus/navigation browser screenshots, Site tree/version reconciliation and deployment were **not performed**. Local port `127.0.0.1:4173` was not changed. No real two-account or physical touch test was claimed. GitHub `main` and the hosted Site were not modified. **ND-001 stays In progress (branch only), not Verified or Released.** Next: recover supported Sites checkout, run full gates, reconcile both source trees, then safely merge/publish if successful.


## Run 5: field-local compact compound and project-path matching (2026-11-13)

**Actual source on branch:** `fix/nd-001-search-clarity` code commit `0640e15f3bc2b6efc41d21b43882853b487b518c`, tree `c6943fc6ee09ad9953b1835c3d9fca1fcc059979`. Introduced `compactSearchText` as a comparison-only fallback after existing exact matching. Persian spaced, ZWNJ and joined compounds now match in both directions; path queries may omit display slashes and spaces; filename punctuation and spaces are optionally ignored. The fallback scans title, note, attachment name **separately** to avoid inventing a cross-field joined phrase. Existing 70-item paging, stable result IDs, full paths and graph persistence remain unchanged. No new settings or user-visible controls were introduced in this slice.

**Actual checks, using exact local bytes matching GitHub blobs:**
- Node.js `22.16.0`, `node --experimental-strip-types --test tests/compact.test.ts` against isolated `lib/thought-search.ts` and actual `lib/types.ts`: **5 passed, 0 failed**. Covers three Persian spacing variants, nested paths with and without slashes and mixed keyboard digits, cross-field isolation, 151-result pagination and stale offsets, English/asset search and malformed containment. The regression test is stored on the branch as `tests/thought-search-compact.test.ts` with identical Git blob.
- GitHub helper blob: `4b45e94c77c81bc5d0dfb34437f82a2641650e83`; test blob: `dcef67df69287c5dc43a8c435a63b78b8e64448a`. Both match local `git hash-object`. The unchanged, actual repository domain types are Git blob `8502a312ebb550ca00122cf441c382c3b49253b0`.
- **Helper-only strict TypeScript 5.8.3** passed using `--module ESNext --moduleResolution bundler` and the exact `lib/types.ts`. The initial attempt with NodeNext failed because the existing extensionless `./types` import conflicts with NodeNext ESM resolution; switching to the project's bundler-style module resolution passed. This is NOT the full repository TypeScript 5.9.3 check.
- A synthetic Node.js `5,000`-node/100-board, 20-iteration search measured `کتابهای` median 9.31 ms / p95 10.71 ms on this runtime; no browser/device/IMЕ implication and no before/after baseline claim.

**Release gate:** Still **In progress / branch only**. The full existing 14-case search suite was not rerun in this invocation. Full repo tests, project TS 5.9.3, production build, actual desktop/390px FA/EN focus/IME screenshots, authenticated Sites source/tree reconciliation and deployment remain **Blocked/not executed**. The private repo cannot be cloned from the local container due to network DNS, and the authorized Cloudflare Site development/deployment tool is not exposed in this run. Port 4173 untouched. No user data, other project, main branch or live deployment modified. Next: recover supported runtime/Sites tool, run full tests/build/browser gates, reconcile GitHub/Site trees, publish only after verification; then ND-002.


## Run 6 — relevance-first search and mobile result titles (2026-11-13T01:25:46.209Z)

**Implemented, feature branch only:** `lib/thought-search.ts` now groups hits into seven deterministic categories: exact title, title prefix, title substring, nested project path, attachment filename, note, and historical normalized cross-field match. Ties preserve original document order. All matches are still counted and 70-result pages remain bounded, including stale-offset recovery. Input normalization and source data remain unchanged. `app/globals.css` now allows search result titles to wrap instead of ellipsizing them and enlarges title/path typography at ≤650 px; the full nested path was already wrappable. No graph, persistence, room permission, keyboard handler or schema edits.

**Actual isolated verification:** Node.js 22.16.0, `node --experimental-strip-types --test tests/thought-search-relevance.test.ts`: **5 passed / 0 failed**; TypeScript **5.8.3** `--strict --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck` passed with the **actual** `lib/types.ts` bytes from GitHub (blob `8502a312ebb550ca00122cf441c382c3b49253b0`). Local pre-upload `git hash-object` helper `29a83eefe6febd5cfac0fabc5cdd03acb5d474b8`, regression file `b0e54dfaabfac759b28a34b04d805d33d974bb84`. A 5,000-thought synthetic benchmark with 30 searches returned 2,500 matches (median 12.31 ms, p95 23.76 ms) **on this Node process**, not a real-browser latency claim. An initial benchmark expectation was incorrect and corrected before that measured run; it was not a product failure.

**Not verified:** Existing 14+5 search suites were not rerun this invocation, nor the full repository test suite, project TypeScript 5.9.3, production build, real Nodus browser and 390 px FA/EN/IME screenshot. The private checkout is unavailable from this container (GitHub DNS resolution fails), and no authenticated Site project tool is exposed. The mobile CSS change is unverified visually. Fresh Site tree equality and deployment were not checked. **Do not merge or publish; ND-001 remains In progress / release gate Blocked.** Site, main and live data unchanged. Next: obtain authorized project checkout/Sites runtime and complete those release gates; then proceed with focus/readability roadmap.


## Run 7 — unordered keyword fallback (2026-11-13T02:30:35.098Z)

**New behavior:** Searching `forest lighting` finds `Lighting in the forest` and thoughts with `Forest` in the title and `Lighting` in a note. Queries such as `چراغ جنگلهای` find an item with the first word in its notes and the second in its authorized nested project path. Every keyword is required; no cross-document lookup, mutation or shared write occurs. The fallback ranks after existing seven title/phrase/path/file/note tiers; ties stay in original order. The branch's existing search dialog is the control. No mobile canvas-label work is claimed.

**Actual checks:** `node --experimental-strip-types --test tests/thought-search*.test.ts` under Node.js 22.16.0 in the isolated matching-source checkout: **30 passed, 0 failed** (14+5+5+6). All four test file hashes matched GitHub blobs and helper-only strict TypeScript 5.8.3 passed with the actual repository `lib/types.ts`. Tested source hash `262129e1f3b7852d4c3e64de29241ce07da8873e`; new test hash `eb948583c595a1207235b72ecd5350f573a092ac`; source commit `98dfe34f983b0136bfa9c4897eb654aa5ef261bf`, tree `6bc3e410bc4e82a771a518778b45accb8d0e044c`. Existing relevance test ruled out fragmented `F-oo`+`B-ar` false positives before finalizing. 5,000 synthetic notes/40 paths/30 queries: median 21.63 ms, p95 32.71 ms (Node CPU only).

**Still Blocked:** Project-wide tests and TypeScript 5.9.3, app production build, browser at 127.0.0.1:4173, desktop/390px FA/EN screenshot, IME and keyboard/focus test, Site source tree/version reconciliation and deployment. No actual screenshot or Site version this run. Do not mark ND-001 Verified/Released, merge to main or deploy on these isolated checks alone.


## Run 8 — Persian compound keyword fallback across fields (2026-11-13)

**Scope recorded before source edits:** commit `1f0fc86adff0a2e4ef3383f30cfd4f8de6d19401`, feature base `87894a0d731ad086adfa159ec4f779cc95b97343`. Lease `nodus-auto-20261113T0310Z-nd001` held through guarded control-branch commits.

**Reproduced defect on exact original GitHub source:** local `git hash-object` of `lib/thought-search.ts` was `262129e1f3b7852d4c3e64de29241ce07da8873e`, matching the source branch blob. Node.js 22.16.0 red run of three tests: two failed (mixed `کتاب‌های forest` versus title `کتاب های` plus note `forest`; `پروژه‌های lighting` versus spaced project path) and one negative hyphen-fragment case passed.

**Actual branch-only fix:** In the final unordered-keyword tier, normalized Persian words may match forms where whitespace between Persian letters occurs *within the same searchable field* (title, note, asset filename or authorized current-workspace path). No punctuation is stripped for these per-word checks; a query cannot manufacture a hit by joining fields, nodes or rooms. Existing title/phrase ranking, stable ties, global total and 70-result pagination are untouched. No UI, graph document, collaboration, persistence, layout, movement, listener, migration or port changes. User control: existing Search dialog.

**Actual checks:** `node --experimental-strip-types --test tests/thought-search-persian-keyword.test.ts` on Node.js **22.16.0**: **5 passed, 0 failed**. Cases: mixed Persian spelling split across title/note; authorized nested path/title; punctuation-fragmented Latin negative; stable 151 hits across 70/70/11 pages with no mutation; absent path/keyword negatives. The exact tested new GitHub helper blob `74a1beaf6825a21753a80a660e950ac648f91ce8` and test blob `8e7f3858b62d7b6ceabd3fdaca9cf2e6fe59965a` match local `git hash-object` output. Actual `lib/types.ts` blob `8502a312ebb550ca00122cf441c382c3b49253b0` matches local, and helper-only **strict TypeScript 5.8.3** `--noEmit --target ES2022 --module ESNext --moduleResolution bundler` passed. Type-checking the test file itself was blocked by missing `@types/node`; do **not** report this as full project TS success.

**Synthetic Node benchmark (not browser):** 5,000 thoughts/40 board paths, 35 trials with 5 discarded warmups, query `کتاب‌های forest`: baseline search **0 matches** (the bug), p50 **23.81 ms** / p95 **24.46 ms**; corrected search **834 matches**, p50 **30.79 ms** / p95 **36.17 ms**. Different match counts make this a workload observation, **not** a performance improvement claim. Measured on this container, not mobile or production data.

**GitHub:** Code/test commit `c63ba69a148d6bc929f2ff29b9e71d781df93f49`, tree `05c0bdf65f6a142c971cea533f79a49457e1c3f4` before documentation. GitHub main still `26fafac05c320ed5db30a0ee908dd816714acdd9` at documentation check. The last recorded successful Site deployment remains `appgdep_6af5e638d4748191a1a4a0f1f4caca21`, Site source `eb8a9ad1f470447bf15634efbaa47531924901c5`, but **this run could not authenticate the Site source HEAD/tree or verify live activation**. Therefore these are historical checkpoint identifiers, not fresh synchronization proof.

**Blocked gates (not run):** Private git clone from the model runtime failed (`Could not resolve host: github.com`); no authorized **ChatGPT Sites** project skill/action or real Nodus 4173 runtime was exposed. Full Nodus suite, project TypeScript 5.9.3, production build, real desktop/390px FA/EN/IME/keyboard/reload browser screenshots and Site tree compare/deployment were not performed. No screenshot path exists for this run. The test used isolated exact-source fixtures, not a real login, two real accounts or physical mobile device. **Status: In progress, branch only, release gate Blocked**. Do not merge or publish. Next: obtain supported checkout/Sites runtime, run full checks, verify browser and tree equality, then decide on guarded main/Site promotion; subsequently ND-002 and mobile canvas readability.


## Run 9 — Latin accent matching (2026-11-13)

- **Scope recorded before code:** `docs/DEVELOPMENT_LOG.md` commit `bd2b82c8ccba784eaef1db75e65a2ba77ab66039`, lease `nodus-automation-20261113T041423Z-nd001`. Source branch `fix/nd-001-search-clarity`; unchanged `main` `26fafac05c320ed5db30a0ee908dd816714acdd9`/tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- **Red:** exact old helper blob `74a1beaf6825a21753a80a660e950ac648f91ce8` matched `git hash-object`; new six-case regression yielded **1 passed, 5 failed** (accent matching absent). This is an actual run, not an expectation.
- **Green:** corrected helper source blob `0c3ad9c353c51994366286f9cc84a2d56e514034`, test blob `dd0990ebfe32aa848981d7e6fcb2fe4ee0b2da09`, original domain types `8502a312ebb550ca00122cf441c382c3b49253b0`. Source and test fetched from GitHub after commit; their blobs matched those tested locally. Commit `5a010c1b36ff3447828fb7f5bb78858d6a81deed` (tree `a922b95a6bd0f5f2ba08e0b474795e95a3958b80` before docs).
- **Actual related tests:** **41/41 passed**, Node **22.16.0**, `node --experimental-strip-types --test tests/thought-search*.test.ts`, including 35 exact original tests from GitHub and six new. Existing test hashes: base `ce003521c55154f49cc592871d7bce98dc7579a8`, compact `dcef67df69287c5dc43a8c435a63b78b8e64448a`, relevance `b0e54dfaabfac759b28a34b04d805d33d974bb84`, keywords `eb948583c595a1207235b72ecd5350f573a092ac`, Persian keywords `8e7f3858b62d7b6ceabd3fdaca9cf2e6fe59965a`. Strict helper-only TypeScript **5.8.3** passed against the actual `lib/types.ts` with bundler module resolution. **This was not the full project TS 5.9.3 check.**
- **Behavior:** composed/decomposed Latin title, text, file name, full nested path, Persian and Arabic unchanged, Greek accents not collapsed, no punctuation-spanning fabricated hits, stable 151-result pagination 70/70/11 and input immutability. New normalization only touches ephemeral comparison strings, does not save or update any graph field.
- **Synthetic Node 5,000-note bench, 40 paths, 30 samples after five warmups (not real mobile):** old/new `forest lighting` p50 15.11/19.31ms, p95 29.61/22.01ms; old/new `کتابهای` p50 8.81/13.12ms, p95 13.43/14.02ms; `resume` old 0 hits, new 1,000, p50 22.39/24.46ms and p95 25.82/27.26ms. No speed improvement claimed.
- **Still blocked / not run:** Full repository tests, TypeScript 5.9.3, production build, actual 4173 preview, real desktop/390px FA/EN browser screenshots, IME/focus/Enter/Tab/Undo/save/reload interactions, current authorized ChatGPT Site head/tree comparison and matching publication. The private clone failed with DNS resolution in the local container; no native tool for the specified ChatGPT Site is exposed. No new Site version or screenshot. No login, two-account, physical mobile or collaborative test. **ND-001: In progress, branch only; not Verified/Released.** Next is full app/Site release QA before ND-002.
