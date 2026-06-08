# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

> Ce fichier est **le seul point d'entrée** pour toute IA reprenant le projet.
> Aucun fichier de diagnostic, d'audit ou de roadmap ne remplace ce fichier.
> Un nouveau fichier créé pour un diagnostic reste une **annexe** — jamais un point d'entrée.

### Protocole obligatoire pour toute IA

```
AVANT de travailler  → lire ce fichier intégralement
PENDANT le travail   → les diagnostics détaillés sont dans leurs annexes (voir §DOCUMENTS)
AVANT de quitter     → mettre à jour ce fichier (état, preuves, prochain test, prochaine action)
```

### Procédure d'archivage (incident résolu)

```
Conditions : cause racine identifiée + correctif validé + tests passés + merge effectué
Étapes     :
  1. Déplacer les fichiers de diagnostic vers docs/archives/
  2. Supprimer les entrées de §INCIDENTS ACTIFS et §HYPOTHÈSES
  3. Ajouter une ligne dans §ARCHIVES avec : nom, date, cause racine, lien archive
  4. Mettre à jour §ÉTAT DU PROJET et §PROCHAINE ACTION
  5. Commiter SESSION_CONTINUATION.md dans le même commit que le merge
```

**Dernière mise à jour** : 2026-06-08 — SQL Priorité 1 exécuté : 0 lignes → HYP-001 DB affaiblie, HYP-002 dominante

---

## ÉTAT DU PROJET

```
Dépôt          : caisse43700-lgtm/Projet-immat-Connect
Main           : 68f322b — CI GREEN 4/4 (unitaires + E2E + diagnostics + Pages)
Branche active : diagnostic/call-pending-expiry-obd (commit 5f3b30a)
```

---

## INCIDENTS ACTIFS

### INC-001 — Bug appel A → B

**Symptôme ALPHA** (priorité 1) :
Deuxième appel de A vers B refusé avec `"Une demande est déjà en attente de réponse"` — erreur `23505` alors que les deux côtés affichent `expired` dans l'historique.

**Symptôme BETA** (secondaire, après ALPHA) :
B ne voit aucune popup ni sonnerie lors du premier appel.

**Branche** : `diagnostic/call-pending-expiry-obd`

**Annexes de diagnostic** (ne pas modifier directement — passer par ce fichier) :
- `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` — état consolidé : terrain + OBD + hypothèses
- `docs/CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` — analyse statique du code (`calls.js`)
- `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` — revue et analyse externe

---

## HYPOTHÈSES — INC-001

### Confirmées côté client — infirmées côté DB par SQL Priorité 1

| ID | Énoncé | Preuve | Statut |
|---|---|---|---|
| HYP-001 | Aucun chemin client ne fait `UPDATE status='expired'` | Analyse statique `calls.js` — zéro écriture DB à l'expiration | Confirmé côté client / **DB infirmée** : SQL Priorité 1 = 0 lignes pending expirées |
| HYP-003 | Expiration UI ≠ expiration DB (côté logique client) | Corollaire de HYP-001 — analyse statique | Confirmé côté client seulement |

> **Interprétation SQL Priorité 1** : 0 lignes `pending` expirées en DB au moment du test. Deux possibilités : (a) un mécanisme DB nettoie automatiquement les expirés, ou (b) les lignes ont été mises à jour par une autre voie. La contrainte 23505 reste le fait observé — son comportement exact dépend de sa définition.

### Confirmé — SQL Priorité 2 exécuté

| ID | Énoncé | Preuve | Statut |
|---|---|---|---|
| HYP-002-REV | **Aucune contrainte UNIQUE dans `pg_constraint`** | SQL P2 : 5 contraintes — PRIMARY KEY + 2 FK + 2 CHECK — zéro UNIQUE | **CONFIRMÉ** |

> **Implication** : l'erreur `23505` vient d'un **index UNIQUE** (non visible dans `pg_constraint`) ou d'un **trigger** levant `RAISE EXCEPTION ERRCODE='23505'`. Le commentaire `calls.js` ligne 13 : *"garantis par triggers DB (backend)"*.

### Confirmé — SQL Priorité 3 exécuté

| ID | Énoncé | Preuve | Statut |
|---|---|---|---|
| HYP-011 | Trigger BEFORE INSERT existe | SQL P3 : `trg_call_req_on_insert` → `call_request_on_insert()` | **CONFIRMÉ** |

### Confirmé — SQL Priorité 4 exécuté

| ID | Énoncé | Preuve | Statut |
|---|---|---|---|
| **HYP-012** | **`call_request_on_insert()` ne lève PAS de 23505** | SQL P4 : corps complet lu — seuls codes levés : `check_violation` (spam_limit, cooldown_active) | **INFIRMÉ — trigger n'est pas la source du 23505** |
| **HYP-013** | **Index UNIQUE dans `pg_indexes` (non vu car résultat P3 écrasé)** | `SELECT indexname, indexdef FROM pg_indexes WHERE tablename='call_requests'` séparé | **95 % — seule cause restante possible** |

> **Raisonnement** : la fonction `call_request_on_insert()` ne fait que spam (>= 3 en 10 min) et cooldown (refused < 5 min). Elle retourne `new` sans lever 23505. La seule source restante d'un 23505 sur INSERT est un **index UNIQUE** créé avec `CREATE UNIQUE INDEX` — invisible dans `pg_constraint` mais visible dans `pg_indexes`. La requête pg_indexes de SQL P3 a été écrasée par le résultat triggers dans le SQL Editor Supabase.

### Ouvertes

| ID | Énoncé | Preuve manquante | Confiance |
|---|---|---|---|
| **HYP-013** | **Index UNIQUE `(requester_id, receiver_id) WHERE status='pending'`** — bloque si ligne non nettoyée | `SELECT indexname, indexdef FROM pg_indexes WHERE tablename='call_requests'` | **95 %** |
| HYP-003b | `call_request_on_update()` nettoie / expire les pending | Lire corps de `call_request_on_update()` | 65 % |
| HYP-006 | Chaîne `ImmatOrganism → ImmatBus → CallScreen` peut se rompre silencieusement | `ImmatBus.getJournal()` côté B | 40 % |

### Infirmées (conservées avec raison)

| ID | Énoncé | Raison |
|---|---|---|
| HYP-002 | Contrainte UNIQUE dans `pg_constraint` | SQL P2 : zéro UNIQUE constraint |
| HYP-010 | Index UNIQUE hors contrainte (SQL P3) | SQL P3 écrasé — résultat pg_indexes non capturé — non définitivement infirmé |
| HYP-011 | Trigger lève 23505 | SQL P4 : `call_request_on_insert()` ne lève que check_violation |
| HYP-012 | Filtre expires_at manquant dans trigger | SQL P4 : trigger ne vérifie pas les doublons du tout |
| HYP-004 | `receiver_id` incorrect | B voit `"Appel reçu · expired"` + OBD correct |
| HYP-005 | Realtime cassé côté B | OBD `realtimeSubscribed=true` |
| "Même téléphone / compte" | — | Test refait avec deux téléphones, deux comptes |

---

## PREUVES ET TESTS

### Dernières preuves

| Preuve | Source | Effet |
|---|---|---|
| `realtimeSubscribed=true`, `myPlate=BE-521-MM`, `initialized=true` | OBD dashboard côté B | HYP-005 affaiblie |
| `"Appel émis · expired"` + `"Appel reçu · expired"` dans l'historique | Observation UI | HYP-004 affaiblie |
| Deuxième appel → erreur `23505` | Observation UI | Source : index UNIQUE (HYP-013) — trigger ne lève pas 23505 |
| Aucun `UPDATE status='expired'` dans `calls.js` | Analyse statique du code | HYP-001 confirmé côté client |
| SQL P1 : 0 lignes `pending` expirées | Supabase SQL Editor — 2026-06-08 | HYP-001 DB affaiblie |
| SQL P2 : 5 contraintes, zéro UNIQUE | Supabase SQL Editor — 2026-06-08 | HYP-002 infirmée |
| SQL P3 : 2 triggers (`trg_call_req_on_insert`, `trg_call_req_on_update`) | Supabase SQL Editor — 2026-06-08 | Trigger existe — résultat pg_indexes non capturé |
| **SQL P4 : `call_request_on_insert()` = spam + cooldown seulement — zéro 23505** | Supabase SQL Editor — 2026-06-08 | **HYP-011/012 infirmées — HYP-013 seule cause restante** |

### Dernier test réalisé

**SQL Priorité 4** — 2026-06-08 — Corps de `call_request_on_insert()` lu intégralement — ne lève que `check_violation`

### Prochain test — PRIORITÉ ABSOLUE

```sql
-- Supabase SQL Editor — SQL Priorité 5 (séparé — une seule requête)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_requests';
```

**Résultat attendu** : liste complète des index sur `call_requests` — révèle l'index UNIQUE source du 23505  
**Index UNIQUE sans filtre `status`** → HYP-013 confirmée variante A → correctif : ajouter `WHERE status='pending'`  
**Index UNIQUE avec `WHERE status='pending'` sans `expires_at`** → HYP-013 confirmée variante B → correctif : ajouter filtre `expires_at`  
**Aucun index UNIQUE** → chercher dans les Edge Functions ou RLS

---

## PROCHAINE ACTION

**SQL Priorité 5** — une seule requête, séparée (accès utilisateur requis) :

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'call_requests';
```

**Aucune modification de code avant résultat SQL Priorité 5.**

Après résultat :
- Index UNIQUE trouvé → définition exacte révèle variante A ou B → correctif proposé immédiatement
- Aucun index UNIQUE → chercher dans les Edge Functions ou RLS Supabase

---

## DOCUMENTS DE RÉFÉRENCE

| Document | Rôle | Type |
|---|---|---|
| `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` | Diagnostic INC-001 consolidé | Annexe incident actif |
| `docs/CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` | Analyse statique du code — `calls.js` | Annexe incident actif |
| `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` | Revue et analyse externe | Annexe incident actif |
| `docs/ROADMAP-NEXT.md` | Prochaines priorités hors incidents | Référence permanente |
| `docs/CALL_SOURCE_OF_TRUTH.md` | États appel documentés | Référence permanente |
| `docs/INTERACTION_LEDGER_REGISTRY.md` | Forme événements IE | Référence permanente |
| `docs/INTERACTION_ORGANISM_MAP.md` | Qui possède quoi | Référence permanente |

---

## ARCHIVES — Incidents résolus

| Incident | Date | Cause racine | Archive |
|---|---|---|---|
| Phases 0–10 + post-merge | 2026-06-08 | Architecture complète — CI green 4/4 | `docs/archives/ARCHIVE_PHASES_0_10.md` |

---

## INVARIANTS — NE JAMAIS VIOLER

```
ANTHROPIC_API_KEY  → jamais dans le code
owner_plate        → immutable (INV-006)
INV-COM-009        → pas de DELETE sans consentement
INV-COM-010/015    → payload anonymisé, pas de contenu message dans Edge Functions
InteractionEngine  → tous appels dans try/catch, non-bloquants
Corrections        → ciblées uniquement, pas de réécriture globale
CI                 → vérifier green avant chaque merge
SESSION_CONTINUATION.md → toujours mis à jour dans le même commit que le code
```
