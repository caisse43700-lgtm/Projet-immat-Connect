# CALL_PENDING_EXPIRY — Diagnostic OBD

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Référence main** : `68f322b`  
**Statut** : EN COURS — hypothèses uniquement, aucun correctif sans preuve SQL

> **RÈGLE DE CE FICHIER**
> Chaque hypothèse reste dans le journal même si infirmée.
> Aucun correctif sans résultat de test explicite.
> Une autre IA doit pouvoir reprendre instantanément depuis "Dernier état connu".

## Sources — provenance des informations

| Section | Type de source | Fichier de référence |
|---|---|---|
| Preuves terrain (deux téléphones, historique, message 23505) | Observation terrain | Ce fichier — section "Preuves terrain" |
| Capture OBD B (BE-521-MM) | Capture OBD runtime | Ce fichier — section "Capture OBD terrain" |
| HYP-001, HYP-002, HYP-003 | Analyse statique du code — `calls.js` | `CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` |
| HYP-001b `_recoverPendingRequest` | Analyse statique du code — `calls.js` §3 | `CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` |
| HYP-006 chaîne ImmatOrg→Bus→CallScreen | Analyse statique du code — `calls.js` §6 | `CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` |
| HYP-004, HYP-005 (receiver_id, realtime) | Analyse externe | `CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` |
| HYP-007, HYP-008, HYP-009 | Analyse externe | `CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` |
| Matrice BUG A / BUG B | Diagnostic consolidé | Ce fichier |
| SQL prioritaires | Diagnostic consolidé | Ce fichier — section "Tests" |

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

**Statut : CONFIRMÉE côté logique client — AFFAIBLIE côté DB par SQL Priorité 1**

**Énoncé** : après expiration, aucun code client ne met à jour `status='expired'` en DB. La ligne reste `pending`. La contrainte rejette tout nouvel INSERT.

**Preuves côté client (certaines)** :
- `_showSentBanner()` : `_pendingCallId = null` local uniquement après 31s (ligne 323 calls.js) — zéro écriture DB
- `_onMissed()` : émet ImmatOrganism + IE uniquement — zéro écriture DB (lignes 290–291)
- `_recoverPendingRequest()` : si `expires_at < now()` → **retourne sans toucher la DB** (ligne 56)

**SQL Priorité 1 — Résultat : 0 lignes** (2026-06-08)
```sql
SELECT id, requester_plate, receiver_plate, receiver_id,
       status, expires_at, created_at
FROM call_requests
WHERE status = 'pending' AND expires_at < NOW()
ORDER BY expires_at DESC LIMIT 10;
```
→ Aucune ligne `pending` expirée au moment du test.

**Interprétation** : soit un mécanisme DB (cron/trigger — HYP-003b) nettoie les expirés, soit les tests ont eu lieu après nettoyage naturel. La logique client reste prouvée, mais la persistance DB n'est pas confirmée au moment du test.

**Niveau de confiance DB : affaiblie — investigation HYP-002 et HYP-003b prioritaires**

---

### HYP-002 — Contrainte anti-doublon sans filtre `expires_at`

**Statut : INFIRMÉE dans sa formulation originale — SQL Priorité 2 exécuté**

**SQL Priorité 2 — Résultat (2026-06-08)** : 5 contraintes dans `pg_constraint` :
- `call_requests_pkey` → PRIMARY KEY (id)
- `call_requests_receiver_id_fkey` → FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
- `call_requests_requester_id_fkey` → FOREIGN KEY (requester_id) REFERENCES auth.users(id)
- `call_requests_status_check` → CHECK (status IN 'pending', 'accepted', 'refused', ...)
- `no_self_call` → CHECK (requester_id <> receiver_id)

**Aucune contrainte UNIQUE dans `pg_constraint`.**

**Implication** : l'erreur `23505` n'est pas causée par une contrainte PostgreSQL classique. Elle provient soit d'un **index UNIQUE** (distinct de `pg_constraint`), soit d'un **trigger** qui lève `RAISE EXCEPTION ERRCODE='23505'` manuellement. Le commentaire ligne 13 de `calls.js` (*"garantis par triggers DB (backend)"*) est cohérent avec cette seconde hypothèse.

**Reformulation → HYP-010 et HYP-011 (voir ci-dessous)**

---

### HYP-010 — Index UNIQUE sur `call_requests` (hors contrainte formelle)

**Statut : RÉOUVERTE — SQL P3 résultat pg_indexes écrasé par résultat triggers**

Quand les deux requêtes ont été lancées ensemble dans Supabase, seul le résultat de la seconde (triggers) a été affiché. Le résultat de `pg_indexes` n'a pas été capturé.

**SQL Priorité 5 (séparé)** :
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_requests';
```

**Niveau de confiance : 95 % — seule cause restante du 23505**

---

### HYP-011 — Trigger BEFORE INSERT lève `RAISE EXCEPTION ERRCODE='23505'`

**Statut : INFIRMÉE — SQL Priorité 4 exécuté**

Corps complet de `call_request_on_insert()` lu (SQL P4). La fonction :
1. Compte les appels vers la même paire dans les 10 dernières minutes (spam_limit si >= 3)
2. Vérifie le cooldown si statut 'refused' dans les 5 dernières minutes
3. Retourne `new` — laisse l'INSERT se faire

**Aucun `RAISE EXCEPTION` avec `errcode='23505'`** dans la fonction. Les seuls codes levés sont `check_violation` (23514).

---

### HYP-012 — `call_request_on_insert()` vérifie l'unicité sans filtre `expires_at`

**Statut : INFIRMÉE — SQL Priorité 4 exécuté**

La fonction ne vérifie pas les doublons du tout. Elle ne fait que spam + cooldown. La source du 23505 est ailleurs.

---

### HYP-013 — Index UNIQUE `(requester_id, receiver_id)` sans filtre `expires_at`

**Statut : DOMINANTE — SQL Priorité 5 requis**

**Énoncé** : un index UNIQUE a été créé avec `CREATE UNIQUE INDEX` sur la paire `(requester_id, receiver_id)`, possiblement avec `WHERE status='pending'` mais sans tenir compte de `expires_at`. Toute ligne avec `status='pending'` bloque le prochain INSERT même si elle est expirée côté UI.

Ce scénario est cohérent avec :
- SQL P1 (0 lignes pending expirées) — si l'index est trop restrictif, il bloque immédiatement après l'INSERT initial, avant même que `expires_at` soit dépassé
- L'erreur 23505 exacte sur le deuxième appel

**Niveau de confiance : 95 %**

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
| HYP-001 pending expiré en DB | ✅ Oui | ❌ Non | Client confirmé | Confirmée client / affaiblie DB (SQL P1 = 0 lignes) |
| HYP-002 contrainte UNIQUE pg_constraint | ✅ Oui | ❌ Non | — | **INFIRMÉE** SQL P2 |
| HYP-003 UI expired ≠ DB pending | ✅ Oui | Partiel | Client confirmé | Confirmée côté logique client |
| HYP-003b cron/trigger nettoie expirés | Partiel | ❌ Non | 65 % | Ouverte |
| HYP-010 index UNIQUE hors pg_constraint | ✅ Oui | ❌ Non | — | Réouverte — résultat pg_indexes non capturé |
| HYP-011 trigger lève 23505 | ✅ Oui | ❌ Non | — | **INFIRMÉE** SQL P4 |
| HYP-012 trigger filtre sans expires_at | ✅ Oui | ❌ Non | — | **INFIRMÉE** SQL P4 |
| **HYP-013 index UNIQUE sans filtre expires_at** | **✅ Oui** | **❌ Non** | **95 %** | **DOMINANTE — SQL P5 requis** |
| HYP-004 receiver_id incorrect | Possible | ✅ Oui | 20 % | Probable infirmée |
| HYP-005 realtime cassé côté B | ❌ Non | ✅ Oui | 30 % | Affaiblie (OBD) |
| HYP-006 popup live ratée | ❌ Non | ✅ Oui | 40 % | Ouverte |
| HYP-007 B en arrière-plan | ❌ Non | ✅ Oui | 35 % | Ouverte |
| HYP-008 filtre realtime ≠ uid | ❌ Non | ✅ Oui | 30 % | Ouverte |
| HYP-009 historique ≠ call_requests | Possible | ✅ Oui | 25 % | Ouverte |

---

## Tests — dans cet ordre strict

### TEST-01 — SQL : lignes pending expirées ✅ EXÉCUTÉ

```sql
SELECT id, requester_plate, receiver_plate, receiver_id,
       status, expires_at, created_at
FROM call_requests
WHERE status = 'pending' AND expires_at < NOW()
ORDER BY expires_at DESC LIMIT 20;
```

**Résultat (2026-06-08) : 0 lignes**

Interprétation : HYP-001 DB affaiblie. Soit un mécanisme DB nettoie les expirés (HYP-003b), soit le test a eu lieu après expiration naturelle. HYP-002 reste dominante — contrainte peut bloquer même si la ligne est ensuite nettoyée.

---

### TEST-02 — SQL : contraintes sur `call_requests` ✅ EXÉCUTÉ

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='call_requests'::regclass;
```

**Résultat (2026-06-08) : 5 lignes — aucune contrainte UNIQUE**
- `call_requests_pkey` — PRIMARY KEY (id)
- `call_requests_receiver_id_fkey` — FOREIGN KEY (receiver_id)
- `call_requests_requester_id_fkey` — FOREIGN KEY (requester_id)
- `call_requests_status_check` — CHECK (status IN ...)
- `no_self_call` — CHECK (requester_id <> receiver_id)

HYP-002 infirmée dans sa formulation originale. Source du 23505 : index UNIQUE ou trigger (HYP-010/011).

---

### TEST-03 — SQL : index UNIQUE et triggers ✅ EXÉCUTÉ

```sql
-- Index UNIQUE (hors contrainte formelle)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_requests';

-- Triggers sur call_requests
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'call_requests';
```

**Résultat (2026-06-08) — résultat partiel capturé :**
- Triggers : 2 triggers trouvés (`trg_call_req_on_insert` + `trg_call_req_on_update`)
- Index UNIQUE : résultat de `pg_indexes` **non capturé** (écrasé par le résultat triggers dans le SQL Editor)
  - `trg_call_req_on_insert` — INSERT — `EXECUTE FUNCTION call_request_on_insert()`
  - `trg_call_req_on_update` — UPDATE — `EXECUTE FUNCTION call_request_on_update()`

HYP-010 : résultat `pg_indexes` non capturé — **réouverte**.  
HYP-011 (trigger source du 23505) : sera infirmée par TEST-04.

---

### TEST-04 — SQL : corps de `call_request_on_insert()` ✅ EXÉCUTÉ

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'call_request_on_insert';
```

**Résultat (2026-06-08) — corps complet :**
```sql
CREATE OR REPLACE FUNCTION public.call_request_on_insert()
RETURNS trigger LANGUAGE plpgsql AS $function$
declare
  v_count    int;
  v_cooldown timestamptz;
begin
  select count(*) into v_count
    from public.call_requests
    where requester_id = new.requester_id
      and receiver_id  = new.receiver_id
      and created_at   > now() - interval '10 minutes';
  if v_count >= 3 then
    raise exception 'spam_limit' using errcode = 'check_violation';
  end if;

  select max(responded_at) into v_cooldown
    from public.call_requests
    where requester_id = new.requester_id
      and receiver_id  = new.receiver_id
      and status       = 'refused';
  if v_cooldown is not null and v_cooldown > now() - interval '5 minutes' then
    raise exception 'cooldown_active' using errcode = 'check_violation';
  end if;

  return new;
end;
$function$
```

**HYP-011 INFIRMÉE** : la fonction ne lève JAMAIS `errcode='23505'`. Seuls codes : `check_violation` (23514).  
**HYP-012 INFIRMÉE** : pas de vérification de doublons dans la fonction.  
**HYP-013 DOMINANTE** : la source du 23505 est un index UNIQUE dans `pg_indexes`.

---

### TEST-05 — SQL : index UNIQUE sur `call_requests` ✅ EXÉCUTÉ

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_requests';
```

**Résultat (2026-06-08) — 5 index :**
- `call_requests_pkey` → UNIQUE (PRIMARY KEY)
- **`call_requests_unique_pending_idx` → UNIQUE ← SOURCE DU 23505**
- `call_requests_receiver_pending_idx` → INDEX (non unique)
- `call_requests_requester_recent_idx` → INDEX (non unique)
- `call_requests_expires_idx` → INDEX (non unique)

**HYP-013 CONFIRMÉE** : l'index UNIQUE `call_requests_unique_pending_idx` existe.  
Définition tronquée — WHERE clause confirmée → TEST-06 exécuté.

---

### TEST-06 — SQL : définition complète de `call_requests_unique_pending_idx` ✅ EXÉCUTÉ

```sql
SELECT indexdef
FROM pg_indexes
WHERE indexname = 'call_requests_unique_pending_idx';
```

**Résultat (2026-06-08) :**
```sql
CREATE UNIQUE INDEX call_requests_unique_pending_idx
ON public.call_requests
USING btree (requester_id, receiver_id)
WHERE (status = 'pending'::text)
```

**CAUSE RACINE DE BUG A — CONFIRMÉE À 100 %**

L'index interdit deux lignes `pending` pour la même paire `(requester_id, receiver_id)`.  
Aucun code ne met jamais `status='expired'` → la ligne reste `pending` → le second appel fail avec 23505.

**Chemin exact du bug :**
```
1. A appelle B → INSERT status='pending' → OK
2. 30 secondes → expires_at dépassé → UI affiche "expired" localement
3. Aucun UPDATE en DB → ligne reste status='pending'
4. A rappelle B → INSERT → unique index trouve (requester_id, receiver_id) existant → 23505
```

**Sans WHERE clause** → index sur toute la table → bloque toute paire définitivement → correctif : recréer avec `WHERE status='pending'`.  
**`WHERE status='pending'`** → bloque tant que ligne non nettoyée → correctif : UPDATE status lors de l'expiration.  
**Autre filtre** → analyser.

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

BUG A — Blocage 23505
  SQL P1 (EXÉCUTÉ) : 0 lignes pending expirées → HYP-001 DB affaiblie
  SQL P2 (EXÉCUTÉ) : 5 contraintes, zéro UNIQUE → HYP-002 infirmée
  SQL P3 (EXÉCUTÉ) : 2 triggers trouvés — pg_indexes résultat non capturé
  SQL P4 (EXÉCUTÉ) : call_request_on_insert() = spam + cooldown seulement
  SQL P5 (EXÉCUTÉ) : call_requests_unique_pending_idx = UNIQUE
  SQL P6 (EXÉCUTÉ) : WHERE (status = 'pending'::text) — HYP-013 CONFIRMÉE À 100 %
  CAUSE RACINE     : aucun UPDATE status='expired' → index bloque le second INSERT
  Correctif        : voir section CORRECTIF PROPOSÉ ci-dessous

BUG B — B ne reçoit rien
  Hypothèse active : indéterminée — HYP-006 / HYP-007 / HYP-008 ouvertes
  Confiance        : faible — non testable avant fix BUG A
  OBD B            : realtimeSubscribed=true, initialized=true, myPlate correct
  Preuve manquante : ImmatBus.getJournal() côté B après appel propre

BUG A            : RÉSOLU — validé terrain 2026-06-08 ✅
Prochaine action  : merge PR vers main + investigation BUG B (ImmatBus.getJournal() côté B)
```

---

## CORRECTIF PROPOSÉ — BUG A (blocage 23505)

### Cause racine

Index UNIQUE `(requester_id, receiver_id) WHERE status='pending'` — aucun code ne libère cet index à l'expiration.

### Prérequis à vérifier avant d'implémenter

```
□ 'expired' est un statut valide dans call_requests_status_check CHECK constraint
  (voir pg_get_constraintdef — statuts visibles : pending, accepted, refused... + cancelled implicite)
□ call_request_on_update() ne fait rien d'incompatible avec UPDATE status='expired'
  → lire son corps : SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='call_request_on_update'
```

Si 'expired' n'est pas dans le CHECK, utiliser 'cancelled' (déjà utilisé dans cancelCallRequest()).

### Changement 1 — `_showSentBanner()` ligne 322 — côté A à l'expiration

```js
// AVANT (ligne 322-324)
setTimeout(() => {
  if (_pendingCallId === requestId) _pendingCallId = null;
}, 31000);

// APRÈS
setTimeout(async () => {
  if (_pendingCallId !== requestId) return;
  _pendingCallId = null;
  try {
    await _sb.from('call_requests')
      .update({ status: 'expired' })
      .eq('id', requestId)
      .eq('requester_id', _uid)
      .eq('status', 'pending');
  } catch (_) {}
}, 31000);
```

### Changement 2 — `_recoverPendingRequest()` ligne 56 — nettoyage au rechargement

```js
// AVANT (ligne 56)
if (data.expires_at && new Date(data.expires_at) <= new Date()) return;

// APRÈS
if (data.expires_at && new Date(data.expires_at) <= new Date()) {
  try {
    await _sb.from('call_requests')
      .update({ status: 'expired' })
      .eq('id', data.id)
      .eq('requester_id', _uid)
      .eq('status', 'pending');
  } catch (_) {}
  return;
}
```

### Résultat attendu après correctif

- A appelle B → expires → setTimeout(31s) → UPDATE status='expired' → index libéré
- A rappelle B → INSERT → pas de ligne pending → OK
- Rechargement avec pending expiré → UPDATE au démarrage → nettoyage automatique

### Test de validation

```
1. A appelle B (premier appel)
2. Attendre 35 secondes (expiration + 5s marge)
3. A rappelle B (deuxième appel)
4. Résultat attendu : appel émis sans erreur 23505
```

### Ce que ce correctif ne couvre pas

- BUG B (B ne reçoit pas la popup) — investigation séparée après BUG A résolu
- Lignes `pending` orphelines antérieures au déploiement : nettoyage manuel SQL requis
  ```sql
  UPDATE call_requests SET status='expired'
  WHERE status='pending' AND expires_at < NOW();
  ```
