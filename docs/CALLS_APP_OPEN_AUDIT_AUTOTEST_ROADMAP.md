# Audit appels app ouverte — autotest, OBD et roadmap

Branche auditée : `claude/immatconnect-pro-app-dEKGR`

Objectif : donner à Claude une trame complète pour finir la fiabilisation des appels **dans l'application ouverte / au premier plan**, sans mélanger avec le chantier futur des notifications push hors-ligne.

---

## 0. Séparation stricte des périmètres

### Périmètre de cette branche

Cette branche doit garantir :

- appel entrant visible quand l'app est ouverte ;
- CallScreen ou popup entrant fiable ;
- recovery si l'event realtime est manqué ;
- sonnerie iOS si le navigateur l'autorise ;
- arrêt propre du son ;
- correction plaque `BE521MM -> BE-521-MM` ;
- diagnostics OBD suffisants pour comprendre chaque échec.

### Hors périmètre immédiat

Les appels écran verrouillé / app fermée / hors ligne nécessitent un vrai chantier Push :

- handler `push` dans `service-worker.js` ;
- clés VAPID ;
- table `push_subscriptions` ;
- Edge Function `send-push` ;
- abonnement push côté client ;
- politique privacy/RLS ;
- tests iOS/Android séparés.

Ne pas mélanger ce chantier avec la correction de la sonnerie app ouverte.

---

## 1. État terrain connu

| Sujet | État | Commentaire |
|---|---|---|
| Popup entrant | OK terrain | B a vu `Appel manqué` après ajout de `call_requests` à `supabase_realtime`. |
| Realtime | OK probable | Cause racine précédente : table absente de la publication realtime. |
| Recovery entrant | Présent dans `calls.js` | `_recoverIncomingPendingCalls()` + polling + `visibilitychange`. |
| Sonnerie iOS | Non prouvée | Moteur Web Audio présent, branchement CallScreen à vérifier/corriger. |
| Plaque sans tirets | Non prouvé terrain | Correctif présent dans `contactByCall()`, test C1 requis. |
| Push écran verrouillé | Non implémenté | Chantier futur distinct. |

---

## 2. Schéma cible — appel app ouverte

### A appelle B

```text
A clique Appel
  -> CallManager.contactByCall(plate)
  -> résolution receiver_id depuis profiles.owner_plate
  -> CallManager.requestCall(receiverPlate, receiverId)
  -> INSERT call_requests(status=pending)
  -> ImmatOrganism.observe(CALL_INITIATED)
  -> ImmatBus.emit(CALL_INITIATED)
  -> CallScreen.showOutgoing()
  -> AudioManager.playOutgoingTone()
  -> bannière/écran sortant avec Annuler/Raccrocher
```

### B reçoit

```text
Supabase Realtime INSERT call_requests receiver_id=B
  -> CallManager.subscribeIncomingCalls()
  -> _showIncomingPopup(req)
  -> ImmatOrganism.observe(CALL_RECEIVED)
  -> ImmatBus.emit(CALL_RECEIVED)
  -> CallScreen.showIncoming()
  -> AudioManager.playIncomingRingtone()
  -> écran entrant avec Décrocher / Refuser / Message
```

### Si realtime est manqué

```text
init / visibilitychange / polling
  -> _recoverIncomingPendingCalls()
  -> SELECT call_requests WHERE receiver_id=B AND status=pending AND expires_at>now()
  -> _showIncomingPopup(req)
  -> même chaîne CallScreen + sonnerie
```

### Fin d'appel / fermeture UI

```text
Accept / Refuse / Cancel / Expire / Hide
  -> CallScreen.hide()
  -> AudioManager.stopCallAudio(reason)
  -> update DB si nécessaire
  -> historique Messages/Appels
```

---

## 3. Audit technique actuel

### 3.1 Ce qui semble correct

- `calls.js:init()` appelle `subscribeIncomingCalls(uid)`, `_recoverPendingRequest()`, `_recoverIncomingPendingCalls()`, `_startIncomingRecoveryPolling()`.
- `visibilitychange` relance recovery sortante et entrante quand la page redevient visible.
- `_recoverIncomingPendingCalls()` recherche un appel entrant pending non expiré et évite les doublons via `_seenIncomingCallIds`.
- `contactByCall()` tente une recherche plaque avec tirets si la version sans tirets ne matche pas.
- `AudioManager` expose un moteur de sonnerie synthétique Web Audio API sans dépendre de fichiers audio.

### 3.2 Risque critique identifié

`AudioManager` existe, mais le branchement réel doit être vérifié dans `core/call-screen.js` :

- `showIncoming()` doit appeler `AudioManager.playIncomingRingtone()` ;
- `showOutgoing()` doit appeler `AudioManager.playOutgoingTone()` ;
- `hide()` doit appeler `AudioManager.stopCallAudio()`.

Sans ces trois liens, la sonnerie est codée mais pas active au moment utile.

### 3.3 Risque Service Worker

Vérifier que `service-worker.js` cache aussi :

```js
'./core/audio-manager.js',
'./core/call-screen.js',
```

et incrémenter `CACHE_NAME`, sinon iOS peut garder une version incomplète ou ne pas fournir ces fichiers offline.

---

## 4. Questions à poser + réponses attendues

### Q1 — Le son est-il déclenché dans `showIncoming()` ?

Réponse attendue : oui.

Correction si non :

```js
try {
  if (w.AudioManager && typeof w.AudioManager.playIncomingRingtone === 'function') {
    w.AudioManager.playIncomingRingtone({ from: plate, requestId: rid, source: 'CallScreen.showIncoming' });
  }
} catch (e) {}
```

### Q2 — Le son sortant est-il déclenché dans `showOutgoing()` ?

Réponse attendue : oui, mais doux.

Correction si non :

```js
try {
  if (w.AudioManager && typeof w.AudioManager.playOutgoingTone === 'function') {
    w.AudioManager.playOutgoingTone({ to: plate, requestId: rid, source: 'CallScreen.showOutgoing' });
  }
} catch (e) {}
```

### Q3 — Le son s'arrête-t-il toujours ?

Réponse attendue : oui, dans `CallScreen.hide()`.

Correction si non :

```js
try {
  if (w.AudioManager && typeof w.AudioManager.stopCallAudio === 'function') {
    w.AudioManager.stopCallAudio('CallScreen.hide');
  }
} catch (e) {}
```

### Q4 — `AudioManager` est-il chargé avant `CallScreen` ?

Réponse attendue : oui.

Ordre recommandé :

```html
<script src="core/audio-manager.js"></script>
<script src="core/call-screen.js"></script>
<script src="calls.js"></script>
```

Si ce n'est pas possible, tous les appels doivent rester défensifs (`if (w.AudioManager...)`).

### Q5 — Le fallback legacy sonne-t-il si `CallScreen` est absent ?

Réponse souhaitée : oui, uniquement quand `CallScreen` est absent.

Dans `calls.js`, si popup legacy utilisée, appeler `AudioManager.playIncomingRingtone()` après `popup.classList.add('show')`.

### Q6 — Le recovery peut-il provoquer une double sonnerie ?

Risque : oui, si realtime puis polling trouvent le même appel.

Réponse attendue : déduplication par `call_request.id` dans `_seenIncomingCallIds`, avant tout affichage/audio.

### Q7 — Que se passe-t-il si iOS bloque l'audio ?

Réponse : l'appel doit rester visible. `AudioManager.getRuntimeState()` doit exposer :

- `webAudioContextState` ;
- `unlockedByUserGesture` ;
- `lastAudioBlocked` ;
- `lastAudioError` ;
- `currentlyPlaying`.

Si `lastAudioBlocked=true`, ce n'est pas forcément un bug UI : c'est potentiellement une restriction iOS.

### Q8 — Les boutons `Haut-parleur` / `Sourdine` sont-ils trompeurs ?

Oui, car Phase 1 n'est pas VoIP. Proposition :

- masquer ces boutons en Phase 1 ; ou
- les renommer en `Sonnerie` / `Silence` ; ou
- documenter clairement qu'il s'agit d'une demande de contact, pas d'un appel vocal réel.

### Q9 — `showAccepted()` doit-il afficher “En communication” ?

Risque UX : oui, c'est trompeur sans VoIP.

Proposition : remplacer par :

```text
Contact accepté
Ouverture de la conversation...
```

puis ouvrir Messages.

### Q10 — Route doit-elle proposer Appel/Msg ?

Selon le référentiel : non. Route est collective.

Si `App._actModCard()` affiche Appel/Msg pour `route`, noter comme dette UX à corriger après C1/C2.

---

## 5. OBD recommandé

### Console terrain B — avant appel

```js
CallManager.getRuntimeState()
CallScreen.getState()
AudioManager.getRuntimeState()
```

Attendu avant appel :

```text
CallManager.initialized = true
CallManager.uidKnown = true
CallManager.realtimeSubscribed = true
CallScreen.mode = idle
AudioManager.supported = true
AudioManager.soundsEnabled = true
```

### Console terrain B — pendant appel entrant

```js
CallManager.getRuntimeState()
CallScreen.getState()
AudioManager.getRuntimeState()
```

Attendu pendant appel :

```text
CallScreen.mode = incoming
CallScreen.plate = plaque de A
CallManager.callOverlayVisible = true ou incomingPopupVisible = true
AudioManager.currentlyPlaying = incoming
```

Si `currentlyPlaying` reste `null`, vérifier :

1. `showIncoming()` appelle-t-il `playIncomingRingtone()` ?
2. `AudioManager` est-il chargé ?
3. `soundsEnabled` est-il `true` ?
4. `webAudioContextState` est-il `suspended` ?
5. `lastAudioBlocked` est-il `true` ?

### Console terrain A — appel sortant

```js
CallManager.getRuntimeState()
CallScreen.getState()
AudioManager.getRuntimeState()
```

Attendu :

```text
CallScreen.mode = outgoing
CallManager.hasPendingOutgoing = true
AudioManager.currentlyPlaying = outgoing ou null si volontairement silencieux
```

---

## 6. Autotest statique à ajouter/faire tourner

Créer ou utiliser `scripts/audit-calls-app-open.js`.

Ce test ne remplace pas Playwright ni le terrain, mais bloque les oublis structurels :

- `AudioManager` expose les bonnes méthodes ;
- `CallScreen.showIncoming()` déclenche la sonnerie ;
- `CallScreen.showOutgoing()` déclenche le ton sortant ;
- `CallScreen.hide()` arrête l'audio ;
- `calls.js` contient recovery entrant + polling + visibilitychange ;
- `service-worker.js` cache `audio-manager.js` et `call-screen.js`.

Commande :

```bash
node scripts/audit-calls-app-open.js
```

---

## 7. Plan d'élimination des causes

### Cas A — pas de popup

Élimination :

1. `call_requests` est-elle dans `supabase_realtime` ?
2. `CallManager.realtimeSubscribed` ?
3. `CALL_RECEIVED` dans `ImmatBus.getJournal()` ?
4. `_recoverIncomingPendingCalls()` trouve-t-elle une ligne pending ?
5. `CallScreen.mode` passe-t-il à `incoming` ?

### Cas B — popup/CallScreen visible, pas de son

Élimination :

1. `showIncoming()` appelle-t-il `AudioManager.playIncomingRingtone()` ?
2. `AudioManager.supported` ?
3. `soundsEnabled` ?
4. `webAudioContextState` ?
5. `lastAudioBlocked` / `lastAudioError` ?
6. iPhone a-t-il eu un geste utilisateur avant appel ?

### Cas C — son démarre mais ne s'arrête pas

Élimination :

1. `hide()` appelle-t-il `stopCallAudio()` ?
2. `accept/refuse/cancel/expire` passent-ils tous par `hide()` ?
3. `_ringingInterval` est-il clear ?
4. `currentlyPlaying` revient-il à `null` ?

### Cas D — `Conducteur introuvable`

Élimination :

1. plaque passée à `contactByCall()` avec ou sans tirets ?
2. `profiles.owner_plate` en DB contient quelle forme ?
3. fallback `withDashes` exécuté ?
4. receiver_id trouvé ?

---

## 8. Tests terrain obligatoires avant merge

### C1 — Plaque sans tirets

1. BZ-652-LL recharge la page.
2. BZ-652-LL appelle BE-521-MM.
3. Résultat attendu : pas de `Conducteur introuvable`.
4. A doit voir écran/bannière sortante.

### C2 — Sonnerie iOS app ouverte

1. B ouvre l'app sur iPhone/Safari/PWA.
2. B touche au moins une fois l'écran pour débloquer l'audio.
3. A appelle B.
4. Résultat attendu : écran entrant visible + sonnerie audible.
5. Si pas audible, collecter `AudioManager.getRuntimeState()`.

### C3 — Arrêt audio

Tester :

- B accepte ;
- B refuse ;
- A annule ;
- expiration.

Résultat attendu : aucune sonnerie persistante.

### C4 — Recovery

1. B ouvre app.
2. A appelle.
3. Si event live manqué, polling/recovery doit afficher appel ou appel manqué.

---

## 9. Roadmap courte

### P0 — Correction structurelle avant terrain

- Brancher `AudioManager` dans `CallScreen.showIncoming()`.
- Brancher `AudioManager` dans `CallScreen.showOutgoing()`.
- Arrêter l'audio dans `CallScreen.hide()`.
- Ajouter `audio-manager.js` et `call-screen.js` au SW cache si absents.
- Incrémenter `CACHE_NAME`.
- Lancer `node scripts/audit-calls-app-open.js`.

### P1 — Terrain

- C1 plaque.
- C2 sonnerie iOS.
- C3 arrêt audio.

### P2 — UX Phase 1

- Clarifier “appel” vs “demande de contact”.
- Éviter “En communication” si pas de VoIP.
- Revoir haut-parleur/sourdine.

### P3 — Dettes fonctionnelles

- Route ne doit pas proposer Appel/Msg.
- Appels dans Messages sous forme d'événements lisibles.
- Quick replies liées à l'appel.

### P4 — Futur chantier Push

- Notifications push app fermée/écran verrouillé.
- VAPID.
- Table `push_subscriptions`.
- Edge Function `send-push`.
- Handler `push` dans SW.

---

## 10. Critères d'acceptation

Avant merge :

- l'autotest statique passe ;
- CI existante green ;
- C1 testé terrain ;
- C2 testé terrain ou documenté avec OBD si iOS bloque ;
- aucun son ne persiste après accept/refuse/cancel/hide ;
- `SESSION-CONTINUATION.md` indique clairement ce qui est prouvé et ce qui reste hors scope.

Conclusion :
la branche est proche, mais ne doit pas être considérée complète tant que `AudioManager` n'est pas explicitement branché à `CallScreen` et que C1/C2 n'ont pas été validés terrain.
