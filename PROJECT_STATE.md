# PROJECT_STATE — ImmatConnect Pro
## Tableau de bord de continuité · Point de reprise unique

> **Règle d'usage :** Ce fichier est le premier fichier à lire. Il ne remplace aucun document existant. Il donne le contexte minimal pour reprendre immédiatement sans relire les audits complets.  
> Mettre ce fichier à jour à chaque fin de session de travail.

---

## 1. ÉTAT ACTUEL DU PROJET

```
Date de mise à jour    : 2026-06-13
Avancement             : ~35% du plan fonctionnel implémenté
Production             : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Branche production     : main (GitHub Pages)
Branche de travail     : claude/immatconnect-pro-app-dEKGR
Dépôt                  : caisse43700-lgtm/Projet-immat-Connect
Tests de validation    : deux iPhones, BZ-652-LL ↔ BE-521-MM
```

### Ce qui fonctionne en production (validé terrain 2026-06-12)

- Appels vocaux bidirectionnels via Agora RTC ✅
- Annulation A → overlay B se ferme ✅
- Plaque de l'appelé affichée sur l'overlay sortant ✅
- Messages texte en temps réel (Supabase Realtime) ✅
- Signalements Route / Véhicule / Aide ✅
- Carte radar Leaflet ✅
- Sonnerie téléphone (WAV généré en mémoire) ✅
- Dashboard Gardien (8 voyants + Global Verification Center) ✅
- Service Worker v21 (network-first, allSettled non-bloquant) ✅

### Ce qui bloque le lancement public (P0)

1. **Pas de push notifications** — app fermée = aucun appel reçu, aucune alerte
2. **Bouton urgence 15/17/18 absent** — risque éthique (enfant/animal dans véhicule)
3. **Onglet Appels absent de la nav principale** — valeur produit invisible
4. **RGPD : pas de suppression de compte** — App Store refusé sans cette option
5. **`ic_pending_profile` localStorage** — stocke email + téléphone en clair après signup

---

## 2. DERNIÈRE MISSION TERMINÉE

**Mission : S6-TRUST — Trust Engine terminé**  
**Date :** 2026-06-13

**S4-CLUSTER** — Clustering Leaflet.markercluster pour les véhicules en zone dense
- CDN leaflet.markercluster 1.5.3 (CSS + JS) ajouté dans index.html
- `S.clusterGroup = L.markerClusterGroup({maxClusterRadius:60, showCoverageOnHover:false})`
- Icône cluster custom : disque bleu cyan avec count
- `loadOthers()` : nettoyage via `clusterGroup.clearLayers()` (fallback removeLayer si pas de plugin)
- Marqueurs véhicules ajoutés dans `clusterGroup` au lieu de directement dans map
- app.css v9 : `.cluster-icon` + `span` — style cohérent avec la charte graphique
- SW v24 : markercluster CDN ajouté dans CDN_CACHE

**S4-LEGAL** — Pages légales tabulées (commit `9b181ad`)

**S4-MAP** — Filtre type d'alerte sur la carte (commit `817ae11`)
- Barre de filtres flottante (Tous / Route / Aide / Véhicule)
- `S.mapAlertFilter`, `setMapAlertFilter(f)` avec show/hide Leaflet layers
- `addCommunityAlertMarker()` stocke `marker._alertGroup` pour le filtre

**S3-8** — Accessibilité P1 (commit `baf7914`)
- `role="dialog" aria-modal="true"` sur 8 modaux (resolutionCenter, callContact, callIncoming, onboarding, gardienDashboard, legal, blocked, recent)
- Toast : `role="alert" aria-live="assertive" aria-atomic="true"`
- `aria-label="Supprimer ce message"` sur ic-delete-msg

**S3-10** — Préférences notifications (commit `0a47c8a`)
- `_notifPref(group)` : lit `ic_notif_prefs` JSON, filtre les toasts/FloatingCard selon les préférences
- 3 toggles dans Paramètres → section Notifications (route, véhicule, aide)
- `notifyAlert()` accepte un 4e arg `group`, respecte les prefs (sauf urgent)
- `addCommunityAlert()` gate sur `_notifPref(saved.group)`

**S3-4+S3-7+S3-9** — Timestamps relatifs, anti-abus, position approximée (commit `b89e81d`)
- `relTime(ts)` : "à l'instant", "il y a Xmin", "HHhMM", "hier HH:MM", "jj. HH:MM"
- SOS cooldown 15 min (`ic_sos_last`) + call rate limit 3/10min (`ic_call_times`)
- `_fuzzyPos(lat,lng)` : offset ±200m sur broadcast Supabase si `ic_approx_geo=1`
- Toggle "Position approximée (±200m)" dans Paramètres → section Vie privée
- SW v22 → v23

**S2-7** — device_id + appel pris sur autre appareil (commit `c6281a6`)
- `calls.js` v18 : `_deviceId` IIFE (localStorage `ic_device_id`)
- `acceptCall()` inclut `accepted_device_id: _deviceId` dans le UPDATE DB
- Handler `receiver_id` UPDATE : si `r.status === 'accepted' && r.accepted_device_id !== _deviceId` → popup fermée + toast "Appel pris sur votre autre appareil"
- Migration `supabase/migrations/20260613_call_requests_device_id.sql`

**S2-6** — Blocages persistés DB (commit `acec331`)
- `supabase/migrations/20260613_user_blocks.sql` : table `user_blocks` + RLS
- `blockPlate()` : upsert DB fire-and-forget + localStorage
- `unblockPlate()` : delete DB fire-and-forget + localStorage
- `App.loadBlocksFromDB()` : fusion DB + localStorage, appelé 2s après openMap()

**S2-4** — Migration DB reports (commit `3a3b7fc`)
- `supabase/migrations/20260613_reports_enhancements.sql` : seen_at, actioned_at, urgency_level, target_plate, resolved_at
- `actConfirmAlert` ajoute `actioned_at` dans le UPDATE DB
- `roadReport`, `assist`, `driverInfo` incluent `urgency_level` dans saveReportRemote

**S2-3** — ResolutionCenter modal (commit `f67b0f6`)
- `resolutionCenterModal` : modal overlay avec statut, plaque cible, actions (Résolu / Messages / Retirer)
- `openResolutionCenter(alertId)`, `closeResolutionCenter()`, `rcConfirm(status)`, `rcOpenMessages()`
- Bouton "📋 Résolution" dans les cartes isOwn du feed d'activité

**S2-1+S2-2** — Flux 3 clics + FloatingCard étendue (commit `aeadef3`)
- `vehicleSelectType(type)` → Step 3 avec 21 messages pré-rédigés (6 types × 3-4 messages)
- `vehicleSendMsg()`, `vehicleStep3Back()`, `vehicleStep3Custom()`
- FloatingCard restructurée (flex-column + fc-main-row) + `fcExtraActions`
- Vehicle alert : 3 boutons réponse (J'arrive ✓ / Résolu / Précisez)

**S2-5+S2-0** — _emitObd corrigé + RGPD UI (session précédente)

**Avant cela (Sprint 1, 2026-06-13) :**

**#05** — Push notifications VAPID (commit `ab477d7`)
- `service-worker.js` v22 : listeners `push` + `notificationclick`
- Edge Function `send-push-notification` : VAPID signing via `npm:web-push`, lookup DB service_role, nettoyage 410 automatique
- `supabase/migrations/20260613_push_subscriptions.sql` : table `push_subscriptions` + RLS
- `index.html` : `VAPID_PUBLIC_KEY`, `_vapidKey()`, `App.subscribePush()`, `requestPermissions()` amélioré
- `calls.js` : trigger fire-and-forget push après `requestCall` réussi

**⚠️ 3 actions manuelles Supabase requises avant activation :**
1. Exécuter `supabase/migrations/20260613_push_subscriptions.sql` dans SQL Editor
2. Ajouter secrets : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` dans Settings → Secrets
3. Déployer : `supabase functions deploy send-push-notification`


**#04** — Onglet Appels dans la nav principale + badge manqués (commit `cb8865e`)
- Bouton `navAppels` avec icône téléphone SVG et badge `callNavBadge`
- `App.navAppels()` : efface `S._unseenMissedCalls`, ouvre panelMessages onglet appels
- Toutes les fonctions nav retirent la classe `.on` de `navAppels`
- `updateActBadge()` met à jour `callNavBadge` depuis `S._unseenMissedCalls`
- Abonnement `CALL_MISSED` via IIFE avec retry 400ms jusqu'à ImmatBus disponible
- `navMessages()` appelle désormais `switchContactTab('messages')` explicitement

**#03** — Effacer `ic_pending_profile` après signup réussi (commit `9801c31`)
- `localStorage.removeItem('ic_pending_profile')` au début de `openMap()`
- Efface aussi les variantes multi-compte : `ic_pending_profile__email` + `ic_pending_profile_last_email`

**#01** — Bouton urgence 15/17/18 (commit `9313c43`)
- Bloc urgence rouge ajouté dans `sigStep2Vehicle` et `sigStep2Aide`
- 3 liens `tel:15`, `tel:17`, `tel:18` (boutons 44px min, rouges)
- Affiché avant tous les types d'incidents

**#02** — Suppression code mort (commit `601b3f5`)
- `core/call-webrtc.js` supprimé (remplacé par agora-call-engine.js)
- `supabase/functions/get-turn-credentials/index.ts` supprimé (WebRTC obsolète)

**Avant cela (2026-06-13) :**
- `PROJECT_STATE.md` créé (commit `d231024`) — point de reprise unique
- `docs/IMPLEMENTATION_GAP_ANALYSIS.md` créé (commit `e799ac8`) — matrice + roadmap + top 20
- `docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md` créé (commit `99e19e1`) — 1889 lignes, 25 sections
- `docs/AUDIT_IMMATCONNECT_GLOBAL_V1.md` créé (commit `12df767`) — 1173 lignes, 25 sections

**Avant cela (2026-06-12) :**
- Tous les bugs P0 appels vocaux résolus (calls.js v17, call-screen.js v8)
- Validation terrain BZ-652-LL ↔ BE-521-MM

---

## 3. MISSION EN COURS

Aucune. Sprint 6 (S6-RATINGS + S6-RATINGS-TRIGGERS + S6-TRUST) terminé le 2026-06-13.

---

## 4. PROCHAINE MISSION RECOMMANDÉE

**Sprint 1 — ✅ TERMINÉ (2026-06-13)**

| # | Action | Commit |
|---|---|---|
| ~~01~~ | Bouton urgence 15/17/18 | `9313c43` |
| ~~02~~ | Code mort supprimé | `601b3f5` |
| ~~03~~ | `ic_pending_profile` effacé | `9801c31` |
| ~~04~~ | Onglet Appels + badge | `cb8865e` |
| ~~05~~ | Push notifications VAPID (SW v22) | `ab477d7` |
| ~~06~~ | Permission push à l'onboarding | `3b68e96` |
| ~~07~~ | RGPD `delete-account` Edge Function | `15ad2a9` |
| ~~08~~ | RGPD `export-user-data` Edge Function | `15ad2a9` |

**⚠️ Actions manuelles Supabase requises avant activation push + RGPD + Sprint 2 :**
1. SQL Editor → exécuter dans l'ordre :
   - `supabase/migrations/20260613_push_subscriptions.sql`
   - `supabase/migrations/20260613_reports_enhancements.sql`
   - `supabase/migrations/20260613_user_blocks.sql`
   - `supabase/migrations/20260613_call_requests_device_id.sql`
2. Secrets → `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
3. Deploy → `supabase functions deploy delete-account export-user-data send-push-notification`

---

**Sprint 2 — ✅ TERMINÉ (2026-06-13)**

| # | Action | Commit |
|---|---|---|
| ~~S2-0~~ | Boutons RGPD dans Paramètres (UI delete + export) | session précédente |
| ~~S2-1~~ | Flux 3 clics véhicule + 21 messages pré-rédigés | `aeadef3` |
| ~~S2-2~~ | FloatingCard étendue (J'arrive / Résolu / Précisez) | `aeadef3` |
| ~~S2-3~~ | ResolutionCenter modal (cycle de vie signalements) | `f67b0f6` |
| ~~S2-4~~ | Migration DB reports (seen_at, actioned_at, urgency_level) | `3a3b7fc` |
| ~~S2-5~~ | Corriger `_emitObd()` double-émission | session précédente |
| ~~S2-6~~ | Blocages persistés DB (table `user_blocks`) | `acec331` |
| ~~S2-7~~ | device_id + "appel pris sur autre appareil" | `c6281a6` |

---

**Sprint 3 — ✅ TERMINÉ (2026-06-13)**

| # | Action | Commit | Priorité |
|---|---|---|---|
| ~~S3-1~~ | Historique d'appels complet (regroupement par jour, icônes, labels corrects) | `4099411` | ~~P0~~ |
| ~~S3-2~~ | Statut lecture messages (✓ Envoyé / ✓✓ Vu en bleu) | `f36840f` | ~~P1~~ |
| ~~S3-3~~ | Filtre "Non-lus" dans le feed d'activité | `f723f48` | ~~P1~~ |
| ~~S3-4~~ | Horodatage relatif (relTime) + cooldown SOS + géoloc approx + prefs notifs | `b89e81d` `0a47c8a` | ~~P2~~ |
| ~~S3-8~~ | Accessibilité P1 (role=dialog, aria-live, aria-label) | `baf7914` | ~~P2~~ |
| S3-6 | Supprimer Edge Function `get-turn-credentials` du dashboard Supabase | — | P0 (manuel) |

**Sprint 5 — En cours (2026-06-13)**

| # | Action | Commit | Priorité |
|---|---|---|---|
| ~~S5-PWA~~ | manifest.json shortcuts + apple-touch-icon + description | — | ~~P2~~ |
| ~~S5-BADGE~~ | navigator.setAppBadge() dans updateActBadge (badge icône PWA) | — | ~~P2~~ |
| ~~S5-SHORTCUTS~~ | Gestion URL `?action=signal\|map\|calls` au démarrage | — | ~~P2~~ |
| ~~S5-COPY~~ | Copier plaque presse-papier (bouton 📋 dans vehicle context menu) | — | ~~P2~~ |
| ~~S5-RATELIMIT-MSG~~ | Rate limit messages 5/min (ic_msg_times localStorage) | — | ~~P2~~ |
| ~~S5-BUILD~~ | APP_BUILD const + affichage footer paramètres | — | ~~P2~~ |
| ~~S5-SHARE~~ | Web Share API pour alertes route/aide dans activity feed | — | ~~P2~~ |
| ~~S5-HEARTBEAT~~ | device_sessions heartbeat 30s + migration SQL | — | ~~P2~~ |

**Sprint 4 — ✅ TERMINÉ (2026-06-13)**

| # | Action | Commit | Priorité |
|---|---|---|---|
| ~~S4-MAP~~ | Filtre type d'alerte sur la carte (Route/Aide/Véhicule) | `817ae11` | ~~P2~~ |
| ~~S4-LEGAL~~ | Pages légales tabulées (CGU + Politique confidentialité RGPD) | `9b181ad` | ~~P2~~ |
| ~~S4-CLUSTER~~ | Clustering marqueurs Leaflet (zones denses, Leaflet.markercluster 1.5.3) | — | ~~P2~~ |
| S4-SPEAKER | Haut-parleur Agora (toggleSpeaker) — déprioritisé iOS limitation | — | P3 |

**Sprint 6 — En cours (2026-06-13)**

| # | Action | Commit | Priorité |
|---|---|---|---|
| ~~S6-RATINGS~~ | Driver ratings — migration SQL + Edge Function submit-rating + modal UI | — | ~~P2~~ |
| ~~S6-RATINGS-TRIGGERS~~ | Points d'entrée notation (menu contextuel véhicule + journal appels) | `4661879` | ~~P2~~ |
| ~~S6-TRUST~~ | Trust Engine — vehicle_trust_scores SQL + refresh_vehicle_trust() + UI menu contextuel | — | ~~P2~~ |

**Détail complet du Sprint 1, Sprint 2, Sprint 3, Sprint 4 :**  
→ Lire `docs/IMPLEMENTATION_GAP_ANALYSIS.md` section "7. ROADMAP PAR SPRINT"

**Top 20 actions numérotées dans l'ordre :**  
→ Lire `docs/IMPLEMENTATION_GAP_ANALYSIS.md` section "8. TOP 20 ACTIONS"

---

## 5. DOCUMENTS DE RÉFÉRENCE

| Document | Rôle | Quand le lire |
|---|---|---|
| **`PROJECT_STATE.md`** (ce fichier) | Point de reprise unique | En premier, toujours |
| **`SESSION-CONTINUATION.md`** | Journal technique détaillé, bugs résolus, état Supabase, invariants | Pour comprendre l'historique des corrections |
| **`docs/IMPLEMENTATION_GAP_ANALYSIS.md`** | Matrice fonctionnalités + roadmap + top 20 actions | Pour savoir quoi développer ensuite et dans quel ordre |
| **`docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md`** | Référence fonctionnelle et produit complète (25 sections) | Pour comprendre ce que chaque fonctionnalité doit faire |
| **`docs/AUDIT_IMMATCONNECT_GLOBAL_V1.md`** | Première analyse forces/faiblesses/risques | Contexte historique |
| **`docs/IMMATCONNECT_INTERACTION_ARCHITECTURE_MASTER_PLAN.md`** | Architecture conceptuelle (31 lignes) | Structure conceptuelle de référence (remplacé sur le fond par AUDIT_V2) |
| **`CLAUDE.md`** | Instructions pour les IA (point d'entrée) | Lu automatiquement par Claude Code |

**Hiérarchie de vérité :**
```
PROJECT_STATE.md (état du moment)
  └── SESSION-CONTINUATION.md (historique technique)
        └── IMPLEMENTATION_GAP_ANALYSIS.md (plan d'exécution)
              └── AUDIT_GLOBAL_V2.md (référence fonctionnelle)
                    └── MASTER_PLAN.md (architecture conceptuelle)
```

---

## 6. DÉCISIONS VALIDÉES (ne pas remettre en question)

Ces décisions ont été prises, validées et ne doivent pas être rediscutées sans raison explicite.

| # | Décision | Raison | Date |
|---|---|---|---|
| D01 | **Agora RTC** pour les appels vocaux (pas WebRTC natif) | WebRTC échoue systématiquement sur iOS Safari | 2026-06-10 |
| D02 | **Service Worker network-first** (jamais cache-first pour les JS) | Garantit que A et B testent la même version | 2026-06-10 |
| D03 | **`owner_plate` est immuable** (INV-006) | Sécurité anti-usurpation | invariant |
| D04 | **Pas d'Inbox / Outbox séparés** | Remplacés avantageusement par Activity + filtres Reçus/Envoyés | 2026-06-13 |
| D05 | **Pas de contenu de message dans les Edge Functions** (INV-COM-010) | Privacy | invariant |
| D06 | **Payload anonymisé dans les Edge Functions** (INV-COM-015) | Privacy | invariant |
| D07 | **`AGORA_APP_CERTIFICATE` jamais dans le code** | Dans les secrets Supabase uniquement | invariant |
| D08 | **main = production** — jamais pousser du code instable sur main | GitHub Pages sert main directement | invariant |
| D09 | **Le MASTER_PLAN (31 lignes) est obsolète sur la structure de nav** | AUDIT_V2 est la vraie référence fonctionnelle | 2026-06-13 |
| D10 | **call-webrtc.js est à supprimer** — code mort remplacé par Agora | — | 2026-06-13 |
| D11 | **Pas d'ouverture automatique de messages sur `accepted`** | Sécurité + UX | invariant |

---

## 7. DERNIÈRES DÉCISIONS MAJEURES

Décisions prises lors des dernières sessions, non encore implémentées.

| # | Décision | Statut | Impact |
|---|---|---|---|
| M01 | **Séparation Appels / Messages dans la nav** | À implémenter (Sprint 1 #04) | Navigation principale |
| M02 | **Bouton urgence 15/17/18 avant tout formulaire critique** | À implémenter (Sprint 1 #01) | Éthique + légal |
| M03 | **Blocages persistés en DB** (table `user_blocks`) | À implémenter (Sprint 2) | Sécurité cross-device |
| M04 | **Règle type/domain/direction/status dans InteractionEngine** | À implémenter (Sprint 2) | Architecture affichage |
| M05 | **ResolutionCenter pour les signalements** | À implémenter (Sprint 2) | Cycle de vie complet |
| M06 | **device_id + "appel pris sur autre appareil"** | À implémenter (Sprint 2) | Multi-appareils |
| M07 | **RGPD obligatoire avant App Store** (suppression + export) | À implémenter (Sprint 1) | Légal |

---

## 8. LECTURE MINIMALE RECOMMANDÉE

Pour reprendre le travail en moins de 10 minutes, lire uniquement dans cet ordre :

1. **Ce fichier** (`PROJECT_STATE.md`) — complet, 10 min
2. **Section 8 "TOP 20 ACTIONS"** de `docs/IMPLEMENTATION_GAP_ANALYSIS.md` — 5 min
3. **"PROCHAINE ACTION — SPRINT 1"** dans `SESSION-CONTINUATION.md` — 2 min

Pour comprendre un bug ou une correction passée :
→ `SESSION-CONTINUATION.md` — journal chronologique complet

Pour comprendre ce qu'une fonctionnalité doit faire :
→ `docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md` — section concernée

Pour connaître l'état exact d'implémentation d'une feature :
→ `docs/IMPLEMENTATION_GAP_ANALYSIS.md` — section "1. MATRICE DES FONCTIONNALITÉS"

---

## 9. CONNAISSANCES CRITIQUES À NE JAMAIS PERDRE

### Infrastructure

```
Supabase URL      : https://vemgdkkbldgyvaisudkd.supabase.co
Anon key          : sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ  (publishable — OK dans le client)
Agora App ID      : 4771f029e9c6446e872a598870bb74f3  (public par conception — OK dans le client)
Agora Certificate : dans secrets Supabase → AGORA_APP_CERTIFICATE  (jamais dans le code)
SW version actif  : immatconnect-pro-v21
```

### Edge Functions déployées sur Supabase

| Fonction | Rôle | État |
|---|---|---|
| `get-agora-token` | Génère les tokens Agora RTC signés | ✅ Active |
| `immat-brain-dialog` | IA dialogue conducteur | ✅ Active |
| `create-call-request` | Créer une demande d'appel | ✅ Active |
| `respond-call-request` | Répondre à une demande d'appel | ✅ Active |
| `get-turn-credentials` | Ancienne — pour WebRTC natif obsolète | ❌ À supprimer |

### Architecture des appels vocaux (flux complet)

```
A appelle B
  → calls.js émet CALL_INITIATED → CallScreen.showOutgoing()

B accepte (tap dans le geste iOS)
  → getUserMedia({audio}) déclenché dans le geste → w.__preMicTrack
  → calls.js émet CALL_ACCEPTED {requestId, plate} sur les deux téléphones

AgoraCallEngine (abonné ImmatBus, sur les deux téléphones) :
  → reçoit CALL_ACCEPTED
  → POST get-agora-token {channelName: requestId, uid: random}
  → client.join(APP_ID, channelName, token, uid)
  → réutilise w.__preMicTrack → publish()
  → subscribe remote user → audioTrack.play()

Fin d'appel :
  → leaveCall() ou user-left Agora → émet CALL_ENDED
  → CallScreen.hide() des deux côtés
```

### Mécanismes de détection d'annulation (4 couches)

```
1. Broadcast CANCEL sur canal signal Supabase  (50-200ms)
2. postgres_changes UPDATE status='cancelled'  (200-500ms)
3. Poll DB 1s (_startCancelPoll)               (0-1000ms)
4. visibilitychange + _checkOngoingIncomingCall (retour background)
```

### Causes de bugs connues (ne pas reproduire)

```
BUG RÉSOLU : InteractionEngine _emitObd() ré-émet sur ImmatBus sans requestId
→ Fix : guard e.payload.requestId sur tous les handlers bus (call-screen.js v8)
→ La CAUSE RACINE (_emitObd) n'est pas encore corrigée — à faire Sprint 2 #09

BUG RÉSOLU : Double showIncomingPopup → deux timers CALL_MISSED
→ Fix : _seenIncomingCallIds Set + debounce (calls.js v17)

BUG RÉSOLU : cancelCallRequest écrivait en DB après les broadcasts
→ Fix : DB en premier, puis broadcast (calls.js v15)

BUG RÉSOLU : SW v8 bloqué — cache.addAll() atomique échouait sur 1 fichier réseau
→ Fix : Promise.allSettled() non-atomique (SW v21)

BUG RÉSOLU : Micro iOS ne capturait pas dans le geste utilisateur
→ Fix : getUserMedia() dans le tap Accepter/Appeler → w.__preMicTrack
```

### localStorage — clés critiques

```
ic_interactions       (200 entrées max — InteractionEngine)
ic_notifications      (100 entrées max)
ic_alerts             (alertes géo communautaires)
ic_blocked            (plaques bloquées — à migrer DB Sprint 2)
ic_block_levels       (niveaux de blocage — à migrer DB Sprint 2)
ic_pending_profile    (⚠️ email + téléphone en clair — à effacer après signup Sprint 1)
ic_last_state         (lat/lng dernière position — risque vie privée)
ic_gps_history        (historique GPS)
_terminalRequestIds   (dans AgoraCallEngine + CallScreen — en mémoire, pas localStorage)
```

### Versions actuelles des fichiers principaux

```
calls.js              : v18+ (device_id + call rate limit ic_call_times)
core/call-screen.js   : v8
core/agora-call-engine.js : v5
core/audio-manager.js : v7
core/interaction-engine.js : v2  (_emitObd guard CALL_*)
messages.js           : v17+ (relTime, aria-label ic-delete-msg)
service-worker.js     : immatconnect-pro-v24
app.css               : v9  (map-alert-filter-bar + map-filter-pill + cluster-icon)
APP_BUILD             : 2026-06-13-S5
manifest.json         : shortcuts (Signaler/Carte/Appels), categories, apple-touch-icon
```

---

## 10. POLITIQUE ANTI-RÉGRESSION

### Règles absolues avant tout commit de code

- [ ] Tester un appel complet A → B → accepter → parler → raccrocher
- [ ] Tester l'annulation A → overlay B se ferme
- [ ] Vérifier que la plaque s'affiche sur l'overlay sortant (pas `--`)
- [ ] Vérifier que `_terminalRequestIds` n'est pas vidé accidentellement
- [ ] Vérifier que `_joining` guard est en place dans `joinCall()`
- [ ] Ne jamais supprimer le guard `e.payload.requestId` dans les handlers bus (call-screen.js)
- [ ] Ne jamais remettre `cache.addAll()` atomique dans le SW
- [ ] Ne jamais mettre `AGORA_APP_CERTIFICATE` dans le code client
- [ ] Ne jamais pousser directement sur `main` sans test terrain

### Tests obligatoires après toute modification de calls.js ou call-screen.js

```
Scénario 1 : Appel simple
  A appelle B → B reçoit la sonnerie → B accepte → les deux entendent l'audio
  → A raccroche → B voit "appel terminé"

Scénario 2 : Annulation
  A appelle B → A annule → B voit l'overlay se fermer en < 2s

Scénario 3 : Refus
  A appelle B → B refuse → A voit "Refusé"

Scénario 4 : Appel manqué
  A appelle B → 30s s'écoulent → les deux voient "Manqué"

Scénario 5 : Rappel immédiat
  Après n'importe quel scénario ci-dessus → A peut rappeler B immédiatement
```

---

## 11. POINT DE REPRISE OBLIGATOIRE

**Si vous reprenez ce projet pour la première fois ou après une longue interruption :**

### Étape 1 — Lire (15 min)
1. Ce fichier (`PROJECT_STATE.md`) en entier
2. Section 8 "TOP 20 ACTIONS" de `docs/IMPLEMENTATION_GAP_ANALYSIS.md`

### Étape 2 — Vérifier l'état du code (5 min)
```bash
git log --oneline -5                    # Derniers commits
git diff origin/main HEAD --name-only   # Fichiers modifiés vs production
```

### Étape 3 — Reprendre au bon endroit
- Si Sprint 1 non commencé → commencer par l'action #01 (bouton urgence)
- Si Sprint 1 en cours → lire SESSION-CONTINUATION.md section "PROCHAINE ACTION"
- Si un bug est apparu → lire SESSION-CONTINUATION.md section correspondante

### Ce qu'il ne faut pas faire
- Ne pas relire les 40+ fichiers SESSION-XX-LIVRAISON.md (historique d'anciennes sessions)
- Ne pas relire AUDIT_V1 pour comprendre l'état actuel (V2 + GAP_ANALYSIS suffisent)
- Ne pas rediscuter les décisions listées en section 6
- Ne pas tenter de corriger call-webrtc.js (fichier à supprimer, pas à corriger)

---

## MISE À JOUR — Historique des mises à jour de ce fichier

| Date | Auteur | Résumé |
|---|---|---|
| 2026-06-13 | IA session | Création initiale — état post-audit d'exécution |
| 2026-06-13 | IA session | Sprint 1 #01 terminé — bouton urgence 15/17/18 ajouté dans index.html |
| 2026-06-13 | IA session | Sprint 1 #02 terminé — call-webrtc.js + get-turn-credentials supprimés |
| 2026-06-13 | IA session | Sprint 1 #03 terminé — ic_pending_profile effacé dans openMap() |
| 2026-06-13 | IA session | Sprint 1 #04 terminé — onglet Appels dans nav principale + badge CALL_MISSED |
| 2026-06-13 | IA session | Sprint 1 #05 terminé — push notifications VAPID (SW v22, Edge Function, DB, subscribePush) |
| 2026-06-13 | IA session | Sprint 1 #06 terminé — bloc push dans l'onboarding, requestPushPermission(), geste utilisateur |
| 2026-06-13 | IA session | Sprint 1 #07+#08 terminés — Edge Functions delete-account + export-user-data (correction caller_id→requester_id) |
| 2026-06-13 | IA session | Sprint 2 démarré — _emitObd corrigé, push messages ajouté, PROJECT_STATE mis à jour |
| 2026-06-13 | IA session | Sprint 2 TERMINÉ — S2-1 flux 3 clics, S2-2 FloatingCard étendue, S2-3 ResolutionCenter, S2-4 migration DB, S2-6 user_blocks, S2-7 device_id |
| 2026-06-13 | IA session | Sprint 3 TERMINÉ — S3-1/2/3 (précédent), S3-4+S3-7+S3-9 (relTime+cooldown+fuzzyPos), S3-8 (a11y), S3-10 (notif prefs) |
| 2026-06-13 | IA session | Sprint 4 démarré — S4-MAP filtre alertes carte (Tous/Route/Aide/Véhicule) |
| 2026-06-13 | IA session | S4-LEGAL terminé — pages légales tabulées (CGU + confidentialité RGPD) |
| 2026-06-13 | IA session | S4-CLUSTER terminé — Leaflet.markercluster 1.5.3, cluster bleu cyan, SW v24 |
| 2026-06-13 | IA session | Sprint 5 démarré — S5-PWA manifest shortcuts, S5-BADGE navigator.setAppBadge, S5-COPY clipboard, S5-RATELIMIT-MSG, S5-BUILD |
| 2026-06-13 | IA session | Sprint 5 suite — S5-SHARE Web Share API alertes, S5-HEARTBEAT device_sessions 30s |
| 2026-06-13 | IA session | S6-RATINGS — driver_ratings SQL + Edge Function submit-rating + modal UI 4 méthodes |
| 2026-06-13 | IA session | S6-RATINGS-TRIGGERS — vehicleContextScore + rateBtn appels + _loadVehicleRating |
| 2026-06-13 | IA session | S6-TRUST — vehicle_trust_scores table + refresh_vehicle_trust() SECURITY DEFINER + vehicleContextTrust UI + submit-rating déclenche refresh |

---

*`PROJECT_STATE.md` — ImmatConnect Pro*  
*Ne remplace aucun document existant. Tableau de bord de continuité uniquement.*
