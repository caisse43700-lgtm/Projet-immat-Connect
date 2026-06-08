# INTERACTION ORGANISM MAP

This document explains how Messages, Calls, Help, Reports, Ange, Guardian, Registry/OBD and Map must work together.

It is meant to prevent future agents from creating parallel systems or breaking the organism architecture.

---

## Core organism law

```text
Messages  = human relationship
Calls     = controlled contact request
Help      = human assistance request
Reports   = event creation
Activity  = event tracking
Map       = visual context
Ange      = guided assistant / user guidance
Guardian  = safety and trust recommendations
Registry  = memory and reconstruction
OBD       = diagnostics and evidence
```

No module should do the complete job of another module.

---

## Relationship flow

Every human interaction should eventually be linkable to Messages.

```text
Nearby driver
Vehicle menu
Vehicle report
Help request
Call request
Ange suggestion
Guardian recommendation
        ↓
context-aware action
        ↓
Messages conversation
```

Messages is the single human relationship surface.

Do not create:

- a separate Activity chat
- a separate Help chat
- a separate Calls chat
- a separate Nearby Drivers chat
- a separate Ange chat history for driver relationships

---

## Event flow

Reports and help requests are events.

```text
Signaler / Aide
        ↓
Event created
        ↓
Registry / InteractionLedger
        ↓
Activity summary
        ↓
Messages link if human conversation starts
        ↓
Map link if location/context exists
```

Activity tracks the event.

Messages contains the conversation.

Map shows context.

Registry remembers what happened.

---

## Call flow

A call is not a phone call first. It is a controlled contact request.

```text
A requests call with B
        ↓
CallManager writes call request state
        ↓
OBD can observe read-only runtime state
        ↓
Messages may show call_event history
        ↓
CallScreen may visualize pending/accepted/refused
        ↓
Real contact info stays hidden until acceptance
```

Critical rule:

```text
call_event = history
CallManager / call request = business state
CallScreen = visual projection
```

Do not let Messages invent call state.

Do not let CallScreen become the source of truth.

Do not reveal real contact info before acceptance.

---

## Ange role

Ange is not the source of truth and not a separate relationship system.

Ange can:

- guide a user toward the right action;
- explain what to do next;
- suggest a message;
- suggest opening Messages;
- suggest viewing an event in Activity;
- suggest viewing something on Map;
- surface OBD/Registry findings in user-friendly form.

Ange must not:

- create a parallel message thread;
- invent event state;
- bypass CallManager;
- bypass Registry;
- expose private contact data;
- replace Activity tracking;
- mutate Supabase/RLS without an explicit existing workflow.

Recommended Ange outputs:

```text
Suggestion:
Open Messages for this help request.

Suggestion:
This is a vehicle report. Track it in Activity, talk in Messages.

Suggestion:
Call request pending. Use CallScreen or Messages quick reply.
```

---

## Guardian role

Guardian is the safety/trust recommendation layer.

Guardian can observe interaction history and recommend:

- review a driver;
- block recommendation;
- trust recommendation;
- abuse escalation;
- missed-call availability review.

Guardian must not:

- automatically block;
- automatically expose contacts;
- become a messaging UI;
- mutate call state;
- replace user validation.

Guardian recommendations should cite evidence from Registry / InteractionEngine.

---

## Registry / InteractionLedger role

Registry is memory.

It should record facts:

- MESSAGE_SENT
- MESSAGE_RECEIVED
- CALL_REQUEST_CREATED
- CALL_ACCEPTED
- CALL_REFUSED
- CALL_EXPIRED
- HELP_ACCEPTED
- HELP_RESOLVED
- REPORT_RESOLVED

Registry must support reconstruction:

- RepairConversation()
- RebuildConversation()
- rebuildMessageThreads()

Registry must not be confused with UI.

---

## OBD role

OBD is diagnostics and evidence.

OBD should answer:

```text
What exists?
What is visible?
What is broken?
What was the last error?
What can be reconstructed?
```

OBD must be read-only unless a specific repair workflow is explicitly implemented.

For calls runtime, OBD should observe:

- hasCallManager
- hasRequestCall
- hasAcceptCall
- hasRefuseCall
- callIncomingPopup
- callSentBanner
- callOverlay
- pendingIncoming
- pendingOutgoing
- lastCallError

Future improvement:

- use `CallManager.getRuntimeState()` once audited and implemented.

---

## Map role

Map is context, not the relationship center.

Map can:

- show nearby vehicles;
- show event location;
- recenter GPS;
- provide visual context;
- open vehicle menu.

Map must not:

- create a parallel conversation;
- own call state;
- own help state;
- own report resolution state.

Map actions should route to the proper owner:

```text
Message -> Messages
Call -> Calls / CallManager
Signal -> Signaler
View status -> Activity
```

---

## Activity role

Activity is status tracking.

Activity can show:

- type
- status
- urgency
- last action
- last summary
- quick buttons
- link to Messages
- link to Map

Activity must not show the full conversation thread.

Activity must not create a second inbox.

---

## Required context model

Every conversation or message must be contextualized.

```js
{
  conversation_id: '...',
  message_id: '...',
  client_id: '...',
  context_type: 'direct' | 'vehicle_report' | 'help_request' | 'call_request',
  context_id: 'report_id | help_request_id | call_request_id | null'
}
```

Context badges in Messages:

```text
[Direct]
[Véhicule]
[Aide]
[Appel]
```

---

## Cross-links

The organism should provide links between surfaces:

```text
Messages -> View report / View help request / View call request
Activity -> Msg / Call / View on map
Map -> Message / Call / Signal
Ange -> Open correct surface
Guardian -> Review evidence / Open related interaction
OBD -> Open failing module / show diagnostics
```

But each link should route to the owner module, not duplicate its logic.

---

## Anti-patterns

Do not implement:

```text
Activity chat
CallScreen as source of truth
Messages creating call state
Ange creating hidden parallel state
Guardian auto-moderating without validation
Map-owned messages
OBD writing Supabase during diagnostics
Service Worker fixes without evidence
Supabase/RLS changes without audit
```

---

## Implementation order after CI green

1. Audit `calls.js`.
2. Complete `CALL_SOURCE_OF_TRUTH.md`.
3. Add read-only `CallManager.getRuntimeState()`.
4. Update calls runtime diagnostics to use `getRuntimeState()`.
5. Integrate calls runtime in mobile autotest.
6. Audit Messages context model.
7. Design InteractionLedger / MessageRegistry links.
8. Only then create CallScreen skeleton.
9. Wire outgoing/incoming call visuals.
10. Add quick replies and ringtone fallback.

---

## What Claude should be careful about

Before coding, Claude should ask:

```text
Which module owns this state?
Is this a relationship, event, context, memory, or diagnostic?
Am I creating a parallel system?
Does this need a context_id?
Does this reveal private data?
Does this mutate state from a diagnostic path?
Is there a CI/log artifact proving this change is needed?
```

If the answer is unclear, document the blocker in `SESSION-LOG.md` instead of guessing.
