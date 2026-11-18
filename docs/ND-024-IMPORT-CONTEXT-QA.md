# ND-024 — stale backup read after workspace changed (branch only)

## Scope / source

- Date: 2026-11-18T00:32:22.141Z; run `nodus-auto-20261118T0020Z-nd024-gates`; branch `fix/nd-024-startup-storage-recovery`.
- Pre-edit scope: [`dc40dc04`](https://github.com/iAlirezaaa/nodus/commit/dc40dc04dc24d4c290ee0e692a4331c67a9fa3b4), pre-edit Pages blob `f5c172452cc24ec4447273cd353a70b5f6488eec`.
- Implementation and 10 checked-in tests: [`feb1855c`](https://github.com/iAlirezaaa/nodus/commit/feb1855c4e48aab39895db0293a6f31439ea2ea1), tree `2c30f811c3acc0f5b159634c5e7f44297bf6c9ee`, Pages blob `3d43215e8c2f3ae2005f6caba620ca65bdee183a`, tests blob `40d4488d727ca1a8f78bc2c39c0c12dbe4f190ee`.
- Main observed `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current Sites head/tree/version/audience unavailable; no parity claimed.

## Issue and behavior

The optional standalone local-first Pages **Import JSON** can wait on asynchronous `file.text()`. Previous `_activeImportRead` cancellation was tied to newer **file selections** only. When a user chose a backup, then edited the graph, navigated into another project, began a separate restore or entered recovery/conflict state, the old file could still prompt to replace the workspace and call `restoreLocalDocument`. That user-visible prompt was stale and could lead to unintentional replacement after a newer action.

The existing handler now captures the current document identity, board ID and recovery object before reading the file. After the pending read (and on rejection) it rechecks those and `restorePending` / `localConflict`. On change it reports in FA/EN that the backup must be selected again and exits before parse/confirmation/restore. A new picker choice still cancels the older read via its existing token. A stable choice still prompts and restores through the original guarded IndexedDB transaction. No new UI control, model field, migration, Undo/save or per-frame write was introduced.

## Reproduced and verified

| Check | Actual result |
| --- | --- |
| Exact previous GitHub source, five workspace-change scenarios | **5/5 unsafe:** doc replacement, board change, recovery-state replacement, restore-in-progress flag and save-conflict flag all produced a stale confirmation and restore in isolated runtime. |
| Exact patched GitHub source, same five scenarios | **5/5 blocked:** zero confirmation, zero restore call, localized retry notice. Ordinary unchanged import still restores. |
| Native Node.js 22.16.0 isolated source-matched handler harness | **9/9 PASS**: production handler length `1854`, FNV1a32 `f6bff934` matched fresh GitHub text; context transitions, normal import, last-file-wins and stale rejection feedback. This is not the full checked-in native suite. |
| Newly committed regression test bodies, exact GitHub HTML source | **10/10 PASS** in isolated V8 with Node test/assert/fs/crypto facades; one CSP test uses a facade and is **not** by itself independent cryptographic verification. |
| Full inline JS syntax | **PASS** under V8 `new Function`, including re-read committed blob. |
| CSP | Existing exact 67,051-char script hash independently matched `sha256-vXv/abUD9Qb2hhs94kHl4uJTDUJH0Sak71cf0TCUVao=`; modified 67,728-char script independently hashed to `sha256-CpzBdM6i5Zmhaj9xZ/8J8+CGTtM7qXdJZh4r/GIlSSA=`, stored in CSP and re-read. |
| Native full checked-in Node suite | **NOT RUN / Blocked:** full checkout unavailable, github.com/API DNS resolution fails in fresh container. |
| Project TypeScript + production build | **NOT RUN / Blocked:** no full checkout or project dependencies; global TS 5.8.3 is not project 5.9.3. |
| Actual `http://127.0.0.1:4173/` browser, desktop FA/EN, 390px, IME/focus, save/reload/two tabs | **NOT RUN / Blocked:** no port 4173 listener and Browser connector requires originating context. Screenshot **NONE**. No real authenticated users or two real accounts tested. |
| Hosted Site tree/source/audience | **UNVERIFIED:** no authorized Sites skill/action available, hosted URL inaccessible through public fetch. No Site version or deployment ID. |

**Result:** ND-024 remains **In progress**, release gate **Blocked**. Code/tests and this QA are on the existing feature branch only; `main`, Site, original user data and automation schedules unchanged. The optional static Pages edition is **not** the authenticated hosted Nodus Site. GitHub metadata reports repo visibility `public` despite the private target description; this run did not change visibility.

**Next action:** obtain authorized complete checkout + current Sites source, run full checked-in Node/TS/build, actual 4173 FA/EN desktop/390px two-tab IndexedDB fixture/real UI screenshot and independent review; compare Github and Sites *trees* and release only after all gates pass. Keep the present branch checkpoint otherwise.
