# Nodus Pages

The static `pages/index.html` is the *self-contained source and deployable artifact* for the GitHub-only edition. It contains its own CSS and JS (CSP SHA-256 hashed); current edit sources/tests are recorded in `docs/ND-023-FEATURE-PARITY-QA.md`. No server API, analytics or remote runtime scripts are included.

The original React Nodus app on `main` has distinct authenticated account, Cloudflare DB and R2 dependencies. It cannot be deployed as a complete app to static GitHub Pages. Do not send users to the Pages URL expecting cloud sync, shared collaboration, or their original account's files. JSON export is available to back up the local-only edition.

For future maintenance, extract CSS/logic/UI into modules in a dedicated Pages source folder, then re-bundle into the single `pages/index.html` and recompute the CSP hashes. Never weaken CSP or copy production secrets.
