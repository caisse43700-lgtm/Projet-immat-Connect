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

**Dernière mise à jour** : 2026-06-08 — PR #269 mergé — BUG A archivé — BUG B priorité 1

---

## ÉTAT DU PROJET

```
Dépôt          : caisse43700-lgtm/Projet-immat-Connect
Main           : 5859393 — CI GREEN 3/3 — PR #269 mergé 2026-06-08
BUG A (INC-001): ARCHIVÉ — mergé dans main (5859393)
BUG B (INC-001): ACTIF — B ne reçoit pas la popup au premier appel
```

---

## INCIDENTS ACTIFS

### INC-001 — Bug appel A → B

**Symptôme ALPHA** ✅ ARCHIVÉ (2026-06-08) — mergé PR #269 → main `5859393`

**Symptôme BETA** (actif — priorité 1) :
B ne voit aucune popup ni sonnerie lors du premier appel. L'historique montre `"Appel reçu · expired"` — la ligne existe mais la popup live n'a pas été déclenchée.

**Branche** : `main` (diagnostic BUG B à démarrer sur nouvelle branche si nécessaire)

**Annexes** :
- `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` — diagnostic consolidé complet
- `docs/CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` — analyse statique `calls.js`
- `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` — revue externe

---

## DIAGNOSTIC COMPLET — BUG A (RÉSOLU)

### SQL exécutés — résultats — conclusions

| SQL | Requête | Résultat | Confirme | Infirme |
|---|---|---|---|---|
| P1 | `SELECT ... WHERE status='pending' AND expires_at < NOW()` | **0 lignes** | Pas de pending expiré au moment du test | HYP-001 côté DB affaiblie |
| P2 | `SELECT conname, pg_get_constraintdef FROM pg_constraint` | **5 contraintes : PK + 2 FK + 2 CHECK — zéro UNIQUE** | Aucune contrainte UNIQUE | HYP-002 (contrainte UNIQUE sans filtre) |
| P3 | `pg_indexes + triggers` (même bloc — résultat pg_indexes perdu) | **2 triggers : trg_call_req_on_insert + trg_call_req_on_update** | Triggers existent | — |
| P4 | `pg_get_functiondef('call_request_on_insert')` | **Spam limit (≥3 en 10min) + cooldown (refused <5min) — zéro RAISE 23505** | Trigger ≠ source du 23505 | HYP-011, HYP-012 |
| P5 | `SELECT indexname, indexdef FROM pg_indexes` (séparé) | **5 index dont `call_requests_unique_pending_idx` UNIQUE** | Index UNIQUE existe | — |
| P6 | `SELECT indexdef WHERE indexname='call_requests_unique_pending_idx'` | **`UNIQUE (requester_id, receiver_id) WHERE (status = 'pending'::text)`** | **CAUSE RACINE CONFIRMÉE** | — |
| P7 | `pg_get_functiondef('call_request_on_update')` | **Guard `old.status != 'pending'` + auto `responded_at` — compatible avec UPDATE→expired** | UPDATE pending→expired autorisé | Effets de bord incompatibles |
| P8 | `pg_get_constraintdef('call_requests_status_check')` | **`status IN ('pending','accepted','refused','expired','cancelled')`** | 'expired' est un statut valide | Migration de schéma requise |

### Cause racine finale

```
Index : CREATE UNIQUE INDEX call_requests_unique_pending_idx
        ON call_requests (requester_id, receiver_id)
        WHERE (status = 'pending')

Bug   : aucun code ne fait jamais UPDATE status='expired' en DB
        → la ligne reste 'pending' après l'expiration UI (30s)
        → le second INSERT viole l'index → erreur 23505
        → message affiché : "Une demande est déjà en attente de réponse"
```

### Correctif appliqué dans `calls.js`

**Changement 1 — `_showSentBanner()` (expiration côté A après 31s)**
```js
// AVANT
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

**Changement 2 — `_recoverPendingRequest()` (nettoyage au rechargement de page)**
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

### Preuve de fonctionnement

```
Test terrain — 2026-06-08
1. A appelle B (premier appel)
2. Attente 35 secondes (expiration + marge)
3. A rappelle B (deuxième appel)
Résultat : SUCCÈS — pas d'erreur 23505 — appel émis normalement
```

---

## HYPOTHÈSES — INC-001 BUG B (actif)

### Ouvertes

| ID | Énoncé | Test requis | Confiance |
|---|---|---|---|
| **HYP-006** | Chaîne `ImmatOrganism → ImmatBus → CallScreen` rompue silencieusement | `ImmatBus.getJournal()` côté B juste après appel | 40 % |
| HYP-007 | B avait l'écran verrouillé / app en arrière-plan au moment de l'appel | Refaire le test avec B écran allumé, app au premier plan | 35 % |
| HYP-008 | Filtre realtime `receiver_id=eq.uid` ne matche pas l'uid réel de B | SQL : comparer `receiver_id` de la ligne avec auth.uid() de B | 30 % |

### Infirmées (conservées)

| ID | Énoncé | Raison |
|---|---|---|
| HYP-004 | `receiver_id` incorrect | B voit `"Appel reçu · expired"` — ligne DB correcte |
| HYP-005 | Realtime cassé côté B | OBD : `realtimeSubscribed=true` |
| "Même téléphone / compte" | — | Test refait avec deux téléphones, deux comptes, deux plaques |

---

## PREUVES ET TESTS — INC-001 BUG B

| Preuve | Source | Effet |
|---|---|---|
| `realtimeSubscribed=true`, `myPlate=BE-521-MM`, `initialized=true` | OBD dashboard côté B | HYP-005 affaiblie |
| `"Appel reçu · expired"` dans l'historique B | Observation UI | HYP-004 affaiblie — ligne bien reçue |
| Pas de popup visible, pas de sonnerie | Observation terrain | Rupture quelque part dans la chaîne live |

### Prochain test — PRIORITÉ ABSOLUE

Conditions requises : B écran allumé, app au premier plan, connexion stable.

```js
// Console de B — juste après un appel de A :
ImmatBus.getJournal()
```

- `CALL_RECEIVED` **absent** → rupture avant le Bus (realtime ou `_showIncomingPopup`)
- `CALL_RECEIVED` **présent** + popup absente → rupture Bus → CallScreen (HYP-006)

---

## PROCHAINE ACTION

**Investiguer BUG B** — `ImmatBus.getJournal()` côté B (voir §PREUVES ET TESTS — INC-001 BUG B)

Conditions : B écran allumé, app au premier plan, connexion stable.
Exécuter juste après un appel de A :
```js
ImmatBus.getJournal()
```
- `CALL_RECEIVED` **absent** → rupture avant le Bus (realtime ou `_showIncomingPopup`)
- `CALL_RECEIVED` **présent** + popup absente → rupture Bus → CallScreen (HYP-006)

---

## DOCUMENTS DE RÉFÉRENCE

| Document | Rôle | Type |
|---|---|---|
| `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` | Diagnostic INC-001 consolidé | Annexe incident actif |
| `docs/CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` | Analyse statique du code — `calls.js` | Annexe incident actif |
| `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` | Revue externe | Annexe incident actif |
| `docs/ROADMAP-NEXT.md` | Prochaines priorités hors incidents | Référence permanente |
| `docs/CALL_SOURCE_OF_TRUTH.md` | États appel documentés | Référence permanente |
| `docs/INTERACTION_LEDGER_REGISTRY.md` | Forme événements IE | Référence permanente |
| `docs/INTERACTION_ORGANISM_MAP.md` | Qui possède quoi | Référence permanente |

---

## ARCHIVES — Incidents résolus

| Incident | Date | Cause racine | Archive |
|---|---|---|---|
| Phases 0–10 + post-merge | 2026-06-08 | Architecture complète — CI green 4/4 | `docs/archives/ARCHIVE_PHASES_0_10.md` |
| INC-001 BUG A (Symptôme ALPHA) | 2026-06-08 | `call_requests_unique_pending_idx` UNIQUE partiel — aucun UPDATE status='expired' en DB → 23505 | `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` |

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
