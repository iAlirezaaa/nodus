# ND-024 — Search dialog Tab containment (2026-11-17)

## Pre-edit scope · In progress / release Blocked

Run: `nodus-auto-20261117T151621-nd024-qa`. Source branch: `fix/nd-024-startup-storage-recovery`, observed HEAD `c4af18b7915f8649de0d613186472bb55a75dd92`, tree `1318330ab49a60a613de2a4d56f1f4576441be3f`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current Site head/tree/audience: **UNVERIFIED** (Sites skill unavailable); Site and owner data are not to be modified.

**Problem:** Search has `aria-modal=true`, yet pressing Tab from its last result or from the input when no results exist escapes into background controls; Shift+Tab from Close can likewise leave the dialog. Background graph shortcuts may run while the dialog is visible if focus escapes. This is a keyboard/focus regression, independent of stored document data.

**Acceptance:** Tab and Shift+Tab wrap among the dialog's enabled controls, including dynamically rendered search results; a stray external focus is recovered; Escape restores prior focus, result selection maintains destination focus, input Enter/IME remains native. No graph writes or undo changes; source-exact old/new behavioral tests, JavaScript syntax, CSP integrity, native test attempt, TypeScript/build, real 4173 browser desktop/FA/EN/mobile screenshot remain individually recorded. Block release if latter gates unavailable.

**Slice:** Continue this branch, implement a bounded keyboard-only focus trap in `pages/index.html`, add source-exact regressions to `tests/pages-search-focus.test.mjs`. Update roadmap, log and QA; no main/Site publishing without full gates.

**Initial QA:** no tests yet this run. Screenshot: NONE. Deployment/version: NONE. Real authenticated user/two-account evidence: NONE.

## Implementation and verification — 2026-11-17 15:24 UTC

**Delivered on branch only:** [`3c75b004`](https://github.com/iAlirezaaa/nodus/commit/3c75b00437ee624109f9ac5d01099aefc587fbb7) introduced `trapSearchTab(e)` in the optional local-first `pages/index.html` Search dialog. Tab/Shift+Tab at the edges of enabled dynamic search controls wrap inside its accessible dialog; a focus escape gets a safe in-dialog fallback. Native Escape, result selection, Enter and composing Persian IME retain their existing behavior. Independent review found a browser shortcut boundary: [`d42b21eb`](https://github.com/iAlirezaaa/nodus/commit/d42b21ebc60379931f34e93a59d9e0e0cf6d7599) excludes Ctrl/Meta/Alt+Tab from the trap and adds one regression. Current source tree `6016ccb4e1656a935b8bd41bedc332579dac50a5`, HTML blob `e65459bec32a2cb07e8853f764c0fa7b5e0f6ca9`, test blob `2cc17907ccc0b9c5e74409f5d651b3e915a934d9`.

**Observed tests (this run, not historical):**

- Prior exact handler left Tab unhandled in three edge cases (no results/Shift+Tab from Close/two-result last item), **3/3 RED**; patched handler intercepted all three, **3/3 GREEN** in isolated JS V8. Enter/IME were not intercepted. A further modifier simulation found Ctrl/Meta/Alt+Tab untrapped after the review fix, while plain Tab still trapped.
- The **12/12 checked-in `tests/pages-search-focus.test.mjs` test bodies** executed against the exact fetched final GitHub HTML + test source in isolated V8 with substituted Node test/assert/fs/crypto interfaces; the crypto facade used the separately computed final digest, so this is **not** a native Node test run or an independent crypto implementation inside the test runner.
- **9/9 native Node.js 22.16.0 isolated helper tests** executed in the local container against the exact extracted `trapSearchTab` source with FNV-1a fingerprint `edd3eac2` verified against the fetched GitHub blob. Scenarios: empty and populated result wraps, dynamic list changes, external focus recovery, disabled results and native interior Tab. The temporary test harness initially had a `const` reassignment error (8/9); after fixing only the harness, 9/9 passed. The checked-in suite itself could not be materialized and run natively.
- Complete inline JavaScript compiled with `new Function`; independent pure-JS SHA-256 recalculation matched the checked-in CSP `sha256-05WFYH1bhB+p35Av23KAK6OkvpGGSaSHRJvpJ+k9k3c=`. No document, undo, persistence, background animation, layout or collaboration code changed.

**Blocked release gates:** Full native source checkout via `git ls-remote` failed to resolve `github.com`; native checked-in test file, full test suite, project TypeScript and production build **NOT RUN**. `curl http://127.0.0.1:4173/` connection refused; therefore no real FA/EN 390px/desktop Tab or IME browser verification and **NO SCREENSHOT**. Real IndexedDB two-tab/reload and separate-account evidence **NOT RUN**. The read-only connected browser requires an originating browser context, and no current Sites skill is available; Site source HEAD/tree and audience parity are **UNVERIFIED**. GitHub repository visibility returned `public` despite the owner's private designation; no permission changes were made.

**Status:** ND-024 **In progress**; release gate **Blocked**, not Verified/Released. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). Original hosted Site, gh-pages and user data untouched. Deployment/version ID: **NONE**. Next: native checked-in tests + project TypeScript/build, isolated 4173 desktop/mobile FA/EN browser focus/IME screenshot, real IndexedDB two-tab/reload, authorized Sites tree/audience parity and independent verification before any guarded merge or publication.
