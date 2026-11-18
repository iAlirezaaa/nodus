# ND-024 — close stale IndexedDB connection before recovery Retry

Date: 2026-11-18 16:26 UTC. **In progress, branch only; production publication Blocked.**

## Problem and implementation

The separate optional **local-first Pages** edition may hold an IndexedDB connection after initial validation/read failure. Clicking **Retry reading stored data / تلاش دوباره برای خواندن** previously opened another connection via `load() → getDB()` while leaving its predecessor open. Repeated attempts could accumulate orphaned handles and obstruct later version upgrades in another tab.

The existing `retryRecovery()` now closes and drops its previous `db` handle **before** requesting a fresh read. A synchronous `close()` error is isolated so a subsequent read still truthfully succeeds or fails; an unavailable handle is a no-op. This touches no graph record, IndexedDB schema or keys, write transaction, Undo, user content, collaboration, authentication, language/IME/Enter/Tab handling or movement. No new UI control is introduced.

Pre-edit scope: [`d057159a`](https://github.com/iAlirezaaa/nodus/commit/d057159a0eccc2ca717b85204c9d3b79ff968387), tree `1b1cb9405eea334934b7905774f69d78971a9a90`. Implementation: [`8bc29a4e`](https://github.com/iAlirezaaa/nodus/commit/8bc29a4e3ffbc1c5ed29a30e8e6253201573c55d), tree `df048812e12c4fa51bd25de851f645c3274d358a`, source `pages/index.html` blob `699eb379070c0a9a3945685ce2adb9f9ca220bae`, new `tests/pages-recovery-connection.test.mjs` blob `4e0ddccfc2f4e8e7f140ab0d06c2f66681fe0ecf`. Updated inline script CSP SHA-256: `CaGtmfZFuY8Gy0MnR049bN9+fkGxTZq+jKW+GlxBeyM=`.

## Observed verification on exact code head

- [GitHub Actions #44346806135](https://github.com/iAlirezaaa/nodus/actions/runs/44346806135) **completed success** on exact commit `8bc29a4e`: **384/384 checked-in Node tests** (including 6 new source-exact tests), project TypeScript `tsc --noEmit` PASS and production `npm run build` PASS.
- New regression covers prior handle closed before read, valid recovered workspace, failed read keeping lock and zero writes, thrown close not unlocking, no prior handle, two successive retries closing each predecessor. Whole inline source parses and its CSP hash matches. An old-code *red run* was **not** separately executed; inspection confirms it lacks the close step.
- Same workflow: **17/17 real Chromium Pages-fixture scenario groups** on exactly `http://127.0.0.1:4173/`, including real IndexedDB abort/recovery, FA/EN desktop and 390px viewport, synthetic Persian composition, Enter/Tab, save/reload, two fixture tabs with stale-write rejection, calm/off/reduced-motion zero graph writes, export and media boundaries. The specific stale-handle assertion is the new checked-in Node regression, **not** a separately added Chromium scenario.
- [Real Chromium screenshot artifact #14445783883](https://github.com/iAlirezaaa/nodus/actions/runs/44346806135/artifacts/14445783883), generated on the exact tested source. **Individual images not visually inspected in this run**. Fixture browsers are **not** two genuine authenticated accounts; simulated IME is not a physical keyboard/device.
- Local checkout attempt: `git ls-remote` failed DNS for `github.com`; verification authority here is the current GitHub Actions run rather than an asserted local full-suite test.

## Preservation, release and next gate

GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`) remains unchanged. The original authenticated Site project `appgprj_6af58606fb9c81918541f056a898c1a2` has **unverified head/tree/audience/deployed version** because no native Sites skill/action was available; no production save, deployment, version or release ID. Do **not** infer original Site parity from the Pages fixture or GitHub commit history. Two real logged-in accounts/permission revocation, independent integration review and original Site UI screenshot remain Blocked. GitHub metadata still reports repository **public**, contrary to intended private; unchanged.

**Next:** recover authorized Sites source and audience; compare actual source trees, resolve drift, verify genuine account permission behavior and independent review before guarded merge/publish. Then continue ND-025 mobile Fit readability. Keep ND-024 **In progress**; passing isolated branch checks is neither `Verified` for original Site nor `Released`.
