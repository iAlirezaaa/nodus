# ND-023 — Restore core Nodus capability in GitHub Pages

Run: nodus-chat-20261116T215438984Z-nd023-parity (UTC). Scope recorded before edits.

Base source branch `feat/nd-023-github-pages-local-first`: `6cb17c1c0ee9396c81bb268ad63fbc5e4f604b03`. Public Pages branch: `gh-pages@4b3ec8839f6bb1f56f2677b5c6c398ad7a4c61bb` with tree `0a75d4de97167cbca38093fef45e4255d67ed100`. Original main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Repository visibility is public, despite earlier plan; do not commit secrets.

## Problem and acceptance
The existing GitHub Pages version has only a simplified subset of Nodus. User wants the capabilities previously available in the main app back, running under github.io only. Full parity includes six graph layouts, live/magnetic presentation, task states/hierarchy, personal color/status, multi-selection and group edits, media/PDF, notes/annotations, nested projects, keyboard, mobile, and graph readability. Shared-room collaboration/auth/cloud sync still require a server and cannot operate on static GitHub Pages. Do not pretend these are restored.

## This run's bounded client-only slice
Implement and verify in the same static GitHub Pages edition: six layout modes (apply layout as one Undo), task status with parent/subtask and progress, multi-selection/bulk delete and color/status, visual identity with node appearance/density and reduced-motion controls, and PDF/media support if backed up safely. Preserve original local IndexedDB snapshots, open nested projects, Enter/Tab and Persian IME; upgrades must accept prior exported JSON, leave unknown unsafe data out, and never contact a server. Real 390px/desktop browser tests, reload, export/import, keyboard, outline path and no horizontal overflow required. Put unsupported complex features on explicit backlog with reasons.

## Release gates
Keep code on `feat/nd-023-github-pages-local-first` until build, Node behavior tests and real browser checks pass; commit to `gh-pages` only a built, self-contained index.html with correct CSP and no secrets. Verify GitHub Actions deployment and public URL, with exact tree/commit IDs; do not touch main, existing Site, other projects or other automation.

Status: In progress. No features claimed released before verification.

## Implementation and verification — 2026-11-16 (second parity pass)

**Static bundle:** `pages/index.html`, exact tested Git blob `4ba369259c2b2830ad88e5ad697ba550134e77a8`. One self-contained HTML with CSS/JS SHA-256 CSP, no remote scripts, API calls, login tokens, databases, or server operations.

**Added to GitHub edition:** six arrange modes (neural/tree/orbit/grid/timeline/kanban); magnetic physics *view preview* with pins and Apply as single Undo (no per-frame document writes, no animation while hidden, reduced-motion support); todo/doing/done statuses with subtask parent/progress and legacy boolean-task import; Shift multi-select and bulk color/drag/delete; node appearance/color and density/background/motion controls; basic comments, date/timeline, PDF download attachments alongside existing image/audio/video, nested projects, search, keyboard Enter/Tab, mobile.

**Tests:** `node --test logic.test.mjs parity_logic.test.mjs`: **15/15 pass** using Node v22.16.0. Deterministic 500-node magnetic preview ~142 ms on this CPU. `node --check app.js` and `node --check logic.mjs`: pass. Embedded script/style CSP digests verified; no external resources. **Chromium 24/24 UI assertions** on exact bundled HTML with mocked IndexedDB/localStorage: 390px + desktop, Persian/English, in-place title editing, layout and selection, task/subtask, magnet preview/data purity, comments/PDF, nested board, search/export, no unexpected JS errors. Screenshots `/mnt/data/nodus_pages_parity/parity_{desktop,mobile}.png` (local only, not GitHub-hosted).

**Limitations:** Chromium is administratively blocked from navigating to `127.0.0.1:4173` or `file:`; the UI verification uses `page.set_content` plus mock storage, so real IndexedDB save/reload and actual hosted URL/browser QA were **not** verified here. The original React full test/build, authenticated sessions, real-time collaboration, cross-device sync, R2 storage and actual production user data remain untouched/not ported. Those capabilities fundamentally require a server; GitHub Pages cannot provide them.

**Release classification:** this is a verified targeted client-only slice on a branch, not complete feature parity. Publishing to `gh-pages` and GitHub Actions confirmation is a separate guarded step.

## GitHub Pages deployment confirmation — 2026-11-16

- **Published `gh-pages` commit:** `099b9755292a00f4aecdee2c06d4c0007a886678`, tree `1833868acf143be22bfb54efe46853b0e8dbde6d`. `index.html` exact blob `4ba369259c2b2830ad88e5ad697ba550134e77a8` matches tested source branch `pages/index.html`.
- **Pages workflow:** [run 43968961185](https://github.com/iAlirezaaa/nodus/actions/runs/43968961185) completed **success** for that exact commit; build and deploy jobs passed. GitHub repo `has_pages=true`.
- **Expected public URL:** https://ialirezaaa.github.io/nodus/. Direct HTTP/browser loading of this URL was **not independently verified** from this environment (external fetch inaccessible); distinguish deployed-by-Actions from directly observed live UI.
- **Status:** client-side parity slice **deployed via GitHub Pages**; full original-app parity **Blocked by static host requirements**. No Site auth, shared-room backend, D1/R2, true cross-device account sync, or production data migration. Original main and ChatGPT Site unchanged.
- Next: validate actual URL and IndexedDB data retention after reload in a normal browser; continue parity on screenshots and bug reports. For authentic online collaboration choose a server-capable backend—GitHub Pages alone cannot provide it.
