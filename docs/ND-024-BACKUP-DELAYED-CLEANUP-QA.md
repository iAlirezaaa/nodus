# ND-024 — ordinary Pages backup delayed URL cleanup

Recorded 2026-11-18 UTC; status **In progress on feature branch, not Released**.

## Problem and solution

In the optional local-first Pages Export JSON handler (pages/index.html), the five-second delayed URL.revokeObjectURL call previously threw outside the handler's try/catch if cleanup was denied. The app had already shown a prepared-for-saving message, then surfaced an uncaught asynchronous exception. The existing raw-recovery export was guarded; ordinary export was not. Now delayed cleanup catches the error, the removed anchor reference is cleared, and failure to schedule cleanup triggers existing synchronous URL revocation and a bilingual retry notice. No document, IndexedDB, Undo, conflict status, schema, shortcut, layout, animation, or auth change.

## Exact verification

- Scope first: https://github.com/iAlirezaaa/nodus/commit/fe4f09f02c5d971b45b9db752d4aef1e4eed9d47
- Code and two regression tests: https://github.com/iAlirezaaa/nodus/commit/6743e4bac0369ecea858494bf80a4c3ed2e3b915 ; tested code tree d947946b760e9ba1f3dea7e0d0bdd82e57da4476 ; files pages/index.html and tests/pages-backup-export.test.mjs.
- Source-exact isolated JavaScript old/new case: old handler throws when scheduled revoke rejects; modified handler does not. Script syntax and Content Security Policy SHA256 checked; new digest jiyIwjO5qWaxmAM59OKbg4+Z1yPE3G05sQzO8zdQo8c=.
- GitHub Actions https://github.com/iAlirezaaa/nodus/actions/runs/44293145237 on exact code head: **364/364 native checked-in Node tests PASS, TypeScript PASS, production build PASS**. Two new tests cover asynchronous revoke denial and synchronous timer scheduling denial. Historical 362/362 and 205 are not today's counts.
- Browser 127.0.0.1:4173 (real Chromium but separate Pages fixture): **PASS (counts pending log inspection)** at QA commit; no new browser screenshot claimed as reviewed. Existing broader fixture covers FA/EN, 390px/mobile emulation, save/reload/two tabs, keyboard and motion; this is NOT two logged-in production users.

## Publication gates

Blocked: native Sites skill list is empty, so hosted original Site HEAD/tree, current source version, audience and independent two-real-account authentication/permissions checks cannot be inspected. No independent integration review. GitHub reports this repository as public, contrary to intended private scope; access unchanged. Main 26fafac05c320ed5db30a0ee908dd816714acdd9 tree cf93a13f4c7da2530b9ff07efba74daf5b20a618 remains unchanged. Original Site appgprj_6af58606fb9c81918541f056a898c1a2, audience and owner's data untouched; **no deployment/version ID**. Next: inspect Site tree and permissions with authorized tool, reconcile remote changes, review independently, then guarded merge/publish; ND-025 mobile clarity queued.
