# ND-001 — final-heh keyboard spelling comparison QA

Scoped 2026-11-15T19:17:06.055Z on `fix/nd-001-search-clarity` from `032f9b96918373cd6f8a45a5cf4e10b01f694e21` (tree `da58bcfe1249cec36e7c5b33aa6b1cfcd0e21872`).

## Problem and acceptance

Persian titles, notes and nested paths using final `ه` may be pasted/search-typed with Arabic `ة` or Persian heh-with-yeh-above `ۀ`. Search should compare these variants both ways without rewriting graph content. Preserve title relevance, 70-item pages, quoted phrase behavior, URL and annotation matching. Validate with tests before recommending release.

## Verification status

Scope only. Pending exact-source red/green helper tests and strict TypeScript boundary; pending full Node24 suite, TS5.9.3, production build, localhost:4173 real browser/screenshots, authenticated Sites comparison and independent review. No deployment. Status: **In progress / release Blocked**.
