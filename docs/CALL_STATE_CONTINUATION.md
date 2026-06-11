# Call State Continuation

Date: 2026-06-11
Branch: `merge/calls-fixes-into-main`

Context: voice calls now work. Do not rebuild the voice engine. Continue from the current state and fix call-state inconsistencies only.

## Current field issues

1. A starts a call to B, then A cancels. B keeps ringing or keeps the incoming call UI open.
2. If B accepts after A cancelled, the call can reopen/reactivate on A even though A cancelled.
3. When A calls B, B sees A plate, but A does not clearly see B plate.
4. Hangup must be verified both ways: A hangup closes B immediately, and B hangup closes A immediately.
5. Speaker/earpiece behavior needs a real UX decision: default should be private/earpiece if supported; speaker must be an explicit action, separate from mute.

## Non-negotiable rules

- A cancelled call must never be accepted.
- A terminal call status must close the opposite UI.
- A must always see who they are calling.
- B must always see who is calling.
- Hangup must propagate to both sides.
- Mute controls microphone input only.
- Speaker controls audio output only.
- Do not claim speaker/earpiece control if the browser or SDK cannot actually do it.

## P0: cancellation propagation

Audit `calls.js`.

Expected fix:

- Listen for `UPDATE` on `call_requests` where `receiver_id = current user`.
- If the updated status is `cancelled`, `expired`, `refused`, or `ended`, the receiver side must:
  - close incoming UI;
  - stop ringing/audio;
  - clear missed timers;
  - disable/neutralize Accept;
  - emit the matching local event;
  - never join signaling or voice engine.

Also harden `acceptCall(requestId)`:

- keep the status guard: only pending can become accepted;
- if the update returns no row, close UI and show “Appel annulé ou expiré”;
- do not emit accepted;
- do not join signal or voice engine.

## P1: outgoing plate display

When A starts a call, CallScreen must receive the target plate explicitly.

If `_showSentBanner(plate, requestId)` detects `CallScreen.showOutgoing`, it should call it with:

- `to: plate`
- `plate: plate`
- `receiver_plate: plate`
- `requestId`

`CallScreen.showOutgoing(data)` should read plate from:

- `data.to`
- `data.plate`
- `data.receiver_plate`
- `data.receiverPlate`

Expected result: A immediately sees B plate.

## P1: hangup propagation

Verify current hangup path.

Questions:

- Does hangup only hide local UI?
- Is voice engine leave called?
- Is HANGUP or CALL_ENDED sent before leaving/removing the signal channel?
- Does the remote side receive it and close UI/audio immediately?

Expected result: hangup on either phone closes both phones immediately.

## P2: speaker / earpiece

Desired UX:

- default: private/earpiece route if supported;
- button: Speaker ON/OFF;
- speaker button is separate from mute;
- if route control is not supported, show a clear message such as “Sortie audio contrôlée par le téléphone”.

Diagnostics should expose:

- `speakerSupported`
- `speakerEnabled`
- `audioRouteKnown`
- `audioRoute`
- `lastSpeakerError`
- `muteState`

## Dashboard / OBD checks to add

Add or enrich a “Call State Integrity” check with:

- current request id;
- CallScreen mode, plate, request id;
- pending call id;
- signal request id;
- signal channel present;
- receiver update listener active;
- requester update listener active;
- pending missed timers;
- incoming UI visible;
- outgoing UI visible;
- last cancel received;
- last hangup received;
- last termination reason;
- last CALL events.

Add “Call Identity” check:

- outgoing target plate;
- incoming requester plate;
- displayed plate;
- request id.

Add “Audio Route” check:

- speaker support;
- speaker enabled;
- route known;
- last speaker error;
- mute state.

## Autotests

1. A calls B, then A cancels before B accepts. Expected: B closes immediately and cannot accept.
2. A cancels, then B taps Accept very quickly. Expected: no accept, UI closes, no signal/voice join.
3. A calls B. Expected: A sees B plate, outgoing mode, requestId present.
4. B receives. Expected: B sees A plate, incoming mode, requestId present.
5. A and B are connected, A hangs up. Expected: B closes immediately.
6. A and B are connected, B hangs up. Expected: A closes immediately.
7. During call, speaker button is either functional or clearly reported unsupported; mute remains independent.

## Questions for Claude

- Can a cancelled request remain in seen incoming ids and affect a later call?
- Are missed timers cleared on cancelled/expired/refused?
- Can an old requestId reopen a screen?
- Does recent outgoing keep cancelled requests too long?
- Is HANGUP sent before the signal channel is removed?
- Do both sides always use the same requestId?
- Can double Accept create duplicate transitions?
- Should simultaneous second call return BUSY?
- Are Close and Hangup too ambiguous during a real call?
- Can Dashboard prove each transition?

## Priority

P0: cancellation closes B, late accept impossible, hangup closes both sides.
P1: plates visible both sides, requestId traceable.
P2: speaker/earpiece UX with truthful support.
P3: Dashboard/OBD/Health Lab diagnostics.
