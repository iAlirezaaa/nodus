# ND-024 — warn before leaving with unsaved local edits

**2026-11-17 09:17 UTC** · branch-only, **In progress / release Blocked** · run `nodus-auto-20261117T091138Z-nd024-native`.

## Reproduced risk and bounded fix

Prior exact local-first source `bbd72e0f646aa61155766e76afa0e4636040f092` had no `beforeunload` warning or durable acknowledgement tracking after an edited graph. A failed IndexedDB transaction left the newer graph only in memory, and closing/reloading could discard it without confirmation. This affects the optional GitHub Pages/local-first edition, **not the authenticated server-backed Site**.

Code commit [`c0a29901`](https://github.com/iAlirezaaa/nodus/commit/c0a29901a610cde8b58a3775a2a147cd025f4e00), tree `456f3a4cd0c7e276064311a932e907083b72aff0`, `pages/index.html` blob `2efa3b77ecd662084397593c0f1bcf6bed60c92d`, checked-in regression blob `1a0cca81467a0f92d50eb1fe76d4f33c86c1cfae`.

- Mutations, Undo and Redo mark the current document as unsaved. Native browser `beforeunload` confirmation is requested only while unsaved; a clean opening does not prompt.
- A save acknowledgement clears the dirty flag **only when the saved snapshot still matches the latest in-memory graph**. Acknowledging an earlier queued write cannot announce a newer edit as saved. The status remains *Saving…* until the newest matching save succeeds.
- A failed write keeps the warning and leaves current document, Undo and normal JSON Export available. Export does **not** silently mark a failed write as saved. Save retry can clear the warning after an IndexedDB success. Committed import/recovery replacement clears the flag after durable completion.
- No persistence schema, auth, board graph, keyboard, animation, CSS or security policy relaxation. Existing FA/EN text remains unchanged; the actual exit dialog wording is browser-controlled.

## Verification and release gates

- **Before:** source inspection verified no unload warning or tracked acknowledgement state; the existing failed-save behavior is covered by the preceding QA and is not newly re-labeled as a test pass.
- **After:** 15/15 exact-committed-source V8 behavior assertions **PASS**: clean/no prompt; edit/pending warning; first queue start; second edit; old save cannot clear; ordered next write; failed write keeps warning; retry; successful latest acknowledgement; Undo/Redo warning and their acknowledged saves. Full inline JavaScript parsed in V8.
- **CSP:** original source's SHA-256 verified before edit; updated full inline-script SHA-256 recomputed and checked at commit as `sha256-js7ZGLTIba1hWlvNfljSKIQwiTxi0dVyLZG2tLaL+T8=`. No `unsafe-inline` or CSP weakening.
- **New checked-in tests:** three `node:test` regression cases in `tests/pages-startup-recovery.test.mjs`. **Not run with the native test runner**; no full authorized checkout could be obtained because `git ls-remote https://github.com/iAlirezaaa/nodus.git` failed DNS resolution in the available shell. Do not conflate the 15 source-exact V8 assertions with the 3 unexecuted checked-in Node tests.
- **Blocked / not run:** full Node test suite, project TypeScript 5.9.3, production build, genuine `http://127.0.0.1:4173/` local-first app, IndexedDB/reload/browser-native unload dialog, FA/EN/IME/390px screenshot, independent review, two true users. Port 4173 was free; no preview was started or replaced. Screenshot: **NONE**.
- **Sites:** no current authorized Sites skill/action was exposed, so Site head/tree/audience parity remains **UNVERIFIED**. Main `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`), GitHub Pages and hosted Site unchanged. No deployment/version ID; no data migrations. GitHub metadata reports repository visibility **public**, inconsistent with the owner's description **private**; no visibility setting was modified.

**Status:** In progress, branch only / publication gate Blocked, **not Verified or Released**. Next: obtain authorized checkout and Sites source, run checked-in Node tests plus TypeScript/build, use a *real* 4173 browser with failed/slow/successful IndexedDB writes and reload, capture screenshots as applicable, independently review and reconcile Site tree/audience before any guarded merge or deployment.
