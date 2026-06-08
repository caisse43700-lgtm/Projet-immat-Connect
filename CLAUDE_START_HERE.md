# CLAUDE START HERE

Read this first when reconnecting to the repository.

## Latest known status

```text
Branch:
feature-calls-runtime-diagnostics

Last originally failed run analyzed:
27133682666

Artifact:
obd-e2e-evidence

Original blocker:
SyntaxError: Illegal return statement

Original suspect:
core/guardian-loop.js

Latest guardian-loop alignment commit:
07b6d3d233dc6a1035844866c379c9615ec3c358

CI status after guardian-loop alignment:
UNKNOWN until a new GitHub Actions run is inspected.

Immediate action:
Trigger or inspect CI before coding anything else.
```

---

## Decision matrix

Use this before editing code.

| Situation | Action |
|---|---|
| CI status is unknown | Do not code. Trigger or inspect CI first. |
| CI is red and artifact exists | Read `diagnostic-artifacts/playwright-output.log`; fix first real error only. |
| CI is red and no artifact exists | Inspect workflow job logs; document missing artifact in `SESSION-LOG.md`. |
| `Illegal return statement` is still present | Verify `guardian-loop.js` guard shape; fix only that. |
| `Illegal return statement` disappeared | Do not touch `guardian-loop.js`; move to next first error. |
| CI is green | Start `calls.js` audit and complete `CALL_SOURCE_OF_TRUTH.md`. |
| Unsure what to do | Stop and update `SESSION-LOG.md` with blocker/evidence; do not guess. |

---

## Next 3 actions only

1. Inspect or trigger the latest GitHub Actions run for `feature-calls-runtime-diagnostics`.
2. If red, download `obd-e2e-evidence` and read `diagnostic-artifacts/playwright-output.log`.
3. Fix only the first real error, then update `docs/SESSION-LOG.md`.

Do not jump to `CallScreen`, `mobile-autotest`, or `getRuntimeState()` until CI status is known.

---

## Architecture map for planning after CI

When CI is green and planning resumes, read these in order:

1. `docs/INTERACTION_ORGANISM_MAP.md` — who owns what: Messages, Calls, Help, Reports, Activity, Map, Ange, Guardian, Registry, OBD.
2. `docs/INTERACTION_LEDGER_REGISTRY.md` — global event table: owner, writer, readers, Ange/Guardian/OBD/autotest links.
3. `docs/CALL_SOURCE_OF_TRUTH.md` — call state audit grid; not confirmed truth until `calls.js` is audited.
4. `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md` — call ringtone, message beep, iOS fallback, visual call delivery.
5. `docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md` — executable skeleton: proposed files, APIs, DOM IDs, triggers, tests.

Important:

```text
These docs are planning/audit blueprints.
They do not replace code evidence.
Audit existing code before implementing.
```

---

## 60-second arrival checklist

1. Confirm branch is `feature-calls-runtime-diagnostics`.
2. Open `core/guardian-loop.js`.
3. Verify there is **one guard strategy only**:

```js
'use strict';
if (!window.__GuardianLoopV1) {
  window.__GuardianLoopV1 = true;
  // GuardianLoop definition and export
}
```

4. Do **not** add an extra IIFE if this guard is already present.
5. Trigger or inspect the latest GitHub Actions run.
6. If red, download `obd-e2e-evidence`.
7. Read `diagnostic-artifacts/playwright-output.log`.
8. Fix only the first real error.
9. Record every blocker in `docs/SESSION-LOG.md`.

---

## Validation checklist after any fix

After a fix, verify and document:

```text
1. What was the first real error?
2. What file was changed?
3. Why is the fix minimal?
4. What risk remains?
5. Was CI rerun?
6. Is there a new artifact?
7. What is the next first error, if any?
```

Append the answer to `docs/SESSION-LOG.md`.

---

## Active blocker history

- Original branch: `feature-calls-runtime-diagnostics`
- Investigation: OBD Appels / calls runtime diagnostics
- Original failed commit analyzed: `a8cbb1b722b308094bed41527856392ba7d2dd9f`
- Original failed run analyzed: `27133682666`
- Artifact: `obd-e2e-evidence`
- Original error: `SyntaxError: Illegal return statement`
- Original suspect: `core/guardian-loop.js`

## Important update

A later T05 fix commit was found:

```text
103d4ea1deb2ab2b84f5a90648e1cab5130cf5cf
fix(e2e): supprimer return global dans guardian-loop.js (T05 — SyntaxError)
```

The branch was aligned to the same single-guard style here:

```text
07b6d3d233dc6a1035844866c379c9615ec3c358
fix: align guardian loop guard with T05 correction
```

Do not reintroduce another wrapper around `guardian-loop.js` unless new logs prove a real issue.

---

## Stable areas — do not touch without evidence

These areas were previously stabilized and must not be changed during the calls/OBD investigation unless logs prove they are the active failure:

- map navigation / `navMap`
- panels open/close behavior
- `sheet.mini` pointer behavior
- drawer z-index / overlay stacking
- ghost overlay fixes
- nearby vehicles
- GPS locate / recenter
- Service Worker cache/update flow
- Supabase schema and RLS
- global `index.html` rewrites

Known context:

- GPS `null` observed earlier is not considered a structural bug by itself.
- Safari iOS may keep an old Service Worker; handle only with evidence and controlled reload logic.

---

## Read order

1. `docs/CURRENT-INVESTIGATION.md`
2. `docs/SESSION-LOG.md`
3. `docs/OBD-RECOVERY-PROTOCOL.md`
4. `docs/CALL_SOURCE_OF_TRUTH.md`
5. `docs/INTERACTION_ORGANISM_MAP.md`
6. `docs/INTERACTION_LEDGER_REGISTRY.md`
7. `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md`
8. `docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md`
9. Latest failed GitHub Actions run
10. Artifact `obd-e2e-evidence`
11. `diagnostic-artifacts/playwright-output.log`

---

## Absolute rule

Never code from memory or hypothesis.

Always:

1. Open the latest failed run.
2. Download `obd-e2e-evidence` if available.
3. Read `diagnostic-artifacts/playwright-output.log`.
4. Fix only the first real error.
5. Rerun CI.
6. Update `docs/CURRENT-INVESTIGATION.md` and `docs/SESSION-LOG.md`.

---

## Do not do yet

- Do not build `CallScreen` yet.
- Do not refactor `calls.js` yet.
- Do not integrate `callsRuntime` into `core/mobile-autotest.js` yet.
- Do not simplify `core/calls-runtime-diagnostics.js` unless logs prove timeout or performance issues.
- Do not touch Supabase schema or RLS without audit.
- Do not rewrite `index.html` globally.

---

## If CI becomes green

Then and only then:

1. Audit `calls.js`.
2. Complete `docs/CALL_SOURCE_OF_TRUTH.md`.
3. Add read-only `CallManager.getRuntimeState()`.
4. Wire `callsRuntime` into `core/mobile-autotest.js`.
5. Start `CallScreen` skeleton closed by default.
