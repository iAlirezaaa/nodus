# ND-024 — native GitHub Actions verification gate

**Status:** Native CI gate **PASS** on source `aabb91d055fad507182c9d9a9125a5c96025a2a1`; overall ND-024 remains **In progress / release Blocked**. No code release, production deployment or screenshot.

## Purpose

The isolated local execution environment cannot resolve `github.com` to clone a full checkout, so prior ND-024 checks were restricted to extracted JavaScript handlers and test facades. This branch-only CI workflow runs in GitHub's managed runner against the **actual repository tree**. It does not replace browser, storage or Sites verification.

## Implementation

- Workflow: `.github/workflows/nd024-native-validation.yml`.
- Trigger: pushes to `fix/nd-024-startup-storage-recovery`, PRs targeting `main`, or manual dispatch.
- Security: read-only `contents: read`, no secrets, deployments or Site changes; 30 minute timeout and no auto-cancel of an active run.
- Runner: Node.js 24; `npm ci --no-audit --no-fund`, entire checked-in Node test glob, project TypeScript `--noEmit`, `npm run build`. If tests fail, TypeScript and build are still attempted after successful install so distinct failures remain visible.
- Verified results must come from a real workflow run for the exact pushed SHA, not past 205 tests or a mirrored V8 implementation. A failed or absent run leaves this gate **Blocked**.

## Separate release gates

Real `http://127.0.0.1:4173/` FA/EN desktop and 390 px browser screenshot; native IndexedDB saves/reloads and two tabs; keyboard/IME/focus; independent review; source tree and existing private audience match with hosted Site. Fixture results must not be called authentic two-account verification. Site skill and browser originating context were unavailable at scope time.

**Publication:** None. GitHub `main`, existing Site and owner data must remain unchanged.

## Actual run evidence (2026-11-18 UTC)

| Run | SHA | Tests | TypeScript | Build |
| --- | --- | --- | --- | --- |
| [First native run #44215125992](https://github.com/iAlirezaaa/nodus/actions/runs/44215125992) | `12b5641423400018ec1be247c14db7d5320dd5b7` | **305/313 PASS; 8 FAIL** | PASS | PASS |
| [Corrected native run #44215710119](https://github.com/iAlirezaaa/nodus/actions/runs/44215710119) | `aabb91d055fad507182c9d9a9125a5c96025a2a1` (tree `3b882634fc18a8541bc95bc1307311e3185a3391`) | **313/313 PASS, 0 failures/skips** | PASS (`tsc --noEmit`) | PASS (`npm run build`) |

All results are native GitHub-hosted Node 24 Jobs on a full locked checkout, not isolated V8 facades. The failing tests identified stale fixture assumptions about `persistImportIfUnchanged`, missing DOM controls and VM cross-realm raw JSON serializer/array assertions. Source `pages/index.html` was **not changed** to pass these tests; only `tests/pages-import-durability.test.mjs` and `tests/pages-startup-recovery.test.mjs` were corrected in [`aabb91d`](https://github.com/iAlirezaaa/nodus/commit/aabb91d055fad507182c9d9a9125a5c96025a2a1). The original eight failures and their logs remain visible.

**CI security/limitations:** read-only `contents: read`; does not deploy. Node 20 deprecation warnings were emitted by the underlying `checkout@v4` / `setup-node@v4` actions but did not prevent a successful run on Node 24. Real UI at port 4173 (FA/EN desktop/390px), screenshot, native IndexedDB persistence/two tabs, actual authenticated accounts, independent source review and GitHub/Sites tree+audience parity are all **NOT RUN / UNVERIFIED**. Site version/deployment ID **NONE**; screenshot **NONE**; no live feature activation. A subsequent documentation-only commit should be rechecked at its exact SHA.
