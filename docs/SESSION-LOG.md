# SESSION LOG — ImmatConnect Pro

This file records every investigation, correction, blocker and next action so future agents do not repeat work.

---

## 2026-06-08 — OBD Appels / calls runtime diagnostics

### Context

Project: ImmatConnect Pro

Repository: `caisse43700-lgtm/Projet-immat-Connect`

Branch: `feature-calls-runtime-diagnostics`

Goal: add a read-only calls runtime diagnostic before building a full visual call experience.

Added file:

```text
core/calls-runtime-diagnostics.js
```

Exposed API:

```js
window.ImmatCallsRuntimeDiagnostics.run()
```

### Product rule

Messages = relation humaine.

Signaler = création d'un événement.

Activité = suivi d'un événement.

Carte = contexte visuel.

Registry/OBD = mémoire et diagnostic.

### Calls audit

`calls.js` already contains `window.CallManager` and call request functions:

- `requestCall()`
- `acceptCall()`
- `refuseCall()`
- `cancelCallRequest()`
- `subscribeIncomingCalls()`
- `loadCallLog()`

Conclusion: call logic exists, but the user experience does not yet exist.

### CI investigation

Last analyzed commit:

```text
a8cbb1b722b308094bed41527856392ba7d2dd9f
```

Last analyzed run:

```text
27133682666
```

Artifact:

```text
obd-e2e-evidence
```

Log:

```text
diagnostic-artifacts/playwright-output.log
```

### Initial hypothesis

`core/calls-runtime-diagnostics.js` might be too heavy because it scans `body *` and searches visible texts.

### Result

Not confirmed as the first blocker.

### Actual blocker found

```text
SyntaxError: Illegal return statement
```

### Current suspect

`core/guardian-loop.js`

The file contains a top-level return:

```js
'use strict';
if (window.__GuardianLoopV1) return;
window.__GuardianLoopV1 = true;
```

This is illegal in a classic browser script.

### Expected correction

Wrap `core/guardian-loop.js` in an IIFE and keep the rest of the business logic unchanged.

### Risk

Low if the IIFE only wraps existing code.

### Do not repeat

Do not continue blaming `calls-runtime-diagnostics.js` until a new artifact proves timeout/performance issues.

Do not start `CallScreen` while CI is red.

Do not refactor `calls.js` before the source of truth is documented.

### Next action

1. Fix `core/guardian-loop.js` with a minimal IIFE wrapper.
2. Rerun CI.
3. Download new `obd-e2e-evidence` artifact.
4. Read `diagnostic-artifacts/playwright-output.log`.
5. Fix only the first remaining real error.

---

## 2026-06-08 — Correction applied: guardian-loop IIFE

### CAUSE

`core/guardian-loop.js` had a top-level guard:

```js
if (window.__GuardianLoopV1) return;
```

This can trigger:

```text
SyntaxError: Illegal return statement
```

when loaded as a classic browser script.

### CORRECTIF

Wrapped `core/guardian-loop.js` in an outer IIFE.

The business logic and public export remain the same:

```js
window.GuardianLoop = GuardianLoop;
```

Correction commit recorded during session:

```text
4950cb72a78a4f1ba0d9758ba2ff0e5cd8ee55ad
```

### RISQUE

Low.

The correction only moves the duplicate-load guard inside a function scope.

Potential risk to verify by CI:

- accidental syntax issue from wrapper
- GuardianLoop still exported correctly
- no regression in InteractionEngine / GuardianLoop loading order

### STATUT CI

Not verified yet.

Audit attempted to fetch workflow runs for commit `4950cb72a78a4f1ba0d9758ba2ff0e5cd8ee55ad`, but no workflow run was returned by the GitHub connector at audit time.

### AUDIT LOCAL / STATIC

Verified on branch `feature-calls-runtime-diagnostics`:

- `core/guardian-loop.js` starts with `(function(){`
- `if (window.__GuardianLoopV1) return;` is now inside the IIFE
- file ends with `window.GuardianLoop = GuardianLoop;` then `})();`

Search for a similar obvious pattern `if (window.__...) return;` did not return additional results through GitHub search.

### PROCHAINE ACTION

1. Trigger or wait for a GitHub Actions run on the latest branch commit.
2. If red, download new `obd-e2e-evidence`.
3. Read `diagnostic-artifacts/playwright-output.log`.
4. Confirm whether `Illegal return statement` disappeared.
5. Document the first remaining real error here.
6. Fix only that first remaining real error.

---

---

## 2026-06-08 — CI green confirmed + calls.js audit

### CI status

Branch: `feature-calls-runtime-diagnostics`

Runs inspected (from saved GitHub Actions result):

```
27140587060  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
27140587074  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
27140587128  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
```

All runs: `completed / success`. CI is green.

### First action per decision matrix (CI green)

Audit `calls.js` and complete `docs/CALL_SOURCE_OF_TRUTH.md`.

### calls.js audit — summary

File: `calls.js` — 397 lines. Module pattern, `window.CallManager` exposed.

Key findings:

1. **CALL_PENDING_OUTGOING**: DB `call_requests.status='pending'` + `_pendingCallId` module var. Recovered on init/visibilitychange via `_recoverPendingRequest()`. UI: `callSentBanner` 8 s auto-dismiss.

2. **CALL_PENDING_INCOMING**: Realtime only. No recovery on reload — receiver must get a new push. Expiry from `expires_at` field.

3. **CALL_ACCEPTED**: Resolves immediately to Messages thread via `App.actOpenConv(requester_plate)`. No `activeCall` state variable exists. Requester notified via realtime UPDATE subscription.

4. **CALL_MISSED**: In-memory `_missedCallIds` Set only. Not persisted. `ImmatOrganism.observe('CALL_MISSED', ...)` fired.

5. **CALL_FAILED**: Toast only. No persistent error state.

6. **CALL_ENDED**: Not implemented — Phase 1 has no real-time audio. Not needed yet.

7. **call_event**: Not written by any function in current calls.js. Messages / Activity integration is not yet wired.

8. **cancelCallRequest caveat**: Receiver popup is NOT explicitly dismissed on cancel — relies on `expires_at` timeout only.

### getRuntimeState() added

Added `CallManager.getRuntimeState()` read-only at lines 378-396 of `calls.js`.

Returns:

```js
{
  initialized, myPlate, pendingCallId, hasPendingOutgoing,
  sentBannerVisible, incomingPopupVisible, contactModalVisible,
  notAllowedModalVisible, realtimeSubscribed, missedCallsCount
}
```

Safe if CallManager is not initialized (try/catch, returns `{initialized:false, error:...}`).

### CALL_SOURCE_OF_TRUTH.md

Status updated from "audit grid" → **audit complete**.

All TODO entries in the source-of-truth table filled.

All audit questions for `requestCall`, `acceptCall`, `refuseCall`, `cancelCallRequest`, `subscribeIncomingCalls`, `loadCallLog` answered with code-line citations.

### What remains

Per `docs/CALL_SOURCE_OF_TRUTH.md` "Next work after CI green":

- [ ] Step 3 (done): `getRuntimeState()` added
- [ ] Step 4: Update `core/calls-runtime-diagnostics.js` to use `getRuntimeState()`
- [ ] Step 5: Integrate calls runtime into `core/mobile-autotest.js`
- [ ] Step 6 (future): `CallScreen` skeleton (closed by default)

### Risk

Low. `getRuntimeState()` is read-only, no DB writes, no localStorage writes, no UI mutation.

### Next action

1. Update `core/calls-runtime-diagnostics.js` to consume `CallManager.getRuntimeState()`.
2. Push and rerun CI.
3. Document result here.

---

# Blocker template

When blocked, append a section with:

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

---

# Correction template

After every correction, append:

```text
CAUSE
CORRECTIF
RISQUE
STATUT CI
PROCHAINE ACTION
```
