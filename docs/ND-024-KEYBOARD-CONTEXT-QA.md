# ND-024 / Keyboard context guard — pre-edit scope

Run nodus-auto-20261117T121944642Z-nd024-review; recorded 2026-11-17T12:22:36.203Z. **In progress; release Blocked**.

## Observed source and ownership
Feature branch `fix/nd-024-startup-storage-recovery`, head `b5aee78a55f6482e3bb09e46671f7496213f064c`, tree `267f3c77e9bf37631db7c37ff4622813880b6bf0`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Control lease head `ba29524b5f5be3a66413cffbcbe4d3779410bc66`. Hosted Sites head/tree/audience UNVERIFIED (no authorized Sites skill in this environment).

## Reproduced source issue and intended user behavior
On static Nodus Pages, document-level keydown intercepts **Enter** on focused Save/Export/Delete and other buttons, creates a graph node instead of letting the button activate, and can create a *second* sibling on an already-handled focused node. **Shift+Tab** on a focused node creates a child instead of moving focus backward. The global graph shortcut listener does not respect earlier handlers' `defaultPrevented`, IME, or the actual graph focus.

## This run's bounded slice
Keep the existing ND-024 data-protection branch; change only the Pages document keydown handler (and if needed node handler) to scope graph shortcuts to canvas/node focus; honor native form/button/toolbar/dialog behavior, `defaultPrevented` and IME; retain intentional canvas/node Enter/Tab/Undo and recovery focus lock. Add source-exact regression tests; preserve CSP integrity and previous document data. No schema/auth/repo visibility/Site/main/gh-pages change.

## Acceptance and verification gates
1. Enter on focused non-graph button remains native and creates zero nodes; Ctrl+Z in a focused input/toolbar does not consume graph Undo.
2. Focused canvas Enter creates exactly one thought; focused node Enter creates exactly one sibling despite event bubbling; F2/Delete likewise are not doubled.
3. Tab on selected focused node creates one child; Shift+Tab remains native backwards focus (no child); Enter during composition is not interpreted as a graph command.
4. Search-modal/recovery-modal priority, focus, FA/EN, desktop/390px behavior stay intact. No graph write on mere keyboard focus.
5. Run source-exact red/green and checked-in focused tests. Full native suite, TypeScript, build, real 4173 FA/EN screenshot, storage/reload and Sites parity must be separately verified before release.

## Verification results
Pending. Real screenshot NONE. New version/deployment NONE. Gate **Blocked** until completed.
