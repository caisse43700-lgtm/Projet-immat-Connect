# CURRENT INVESTIGATION — READ FIRST

## Safety

Repository: `caisse43700-lgtm/Projet-immat-Connect`

Working branch: `feature-calls-runtime-diagnostics`

Do not work on `main` for this investigation.

Before any local work, verify:

```bash
git branch --show-current
```

Expected:

```text
feature-calls-runtime-diagnostics
```

Do not merge to `main` until CI is green and OBD calls runtime is stable.

---

## Current blocker

`SyntaxError: Illegal return statement`

## Evidence

- Last analyzed commit: `a8cbb1b722b308094bed41527856392ba7d2dd9f`
- Last analyzed GitHub Actions run: `27133682666`
- Issue: `#253 — OBD Incident: E2E failure a8cbb1b run 27133682666`
- Artifact: `obd-e2e-evidence`
- Log to inspect: `diagnostic-artifacts/playwright-output.log`

## Current suspect

`core/guardian-loop.js`

## Why

The file contains a top-level `return`:

```js
'use strict';
if (window.__GuardianLoopV1) return;
window.__GuardianLoopV1 = true;
```

A `return` statement is illegal at top level in a classic browser script. This matches the observed Playwright error:

```text
SyntaxError: Illegal return statement
```

## Expected fix

Wrap `core/guardian-loop.js` in an IIFE, preserving all existing business logic:

```js
(function(){
  'use strict';

  if (window.__GuardianLoopV1) return;
  window.__GuardianLoopV1 = true;

  // existing content unchanged

})();
```

## Do not modify yet

- Do not build `CallScreen` yet.
- Do not refactor `calls.js` yet.
- Do not integrate `callsRuntime` into `core/mobile-autotest.js` yet.
- Do not simplify `core/calls-runtime-diagnostics.js` unless the new logs prove timeout/performance issues.
- Do not modify Supabase schema or RLS without audit.
- Do not rewrite `index.html` completely.

## Next action

1. Fix `core/guardian-loop.js` with the minimal IIFE correction.
2. Rerun CI.
3. Download the new `obd-e2e-evidence` artifact.
4. Read `diagnostic-artifacts/playwright-output.log`.
5. Fix only the first remaining real error.
6. Update this file and `docs/SESSION-LOG.md`.

---

# Product context

ImmatConnect Pro is a mobile PWA for drivers to communicate from a license plate.

Stack:

- GitHub Pages
- HTML/CSS/JS vanilla
- Supabase
- Realtime
- Service Worker
- Playwright E2E
- PWA iOS/Android

Core pillars:

- Messages
- Signaler
- Activité
- Carte
- Aide

## Global philosophy

- Messages = relation humaine
- Signaler = création d'un événement
- Activité = suivi d'un événement
- Carte = contexte visuel
- Registry/OBD = mémoire et diagnostic

No screen should do the full job of another screen.

## Current calls branch objective

The branch adds a read-only diagnostics layer before building the real calls UI.

File added:

```text
core/calls-runtime-diagnostics.js
```

Exposed API:

```js
window.ImmatCallsRuntimeDiagnostics.run()
```

The diagnostics must remain read-only:

- no Supabase writes
- no localStorage writes
- no call request creation
- no accept/refuse/cancel action
- no UI mutation except observation

## Existing calls audit

`calls.js` already exposes `window.CallManager` with:

- `init(sb, uid, myPlate)`
- `openContactOptions(plate, uid)`
- `closeContactModal()`
- `contactByMessage(plate)`
- `contactByCall(plate, uid)`
- `requestCall(receiverPlate, receiverId)`
- `acceptCall(requestId)`
- `refuseCall(requestId)`
- `cancelCallRequest(requestId)`
- `subscribeIncomingCalls(uid)`
- `loadCallPreferences()`
- `setCallPreferences(allow)`
- `loadCallLog(limit)`
- `isCallBlocked(plate)`

Existing/referenced UI:

- `callContactModal`
- `callIncomingPopup`
- `callSentBanner`
- `callNotAllowedModal`
- `callOverlay`
- `callAudio`

Conclusion:

The technical call request system exists. The missing part is the full WhatsApp-like visual call experience.

---

# Architecture target

## Messages

Messages is the single center for human relationships.

All written conversations converge here:

- nearby drivers
- vehicle menu
- vehicle report
- help requests
- calls

There must be only one messaging system.

## Activité

Activité is not a messaging screen.

It displays:

- type
- status
- urgency
- last action
- last summary
- quick buttons

The full thread belongs to Messages.

## Route

Route is collective.

Allowed actions:

- Toujours là
- Disparu
- Voir sur carte

Route must not offer:

- Message
- Appel
- J'arrive
- Je vérifie

## Véhicule

Vehicle reports can contact humans.

Allowed actions:

- Je vérifie
- Message
- Appel
- Traité

The Message button opens Messages.

## Aide

Help is a human assistance interaction.

Requester actions:

- Message
- Appel
- Problème réglé
- Annuler

Helper actions:

- J'arrive
- Je peux aider
- Message
- Appel
- Impossible

When `J'arrive` is triggered:

- notify requester
- status becomes `en cours`
- conversation opens

---

# Calls target

Call is a controlled contact request.

No real phone/contact information is revealed before acceptance.

Outgoing screen:

```text
Appel vers BZ-652-LL
En attente...
[Raccrocher]
[Message]
```

Incoming screen:

```text
Appel entrant
AA-111-AA
[Accepter]
[Refuser]
[Message]
```

Quick replies become Messages:

- Je te rappelle plus tard
- Je ne peux pas répondre
- Écris-moi
- Rappelle-moi quand tu peux

Call states:

- `idle`
- `outgoing_pending`
- `incoming_pending`
- `accepted`
- `refused`
- `expired`
- `cancelled`
- `failed`

Future `callScreen` elements:

- `callStatus`
- `callPlate`
- `callAvatar`
- `callTimer`

Actions:

- Accepter
- Refuser
- Raccrocher

Secondary actions:

- Message
- Haut-parleur

Closed state rule:

```text
display:none
```

No ghost overlay may block clicks.

---

# Future order after CI green

1. Audit `calls.js` completely.
2. Create `docs/CALL_SOURCE_OF_TRUTH.md`.
3. Add `CallManager.getRuntimeState()` read-only.
4. Validate `callsRuntime`.
5. Integrate `callsRuntime` into `core/mobile-autotest.js`.
6. Audit incoming/outgoing direction.
7. Create `CallScreen` skeleton closed by default.
8. Wire outgoing call screen.
9. Wire incoming call screen.
10. Add quick replies.
11. Add ringtone/tone with iOS visual fallback.
12. Complete A/B E2E.

## Critical product rule

```text
SOURCE OF TRUTH FIRST
CALLSCREEN SECOND
```

`call_event` is history, not the source of truth.

CallManager / call request state is the business state.

Messages, Activité, OBD and CallScreen must all point to the same business reality.
