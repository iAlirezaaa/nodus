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
