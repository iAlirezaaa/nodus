# Nodus architecture

Nodus stores editable graphs on the server, supports private workspaces and shared rooms, and renders those graphs as a spatial canvas. Collaboration uses authenticated HTTP requests, guarded field operations, and ephemeral server presence. Browser storage provides scoped recovery and personal display preferences; it is not the canonical shared database.

## Implementation map

| Area | Main implementation |
| --- | --- |
| Interfaces and constraints | `lib/types.ts`, `lib/server/validation.ts`, `lib/node-features.ts`, `lib/calendar.ts` |
| Graph edits, derived growth and energy, keyboard placement, share snapshots | `lib/graph.ts`, `lib/node-growth.ts`, `lib/node-energy.ts`, `lib/flow.ts`, `lib/board-snapshot.ts` |
| Canvas, content popup, application coordination | `components/Canvas.tsx`, `components/Inspector.tsx`, `components/Modal.tsx`, `components/NodusApp.tsx` |
| Contextual docks and single/group color/status | `components/CanvasDock.tsx`, `components/NodeQuickSettings.tsx`, `components/SelectionToolbar.tsx` |
| Multi-selection geometry and bulk edits | `lib/node-selection.ts`, `components/Canvas.tsx`, `components/selection-toolbar.css` |
| Personal root-space inspection/deletion | `lib/personal-spaces.ts`, `components/NodusApp.tsx` |
| Layouts and personal appearance | `lib/layouts.ts`, `components/DesignPanel.tsx`, `hooks/use-canvas-preferences.ts` |
| Interactive magnetic view and guarded application | `lib/magnetic-layout.ts`, `lib/magnetic-view.ts`, `hooks/use-magnetic-canvas.ts`, `components/MagneticPanel.tsx` |
| Popup motion and presentation | `components/Modal.tsx`, `components/node-dialog.css` |
| Private persistence | `hooks/workspace-store.ts`, `lib/server/store.ts`, `/api/workspace` |
| Shared protocol and persistence | `lib/collaboration.ts`, `hooks/shared-workspace-store.ts`, `lib/server/collaboration.ts`, `/api/rooms` |
| Store selection and React subscriptions | `hooks/use-workspace.ts` |
| Presence | `hooks/collaboration-presence.ts`, `hooks/use-collaboration-presence.ts`, room presence routes |
| Membership and room navigation | `components/CollaborationPanel.tsx`, `/?room=<room-id>` |
| Database schema and migrations | `db/schema.ts`, `drizzle/` |

## Document and domain model

A workspace is a version-1 JSON document with `homeBoardId`, `boards`, `nodes`, and `edges`. A private account has one document containing root spaces and nested projects. Each shared room owns a separate document and revision sequence.

| Entity | Canonical data |
| --- | --- |
| Board | Title, description, containing `parentNodeId`, creation time, and optional saved `layout` metadata. |
| Node | Title, notes, content kind, world position, dimensions, color, URL, optional asset and child board, task, annotations, appearance, and `scheduledAt`. |
| Edge | Same-board source/target, label, and optional route, stroke, color, width, animation preference, and world-space bend. |
| Asset | Immutable ID, uploader's user ID, filename, detected MIME, size, creation time, and private R2 object key. |
| Room | Owner identity, title, canonical document, revision, and timestamps. Membership and operation receipts are separate records. |
| Presence | Expiring session identity, board, cursor, selection, display name, color, and last-seen time. It is outside the graph. |

### Three distinct relationships

Ordinary edges express relationships between ideas. Multiple edges can lead into an idea and graph cycles are supported. Edges cannot reference missing nodes, cross board boundaries, duplicate an existing directed connection, or connect a node to itself.

Board containment is a separate, acyclic structure. A nested board has one containing node; `board.parentNodeId` and `node.childBoardId` must agree. Any content kind can acquire a child board without losing text, media, or URL. Opening a project mounts that board as the active canvas, rather than recursively mounting every descendant inside its parent.

Task ancestry is an explicit same-board forest in `node.task.parentId`, independent of edges and containment. Status is `todo`, `doing`, or `done`. Progress counts completed descendants, excluding the parent itself; child completion does not automatically change the parent's status. Removing task status or deleting a task detaches surviving direct task children to roots. Deleting a containing project still removes its contained boards and nodes.

### Personal root-space deletion

`inspectPersonalSpace(document, rootBoardId)` accepts an existing board with `parentNodeId: null` and returns its root-inclusive `boardIds`, total `nodeCount`, and `projectCount` excluding the root. It indexes board ownership through containing nodes and walks the subtree iteratively. A malformed child pointer cannot pull another root into that subtree. Missing, foreign and nested targets return `null`; `deletePersonalSpace` treats the same cases as identity no-ops.

`deletePersonalSpace(document, rootBoardId, language)` returns one immutable document update removing the subtree's boards, nodes and incident edges. Unrelated roots retain their content, task hierarchy and object identities; surviving stale references to removed tasks/projects are detached. Removing `homeBoardId` selects the first remaining root. Removing the last root constructs one new blank root with a fresh ID, empty description and no sample nodes. Traversal and filtering are linear in the document size and do not recurse through deep projects.

The sidebar offers this action only for editable personal spaces (`roomId === null`). A confirmation shows the targeted title, node count and nested-project count, with an additional explanation for the last root. The application rechecks the target inside `ws.update` and navigates to the new home when the current board belongs to the removed subtree. The complete deletion, including home replacement, occupies one private-history entry. No R2 deletion or file API is called. Undo restores the previous graph and attachment references while its in-session snapshot remains available; this is not a persistent trash service. Shared-room deletion is not exposed by this control.

### Annotations and dates

Annotations contain a quote, UTF-16 start/end offsets into the title or notes, a comment, color, resolution state, and timestamps. Attached anchors must match the exact source quote. `patchNode` shifts unambiguous anchors when text is inserted before them and preserves unaffected anchors. Changed, deleted, or ambiguous quotes remain as orphaned comments; the helper does not guess a new attachment elsewhere. Orphan offsets remain bounded and can be zero-width. Explicit reattachment selects a new source range.

Inline titles, inspector edits, duplication title changes, and project renaming use `patchNode`; contained board titles stay synchronized with their owning nodes. Annotation drafts have explicit Save/Cancel behavior and remain separate from posted graph data. Save only clears a draft after the workspace accepts the local mutation. A skipped update during loading or a validation failure preserves the draft.

`scheduledAt` is an optional calendar date on any node, formatted `YYYY-MM-DD`. `lib/calendar.ts` validates the actual calendar date, including invalid days and leap years. It is not a timestamp or reminder. Timeline grouping uses it when present and otherwise the creation date. Display formatting preserves the calendar day instead of shifting it through the viewer's time zone.

## Canvas and layouts

`Canvas.tsx` uses DOM nodes and SVG connections in a transformed world layer. Pointer events provide pan, pointer-centered zoom, pinch, dragging, and bend-handle interaction. Off-screen items are culled, detail changes with zoom, and memoized cards/connections use stable event dispatchers. View changes coalesce into animation frames; dragging recomputes incident edge geometry. These are bounded rendering strategies, not a promise of a particular frame rate for every graph and device.

### Neural display and saved geometry

The default display is `neuron`: a luminous core, readable label, and contextual preview. `buildNodeGrowth` retains separate `direct` and `incoming` counts for same-board graph and explicit task relationships, and derives `connections` from their union. Each neighbor contributes once even when links are reciprocal, duplicated, or repeat a task-parent relationship. Incoming hubs therefore contribute to size just as outgoing hubs do; text length does not contribute. Cycles and converging paths count each reachable descendant once. Directed descendant counting saturates at 128 with a separate overflow flag, while direct, incoming, connection and nested-project counts remain exact. Invalid, self and cross-board relationships are ignored by this derived calculation.

Visual mass is `connections + 0.35 * max(0, descendants - connections) + 0.5 * nested`. The extra descendant contribution never subtracts already-counted neighbors, so adding a reverse edge cannot make a node shrink. Scale is `1 + 1.8 * (1 - exp(-sqrt(mass) / 4))`, bounded to 1–2.8. Growth is derived visual state, not a saved dimension change.

Neuron cores use the full bounded growth scale. `projectCardNode` retains the restrained card formula `1 + 0.35 * (scale - 1)`, bounded to 1–1.63, around the saved center for card rendering, explicit layouts and keyboard collision checks. Connection endpoints, fit and hit areas use the displayed geometry. Switching presentation does not rewrite `x`, `y`, `width` or `height`.

Task neurons keep a status word and icon beneath the title, plus completed/total descendant counts when subtasks exist; dense miniature views reduce the word to its icon. Task state is therefore separate from the node's chosen palette color. The caption follows the core's growth/hover geometry, and its status control cycles the task state without opening the content popup. Read-only task controls are disabled. Completion remains an explicit task field: finishing all descendants does not automatically mark the parent done.

Hover opens a screen-space preview with real content and project/media affordances, readable at overview zoom. An unmoved click opens the full content popup immediately; drag and connection gestures retain their separate intent. F2 starts inline title editing. Full content uses the current workspace node rather than a copied snapshot, and opening a contained project changes the active board.

Peer cursors are drawn at world coordinates with inverse zoom scaling. Only peers on the active board are drawn, and off-screen cursors are culled. Peer selections add labeled accents to existing nodes; they are indicators, not editing locks.

Connections support curved, straight, and orthogonal elbow routes. Bend dragging previews locally and commits on release. Route, stroke, width, color, endpoints, and bends are document changes. Node breathing/glow and directional edge flow persist across neuron/card views and zoom levels. Every visible eligible edge has a flow path; bright particles are distributed over at most 36 edges plus an eligible selected edge. Per-edge `animated: false` disables its flow and particle. Hidden pages and reduced-motion preferences use static presentation without active particles. These visual effects and hover interactions do not write graph data or move saved positions. Canvas media previews do not autoplay audio or video.

`lib/node-energy.ts` maps the same topology-derived mass to `strength = 1 - exp(-sqrt(mass) / 3.5)`. Breathing periods stay within 2.6–5.6 seconds, orbit periods within 7–16 seconds, glow opacity within 0.24–0.76, and signal travel periods within 2.8–6.2 seconds. An isolated note still has visible, slow activity; denser work approaches the bounds smoothly. Each connection uses the higher-mass endpoint's energy, while its light color comes from `edge.color ?? source.color`. Geometry-cache reuse also checks endpoint colors so palette edits update existing signals immediately. These values affect presentation only; they do not add timers or document writes per node.

### Six explicit layouts

`arrangeWorkspace` applies a chosen layout to the active board in one undoable document change. Collision spacing uses growth-expanded card projections shared with rendering and keyboard placement. It preserves other boards, content and stored dimensions, writes bounded coordinates, and clears custom bends on the arranged board.

| Layout | Behavior |
| --- | --- |
| Neural | Groups connected components, uses a bounded deterministic force calculation on smaller boards, and packs connected chunks above 250 nodes. This action is separate from the interactive magnetic view. |
| Tree | Places directed branches and task relationships in levels, handling cycles and disconnected components. |
| Orbit | Organizes thoughts around prominent connected ideas. |
| Grid | Packs variable-size cards into a regular browsing layout. |
| Timeline | Groups thoughts by scheduled or creation date and shows date guides. |
| Kanban | Places tasks in To do, Doing, and Done lanes, with an Ideas & references lane for other nodes. |

Sort choices include creation time, title, kind, color, and task status, with ascending/descending order and bounded spacing. Suggestions use graph statistics such as links, tasks, dates, and media; they do not call an AI service.

Applied layout is canonical board metadata: `Board.layout` records kind, sort, direction, spacing, language, and optional fixed Kanban `columnStep` alongside the saved coordinates. Shared peers receive the same arrangement and guides. Stored orientation and lane spacing prevent guides from drifting when a viewer changes UI language or a task changes status. Guide captions can use the viewer's language without changing their geometry. Layout is a one-time manual application: branch growth, task status or scheduled dates do not automatically move existing cards. Reapply the layout to reposition them; decorative motion continues independently of layout.

Personal appearance remains separate. Node display mode, background, density, accent, and connection-label visibility are scoped to account, room-or-personal mode, and board in local storage. They do not create shared revisions. Viewport pan/zoom is stored under the board ID; theme and UI language are browser preferences. Preference storage failures leave the current view usable and are surfaced where appropriate.

### Interactive magnetic view

`lib/magnetic-layout.ts` owns a deterministic force simulation over node centers. Springs include graph links and explicit task-parent relationships, deduplicating repeated and reciprocal relationships and ignoring invalid endpoints. Link attraction, repulsion, center gravity and desired link distance are normalized settings. Node radii follow the current neuron/card growth projections; larger thoughts have bounded additional mass. Spring load at each endpoint is normalized by its degree, and a bounded spacing allowance uses degree and neighboring radii to give busy hubs room. Charge and damping also account for degree. Link direction does not change the physical result. Persistent pins and the currently dragged node are held in place while still influencing their neighbors.

Repulsion approximates distant groups through a quadtree; collision queries have bounded visits and candidate pairs, including a rotating sample for coincident buckets. Collision correction reads one spatial snapshot and applies bounded positional corrections together, without converting separation into launch velocity. It removes closing velocity while retaining tangential movement, and respects pinned/dragged anchors. Time steps, acceleration, speed and coordinates are bounded. Damping and cooling stop a quiet simulation, with an eight-second simulation-time burst limit as a backstop. `use-magnetic-canvas.ts` schedules animation frames only while enabled, allowed and active, and lowers its update cadence for larger graphs. These are work bounds, not a guaranteed frame rate or a proof that every pinned/degenerate arrangement is overlap-free.

The hook keeps simulation bodies and captured render positions separate from `Workspace`. Its geometry key excludes note text, colors and task completion state, so those edits do not rebuild or reheat the force graph; derived connected growth is likewise cached by topology. A topology/radius rebuild in the same account/context/board scope seeds retained nodes from their current personal positions and preserves their velocity and local center. New nodes or nodes whose saved position changed start at rest; previous pins do not impart stale velocity. Scope changes start a separate simulation and restore only the matching local cache. Hover reading, inline writing, popups, context menus, connecting and edge editing suspend movement. Hidden pages and reduced-motion preferences also stop it. Starting, changing forces, rebalancing, pin changes, dragging or changed geometry can wake it again. Decorative node/edge lighting remains a separate motion layer.

Settings live in the existing account/room/board appearance preferences; positions and pins use a separate scoped local cache. The cache records node IDs, board IDs, expected base coordinates and bounded personal positions. On restoration, only entries still matching the current graph are accepted. Scope changes persist the outgoing view and isolate the next one. Pause retains local positions; Restore clears the personal simulation and pins. Normal manual dragging still commits its node through the ordinary document edit path. Keyboard placement and directional navigation use `positionDocument` to work from the visible personal positions without copying that whole view into a new node's commit.

**Apply layout** calls `applyMagneticView` within one workspace update. It validates every supplied node's identity, board and expected base `x/y`, plus finite bounded target coordinates, before changing anything. Any conflicting entry rejects the whole application. A valid change updates coordinates, clears that board's old structured `layout` metadata, preserves content/relationships and enters ordinary private/shared save and undo handling once. Simulation frames never enter graph history or generate network writes. Read-only access disables application; the personal view is not another writer or a collaborator lock.

`MagneticPanel` opens without changing simulation state; Start or a preset explicitly begins movement. Its four sliders live behind a native Fine-tune disclosure. It exposes Start/Pause, Rebalance, Restore, Apply layout, the pin count, Gentle/Balanced/Organic presets and the four force sliders. Pins are changed through node context actions. The panel reports running, settled or paused state; closing the panel does not itself stop the chosen mode. Lane/date guides are hidden while an active or displaced magnetic view would make their stored positions misleading.

## Editing and client state

`useWorkspace(language, roomId)` exposes a common React interface over two stores. A missing room ID selects the private `WorkspaceStore`; a room ID selects `SharedWorkspaceStore`. Both provide stable actions and `useSyncExternalStore` snapshots. Navigating between boards does not create another writer. Store switching persists the outgoing draft and suspends its lifecycle; pending writable changes must be saved or recovered before switching rooms.

### Continuous keyboard entry

`lib/keyboard.ts` defines explicit canvas/node/edge/text/control/outside focus scopes and resolves graph commands in one place. React node events and the window listener share the same dispatcher and consume a handled native event once. A selected graph object is insufficient while focus is elsewhere: native buttons, inputs, editable text, menus and dialogs retain their own keyboard behavior. F2 explicitly edits a title; printable graph shortcut letters no longer overwrite titles. Held mutation/history keys and IME composition do not trigger graph changes. Space opens a focused thought, pans only the focused canvas, and does not hijack native controls. Keyboard undo/redo restores canvas focus so removing a focused node does not strand subsequent commands on body.

`CanvasDock` supplies the persistent creation/single-selection action surface. It switches between New thought and Branch/Sibling/Open, puts secondary tools in a focused disclosure, and observes focus/selection changes before displaying shortcut hints. `SelectionToolbar` replaces it when more than one valid node is selected, keeping one contextual dock on the canvas. During inline entry the dock is hidden, leaving local instructions beside the input. `ShortcutGuide` separates the three focus contexts and keeps advanced commands collapsed. On sparse boards (up to 24 thoughts), neuron titles remain visible at miniature zoom using inverse scale; dense graphs retain their existing label budget. These display rules do not modify graph positions or saved content.

`NodeQuickSettings` occupies the dock's selected-title row as a compact color/status trigger. Its inline popover offers the six existing `NodeColor` values and four states: `null` for an idea, then `todo`, `doing`, and `done`. Palette edits use `patchNode`; `quickStatus` performs `convertToTask` plus `setTaskStatus`, or `removeTask`, within one `ws.update`, so converting an idea directly to a chosen task state requires one undo step. Removing a task promotes its direct subtasks to roots and preserves their statuses and descendants through the existing feature helper. The popover does not portal outside the modal inert scope. Native buttons, outside-pointer/focus dismissal, local Escape-to-trigger handling, selection-change reset and disabled read-only mutations keep its keyboard behavior separate from graph shortcuts.

`use-thought-flow.ts` owns one inline session while the input owns temporary text. A blank new thought is a view-only node. Its first nonempty commit inserts the node and connection atomically, producing one undo item rather than an item per character. Existing inline titles also commit as a complete graph edit.

Enter creates a sibling; Tab creates a child. For tasks, a sibling retains the source task's explicit parent and a child points to the source task. Task roots remain roots even with incoming graph edges. Ordinary thoughts use the first valid incoming edge for parent navigation. `prepareThought` measures growth-expanded occupied cards and the parent's prospective growth after adding the branch, placing only the new thought in the interface's RTL/LTR direction. It never rearranges existing thoughts. Shift+Tab moves toward the parent, arrows follow physical positions, and Ctrl/Command+Enter opens a nested project. F2 edits the title in place; normal textareas retain native multiline editing.

The input guards IME composition and deduplicates blur following a keyboard commit. Navigation and page-departure paths read the current DOM value. A capture-phase unload handler runs before store recovery checks; failed commits retain editable text and can trigger the departure guard. Blank new drafts never become durable graph data. Account ownership is checked again before commit, and external controls keep focus after a blur commit.

### Multi-selection and bulk edits

`NodusApp` keeps the selected node IDs and primary focus in local React state, filters them against the current document/board, and clears or narrows them on navigation and single-node transitions. The set is not serialized into the workspace, recovery document or a shared revision. Existing presence continues to send the primary selected node rather than a group list. `Ctrl/Cmd+A` resolves to `select-all` only within the graph shortcut scope; native fields and controls retain their normal behavior. Graph Escape clears selection and ends explicit multi-select mode; open toolbar panels consume Escape locally and return focus to their trigger.

Shift+click toggles a node. Shift+drag on empty canvas creates an additive rectangle; ordinary empty-background dragging remains pan. **More actions → Select multiple thoughts** enables tap-to-toggle and rectangle selection without a modifier for touch/mobile use. A rectangle in this explicit mode replaces the current selection unless Shift is held. `lib/node-selection.ts` normalizes drag direction, rejects nonfinite/empty geometry and includes positive-area overlaps with the passed projected node bounds. It deduplicates IDs and preserves stable order for add/toggle/replace. Marquee changes are view state, not document writes.

Dragging a member of a selected group captures each member's displayed position and expected saved coordinates. All previews use the same bounded displacement, preserving relative placement; release passes the full placement batch through `applyMagneticView` in one `ws.update`. Identity, board, baseline coordinates and finite targets are validated before any position changes. A stale, moved or missing member rejects the whole batch. Successful movement clears obsolete structured-layout metadata and records one undo item. Magnetic simulation is blocked while a group, marquee or explicit selection mode is active; decorative node/edge motion is independent and stays enabled under the usual visibility/reduced-motion rules.

`SelectionToolbar` shows the selected count, explicit mixed color/status values, palette/status popovers, Delete and Undo/Redo. Its native buttons retain Tab behavior and its popovers remain inside the canvas's inert scope. `updateSelectedNodes` applies a board-scoped color/status patch in one immutable pass. Existing task parents are retained when setting a status, plain ideas become root tasks, and removing task status promotes surviving children without altering ordinary edges. `deleteSelectedNodes` removes selected nodes plus their contained subtrees, preserves merely connected neighbors, and repairs surviving task/project references. The application requests confirmation when deletion reaches additional nested-project content. Each accepted bulk update or deletion enters history once; read-only mutations are disabled.

### Content popup and draft lifecycle

`Modal` owns the focus scope, initial focus, Escape handling and return focus; `NodusApp` makes the background inert. The node popup starts on its introduction for a click or in notes for Shift+Enter. Tab and Shift+Tab remain inside, including from a non-tabbable introductory element. Dismissal returns focus to the source node; leaving for inline writing, connection mode or a nested board lets the destination own focus after the popup unmounts. Composition and handled field keys are not repurposed as dismissal.

For node popups, `Canvas.getNodeRect` supplies a captured viewport-space origin. `Modal` measures its untransformed destination bounds and uses CSS variables for a uniform source-centered expansion, staged content reveal and brief rim glow. Missing or offscreen origins fall back to a centered transition. The root validates draft changes before setting `closing`; the dialog stays mounted and focus-contained while its content is inert. Its own exit animation or a cleaned-up fallback timer invokes `onExited` once, after which the root unmounts and restores focus. Related-node switching and direct navigation cancel the old exit lifecycle. Reduced-motion preferences bypass the transforms and finish closing without the animation delay. Generic dialogs retain their existing behavior.

`Inspector.flushPending()` validates local URL/coordinate drafts and requires an accepted workspace mutation before close, node switching or another popup action. Rejection preserves the open editor and draft. Escape first cancels a dirty field. Capture-phase departure handling flushes drafts before store recovery guards. Annotation Save remains explicit and drafts survive popup unmount in scoped session storage; failed saves do not clear them. Read-only shared rooms disable graph mutations while preserving local annotation recovery. Opening a popup gates canvas shortcuts and paste actions.

### Visible-base freeze during shared editing

Remote synchronization must not silently change an expected value behind a buffer that has not entered the document. The application calls `setRemotePaused(true)` when inline writing starts or a popup URL, coordinate or annotation draft is dirty.

During this pause, shared GET polling stops, but local commits, saves, and independent presence continue. A PATCH acknowledgement may contain newer peer fields. The store acknowledges its own operation and advances the revision while deferring untouched remote fields instead of replacing the visible editing base. A subsequent title commit retains the expected-before value the writer actually saw. A peer's same-field edit produces a conflict rather than being accepted as a hidden new base and overwritten.

When editing ends, the store safely rebases remaining local operations onto the deferred canonical document and resumes polling. Structural validation accompanies rebases and history operations. The pause is an editing safeguard, not a lock on another person's work.

## Private persistence

The private store keeps one serialized save queue and up to 60 immutable undo snapshots.

1. `GET /api/workspace` supplies identity, document, and revision. A successful response with no document initializes editable starter content; an initial request failure never silently creates or writes starter data.
2. A committed mutation updates memory/history and synchronously writes a recovery draft when browser storage is available.
3. The default 650 ms debounce sends the whole document with its last acknowledged revision and expected account header.
4. The server validates the graph, byte size, and asset ownership, then performs a conditional insert or update.
5. The snapshot becomes saved only after acknowledgement. Edits made in flight are sent afterward using the acknowledged revision.

Creation uses `INSERT ... ON CONFLICT DO NOTHING`; updates use `UPDATE ... WHERE user_id = ? AND revision = ?`, incrementing the revision in the same statement. A stale write returns `409` and the current revision. Private editing retains full-document revision protection. Unlike the shared protocol, it has no operation receipt, so a lost successful response can lead to a conflict on retry.

Private recovery uses `localStorage`, scoped by user ID. Reload preserves an unsaved local document for explicit recovery. Same-revision recovery can be saved directly; a conflicting version can be copied alongside the current server document as separate root boards. Storage quota failures are visible. Serialization caching avoids redundant work while still verifying actual stored bytes before skipping a repeated recovery write.

## Shared persistence and conflicts

The shared store retains a canonical base document/revision, visible local document, guarded pending diff, and at most one in-flight outbox request. Save debounce defaults to 400 ms. Requests are serialized so an acknowledgement cannot discard edits made during that request.

### Guarded field operations

`lib/collaboration.ts` defines `WorkspaceOperation`: target (`node`, `edge`, `board`, or `workspace`), optional entity ID, property path, and explicit before/after value states. An absent field differs from a field containing `null`.

```json
{
  "target": "node",
  "id": "thought-id",
  "path": ["text"],
  "before": { "exists": true, "value": "Earlier note" },
  "after": { "exists": true, "value": "Revised note" }
}
```

Existing entities change through permitted properties. Task and bend members can be diffed separately; annotation arrays and applied board-layout metadata are atomic fields. An empty entity path creates or removes a whole entity. Deletion checks the complete previous entity, preventing removal of intervening peer edits. Unsafe paths, overlapping operations, immutable ID changes, and non-finite JSON values are rejected.

The server accepts a stale revision if every expected-before guard still matches the current graph. One person's title edit and another's notes edit can both succeed. If a current value already equals the requested after-value, that operation is an idempotent no-op. A differing expected value produces a conflict and none of the batch is applied. This is property-level collaboration, not character merging inside concurrent edits to the same text field.

After guard application, the complete graph is validated. Deleting a node cannot leave a newer peer edge dangling; deleting a project cannot leave a newer containment structure broken. Asset authorization is checked against the latest room document and committing account.

### Transactional commits and receipts

Each PATCH includes `operationId`, base revision, and operations. Receipt identity is `(room_id, user_id, operation_id)`, with a hash of the accepted request. The user ID comes from authentication, not the body.

For each bounded attempt, the server reads the authorized room, checks the receipt, applies guards, validates the result, and executes one D1 batch:

1. Conditionally update document/revision only if the loaded revision and current membership still match and the receipt does not exist; write a unique per-attempt marker.
2. Insert the receipt only for that marker.
3. Replace the room's asset-reference index only for that marker.

The marker prevents later statements recording success when the conditional update did nothing. D1 documents that batch statements execute as a transaction and roll back together if a statement fails; regression tests exercise this with an injected receipt failure. See [D1 batch semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

CAS races retry against the new canonical document up to five times. Membership is rechecked inside the write, so revocation between the earlier read and commit prevents that write. An already-applied receipt triggers a fresh authorized read before returning; a concurrent identical request cannot acknowledge an older, pre-commit snapshot. Reusing a receipt ID for different content returns `409`.

### Polling, history, and recovery

Room polling starts at 1,000 ms while visible. After five and ten unchanged polls it backs off to 2,000 and 3,000 ms; connection failures use at least 4,000 ms. Hidden pages and explicit editing pauses stop GET polling. An unchanged `since` response still returns the current identity, room summary, and members.

Remote snapshots are rebased with local pending operations and never enter local undo history. Shared undo/redo stores up to 60 local batches and applies their guarded inverses/originals. It validates the resulting graph. If a peer changed the same field or added a reference undo would break, undo reports the conflict and preserves that work.

An overlapping save/rebase conflict stops automatic writes while retaining the complete local draft. The user can export it, load the server version, or choose Keep both. Keep both fetches the latest room and appends copies as separate root boards; board, node, edge, task-parent, and annotation identities are remapped while file references remain unchanged. Size/count limits and current asset grants still apply. Failed restoration keeps the draft.

A transport failure retains the in-flight operation ID because the server may already have committed it. Revocation or account mismatch stops synchronization and makes the shared store read-only while preserving pending drafts. Those states do not retry under another account.

## Recovery and local-only state

| State | Storage and scope | Behavior |
| --- | --- | --- |
| Selected node set and multi-select mode | React state in the active account/space/board view | Temporary, filtered to existing active-board nodes; no document save or persistent selection cache. Group presence is not broadcast. |
| Private unsaved graph | `localStorage`: `nodus:workspace:draft:<userId>` and `recovery` variant | Document/base revision; survives reload and normal browser restarts while storage remains available. |
| Shared unsaved graph | `sessionStorage`: `nodus:shared:draft:<encoded-userId>:<encoded-roomId>` and `recovery` variant | Base/local documents, revision, timestamp. Per-tab storage avoids one tab replacing another's draft; closing the tab can discard it. |
| Unposted annotation | Session storage and in-memory fallback, scoped to user, personal/room context, and node | Explicit-save draft; unavailable storage retains a departure warning while needed. |
| Canvas appearance and magnetic forces | `localStorage`: `nodus:canvas-design:v1:<encoded-scope>`, scoped to account, personal/room context, and board | Personal display/force settings, independent of canonical `Board.layout` and graph revisions. Existing version-1 preferences remain compatible with the optional magnetic field. |
| Magnetic positions and pins | `localStorage`: `nodus:magnetic-view:v1:<encoded-scope>`, with the same account/context/board scope | Personal view cache. Entries restore only while node/board/base coordinates match; pause preserves the view, Restore clears it, and explicit Apply enters normal document persistence/undo. Not a server backup. |
| Viewport | `localStorage`: `nodus:view:<boardId>` | Pan/zoom independent of graph data. |
| Theme and UI language | Browser-local preferences | Do not alter graph ownership or shared coordinates. |

Shared recovery first fetches the canonical room. Explicit recovery guarded-replays the stored base-to-local difference when safe; conflicting or already-pending recovery uses the copy-as-roots path. Finding a draft alone never overwrites the server.

Lifecycle handlers persist pending work before suspension/departure, attempt a flush on page hiding, retry connection failures on `online`, and prompt on unload when graph changes remain pending. Browser storage and unload events are recovery aids, not guaranteed durable delivery. Only server acknowledgement establishes that the graph is saved; the UI separately marks inline/comment writing.

## Presence

Presence uses the room API and D1 independently of document revision traffic. Production presence is not implemented through BroadcastChannel or a page-local shared store.

| Setting | Default |
| --- | --- |
| Changed cursor/context POST | Coalesced to at most about one request per 500 ms; one POST in flight |
| Idle heartbeat POST | 5,000 ms |
| Peer GET polling | 1,100 ms |
| Network-error backoff | 4,000 ms |
| Server TTL | 15,000 ms; entries at or beyond that age are excluded |
| Active sessions/members | Up to 8 active sessions per person per room; at most 20 members |

The client sends a random session ID, board, world-space cursor or two null coordinates, and selected node ID. Board changes clear the previous pointer; pointer-leave sends null coordinates. Coordinates are finite and bounded. A draft selection absent from the saved graph is sanitized to null. User ID, display name, and deterministic color come from trusted identity, not supplied presence fields.

Presence updates/reads require current membership. Reads filter revoked peers and recheck requester access in the final peer query. POST removes stale rows. The client filters expired peers, ignores out-of-order replies, and suppresses its own session. Hidden pages pause timers; returning resumes them. Unmount/context changes abort outstanding requests. Access failures stop polling and clear peers; ordinary connection failures back off. A disappeared page becomes absent through TTL expiry rather than a guaranteed disconnect message.

## Membership, authentication, and file access

Sites supplies `oai-authenticated-user-id` and `oai-authenticated-user-email`; both are required. Durable ownership uses user ID. There is no anonymous/fixed-user production fallback. The application relies on the trusted Sites gateway to strip forged identity headers.

Editors are bound to normalized sign-in email. Only the immutable owner user ID manages membership. A different account matching the owner's email does not inherit authority from the owner membership row. Unauthorized/revoked room access returns `404` without exposing its document. Invitations record membership and provide `/?room=<id>`; they send no email. The Site access allowlist must separately admit the collaborator.

Room creation serializes an isolated document copy. The UI's `snapshotBoard` includes the selected board and its nested projects, promotes the selection to the shared root, and excludes unrelated private spaces. Later private changes do not flow into that room, and room edits do not rewrite the private record.

All mutation endpoints compare `X-Nodus-User-Id` with the trusted current identity before accepting a body. Missing/mismatched headers return `401 account_changed`. Cross-site requests and mismatched Origin headers are rejected. Upload completion also checks that the workspace identity still matches the original uploader before attaching the result.

Private graph saves and room creation require referenced files to belong to the caller and match canonical metadata. Shared commits may retain a currently shared file or introduce a file owned by the author. Knowing an unrelated asset ID does not grant permission to share it.

A file read is allowed for its uploader, or for a current member of a room currently referencing that exact asset. The query checks the transactional `room_assets` index and the actual document. Removing a reference or revoking membership removes that room-derived grant. The uploader retains access to their original file. Responses are private and not cached.

## Server, schema, and limits

The Worker uses the `DB` and `BUCKET` bindings declared in `.openai/hosting.json`. D1 stores graphs, membership, receipts, presence, and file metadata; R2 stores original bytes. SQL uses prepared statements and bound values. Asset validation uses a bounded JSON ID list with `json_each`, avoiding one query per file and large positional-binding lists.

| D1 table | Key and purpose |
| --- | --- |
| `workspaces` | `user_id`; private serialized graph, revision, update timestamp. |
| `assets` | Asset ID; immutable uploader, storage key, metadata, creation time. |
| `rooms` | Room ID; owner identity, title, serialized graph, revision, timestamps, per-attempt marker. |
| `room_members` | `(room_id, email)`; owner/editor membership. |
| `room_operations` | `(room_id, user_id, operation_id)`; durable request hash, accepted revision, timestamp. |
| `room_assets` | `(room_id, asset_id)`; transactional file-reference index. |
| `room_presence` | `(room_id, user_id, session_id)`; ephemeral profile, cursor, selection, last-seen time. |

`0000_nebulous_champions.sql` creates the private workspace/asset schema. `0001_spooky_medusa.sql`, generated with `npm run db:generate`, adds the five collaboration tables and indexes. Existing migrations are immutable. Checked-in Drizzle snapshots/journal track schema history; request handlers do not create or alter tables. Optional document metadata does not require changing format version 1.

### Persisted bytes versus transport sizes

Private and shared writes call `serializeWorkspace`, limiting UTF-8 serialized graph JSON to **1,900,000 bytes (1.9 MB decimal)**. Media bytes are separate. This leaves metadata headroom under Cloudflare's documented 2,000,000-byte maximum string/BLOB/table-row size; see [D1 platform limits](https://developers.cloudflare.com/d1/platform/limits/). The limit is applied on writes, without rejecting existing records on read solely because of this new threshold.

Transport limits are larger because envelopes and before/after guards are not the stored graph:

| Input | Limit |
| --- | --- |
| Private workspace PUT JSON | 5 MiB request stream |
| Room creation JSON | 5 MiB plus 1,024 envelope bytes |
| Shared PATCH JSON | 12 MiB request stream; at most 30,000 operations |
| Membership or presence JSON | 4,096 bytes |
| Original upload | Nonempty, at most 25 MiB; multipart envelope bounded to 26 MiB |
| Persisted private/shared graph | 1,900,000 serialized UTF-8 bytes |

Graph limits are 2,000 boards, 5,000 nodes, and 20,000 edges. Node titles are at most 500 characters, notes 100,000, annotations 200 per node, and comment bodies 10,000. Coordinates are finite within ±10,000,000, dimensions 32–4,096, and edge width 1–5. Count limits do not override the byte limit. Oversized writes return a clear `413`; local drafts remain available.

### API

All routes require identity. Mutations also require same-origin checks and the expected account header.

| Method and path | Input | Successful response |
| --- | --- | --- |
| `GET /api/workspace` | Authenticated request | `{ document, revision, updatedAt, userId }`; document may be null. |
| `PUT /api/workspace` | `{ document, revision }` | `{ revision, updatedAt }`. |
| `GET /api/rooms` | Authenticated request | `{ rooms, userId, email }`. |
| `POST /api/rooms` | `{ title, document }` | `{ room }`, HTTP 201; isolated copy. |
| `GET /api/rooms/:id` | Optional `?since=<revision>` | `{ document, revision, updatedAt, userId, room, members }`, or `{ unchanged: true, revision, updatedAt, userId, room, members }`. |
| `PATCH /api/rooms/:id` | `{ revision, operations, operationId }` | `{ document, revision, updatedAt, userId, operationId }`. |
| `POST /api/rooms/:id/members` | `{ email }`, owner only | `{ members }`. |
| `DELETE /api/rooms/:id/members` | `{ email }`, owner only | `{ members }`; owner cannot be removed. |
| `GET /api/rooms/:id/presence` | Current membership | `{ peers }`. |
| `POST /api/rooms/:id/presence` | `{ sessionId, boardId, x, y, selectedNodeId }` | `{ peers }`; identity/profile is server-derived. |
| `POST /api/assets` | Multipart with one `file` | `{ id, name, mime, size, url }`, HTTP 201. |
| `GET /api/assets/:id` | Optional `Range`, `?download=1` | Authorized bytes, HTTP 200 or 206. |
| `HEAD /api/assets/:id` | Same authorization/resource | File headers without body. |

A room summary is `{ id, title, role, updatedAt }`; a member is `{ email, role }`. A peer contains session/user IDs, name, hex color, board, nullable cursor coordinates and selection, and an ISO last-seen timestamp.

Errors use `{ error, message }` plus details. Private conflicts include `revision`; shared conflicts include canonical document, revision, timestamp, user ID, operation ID, and conflict descriptions. Important statuses are `400` invalid content, `401` authentication/account change, `403` origin or owner-only rejection, `404` inaccessible room/file, `409` revision/operation conflict, `413` size limit, `415` content type, `416` byte range, `429` excess presence sessions, and `503` unavailable bindings.

## Files and exports

Upload bounds the multipart stream, checks the nonempty file limit, and detects supported signatures. It writes bytes to R2 before metadata to D1; a metadata failure removes the new object where possible.

Known raster images, supported video/audio containers, and PDFs can be inline. HTML, SVG, and unknown formats are downloads with `application/octet-stream`. Responses include `X-Content-Type-Options: nosniff`, a restrictive sandbox policy, private no-store caching, and byte ranges for seeking and PDF reads.

Files are immutable. Removing a node removes its current room-derived file grant but does not delete its R2 object. There is no automatic garbage collector or binary backup bundle. JSON export contains structure and references only; original files are downloaded separately. Import validates graph/file authorization and remaps graph identities when adding recovered roots.

## Verification and its boundaries

The current multi-selection and personal-space deletion regression pass recorded **205 automated tests passing**. This snapshot covers the domain helpers and keyboard scope. The separate [selection and personal-space browser record](SELECTION-SPACES-QA.md) documents completed group gestures, sidebar deletion/recovery, reload and mobile-frame checks, with explicit production-authentication and physical-touch coverage limits.

The connected-growth release passed **181 tests**, TypeScript checking and diff validation. Its [managed-browser verification record](CONNECTED-GROWTH-QA.md) documents measured growth/animation, color/status persistence, keyboard scope, mobile controls and magnetic pin/drag behavior on isolated data.

The earlier clarity release recorded **165 automated tests passing**, with TypeScript checking also passing. The preceding magnetic and living-node releases recorded 157 and 130 tests respectively. These are historical verification snapshots. Suites cover graph/flow, unique incoming/outgoing connection growth and containment, bounded node energy, growth-aware collision placement/layouts, magnetic simulation and guarded application, tasks and anchors, geometry, calendar dates, board-subtree snapshots, private persistence, shared queues/history/recovery, presence, guarded operations, and backend storage/security.

Run the current checkout's checks with:

```bash
node --import ./tests/server-loader.mjs --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
./node_modules/.bin/tsc --noEmit --pretty false
git diff --check
```

Backend tests execute actual SQLite SQL and transactions through a D1-shaped adapter. They use synthetic trusted identities to exercise simultaneous edits, field/structural conflicts, lost-response receipts, concurrent retries, rollback, revocation between read/commit, TTL, shared-file authorization, and byte boundaries. They do not run the deployed Sites authentication gateway or prove two real signed-in accounts can access the deployment.

The connected-growth regressions in `tests/node-growth.test.ts` cover incoming hubs, reciprocal/task deduplication, monotonic growth after adding reverse edges, delete/restore, bounded reachability and large synthetic graphs. `tests/node-energy.test.ts` checks isolated activity, monotonic bounded timing/intensity and finite output. Magnetic regressions add 20/50-branch and one-sided hubs, mixed radii, pinned/held collision behavior, consistent 60/30/20-step results and retained velocity/center across same-scope rebuilds. These are deterministic isolated inputs, not measurements of an authenticated user's board or a browser frame-rate guarantee.

`tests/node-selection.test.ts` adds rectangle/projection cases, stable add/toggle/replace behavior, board-scoped bulk mutations, task-parent preservation/promotion, invalid-value atomicity, no-op identity, overlapping contained deletions, 5,000-node edits and iterative deep traversal. `tests/personal-spaces.test.ts` verifies subtree counts, deleting home or another root, fresh blank replacement for the last root, missing/nested/foreign no-ops, protection of unrelated roots, defensive reference cleanup, graph validation, actual `WorkspaceStore` single Undo/Redo and a 2,000-board chain. The keyboard tests separately verify Ctrl/Cmd+A is confined to graph focus.

`tests/browser/flow-fixture.html` mounts the real app against a synthetic private API; `flow-mobile.html` provides a narrow frame. `tests/browser/shared-fixture.html` mounts two real `NodusApp` sessions in separate frames against a synthetic canonical server with synthetic owner/editor identities. It uses protocol application and graph validation, and can simulate network interruption or lost acknowledgements. Fixture state uses session storage. API requests are intercepted or blocked, real attachment access is disabled, and fixtures are development-only. Their in-page cooperation is test infrastructure, not the production transport.

`tests/browser/living-fixture.html` embeds the real app using the isolated `fixture-living-nodes` identity and a deterministic scene of 37 nodes, 30 edges and three boards. It includes 0/5/20-branch nodes, long Persian text, a saved annotation, tasks/subtasks and a nested project. Reset and 390 × 844 frame controls support repeatable checks. Its workspace mock validates revisioned saves, reports write/branch metrics and uses a separate session-storage key. Other API calls are mocked or blocked, and there are no asset references. The flow fixture's default scene and production entrypoints/authentication are unchanged.

`tests/browser/growth-fixture.html` (route `/tests/browser/growth-fixture`) embeds `/tests/browser/growth-session` under `fixture-growth-ui`, using `growth-home` and `nodus:ui-fixture:growth:server:v1` for isolated session-storage persistence. Its deterministic scene has 20 nodes and 17 edges: `growth-isolated` has zero neighbors, `growth-five` has five, and `growth-twelve` has twelve, including ten incoming links. `growth-task-todo` and `growth-task-done` supply two explicit children of `growth-five` and its initial 1/2 counter; duplicate graph/task relationships still count as five neighbors. The real `NodusApp` runs with revision-validated synthetic saves, reset/write metrics and a 390 × 844 frame option. Attachment access and shared-room writes are blocked. A DEV-and-route guard prevents the fixture session from serving as a production entrypoint. Fixture definitions document available checks; completed browser results must be recorded separately.

### Previous living-node release

That managed-browser pass confirmed immediate click-to-dialog, real content, initial focus, trapped Shift+Tab, and return focus on close. F2 → Tab child → Enter sibling → Escape completed the writing flow, with growth updating after additions and Delete/Undo. Dragging an enlarged neuron's center moved the intended node without opening a popup. The scene reported 0/5/20 direct branches; at 45% fit zoom, all 25 visible edges showed flow and particles while hover/animation produced zero writes. Switching to cards and applying the neural layout showed six animated card frames, three flow paths and three moving signals.

The desktop popup displayed all 1,515 characters of the Persian note without horizontal overflow and used a 29 px title. An annotation draft survived close/reopen and then explicit Save. A blank X coordinate blocked closing without losing the draft; X = 1,200 saved, and restoring the original position worked. Task completion updated progress to 2/3, and selecting child details kept one modal. Entering the nested project from its popup and adding a node updated the parent's contained count to four and recalculated growth.

After the neural layout settled in card view, the six cards had zero bounding-rectangle overlaps and correct edge anchors. Hover enlarged the card and previewed the real 1,515-character note. Disabling one edge's animation reduced both flow and particle counts from three to two while six card frames remained animated; re-enabling restored both counts to three.

At 390 × 844, the popup occupied x = 14–376 and y = 8–836, with width 362 px and equal `clientWidth`/`scrollWidth` of 360 px. Title and text measured 25 px and 16 px. Ctrl+End placed the textarea selection at 1,515/1,515 with `scrollTop` 1,372 and `scrollHeight` 1,618. Keyboard focus reached lower actions, colors and date controls while the header close button remained visible; that button closed the popup successfully.

### Previous magnetic release

The real app was checked in the isolated living fixture. Start/Pause, all four force sliders and the settled status worked; a native keyboard adjustment changed distance from 180 to 170 in RTL. Pinning `living-twenty` held its center while other nodes moved. Pause and reload restored all 28 projected positions byte-for-byte, including the pin. Simulation movement caused zero workspace writes before Apply layout; Apply produced one write and cleared dirty state, and Undo produced the second write and restored the layout. Restore later cleared personal positions, pins and dirty state, paused the mode and made no workspace save.

Right-click pinning and native pointer dragging moved the pinned center from (706, −114) to (891.94, −312.20), retaining its pin. Native hover exposed a preview-placement bug; after the fix, side placement avoided overlap with the source node. Tab → child title → Enter → sibling title → Escape created two linked nodes. Inline editing paused the magnetic loop and movement resumed afterward. The six-node card board settled with zero bounding-rectangle overlaps and zero extra writes; this observed fixture result is not a guarantee of overlap-free settling for every graph.

The popup reported `data-motion-origin="node"` and a 380 ms entrance. An invalid X = 20,000,000 blocked closing with `aria-invalid`; Escape canceled the field draft, and eventual close restored focus to its source. At 390 × 844, the final popup bounds were x = 14, y = 8, width = 362 and height = 828 px, with `clientWidth` = `scrollWidth` = 360 px. The magnetic panel measured x = 12, y = 134, width = 316 and height = 626 px; its footer remained inside and `clientWidth` = `scrollWidth` = 314 px. The light-theme panel used the corrected darker accent and had no horizontal overflow. The current screenshots are [magnetic network](screenshots/nodus-magnetic-network.jpg) and [source-node popup](screenshots/nodus-magnetic-popup.jpg).

### Coverage limits

Reduced-motion behavior was reviewed in code; runtime behavior remains unverified. The earlier hidden-page check was inconclusive: switching Chrome tabs through desktop automation left the inspected canvas at `data-motion="on"`, which did not establish hidden-page pausing. The implementation handles reduced-motion and document visibility, but those runtime checks are not counted as passed for this release.

Managed-browser fixture results establish UI behavior against synthetic servers. They are not evidence of production sign-in, two real signed-in users, Site allowlist setup, cross-account R2 access, physical touch devices, or native IME sessions. See the [README verification record](../README.md#browser-verification) for verified behavior and remaining coverage limits.

## Current scope and extension points

Shared editing and live presence are implemented by the room service. Synchronization is polling-based and subject to latency/backoff; presence is ephemeral, and same-text-field conflicts require resolution. There are no editing locks, character-level CRDTs, invitation emails or calendar reminders. Optional magnetic movement belongs to a personal view and reaches shared coordinates only through explicit guarded application; it does not continuously rearrange the server document. Decorative node/edge animation is independent of saved layout.

Content remains user-authored. There are no model credentials, AI generation, PDF text extraction, transcription, or background analysis. Potential extensions include explicitly bounded analysis jobs, portable graph-plus-media backups, asset garbage collection, and explicit cross-board references. Each needs its own authorization, persistence, and failure behavior rather than weakening revision or ownership checks.

## GitHub Pages startup recovery quarantine (ND-024, branch-only)

The optional static Pages bundle `pages/index.html` uses a separate, local-only IndexedDB store (`nodus-pages-v1`, `workspace/main`). It does **not** share D1/R2 or authenticated workspace data. Only an absent IndexedDB **key** may start a blank workspace: when `get('main')` returns `undefined`, `getKey('main')` in the same read transaction distinguishes absence from a present key whose stored value is `undefined`. A present but invalid record triggers `CorruptWorkspaceError` with its unmodified raw value and a visible blocking recovery dialog. A failed key-presence probe also fails closed; it never defaults to an editable blank document. While recovery is pending, `mutate`, Undo/Redo and `queueSave` refuse writes. To recover, the user first triggers raw JSON export, then deliberately imports a valid backup or confirms fresh initialization. `restoreLocalDocument` persists successfully before replacing the in-memory graph, clearing recovery mode and invalid Undo history. The raw JSON export additionally checks every value in the structured-clone record before unlocking import/reset. If JSON would silently discard or change a Map, Set, Date, typed array, undefined property, non-finite number, sparse array, circular/aliased object, or other non-JSON-safe value, download is rejected and no destructive action is enabled. This deliberately prioritizes raw data preservation over convenient but incomplete export; users with unsupported raw records need a future lossless recovery/export path. If export or persistence fails the original record stays untouched. This change is **not yet deployed**; see [ND-024 QA](ND-024-STARTUP-RECOVERY-QA.md) for outstanding browser and native gates.

### Local-first static-edition startup read failures (ND-024 branch-only)

The separate `pages/index.html` edition uses IndexedDB `workspace/main`. Both malformed records and failed opens/reads place the session in a non-writing recovery quarantine before normal editing is enabled. If an error provides raw record bytes/values, export remains available only when a lossless JSON check succeeds; unknown raw data must never be mistaken for an absent record or an empty persisted document. In that case only non-destructive Retry reading is available until the store can be read. Explicit imported recovery or reset still requires an existing backed-up raw record. This behavior is not the authenticated Site/D1/R2 protocol and is not yet released; actual browser verification remains required.

### Retry snapshots must be freshly observed (ND-024 branch-only)

A `retryRecovery()` read failure with no new `CorruptWorkspaceError.raw` observation **must not** reuse a prior raw snapshot as evidence of the current IndexedDB record. Generic read/open errors set `rawAvailable=false` and revoke `backupTaken`, keeping only non-destructive Retry enabled. Fresh corrupt observations may expose raw data for lossless backup after separate user confirmation. This never calls `persist`, and valid re-read still unlocks and discards stale Undo without writing. This Pages-local safeguard remains **unreleased** pending native build, browser/IndexedDB and source-tree QA; see [stale retry QA](ND-024-STALE-RETRY-QA.md).

### Guarded recovery replacement in static Pages bundle (ND-024; branch only)

The recovery dialog's Import JSON / Start fresh controls must not overwrite a record that changed in another tab since the user downloaded the raw backup. When `state.storageRecovery` exists, `restoreLocalDocument` uses `persistRecoveryIfUnchanged`, which compares the stored `workspace/main` raw value to the previously backed-up value by `serializeRecoverySafely` **within the same IndexedDB readwrite transaction** before issuing `put`. A changed, removed, unreadable, non-lossless or unwritable record rejects the transaction without unlocking the UI; the stale backup permission is revoked and Retry is offered. A transaction completion is required before applying the new in-memory document. Normal non-quarantined imports retain the separate existing persistence path. This safeguard is unreleased and does not protect ordinary multi-tab edits outside quarantine; native browser transaction/reload testing remains a publication gate. See [guarded recovery QA](ND-024-GUARDED-RECOVERY-QA.md).


### Pending local writes are not acknowledged imports (ND-024; branch only)

The optional local-first Pages edition's `queueSave` returns `true` only when the queued IndexedDB transaction completes and `false` if it rejects. This result is not interchangeable with the authenticated Site save acknowledgement. A normal replacement JSON import waits for the last queue outcome and refuses to discard current edits when it is `false`, leaving memory/Undo unchanged; the user must retry saving. The Details Save control awaits the same outcome and retries the current graph if its title/notes flush did not enqueue a new edit, rather than displaying premature success. The previous quarantine-only transactional raw-backup check remains a distinct safeguard. This change is **only on the static Pages ND-024 branch**, not shipped, and does not add general multi-tab conflict detection. See [pending-save QA](ND-024-PENDING-SAVE-QA.md).

### Local-first Pages: unsaved-close acknowledgment (ND-024 branch only)

The optional `pages/index.html` edition, distinct from the authenticated server backend, serializes `queueSave` IndexedDB writes. On a committed graph mutation (including Undo/Redo), `state.unsavedChanges` becomes true. Only a fulfilled transaction whose JSON snapshot still matches the *current* document clears it. An earlier acknowledged write leaves the status *Saving…* while newer mutations remain. Failures preserve dirty state, local graph, Undo and JSON Export. A native `beforeunload` handler requests browser confirmation while dirty; its dialog text is browser-controlled. A validated completed import or safe recovery reload resets the dirty state, not an export click. This is a transient tab/session signal, not a new schema field; no writes are performed by the unload handler. Implementation `pages/index.html`; QA: [ND-024 unsaved exit](ND-024-UNSAVED-EXIT-QA.md). **Branch only; native browser/IndexedDB gate unverified.**

### Normal JSON import cross-tab compare-and-save (ND-024, branch only)

The static local-first `pages/index.html` now keeps a `storedBaseline` for the last successfully read record (`null` for an actually absent `workspace/main`; `undefined` means unknown) and updates it only after an IndexedDB write transaction acknowledges completion. This is distinct from in-memory `state.doc` and distinct from the quarantined `storageRecovery.raw` evidence. An ordinary JSON import first awaits local queued saves, then `persistImportIfUnchanged` uses one readwrite transaction to compare the persisted record to the last observed/acknowledged baseline and commit the new snapshot only on a match. A missing key is separately checked with `getKey` so a *present* `undefined` value is not mistaken for empty. Lossless raw serialization is required for comparison; absent/changed/unreadable values fail closed.

A `LocalImportConflictError` does not replace the visible graph, selection or Undo/Redo. It marks the tab as stale (`localConflict`) and keeps the unsaved-exit warning armed; `queueSave` refuses further writes until the user exports the in-memory JSON and reloads the current stored version. Unrelated transient write errors do not set this conflict latch; the existing save-failure feedback and retry path remain. Recovery-quarantine import remains on its separate guarded raw-backup transaction. This is not general multi-tab co-editing and does not change the authenticated Site/D1/R2 model or schema. Code commit `04ae00fa3025bdefc1686fbf139dd3770e86f8eb`; QA: [ND-024 ordinary import conflict](ND-024-ORDINARY-IMPORT-CONFLICT-QA.md). Browser/natively executed release gates are pending; **branch only, not published**.

### Atomic ordinary autosave conflict guard (ND-024; branch only)

The optional static Pages edition previously guarded JSON Import but not its normal `persist(snapshot)` path. The new implementation delegates ordinary `persist` to the same `persistImportIfUnchanged(snapshot, baseline)` transaction as Import. `queueSave` supplies `state.storedBaseline` *at execution* after prior saves have acknowledged, so successive local saves compare against the latest completed write. In the same IndexedDB readwrite transaction, a mismatched/foreign record, missing key, present-undefined record, unknown baseline or non-lossless value prevents `put`; `LocalImportConflictError` latches `localConflict` and `unsavedChanges`, with localized status/toast. Queued later saves are refused. A quota failure does not latch a false peer conflict and can be retried. JSON export remains possible to preserve the local draft before reload. No merge with authenticated private/shared D1/R2 data, migration or per-frame writes.

Source [`46a642a9`](https://github.com/iAlirezaaa/nodus/commit/46a642a956972b7c74675b8c20cdfc842dc2c1a3); [QA](ND-024-ORDINARY-SAVE-CONFLICT-QA.md). This is **unreleased**; local native helper tests are not substitutes for full checked-in tests, real IndexedDB or the Site release gate.


### Static Pages: canvas-only keyboard commands (ND-024, unreleased branch)

The experimental local-first `pages/index.html` edition uses both article-local and document-level keyboard listeners. The document listener now ignores `defaultPrevented` and IME/composition keystrokes and handles graph commands only with focus on `#canvas` or its focusable `article.node` itself. Prior article Enter, F2 and Delete handling prevents default, so bubbling cannot repeat an edit; Tab adds a child only forwards from a focused selected article. Shift+Tab remains native reverse focus. Focused toolbar/inspector buttons and form controls keep their Enter/Delete/Undo behavior; search-modal Escape and recovery-modal focus rules retain priority. This changes neither graph persistence nor per-frame motion. Implementation [`7e646c2f`](https://github.com/iAlirezaaa/nodus/commit/7e646c2fb429b985712f1982521e28339633b2af); [QA](ND-024-KEYBOARD-CONTEXT-QA.md). **Only on `fix/nd-024-startup-storage-recovery`, full native and real-browser checks still blocked; not Released.**


### Static Pages search-dialog focus lifecycle (ND-024, branch-only)

`pages/index.html` stores the search opener as transient in-memory DOM focus plus a node ID. The node ID permits restoration to its replacement `article.node` after a graph rerender; a removed node falls back to `#canvas`, and non-graph openers return to their mounted control or the Search toolbar button. Escape, Close and backdrop share `closeSearch()`. Clicking a result uses `closeSearch(false)`, then the existing board switch, selection, render and `focusSelected()`; returning to the old opener must never override result navigation. This state is not persisted and never produces an IndexedDB write. [Source `485e5254`](https://github.com/iAlirezaaa/nodus/commit/485e52546abfa5eeaf4d6a05fc6b3bd8e3b31191), [QA](ND-024-SEARCH-FOCUS-QA.md); full native/browser/Sites gates blocked, **not released**.

## Branch-only ND-024 Pages Search focus-frame guard (2026-11-17)

In `fix/nd-024-startup-storage-recovery` only, the local-first `pages/index.html` Search dialog restores its opener on dismissal. Its scheduled `requestAnimationFrame` input-focus callback now rechecks that the dialog is not hidden; this prevents a just-closed dialog from taking keyboard focus back during a late frame. It is view-only and never writes a graph state, storage record, history entry or per-frame persisted position. The source remains unreleased pending real browser and full native checks; see [focused QA](ND-024-SEARCH-FOCUS-QA.md). This note describes unmerged branch behavior, not the current hosted Site.


### Static Pages Search Tab containment (ND-024, branch-only, unreleased)

The optional local-first `pages/index.html` Search modal is a non-native `role=dialog` overlay. `trapSearchTab(e)`, invoked by its document keydown handler only while Search is visible and for plain Tab/Shift+Tab, resolves enabled controls in DOM order: Close, input, and current rendered result buttons. It wraps at both boundaries and repairs external focus. Ctrl/Meta/Alt+Tab is left for browser/OS navigation; Escape closes through the existing opener-restoration path; result buttons still navigate and focus the destination graph card. The handler returns before global graph commands while Search is open; ordinary text/IME handling is unchanged. This is transient focus state only, without IndexedDB, graph/Undo, collaboration, or animation writes. [QA](ND-024-SEARCH-TAB-QA.md) and source commit `d42b21eb`; native/browser/build/Sites release gates remain Blocked.


### Local-first Pages keyboard safety (ND-024, 2026-11-17; branch only)

The optional standalone `pages/index.html` is separate from the authenticated React+API Site. Its focused graph-card and document-level keyboard handlers reserve creation for **unmodified** Enter and forward Tab; Ctrl/Meta/Alt combinations and Shift+Enter do not create nodes, and the card handler rejects events already prevented, composing via IME, or with keyCode 229. Inputs, Search modal and native browser shortcuts keep their own keyboard boundaries. This guard changes interaction routing only, not persistent graph data, undo, collaboration, animations or hosting. Tests and release restrictions: [ND-024 modified-keyboard QA](ND-024-MODIFIED-KEYBOARD-QA.md). The branch-only change is **not** an active Site feature until full verification and deployment.

### Optional Pages JSON import safety ceiling (ND-024, branch only, 2026-11-17T19:21:21.840Z)

The experimental local-only `pages/index.html` accepts individual media attachments up to 5 MiB. Three near-limit attachments produce a base64-encoded JSON export over the old 15 MiB restore ceiling. The existing **Import JSON** input now allows a single file through **64 MiB** (67,108,864 bytes), rejecting larger files before reading to bound `file.text()`/JSON parse memory. It neither truncates contents nor alters the canonical server storage, workspace model, owner data, or two-tab conflict-guarded transaction; normal validation and explicit confirmation still apply. A backup over 64 MiB remains unsupported without separate streaming import work. [QA](ND-024-LARGE-BACKUP-QA.md). This is a branch-only change, **not** enabled on the hosted Site.

### ND-024 — asynchronous local media target binding (branch-only, 2026-11-17T20:20:38.433Z)

The optional static Pages **Details → Media** picker uses asynchronous FileReader decoding. It now captures both the selected thought ID and its board **before** reading. If selection or active board changes before the read finishes, the pending media is discarded with an FA/EN retry notification; it is never attached to a newly selected thought. If no thought was selected at file pick time, reading is skipped. Stable selection retains the current 5 MiB, MIME and mutation/Undo behavior. The aborted path makes zero document writes or Undo records and does not interact with animation/frame loops. This is an unreleased `fix/nd-024-startup-storage-recovery` ND-024 fix, distinct from the authenticated Site. [QA](ND-024-MEDIA-TARGET-RACE-QA.md); native project/build/real UI/Sites gates remain Blocked.
