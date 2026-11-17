# ND-024 — Modified Enter/Tab graph-keyboard safety (2026-11-17)

## Pre-edit scope — In progress / release Blocked

Run: `nodus-auto-20261117T1814-nd024-native-gates`. Existing branch: `fix/nd-024-startup-storage-recovery`; observed feature head `c617324492d57f22af4eaecf65b350d64713274f`, tree `3e2312f7e63af708ce19b01dc0843301a99662d7`. Main `26fafac05c320ed5db30a0ee908dd816714acdd9`, tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`. Current hosted Site source head/tree and audience unverified (Sites skill unavailable); do not publish or touch owner data.

**Problem:** The exact static local-first `pages/index.html` graph handlers run Enter and Tab graph mutations even when Ctrl, Meta or Alt is pressed. On a focused thought, Ctrl/Meta/Alt+Enter inadvertently creates a sibling; Ctrl/Meta/Alt+Tab can create a child, interfering with browser/OS shortcuts. This is a concrete editing-safety regression on the existing ND-024 feature branch; it does not apply as a claim about the hosted authenticated React UI.

**Acceptance:** Modified Enter/Tab must not add thoughts or call `preventDefault`; ordinary Enter still creates exactly one sibling/root and unmodified Tab creates one child; Shift+Tab stays native; IME and input/buttons stay native; no change to graph data, persistence, animation, Search dialog Tab, existing shortcuts or CSP permission. Source-exact regression tests run under Node 22, full repo suite + project TS/build + real 4173 FA/EN desktop/mobile browser screenshot + two-tab persistence + Site tree parity are tracked separately. No merge or deployment until all required gates succeed.

**Bounded slice:** On the existing ND-024 branch, narrowly guard the node and document graph Enter/Tab handlers against Ctrl/Meta/Alt, add a checked-in Node regression, recompute inline CSP sha256 and record exact findings. Keep branch only while mandatory browser, build and Sites gates are Blocked.

**Before implementation:** no tests claimed, screenshot NONE, hosted version/deployment NONE.
