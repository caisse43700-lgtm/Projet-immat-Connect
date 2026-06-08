# CALL AUDIO IMPLEMENTATION SKELETON

This document turns `CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md` into an executable implementation plan.

It is not code yet. It is the skeleton Claude should follow once CI is green and call source of truth is audited.

Read before implementation:

1. `docs/CALL_SOURCE_OF_TRUTH.md`
2. `docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md`
3. `docs/INTERACTION_ORGANISM_MAP.md`
4. `docs/INTERACTION_LEDGER_REGISTRY.md`

---

## Non-negotiable sequence

Do not implement audio first.

Correct order:

```text
CI green
  ↓
calls.js source-of-truth audit
  ↓
CallManager.getRuntimeState() read-only
  ↓
CallScreen skeleton closed by default
  ↓
Audio/notification skeleton
  ↓
Incoming/outgoing ringtone wiring
  ↓
Message beep wiring
  ↓
OBD/mobile-autotest validation
```

Reason:

Audio depends on call state and visible UI state. If source of truth is unclear, audio will drift or loop incorrectly.

---

## Questions answered by this skeleton

Claude should not need to guess:

```text
Which sound exists?
When does it start?
When does it stop?
What if audio is blocked?
What if iOS blocks autoplay?
How is it diagnosed?
How does it link to Messages?
How does Ange explain it?
How does OBD test it?
Which files should be touched?
Which files must not be touched?
```

---

## Proposed files

Future files to add only after CI green:

```text
core/audio-manager.js
core/call-screen.js
core/call-notification-runtime.js
```

Possible future assets:

```text
assets/audio/message-beep.mp3
assets/audio/call-incoming.mp3
assets/audio/call-outgoing.mp3
assets/audio/system-alert.mp3
```

Do not add audio assets until Service Worker/cache strategy is checked.

---

## Existing compatibility

Existing referenced element:

```text
callAudio
```

Future compatibility rule:

- keep `callAudio` as backward-compatible alias if it already exists;
- do not rely on one audio element for every sound type;
- diagnostics must distinguish intent: incoming, outgoing, message, system.

---

## DOM IDs to standardize

Future CallScreen IDs:

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
callScreenSpeakerBtn
callScreenQuickReplies
```

Future audio IDs:

```text
callAudioIncoming
callAudioOutgoing
messageAudioBeep
systemAudioAlert
```

Compatibility ID:

```text
callAudio
```

Closed UI rule:

```text
callScreen.style.display = 'none'
callScreen must not block clicks
callOverlay must not block clicks when closed
```

---

## AudioManager target API

Future API:

```js
window.AudioManager = {
  init(){},
  unlockFromUserGesture(){},
  playMessageBeep(context){},
  playIncomingRingtone(context){},
  playOutgoingTone(context){},
  stopCallAudio(reason){},
  stopAll(reason){},
  getRuntimeState(){
    return {
      supported: true,
      unlockedByUserGesture: false,
      incomingRingtoneReady: false,
      outgoingToneReady: false,
      messageBeepReady: false,
      currentlyPlaying: null,
      lastAudioError: null,
      lastAudioBlocked: false,
      lastStopReason: null
    };
  }
};
```

Rules:

- `getRuntimeState()` is read-only.
- `play*()` must fail safely.
- `stopCallAudio()` must be idempotent.
- no sound may loop after a terminal call state.
- audio failure must never hide CallScreen.

---

## CallScreen target API

Future API:

```js
window.CallScreen = {
  showOutgoing(callState){},
  showIncoming(callState){},
  showAccepted(callState){},
  showRefused(callState){},
  showMissed(callState){},
  showExpired(callState){},
  hide(reason){},
  getState(){
    return {
      visible: false,
      mode: 'idle',
      currentCallId: null,
      plate: null,
      overlayBlocking: false,
      lastRenderError: null
    };
  }
};
```

CallScreen is UI only.

It must not own business state.

It must render the state produced by CallManager.

---

## CallNotificationRuntime target API

Future API:

```js
window.CallNotificationRuntime = {
  onIncomingPending(callState){},
  onOutgoingPending(callState){},
  onCallAccepted(callState){},
  onCallRefused(callState){},
  onCallCancelled(callState){},
  onCallExpired(callState){},
  onCallMissed(callState){},
  onMessageReceived(messageState){},
  getRuntimeState(){
    return {
      lastNotificationType: null,
      lastNotificationAt: null,
      lastNotificationError: null,
      browserNotificationPermission: null,
      visualFallbackUsed: false,
      vibrationAttempted: false,
      vibrationSupported: false
    };
  }
};
```

This runtime coordinates visuals/audio/notifications but does not decide call business state.

---

## Trigger matrix

| Event | Visual | Audio | Notification | Message link | Stop condition |
|---|---|---|---|---|---|
| CALL_PENDING_INCOMING | show incoming CallScreen | incoming ringtone if allowed | incoming call notification if permitted | Message button opens call context | accepted/refused/cancelled/expired/missed |
| CALL_PENDING_OUTGOING | show outgoing CallScreen | optional outgoing tone | optional sent banner | Message button opens call context | accepted/refused/cancelled/expired |
| CALL_ACCEPTED | show accepted / close pending | stop call audio | call accepted notification | call_event accepted | terminal or active session rule |
| CALL_REFUSED | show refused / close | stop call audio | call refused notification | call_event refused | terminal |
| CALL_CANCELLED | close | stop call audio | optional | call_event cancelled | terminal |
| CALL_EXPIRED | show pas de réponse | stop call audio | optional missed/expired | call_event expired | terminal |
| CALL_MISSED | show missed | stop call audio | missed call notification | call_event missed | terminal |
| MESSAGE_RECEIVED | no CallScreen unless call context needs badge | message beep | new message notification | open conversation | no loop |

---

## Stop conditions — mandatory

Any implementation must call `AudioManager.stopCallAudio(reason)` on:

```text
accepted
refused
cancelled
expired
missed
failed
hide
logout
blocked_driver
page_visibility_hidden_if_not_pending
route_change_if_not_pending
```

Ringtone must never continue after terminal state.

---

## User gesture unlock

Audio unlock should be attempted from safe user actions:

```text
first app tap
open drawer
open Messages
tap Appel
tap Accepter
tap Refuser
tap Message
```

Do not show scary permission prompts.

Do not block the user if unlock fails.

Store only minimal local runtime state if necessary.

---

## Message beep rules

Play message beep only when:

```text
message is received
message sender is not current user
conversation is not muted
sender is not blocked
message is not replay/reconstruction
app policy allows sound
```

Never beep for:

```text
outgoing messages
OBD repair
history reload
rebuildMessageThreads
blocked sender
silent/muted context
```

---

## Privacy rules

Before acceptance, UI and notification may show:

```text
plate
pseudo if already allowed
generic caller label
```

Before acceptance, UI and notification must not show:

```text
phone number
real contact details
private profile data
```

---

## OBD integration target

Future `ImmatCallsRuntimeDiagnostics.run()` should include read-only sections:

```js
{
  callRuntime: CallManager.getRuntimeState?.() || null,
  callScreenRuntime: CallScreen.getState?.() || null,
  audioRuntime: AudioManager.getRuntimeState?.() || null,
  notificationRuntime: CallNotificationRuntime.getRuntimeState?.() || null
}
```

Rules:

- do not play audio from diagnostics;
- do not request notification permission from diagnostics;
- do not mutate DOM from diagnostics;
- report missing modules as missing, not failure.

---

## Mobile autotest target cases

Future tests should validate:

```text
incoming call appears even if audio play rejects
incoming ringtone stops on refuse
incoming ringtone stops on accept
outgoing tone stops on cancel
message beep does not fire on outgoing message
message beep does not fire during history reload
call overlay is non-blocking when closed
quick reply creates contextual message
OBD reports audio blocked without failing call reception
```

---

## Service Worker / asset caution

Do not add sound assets casually during red CI.

When assets are added later:

```text
version cache
verify asset paths
verify GitHub Pages serving
verify iOS PWA stale cache
provide fallback if asset fails to load
```

If audio asset is stale/missing:

```text
CallScreen still works
OBD reports lastAudioError
no infinite retry loop
```

---

## Ange integration

Ange can explain audio state:

```text
L'appel est bien reçu mais le son peut être bloqué par le navigateur.
Tu peux répondre visuellement ou envoyer un message.
```

Ange can suggest:

```text
Répondre par message
Rappeler plus tard
Ouvrir Messages
```

Ange must not:

```text
start ringtone
force notification permission
create parallel thread
reveal private contact
```

---

## Implementation plan after CI green

### Phase A — audit only

1. Audit `calls.js` source of truth.
2. Complete `CALL_SOURCE_OF_TRUTH.md`.
3. Confirm current DOM IDs for call UI/audio.
4. Confirm Service Worker asset behavior.

### Phase B — read-only runtime

1. Add `CallManager.getRuntimeState()`.
2. Add `CallScreen.getState()` if CallScreen skeleton exists.
3. Add `AudioManager.getRuntimeState()` skeleton.
4. Add diagnostics only, no playback.

### Phase C — visual first

1. Build CallScreen closed by default.
2. Show incoming/outgoing states from CallManager.
3. Ensure no ghost overlay.
4. Add Message button with `context_type: call_request`.

### Phase D — audio second

1. Add AudioManager.
2. Add unlockFromUserGesture.
3. Add incoming ringtone.
4. Add outgoing tone.
5. Add message beep.
6. Add stop conditions.

### Phase E — autotest

1. Test visual incoming without audio.
2. Test audio blocked path.
3. Test terminal stop paths.
4. Test OBD read-only audio runtime.
5. Test message beep rules.

---

## Do not implement if

Do not implement this skeleton if:

```text
CI is red with unknown first error
calls.js source of truth is not audited
CallScreen closed state is not safe
Service Worker/audio asset path is unknown
privacy behavior before acceptance is unclear
```

Document the blocker instead.
