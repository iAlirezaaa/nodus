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
