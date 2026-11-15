# ND-001 tier-7 search preview priority — 2026-11-15

## Reproduced issue
The engine ranks a contiguous unquoted phrase spanning title + note + filename in tier 7, before unordered all-word matches in URL, note or filename (tier 8). The read-only preview inverted that order and incorrectly labeled matching results Link, Note or File instead of Multiple fields / چند بخش. Three cases reproduced red in isolated V8 on exact former GitHub helper source. A fourth case with leading spaces exposed a mismatch between trimmed display note and untrimmed engine comparison.

## Changes and source
Scope was recorded before edits in development log commit 4f6819a464afcc981c1e08f38cc3867298bfe033. Code commits: [fd33ad7](https://github.com/iAlirezaaa/nodus/commit/fd33ad761199c641639797bf4ee542942141b990), [4f03f0c](https://github.com/iAlirezaaa/nodus/commit/4f03f0c217fdfd1b1d204ea5af55b943f0a8dafb). Code tree b1e7850359bedf07f152eba28d2d47e72c23d72a. Exact source blob 36b3d439e6c69e4ff110915d3c954c099210e97c, test blob 4393de5fb4898f4a8d1987096c2c9258a5cd312e. Added five test declarations, not all executed. No save, graph, API, IME, keyboard, permissions, rooms, schema, animation or Site code changed. Link previews remain hostname-only.

## Actual verification
3/3 old source scenarios red, 8/8 first-patch targeted scenarios green. Leading-whitespace case then red on intermediate source and green after repair. Final exact GitHub source: 9/9 targeted V8-extracted-function scenarios green with simplified English-case, URL hostname and excerpt shims. **NOT** native Node project tests, NOT execution of all 45 registered preview tests, NOT TypeScript or build.

[Final CI run 43699034982](https://github.com/iAlirezaaa/nodus/actions/runs/43699034982) failed before runner assignment (runner_id=0, steps=0). Native full suite, TypeScript 5.9.3 and production build not run. Local Node22/TS5.8 present, but no private checkout/Node24; GitHub DNS failure. Local 127.0.0.1:4173 refused connection. No real FA/EN desktop/390px browser, Enter/Tab/IME, focus, pan/drag, Undo, save/reload or screenshot (**NONE**). No real authenticated session or 2-account evidence. Sites skill unavailable: current Site HEAD/tree, version, deployment and audience state not inspectable. Historical shared tree is not current confirmation.

## Status
ND-001 **In progress**; release **Blocked**, not Verified or Released. Only fix/nd-001-search-clarity has changed. Stable main 26fafac05c320ed5db30a0ee908dd816714acdd9 / tree cf93a13f4c7da2530b9ff07efba74daf5b20a618 unchanged. Site unchanged by this run; no publication, version or owner-data write. Next: full Node24 verify:release, real 4173 browser and screenshot, authenticated Sites tree equality, independent review, guarded merge/deployment, then ND-002.
