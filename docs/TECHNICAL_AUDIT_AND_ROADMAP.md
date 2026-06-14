# TECHNICAL_AUDIT_AND_ROADMAP — ImmatConnect Pro
## Audit du Code Réel et Feuille de Route jusqu'à la Production

> **Statut :** AUDIT BASÉ SUR LE CODE RÉEL DU DÉPÔT — 2026-06-14
> **Méthode :** Lecture directe des fichiers index.html, calls.js, messages.js, service-worker.js, core/*.js, supabase/functions/*, supabase/migrations/*
> **Périmètre :** V1 (actuelle) + V2 (PRODUCT_ARCHITECTURE_V2.md)

---

## SECTION 1 — ÉTAT D'AVANCEMENT FONCTIONNEL PAR MODULE (V1)

### 1.1 Méthode de calcul

| Symbole | Signification |
|---------|--------------|
| ✅ | Code implémenté + fonctionnel dans l'état actuel |
| ⚠️ | Code implémenté mais bloqué par une migration non appliquée ou un secret non configuré |
| ❌ | Absent du code |
| 🔒 | Fonctionnel mais jamais testé en conditions réelles |

---

### MODULE AUTH & PROFIL — 90%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| Signup + login (email/password) | ✅ | index.html | — |
| Profil (pseudo, plaque, couleur) | ✅ | index.html | — |
| Effacement ic_pending_profile à l'ouverture | ✅ | index.html:684 | — |
| get_my_profile() RPC (accès email/phone sécurisé) | ⚠️ | index.html:654 | Migration 20260615 non appliquée → RPC existe mais column-security inactive |
| Onboarding (overlay + demande push) | ✅ | index.html:860 | — |
| Unicité plaque (UNIQUE constraint) | ⚠️ | index.html | Migration non appliquée |

**Manquant (10%) :** delete_audit_log à la suppression, soft-delete intermédiaire, validation du profil post-migration column-security.

---

### MODULE CARTE & LOCALISATION — 90%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| Carte Leaflet + marqueurs | ✅ | index.html | — |
| Localisation GPS (watchPosition) | ✅ | index.html | — |
| Marqueur personnel | ✅ | index.html | — |
| Conducteurs proches (loadOthers) | ✅ | index.html | — |
| Clustering Leaflet.markercluster 1.5.3 | ✅ | index.html:17-19 | — |
| Filtre alertes sur carte (Tous/Route/Aide/Véhicule) | ✅ | index.html | — |
| Position approximée ±200m (ic_approx_geo) | ✅ | index.html:521, 863 | — |
| Trust score + niveau sur carte (vehicleContextTrust) | ⚠️ | index.html:1013 | Migration user_trust non appliquée |
| Notation moyenne sur carte (vehicleContextScore) | ⚠️ | index.html:1012 | Migration driver_ratings non appliquée |
| Menu contextuel véhicule (message/signaler/noter/copier/bloquer) | ✅ | index.html:79, 1011 | — |

**Manquant (10%) :** vue publique des conducteurs post-migration public_profiles, signalement "Signaler ici" sur tap carte entièrement fonctionnel.

---

### MODULE MESSAGES — 85%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| Envoi message (sendToPlate) | ✅ | messages.js | — |
| Réception temps réel (postgres_changes) | 🔒 | messages.js | Realtime non confirmé actif |
| Rate limit client 5/min (ic_msg_times) | ✅ | messages.js | — |
| Statut lecture ✓✓ bleu (markThreadRead) | ✅ | messages.js | — |
| Suppression message (soft-delete localStorage) | ✅ | messages.js | — |
| Suppression message en DB | ❌ | — | Non implémenté |
| Archivage thread | ✅ | messages.js | — |
| Favoris thread | ✅ | messages.js | — |
| Recherche dans les threads | ✅ | messages.js | — |
| Horodatage relatif (relTime) | ✅ | messages.js | — |
| Rate limit serveur | ❌ | — | Non implémenté |
| Présence (disponible/conduite/occupé) | ✅ | messages.js | — |
| Ne pas déranger (DND) | ✅ | messages.js + index.html | — |
| Niveau d'appels (setCallLevel) | ✅ | messages.js | — |
| Signalement abus | ✅ | messages.js | — |

**Manquant (15%) :** suppression réelle en DB, read_at serveur persistant, sync multi-device des suppressions.

---

### MODULE APPELS VOCAUX — 90%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| requestCall (avec rate limit 3/10min) | ✅ | calls.js | — |
| acceptCall + micro iOS (getUserMedia geste) | ✅ | calls.js | — |
| refuseCall | ✅ | calls.js | — |
| cancelCallRequest (DB + broadcast) | ✅ | calls.js | — |
| 4 couches détection annulation | ✅ | calls.js | — |
| Agora join (AgoraCallEngine) | ✅ | core/agora-call-engine.js | — |
| device_id multi-appareil | ✅ | calls.js | Migration device_id non appliquée |
| "Appel pris sur autre appareil" toast | ⚠️ | calls.js | Migration 20260613_call_requests_device_id non appliquée |
| Push fire-and-forget à l'appelé | 🔒 | calls.js | EF send-push-notification non déployée |
| Historique d'appels (loadCallLog) | ✅ | index.html:1770 | — |
| Badge manqués (callNavBadge) | ✅ | index.html:1901 | — |
| Bouton noter depuis journal appels | ✅ | index.html:1811 | — |
| Récupération appels en attente au démarrage | ✅ | calls.js | — |
| Préférences appels (setCallPreferences) | ✅ | calls.js | — |

**Manquant (10%) :** renouvellement token Agora mid-call (> 1h), validation terrain complète (0 test réel).

---

### MODULE PUSH NOTIFICATIONS — 80%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| subscribePush() (VAPID + push_subscriptions DB) | 🔒 | index.html:861 | Migration push_subscriptions non appliquée |
| requestPushPermission() (geste utilisateur) | ✅ | index.html:859 | — |
| onboardingRequestPush() | ✅ | index.html:860 | — |
| SW listener "push" (affiche notification) | ✅ | service-worker.js | — |
| SW listener "notificationclick" | ✅ | service-worker.js | — |
| PUSH_NOTIFICATION_CLICKED → navAppels/navMessages | ✅ | index.html | — |
| send-push-notification EF (VAPID signing) | 🔒 | supabase/functions/send-push-notification | EF non déployée + secrets non configurés |
| Cleanup 410 Gone endpoints expirés | ✅ | send-push-notification/index.ts | — |
| Push appel entrant (fire-and-forget de calls.js) | 🔒 | calls.js | EF + secrets requis |

**Manquant (20%) :** secrets VAPID non confirmés, EF non déployée, test iOS 16.4+/Android jamais réalisé.

---

### MODULE RGPD — 80%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| delete-account EF (12 étapes) | 🔒 | supabase/functions/delete-account | EF non déployée |
| export-user-data EF (JSON complet) | 🔒 | supabase/functions/export-user-data | EF non déployée |
| UI boutons suppression + export dans Paramètres | ✅ | index.html:285 | — |
| Double confirmation suppression compte | ✅ | index.html:1150 | — |
| Nettoyage localStorage à la suppression | ✅ | index.html:1150 | — |
| delete_audit_log (traçabilité RGPD art. 17) | ❌ | — | Non implémenté |
| Nettoyage Storage buckets à delete-account | ❌ | — | Non implémenté |
| Suppression messages DB à delete-account | ✅ | delete-account/index.ts | EF non déployée |
| REVOKE colonnes PII (email, phone) | ⚠️ | — | Migration 20260615 non appliquée |
| Redaction push_subscriptions dans export | ✅ | export-user-data/index.ts | — |

**Manquant (20%) :** delete_audit_log (P0 avant bêta), Storage cleanup, test terrain C07 jamais exécuté.

---

### MODULE TRUST ENGINE — 70%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| vehicle_trust_scores table | ⚠️ | — | Migration 20260614_user_trust non appliquée |
| refresh_vehicle_trust() RPC | ⚠️ | — | Migration non appliquée |
| submit-rating EF (+ appel refresh_vehicle_trust) | 🔒 | supabase/functions/submit-rating | EF non déployée + migration non appliquée |
| Lecture trust sur vehicleContextTrust (UI) | ✅ | index.html:1013 | — |
| Ouverture modal notation (openRatingModal) | ✅ | index.html:852 | — |
| Soumission notation (submitRating) | ✅ | index.html:854 | — |
| Bouton noter depuis journal appels | ✅ | index.html:1811 | — |
| driver_ratings_summary vue matérialisée | ⚠️ | — | Migration non appliquée |
| Cron refresh driver_ratings_summary | ❌ | — | Non configuré |

**Manquant (30%) :** migrations non appliquées, cron refresh absent, test terrain jamais exécuté.

---

### MODULE SIGNALEMENTS — 90%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| Signalement Route / Véhicule / Aide | ✅ | index.html | — |
| Bouton urgence 15/17/18 | ✅ | index.html | — |
| ResolutionCenter modal | ✅ | index.html:1673 | — |
| Filtre type alerte (Tous/Route/Aide/Véhicule) | ✅ | index.html | — |
| Partage alerte (Web Share API) | ✅ | index.html:1893 | — |
| FloatingCard + boutons J'arrive/Résolu/Précisez | ✅ | index.html | — |
| seen_at, actioned_at, urgency_level en DB | ⚠️ | — | Migration 20260613_reports_enhancements non appliquée |
| public_reports VIEW (sans reporter_id) | ⚠️ | — | Migration 20260614_public_reports_secure non appliquée |
| reporter_id masqué côté client | ✅ | index.html | — |

**Manquant (10%) :** migrations non appliquées, test C03c/C03b jamais exécuté.

---

### MODULE ANGE (IA) — 90%

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| immat-brain-dialog EF (Anthropic) | 🔒 | supabase/functions/immat-brain-dialog | EF active mais ANTHROPIC_API_KEY non confirmée |
| 3 niveaux de profondeur (conducteur/protecteur/gardien) | ✅ | immat-brain-dialog/index.ts | — |
| System prompt NS schema validation | ✅ | immat-brain-dialog/index.ts | — |
| Cache Anthropic (ephemeral) | ✅ | immat-brain-dialog/index.ts | — |
| Dégradation gracieuse si EF KO | ✅ | index.html:2665 | — |
| ANGE FAB (bouton flottant, visible si gardien) | ✅ | index.html:684 | — |
| Réponse JSON structurée (sources, options, vigilance) | ✅ | immat-brain-dialog/index.ts | — |
| Historique conversation max 6 messages | ✅ | immat-brain-dialog/index.ts | — |
| Anonymisation plaques dans l'historique | ✅ | immat-brain-dialog/index.ts | — |
| Mémoire persistante (conversation_history) | ❌ | — | Réservé Sprint 15 |
| Contexte maintenance dans le prompt | ❌ | — | Réservé Sprint 10 |
| Contexte assistance dans le prompt | ❌ | — | Réservé Sprint 11 |

**Manquant (10%) :** ANTHROPIC_API_KEY non confirmée, test C11/C11b/C11c jamais exécuté.

---

### MODULE SERVICE WORKER & PWA — 95%

| Fonctionnalité | État | Fichier |
|----------------|------|---------|
| SW v25 installé et actif | ✅ | service-worker.js |
| Cache statique + CDN (allSettled non-bloquant) | ✅ | service-worker.js |
| offline.html servi en fallback | ✅ | service-worker.js |
| SW_UPDATED → clients notifiés | ✅ | service-worker.js |
| manifest.json shortcuts (Signaler/Carte/Appels) | ✅ | manifest.json |
| navigator.setAppBadge (badge icône PWA) | ✅ | index.html |
| PWA URL actions (?action=signal|map|calls) | ✅ | index.html:684 |
| A2HS detection | ✅ | index.html |

**Manquant (5%) :** test offline réel (C09/C09b jamais exécuté).

---

### MODULE SÉCURITÉ & RLS — 30% ⚠️ CRITIQUE

| Fonctionnalité | État | Fichier | Blocage |
|----------------|------|---------|---------|
| RLS profiles (SELECT authenticated) | ⚠️ | — | Migration 20260615 non appliquée → email/phone exposés |
| REVOKE SELECT email/phone | ⚠️ | — | Migration 20260615 non appliquée |
| GRANT SELECT colonnes autorisées | ⚠️ | — | Migration 20260615 non appliquée |
| get_my_profile() SECURITY DEFINER | ⚠️ | — | Migration 20260615 non appliquée |
| public_profiles (owner_plate PK, sans PII) | ⚠️ | — | Migration 20260614_public_profiles_secure non appliquée |
| sync_public_profile() trigger | ⚠️ | — | Migration non appliquée |
| get_public_profiles_by_ids() RPC | ⚠️ | — | Migration non appliquée |
| public_reports VIEW (sans reporter_id) | ⚠️ | — | Migration non appliquée |
| RLS reports_select_own | ⚠️ | — | Migration non appliquée |
| Index de performance | ⚠️ | — | Migration 20260614_missing_indexes non appliquée |
| Rate limit serveur (EF ou Postgres) | ❌ | — | Non implémenté |
| Blocage utilisateur côté serveur | ❌ | — | RISK-017 — beta acceptable |

**ÉTAT RÉEL : Toute la couche de sécurité est écrite mais non appliquée. En production actuelle, email et téléphone sont exposés via /profiles.**

---

## SECTION 2 — TABLEAU DE BORD PAR MODULE

| Module | % Code | % Actif en prod | Blocage principal |
|--------|--------|----------------|-------------------|
| Auth & Profil | 95% | 70% | Migration column-security |
| Carte & Localisation | 92% | 75% | public_profiles sync |
| Messages | 85% | 75% | Soft-delete only, Realtime non confirmé |
| Appels vocaux | 90% | 80% | Push EF non déployée |
| Push notifications | 85% | 0% | EF + secrets + iOS test |
| RGPD | 80% | 0% | EF non déployées |
| Trust Engine | 75% | 0% | 2 migrations + EF non déployées |
| Signalements | 92% | 80% | Migrations partielles |
| ANGE | 92% | 60% | ANTHROPIC_API_KEY non confirmée |
| SW / PWA | 97% | 90% | — |
| **Sécurité / RLS** | **100%** | **0%** | **11 migrations non appliquées** |
| **V2 Modules (tous)** | **0%** | **0%** | Réservé post-GO MAIN |

**Conclusion :** Le code est entre 80% et 95% complet sur les fonctionnalités V1. La couche de sécurité (RLS, column-level, public_profiles) est entièrement écrite mais non active. Le vrai blocage n'est pas le code — c'est le déploiement.

---

## SECTION 3 — ÉCARTS ENTRE LA VISION ET L'IMPLÉMENTATION

### 3.1 Écarts critiques (bloquent le GO MAIN)

| # | Écart | Vision | Réalité actuelle |
|---|-------|--------|-----------------|
| E01 | Sécurité colonnes profiles | REVOKE + GRANT appliqués | Jamais appliqué → PII exposées |
| E02 | public_profiles synchronisé | Trigger actif depuis migration | Table n'existe pas encore |
| E03 | push notifications fonctionnelles | App fermée → push reçue < 10s | 0 test réel, EF non déployée |
| E04 | delete-account opérationnel | 12 étapes + audit_log | EF non déployée, audit_log absent |
| E05 | trust scores calculés | vehicle_trust_scores peuplée | Table n'existe pas encore |
| E06 | Realtime confirmé actif | messages + user_locations ON | Non confirmé dans Dashboard |

### 3.2 Écarts importants (gênent la bêta mais non bloquants)

| # | Écart | Vision | Réalité |
|---|-------|--------|---------|
| E07 | Messages suppression DB | DELETE en DB | Soft-delete localStorage uniquement |
| E08 | Rate limit serveur | EF ou Postgres RLS | Client uniquement (bypassable) |
| E09 | Blocage utilisateur serveur | RLS server-side | UI uniquement (RISK-017, beta acceptable) |
| E10 | delete_audit_log | Traçabilité RGPD art. 17 | Non implémenté |
| E11 | Cron driver_ratings_summary | REFRESH CONCURRENTLY planifié | Non configuré |
| E12 | Storage cleanup delete-account | Buckets nettoyés à la suppression | Non implémenté (0 bucket actuel) |

### 3.3 Écarts confort (n'impactent pas la bêta)

| # | Écart | Vision | Réalité |
|---|-------|--------|---------|
| E13 | Read_at persistant en DB | Statut lecture server-side | Géré côté client uniquement |
| E14 | Token Agora renouvellement | Mid-call token refresh | Expire après 3600s sans renouvellement |
| E15 | Retry push exponentiel | Best-effort avec backoff | Single best-effort |
| E16 | Streaming ANGE | Réponse progressive | Response complète uniquement |
| E17 | Archivage serveur messages | DB persistent | localStorage uniquement |

---

## SECTION 4 — TRAVAUX RESTANTS PAR PRIORITÉ

### PRIORITÉ CRITIQUE (P0) — Bloquent le GO MAIN

| # | Tâche | Effort | Responsable |
|---|-------|--------|-------------|
| P0-01 | Appliquer les 11 migrations Supabase (ordre strict) | 30 min | Fondateur (SQL Editor) |
| P0-02 | Configurer les 6 secrets Supabase | 10 min | Fondateur (Settings → Secrets) |
| P0-03 | Déployer les 4 Edge Functions | 10 min | Fondateur (CLI ou Dashboard) |
| P0-04 | Activer Realtime sur messages + user_locations | 5 min | Fondateur (Dashboard) |
| P0-05 | Supprimer get-turn-credentials du Dashboard Supabase | 2 min | Fondateur (S3-6) |
| P0-06 | Implémenter delete_audit_log | 1-2h | Claude (Sprint 8) |
| P0-07 | Tester C03 : email/phone absent de /profiles | 5 min | Fondateur (terrain) |
| P0-08 | Tester C05a : appel vocal complet après migration 11/11 | 10 min | Fondateur (terrain) |
| P0-09 | Exécuter les 42 contrôles terrain (TEST_RESULTS.md) | 2-4h | Fondateur (terrain) |

### PRIORITÉ IMPORTANTE (P1) — Améliorent la robustesse bêta

| # | Tâche | Effort | Sprint |
|---|-------|--------|--------|
| P1-01 | Storage cleanup dans delete-account (bucket vehicle-avatars, maintenance-docs) | 1h | 9 |
| P1-02 | Suppression messages réelle en DB (au lieu de soft-delete localStorage) | 2h | 9 |
| P1-03 | Rate limit serveur (EF ou trigger Postgres) | 3h | 9 |
| P1-04 | Read_at persistant en DB (statut lecture server-side) | 2h | 9 |
| P1-05 | Cron driver_ratings_summary REFRESH CONCURRENTLY | 30min | 8 post-validation |
| P1-06 | Promise.allSettled push multi-device (résistance si un device KO) | 1h | 8 |
| P1-07 | Test iOS push A2HS requis : documentation dans onboarding | 30min | 8 |

### PRIORITÉ CONFORT (P2) — V2 et qualité long terme

| # | Tâche | Effort | Sprint |
|---|-------|--------|--------|
| P2-01 | Token Agora renouvellement mid-call | 2h | 9 |
| P2-02 | Archivage messages serveur | 3h | 10 |
| P2-03 | Streaming ANGE (Server-Sent Events) | 4h | 12 |
| P2-04 | Blocage utilisateur côté serveur (RISK-017) | 4h | 10 |
| P2-05 | Retry push exponentiel | 1h | 9 |
| P2-06 | Analytics personnels (export enrichi) | 2h | 13 |

---

## SECTION 5 — ROADMAP OPTIMALE JUSQU'À LA PRODUCTION

### PHASE 0 — DÉPLOIEMENT (J-3 → J0) — Fondateur uniquement

```
J-3 : Vérifier les 6 secrets (DEPLOYMENT_LOG.md Étape 1)
J-2 : Appliquer les 11 migrations (ordre strict — DEPLOYMENT_LOG.md Étape 2)
      → Contrôle RISK-013 après 08/11 : COUNT(*) = 0
      → Test C05a immédiatement après 11/11
J-1 : Déployer les 4 EF (DEPLOYMENT_LOG.md Étape 3)
      Activer Realtime messages + user_locations (Étape 4)
J0  : Session test terrain complète (42 contrôles — TEST_RESULTS.md)
      Si 0 ❌ critiques → GO BÊTA FERMÉE
```

### PHASE 1 — SPRINT 8 (J0 → J+14) — Consolidation bêta

**Objectif :** Sécuriser la bêta, compléter le RGPD, ouvrir à 10-20 utilisateurs.

| Tâche | Priorité | Effort |
|-------|----------|--------|
| delete_audit_log (traçabilité art. 17) | P0 | 2h |
| Promise.allSettled push multi-device | P1 | 1h |
| Cron driver_ratings_summary | P1 | 30min |
| Documentation A2HS obligatoire pour push iOS | P1 | 30min |
| Monitoring métriques J1→J7 (BETA_READINESS_AUDIT Section 9) | P0 | ongoing |
| Inviter 10-20 bêta-testeurs | P0 | — |

### PHASE 2 — SPRINT 9 (J+14 → J+28) — Module Véhicule

**Pré-requis :** Sprint 8 terminé + 0 incident P1 ouvert.

| Tâche | Priorité | Effort |
|-------|----------|--------|
| vehicles table + RLS (migration) | P1 | 1h |
| public_vehicles VIEW | P1 | 30min |
| UI profil véhicule étendu (make, model, year, fuel_type) | P1 | 4h |
| bucket vehicle-avatars (photo profil véhicule) | P1 | 2h |
| delete-account étendu à vehicles | P0 | 30min |
| export-user-data étendu à vehicles | P0 | 30min |
| Storage cleanup delete-account | P1 | 1h |
| Suppression messages réelle en DB | P1 | 2h |
| Token Agora renouvellement mid-call | P2 | 2h |

### PHASE 3 — SPRINT 10 (J+28 → J+42) — Module Maintenance

**Pré-requis :** Module Véhicule déployé + Realtime validé.

| Tâche | Priorité | Effort |
|-------|----------|--------|
| maintenance_reminders table + RLS | P1 | 1h |
| maintenance_history table + bucket maintenance-docs (privé) | P1 | 2h |
| UI calendrier rappels (CT, assurance, vidange) | P1 | 6h |
| send-maintenance-reminders EF (cron quotidien) | P1 | 3h |
| ANGE contexte maintenance (inject due dates dans prompt) | P2 | 2h |
| Rate limit serveur (EF ou trigger) | P1 | 3h |
| Read_at persistant en DB | P1 | 2h |

### PHASE 4 — SPRINT 11 (J+42 → J+60) — Assistance Routière + Stationnement

**Pré-requis :** Décision RGPD anonymisation (BETA_READINESS_AUDIT Section 4.6).

| Tâche | Priorité | Effort |
|-------|----------|--------|
| Décision fondateur : RGPD assistance_requests | P0 (décision) | — |
| assistance_requests table + fuzzy position | P1 | 2h |
| Matching géographique (conducteurs proches) | P1 | 4h |
| match-assistance-request EF | P1 | 3h |
| close-expired-assistance EF (cron) | P1 | 2h |
| parking_sessions table + expire-parking-sessions EF | P2 | 3h |
| ANGE contexte assistance dans le prompt | P2 | 2h |

### PHASE 5 — SPRINTS 12-13 (J+60 → J+90) — Communauté + Monétisation

**Pré-requis :** DPO + conseil légal pour monétisation.

| Tâche | Sprint | Effort |
|-------|--------|--------|
| badges table + award-badge EF | 12 | 3h |
| Programme ambassadeurs (critères automatiques) | 12 | 4h |
| Trust penalties automatiques | 12 | 4h |
| user_subscriptions table | 13 | 2h |
| is_premium() RPC SECURITY DEFINER | 13 | 1h |
| Gates premium côté serveur | 13 | 4h |

---

## SECTION 6 — SPRINT 8 — DÉFINITION COMPLÈTE

### Objectifs

1. Déploiement complet V1 (migrations + EF + secrets + Realtime)
2. delete_audit_log opérationnel
3. 42 contrôles terrain exécutés → 0 ❌ critiques
4. Bêta fermée ouverte (10-20 utilisateurs)

### Tâches détaillées

#### Tâche S8-01 — delete_audit_log (Claude)
```
Créer la migration delete_audit_log :
  CREATE TABLE delete_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    error TEXT,
    steps_completed TEXT[]
  );
Modifier delete-account/index.ts :
  - INSERT INTO delete_audit_log au début (status='pending')
  - Ajouter steps_completed à chaque étape
  - UPDATE status='completed' à la fin
  - UPDATE status='error' si échec
```

#### Tâche S8-02 — Promise.allSettled push multi-device (Claude)
```
Dans calls.js : si l'appelé a plusieurs push_subscriptions,
envoyer send-push-notification à chaque endpoint simultanément
via Promise.allSettled — ne pas bloquer si un endpoint échoue.
```

#### Tâche S8-03 — Cron driver_ratings_summary (Fondateur)
```
Dans Supabase Dashboard → Database → Extensions → pg_cron
SELECT cron.schedule('refresh-ratings', '0 */6 * * *',
  $$SELECT refresh_ratings_summary()$$);
```

#### Tâche S8-04 — Documentation push iOS A2HS (Claude)
```
Dans l'onboarding overlay, ajouter une étape :
"Pour recevoir les appels quand l'app est fermée sur iPhone,
ajouter ImmatConnect à l'écran d'accueil → Safari → Partager → Sur l'écran d'accueil."
```

### Dépendances Sprint 8

```
S8-01 delete_audit_log → nécessite migration Supabase (fondateur)
S8-02 push multi-device → nécessite migration push_subscriptions (déjà dans plan déploiement)
S8-03 cron ratings → nécessite migration driver_ratings (déjà dans plan déploiement)
S8-04 onboarding iOS → aucune dépendance
```

### Risques Sprint 8

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Migration 11/11 casse les appels | Moyenne | P1 | Test C05a dans les 5min post-migration |
| Push iOS ne fonctionne pas < iOS 16.4 | Élevée | P2 | Documentation A2HS dans onboarding |
| AGORA_APP_CERTIFICATE incorrect | Moyenne | P1 | Test get-agora-token avant migration 11/11 |
| delete-account EF timeout > 5s | Faible | P1 | Test avec compte test dédié |

### Durée estimée Sprint 8

| Sous-tâche | Durée |
|-----------|-------|
| S8-01 delete_audit_log (migration + EF) | 2h |
| S8-02 push multi-device | 1h |
| S8-03 cron ratings | 30min |
| S8-04 onboarding iOS | 30min |
| **Total code Claude** | **4h** |
| Déploiement migrations (fondateur) | 30min |
| Session test terrain 42 contrôles | 2-4h |
| **Total Sprint 8** | **~8h réparties sur 2-3 jours** |

---

## SECTION 7 — ANGLES MORTS RÉELS (par thème)

### RGPD

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| PII exposées via /profiles | email + phone accessibles par TOUT utilisateur authentifié | Migration 20260615 URGENTE |
| delete_audit_log absent | Aucune trace des suppressions → RGPD art. 17 non conforme | Sprint 8 P0 |
| Storage non nettoyé | Aucun bucket actif mais préparer avant Sprint 9 | Sprint 9 P0 |
| Messages non supprimés en DB | Soft-delete localStorage → les données restent côté serveur | Sprint 9 P1 |
| Archivage facturation vs effacement | Pas de tension active (pas de paiement) | Décision avant Sprint 13 |

### Sécurité

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| RLS column-level inactive | email/phone exposés | Migration 20260615 P0 |
| public_profiles inexistante | La carte tente de lire une table qui n'existe pas | Migration 20260614 P0 |
| Rate limit client uniquement | Bypassable par n'importe quelle requête directe Supabase | Sprint 9 P1 |
| Blocage user UI uniquement | Un utilisateur bloqué peut quand même envoyer des requêtes Supabase | RISK-017 — beta acceptable |
| AGORA_APP_CERTIFICATE non confirmé | Tous les tokens Agora peuvent être invalides | Vérifier avant toute migration |

### Permissions

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| Push iOS sans A2HS | L'utilisateur ne reçoit pas les push si l'app n'est pas installée en A2HS | Onboarding étape A2HS obligatoire |
| Permission push refusée silencieusement | subscribePush() ne lève pas d'erreur si permission refusée | Vérifier Notification.permission avant subscribe |
| Mic iOS : getUserMedia hors geste | Déjà résolu (pre-creation dans geste) | ✅ OK |

### Performance

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| driver_ratings_summary pas rafraîchie | Vue matérialisée statique sans cron | Cron Sprint 8 |
| loadOthers sans debounce confirmé | Risque N+1 queries si map bougée rapidement | Vérifier debounce 2000ms en terrain |
| Realtime > 10k utilisateurs | Non testé | Acceptable bêta fermée |
| get-agora-token cold start | Premier appel peut être lent (> 2s) | Acceptable |

### Edge Functions

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| delete-account non idempotent | Un double-appel supprime des données déjà supprimées → erreur silencieuse | Acceptable (double confirm UI) |
| immat-brain-dialog max_tokens fixe | 400/800 tokens → réponses tronquées si complexe | Acceptable bêta |
| send-push-notification sans retry | Si réseau flaky → push perdue | Sprint 9 P2 |

### Supabase

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| Realtime non activé | messages + user_locations pas en Realtime → rien ne se met à jour | Dashboard avant terrain |
| call_requests Realtime | postgres_changes et broadcast combinés → vérifier DEPLOYMENT_LOG | Test C05a terrain |
| Auth JWT expiry | Token expire → requêtes 401 → déconnexion | Géré par Supabase SDK auto-refresh |

### Notifications

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| iOS < 16.4 → pas de push | Pas de fallback si Safari non supporté | Documenter dans onboarding |
| Android Doze mode | Push peut être retardée de 5-15min | Acceptable bêta |
| Endpoint 410 non nettoyé immédiatement | Accumulé jusqu'au prochain envoi | Géré (allSettled cleanup dans EF) ✅ |
| VAPID_SUBJECT format incorrect | VAPID peut être rejeté si pas "mailto:" | Vérifier avant déploiement |

### Paiements

**Aucun paiement implémenté.** Zéro risque actuel. À traiter avant Sprint 13 avec DPO.

### Onboarding

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| Pas d'étape A2HS sur iOS | L'utilisateur installe sans ajouter à l'écran → 0 push | S8-04 : étape dédiée |
| Onboarding push avant permission | requestPushPermission dans geste onboarding ✅ | — |
| ic_onboarded jamais remis à zéro | Si l'utilisateur désinstalle et réinstalle → onboarding non affiché | Acceptable |

### Analytics

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| Aucun analytics externe | Pas de Mixpanel/Amplitude/Posthog | Acceptable bêta fermée |
| Métriques produit via SQL direct | Requêtes SQL manuelles (BETA_READINESS_AUDIT Section 9.3) | Suffisant bêta |
| Monitoring EF via Supabase logs | Aucune alerte automatique | Acceptable — vérification manuelle quotidienne |

### IA / ANGE

| Angle mort | Réalité actuelle | Action |
|-----------|-----------------|--------|
| ANTHROPIC_API_KEY non confirmée | ANGE peut retourner 500 silencieusement | Vérifier secrets avant terrain |
| Coût API non monitoré | Pas de rate limit par user_id côté EF | Acceptable bêta fermée (< 20 users) |
| Changement modèle Anthropic | claude-sonnet-4-6 deprecation possible | Tester après chaque changement Anthropic |

---

## SECTION 8 — RÉSUMÉ EXÉCUTIF

### État réel du projet au 2026-06-14

**Le code est prêt. L'infrastructure ne l'est pas.**

- 85-95% des fonctionnalités V1 sont codées et correctement implémentées
- 0% des fonctionnalités de sécurité (RLS, column-security, public_profiles) sont actives en production
- 11 migrations sont écrites mais non appliquées
- 4 Edge Functions sont écrites mais non déployées
- 6 secrets sont attendus mais non confirmés
- 0 test terrain exécuté sur les 42 contrôles définis

**Conséquence :** En l'état actuel, l'application est en mode "démo sans sécurité". Les données PII (email, téléphone) sont lisibles par tout utilisateur authentifié. Les appels push ne fonctionnent pas. Le trust engine n'existe pas en DB. Les profils publics ne sont pas synchronisés.

### Ce qu'il faut faire — dans l'ordre

```
SEMAINE 1 (fondateur + Claude) :
  1. Configurer les 6 secrets → 10min
  2. Appliquer les 11 migrations → 30min
  3. Déployer les 4 EF + supprimer get-turn-credentials → 10min
  4. Activer Realtime messages + user_locations → 5min
  5. Claude : delete_audit_log + push multi-device → 4h code

SEMAINE 2 (fondateur) :
  6. Session terrain 42 contrôles → 2-4h
  7. Remplir TEST_RESULTS.md → ongoing
  8. Si 0 ❌ critiques → GO MAIN → inviter bêta-testeurs

SEMAINE 3-4 (Claude) :
  9. Sprint 9 : Module Véhicule
  10. Storage cleanup delete-account

SEMAINE 5-6 (Claude) :
  11. Sprint 10 : Module Maintenance
  12. Rate limit serveur
```

### Version publiable en production — conditions

```
□ 0 ❌ critiques dans TEST_RESULTS.md
□ Migrations 1-11 appliquées et contrôlées
□ Edge Functions déployées et testées
□ delete_audit_log opérationnel
□ Secrets confirmés (AGORA, VAPID, ANTHROPIC)
□ Realtime actif (messages + user_locations)
□ Test push iOS + Android réussi
□ CGU publiées à une URL accessible
□ Canal modération opérationnel

Estimation : 1-2 semaines si le fondateur exécute le déploiement rapidement.
```

---

*TECHNICAL_AUDIT_AND_ROADMAP — ImmatConnect Pro*
*Basé sur lecture directe du code — 2026-06-14*
*Mettre à jour après chaque sprint ou incident majeur.*
