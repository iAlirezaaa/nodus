# Nodus architecture

Nodus stores editable graphs on the server, supports private workspaces and shared rooms, and renders those graphs as a spatial canvas. Collaboration uses authenticated HTTP requests, guarded field operations, and ephemeral server presence. Browser storage provides scoped recovery and personal display preferences; it is not the canonical shared database.

## Implementation map

| Area | Main implementation |
| --- | --- |
| Interfaces and constraints | `lib/types.ts`, `lib/server/validation.ts`, `lib/node-features.ts`, `lib/calendar.ts` |
| Graph edits, derived growth, keyboard placement, share snapshots | `lib/graph.ts`, `lib/node-growth.ts`, `lib/flow.ts`, `lib/board-snapshot.ts` |
| Canvas, content popup, application coordination | `components/Canvas.tsx`, `components/Inspector.tsx`, `components/Modal.tsx`, `components/NodusApp.tsx` |
| Layouts and personal appearance | `lib/layouts.ts`, `components/DesignPanel.tsx`, `hooks/use-canvas-preferences.ts` |
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

### Annotations and dates

Annotations contain a quote, UTF-16 start/end offsets into the title or notes, a comment, color, resolution state, and timestamps. Attached anchors must match the exact source quote. `patchNode` shifts unambiguous anchors when text is inserted before them and preserves unaffected anchors. Changed, deleted, or ambiguous quotes remain as orphaned comments; the helper does not guess a new attachment elsewhere. Orphan offsets remain bounded and can be zero-width. Explicit reattachment selects a new source range.

Inline titles, inspector edits, duplication title changes, and project renaming use `patchNode`; contained board titles stay synchronized with their owning nodes. Annotation drafts have explicit Save/Cancel behavior and remain separate from posted graph data. Save only clears a draft after the workspace accepts the local mutation. A skipped update during loading or a validation failure preserves the draft.

`scheduledAt` is an optional calendar date on any node, formatted `YYYY-MM-DD`. `lib/calendar.ts` validates the actual calendar date, including invalid days and leap years. It is not a timestamp or reminder. Timeline grouping uses it when present and otherwise the creation date. Display formatting preserves the calendar day instead of shifting it through the viewer's time zone.

## Canvas and layouts

`Canvas.tsx` uses DOM nodes and SVG connections in a transformed world layer. Pointer events provide pan, pointer-centered zoom, pinch, dragging, and bend-handle interaction. Off-screen items are culled, detail changes with zoom, and memoized cards/connections use stable event dispatchers. View changes coalesce into animation frames; dragging recomputes incident edge geometry. These are bounded rendering strategies, not a promise of a particular frame rate for every graph and device.

### Neural display and saved geometry

The default display is `neuron`: a luminous core, readable label, and contextual preview. `buildNodeGrowth` derives weight from unique outgoing graph/task children, reachable descendants and nodes in contained projects. Incoming degree and text length do not contribute. Cycles and converging paths count each reachable node once; descendant counting saturates at 128 with a separate overflow flag, while direct and nested counts remain exact. Growth is derived visual state, not a saved dimension change.

Neuron cores use the full bounded growth scale. `projectCardNode` applies a restrained scale around the saved center for card rendering, explicit layouts and keyboard collision checks. Connection endpoints, fit and hit areas use the displayed geometry. Switching presentation does not rewrite `x`, `y`, `width` or `height`.

Hover opens a screen-space preview with real content and project/media affordances, readable at overview zoom. An unmoved click opens the full content popup immediately; drag and connection gestures retain their separate intent. F2 starts inline title editing. Full content uses the current workspace node rather than a copied snapshot, and opening a contained project changes the active board.

Peer cursors are drawn at world coordinates with inverse zoom scaling. Only peers on the active board are drawn, and off-screen cursors are culled. Peer selections add labeled accents to existing nodes; they are indicators, not editing locks.

Connections support curved, straight, and orthogonal elbow routes. Bend dragging previews locally and commits on release. Route, stroke, width, color, endpoints, and bends are document changes. Node breathing/glow and directional edge flow persist across neuron/card views and zoom levels. Every visible eligible edge has a flow path; bright particles are distributed over at most 36 edges plus an eligible selected edge. Per-edge `animated: false` disables its flow and particle. Hidden pages and reduced-motion preferences use static presentation without active particles. These visual effects and hover interactions do not write graph data or move saved positions. Canvas media previews do not autoplay audio or video.

### Six explicit layouts

`arrangeWorkspace` applies a chosen layout to the active board in one undoable document change. Collision spacing uses growth-expanded card projections shared with rendering and keyboard placement. It preserves other boards, content and stored dimensions, writes bounded coordinates, and clears custom bends on the arranged board.

| Layout | Behavior |
| --- | --- |
| Neural | Groups connected components, uses a bounded deterministic force calculation on smaller boards, and packs connected chunks above 250 nodes. There is no continuous force simulation. |
| Tree | Places directed branches and task relationships in levels, handling cycles and disconnected components. |
| Orbit | Organizes thoughts around prominent connected ideas. |
| Grid | Packs variable-size cards into a regular browsing layout. |
| Timeline | Groups thoughts by scheduled or creation date and shows date guides. |
| Kanban | Places tasks in To do, Doing, and Done lanes, with an Ideas & references lane for other nodes. |

Sort choices include creation time, title, kind, color, and task status, with ascending/descending order and bounded spacing. Suggestions use graph statistics such as links, tasks, dates, and media; they do not call an AI service.

Applied layout is canonical board metadata: `Board.layout` records kind, sort, direction, spacing, language, and optional fixed Kanban `columnStep` alongside the saved coordinates. Shared peers receive the same arrangement and guides. Stored orientation and lane spacing prevent guides from drifting when a viewer changes UI language or a task changes status. Guide captions can use the viewer's language without changing their geometry. Layout is a one-time manual application: branch growth, task status or scheduled dates do not automatically move existing cards. Reapply the layout to reposition them; decorative motion continues independently of layout.

Personal appearance remains separate. Node display mode, background, density, accent, and connection-label visibility are scoped to account, room-or-personal mode, and board in local storage. They do not create shared revisions. Viewport pan/zoom is stored under the board ID; theme and UI language are browser preferences. Preference storage failures leave the current view usable and are surfaced where appropriate.

## Editing and client state

`useWorkspace(language, roomId)` exposes a common React interface over two stores. A missing room ID selects the private `WorkspaceStore`; a room ID selects `SharedWorkspaceStore`. Both provide stable actions and `useSyncExternalStore` snapshots. Navigating between boards does not create another writer. Store switching persists the outgoing draft and suspends its lifecycle; pending writable changes must be saved or recovered before switching rooms.

### Continuous keyboard entry

`use-thought-flow.ts` owns one inline session while the input owns temporary text. A blank new thought is a view-only node. Its first nonempty commit inserts the node and connection atomically, producing one undo item rather than an item per character. Existing inline titles also commit as a complete graph edit.

Enter creates a sibling; Tab creates a child. For tasks, a sibling retains the source task's explicit parent and a child points to the source task. Task roots remain roots even with incoming graph edges. Ordinary thoughts use the first valid incoming edge for parent navigation. `prepareThought` measures growth-expanded occupied cards and the parent's prospective growth after adding the branch, placing only the new thought in the interface's RTL/LTR direction. It never rearranges existing thoughts. Shift+Tab moves toward the parent, arrows follow physical positions, and Ctrl/Command+Enter opens a nested project. F2 edits the title in place; normal textareas retain native multiline editing.

The input guards IME composition and deduplicates blur following a keyboard commit. Navigation and page-departure paths read the current DOM value. A capture-phase unload handler runs before store recovery checks; failed commits retain editable text and can trigger the departure guard. Blank new drafts never become durable graph data. Account ownership is checked again before commit, and external controls keep focus after a blur commit.

### Content popup and draft lifecycle

`Modal` owns the focus scope, initial focus, inert background, Escape handling and return focus. The node popup starts on its introduction for a click or in notes for Shift+Enter. Tab and Shift+Tab remain inside, including from a non-tabbable introductory element. Dismissal returns focus to the source node; leaving for inline writing, connection mode or a nested board lets the destination own focus after the popup unmounts. Composition and handled field keys are not repurposed as dismissal.

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
| Private unsaved graph | `localStorage`: `nodus:workspace:draft:<userId>` and `recovery` variant | Document/base revision; survives reload and normal browser restarts while storage remains available. |
| Shared unsaved graph | `sessionStorage`: `nodus:shared:draft:<encoded-userId>:<encoded-roomId>` and `recovery` variant | Base/local documents, revision, timestamp. Per-tab storage avoids one tab replacing another's draft; closing the tab can discard it. |
| Unposted annotation | Session storage and in-memory fallback, scoped to user, personal/room context, and node | Explicit-save draft; unavailable storage retains a departure warning while needed. |
| Canvas appearance | Local storage scoped to account, personal/room context, and board | Personal display settings, independent of canonical `Board.layout` and graph revisions. |
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

The living-node release regression pass recorded **130/130 automated tests passing**. Suites cover graph/flow, unique branch growth and containment, growth-aware collision placement/layouts, tasks and anchors, geometry, calendar dates, board-subtree snapshots, private persistence, shared queues/history/recovery, presence, guarded operations, and backend storage/security. This is a verification snapshot, not a claim that every browser or deployment condition is covered.

Run the current checkout's checks with:

```bash
node --import ./tests/server-loader.mjs --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
./node_modules/.bin/tsc --noEmit --pretty false
git diff --check
```

Backend tests execute actual SQLite SQL and transactions through a D1-shaped adapter. They use synthetic trusted identities to exercise simultaneous edits, field/structural conflicts, lost-response receipts, concurrent retries, rollback, revocation between read/commit, TTL, shared-file authorization, and byte boundaries. They do not run the deployed Sites authentication gateway or prove two real signed-in accounts can access the deployment.

`tests/browser/flow-fixture.html` mounts the real app against a synthetic private API; `flow-mobile.html` provides a narrow frame. `tests/browser/shared-fixture.html` mounts two real `NodusApp` sessions in separate frames against a synthetic canonical server with synthetic owner/editor identities. It uses protocol application and graph validation, and can simulate network interruption or lost acknowledgements. Fixture state uses session storage. API requests are intercepted or blocked, real attachment access is disabled, and fixtures are development-only. Their in-page cooperation is test infrastructure, not the production transport.

`tests/browser/living-fixture.html` embeds the real app using the isolated `fixture-living-nodes` identity and a deterministic scene of 37 nodes, 30 edges and three boards. It includes 0/5/20-branch nodes, long Persian text, a saved annotation, tasks/subtasks and a nested project. Reset and 390 × 844 frame controls support repeatable checks. Its workspace mock validates revisioned saves, reports write/branch metrics and uses a separate session-storage key. Other API calls are mocked or blocked, and there are no asset references. The flow fixture's default scene and production entrypoints/authentication are unchanged.

The current managed-browser pass confirmed immediate click-to-dialog, real content, initial focus, trapped Shift+Tab, and return focus on close. F2 → Tab child → Enter sibling → Escape completed the writing flow, with growth updating after additions and Delete/Undo. Dragging an enlarged neuron's center moved the intended node without opening a popup. The scene reported 0/5/20 direct branches; at 45% fit zoom, all 25 visible edges showed flow and particles while hover/animation produced zero writes. Switching to cards and applying the neural layout showed six animated card frames, three flow paths and three moving signals.

The desktop popup displayed all 1,515 characters of the Persian note without horizontal overflow and used a 29 px title. An annotation draft survived close/reopen and then explicit Save. A blank X coordinate blocked closing without losing the draft; X = 1,200 saved, and restoring the original position worked. Task completion updated progress to 2/3, and selecting child details kept one modal. Entering the nested project from its popup and adding a node updated the parent's contained count to four and recalculated growth.

After the neural layout settled in card view, the six cards had zero bounding-rectangle overlaps and correct edge anchors. Hover enlarged the card and previewed the real 1,515-character note. Disabling one edge's animation reduced both flow and particle counts from three to two while six card frames remained animated; re-enabling restored both counts to three.

At 390 × 844, the popup occupied x = 14–376 and y = 8–836, with width 362 px and equal `clientWidth`/`scrollWidth` of 360 px. Title and text measured 25 px and 16 px. Ctrl+End placed the textarea selection at 1,515/1,515 with `scrollTop` 1,372 and `scrollHeight` 1,618. Keyboard focus reached lower actions, colors and date controls while the header close button remained visible; that button closed the popup successfully.

Reduced-motion runtime behavior remains unverified. The hidden-page check was inconclusive: switching Chrome tabs through desktop automation left the inspected canvas at `data-motion="on"`, which did not establish hidden-page pausing. The implementation handles reduced-motion and document visibility, but those runtime checks are not counted as passed.

Managed-browser fixture results establish UI behavior against synthetic servers. They are not evidence of production sign-in, two real signed-in users, Site allowlist setup, cross-account R2 access, physical touch devices, or native IME sessions. See the [README verification record](../README.md#browser-verification) for verified behavior and remaining coverage limits.

## Current scope and extension points

Shared editing and live presence are implemented by the room service. Synchronization is polling-based and subject to latency/backoff; presence is ephemeral, and same-text-field conflicts require resolution. There are no editing locks, character-level CRDTs, invitation emails, calendar reminders, or continuous background rearrangement. Decorative node/edge animation is independent of saved layout.

Content remains user-authored. There are no model credentials, AI generation, PDF text extraction, transcription, or background analysis. Potential extensions include explicitly bounded analysis jobs, portable graph-plus-media backups, asset garbage collection, and explicit cross-board references. Each needs its own authorization, persistence, and failure behavior rather than weakening revision or ownership checks.
