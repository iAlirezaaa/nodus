# ND-024 — actual 4173 Chromium/IndexedDB browser gate

**Status:** Browser fixture gate **PASS** at [GitHub Actions #44235991612](https://github.com/iAlirezaaa/nodus/actions/runs/44235991612), source `dcf857865ccbfbc40819020ee798a6c18ea7c091`, tree `2347bd7b86471c0bf6c9f1dac1aac82890759466`. Overall **ND-024 In progress / release Blocked**, not Verified/Released; no main or Site publication.

## Scope and implementation

This workflow verifies the self-contained **GitHub Pages local-first fixture**, not the authenticated hosted Nodus Site. It serves the checked-in `pages/index.html` on **`http://127.0.0.1:4173/`** in isolated headless Chromium; refuses to take an occupied 4173. Script: `tests/browser/nd024-pages-browser-smoke.mjs`. Node 24, Playwright 1.56.1 installed only on the runner, no lockfile/source/deployment change. UI additions on `dcf857865c`:

- Explicit FA/EN assertion and real PNG at **1440×900** desktop and **390×844** mobile in both directions; prior filename `nd024-fa-mobile-390.png` misleadingly contained an EN screenshot without verifying locale.
- Calm animated magnetic preview + Off + emulated `prefers-reduced-motion: reduce`: **zero IndexedDB workspace puts**, unchanged canonical JSON, unchanged Undo history and no unsaved flag before Apply.
- Screenshot logs count **10 actual scenario groups** (previous version logged nine individual PASS groups but said 10/10).

## Observed results (2026-11-18 UTC)

**Exact new code SHA:** [`dcf8578`](https://github.com/iAlirezaaa/nodus/commit/dcf857865ccbfbc40819020ee798a6c18ea7c091). **GitHub run:** [#44235991612](https://github.com/iAlirezaaa/nodus/actions/runs/44235991612), two completed successful jobs. Native checked-in Node suite **313/313 pass, 0 fail, 0 skipped**; project `tsc --noEmit` **PASS**, production `npm run build` **PASS**. These results are from this run's pushed SHA, not historical 205 tests.

**Chromium browser fixture:** **10/10 PASS** from the real 4173 HTTP origin. Observed FA Unicode title save in IndexedDB; ordinary Enter sibling and Tab child; Escape cancels without Undo/write and returns focus; synthetic composition Enter guard; two actual isolated tabs block stale tab B's write and B reload retrieves tab A's latest committed data; reload consistency; FA/EN 390px RTL/LTR and no document overflow; calm/off/reduced-motion magnetic preview with zero document storage writes or Undo entries. No page errors.

**Screenshots:** Four genuine PNG files, captured and uploaded by the Actions browser job, [artifact #14397672708](https://github.com/iAlirezaaa/nodus/actions/runs/44235991612/artifacts/14397672708) (14-day retention):

| File | Capture |
| --- | --- |
| `nd024-fa-desktop.png` | FA, 1440×900, RTL |
| `nd024-en-desktop.png` | EN, 1440×900, LTR |
| `nd024-fa-mobile-390.png` | FA, 390×844, RTL |
| `nd024-en-mobile-390.png` | EN, 390×844, LTR |

PNG files were downloaded and visually inspected. **Separate observed UX issue:** in 390px Fit, the graph is zoomed to ~35% and node labels are difficult to read despite no horizontal overflow; some fixed project labels and select-option text remain mixed-language in the FA/EN views. Tracked as **ND-025** rather than falsely marking readability fixed.

**Boundaries:** This is two real browser *tabs* using fixture data, **not two authenticated production accounts**, shared server sessions, or a touch device. Composition event is **synthetic**, not physical Persian keyboard/IME. Hidden-page motion suspension has source safeguards but was **not measured** in this run. The browser serves the standalone Pages app, **not** the Site's actual Vinext app; no real Site screenshot/source/audience parity, current D1/R2 account data or permission/revocation checks. The current native Sites skill/action is absent; Browser connector lacks originating context and web Site URL cannot be accessed. No Site head/tree/version or audience claim is possible.

## Release decision

`main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`). Site version/deployment **NONE**, Site head/tree/audience **UNVERIFIED**, independent integration review **PENDING**. No source is merged/deployed. Next: recover authorized Site source+audience access, compare tree content, run hosted runtime/browser and independent review, fix relevant failures, then consider guarded merge/deploy. Separately prioritize ND-025 responsive bilingual legibility based on these real screenshots.
