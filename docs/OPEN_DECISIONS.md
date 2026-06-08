# OPEN DECISIONS

This document prevents future agents from silently making architecture decisions.

Rule:

```text
Unknown ≠ free to invent.
Unknown = audit first.
```

When a decision is unresolved:

- record it here;
- record evidence;
- record assumptions tested;
- record final resolution.

---

## Decision status legend

```text
OPEN
INVESTIGATING
DECIDED
REJECTED
BLOCKED
```

---

## Calls

### OD-001 — Real call source of truth

Status:

```text
OPEN
```

Question:

```text
What is the real business source of truth for calls?
```

Candidates:

- call request table/state
- call_event history
- local runtime state

Required evidence:

- `calls.js` audit
- Supabase writes/reads
- realtime subscription path

Resolution criteria:

- writer identified
- readers identified
- terminal states identified

---

### OD-002 — Existing call persistence

Status:

```text
OPEN
```

Question:

```text
Which table(s) currently store call requests?
```

Required evidence:

- Supabase queries
- migration/schema references

---

### OD-003 — Existing call history model

Status:

```text
OPEN
```

Question:

```text
Does call_event already exist?
```

If yes:

- where stored?
- who writes it?
- who reads it?

---

## Messages

### OD-004 — Context support already present?

Status:

```text
OPEN
```

Question:

```text
Do messages already support context_type/context_id?
```

Required evidence:

- `messages.js`
- database schema
- realtime payloads

---

### OD-005 — Stable IDs already present?

Status:

```text
OPEN
```

Question:

```text
conversation_id?
message_id?
client_id?
```

Need confirmation before any registry/rebuild work.

---

## Registry / InteractionLedger

### OD-006 — Existing registry implementation?

Status:

```text
OPEN
```

Question:

```text
Does a MessageRegistry / InteractionEngine already exist?
```

Required evidence:

- code search
- organism files
- event bus files

---

### OD-007 — Reconstruction strategy

Status:

```text
OPEN
```

Question:

```text
What already exists for repair/rebuild?
```

Candidates:

- RepairConversation
- RebuildConversation
- rebuildMessageThreads
- none

---

## Ange

### OD-008 — Ange persistence

Status:

```text
OPEN
```

Question:

```text
Are Ange suggestions persisted or runtime only?
```

Required evidence:

- Ange-related code
- storage layer

---

### OD-009 — Ange ↔ Registry link

Status:

```text
OPEN
```

Question:

```text
Should Ange consume ledger evidence directly or via a service layer?
```

Do not decide before registry audit.

---

## Guardian

### OD-010 — Guardian evidence source

Status:

```text
OPEN
```

Question:

```text
Where should Guardian obtain evidence?
```

Candidates:

- InteractionLedger
- InteractionEngine
- direct event bus
- existing recommendation storage

---

### OD-011 — Guardian → Ange handoff

Status:

```text
OPEN
```

Question:

```text
What recommendations can Ange surface from Guardian?
```

Examples:

- repeated missed calls
- trust indicators
- abuse warnings

Need evidence chain definition first.

---

## Audio / Notifications

### OD-012 — Existing audio architecture

Status:

```text
OPEN
```

Question:

```text
Does audio already exist beyond callAudio?
```

Required evidence:

- DOM IDs
- JS references
- assets

---

### OD-013 — Notification strategy

Status:

```text
OPEN
```

Question:

```text
Is browser notification support already implemented?
```

Need audit before adding new runtime.

---

## OBD / Autotests

### OD-014 — Existing runtime shape

Status:

```text
OPEN
```

Question:

```text
What runtimes already exist?
```

Candidates:

- messagesRuntime
- callsRuntime
- activityRuntime
- registryRuntime
- guardianRuntime
- angeRuntime

Need confirmation from code.

---

### OD-015 — Artifact generation path

Status:

```text
OPEN
```

Question:

```text
How are OBD artifacts currently produced?
```

Required evidence:

- mobile-autotest
- GitHub Actions workflow

---

## Service Worker

### OD-016 — Audio cache impact

Status:

```text
OPEN
```

Question:

```text
Will future audio assets require cache version changes?
```

Do not answer without SW audit.

---

## Closure rule

A decision can be moved to:

```text
DECIDED
```

only if:

- evidence exists;
- file/function identified;
- impact documented;
- related docs updated.

Otherwise keep it OPEN.
