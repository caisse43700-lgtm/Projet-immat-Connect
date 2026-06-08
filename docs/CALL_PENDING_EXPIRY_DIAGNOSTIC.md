# CALL_PENDING_EXPIRY — Diagnostic OBD complet

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Fichier** : `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md`  
**Référence main** : `68f322b`  
**Statut** : EN COURS — diagnostic uniquement, vérification SQL requise avant tout correctif

> Point d'entrée unique pour toute IA reprenant ce diagnostic.
> Objectif : trouver la cause réelle, pas traiter les symptômes.
> Ne pas modifier le code applicatif ni proposer de correctif définitif tant que les résultats SQL prioritaires ne sont pas connus.

---

## 1. Observations terrain

### Observation initiale

Utilisateur A clique sur `Appel`.

Côté A :

```text
Demande de contact envoyée...
Bouton Annuler visible
```

Côté B :

```text
Aucune popup
Aucune sonnerie
Aucun bip
Aucune notification visible
```

### Test environnement

Le test a d'abord été fait sur un même téléphone avec deux onglets Safari, ce qui pouvait fausser realtime/auth/localStorage.

Il a ensuite été refait correctement :

```text
Deux téléphones différents
Deux comptes applicatifs différents
Deux immatriculations différentes
```

Donc l'hypothèse `même session / même uid / onglet Safari endormi` n'est plus la piste principale.

### Nouvelle observation critique

Nouvelle tentative d'appel :

```text
Une demande est déjà en attente de réponse.
```

Mais dans l'historique :

```text
Appel émis · expired
Appel reçu · expired
```

Conclusion provisoire : l'UI/historique considère l'appel expiré, mais la logique métier ou la DB considère encore une demande comme pending.

---

## 2. Élément OBD terrain ajouté par Celine

Capture Dashboard Gardien / Calls Runtime State côté compte B (`BE-521-MM`) :

```text
CallManager.loaded              true
hasGetRuntimeState              true
hasInit                         true
hasSubscribe                    true
runtime.initialized             true
runtime.myPlate                 BE-521-MM
runtime.pendingCallId           null
runtime.hasPendingOutgoing      false
runtime.sentBannerVisible       false
runtime.incomingPopupVisible    false
runtime.contactModalVisible     false
runtime.notAllowedModalVisible  false
runtime.realtimeSubscribed      true
runtime.missedCallsCount        0
```

### Réponses apportées par cette preuve OBD

Ce que cette capture permet d'écarter ou d'affaiblir :

```text
- CallManager absent : écarté.
- CallManager non initialisé côté B : écarté.
- subscribeIncomingCalls inexistant : écarté.
- realtimeSubscribed=false côté B : écarté à l'instant de la capture.
- popup déjà visible mais non remarquée : écarté sur cette capture.
- pending local côté B : absent.
```

Ce que cette capture ne prouve pas encore :

```text
- Elle ne prouve pas qu'un INSERT call_requests récent est arrivé côté B.
- Elle ne prouve pas que receiver_id pointe bien vers l'uid de B.
- Elle ne prouve pas que la table call_requests est propre.
- Elle ne prouve pas que le channel Supabase a reçu l'événement au moment de l'appel.
```

Interprétation :

```text
B est prêt techniquement côté client au moment de la capture.
Si aucune popup ne s'affiche, les deux pistes restantes les plus fortes sont :
1. DB / pending expiré / anti-doublon empêche un nouvel INSERT propre.
2. L'INSERT existe mais n'atteint pas la chaîne receiver_id → realtime → CALL_RECEIVED → CallScreen.
```

Mais à cause du message `Une demande est déjà en attente de réponse`, la priorité reste la DB avant realtime.

---

## 3. Architecture réelle des appels d'après calls.js

Flux officiel :

```text
openContactOptions(plate)
→ contactByCall(plate, uid)
→ requestCall(receiverPlate, receiverId)
→ INSERT call_requests
→ subscribeIncomingCalls(uid)
→ écoute realtime INSERT call_requests
→ filter receiver_id=eq.uid
→ _showIncomingPopup(req)
→ ImmatOrganism.observe('CALL_RECEIVED')
→ ImmatBus.emit('CALL_RECEIVED')
→ listener CallScreen
→ CallScreen.showIncoming
```

Table utilisée :

```text
call_requests
```

Champs insérés côté A :

```text
requester_id
receiver_id
requester_plate
receiver_plate
source = vehicle_contact
```

B reçoit uniquement si :

```text
receiver_id = uid de B
status = pending
expires_at non expiré
```

---

## 4. Réponses aux questions d'audit déjà possibles

### L'appel est-il créé ?

Réponse : très probablement oui.

Preuves :

```text
A voit Demande de contact envoyée
Historique affiche Appel émis · expired
Historique affiche Appel reçu · expired
```

### Le bouton Appel fonctionne-t-il ?

Réponse : oui.

Preuve : le flux sortant démarre et une demande est historisée.

### Le problème vient-il d'un seul compte / même téléphone ?

Réponse : hypothèse affaiblie.

Preuve : test refait sur deux téléphones avec deux comptes et deux immatriculations.

### Le problème vient-il d'AudioManager ?

Réponse : très peu probable comme cause première.

Même sans son, B devrait voir un fallback visuel ou une popup.

### Le problème vient-il de CSS / overlay invisible ?

Réponse : secondaire.

La capture OBD montre `incomingPopupVisible=false`, donc la popup n'est pas simplement visible/cachée dans l'état capturé. Il faut d'abord savoir si l'événement entrant arrive.

### Le problème vient-il de CallManager non initialisé côté B ?

Réponse : non selon la capture OBD.

`initialized=true`, `realtimeSubscribed=true`, `myPlate=BE-521-MM`.

### Le problème vient-il d'un pending local côté B ?

Réponse : non selon la capture OBD.

`pendingCallId=null`, `hasPendingOutgoing=false`.

### Le problème vient-il encore possiblement de receiver_id ?

Réponse : oui, mais après DB.

Si receiver_id ne correspond pas à l'uid de B, B ne recevra jamais l'appel malgré un CallManager prêt.

### Le problème vient-il possiblement de realtime ?

Réponse : oui, mais secondaire tant que HYP-001/HYP-002 ne sont pas vérifiées.

`realtimeSubscribed=true` indique un abonnement actif, mais ne prouve pas la réception d'un événement.

---

## 5. Hypothèses classées

### HYP-001 — Ligne `pending` expirée restée pending en DB

**Probabilité : très haute**  
**État : à confirmer par SQL**

Mécanisme supposé :

```text
requestCall() insère status='pending'
expires_at passe dans le passé
le client affiche expired ou nettoie localement
mais aucun UPDATE status='expired' n'est fait en DB
la ligne reste pending
nouvel appel → contrainte/trigger voit pending → erreur 23505
client affiche Une demande est déjà en attente de réponse
```

Preuves actuellement connues :

```text
- Historique : expired.
- Nouvelle tentative : déjà pending.
- calls.js : _showSentBanner() nullifie _pendingCallId localement après 31s.
- calls.js : _onMissed() émet Bus/IE mais ne met pas la DB à expired.
- calls.js : _recoverPendingRequest() ignore les expirés localement sans update DB.
```

Point crucial : HYP-001 n'est pas définitivement confirmée sans requête SQL.

---

### HYP-002 — Contrainte ou trigger anti-doublon ne filtre pas `expires_at`

**Probabilité : haute**  
**État : à confirmer par SQL**

Si la logique anti-doublon vérifie seulement :

```text
status = pending
```

sans tenir compte de :

```text
expires_at < now()
```

alors un vieux pending expiré peut bloquer indéfiniment les nouveaux appels.

---

### HYP-003 — Expiration UI ≠ expiration DB

**Probabilité : haute**  
**État : à confirmer**

L'UI peut afficher `expired` parce qu'elle calcule que `expires_at` est dépassé, sans que `status` soit réellement passé à `expired` en base.

---

### HYP-004 — receiver_id incorrect ou ancien uid

**Probabilité : moyenne**  
**État : après HYP-001/HYP-002**

Même si une ligne existe, elle peut pointer vers un mauvais `receiver_id` :

```text
plaque trouvée mais uid absent
owner_plate formaté différemment
ancien profil / ancien uid
activité sans uid réel
```

À vérifier dans la vue complète A↔B.

---

### HYP-005 — Rupture realtime / ImmatBus / CallScreen

**Probabilité : secondaire pour le blocage actuel, mais risque réel**  
**État : après DB**

Point de code important : `_showIncomingPopup(req)` émet :

```text
ImmatOrganism.observe('CALL_RECEIVED')
```

puis retourne si `CallScreen.showIncoming` existe. Il n'appelle pas directement :

```text
CallScreen.showIncoming(req)
```

Donc l'affichage entrant dépend entièrement de :

```text
ImmatOrganism → ImmatBus → listener CallScreen → CallScreen.showIncoming
```

Si un maillon est absent au moment du fire, B ne voit rien sans erreur visible.

La capture OBD montre que CallManager est prêt côté B, mais ne prouve pas que `CALL_RECEIVED` arrive dans le bus.

---

## 6. SQL prioritaires — aucune correction avant résultats

### Priorité 1 — confirmer HYP-001

```sql
SELECT id, status, expires_at, created_at
FROM call_requests
WHERE status = 'pending'
  AND expires_at < NOW();
```

Interprétation :

```text
0 ligne  → HYP-001 affaiblie.
>0 ligne → HYP-001 fortement confirmée.
```

Version détaillée :

```sql
SELECT id, requester_plate, receiver_plate, requester_id, receiver_id,
       status, expires_at, created_at, responded_at
FROM call_requests
WHERE status = 'pending'
  AND expires_at < NOW()
ORDER BY expires_at DESC
LIMIT 20;
```

---

### Priorité 2 — confirmer HYP-002

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'call_requests'::regclass;
```

Complément pour triggers :

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'call_requests';
```

Interprétation :

```text
Contrainte/trigger basé seulement sur status='pending' → HYP-002 confirmée.
Contrainte/trigger tenant compte de expires_at → HYP-002 affaiblie.
```

---

### Priorité 3 — vue complète paire A↔B

```sql
SELECT id, requester_plate, receiver_plate, requester_id, receiver_id,
       status, expires_at, created_at, responded_at
FROM call_requests
WHERE (
  (requester_plate = '[PLAQUE_A]' AND receiver_plate = '[PLAQUE_B]')
  OR
  (requester_plate = '[PLAQUE_B]' AND receiver_plate = '[PLAQUE_A]')
)
ORDER BY created_at DESC
LIMIT 20;
```

Si une seule plaque est connue :

```sql
SELECT id, requester_plate, receiver_plate, requester_id, receiver_id,
       status, expires_at, created_at, responded_at
FROM call_requests
WHERE requester_plate = '[PLAQUE_A]'
   OR receiver_plate = '[PLAQUE_A]'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 7. Tests OBD à faire seulement après SQL

Si la DB est saine ou après correction DB future, tester côté B :

```js
CallManager.getRuntimeState()
ImmatCallsRuntimeDiagnostics.run()
ImmatBus.getJournal()
CallScreen.getState()
```

Chercher dans le journal :

```text
CALL_RECEIVED
CALL_MISSED
CALL_ACCEPTED
CALL_REFUSED
```

Interprétation :

```text
CALL_RECEIVED absent      → rupture avant Bus ou realtime.
CALL_RECEIVED présent + CallScreen idle → rupture Bus → CallScreen.
CallScreen incoming + invisible → rupture DOM/CSS.
Popup visible + pas de son → audio seulement.
```

---

## 8. Journal des hypothèses à remplir par Claude

| Hypothèse | Preuve attendue | Confiance actuelle | Résultat | Statut |
|---|---|---:|---|---|
| HYP-001 pending expiré orphelin | `status='pending' AND expires_at < NOW()` | Très haute | À remplir | À confirmer |
| HYP-002 anti-doublon sans expires_at | contrainte/trigger ne filtre que pending | Haute | À remplir | À confirmer |
| HYP-003 expiration UI ≠ DB | UI expired + DB pending | Haute | À remplir | À confirmer |
| HYP-004 mauvais receiver_id | receiver_id ≠ uid B | Moyenne | À remplir | Après DB |
| HYP-005 rupture realtime/Bus/CallScreen | CALL_RECEIVED absent ou non consommé | Secondaire | À remplir | Après DB |

---

## 9. Ordre d'enquête obligatoire

```text
1. SQL priorité 1 : pending expirés.
2. SQL priorité 2 : contraintes / triggers.
3. SQL priorité 3 : lignes A↔B.
4. Classer HYP-001/HYP-002/HYP-003 : confirmée ou infirmée.
5. Ne proposer un correctif qu'après preuve SQL.
6. Si DB saine seulement : receiver_id → realtime → ImmatBus → CallScreen.
7. Audio en dernier.
```

---

## 10. Ce qu'il ne faut pas faire maintenant

```text
- Ne pas commencer par audio / assets audio.
- Ne pas commencer par CSS.
- Ne pas refondre CallScreen.
- Ne pas toucher Service Worker.
- Ne pas toucher Ange / Guardian / Messages / GPS / Map.
- Ne pas appliquer de correctif DB sans preuve SQL.
```

---

## 11. Dernier état connu

```text
Date             : 2026-06-08
Source audit     : ChatGPT + observations terrain Celine + audit statique calls.js
Branche          : diagnostic/call-pending-expiry-obd
Hypothèse active : HYP-001 pending expiré resté pending en DB
                   HYP-002 anti-doublon sans filtre expires_at

Preuves fortes   : historique expired + nouvel appel refusé comme déjà pending
                   CallManager côté B chargé/init/realtimeSubscribed=true
                   _recoverPendingRequest() ignore expirés sans update DB
                   _showSentBanner() nullifie localement seulement
                   _showIncomingPopup() dépend de ImmatOrganism → ImmatBus → CallScreen

À faire          : exécuter SQL Priorité 1, 2, 3
                   remplir le journal des hypothèses
                   confirmer/infirmier avant tout correctif

Consigne         : ne pas soigner le symptôme ; identifier la cause racine.
```
