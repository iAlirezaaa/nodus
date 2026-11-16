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
