# MASTER IMPLEMENTATION ROADMAP

This is the execution roadmap for ImmatConnect Pro interaction architecture.

It consolidates:

- CI / OBD recovery
- Messages
- Calls
- Call audio / notification
- Help
- Reports
- Activity
- Map
- Ange
- Guardian
- Registry / InteractionLedger
- mobile autotests

This document exists so Claude can move from architecture to implementation without guessing.

---

## Operating principle

```text
Do not implement from architecture alone.
Use architecture to know where to look.
Use code and CI artifacts to decide what to change.
```

---

## Phase 0 — CI recovery

### Objective

Stabilize the branch before any product work.

### Current status

```text
CI status after guardian-loop alignment: UNKNOWN
```

### Files / evidence

- `CLAUDE_START_HERE.md`
- `docs/CURRENT-INVESTIGATION.md`
- `docs/OBD-RECOVERY-PROTOCOL.md`
- GitHub Actions latest run
- `obd-e2e-evidence`
- `diagnostic-artifacts/playwright-output.log`

### Allowed work

- inspect CI
- download artifact
- read Playwright log
- fix first real error only
- update `docs/SESSION-LOG.md`

### Forbidden work

- CallScreen
- audio implementation
- calls.js refactor
- Supabase/RLS changes
- Service Worker changes without evidence
- global `index.html` rewrite

### Acceptance criteria

- latest CI run inspected
- first real error identified
- if fixed, CI rerun
- `SESSION-LOG.md` updated

---

## Phase 1 — Calls source-of-truth audit

### Objective

Identify the real business source of truth for calls.

### Read first

- `docs/CALL_SOURCE_OF_TRUTH.md`
- `calls.js`

### Output required

Complete the audit table for:

- `requestCall()`
- `acceptCall()`
- `refuseCall()`
- `cancelCallRequest()`
- `subscribeIncomingCalls()`
- `loadCallLog()`

Use the mandatory audit format from `CALL_SOURCE_OF_TRUTH.md`.

### Forbidden work

- do not invent missing state
- do not make `call_event` source of truth
- do not build UI from assumptions

### Acceptance criteria

- each call state has writer/readers/source
- unknowns are explicitly documented
- source-of-truth table has fewer TODOs or justified TODOs

---

## Phase 2 — Read-only runtime observability

### Objective

Expose current runtime state without changing behavior.

### Target APIs

```js
CallManager.getRuntimeState()
CallScreen.getState()
AudioManager.getRuntimeState()
CallNotificationRuntime.getRuntimeState()
```

### Files likely involved

- `calls.js`
- `core/calls-runtime-diagnostics.js`
- future `core/call-screen.js`
- future `core/audio-manager.js`
- future `core/call-notification-runtime.js`

### Rules

- read-only
- no Supabase writes
- no localStorage writes unless existing app state already does it
- no audio playback from diagnostics
- no notification permission request from diagnostics

### Acceptance criteria

- diagnostics safe if modules missing
- diagnostics returns structured runtime object
- OBD can report missing modules without failing app

---

## Phase 3 — Registry / InteractionLedger audit

### Objective

Define how interactions are remembered and reconstructed.

### Read first

- `docs/INTERACTION_LEDGER_REGISTRY.md`
- existing `InteractionEngine` / registry files if present
- Messages storage code
- calls/help/report storage code

### Output required

For each interaction:

- owner module
- writer
- source of truth
- readers
- OBD/autotest check
- Ange/Guardian link if relevant

### Forbidden work

- do not create a second message store
- do not bypass RLS
- do not duplicate persisted events

### Acceptance criteria

- ledger event shape confirmed or adjusted
- reconstruction open questions listed
- registryRuntime target fields confirmed

---

## Phase 4 — Messages context model

### Objective

Ensure Messages is the only human relationship center.

### Required concepts

```text
conversation_id
message_id
client_id
context_type
context_id
```

### Context types

- direct
- vehicle_report
- help_request
- call_request

### Forbidden work

- Activity chat
- Help chat
- Calls chat
- Nearby Drivers chat
- Ange relationship chat

### Acceptance criteria

- context badges possible
- quick replies become contextual messages
- local deletion remains local
- reload/realtime behavior preserved

---

## Phase 5 — CallScreen skeleton

### Objective

Create visual call surface closed by default.

### Read first

- `docs/CALL_SOURCE_OF_TRUTH.md`
- `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md`
- `docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md`

### DOM target

```text
callScreen
callScreenStatus
callScreenPlate
callScreenAvatar
callScreenTimer
callScreenAcceptBtn
callScreenRefuseBtn
callScreenHangupBtn
callScreenMessageBtn
callScreenQuickReplies
```

### Rule

Closed means:

```text
display:none
no click blocking
no ghost overlay
```

### Acceptance criteria

- skeleton exists
- hidden by default
- getState() read-only
- no business state ownership

---

## Phase 6 — Incoming/outgoing call UX

### Objective

Wire visual call states to audited CallManager business state.

### States

- incoming pending
- outgoing pending
- accepted
- refused
- cancelled
- expired
- missed
- failed

### Acceptance criteria

- incoming screen visible for receiver
- outgoing screen visible for requester
- Message button opens contextual conversation
- terminal states close or update screen correctly
- no contact info before acceptance

---

## Phase 7 — Audio and notification skeleton

### Objective

Add differentiated sound/notification infrastructure without making audio required.

### Read first

- `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md`
- `docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md`

### Sound families

```text
message beep
incoming ringtone
outgoing tone
system/OBD alert
```

### Files likely involved

- future `core/audio-manager.js`
- future `core/call-notification-runtime.js`
- Service Worker only after evidence

### Acceptance criteria

- call visible even when audio fails
- ringtone distinct from message beep
- audio stops on all terminal states
- OBD reports audio blocked/readiness
- no permission prompt from diagnostics

---

## Phase 8 — Ange integration

### Objective

Ange guides users to the correct owner module.

### Read first

- `docs/INTERACTION_ORGANISM_MAP.md`
- `docs/INTERACTION_LEDGER_REGISTRY.md`

### Ange may

- suggest next action
- explain audio blocked
- open Messages
- open Activity
- open Map
- explain OBD finding

### Ange must not

- own relationship history
- create hidden state
- bypass CallManager
- bypass Registry
- reveal private contacts

### Acceptance criteria

- Ange routes, does not own
- suggestions are contextual
- no parallel thread

---

## Phase 9 — Guardian integration

### Objective

Guardian uses evidence to recommend safety/trust actions.

### Read first

- `docs/INTERACTION_LEDGER_REGISTRY.md`
- `core/guardian-loop.js`

### Guardian may

- recommend review/block/trust/abuse escalation
- cite evidence

### Guardian must not

- auto-apply critical actions
- mutate call state
- become messaging UI

### Acceptance criteria

- every recommendation cites evidence
- user validation remains required
- OBD sees recommendation lifecycle

---

## Phase 10 — Mobile autotest expansion

### Objective

Validate the full interaction organism.

### Required test categories

Messages:

- send/receive/reload
- local delete
- context badges

Calls:

- outgoing pending
- incoming pending
- accept/refuse/cancel
- expired/missed
- quick reply contextual message
- audio blocked fallback
- no ghost overlay

Help:

- create
- accept
- resolve
- message link
- map link

Reports:

- create
- activity entry
- message link
- map link
- treated/expired

Registry/OBD:

- ledger event created
- diagnostics read-only
- reconstruction safe

Ange/Guardian:

- Ange routes to owner
- Guardian cites evidence
- no automatic unsafe action

### Acceptance criteria

- tests prove no parallel systems
- tests prove privacy before call acceptance
- tests prove visual fallback if audio blocked

---

## Global owner matrix

| Domain | Owner | Not owner |
|---|---|---|
| Human conversation | Messages | Activity, Map, Ange, CallScreen |
| Call business state | CallManager / call request | Messages, CallScreen, OBD |
| Call visual state | CallScreen | CallManager business source |
| Audio state | AudioManager | CallManager business source |
| Event tracking | Activity | Messages thread |
| Visual context | Map | relationship history |
| User guidance | Ange | source of truth |
| Safety recommendation | Guardian | automatic enforcement |
| Memory/rebuild | Registry | UI |
| Diagnostics | OBD | business writer |

---

## Global acceptance criteria

Before merge:

```text
CI green
OBD stable
No illegal return / runtime parse errors
No ghost overlays
No parallel messaging
Call source of truth documented
Messages have context
Calls visible without audio
Audio is differentiated
Privacy preserved before call acceptance
Ange routes correctly
Guardian evidence-based
Autotests cover critical flows
```

---

## If blocked

Do not guess.

Append to `docs/SESSION-LOG.md`:

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
