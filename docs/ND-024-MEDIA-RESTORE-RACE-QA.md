# ND-024 — media read cannot attach to a replaced workspace (branch only)

**Date:** 2026-11-18 UTC. **Run:** `nodus-auto-20261118T0510Z-nd024-verified-browser-gate`. **Status:** **In progress / production release Blocked**, not Verified or Released. Change is limited to optional **local-first GitHub Pages** edition, *not* the authenticated hosted Nodus Site.

## Actual regression and implementation

In **Details → Media**, a FileReader was started for selected thought A. While its data URL was pending, the workspace was replaced with another document containing the **same node ID A** and same active board. Before this patch, the old callback attached media to restored A, resulting in **one unintended mutate/write** despite unchanged selected ID and board ID. This was reproduced against the previous source-exact handler before code editing (RED 1 unsafe attachment).

At the initial picker event, the `pages/index.html` handler now captures `state.doc` identity together with the existing selected thought, board and per-picker token. After FileReader resolves, it refuses stale results if the document instance changed, a restore is pending, storage is in recovery or the tab entered a conflict. It shows a localized FA/EN retry message without calling `mutate`; the existing latest-choice-first token still prevents older reads from winning. Stable selection still attaches one file. No model/migration, app-server, provider permissions, animation frame, UI layout or new control was introduced.

- Pre-edit scope and RED report: [`9ae9f352`](https://github.com/iAlirezaaa/nodus/commit/9ae9f3520687ae18317aac046076993400f0486c).
- Source fix and eight native regression tests: [`41a1b9c6`](https://github.com/iAlirezaaa/nodus/commit/41a1b9c671941992142eb5a2dd3e856fa5edf46f), tree `16d5f9a879d62c0ef58993209ec44d3f9ce8812c`.
- Added real Chromium race test and fifth screenshot: [`2c17860f`](https://github.com/iAlirezaaa/nodus/commit/2c17860f4dd3816d4acd4617784b79e984bf0c39), tree `c16a6497e93ba059dac2552ebfbb548d1a48b1b9`.
- Exact Pages source blob `44eaca31fe99a62c35910a6d331a86988f180700`, new Node regression blob `e91086fec1ab13b0ecc2cfb504fba09cae9ce08b`; inline JavaScript parsed successfully, updated CSP SHA256 `fAAanVZEOIXjvY4vWmlPO1bq1NCyABnB75RAsqNeQcs=` independently matched source bytes.

## Actual verification on final code/test SHA

[GitHub Actions #44243401011](https://github.com/iAlirezaaa/nodus/actions/runs/44243401011) finished **success** for exact SHA `2c17860f4dd3816d4acd4617784b79e984bf0c39`.

| Gate | Observed outcome |
| --- | --- |
| Native checked-in Node tests on Node 24 | **321/321 passed**, 0 failed, 0 skipped. Eight additional tests cover stable attachment, restored/edited document with reused node ID, restore, recovery, conflict, last-picker-wins, JS/CSP. |
| Project TypeScript | **PASS**: `./node_modules/.bin/tsc --noEmit` |
| Production build | **PASS**: `npm run build` (build only; no deployment) |
| Isolated, real Chromium at `http://127.0.0.1:4173/` | **11/11 scenario groups PASS**, no page errors. New delayed FileReader test confirmed 0 stale attachment, 0 extra Undo entries, 0 `workspace` IndexedDB puts, and unchanged `unsavedChanges`. |
| Existing 4173 regressions | Real fixture tabs: IndexedDB save/reload/stale-tab write refusal, Unicode Persian edit, Enter/Tab, Escape/Undo/focus, **synthetic** composition, FA/EN 1440px and 390px RTL/LTR, no outer overflow, calm/off/reduced-motion preview without workspace writes. |
| Screenshots | **5 real Chromium PNGs** collected as [artifact #14401346251](https://github.com/iAlirezaaa/nodus/actions/runs/44243401011/artifacts/14401346251): `nd024-fa-desktop.png`, `nd024-en-desktop.png`, `nd024-fa-mobile-390.png`, `nd024-en-mobile-390.png`, and new `nd024-media-stale-restore.png`. New screenshot and FA mobile were visually inspected; new screenshot shows localized stale-workspace notice and unchanged selected thought. |
| Authentic hosted Site | **UNVERIFIED/BLOCKED**: no Sites source head/tree/version/audience read, hosted runtime browser QA or authenticated two-account conflict/permission test. |
| Physical Persian IME/touch and independent integration review | **NOT RUN**. Prior synthetic composition and emulated mobile are not real-device evidence. |

**Observed remaining design issue:** FA 390px Fit view still shrinks nodes to ~35% and obscures titles; some controls remain mixed-language. It remains independently tracked as **ND-025**, not fixed here. Hidden-page motion suspension was not newly measured; unrelated motion code was not changed.

## Publication and next step

GitHub `main` `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`, **unchanged**. Site `appgprj_6af58606fb9c81918541f056a898c1a2` head/tree/audience/version **UNVERIFIED**; native Sites skill unavailable and Browser connector required originating context. No merge, deploy or published version ID (**NONE**). Owner data untouched. GitHub reports visibility **public** despite private target description; no permission change performed.

Next: recover authorized Site source/audience and compare its **content tree** to GitHub without assuming commit-history parity; verify hosted save/reload and account access, obtain independent review, then decide on guarded main merge and Site publication. Keep this ND-024 work **In progress, branch only** until all release gates pass.
