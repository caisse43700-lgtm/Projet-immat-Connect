# CALL_PENDING_EXPIRY — Diagnostic OBD

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Référence main** : `68f322b`  
**Statut** : EN COURS — hypothèses uniquement, aucun correctif sans preuve SQL

> **RÈGLE DE CE FICHIER**
> Chaque hypothèse reste dans le journal même si infirmée.
> Aucun correctif sans résultat de test explicite.
> Une autre IA doit pouvoir reprendre instantanément depuis "Dernier état connu".

## Sources — provenance des informations

| Section | Source | Fichier de référence |
|---|---|---|
| Preuves terrain (deux téléphones, historique, message 23505) | Observations utilisateur | Ce fichier — section "Preuves terrain" |
| Capture OBD B (BE-521-MM) | Dashboard Gardien — runtime côté B | Ce fichier — section "Capture OBD terrain" |
| HYP-001, HYP-002, HYP-003 (code) | Audit statique `calls.js` — Claude | `CALL_PENDING_EXPIRY_CODE_AUDIT_CLAUDE.md` |
| HYP-001b `_recoverPendingRequest` | Audit statique `calls.js` — Claude | `CALL_PENDING_EXPIRY_CODE_AUDIT_CLAUDE.md` §3 |
| HYP-006 chaîne ImmatOrg→Bus→CallScreen | Audit statique `calls.js` — Claude | `CALL_PENDING_EXPIRY_CODE_AUDIT_CLAUDE.md` §6 |
| HYP-004, HYP-005 (receiver_id, realtime) | Audit externe — ChatGPT | `CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` |
| HYP-007, HYP-008, HYP-009 | Audit externe — ChatGPT | `CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` |
| Matrice BUG A / BUG B | Synthèse — les deux audits | Ce fichier |
| SQL prioritaires | Les deux audits | Ce fichier — section "Tests" |

---

## Deux bugs distincts — ne pas fusionner

```
BUG A — Blocage des nouveaux appels
  Symptôme : "Une demande est déjà en attente de réponse" (erreur 23505)

BUG B — B ne reçoit rien lors du premier appel
  Symptôme : aucune popup, aucune sonnerie côté B
  Mais : historique affiche "Appel reçu · expired"
```

Ils peuvent avoir la même cause. Ils peuvent aussi être deux bugs successifs indépendants.

---

## Chaîne complète d'un appel A → B

```
[A] bouton Appel
  → contactByCall(plate, uid)
  → requestCall(receiverPlate, receiverId)
  → INSERT call_requests (status='pending', expires_at=+30s)
  → [DB] contrainte anti-doublon
  → [Supabase Realtime] INSERT notifié à B
  → subscribeIncomingCalls(uid_B) reçoit l'événement
  → _showIncomingPopup(req)
  → ImmatOrganism.observe('CALL_RECEIVED')
  → ImmatBus.emit('CALL_RECEIVED')
  → CallScreen listener → CallScreen.showIncoming(req)
  → [DOM] popup visible côté B
  → [Audio] sonnerie
```

Chaque `→` est un maillon potentiel de rupture.

---

## Preuves terrain disponibles

| Preuve | Source | Date |
|---|---|---|
| Deux téléphones différents | Test utilisateur | 2026-06-08 |
| Deux comptes différents | Test utilisateur | 2026-06-08 |
| Deux immatriculations différentes | Test utilisateur | 2026-06-08 |
| A voit "Demande envoyée..." + bouton Annuler | Observation UI | 2026-06-08 |
| A voit "Appel émis · expired" dans historique | Observation UI | 2026-06-08 |
| B voit "Appel reçu · expired" dans historique | Observation UI | 2026-06-08 |
| Deuxième appel → "Une demande est déjà en attente" (23505) | Observation UI | 2026-06-08 |
| OBD B (BE-521-MM) : realtimeSubscribed=true, initialized=true | Dashboard Gardien | 2026-06-08 |
| Audit statique calls.js sur main `68f322b` | Code source | 2026-06-08 |

---

## Capture OBD terrain — compte B (BE-521-MM)

```
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

**Ce que cette capture élimine ou affaiblit** :
- CallManager absent : écarté
- CallManager non initialisé côté B : écarté
- subscribeIncomingCalls inexistant : écarté
- Pending local côté B : écarté (`pendingCallId: null`)
- Popup visible mais non remarquée au moment de la capture : écarté (`incomingPopupVisible: false`)

**Ce que cette capture ne prouve pas** :
- Que le channel était SUBSCRIBED au moment exact de l'appel (pas à la capture)
- Que l'événement INSERT a bien été reçu par le channel
- Que `receiver_id` dans la ligne DB correspond à l'uid de B
- Que `CALL_RECEIVED` a transité dans ImmatBus

---

## Hypothèses — BUG A (blocage 23505)

### HYP-001 — Ligne `pending` orpheline en DB

**Statut : FORTEMENT PROBABLE — non confirmée sans SQL**

**Énoncé** : après expiration, aucun code client ne met à jour `status='expired'` en DB. La ligne reste `pending`. La contrainte rejette tout nouvel INSERT.

**Preuves observées** :
- `_showSentBanner()` : `_pendingCallId = null` local uniquement après 31s (ligne 323 calls.js) — zéro écriture DB
- `_onMissed()` : émet ImmatOrganism + IE uniquement — zéro écriture DB (lignes 290–291)
- `_recoverPendingRequest()` : si `expires_at < now()` → **retourne sans toucher la DB** (ligne 56)
- Historique "expired" + deuxième tentative bloquée : cohérent avec ce mécanisme

**Preuve manquante** :
```sql
SELECT COUNT(*) FROM call_requests WHERE status='pending' AND expires_at < NOW();
```
→ Si > 0 : confirmée à 100 %

**Contre-preuve possible** : un cron Supabase ou trigger `BEFORE INSERT` pourrait nettoyer les expirés côté DB — non visible dans le code client.

**Niveau de confiance : 85 %**

**Ce qui la réfuterait** : requête SQL retourne 0 lignes orphelines.

---

### HYP-002 — Contrainte anti-doublon sans filtre `expires_at`

**Statut : PROBABLE — non confirmée sans SQL**

**Énoncé** : la contrainte unique vérifie `status='pending'` sans tenir compte de `expires_at`. Une ligne expirée mais encore `pending` bloque indéfiniment les nouveaux INSERTs.

**Preuves observées** :
- Erreur `23505` au INSERT → unique constraint violation confirmée par le code (ligne 165 calls.js)
- Commentaire ligne 13 : *"Anti-spam + unicité pending garantis par triggers DB (backend)"* — contrainte entièrement côté DB, boîte noire

**Preuve manquante** :
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='call_requests'::regclass;
```

**Contre-preuve possible** : contrainte déjà définie avec `WHERE status='pending' AND expires_at > NOW()`.

**Niveau de confiance : 75 %**

---

### HYP-003 — Expiration UI ≠ expiration DB

**Statut : FORTEMENT PROBABLE — corollaire de HYP-001**

**Énoncé** : l'UI calcule `expires_at < now()` pour afficher "expired". Le champ `status` en DB n'est jamais mis à jour. Les deux sources divergent.

**Preuves observées** : même base que HYP-001.

**Niveau de confiance : 85 %**

---

## Hypothèses — BUG B (B ne reçoit rien)

### HYP-004 — `receiver_id` incorrect

**Statut : PROBABLE INFIRMÉE**

**Énoncé** : la ligne est insérée avec un `receiver_id` qui ne correspond pas à l'uid réel de B → la subscription realtime de B ne matche pas.

**Preuves d'infirmation** :
- B voit "Appel reçu · expired" dans son historique → la ligne avait B comme destinataire
- OBD : `myPlate: BE-521-MM` correct côté B

**Réserve critique** : si l'historique "Appel reçu" est construit depuis `receiver_plate` (pas `receiver_id`) ou depuis InteractionEngine, HYP-004 reste possible malgré l'historique.

**Niveau de confiance d'infirmation : 65 %** — non définitive.

**Ce qui la confirmerait** : SQL Priorité 3 montrant `receiver_id ≠ uid B` dans la ligne.

---

### HYP-005 — Subscription realtime cassée côté B

**Statut : AFFAIBLIE**

**Énoncé** : le channel Supabase côté B n'était pas `SUBSCRIBED` au moment de l'appel.

**Preuve d'affaiblissement** : OBD montre `realtimeSubscribed: true`.

**Réserve** : la capture est statique. Elle prouve l'état au moment de la capture, pas au moment de l'appel. `realtimeSubscribed=true` prouve qu'un channel a été créé — pas que l'événement INSERT a été reçu.

**Niveau de confiance d'infirmation : 70 %** — affaiblie, pas éliminée.

**Test décisif** : `ImmatBus.getJournal()` côté B juste après un appel → chercher `CALL_RECEIVED`.

---

### HYP-006 — Événement reçu mais popup live ratée

**Statut : OUVERTE — non testable tant que BUG A bloque**

**Énoncé** : l'INSERT arrive bien chez B (historique visible), mais la chaîne `ImmatOrganism → ImmatBus → CallScreen.showIncoming` ne déclenche pas la popup en temps réel.

**Preuve code** : `_showIncomingPopup()` émet `ImmatOrganism.observe('CALL_RECEIVED')` et **retourne** si CallScreen est chargé — sans appeler `CallScreen.showIncoming(req)` directement. Si un maillon de la chaîne Bus → CallScreen est absent au moment du fire, B ne voit rien sans erreur visible.

**Niveau de confiance : 40 %** — cohérent avec les symptômes, non testable avant fix BUG A.

---

### HYP-007 — Téléphone B en arrière-plan au moment de l'appel

**Statut : OUVERTE**

**Énoncé** : même avec deux téléphones et realtime actif, si B avait l'écran verrouillé, le navigateur en arrière-plan ou une connexion faible, le popup live peut être raté — mais l'historique apparaît plus tard via requête DB.

**N'explique pas** le blocage 23505 (BUG A).

**Niveau de confiance : 35 %**

**Test** : refaire l'appel avec B écran allumé, app au premier plan, connexion stable.

---

### HYP-008 — `receiver_id` correct en DB mais filtre realtime ne matche pas

**Statut : OUVERTE**

**Énoncé** : l'historique est affiché via `receiver_plate` ou une autre source, mais le filtre realtime `receiver_id=eq.uid` ne correspond pas à l'auth.uid() réel de B.

**Niveau de confiance : 30 %**

**Test décisif** : SQL Priorité 3 → comparer `receiver_id` de la ligne avec l'uid réel du compte B.

---

### HYP-009 — Historique "Appel reçu" alimenté par une source différente de `call_requests`

**Statut : OUVERTE — question non résolue**

**Énoncé** : "Appel reçu · expired" pourrait venir d'InteractionEngine, messages, activities ou d'un cache local — pas directement de `call_requests`. Si c'est le cas, `receiver_id` dans `call_requests` pourrait être mauvais sans que l'historique le révèle.

**Test** : identifier dans le code quelle requête alimente l'historique des appels.

**Niveau de confiance : 25 %**

---

## Matrice de synthèse

| Hypothèse | Explique BUG A (blocage) | Explique BUG B (pas de popup) | Confiance | Statut |
|---|:---:|:---:|---:|---|
| HYP-001 pending expiré en DB | ✅ Oui | ❌ Non | 85 % | Probable — SQL requis |
| HYP-002 anti-doublon sans expires_at | ✅ Oui | ❌ Non | 75 % | Probable — SQL requis |
| HYP-003 UI expired ≠ DB pending | ✅ Oui | Partiel | 85 % | Corollaire HYP-001 |
| HYP-004 receiver_id incorrect | Possible | ✅ Oui | 20 % | Probable infirmée |
| HYP-005 realtime cassé côté B | ❌ Non | ✅ Oui | 30 % | Affaiblie (OBD) |
| HYP-006 popup live ratée | ❌ Non | ✅ Oui | 40 % | Ouverte |
| HYP-007 B en arrière-plan | ❌ Non | ✅ Oui | 35 % | Ouverte |
| HYP-008 filtre realtime ≠ uid | ❌ Non | ✅ Oui | 30 % | Ouverte |
| HYP-009 historique ≠ call_requests | Possible | ✅ Oui | 25 % | Ouverte |

---

## Tests — dans cet ordre strict

### TEST-01 — SQL : lignes pending expirées ← PRIORITÉ ABSOLUE

```sql
SELECT id, requester_plate, receiver_plate, receiver_id,
       status, expires_at, created_at
FROM call_requests
WHERE status = 'pending' AND expires_at < NOW()
ORDER BY expires_at DESC LIMIT 20;
```

**> 0 lignes** → HYP-001 confirmée à 100 %. Passer à TEST-02.  
**0 lignes** → HYP-001 infirmée. Chercher HYP-003 ou cause ailleurs.  
**Ne prouve pas** : définition de la contrainte.

---

### TEST-02 — SQL : définition contrainte anti-doublon

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='call_requests'::regclass AND contype IN ('u','x');

SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers WHERE event_object_table='call_requests';
```

**Contrainte sans `expires_at`** → HYP-002 confirmée.  
**Contrainte avec `expires_at > NOW()`** → HYP-002 infirmée.

---

### TEST-03 — SQL : vue complète paire A↔B

```sql
SELECT id, requester_plate, receiver_plate, requester_id, receiver_id,
       status, expires_at, created_at, responded_at
FROM call_requests
WHERE requester_plate = '[PLAQUE_A]' OR receiver_plate = '[PLAQUE_A]'
ORDER BY created_at DESC LIMIT 10;
```

**Confirme ou infirme** : HYP-004 (receiver_id correct ?), HYP-009 (lignes existent bien ?).

---

### TEST-04 — Console B : ImmatBus.getJournal() pendant un appel live

À faire **après correction BUG A** ou sur un compte sans pending orphelin.

```js
// Avant appel de A :
ImmatBus.getJournal()
// Immédiatement après appel de A :
ImmatBus.getJournal()
```

**`CALL_RECEIVED` absent** → rupture avant Bus (realtime ou _showIncomingPopup).  
**`CALL_RECEIVED` présent + CallScreen idle** → rupture Bus → CallScreen (HYP-006).  
**`CALL_RECEIVED` présent + popup visible** → BUG B résolu, audio seulement.

---

### TEST-05 — Console B : CallManager.getRuntimeState() + ImmatCallsRuntimeDiagnostics.run()

```js
CallManager.getRuntimeState()
ImmatCallsRuntimeDiagnostics.run()
```

Vérifier : `realtimeSubscribed`, `module.hasCallScreen`, `dom.callIncomingPopup`.

---

## Hypothèses infirmées — conservées avec raison

### "Même utilisateur / même téléphone / même onglet Safari"
**Raison** : test refait avec deux téléphones, deux comptes, deux plaques. Éliminé.

### HYP-004 (probable infirmée)
**Raison** : B voit "Appel reçu · expired" + OBD `myPlate` correct. Non définitive.

---

## Checklist obligatoire avant tout correctif

```
□ TEST-01 réalisé → résultat documenté
□ TEST-02 réalisé → définition contrainte documentée
□ HYP-001 ET HYP-002 : statut confirmé ou infirmé
□ Correctif identifié + hypothèse validée documentée
□ Résultat observable attendu après correctif documenté
□ Test de validation post-correctif défini
□ BUG A et BUG B traités séparément
```

**Aucun correctif sans ces 7 cases cochées.**

---

## Ordre d'enquête obligatoire

```
1. TEST-01 SQL (pending expirés)         → confirme/infirme HYP-001
2. TEST-02 SQL (contrainte)              → confirme/infirme HYP-002
3. TEST-03 SQL (paire A↔B)               → confirme/infirme HYP-004/009
4. Correctif BUG A si HYP-001+002 confirmées
5. Nouveau test live A→B (B écran allumé, app premier plan)
6. TEST-04 ImmatBus.getJournal()         → localise rupture BUG B
7. TEST-05 diagnostics                   → confirme/infirme HYP-005/006
8. Audio seulement après popup validée
```

---

## Ce qu'il ne faut pas faire

```
- Ne pas corriger avant TEST-01 et TEST-02
- Ne pas traiter BUG A et BUG B comme un seul bug
- Ne pas conclure "realtime OK" depuis realtimeSubscribed=true seul
- Ne pas commencer par audio / CSS / Service Worker / Guardian / Ange / GPS / Messages
```

---

## Dernier état connu

```
Date             : 2026-06-08
Branche          : diagnostic/call-pending-expiry-obd
Commits          : Claude 4a2c232 + ChatGPT ca5e7bf → fusion en cours

BUG A — Blocage 23505
  Hypothèse active : HYP-001 + HYP-002
  Confiance        : 85 % / 75 %
  Preuve code      : aucun client ne fait UPDATE status=expired
  Preuve terrain   : historique expired + deuxième appel bloqué
  Preuve manquante : SQL Supabase (TEST-01 + TEST-02)

BUG B — B ne reçoit rien
  Hypothèse active : indéterminée — HYP-006 / HYP-007 / HYP-008 ouvertes
  Confiance        : faible — non testable avant fix BUG A
  OBD B            : realtimeSubscribed=true, initialized=true, myPlate correct
  Preuve manquante : ImmatBus.getJournal() côté B après appel propre

Bloquant         : accès Supabase Dashboard (action utilisateur)
Prochaine action : exécuter TEST-01 dans SQL Editor Supabase
                   documenter le résultat ici
                   ne pas corriger avant
```
