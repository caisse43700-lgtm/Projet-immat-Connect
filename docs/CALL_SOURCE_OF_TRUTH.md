# CALL SOURCE OF TRUTH

## Status: audit grid, not confirmed truth yet

This document is a working audit grid.

It defines the target model and the questions to answer before building `CallScreen`, but it is **not yet proof** that `calls.js` currently implements these states exactly.

Claude / future agent must:

1. read `calls.js` fully;
2. fill every `TODO` in the source-of-truth table;
3. cite the exact function that writes each state;
4. verify who reads each state;
5. only then implement `CallManager.getRuntimeState()` or `CallScreen`.

Do not assume `pendingOutgoing`, `pendingIncoming`, `activeCall`, or `lastCallStatus` already exist. They are target diagnostic concepts until audited.

---

## Audit output format — mandatory

For every audited function, write the result in this format:

```text
Function:
State written:
Storage/source:
Supabase table/channel:
Realtime impact:
Message/call_event impact:
Activity impact:
UI impact:
Privacy risk:
Overlay risk:
Failure path:
Evidence in code:
Required change:
```

For every call state, write:

```text
State:
Source of truth:
Writer function:
Reader functions/UI:
Message representation:
Activity representation:
OBD representation:
Expiration rule:
Terminal state:
Open question:
```

A correction is acceptable only if it is backed by code evidence from `calls.js` or the latest Playwright artifact.

---

## What a correction should look like

A useful correction must be evidence-based:

- identify the actual writer in `calls.js`;
- identify the stored field/table/local state;
- identify the reader/UI/OBD consumer;
- update this document;
- add or adjust read-only diagnostics only after the source is known.

A bad correction:

- invents a new state without auditing existing state;
- makes `call_event` the source of truth;
- builds `CallScreen` from assumptions;
- writes Supabase/localStorage from diagnostics;
- creates another parallel call history.

---

This document defines the business source of truth for ImmatConnect calls before building `CallScreen`.

Critical rule:

```text
SOURCE OF TRUTH FIRST
CALLSCREEN SECOND
```

`call_event` is history.

CallManager / call request state is the business state.

Messages, Activity, OBD and CallScreen must all read the same business reality.

---

## Why this matters

The current risk is state drift:

```text
CallManager     = pending
Messages        = refused
Activity        = en attente
OBD             = unknown
CallScreen      = visible
```

This must never happen.

Before any full CallScreen work, the project must know:

- where each call state is written
- who writes it
- who reads it
- how it is represented in Messages
- how it is represented in Activity
- how OBD reads it

---

## Existing calls system

`calls.js` already exposes `window.CallManager`.

Known functions:

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

Conclusion:

The call request logic exists. The missing part is a coherent runtime state model and visual experience.

---

## Business states

Canonical states:

```text
CALL_IDLE
CALL_PENDING_OUTGOING
CALL_PENDING_INCOMING
CALL_ACCEPTED
CALL_REFUSED
CALL_CANCELLED
CALL_EXPIRED
CALL_MISSED
CALL_FAILED
CALL_ENDED
```

UI-friendly aliases may exist:

```text
idle
outgoing_pending
incoming_pending
accepted
refused
cancelled
expired
missed
failed
ended
```

Do not mix business state and UI state.

---

## Business state vs UI state

Business state answers:

```text
What is the actual call request status?
```

UI state answers:

```text
What is currently visible on screen?
```

Example:

```text
Business: CALL_PENDING_INCOMING
UI: callScreen hidden after reload
```

That is possible and must be diagnosable.

---

## State transition model

Outgoing:

```text
CALL_IDLE
  -> requestCall()
CALL_PENDING_OUTGOING
  -> accepted by receiver
CALL_ACCEPTED
  -> ended
CALL_ENDED
```

Outgoing alternatives:

```text
CALL_PENDING_OUTGOING
  -> receiver refuses
CALL_REFUSED

CALL_PENDING_OUTGOING
  -> requester cancels
CALL_CANCELLED

CALL_PENDING_OUTGOING
  -> timeout
CALL_EXPIRED

CALL_PENDING_OUTGOING
  -> technical error
CALL_FAILED
```

Incoming:

```text
CALL_IDLE
  -> subscribeIncomingCalls receives pending request
CALL_PENDING_INCOMING
  -> receiver accepts
CALL_ACCEPTED
  -> ended
CALL_ENDED
```

Incoming alternatives:

```text
CALL_PENDING_INCOMING
  -> receiver refuses
CALL_REFUSED

CALL_PENDING_INCOMING
  -> timeout/no answer
CALL_MISSED or CALL_EXPIRED

CALL_PENDING_INCOMING
  -> technical error
CALL_FAILED
```

---

## Source of truth table

This table must be completed during the `calls.js` audit.

| State | Source of truth | Writer | Readers | Message representation | Activity representation | OBD fields |
|---|---|---|---|---|---|---|
| CALL_PENDING_OUTGOING | TODO: call request record / Supabase table | `requestCall()` | CallManager, Messages, OBD, CallScreen | `call_event` outgoing pending | optional quick status | `pendingOutgoing` |
| CALL_PENDING_INCOMING | TODO: call request record / Supabase realtime | `subscribeIncomingCalls()` receives remote request | CallManager, Messages, OBD, CallScreen | `call_event` incoming pending | optional quick status | `pendingIncoming` |
| CALL_ACCEPTED | TODO | `acceptCall()` / realtime update | CallManager, Messages, OBD, CallScreen | `call_event` accepted | accepted/contact active | `activeCall` or accepted count |
| CALL_REFUSED | TODO | `refuseCall()` / realtime update | CallManager, Messages, OBD, CallScreen | `call_event` refused | closed/refused | `lastCallStatus` |
| CALL_CANCELLED | TODO | `cancelCallRequest()` / realtime update | CallManager, Messages, OBD, CallScreen | `call_event` cancelled | closed/cancelled | `lastCallStatus` |
| CALL_EXPIRED | TODO: timeout rule | timeout worker / query / runtime check | CallManager, Messages, OBD, CallScreen | `call_event` expired | expired | `expiredCalls` |
| CALL_MISSED | TODO: receiver-side timeout | timeout worker / runtime check | CallManager, Messages, OBD, CallScreen, GuardianLoop | `call_event` missed | missed | `missedCalls` |
| CALL_FAILED | TODO | catch blocks / Supabase errors | CallManager, OBD, UI | optional failure event | failed | `lastCallError` |
| CALL_ENDED | TODO | future hangup/end logic | CallManager, Messages, OBD, CallScreen | `call_event` ended | ended | `activeCall:null` |

---

## Required audit questions for `calls.js`

For each function, answer these questions before UI work.

### `requestCall(receiverPlate, receiverId)`

- Where is the pending request written?
- What ID is returned or stored?
- Is there a requester/receiver direction field?
- Does it create a message/call event now?
- Does it update UI directly?
- How is failure stored?

### `acceptCall(requestId)`

- Where is accepted state written?
- Does requester receive realtime update?
- Is real contact info exposed only after acceptance?
- Is a message/call event written?
- Does it close overlays safely?

### `refuseCall(requestId)`

- Where is refused state written?
- Does requester receive realtime update?
- Is a message/call event written?
- Does it close overlays safely?

### `cancelCallRequest(requestId)`

- Where is cancelled state written?
- Does receiver receive realtime update?
- Is a message/call event written?
- Does it close overlays safely?

### `subscribeIncomingCalls(uid)`

- Which table/channel is subscribed?
- How are pending incoming calls identified?
- Is duplicate subscription prevented?
- How is unsubscribe handled?
- What happens on reload?

### `loadCallLog(limit)`

- Does this return business state or history?
- Does it include pending calls?
- Is it used by Messages?
- Is it used by Activity?

---

## Required `CallManager.getRuntimeState()` shape

Future read-only diagnostic API:

```js
CallManager.getRuntimeState = function(){
  return {
    initialized: true,
    currentUserId: null,
    currentPlate: null,
    subscriptionActive: false,
    pendingOutgoing: [],
    pendingIncoming: [],
    activeCall: null,
    lastCallStatus: null,
    lastCallError: null,
    preferencesLoaded: false
  };
};
```

Rules:

- read-only
- no Supabase writes
- no localStorage writes
- no UI mutation
- safe if CallManager is not initialized
- safe if Supabase is unavailable

---

## Message model for calls

Calls appear in Messages as `call_event` history, not as the source of truth.

Example:

```js
{
  type: 'call_event',
  context_type: 'call_request',
  context_id: '<call_request_id>',
  call_state: 'CALL_PENDING_OUTGOING',
  direction: 'outgoing',
  plate: 'BZ-652-LL',
  created_at: '...',
  local_only: false
}
```

Messages can render:

```text
📞 Appel vers BZ-652-LL
En attente
[Annuler] [Message]
```

But Messages must not invent the business state.

---

## Activity model for calls

Activity may summarize calls but must not become a messaging thread.

Allowed:

- status
- last summary
- quick actions
- link to Messages

Not allowed:

- full call conversation thread
- independent call history that diverges from Messages

---

## CallScreen model

CallScreen is a visual projection of business state.

It is not the source of truth.

Closed state:

```text
display:none
```

No ghost overlay may block clicks.

Expected future API:

```js
window.CallScreen = {
  showOutgoing(data){},
  showIncoming(data){},
  showMissed(data){},
  showExpired(data){},
  showAccepted(data){},
  hide(){},
  getState(){}
};
```

Do not implement before CI is green and this source-of-truth table has been audited.

---

## Privacy rule

Call is a controlled contact request.

No real phone/contact info is revealed before acceptance.

Accepted state may unlock real contact details only if the existing product policy allows it.

---

## Expiration rule

Every call must end.

Possible terminal states:

- `CALL_ACCEPTED`
- `CALL_REFUSED`
- `CALL_CANCELLED`
- `CALL_EXPIRED`
- `CALL_MISSED`
- `CALL_FAILED`
- `CALL_ENDED`

No permanent invisible pending call.

---

## Next work after CI green

1. Read `calls.js` fully.
2. Complete the source of truth table above.
3. Add `CallManager.getRuntimeState()` read-only.
4. Update `core/calls-runtime-diagnostics.js` to use `getRuntimeState()`.
5. Integrate calls runtime into `core/mobile-autotest.js`.
6. Only then start `CallScreen` skeleton.
