# ND-023 — GitHub Pages local-first edition — scope before editing
Date: 2026-11-16 UTC
Run: `nodus-chat-20261116T212717316Z-nd023-pages`
Branch: `feat/nd-023-github-pages-local-first` from `main` `26fafac05c320ed5db30a0ee908dd816714acdd9`
Main tree: `cf93a13f4c7da2530b9ff07efba74daf5b20a618`
Existing ChatGPT Site source/audience: unverified this run, unchanged by scope.

## Problem
User explicitly requires Nodus hosted *inside GitHub Pages*, not another host. Nodus currently depends on a server-only ChatGPT identity, D1, R2, authenticated API, and collaboration. Exporting it as static assets without changing data boundaries would break save, login, files and room access.

## Explicit solution/scope
Build a second **local-first, single-device static edition**, with no remote backend, no secret credentials, no cloud account and no network writes. Serve via GitHub Pages only if repo Pages settings/plan permit, on a separate `gh-pages` publishing branch holding **only public static assets**. Keep original private app and live Site unchanged. Do not claim shared-room collaboration, cloud backup or shared account continuity. Public page must indicate that local data stays in the visitor's browser and needs export for backup.

## Acceptance
- Functional clickable, keyboard-accessible graph: create/select/edit/drag/pan/zoom/connect nodes, project nesting, readable 390px mobile, Persian/English, dark mode, search by title + nested path, undo and redo; no data writes in movement frames.
- IndexedDB local persistence and reload in the *same browser*, safe JSON export/import with explicit confirmation, no access to existing user's Site workspace. Accept media only if persistence/backup reliable; otherwise defer it visibly.
- HTML/CSS/JS must contain no API secrets, no analytics, no remote runtime dependencies; string operations escape untrusted text, file import validates shape.
- Real local Chromium desktop/390px screenshots and behavior tests on exact static files. Do not claim auth or 2-user tests.
- Guarded push to feature; only verified build goes to a dedicated `gh-pages` branch, without copying the private source tree or control lease. Site `has_pages=true` and public URL fetch must be confirmed before claiming Released.
- If setting Pages source via connected tool unavailable, provide exact GitHub Settings > Pages branch/root activation and mark public deployment Blocked.

## No-change guarantees
No publicizing the private repository, touching the original hosting manifest, database, R2 objects, ChatGPT sign-in, other projects, port 4173, existing main or automation schedules. Any feature not delivered by static edition must be marked limited.

Status: **In progress on branch; not published**.

## Implementation and verification — 2026-11-16

**Artifact:** `pages/index.html` (one independently self-contained HTML + CSS + JS file, no remote scripts, no server calls), exact git blob `74eb0a158bd9fc1b567e3d2c0953b9c26b474770`. GitHub Pages branch will contain only this static artifact, not the original Nodus server or lease.

**Implemented:** interactive movable graph, curved connections, add/edit/child/next via Enter/Tab/F2, manual link, undo/redo, nested project navigation/breadcrumbs, search of title/note/nested paths including matches over 70, fit and zoom, bilingual FA/EN and light/dark, coarse/touch UI, local IndexedDB document save with explicit save state, standalone JSON backup/import with validation, small media data URLs up to 5 MB, reduced-motion CSS.

**Preserved by isolation:** no access to canonical ChatGPT Site workspace or its accounts, no D1 or R2 keys; visitors' local projects remain in their own browser. No cloud sync, multi-user shared rooms, account collaboration, managed uploads or server-side backups. Clearing browser data can erase this local edition's workspace; export JSON first.

**Actual checks:** `node --test logic.test.mjs` **7/7 pass**; `node --check app.js`, `node --check logic.mjs` pass. Real headless Chromium loaded the exact self-contained bundle with test-only in-memory IndexedDB stub: desktop 1280x800 and mobile 390x844 both ran creating 3 nodes by Enter/Tab, Persian search returned 1, 0 JavaScript page errors, no document horizontal overflow (client widths 1280/390), fake-store save indication. Captured local screenshots `/mnt/data/nodus_pages_real_static_desktop.png` and `/mnt/data/nodus_pages_real_static_mobile.png` — **not screenshots of a deployed URL**.

**Blocked/not established:** native persisted reload across browser sessions because Chromium in this container refuses navigation to any URL, including `http://127.0.0.1:4173/`, with `ERR_BLOCKED_BY_ADMINISTRATOR`. Fixture uses in-memory IndexedDB double, therefore **does not prove actual IndexedDB durability**. Real touch hardware, 2-account access, full original Nodus test suite, original TypeScript build and original Site tree/audience also not tested. Original server build is irrelevant to this static edition; no claim is made. No Pages activation (repository API `has_pages=false`), Pages settings API unavailable through connected GitHub action. No DNS or publicly served site verified. Branch build only.

**Github-only activation:** When the private repository is eligible for GitHub Pages (Pro/Team/Enterprise, or a separately authorized public repo), open `https://github.com/iAlirezaaa/nodus/settings/pages`, select **Deploy from a branch**, branch **gh-pages**, root **/**, **Save**. Verify the resulting URL `https://ialirezaaa.github.io/nodus/` from a public browser before claiming Released. Never change canonical repository visibility without explicit user approval.

**Status:** static edition **Verified only for bounded Node/Chromium fixture behavior**; live deployment **Blocked**, no Released claim. Original main and Sites unchanged.
