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

Completed 2026-06-08 — audit of `calls.js` (397 lines, commit `63047d0`).

| State | Source of truth | Writer | Readers | Message representation | Activity representation | OBD fields |
|---|---|---|---|---|---|---|
| CALL_PENDING_OUTGOING | DB: `call_requests.status='pending'` + `_pendingCallId` (module-private var, line 25) | `requestCall()` line 130 — INSERT `call_requests` → `_pendingCallId = data.id` | CallManager internally; recovered on init/visibilitychange via `_recoverPendingRequest()`; UI: `callSentBanner` (8 s auto-dismiss) | **Not wired** — no `call_event` row written yet | **Not wired** | `pendingCallId`, `hasPendingOutgoing`, `sentBannerVisible` via `getRuntimeState()` |
| CALL_PENDING_INCOMING | DB: realtime INSERT on `call_requests` filtered `receiver_id=eq.uid` (channel `ic_calls_${uid}`) | `subscribeIncomingCalls()` line 239 — Supabase Realtime postgres_changes INSERT | CallManager DOM `callIncomingPopup`; expiry timer set from `expires_at`; **not recovered on reload** (incoming state lost on refresh) | **Not wired** | **Not wired** | `incomingPopupVisible` via `getRuntimeState()` |
| CALL_ACCEPTED | DB: `call_requests.status='accepted'`, `responded_at=now` (written by receiver) | `acceptCall()` line 188 — UPDATE; requester notified via realtime UPDATE subscription (line 252) | Requester: realtime UPDATE → `_hideSentBanner()` + `App.actOpenConv(receiver_plate)`. **No dedicated activeCall state** — resolves immediately to Messages thread | Resolves to Messages thread for requester_plate | Surfaces via existing message thread in Activité | No dedicated field — `hasPendingOutgoing:false` signals cleared |
| CALL_REFUSED | DB: `call_requests.status='refused'`, `responded_at=now` | `refuseCall()` line 207 — UPDATE; requester notified via realtime UPDATE → toast 'Refusée' + `_hideSentBanner()` | Toast only on requester side; popup hidden on receiver side | **Not wired** — no `call_event` written | **Not wired** | `lastCallStatus` not yet tracked in state |
| CALL_CANCELLED | DB: `call_requests.status='cancelled'` | `cancelCallRequest()` line 220 — UPDATE; `_pendingCallId=null` | `_hideSentBanner()` on requester. **Receiver popup not explicitly dismissed** — expires via `expires_at` timer | **Not wired** | **Not wired** | `lastCallStatus` not yet tracked |
| CALL_EXPIRED | DB: `call_requests.expires_at < now` (checked at popup-open time) | DB-side expiry field; UI: `_showSentBanner` 8 s auto-close (line 308); popup timer from `expires_at` (line 286) | Popup/banner removed; `CALL_MISSED` OrgObserve fired if popup was visible (line 291) | **Not wired** | **Not wired** | `expiredCalls` not yet tracked |
| CALL_MISSED | In-memory only: `_missedCallIds` Set (line 27) — **not persisted, lost on reload** | Timeout in `_showIncomingPopup` line 287 — fires `ImmatOrganism.observe('CALL_MISSED', ...)` when popup auto-closes | ImmatOrganism bus only | **Not wired** | **Not wired** | `missedCallsCount` via `_missedCallIds.size` in `getRuntimeState()` |
| CALL_FAILED | No persistent state — toast only | `requestCall()` catch blocks (lines 164-175): codes `23505`, `spam_limit`, `cooldown_active`, generic error → `_showError(toast)` | Toast only | **Not wired** | **Not wired** | `lastCallError` not yet tracked |
| CALL_ENDED | **Not implemented** — no hangup/end concept in current model. Calls resolve to Messages threads; there is no real-time audio call. | N/A — out of scope for Phase 1 | N/A | N/A | N/A | N/A |

---

## Required audit questions for `calls.js`

Completed 2026-06-08. Evidence from `calls.js` lines cited.

### `requestCall(receiverPlate, receiverId)`

- **Pending request written:** INSERT into `call_requests` (lines 152-162). Fields: `requester_id`, `receiver_id`, `requester_plate`, `receiver_plate`, `source='vehicle_contact'`. DB triggers enforce anti-spam and uniqueness.
- **ID stored:** `_pendingCallId = data.id` (line 182). Returned by `.select().maybeSingle()`.
- **Direction fields:** Yes — `requester_plate` / `requester_id` vs `receiver_plate` / `receiver_id`.
- **call_event written:** No. No messages INSERT occurs. No call_event row.
- **UI update:** `_showSentBanner(receiverPlate, data.id)` (line 183). Banner auto-removes after 8 s (line 308-311).
- **Failure:** toast via `_showError()`. Codes handled: `23505` (duplicate), `spam_limit`, `cooldown_active`, generic.

### `acceptCall(requestId)`

- **Accepted state written:** UPDATE `call_requests` SET `status='accepted'`, `responded_at=now` WHERE `id=requestId AND receiver_id=_uid AND status='pending'` (lines 191-198).
- **Requester realtime update:** Yes — `subscribeIncomingCalls` has a second subscription on `UPDATE` filtered `requester_id=eq.uid` (lines 252-268). When status changes to `accepted`, requester banner hides and `App.actOpenConv(receiver_plate)` opens Messages.
- **Contact info exposed:** Only `requester_plate` from the accepted record (line 199-200). No phone/contact data.
- **call_event written:** No.
- **Overlay:** `_hideIncomingPopup()` called before DB write (line 189).

### `refuseCall(requestId)`

- **Refused state written:** UPDATE `call_requests` SET `status='refused'`, `responded_at=now` WHERE `id=requestId AND receiver_id=_uid AND status='pending'` (lines 210-215).
- **Requester realtime:** Yes — same UPDATE subscription at requester triggers `toast('Refusée', 'bad')` and `_hideSentBanner()` (lines 265-267).
- **call_event written:** No.
- **Overlay:** `_hideIncomingPopup()` called before DB write (line 208).

### `cancelCallRequest(requestId)`

- **Cancelled state written:** UPDATE `call_requests` SET `status='cancelled'` WHERE `id=requestId AND requester_id=_uid AND status='pending'` (lines 224-228). `_pendingCallId=null` (line 229).
- **Receiver realtime update:** The receiver's INSERT subscription does not watch UPDATE events. **Receiver popup is not explicitly dismissed by cancellation.** The popup auto-hides only when `expires_at` is reached or receiver takes action.
- **call_event written:** No.
- **Overlay:** `_hideSentBanner()` called before DB write (line 221).

### `subscribeIncomingCalls(uid)`

- **Table/channel:** `call_requests` table, channel `ic_calls_${uid}` (line 238).
- **Two subscriptions on the same channel:**
  1. INSERT filter `receiver_id=eq.uid` → shows incoming popup (lines 240-250).
  2. UPDATE filter `requester_id=eq.uid` → handles response to outgoing (lines 252-268).
- **Incoming identified by:** `status='pending'` check + `expires_at` not past (lines 247-248).
- **Duplicate subscription:** `try { if (_chCalls) _sb.removeChannel(_chCalls) }` before creating new (lines 236-237).
- **Unsubscribe:** Only on resubscription. No public `unsubscribe()` exported. On CHANNEL_ERROR/TIMED_OUT: auto-retry after 5 s (lines 269-273).
- **On reload:** `_recoverPendingRequest()` restores outgoing banner if a pending outgoing exists in DB (lines 45-68). **Incoming not recovered** — receiver must receive a new realtime event.

### `loadCallLog(limit)`

- **Returns:** history + all statuses (pending, accepted, refused, cancelled, etc.) — no status filter applied (lines 361-374).
- **Includes pending:** Yes.
- **Used by Messages:** No — not wired.
- **Used by Activity:** No — not wired. Standalone diagnostic/journal function.

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
