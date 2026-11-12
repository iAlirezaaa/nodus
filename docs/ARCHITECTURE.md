# Nodus architecture

## Product model

A workspace is a versioned JSON document containing `boards`, `nodes` and `edges`, plus the ID of its home board. A user has one workspace record, which may contain many independent root boards and nested boards.

| Entity | Purpose |
| --- | --- |
| Board | Names a canvas and records the node that contains it, if any. |
| Node | Stores a title, text, position, size, color and content kind. It can reference an uploaded asset, a web URL and a child board. |
| Edge | Connects two nodes on the same board and optionally carries a label. |
| Asset | Records the original file's owner, name, detected MIME, byte size and private R2 key. |
| Viewport | Stores pan and zoom separately from the document, as a device-local preference. |

The canonical TypeScript interfaces are in `lib/types.ts`.

### Connections versus containment

An edge is a relationship between ideas. Several nodes can connect to the same idea and ordinary connections can form cycles. Each nested board has one containing node; the board's `parentNodeId` and node's `childBoardId` must agree. Containment must be acyclic.

Any node can gain a child board without discarding its existing text, media or URL. The content kind and containment relationship are independent. Child boards are opened as their own canvas rather than recursively mounting every descendant on the parent canvas.

`lib/graph.ts` implements graph updates, branch placement, board layout, nested project creation, recursive deletion, navigation trails and fit-to-content calculations. Graph functions return updated documents so history and save state can retain earlier snapshots.

## Interface

`components/Canvas.tsx` renders nodes as DOM elements and connections as SVG curves in a transformed world layer. Pan, pointer-centered zoom, touch pinch and node movement use pointer events. Off-screen nodes are culled. Zoom-dependent detail reduces card contents at smaller scales. A node's original dimensions and coordinates remain part of the saved graph.

`components/Inspector.tsx` reads and edits the selected node and previews its attachment. Video and audio controls are presented in the expanded editor; canvas cards do not autoplay media. The node's internal project is reached through an explicit action. Viewports are saved per board on the device, independently of server document revisions.

`hooks/use-workspace.ts` connects React to `hooks/workspace-store.ts`. The store owns the document and save queue, so navigating between boards does not create separate competing writers.

## Save lifecycle

1. The client loads `/api/workspace` using the current authenticated identity.
2. An account with no saved document receives editable starter content, which is then saved through the same API as user content.
3. A user mutation creates an in-memory snapshot, updates the undo stack and writes a recovery draft when browser storage is available.
4. The debounced queue sends the entire document with its last acknowledged revision.
5. The server validates the document and its attachment ownership, then performs a conditional insert or update.
6. The client marks the document saved only after the server returns a newer revision. Edits made during that request are sent afterward using the acknowledged revision.

The client keeps up to 60 undo snapshots in memory. Recovery drafts are namespaced by authenticated user ID. Browser local storage is a recovery aid, not the durable record store. Storage quota failures are surfaced rather than treated as successful persistence.

### Conflicts and connection failures

The initial save uses `INSERT ... ON CONFLICT DO NOTHING`. Subsequent saves use `UPDATE ... WHERE user_id = ? AND revision = ?`, incrementing the revision in the same SQL statement. If no row changes, the API returns 409 and the current revision.

The client stops automatic writes on a failed save. It keeps the pending document and offers retry or recovery. Conflict recovery reads the latest remote workspace and can append a copy of the pending graph as independent root boards with new graph identifiers. Original attachment identifiers remain unchanged, so this works within the same owning account and deployment. Combined documents remain subject to the workspace size and count limits.

An acknowledged write whose response is lost may produce a conflict on retry. That is handled through the same recovery path. The server does not silently accept a stale document. This approach protects independent tab edits but does not merge simultaneous field edits or provide live collaborative cursors.

## Server and storage

The Worker reads the `DB` and `BUCKET` bindings declared in `.openai/hosting.json`.

`db/schema.ts` defines two tables:

- `workspaces`: `user_id`, serialized document, integer revision and update timestamp.
- `assets`: immutable asset ID, owner ID, private object key, filename, detected MIME, size and creation timestamp.

The checked-in SQL migration creates the schema. Request handlers never create or alter tables. The runtime uses prepared D1 statements; document text and identifiers are passed as bound values.

### API

| Method and path | Input | Successful response |
| --- | --- | --- |
| `GET /api/workspace` | Authenticated request | `{ document, revision, updatedAt, userId }` |
| `PUT /api/workspace` | `{ document, revision }` plus `X-Nodus-User-Id` from the initial GET | `{ revision, updatedAt }` |
| `POST /api/assets` | Multipart form with one `file` plus `X-Nodus-User-Id` captured when upload starts | `{ id, name, mime, size, url }`, HTTP 201 |
| `GET /api/assets/:id` | Optional `Range`; optional `?download=1` | Authorized original file, HTTP 200 or 206 |
| `HEAD /api/assets/:id` | Same resource | File headers without body |

Errors have `{ error, message }`; revision conflicts additionally include `revision`. Common statuses are 400 for an invalid graph, 401 for missing identity, 403 for a cross-origin write, 404 for an unavailable or unauthorized file, 409 for a stale revision, 413 for excessive input, and 416 for an invalid byte range.

## Authentication and ownership

Sites manages sign-in and supplies `oai-authenticated-user-id` and `oai-authenticated-user-email`. Both are required by the API. The user ID, not email, is the durable ownership key. There is no production anonymous or fixed-user fallback.

Every workspace query includes the current user ID. Every attachment request checks asset ownership before retrieving bytes. Saving a document checks every referenced asset against the same user's canonical metadata. A guessed asset UUID or a graph imported from another account does not grant access.

Workspace writes and file uploads also require the expected user ID captured when the client loaded its document or started the upload batch. The server compares it with the currently authenticated identity before reading the request body. This prevents an old tab from writing its earlier account's document or files into a different account. Missing or mismatched `X-Nodus-User-Id` returns 401 with `account_changed`; the document API body remains unchanged. Before attaching a completed upload to the graph, the client checks that its current workspace identity still matches the upload's original owner.

Mutation handlers reject cross-site requests and mismatched Origin headers. This application relies on the trusted Sites gateway to supply identity headers; it is not safe to place the Worker behind an untrusted proxy that passes arbitrary client identity headers through unchanged.

## Uploaded files

The upload endpoint bounds the multipart request stream and enforces a 25 MiB limit on the file. It detects supported media signatures before assigning an inline MIME type. The original bytes go to R2; metadata is stored in D1 only after the object write succeeds. If the metadata write fails, the new object is removed where possible.

Known raster images, supported video/audio containers and PDFs may be served inline. HTML, SVG and unknown formats receive `application/octet-stream` with attachment disposition. Responses include `X-Content-Type-Options: nosniff`, a restrictive sandbox policy and private no-store caching. Byte-range handling supports media seeking and partial PDF requests.

Files are immutable. Removing graph nodes does not delete R2 objects, so undo, recovery and existing attachment references remain usable. Automatic garbage collection and storage quota management are future work. A graph JSON export contains attachment references but no binary files.

## Scope boundaries and extension points

The current application implements user-authored brainstorming. It has no model credentials, AI generation, PDF text extraction, media transcription or background content analysis. Adding those capabilities requires explicit product behavior, a bounded server job model and appropriate model/service configuration.

Future collaborative editing should introduce a deliberate operation or CRDT model instead of removing the revision checks. A portable backup should package the graph together with authenticated original-file downloads and restore them through the upload API with asset ID remapping. Cross-board references should be represented explicitly without overloading the containment relationship.
