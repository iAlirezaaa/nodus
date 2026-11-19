# ND-026 — Neural nodes, connected cards and described zones

## Scope recorded before implementation — 2026-11-19 22:24 UTC

Owner approved the previously illustrated Nodus design, then explicitly authorized proceeding to a new release after the active-run ownership blocker was explained. This run took a guarded control-branch handover; prior feature commits and checkpoint remain intact.

- Run: `nodus-owner-20261119T2222Z-neural-zones`.
- Branch: `feat/nd-026-neural-zones`, created from current GitHub main `26fafac05c320ed5db30a0ee908dd816714acdd9`.
- Site: `appgprj_6af58606fb9c81918541f056a898c1a2`, source `eb8a9ad1f470447bf15634efbaa47531924901c5`, version 12, custom owner-only audience unchanged.
- GitHub main and Site source both have tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Prior in-progress feature branch remains preserved; eligible fixes may be integrated only after independent review.

## User-visible problem and first usable slice

Large nonlinear maps need understandable groups without duplicating shared ideas or turning the graph into a tree. Dot-like neurons remain the primary visual identity. This release adds named zones with descriptions and optional individual card presentation on the same canvas. It builds on the existing global neuron/card views, rather than claiming them as new.

1. Select existing thoughts and create a Zone with a title, description and restrained color.
2. Edit zone metadata and membership; deleting a zone retains its nodes and connections.
3. Render a soft boundary derived from members without changing saved coordinates or blocking background pan.
4. Override an individual node to a content card or a neuron while retaining identity, edges, content and position.
5. Keep each committed zone or presentation edit undoable and persistent after reload.

## Acceptance and boundaries

- Existing version-1 documents without optional zone/presentation fields remain readable and writable. Additive metadata uses existing validated document storage; no SQL schema rewrite or live-data migration.
- Story connects to Film, Series, Book and Decoupage; Decoupage also connects to Film and Series. No duplicate nodes, fake hierarchy or edge rewiring.
- Metadata is validated and shared updates use the existing guarded protocol. Concurrent changes must conflict safely rather than overwrite another user's edit.
- Zone metadata and membership survive save/reload; node deletion removes stale membership; deleting a zone never deletes its content. Snapshot/export paths preserve valid scoped zones.
- Title/description editing retains native Enter/Tab, Persian/IME and Escape semantics. No canvas shortcuts fire inside forms. UI works in FA/EN and at 390 px (also inspect 320 px where useful).
- Pure logic tests, current full Node count, TypeScript and production build are required. Actual browser UI and screenshots at fixed `http://127.0.0.1:4173/` are required before publication.
- Two synthetic sessions and protocol conflict/revocation tests must be distinguished from genuine authenticated production accounts. Never use owner data as fixtures.
- No per-frame document writes; reduced motion, motion off and hidden page remain respected. No new animation loop is required by zones.
- Independent code review before merge; check lease and remote heads before push/merge/deploy. Preserve Site audience, D1/R2 and source identity.

## Deferred from this first release

Automatic semantic clustering, edge bundling, zone collapse, cross-board references and full media library are separate future slices. Existing attachment nodes remain usable in cards. No claim of thousand-node performance without measurement.

## Status

In progress. No new deployment yet. Verification and release evidence will be appended here and in the roadmap/development log.
