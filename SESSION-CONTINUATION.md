# SESSION CONTINUATION — ImmatConnect Pro

> **PROTOCOLE OBLIGATOIRE**
> 1. Toute IA lit ce fichier en premier.
> 2. Toute IA met ce fichier à jour avant de quitter.
> 3. Diagnostics détaillés → leurs fichiers dédiés. Ce fichier reste court.
> 4. Incident résolu → résumé en archive, lien ici.

**Dernière mise à jour** : 2026-06-08 — restructuration protocole continuité IA

---

## ÉTAT DU PROJET

```
Dépôt   : caisse43700-lgtm/Projet-immat-Connect
Main    : 68f322b — CI GREEN 4/4 (unitaires + E2E + diagnostics + Pages)
Branche active : diagnostic/call-pending-expiry-obd (commit c03edf2)
```

---

## INCIDENTS ACTIFS

### INC-001 — Bug appel A → B

**Symptôme ALPHA** (priorité 1) :
Deuxième appel de A vers B refusé avec `"Une demande est déjà en attente de réponse"` — erreur `23505` DB alors que les deux côtés affichent `expired` dans l'historique.

**Symptôme BETA** (secondaire) :
B ne voit aucune popup ni sonnerie lors du premier appel. À investiguer après ALPHA.

**Branche** : `diagnostic/call-pending-expiry-obd`

**Fichiers de diagnostic** :
- `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` — diagnostic consolidé (terrain + code + OBD)
- `docs/CALL_PENDING_EXPIRY_CODE_AUDIT_CLAUDE.md` — analyse statique `calls.js` (Claude)
- `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` — revue critique (ChatGPT)

---

## HYPOTHÈSES — INC-001

### Confirmées (par code source)

| ID | Énoncé | Preuve | Confiance |
|---|---|---|---|
| HYP-001 | Aucun chemin client ne fait `UPDATE status='expired'` — ligne reste `pending` en DB | Audit `calls.js` : `_showSentBanner`, `_onMissed`, `_recoverPendingRequest` — zéro écriture DB sur expiration | 85 % |
| HYP-003 | Expiration UI ≠ expiration DB — l'UI calcule `expires_at < now()`, le DB garde `status='pending'` | Corollaire direct de HYP-001 | 85 % |

### Ouvertes (non vérifiables sans SQL)

| ID | Énoncé | Preuve manquante | Confiance |
|---|---|---|---|
| HYP-002 | La contrainte anti-doublon ne filtre pas `expires_at` | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='call_requests'::regclass` | 75 % |
| HYP-003b | Aucun cron/trigger DB ne nettoie les pending expirés | Supabase Dashboard → Cron Jobs | 55 % |
| HYP-006 | Chaîne `ImmatOrganism → ImmatBus → CallScreen` peut se rompre silencieusement | `ImmatBus.getJournal()` côté B après appel propre | 40 % |

### Infirmées (raison conservée)

| ID | Énoncé | Raison d'infirmation |
|---|---|---|
| HYP-004 | `receiver_id` incorrect | B voit `"Appel reçu · expired"` dans l'historique + OBD `myPlate=BE-521-MM` correct. Non définitive : si historique par `receiver_plate` → reste possible |
| HYP-005 | Realtime cassé côté B | OBD terrain : `realtimeSubscribed=true`. Non définitive : prouve la création du channel, pas la réception de l'événement |
| "Même téléphone / même compte" | — | Test refait avec deux téléphones, deux comptes, deux plaques différentes |

---

## PREUVES ET TESTS

### Dernières preuves disponibles

| Preuve | Source | Élimine |
|---|---|---|
| `realtimeSubscribed=true`, `myPlate=BE-521-MM`, `initialized=true` | OBD dashboard côté B | HYP-005 affaiblie, HYP-007 affaiblie |
| Historique : `Appel émis · expired` + `Appel reçu · expired` | Observation UI | HYP-004 affaiblie |
| Deuxième appel → `23505` | Observation UI | Confirme HYP-001 |
| Audit `calls.js` : zéro UPDATE status=expired | Code source | Confirme HYP-001 |

### Dernier test réalisé

Audit statique `calls.js` — 2026-06-08

### Prochain test — PRIORITÉ 1

```sql
-- Exécuter dans Supabase SQL Editor
SELECT id, requester_plate, receiver_plate, receiver_id,
       status, expires_at, created_at
FROM call_requests
WHERE status = 'pending' AND expires_at < NOW()
ORDER BY expires_at DESC
LIMIT 10;
```

**Si > 0 lignes** → HYP-001 confirmée à 100 %, HYP-002 à vérifier ensuite.  
**Si 0 lignes** → raisonner depuis le début, cause différente.

---

## PROCHAINE ACTION

**Attente de résultat SQL** (action utilisateur requise — accès Supabase Dashboard).  
**Ne pas modifier le code** avant confirmation SQL.

Après SQL :
1. Si HYP-001 confirmée → vérifier définition contrainte (SQL priorité 2)
2. Si HYP-001 + HYP-002 confirmées → proposer correctif minimal avec test de validation

---

## DOCUMENTS DE RÉFÉRENCE

| Document | Rôle |
|---|---|
| `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` | Diagnostic INC-001 — consolidé |
| `docs/CALL_PENDING_EXPIRY_CODE_AUDIT_CLAUDE.md` | Audit statique code — Claude |
| `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` | Revue critique — ChatGPT |
| `docs/ROADMAP-NEXT.md` | Prochaines priorités (dette / améliorations / features) |
| `docs/CALL_SOURCE_OF_TRUTH.md` | États appel documentés |
| `docs/INTERACTION_LEDGER_REGISTRY.md` | Forme événements IE |
| `docs/INTERACTION_ORGANISM_MAP.md` | Qui possède quoi |

---

## ARCHIVES — Incidents résolus

| Incident | Date | Cause racine | Archive |
|---|---|---|---|
| Phases 0–10 + post-merge | 2026-06-08 | Architecture complète implémentée, CI green | `docs/archives/ARCHIVE_PHASES_0_10.md` |

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
```
