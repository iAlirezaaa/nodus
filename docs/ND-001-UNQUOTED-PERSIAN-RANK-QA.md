# ND-001 — Unquoted Persian exact-title ranking (branch-only)

**Date:** 2026-11-16 02:27 UTC. **Run:** `nodus-auto-20261116T022020-nd001-verify`. Branch `fix/nd-001-search-clarity`. Pre-edit scope commit `d3152b32305baf2aaf87105f433682a938707ea8`, source/test commit [08a362a](https://github.com/iAlirezaaa/nodus/commit/08a362ad0e9685ad00382cbceac9a0c668ba5106), source tree `6218b01431b4cfae9b4382c3a39a8072f3f8a5a5`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9` unchanged.

## Problem and bounded fix

Unquoted `کتاب های من` previously ranked a longer `کتاب های من (یادداشت)` ahead of the title `کتاب‌های من` (ZWNJ spelling). Quoting the same words was already ranked correctly. The fix reuses the Persian spacing-folded title comparison for **exact/prefix title tiers** in both quoted and unquoted searches; phrase matching in other fields is still quoted-only. Matching only changes derived search scores. No persisted titles, graph IDs, attachments, access, server code, migrations, shortcuts, canvas layout or animation change. Existing Search dialog is the control; there is no new UI control.

## Actual checks

- The **exact old GitHub** `lib/thought-search.ts` blob `a1c140d3f136f9ef0c1c0d02f7e4f67ba83ecd26` returned `[prefix, zwnj, joined, note]` for ordinary unquoted Persian input. The **exact committed new blob** `1ad8dee30993c59a5f5fd1767f91f35bdc521682` returned `[zwnj, joined, prefix, note]`. The original quoted order was preserved.
- **15/15** behavior assertions passed against exact committed search module after mechanically stripping TypeScript syntax in an isolated V8 function. Non-target URL decoding and annotation matching were stubbed. These included punctuation/Latin precedence, 151 mixed entries in **70/70/11** pages with correct original order, unchanged node data, deep path parity and six non-Persian deep-page comparisons. The three new `node:test` regressions are committed in `tests/thought-search-persian-phrase-ranking.test.ts` (blob `2573e10a06103bf692c642fb1f717199b1cdc5d1`) but were **not executed with native Node**.
- Local **TypeScript 5.8.3 strict** compilation passed on an isolated typed excerpt of the changed rank block. This is **not** a TypeScript check of the actual project, its full source or the target 5.9.3 toolchain.
- Native repository tests: **NOT RUN**. TypeScript project: **NOT RUN**. Production build: **NOT RUN**. Node24/private checkout unavailable (local `git ls-remote` fails GitHub DNS; only Node 22.16.0 and global tsc 5.8.3 were discovered).
- Port `127.0.0.1:4173`: **connection refused**. No FA/EN desktop/390px mobile, IME/Enter/Tab/focus/Undo/save/reload browser checks, no real screenshot (**NONE**), and no two real authenticated accounts tested. This is a search-ranking behavior change, not a confirmed deployed UI result.
- Sites skill discovery returned no available skill; Browser read returned an originating-context error. Current Sites HEAD/tree, source parity, audience and deployed version: **UNVERIFIED**. Historical Site version 11 is not current proof. No Site or GitHub main publish/merge and no user-data mutation.

**Gate:** ND-001 **In progress**, publication **Blocked**, feature branch only. No release/version ID. Next: recover Node24 full private checkout, run native complete tests/TS5.9.3/build; test existing Search UI on 4173 with screenshot and keyboard/mobile; fetch current authorized Sites HEAD/tree, independent review, guarded main merge and source-matching publication. Then ND-002 focus mode.
