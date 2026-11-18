# ND-024 — native GitHub Actions verification gate

**Status:** In progress / initial run unverified. No code release, production deployment or screenshot.

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
