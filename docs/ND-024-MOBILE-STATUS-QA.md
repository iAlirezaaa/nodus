# ND-024 — Mobile storage warning and local-only notice (branch-only)

Date: 2026-11-18 19:33 UTC. Status **In progress**, original hosted Site **Blocked / not released**.

## Issue and acceptance

Review of the previous [390px versionchange screenshot](https://github.com/iAlirezaaa/nodus/actions/runs/44369717643/artifacts/14458393838) identified tiny, single-line, clipped storage guidance exactly when users must export JSON before reloading. The existing `#local-banner` simultaneously holds a local-only privacy notice and a save status, with fixed height and nowrap. Acceptance: display both complete lines without horizontal overflow at 390px, status >=12px and visible, workspace begins immediately below the variable banner and stays within viewport; do not change stored data, keyboard/selection, Undo, CSP security or live Site.

## Implemented

- Continue `fix/nd-024-startup-storage-recovery`; [scope logged beforehand](https://github.com/iAlirezaaa/nodus/commit/6f67eaffb0e6b9197d835d7a35759846df1a00f5), code [`ae2add5109aaaaf0cdc2ebea97048431c01b7ac4`](https://github.com/iAlirezaaa/nodus/commit/ae2add5109aaaaf0cdc2ebea97048431c01b7ac4) tree `e2ebbee007b71b91fea836dae2cab14df293e3b3`.
- `pages/index.html`: mobile `#shell` flex column, expanding `.local-banner` with wrapping privacy/status, status 12px, fill remaining `.workspace`, sidebar anchored inside it. Retain existing `aria-live`; no JS or persistence changes. Inline CSS SHA-256 changed to `/LY+2CXv76p6tOGSdm7As89zme/vVL7BnyNjNbuefd4=`; old and new SHA independently re-evaluated against embedded bytes before push; script hash unchanged.
- `tests/browser/nd024-pages-browser-smoke.mjs`: added source-executed Chromium layout assertions after real two-tab IndexedDB upgrade: both spans normal whitespace, no clipped scroll area, status >=12px, canvas under banner, viewport and document width valid.

## Evidence and limitations

[GitHub Actions #44379603622](https://github.com/iAlirezaaa/nodus/actions/runs/44379603622) **completed success** on exact code SHA: **393/393 checked-in native Node tests**, project `tsc --noEmit` PASS, production build PASS, **19/19 actual Chromium groups** on reserved `http://127.0.0.1:4173/` PASS; browser fixture creates two distinct tabs, not two actual authenticated accounts. Existing smoke covers keyboard Enter/Tab/Escape, simulated IME (not physical), IndexedDB save/reload and two-tab conflict, FA/EN desktop/mobile, magnetic calm/off/reduced and zero document writes. CSS change adds no motion, frame writes or storage mutations. 

[17 actual PNG screenshots](https://github.com/iAlirezaaa/nodus/actions/runs/44379603622/artifacts/14463367645) captured by CI. Individually **opened and visually inspected** `nd024-indexeddb-versionchange-fa-mobile.png` (390×844 Persian: full local-only note and two-line IndexedDB warning readable; canvas and Details intact) and `nd024-en-mobile-390.png` (English privacy/status text wraps and no horizontal overflow). No live Site screenshot, native physical IME or authenticated two-user permissions test; independent integration review outstanding.

Original Site `appgprj_6af58606fb9c81918541f056a898c1a2` head/tree/audience were **not accessible via current Sites skills** (skill registry empty), so parity and audience preservation cannot be verified by a native Site read; no Site write attempted. GitHub `main` HEAD `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`, unchanged; GitHub visibility reports public despite intended private, settings unchanged. Deployment/version **NONE**. No PR merge. **Next:** original Sites head/tree/audience, genuine 2-account membership and independent review before release; then separate ND-025 node Fit readability.
