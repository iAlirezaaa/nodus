# ND-001 — quoted search with copied ZWNJ/ZWJ boundary marks

**Status:** In progress on `fix/nd-001-search-clarity`; integrated release Blocked. 2026-11-15 UTC.

**Problem / reproduction:** Copying `\u200C«سلام دنیا»`, `«سلام دنیا»\u200C`, `\u200D«سلام دنیا»` and `\u200C«»\u200C` caused the original `parseQuotedSearchPhrase` to return null. Local exact original source blob `a67d98c74bac0f6e3950a4e71bb2ec279db99304` was verified by `git hash-object`; native Node22 reproduced all four missing exact-phrase detections. A null phrase turns that query into ordinary unquoted matching (can allow reordered/cross-field results), contrary to visible punctuation.

**Acceptance:** Outside joiners are copy artifacts, inside joiners remain meaningful. Keep normal Persian/English quotes, unbalanced quotes, explicit empty-quote zero results, emoji and no data writes. Tests check exact literal parser return values and preserve ZWJ inside emoji phrases.

**Scope before code:** [e1a5564](https://github.com/iAlirezaaa/nodus/commit/e1a5564b459aa8386ef118f7447d3f42203bd936) with observed GitHub heads and lease; code [0f08d0f](https://github.com/iAlirezaaa/nodus/commit/0f08d0fefe938f7488aea3ab320d2292ba91e41a) / tree `555ec6e1ac9b4114f75a7ee8cd7d0fadb39f2cfc`. Source/test Git blobs `0ffbb736da256837c379f7ccc4def0693562ea62` and `4f55db140d9c2df091378e0227a7ec9b680e7dfa`; both matched the local bytes used for native execution. Five new regression cases + 17 existing = **22 passed, 0 failed** with Node.js 22.16.0 and `--experimental-strip-types --test`. Standalone strict TypeScript 5.8.3 on source passed. This is a real native helper test run, not the Nodus full suite.

**Unverified / blocked:** CI [43712998859](https://github.com/iAlirezaaa/nodus/actions/runs/43712998859) failed with `runner_id=0`, `steps=[]` before checks; full repo test count in this run **0**, project TS 5.9.3/build **NOT RUN**. Browser at fixed `127.0.0.1:4173` unavailable; screenshot **NONE**; FA/EN desktop/mobile, IME/Enter/Tab, Undo/save/reload, collaboration/two accounts, Site current HEAD/tree/version/deployment **NOT VERIFIED**. No Site changes or publication; Site audience/user data preserved. Branch stays unmerged; status **In progress / release Blocked**.

**Next:** Full checkout + Node24 release command, real browser 4173 screenshots and integrated keyboard/IME tests, independent UI review, authenticated Sites content equivalence, and guarded merge/deploy. ND-002 after ND-001 release.
