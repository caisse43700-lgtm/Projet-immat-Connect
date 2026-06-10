# Guardian BlackBox Architecture

Date: 2026-06-10
Scope: ImmatConnect Pro production `main`.

## Product principle

Complexity inside, simplicity outside.

The user should see:

```text
🟢 OK
🟠 Attention
🔴 Critique
Cause probable
Action recommandée
Copier rapport
```

The engineer can expand:

```text
runtimeState
dbProbe
messageUiProbe
blockerProbe
lastEvents
versions/cache
raw diagnostics
```

## Goals

1. Make bugs easier to understand than to reproduce.
2. Detect impossible states automatically.
3. Convert raw technical probes into simple traffic lights.
4. Produce a copyable field report from a phone.
5. Enable future safe repairs with explicit confirmation.

## System layers

```text
User UI
  ↓
Guardian Summary Lights
  ↓
Diagnosis Engine
  ↓
Invariant Engine
  ↓
BlackBox Event Recorder
  ↓
Raw Runtime Probes
```

## 1. BlackBox Event Recorder

Stores a bounded local history of important events.

Examples:

```text
APP_LOADED
BUILD_VERSION_SEEN
USER_AUTH_READY
CALL_INITIATED
CALL_RECEIVED
CALL_ACCEPT_CLICKED
DB_ACCEPTED_OK
CALL_ACCEPTED_EMITTED
CALLSCREEN_ACCEPTED_RENDERED
MESSAGE_BUTTON_CLICKED
THREAD_OPENED
ERROR_TOAST_SHOWN
OVERLAY_BLOCKER_DETECTED
```

Rules:

- Bounded ring buffer, default 100 events.
- Stored in memory and optionally localStorage.
- No private message content.
- No sensitive tokens.
- Plate values can be included because the product is plate-based, but reports should remain minimal.

## 2. Invariant Engine

Detects impossible or suspicious states.

Initial invariants:

| Code | Severity | Rule |
|---|---|---|
| `REALTIME_NOT_SUBSCRIBED` | warning | connected user but realtime not SUBSCRIBED |
| `DB_RUNTIME_DIVERGENCE` | critical | runtime pendingCallId null but DB outgoing pending exists |
| `PENDING_EXPIRED_STILL_PENDING` | critical | pending row has expires_at in the past |
| `LEGACY_ACCEPTED_WORDING` | critical | UI still displays “conversation ouverte” |
| `ACCEPTED_ACTIONS_MISSING` | critical | accepted state lacks Message/Fermer |
| `MESSAGE_DATA_BUT_THREAD_BLOCKED` | warning | messages exist but thread cannot open or visible row is blocked |
| `OVERLAY_BLOCKING_TAP` | warning | visible overlay/panel captures tap unexpectedly |
| `CACHE_VERSION_UNKNOWN` | warning | no identifiable build/version marker |

## 3. Diagnosis Engine

Converts invariant violations into user-level explanations.

Example:

```json
{
  "status": "critical",
  "area": "calls",
  "code": "DB_RUNTIME_DIVERGENCE",
  "title": "Rappel bloqué",
  "explanation": "Le téléphone n'a plus d'appel actif, mais Supabase contient encore une demande en attente.",
  "evidence": "pendingCallId=null, DB pendingOutgoingCount=1",
  "action": "Expirer les pending orphelins puis retester le rappel."
}
```

## 4. Guardian Summary Lights

Visible by default.

Suggested lights:

```text
Santé globale
Appels
Messages
Realtime
Cache/version
UI/Overlays
Audio/iOS
```

Each light:

```text
status: ok | warning | critical
label
short cause
short action
```

## 5. Copy Field Report

One button copies:

```text
ImmatConnect Field Report
Date:
URL:
Plate:
Global health:
Calls:
Messages:
Realtime:
Cache:
Top diagnosis:
Evidence:
Last CALL events:
DB probe summary:
Overlay blockers:
```

Must be short enough to paste into ChatGPT/GitHub from a phone.

## 6. Safe Repair Actions — future only

Actions require explicit confirmation and must be reversible/non-destructive.

Initial candidates:

| Action | Description | Safety |
|---|---|---|
| `expire_my_pending_calls` | update own old pending calls to expired | safe, non-delete |
| `close_blocking_overlays` | close visible non-critical overlays | safe UI only |
| `restart_realtime_subscription` | remove/recreate Supabase channel | safe runtime only |
| `force_version_reload` | unregister SW / reload with cache marker | user-confirmed |

No destructive database delete.

## 7. UX levels

### Level 1 — user

```text
🟠 Santé globale : Attention
Cause : ancienne demande en attente
Action : Copier rapport ou réparer pending
```

### Level 2 — useful details

```text
Appels: Warning
DB: Critical
Realtime: OK
Messages: OK
Overlays: OK
```

### Level 3 — engineer

Raw JSON from `ImmatCallsRuntimeDiagnostics.runDeep()` and related probes.

## 8. Implementation plan

### Step A — read-only summary

- Add `GuardianSummaryEngine`.
- Consume existing `ImmatCallsRuntimeDiagnostics.runDeep()`.
- Produce normalized lights and top diagnosis.
- No UI changes required initially; expose `GuardianSummaryEngine.run()`.

### Step B — Dashboard integration

- Add “Diagnostic complet” button.
- Render Level 1 and Level 2 results.
- Add “Copier rapport”.

### Step C — BlackBox event recorder

- Add ring buffer.
- Hook call/message/realtime/toast events.
- Include recent events in report.

### Step D — Safe repair actions

- Add actions one by one with confirmation.
- Start with `expire_my_pending_calls` only.

## Definition of done

A non-technical user can understand in under 5 seconds:

1. whether the app is healthy;
2. what is blocking;
3. what to do;
4. what to copy for support.

An engineer can expand details and find exact evidence without asking for repeated screenshots.
