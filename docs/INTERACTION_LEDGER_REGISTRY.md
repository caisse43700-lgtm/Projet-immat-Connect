# INTERACTION LEDGER REGISTRY

This document defines the global interaction registry for ImmatConnect Pro.

It links:

- the interaction laws
- Messages
- Calls
- Help
- Reports
- Activity
- Map
- Ange
- Guardian
- OBD
- mobile autotests
- reconstruction/repair flows

It is a blueprint, not an implementation yet.

---

## Core law

```text
Messages = relation humaine
Signaler = création d'un événement
Activité = suivi d'un événement
Carte = contexte visuel
Ange = guidage utilisateur
Guardian = sécurité / confiance
Registry = mémoire
OBD = diagnostic
```

Every future correction must preserve this split.

---

## Registry purpose

The registry must answer:

```text
What happened?
Who owns the state?
Which module wrote it?
Which modules can read it?
Can the conversation be rebuilt?
Can OBD diagnose it?
Can Ange explain it?
Can Guardian use it as evidence?
```

Registry is not UI.

Registry is not a message thread.

Registry is not a replacement for Supabase RLS.

---

## Global interaction table

| Interaction | Owner module | Source of truth | Writer | Readers | Message link | Activity link | Map link | Ange role | Guardian role | OBD/autotest |
|---|---|---|---|---|---|---|---|---|---|---|
| DIRECT_MESSAGE_SENT | Messages | MessageStore / Supabase messages | Messages send flow | Messages, Registry, OBD | conversation_id | no | optional | suggest wording / open thread | evidence if abuse/trust | messagesRuntime count/error |
| DIRECT_MESSAGE_RECEIVED | Messages | Supabase messages / realtime | Realtime subscription | Messages, Notifications, Registry | conversation_id | no | optional | explain unread / suggest reply | evidence if abuse/trust | realtime/message tests |
| VEHICLE_REPORT_CREATED | Signaler | reports table / report_id | Signaler flow | Activity, Map, Messages, Registry | context_type vehicle_report | yes | yes | guide next action | evidence if repeated/abuse | report creation E2E |
| VEHICLE_REPORT_ACKED | Activity / report workflow | report status | Je vérifie action | Activity, Messages, Registry | context_id report_id | yes | yes | suggest message | evidence for trust | activity status test |
| VEHICLE_REPORT_RESOLVED | Activity / report workflow | report status | Traité action | Activity, Messages, Registry | context_id report_id | yes | yes | explain resolved | evidence for trust | report resolved test |
| HELP_REQUEST_CREATED | Aide | help_request_id | Help requester flow | Activity, Map, Messages, Registry | context_type help_request | yes | yes | guide helpers | evidence if abuse | help creation test |
| HELP_ACCEPTED | Aide / Activity | help status | J'arrive / Je peux aider | Activity, Messages, Registry, Notifications | context_id help_request_id | yes | yes | suggest next message | evidence for trust | help accepted test |
| HELP_RESOLVED | Aide / Activity | help status | Problème réglé | Activity, Messages, Registry | context_id help_request_id | yes | yes | explain closure | evidence for trust | help resolved test |
| CALL_REQUEST_CREATED | Calls | call request state | CallManager.requestCall | Calls, Messages, OBD, Registry | context_type call_request | optional summary | optional | suggest quick reply | evidence if repeated | callsRuntime pendingOutgoing |
| CALL_INCOMING_RECEIVED | Calls | call request state / realtime | CallManager subscription | Calls, CallScreen, Messages, OBD | context_id call_request_id | optional summary | optional | explain incoming call | evidence if abuse | pendingIncoming test |
| CALL_ACCEPTED | Calls | call request state | CallManager.acceptCall | Calls, Messages, OBD, Registry | call_event accepted | optional summary | no | explain contact unlocked | trust evidence | accept call test |
| CALL_REFUSED | Calls | call request state | CallManager.refuseCall | Calls, Messages, OBD, Registry | call_event refused | optional summary | no | suggest message | evidence if repeated | refuse call test |
| CALL_CANCELLED | Calls | call request state | CallManager.cancelCallRequest | Calls, Messages, OBD, Registry | call_event cancelled | optional summary | no | explain cancelled | neutral | cancel call test |
| CALL_EXPIRED | Calls | call timeout rule | timeout/reload reconciliation | Calls, Messages, OBD, Registry | call_event expired | optional summary | no | suggest retry/message | missed-call evidence | expiration test |
| CALL_MISSED | Calls | receiver-side timeout | timeout/reload reconciliation | Calls, Messages, OBD, Guardian | call_event missed | optional summary | no | suggest reply | HEURISTIC-003 evidence | missed call test |
| DRIVER_BLOCKED | Safety | block list | block flow | Messages, Calls, Guardian, OBD | no new thread | optional | no | explain blocked state | key evidence | block safety test |
| ABUSE_REPORTED | Safety / Guardian | abuse report | abuse report flow | Guardian, OBD, Activity optional | optional | optional | optional | guide safety | HEURISTIC-002 evidence | abuse report test |
| GUARDIAN_RECOMMENDATION_CREATED | Guardian | guardian recommendations | GuardianLoop.recommend | Guardian UI, OBD, Registry | link to evidence | optional | no | explain recommendation | owner | guardian OBD test |
| GUARDIAN_RECOMMENDATION_REVIEWED | Guardian | guardian recommendations | Guardian validation | Guardian, OBD, Registry | no | optional | no | explain decision | owner | guardian review test |
| ANGE_SUGGESTION_CREATED | Ange | suggestion runtime / registry if persisted | Ange flow | UI, Registry optional, OBD | route to Messages if relation | route to Activity if event | route to Map if context | owner | no direct decision | ange runtime test |
| OBD_FINDING_CREATED | OBD | diagnostic artifact / runtime | OBD diagnostics | Developer/agent, Registry optional | no | no | no | summarize for user | evidence for debugging | OBD test |

---

## Laws integrated into registry

| Law | Registry interpretation | Consequence |
|---|---|---|
| Messages = relation humaine | conversations and message history live in Messages | no parallel chat |
| Signaler = event creation | reports create event IDs | Activity tracks them |
| Activité = event tracking | Activity reads summaries/status | no full thread |
| Carte = context | Map links to location/vehicle | no owned conversation |
| Appel = demande de contact | call state belongs to CallManager/request | no contact leak before accepted |
| Chaque message a un contexte | context_type/context_id required | direct, vehicle_report, help_request, call_request |
| Une source de vérité | every event has one owner | no duplicated state |
| IDs stables | conversation_id/message_id/client_id required | reconstruction possible |
| Mémoire prime sur UX | Registry before refactor | repair/rebuild supported |
| Suppression locale | user-local visibility only | do not delete for other user |
| Quick reply ≠ message unless emitted | action must be converted explicitly | avoid fake free-text state |
| Chaque événement a une fin | terminal status required | no endless pending |
| Registry obligatoire | key events recorded | OBD and repair possible |
| OBD messagerie/appels | runtime state observable | read-only diagnostics |
| Privacy | RLS and contact masking | no data leakage |
| Patchs progressifs | OBD -> Registry -> Messages -> Calls -> UX | avoid refactor breakage |

---

## Required registry fields

Minimum event shape:

```js
{
  id: 'ledger_event_id',
  type: 'CALL_REQUEST_CREATED',
  actor_user_id: '...',
  actor_plate: '...',
  target_user_id: '...',
  target_plate: '...',
  context_type: 'direct | vehicle_report | help_request | call_request | safety | obd | guardian | ange',
  context_id: '...',
  conversation_id: '...',
  message_id: '...',
  source_module: 'Messages | Calls | Help | Reports | Activity | Map | Ange | Guardian | OBD',
  status_before: null,
  status_after: 'pending',
  created_at: 'ISO_DATE',
  client_id: 'stable client id',
  evidence: [],
  local_only: false,
  privacy_level: 'public_context | participants_only | private_user | diagnostic'
}
```

Not every field is required for every event, but every event must have:

```text
type
source_module
created_at
context_type
privacy_level
```

---

## Context types

Allowed context types:

```text
direct
vehicle_report
help_request
call_request
route_event
safety
guardian
ange
obd
```

Do not invent new context types without documenting them here.

---

## OBD runtime links

OBD must be able to check:

```text
messagesRuntime
callsRuntime
audioRuntime
activityRuntime
registryRuntime
angeRuntime
guardianRuntime
mapRuntime
```

Minimum future diagnostics:

```js
{
  registryRuntime: {
    hasLedger: true,
    eventCount: 0,
    failedWrites: 0,
    lastLedgerError: null,
    canRebuildConversation: false
  },
  angeRuntime: {
    available: true,
    lastSuggestion: null,
    lastRouteTarget: null,
    lastAngeError: null
  },
  guardianRuntime: {
    available: true,
    pendingRecommendations: 0,
    lastGuardianError: null
  }
}
```

Read-only until repair workflows are explicitly implemented.

---

## Mobile autotest links

Future mobile autotest must validate at least:

### Messages

- send message
- receive/reload message
- local delete conversation
- local delete message
- context badge visible

### Calls

- outgoing pending visible
- incoming pending visible
- accept/refuse/cancel terminal states
- quick reply creates contextual message
- no contact revealed before acceptance
- no ghost overlay
- ringtone failure does not hide call

### Help

- help request created
- helper accepts
- requester sees status in Activity
- Messages link opens correct conversation
- resolved/expired terminal state

### Reports

- vehicle report created
- appears in Activity
- see on Map works
- message opens Messages
- treated/expired terminal state

### Registry/OBD

- ledger event created for key actions
- OBD reports runtime state read-only
- no diagnostic path writes Supabase unexpectedly
- repair/rebuild functions are safe when no data exists

### Ange/Guardian

- Ange routes to correct owner module
- Ange does not create parallel thread
- Guardian recommendation cites evidence
- Guardian does not auto-apply without validation

---

## Reconstruction links

Registry must support future repair functions:

```text
RepairConversation(conversation_id)
RebuildConversation(context_type, context_id)
rebuildMessageThreads(user_id)
rebuildActivityFromLedger(context_id)
```

Rules:

- reconstruction should not duplicate messages;
- reconstruction should preserve local deletion semantics;
- reconstruction should respect privacy/RLS;
- reconstruction should be observable by OBD;
- reconstruction should be safe on empty/corrupt partial data.

---

## Ange integration model

Ange should route, not own.

Examples:

| User situation | Ange suggestion | Target owner |
|---|---|---|
| incoming call audio blocked | “L'appel est visible, tu peux répondre ou envoyer un message.” | Calls / Messages |
| help request nearby | “Tu peux aider ou écrire au demandeur.” | Aide / Messages |
| vehicle report | “Suis le signalement dans Activité ou écris au conducteur.” | Activity / Messages |
| repeated missed calls | “Tu peux répondre par message ou bloquer si nécessaire.” | Messages / Safety |
| OBD finding | “Un diagnostic indique une erreur, consulte le rapport.” | OBD |

Ange must never:

- create hidden state;
- bypass owner modules;
- expose private contact info;
- mutate diagnostics;
- replace Activity.

---

## Guardian integration model

Guardian should consume evidence from Registry / InteractionEngine.

Guardian output:

```js
{
  recommendation_id: '...',
  category: 'block | trust | alert | review | abuse',
  severity: 'low | medium | high | critical',
  evidence: ['ledger_event_id'],
  status: 'pending | approved | rejected | applied | expired'
}
```

Guardian must never apply critical actions automatically.

---

## Implementation order

Do not implement the full registry before CI is stable.

After CI green:

1. Audit current message/call/help/report storage.
2. Complete this registry table with real storage sources.
3. Add read-only `registryRuntime` diagnostics.
4. Add minimal ledger writes for new actions only.
5. Add reconstruction helpers behind explicit calls.
6. Add mobile autotests for ledger evidence.
7. Then connect Ange/Guardian deeper.

---

## Open questions Claude must answer before coding registry

```text
Where are messages currently stored?
Where are call requests currently stored?
Are help requests already persisted?
Are reports already event IDs or local cards?
Is there already a MessageRegistry or InteractionEngine source to reuse?
Which events should be local-only?
Which events require Supabase writes?
Which events are diagnostic-only?
What does RLS allow each user to read?
```

If any answer is unknown, audit first. Do not invent a new persistence layer.
