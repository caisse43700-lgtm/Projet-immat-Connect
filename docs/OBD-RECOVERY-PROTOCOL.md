# OBD RECOVERY PROTOCOL

This is the mandatory recovery protocol for ImmatConnect Pro CI, OBD and Playwright failures.

---

## Absolute rule

Never fix from memory.

Never fix from hypothesis.

Always fix from the latest evidence.

```text
ONE RED RUN
=
ONE PRIORITY ERROR
=
ONE MINIMAL FIX
```

---

## Read order for every new session

1. `CLAUDE_START_HERE.md`
2. `docs/CURRENT-INVESTIGATION.md`
3. `docs/SESSION-LOG.md`
4. This file
5. Latest failed GitHub Actions run
6. Artifact `obd-e2e-evidence`
7. `diagnostic-artifacts/playwright-output.log`

---

## Branch safety

Current investigation branch:

```text
feature-calls-runtime-diagnostics
```

Before local work:

```bash
git branch --show-current
```

Expected:

```text
feature-calls-runtime-diagnostics
```

Do not work directly on `main`.

Do not merge to `main` until:

- CI is green
- OBD calls runtime is stable
- `mobile-autotest` is stable
- call source of truth is documented
- critical regressions are ruled out

---

## Standard CI failure workflow

1. Open the latest failed GitHub Actions run.
2. Download artifact `obd-e2e-evidence`.
3. Open `diagnostic-artifacts/playwright-output.log`.
4. Find the first real error.
5. Classify it:
   - `SyntaxError`
   - `ReferenceError`
   - `TypeError`
   - timeout
   - assertion failure
   - network/Supabase failure
   - service worker/cache issue
6. Fix only that first error.
7. Rerun CI.
8. Update:
   - `docs/CURRENT-INVESTIGATION.md`
   - `docs/SESSION-LOG.md`

---

## Priority order for errors

Parsing/runtime errors first:

- `SyntaxError`
- `Illegal return statement`
- `ReferenceError`
- `TypeError`

Then test-level failures:

- missing selector
- timeout
- wrong text
- wrong panel state
- blocked click

Then product behavior failures:

- message not persisted
- call event missing
- realtime not received
- activity state not updated

---

## Current known blocker

Last analyzed run:

```text
27133682666
```

Artifact:

```text
obd-e2e-evidence
```

Current error:

```text
SyntaxError: Illegal return statement
```

Current suspect:

```text
core/guardian-loop.js
```

Suspect code:

```js
'use strict';
if (window.__GuardianLoopV1) return;
window.__GuardianLoopV1 = true;
```

Expected minimal fix:

```js
(function(){
  'use strict';

  if (window.__GuardianLoopV1) return;
  window.__GuardianLoopV1 = true;

  // existing file content

})();
```

Do not optimize `core/calls-runtime-diagnostics.js` until a later artifact proves it is the current failure.

---

## Read-only diagnostics rule

`window.ImmatCallsRuntimeDiagnostics.run()` must only observe.

Allowed:

- read `window.CallManager`
- read function presence
- read DOM element state by ID
- read localStorage counts/values
- return a JSON diagnostic object

Forbidden:

- write Supabase
- write localStorage
- start a call
- accept a call
- refuse a call
- cancel a call
- mutate UI state
- open overlays
- create notifications

---

## If diagnostics become too heavy

Only simplify after logs prove timeout/performance.

Reduction order:

1. Remove `document.querySelectorAll('body *')`.
2. Remove global text scanning.
3. Remove button inventory scanning.
4. Keep only:
   - `moduleInfo()`
   - `runtimeState()`
   - `storage()`
   - `elState(id)` for known IDs.

Known IDs:

- `callScreen`
- `callOverlay`
- `callIncomingPopup`
- `callSentBanner`
- `callContactModal`
- `callNotAllowedModal`
- `callAudio`
- `callIncomingPlate`
- `callSentPlate`

---

## Blocker documentation rule

If blocked, append to `docs/SESSION-LOG.md` before leaving:

```text
BLOCAGE
Date:
Context:
Evidence:
Hypothesis tested:
Result:
Invalidated hypotheses:
Do not repeat:
Next piste:
Next action:
```

Never leave a blocker only in a chat conversation.

---

## Correction documentation rule

After every correction, append to `docs/SESSION-LOG.md`:

```text
CAUSE
CORRECTIF
RISQUE
STATUT CI
PROCHAINE ACTION
```

---

## Product architecture rules

Messages = relation humaine.

Signaler = création d'un événement.

Activité = suivi d'un événement.

Carte = contexte visuel.

Registry/OBD = mémoire et diagnostic.

No screen should do the full job of another screen.

---

## Calls roadmap after CI green

1. Audit `calls.js`.
2. Document `docs/CALL_SOURCE_OF_TRUTH.md`.
3. Add `CallManager.getRuntimeState()` read-only.
4. Validate `callsRuntime`.
5. Integrate `callsRuntime` into `core/mobile-autotest.js`.
6. Audit incoming/outgoing direction.
7. Build `CallScreen` skeleton closed by default.
8. Wire outgoing call UI.
9. Wire incoming call UI.
10. Add quick replies.
11. Add ringtone/tone with iOS visual fallback.
12. Add full A/B E2E tests.

---

## Critical call rule

```text
SOURCE OF TRUTH FIRST
CALLSCREEN SECOND
```

`call_event` is history.

CallManager / call request state is the business source of truth.

Messages, Activity, OBD and CallScreen must point to the same business state.

---

## Never do during red CI

- do not rewrite `index.html` completely
- do not start a large refactor
- do not modify Supabase schema randomly
- do not modify RLS without audit
- do not break map/panels/sheet
- do not build CallScreen before source of truth is known
- do not merge to main
