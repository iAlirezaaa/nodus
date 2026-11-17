# ND-024 — distinguish absent IndexedDB key from present undefined value

Run: `nodus-auto-20261117T0312Z-nd024-native-gates`, 2026-11-17 03:14 UTC.

## User-facing defect

The static GitHub Pages loader in `pages/index.html` used `get('main').result === undefined` to mean no record existed. IndexedDB `put(undefined, 'main')` is a valid structured-clone record, and `get()` returns `undefined` for **both** present-undefined and missing keys. Previously a present corrupt record was treated as a fresh editable graph; a later edit could overwrite it. This is a local-only Pages issue, not the authenticated React Site.

## Slice and safety

- `load()` now calls `getKey('main')` **within the same readonly transaction** only when the initial `get('main')` result is undefined. A truly absent key opens the original blank workspace.
- If the key exists but value is undefined, validation raises `CorruptWorkspaceError`. The existing recovery modal and save/Undo lock remain active. Read and key-probe errors also fail closed instead of being considered missing.
- No storage schema, key, DB name, write format, auth/access control, media, layout, graph, animation or server API change. No data migration or deletion. Existing recovery JSON export intentionally refuses an undefined raw value; the record stays intact, with no destructive reset enabled pending a safe supported recovery path.

## Verification recorded in this run

| Check | Evidence / result |
| --- | --- |
| Node v22.16.0 targeted native behavioral harness against old loader from GitHub | **3/5 PASS, 2/5 RED** as expected: present undefined wrongly returned blank, failed key probe also returned blank without checking |
| Node v22.16.0 native targeted harness on exact replacement `load()` function text | **5/5 PASS**: missing key, present undefined, valid workspace, malformed null, failed key probe. Test harness: `/mnt/data/nodus_nd024_verify/load_regression.mjs` in this execution environment; not a full app checkout |
| Checked-in regression | Added two cases to `tests/pages-startup-recovery.test.mjs`, updated IDB mock to implement `getKey`. **Not run with the native repository test runner** (checkout unavailable) |
| Inline script CSP | Previous committed script SHA-256 independently recomputed and matched `bRaPLVx0vbm5sPN/LBeIPekYEfmT5/kZkXloTdAI1SA=`. Regenerated source CSP as `lgcTAJAM9DG/EmyLV5DW2MP8TWjgnhI09THYo950yYc=`. No CSP relaxation |
| Source commit/tree | `4271ccc3b59407e3b2b68fb6730067c35f54f9f9` / `2d434e62c70b0111776ad7eb2e3873a74dd3cb75` |
| TypeScript 5.9.3, full Node test suite, production build | **NOT RUN** (remote source checkout unavailable; local `git ls-remote` fails GitHub DNS) |
| Real `http://127.0.0.1:4173/` desktop/390px, FA/EN, IndexedDB reopen, IME and screenshot | **BLOCKED**: port 4173 was free, but no genuine source checkout/server. No fresh screenshot and no claim of actual IDB persistence |
| Hosted Site source/head/tree/audience and authenticated sessions | **UNVERIFIED**: Sites connector requested interactive authorization in unattended mode; no deployment attempted |

## Status and next checkpoint

**In progress — branch only; NOT Verified, NOT Released.** Branch `fix/nd-024-startup-storage-recovery`, parent branch `feat/nd-023-github-pages-local-first`. `main` `26fafac05c320ed5db30a0ee908dd816714acdd9` (tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`), `gh-pages` previously deployed `099b9755292a00f4aecdee2c06d4c0007a886678`, and hosted Site have not been changed. No new deployment/version ID. Next: obtain repository checkout, run checked-in Node suite + TypeScript/build; verify **real** IndexedDB (missing and present undefined) with actual FA/EN 4173 browser and screenshots; independent code review and source-tree/audience reconciliation before guarded release. Preserve any invalid raw records; do not force a destructive reset.
