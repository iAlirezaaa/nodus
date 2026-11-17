# ND-024 — queued-save acknowledgement and safe import (branch only)

**2026-11-17 08:25 UTC.** Status: **In progress; release gate Blocked**. Existing branch `fix/nd-024-startup-storage-recovery`. Scope was committed before source edits (`76fe61d0aa44a2c1dfb45823780ef0edd5b06dd1`, tree `a144193ec379c90b12365c0000f3140a5ef20052`). Source commit [`48a96d148907`](https://github.com/iAlirezaaa/nodus/commit/48a96d148907f3fdb45ef737d63ee3e26dcf354f), tree `ae3d6a4b9eac8241fcb614376ef109f9a0327a6f`; HTML blob `bbd72e0f646aa61155766e76afa0e4636040f092`; test blob `01ea998276ba2f6d40c4e50b62868c60da83f3aa`.

## Demonstrated failure (old exact branch source)

`queueSave` swallowed an IndexedDB persistence failure and resolved its promise with `undefined`, indistinguishable from an acknowledged queue outcome to `restoreLocalDocument`. The old import path persisted a replacement workspace even though the previously edited graph was not durably saved. Deterministic, source-exact V8 reproduction: simulated rejected persistence -> `queueSave` result `undefined`; import returned `true`, issued **one new write**, and replaced the in-memory graph. The Details Save button also showed `Saved` immediately without awaiting the queued persistence result.

## Implemented

- `pages/index.html` `queueSave`: explicit `true` only after IndexedDB write acknowledgement; explicit `false` on persistence failures. Retains failed in-memory work, prior Undo, localized error status and toast, and serialized save order.
- `restoreLocalDocument`: ordinary (non-quarantine) Import aborts on the latest `false` queued-save outcome *before* overwriting any data. It preserves document, selection and Undo, and tells the user to retry Save first. The separate ND-024 raw-backup guarded recovery transaction is unchanged.
- The existing Details **Save** button waits for the pending edit commit's queue; if no new edit was enqueued, it retries persistence of the current document. A failed write is no longer announced as saved; success appears only after acknowledgement. Persian/English strings retained.
- Four `node:test` regression cases were appended to `tests/pages-startup-recovery.test.mjs` for failure result, import blocking, retry then import, and delayed Details Save success/failure.

## Actual checks and limits

- **Red/green V8 source-exact:** old failed save gave `undefined` and allowed one unsafe import write; patched save gave `false`, blocked import with **zero writes**, and retained original memory and Undo.
- **After fix:** 6/6 deterministic source-exact V8 checks PASS (failed save, save retry, blocked import, acknowledged import, serialized latest snapshot, and truthful deferred Details Save). The UI button was also exercised for both `false` and `true` outcomes. Full inline JavaScript parsed via `new Function`.
- **CSP:** independently recomputed SHA-256 of the exact full inline script, confirmed the old header matched its original body, and set/verifed the new digest `sha256-/bF4XhACWndf43FlNwsz4/0si3epZ0NsttfMEEYoN0I=`. No CSP relaxation.
- **Not run:** the four newly checked-in native Node tests, the complete Node suite, TypeScript 5.9.3, production build, actual IndexedDB and reload at `http://127.0.0.1:4173/`, FA/EN keyboard/IME/mobile screenshot, independent review, and two real authenticated users. Native `git ls-remote` still fails DNS resolution; no full repository checkout was obtained. Browser fixture tests from previous runs are historical, not repeated.
- **Sites:** current Site version/HEAD/tree and audience are **UNVERIFIED** because no authorized Sites skill/action is available in this execution. The `main` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` and protected audience were not modified. GitHub reports the repository as `public` despite the description `private`; visibility was not changed.

**Publication:** NONE — no main, gh-pages, hosted Site, deployment ID or new version; screenshot **NONE**. **Next:** retrieve a complete authorized checkout, run checked-in tests, TypeScript/build and actual 4173 IndexedDB save failure/retry/import with reload and FA/EN 390px screenshots; independently review, compare current Sites tree/audience and only then guarded integration and publication. Ordinary two-tab concurrent local-first writes remain out of scope; this slice does not claim general multi-tab conflict protection.
