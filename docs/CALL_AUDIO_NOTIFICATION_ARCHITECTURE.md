# CALL AUDIO & NOTIFICATION ARCHITECTURE

This document defines how call reception, ringtone, message beep, visual fallback and notifications should work in ImmatConnect Pro.

It complements:

- `docs/CALL_SOURCE_OF_TRUTH.md`
- `docs/INTERACTION_ORGANISM_MAP.md`
- `docs/OBD-RECOVERY-PROTOCOL.md`

---

## Core rule

A call must be received visually even if audio is blocked.

```text
Visual call state is mandatory.
Audio is enhancement only.
```

This is critical because mobile browsers, especially iOS Safari, may block autoplay audio unless the user has interacted with the page.

---

## Product distinction

ImmatConnect has at least three notification sound families:

```text
Message beep
Call ringtone
System/OBD alert tone
```

They must not all sound the same.

Recommended intent:

- Message beep: short, discreet, non-looping.
- Call ringtone: longer, repeated/loopable while pending.
- System/OBD alert: rare, diagnostic/admin only, not user social sound.

---

## Call reception model

Incoming call flow:

```text
Supabase realtime receives pending call request
        ↓
CallManager updates business state
        ↓
CallScreen shows incoming state
        ↓
Visual fallback activates
        ↓
Audio ringtone attempts to play if allowed
        ↓
Messages may record or display call_event history
        ↓
OBD observes read-only call runtime
```

If audio fails:

```text
CallScreen must still be visible.
Notification badge / vibration / visual pulse may be used.
```

Never make audio success a requirement for call delivery.

---

## Outgoing call model

Outgoing call flow:

```text
User taps Appel
        ↓
CallManager.requestCall()
        ↓
Business state becomes outgoing pending
        ↓
CallScreen shows outgoing screen
        ↓
Optional outgoing tone starts if allowed
        ↓
Messages can show call_event outgoing pending
        ↓
Receiver realtime may show incoming screen
```

Outgoing tone is not the same as incoming ringtone.

Recommended:

- outgoing tone: soft waiting tone, optional;
- incoming ringtone: stronger attention sound;
- message beep: very short.

---

## Required sound channels

Recommended future assets / IDs:

```text
callAudioIncoming
callAudioOutgoing
messageAudioBeep
systemAudioAlert
```

Existing referenced element:

```text
callAudio
```

Do not assume the current `callAudio` is enough for the final architecture.

Future migration can keep `callAudio` as compatibility alias, but diagnostics should distinguish sound intent.

---

## Audio permission state

Future read-only state to expose through diagnostics:

```js
{
  audio: {
    supported: true,
    unlockedByUserGesture: false,
    incomingRingtoneReady: false,
    outgoingToneReady: false,
    messageBeepReady: false,
    lastAudioError: null,
    lastAudioBlocked: false
  }
}
```

Rules:

- read-only diagnostics must not force playback;
- diagnostics may report readiness;
- user gesture can unlock audio;
- if blocked, visual fallback remains mandatory.

---

## iOS Safari constraints

Assume:

- autoplay can be blocked;
- background PWA behavior can be limited;
- Service Worker may keep older assets;
- audio may require user gesture;
- vibration may be unavailable or restricted.

Therefore:

```text
No incoming call UX may depend only on sound.
```

Fallback hierarchy:

1. visible CallScreen
2. badge / visual pulse
3. browser/PWA notification if permission exists
4. vibration if supported
5. ringtone if unlocked

---

## Notifications

Notifications should be useful and limited.

Allowed user notifications:

- new message
- incoming call request
- call accepted
- call refused
- someone is coming for help
- problem resolved

Call notification title examples:

```text
Appel entrant
BZ-652-LL souhaite vous contacter
```

Message notification title examples:

```text
Nouveau message
BZ-652-LL vous a écrit
```

Do not reveal private contact data before acceptance.

---

## Message beep model

Message beep should trigger only for a new received message that is relevant to the user.

Do not beep for:

- messages sent by current user;
- historical replay;
- OBD repair/reconstruction;
- hidden/muted conversations;
- blocked drivers.

Future diagnostics should report:

```js
{
  messageAudio: {
    beepReady: false,
    muted: false,
    lastBeepAt: null,
    lastBeepError: null
  }
}
```

---

## Call ringtone model

Incoming ringtone should start when:

- business state is `CALL_PENDING_INCOMING`;
- current user is the receiver;
- caller is not blocked;
- call is not expired;
- app state allows ringing;
- audio has been unlocked or browser allows playback.

Ringtone must stop when:

- accepted;
- refused;
- cancelled;
- expired;
- missed;
- user taps Message instead;
- CallScreen hides;
- route changes away only if call is no longer pending.

Never leave audio looping after terminal state.

---

## Visual fallback model

Visual fallback must show:

Incoming:

```text
Appel entrant
<plate/pseudo>
[Accepter] [Refuser] [Message]
```

Outgoing:

```text
Appel vers <plate/pseudo>
En attente...
[Raccrocher] [Message]
```

Missed/expired:

```text
Appel manqué / Pas de réponse
[Réessayer] [Message]
```

Closed state:

```text
display:none
pointer-events:none or non-blocking container
```

No ghost overlay may block clicks.

---

## Links with Messages

Message quick replies during a call become real Messages:

- Je te rappelle plus tard
- Je ne peux pas répondre
- Écris-moi
- Rappelle-moi quand tu peux

They must be contextualized:

```js
{
  context_type: 'call_request',
  context_id: '<call_request_id>'
}
```

Messages remains the relationship center.

CallScreen is only the call interaction surface.

---

## Links with Ange

Ange may suggest:

- “Réponds par message”
- “Ouvre Messages pour cette demande d’appel”
- “L’audio semble bloqué, l’appel reste visible”
- “Tu peux rappeler plus tard”

Ange must not:

- start audio playback automatically;
- bypass CallManager;
- reveal contact details;
- create a parallel thread.

---

## Links with Guardian

Guardian may use call history for trust/safety recommendations.

Examples:

- repeated missed calls;
- repeated refused calls;
- abusive call attempts;
- blocked caller attempting contact.

Guardian must rely on Registry/InteractionEngine evidence, not UI state.

---

## Links with OBD

OBD calls runtime should eventually report:

```js
{
  callRuntime: {
    hasCallManager: true,
    pendingIncoming: 0,
    pendingOutgoing: 0,
    activeCall: null,
    lastCallStatus: null,
    lastCallError: null
  },
  audioRuntime: {
    incomingRingtoneReady: false,
    outgoingToneReady: false,
    messageBeepReady: false,
    lastAudioError: null,
    lastAudioBlocked: false
  },
  uiRuntime: {
    callScreenVisible: false,
    callOverlayBlocking: false,
    incomingPopupVisible: false,
    sentBannerVisible: false
  }
}
```

Read-only only.

Do not play sounds from OBD diagnostics.

---

## Links with Service Worker

Audio asset changes may be affected by Service Worker cache.

If adding sound assets later:

- version cache explicitly;
- document asset paths;
- verify iOS PWA update behavior;
- avoid uncontrolled reload loops;
- provide visual fallback if stale audio is cached.

Do not change Service Worker during current red CI unless logs prove it is the active failure.

---

## Acceptance criteria for future call audio work

A future implementation is acceptable only if:

- incoming call is visible without audio;
- message beep and call ringtone are distinct;
- ringtone stops on all terminal states;
- no real contact info appears before acceptance;
- CallScreen closes without ghost overlay;
- audio failures are captured in diagnostics;
- iOS autoplay block does not break call reception;
- quick replies go to Messages with `context_type: call_request`;
- OBD remains read-only.

---

## Do not implement before

Do not implement this audio architecture before:

1. CI is green;
2. `calls.js` source of truth is audited;
3. `CallManager.getRuntimeState()` is implemented read-only;
4. CallScreen skeleton exists and is closed safely by default.
