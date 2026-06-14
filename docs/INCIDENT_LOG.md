# INCIDENT_LOG — ImmatConnect Pro
Document opérationnel — À remplir dès qu'un incident est détecté en terrain ou production

> **Référence :** docs/MASTER_COMPATIBILITY_MAP.md (Section 25 — TERRAIN_TESTS, Section 23 — ROLLBACK_REGISTRY)
> **Règle :** Tout ❌ critique dans TEST_RESULTS.md génère un incident P1. Tout dysfonctionnement produit génère un incident P1 ou P2.

---

## FORMAT D'UN INCIDENT

```
## INC-XXX — [TITRE COURT]

**Date :** YYYY-MM-DD HH:MM
**Statut :** OUVERT / EN COURS / RÉSOLU / FERMÉ
**Priorité :** P1 (critique, bloque GO) / P2 (majeur, dégradé) / P3 (mineur)
**Détecté par :** Fondateur / Test automatique / Utilisateur bêta
**Environnement :** Production / Staging / Test terrain
**Contrôle TEST_RESULTS associé :** C__ ou N/A

### Description
[Comportement observé vs comportement attendu]

### Reproduction
[Étapes pour reproduire le problème]

### Impact
[Tables / Edge Functions / utilisateurs affectés]

### Diagnostic
[Logs, requêtes SQL, erreurs console]

### Actions correctives
[Migrations appliquées / Code modifié / Config changée]

### Vérification
[Contrôle post-fix — résultat attendu et obtenu]

### Résolution
**Date résolution :** YYYY-MM-DD HH:MM
**Commit correctif :** ___
**Durée totale :** ___ min
```

---

## SEUILS DE PRIORITÉ

| Priorité | Déclencheur | Délai d'action |
|----------|-------------|----------------|
| P1 | ❌ critique dans TEST_RESULTS / donnée PII exposée / crash généralisé | Immédiat — bloquer GO MAIN |
| P2 | ⚠️ partiel sur fonctionnalité majeure / EF défaillante / push absent | < 2h |
| P3 | Comportement cosmétique / texte incorrect / latence acceptable | < 24h |

---

## RISQUES PRÉ-IDENTIFIÉS (depuis MASTER_COMPATIBILITY_MAP.md)

Les risques suivants sont documentés dans la Section 20 du MASTER_COMPATIBILITY_MAP.md.
En cas d'occurrence, référencer le RISK correspondant.

| RISK | Libellé | Mitigation documentée |
|------|---------|----------------------|
| RISK-001 | Appel vocal impossible post-migration 11/11 | Test C05a immédiatement après 20260615 |
| RISK-002 | Push iOS silencieux (certificat APN expiré) | VAPID + topic APN = immatconnect |
| RISK-003 | PII exposée via /profiles | Migration 11/11 + contrôle C03 |
| RISK-004 | reporter_id visible dans /reports | RLS reports_select_own + C03b |
| RISK-005 | Token Agora expiré mid-call | get-agora-token expire 3600s |
| RISK-006 | Crash app si ANGE KO | Try/catch → message dégradation affiché |
| RISK-007 | Blocage utilisateur sans RLS serveur | RISK-017 documenté — UI only en bêta |
| RISK-008 | Corruption plaque unique (race condition) | UNIQUE constraint + toast erreur |
| RISK-009 | SW obsolète (cache v25) | Cache busting côté client |
| RISK-010 | Export données incomplet | export-user-data EF → vérifier champs |
| RISK-011 | Notation conducteur sans idempotence | UNIQUE(rater_id, rated_plate, context) |
| RISK-012 | Score trust non rafraîchi | refresh_vehicle_trust() appelé dans EF |
| RISK-013 | public_profiles non synchronisé | Trigger sync_public_profile() — contrôle post-migration 08/11 |
| RISK-014 | Realtime non activé sur messages | Dashboard → Replication → messages ON |
| RISK-015 | AGORA_APP_CERTIFICATE en clair dans le code | Jamais dans le code — EF uniquement |
| RISK-016 | Suppression compte incomplète (RGPD) | delete-account EF → vérification SQL C07 |
| RISK-017 | Blocage utilisateur côté serveur absent | Documentation RISK-017 — Beta acceptable |
| RISK-018 | Fuites mémoire ImmatBus | Unsubscribe systématique |
| RISK-019 | appel Agora tiers en arrière-plan iOS | iOS Agora SDK background mode |
| RISK-020 | driver_ratings_summary obsolète | REFRESH CONCURRENTLY planifié |
| RISK-021 | Storage buckets non sécurisés | RLS Storage à vérifier |
| RISK-022 | ANGE hallucine hors contexte | System prompt restrictif + refuse hors scope |
| RISK-023 | Migration 11/11 non en dernier | INV-020 — ordre strict obligatoire |
| RISK-024 | Realtime flood > 200 msg/s | Rate limit côté client 5/min |
| RISK-025 | Parking/véhicule : collisions de plaques | owner_plate PK dans public_profiles |

---

## JOURNAL DES INCIDENTS

*(Aucun incident enregistré — document vierge au moment de la création)*

---

## INC-001 — [À COMPLÉTER LORS DU PREMIER INCIDENT]

**Date :** —
**Statut :** —
**Priorité :** —
**Détecté par :** —
**Environnement :** —
**Contrôle TEST_RESULTS associé :** —

### Description
—

### Reproduction
—

### Impact
—

### Diagnostic
—

### Actions correctives
—

### Vérification
—

### Résolution
**Date résolution :** —
**Commit correctif :** —
**Durée totale :** —

---

## HISTORIQUE DES INCIDENTS

| # | Date | Titre | Priorité | Statut | Durée | Commit |
|---|------|-------|----------|--------|-------|--------|
| INC-001 | — | — | — | — | — | — |

---

## RÈGLES D'ESCALADE

### P1 — Incident critique
1. Stopper immédiatement tout déploiement en cours
2. Créer l'entrée INC-XXX dans ce fichier
3. Marquer NO-GO dans TEST_RESULTS.md (bilan) et DEPLOYMENT_LOG.md
4. Exécuter le playbook approprié (Section 35 du MASTER_COMPATIBILITY_MAP.md)
5. Ne rouvrir le GO qu'après résolution vérifiée et 0 ❌ confirmés

### P2 — Incident majeur
1. Créer l'entrée INC-XXX dans ce fichier
2. Décrire le contournement temporaire (workaround)
3. Planifier la correction dans les 2h
4. Documenter dans SESSION-CONTINUATION.md

### P3 — Incident mineur
1. Créer l'entrée INC-XXX dans ce fichier
2. Planifier la correction dans les 24h
3. Pas de blocage GO

---

## PLAYBOOKS DE RÉFÉRENCE (depuis MASTER_COMPATIBILITY_MAP.md)

| Playbook | Section | Déclencheur |
|----------|---------|-------------|
| MIGRATION_FAILURE_PLAYBOOK | Section 35 | Migration SQL échoue |
| SUPABASE_DOWN_PLAYBOOK | Section 35b | Supabase inaccessible |
| AI_HALLUCINATION_PLAYBOOK | Section 35c | ANGE hors contexte |
| AGORA_DOWN_PLAYBOOK | Section 35d | Appels audio indisponibles |
| ANTHROPIC_DOWN_PLAYBOOK | Section 35e | API Anthropic inaccessible |

---

*INCIDENT_LOG — ImmatConnect Pro*
*Référence : MASTER_COMPATIBILITY_MAP.md v1.3 — Sections 20, 23, 25, 35*
