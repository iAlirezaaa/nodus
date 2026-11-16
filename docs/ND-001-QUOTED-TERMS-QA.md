# ND-001 — individually quoted search words (branch only)

Date: 2026-11-16 UTC. Status: **In progress**; release **Blocked**; not active on the hosted Site.

## User-visible defect and implementation

The previous single-quote parser fix correctly treats separately quoted fragments such as \`‘Forest' 'Lighting’\` as **not one exact phrase**, but the unordered-keyword search still kept quote punctuation attached to each word. A thought titled **Forest scene Lighting** therefore was not returned. This made copied project/search text appear missing, especially between Persian/English and Word-style punctuation.

\`lib/search-keywords.ts\` now removes straight/curly single, double, guillemet and low-double punctuation **only at token boundaries** when deriving unordered search keywords; internal apostrophes in \`don't\`, \`I’m\`, and \`L'atelier\` are retained. Balanced whole-phrase searches still require a contiguous match in one field; direct literal-title matches keep their earlier relevance, and keyword fallback still searches only the current authorized workspace. Nothing rewrites source text, identifiers, relationships, URLs or persistence. The dialog, Enter/Tab, keyboard focus, language and page size are unchanged.

Source/tests commit: [a353d87a0374c59d868a5aa92b406cf9ed3ec3fb](https://github.com/iAlirezaaa/nodus/commit/a353d87a0374c59d868a5aa92b406cf9ed3ec3fb); tree \`53ffc4e4a61cbf2ad4a0d2c4fab98a5b03681d71\`. Scope was recorded first in [159c8250](https://github.com/iAlirezaaa/nodus/commit/159c825007804494979ee2551e15a606b4dfcce8).

## Checks performed, not inferred

- Native isolated Node.js **22.16.0**, \`node --experimental-strip-types --test tests/search-keywords.test.ts\`: **4/4 PASS**, 0 failures. Covers straight/curly/mixed FA/EN quote terms, unchanged internal apostrophes and ordinary punctuation, and a read-only 151-result membership fixture with correct 70/70/11 slicing. The original split produced **0/151** on mixed quotes; the new tokenizer produced **151/151**. The fixture checks the tokenizer and ordered membership, **not** the real UI or full search integration.
- Helper-only TypeScript **5.8.3** \`--noEmit --strict --target es2022 --module esnext --moduleResolution bundler\`: **PASS**. Local Git blob hashes match committed \`lib/search-keywords.ts\` **86d80cddaa094252c1953c7140473a57dc91d15b** and \`tests/search-keywords.test.ts\` **ad447da0eb703e9f100bf7127d0824352ecd1784**.
- \`tests/thought-search-quoted-terms.test.ts\`: **3 new integration test cases checked in; NOT EXECUTED natively**, as the full GitHub checkout/dependency tree is unavailable. Full native repo suite, project TypeScript 5.9.3, \`npm run verify:release\` and production build: **NOT RUN**.
- [GitHub Actions run 43929466335](https://github.com/iAlirezaaa/nodus/actions/runs/43929466335) concluded **failure before a runner started** (job \`steps=null\`, no logs). This is **not** a failing or passing project test.
- Local \`git ls-remote\` could not resolve \`github.com\`; no full checkout. Port \`http://127.0.0.1:4173/\` has no owned preview listener. Real FA/EN desktop and 390px browser, focus, IME, Undo, save/reload and screenshot: **NOT RUN / screenshot NONE**.
- The current Sites HEAD/tree and project source mapping cannot be authenticated with an available Sites skill/tool: **UNVERIFIED**. Earlier Site version/source in repo docs is a historical checkpoint, not a current read. **No Site save/deploy**, no new deployment/version ID, no change in audience, shared accounts, user data or main.

## Required next gate

Recover authorized full checkout or running GitHub Actions runner, then run the full native test suite, project TypeScript and production build; inspect real 4173 FA/EN desktop/mobile search with screenshot and IME/Enter/Tab/navigation/Undo/reload, obtain current Sites source tree and reconcile it with GitHub, then independent review and guarded merge/deploy. ND-002 follows only after ND-001 release.
