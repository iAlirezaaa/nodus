# ND-024 — Failed/aborted media reads do not mutate local thoughts

**Date:** 2026-11-18 UTC. **Status:** ND-024 **In progress**, this bounded Pages media-read failure slice **tested on feature branch only**, **not released**. Branch: `fix/nd-024-startup-storage-recovery`. The authenticated hosted Site is distinct from the standalone GitHub Pages/local-first fixture.

## Problem, acceptance and code

The existing **Thought details → Media** file picker awaited a `FileReader` promise. `onerror` returned `null` but was incorrectly shown as **Unsupported media format**; `onabort` was never handled (pending promise), and a synchronous exception from the reader constructor or `readAsDataURL` rejected the asynchronous input handler without helpful feedback. A user could not tell whether the attachment failed or was saved.

In `pages/index.html`, `FileReader` now settles to `null` on `error`, `abort` and synchronous exceptions, and displays a single localized retry notice: **«خواندن رسانه انجام نشد؛ دوباره تلاش کنید.» / “Could not read media; please choose the file again.”** No `mutate`, Undo, document or IndexedDB write occurs. The existing priority order remains **latest picker token → document identity/restore/recovery/conflict → read failure → MIME validation → original node/board**, so a superseded failure remains silent, and stale documents still receive the stronger workspace-change warning. Normal success, the 5 MiB limit and allowlisted media types are unchanged; server model, migrations, D1/R2, permissions, and animation frames are not touched.

**Pre-edit scope:** [`a712b63`](https://github.com/iAlirezaaa/nodus/commit/a712b63eb0972aede2b1494ff6e95efc127932af). Source + six checked-in tests: [`b1e57cb`](https://github.com/iAlirezaaa/nodus/commit/b1e57cb6c2593b39e71b0a220173c8887b1bf1d4), tree `bec64929e85669d9a0bce0d7eed6e34129bccce4`; exact browser fixture extension [`5d1248b`](https://github.com/iAlirezaaa/nodus/commit/5d1248b503d842f5b76ba37ceaa4c0e7c3012571), tree `bd0d0807c9c2eeba2390ac707c47e9b8ac0245b1`.

## Reproduction and verification

**Source-exact RED → GREEN in V8 before source write:** prior handler showed an inaccurate unsupported-format message for a read error; an abort had no `onabort` callback; a synchronous read error rejected the handler. The changed exact handler returned the localized retry notice in **3/3** cases and **0 writes**. Five checked-in cases also executed **5/5 source-exact** in the available V8 harness (read error, abort, synchronous throw, superseded failure, ordinary success); the sixth checked-in test checks inline syntax and CSP with Node crypto.

**CI [GitHub Actions #44257454546](https://github.com/iAlirezaaa/nodus/actions/runs/44257454546)** on exact source SHA `5d1248b503d842f5b76ba37ceaa4c0e7c3012571` finished **SUCCESS** on 2026-11-18:
- **327/327** native checked-in Node tests **pass**, 0 fail, 0 skipped (not the historical 205 or prior 321).
- Project TypeScript `tsc --noEmit` **PASS**; production `npm run build` **PASS** (build only, not deployment).
- **12/12** real Chromium/IndexedDB **Pages fixture** scenario groups **PASS** on the required **http://127.0.0.1:4173/**. Added real browser `FileReader` abort/error/throw scenarios show the retry toast with **0 workspace puts, 0 new Undo, unchanged JSON and clean unsaved flag**; previous Persian Unicode, ordinary Enter/Tab, synthetic composition, Escape/focus, two-tab reload/stale-save refusal, restored-document media guard, calm/off/reduced-motion zero writes, desktop/390px FA/EN RTL/LTR all remain passing. No page errors.
- Six real 1440×900 / 390×844 PNGs in [artifact **#14407181374**](https://github.com/iAlirezaaa/nodus/actions/runs/44257454546/artifacts/14407181374): `nd024-fa-desktop.png`, `nd024-en-desktop.png`, `nd024-fa-mobile-390.png`, `nd024-en-mobile-390.png`, `nd024-media-stale-restore.png`, **`nd024-media-read-failure.png`**. The new failure screenshot and FA 390px screenshot were downloaded and visually inspected; the toast is visible. Mobile Fit still shrinks labels (~35%), tracked separately as ND-025.
- Inline script parsed; independently recomputed CSP SHA256 matched updated script `KXUKZlNN+Ib9e3WLq1aX/lXHXp6pJ7kuy3nWkI+KIlA=`; original digest was checked against unchanged prior script before editing.

## Boundary and publication decision

These screenshots are from the isolated standalone Pages fixture, **not** the authenticated hosted Nodus Site, two real user accounts, a physical Persian IME or touch device. Native Sites skill list is empty, connected Browser lacks originating context, local container has no listener at 127.0.0.1:4173 and public web access to the hosted Site failed. **Current Site HEAD/tree/version/audience and live account permissions remain UNVERIFIED; independent integration review NOT RUN.** Therefore **no merge to main or Site deployment**; Site deployment/version ID **NONE**, owner data unchanged. GitHub still reports visibility **public**, despite requested private target; permissions were not modified.

**Next:** obtain authorized native Sites source/tree and audience, compare actual tree contents to main and feature without overwriting concurrent work, test hosted save/reload and real permission/revocation in two authorized sessions, obtain independent review, and only then guarded integration/publication. Continue ND-025 mobile legibility separately after release gates.
