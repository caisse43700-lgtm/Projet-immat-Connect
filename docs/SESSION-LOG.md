# SESSION LOG — ImmatConnect Pro

This file records every investigation, correction, blocker and next action so future agents do not repeat work.

---

## 2026-06-08 — CI red post-merge : parse error guillemets typographiques

### CAUSE
Lors de la résolution du conflit de merge sur `index.html`, les lignes 619-621 (fonctions `callsRuntimeHtml`, `runtimeHtml`, `messagesRuntimeHtml`) ont été insérées avec des guillemets typographiques U+2018 `'` et U+2019 `'` utilisés comme délimiteurs de chaîne JS au lieu de l'apostrophe ASCII U+0027 `'`. Ces caractères sont invalides comme délimiteurs en JavaScript — le navigateur lève `"Invalid or unexpected token"` au chargement.

### CORRECTIF
Remplacement ciblé sur les 3 lignes (619, 620, 621) uniquement — Python binary replace `\xe2\x80\x98` → `'` et `\xe2\x80\x99` → `'`. 68 + 346 + 52 occurrences corrigées. Tous les autres scripts inline restent intacts (les `'` dans `"J'arrive"` sont dans des chaînes à double-guillemets = valide).

### RISQUE
Faible. Correction mécanique de caractères invalides vers caractères valides sur les seules lignes touchées par le merge.

### IMPACT DES FAILURES
9 tests échouaient sur 3 devices — tous découlaient du même parse error qui empêchait le script 8 (où `App` est défini) de s'initialiser :
- T05 × 3 devices : `Invalid or unexpected token` pageerror
- T08 × 3 devices : `#sw` reste `auth-screen` (bouton "← Retour" inactif car App non initialisé)
- R01/R02/R03 × Desktop Chrome : `App.subLocs/subscribeCommunityReports/subMsgs` not a function

### STATUT CI
Fix commité, push en cours — CI attendu green.

### PROCHAINE ACTION
Confirmer CI green, puis traiter les tâches résiduelles basse priorité.

---

## 2026-06-08 — OBD Appels / calls runtime diagnostics

### Context

Project: ImmatConnect Pro

Repository: `caisse43700-lgtm/Projet-immat-Connect`

Branch: `feature-calls-runtime-diagnostics`

Goal: add a read-only calls runtime diagnostic before building a full visual call experience.

Added file:

```text
core/calls-runtime-diagnostics.js
```

Exposed API:

```js
window.ImmatCallsRuntimeDiagnostics.run()
```

### Product rule

Messages = relation humaine.

Signaler = création d'un événement.

Activité = suivi d'un événement.

Carte = contexte visuel.

Registry/OBD = mémoire et diagnostic.

### Calls audit

`calls.js` already contains `window.CallManager` and call request functions:

- `requestCall()`
- `acceptCall()`
- `refuseCall()`
- `cancelCallRequest()`
- `subscribeIncomingCalls()`
- `loadCallLog()`

Conclusion: call logic exists, but the user experience does not yet exist.

### CI investigation

Last analyzed commit:

```text
a8cbb1b722b308094bed41527856392ba7d2dd9f
```

Last analyzed run:

```text
27133682666
```

Artifact:

```text
obd-e2e-evidence
```

Log:

```text
diagnostic-artifacts/playwright-output.log
```

### Initial hypothesis

`core/calls-runtime-diagnostics.js` might be too heavy because it scans `body *` and searches visible texts.

### Result

Not confirmed as the first blocker.

### Actual blocker found

```text
SyntaxError: Illegal return statement
```

### Current suspect

`core/guardian-loop.js`

The file contains a top-level return:

```js
'use strict';
if (window.__GuardianLoopV1) return;
window.__GuardianLoopV1 = true;
```

This is illegal in a classic browser script.

### Expected correction

Wrap `core/guardian-loop.js` in an IIFE and keep the rest of the business logic unchanged.

### Risk

Low if the IIFE only wraps existing code.

### Do not repeat

Do not continue blaming `calls-runtime-diagnostics.js` until a new artifact proves timeout/performance issues.

Do not start `CallScreen` while CI is red.

Do not refactor `calls.js` before the source of truth is documented.

### Next action

1. Fix `core/guardian-loop.js` with a minimal IIFE wrapper.
2. Rerun CI.
3. Download new `obd-e2e-evidence` artifact.
4. Read `diagnostic-artifacts/playwright-output.log`.
5. Fix only the first remaining real error.

---

## 2026-06-08 — Correction applied: guardian-loop IIFE

### CAUSE

`core/guardian-loop.js` had a top-level guard:

```js
if (window.__GuardianLoopV1) return;
```

This can trigger:

```text
SyntaxError: Illegal return statement
```

when loaded as a classic browser script.

### CORRECTIF

Wrapped `core/guardian-loop.js` in an outer IIFE.

The business logic and public export remain the same:

```js
window.GuardianLoop = GuardianLoop;
```

Correction commit recorded during session:

```text
4950cb72a78a4f1ba0d9758ba2ff0e5cd8ee55ad
```

### RISQUE

Low.

The correction only moves the duplicate-load guard inside a function scope.

Potential risk to verify by CI:

- accidental syntax issue from wrapper
- GuardianLoop still exported correctly
- no regression in InteractionEngine / GuardianLoop loading order

### STATUT CI

Not verified yet.

Audit attempted to fetch workflow runs for commit `4950cb72a78a4f1ba0d9758ba2ff0e5cd8ee55ad`, but no workflow run was returned by the GitHub connector at audit time.

### AUDIT LOCAL / STATIC

Verified on branch `feature-calls-runtime-diagnostics`:

- `core/guardian-loop.js` starts with `(function(){`
- `if (window.__GuardianLoopV1) return;` is now inside the IIFE
- file ends with `window.GuardianLoop = GuardianLoop;` then `})();`

Search for a similar obvious pattern `if (window.__...) return;` did not return additional results through GitHub search.

### PROCHAINE ACTION

1. Trigger or wait for a GitHub Actions run on the latest branch commit.
2. If red, download new `obd-e2e-evidence`.
3. Read `diagnostic-artifacts/playwright-output.log`.
4. Confirm whether `Illegal return statement` disappeared.
5. Document the first remaining real error here.
6. Fix only that first remaining real error.

---

---

## 2026-06-08 — CI green confirmed + calls.js audit

### CI status

Branch: `feature-calls-runtime-diagnostics`

Runs inspected (from saved GitHub Actions result):

```
27140587060  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
27140587074  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
27140587128  feature-calls-runtime-diagnostics  completed  success  2026-06-08T13:21:58
```

All runs: `completed / success`. CI is green.

### First action per decision matrix (CI green)

Audit `calls.js` and complete `docs/CALL_SOURCE_OF_TRUTH.md`.

### calls.js audit — summary

File: `calls.js` — 397 lines. Module pattern, `window.CallManager` exposed.

Key findings:

1. **CALL_PENDING_OUTGOING**: DB `call_requests.status='pending'` + `_pendingCallId` module var. Recovered on init/visibilitychange via `_recoverPendingRequest()`. UI: `callSentBanner` 8 s auto-dismiss.

2. **CALL_PENDING_INCOMING**: Realtime only. No recovery on reload — receiver must get a new push. Expiry from `expires_at` field.

3. **CALL_ACCEPTED**: Resolves immediately to Messages thread via `App.actOpenConv(requester_plate)`. No `activeCall` state variable exists. Requester notified via realtime UPDATE subscription.

4. **CALL_MISSED**: In-memory `_missedCallIds` Set only. Not persisted. `ImmatOrganism.observe('CALL_MISSED', ...)` fired.

5. **CALL_FAILED**: Toast only. No persistent error state.

6. **CALL_ENDED**: Not implemented — Phase 1 has no real-time audio. Not needed yet.

7. **call_event**: Not written by any function in current calls.js. Messages / Activity integration is not yet wired.

8. **cancelCallRequest caveat**: Receiver popup is NOT explicitly dismissed on cancel — relies on `expires_at` timeout only.

### getRuntimeState() added

Added `CallManager.getRuntimeState()` read-only at lines 378-396 of `calls.js`.

Returns:

```js
{
  initialized, myPlate, pendingCallId, hasPendingOutgoing,
  sentBannerVisible, incomingPopupVisible, contactModalVisible,
  notAllowedModalVisible, realtimeSubscribed, missedCallsCount
}
```

Safe if CallManager is not initialized (try/catch, returns `{initialized:false, error:...}`).

### CALL_SOURCE_OF_TRUTH.md

Status updated from "audit grid" → **audit complete**.

All TODO entries in the source-of-truth table filled.

All audit questions for `requestCall`, `acceptCall`, `refuseCall`, `cancelCallRequest`, `subscribeIncomingCalls`, `loadCallLog` answered with code-line citations.

### What remains

Per `docs/CALL_SOURCE_OF_TRUTH.md` "Next work after CI green":

- [ ] Step 3 (done): `getRuntimeState()` added
- [ ] Step 4: Update `core/calls-runtime-diagnostics.js` to use `getRuntimeState()`
- [ ] Step 5: Integrate calls runtime into `core/mobile-autotest.js`
- [ ] Step 6 (future): `CallScreen` skeleton (closed by default)

### Risk

Low. `getRuntimeState()` is read-only, no DB writes, no localStorage writes, no UI mutation.

### Next action (complété)

CI green sur commit `10c775c` (runs 27141437150/207/649 — 2026-06-08T13:36:00).

Étape suivante : CallScreen squelette → voir section ci-dessous.

---

## 2026-06-08 — CallScreen squelette Phase 1

### Contexte

CI green confirmé sur `10c775c`. `calls.js` audité, `CALL_SOURCE_OF_TRUTH.md` complété.
Condition remplie : squelette `CallScreen` peut démarrer.

### Fichiers créés / modifiés

- `core/call-screen.js` (nouveau) — `window.CallScreen` squelette
- `calls.css` — classes `.cs-btn` pour les boutons CallScreen
- `index.html` — chargement `core/call-screen.js?v=1`
- `core/mobile-autotest.js` — `CallScreen` dans modules info
- `core/calls-runtime-diagnostics.js` — `hasCallScreen` + `callScreenState`

### Architecture CallScreen

```
Source of truth : CallManager (call_requests DB + _pendingCallId)
CallScreen      : observateur ImmatBus uniquement
DOM             : #callOverlay (display:none par défaut)
```

Abonnements ImmatBus :

| Événement bus | Méthode CallScreen |
|---|---|
| CALL_INITIATED | showOutgoing(payload) |
| CALL_RECEIVED  | showIncoming(payload) |
| CALL_ACCEPTED  | showAccepted(payload) |
| CALL_REFUSED   | hide() |
| CALL_CANCELLED | hide() |
| CALL_MISSED    | showMissed(payload) |

### État fermé par défaut

`#callOverlay` reste `display:none` jusqu'au premier événement bus.

Aucun overlay fantôme — `hide()` réinitialise `_state` et cache `callOverlay`.

### Limites connues du squelette (Phase 1)

1. `callIncomingPopup` et `callSentBanner` (CallManager) restent actifs en parallèle — double UI possible. Nettoyage prévu Phase 2 en refactorisant CallManager pour déléguer à CallScreen.
2. `callOverlay` HTML actuel n'a pas de bouton "Fermer en-dehors" — à ajouter si UX le requiert.
3. Auto-hide 30 s pour outgoing : aligné sur `expires_at` DB. Si la DB expire avant, le popup CallManager cache déjà la bannière ; CallScreen se cache seul après 30 s.

### RISQUE

Low. CallScreen est lecture seule. Ne modifie pas CallManager, ne touche pas Supabase, ne modifie pas localStorage.

### STATUT CI

Commit en attente de push — CI UNKNOWN.

### PROCHAINE ACTION (complété)

Phase 2 (CallManager → CallScreen délégation) : commit c810cea — CI green 3x.
Phase 3 (Registry / InteractionLedger audit) : voir section ci-dessous.

---

## 2026-06-08 — Phase 3 : Registry / InteractionLedger audit + câblage calls

### Audit

`InteractionEngine` (core/interaction-engine.js) : existant, 208 lignes.
Seul le flux Ange l'alimentait (index.html:2322).
calls.js, messages.js, roadReport, vehicleAlert, assist → 0 appel à InteractionEngine.

### Câblage calls.js

Ajout de `InteractionEngine.create()` dans :
- `requestCall()` : CALL_REQUEST, status pending
- `acceptCall()` : CALL_ACCEPTED, status resolved
- `refuseCall()` : CALL_REFUSED, status resolved
- `cancelCallRequest()` : CALL_CANCELLED, status cancelled
- `_showIncomingPopup()` timeout (CALL_MISSED) : type CALL_MISSED, status received

Tous les appels sont `try/catch`, non-bloquants, optionnels (InteractionEngine peut être absent).

### Ajout InteractionEngine.getRuntimeState()

Champs : hasLedger, eventCount, notificationCount, unviewedNotifications, byType, lastEventType, lastEventAt.

### Diagnostics

- `calls-runtime-diagnostics.js` : champ `registryRuntime` ajouté
- `mobile-autotest.js` : InteractionEngine + getRuntimeState dans modules info

### Gaps documentés

Manque dans INTERACTION_LEDGER_REGISTRY.md (câblage futur) :
- messages.js → DIRECT_MESSAGE_SENT
- roadReport / vehicleAlert / assist → VEHICLE_REPORT_CREATED / HELP_REQUEST_CREATED
- InteractionEngine event shape : manque source_module, context_type, privacy_level

### RISQUE

Low. Tous les appels InteractionEngine sont optionnels. L'absence d'InteractionEngine ne casse rien.

### STATUT CI

Push en attente.

### PROCHAINE ACTION

1. Push + attendre CI.
2. Si vert : Phase 4 (Messages context model) ou câblage messages.js → InteractionEngine.
3. Si rouge : artifact + playwright-output.log.

---

## 2026-06-08 — Phase 4 : Messages context model

### Contexte

CI green sur Phase 3 (InteractionEngine câblage calls.js).
Phase 4 : câblage messages.js → InteractionEngine + context_type/context_id dans actQuickReply.

### Fichiers modifiés

- `messages.js` — `sendToPlate(plate, text, opts)` : paramètre `opts` ajouté + `InteractionEngine.create()` avec contexte
- `index.html` — `actQuickReply(plate, msg, contextType, contextId)` : signature étendue + passage context aux boutons d'activité

### Détail

#### messages.js — sendToPlate

Signature : `sendToPlate(plate, text, opts)` (opts optionnel, rétrocompatible).

Après envoi réussi, ajout non-bloquant :
```js
window.InteractionEngine?.create?.({
  type: 'MESSAGE',
  initiator: senderPlate,
  target: receiverPlate,
  payload: { to, from, context_type?, context_id? },
  status: 'resolved'
});
```

#### index.html — actQuickReply

Signature : `actQuickReply(plate, msg, contextType, contextId)`.

Passe `context_type` + `context_id` à `sendToPlate` si `contextType` est fourni.

#### index.html — boutons activité

6 boutons actQuickReply mis à jour pour passer le contexte :

| Carte | Bouton | context_type | context_id |
|---|---|---|---|
| own assist (Merci helper) | 🙏 Merci | help_request | a.id |
| vehicle card (autre) | Je m'arrête / Je vérifie / Merci | vehicle_report | a.id |
| assist card (helper potential) | ✋ J'arrive / Je ne peux pas | help_request | a.id |

### RISQUE

Low. `sendToPlate` opts est optionnel — tous les appels sans opts continuent de fonctionner.
`InteractionEngine.create()` est dans try/catch, non-bloquant.

### STATUT CI

Push en attente.

### PROCHAINE ACTION

1. Push + attendre CI.
2. Si vert : câblage `roadReport`/`vehicleAlert`/`assist` → InteractionEngine (VEHICLE_REPORT_CREATED, HELP_REQUEST_CREATED).
3. Si rouge : artifact + playwright-output.log.

---

## 2026-06-08 — Phase 5 : Câblage roadReport / assist / vehicleAlertQuick → InteractionEngine

### Contexte

CI green sur Phase 4 (run 27145171809, commit c27c29d).
Phase 5 : compléter le câblage InteractionEngine pour les événements non-messagerie.

### Fichiers modifiés

- `index.html` — 3 insertions ciblées dans fonctions existantes

### Détail

| Fonction | Ajout |
|---|---|
| `roadReport(type)` | `InteractionEngine.create({type:'VEHICLE_REPORT_CREATED', initiator, context_id:_dbId, payload:{reportType,lat,lng}, status:'active'})` après `ROAD_CREATED` |
| `assist(type)` | `InteractionEngine.create({type:'HELP_REQUEST_CREATED', initiator, context_id:_dbId, payload:{assistType,lat,lng}, status:'active'})` après `HELP_CREATED` |
| `vehicleAlertQuick(label)` | `sendToPlate(plate, msg, {context_type:'vehicle_report'})` — passe le contexte vehicle_report à l'événement MESSAGE déjà enregistré par sendToPlate |

### Gaps restants (non câblés, acceptés pour cette phase)

- `vehicleAlert()` → ouvre Messages avec compose prérempli — l'envoi est déclenché par l'utilisateur via Send, déjà couvert par `sendToPlate` + InteractionEngine.create(MESSAGE)
- `driverInfo()` → envoie à 'CONDUCTEURS' (pseudo-plaque), pas de profil Supabase → sendToPlate échoue silencieusement ; pas de `InteractionEngine.create` nécessaire ici
- `DIRECT_MESSAGE_RECEIVED` → câblage futur via realtime subscription dans messages.js

### RISQUE

Low. Tous les appels InteractionEngine sont dans try/catch, non-bloquants.
`context_id` est `_dbId ?? null` — si `saveReportRemote` échoue ou retourne null, l'événement ledger est quand même enregistré sans ID.

### STATUT CI

Push en attente.

### PROCHAINE ACTION

1. Push + attendre CI.
2. Si vert : audit `DIRECT_MESSAGE_RECEIVED` ou câblage `source_module`/`context_type`/`privacy_level` dans InteractionEngine event shape (gaps identifiés en Phase 3).
3. Si rouge : artifact + playwright-output.log.

---

## 2026-06-08 — Phase 8 : Ange integration

### Contexte

CI green sur Phase 7 (run 27145649337, commit c40adcf).
Phase 8 : enrichir le contexte Ange + routage Activité/Carte + enregistrement suggestion.

### Audit Ange préalable

- `AngeDialog.send()` → Edge Function `immat-brain-dialog` avec snapshot
- `AngeAction.execute()` → route vers Messages / Calls / Signaler / Safety
- Manque : `call_mode`, `audio_blocked` dans snapshot ; `NAVIGATE_ACTIVITY`/`NAVIGATE_MAP` ; log suggestion

### Fichiers modifiés

- `index.html` — 3 changements ciblés dans AngeDialog.send() et AngeAction.execute()

### Détail

#### 1. Snapshot enrichi (AngeDialog.send)

Ajout après le snapshot organism :
```js
try{
  const _cs = window.CallScreen?.getState?.();
  const _ar = window.AudioManager?.getRuntimeState?.();
  snapshot.call_mode = _cs?.mode || 'idle';          // 'idle'|'incoming'|'outgoing'|'missed'|'accepted'
  snapshot.audio_blocked = !!(_ar?.lastAudioBlocked); // true si autoplay bloqué
  snapshot.sounds_enabled = window.S?.sounds !== false;
}catch(e){}
```

L'Edge Function peut maintenant adapter la suggestion Ange selon l'état d'appel et audio.

#### 2. ANGE_SUGGESTION enregistré dans InteractionEngine

Après `renderResponse(data)`, avant sauvegarde historique :
```js
InteractionEngine?.create?.({type:'ANGE_SUGGESTION', initiator, payload:{query, panel, options_count}, status:'resolved'})
```

Permet à OBD de compter les suggestions et à Guardian de citer les échanges Ange comme evidence.

#### 3. NAVIGATE_ACTIVITY + NAVIGATE_MAP dans execute()

2 nouveaux types d'action dans `AngeAction.execute()` :
- `NAVIGATE_ACTIVITY` → `App.navActivite()`
- `NAVIGATE_MAP` → `App.navMap()`

Ange peut maintenant dire "Voir dans Activité" et le bouton route correctement.

### RISQUE

Low. Tous les ajouts sont non-bloquants (try/catch). Les nouveaux types d'action sont inoffensifs si App non initialisé.
Snapshot enrichi est additionnel — ne casse pas le schéma Edge Function.

### STATUT CI

Push en attente.

### PROCHAINE ACTION

1. Push + attendre CI.
2. Si vert : Phase 9 (Guardian integration) ou Phase 10 (Mobile autotest expansion).
3. Si rouge : artifact + playwright-output.log.

---

# Blocker template

When blocked, append a section with:

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

---

# Correction template

After every correction, append:

```text
CAUSE
CORRECTIF
RISQUE
STATUT CI
PROCHAINE ACTION
```
