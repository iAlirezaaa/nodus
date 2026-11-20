# ND-027 — Neural Atlas visual alignment

Status: **In progress (branch-only)**. Scope registered before source modifications 2026-11-20.

Source of visual direction: owner-approved mockups in current conversation show two complementary views: an airy XMind-like card/zone arrangement and a neuron-dot network, with restrained colored curved links; dense atlas zoom presents clusters, not thousands of labels.

## This slice
- Readable, fixed-size Zone badges anchored near the actual Zone boundary at low zoom, avoiding badge-on-badge overlap and reserved header/dock space.
- Keep existing Zone boundaries in world space; the badges are presentation-only controls opening the existing Zone editor, not new graph objects or saved coordinates.
- Lower nonselected edge emphasis only in dense far-zoom atlas mode; selected and focused relationships remain legible and interactive.
- Preserve DOT/CARD per-node overrides and all attachment/project behavior from version 13.

## QA acceptance
- Unit tests cover deterministic placement, overlap avoidance, viewport clipping, both language directions and large-map limits.
- UI screenshot from the real NodusApp (synthetic session fixture) at `http://127.0.0.1:4173/` in FA/EN desktop and 390px mobile; test Zone button and keyboard focus.
- Current full Node test count, TypeScript, production build and browser results must be recorded before declaring Verified.
- Production Site data and audience must remain unchanged until a separate guarded source-tree comparison and release gate passes.
