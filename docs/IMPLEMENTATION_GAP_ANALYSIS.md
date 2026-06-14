# IMPLEMENTATION GAP ANALYSIS — ImmatConnect Pro
## Audit d'exécution · Plan de développement concret

**Date :** 2026-06-13  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Sources analysées :** code source complet (index.html, calls.js v17, messages.js, service-worker.js, core/*, supabase/*), AUDIT_GLOBAL_V2.md, MASTER_PLAN.md  
**Méthodologie :** lecture intégrale de tous les fichiers + confrontation avec les documents de référence  

---

## RÉSUMÉ EXÉCUTIF

ImmatConnect Pro est **fonctionnel à ~35% du MASTER_PLAN**.

Les fondations techniques sont solides (Agora RTC validé terrain, Supabase Realtime, SW v21 network-first, messages en temps réel). Tous les bugs critiques d'appel sont résolus (2026-06-12).

**Ce qui bloque le lancement public aujourd'hui :**
1. **Pas de push notifications** — si l'app est fermée, aucun appel n'arrive
2. **Bouton urgence 15/17/18 absent** — risque éthique pour enfant/animal dans véhicule
3. **Appels dans Messages** — l'historique d'appels est invisible, la valeur de l'appel vocal est masquée
4. **Blocages en localStorage** — non persistés, effaçables, non cross-device
5. **InteractionEngine double-émission** — cause racine non corrigée, bugs latents restants

**Le MASTER_PLAN est un document de 31 lignes.** Il liste des sections à compléter. L'AUDIT_V2 est la vraie référence fonctionnelle. Ce document confronte l'AUDIT_V2 au code réel.

---

## 1. MATRICE DES FONCTIONNALITÉS

### Légende
- **✅ Existe** : implémenté et fonctionnel en production
- **⚠️ Partiel** : code présent mais incomplet ou non conforme au plan
- **❌ Absent** : aucune implémentation, à créer de zéro

### 1.1 Navigation & Structure

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Welcome screen (logo + 2 boutons) | ✅ | — | — | — |
| Auth (login / signup / reset pwd) | ✅ | — | — | — |
| Profil setup (plaque, pseudo, couleur) | ✅ | — | — | — |
| Navigation bottom 3 onglets actuels | ✅ | — | — | — |
| **Navigation 5 onglets (MASTER_PLAN)** | ❌ | P0 | Moyen | Refacto nav |
| **Onglet Appels séparé** | ❌ | P0 | Moyen | icAppelsPane existe, nav à refaire |
| Drawer latéral (profil, paramètres) | ✅ | — | — | — |
| Connexion sociale (Google/Apple) | ❌ | P3 | Élevé | Supabase OAuth providers |

### 1.2 Carte & Radar

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Carte Leaflet avec marqueurs | ✅ | — | — | — |
| Vehicle context menu (Message/Signaler/Bloquer) | ✅ | — | — | — |
| FAB stack (recentrer, proches, vue, SOS) | ✅ | — | — | — |
| Conducteurs proches (nearbyPanel) | ✅ | — | — | — |
| Rayon de détection ajustable | ✅ | — | — | — |
| Bouton "Signaler ici" contextuel (FAB carte) | ⚠️ | P2 | Faible | fabSignalHere existe, logique partielle |
| Clustering marqueurs (zones denses) | ❌ | P2 | Moyen | Leaflet.markercluster |
| Filtre type d'alerte sur la carte | ❌ | P2 | Faible | — |

### 1.3 Signalement

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Étape 1 : choix Route / Véhicule / Aide | ✅ | — | — | — |
| sigStep2Route : 6 types (accident, bouchon…) | ✅ | — | — | — |
| sigStep2Aide : 6 types (panne, carburant…) | ✅ | — | — | — |
| sigStep2Vehicle : 6 types (pneu, feu…) | ⚠️ | P1 | Moyen | Manque urgences critiques, messages pré-rédigés |
| **Bouton 🚨 urgence 15/17/18** | ❌ | **P0** | **Faible** | À ajouter avant les formulaires |
| **Flux 3 clics (plaque → type → envoyer)** | ❌ | P1 | Moyen | sigStep2Vehicle à restructurer |
| **Messages pré-rédigés par type** | ❌ | P1 | Faible | 18 templates à écrire |
| **Réponses rapides propriétaire (J'arrive/Résolu)** | ❌ | P1 | Moyen | FloatingCard + reports table |
| **ResolutionCenter (modal suivi)** | ❌ | P1 | Élevé | Table reports + colonnes manquantes |
| Fusion serveur (déduplication signalements) | ❌ | P3 | Moyen | Edge Function + confirmation_count |
| Photo signalement Phase 2 (1 photo) | ❌ | P2 | Élevé | Supabase Storage bucket |
| Photo signalement Phase 3 (multi + IA) | ❌ | P3 | Très élevé | — |
| Cooldown SOS 15 min | ❌ | P1 | Faible | — |
| Confirmation "Êtes-vous sûr ?" avant SOS | ❌ | P1 | Faible | — |
| Alertes actives route dans panelAltet | ✅ | — | — | — |
| Historique mes signalements | ⚠️ | P2 | Moyen | alertHistoryBox existe, données partielles |

### 1.4 Messages

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Liste conversations (icMsgList) | ✅ | — | — | — |
| Thread iMessage-style (icThread) | ✅ | — | — | — |
| Réponses rapides (4 boutons) | ✅ | — | — | — |
| Recherche conversations | ✅ | — | — | — |
| Nouveau message (icComposePanel) | ✅ | — | — | — |
| Timeline unifiée messages + appels dans thread | ✅ | — | — | — |
| Accusé de lecture (vu à X) | ❌ | P2 | Moyen | messages.read_at + Realtime |
| Suppression conversation (soft delete) | ⚠️ | P2 | Faible | UI partielle |
| Blocage depuis thread | ✅ | — | — | — |
| Synchronisation lectures cross-device | ❌ | P2 | Moyen | device_id + postgres_changes |

### 1.5 Appels vocaux

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Appels vocaux Agora RTC | ✅ | — | — | — |
| Overlay entrant (callIncomingPopup) | ✅ | — | — | — |
| Overlay sortant (callSentBanner) | ✅ | — | — | — |
| Overlay plein écran (callOverlay full) | ✅ | — | — | — |
| Overlay mini en cours (callOvMini) | ✅ | — | — | — |
| Mute / Raccrocher | ✅ | — | — | — |
| **Haut-parleur (toggleSpeaker)** | ❌ | P2 | Moyen | Agora setSinkId — stub présent |
| **Journal appels séparé (historique)** | ⚠️ | **P0** | Moyen | icAppelsPane existe, nav absente |
| Historique détaillé (durée, end_reason) | ❌ | P1 | Moyen | call_requests colonnes manquantes |
| Badge appels manqués (rouge) | ⚠️ | P0 | Faible | Existe partiel — pas dans nav dédiée |
| Bouton "Rappeler" depuis historique | ❌ | P1 | Faible | — |
| **"Appel pris sur autre appareil"** | ❌ | P1 | Moyen | accepted_device_id dans call_requests |
| Anti double-join Agora | ✅ | — | — | — |
| _terminalRequestIds (stale events) | ✅ | — | — | — |
| Pré-capture micro iOS (gesture) | ✅ | — | — | — |
| Token Agora via Edge Function | ✅ | — | — | — |

### 1.6 Notifications

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Sonnerie téléphone (WAV in-app) | ✅ | — | — | — |
| Toast notifications in-app | ✅ | — | — | — |
| FloatingCard alertes véhicule | ✅ | — | — | — |
| Unlock audio iOS (gesture) | ✅ | — | — | — |
| **Push SW Level 2 (VAPID / Web Push)** | ❌ | **P0** | **Élevé** | service-worker.js sans `push` listener |
| **Push APNs iOS Level 3** | ❌ | P1 | Très élevé | Apple Developer $99/an |
| **Push FCM Android Level 4** | ❌ | P2 | Élevé | Firebase projet |
| Demande permission push (onboarding) | ❌ | P0 | Faible | — |
| Préférences notifications (UI) | ❌ | P1 | Moyen | panelSettings — settings_section manquante |

### 1.7 Activity

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| panelActivite avec 3 catégories | ✅ | — | — | — |
| Onglets Reçus/Envoyés par catégorie | ✅ | — | — | — |
| actCatFeed (fil d'alertes communautaires) | ✅ | — | — | — |
| Résumé rapide (nouveaux/en cours/traités) | ✅ | — | — | — |
| **Fil unifié messages + appels + signalements** | ❌ | P2 | Élevé | InteractionEngine domain/direction |
| **Filtres type + direction + période** | ⚠️ | P2 | Moyen | Partiel : onglets Reçus/Envoyés présents |
| **Horodatage relatif ("il y a 5 min")** | ❌ | P2 | Faible | — |
| Appels manqués dans Activity | ❌ | P1 | Moyen | — |
| Badge Activity unifié | ⚠️ | P1 | Faible | actBadge existe, calcul partiel |

### 1.8 Architecture interne

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| InteractionEngine (base, localStorage) | ✅ | — | — | — |
| ImmatBus (event bus) | ✅ | — | — | — |
| ImmatOrganism | ✅ | — | — | — |
| Gardien Dashboard (8 voyants) | ✅ | — | — | — |
| Global Verification Center | ✅ | — | — | — |
| Guardian Loop | ✅ | — | — | — |
| **Double-émission InteractionEngine fix** | ❌ | P1 | Moyen | interaction-engine.js _emitObd() |
| **Règle type/domain/direction/status** | ❌ | P1 | Moyen | InteractionEngine à étendre |
| Blocages (BLOCK_ALL/BLOCK_CALLS localStorage) | ✅ | — | — | — |
| **Blocages persistés DB** | ❌ | P1 | Moyen | Table user_blocks |
| **device_id (multi-appareils)** | ❌ | P1 | Faible | localStorage UUID |
| Heartbeat device_sessions | ❌ | P2 | Moyen | Table device_sessions |
| Build version visible (APP_BUILD) | ❌ | P2 | Faible | — |
| SW version mismatch detection | ❌ | P2 | Faible | service-worker.js headers |

### 1.9 Sécurité & RGPD

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| owner_plate immuable (INV-006) | ✅ | — | — | — |
| Payload anonymisé Edge Functions | ✅ | — | — | — |
| AGORA_APP_CERTIFICATE dans secrets | ✅ | — | — | — |
| Anti-abus RLS côté serveur | ⚠️ | P1 | Faible | UI feedback manquant |
| Rate limiting appels (3/10min) | ❌ | P2 | Moyen | — |
| Rate limiting messages (5/1min) | ❌ | P2 | Moyen | — |
| Cooldown SOS (15 min) | ❌ | P1 | Faible | — |
| Trust Engine (score implicite) | ❌ | P2 | Élevé | Table user_reputation |
| Anti-abus logging | ❌ | P2 | Moyen | Table abuse_events |
| **RGPD — export données** | ❌ | P1 | Élevé | Edge Function export-user-data |
| **RGPD — suppression compte** | ❌ | P1 | Élevé | Edge Function delete-account |
| Effacement ic_pending_profile après signup | ❌ | P1 | Faible | Données en clair localStorage |
| Géolocalisation approximative (200m) | ❌ | P2 | Faible | approximatePosition() à implémenter |

### 1.10 Vision long terme

| Fonctionnalité | État | Priorité | Effort | Dépendances |
|---|---|---|---|---|
| Multi-véhicules (table vehicles) | ❌ | P3 | Élevé | — |
| DelegationManager | ❌ | P3 | Très élevé | vehicles + vehicle_delegates |
| Changement de plaque (flow admin) | ❌ | P3 | Élevé | — |
| Plaques internationales (BE/CH/LU) | ❌ | P3 | Moyen | PLATE_FORMATS |
| Historique véhicule (export PDF) | ❌ | P3 | Élevé | — |
| Navigation GPS (panelDrive) | ✅ | — | — | — |
| AI dialog Ange | ✅ | — | — | — |
| KPI dashboard produit | ❌ | P3 | Élevé | Analytics |

---

## 2. AUDIT ÉCRAN PAR ÉCRAN

### Écran 1 — Welcome (`sw`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Logo + baseline | ✅ | ✅ |
| Boutons Connexion / Inscription | ✅ | ✅ |
| 3 phrases d'accroche valeur | ❌ | ❌ non conforme |
| Animation/capture overlay appel | ❌ | ❌ non conforme |
| Mention "Gratuit · Sans pub" | ❌ | ❌ non conforme |

**Verdict : fonctionnel mais conversion sous-optimale. P2.**

---

### Écran 2 — Auth (`sa`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Login / Signup tabs | ✅ | ✅ |
| Validation format plaque FR | ✅ | ✅ |
| Mot de passe oublié | ✅ | ✅ |
| Confirmation "Email envoyé" | ⚠️ | ❌ — authSt affiche, mais expérience minimale |
| Connexion sociale | ❌ | ❌ — P3 |

**Verdict : conforme pour le MVP. P3 pour social login.**

---

### Écran 3 — Carte radar (`appScreen`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Carte Leaflet + marqueurs | ✅ | ✅ |
| Vehicle context menu | ✅ | ✅ |
| SOS long-press | ✅ | ✅ |
| FAB recentrer / proches / vue | ✅ | ✅ |
| Bouton "Signaler ici" (contextuel) | ⚠️ | ❌ — existe mais logique incomplète |
| Clustering marqueurs | ❌ | ❌ — P2 |
| Filtre type d'alerte | ❌ | ❌ — P2 |

**Verdict : conforme pour MVP. Améliorations P2.**

---

### Écran 4 — Signaler (`panelAltet`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Catégories Route / Véhicule / Aide | ✅ | ✅ |
| sigStep2Route (6 types) | ✅ | ✅ |
| sigStep2Vehicle (6 types de base) | ⚠️ | ❌ — manque flux 3-clics, messages pré-rédigés |
| **Bouton urgence 15/17/18** | ❌ | ❌ — **BLOQUANT ÉTHIQUE** |
| sigStep2Aide (6 types) | ✅ | ⚠️ — manque confirmation SOS |
| Indicateur "Position sélectionnée" | ✅ | ✅ |
| ResolutionCenter | ❌ | ❌ — absent |
| Messages pré-rédigés | ❌ | ❌ — absent |
| Réponses rapides propriétaire | ❌ | ❌ — FloatingCard basique seulement |

**Verdict : PARTIELLEMENT CONFORME. P0 sur urgence. P1 sur flux véhicule + ResolutionCenter.**

---

### Écran 5 — Messages (`panelMessages`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Liste conversations | ✅ | ✅ |
| Thread iMessage-style | ✅ | ✅ |
| Réponses rapides | ✅ | ✅ |
| Recherche | ✅ | ✅ |
| Nouveau message | ✅ | ✅ |
| **Appels HORS de ce panneau** | ❌ | ❌ — appels encore ici |
| Accusé de lecture | ❌ | ❌ — P2 |

**Verdict : conforme pour messages. NON CONFORME pour la présence des appels.**

---

### Écran 6 — Appels (dans `icAppelsPane`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| icAppelsPane (journal) | ⚠️ | ❌ — caché dans Messages, pas de nav dédiée |
| icCallLog | ⚠️ | ❌ — structure présente, contenu partiel |
| Badge appels manqués | ⚠️ | ❌ — pas dans nav principale |
| Bouton "Passer un appel" | ❌ | ❌ — absent depuis l'onglet dédié |
| Filtres Tous/Manqués/Émis/Reçus | ❌ | ❌ — absent |
| Détail (durée, end_reason) | ❌ | ❌ — call_requests colonnes manquantes |

**Verdict : NON CONFORME. P0 : l'onglet Appels n'est pas dans la nav principale.**

---

### Écran 7 — Activity (`panelActivite`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| 3 catégories communautaires | ✅ | ⚠️ — alertes communautaires ≠ fil unifié |
| Onglets Reçus / Envoyés | ✅ | ✅ |
| actCatFeed | ✅ | ⚠️ — communautaire uniquement |
| **Fil unifié messages + appels + signalements** | ❌ | ❌ — absent |
| Appels manqués visibles ici | ❌ | ❌ — absent |
| Filtres type + période | ❌ | ❌ — absent |
| Horodatage relatif | ❌ | ❌ — absent |

**Verdict : NON CONFORME au MASTER_PLAN. L'Activity actuelle = alertes communautaires. Le fil unifié est absent. P2.**

---

### Écran 8 — Paramètres (`panelSettings`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Profil (modifier) | ✅ | ✅ |
| Bloqués | ✅ | ✅ |
| Récents | ✅ | ✅ |
| Confidentialité | ✅ | ✅ |
| Sons | ✅ | ✅ |
| Niveaux d'accès appels (1-4) | ✅ | ✅ |
| Ne pas déranger | ✅ | ✅ |
| Présence (statuts) | ✅ | ✅ |
| Dashboard Gardien | ✅ | ✅ |
| **Préférences notifications push** | ❌ | ❌ — absent |
| **Mon véhicule (multi-véhicules)** | ❌ | ❌ — P3 |
| **Export données / Suppression compte** | ❌ | ❌ — RGPD P1 |

**Verdict : conforme sur les fonctions de base. RGPD P1 manquant.**

---

### Écran 9 — Dashboard Gardien (`gardienDashboard`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| 8 voyants actuels | ✅ | ✅ |
| Bouton "Global" (Verification Center) | ✅ | ✅ |
| **CALL HEALTH complet** | ⚠️ | ❌ — partiel |
| **SIGNAL HEALTH** | ❌ | ❌ — absent |
| **NOTIFICATION HEALTH** | ⚠️ | ❌ — partiel |
| **MULTI-DEVICE HEALTH** | ❌ | ❌ — absent |
| **SW version réseau vs cache** | ✅ | ✅ |

**Verdict : conforme pour la base. Extensions P3.**

---

### Écran 10 — Onboarding (`onboardingOverlay`)
| Élément | État | Conforme MASTER_PLAN |
|---|---|---|
| Overlay onboarding présent | ✅ | ✅ |
| Demande permission push | ❌ | ❌ — **critique pour adoption** |
| Explication permissions micro | ❌ | ❌ — manquant |

**Verdict : incomplet sur les permissions critiques. P0 pour push permission.**

---

## 3. AUDIT BASE DE DONNÉES

### 3.1 Tables existantes (confirmées)

| Table | État | Manques identifiés |
|---|---|---|
| `profiles` | ✅ | Manque : `plate_country`, `is_admin`, `notification_prefs`, `push_endpoint` |
| `call_requests` | ✅ | Manque : `connected_at`, `ended_at`, `duration_seconds`, `end_reason`, `agora_channel`, `accepted_device_id` |
| `messages` | ✅ | Manque : `delivered_at`, `read_at`, `replied_at`, `archived_at`, `deleted_by_sender`, `deleted_by_receiver` |
| `reports` | ✅ | Manque : `delivered_at`, `seen_at`, `actioned_at`, `resolved_at`, `resolution_note`, `resolver_id`, `photo_url`, `urgency_level`, `confirmation_count`, `is_disputed` |
| `user_locations` | ✅ | TTL effacement auto 30 min à vérifier |

### 3.2 Tables manquantes (à créer)

```sql
-- P1 : Blocages persistés cross-device
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users,
  blocked_plate TEXT NOT NULL,
  block_level TEXT NOT NULL DEFAULT 'BLOCK_ALL', -- 'BLOCK_ALL' | 'BLOCK_CALLS'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_plate)
);

-- P1 : Multi-appareils
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  device_id TEXT NOT NULL,
  platform TEXT, -- 'ios' | 'android' | 'web'
  last_seen TIMESTAMPTZ DEFAULT now(),
  push_subscription JSONB,
  UNIQUE(user_id, device_id)
);

-- P2 : Anti-abus logging
CREATE TABLE abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users,
  reported_user_id UUID REFERENCES auth.users,
  reported_plate TEXT,
  event_type TEXT, -- 'spam_call' | 'false_signal' | 'harassment' | 'abuse_sos'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID,
  action_taken TEXT
);

-- P2 : Trust Engine
CREATE TABLE user_reputation (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  signals_sent INT DEFAULT 0,
  signals_confirmed INT DEFAULT 0,
  signals_disputed INT DEFAULT 0,
  abuse_reports INT DEFAULT 0,
  trust_score FLOAT GENERATED ALWAYS AS (
    CASE WHEN signals_sent = 0 THEN 0.5
    ELSE signals_confirmed::float / signals_sent END
  ) STORED,
  suspended_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P3 : Multi-véhicules
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users,
  plate TEXT NOT NULL UNIQUE,
  label TEXT,
  color TEXT,
  type TEXT DEFAULT 'car',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P3 : Délégations
CREATE TABLE vehicle_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles,
  delegate_user_id UUID REFERENCES auth.users,
  role TEXT DEFAULT 'driver',
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Colonnes prioritaires à ajouter

```sql
-- P1 : call_requests — suivi complet du cycle de vie
ALTER TABLE call_requests
  ADD COLUMN connected_at TIMESTAMPTZ,
  ADD COLUMN ended_at TIMESTAMPTZ,
  ADD COLUMN duration_seconds INT,
  ADD COLUMN end_reason TEXT, -- 'hangup' | 'missed' | 'refused' | 'error'
  ADD COLUMN agora_channel TEXT,
  ADD COLUMN accepted_device_id TEXT; -- multi-device

-- P1 : reports — ResolutionCenter
ALTER TABLE reports
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN seen_at TIMESTAMPTZ,
  ADD COLUMN actioned_at TIMESTAMPTZ,
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolution_note TEXT,
  ADD COLUMN resolver_id UUID,
  ADD COLUMN urgency_level TEXT, -- 'low' | 'medium' | 'high' | 'critical'
  ADD COLUMN confirmation_count INT DEFAULT 0,
  ADD COLUMN is_disputed BOOLEAN DEFAULT false;

-- P2 : reports — Photo (Phase 2)
ALTER TABLE reports
  ADD COLUMN photo_url TEXT;

-- P1 : messages — cycle de vie complet
ALTER TABLE messages
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN read_at TIMESTAMPTZ,
  ADD COLUMN replied_at TIMESTAMPTZ,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN deleted_by_sender BOOLEAN DEFAULT false,
  ADD COLUMN deleted_by_receiver BOOLEAN DEFAULT false;
```

### 3.4 Index manquants (performance)

```sql
-- Requêtes fréquentes non indexées
CREATE INDEX idx_call_requests_receiver_status ON call_requests(receiver_id, status);
CREATE INDEX idx_call_requests_requester_status ON call_requests(requester_id, status);
CREATE INDEX idx_messages_receiver_plate ON messages(receiver_plate);
CREATE INDEX idx_reports_plate_status ON reports(plate, status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
```

### 3.5 RLS manquantes

| Table | RLS actuelle | Manque |
|---|---|---|
| `call_requests` | ✅ partielle | RLS sur `accepted_device_id` UPDATE |
| `messages` | ✅ partielle | RLS lecture : sender OU receiver uniquement |
| `reports` | ✅ partielle | RLS résolution : seul le receiver peut UPDATE status |
| `user_blocks` | ❌ à créer | INSERT : blocker = auth.uid() seulement |
| `device_sessions` | ❌ à créer | SELECT/INSERT : user_id = auth.uid() seulement |
| `abuse_events` | ❌ à créer | INSERT : reporter = auth.uid(), SELECT : admin only |
| `user_reputation` | ❌ à créer | SELECT : public read-only, UPDATE : backend only |

---

## 4. AUDIT PRODUCTION — BLOCKERS APP STORE / PLAY STORE

### 4.1 Blockers absolus (lancement impossible sans)

| # | Blocker | Raison | Effort |
|---|---|---|---|
| B1 | **Pas de push notifications** | Sur iOS, app fermée = aucun appel, aucune alerte. L'app est inutilisable en dehors de l'écran. | Très élevé |
| B2 | **Bouton urgence 15/17/18 absent** | Cas enfant/animal dans véhicule : l'app suggère d'appeler ImmatConnect avant les secours. **Risque légal + éthique.** | Faible |
| B3 | **RGPD — pas de suppression de compte** | Obligation légale (Art. 17). Refus probable App Store. | Élevé |
| B4 | **RGPD — pas d'export de données** | Obligation légale (Art. 15 + 20). | Élevé |
| B5 | **ic_pending_profile** stocke email/téléphone en clair | Donnée sensible accessible à tout JS de la page. Violation RGPD. | Faible |

### 4.2 Blockers fonctionnels majeurs

| # | Blocker | Impact |
|---|---|---|
| F1 | Appels manqués = invisibles si app fermée | Perte de valeur principale du produit |
| F2 | Blocages non persistés DB | Utilisateur peut contourner le blocage en vidant le cache |
| F3 | InteractionEngine double-émission | Bugs latents sur toutes les transitions d'état |
| F4 | Résolution signalement = impossible | Pas de ResolutionCenter, pas de "J'arrive / Résolu" |
| F5 | Haut-parleur = stub vide | Appelant iOS doit tenir le téléphone à l'oreille (inutilisable en conduisant) |

### 4.3 Aspects App Store spécifiques

| Aspect | État | Action requise |
|---|---|---|
| Privacy manifest (iOS 17+) | ❌ Absent | Créer `PrivacyInfo.xcprivacy` — obligatoire App Store 2024+ |
| Politique de confidentialité URL | ❌ Absent | Créer une page `/privacy-policy` accessible |
| Support contact visible | ❌ Absent | Email de contact dans les métadonnées App Store |
| Screenshots + description App Store | ❌ Absent | À préparer pour soumission |
| PWA manifest icons (Apple) | ⚠️ Partiel | icon-192.png présent, mais apple-touch-icon manquant |
| Onboarding permissions | ❌ Absent | iOS exige une explication avant demande permission micro |

---

## 5. INCOHÉRENCES IDENTIFIÉES

### 5.1 Code vs MASTER_PLAN

| Incohérence | Code actuel | MASTER_PLAN |
|---|---|---|
| Navigation | 3 onglets (Signaler, Messages, Activité) | 5 onglets (Accueil, Communiquer, Signaler, Activity, Paramètres) |
| Appels | Dans `panelMessages` / `icAppelsPane` | Onglet dédié Communiquer/Appels |
| Activity | Alertes communautaires par catégorie | Fil unifié filtrable (messages + appels + signalements) |
| Inbox/Outbox | Absents (jamais implémentés) | Mentionnés dans MASTER_PLAN (31 lignes) → remplacés par Activity |
| OBD | panelDrive (GPS navigation) + core/obdGateway | Dashboard Gardien uniquement selon MASTER_PLAN |

**Décision recommandée :** Le MASTER_PLAN (31 lignes) est obsolète sur la structure de navigation. L'AUDIT_V2 est la référence correcte. Ne pas implémenter Inbox/Outbox séparés.

### 5.2 Code vs AUDIT_V2

| Incohérence | Code actuel | AUDIT_V2 |
|---|---|---|
| Service Worker | Aucun `push` event listener | Niveau 2 : Web Push VAPID |
| SOS button | Long-press FAB sur carte | Écran dédié avec 15/17/18 en premier |
| Vehicle signals | 6 types avec `vehicleAlertQuick()` | 18 cas + flux 3-clics + messages pré-rédigés |
| FloatingCard | "Vu" + "→" | "J'arrive" + "C'est réglé" + "Précisez" + "Bloquer" |
| icAppelsPane | Présent mais caché dans Messages | Onglet dédié avec badge + filtres |
| call_requests | 9 colonnes | 15 colonnes (cycle de vie complet) |
| reports | ~10 colonnes | ~18 colonnes (ResolutionCenter) |

### 5.3 Redondances et complexité inutile

| Élément | Problème | Recommandation |
|---|---|---|
| `call-webrtc.js` | Ancienne implémentation WebRTC remplacée par Agora | **Supprimer** |
| `get-turn-credentials/index.ts` | Edge Function pour l'ancien WebRTC | **Supprimer** |
| `panelDrive` | Panel GPS navigation quasi-inutilisé, non dans nav principale | **Réduire ou supprimer** |
| `obdSession.js` + `obdGateway.js` | OBD non utilisé dans le flux principal | **Archiver en P3** |
| `immatOrganism.js` double-émission | Émet sur bus + ImmatOrganism → doublon | **Corriger** |
| `ic_pending_profile` localStorage | Données personnelles en clair | **Effacer après signup** |
| 40+ fichiers docs/ | SESSION-XX-LIVRAISON.md obsolètes | **Archiver dans docs/archives/** |

---

## 6. ÉLÉMENTS À SUPPRIMER

### Supprimer immédiatement (P0)
- `core/call-webrtc.js` — remplacé par agora-call-engine.js
- `supabase/functions/get-turn-credentials/` — pour l'ancien WebRTC

### Supprimer ou réduire (P1-P2)
- `panelDrive` — GPS navigation redondant avec l'app Maps native. Proposer de retirer de la nav ou de réduire à un bouton "Ouvrir Maps"
- Debug toasts `🔍` si réactivés en prod — retirés en call-screen.js v8, vérifier qu'aucun résidu

### Archiver (P3)
- `core/obdSession.js`, `core/obdGateway.js` — pour future feature OBD
- `SESSION-XX-LIVRAISON.md` (25+ fichiers) → `docs/archives/`

---

## 7. ROADMAP PAR SPRINT

### SPRINT 1 — Lancement viable (2 semaines)
**Objectif : tout ce qui bloque éthiquement ou légalement**

| # | Action | Fichiers | Effort | Risque |
|---|---|---|---|---|
| S1-1 | **Bouton urgence 15/17/18** avant sigStep2Vehicle ET sigStep2Aide | index.html | 4h | Faible |
| S1-2 | **Push notifications SW Level 2** : `push` listener + `notificationclick` + VAPID | service-worker.js, supabase/ | 2j | Moyen |
| S1-3 | **Demande permission push** au premier lancement (onboardingOverlay) | index.html, ui.js | 4h | Faible |
| S1-4 | **Onglet Appels dans nav principale** avec badge manqués | index.html, calls.js, messages.js | 1j | Faible |
| S1-5 | **Effacement `ic_pending_profile`** après signup réussi | ui.js / index.html | 1h | Faible |
| S1-6 | **RGPD : suppression compte** (Edge Function delete-account) | supabase/functions/ | 2j | Moyen |
| S1-7 | **RGPD : export données** (Edge Function export-user-data) | supabase/functions/ | 1j | Moyen |
| S1-8 | **Supprimer call-webrtc.js** + get-turn-credentials | repo | 30 min | Faible |

**Prérequis :** aucun — travail sur le code existant  
**Risques :** push VAPID nécessite configuration Supabase Web Push (à valider côté infra)

---

### SPRINT 2 — Expérience signalements complète (2 semaines)
**Objectif : le cycle de vie signalement fonctionne de bout en bout**

| # | Action | Fichiers | Effort | Risque |
|---|---|---|---|---|
| S2-1 | **Flux 3 clics véhicule** : plaque → type → message pré-rédigé → envoyer | index.html, calls.js | 1j | Faible |
| S2-2 | **18 messages pré-rédigés** par type d'incident | index.html (constants) | 4h | Faible |
| S2-3 | **FloatingCard étendue** : J'arrive / Résolu / Précisez / Signaler abus | index.html, calls.js | 4h | Faible |
| S2-4 | **ResolutionCenter** (modal) : états in_progress/resolved | index.html, calls.js | 2j | Élevé |
| S2-5 | **Migration DB reports** : colonnes ResolutionCenter (seen_at, actioned_at, resolved_at, urgency_level) | migration SQL | 2h | Moyen — tester RLS |
| S2-6 | **Corriger InteractionEngine double-émission** (_emitObd ne ré-émet plus sur ImmatBus) | core/interaction-engine.js | 4h | Moyen |
| S2-7 | **Règle type/domain/direction** dans InteractionEngine | core/interaction-engine.js | 1j | Moyen |
| S2-8 | **Blocages persistés DB** (table user_blocks + migration) | supabase/, calls.js | 1j | Moyen |
| S2-9 | **device_id + "appel pris sur autre appareil"** | calls.js, call-screen.js, migration | 1j | Moyen |
| S2-10 | **Historique appels détaillé** (durée, end_reason) dans icCallLog | migration call_requests + messages.js | 1j | Faible |

**Prérequis :** Sprint 1 terminé  
**Risques :** ResolutionCenter = nouveau composant UI complexe. Partir du FloatingCard existant.

---

### SPRINT 3 — Expérience complète (3 semaines)
**Objectif : Activity unifiée, notifications APNs, qualité**

| # | Action | Fichiers | Effort | Risque |
|---|---|---|---|---|
| S3-1 | **Push APNs iOS** (app installée écran d'accueil) | SW, Supabase | 3j | Très élevé — Apple Dev $99 |
| S3-2 | **Activity fil unifié** (messages + appels + signalements) | index.html, ui.js | 3j | Élevé |
| S3-3 | **Filtres Activity** (type + direction + période) | index.html, ui.js | 1j | Moyen |
| S3-4 | **Horodatage relatif** ("il y a 5 min") | utils.js | 4h | Faible |
| S3-5 | **Haut-parleur Agora** (setSinkId) | core/call-screen.js, agora-call-engine.js | 1j | Moyen — API limitée iOS |
| S3-6 | **Photo signalement Phase 2** (1 photo, Supabase Storage) | calls.js, index.html | 3j | Élevé — RGPD + quota |
| S3-7 | **Anti-abus rate limiting** (3 appels/10 min, cooldown SOS) | calls.js | 4h | Faible |
| S3-8 | **Accessibilité P1** (role="dialog", aria-live, aria-label boutons) | index.html | 1j | Faible |
| S3-9 | **Géolocalisation approximative** (200m par défaut) | calls.js | 4h | Faible |
| S3-10 | **Préférences notifications** UI dans Paramètres | index.html | 4h | Faible |
| S3-11 | **Pages légales** (politique confidentialité, CGU) | HTML statique | 4h | Faible |

**Prérequis :** Sprint 2 terminé, compte Apple Developer activé  
**Risques :** Photo = RGPD + stockage à valider avec DPO. APNs = délai Apple.

---

### SPRINT 4+ — Vision long terme
**Objectif : différenciation produit**

| # | Action | Priorité |
|---|---|---|
| S4-1 | Multi-véhicules (table vehicles + UX) | P3 |
| S4-2 | DelegationManager (prêt temporaire) | P3 |
| S4-3 | Trust Engine complet (niveaux Fiable/Ambassadeur) | P3 |
| S4-4 | Fusion intelligente signalements (serveur) | P3 |
| S4-5 | Plaques internationales (BE/CH/LU/DE) | P3 |
| S4-6 | Photo Phase 3 (multi + floutage IA) | P3 |
| S4-7 | Push FCM Android | P3 |
| S4-8 | Historique véhicule (export PDF) | P3 |
| S4-9 | KPI dashboard produit (analytics) | P3 |
| S4-10 | Connexion sociale Google/Apple | P3 |

---

## 8. TOP 20 ACTIONS — ORDRE EXACT

```
╔══════════════════════════════════════════════════════════════════════════╗
║  TOP 20 ACTIONS · ImmatConnect Pro · 2026-06-13                        ║
╚══════════════════════════════════════════════════════════════════════════╝

#01  URGENCE 15/17/18 — Ajouter avant sigStep2Vehicle et sigStep2Aide
     → index.html : bouton rouge "🚨 Urgence vitale" au-dessus des types
     → Si tap : écran avec tel://15, tel://17, tel://18 + "Signaler aussi"
     → Effort : 4h · Risque : nul · Impact : éthique + légal

#02  SUPPRIMER call-webrtc.js + get-turn-credentials Edge Function
     → Réduire le code mort immédiatement
     → Effort : 30 min · Risque : nul

#03  EFFACER ic_pending_profile après signup réussi
     → localStorage.removeItem('ic_pending_profile') dans saveProfile()
     → Effort : 30 min · Risque : nul · Impact : RGPD

#04  ONGLET APPELS dans nav principale
     → Ajouter bouton "Appels" dans .bottom-nav
     → icAppelsPane devient visible via nav directe
     → Badge rouge appels manqués visible en permanence
     → Effort : 1j · Risque : faible

#05  PUSH NOTIFICATIONS SW — push listener + VAPID
     → service-worker.js : ajouter event 'push' + showNotification
     → service-worker.js : ajouter event 'notificationclick' (accept/refuse)
     → Supabase : configurer Web Push VAPID
     → Edge Function : send-push-notification (à créer)
     → Effort : 2j · Risque : moyen (infra Supabase à configurer)

#06  DEMANDE PERMISSION PUSH à l'onboarding
     → onboardingOverlay : étape "Activer les notifications" avec explication
     → Notification.requestPermission() + sw.pushManager.subscribe()
     → Effort : 4h · Prérequis : #05

#07  RGPD — SUPPRESSION DE COMPTE
     → Edge Function delete-account : anonymise messages, supprime profil
     → Bouton "Supprimer mon compte" dans panelSettings
     → Effort : 2j · Risque : moyen (tester RLS)

#08  RGPD — EXPORT DE DONNÉES
     → Edge Function export-user-data : JSON de toutes les données
     → Bouton "Exporter mes données" dans panelSettings
     → Effort : 1j · Risque : faible

#09  CORRIGER InteractionEngine double-émission
     → interaction-engine.js : _emitObd() ne publie plus sur ImmatBus
     → Conserver uniquement ImmatOrganism.observe()
     → Effort : 4h · Risque : moyen (tester tous les CALL_* events)

#10  FLUX 3 CLICS VÉHICULE + MESSAGES PRÉ-RÉDIGÉS
     → sigStep2Vehicle : restructurer avec 18 cas (urgences en rouge)
     → vehicleAlertQuick() : pré-remplir le message selon le type
     → Étape 3 : confirmation + message modifiable + envoyer
     → Effort : 1j · Risque : faible

#11  RESPONSES RAPIDES PROPRIÉTAIRE (FloatingCard)
     → FloatingCard : remplacer "Vu / →" par "J'arrive / Résolu / Précisez / Bloquer"
     → Chaque action : UPDATE reports.status + notification à l'émetteur
     → Effort : 4h · Prérequis : migration reports colonnes (#14)

#12  RÉSOLUTIONCENTER (modal)
     → Nouveau composant : overlay modal avec fil de suivi signalement
     → États : PENDING → IN_PROGRESS → RESOLVED
     → Notification à l'émetteur à chaque transition
     → Effort : 2j · Prérequis : #11 + #14

#13  device_id + "APPEL PRIS SUR AUTRE APPAREIL"
     → getOrCreateDeviceId() dans utils.js
     → accepted_device_id dans call_requests (migration)
     → handler postgres_changes : si accepted_device_id ≠ MY_DEVICE_ID → fermer overlay
     → Effort : 1j · Risque : moyen

#14  MIGRATION DB — reports + call_requests + messages
     → Créer migration_v3.sql avec toutes les colonnes manquantes
     → RLS pour les nouvelles colonnes
     → Effort : 2h · Risque : moyen (tester en staging)

#15  BLOCAGES PERSISTÉS DB
     → Table user_blocks (migration)
     → Syncro localStorage → DB au login
     → Vérification DB avant chaque call/message/signal
     → Effort : 1j · Risque : moyen

#16  TABLE device_sessions + HEARTBEAT
     → Table device_sessions (migration)
     → heartbeat() toutes les 30s
     → Effort : 4h · Prérequis : #13

#17  HISTORIQUE APPELS DÉTAILLÉ
     → icCallLog : afficher durée, end_reason, heure
     → Filtres Tous / Manqués / Émis / Reçus
     → Bouton "Rappeler" sur appels manqués
     → Effort : 1j · Prérequis : #14

#18  COOLDOWN SOS + CONFIRMATION
     → sigStepAide : si SOS, confirmation "Êtes-vous sûr ?" + cooldown 15 min
     → localStorage : ic_last_sos_at
     → Effort : 2h · Risque : nul

#19  ACCESSIBILITÉ P1
     → callOverlay : role="dialog" aria-modal aria-label
     → Tous les toasts : role="alert" ou aria-live="polite"
     → Boutons iconiques sans texte : aria-label sur tout
     → Zones tap ≥ 44px (vérifier Accepter/Refuser/Raccrocher)
     → Effort : 1j · Risque : nul

#20  PAGE POLITIQUE DE CONFIDENTIALITÉ
     → /privacy-policy.html accessible sans login
     → Requis par App Store + RGPD
     → Effort : 4h · Risque : nul
```

---

## 9. SYNTHÈSE DES BLOCKERS PAR PRIORITÉ

### P0 — Bloquants lancement
1. Bouton urgence 15/17/18 (éthique + légal)
2. Push notifications SW Level 2 (adoptabilité)
3. Onglet Appels dans nav principale (valeur produit visible)
4. RGPD suppression compte (App Store obligatoire)
5. ic_pending_profile effacé après signup (données personnelles en clair)

### P1 — À faire avant croissance
6. RGPD export données
7. Flux 3 clics signalement véhicule + messages pré-rédigés
8. FloatingCard réponses rapides propriétaire
9. ResolutionCenter
10. Corriger InteractionEngine double-émission
11. Blocages persistés DB
12. device_id + appel pris sur autre appareil
13. Historique appels détaillé + filtres
14. Cooldown SOS + confirmation
15. Push APNs iOS (Apple Developer)

### P2 — Qualité
16. Haut-parleur Agora (toggleSpeaker)
17. Activity fil unifié
18. Photo signalement Phase 2
19. Accessibilité P1 (ARIA)
20. Anti-abus rate limiting
21. Trust Engine MVP
22. Synchronisation lectures cross-device
23. Géolocalisation approximative
24. Build version visible (APP_BUILD)

### P3 — Vision
25. Multi-véhicules
26. DelegationManager
27. Push FCM Android
28. Trust Engine complet
29. Fusion signalements (serveur)
30. Plaques internationales
31. Historique véhicule export PDF
32. Connexion sociale

---

## 10. CE QUI N'EST PAS À IMPLÉMENTER

Les éléments suivants sont **dans certains fichiers de docs mais inutiles ou contre-productifs** :

| Élément | Pourquoi rejeter |
|---|---|
| **Inbox / Outbox séparés** | Remplacés avantageusement par Activity + filtres Reçus/Envoyés |
| **OBD Dashboard intégré** | panelDrive existant est surdimensionné. L'OBD via Bluetooth est une feature P3+ qui nécessite une app native |
| **`call-webrtc.js`** | Remplacé par Agora. À supprimer |
| **`get-turn-credentials`** | Inutile après la migration Agora |
| **Score de réputation visible** | Le score numérique brut visible crée du gamification négatif. Garder uniquement les badges discrets |
| **Réouverture signalement après 24h** | Complexité inutile. Après 24h = nouveau signalement |
| **QR code place parking** | Feature trop nichée pour un MVP |

---

*Document produit par audit d'exécution — 2026-06-13*  
*Branche : `claude/immatconnect-pro-app-dEKGR`*  
*Sources : code source intégral + AUDIT_V2 + MASTER_PLAN*
