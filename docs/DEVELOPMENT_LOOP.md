# Nodus development loop

Owner request, 2026-11-12: develop Nodus every hour; improve usability, capabilities, design, personalization and animation; use a new branch for special features and large changes; update the roadmap when each capability becomes available.

The scheduled task performs real engineering work. One invocation completes a bounded useful slice or advances an existing feature branch. It is not a reminder to the owner, and an hourly trigger is not a promise that a large feature ships every hour.

## Scope and durable sources

| Resource | Identity |
| --- | --- |
| GitHub | `iAlirezaaa/nodus` (private), stable branch `main` |
| Hosted Site | `appgprj_6af58606fb9c81918541f056a898c1a2` |
| Live URL | `https://nodus-hades.ialirezaaa.chatgpt.site/` |
| Source manifest | `.openai/hosting.json`; preserve project ID, D1 and R2 bindings |
| Roadmap | `docs/ROADMAP.md` |
| Run log | `docs/DEVELOPMENT_LOG.md` |
| Cross-run ownership | `.automation/nodus-lease.json` on `automation/nodus-control` only |
| Test address | `http://127.0.0.1:4173/`; do not change the port |

Nodus is separate from WorldForge, The Writer and Civita. This task does not modify their repositories, schedules, preview servers or data. Preserve the existing Site audience. Filesystem paths, credentials, processes, previous browser tabs and tool availability must be rediscovered in each environment; the durable repository/Project IDs above are the selectors.

Read the current repository instructions, roadmap, latest development log, architecture and relevant QA record before changing code. GitHub and Sites have different commit histories; compare **tree content**, not commit IDs. The initial shared baseline is recorded in the roadmap. If either source advanced, preserve and reconcile the actual changes before editing. Never force-push or reset away another contributor's work.

## 1. Acquire one run's ownership

Scheduled invocations may overlap. Use the dedicated control branch as a compare-and-set lease; local lock files alone cannot coordinate separate environments.

1. Read `refs/heads/automation/nodus-control`, its commit/tree, and the lease JSON at that exact commit.
2. If another `owner_run_id` has an unexpired `expires_at`, do not edit application source or publish. Record a concise skipped-overlap result for this invocation.
3. Otherwise prepare a lease with a fresh run ID, UTC `acquired_at`/`heartbeat_at`, expiry 90 minutes ahead, current task/feature branch and the observed source heads. Preserve schema and unrelated fields.
4. Create the new blob/tree/commit with the observed control head as parent; update the control ref using that exact `expected_sha` and `force: false`.
5. If the ref update is rejected, re-read once to determine ownership; never force the update. Begin mutation only after confirming this run owns the current lease.
6. Renew the lease at least every 10 minutes and before every application-branch push, merge or deployment. Losing ownership means stop mutations, preserve the working diff and report it. An expired lease is not permission to discard previous commits.
7. Release in a final cleanup step with the same guarded ref update: set `owner_run_id` and expiry to null; retain `last_completed_run`, checkpoint and publication state. Do not change the automation schedule from inside a run.

The control branch is never merged into main, copied to the Site source, or shipped. It is an ownership/checkpoint record, not an application feature. The native scheduler and branch lease limit overlap but do not establish a distributed deployment lock: re-check ownership and remote heads immediately before publication and stop on any conflict.

## 2. Choose and scope the work

First reconcile a pending deployment/GitHub synchronization or a concrete data-loss/regression issue. Continue a recorded in-progress branch before starting another feature. Otherwise choose a Ready item in roadmap order; ND-001 is the initial small slice. After it, focus/collapse work can proceed on feature branches. Revisit all five roadmap axes so cosmetic work does not crowd out capability, interaction or performance improvements.

Create a small task entry in the development log before implementation:

- Roadmap ID, user-visible problem, intended behavior and explicit acceptance checks.
- Base heads/tree, chosen branch, affected persistence/UI boundaries and dependencies.
- What can be completed in this invocation and the checkpoint if the feature takes longer.

Choose a branch **before** editing. Small, isolated fixes may use main with guarded updates. New special capabilities and large UI, graph, schema, synchronization or infrastructure changes use `feat/nd-###-slug`, `perf/nd-###-slug` or a similarly scoped branch. Continue an existing matching branch; do not generate abandoned parallel versions. Keep unfinished work on its branch and record the exact next action.

## 3. Implement a usable slice

Keep the neural identity, Persian/English support, readable RTL/LTR layout and fast Enter/Tab flow. Prefer a visible primary action and contextual secondary tools. Treat text editing, selection, pan, drag, popup and keyboard focus as distinct interaction contexts. Respect reduced motion and hidden-page suspension while keeping state legible without animation.

Keep existing user data, stable identifiers, ownership and shared-operation safeguards. A schema change requires a new forward migration, upgrade coverage and an explicit recovery plan; do not rewrite applied migrations. Avoid changing unrelated dependencies or rewriting a whole subsystem to deliver a small improvement. No live user data is a test fixture.

Use independent agents for bounded implementation/review tasks when useful, with clear file ownership. Share one intended feature design and integrate their results; do not allow competing edits to the same files. Future runs should inspect code and reproduce the problem, not merely repeat the roadmap.

## 4. Verify the changed behavior

The acceptance criteria in the roadmap are required observations, not claims to assume.

- For domain/persistence/interaction changes, run meaningful affected regression tests and TypeScript. The established full test command is `node --import ./tests/server-loader.mjs --test tests/*.test.ts tests/*.test.mjs`; run it when the change or release gate warrants it. Run the production build before a code release. Do not write implementation-mirroring tests for copy-only changes or claim historical tests ran again.
- For UI changes, inspect the real UI in the available browser: FA and EN where affected, desktop and 390 px width, focus/keyboard boundaries, cancel/Undo, save and reload. Capture a real screenshot for a visible change. Never substitute an image mockup for an implemented UI.
- For graph/animation changes, use fixed graph scenes and record input size, browser/device, before/after measurements and any limits. Track responsiveness and network writes; smooth animation must not create document writes each frame. A 5,000-node validation limit is not proof of smooth interaction at that size.
- For collaboration, test at least two isolated sessions for the changed behavior, conflict/retry and read-only/revoked permission where relevant. Clearly distinguish these from two real authenticated production users.
- Use current Sites/runtime/browser guidance. Preserve port **4173**. Do not replace a preview serving another project or steal the user's foreground browser during an unattended invocation. If required UI verification is unavailable or the port belongs to another task, preserve the branch and mark the relevant gate Blocked; report the specific limit instead of changing ports or declaring an untested flow released.
- Inspect every tool/test result. A skipped, failed, timed-out or unavailable check stays explicit. Lint is not a release claim unless actually requested/run successfully; the existing codebase has documented lint debt.

Once the changed behavior is sufficiently verified, stop redundant checks and complete the delivery. Fix a concrete failure before broadening the test plan.

## 5. Merge, publish and synchronize

For a large feature, obtain an independent code/interaction review before integration. Rebase/merge carefully with the latest main, preserve concurrent edits and re-run checks for material integration changes. Branch creation is mandatory for the classes above; it does not require repeatedly asking the owner for permission already granted by this task. Unfinished or failed features remain on their branch.

Only the verified stable result enters main and the Site. Use current authorized GitHub and Sites tools/skills, fresh credentials, guarded ref updates and the repository's supported build/package workflow. Do not weaken authentication, make the Site public, silently add paid services, or perform destructive irreversible data operations as part of routine development.

GitHub and Sites may have different commit parents. Synchronize the actual final tree without replacing remote work. Keep the project identity and audience unchanged. Save/publish only the verified source and its matching build archive, and treat the native deployment result as the publication authority.

After every external step, checkpoint the exact head/tree, saved version/deployment ID and status in the control lease. Reconcile an uncertain result before retrying; a timeout is not proof that publication failed. If one destination succeeds and the other fails, preserve both identifiers and mark synchronization pending. The next run completes that reconciliation before starting a new feature.

## 6. Update the roadmap and report

Every feature update has a corresponding roadmap/log update. Move to In progress when work begins, Verified only after the specified checks, and Released only after stable source and publication are confirmed. Record:

- What changed, why it helps, and where the user finds the control.
- Branch, commit/tree, test evidence, QA/screenshot paths and deployment result.
- Remaining limitations and whether a change is only on a branch.
- Concrete next action and any discovered dependency or useful new task with a fresh ID.

Update affected architecture/help/shortcut documentation alongside implementation. Keep entries append-only for history; do not erase failed checks or rewrite old results as current success. Commit completed roadmap/log updates to GitHub. Keep Site source aligned for subsequent runs; documentation-only follow-up does not imply a second functional release.

Send a concise Persian completion update with a useful live/commit link and real evidence. If blocked, state the exact blocked operation and what was still completed. Do not report a proposed feature as implemented. Never modify another automation or send email/chat messages to third parties from this loop without explicit authorization.

The task continues on its configured schedule until Hades changes or pauses it. Each invocation ends cleanly; release its lease, close only its own resources, and stop only the preview it started.
