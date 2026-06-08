# CALL_PENDING_EXPIRY — Diagnostic OBD

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Créé** : 2026-06-08  
**Référence main** : `68f322b`  
**Statut** : EN COURS — hypothèse principale identifiée, vérification DB requise

> Ce fichier est le point d'entrée unique pour toute IA reprenant ce diagnostic.  
> Mettre à jour la section **"Dernier état connu"** après chaque action significative.

---

## Observations utilisateur

1. **Appel créé** : A appelle B → l'interface affiche l'appel comme envoyé.
2. **Expiration** : L'appel expire sans réponse → l'historique affiche `expired`.
3. **Nouvelle tentative refusée** : A tente un nouvel appel vers B → l'interface affiche "Une demande est déjà en attente de réponse."
4. **Blocage persistant** : Le blocage persiste au-delà du timeout visible côté client (30–31s).

---

## Architecture des appels — rappel rapide

```
calls.js (CallManager)
  _pendingCallId          : variable locale JS, null si aucun appel en cours
  requestCall()           : INSERT dans call_requests (status='pending')
  acceptCall()            : UPDATE status='accepted'
  refuseCall()            : UPDATE status='refused'
  cancelCallRequest()     : UPDATE status='cancelled'
  _onMissed()             : émet ImmatBus + InteractionEngine — PAS de UPDATE DB
  _showSentBanner()       : setTimeout 31s → _pendingCallId = null côté client uniquement

DB : table call_requests
  status : 'pending' | 'accepted' | 'refused' | 'cancelled' | [éventuellement 'expired']
  expires_at : timestamp (≈ +30s après création)
  Contrainte anti-doublon : trigger ou unique constraint côté Supabase (backend)
```

---

## Hypothèses

### HYP-001 — Ligne `pending` orpheline en DB (hypothèse principale)

**Probabilité : HAUTE**

**Mécanisme supposé** :

1. `requestCall()` insère une ligne `call_requests` avec `status='pending'`.
2. L'appel expire côté client : `setTimeout(31s)` → `_pendingCallId = null` (ligne 323 de `calls.js`).
3. **Aucune mise à jour DB** : ni `requestCall()`, ni `_onMissed()`, ni `_showSentBanner()` n'écrivent `UPDATE call_requests SET status='expired'`.
4. La ligne reste en base avec `status='pending'` et `expires_at` dans le passé.
5. Nouvelle tentative → le trigger/contrainte unique DB détecte la ligne `pending` existante → rejette avec `error.code === '23505'` → client affiche "Une demande est déjà en attente de réponse."

**Evidence dans le code** :

```js
// calls.js ligne 165 — le client intercepte le 23505 mais ne l'explique pas
if (error.code === '23505') {
  _showError('Une demande est déjà en attente de réponse.');
}

// calls.js lignes 321-324 — expiration côté client = null local SEULEMENT
setTimeout(() => {
  if (_pendingCallId === requestId) _pendingCallId = null;
}, 31000);  // ← aucun UPDATE DB ici

// calls.js ligne 13 — la contrainte est entièrement côté DB (boîte noire)
// "Anti-spam + unicité pending garantis par triggers DB (backend)"
```

**Clé du problème** : La contrainte DB ne filtre probablement pas sur `expires_at`. Elle voit une ligne avec `status='pending'` et bloque le nouvel INSERT, même si cette ligne est expirée depuis longtemps.

---

### HYP-002 — Contrainte unique sans filtre `expires_at`

**Probabilité : HAUTE** (corollaire de HYP-001)

Si la contrainte unique est définie comme :

```sql
UNIQUE (requester_id, receiver_id) WHERE status = 'pending'
-- ou
UNIQUE (requester_plate, receiver_plate) WHERE status = 'pending'
```

… alors une ligne `status='pending'` avec `expires_at` dans le passé bloque indéfiniment tout nouvel INSERT pour cette paire, car `status` n'a jamais été mis à jour en `'expired'` ou `'cancelled'`.

---

### HYP-003 — Cron/trigger d'expiration DB absent ou défaillant

**Probabilité : MOYENNE**

Un cron Supabase ou un trigger `BEFORE INSERT` aurait pu être prévu pour nettoyer les lignes expirées. Si ce cron n'existe pas ou a échoué, les lignes `pending` s'accumulent.

**À vérifier** : Supabase Dashboard → Database → Cron jobs.

---

### HYP-004 — Realtime subscription manque la transition `expired`

**Probabilité : BASSE** (symptôme, pas cause)

Le realtime subscriber côté client écoute les changements sur `call_requests`. S'il reçoit une update `status='expired'` (si un cron existe), il pourrait nettoyer `_pendingCallId`. Mais si ce signal n'arrive jamais (parce qu'il n'y a pas de cron), le client est cohérent avec lui-même — c'est la DB qui accumule.

---

## Résultats OBD / Commandes exécutées

### Audit statique de `calls.js`

**Date** : 2026-06-08  
**Méthode** : lecture directe du fichier source (commits main `68f322b`)

| Fonction | Mise à jour DB status | Remarque |
|---|---|---|
| `requestCall()` | INSERT `pending` | ✓ |
| `acceptCall()` | UPDATE → `accepted` | ✓ |
| `refuseCall()` | UPDATE → `refused` | ✓ |
| `cancelCallRequest()` | UPDATE → `cancelled` | ✓ |
| `_onMissed()` | **AUCUNE** | ⚠ émet IE + Bus uniquement |
| `_showSentBanner()` setTimeout | **AUCUNE** | ⚠ null local uniquement |

**Conclusion** : aucun chemin client ne met `status='expired'` en DB. Si le backend ne le fait pas non plus, les lignes restent `pending` indéfiniment.

---

### Vérifications DB non encore effectuées

Ces vérifications nécessitent un accès au Dashboard Supabase ou à l'interface SQL. Elles ne peuvent pas être faites depuis le code.

| Vérification | Requête SQL suggérée | Résultat |
|---|---|---|
| Lignes pending expirées | `SELECT id, requester_plate, receiver_plate, status, expires_at FROM call_requests WHERE status='pending' AND expires_at < NOW() ORDER BY expires_at DESC LIMIT 20;` | **À FAIRE** |
| Définition de la contrainte | `SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='call_requests'::regclass;` | **À FAIRE** |
| Cron jobs actifs | Dashboard Supabase → Database → Cron | **À FAIRE** |
| Triggers sur call_requests | `SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table='call_requests';` | **À FAIRE** |

---

## Conclusions provisoires

1. **Le client ne nettoie pas la DB** : l'expiration côté client (31s timeout) est uniquement locale. Aucun code client ne met à jour `status` en DB lors de l'expiration.

2. **La contrainte DB bloque sur `status='pending'`** : le code client intercepte un `23505`, ce qui confirme qu'une contrainte unique est violée au INSERT.

3. **Hypothèse la plus probable** : la contrainte unique vérifie `status='pending'` mais pas `expires_at`. Les lignes expirées restent `pending` et bloquent les nouvelles demandes.

4. **Correction probable** : soit un cron Supabase qui passe les lignes expirées en `status='expired'`, soit un `BEFORE INSERT` trigger qui supprime/met à jour les conflits expirés avant l'unicité check.

---

## Prochaines étapes

### Étape 1 — Vérifier les lignes orphelines (Supabase SQL Editor)

```sql
-- Compter les pending expirés
SELECT COUNT(*) AS pending_expires
FROM call_requests
WHERE status = 'pending'
  AND expires_at < NOW();

-- Voir les 10 plus récents
SELECT id, requester_plate, receiver_plate, status, expires_at, created_at
FROM call_requests
WHERE status = 'pending'
  AND expires_at < NOW()
ORDER BY expires_at DESC
LIMIT 10;
```

**Si > 0 lignes** → HYP-001 confirmée.

---

### Étape 2 — Vérifier la définition exacte de la contrainte

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'call_requests'::regclass
  AND contype IN ('u', 'x');  -- unique + exclusion
```

**Si la contrainte ne filtre pas `expires_at`** → HYP-002 confirmée.

---

### Étape 3 — Corriger côté DB (selon résultats)

**Option A** — Modifier la contrainte unique pour ignorer les expirés :

```sql
-- Remplacer la contrainte existante par :
CREATE UNIQUE INDEX call_requests_pending_unique
ON call_requests (requester_id, receiver_id)
WHERE status = 'pending' AND expires_at > NOW();
```

**Option B** — Ajouter un cron Supabase (pg_cron) :

```sql
SELECT cron.schedule(
  'expire-pending-calls',
  '* * * * *',  -- chaque minute
  $$UPDATE call_requests SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW()$$
);
```

**Option C** — Ajouter un `BEFORE INSERT` trigger qui nettoie les expirés :

```sql
CREATE OR REPLACE FUNCTION clean_expired_before_call_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE call_requests
  SET status = 'expired'
  WHERE requester_id = NEW.requester_id
    AND receiver_id = NEW.receiver_id
    AND status = 'pending'
    AND expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clean_expired_calls
BEFORE INSERT ON call_requests
FOR EACH ROW EXECUTE FUNCTION clean_expired_before_call_insert();
```

**Recommandation** : Option B (cron) est la plus robuste et ne modifie pas la contrainte. Option A est la plus propre si la contrainte peut être redéfinie. Option C est un palliatif sans modifier le schéma.

---

### Étape 4 — Vérifier côté client après fix DB

Une fois le fix DB appliqué :
1. Créer un appel → laisser expirer
2. Vérifier en SQL que `status='expired'` (pas `pending`)
3. Créer un nouvel appel → doit passer sans `23505`
4. Vérifier dans l'OBD (`ImmatCallsRuntimeDiagnostics.run()`) que le flow est correct

---

## Invariants à respecter lors du correctif

```
INV-COM-009 : pas de DELETE sans consentement explicite
              → préférer UPDATE status='expired' à DELETE
INV-COM-010/015 : payload anonymisé dans les Edge Functions
                  → ne pas logger les plaques en clair dans les crons
Production : ne pas modifier DB en production sans validation
             → tester d'abord sur branche / environnement de dev
```

---

## Dernier état connu

```
Date             : 2026-06-08
Commit           : branche diagnostic/call-pending-expiry-obd créée depuis main 68f322b
Hypothèse active : HYP-001 — ligne pending orpheline en DB (jamais mise à jour à expired)
                   + HYP-002 — contrainte unique sans filtre expires_at

Evidence         : audit statique calls.js — aucun chemin client ne fait UPDATE status=expired
                   error.code 23505 confirmé dans le code client

Vérifications    : étapes 1 et 2 NON ENCORE FAITES (nécessitent accès Supabase Dashboard)

Prochaine action : exécuter les requêtes SQL de l'Étape 1 dans le SQL Editor Supabase
                   pour confirmer l'existence de lignes pending expirées

Bloquant         : accès Supabase Dashboard (hors périmètre IA — action utilisateur requise)
```
