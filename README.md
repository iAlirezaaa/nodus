# Nodus

Nodus is a personal brainstorming application built around connected thoughts and nested projects. A node can contain a note, an uploaded file, a link, or its own board. Opening a project changes the working canvas without losing its place in the parent graph.

The application has a React interface, a server API, a persistent SQL database and original-file storage. The initial board is editable guidance, with a real nested project and no pretend uploads.

## Working with a board

- Select a node to read or edit its content.
- Drag a node to move it. Drag the background to pan, and use the zoom controls, wheel or touch pinch to change scale.
- Connect existing nodes, or create multiple connected branches from a list of titles.
- Open a node's internal project to work on its own board; the breadcrumb trail leads back out.
- Drop files onto the canvas or use the upload action. Images, supported video/audio formats and PDFs have previews; other formats retain their original download.
- Use undo and redo for document changes. The editor keeps up to 60 in-session undo snapshots.
- The interface supports Persian and English. Content can contain either language independently of the interface language.

Graph connections and containment are different relationships. Connections may form cycles. A project cannot contain itself, directly or indirectly.

## Saving, recovery and limits

The server is the durable source of truth. Browser storage holds view preferences and a recovery draft for pending changes. “Saved” is shown only after the server acknowledges a write.

Writes include the document revision. When another tab has saved newer content, the server rejects a stale write instead of overwriting it. Recovery can preserve the local graph as separate root boards. Keep the page open if saving fails and the browser reports that its recovery storage is unavailable.

Current limits are:

| Item | Limit |
| --- | --- |
| Individual uploaded file | 25 MiB |
| Workspace save request | 5 MiB of JSON |
| Boards per workspace | 2,000 |
| Nodes per workspace | 5,000 |
| Connections per workspace | 20,000 |
| Text in one node | 100,000 characters |

The canvas can be panned freely; these record limits still apply. Browser codec support determines whether a particular video or audio file can play inline. Unknown file formats, HTML and SVG are served as downloads. Removing a node does not delete its original uploaded file, so undo and recovery retain access to attachments.

A JSON export contains the graph, text, relationships and attachment references. **It does not include binary attachments and is not a complete portable file backup.** Attachment references remain tied to the owning account on the same deployment. Download important originals separately.

## Scope of this version

Nodus does not currently call an AI model, generate branches from document contents, transcribe media, extract PDF text or provide simultaneous multiplayer editing. Branches are authored by the user. Revision conflict handling protects edits across tabs; it is not a real-time collaboration engine. First load requires access to the authenticated server; local draft recovery is not a complete offline mode.

## Technology

| Layer | Implementation |
| --- | --- |
| Interface | React, TypeScript, custom DOM/SVG canvas |
| Application runtime | Vinext and a Cloudflare Worker |
| Graph records | Cloudflare D1, with versioned Drizzle migrations |
| Original files | Cloudflare R2 |
| Authentication | Sites-managed ChatGPT sign-in |
| Local recovery | Account-scoped browser local storage |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model, API, persistence behavior and extension points.

## Run locally

Use a current Node 24 installation for the application and bundled native TypeScript/SQLite tests. The starter's application engine requirement is Node 22.13 or later. A clean checkout selects the portable execution profile automatically.

Install the locked dependencies and build the Worker:

```sh
npm ci
npm run build
```

For a fresh local database, apply the checked-in initial migration once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nebulous_champions.sql
```

Start the development server:

```sh
npm run dev
```

Use the URL printed by the server. The portable development profile offers simulated sign-in at `/signin-with-chatgpt?return_to=/` on loopback only. That simulation is disabled in the managed profile and is not included in production. The production API has no anonymous or shared-user fallback.

To inspect the built Worker locally after building:

```sh
npm start
```

The built preview shares `.wrangler/state` with development and migration commands. It does not deploy or simulate sign-in.

### Schema changes

After editing `db/schema.ts`, generate a new migration:

```sh
npm run db:generate
```

Inspect and commit the generated SQL and Drizzle metadata. Build again if bindings changed, then apply only each new pending SQL migration to the local database using the command above with its filename. Do not replay an applied migration or rewrite its history. Hosted deployment applies migrations separately from local preview.

### Tests

Run the graph, recovery and backend suites:

```sh
node --import ./tests/server-loader.mjs --test tests/graph.test.ts tests/workspace-store.test.ts tests/server.test.mjs
```

The backend suite uses an in-memory SQLite database initialized from the checked-in migrations. It exercises actual conditional save statements, account isolation, attachment ownership, graph validation and media byte ranges. These tests do not replace a visual/browser verification of the deployed application.

## Hosting

The tracked `.openai/hosting.json` declares `DB` and `BUCKET` and identifies this Sites project. Hosting uses the Sites source, version and publication workflow. Preserve the project identity when updating this deployment. A different deployment must provision its own bindings and trusted authentication boundary.

Do not expose the Worker directly while trusting arbitrary client-supplied identity headers. Production authentication is provided by the Sites gateway, which supplies the authenticated visitor headers. Secrets, local runtime state, dependency folders, generated builds and publication archives are excluded from source control.
