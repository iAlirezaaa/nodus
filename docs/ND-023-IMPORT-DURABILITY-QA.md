# ND-023 — durable backup import (branch-only, no publication)

Date: 2026-11-17 00:16 UTC · run `nodus-auto-20261117T001041Z-nd023-gates`
Scope committed before edits: [db730356c](https://github.com/iAlirezaaa/nodus/commit/db730356c22b4ecb90c8bcc7f01aa5c085f9c36a)
Code + focused regression: [fb8edee4](https://github.com/iAlirezaaa/nodus/commit/fb8edee47a32f159665331c09ee2e34f9aefc20e); source tree `6330d4ed275098f0cb8f0923e1e5ed93e4ba84f1`.

## Defect and actual change

The static Pages import previously assigned a confirmed JSON backup to `state.doc`, cleared redo, showed success, and queued a best-effort save. IndexedDB can reject that save, so reload could silently restore the older graph; a previously queued snapshot could also race an import. This can mislead a user into believing a backup was recovered. This is local-first Pages logic, **not** the original authenticated Nodus Site or D1/R2 persistence.

The new `restoreLocalDocument(parsed)` waits for `state.saveQueue` and `await persist(copy(parsed))` before changing the in-memory graph. A failed transaction preserves document, current board, selection and Undo/Redo and reports an explicit failure. Edit/Undo/Redo paths check `state.restorePending` to prevent queued edits from overtaking the import; concurrent imports are refused. A successful import creates one Undo snapshot, clears redo and stale board/selection/magnet view, then reports success. IndexedDB database `nodus-pages-v1`, schema v1, import/export JSON format, media limits, keyboard shortcuts and FA/EN dictionary are unchanged.

Source: `pages/index.html` blob `9dd1934cff8b42108f3e211228723199176b9359`; native regression `tests/pages-import-durability.test.mjs` blob `1999dc5e7aab2dd94530bbb59cc570e75872f5d5`. Exact extracted restore helper is 1045 characters, FNV-1a `90e10873`, matching separately executed local fixture. CSP `script-src` hash updated and verified in reconstructed source to `sha256-Pgmj/tXIa5Vpx2EzP7TOFEFcY7siL4AjWZuiSK4SMMA=`; single inline script compiles in V8. No external scripts, backend, secrets, network writes or user storage migration added.

## Tests performed **this** run

- Node 22.16.0: **5/5 PASS** with a locally constructed fixture containing the exact 1045-character restored helper plus edited mutate/Undo/Redo lines. Covers success, rejected IndexedDB transaction, pending write order/edit race, rejected previous save, duplicate import. This is not a native run of the checked-in file against the full HTML; distinguish it from that.
- Independent Code Mode V8 evaluation: **5/5 PASS** using functions extracted directly from the committed GitHub `pages/index.html` (success/one Undo; failed-save state preservation; pending write and edit/Undo/Redo guard; previous save rejection; duplicate import). Full inline JS syntax compiled successfully. CSP digest was recomputed from the exact inline script during commit and self-checked; original storage identifier still present.
- **Not run / Blocked:** checked-in native test against full 80 KB bundle, full React Node suite (historic 205 is not a current result), TypeScript 5.9.3, original production build. This container could not resolve `github.com` for a real repository checkout; no source tree or installed dependencies were mounted.
- **UI / data gate Blocked:** no genuine Nodus dev server at `http://127.0.0.1:4173/`; port was vacant but no complete source checkout could be started. Connected Browser cannot read tabs without originating extension context. No current-run real browser screenshot, IndexedDB persist/reload, FA/EN 390px/desktop/IME interaction or live Site check. No two real authenticated accounts were tested; this feature does not add collaboration.
- GitHub source `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Pages production branch remains `gh-pages@099b9755292a00f4aecdee2c06d4c0007a886678` (older version, previous successful Actions run 43968961185). The original ChatGPT Site `appgprj_6af58606fb9c81918541f056a898c1a2` source/tree/audience was NOT readable; no Site operation or publication was issued. Repository visibility observed **public**, contrary to private scope description; not modified.

## Release decision

**ND-023 remains In progress. New code is NOT active in Pages or ChatGPT Site.** GitHub branch only. Screenshot: none from this run. Deployment/version ID: none. Do not mark Verified or Released until checked-in native tests, TypeScript/build as applicable, actual 4173 browser/IndexedDB reload and independent review pass; reconcile Sites source and audience before any original Site publication.

Next: recover a genuine source checkout without disturbing other projects; run `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, `tsc --noEmit`, build and the new checked-in test; exercise failed/success import on 4173 and reload using real IndexedDB in FA/EN desktop/mobile, then review guarded release.
