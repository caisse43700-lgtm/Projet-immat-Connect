# CODE AUDIT TARGETS

This document lists the real code files Claude should audit before implementing the interaction architecture.

Purpose:

```text
Architecture tells what should happen.
Code audit tells what already happens.
Do not implement before comparing both.
```

---

## Audit rule

For each file:

```text
1. Identify existing owner responsibilities.
2. Identify persisted state.
3. Identify local/runtime state.
4. Identify DOM mutations.
5. Identify Supabase reads/writes.
6. Identify realtime subscriptions.
7. Identify OBD/autotest hooks.
8. Identify risks before modifying.
```

Output must be added to the relevant doc and summarized in `docs/SESSION-LOG.md`.

---

## Priority 0 — CI evidence first

Before auditing product code, inspect:

- latest GitHub Actions run for `feature-calls-runtime-diagnostics`
- `obd-e2e-evidence`
- `diagnostic-artifacts/playwright-output.log`

If CI is red, fix the first real error before product refactor.

---

## Priority 1 — Calls

### `calls.js`

Why audit:

- owner of call request behavior;
- must define call business source of truth;
- required before CallScreen, audio, runtime diagnostics.

Look for:

- `window.CallManager`
- `init(sb, uid, myPlate)`
- `requestCall(receiverPlate, receiverId)`
- `acceptCall(requestId)`
- `refuseCall(requestId)`
- `cancelCallRequest(requestId)`
- `subscribeIncomingCalls(uid)`
- `loadCallLog(limit)`
- `isCallBlocked(plate)`
- Supabase table/channel names
- status fields
- requester/receiver fields
- UI writes
- localStorage keys
- realtime lifecycle
- error handling

Must update:

- `docs/CALL_SOURCE_OF_TRUTH.md`
- `docs/SESSION-LOG.md`

Do not:

- build CallScreen first;
- make Messages source of truth;
- reveal contact info before acceptance.

---

## Priority 2 — Calls diagnostics

### `core/calls-runtime-diagnostics.js`

Why audit:

- current branch objective;
- must remain read-only;
- may be CI failure if heavy or unsafe.

Look for:

- DOM scans such as `body *`
- global text scans
- writes to localStorage/Supabase
- function calls that start/accept/refuse/cancel calls
- returned diagnostic shape
- missing module safety

Allowed change only if evidence proves need:

- reduce heavy scans;
- read known IDs only;
- consume `CallManager.getRuntimeState()` later.

Do not:

- mutate UI;
- play audio;
- request notification permission;
- create call requests.

---

## Priority 3 — Mobile autotest

### `core/mobile-autotest.js`

Why audit:

- future place for `callsRuntime`, `audioRuntime`, `registryRuntime` checks.

Look for:

- existing OBD test structure;
- current runtime fields;
- pass/fail criteria;
- timeout behavior;
- how artifacts are produced;
- whether diagnostics are read-only.

Do not integrate callsRuntime until:

- CI green;
- calls source of truth audited;
- runtime state exists safely.

---

## Priority 4 — Messages

### `messages.js`

Why audit:

- Messages is the single human relationship center;
- quick replies and call_event history must land here.

Look for:

- conversation_id
- message_id
- client_id
- local deletion
- realtime subscriptions
- context_type/context_id support
- call_event support
- quick reply path
- message beep path if any

Must preserve:

- no parallel chat;
- local deletion only;
- reload/realtime behavior.

---

## Priority 5 — Activity / reports / help

Audit likely files:

```text
activity-related JS
reports/signaler-related JS
help/aide-related JS
index.html inline handlers if present
```

Why audit:

- Activity tracks events but is not a chat;
- Help and reports need context links to Messages and Map.

Look for:

- event IDs
- statuses
- quick action handlers
- message buttons
- call buttons
- map buttons
- expiration/resolution paths

Do not:

- create Activity message thread;
- put full conversation in Activity;
- duplicate Help chat.

---

## Priority 6 — Organism / Bus / Registry

Audit likely files:

```text
core/bus.js
core/immatOrganism.js
InteractionEngine / registry files if present
core/guardian-loop.js
```

Why audit:

- existing organism event flow may already exist;
- registry should reuse existing memory rather than duplicate it.

Look for:

- `window.ImmatBus`
- `window.ImmatOrganism`
- `InteractionEngine`
- event names
- observe/emit paths
- localStorage registry keys
- Guardian evidence links

Do not:

- create a second event bus;
- create a second registry without audit;
- auto-apply Guardian decisions.

---

## Priority 7 — UI shell / overlays

Audit likely files:

```text
index.html
stylesheets / inline CSS
panel/drawer/sheet code
```

Why audit:

- CallScreen and overlays must not reintroduce ghost clicks;
- map/panels/drawer were previously stabilized.

Look for:

- `callIncomingPopup`
- `callSentBanner`
- `callContactModal`
- `callOverlay`
- `callAudio`
- panel z-index
- pointer-events
- display:none behavior

Do not touch without evidence:

- navMap
- sheet.mini
- drawer z-index
- GPS recenter
- nearby vehicles

---

## Priority 8 — Service Worker / assets

Audit likely files:

```text
service-worker.js
manifest files
asset lists/cache version constants
```

Why audit:

- future audio assets may be cached/stale;
- iOS PWA can keep older assets.

Look for:

- cache names/versioning
- asset precache list
- update flow
- reload flow
- GitHub Pages path assumptions

Do not change during red CI unless logs prove SW is active failure.

---

## Priority 9 — Audio future files

Future proposed files:

```text
core/audio-manager.js
core/call-screen.js
core/call-notification-runtime.js
```

Do not create until:

- CI green;
- call source of truth audited;
- CallScreen skeleton phase is reached.

When created, follow:

- `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md`
- `docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md`

---

## Final audit output required

Before implementation, Claude should produce a compact summary:

```text
AUDIT SUMMARY

CI status:
First real error:
Files audited:
Call source of truth:
Messages context support:
Registry/InteractionEngine existing support:
OBD current shape:
Risk areas:
Next minimal change:
```

If this summary cannot be completed, document the blocker instead of coding.
