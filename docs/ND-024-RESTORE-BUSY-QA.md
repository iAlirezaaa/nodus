# ND-024 — importing another JSON during an active restore (unreleased)

## Scoped before source edit (2026-11-17T23:18:56.984Z)

- Branch: `fix/nd-024-startup-storage-recovery`; base commit `e77a876764259448dae15f7153519f49f8308e0c`, tree `7d7a50177b9b8b903745b089207ab2e4e37a3471`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Source blob: `4d3a7283a02215dbf1091ef83a60a64b99122d65`.
- RED reproduction: restore A pending, select B, received 2 confirmation calls and 2 restore attempts with no progress warning, despite restore B failing the `restorePending` guard.
- Intended: show localized busy warning before B.file.text/parse/confirm; never abort in-flight A transaction; latest selection on pending reads remains protected. Preserve data, model, CSP and keyboard/IME.
- Checks: source-exact tests, script parse, CSP; full native test/TypeScript/build and browser port 4173/Sites gate before release.

## Verification checkpoint

PENDING. No code release or screenshot until gates pass.

## After implementation — 2026-11-17T23:26:16.930Z

- Branch-only implementation: [commit `bc1b1dc17b1435829cf342abc73a714ae7b5ce49`](https://github.com/iAlirezaaa/nodus/commit/bc1b1dc17b1435829cf342abc73a714ae7b5ce49), tree `400dc566ccea2802adb1833f2d0b3c39df1e19c0`; `pages/index.html` blob `f5c172452cc24ec4447273cd353a70b5f6488eec`; new checked-in `tests/pages-import-busy.test.mjs` blob `aa15de8df354586c7d835b4e85424b056be38da1`.
- Exact old handler: while restore A awaited persistence, B was read, confirmation reopened and B restore attempted but rejected by the guard; **2 confirmations, 2 attempts, 0 busy notices**. Patched: **1 confirmation/attempt**, B read **0 times**, clear busy message in FA/EN. No durable transaction is cancelled.
- **Isolated source-exact V8 scenarios:** old 3/5 PASS, new **5/5 PASS** (busy replacement, oversized replacement, silent cancel, pending file-read override, normal import).
- **Six checked-in tests fetched from GitHub and executed using V8 Node assert/crypto facade:** **6/6 PASS**. Not the native Node test runner; crypto facade uses a digest separately recomputed from full source with a pure JS SHA256 implementation, verified against old CSP and known SHA256 test vector. Whole inline script syntax parses. New CSP digest `sha256-vXv/abUD9Qb2hhs94kHl4uJTDUJH0Sak71cf0TCUVao=` matches full 67,051-character script.
- **Native full suite, full TypeScript project and production build: NOT RUN.** No complete checkout: GitHub DNS unavailable from fresh container, global Node22/TS5.8.3 are not project TS5.9.3.
- **Real UI at http://127.0.0.1:4173/: BLOCKED (connection refused).** Browser connector lacks originating browser context. No real FA/EN desktop/390px keyboard/IME, IndexedDB two-tab/reload, screenshot or authenticated account QA; screenshot **NONE**. This isolated code test is not a browser interaction test.
- **Sites:** authorized Sites skill unavailable; current Site head/tree/audience cannot be inspected; parity not established. No code build, deployment, published version or main merge; **release NONE**. Original Site/data untouched. GitHub reports visibility **public**, left unchanged.
- **Status:** ND-024 **In progress** on `fix/nd-024-startup-storage-recovery`, publication **Blocked**, not Verified or Released. Scope/checkpoint committed to the feature branch and separate guarded control branch.

**Next gate:** authorized checkout → checked-in native tests + TS/build → isolated real 4173 FA/EN desktop/390px busy-restore race with screenshot and two-tab storage/reload → independent review + fresh Site and GitHub tree reconciliation → guarded merge/release only after all pass.
