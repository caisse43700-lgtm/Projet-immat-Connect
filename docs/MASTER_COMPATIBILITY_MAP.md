<!-- DOCUMENT DE RÉFÉRENCE PRÉ-PRODUCTION — Version 1.2 — 2026-06-13 -->
<!-- Ne pas modifier sans raison explicite : bug bloquant, faille sécurité, risque RGPD, KO terrain confirmé -->

# IMMATCONNECT PRO — MASTER COMPATIBILITY MAP
Version 1.2 — 2026-06-13 — Référence pré-production officielle (GEL DOCUMENTAIRE)

> **Objectif :** vérifier que la branche de travail, le produit fonctionnel,
> les migrations S6/S7, ANGE OS et la future production sont parfaitement
> synchronisés avant le merge vers main. Ce document est également la
> gouvernance documentaire de référence pour tous les développements futurs.
>
> **Règle :** Ne pas modifier le code. Ne pas créer de migration.
> Ne pas créer de dashboard. Ne pas merger main.
> Rouvrir uniquement si : bug bloquant / faille sécurité / risque RGPD /
> secret exposé / KO terrain confirmé.

---

## SECTION 1 — OBJECTIF GLOBAL

Ce document est la carte de compatibilité complète du projet au moment
de l'entrée en phase de déploiement terrain. Il couvre :

- L'état exact de la branche de travail vs main
- L'ensemble des fichiers critiques avec leur version
- Les 11 migrations à déployer dans l'ordre
- Les 4 Edge Functions à déployer
- La matrice fonctionnalités × sources × tests
- Les registres techniques (dette, hypothèses, risques, invariants)
- Le graphe de dépendances
- 38 contrôles terrain (35 initiaux + 3 ajouts v1.1)
- 15 questions non posées avec réponses
- Les registres de gouvernance future (Feature, Data Ownership, Impact)
- Les playbooks de crise (migration partielle, Supabase down, hallucination IA)
- Les règles de validation avant tout GO MAIN futur
- La décision finale GO/NO-GO MAIN

**Toute future fonctionnalité DOIT être reliée à ce document.**

---

## SECTION 2 — SOURCES DE VÉRITÉ OFFICIELLES (20 points)

| # | Donnée | Valeur | Source |
|---|--------|--------|--------|
| V01 | Supabase URL | https://vemgdkkbldgyvaisudkd.supabase.co | SESSION-CONTINUATION.md |
| V02 | Anon key | sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ | PROJECT_STATE.md §9 |
| V03 | Agora App ID | 4771f029e9c6446e872a598870bb74f3 | PROJECT_STATE.md §9 |
| V04 | Agora Certificate | Jamais dans le code → Secrets Supabase AGORA_APP_CERTIFICATE | D07 |
| V05 | SW version actif | immatconnect-pro-v25 | PROJECT_STATE.md §9 |
| V06 | Branche production | main (GitHub Pages) | PROJECT_STATE.md §1 |
| V07 | Branche de travail | claude/immatconnect-pro-app-dEKGR | PROJECT_STATE.md §1 |
| V08 | URL production | https://caisse43700-lgtm.github.io/Projet-immat-Connect/ | PROJECT_STATE.md §1 |
| V09 | Téléphones tests | BZ-652-LL ↔ BE-521-MM (deux iPhone/Safari) | SESSION-CONTINUATION.md |
| V10 | APP_BUILD | 2026-06-13-S5 | PROJECT_STATE.md §9 |
| V11 | calls.js version | v18+ (device_id + ic_call_times) | PROJECT_STATE.md §9 |
| V12 | call-screen.js version | v8 | PROJECT_STATE.md §9 |
| V13 | agora-call-engine.js version | v5 | PROJECT_STATE.md §9 |
| V14 | messages.js version | v17+ | PROJECT_STATE.md §9 |
| V15 | app.css version | v9 | PROJECT_STATE.md §9 |
| V16 | Dernier commit | db34d53 (figé Plan 30J v1.2) | git log |
| V17 | Avancement fonctionnel | ~35% du plan total | PROJECT_STATE.md §1 |
| V18 | Modèle IA | Claude via ANTHROPIC_API_KEY (immat-brain-dialog) | PLAN_30J v1.2 §4 |
| V19 | ANGE définition | Assistant Numérique de Guidage et d'Écoute | PLAN_30J v1.2 §4 |
| V20 | Référence fonctionnelle | docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md (1889 lignes, 25 sections) | CLAUDE.md |

---

## SECTION 3 — AUDIT BRANCHE DE TRAVAIL → MAIN

Fichiers modifiés dans la branche de travail vs main (`git diff --name-only`) :

**FICHIERS APPLICATIFS**

| Fichier | Type | Description |
|---------|------|-------------|
| index.html | [M] | nav Appels, VAPID, onboarding push, urgence 15/17/18, Leaflet.markercluster CDN, ANGE UI, RGPD UI, shortcuts |
| calls.js | [M] | v18 : device_id, ic_call_times rate limit, push après requestCall |
| messages.js | [M] | v17 : relTime, aria-label, status lecture |
| app.css | [M] | v9 : map-alert-filter-bar, cluster-icon, rating modal |
| manifest.json | [M] | shortcuts (Signaler/Carte/Appels), categories, apple-touch-icon |
| service-worker.js | [M] | v25 : markercluster CDN, push listeners, notificationclick |

**FICHIERS CORE**

| Fichier | Type | Description |
|---------|------|-------------|
| core/interaction-engine.js | [M] | _isCallLikeType, _rememberObd, guard CALL* |
| core/call-webrtc.js | [D] | SUPPRIMÉ (code mort WebRTC) |

**EDGE FUNCTIONS**

| Fichier | Type | Description |
|---------|------|-------------|
| supabase/functions/delete-account/index.ts | [M] | RGPD étendu S7 |
| supabase/functions/export-user-data/index.ts | [M] | RGPD étendu S7 |
| supabase/functions/send-push-notification/index.ts | [N] | VAPID NOUVEAU |
| supabase/functions/submit-rating/index.ts | [N] | Notation NOUVEAU |
| supabase/functions/get-turn-credentials/index.ts | [D] | SUPPRIMÉ (WebRTC) |

**MIGRATIONS (11 nouvelles, aucune dans main)**

| Fichier | Type | Ordre |
|---------|------|-------|
| supabase/migrations/20260613_push_subscriptions.sql | [N] | 01/11 |
| supabase/migrations/20260613_reports_enhancements.sql | [N] | 02/11 |
| supabase/migrations/20260613_user_blocks.sql | [N] | 03/11 |
| supabase/migrations/20260613_call_requests_device_id.sql | [N] | 04/11 |
| supabase/migrations/20260614_device_sessions.sql | [N] | 05/11 |
| supabase/migrations/20260614_driver_ratings.sql | [N] | 06/11 |
| supabase/migrations/20260614_user_trust.sql | [N] | 07/11 |
| supabase/migrations/20260614_public_profiles_secure.sql | [N] | 08/11 |
| supabase/migrations/20260614_public_reports_secure.sql | [N] | 09/11 |
| supabase/migrations/20260614_missing_indexes.sql | [N] | 10/11 |
| supabase/migrations/20260615_profiles_column_security.sql | [N] | 11/11 ← DERNIER |

Légende : [M]=modifié [N]=nouveau [D]=supprimé

**Résumé : 31 fichiers différents de main.**
Aucune de ces modifications ne touche calls.js, call-screen.js ni
agora-call-engine.js de façon à casser les appels vocaux validés terrain.

---

## SECTION 4 — CARTOGRAPHIE DES FONCTIONNALITÉS (18 features)

| # | Feature | Statut code | Migrations | Tests terrain | Bloquants |
|---|---------|-------------|------------|---------------|-----------|
| F01 | Appels vocaux Agora | ✅ Prod validé | 20260613_call_requests_device_id | ✅ terrain OK | Aucun |
| F02 | Messages texte Realtime | ✅ Prod validé | — | ✅ terrain OK | Aucun |
| F03 | Carte radar Leaflet | ✅ Prod validé | — | ✅ terrain OK | Aucun |
| F04 | Signalements communautaires | ✅ Code complet | 20260613_reports_enhancements + 20260614_public_reports_secure | ⬜ à tester | 2 migrations |
| F05 | Push notifications VAPID | ✅ Code complet | 20260613_push_subscriptions | ⬜ à tester | Secrets + EF |
| F06 | Clustering marqueurs | ✅ Code complet | — | ⬜ à tester | Aucun |
| F07 | Suppression compte RGPD | ✅ Code complet | — | ⬜ à tester | EF à déployer |
| F08 | Export données RGPD | ✅ Code complet | — | ⬜ à tester | EF à déployer |
| F09 | Notation conducteurs | ✅ Code complet | 20260614_driver_ratings | ⬜ à tester | Migration + EF |
| F10 | Trust Engine | ✅ Code complet | 20260614_user_trust | ⬜ à tester | Migration |
| F11 | Public profiles sécurisés | ✅ Code complet | 20260614_public_profiles_secure + 20260615 | ⬜ à tester | 2 migrations (ordre strict) |
| F12 | Reports sans PII | ✅ Code complet | 20260614_public_reports_secure | ⬜ à tester | Migration |
| F13 | Blocages persistés DB | ✅ Code complet | 20260613_user_blocks | ⬜ à tester | Migration |
| F14 | device_id multi-appareils | ✅ Code complet | 20260613_call_requests_device_id | ⬜ à tester | Migration |
| F15 | Device sessions heartbeat | ✅ Code complet | 20260614_device_sessions | ⬜ à tester | Migration |
| F16 | ANGE (immat-brain-dialog) | ✅ EF déployée | — | ⬜ à tester | ANTHROPIC_API_KEY |
| F17 | Dashboard Gardien | ✅ Prod validé | — | ✅ terrain OK | Aucun |
| F18 | Urgence 15/17/18 | ✅ Code complet | — | ⬜ à tester | Aucun |

---

## SECTION 5 — FICHE F01 : APPELS VOCAUX AGORA

**Statut : ✅ PRODUCTION — validé terrain 2026-06-12**

**Fichiers :**
- calls.js v18 — orchestration flux d'appel
- core/call-screen.js v8 — overlay UI caller/callee
- core/agora-call-engine.js v5 — SDK Agora RTC join/leave/mute
- core/audio-manager.js v7 — sonnerie WAV générée en mémoire
- supabase/functions/get-agora-token/index.ts — token RTC signé

**Flux :**
```
A appelle B
→ calls.js émet CALL_INITIATED → CallScreen.showOutgoing()
→ B accepte dans le geste iOS → getUserMedia({audio}) → w.__preMicTrack
→ calls.js émet CALL_ACCEPTED {requestId, plate} sur les deux
→ AgoraCallEngine reçoit CALL_ACCEPTED
→ POST get-agora-token {channelName: requestId, uid: random}
→ client.join(APP_ID, channelName, token, uid)
→ réutilise w.__preMicTrack → publish()
→ subscribe remote → audioTrack.play()
→ Fin → leaveCall() → CallScreen.hide()
```

**Détection d'annulation (4 couches) :**
1. Broadcast CANCEL canal signal Supabase (50-200ms)
2. postgres_changes UPDATE status='cancelled' (200-500ms)
3. Poll DB 1s via _startCancelPoll (0-1000ms)
4. visibilitychange + _checkOngoingIncomingCall (retour arrière-plan)

**Décisions validées :**
- D01 : Agora RTC (pas WebRTC natif — iOS Safari incompatible)
- D17 : calls.js/agora-call-engine.js/call-screen.js ≠ modifiés sans test terrain

**Bugs résolus (ne pas reproduire) :**
- _emitObd sans requestId → fix guard e.payload.requestId (call-screen.js v8)
- Double showIncomingPopup → fix _seenIncomingCallIds Set (calls.js v17)
- cancelCallRequest après broadcast → fix DB en premier (calls.js v15)
- Micro iOS hors geste → fix getUserMedia() dans tap Accepter

**Tests obligatoires avant tout commit sur ces fichiers :**

| Scénario | Action | Attendu |
|----------|--------|---------|
| 1 | A→B accepte → audio → raccroche | audio bidirectionnel, fin propre |
| 2 | A→B, A annule | overlay B ferme <2s |
| 3 | A→B, B refuse | A voit "Refusé" |
| 4 | A→B, 30s | les deux voient "Manqué" |
| 5 | après 1-4, rappel immédiat | possible sans erreur |
| 6 | app arrière-plan B → appel reçu | accepté |
| 7 | perte réseau courte | pas de crash |

---

## SECTION 6 — FICHE F04/F12 : SIGNALEMENTS / REPORTS / ALERTES

**Statut : ✅ Code complet — migrations à déployer**

**Tables impliquées :**
- public.reports — signalements avec PII (reporter_id)
- public.public_reports — vue sans PII (vue SQL)

**Migrations requises :**
- 20260613_reports_enhancements.sql → ajoute seen_at, actioned_at, urgency_level, target_plate, resolved_at
- 20260614_public_reports_secure.sql → RLS reports_select_own + vue public_reports sans reporter_id

**Champs de public_reports (exhaustifs) :**
id, plate, reason, latitude, longitude, status, created_at, urgency_level,
target_plate, resolved_at, seen_at, actioned_at

Champs absents de la vue (intentionnellement) : reporter_id, user_id, tout champ modération interne

**Invariants critiques (RGPD) :**
- INV-COM-015 : reporter_id jamais exposé aux tiers via REST API
- La communauté reçoit les alertes via broadcast Realtime (payload sans reporter_id)
- Jamais via postgres_changes sur reports (policy SELECT = auteur uniquement)

**Anti-abus :**
- >3 reports distincts sur même plaque en <24h :
  - si needs_review existe : créer le flag (migration dédiée requise)
  - si needs_review absent : notifier modération par email
  - NE PAS modifier trust_level directement dans les deux cas
- Impact trust uniquement après confirmation manuelle ou status='resolved'

---

## SECTION 7 — FICHE F02 : MESSAGES TEXTE

**Statut : ✅ Production validé**

**Fichier :** messages.js v17+

**Features actives :**
- relTime(ts) : "à l'instant" / "il y a Xmin" / "HHhMM" / "hier HH:MM" / "jj. HH:MM"
- Statut lecture : ✓ Envoyé / ✓✓ Vu en bleu (seen_at colonne)
- Filtre "Non-lus" dans le feed d'activité
- aria-label="Supprimer ce message" sur ic-delete-msg
- Rate limit client : ic_msg_times localStorage (5/min — UX uniquement)
- Barre recherche plaque : debounce 300ms, nPlate normalisation, zéro requête Supabase

**Invariants :**
- INV-COM-010 : pas de contenu de message dans les Edge Functions
- D11 : pas d'ouverture automatique de messages sur accepted

**Realtime :**
- Abonnement confirmé — ic_msg canal (postgres_changes)
- À activer dans Supabase Settings → Realtime → tables → messages

---

## SECTION 8 — FICHE F09/F10 : TRUST ENGINE ET NOTATION

**Statut : ✅ Code complet — migrations à déployer**

**Tables :**

`driver_ratings` :
id uuid PK, rater_id uuid FK, rated_plate text, score smallint (1-5),
comment text (280 chars max), context text IN ('call','message','alert','encounter'),
created_at timestamptz, UNIQUE(rater_id, rated_plate, context)

`driver_ratings_summary` (vue matérialisée) :
rated_plate PK, avg_score numeric, total int, last_rated_at timestamptz
— Rafraîchie par refresh_ratings_summary() SECURITY DEFINER (CONCURRENTLY)

`vehicle_trust_scores` :
owner_plate text PK, trust_score int (0-100), trust_level text
('ambassador'/'trusted'/'neutral'/'caution'), signals_ok int, signals_bad int, updated_at
— RLS : SELECT public, INSERT/UPDATE/DELETE bloqués côté client

**Formule trust (refresh_vehicle_trust SECURITY DEFINER) :**
```
score = 50
  + LEAST(30, confirmed×5)    [+5/signalement confirmé, max +30]
  - LEAST(50, disputed×12)    [−12/signalement contesté, max −50]
  + ratings_bonus             [−15 à +15 selon avg_score]
Niveaux : ≥75→ambassador, ≥55→trusted, ≥35→neutral, <35→caution
```

**Source de vérité (D12) :**
- vehicle_trust_scores = source unique
- S.trust = cache d'affichage temporaire uniquement (→ renommer S.localTrustCache)
- Aucun nouveau dev sur S.trust

---

## SECTION 9 — FICHE F11 : PUBLIC_PROFILES / PROFILES (SÉCURITÉ COLONNES)

**Statut : ✅ Code complet — migrations à déployer (20260614 puis 20260615)**

**Schéma public_profiles :**
- owner_plate text PK, pseudo text, vehicle_color text, updated_at timestamptz
- RLS SELECT USING (true) — lecture publique
- RLS INSERT/UPDATE/DELETE WITH CHECK (false) — bloqué côté client
- Peuplé par trigger trg_sync_public_profile
- Backfill dans la migration 08/11

**Schéma profiles (après 20260615) :**
- RLS : profiles_select_authenticated USING (auth.role()='authenticated')
- REVOKE SELECT ON profiles FROM authenticated, anon
- GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON profiles TO authenticated
- email et phone → inaccessibles via /rest/v1/profiles?select=email
- Critère de validation = ABSENCE des champs dans le JSON (pas le code HTTP)

**RPC get_my_profile() SECURITY DEFINER :**
Retourne json complet (email + phone inclus) uniquement pour auth.uid() = p.id

**RPC get_public_profiles_by_ids(uuid[]) SECURITY DEFINER :**
JOIN profiles + public_profiles → user_id, pseudo, owner_plate, vehicle_color
Jamais email, phone, device_id

**Ordre OBLIGATOIRE :**
1. 20260614_public_profiles_secure.sql (crée table + trigger + RPC + backfill)
2. 20260615_profiles_column_security.sql (column-level grants + get_my_profile)
Inverser = RLS trop stricte → casse calls.js et messages.js

---

## SECTION 10 — FICHE F05 : PUSH NOTIFICATIONS VAPID

**Statut : ✅ Code complet — Secrets + déploiement EF requis**

**Table push_subscriptions :**
user_id uuid FK, endpoint text, p256dh text, auth text, created_at timestamptz
— RLS SELECT/DELETE/INSERT par user_id = auth.uid()
— EF nettoyage automatique 410

**Secrets requis (jamais dans git) :**
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

**Commande :** `supabase functions deploy send-push-notification`

**Test de validation :**
Contrôle C11 : fermer app sur tél 2, message depuis tél 1 → push <10s, tap → bonne conversation

---

## SECTION 11 — FICHE F07/F08 : RGPD (DELETE-ACCOUNT + EXPORT-USER-DATA)

**Statut : ✅ Code complet — déploiement EF requis**

**delete-account — logique :**
1. Anonymiser profiles (email=NULL, phone=NULL) ou supprimer
2. DELETE FROM messages WHERE sender_id=uid OR receiver_id=uid
3. DELETE FROM user_locations WHERE user_id=uid
4. DELETE FROM reports WHERE reporter_id=uid
5. DELETE FROM public_profiles WHERE owner_plate=(SELECT owner_plate FROM profiles WHERE id=uid)
6. DELETE FROM push_subscriptions WHERE user_id=uid
7. DELETE FROM device_sessions WHERE user_id=uid
8. DELETE FROM user_blocks WHERE blocker_id=uid
9. DELETE FROM driver_ratings WHERE rater_id=uid
10. supabase.auth.admin.deleteUser(uid) via service_role

Helper optionalDelete() + isMissingRelationError() pour tables optionnelles
Log delete_audit_log obligatoire (D16)

**export-user-data — JSON retourné :**
```json
{
  "profile": {},
  "messages_sent": [],
  "messages_received": [],
  "reports_filed": [],
  "ratings_given": []
}
```
Champs exclus : device_id, reporter_id tiers

**Commandes :**
```
supabase functions deploy delete-account
supabase functions deploy export-user-data
```

---

## SECTION 12 — FICHE F03 : CARTE RADAR / SERVICE WORKER

**Statut : ✅ Production validé (carte) + code complet (SW v25)**

**Carte :**
- Leaflet.js + Leaflet.markercluster 1.5.3 (CDN)
- Cluster bleu cyan custom, maxClusterRadius:60
- Filtre alertes : Tous / Route / Aide / Véhicule (barre flottante)
- TTL conducteurs proches = 5 min (D13)
- Distance arrondie à 100m, Debounce loadOthers 2000ms

**Service Worker v25 :**
- CACHE_NAME = 'immatconnect-pro-v25'
- Network-first pour les JS (jamais cache-first, D02)
- Promise.allSettled() non atomique (corrige bug SW v8)
- Push listeners actifs depuis v22
- Offline fallback : offline.html

---

## SECTION 13 — FICHE F13/F14/F15 : BLOCAGES / DEVICE_ID / SESSIONS

**F13 — Blocages persistés DB :**
Table user_blocks : blocker_id uuid, blocked_plate text, created_at
blockPlate() : upsert DB + localStorage (fire-and-forget)
App.loadBlocksFromDB() : fusion DB + localStorage, 2s après openMap()

**⚠️ Limitation connue :** la table user_blocks bloque uniquement la récupération côté client.
Elle ne constitue pas une barrière serveur sur messages, appels ou push.
Un utilisateur bloqué peut techniquement encore envoyer des données via l'API.
Barrière serveur complète = à implémenter dans une migration future (Sprint 9+).

**F14 — device_id multi-appareils :**
Migration 04/11 ajoute accepted_device_id sur call_requests.
Handler : si accepted_device_id !== _deviceId → "Appel pris sur autre appareil"

**F15 — Device sessions heartbeat :**
Table device_sessions : user_id, device_id, last_seen, platform
Heartbeat POST 30s → upsert last_seen
Utilisé par delete-account pour nettoyer les sessions orphelines

---

## SECTION 14 — FICHE REALTIME

**Abonnements confirmés dans le code :**
- messages (postgres_changes) → ic_msg canal — **ACTIVER Realtime**
- user_locations (postgres_changes) → ic_loc canal — **ACTIVER Realtime**

**À vérifier avant activation :**
- call_requests → vérifier dans calls.js si postgres_changes ou broadcast
- reports → vérifier (D18 : supprimer ic_reports_{user} — handler vide)

**Règle :** ne pas activer Realtime sur une table inutile — coût + bruit + exposition

---

## SECTION 15 — ANGE OS : COMPATIBILITÉ PRODUIT

**Définition officielle unique :**
ANGE = Assistant Numérique de Guidage et d'Écoute

**Ce qui existe dans le code :**
- supabase/functions/immat-brain-dialog/index.ts — EF active
- _shared/knowledge-gardien.ts, knowledge-conducteur.ts, nervous-system.ts

**Limites définies :**

| Paramètre | Valeur |
|-----------|--------|
| Tokens input max | 150 tokens |
| Tokens output max | 100 tokens |
| Requêtes / user | 10 / heure |
| Requêtes globales bêta | 500 / jour |
| Modèle | Claude via ANTHROPIC_API_KEY |
| Temperature | 0.3 |
| Seuil alerte coût | >$2/jour → couper ANGE |

**Dégradation gracieuse (D20) :**
Si immat-brain-dialog KO → "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles."
Jamais : écran vide, stack trace, blocage d'autre fonctionnalité

**Modules ANGE OS (architecture cible, non déployés) :**
4 modules réels : USER, ADMIN, AUDITOR, MEMORY
— ANGE ne peut pas écrire sur admin_roles
— Toute action level-1+ nécessite confirmation 5-couches + log idempotent

---

## SECTION 16 — MATRICE FONCTIONNALITÉS × SOURCES DE VÉRITÉ

| Feature | Code | Migration | EF | RLS | Realtime | Invariant | Décision |
|---------|------|-----------|-----|-----|----------|-----------|---------|
| Appels Agora | calls.js v18 | 04/11 | get-agora-token ✓ | — | broadcast | D17 | D01 |
| Messages | messages.js v17 | — | — | — | messages ✓ | INV-COM-010 | D11 |
| Carte | index.html | — | — | — | user_locations ✓ | D13 | D02 |
| Signalements | index.html | 02/11 + 09/11 | — | reports_select_own | broadcast | INV-COM-015 | — |
| Push VAPID | SW v25 | 01/11 | send-push-notification | push_own | — | VAPID secret | — |
| Suppression RGPD | EF | — | delete-account | — | — | D16 | — |
| Export RGPD | EF | — | export-user-data | — | — | RGPD art.20 | — |
| Notation | index.html | 06/11 | submit-rating | ratings_own | — | score 1-5 | D12 |
| Trust Engine | index.html | 07/11 | submit-rating→refresh | trust_public | — | D12 | D12 |
| Public profiles | index.html | 08/11 + 11/11 | — | col-level grants | — | INV-COM-015, D14 | — |
| Blocages DB | index.html | 03/11 | — | user_blocks_own | — | — | — |
| Device_id | calls.js | 04/11 | — | — | — | ic_device_id | — |
| ANGE | index.html | — | immat-brain-dialog ✓ | — | — | 150/100 tok, 10/h | D20 |
| Dashboard Gardien | core/guardian-*.js | — | — | — | — | 8 voyants | — |
| Urgence 15/17/18 | index.html | — | — | — | — | 44px min, rouge | — |

---

## SECTION 17 — MATRICE FONCTIONNALITÉS × TESTS TERRAIN

| Feature | Contrôle | Critique | Prérequis migration | Prérequis EF | Prérequis secret |
|---------|----------|----------|---------------------|--------------|-----------------|
| Inscription + profil | C01 | ✓ | 08/11, 11/11 | — | — |
| Localisation carte | C02 | ✓ | — | — | — |
| PII absentes profiles | C03 | ✓ RGPD | 11/11 | — | — |
| RLS reports auteur | C03b | ✓ RGPD | 09/11 | — | — |
| public_reports propre | C03c | ✓ RGPD | 09/11 | — | — |
| Envoi message | C04 | ✓ | — | — | — |
| Appel audio 7 cas | C05 | ✓ | 04/11 | get-agora-token | AGORA_APP_CERTIFICATE |
| Signalement communautaire | C06 | ✓ | 02/11, 09/11 | — | — |
| Suppression compte | C07 | ✓ RGPD | — | delete-account | — |
| Plaque unique | C08 | ✓ | 08/11 | — | — |
| Mode hors ligne | C09 | non | — | — | — |
| Push app fermée | C10 | ✓ | 01/11 | send-push-notification | VAPID ×3 |
| ANGE message | C11 | non | — | immat-brain-dialog | ANTHROPIC_API_KEY |
| Rate limit client | C12 | non | — | — | — |
| Blocage utilisateur | C15 | non | 03/11 | — | — |
| Sync public_profiles | C16 | non | 08/11 | — | — |
| Dégradation Realtime | C17 | non | — | — | — |

---

## SECTION 18 — TECH_DEBT_REGISTER

**DEBT-001 : _emitObd() cause racine non corrigée**
- Fichier : core/interaction-engine.js
- Contournement : guard e.payload.requestId dans call-screen.js v8
- Fix requis : corriger _emitObd() (Sprint 8 #09)
- Risque : double émission CALL_* → timers fantômes CALL_MISSED
- Priorité : P1

**DEBT-002 : ic_reports_{user} canal Realtime — handler vide**
- Abonnement postgres_changes sur reports sans traitement utile
- Décision D18 : supprimer Sprint 9
- Risque : coût Realtime inutile + bruit
- Priorité : P2

**DEBT-003 : S.trust vs vehicle_trust_scores**
- S.trust = cache local non synchronisé avec vehicle_trust_scores
- Décision D12 : renommer S.trust → S.localTrustCache (Sprint futur)
- Priorité : P2

**DEBT-004 : localStorage sans TTL**
- ic_interactions (200 max), ic_notifications (100 max), ic_gps_history
- Décision D19 : MAX_BLOCKED=500, TTL=90j — Sprint 9
- Priorité : P2

**DEBT-005 : delete_audit_log absent**
- Décision D16 : log obligatoire RGPD art.17
- Migration dédiée à créer Sprint 8
- Risque : non-conformité RGPD art.17
- Priorité : P1

**DEBT-006 : rate_limit_counters serveur absent**
- Actuellement : rate limit client uniquement (UX, contournable)
- Table rate_limit_counters dédiée à créer (jamais dans profiles)
- Phase 2 : Upstash Redis si >50 users simultanés
- Risque : pas de protection serveur contre abus
- Priorité : P1

**DEBT-007 : get-turn-credentials à supprimer sur Supabase Dashboard**
- Fichier local supprimé, EF toujours listée côté Supabase (S3-6 — action manuelle)
- Risque : surface d'exposition inutile, confusion opérationnelle
- Priorité : P2

**DEBT-008 : S7-PROFILE et S7-PHOTO bloqués**
- Décision D21 : bloqués jusqu'à validation terrain complète
- Priorité : P3 (post-bêta)

**DEBT-009 : Absence de cartographie véhicule ↔ stationnement ↔ trust**
- Aucune matrice entre les futures tables parking_sessions, vehicle_profiles et trust
- Risque : doublons, incohérences de données lors du développement futur
- Action : créer une fiche cartographique complète avant tout dev véhicule/stationnement
- Priorité : P3 (à faire avant Sprint véhicule/stationnement)

**DEBT-010 : Absence de registre officiel des dépendances croisées (FEATURE_DEPENDENCY_REGISTRY)**
- Le FEATURE_DEPENDENCY_GRAPH (Section 24) est visuel mais non structuré en registre formel
- Risque : dépendance oubliée lors d'une nouvelle feature
- Action : maintenir la Section 31 (FEATURE_REGISTRY) à jour à chaque nouvelle feature
- Priorité : P2

---

## SECTION 19 — HYPOTHESIS_REGISTER

**HYP-001 :** Realtime actif sur messages et user_locations dans le projet Supabase
- Vérif : Supabase Dashboard → Database → Replication
- Risque si invalide : messages et localisations non reçus en temps réel

**HYP-002 :** get-agora-token déployée et fonctionnelle avec AGORA_APP_CERTIFICATE
- Vérif : `supabase functions list` + test appel
- Risque si invalide : tous les appels vocaux échouent (BLOQUANT)

**HYP-003 :** immat-brain-dialog déployée avec ANTHROPIC_API_KEY
- Vérif : `supabase functions list` + test ANGE
- Risque si invalide : ANGE indisponible (non critique bêta)

**HYP-004 :** create-call-request et respond-call-request déployées
- Vérif : `supabase functions list`
- Risque si invalide : création d'appels impossible (BLOQUANT)

**HYP-005 :** La table profiles existe avec id, owner_plate, pseudo, vehicle_color, email, phone
- Vérif : Supabase Studio → Table Editor → profiles
- Risque si invalide : inscription + profil cassés

**HYP-006 :** seen_at / actioned_at / urgency_level / target_plate / resolved_at absents de reports
- Vérif : Supabase Studio → Table Editor → reports
- Si présents : migration 02/11 idempotente (IF NOT EXISTS) → OK

**HYP-007 :** La table public_profiles n'existe pas encore
- Vérif : Supabase Studio → Table Editor
- Si présente : migration 08/11 idempotente (CREATE IF NOT EXISTS) → OK

**HYP-008 :** VAPID secrets non encore configurés
- Vérif : Supabase Dashboard → Settings → Secrets
- Si déjà configurés → OK, si non → push impossibles

**HYP-009 :** Quota gratuit Agora (10 000 min/mois) non atteint
- Vérif : console.agora.io → Usage
- Risque si invalide : appels bloqués au-delà du quota

**HYP-010 :** La vue public_reports n'existe pas encore en base
- Vérif : Supabase Studio → Database → Views
- Migration 09/11 idempotente (DROP VIEW IF EXISTS avant CREATE)

**HYP-011 :** get_public_profiles_by_ids() fonctionne toujours après 20260615_profiles_column_security.sql
- Base : la fonction est SECURITY DEFINER — elle contourne les column-level grants
- Attendu : pseudo, owner_plate, vehicle_color toujours retournés pour les IDs demandés
- Vérif : appeler l'RPC après migration 11/11, vérifier les 3 champs dans la réponse
- Risque si invalide : résolution uuid→plaque cassée pour calls.js et messages.js

**HYP-012 :** Les index de 20260614_missing_indexes.sql sont réellement utilisés par le planificateur
- Base : index créés sur messages(receiver_id, created_at), reports(plate, created_at),
         call_requests(caller_id, created_at), user_locations(user_id, updated_at)
- Vérif : `EXPLAIN ANALYZE SELECT ...` sur chaque table depuis Supabase SQL Editor
- Risque si invalide : performances dégradées sous charge (non critique en bêta 10-20 users)

**HYP-013 :** Toutes les Edge Functions déployées sont encore appelées par le code actif
- Base : 8 EF référencées dans le code (get-agora-token, immat-brain-dialog, create-call-request, respond-call-request, delete-account, export-user-data, submit-rating, send-push-notification)
- get-turn-credentials est à supprimer du dashboard Supabase (DEBT-007) — code local déjà supprimé
- Vérif : `supabase functions list` + grep dans le code de chaque nom de fonction
- Risque si invalide : EF orpheline facturée inutilement ou code appelant une EF inexistante

**HYP-014 :** Toutes les tables possèdent un owner fonctionnel et une RLS cohérente
- Base : les migrations créent les RLS mais l'état Supabase actuel (sans migrations déployées) est inconnu
- Tables concernées : profiles, messages, user_locations, reports, call_requests, push_subscriptions, user_blocks, call_requests, device_sessions, driver_ratings, vehicle_trust_scores, public_profiles
- Vérif : Supabase Dashboard → Authentication → Policies → vérifier chaque table
- Risque si invalide : table sans RLS = accès non contrôlé à toutes les lignes

---

## SECTION 20 — RISK_REGISTER

**RISK-001 : Rupture appels vocaux post-migration**
- Cause : 20260615 trop restrictive si exécutée avant 20260614
- Probabilité : Faible (ordre strict respecté)
- Impact : CRITIQUE — appels bloqués
- Mitigation : 20260614 avant 20260615 (INV-020), test appel immédiat

**RISK-002 : email ou phone retournés via REST API après 20260615**
- Cause : migration mal appliquée ou annulée
- Impact : CRITIQUE RGPD — fuite PII → KO bêta
- Mitigation : Contrôle C03 (critère = absence dans JSON)

**RISK-003 : reporter_id visible dans /reports ou /public_reports**
- Cause : migration 09/11 non appliquée ou RLS manquante
- Impact : CRITIQUE RGPD — identité lanceurs d'alerte exposée
- Mitigation : Contrôles C03b et C03c avant toute ouverture

**RISK-004 : Notification push non fonctionnelle sur mobile réel**
- Cause : VAPID secrets manquants / EF non déployée / iOS restrictions
- Probabilité : Modérée (iOS = restrictions VAPID)
- Impact : CRITIQUE — app morte en arrière-plan
- Mitigation : test C10/C11 sur deux téléphones réels

**RISK-005 : AGORA_APP_CERTIFICATE exposé dans le code ou git**
- Cause : commit accidentel
- Impact : CATASTROPHIQUE — usurpation canaux Agora, frais illimités
- Mitigation : D07 + `git grep "AGORA_APP_CERTIFICATE"` avant push

**RISK-006 : Migrations hors ordre → comportement imprévisible**
- Cause : exécution non chronologique
- Impact : Élevé (20260615 avant 20260614 = appels cassés)
- Mitigation : suivre l'ordre du ROLLBACK_REGISTRY (Section 23)

**RISK-007 : Abus de notation collective**
- Cause : brigade de faux comptes
- Probabilité : Faible en bêta
- Mitigation : UNIQUE(rater_id, rated_plate, context) + validation manuelle

**RISK-008 : Suppression de compte incomplète (RGPD)**
- Cause : optionalDelete() ignore silencieusement une table existante
- Impact : Non-conformité RGPD art.17
- Mitigation : delete_audit_log obligatoire (DEBT-005) + test C07a

**RISK-009 : Coût ANGE > $2/jour en bêta**
- Probabilité : Très faible en bêta 10-20 users
- Mitigation : alerte coût console Anthropic + DEBT-006 rate limit serveur

**RISK-010 : localStorage saturé**
- Cause : ic_interactions/notifications sans TTL
- Probabilité : Faible en bêta
- Mitigation : D19 + nettoyage Sprint 9

**RISK-011 : Regression appels après merge main**
- Cause : conflit lors du merge
- Impact : CRITIQUE
- Mitigation : test Scénarios 1-5 après merge + politique anti-régression §10 PROJECT_STATE

**RISK-012 : Vue public_reports expose des colonnes non attendues**
- Cause : migration modifiée ou colonnes reports ajoutées ultérieurement
- Impact : Modéré RGPD
- Mitigation : contrôle C03c + vérifier l'absence de reporter_id

**RISK-013 : Désynchronisation profiles ↔ public_profiles**
- Cause : trigger sync_public_profile absent ou KO après migration / update Supabase
- Impact :
  - recherche plaque cassée
  - appels cassés (résolution uuid↔plaque impossible)
  - messages cassés (pseudo non résolu)
  - trust incohérent (plaque introuvable dans public_profiles)
  - stationnement incohérent (lors du développement futur)
- Contrôle SQL :
  ```sql
  SELECT COUNT(*)
  FROM profiles p
  LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate
  WHERE pp.owner_plate IS NULL;
  ```
  Résultat attendu : **0**
- Mitigation : vérifier ce contrôle après migration 08/11 et après chaque modification de profiles
- Priorité : CRITIQUE

**RISK-014 : Régression Service Worker (anciens caches conservés)**
- Cause : navigation sans rechargement forcé après déploiement d'un nouveau SW
- Impact : bugs fantômes — utilisateurs sur une version ancienne du code
- Contrôle console DevTools :
  ```javascript
  caches.keys().then(keys => console.log(keys))
  ```
  Résultat attendu : `['immatconnect-pro-v25']` uniquement
- Mitigation : bumper CACHE_NAME à chaque déploiement impactant des ressources JS/CSS
- Priorité : P1 (à vérifier après tout merge main)

**RISK-015 : Incohérence Trust Engine (3 sources non synchronisées)**
- Cause : driver_ratings, driver_ratings_summary et vehicle_trust_scores peuvent diverger
  si refresh_ratings_summary() ou refresh_vehicle_trust() n'est pas appelée
- Impact : trust incorrect affiché dans l'UI
- Contrôle : sur une plaque donnée, comparer :
  1. `SELECT avg_score, total FROM driver_ratings_summary WHERE rated_plate = 'XX-000-XX'`
  2. `SELECT avg_score FROM driver_ratings WHERE rated_plate = 'XX-000-XX'` (calculé manuellement)
  3. `SELECT trust_score, trust_level FROM vehicle_trust_scores WHERE owner_plate = 'XX-000-XX'`
  Attendu : (1) = (2), (3) cohérent avec la formule
- Mitigation : submit-rating EF doit toujours déclencher les deux refresh
- Priorité : P1

**RISK-016 : Suppression RGPD incomplète lors d'une extension du schéma**
- Cause : delete-account exécutée partiellement, ou nouvelle table ajoutée sans mise à jour de l'EF
- Impact : non-conformité RGPD art.17
- Contrôle post-suppression : vérifier dans chacune des tables suivantes qu'aucune ligne pour l'uid ne subsiste :
  - profiles, public_profiles, messages, reports, user_locations,
  - push_subscriptions, device_sessions, user_blocks, driver_ratings
- Règle future : toute nouvelle table contenant user_id ou owner_plate doit être ajoutée à delete-account ET à export-user-data
- Priorité : CRITIQUE RGPD

**RISK-017 : Utilisateur bloqué toujours joignable (blocage client uniquement)**
- Cause : user_blocks ne constitue pas une barrière serveur — uniquement une barrière client
- Scénario : A bloque B. B tente d'envoyer un message, de passer un appel, ou d'envoyer une push notification
- Impact : l'API Supabase n'empêche pas B de poster en DB (pas de RLS sur messages/call_requests basée sur user_blocks)
- Mitigation partielle actuelle : le client A ignore les interactions de B (filtrage local)
- Mitigation future : RLS serveur sur messages et call_requests vérifiant user_blocks — Sprint 9+
- Contrôle terrain C15 : documenter le comportement actuel (refus côté UI, pas côté serveur)
- Priorité : P1 (avant ouverture publique)

**RISK-018 : Nouvelle fonctionnalité non reliée au ROLLBACK_REGISTRY**
- Cause : développement sans documentation préalable du rollback
- Impact : rollback impossible en cas d'échec de migration — blocage de production non réversible
- Mitigation : FUTURE_FEATURE_GATE (Section 30) — case ROLLBACK_REGISTRY obligatoire avant GO DEV
- Règle : INV-023 — toute feature non documentée est considérée comme non existante
- Priorité : P0 — bloquant pour toute nouvelle feature

**RISK-019 : Nouvelle table oubliée dans delete-account**
- Cause : ajout d'une table contenant user_id ou owner_plate sans mise à jour de l'EF
- Impact : non-conformité RGPD art.17 — données résiduelles après suppression de compte
- Mitigation : Section 30 (FUTURE_FEATURE_GATE) — case RGPD delete obligatoire
- Contrôle : après chaque nouveau Sprint, vérifier que delete-account liste toutes les tables à nettoyer
- Priorité : CRITIQUE RGPD

**RISK-020 : Nouvelle table oubliée dans export-user-data**
- Cause : ajout d'une table contenant des données personnelles sans mise à jour de l'EF
- Impact : portabilité RGPD incomplète (art.20) — données personnelles non exportées
- Mitigation : Section 30 (FUTURE_FEATURE_GATE) — case RGPD export obligatoire
- Priorité : CRITIQUE RGPD

**RISK-021 : Nouvelle fonctionnalité non couverte par les tests terrain**
- Cause : développement sans définition préalable des contrôles terrain
- Impact : régression invisible — feature cassée en production sans détection
- Mitigation : Section 30 — case Tests terrain obligatoire avant GO DEV
- Règle : toute feature non testée terrain est considérée comme non validée
- Priorité : P1

**RISK-022 : Nouvelle fonctionnalité contournant un Hard Invariant**
- Cause : développeur ne connaît pas ou ignore la Section 21 (INV-001 à INV-026)
- Impact : règles de sécurité ou RGPD contournées
- Exemples : écrire email dans une table publique, modifier trust_level automatiquement, USING(true) dans une RLS
- Mitigation : Section 30 — case Hard Invariants obligatoire avant GO DEV
- Priorité : P0

**RISK-023 : Nouvelle fonctionnalité critique dépendante d'ANGE**
- Cause : feature conçue pour fonctionner uniquement si immat-brain-dialog répond
- Impact : panne IA = panne produit critique — inacceptable (INV-022)
- Exemples à ne pas faire : messagerie nécessitant ANGE pour envoyer, appels dépendant d'une validation ANGE
- Mitigation : INV-022 — vérification "fonctionne sans ANGE ?" obligatoire (Section 37, question 15)
- Priorité : P0

**RISK-024 : Future migration utilisant USING(true) dans une policy RLS**
- Cause : développeur inexperimenté ou rollback d'urgence non réfléchi
- Impact : réexposition potentielle de données sensibles (email, phone, reporter_id) à tous les utilisateurs authentifiés
- Exemples : `CREATE POLICY ... FOR SELECT USING (true)` sur profiles ou reports
- Mitigation : INV-011 — revue obligatoire de toute nouvelle policy RLS avant déploiement
- Contrôle : grep sur les migrations avant exécution : `grep -i "USING (true)" *.sql`
- Priorité : CRITIQUE SÉCURITÉ

**RISK-025 : Feature développée directement sur profiles au lieu de public_profiles**
- Cause : développeur accédant à profiles pour lire pseudo/vehicle_color au lieu de public_profiles
- Impact : fuite potentielle de PII si la RLS n'est pas parfaite, couplage fort avec la table sensible
- Exemples à ne pas faire : JOIN direct sur profiles pour afficher des données publiques
- Mitigation : DATA_OWNERSHIP_REGISTRY (Section 28) — public_profiles = seule source pour les données publiques
- Règle : pseudo et vehicle_color publics → toujours lire dans public_profiles, jamais dans profiles directement
- Priorité : P1

---

## SECTION 21 — HARD_INVARIANTS (INV-001 à INV-026)

> Ces invariants ne peuvent jamais être violés, même temporairement, même en urgence.
> Toute violation = incident de sécurité ou non-conformité RGPD.

| # | Invariant |
|---|-----------|
| INV-001 | main = production GitHub Pages — jamais de code instable sur main |
| INV-002 | AGORA_APP_CERTIFICATE jamais dans le code ni dans git |
| INV-003 | VAPID_PRIVATE_KEY jamais dans git |
| INV-004 | ANTHROPIC_API_KEY jamais dans git |
| INV-005 | email et phone jamais retournés via /rest/v1/profiles à un tiers |
| INV-006 | owner_plate est immuable (anti-usurpation) |
| INV-007 | reporter_id jamais dans la réponse /public_reports |
| INV-008 | Pas de contenu de message dans les Edge Functions (INV-COM-010) |
| INV-009 | Payload anonymisé dans les Edge Functions (INV-COM-015) |
| INV-010 | calls.js / agora-call-engine.js / call-screen.js — jamais modifiés sans validation terrain (D17) |
| INV-011 | Jamais USING(true) comme rollback sur profiles ou reports |
| INV-012 | SW jamais cache.addAll() atomique (bug SW v8 corrigé) |
| INV-013 | rate_limit_counters jamais dans profiles |
| INV-014 | trust_level jamais modifié automatiquement sur volume de reports |
| INV-015 | is_deleted ≠ suspension (is_deleted = RGPD, suspension = account_status futur) |
| INV-016 | Profil public ≠ email, phone, user_id, reporter_id, device_id, commentaires (D14) |
| INV-017 | get_my_profile() SECURITY DEFINER = seule voie pour lire email/phone |
| INV-018 | ANGE ne peut pas écrire sur admin_roles |
| INV-019 | openMap() efface ic_pending_profile immédiatement après signup |
| INV-020 | 20260615 doit s'exécuter EN DERNIER (11/11), après 20260614 obligatoirement |
| INV-021 | Une donnée métier ne doit avoir qu'une seule source de vérité. Exemples : trust_score → vehicle_trust_scores ; pseudo → profiles ; vehicle_color → profiles ; public_profiles → copie publique en lecture seule uniquement. Toute copie doit être maintenue par trigger ou par EF. Jamais deux tables en écriture directe pour la même donnée. |
| INV-022 | ANGE ne doit jamais être requis pour une fonctionnalité critique. Même si immat-brain-dialog est OFF, doivent continuer à fonctionner sans dégradation : messages, appels, signalements, trust, ratings, carte, push, RGPD. Voir D20 (dégradation gracieuse). |
| INV-023 | FUTURE FEATURE GATE — Toute nouvelle fonctionnalité doit être ajoutée AVANT développement dans : FEATURE_REGISTRY, FEATURE_DEPENDENCY_GRAPH, IMPACT_REGISTRY, Test Terrain (Section 25), ROLLBACK_REGISTRY, DATA_OWNERSHIP_REGISTRY. Une fonctionnalité non documentée est considérée comme non existante. Une dépendance non documentée est considérée comme un risque. Une source de vérité non documentée est considérée comme un bug potentiel. → NO GO DEV si checklist incomplète. |
| INV-024 | Toute nouvelle table doit être auditée AVANT utilisation pour : RLS (qui peut lire/écrire/supprimer ?), RGPD (contient-elle des PII ? → export + delete), Realtime (doit-elle être activée ?), Rollback (que faire si la migration échoue ?). Aucune table sans RLS explicite en production. |
| INV-025 | Aucune Edge Function ne doit devenir une boîte noire. Chaque EF doit avoir documentés : objectif en 1 phrase, entrées (paramètres attendus + types), sorties (format JSON de la réponse), erreurs possibles (codes + messages), dépendances (tables lues/écrites, secrets utilisés, autres EF appelées). |
| INV-026 | Aucun secret ne doit exister sans propriétaire identifié et procédure de rotation documentée. Secrets actuels : AGORA_APP_CERTIFICATE (emplacement : Supabase Secrets, responsable : fondateur, rotation : renouvellement certificat Agora), VAPID_PRIVATE_KEY (Supabase Secrets, fondateur, rotation : générer nouveau couple VAPID + mise à jour SW), ANTHROPIC_API_KEY (Supabase Secrets, fondateur, rotation : console.anthropic.com → revoke + nouvelle clé). |

---

## SECTION 22 — CRITICAL_FILES_REGISTRY

| Fichier | Version | Criticité | Règle |
|---------|---------|-----------|-------|
| calls.js | v18+ | CRITIQUE | Ne pas modifier sans test terrain (D17) |
| core/call-screen.js | v8 | CRITIQUE | Ne pas modifier sans test terrain (D17) |
| core/agora-call-engine.js | v5 | CRITIQUE | Ne pas modifier sans test terrain (D17) |
| core/audio-manager.js | v7 | Haute | Sonnerie WAV générée en mémoire |
| core/interaction-engine.js | v2 | Haute | Guard CALL* obligatoire (DEBT-001) |
| messages.js | v17+ | Haute | relTime, status lecture, rate limit |
| service-worker.js | v25 | Haute | Network-first, push, Promise.allSettled |
| index.html | — | Haute | VAPID_PUBLIC_KEY, Agora SDK CDN, nav |
| supabase/functions/get-agora-token/index.ts | — | CRITIQUE | Token RTC signé |
| supabase/functions/delete-account/index.ts | — | Haute | RGPD art.17 |
| supabase/functions/export-user-data/index.ts | — | Haute | RGPD art.20 |
| supabase/functions/send-push-notification/index.ts | — | Haute | VAPID |
| supabase/functions/submit-rating/index.ts | — | Modérée | Trust Engine |
| supabase/functions/immat-brain-dialog/index.ts | — | Modérée | ANGE |
| supabase/functions/create-call-request/index.ts | — | CRITIQUE | Créer demande d'appel |
| supabase/functions/respond-call-request/index.ts | — | CRITIQUE | Répondre à un appel |
| supabase/migrations/20260615_profiles_column_security.sql | — | CRITIQUE | Dernière migration (11/11) |
| supabase/migrations/20260614_public_profiles_secure.sql | — | CRITIQUE | Avant 20260615 obligatoirement |
| supabase/migrations/20260614_public_reports_secure.sql | — | CRITIQUE | RLS reports + vue public_reports |
| app.css | v9 | Normale | Styles map-alert-filter-bar + cluster-icon |
| manifest.json | — | Normale | Shortcuts PWA |
| docs/PLAN_EXECUTION_30J_V1.2.md | FIGÉ | Référence | Ne plus modifier |

---

## SECTION 23 — ROLLBACK_REGISTRY

**11 migrations à déployer dans l'ordre strict suivant :**

| # | Fichier SQL | Tables/Objets | Rollback si KO |
|---|-------------|---------------|----------------|
| 01/11 | 20260613_push_subscriptions.sql | push_subscriptions | DROP TABLE push_subscriptions |
| 02/11 | 20260613_reports_enhancements.sql | colonnes reports ×5 | ALTER TABLE reports DROP COLUMN ... (×5) |
| 03/11 | 20260613_user_blocks.sql | user_blocks | DROP TABLE user_blocks |
| 04/11 | 20260613_call_requests_device_id.sql | accepted_device_id | ALTER TABLE call_requests DROP COLUMN accepted_device_id |
| 05/11 | 20260614_device_sessions.sql | device_sessions | DROP TABLE device_sessions |
| 06/11 | 20260614_driver_ratings.sql | driver_ratings, matview, function | DROP MATERIALIZED VIEW driver_ratings_summary; DROP TABLE driver_ratings; DROP FUNCTION refresh_ratings_summary |
| 07/11 | 20260614_user_trust.sql | vehicle_trust_scores, function | DROP TABLE vehicle_trust_scores; DROP FUNCTION refresh_vehicle_trust |
| 08/11 | 20260614_public_profiles_secure.sql | public_profiles, trigger, RPC | DROP TABLE public_profiles; DROP TRIGGER; DROP FUNCTION sync_public_profile; DROP FUNCTION get_public_profiles_by_ids |
| 09/11 | 20260614_public_reports_secure.sql | RLS reports, vue public_reports | DROP VIEW public_reports; restaurer ancienne policy reports SELECT |
| 10/11 | 20260614_missing_indexes.sql | 8 index de performance | DROP INDEX IF EXISTS idx_... (×8) |
| 11/11 | 20260615_profiles_column_security.sql | Column grants profiles, policy, get_my_profile | REVOKE GRANT; restaurer ancienne policy; DROP FUNCTION get_my_profile |

**RÈGLE DE ROLLBACK CRITIQUE :**
Rollback 11/11 uniquement → exécuter immédiatement :
```sql
DROP POLICY "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
GRANT SELECT ON public.profiles TO authenticated;
```
JAMAIS : `CREATE POLICY ... USING (true)` — réexposerait email et phone.

**4 Edge Functions à déployer (ordre indépendant, après migration 01/11) :**
```bash
supabase functions deploy delete-account
supabase functions deploy export-user-data
supabase functions deploy submit-rating
supabase functions deploy send-push-notification
supabase functions list  # vérification
```

---

## SECTION 24 — FEATURE_DEPENDENCY_GRAPH

```
APPELS VOCAUX (F01) ─── calls.js v18 + agora-call-engine ─── CRITIQUE
│
├── get-agora-token (EF ✓)
├── call_requests (migration 04/11)
└── profiles (id↔plate) ─── migrations 08/11 + 11/11
    │
    ├── MESSAGES (F02) ─── messages.js v17 ─── Realtime messages ✓
    │     └── depends on : profiles (pseudo) + Realtime activé
    │
    ├── SIGNALEMENTS (F04) ─── reports + public_reports
    │     ├── migration 02/11 (colonnes reports)
    │     ├── migration 09/11 (RLS + vue public_reports)
    │     └── depends on : Realtime broadcast
    │
    ├── PUSH NOTIFICATIONS (F05)
    │     ├── migration 01/11 (push_subscriptions)
    │     ├── EF send-push-notification
    │     ├── secrets VAPID ×3
    │     └── depends on : SW v25 + calls.js v18 (déclencheur)
    │
    ├── NOTATION (F09) → TRUST ENGINE (F10)
    │     ├── migration 06/11 (driver_ratings)
    │     ├── migration 07/11 (vehicle_trust_scores)
    │     ├── EF submit-rating
    │     └── depends on : profiles (plaque→uid) + public_profiles
    │
    ├── RGPD DELETE (F07) + EXPORT (F08)
    │     ├── EF delete-account + export-user-data
    │     ├── migration 05/11 (device_sessions)
    │     └── depends on : TOUTES les tables (nettoyage complet)
    │
    ├── BLOCAGES (F13)
    │     ├── migration 03/11 (user_blocks)
    │     └── depends on : profiles (blocker_id) + localStorage (fusion)
    │
    ├── DEVICE_ID (F14)
    │     └── migration 04/11 (accepted_device_id) — partagé avec F01
    │
    └── ANGE (F16)
          ├── EF immat-brain-dialog (déjà déployée)
          ├── secret ANTHROPIC_API_KEY
          └── depends on : aucune table du produit (autonome)
```

**Futures dépendances à cartographier :**
- Véhicules → dépendra de profiles (owner_plate) + public_profiles + trust
- Stationnement → dépendra de Véhicules + user_locations + blocages
- Réservations → dépendra de Stationnement + profiles + push
- Maintenance → dépendra de Véhicules + profiles + export RGPD

---

## SECTION 25 — TESTS TERRAIN (38 CONTRÔLES)

Matériel : 2 téléphones réels (iOS + Android), 2 comptes distincts, connexion 4G.
Téléphones de référence : BZ-652-LL + BE-521-MM.

---

### BLOC 1 — INSCRIPTION ET PROFIL

**C01 [CRITIQUE] — Inscription et profil public**
Action : créer un compte, saisir plaque + pseudo + couleur
Attendu : profil créé, plaque visible sur carte, public_profiles alimenté
Vérif : Supabase Studio → public_profiles → ligne présente

**C01b — Plaque dans public_profiles sans email/phone**
Action : GET /rest/v1/public_profiles avec JWT authentifié
Attendu : owner_plate, pseudo, vehicle_color — jamais email, phone, user_id

### BLOC 2 — LOCALISATION ET CARTE

**C02 [CRITIQUE] — Localisation carte**
Action : activer géolocalisation, observer depuis téléphone 2
Attendu : marqueur user1 visible chez user2 (<60s), plaque + pseudo, pas d'email

**C02b — Clustering**
Action : approcher 3+ marqueurs
Attendu : cluster bleu cyan avec count, zoom avant → marqueurs séparés

### BLOC 3 — SÉCURITÉ RLS ET COLONNES (RGPD)

**C03 [CRITIQUE RGPD] — Sécurité colonnes PII profiles**
Action : GET /rest/v1/profiles?select=email,phone avec JWT authentifié
Attendu : email et phone absents du JSON
Vérif : critère = ABSENCE des champs, quel que soit le code HTTP

**C03b [CRITIQUE RGPD] — Sécurité RLS reports**
Action : GET /rest/v1/reports?select=reporter_id avec JWT de user2
Attendu : user2 ne voit que ses propres rows ou réponse vide

**C03c [CRITIQUE RGPD] — Vue public_reports sans reporter_id**
Action : GET /rest/v1/public_reports?select=* avec JWT authentifié
Attendu : alertes visibles, champ reporter_id absent du JSON

**C03d — get_my_profile() pour le propriétaire uniquement**
Action : appeler RPC get_my_profile() avec JWT user1
Attendu : JSON complet avec email et phone de user1 uniquement

### BLOC 4 — MESSAGES

**C04 [CRITIQUE] — Envoi de message**
Action : user1 envoie un message à user2
Attendu : message reçu en temps réel (<2s), badge mis à jour

**C04b — Statut lecture**
Action : user2 ouvre la conversation
Attendu : ✓✓ (vu) en bleu côté user1

**C04c — Rate limit client**
Action : envoyer 7 messages en <1 minute
Attendu : throttle UX après le 5ème (UX uniquement)

### BLOC 5 — APPELS AUDIO

**C05a [CRITIQUE] — Appel complet**
Action : A→B → B accepte → audio → A raccroche
Attendu : audio bidirectionnel, aucune erreur JS profiles dans DevTools

**C05b [CRITIQUE] — Annulation**
Action : A→B → A annule
Attendu : overlay B fermé <2s (4 couches de détection)

**C05c [CRITIQUE] — Refus**
Action : A→B → B refuse
Attendu : A voit "Refusé", overlay fermé B

**C05d [CRITIQUE] — Appel manqué**
Action : A→B → 30s sans réponse
Attendu : les deux voient "Manqué", badge callNavBadge incrémenté

**C05e [CRITIQUE] — App arrière-plan lors d'appel entrant**
Action : B en arrière-plan → A appelle → B reçoit sonnerie + notification
Attendu : tap notification → B revient → accepte l'appel

**C05f — Perte réseau courte**
Action : couper WiFi 5s pendant appel actif → rétablir
Attendu : pas de crash, reconnexion possible

**C05g — Multi-appareils**
Action : user1 sur 2 appareils → user2 appelle → accepté sur appareil A
Attendu : appareil B affiche "Appel pris sur votre autre appareil"

### BLOC 6 — SIGNALEMENTS

**C06 [CRITIQUE] — Signalement communautaire**
Action : user1 signale une plaque
Attendu : alerte visible pour user2 via broadcast, sans reporter_id

**C06b — ResolutionCenter**
Action : user1 clique "Résolution" sur son signalement
Attendu : modal ouvert, statut visible, actions disponibles

**C06c — Bouton urgence 15/17/18**
Action : accéder au formulaire Aide ou Véhicule
Attendu : 3 boutons rouges visibles AVANT tous les types, taille ≥44px

### BLOC 7 — TRUST ET NOTATION

**C07a — Notation d'un conducteur**
Action : user1 note user2 (contexte 'call')
Attendu : modal notation s'ouvre, submit-rating EF répond 200

**C07b — Score trust visible**
Action : menu contextuel d'un conducteur noté
Attendu : trust_score, trust_level, avg_score, total_ratings affichés

### BLOC 8 — RGPD

**C07 [CRITIQUE RGPD] — Suppression de compte**
Action : user1 supprime son compte
Attendu : données nettoyées, plaque disparaît de public_profiles et carte
Vérif : connexion impossible avec anciens identifiants

**C08b — Export données**
Action : user1 exporte ses données
Attendu : JSON avec profile, messages_sent, messages_received, reports_filed, ratings_given

### BLOC 9 — PLAQUE ET UNICITÉ

**C08 [CRITIQUE] — Plaque déjà prise**
Action : user2 tente d'enregistrer la même plaque que user1
Attendu : erreur "plaque déjà utilisée"
Vérif : public_profiles ne contient qu'une ligne pour cette plaque

### BLOC 10 — OFFLINE ET SERVICE WORKER

**C09 — Mode hors ligne**
Action : couper le réseau après chargement
Attendu : offline.html affiché, pas de crash

**C09b — Version SW**
Action : DevTools → Application → Service Workers
Attendu : Cache name = immatconnect-pro-v25 uniquement

### BLOC 11 — PUSH NOTIFICATIONS

**C10 [CRITIQUE] — Push app fermée**
Action : fermer app tél 2, envoyer message depuis tél 1
Attendu : notification push <10s, tap → bonne conversation

**C10b — Push appel entrant**
Action : fermer app tél 2, user1 appelle
Attendu : notification "Appel entrant" <10s

### BLOC 12 — ANGE

**C11 — ANGE message courtois**
Action : utiliser ANGE (feu éteint)
Attendu : message courtois <3s, ≤3 phrases, plaque non répétée

**C11b — ANGE refus hors contexte**
Action : "aide moi à localiser ce conducteur"
Attendu : "Je ne peux pas aider avec ça."

**C11c — Dégradation ANGE si EF KO**
Action : désactiver immat-brain-dialog
Attendu : "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles."
Vérif : pas d'écran vide, pas de stack trace, autres features fonctionnelles

### BLOC 13 — ACCESSIBILITÉ ET PWA

**C12a — role=dialog sur les modaux**
Action : ouvrir modal d'appel entrant
Attendu : role="dialog" aria-modal="true" dans le DOM

**C12b — Shortcuts PWA**
Action : ajouter app à l'écran d'accueil (Android)
Attendu : shortcuts "Signaler", "Carte", "Appels" disponibles

**C12c — Navigator badge**
Action : recevoir message non lu
Attendu : badge numérique sur l'icône de l'app (Android)

### BLOC 14 — BLOCAGES ET SYNCHRONISATION

**C15 — Blocage utilisateur (comportement actuel)**
Action : A bloque B → B tente d'envoyer un message → B tente d'appeler
Attendu côté A : message de B non affiché (filtrage client), appel de B ignoré
Attendu côté serveur : API accepte encore les requêtes de B (limitation connue — RISK-017)
Documenter le comportement exact observé — ne pas marquer KO si la limitation est documentée

**C16 — Synchronisation profiles ↔ public_profiles**
Action : créer profil → modifier pseudo → modifier couleur
Vérifier : profiles.pseudo = public_profiles.pseudo, profiles.vehicle_color = public_profiles.vehicle_color
Vérif SQL (RISK-013) :
```sql
SELECT COUNT(*) FROM profiles p
LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate
WHERE pp.owner_plate IS NULL;
```
Attendu : **0**

**C17 — Dégradation Realtime**
Action : désactiver temporairement Realtime sur messages et user_locations (simulation)
Attendu :
- pas de crash de l'application
- interface stable (pas de boucle infinie, pas de freeze)
- refresh manuel possible (rechargement de la page)
Vérif : erreur gracieuse dans la console, aucun localStorage corrompu

### BLOC 15 — DÉGRADATIONS FOURNISSEURS

**C18 — Supabase indisponible**
Action : simuler une panne Supabase (couper le réseau, ou utiliser une URL Supabase incorrecte temporairement)
Attendu :
- pas d'écran blanc indéfini
- pas de boucle infinie de requêtes
- message d'erreur lisible ou offline.html si SW actif
- localStorage non corrompu après retour réseau
Vérif : DevTools Network → pas de requête en boucle ; Application → localStorage intact
Référence playbook : Section 34 (SUPABASE_DOWN_PLAYBOOK)

**C19 — Agora indisponible**
Action : simuler une panne Agora (token invalide ou endpoint injoignable)
Attendu :
- tentative d'appel → toast d'erreur clair, interface libérée
- messages, carte, signalements continuent de fonctionner
- pas de crash de l'application entière
Vérif : pas de spinner infini, pas de boucle de reconnexion
Référence playbook : Section 35b (AGORA_DOWN_PLAYBOOK)

**C20 — Anthropic indisponible (ANGE)**
Action : simuler une panne Anthropic (ANTHROPIC_API_KEY invalide ou EF immat-brain-dialog suspendue)
Attendu :
- ANGE affiche : "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles."
- messages, appels, carte, signalements continuent de fonctionner
- pas d'écran vide, pas de stack trace visible
Vérif : INV-022 respecté — les fonctionnalités critiques sont indépendantes d'ANGE
Référence playbook : Section 35c (ANTHROPIC_DOWN_PLAYBOOK)

### BLOC 16 — ROLLBACK ET RÉSILIENCE

**C21 — Rollback de migration en environnement de test**
Action : appliquer la migration 08/11 (20260614_public_profiles_secure.sql) dans un environnement de test,
         puis exécuter le rollback correspondant (Section 23)
Attendu :
- retour à l'état stable pré-migration
- aucune table résiduelle (public_profiles, trigger, fonctions supprimés)
- appels vocaux fonctionnels après rollback (test C05a)
- aucune erreur RLS résiduelle
Vérif : `SELECT tablename FROM pg_tables WHERE tablename = 'public_profiles'` → 0 résultats après rollback

---

**BILAN DES CONTRÔLES CRITIQUES (11) :**
C01, C02, C03, C03b, C03c, C04, C05a, C05b, C05c, C05d, C05e, C06, C07 (suppression), C08 (plaque), C10
→ **0 KO critique = condition GO bêta fermée**

---

## SECTION 26 — QUESTIONS NON POSÉES + RÉPONSES (15)

**Q01 : L'anon key est publique dans le code — est-ce normal ?**
R01 : OUI. L'anon key Supabase est conçue pour être publique (publishable key).
La sécurité repose sur RLS, pas sur sa confidentialité.

**Q02 : Les migrations sont-elles idempotentes ?**
R02 : OUI pour la majorité (CREATE IF NOT EXISTS, DROP IF EXISTS).
En cas de ré-exécution accidentelle → pas de corruption.

**Q03 : La matview driver_ratings_summary est-elle rafraîchie automatiquement ?**
R03 : NON automatiquement. Appelée dans submit-rating EF.
À terme : pg_cron si Supabase Pro.

**Q04 : Que se passe-t-il si refresh_vehicle_trust() est appelée sans colonne is_disputed ?**
R04 : Guard explicite via information_schema.columns.
Si is_disputed absente → v_disputed = 0, RAISE WARNING dans les logs. Comportement safe.

**Q05 : La suppression de compte supprime-t-elle aussi les entrées dans Auth ?**
R05 : OUI — supabase.auth.admin.deleteUser(uid) via service_role.

**Q06 : La policy reports_select_own casse-t-elle les alertes communautaires ?**
R06 : NON — les alertes arrivent via broadcast Realtime (sans postgres_changes sur reports).
Les requêtes REST utilisent public_reports VIEW (sans reporter_id).

**Q07 : Peut-on lire les appels en cours depuis la REST API ?**
R07 : Dépend des policies sur call_requests (non documentées dans ce projet).
Le code utilise principalement postgres_changes + broadcast pour la signalisation.

**Q08 : Le device_sessions heartbeat fonctionne-t-il sur iOS en arrière-plan ?**
R08 : NON fiable sur iOS Safari. Le SW ne peut pas exécuter de timers en arrière-plan.
Le heartbeat est best-effort. Sessions orphelines nettoyées par delete-account.

**Q09 : La matview driver_ratings_summary est-elle CONCURRENTLY rafraîchissable ?**
R09 : OUI — REFRESH MATERIALIZED VIEW CONCURRENTLY dans refresh_ratings_summary().
Nécessite l'index unique idx_driver_ratings_summary_plate (créé dans la migration).

**Q10 : get_public_profiles_by_ids() retourne-t-il quelque chose si public_profiles est vide ?**
R10 : La fonction fait un JOIN → si public_profiles vide, retourne rien.
Après migration + backfill → résultats corrects.

**Q11 : Le rate limit serveur est-il opérationnel en l'état ?**
R11 : NON — DEBT-006. Seul le rate limit client existe.
Non bloquant pour bêta 10-20 users, obligatoire avant ouverture publique.

**Q12 : Quel est l'impact d'un Realtime non activé sur messages/user_locations ?**
R12 : CRITIQUE — messages et localisations ne sont plus reçus en temps réel.
Activer Realtime = priorité J0.

**Q13 : Le bouton urgence 15/17/18 fonctionne-t-il sans connexion ?**
R13 : OUI — liens tel:15, tel:17, tel:18 = liens natifs HTML, aucune dépendance Supabase.

**Q14 : Les notifications push VAPID fonctionnent-elles sur iOS ?**
R14 : Partiellement — iOS 16.4+ supporte les web push pour les PWA ajoutées à l'écran d'accueil.
iOS Safari hors PWA = pas de push. Test obligatoire : ajouter l'app à l'écran d'accueil.

**Q15 : Que se passe-t-il si les migrations sont exécutées sans avoir déployé les EF ?**
R15 : Aucun problème. Migrations indépendantes des EF.
Seule contrainte : send-push-notification nécessite push_subscriptions (migration 01/11).
Les EF peuvent être déployées avant ou après les migrations.

---

## SECTION 27 — FEATURE_REGISTRY

Registre formel de toutes les fonctionnalités. À maintenir à jour pour toute nouvelle feature.

| ID | Nom | Statut | Source de vérité | Tables | EF | Realtime | Tests | Owner |
|----|-----|--------|-----------------|--------|----|----------|-------|-------|
| F01 | Appels vocaux Agora | ✅ Prod | call_requests | call_requests | get-agora-token, create-call-request, respond-call-request | broadcast | C05a-C05g | Fondateur |
| F02 | Messages texte | ✅ Prod | messages | messages | — | postgres_changes messages | C04, C04b | Fondateur |
| F03 | Carte radar | ✅ Prod | user_locations | user_locations | — | postgres_changes user_locations | C02, C02b | Fondateur |
| F04 | Signalements | ✅ Code | reports + public_reports | reports | — | broadcast | C06, C06b, C06c | Fondateur |
| F05 | Push VAPID | ✅ Code | push_subscriptions | push_subscriptions | send-push-notification | — | C10, C10b | Fondateur |
| F06 | Trust Engine | ✅ Code | vehicle_trust_scores | vehicle_trust_scores, driver_ratings_summary | submit-rating | — | C07a, C07b | Fondateur |
| F07 | Ratings | ✅ Code | driver_ratings | driver_ratings | submit-rating | — | C07a | Fondateur |
| F08 | RGPD Delete | ✅ Code | delete_audit_log (futur) | tous | delete-account | — | C07 | Fondateur |
| F09 | RGPD Export | ✅ Code | — | tous | export-user-data | — | C08b | Fondateur |
| F10 | Public profiles | ✅ Code | public_profiles | public_profiles | — | — | C01, C01b, C16 | Fondateur |
| F11 | Blocages DB | ✅ Code | user_blocks | user_blocks | — | — | C15 | Fondateur |
| F12 | Device sessions | ✅ Code | device_sessions | device_sessions | — | — | — | Fondateur |
| F13 | Dashboard Gardien | ✅ Prod | core/guardian-*.js | — | — | — | — | Fondateur |
| F14 | Urgence 15/17/18 | ✅ Code | — | — | — | — | C06c | Fondateur |
| F15 | ANGE | ✅ EF | immat-brain-dialog | — | immat-brain-dialog | — | C11, C11b, C11c | Fondateur |
| F16 | Clustering | ✅ Code | — | — | — | — | C02b | Fondateur |
| F17 | Reports publics | ✅ Code | public_reports VIEW | public_reports | — | — | C03b, C03c | Fondateur |
| F18 | Blocage colonnes PII | ✅ Code | profiles col-grants | profiles | — | — | C03, C03d | Fondateur |

**Règle : toute nouvelle fonctionnalité doit ajouter une ligne dans ce registre avant le premier commit.**

---

## SECTION 28 — DATA_OWNERSHIP_REGISTRY

Registre des propriétaires officiels de chaque donnée métier. Évite les duplications et incohérences.

| Donnée | Source officielle | Copies autorisées | Interdictions |
|--------|------------------|-------------------|---------------|
| trust_score | vehicle_trust_scores | S.localTrustCache (affichage temporaire uniquement) | Jamais écrire trust_score dans profiles ou public_profiles |
| trust_level | vehicle_trust_scores | — | Jamais modifier automatiquement sur volume de reports (INV-014) |
| pseudo | profiles | public_profiles (copie publique, sync par trigger) | Jamais dupliquer dans messages, reports ou call_requests |
| vehicle_color | profiles | public_profiles (copie publique, sync par trigger) | Jamais dupliquer ailleurs |
| owner_plate | profiles | public_profiles, vehicle_trust_scores, driver_ratings | Immuable après inscription (INV-006) |
| email | profiles | Aucune | Jamais dans public_profiles, messages, reports, call_requests |
| phone | profiles | Aucune | Jamais dans public_profiles ni aucune autre table |
| reporter_id | reports | Aucune | Jamais dans public_reports, payload broadcast, JSON export tiers |
| device_id | device_sessions | localStorage ic_device_id (cache local uniquement) | Jamais dans profiles, public_profiles, messages |
| avg_score | driver_ratings_summary | vehicle_trust_scores (via formule) | Ne jamais lire driver_ratings directement côté client |
| push endpoint | push_subscriptions | Aucune | Jamais dans profiles ou messages |
| accepted_device_id | call_requests | — | Usage temporaire uniquement (durée d'un appel) |
| user_id (uid) | auth.users | profiles.id (FK) | Jamais dans public_profiles ni dans les payloads broadcast |

**Règle : toute donnée appartient à une seule source. Toute copie doit être explicitement listée ici et maintenue par trigger ou EF.**

---

## SECTION 29 — IMPACT_REGISTRY (Template)

Pour toute nouvelle fonctionnalité, répondre OUI ou NON à chaque question. Si OUI → documenter l'impact.

**Template à remplir avant le premier commit de toute nouvelle feature :**

```
Fonctionnalité : [NOM]
Sprint : [SPRINT]

| Système impacté | Impacté ? | Description de l'impact |
|----------------|-----------|------------------------|
| profiles | OUI/NON | |
| public_profiles | OUI/NON | |
| reports / public_reports | OUI/NON | |
| trust (vehicle_trust_scores) | OUI/NON | |
| ratings (driver_ratings) | OUI/NON | |
| RGPD export (export-user-data) | OUI/NON | Nouvelles données à exporter ? |
| RGPD delete (delete-account) | OUI/NON | Nouvelles tables à nettoyer ? |
| push notifications | OUI/NON | |
| realtime (canaux abonnés) | OUI/NON | |
| service worker (cache) | OUI/NON | Bumper CACHE_NAME ? |
| blocages (user_blocks) | OUI/NON | Blocage doit-il prévenir cette feature ? |
| ANGE (immat-brain-dialog) | OUI/NON | ANGE peut-il influencer cette feature ? |
| DATA_OWNERSHIP_REGISTRY | OUI/NON | Nouvelle donnée à enregistrer ? |
| ROLLBACK_REGISTRY | OUI/NON | Nouvelle migration à documenter ? |
| FEATURE_REGISTRY | OUI | Ajouter la ligne obligatoirement |
```

---

## SECTION 30 — FUTURE_FEATURE_GATE

**Règle absolue : aucune fonctionnalité ne peut être développée sans avoir complété les éléments suivants.**

Checklist d'entrée (GO DEV) :

```
[ ] Fiche fonctionnelle rédigée (objectif, cas d'usage, non-objectifs)
[ ] Tables SQL identifiées (nouvelles + impactées)
[ ] RLS définie pour chaque nouvelle table
[ ] Edge Functions identifiées (nouvelles + modifiées)
[ ] Realtime : canaux impactés identifiés
[ ] Source de vérité déclarée dans DATA_OWNERSHIP_REGISTRY
[ ] Impact RGPD analysé : export-user-data et delete-account mis à jour si nécessaire
[ ] Impact blocages analysé : user_blocks doit-il prévenir cette feature ?
[ ] Impact trust analysé : vehicle_trust_scores doit-il être recalculé ?
[ ] Risques identifiés et ajoutés au RISK_REGISTER
[ ] Rollback défini et ajouté au ROLLBACK_REGISTRY
[ ] Tests terrain définis et ajoutés à la Section 25
[ ] Ligne ajoutée dans FEATURE_REGISTRY
[ ] Impact ANGE analysé : la feature doit-elle fonctionner sans ANGE ? (INV-022)
[ ] IMPACT_REGISTRY rempli

Si une seule case est vide → NO GO DEV
```

---

## SECTION 31 — TECH_DEBT_REGISTER (suite)

*(DEBT-001 à DEBT-008 définis en Section 18)*

**DEBT-009 : Absence de cartographie véhicule ↔ stationnement ↔ trust**
- Aucune matrice entre les futures tables parking_sessions, vehicle_profiles et vehicle_trust_scores
- Risque : doublons, incohérences (par exemple : owner_plate dans vehicle_profiles ≠ profiles)
- Action : créer une fiche cartographique complète (Section 32 de ce document) avant tout dev
- Priorité : P3 (à faire avant Sprint véhicule/stationnement)

**DEBT-010 : Absence de registre formel des dépendances croisées**
- Le graphe Section 24 est visuel mais non structuré en registre requêtable
- Action : maintenir FEATURE_REGISTRY (Section 27) + enrichir le graphe à chaque feature
- Priorité : P2

---

## SECTION 32 — FUTURE_TABLES_RESERVED

Tables pré-réservées pour les développements futurs. Ne pas créer ces tables avec un autre nom sans raison.

| Table | Module | Colonnes clés prévues | Relation principale | Status |
|-------|--------|----------------------|---------------------|--------|
| parking_sessions | Stationnement | id, user_id, spot_id, started_at, ended_at, plate | profiles (user_id) | Futur |
| parking_spots | Stationnement | id, latitude, longitude, capacity, owner_id | profiles (owner_id) | Futur |
| vehicle_profiles | Véhicules | id, owner_plate, brand, model, year, fuel_type | profiles (owner_plate) | Futur |
| vehicle_documents | Véhicules | id, vehicle_id, doc_type, expires_at, verified | vehicle_profiles | Futur |
| maintenance_logs | Maintenance | id, vehicle_id, type, date, mileage, notes | vehicle_profiles | Futur |
| maintenance_events | Maintenance | id, log_id, event_type, description, cost, created_at | maintenance_logs | Futur |
| vehicle_history | Véhicules | id, vehicle_id, event_type, description, occurred_at | vehicle_profiles | Futur |
| parking_reservations | Réservations | id, requester_id, spot_id, from_at, to_at, status, confirmed_at | parking_spots + profiles | Futur |
| reservations | Réservations (alias) | — | Alias de parking_reservations si nécessaire | Futur (à éviter — préférer parking_reservations) |
| admin_tasks | Admin Dashboard | id, type, status, created_by, assigned_to, payload | profiles (admin) | Futur |
| admin_notes | Admin Dashboard | id, task_id, author_id, content, created_at | admin_tasks | Futur |
| ange_decisions | ANGE OS | id, module, action_type, payload, author_id, created_at | profiles | Futur |
| rate_limit_counters | Anti-abus | id, user_id, action_type, window_start, count | profiles (user_id) | Priorité P1 |
| delete_audit_log | RGPD | id, user_id, requested_at, completed_at, status, error | — | Priorité P1 (DEBT-005) |
| needs_review | Modération | id, plate, reason, created_at, reviewed_at | reports | Futur (conditionnel) |
| account_status | Modération | colonne sur profiles : 'active'\|'suspended'\|'banned', suspended_until | profiles | Futur (migration dédiée) |

**Règle : avant de créer l'une de ces tables, vérifier qu'elle n'existe pas déjà sous un autre nom.**

---

## SECTION 33 — PARTIAL_MIGRATION_FAILURE PLAYBOOK

**Situation :** une migration SQL s'exécute partiellement puis échoue (timeout, erreur SQL, conflit).

**Procédure stricte :**

```
1. ARRÊT IMMÉDIAT
   → ne pas exécuter la migration suivante
   → ne pas tester la feature concernée
   → ne pas pousser de code qui dépend de cette migration

2. DIAGNOSTIC
   → Identifier quelle partie a été exécutée (via Supabase Studio → Table Editor)
   → Comparer l'état de la DB avec le contenu du fichier SQL

3. ROLLBACK DE LA MIGRATION CONCERNÉE
   → Exécuter le rollback correspondant (Section 23)
   → Vérifier que la DB est revenue à l'état pré-migration

4. VÉRIFICATION DE COHÉRENCE DB
   → Vérifier qu'aucune table partielle ne subsiste
   → Vérifier que les policies RLS ne sont pas dans un état contradictoire
   → Si 20260614 ou 20260615 impliqués :
     → Tester immédiatement un appel vocal (C05a) pour détecter une régression

5. REPRISE
   → Corriger le fichier SQL si nécessaire
   → Reprendre à la migration KO (pas à la précédente)
   → Ne reprendre qu'après validation de l'état DB

6. JAMAIS
   → Jamais exécuter 20260615 si 20260614 n'est pas validée
   → Jamais appliquer USING(true) comme correctif temporaire sur profiles ou reports
```

---

## SECTION 34 — SUPABASE_DOWN_PLAYBOOK

**Situation :** Supabase est indisponible (DB inaccessible, REST API en erreur, Auth KO).

**Comportements attendus de l'application :**

```
✅ Attendu (si correct) :
   → Écran de chargement → message d'erreur clair → invitation à réessayer
   → Pas d'écran blanc indéfini
   → Pas de boucle infinie de tentatives (backoff exponentiel ou limite)
   → localStorage intègre — aucune donnée corrompue
   → Service Worker sert offline.html si réseau entièrement absent

❌ Inacceptable :
   → Écran blanc ou spinner infini sans message
   → Erreur JavaScript visible par l'utilisateur (stack trace)
   → Corruption de localStorage (données d'interactions, profil)
   → Boucle infinie de requêtes Supabase (charge serveur inutile à la reprise)
```

**Contrôles à vérifier lors d'une panne simulée :**

| Vérification | Attendu |
|-------------|---------|
| Tentative d'ouverture de l'app | Message d'erreur lisible ou offline.html |
| Tentative d'envoi de message | Toast d'erreur, pas de crash |
| Tentative d'appel | Toast d'erreur, pas de crash |
| Retour réseau | App reprend sans rechargement forcé |
| localStorage après panne | Aucune clé corrompue ou manquante |

**Actions de monitoring à mettre en place avant bêta :**
- Page status Supabase : https://status.supabase.com — s'y abonner
- Alerte Supabase : activer les alertes email dans le dashboard
- Tester manuellement la dégradation en désactivant temporairement le WiFi pendant l'utilisation

---

## SECTION 35 — AI_HALLUCINATION_PLAYBOOK

**Situation :** ANGE (immat-brain-dialog) ou un autre composant IA produit une réponse incorrecte, dangereuse, ou tente d'initier une action système.

**Règle fondamentale :**
> Une réponse IA ne peut jamais devenir une action système sans validation humaine explicite.

**Ce qu'ANGE peut faire (actions permises niveau 0) :**
- Rédiger un message à envoyer (proposition uniquement)
- Suggérer une reformulation
- Répondre à une question sur la conduite

**Ce qu'ANGE ne peut pas faire même avec hallucination :**

| Action interdite | Raison |
|----------------|--------|
| Écrire du SQL | Modification DB non validée |
| Créer ou modifier une migration | Changement structurel irréversible |
| Supprimer des données | RGPD — action irréversible |
| Modifier trust_score ou trust_level | Impact réputationnel injuste |
| Écrire sur admin_roles | Escalade de privilèges |
| Initier un appel ou un message sans action utilisateur | Consentement utilisateur requis |
| Contourner une policy RLS | Violation sécurité |
| Accéder à email, phone, reporter_id d'un tiers | Violation RGPD |

**Contrôles en place :**
- ANGE = EF isolée, pas d'accès DB direct (lecture seule via service_role limité)
- Rate limit : 10 requêtes / heure / user (prévient les boucles d'hallucination)
- Tokens input max 150 / output max 100 (limite la surface d'attaque par injection)
- Message d'erreur officiel : "ANGE ne peut pas vous aider avec cette demande."
- Dégradation : si EF KO → message fixe (D20), jamais de tentative de reprise automatique

**Procédure si comportement anormal détecté :**
```
1. Couper immat-brain-dialog (Supabase → Functions → Pause)
2. Analyser les logs de l'EF (Supabase → Functions → Logs)
3. Identifier le prompt qui a déclenché le comportement
4. Corriger le system prompt si nécessaire
5. Tester sur 10 cas avant réactivation
6. Ne jamais relancer ANGE sans validation humaine si comportement hors-contraintes
```

---

## SECTION 35b — AGORA_DOWN PLAYBOOK

**Situation :** Agora RTC est indisponible (API Agora KO, quota épuisé, problème réseau entre les serveurs Agora et l'app).

**Comportements attendus de l'application :**

```
✅ Attendu (si correct) :
   → Toast d'erreur clair lors de la tentative d'appel : "Les appels sont momentanément indisponibles."
   → Le reste de l'application fonctionne normalement (messages, carte, signalements, push)
   → Pas de crash, pas d'écran vide, pas de boucle infinie de tentatives Agora
   → L'erreur est loguée dans la console (pas dans l'UI)

❌ Inacceptable :
   → Écran blanc ou spinner infini lors d'une tentative d'appel
   → Crash de l'application entière (messages, carte KO aussi)
   → Boucle infinie de reconnexion Agora sans backoff
   → Message d'erreur exposant des détails techniques (token, channelName)
```

**Vérifications en cas de panne simulée :**

| Vérification | Attendu |
|-------------|---------|
| Tentative d'appel quand Agora est KO | Toast d'erreur clair, bouton disponible à nouveau |
| Messages pendant panne Agora | Fonctionnels (pas de dépendance) |
| Carte pendant panne Agora | Fonctionnelle |
| Signalements pendant panne Agora | Fonctionnels |

**Contrôle terrain : C19**

**Surveillance :** console.agora.io → Usage + Status — s'abonner aux alertes. Seuil d'alerte : >500 appels/mois.

---

## SECTION 35c — ANTHROPIC_DOWN PLAYBOOK

**Situation :** l'API Anthropic est indisponible (maintenance, quota, panne réseau entre Supabase et Anthropic).

**Comportements attendus de l'application :**

```
✅ Attendu (si correct) :
   → ANGE affiche le message de dégradation (D20) :
     "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles."
   → Messages, appels, signalements, carte, push = tous fonctionnels
   → Pas d'écran vide, pas de stack trace visible
   → La demande utilisateur est ignorée gracieusement (pas de retry automatique)

❌ Inacceptable :
   → Blocage de l'interface (spinner infini sur le bouton ANGE)
   → Erreur 500 visible par l'utilisateur (corps de réponse EF brut)
   → Retry automatique sans limite (charges sur l'EF, coûts Supabase)
   → Tentative de basculer sur un autre modèle IA sans validation humaine
```

**Vérifications en cas de panne simulée :**

| Vérification | Attendu |
|-------------|---------|
| Utilisation ANGE quand Anthropic est KO | Message de dégradation D20, pas de crash |
| Messages pendant panne Anthropic | Fonctionnels |
| Appels pendant panne Anthropic | Fonctionnels |
| Carte pendant panne Anthropic | Fonctionnelle |

**Contrôle terrain : C20**

**Surveillance :** console.anthropic.com → Usage. Seuil d'alerte : >$2/jour → couper immat-brain-dialog.

---

## SECTION 36 — VÉHICULES ET STATIONNEMENT : RÈGLES DE DÉVELOPPEMENT FUTUR

**Règle absolue : aucune implémentation avant la cartographie complète.**

Avant tout développement des modules Véhicules, Stationnement, Réservations, Maintenance :

**Fiche à produire pour chaque fonctionnalité :**

```
Fonctionnalité : [NOM]

OBJECTIF : [description en 1-2 phrases]
CAS D'USAGE PRINCIPAUX : [liste]
NON-OBJECTIFS : [ce que la feature ne fait PAS]

TABLES :
  Nouvelles : [liste avec colonnes clés et types]
  Impactées : [liste]

RPC / FONCTIONS :
  Nouvelles : [liste avec signature]
  Modifiées : [liste]

EDGE FUNCTIONS :
  Nouvelles : [liste]
  Modifiées : [liste]

RLS :
  Politique par table : [auteur uniquement / publique / service_role uniquement]

REALTIME :
  Tables à activer : [liste]
  Canaux broadcast : [liste]

SOURCE DE VÉRITÉ :
  [Donnée] → [table/colonne officielle]
  [Données synchronisées] → [mécanisme de sync (trigger / EF)]

RGPD :
  export-user-data : [nouvelles données à exporter ?]
  delete-account : [nouvelles tables à nettoyer ?]
  Durée de rétention : [durée + méthode de purge]

BLOCAGES :
  user_blocks doit-il prévenir cette feature ? [OUI/NON + comment]

TRUST :
  vehicle_trust_scores doit-il être recalculé ? [OUI/NON + trigger]

RISQUES :
  [liste RISK-XXX avec cause, probabilité, impact, mitigation]

ROLLBACK :
  [commande SQL de rollback par migration]

TESTS TERRAIN :
  [liste C-XX avec action, attendu, vérification]

DÉPENDANCES :
  [features existantes impactées]
  [features futures qui en dépendront]

INVARIANTS :
  [invariants nouveaux ou modifiés]
```

**Points de vigilance spécifiques :**
- owner_plate est immuable (INV-006) — aucune relation véhicule/stationnement ne peut reposer sur un owner_plate modifiable
- Toute donnée liée à un utilisateur doit être nettoyée par delete-account
- Toute donnée personnelle doit être exportée par export-user-data
- Les blocages (user_blocks) doivent être vérifiés côté serveur (RLS) avant toute interaction via réservation ou stationnement
- La source de vérité du profil véhicule = profiles (pas vehicle_profiles) pour owner_plate et pseudo

---

## SECTION 37 — QUESTIONS DE VALIDATION AVANT TOUT GO MAIN FUTUR

Avant tout futur merge vers main, répondre aux 15 questions suivantes.
**Si une seule réponse est NON → NO GO DEV et NO GO MAIN.**

| # | Question | Réponse | Référence |
|---|----------|---------|-----------|
| 1 | Les nouvelles fonctionnalités utilisent-elles la bonne source de vérité ? | OUI/NON | Section 28 (DATA_OWNERSHIP_REGISTRY) |
| 2 | Les suppressions RGPD nettoient-elles toutes les nouvelles tables ? | OUI/NON | Section 11 (delete-account) + RISK-019 |
| 3 | Les exports RGPD exportent-ils toutes les nouvelles données personnelles ? | OUI/NON | Section 11 (export-user-data) + RISK-020 |
| 4 | Les blocages empêchent-ils les interactions via les nouvelles features ? | OUI/NON | Section 13 (user_blocks) + RISK-017 |
| 5 | Les nouvelles tables figurent-elles dans le ROLLBACK_REGISTRY ? | OUI/NON | Section 23 + RISK-018 |
| 6 | Les nouvelles fonctionnalités figurent-elles dans le FEATURE_DEPENDENCY_GRAPH ? | OUI/NON | Section 24 |
| 7 | Les nouvelles fonctionnalités respectent-elles tous les invariants ? | OUI/NON | Section 21 (INV-001 à INV-026) + RISK-022 |
| 8 | Les nouvelles fonctionnalités sont-elles couvertes par des tests terrain ? | OUI/NON | Section 25 + RISK-021 |
| 9 | Les nouvelles fonctionnalités fonctionnent-elles sans ANGE ? | OUI/NON | INV-022 + RISK-023 |
| 10 | Les nouvelles fonctionnalités sont-elles documentées dans FEATURE_REGISTRY ? | OUI/NON | Section 27 + INV-023 |
| 11 | L'IMPACT_REGISTRY a-t-il été rempli pour chaque nouvelle feature ? | OUI/NON | Section 29 |
| 12 | Le DATA_OWNERSHIP_REGISTRY a-t-il été mis à jour pour les nouvelles données ? | OUI/NON | Section 28 |
| 13 | Le FEATURE_DEPENDENCY_GRAPH a-t-il été mis à jour ? | OUI/NON | Section 24 |
| 14 | La documentation onboarding (PROJECT_STATE.md, SESSION-CONTINUATION.md) a-t-elle été mise à jour ? | OUI/NON | CLAUDE.md règle de fin de session |
| 15 | Les nouvelles RLS évitent-elles USING(true) sur des tables sensibles ? | OUI/NON | INV-011 + RISK-024 |

---

## SECTION 38 — DÉCISION FINALE GO / NO-GO MAIN

```
╔══════════════════════════════════════════════════════════╗
║                                                        ║
║            NO-GO MAIN — 2026-06-13                     ║
║                                                        ║
╚══════════════════════════════════════════════════════════╝
```

**Raison :** le code est prêt, mais les prérequis terrain ne sont pas confirmés.
Les 11 migrations ne sont pas encore appliquées. Les 4 EF ne sont pas encore
déployées. Les 6 Secrets Supabase ne sont pas encore configurés.
0 contrôle terrain n'a été exécuté post-sprint.

**Conditions exactes pour passer en GO MAIN :**

```
[ ] 1. 11 migrations exécutées dans l'ordre strict
       (20260613_push_subscriptions → ... → 20260615_profiles_column_security)

[ ] 2. 6 Secrets Supabase configurés :
       AGORA_APP_ID (public, peut rester dans le code)
       AGORA_APP_CERTIFICATE (jamais dans le code)
       VAPID_PUBLIC_KEY
       VAPID_PRIVATE_KEY
       VAPID_SUBJECT
       ANTHROPIC_API_KEY

[ ] 3. 4 Edge Functions déployées :
       supabase functions deploy delete-account
       supabase functions deploy export-user-data
       supabase functions deploy submit-rating
       supabase functions deploy send-push-notification
       + vérifier que get-agora-token, create-call-request,
         respond-call-request, immat-brain-dialog sont actives

[ ] 4. Realtime activé sur les tables confirmées :
       messages ✓ activer
       user_locations ✓ activer
       call_requests — vérifier avant d'activer
       reports — vérifier (broadcast ou postgres_changes ?)

[ ] 5. 11 contrôles critiques passés à 0 KO :
       C01 Inscription + profil
       C02 Localisation carte
       C03 PII absentes de /profiles (critère = absence dans JSON)
       C03b RLS reports par auteur
       C03c public_reports sans reporter_id
       C04 Messages temps réel
       C05a Appel complet A→B
       C05b Annulation
       C05c Refus
       C05d Appel manqué
       C05e App arrière-plan lors appel entrant
       C06 Signalement communautaire
       C07 Suppression compte
       C08 Plaque unique
       C10 Push app fermée

[ ] 6. CGU publiées (Supabase, Agora, Anthropic — pas OpenAI)

[ ] 7. Canal de modération manuelle opérationnel (Slack/email fondateur)
```

**Tests validés terrain (2026-06-12) :**
- ✅ Appels vocaux Agora (C05a-C05d sur BZ-652-LL ↔ BE-521-MM)
- ✅ Messages temps réel
- ✅ Carte radar Leaflet
- ✅ Dashboard Gardien 8 voyants

**Tests manquants (à exécuter post-déploiement) :**
- ⬜ Tous les contrôles RGPD (C03, C03b, C03c, C07, C08b)
- ⬜ Push notifications (C10, C10b)
- ⬜ Notation et trust (C07a, C07b)
- ⬜ ANGE (C11, C11b, C11c)
- ⬜ Blocage utilisateur (C15)
- ⬜ Sync public_profiles (C16)

**Migrations à appliquer (11, aucune appliquée en production) :**
```
01/11 20260613_push_subscriptions.sql
02/11 20260613_reports_enhancements.sql
03/11 20260613_user_blocks.sql
04/11 20260613_call_requests_device_id.sql
05/11 20260614_device_sessions.sql
06/11 20260614_driver_ratings.sql
07/11 20260614_user_trust.sql
08/11 20260614_public_profiles_secure.sql
09/11 20260614_public_reports_secure.sql
10/11 20260614_missing_indexes.sql
11/11 20260615_profiles_column_security.sql  ← TOUJOURS EN DERNIER
```

**EF à déployer (4) :**
```bash
supabase functions deploy delete-account
supabase functions deploy export-user-data
supabase functions deploy submit-rating
supabase functions deploy send-push-notification
```

**Version SW attendue en production : `immatconnect-pro-v25`**

**Points de surveillance post-déploiement :**
- Appels vocaux : tester immédiatement après 20260615 (RISK-001)
- /rest/v1/profiles?select=email → champ absent du JSON (C03)
- /rest/v1/public_reports → reporter_id absent du JSON (C03c)
- Sync profiles↔public_profiles : COUNT(*) = 0 (RISK-013)
- Anciens caches SW : immatconnect-pro-v25 uniquement (RISK-014)
- Cohérence Trust Engine : 3 sources synchronisées (RISK-015)
- Push iOS + Android : <10s (C10)
- Coût Agora : <500 appels/mois
- Coût Anthropic : <$2/jour

---

---

## NOTE DE GEL DOCUMENTAIRE

Version 1.2 — 2026-06-13 — **GEL DOCUMENTAIRE**

Ce document est désormais gelé. La phase documentation est terminée.

**Ne plus agrandir ce document.** Passer uniquement à :
1. Déploiement contrôlé (migrations → secrets → EF → Realtime)
2. Tests terrain (0 KO critique requis)
3. Validation RGPD (export + suppression + colonnes PII)
4. Validation production (11/15 conditions GO MAIN)
5. Puis développement des futurs modules (véhicules, stationnement...)

**Objectif de ce document :**
Qu'un développeur inconnu puisse reprendre le projet dans 6 mois et comprendre
l'architecture, les dépendances, les risques, les règles, les migrations,
les tests et les responsabilités **en moins d'une heure**.

---

*IMMATCONNECT PRO — MASTER COMPATIBILITY MAP — Version 1.2 — 2026-06-13*
*Document de référence pré-production officielle — GEL DOCUMENTAIRE*
*Toute future fonctionnalité doit être reliée à ce document (INV-023).*
*Modifier uniquement si : bug bloquant / faille sécurité / risque RGPD / KO terrain confirmé.*
