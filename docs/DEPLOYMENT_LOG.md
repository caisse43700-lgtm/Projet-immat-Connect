# DEPLOYMENT_LOG — ImmatConnect Pro
Document opérationnel — À remplir lors de chaque déploiement terrain

> **Référence :** docs/MASTER_COMPATIBILITY_MAP.md (Section 23 — ROLLBACK_REGISTRY)
> **Ordre obligatoire des migrations :** chronologique, 20260615 en dernier (11/11)

---

## DÉPLOIEMENT #1 — DATE : À COMPLÉTER

**Environnement :** Production Supabase — https://vemgdkkbldgyvaisudkd.supabase.co
**Branche :** claude/immatconnect-pro-app-dEKGR
**Opérateur :** Fondateur
**Heure de début :** —
**Heure de fin :** —

---

### ÉTAPE 1 — SECRETS SUPABASE

Vérifier dans Supabase Dashboard → Settings → Secrets avant toute migration.

| Secret | Statut | Notes |
|--------|--------|-------|
| AGORA_APP_ID | ⬜ vérifié | Peut être public — déjà dans le code |
| AGORA_APP_CERTIFICATE | ⬜ vérifié | JAMAIS dans le code |
| VAPID_PUBLIC_KEY | ⬜ vérifié | |
| VAPID_PRIVATE_KEY | ⬜ vérifié | JAMAIS dans git |
| VAPID_SUBJECT | ⬜ vérifié | ex: mailto:admin@... |
| ANTHROPIC_API_KEY | ⬜ vérifié | JAMAIS dans git |

---

### ÉTAPE 2 — MIGRATIONS (ordre strict)

Exécuter chaque migration dans Supabase SQL Editor. Cocher après exécution réussie.

| # | Fichier | Statut | Heure | Erreur éventuelle |
|---|---------|--------|-------|-------------------|
| 01/11 | 20260613_push_subscriptions.sql | ⬜ | — | — |
| 02/11 | 20260613_reports_enhancements.sql | ⬜ | — | — |
| 03/11 | 20260613_user_blocks.sql | ⬜ | — | — |
| 04/11 | 20260613_call_requests_device_id.sql | ⬜ | — | — |
| 05/11 | 20260614_device_sessions.sql | ⬜ | — | — |
| 06/11 | 20260614_driver_ratings.sql | ⬜ | — | — |
| 07/11 | 20260614_user_trust.sql | ⬜ | — | — |
| 08/11 | 20260614_public_profiles_secure.sql | ⬜ | — | — |
| 09/11 | 20260614_public_reports_secure.sql | ⬜ | — | — |
| 10/11 | 20260614_missing_indexes.sql | ⬜ | — | — |
| 11/11 | 20260615_profiles_column_security.sql | ⬜ | — | — ← TOUJOURS EN DERNIER |

**Contrôle post-migration 08/11 (RISK-013) :**
```sql
SELECT COUNT(*) FROM profiles p
LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate
WHERE pp.owner_plate IS NULL;
```
Résultat obtenu : ___ (attendu : **0**)

**Contrôle post-migration 11/11 — appel vocal immédiat (RISK-001) :**
Test appel C05a réalisé : ⬜ OUI — Résultat : ___

---

### ÉTAPE 3 — EDGE FUNCTIONS

```bash
supabase functions deploy delete-account
supabase functions deploy export-user-data
supabase functions deploy submit-rating
supabase functions deploy send-push-notification
supabase functions list
```

| EF | Statut déploiement | Statut liste | Notes |
|----|-------------------|--------------|-------|
| delete-account | ⬜ | ⬜ active | |
| export-user-data | ⬜ | ⬜ active | |
| submit-rating | ⬜ | ⬜ active | |
| send-push-notification | ⬜ | ⬜ active | |
| get-agora-token | — | ⬜ active (déjà déployée) | |
| create-call-request | — | ⬜ active (déjà déployée) | |
| respond-call-request | — | ⬜ active (déjà déployée) | |
| immat-brain-dialog | — | ⬜ active (déjà déployée) | |
| get-turn-credentials | — | ⬜ ABSENTE (à supprimer) | S3-6 DEBT-007 |

---

### ÉTAPE 4 — REALTIME

Supabase Dashboard → Database → Replication → Tables

| Table | Statut | Notes |
|-------|--------|-------|
| messages | ⬜ activé | Obligatoire |
| user_locations | ⬜ activé | Obligatoire |
| call_requests | ⬜ vérifié | À activer si postgres_changes confirmé dans calls.js |
| reports | ⬜ vérifié | Ne pas activer (broadcast uniquement selon D18) |

---

### ÉTAPE 5 — MERGE MAIN

| Condition | Statut |
|-----------|--------|
| Contrôles critiques TEST_RESULTS.md : 0 KO | ⬜ |
| 15 questions Section 37 : toutes OUI | ⬜ |
| CGU publiées | ⬜ |
| Canal modération opérationnel | ⬜ |

Merge main réalisé : ⬜ — Commit : ___
URL production vérifiée : ⬜ — https://caisse43700-lgtm.github.io/Projet-immat-Connect/

---

### NOTES ET INCIDENTS

_(Compléter si problème rencontré pendant le déploiement)_

---

## DÉPLOIEMENTS FUTURS

| # | Date | Description | Opérateur | Résultat |
|---|------|-------------|-----------|----------|
| 1 | — | Déploiement initial S6/S7 | — | — |

---

*DEPLOYMENT_LOG — ImmatConnect Pro*
*Référence : MASTER_COMPATIBILITY_MAP.md v1.3 — Section 23*
