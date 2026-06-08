# CALL_PENDING_EXPIRY — Diagnostic OBD

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Référence main** : `68f322b`  
**Créé** : 2026-06-08  
**Méthode** : diagnostic par élimination — hypothèses uniquement, pas de correctif sans preuve

> **RÈGLE DE CE FICHIER**
> - Chaque hypothèse reste dans le journal même si infirmée.
> - Aucun correctif sans résultat de test explicite.
> - Chaque étape se termine par : "La rupture est probablement entre X et Y" avec niveau de confiance.
> - Une autre IA doit pouvoir reprendre instantanément depuis la section "Dernier état connu".

---

## Symptômes observés

Deux symptômes distincts. Ne pas les fusionner.

### Symptôme ALPHA — Blocage des nouveaux appels

> A tente un deuxième appel vers B → message : **"Une demande est déjà en attente de réponse"**

Cause : erreur `23505` (unique constraint violation) renvoyée par Supabase au INSERT.

### Symptôme BETA — Réception manquante côté B (premier appel)

> B ne voit aucune popup, aucune sonnerie, aucune notification lors du premier appel.
> Mais B voit dans son historique : **"Appel reçu · expired"**

Cause inconnue — peut être un ou plusieurs maillons de la chaîne de réception.

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
| B voit dans l'historique "Appel reçu · expired" | Observation UI | 2026-06-08 |
| A voit dans l'historique "Appel émis · expired" | Observation UI | 2026-06-08 |
| Deuxième appel de A → "Une demande est déjà en attente" | Observation UI | 2026-06-08 |
| Audit statique calls.js sur main `68f322b` | Code source | 2026-06-08 |

---

## Hypothèses — Symptôme ALPHA (blocage 23505)

### HYP-001 — Ligne `pending` orpheline en DB

**Énoncé** : Après expiration, le client ne met pas à jour `status='expired'` en DB. La ligne reste `pending`. La contrainte rejette tout nouvel INSERT.

**Preuve observée** :
- Aucun code dans `calls.js` ne fait `UPDATE call_requests SET status='expired'`
- `_showSentBanner()` : setTimeout(31s) → `_pendingCallId = null` LOCAL seulement (ligne 323)
- `_onMissed()` : émet ImmatOrganism + IE uniquement — zéro écriture DB (lignes 290-291)
- `_recoverPendingRequest()` : si `expires_at < now()` → **retourne sans toucher la DB** (ligne 56)

**Preuve manquante** :
- Résultat SQL : `SELECT COUNT(*) FROM call_requests WHERE status='pending' AND expires_at < NOW()`
- Confirmation qu'aucun cron Supabase ne fait ce UPDATE

**Niveau de confiance** : **TRÈS ÉLEVÉ** (85 %)  
Code source prouve l'absence de mise à jour côté client. Seule inconnue : existence d'un cron/trigger DB.

**Ce qui pourrait la réfuter** :
- SQL renvoie 0 lignes `pending` expirées → HYP-001 infirmée
- Existence d'un trigger `BEFORE INSERT` ou d'un cron qui nettoie les expirés

---

### HYP-002 — Contrainte anti-doublon sans filtre `expires_at`

**Énoncé** : La contrainte unique sur `call_requests` vérifie `status='pending'` sans vérifier `expires_at`. Une ligne expirée mais `pending` bloque indéfiniment les nouveaux INSERTs.

**Preuve observée** :
- Erreur `23505` interceptée dans `requestCall()` ligne 165 → unique constraint violation confirmée
- Commentaire ligne 13 : *"Anti-spam + unicité pending garantis par triggers DB (backend)"* → contrainte entièrement côté DB
- Aucun filtre `expires_at` visible dans le code client au moment de l'INSERT

**Preuve manquante** :
- Définition exacte de la contrainte : `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='call_requests'::regclass`
- Sans cela : on ne sait pas si la contrainte filtre déjà sur `expires_at` ou non

**Niveau de confiance** : **ÉLEVÉ** (75 %)  
L'erreur 23505 est certaine. La définition exacte du filtre est inconnue.

**Ce qui pourrait la réfuter** :
- Contrainte définie avec `WHERE status='pending' AND expires_at > NOW()` → HYP-002 infirmée, chercher HYP-003

---

### HYP-003 — Cron ou trigger DB d'expiration absent ou défaillant

**Énoncé** : Un mécanisme backend (pg_cron, trigger) aurait dû mettre à jour `status='expired'` automatiquement. S'il est absent ou en échec, les lignes s'accumulent.

**Preuve observée** :
- Aucune preuve dans le code client d'un tel mécanisme
- Symptôme cohérent avec une absence de nettoyage automatique

**Preuve manquante** :
- Supabase Dashboard → Database → Cron Jobs : liste des crons actifs
- `SELECT * FROM cron.job` si pg_cron est activé
- Triggers : `SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table='call_requests'`

**Niveau de confiance** : **MOYEN** (55 %)  
Probable, mais non vérifiable sans accès Dashboard.

**Ce qui pourrait la réfuter** :
- Cron actif trouvé et fonctionnel + aucune ligne `pending` expirée en DB → HYP-003 infirmée

---

## Hypothèses — Symptôme BETA (B ne reçoit rien)

### HYP-004 — `receiver_id` incorrect au moment de l'INSERT

**Énoncé** : A insère la ligne avec un `receiver_id` qui ne correspond pas à l'UID réel de B. La subscription realtime de B ne reçoit rien car le filtre `receiver_id=eq.uid_B` ne matche pas.

**Preuve observée** :
- B voit "Appel reçu · expired" dans son historique → **la ligne existe avec le bon receiver** (soit `receiver_id` correct, soit l'historique lit par `receiver_plate`)
- Deux comptes différents, deux plaques différentes → élimine "même utilisateur"

**Preuve manquante** :
- Comment l'historique est construit : lit-il par `receiver_id` ou par `receiver_plate` ?
- Valeur réelle de `receiver_id` dans la ligne insérée vs UID de B

**Niveau de confiance** : **FAIBLE** (20 %)  
Largement affaiblie par "Appel reçu · expired" dans l'historique de B.

**Ce qui pourrait la confirmer** :
- Historique B construit par `receiver_plate` (pas `receiver_id`) → HYP-004 reste possible malgré l'historique
- `CallManager.getRuntimeState()` côté B : `myPlate` ne correspond pas à la plaque attendue

**Statut** : **PROBABLE INFIRMÉE** — non définitivement, en attente de vérification de la requête historique

---

### HYP-005 — Subscription realtime côté B cassée

**Énoncé** : `subscribeIncomingCalls(uid)` s'est abonnée mais le channel Supabase n'est pas `SUBSCRIBED` (CHANNEL_ERROR, TIMED_OUT, ou uid null).

**Preuve observée** :
- B voit "Appel reçu · expired" dans l'historique → si l'historique est construit depuis un SELECT DB, cela ne prouve pas que la subscription realtime a fonctionné
- `subscribeIncomingCalls` a un handler CHANNEL_ERROR qui retente après 5s (ligne 274-277), mais aucune preuve qu'il a réussi

**Preuve manquante** :
- `CallManager.getRuntimeState()` côté B → champ `realtimeSubscribed`
- `ImmatCallsRuntimeDiagnostics.run()` côté B → `runtimeState.realtimeSubscribed`
- `ImmatBus.getJournal()` côté B → CALL_RECEIVED présent ou absent

**Niveau de confiance** : **MOYEN** (45 %)  
Non éliminée. Secondaire à ALPHA mais reste à tester.

**Ce qui pourrait la réfuter** :
- `ImmatBus.getJournal()` côté B contient `CALL_RECEIVED` → la subscription a fonctionné, rupture ailleurs

---

### HYP-006 — Rupture ImmatOrganism → ImmatBus → CallScreen

**Énoncé** : Le realtime reçoit l'INSERT, `_showIncomingPopup` est appelé, `ImmatOrganism.observe('CALL_RECEIVED')` est émis — mais la chaîne vers `CallScreen.showIncoming` est cassée.

**Preuve observée** :
- Code confirmé : `_showIncomingPopup` N'APPELLE PAS `CallScreen.showIncoming(req)` directement (ligne 295-298)
- Il émet `ImmatOrganism.observe('CALL_RECEIVED')` et **retourne**
- `CallScreen` doit écouter ImmatBus pour `CALL_RECEIVED` — si ce listener est absent ou non initialisé, rien ne s'affiche

**Preuve manquante** :
- `ImmatBus.getJournal()` côté B : CALL_RECEIVED présent → Bus a reçu
- `CallScreen.getState()` côté B : `mode` attendu = `'incoming'` si CallScreen a reçu

**Niveau de confiance** : **MOYEN** (40 %)  
Architecture identifiée comme risquée. Non prouvée comme cause racine.

**Ce qui pourrait la réfuter** :
- `ImmatBus.getJournal()` contient CALL_RECEIVED ET `CallScreen.getState().mode === 'incoming'` → rupture est en aval (DOM/audio)

---

### HYP-007 — CallScreen non chargé ou listener absent

**Énoncé** : `window.CallScreen` est undefined ou `CallScreen.showIncoming` n'est pas une fonction au moment du fire. `_showIncomingPopup` détecte l'absence et tombe dans le fallback popup legacy — qui lui-même échoue.

**Preuve observée** :
- Code ligne 295 : `if (window.CallScreen && typeof window.CallScreen.showIncoming === 'function')`
- Si false → fallback popup legacy (lignes 301-312)
- Le fallback legacy peut aussi échouer si `callIncomingPopup` n'est pas dans le DOM

**Preuve manquante** :
- `ImmatCallsRuntimeDiagnostics.run()` côté B → `module.hasCallScreen`
- `typeof window.CallScreen?.showIncoming` côté B

**Niveau de confiance** : **FAIBLE** (25 %)  
Possible mais non prioritaire.

---

### HYP-008 — Popup visible mais cachée (CSS/DOM)

**Énoncé** : `CallScreen.showIncoming()` est appelé, le DOM est mis à jour, mais la popup n'est pas visible (z-index, display:none non retiré, overlay caché).

**Preuve observée** :
- Aucune — non testée

**Preuve manquante** :
- Inspection DOM côté B après un appel entrant
- `ImmatCallsRuntimeDiagnostics.run()` → `dom.callOverlay`, `visible.timelineCallTexts`

**Niveau de confiance** : **TRÈS FAIBLE** (15 %)  
Peu probable si le symptôme ALPHA est la cause principale. À investiguer en dernier.

---

### HYP-009 — Audio bloqué (non prioritaire)

**Énoncé** : La popup s'affiche mais aucun son ne se déclenche (AudioContext non déverrouillé, src vide, policy autoplay).

**Preuve observée** :
- `AudioManager` est câblé mais les `src` audio sont intentionnellement vides (bloqué par décision SW/cache)
- Non prioritaire : le symptôme rapporté est "B ne voit rien" — l'audio est secondaire

**Niveau de confiance** : **N/A** — audio volontairement non implémenté, à traiter séparément

**Statut** : **HORS PÉRIMÈTRE** pour ce diagnostic

---

## Tests à réaliser — dans cet ordre

### TEST-01 — Vérifier lignes pending expirées (SQL)

**Objectif** : confirmer ou infirmer HYP-001  
**Qui** : utilisateur (Supabase SQL Editor)

```sql
SELECT id, requester_plate, receiver_plate, status, expires_at, created_at
FROM call_requests
WHERE status = 'pending' AND expires_at < NOW()
ORDER BY expires_at DESC
LIMIT 20;
```

**Si résultat > 0 lignes** → HYP-001 confirmée. Passer à TEST-02.  
**Si résultat = 0 lignes** → HYP-001 infirmée. Chercher HYP-003 (cron défaillant ?) ou cause différente.  
**Ce que ce test ne prouve pas** : il ne prouve pas la définition exacte de la contrainte (TEST-02).

---

### TEST-02 — Définition de la contrainte anti-doublon (SQL)

**Objectif** : confirmer ou infirmer HYP-002  
**Qui** : utilisateur (Supabase SQL Editor)

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'call_requests'::regclass
  AND contype IN ('u', 'x');
```

**Si la contrainte ne contient pas `expires_at`** → HYP-002 confirmée.  
**Si la contrainte filtre déjà `expires_at > NOW()`** → HYP-002 infirmée, chercher HYP-003.  
**Ce que ce test ne prouve pas** : il ne prouve pas l'absence de cron.

---

### TEST-03 — Vue complète de la paire A↔B (SQL)

**Objectif** : comprendre l'historique exact des appels entre A et B  
**Qui** : utilisateur (Supabase SQL Editor)

```sql
SELECT id, requester_plate, receiver_plate, status, expires_at, created_at, responded_at, requester_id, receiver_id
FROM call_requests
WHERE requester_plate = '[PLAQUE_A]'
   OR receiver_plate = '[PLAQUE_A]'
ORDER BY created_at DESC
LIMIT 10;
```

**Ce que ce test prouve** : état exact des lignes, `receiver_id` réel inscrit.  
**Ce que ce test ne prouve pas** : si la subscription realtime de B a fonctionné.

---

### TEST-04 — getRuntimeState() côté B (console navigateur)

**Objectif** : vérifier l'état de CallManager côté B  
**Qui** : utilisateur (DevTools côté B)

```js
CallManager.getRuntimeState()
```

Vérifier :
- `initialized` : true ?
- `realtimeSubscribed` : true ?
- `hasPendingOutgoing` : false ?
- `myPlate` : correspond à la plaque de B ?

**Si `realtimeSubscribed: false`** → HYP-005 confirmée.  
**Si `myPlate` incorrect** → HYP-004 reste possible.

---

### TEST-05 — ImmatCallsRuntimeDiagnostics.run() côté B (console navigateur)

**Objectif** : audit OBD complet côté B  
**Qui** : utilisateur (DevTools côté B)

```js
ImmatCallsRuntimeDiagnostics.run()
```

Vérifier :
- `module.hasCallScreen`
- `runtimeState.realtimeSubscribed`
- `dom.callIncomingPopup`

---

### TEST-06 — ImmatBus.getJournal() côté B après un appel (console navigateur)

**Objectif** : savoir si CALL_RECEIVED a transité par le Bus  
**Qui** : utilisateur (DevTools côté B, immédiatement après un appel de A)

```js
ImmatBus.getJournal()
```

Chercher : `CALL_RECEIVED`, `CALL_INITIATED`, `CALL_MISSED`

**Si CALL_RECEIVED absent** → rupture avant le Bus (realtime ou _showIncomingPopup).  
**Si CALL_RECEIVED présent** → Bus OK, rupture entre Bus et CallScreen (HYP-006/007/008).  
**Ce que ce test ne prouve pas** : il ne prouve pas que CallScreen a réagi.

---

## Journal des tests réalisés

| Test | Date | Résultat | Élimine | Ne prouve pas |
|---|---|---|---|---|
| Audit statique calls.js | 2026-06-08 | Aucun UPDATE status=expired côté client | — | Existence d'un cron DB |
| Test deux téléphones | 2026-06-08 | B voit "Appel reçu · expired" dans historique | HYP-004 probable. infirmée (receiver_id a priori correct) | Que realtime a fonctionné |
| TEST-01 à TEST-06 | — | **À FAIRE** | — | — |

---

## Hypothèses infirmées (conservées avec raison)

### HYP-004 — receiver_id incorrect (probable infirmée)

**Raison** : B voit "Appel reçu · expired" dans son historique. Si la ligne n'avait pas le bon `receiver_id`, B ne verrait probablement pas ce libellé.  
**Réserve** : si l'historique est construit par `receiver_plate` et non `receiver_id`, HYP-004 reste possible. Vérifier avec TEST-03.

### "Même utilisateur / même téléphone"

**Raison** : test refait avec deux téléphones, deux comptes, deux plaques différentes. Éliminé définitivement.

---

## Conclusion provisoire par symptôme

### Symptôme ALPHA — Blocage 23505

**Conclusion provisoire** :  
> "La rupture est probablement entre l'expiration côté client et la mise à jour du statut en DB."

La ligne reste `pending` en base après expiration côté UI. La contrainte anti-doublon bloque tout nouvel INSERT.  
**Niveau de confiance : ÉLEVÉ (80 %)** — en attente de TEST-01 et TEST-02 pour confirmer.

### Symptôme BETA — B ne reçoit rien

**Conclusion provisoire** :  
> "La rupture est indéterminée — elle se situe quelque part entre la subscription realtime et l'affichage popup."

**Niveau de confiance : FAIBLE** — TEST-04, TEST-05, TEST-06 requis avant toute conclusion.

---

## Avant tout correctif — checklist obligatoire

```
□ TEST-01 réalisé → résultat documenté ici
□ TEST-02 réalisé → définition contrainte documentée ici
□ HYP-001 et HYP-002 : confirmées ou infirmées
□ Correctif identifié + hypothèse qu'il valide documentée
□ Résultat observable attendu après correctif documenté
□ Test de validation post-correctif défini
```

**Aucun correctif sans ces 6 cases cochées.**

---

## Dernier état connu

```
Date             : 2026-06-08
Branche          : diagnostic/call-pending-expiry-obd
Commit           : 060d075 (document initial) → mise à jour en cours
Référence main   : 68f322b

Symptôme ALPHA   : Blocage 23505 — "Une demande est déjà en attente"
Hypothèse active : HYP-001 (pending orphelin) + HYP-002 (contrainte sans expires_at)
Confiance        : ÉLEVÉE (80 %) — non confirmée faute de résultat SQL

Symptôme BETA    : B ne reçoit rien (popup/sonnerie)
Hypothèse active : indéterminée — TEST-04/05/06 requis
Confiance        : FAIBLE

Tests réalisés   : audit statique calls.js uniquement
Tests en attente : TEST-01 (SQL pending expirés) — PRIORITÉ 1
                   TEST-02 (SQL contrainte) — PRIORITÉ 2
                   TEST-03 (SQL paire A↔B) — PRIORITÉ 3
                   TEST-04/05/06 (console B) — PRIORITÉ 4

Bloquant         : accès Supabase Dashboard — action utilisateur requise
Prochaine action : exécuter TEST-01 dans le SQL Editor Supabase
                   puis documenter le résultat dans ce fichier
```
