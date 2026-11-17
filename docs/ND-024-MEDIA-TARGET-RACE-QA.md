# ND-024 — asynchronous media upload selection integrity (branch-only)

## Scope and evidence

- **When:** 2026-11-17T20:20:38.433Z UTC. **Branch:** `fix/nd-024-startup-storage-recovery`. **Main:** `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. **Site HEAD/tree/audience:** UNVERIFIED (authorized Sites tool/skill unavailable).
- **Problem reproduced before source edit:** FileReader begins reading an image selected for thought A. The user selects thought B before `onload`. Old handler reads `state.selected` *after* the await and attaches the image to B, producing **one unintended graph mutation**. Source-exact deterministic V8 reproduction: old changed-selection attachment `[B]`, unchanged-selection attachment `[A]`, unsupported MIME zero mutations.
- **Acceptance:** bind selected thought+board before async reading, cancel on changed selection or board with localized feedback and no mutate/Undo/save; preserve correct upload for stable selection and existing format/size restrictions. No new controls or schema.
- **Source edits:** `pages/index.html` `$('media-file').onchange` under existing **Details → Media** control. Captures `targetNodeId` and `targetBoardId` synchronously, rejects missing target, rechecks both before `mutate`. Code [68c6d0f74d1634e365a1037b670e4f74d9cb8dd4](https://github.com/iAlirezaaa/nodus/commit/68c6d0f74d1634e365a1037b670e4f74d9cb8dd4) / tree `ef37c0cdec943103906699a3b85b40c4371de07d`; exact source blob `209ce8987f9cae4fda24c479921786e796a28af9`. Corrected checked-in test [616c45bb7f9d410526a3b1bde526b149547412b8](https://github.com/iAlirezaaa/nodus/commit/616c45bb7f9d410526a3b1bde526b149547412b8) / tree `a7f40adb9aaaf4080d490598bef49ecca61c114c`; test blob `5030d7663b160f87333fbd963a32ff9ee47ce4d0`.
- **New regression file:** `tests/pages-media-selection.test.mjs`, eight cases covering unchanged target, selection A→B, selection cleared, project/board changed, no selected target, oversize file, invalid MIME, FileReader error, inline JS/CSP. The initial test extractor had an escaping error and was corrected in the second commit *before declaring the check complete*.

## Actual checks this invocation

| Check | Result |
| --- | --- |
| Prepatch source-exact misattachment | **Reproduced:** A chosen, B selected before load, B receives the file; 1 unintended mutate |
| Patched source-exact deferred FileReader harness | **8/8 PASS**: stable upload writes to A; changed/cleared selection and board switch write 0; no selected target, oversize, unsupported MIME and read failure write 0 |
| Checked-in test bodies from exact GitHub test blob | **8/8 PASS under isolated V8 with Node test/assert/fs/crypto facades**; this is not execution by the native Node test runner |
| Complete inline JS parse | **PASS** via V8 `new Function` |
| Content Security Policy | Original hash re-computed equal to original; patched script digest `sha256-6vLMNFbUZmzGN7i+mTo9aUIVAUVkzVrhl/I0UrhKbFw=` placed in CSP without relaxing permissions; source blob reread after commit |
| Native checked-in Node tests, repository full suite | **NOT RUN**: native checkout `git ls-remote` failed `Could not resolve host: github.com` |
| Project TypeScript 5.9.3, production build | **NOT RUN**: no complete authorized checkout; no build package |
| Real `http://127.0.0.1:4173/` FA/EN desktop and 390px, IME, interaction, reload and screenshot | **BLOCKED:** HTTP connection refused; real screen and media selection sequence not exercised |
| IndexedDB two-tab/import/save/reload and collaboration accounts | **NOT RUN**, no real user data used; this change is solely local-first Pages input routing |
| Current Site source HEAD/tree, audience and matching deployment | **UNVERIFIED:** `skills__list` returned no skill and no Sites connector action was available; read-only Browser connection lacked originating context |
| Independent reviewer | **NOT PERFORMED**; cannot authorize integration on isolated test evidence alone |

## Safety and release

The cancellation path performs no `mutate` call, so it cannot produce a graph save or Undo entry. This feature does not alter the normal Enter/Tab/FA IME handler, node dragging, stored graph schema, server auth/collaboration, magnet loop, reduced-motion or per-frame write behavior. Those wider workflows were not exercised in a browser in this run. The original hosted Site, `main`, `gh-pages`, account audience, D1/R2 bindings and owner data were not changed. **Screenshot: NONE. Site version/deployment ID: NONE. Status: ND-024 In progress, release Blocked, branch only.**

**Next:** Reconstruct authorized native checkout; run `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`, TypeScript and production build. Then real 4173 FA/EN desktop + 390px deferred media read, keyboard/IME, two-tab IndexedDB/reload and screenshot; independently review; recover Site HEAD/tree/audience and only then consider guarded main/Site merge and deploy.
