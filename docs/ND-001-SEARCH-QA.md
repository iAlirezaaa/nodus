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
