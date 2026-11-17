# ND-024 — Search-dialog focus restoration (pre-edit scope)

Run: `nodus-auto-20261117T1320Z-nd024-native-gates-11`; 2026-11-17 13:23 UTC. Status: **In progress**; release **Blocked**.

## Baseline and boundary

- Branch: `fix/nd-024-startup-storage-recovery` at `18e6cb161380c9485eded6dbdd0a7774a4651bbc`; tree `f3f985e97fd44efb1544ce65dc6827291ac671ee`.
- Main: `26fafac05c320ed5db30a0ee908dd816714acdd9`; tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Site project `appgprj_6af58606fb9c81918541f056a898c1a2`: source head, tree and audience unverified; **do not publish** without authorized Sites checks.
- Full native checkout blocked by container GitHub DNS; `127.0.0.1:4173` connection refused. Current Sites skills unavailable; browser connection requires initiating browser context. No screenshot/real IndexedDB evidence.

## User problem and evidence to reproduce

The Pages search dialog closes with `hidden=true` on Escape, Close, and backdrop. Keyboard focus can remain on its now-hidden search input/Close button. Graph shortcuts and Tab flow then become confusing or inaccessible even though the modal is no longer visible. Opening search from a focused graph card and returning to it needs to preserve the card context without unexpectedly moving the canvas.

## Acceptance

1. On Escape, Close or backdrop, focus returns to the opener if still mounted, or the corresponding current card if rerendered, or a safe visible graph/toolbar fallback.
2. Selecting a search result retains its existing behavior: navigate to its nested board, select it, and focus it; do not restore the old opener after selecting a result.
3. Repeated opens/closes leave no stale focus target; no document writes purely for focus. Native button/Tab/IME shortcuts, selection, pan/drag, Undo, FA/EN and 390px behavior remain intact.
4. Source-exact red/green focused test with a checked-in regression. Confirm entire inline JS syntax and CSP digest. Native full suite, project TypeScript/build, actual 4173 browser and screenshot, real IndexedDB, independent review and Sites parity are separate release gates.

## Bounded slice

Continue `fix/nd-024-startup-storage-recovery`; change only search-dialog focus lifecycle in `pages/index.html` and add `tests/pages-search-focus.test.mjs`. Keep recovery logic, persisted schema, public gh-pages, hosted Site, main and owner data unchanged. No publication without complete gates.

## Pending verification

No test pass or deployment claimed at scoping. Screenshot: **NONE**. Release version/deployment: **NONE**.

## Implementation and isolated verification — 2026-11-17 13:28 UTC

**Product code:** [485e52546abfa5eeaf4d6a05fc6b3bd8e3b31191](https://github.com/iAlirezaaa/nodus/commit/485e52546abfa5eeaf4d6a05fc6b3bd8e3b31191); tree `0c7d1d4c98ec7c6d52d53fc51e1613a2414dcf26`, HTML blob `bb2f76b4ca40024354100581a99dc1c28882a24a`, six new checked-in regression cases in `tests/pages-search-focus.test.mjs` (blob `2ad7f429828dad481000f6b496184592c5b144a8`).

- **Before:** executing the exact prior GitHub keyboard handler with the search modal open closes it on Escape but leaves `document.activeElement` on the now-hidden search input; the Close and backdrop handlers likewise hid the modal directly.
- **After:** `openSearch` captures its visible opener and graph node ID. `closeSearch` restores focus to the corresponding remounted node, original mounted toolbar opener, or a visible fallback. Escape prevents native defaults; Close/backdrop use the same lifecycle. Result selection uses `closeSearch(false)` and retains its explicit new-result focus. No stored document, Undo, layout, authentication, permissions, IndexedDB schema or motion loop changed.
- **Executed:** 6/6 new checked-in Node-style scenarios + 5/5 existing keyboard-context scenarios = **11/11 passed under isolated V8 with Node/test/assert/filesystem/crypto facades** against exact fetched GitHub source/test blobs. Three additional source-focused opener scenarios passed before the commit. This is **not** the native Node.js test runner. Inline JS parsed; independent SHA-256 implementation recomputed CSP `sha256-c2I9lIrmi4L03/a3zJS2vgX+xZLVqvvN99F4/cLn3RY=` and matched the checked-in HTML.
- **Blocked / not run:** full native checkout (GitHub DNS failure), native regression suite, TypeScript 5.9.3, production build, actual port 4173 browser and FA/EN + 390px screenshots, real IndexedDB two tabs/reload, independent interaction review, and current Sites source head/tree/audience. Browser connector needs its originating context. No real two-account tests. **No screenshot.**
- **Release:** none. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, live Site and gh-pages were not changed; source trees between GitHub and Site remain **unverified**. The GitHub API reports public despite the requested private designation; visibility was not changed.

**State:** **In progress** on the branch; **Blocked release**, not Verified or Released. **Next:** native checked-in tests, full TypeScript/build, real 4173 search keyboard+IME and two-tab IndexedDB FA/EN/mobile screenshots; independent review and authoritative Site tree parity, then guarded merge/deployment only on success.

## 2026-11-17T14:16:01.990Z — ND-024 scheduled focus restoration race (pre-edit scope)

- **Problem / red:** If Search opens then closes before the queued requestAnimationFrame callback executes, that stale callback focuses the now-hidden search input, defeating the earlier focus restoration. Source-exact deferred-frame reproduction: after closing focus is on opener, after callback it is incorrectly on hidden input.
- **Acceptance:** A pending frame must not focus hidden Search; a subsequent newly opened Search must still focus its input; Escape, close button, backdrop and result-destination focus retain existing behavior. No document writes, keyboard/IME/Tab changes, schema or collaboration changes. Add a checked-in native Node regression and source-exact red/green check.
- **Slice:** Guard the scheduled focus by current dialog visibility, extend `tests/pages-search-focus.test.mjs`. Reuse `fix/nd-024-startup-storage-recovery`. GitHub feature pre-edit head `931063fa26e843d7af24aebda2906dbcda0d0118`, tree `a314a4e42c1e12a2ad8a81b011cfa90dcb10a62b`; main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Authorized Sites head/tree/audience unavailable.
- **Gates:** In progress, release Blocked. Full native suite, TypeScript, build, real 4173 browser/FA+EN/mobile screenshot, two-tab IndexedDB and Sites tree parity are still required. No Site/main changes or screenshot/deployment claimed.

## 2026-11-17T14:20:15.565Z — late-frame race fix: code and verification

- **Source problem:** `openSearch()` scheduled an unconditional `requestAnimationFrame(() => searchInput.focus())`. A fast Escape/Close/backdrop could hide the dialog and restore focus before the pending callback, then the callback focused the hidden input.
- **Change:** existing Search dialog visibility now gates the delayed focus callback. This does not change Escape/Close/backdrop, result navigation, Undo, keyboard shortcuts, IME handling, persistence or motion state; no new control.
- **Before:** exact prior GitHub open/close source reproduced `opener → hidden input` after a late frame. **After:** opener remains focused on late frame; a subsequent open focuses the search field. Checked-in `tests/pages-search-focus.test.mjs` now includes a deferred RAF regression.
- **Actual pass:** 7 of 7 checked-in Search tests ran under isolated V8 with Node facades using the **new exact GitHub source blob** `1d370b04f1a10321bc82f63483c5fc072f4de7ca` and checked-in test blob `fef4799fc05b18ea7664a7ae44e73d92743293c4`. Inline JS syntax PASS, independent CSP SHA-256 `Z+iTcJWV58eUXrtKfbJ6A/jYKb4imxoFJaU7stctMyM=` PASS. The crypto facade in the V8 Node-style test was not an independent digest test; independent hash computed separately from full script.
- **Commit/tree:** [`e8322de6`](https://github.com/iAlirezaaa/nodus/commit/e8322de64d4ec81aac39a36aa42241a243e1347c), `ca94aa1e52e3fc6eb1db8ae74504e9281b579033`. Scope commit `7fba176e1de856ffdbe030f80cee31554f8de1a3`.
- **Blocked:** No native full checkout or Node runner/TypeScript/build; GitHub DNS failed. Port `4173` refused, no real desktop/mobile FA/EN/IME or screenshot, no real IndexedDB two-tab test, no Sites authorized source HEAD/tree/audience, no independent browser review. These gates are **not passed**.
- **Release:** NONE. Branch-only **In progress**, not Verified/Released. Screenshot NONE; deployment/version NONE. Main, GitHub Pages, hosted Site, owner's accounts/data unchanged.
