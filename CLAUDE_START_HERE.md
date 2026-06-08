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

Latest docs/status commit:
fae8cd7a8dc8114d788eaae6dc5c26b7dc35fb97 and later docs updates

CI status after guardian-loop alignment:
UNKNOWN until a new GitHub Actions run is inspected.

Immediate action:
Trigger or inspect CI before coding anything else.
```

---

## Next 3 actions only

1. Inspect or trigger the latest GitHub Actions run for `feature-calls-runtime-diagnostics`.
2. If red, download `obd-e2e-evidence` and read `diagnostic-artifacts/playwright-output.log`.
3. Fix only the first real error, then update `docs/SESSION-LOG.md`.

Do not jump to `CallScreen`, `mobile-autotest`, or `getRuntimeState()` until CI status is known.

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
5. Latest failed GitHub Actions run
6. Artifact `obd-e2e-evidence`
7. `diagnostic-artifacts/playwright-output.log`

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
