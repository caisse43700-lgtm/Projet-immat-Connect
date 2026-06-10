# ImmatConnect Pro — Professional Stabilization Roadmap

Date: 2026-06-10
Scope: production GitHub Pages (`main`) + real iPhone/Safari field tests.

## 1. Product clarification

Current product implemented in production is **not yet a real voice call**.

It is currently:

```text
contact request / call-like handshake
→ caller sends request
→ receiver gets incoming UI and ringtone
→ receiver accepts/refuses
→ both sides reach accepted state
→ user may open message conversation explicitly
```

Future desired product may be:

```text
real voice call
→ microphone permission
→ WebRTC peer connection
→ remote audio
→ mute / speaker / hang up
→ in-call state
```

Do not mix these two scopes. Stabilize the contact-request system first, then open a separate WebRTC phase.

## 2. Field findings from iPhone tests

Observed and fixed or under investigation:

1. Public GitHub Pages serves `main`, not the Claude feature branch. Several earlier fixes were invisible on phones because they were not on `main`.
2. `calls.js` on `main` still auto-opened the message conversation on accepted calls. Fixed in `de35c060`.
3. `core/call-screen.js` on `main` still displayed `Contact accepté — conversation ouverte` and auto-closed after 2s. Fixed in `a7f6d5f7`.
4. After repeated tests, phones can hit `Une demande est déjà en attente de réponse` while runtime says `pendingCallId = null`. This indicates a DB-level stale `pending` row, not a local runtime pending. Mitigation added in `f9088541`: expire my pending calls for the same receiver before creating a new one and retry once on 23505.
5. Guardian/OBD screenshots showed `realtimeStatus = SUBSCRIBED`, `uidKnown = true`, `myPlate = BZ-652-LL`, `pendingCallId = null`, `callScreenMode = idle`, proving runtime and DB can diverge.
6. Messages data exists (`conversationRowsCount = 1`, `threadBubblesCount = 201`), but conversation opening can appear blocked depending on UI state. This requires a separate Messages UI test.

## 3. Critical questions to ask before every new fix

### Environment

- Which branch is being tested by the phone?
- Has GitHub Pages republished the latest `main` commit?
- Is Safari/PWA still serving cached JS?
- Are query params only cache-busting HTML, or are script `?v=` values also updated?

### Runtime

- Is `CallManager.getRuntimeState().initialized === true`?
- Is `uidKnown === true`?
- Is `realtimeStatus === 'SUBSCRIBED'`?
- Is `pendingCallId` null while DB still has a pending row?

### DB lifecycle

Every `call_requests` row must leave `pending` via exactly one path:

```text
pending → accepted
pending → refused
pending → cancelled
pending → expired
```

No old `pending` should block a later test.

### UI truthfulness

- If there is no WebRTC audio, never say or imply “conversation ouverte” as a voice call.
- After accepted contact request, show `Contact accepté` + explicit `Message` / `Fermer` actions.
- Opening the message thread must require user action unless product scope explicitly changes.

## 4. Stabilization phases

### Phase S0 — Stop environment confusion

- Treat `main` as production source for phone tests.
- Keep `AGENTS.md` on `main` pointing to current branch/context.
- After any production-relevant fix, either merge via PR or apply patch directly to `main` intentionally.
- Update `SESSION-CONTINUATION.md` and this roadmap when behavior changes.

### Phase S1 — Contact request lifecycle

Acceptance criteria:

- A can call B.
- B receives incoming overlay.
- B accepts.
- A and B both see accepted state.
- No automatic thread opening.
- Repeating the call after accept/refuse/timeout does not show stale pending error.

Needed tests:

1. First call after fresh reload.
2. Repeat call after accepted.
3. Repeat call after refused.
4. Repeat call after timeout.
5. Repeat call after reload on A only.
6. Repeat call after reload on B only.
7. Repeat call after both phones background/foreground.

### Phase S2 — Messages UI reliability

Acceptance criteria:

- From Messages list, tapping plate opens thread.
- From call accepted screen, tapping Message opens thread.
- Closing Guardian Dashboard restores pointer/click state.
- No overlay blocks `icThread`, `icMsgList`, or send button.

Needed OBD checks:

- `icMessagesPro.exists === true`
- `icMsgList.display`
- `icThread.display`
- `conversationRowsCount`
- `threadBubblesCount`
- `UI blockers visible`

### Phase S3 — Cache and deployment

Acceptance criteria:

- `service-worker.js` CACHE_NAME bumped after production JS changes.
- `index.html` script query params bumped after production JS changes.
- Phone link includes a test marker, but real script versions also change.
- Guardian/OBD exposes loaded versions for `calls.js`, `call-screen.js`, `messages.js`, `service-worker`.

### Phase S4 — Real voice call decision

Only after S1-S3 are stable, decide whether to implement WebRTC.

If yes, create a new WebRTC plan with:

- `call_sessions` or extended `call_requests` signaling table.
- offer / answer / ICE candidate exchange via Supabase.
- microphone permission UX.
- local and remote audio elements.
- mute / speaker / hangup controls.
- iOS Safari autoplay and audio unlock strategy.
- fallback when peer connection fails.

## 5. Immediate next diagnostic checklist

On both phones after latest `main` propagation:

1. Open production URL with cache marker:

```text
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?stabilize=f9088541
```

2. Reload once.
3. Open Guardian Dashboard.
4. Verify:

```text
CallManager.loaded = true
initialized = true
uidKnown = true
myPlate is correct
realtimeStatus = SUBSCRIBED
pendingCallId = null before new call
callScreenMode = idle before new call
```

5. Test call A → B.
6. After accepted, verify:

```text
Both phones receive accepted state
No automatic message thread opening
No “conversation ouverte” wording
```

7. Try calling again.
8. If stale pending error appears, record:

```text
which phone
myPlate
pendingCallId
recentOutgoingCount
lastCallEvents
visible toast text
```

## 6. Known risks

- Direct patching on `main` can diverge from feature branch.
- Safari cache can make a fixed source appear broken.
- `call_requests` DB index will continue to block if any pending row remains.
- UI overlays can block message clicks even when data exists.
- Current UI suggests phone-call semantics while product is still contact-request semantics.

## 7. Definition of done for contact-request phase

The phase is done only when the following pass on two real phones:

```text
fresh reload
A calls B
B accepts
A sees Contact accepté
B sees Contact accepté
Message thread does not open automatically
Message button opens thread manually
Fermer closes accepted overlay
Repeat call works without pending error
Refuse path works
Timeout path works
Messages list still opens thread by plate
Guardian Dashboard shows no blocking overlay
```

Only then consider WebRTC voice-call phase.
