# ND-024 — importing another JSON during an active restore (unreleased)

## Scoped before source edit (2026-11-17T23:18:56.984Z)

- Branch: `fix/nd-024-startup-storage-recovery`; base commit `e77a876764259448dae15f7153519f49f8308e0c`, tree `7d7a50177b9b8b903745b089207ab2e4e37a3471`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.
- Source blob: `4d3a7283a02215dbf1091ef83a60a64b99122d65`.
- RED reproduction: restore A pending, select B, received 2 confirmation calls and 2 restore attempts with no progress warning, despite restore B failing the `restorePending` guard.
- Intended: show localized busy warning before B.file.text/parse/confirm; never abort in-flight A transaction; latest selection on pending reads remains protected. Preserve data, model, CSP and keyboard/IME.
- Checks: source-exact tests, script parse, CSP; full native test/TypeScript/build and browser port 4173/Sites gate before release.

## Verification checkpoint

PENDING. No code release or screenshot until gates pass.
