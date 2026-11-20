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

Far-zoom Zone heading readability remains a follow-up within ND-026: headers currently scale with the canvas. This usable slice supports opening a Zone and zooming into its details; it does not claim that every Zone title stays readable at a distant whole-map overview.

## Status

**Released first usable slice — 2026-11-19 22:53 UTC (20 November in Tehran).** Native Sites publication succeeded for version **13**. The reviewed feature is integrated into main, and the built GitHub/Sites sources have identical trees. The existing owner-only audience and DB/BUCKET bindings are preserved. The roadmap distinguishes this delivered slice from the deferred large-map work below.

## Implemented controls and data behavior

- **Board toolbar → Zones:** create a group from the current selection, or choose its members in the editor. A Zone stores its title, description and color; its boundary follows the projected member bounds without moving or duplicating the underlying ideas.
- **Zone heading on the canvas:** open the corresponding editor. Titles are limited to two rendered lines; the full title and description remain available in the editor. Empty existing Zones can still be renamed, described or deleted.
- **Selected node → quick settings → Thought display:** choose Default, Neuron or Card. Default inherits the current canvas design. Equivalent choices are available in the node context menu. The node retains its identity, position, content, attachments and connections.
- **Group selection toolbar → Create zone from selection:** open an editor initialized with the selected nodes. Show on canvas selects a Zone's members without changing graph data.
- Optional `Board.zones` and `GraphNode.presentation` fields preserve the version-1 document format. Zone membership is validated against the same board. Deleting a Zone retains its content; deleting nodes cleans stale memberships. Snapshot and import/recovery paths preserve and remap valid metadata.
- Zone editors compare their opening snapshot inside the workspace transaction. Shared Zone arrays use the existing atomic guarded protocol. Unsaved drafts are protected on close; an unchanged save does not offer an Undo for an unrelated previous edit.

The reviewed prior template/dense-reading/viewport work was integrated at GitHub commit `e12f0b8e733a25f93c546d17c3181319284b1579` (tree-equivalent local merge `7d988fe`). Its earlier feature branch remains preserved. This integration adds no new CI workflow, schedule or other automation.

## Verification of this run

The browser checks below used the real Nodus UI at the required `http://127.0.0.1:4173/`, with synthetic fixture data. Browser interaction and screenshots are actual UI evidence; the fixture is not a real production login and does not use owner data.

| Check | Observed result |
| --- | --- |
| Persian Zone creation | Entered a Persian title, description and two members. The fixture recorded **0 writes before Save**. Explicit Save produced **1 write**; the Zone and its metadata survived reload. |
| Unsaved close protection | Attempting to close an edited Zone opened the warning. Keep editing retained the draft for the subsequent explicit Save. |
| Description Enter/Tab and mobile layout | Description line breaks and native Tab navigation worked at 320 px and 390 px. No horizontal overflow was observed; the sampled narrow panel measured width/clientWidth/scrollWidth of 280/280/280 px. |
| Zone Undo | Save followed by Ctrl+Z preserved the node and edge arrays byte-for-byte. Zone metadata remained part of the normal history operation. |
| English/LTR | Inspected the English editor at 390 px with LTR layout. |
| Show on canvas and group controls | Show on canvas selected three members, and the Create zone from selection toolbar action was available. |
| Mixed node presentation | Default → Card → Neuron → Default returned the entire document to its original serialized contents. Edges and Zones were unchanged during the presentation checks. |
| Persian thought flow | F2 editing accepted Persian text containing a ZWNJ. Tab created a child; Enter then Escape left exactly one added child. Two Undo actions restored the graph. |
| Native drag | Dragging the Book node changed only its x/y position and produced one document write. Undo restored the whole graph. |
| Pan | Panning changed the viewport without writing the document. |
| Gentle magnetic motion | The view was observed running while the fixture write counter stayed at 9. Pause and restore produced no document writes. |
| Automated logic/server tests | **261/261 native Node tests passed** in this run. This is the current count, not the historical 205-test result. |
| TypeScript and production build | Project TypeScript checking and the production build passed. |

### Motion and authentication evidence boundaries

- The actual background-tab attempt returned `document.hidden === false`; **actual hidden-tab behavior was not verified by that attempt**.
- Separate DEV fixture simulations of reduced motion and hidden visibility produced `data-motion="off"`, zero hover previews and an unchanged write counter of 9. These are simulated conditions, not evidence that a real media preference or a genuinely hidden browser tab was exercised.
- Physical IME composition and hardware touch were not exercised. Persian/ZWNJ text entry and keyboard Enter/Tab behavior were exercised as described above.
- Two genuine authenticated production accounts were not used. SQLite tests with two synthetic identities cover guarded merge/conflict, access revocation, account isolation and stale member deletion in both operation orders. Conflicts reject the whole commit rather than accepting unrelated edits from the same stale request.
- Zones introduce no animation loop or per-frame document persistence. No thousand-node performance result is claimed.

### Independent review

The combined implementation passed independent code review. Four concrete findings were fixed before verification: editing empty existing Zones, bounding long rendered Zone titles, avoiding an unrelated Undo after an unchanged save, and clearing the close warning after saving.

The reviewer added and executed eight independent tests in `tests/zone-editor-geometry.test.ts`; all eight passed. They cover stale editor snapshots, retaining concurrent unrelated content, deletion scope, empty existing Zones, presentation inheritance and non-mutating Zone geometry. Domain coverage additionally verifies metadata reload, deletion cleanup, snapshot isolation, recovery ID remapping and shared atomicity.

### Actual UI screenshots

These captures show the application running with synthetic fixtures; they are not generated concept images or evidence of authenticated production sessions.

- [Light Persian desktop: mixed dots/cards and described Zones](qa/nd026/neural-zones-light-fa-desktop.jpg)
- [Persian desktop: neural dots, connected attachment cards and described Zones](qa/nd026/neural-zones-fa-desktop.jpg)
- [Persian Zone editor at 320 px](qa/nd026/zones-editor-fa-320.jpg)
- [English Zone editor at 390 px](qa/nd026/zones-editor-en-390.jpg)

## Release checkpoint and next step

- Feature branch: `feat/nd-026-neural-zones`, integrated into main without force; prior feature commits remain in the merge ancestry.
- Application implementation on GitHub: `8b275f3e10ebfc25bd428e68942e017e0599626c`; tree `4dde1e5b8ddb9323b608764e5f7ae1e379d80de2`. This is tree-equivalent to the locally verified `4bf71c6abe6d1c62b37196e749df8f75be8be2f9`. GitHub Git-data APIs were used after ordinary Git push reported unavailable HTTPS write credentials; the contents and reviewed ancestry were preserved.
- Released GitHub source: `1c32d0f43a5a33d402825fd35c2cbdb4e9feb7d8`.
- Released Site source: `a84a0b29e87ff7f0e933054367fefc26695c157d`.
- Exact common release source tree: `89a7402cc8a5965d60f90ebb74c30e87fffa12e5`.
- Existing Site: `appgprj_6af58606fb9c81918541f056a898c1a2`; [live Nodus](https://nodus-hades.ialirezaaa.chatgpt.site/).
- Version **13**: `appgprj_6af58606fb9c81918541f056a898c1a2~appgver_251bc3cc8bb481918c0bdf748e7d9c82`.
- Deployment `appgdep_6aff7ddf3a108191b253f83068e76424`: **succeeded**, native confirmation `2026-11-19T22:53:37.976127+00:00`.
- The final archive was rebuilt from the exact Site source with the supported build/package helper. Local gzip archive SHA-256: `428cf0afeef6b996619db6e49c75a2868e399d3b3fa0395fa13243b505c43927`. Saved tar content hash: `sha256:b8688e2de8e4a82b377eb9e2664f7141df0d474ad39617aa9eea5231be3c1ccb`.
- The live URL opened at the existing ChatGPT sign-in gate. Production sign-in was not performed, and owner content was not used for testing. Publication confirmation is the native successful deployment of the exact tested source; the screenshots above remain synthetic UI evidence.
- This post-publication documentation is synchronized to both source repositories without a second functional release. The control-branch checkpoint records final documentation heads/tree and guarded lease cleanup.
- Next: improve Zone heading readability at far zoom and add non-destructive collapsed-zone navigation for large maps, preserving shared nodes and cycles. Automatic clustering/bundling and a media library remain unimplemented future slices. ND-024 remains untouched on its separate unfinished branch.


## Distant overview heading follow-up (not released — 2026-11-20T02:35:20.565Z)

The next ND-013/ND-026 usability slice is on [`feat/nd-013-zone-overview-headings`](https://github.com/iAlirezaaa/nodus/tree/feat/nd-013-zone-overview-headings): readable/touchable Zone titles at distant zoom. It is **not** part of the already published v13 and is not Verified. Pure 4/4 Node tests and isolated helper TypeScript passed; full app build/browser screenshot/Sites parity still blocked. [Current candidate QA](ND-013-ZONE-OVERVIEW-QA.md). Existing published v13 controls and user data remain unchanged.
