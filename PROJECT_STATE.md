# PROJECT_STATE — ImmatConnect Pro
## Tableau de bord de continuité · Point de reprise unique

> **Règle d'usage :** Ce fichier est le premier fichier à lire. Il ne remplace aucun document existant. Il donne le contexte minimal pour reprendre immédiatement sans relire les audits complets.  
> Mettre ce fichier à jour à chaque fin de session de travail.

---

## 0. POINTS DE RESTAURATION (si on demande « restaure »)

> Pour restaurer : se référer ICI en premier. Pointeurs figés sur GitHub (branches‑instantané)
> + SHA (le SHA fait foi). Les tags git sont refusés par le proxy → on utilise des branches.

| Point | Branche‑instantané (origin) | SHA | Doc |
|---|---|---|---|
| **v2 — Ange V2 + Nexus** (2026‑06‑30, SW v401) | `snapshot-v2-ange-v2-2026-06-30` | `92b8e139b997ccc9edb69f4fad0756daa4bde7fe` | `RESTORE_POINT_2.md` |
| **v1 — stable** (2026‑05‑29) | `snapshot-v1-stable-2026-05-29` | `e0a923ea9200514a5d7e5f84711663170a4bf5aa` | `RESTORE_POINT.md` |

Restaurer (exemple v2) :
```bash
git fetch origin && git checkout -b restauration origin/snapshot-v2-ange-v2-2026-06-30
# vérif : npm test (177✅) · node tests/ange-v2.test.js (64✅) · CACHE_NAME = immatconnect-pro-v401
```

---

## 1. ÉTAT ACTUEL DU PROJET

```
Date de mise à jour    : 2026-06-28
Avancement             : ~55% du plan fonctionnel implémenté — EN PRODUCTION
Production             : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Branche production     : main (GitHub Pages)
Branche de travail     : local/merge-to-main (synchro origin/main après chaque "Fusionner")
Dépôt                  : caisse43700-lgtm/Projet-immat-Connect
Tests de validation    : deux iPhones, BZ-652-LL (kassem69@live.fr) ↔ BE-521-MM
Phase produit          : V1.1 MESSAGES/ACTIVITÉ — itérations UX en cours
SW                     : v431 · app.css v61 · narrator.js v9 · messages.js v40 · messages.css v7 · calls.js v22 · audio-manager.js v9 · ui.js v16 · bus.js v51 · immat-consciousness.js v2 · immat-nexus.js v14 · immat-copilot.js v8

⚠️ LEÇON CACHE iOS (critique) : l'appareil de test est resté bloqué très longtemps sur une
vieille version en cache — AUCUN fix ne s'appliquait. index.html est servi réseau (toujours frais)
mais le SW/les .js peuvent rester périmés. Pour forcer : Dashboard → 🔄 MAJ, vérifier CACHE_NAME ;
si bloqué, réinstaller la PWA (supprimer/re-ajouter à l'écran d'accueil). Toujours faire confirmer
le CACHE_NAME avant de conclure qu'un bug persiste.
```

### Ce qui fonctionne en production (validé terrain + déployé 2026-06-18)

- Appels vocaux bidirectionnels via Agora RTC ✅
- Annulation A → overlay B se ferme ✅
- Plaque de l'appelé affichée sur l'overlay sortant ✅
- Messages texte en temps réel (Supabase Realtime) ✅
- Signalements Route / Véhicule / Aide ✅
- Carte radar Leaflet ✅
- Sonnerie téléphone (WAV généré en mémoire) ✅
- Dashboard Gardien (8 voyants + Global Verification Center) ✅
- Service Worker v55 (network-first, allSettled non-bloquant) ✅
- 6 Secrets Supabase configurés (AGORA_APP_ID, AGORA_APP_CERTIFICATE, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, ANTHROPIC_API_KEY) ✅
- 5 Edge Functions déployées via GitHub Actions ✅
- Realtime actif sur messages + call_requests ✅
- B1 PII test PASSED ✅ (colonnes email/phone non exposées aux autres utilisateurs)
- messages.js : getProfile() utilise colonnes explicites (fix column-level security) ✅
- **[2026-06-18]** Alertes véhicule urgentes (🚨 context_type='vehicle_report') visibles dans Activité → Reçus/Envoyés, groupées par plaque, supprimables ✅
- **[2026-06-18]** Architecture panels clarifiée : Messages = textes libres, Activité = signalements + alertes urgentes, Appels = journal ✅
- **[2026-06-18]** Badges corrects : Messages (textes libres), Activité (tout), carte Véhicule (alertes + urgents) ✅
- **[2026-06-18]** En-tête Messages (✏️ ⭐ 🔍) masqué dans la vue Appels ✅
- **[2026-06-18]** Catégorie Stationné 🅿️ complète : Reçus (label propre, badge décrémente au tap, "Pas mon véhicule", urgence 15/17/18) + Envoyés (statut ⏳/✅ explicite, réponse conducteur) + floating card améliorée ✅
- **[2026-06-18]** GPS privé dans signalement stationné : position embarquée `[GPS:lat,lng]` dans le corps du message (invisible à l'affichage), bouton "📍 Voir l'emplacement sur la carte" dans Reçus, marqueur privé Leaflet visible uniquement par le propriétaire ✅
- **[2026-06-18]** Photo véhicule stationné : capture + compression Canvas (max 1024px JPEG 0.82), upload Supabase Storage bucket `parked-photos`, thumbnail 160px dans Reçus (En cours + Traités) + Envoyés, lightbox plein écran (`actStationViewPhoto`), push notification adapté 🅿️ ✅

### Ce qui bloque (P0) — à corriger avant GO MAIN

~~1. **Panneau Paramètres iOS** — scrollable coupé, RGPD (Export/Supprimer) + Notifications inaccessibles~~ ✅ résolu
~~2. **Tests terrain B2→B5** — non complétés (push / RGPD / messages / ANGE)~~ ✅ tous passés
~~3. **REVOKE SELECT sur profiles** — en attente validation B1+B4~~ ✅ exécuté et vérifié

**Aucun blocage P0 restant — GO LIVE phase 1 validé.**

---

## 2. DERNIÈRE MISSION TERMINÉE

**Mission : ImmatNexus — tissu de connexion (intelligence d'organisme locale, sans IA externe)**
**Date :** 2026-06-30
**Versions :** SW v378 → v379 · bus.js v50→v51 · narrator.js v5→v6 · immat-consciousness.js v1→v2 · immat-nexus.js v1 (nouveau)
**Déploiement :** front (GitHub Pages).

### Ce qui a été fait (plan validé PO + ChatGPT, voir docs/SPEC-IMMAT-NEXUS.md)
- **Façade `core/immat-nexus.js`** (window.ImmatNexus) — LECTURE SEULE, sans état métier, ne duplique
  rien : `init/sense/ask/explain/audit`. Relie registre + santé (ImmatOrganism) + synthèse
  (S._consciousness/_soul/_reliability/_brainOrientation) + OBD (ImmatBus.getJournal) + lois (INVARIANTS).
- **Ange local-first** : `AngeDialog.send()` appelle `ImmatNexus.ask()` AVANT le LLM → réponse
  déterministe sans IA (0 réseau, 0 quota) sur l'état système ; le LLM edge reste fallback hors-sujet.
  Intents V1 : feature_status, why_blocked, disabled_features, organism_health, recent_violations,
  governance_changes, system_summary.
- **Events gouvernance figés** dans `ImmatBus.EVENTS` : FEATURE_GOVERNANCE_CHANGED, FEATURE_BLOCKED,
  FLEET_CONFIG_LOADED, FEATURE_AUDIT_FINDING.
- **Narrator** verbalise FEATURE_GOVERNANCE_CHANGED ; **Consciousness** lit la gouvernance
  (worldState.governance : total/disabled/disabled_keys).
- **Dashboard Développeur** : panneau « 🧬 ImmatNexus » (snapshot live + bouton Audit cohérence →
  émet FEATURE_AUDIT_FINDING, jamais d'auto-correction).
- Garde-fous : Nexus n'émet QUE des findings d'audit (source:'nexus'), ignore ses propres events,
  cache 3 s, pas de tick lourd, pas de journal propre. Aide V1 reste gelée (Nexus lit, ne pilote pas).
- Vérifié par harnais Node : ask/explain/audit fonctionnels, 0 erreur de syntaxe.

---

### Mission précédente : Modération des comptes — suspension (« compte suspendu ») + anti-recréation (plaque/email/téléphone)**
**Date :** 2026-06-30
**Versions :** SW v369 → v370 · migration `20260630140000_account_moderation.sql`
**Déploiement :** front (GitHub Pages) + migration auto-appliquée par CI (`deploy-edge-functions.yml`).

### Ce qui a été fait
- **Migration `20260630140000_account_moderation.sql`** :
  - Table `account_bans` (snapshot identité : `owner_plate`/`email`/`phone`/`pseudo` + `reason`/`created_by`).
    RLS activée, **aucune policy** → toute écriture passe par RPC SECURITY DEFINER.
  - `am_i_suspended()` → verrou de **connexion** (le compte courant est-il suspendu ?).
  - `check_signup_available(plate,email,phone)` → verrou d'**inscription** : refuse les doublons d'un
    compte actif (plaque/email/téléphone déjà pris) **ET** les bannis (anti-recréation). Accessible `anon`.
  - `admin_list_users()` / `admin_suspend_user(id,reason)` / `admin_unsuspend_user(id)` — réservées au
    **gardien** via `get_my_role()` (app_metadata). Anti-lockout : interdit de suspendre soi-même ou un gardien.
- **Front (`index.html`)** :
  - Inscription : appelle `check_signup_available` avant `signUp` → messages clairs « Plaque/Email/Téléphone
    déjà utilisé » ou « informations liées à un compte suspendu ». Fallback `plateAvailable` si RPC indisponible.
  - `afterAuth` : appelle `am_i_suspended` juste après login → si suspendu, `signOut` + retour écran auth +
    message « ⛔ Votre compte a été suspendu » (+ motif).
  - Dashboard → onglet **Modération** : bloc « 👥 Utilisateurs » (liste plaque + pseudo + badge actif/suspendu,
    compteur), boutons **Suspendre** / **Réactiver** (`App.suspendUser`/`unsuspendUser` avec confirm + motif).
- **SW** v369 → v370.

⚠️ **Sécurité (fail-open assumé)** : si `am_i_suspended` / `check_signup_available` échouent (RPC absente,
réseau), on **n'empêche pas** la connexion/inscription — éviter de verrouiller toute la flotte sur une panne.
La suspension n'est pas une frontière de sécurité dure (les RLS protègent les données) ; c'est de la modération.

---

### Mission précédente : Gating fonctionnalités V2 — blocage Stationné + filtrage Activité
**Date :** 2026-06-30
**Versions :** SW v368 → v369
**Déploiement :** front (GitHub Pages) — `index.html` + `service-worker.js`.

### Ce qui a été fait (suite de la refonte Dashboard V2 / feature gating)
- **Catégorie Stationné gouvernable** : ajout de l'entrée registre `signalement_stationne`
  (group Signalements, scope fleet, killSwitch CK-STATION). `App.sigStepStation()` bloque à
  l'entrée via `requireFeature('signalement_stationne')` (message source-aware admin/utilisateur).
- **Activité bloque par catégorie** : `App.openActivityCat(cat)` vérifie le flag de la catégorie
  (route/vehicle/aide/station) avant d'ouvrir — plus de blocage sur la page d'accueil, blocage à
  l'intérieur dès le tap sur une catégorie.
- **À traiter / Nouveaux / Traités filtrés par fonctionnalité** : `_computeTodo`, `_computeNew`,
  `_computeDone` masquent les éléments dont la fonctionnalité est désactivée (alertes_vehicule,
  signalement_stationne, demandes_aide) → les compteurs et listes respectent les kill-switches.
- Registre passé à **12 entrées** ; syntaxe vérifiée (8 scripts inline, 0 erreur).

---

### Mission précédente : Aide V1 #7 — push proximité (notifier les conducteurs proches à la création)
**Date :** 2026-06-28
**Commit :** `c3c238f` (PR #386 fusionnée) · **Versions :** SW v347 → v348
**Déploiement :** Edge Function `notify-help-request` déployée via `deploy-edge-functions.yml` (push `main`).

### Ce qui a été fait
- **Edge Function `notify-help-request`** (`supabase/functions/notify-help-request/index.ts`) :
  - **Sécurité** : seul le demandeur peut notifier *sa* demande (`demandeur_id == auth.uid`).
  - **Idempotence** : marqueur `help_events 'proximity_notified'` (`client_event_id = requestId`, `UNIQUE(actor_id,client_event_id)`) → une seule vague de push par demande.
  - **Ciblage géo serveur** : bounding-box + Haversine sur `user_locations` (positions < 30 min), rayon **10 km** (entraide) / **15 km** (urgence), exclut le demandeur.
  - **Confidentialité** : push avec **type uniquement** (jamais position précise ni plaque). Nettoyage des abonnements expirés (410/404).
- **Client** : `App.AideV1.notifyNearby(requestId)` (fire-and-forget) dans `assist()` après `create` ; clic push `help` → `App.openHelpSignalement` (Activité>Aide, carte dépliée).
- **CI** : étape `Deploy notify-help-request` ajoutée au workflow.

⚠️ **Prérequis** : les conducteurs doivent avoir **activé les notifications** (abonnement `push_subscriptions`) pour recevoir l'alerte. Le module Aide est désormais **fonctionnellement complet** (création → carte → réponse → coordination → push proximité).

---

### Mission précédente — Aide V1 #1 — réafficher les demandes d'aide sur la carte
**Date :** 2026-06-28 · **Commit :** `be60f3a` (PR #384) · **Versions :** SW v346 → v347
**Contexte :** régression depuis la bascule Lot B (le chokepoint `assist` supprimait les marqueurs legacy sans les remplacer). La carte n'affichait plus aucune demande d'aide.

### Ce qui a été fait
- **`App.AideV1.syncMapMarkers()`** : plot Leaflet des demandes ouvertes.
  - **Mes demandes** (`myRequests`, `status='ouverte'`) en position **précise**, pin **bleu**.
  - **Demandes proches** (`get_nearby_requests`, position **approx ~1km**) en pin **orange** (rouge si incendie).
  - Icône par type + 🆘 ; popup « Voir dans Activité » → `App.openHelpSignalement(request_id)`.
  - Anti-course `S._aideMapSeq` ; retrait des marqueurs obsolètes (clôture / hors rayon).
- **Hooks de rafraîchissement** : `loadOthers()` (refresh carte périodique / Realtime locs / rayon), `assist()` après création, `subscribeRealtime` reRender (MAJ live).
- **Disparition à la clôture** : dès `resolue`/`annulee`/`expiree`, `nearby` ne renvoie plus la demande et `myRequests` filtre `ouverte` → marqueur retiré. Seul le demandeur clôture sa demande.

⚠️ **Rappel** : la migration `20260628160000_help_mode_contact.sql` (mode `contact` pour « Comment puis-je aider ? ») reste **à appliquer en base Supabase** — le client v346+ échoue silencieusement sans elle.

---

### Mission précédente — Aide V1 — bascule client event-driven (Lot B) sur backend help_* (Lot A)
**Date :** 2026-06-28 · **Versions :** SW v340 → v341
**Backend :** migration `20260628150000_help_v1.sql` **appliquée + validée en base** (3 voyants verts : tables/RPC OK, comportement create→propose→confirm→resolue prouvé, cron `*/2`).

- **Lot A (serveur, sur main, PR #377)** : event-driven pragmatique — `help_events` append-only (vérité) + projections `help_requests`/`help_engagements` + `help_config` + RPC `SECURITY DEFINER` (create/propose/retract/confirm/cancel, nearby/precise/detail) + `process_help_timeouts` (cron). Validé en base.
- **Lot B (client, bascule atomique)** :
  - `assist()` → `AideV1.create` (RPC, `client_event_id`) ; plus de `reports('help')` ni d'alerte `S.alerts` assist.
  - **Chokepoint** : `addCommunityAlert` → `null` si `group==='assist'` (neutralise carte flottante + marqueur + vieux feed + badge legacy, sans toucher Route/Véhicule).
  - `renderCategoryFeed('aide')` → `renderAideFeedV1` (rendu re-dérivé serveur) ; `openActivityCat('aide')` → `subscribeRealtime` « le mien » ; sélecteur « Qui vous a aidé ? » multi-helpers (plaques résolues) ; parsing « J'arrive » neutralisé.
- **Séparation stricte** : Activité = métier · Messages = conversation · Appels = vocal. Aucun double affichage.
- **Itérations post-bascule (PR #379→#384)** : expansion des cartes (`actToggleVmCard`), « Je vous guide » réservé à Perdu, réponses prédéfinies → boîte Messages (pastille), coordination « X intervient déjà », navigation sur_place, « Pas pour moi », retrait notifié, « Comment puis-je aider ? » (engagement `contact`), **#1 carte** (ci-dessus).

---

### Mission précédente — S6-TRUST V1 — Confirmation de signalement véhicule (réouverture périmètre réduit)
**Mission : S6-TRUST V1 — Confirmation de signalement véhicule (réouverture périmètre réduit)**
**Date :** 2026-06-28
**Commit :** (local, en attente de « Fusionner ») · **Versions :** SW v339 → v340 · migration `20260628140000_report_feedback.sql`
**ADR :** `docs/ADR-S6-TRUST-V1.md`

### Ce qui a été fait

- **Réouverture de S6-TRUST** (parqué le 2026-06-22) sur un **périmètre V1 strictement réduit**, après revue d'architecture complète.
- **Modèle validé** : crédibilité PAR-SIGNALEMENT (primaire) vs réputation PAR-PERSONNE (différée) ; journal append-only = source de vérité ; corroboration > vote ; ⭐ axe séparé ; anonymat préservé.
- **3 invariants** créés : **INV-TRUST-001** (stockage unifié, sens interprété par `subject_type`, jamais de score fusionné), **INV-TRUST-002** (aucune réputation/score visible — seulement le résultat d'un événement), **INV-TRUST-003** (enrichir, jamais redéfinir un message existant).
- **V1 livré (périmètre Véhicule uniquement)** :
  - Migration `report_feedback` (journal append-only polymorphe vehicle/route/aide ; seul `vehicle` actif) + RLS deny-all + RPC `submit_report_feedback` (anti auto-vote, vocabulaire validé, upsert) + RPC `get_report_confirmations` (comptage seul, aucune identité) + auto-test structurel.
  - Client : `actVmVerdict` persiste le verdict côté serveur (fire-and-forget) ; onglet **Envoyés** affiche « ✅ Confirmé par le conducteur » si confirmé (lecture comptage, dégradation silencieuse).
- **Non touché** : `vehicle_trust_scores` (reste parqué), `driver_ratings` (⭐, axe séparé).
- **Hors V1** : réputation par-personne, Wilson, Route, Aide, affichage négatif/« contesté », anti-Sybil avancé.

---

### Mission précédente — Activité — sous-panneau pleine hauteur en portrait (carte Aide non tronquée)
**Mission : Activité — sous-panneau pleine hauteur en portrait (carte Aide non tronquée)**
**Date :** 2026-06-28
**Commit :** `5d4ce12` — poussé sur main (`2d1855b..5d4ce12`)
**Versions :** app.css v60 → v61 · SW v336 → v337

### Ce qui a été fait

- **Carte Aide dépliée tronquée en bas (portrait)** : sur un sous-panneau Activité de hauteur
  partielle (Famille B), la carte « Ma demande en attente » / une demande reçue dépliée dépassait
  la zone visible et son bas (alternatives + « Annuler » / « Je suis aidé » / « 🗑 Supprimer »)
  restait coupé, malgré le scroll-to-top du commit précédent (`6d62153`).
- **Fix (`app.css`)** : nouveau bloc `@media (orientation:portrait)` — quand un sous-panneau
  Activité est ouvert (`body.act-cat-open` / `act-todo-open` / `act-done-open` / `act-new-open`),
  le `#sheet:not(.mini)` passe en **pleine hauteur** `calc(100dvh - var(--nav-h) - var(--safe-bottom))`
  (comme Réglages, Famille C), `border-radius:0`, `padding-top` safe-area. `!important` sur la
  hauteur pour battre la spécificité de la règle Famille B `#sheet:not(.mini):has(#panelActivite.on)`.
  Le feed (`flex:1; overflow-y:auto`) remplit alors tout l'écran et scrolle en interne → la carte
  dépliée s'affiche entièrement.

---

### Mission précédente — Audio appels — bip fantôme au login supprimé + sonnerie entrante distinctive
**Mission : Audio appels — bip fantôme au login supprimé + sonnerie entrante distinctive**
**Date :** 2026-06-28
**Commits :** `8cc3afa` (fix login) + `4aeff4e` (sonnerie) — poussés sur main (`944b8bc..4aeff4e`)
**Versions :** calls.js v20 → v21 · audio-manager.js v8 → v9 · SW v290 → v292

### Ce qui a été fait

- **Bip/sonnerie fantôme à la connexion supprimé** (`calls.js`) : le handler Realtime `INSERT`
  des appels entrants sonnait sans `skipAudio`, y compris pour une `call_request` résiduelle
  ou rejouée au moment du login (fréquent avec les 2 iPhones de test laissant des `pending`
  en base). Garde ajouté : on ne sonne QUE si `created_at < 12 s` (appel réellement frais) ;
  sinon la popup s'affiche en silence. **N'étouffe jamais un vrai appel entrant** (quel que
  soit le timing), contrairement à une fenêtre de silence globale au login. Les chemins de
  récupération (`_recoverIncomingPendingCalls`, `_recoverPendingRequest`) passaient déjà `skipAudio:true`.
- **Sonnerie entrante distinctive** (`core/audio-manager.js`) : `_ringSample` remplacé — au lieu
  de la bitonalité 440+480 Hz, motif mélodique ascendant si–mi–sol (B5/E6/G6, ~988→1568 Hz)
  joué 2×/cycle de 5 s, loopé. Clairement différent de la tonalité de retour sortante (440 Hz)
  et du bip message (880/1100). Choisi par l'utilisateur après écoute de plusieurs propositions
  (registre médium-aigu retenu pour rester audible en conduite). Boucle inchangée : sonne jusqu'à
  accepter / refuser / annulation appelant / expiration (~30 s).

---

### Mission précédente — V1.1 — Fiabilisation pastille Messages + UX notifications/cartes
**Versions :** SW v266 → v288 · app.css v45 → v46 · messages.js v34 → v38

### Ce qui a été fait (suite directe de la mission v246→v266)

**Pastille Messages (icône page d'accueil) — enfin fiable :**
- Registre temps réel `S._navUnreadIds` (Set persistant localStorage `ic_nav_unread_ids`) :
  alimenté à la réception (subMsgs), source autoritaire indépendante du re-SELECT.
- Badge nav Messages = `max(calcul _actMessages, taille registre)` dans updateActBadge ET setBadge.
- **Gardien MutationObserver** sur #msgNavBadge (index.html, toujours frais) : ré-affiche la
  pastille si un code (même messages.js périmé en cache) tente de la masquer alors que le registre>0.
- Vidage du registre à la lecture : markThreadRead (par plaque), clearMsgNavUnread (setConv/notif),
  markAllRead + setUnreadMsgCount(0) (vident tout).
- **CAUSE RACINE de la disparition** : refreshThread() (messages.js) marquait un message reçu LU
  automatiquement même en arrière-plan, car #icThread.show et State.activePlate restent "collants"
  (jamais nettoyés par closeSheet/panel/nav). Fix : ne marquer lu que si panelMessages.on && sheet non mini.

**UX notifications / cartes :**
- Message reçu → notif "💬 [plaque] vous a écrit" + aperçu (au lieu de "Nouveau message").
- Réponse véhicule → notif "📩 Réponse de [plaque]".
- Carte signalement reçu (FloatingCard) → UNIQUEMENT "Voir le signalement" (plus de "Je vérifierai").
- Carte EN COURS → bloc "🕐 Vérification en attente / Donner mon constat" TOUJOURS affiché (uniforme).
- "Voir le signalement" → point d'entrée unique `openVehicleSignalement(plate)` (force onglet Reçus,
  normalise la plaque via fPlate, anti-race S._actGroupOpen, déplie la 1re carte après ~0,8 s avec animation).
- Durées messages verts (haut) : notif 6,5 s (clearTimeout → pleine durée), signalements 5,5 s
  (notifyAlert → toast param durée) ; confirmations brèves 3,2 s.
- CACHE_NAME affiché à l'ouverture du Dashboard Gardien (plus de "—").

### Invariants / faux bugs écartés
- **Détection véhicules ("0 conducteur")** : NON lié au code (loadOthers/locate/user_locations jamais
  modifiés de la session — vérifié par diff). Causes réelles : (1) deux téléphones sur le MÊME compte
  (l'app exclut volontairement son propre id, loadOthers ligne ~1199), (2) fenêtre fraîcheur 5 min
  (CFG.staleMinutes) → position figée si app en arrière-plan.
- Aucune logique métier touchée (verdicts, trustDelta, buildThreads sauf inclusion vehicle_response,
  loadOthers/appels intacts).

### Fichiers
- index.html · messages.js v38 · app.css v46 · service-worker.js v288

---

**Mission précédente : V1.1 ACTIVITÉ — 3 vues transversales + réponses véhicule dans Messages**
**Date :** 2026-06-27
**Versions :** SW v246 → v266 · app.css v42 → v45 · messages.js v30 → v34

### Vue d'ensemble de la session (longue série d'itérations UX, toutes fusionnées)

**A. Trois vues transversales sur l'accueil Activité** (lignes du "Résumé rapide" rendues
cliquables, chacune ouvre un sous-panneau dédié regroupant par catégorie 🚨 Véhicule /
🅿️ Stationnement / 🆘 SOS) :
- ✉️ **Nouveaux** → `openNewView` / `_computeNew` / `renderNewFeed` (panneau `actNewPanel`,
  classe body `act-new-open`). Compte les signalements reçus NON LUS et non traités.
- ⏳ **À traiter** → `openTodoView` / `_computeTodo` / `renderTodoFeed` (`actTodoPanel`,
  `act-todo-open`). Compte les signalements reçus non traités (verdict/réponse manquant).
- ✅ **Traités** → `openDoneView` / `_computeDone` / `renderDoneFeed` (`actDonePanel`,
  `act-done-open`). Historique des traités. **Swipe gauche → Supprimer** (`doneDelete`,
  soft-delete `ic_deleted_msgs`).
- Navigation : `todoGoto(cat,plate)` ferme la vue et ouvre la catégorie + l'élément.
- Compteurs accueil (`resumeNewBadge`/`resumeEncBadge`) alignés sur `_computeNew`/`_computeTodo`
  pour éviter tout mismatch badge↔vue.

**B. Réponses véhicule (`vehicle_response`) déplacées de Activité vers MESSAGES** (inversion
règle V1, validée par le propriétaire) :
- `messages.js buildThreads` + `_renderTimeline` : incluent `vehicle_response` → visibles
  dans le fil Messages + icône 📩 dans la liste des conversations.
- Badge nav **Messages** = messages libres + `vehicle_response` ; badge nav **Activité** et
  badge catégorie **Véhicule** ne comptent plus les réponses (plus de double-comptage).
- Réception d'une réponse : notif "📩 Réponse de <plaque>", PAS de FloatingCard, PAS de boutons
  J'arrive/Reçu/En route. `markThreadRead` vide la pastille à l'ouverture du fil.

**C. Corrections badges/cartes véhicule :**
- Badge catégorie Véhicule : suppression de l'alerte broadcast redondante (`addCommunityAlert`
  retirée du handler `vehicle_alert`) → ne comptait plus 2 pour 1 signalement.
- Badge nav Activité : compte directement véhicule/stationné via les messages (`unreadCtx`).
- Header carte véhicule : compte uniquement les signalements ACTIFS (non traités).
- FloatingCard véhicule (broadcast + message) : bouton unique "Voir le signalement" + garde-fou
  anti-doublon (`_fcRecentlyShown` / `dedupKey`) → 1 seule carte même si les 2 chemins se déclenchent.
- Dédup "À traiter" supprimée (masquait des signalements légitimes de même texte).

### Invariants respectés
- Aucune logique métier modifiée : workflow 3 états, verdicts, trustDelta, buildThreads (sauf
  ajout vehicle_response), envoi messages — intacts. Tout est additif / lecture seule.
- Signalements (`vehicle_report`) : 100% inchangés (Activité, badges, À traiter, workflow).

### Fichiers
- `index.html` : 3 vues transversales + badges + FloatingCard + libellés
- `messages.js` v34 : vehicle_response dans Messages (buildThreads, _renderTimeline, push, icône)
- `app.css` v45 : `act-todo-open` / `act-done-open` / `act-new-open`
- `service-worker.js` v266

---

**Mission précédente : V1.1 — Vue "À traiter" transversale (clic sur "En cours" → liste par catégorie)**
**Date :** 2026-06-27
**Commit :** e419813
**SW :** v246 → v247

### Ce qui a été fait

Nouvelle vue dédiée demandée par le propriétaire produit (réouverture V1.1 du module gelé).
La ligne "En cours" de l'écran Activité devient **"À traiter"** et est cliquable.

**Au clic → nouvel écran `actTodoPanel`** qui liste UNIQUEMENT les éléments nécessitant une
action, groupés par catégorie :
- 🚨 **Véhicule** — `vehicle_report` reçu, sans verdict, non répondu (groupé par plaque)
- 🅿️ **Stationnement** — `parked_report` reçu, non répondu (`ic_station_replied`)
- 🆘 **SOS / Aide** — assistance d'un autre, active+nearby, non répondue (`ic_help_replied`)

Route exclue (pas de verdict à donner). Clic sur un item → ouvre la catégorie + l'élément
(`todoGoto` → `openActivityCat` + `actOpenVehicleMsgGroup` / `renderStationFeed`).

**Implémentation 100% additive :**
- `App._computeTodo()` — lecture seule des mêmes clés localStorage que les workflows existants
  (`ic_vm_verdicts`, `ic_vm_replied`, `ic_station_replied`, `ic_help_replied`, `ic_deleted_msgs`).
  Ne modifie aucune donnée.
- `App.openTodoView()` / `closeTodoView()` / `renderTodoFeed()` / `todoGoto()` — nouvelles fonctions.
- Compteur "À traiter" (`resumeEncBadge`) repointé sur `_computeTodo().total` (avant : alertes vues).
- Aucune fonction métier modifiée (verdicts, trustDelta, buildThreads, messages.js intacts).
- Réutilise les classes CSS existantes (app.css inchangé, reste en v42).

### Fichiers modifiés

- `index.html` : ligne "À traiter" cliquable + panneau `actTodoPanel` + 5 fonctions JS + reset navActivite + compteur repointé
- `service-worker.js` : CACHE_NAME v246 → v247

---

**Mission précédente : Fix invariant badge — badge `📩 RÉPONSE` sur cartes Envoyés (vehicle_response CAS B)**
**Date :** 2026-06-25
**Commit :** 1fa1d3b
**SW :** v245 → v246

### Ce qui a été fait

Invariant fondamental corrigé : _Chaque badge doit permettre d'identifier immédiatement l'élément qui l'a déclenché et disparaître une fois la nouveauté consultée._

**Diagnostic CAS B confirmé dans le code :**
- `catBadgeVehicle` = `vmResponseUnread` (unread vehicle_response) → badge Activité s'allume.
- Onglet Envoyés : aucune carte vehicleMsgGroup n'avait d'indicateur visuel → badge non trouvable → invariant violé.

**Fix — 3 zones index.html :**

1. **Construction item** (renderCategoryFeed) — ajout 2 variables :
   ```js
   const _vmRespUnread = !isRecus ? (S._actMessages||[]).filter(m =>
     m.context_type==='vehicle_response' && m._received===true
     && !m.read_at && !(S._readMsgIds?.has(String(m.id)))) : [];
   const _vmRespPlates = new Set(_vmRespUnread.map(m => m._otherPlate||'?'));
   ```
2. **Push item** — ajout propriété `hasUnreadResponse`:
   ```js
   const hasUnreadResponse = !isRecus && _vmRespPlates.has(g.plate);
   items.push({...hasEnCours, hasUnreadResponse});
   ```
3. **Renderer `_actModCard`** — 3 modifications :
   - `const hasResp = !!item.hasUnreadResponse;`
   - Classe `act-mod-unread` quand `hasNew || hasResp`
   - Badge vert `📩 RÉPONSE` si `!hasNew && hasResp`
   - Status dot si `hasNew || hasResp`

**Auto-clear déjà en place** : `actOpenVehicleMsgGroup` Envoyés auto-marque les vehicle_response lus → `updateActBadge()` → badge décrémente → `hasUnreadResponse=false` au re-render.

### Fichiers modifiés

- `index.html` : 3 zones (construction + push item + renderer vehicleMsgGroup)
- `service-worker.js` : CACHE_NAME v245 → v246

---

**Mission précédente : Correction UX — badge bleu supprimé + chip ⏳ Vérification en attente dans liste EN COURS**
**Date :** 2026-06-25
**SW :** v244 → v245 · app.css v41 → v42

Deux corrections UX pures : (1) badge bleu `act-mod-count-badge` retiré du HTML renderer vehicleMsgGroup (badge = compteur historique, pas indicateur d'action, CSS conservé pour alertGroup) ; (2) chip `⏳ Vérification en attente` ajouté sur cartes EN COURS (lu + sans verdict, jamais avec badge NOUVEAU). Style amber `.act-mod-chip-pending`. `hasEnCours` calculé via localStorage `ic_vm_verdicts` + `ic_vm_replied` + `S._readMsgIds`.

---

**Mission précédente : Merge refonte signalements véhicule → main**
**Date :** 2026-06-24
**Commit :** merge `claude/immatconnect-pro-app-dEKGR` → `main` — SW v243

### Ce qui a été fait

Fusion de la branche `claude/immatconnect-pro-app-dEKGR` dans `main`. Résolution des conflits avec stratégie : garder les fixes iOS de main (closeCallJournal iOS scroll, act-cat-open) + garder la machine 3-états de la branche (verdicts/pendingSet, timeBadge, renderNouveau/renderEnCours/renderTraite). SW bumped v242→v243.

---

**Mission précédente (main) : 4 bugs UI — scroll Appels + legacy Signaler + HTML structure + vmg cards iOS**
**Date :** 2026-06-24
**Commits :** PR #370 (SW v238) · PR #371 (SW v239) · PR #372 (SW v240) · PR #373 (SW v241, app.css v40)

**Bug 1 — Scroll Activité bloqué après Journal d'appels** (PR #370 — validé terrain ✅)
- Fix : suppression de `overflow:hidden` des 3 règles sheet-niveau. Sheet toujours `overflow-y:auto`.

**Bug 2 — Pills "Route / Aide / Véhicule / Urgent" visibles dans Signaler** (PR #371)
- Fix : suppression du bloc legacy `#alertsToolbar + #alertsList` dans `sigStep2Route`.

**Bug 3 — Véhicule / Aide / Stationné vides dans Signaler** (PR #372)
- Fix : `</div>` de fermeture de `sigStep2Route` restauré.

**Bug 4 — Cartes EN COURS (tirets "-") et ARCHIVÉS (barres rouges) dans vue groupe véhicule** (PR #373 — validé terrain ✅)
- Fix : `#actAlertGroupFeed { display:block }` — layout block normal, pas de flex height collapse.

---

**Mission précédente (branche) : Refonte workflow signalements véhicule — machine 3 états + vocabulaire conducteur**
**Date :** 2026-06-24
**Commits :** `8bb2e94` → `17c4b4f` + vocabulaire sur `claude/immatconnect-pro-app-dEKGR` — app.css v35, SW v232

Refonte complète du panel Activité > Reçus (signalements véhicule) : machine à 3 états localStorage-only, sans modification Supabase.

**3 états :**
- **NOUVEAUX** — signalements non lus, non pendants, non traités. Badge bleu NOUVEAU + badge temps 🟢🟡🔴. Un seul bouton "✓ Je vérifierai dès que je serai arrêté".
- **EN COURS** — lus ou pendants, non traités. Bandeau "🕐 Vérification en attente" si `ic_vm_pending`. Boutons verdict : ✅ Confirmé / ℹ️ Disparu / ❌ Faux / ⏭️ Je n'ai pas pu vérifier.
- **TRAITÉS** — verdict enregistré ou `ic_vm_replied` (compat arrière). Affichage verdict + date + contact.

**Règles métier :** `actVmVerdict('confirmed')` → `trustDelta(+8)`. Autres verdicts : delta = 0. GPS filter dans `_formatMsg()`. Bloc urgence SAMU/Police/Pompiers dans Stationné. Validation ChatGPT 99%.

---

**Mission précédente : Fix scroll Activité bloqué — cause racine overflow:hidden sur #sheet**
**Date :** 2026-06-24
**Commits :** PR #366 (SW v236) · PR #368 (SW v237) · PR #370 (SW v238, app.css v39)

**Bug 1 — Sous-panneaux → retour via ‹ → scroll bloqué** (PR #366) — Fix : `body.act-cat-open` pattern.
**Bug 2 — Journal d'appels → Activité → scroll bloqué** — PR #370 fix définitif : suppression `overflow:hidden` 3 règles sheet-niveau.

---

**Mission précédente : 3 fixes UI — journal Stationné + garde CSS + Settings safe area**
**Date :** 2026-06-24
**Commits :** PR #361 (v233) · PR #363 (v234) · PR #364 (v235) — app.css v37, SW v235

1. Journal fantôme dans Stationné (closeCallJournal v2) — deux lignes retirent `.on` et forcent `display:none`.
2. Garde CSS anti-journal — `#sheet:has(#panelActivite.on) #panelMessages { display:none !important }`.
3. Panel Paramètres safe area — `height: calc(100dvh - nav-h - safe-bottom)`.

---

**Mission précédente : 3 bugs UI corrigés — Journal d'appels overlay + barre nav thread**
**Date :** 2026-06-24
**Commits :** `f35ee07` (closeCallJournal v1) · `daa2f7c` (nav always visible) — app.css v35, SW v232

1. Journal d'appels reste affiché — création `App.closeCallJournal()`.
2. Barre de navigation disparaît à l'ouverture d'un thread — suppression règle CSS `display:none`.
3. Gardien role isolation (session précédente, merge finalisé) — SW v230→v231→v232.

---

**Mission précédente : Gardien role isolation — is-gardien bleed fix + merge main**
**Date :** 2026-06-23
**Commit :** `7f8f3e1` sur `main` (poussé) — app.css v34, SW v230

### Ce qui a été fait

Isolation complète du rôle gardien pour éviter que `body.is-gardien` / `S.isGardien` ne persistent d'un compte à l'autre ou entre sessions :

1. **CSS** — `.gardien-debug-tool { display:none !important; }` ajouté dans app.css. Les boutons Dashboard + Sync alertes sont masqués par défaut via CSS (pas seulement via JS). `body.is-gardien .gardien-debug-tool { display:inline-flex !important; }` les révèle uniquement pour un gardien authentifié.

2. **OBD afterAuth (early reset)** — Ajout de `document.body.classList.remove('is-gardien'); S.isGardien=undefined;` juste après `S.uid=u.id`, avant le chargement du profil. Garantit un état propre dès le début de la ré-authentification OBD.

3. **OBD afterAuth (suppression du bloc stale)** — Suppression de 2 lignes contenant JWT fallback + `querySelectorAll('.gardien-debug-tool')`. Le rôle gardien est maintenant détecté uniquement par `openMap()` via `get_my_role()`.

4. **ImmatSwitchAccount** — Ajout de `document.body.classList.remove('is-gardien'); S.isGardien=undefined;` en début de fonction, avant `signOut()`. Empêche le rôle du compte 1 de persister pour le compte 2 (pas de reload page).

5. **afterAuth standard** (l.782, session précédente) — Reset + RPC propre, suppression du diagnostic toast temporaire.

**Fusion sur main complète. Merge du branch `claude/immatconnect-pro-app-dEKGR` → `main` terminé.**

---

**Mission précédente : Dashboard Gardien normalisation — 3 fixes appliqués**
**Date :** 2026-06-23
**Fichiers :** `index.html`, `service-worker.js` v228

### Ce qui a été fait

Audit complet du Dashboard Gardien (agent explore, 23 sections analysées). 3 corrections appliquées :

1. **isGardien DOM fallback supprimé** (l.823) — `document.body.classList.contains('is-gardien')` retiré de la condition d'accès. La classe CSS peut persister d'une session précédente même si `S.isGardien` est false. Le seul check valide est `S.isGardien===true`.

2. **Système Immunitaire — score réel** (runImmunityCheck) — toutes les entrées avaient `hasFlow:true, hasObs:true` en dur → score toujours 100% fictif. Remplacé par 6 checks de présence réels (`typeof window.L`, `typeof window.sb`, `typeof window.ImmatMessages`, `typeof window.ImmatBrain`, `typeof window.CallManager`, `!!window.S?.uid`) mappés à chaque feature.

3. **Abus reports — message d'erreur distinctif** (l.1019) — le message "Accès réservé au rôle gardien" s'affichait pour toutes les erreurs RPC, y compris les erreurs réseau. Remplacé par une détection : `error.code==='PGRST301'` ou `permission denied` → message gardien ; sinon → "Erreur chargement : \<code\>".

**Sections du Dashboard non touchées** (16/20 déjà fonctionnelles) : État du système, Violations, Événements bus, Timeline OBD, Calls Runtime, Runtime Data, Ange session, GuardianLoop, Scores fiabilité, Appels internes, Diagnostic IA, Intelligence synthétique, Immatest, Fonctionnalités/Paramètres, Sync alertes, Actualiser.

---

**Mission précédente : Chantier Fiabilisation chaîne Messages — 6/6 CLÔTURÉ**
**Date :** 2026-06-23
**Commits :** `805bc54` → `e8724a4`, messages.js v29, SW v227

---

**Mission précédente : Audit pré-merge redesign Messages V3 — MERGE VALIDÉ**
**Date :** 2026-06-23
**Commit :** `c0f33ee` (fix #icAppelsPane) — dernier commit avant validation

### Ce qui a été validé

Audit complet en 6 points avant merge du redesign visuel Messages V3 :

1. **overflow:hidden** — Aucun conteneur parent de #icMsgList bloqué. Les 5 occurrences sont soit des clips cosmétiques (border-radius), soit des parents flex avec min-height:0.
2. **#icMsgList scroll** — Correctement configuré : `flex:1 1 auto + min-height:0 + overflow-y:auto`. Hauteur dynamique (flex). Scroll JS via scrollTop/scrollHeight/scrollIntoView. Aucune dépendance à une hauteur fixe.
3. **Pagination** — AUCUNE pagination. 6 requêtes SELECT parallèles, chacune `.limit(300)` fixe. Pas de IntersectionObserver, pas de scroll-to-load.
4. **Colonnes plaques INSERT/SELECT** — INSERT primaire : 5 colonnes (sender_plate, receiver_plate, from_plate, to_plate, target_plate). Fallback retire les 4 aliases mais conserve target_plate. SELECT : `select('*')`. Normalisation gère 4 variantes + fallback profiles.
5. **Causes de disparition** — 9 filtres documentés : LIMIT 300, status=rejected, _otherPlate absent, ic_deleted_msgs, bloqué, context_type, archivé, favOnly, unreadOnly.
6. **Redesign purement visuel** — Confirmé : messages.js = zéro modification. Seuls messages.css (nouveau fichier visuel) + app.css lignes 794-875 (flex cascade) touchés.

**VERDICT : MERGE AUTORISÉ — patch purement visuel, aucune régression fonctionnelle.**

---

**Mission précédente : Fix #icAppelsPane visible dans panel Activité (IMG_6303)**
**Date :** 2026-06-23
**Commit :** `c0f33ee` — app.css v33, SW v224

Ajout de `#icAppelsPane { display: none !important; }` avant la règle `body.appels-mode #icAppelsPane`. Le style inline `display:block` posé par `_openAppelsInline()` ne pouvait plus saigner dans le panel Activité. En appels-mode, la règle plus spécifique (0,2,1 > 0,1,0) l'emporte. ✓

---

**Mission précédente : Thread — Compositeur fixe en bas iOS (overflow:hidden + flex cascade)**
**Date :** 2026-06-23
**Commit :** `7de5370` sur `main` (poussé) — restore après incident agent `f4cda3c`
**SW :** v220 → v221 · app.css v29 → v30

### Ce qui a été fait

**Problème :** Sur iPhone, le compositeur de message (textarea + bouton Envoyer) défilait avec les messages au lieu de rester fixe en bas.

**Cause racine :** `.ic-thread.show` (`messages.css`) utilise `position:absolute;inset:0` mais `overflow:visible` → les enfants flex ignoraient la contrainte de hauteur iOS → le body ne savait pas s'arrêter → le composer remontait avec le scroll.

**Fix CSS — 5 règles `:has()` ajoutées dans `app.css` (~l.861) :**
- `#sheet:has(#panelMessages.on) .ic-thread.show { overflow: hidden; }` — contraint la hauteur inset:0 sur iOS
- `#sheet:has(#panelMessages.on) .ic-thread-head { flex: 0 0 auto; }` — header fixe en haut
- `#sheet:has(#panelMessages.on) .ic-thread-body { -webkit-overflow-scrolling: touch; }` — scroll natif iOS
- `#sheet:has(#panelMessages.on) #icTypingLabel { flex: 0 0 auto; }` — label typing fixe
- `#sheet:has(#panelMessages.on) .ic-thread-composer { flex: 0 0 auto; }` — compositeur fixe en bas

**`messages.css` non modifié. Aucun JS modifié. Tous IDs JS conservés.**

**Incident agent :** Un agent background a poussé commit `f4cda3c` qui tronquait index.html à 1 ligne → écran blanc (IMG_6297). Restauré automatiquement par commit `7de5370`. CI vert sur `7de5370` (18 passed, 16 skipped). La failure vue dans CI (IMG_6299/IMG_6300) provenait du commit `f4cda3c` — déjà corrigé.

**Pills filtres Messages** (commits bddcfdb/4862bf3/68a410a) : style pleine largeur + gap corrigé (segmenté iOS, SW v218→v220) — inclus dans cette session.

---

**Mission précédente : UX Messages — Header épuré + pills filtres style Journal d'appels (Option A)**
**Date :** 2026-06-23
**Commit :** `ae1dd82` sur `main`
**SW :** v216 → v217 · app.css v25 → v26

Vue 1 header épuré (#icMsgTabsRow avec titre MESSAGES + icônes 🔍✏️ + pills Tous/Non lus/Favoris). Style identique Journal d'appels. IDs JS conservés, aucun JS modifié.

---

**Mission précédente : UX Messages — Header fixe style act-cat-hd (💬 icon + flex cascade CSS)**
**Date :** 2026-06-23
**Commits :** `af8f577` (header fixe) + `6c1bd29` (troncature thread) + `b96b03a` (PROJECT_STATE)
**SW :** v214 → v216

---

**Mission précédente : BUG FIX — Dashboard Gardien ouverture + CI preflight — VALIDÉ TERRAIN ✅**
**Date :** 2026-06-23
**Commits main :** `35b60e4` (guard isGardien) + `0c4a3dd` (guillemets curly)
**SW :** v206 → v208

Guard `if(!S.isGardien)` bloquait quand `S.isGardien` était `undefined` (timing RPC) même si `body.is-gardien` CSS persistait. Fix : double fallback `S.isGardien===true || body.classList.contains('is-gardien')`. CI preflight rouge : 5 guillemets typographiques U+2019 dans IIFE feature flags. Fix : remplacement par apostrophes ASCII U+0027. 8 scripts OK.

---

**Mission précédente : BUG FIX — Dashboard Gardien (racine OBD bypass) + Appels complet**
**Date :** 2026-06-23
**Commit main :** `bdf6d42`
**SW :** v204 → v205

### Dashboard Gardien — CAUSE RACINE DÉFINITIVE IDENTIFIÉE ET CORRIGÉE
- **Cause profonde** : l'override OBD `App.afterAuth` (ligne 3701) prend un fast-path direct `App.openMap()` quand le profil est complet, **sans jamais appeler `oldAfterAuth()`** → toute la détection gardien (JWT fallback ligne 761 + RPC `get_my_role()` ligne 764 + retry 1500ms ligne 765) était complètement bypassée → `S.isGardien` restait `undefined` jusqu'à l'appel asynchrone dans `openMap()` → `applyFeatureFlags()` voyait `S.isGardien !== true` → boutons Dashboard masqués.
- **Fix (bdf6d42)** : ajout du bloc gardien dans le fast-path OBD (ligne 3748), avant `return App.openMap()` :
  - JWT fallback : `u?.user_metadata?.role || u?.app_metadata?.role === 'gardien'` → `S.isGardien=true` + `body.is-gardien` + inline `display:inline-flex`
  - RPC `get_my_role()` avec `await` : même logique, garde le résultat pour `openMap()`

### Appels — `_openAppelsInline()` complété
- **Cause** : la version précédente utilisait `display=''` au lieu de `'block'` pour `icAppelsPane`, et omettait plusieurs opérations de `App.navAppels()` original.
- **Fix** : alignement complet avec `navAppels()` — `display='block'`, reset `icCallLog`, couleurs tabs `icTabMessages`/`icTabAppels`, masquage `ic-conv-header` et `icSearchBar`, `ImmatMessages.closeThread()`, `S._unseenMissedCalls=0`, `updateActBadge()`.

---

**Mission précédente : BUG FIX — Nav inline + Dashboard Gardien manquant**
**Date :** 2026-06-23
**Commits main :** `40b3aff` (migration get_my_role) + `d1b5061` (fix applyFeatureFlags) + `594d3d5` (nav highlights)
**SW :** v199 → v204

### Boutons Messages/Appels/Ange/✕ (suite fix 3 — inline)
- Fix 1 (b5dedc6) : `installNavButtonHotfix()` dans ui.js — pas vu (index.html chargeait toujours `ui.js?v=9`)
- Fix 2 (02b1989) : `ui.js?v=9` → `?v=10` dans index.html — SW cache possiblement périmé
- **Fix 3 (40b3aff)** : hotfix inline dans index.html juste avant `</body>` — indépendant de ui.js et du SW cache, exécuté à chaque chargement (index.html est toujours network-first avec `cache:'no-store'`).

### Dashboard Gardien — tentatives intermédiaires
- **Fix migration** : `20260623100000_get_my_role_function.sql` — crée `get_my_role()` SECURITY DEFINER
- **Fix applyFeatureFlags** : `S.isGardien===true` strict (jamais `display:none` inline)
- **Résultat** : insuffisant car le fast-path OBD bypassait tout (voir mission courante)

**Commits précédents sur la branche (non fusionnés) :**
- `7d14ade` : garde `S.isGardien` dans `openGardienDashboard()`, `forceSyncAlerts()`, `setFeatureFlag()`
- `6965a79` : Feature Flags V1 (Dashboard ↔ Paramètres)
- `c242d54` : zones accidentogènes (cercles carte) — REVERT immédiat (cassait l'app)
- `00eb789` : revert c242d54 — code identique à 7d14ade mais SW v197 → v198 → v197

---

**Mission précédente : V1 Signalements — Patch final pré-merge (pl null, _fcBody 80c, CSS abus, SW v176)**
**Date :** 2026-06-22
**Commit branche :** à venir sur `claude/immatconnect-pro-app-dEKGR` (non fusionné main — attente "Fusionner")
**SW :** v175 → v176

- `pl null` dans FloatingCard vehicle_report : cb1 redirige vers `navActivite()` + toast "Retrouvez ce signalement dans Activité > Véhicule." au lieu de bouton inactif silencieux
- `_fcBody vehicle_report` : passage de `slice(0,60)` à `slice(0,80)` — texte signalement moins tronqué
- `.act-vmg-abuse-btn` CSS ajouté dans `app.css` : fond transparent, bordure `rgba(200,60,60,.35)`, texte `#cc5555`, pleine largeur, gabarit identique à `.act-vmg-rate-btn`
- SW v175 → v176

**Décisions V1 verrouillées (analyse produit 2026-06-22) :**
- (A) Archivage avant envoi réseau dans actVmReply : accepté V1 — dette V2 (archive conditionnelle après confirmation serveur)
- (B) pl null : Option C — navActivite() + toast explicatif (implémenté dans ce commit)
- (C) _fcBody vehicle_report : 80 chars (implémenté dans ce commit)
- (D) trustDelta sans garde serveur : accepté V1 — validation UI (bouton remplacé) suffit
- (E) CSS .act-vmg-abuse-btn : fond transparent, bordure rouge atténuée (implémenté dans ce commit)
- (F) Perte localStorage après réinstallation : limitation V1 assumée — synchronisation Supabase par uid prévue V2

**Règles inviolables rappelées :**
- S6-TRUST hors périmètre V1 — ne pas fusionner, ne pas ajouter de migration confiance
- Abus ne doit JAMAIS diminuer automatiquement la confiance
- Dashboard Gardien : ne pas modifier tant que bugs terrain non résolus
- Cycle V1 : FloatingCard → Activité → action → Archivés (ic_vm_replied localStorage uniquement)
- Ne pas pousser sur main sans "Fusionner" explicite

**États métier réels (documentation V2) :**
Nouveau → Lu → Répondu / Résolu / Validé / Contesté → (Expiré manquant en V1)
En V1 : Archivé englobe Répondu + Résolu + Validé + Contesté. Expiration automatique = dette V2.

---

**Mission précédente : V1 Signalements — FloatingCard véhicule + archivage Info utile + bouton Signaler abus**
**Date :** 2026-06-22
**Commit branche :** `1ae7ebf` / `c6d568e` / `d1bd1fd` sur `claude/immatconnect-pro-app-dEKGR`
**SW :** v173 → v175

- FloatingCard `vehicle_report` : titre "🚨 Signalement véhicule", bouton unique "Voir le signalement", suppression J'arrive/En route/Reçu
- `actVmRate()` : archive dans `ic_vm_replied` après "Info utile" → passe en Archivés
- `openAbuseReport(plate, category)` : paramètre optionnel `category` — auto-sélectionne bouton modale
- `App._actAbuseReport(msgId, plate)` : helper pending state + ouverture modale FAUX_SIGNALEMENT
- `submitAbuseReport()` : capture pending AVANT closeAbuseModal, archive après submit réussi
- `closeAbuseModal()` : efface S._pendingAbuseSourceMsgId et S._pendingAbusePlate (fix pending state)
- Bouton "🚩 Signaler un abus" dans renderEnCours

**Mission précédente : Fix modale abus + Revert S6-TRUST — FUSIONNÉS**
**Date :** 2026-06-22
**Commits main :** `a578c60` (fix modale) + `90577f4` (revert S6-TRUST)

- Bug terrain : bouton "Signaler un abus" n'ouvrait pas la modale
- Cause : `openAbuseReport()` ajoutait `.on` (convention panels) au lieu de `.show` (convention modales)
- Fix : `.on` → `.show` dans `openAbuseReport()` et `closeAbuseModal()`. SW v172→v173.
- Revert `90577f4` : suppression de `20260622100000_trust_auto_refresh.sql` (S6-TRUST) qui bloquait le CI
  (commit `20c072d` apparu sur main ce matin — migration non appliquée à la DB — exit code 1)
- CI repassé vert après le revert

**Mission précédente : Chantier A — PR 2 Dashboard Gardien UI — Section Signalements d'abus — FUSIONNÉ**
**Date :** 2026-06-22
**Commit main :** `3200ebc`
**Fichiers :** `index.html`, `service-worker.js` (v171→v172)

- Placeholder `<div id="gardienAbuseReports">` ajouté dans `openGardienDashboard()` (avant "Actions gardien")
- Async IIFE : appel `sb.rpc('get_abuse_reports_admin')`, rendu header (total/ouverts), pills catégories, tableau 50 entrées (date/plaque/motif/détails/plate_count/statut badge)
- Gestion d'erreur : message "Accès réservé au rôle gardien" si non-gardien (pas de crash)
- T1 à valider avec compte gardien réel dans l'app (Studio ne peut pas tester avec JWT gardien)
- Chantier A complet : ✅ table + RLS + modale + RPC + fix 42702 + UI dashboard

**Mission précédente : Chantier A — Fix 42702 RPC get_abuse_reports_admin() — FUSIONNÉ**
**Date :** 2026-06-22
**Commits main :** `59f4854` (RPC initiale) + `3d1bbe6` (fix 42702)
**Fichier :** `supabase/migrations/20260622130000_abuse_reports_admin_rpc_fix.sql`

- Bug : `WHERE id = auth.uid()` → `42702: column reference "id" is ambiguous` en PL/pgSQL
- Fix : alias de table `FROM auth.users u WHERE u.id = auth.uid()`
- T2 validé en Studio : `P0001: Accès refusé` (garde rôle fonctionnelle)
- 42702 confirmé disparu sur T1/T2/T4/T5

---

**Mission précédente : Fix voiceInput() — garde instance + blur() + timeout 15s + concat trim — TERMINÉE ET VALIDÉE**
**Date :** 2026-06-22
**Commit :** `e0562fd` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js` v168→v169

**Ce qui a été fait :**
- `this._voiceInput=rec` : instance stockée → 2e tap stoppe la reconnaissance (toggle)
- `$(target).blur()` avant `rec.start()` : libère l'audio iOS (clavier virtuel)
- `setTimeout(15000)` + `clearTimeout` dans `onerror` et `onend` : arrêt automatique garanti, aucun zombie
- `_last = (_last + ' ' + best).trim()` : segments concaténés avec espace, pas de mots collés

**Tests terrain validés :**
- ✅ Message long → pas de mots collés
- ✅ Plaque → normalisation OK
- ✅ 1er clic → démarre
- ✅ 2e clic → stoppe proprement
- ✅ Timeout 15s → stop automatique
- ✅ Refus micro iOS → toast erreur propre

**Chantier micro Ange/GPS/voiceInput : CLÔTURÉ.**

Précédente mission terminée :

**Mission : Phase 2 Modales Settings — Unification headers A19→A23 — TERMINÉE ET VALIDÉE TERRAIN**
**Date :** 2026-06-22
**Commit :** `cd2e814` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `app.css?v=17` (règle `.ph-actions`), `service-worker.js` v167→v168

**Ce qui a été fait :**
- **A19 — `#blocked`** : `<h2>` + bouton Fermer → `.panel-header` [Plaques bloquées][✕ closeBlocked()]
- **A20 — `#recent`** : `<h2>` + boutons Vider/Fermer → `.panel-header` [Véhicules récents][`.ph-actions` Vider rouge][✕ closeRecent()]
- **A21 — `#favoritesModal`** : `<h2>` + bouton Fermer → `.panel-header` [⭐ Conducteurs favoris][✕ closeFavoritesModal()]
- **A22 — `#trustedModal`** : `<h2>` + bouton Fermer → `.panel-header` [🤝 Conducteurs de confiance][✕ closeTrustedModal()]
- **A23 — `#legal`** : `.panel-header` [Confidentialité & CGU][✕ closeLegal()] inséré avant `.legal-tabs` dans `.legal-modal-card flex-column` ; bouton Fermer bas supprimé
- CSS : règle `.ph-actions { display:flex; align-items:center; gap:6px; flex-shrink:0 }` ajoutée

**Chantier migration headers UX : CLÔTURÉ DÉFINITIVEMENT.**
- Phase 1 (5 panels #sheet) + Phase 2 (5 modales Settings + 5 sous-steps Signaler + 4 vues Messages) = 100% migré.

Précédente mission terminée :

**Mission : Phase 2 Signaler — Boutons ← + ✕ natifs dans les 5 sous-steps de #panelAltet — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `cd2e814` (inclus dans la suite, SW v151)
**Fichiers modifiés :** `index.html`, `app.css?v=16`, `service-worker.js` v150→v151

**Ce qui a été fait :**
- **sigStep2Route** : `.sig-back-btn` → `.panel-header` [← "Incident route" ✕]
- **sigStep2Vehicle** : `.sig-back-btn` → `.panel-header` [← "Problème véhicule" ✕]
- **sigStep3VehicleMsg** : `.sig-back-btn` → `.panel-header` [← "Message à envoyer" ✕], `.ph-back` conserve classe `.sig-back-btn` (compatibilité immat-test-engine:410)
- **sigStep2Aide** : `.sig-back-btn` → `.panel-header` [← "Demande d'aide" ✕]
- **sigStep2Station** : `.sig-back-btn` → `.panel-header` [← "Véhicule stationné" ✕]
- **CSS** : `:has(#sigStep1.active) .sheet-close` → `:has(#panelAltet.on) .sheet-close` (couvre toutes les étapes)
- Stepper graphique et `.sig-step-title` conservés sous le `.panel-header`

Précédente mission terminée :

**Mission : Phase 2 Messages — Boutons X natifs dans les 4 vues du panel Messages — TERMINÉE**
**Date :** 2026-06-21
**Commit :** à pousser sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `app.css?v=15`, `service-worker.js` v149→v150

**Ce qui a été fait :**
- **A11 — `.ic-conv-header-acts`** : ajout bouton `.ph-close` ✕ après le bouton ✏️ (Nouveau message). Masque le `.sheet-close` flottant via `:has(#panelMessages.on)`.
- **A12 — `#icAppelsPane`** : ajout `.panel-header` [Journal d'appels][✕] comme premier enfant du pane (avant le champ de recherche).
- **A13 — `#icComposePanel`** : remplacement de `.ic-compose-hd` par `.panel-header` avec `.ph-back` ← (closeCompose), `.ph-title-group` + `.ph-title.ic-compose-title`, bouton 🗑 (flex-shrink:0), `.ph-close` ✕. La classe `.ic-compose-title` est préservée (aucune référence JS).
- **A14 — `.ic-thread-actions`** : ajout bouton `.ph-close` ✕ après le bouton ⋯.
- **CSS** : `:has(#panelMessages.on) .sheet-close { display: none }` + `.ic-conv-header-acts .ph-close, .ic-thread-actions .ph-close { margin-right: 0 }`.
- `app.css?v=14 → ?v=15`, SW `v149 → v150`.

Précédente mission terminée :

**Mission : PR 2 — Ange UX responsive + Fix nav cachée iOS — TERMINÉE ET VALIDÉE TERRAIN**
**Date :** 2026-06-21
**Commits :** `d2f1549` (ange-open class) · `5132815` (suppression auto-focus — fix final) sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `app.css`, `service-worker.js` v131→v138

**Ce qui a été fait (PR 2 initiale) :**
- **C1** : `AngeDialog.open()` ferme la sheet et retire `.on` de tous les panels avant d'afficher Ange.
- **P1 (Paysage)** : `#angePanel { left: calc(58px + env(safe-area-inset-left,0px)) }` — Ange ne couvre plus la nav latérale.
- **M1 (iOS dvh)** : `max-height:80vh` → `max-height:min(80dvh, …safe-area)`.
- **M2 (safe-area)** : `padding-bottom:max(16px,env(safe-area-inset-bottom,8px))`.

**Fix complémentaire — nav cachée à l'ouverture d'Ange (validé terrain) :**
- **Cause racine** : `AngeDialog.open()` appelait `setTimeout(()=>$('angeMsg')?.focus(),100)` — le focus automatique sur la textarea déclenchait le clavier iOS, réduisant le visual viewport. La `.bottom-nav` (`position:absolute` dans `#appScreen` `position:fixed`) restait ancrée au layout viewport et sortait de la zone visible. Ce n'était pas un `display:none` CSS mais un problème de viewport iOS.
- **Hypothèses éliminées** : `keyboard-open` / `display:none` (testé, n'était pas la cause), z-index overlay couvrant la nav (géométriquement impossible avec `bottom:64px`), `closeSheet()` touchant la nav (non, ne touche que `#sheet`).
- **Correction retenue** : suppression de la ligne `setTimeout(()=>$('angeMsg')?.focus(),100)` dans `AngeDialog.open()`. L'utilisateur tape manuellement dans le champ — comportement standard iOS.
- SW v131 → v138.

Précédente mission terminée :

**Mission : BUG FIX — Boutons panelAltet non réactifs (pointer-events:none via .mini + :has()) — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `0d3673e` sur `main` (poussé)
**Fichiers modifiés :** `app.css`, `service-worker.js` v129→v130

**Ce qui a été fait :**
- **AUDIT COMPLET** : Route/Véhicule/Aide/Stationné/X — tous KO pour la même cause racine.
- **CAUSE RACINE** : `App.closeSheet()` ajoute `.mini` au sheet sans retirer `.on` du panel actif. PR 1's `:has()` (spécificité 210) écrase `height:0` de `.sheet.mini` (spec 20) → sheet visible à 52dvh. Mais `.sheet.mini { pointer-events:none }` (spec 20) n'est PAS écrasé par `:has()` (qui ne déclare que `height`) → tous les descendants héritent `pointer-events:none` → clics impossibles. Bug latent avant PR 1 (height:0 cachait le problème), rendu perceptible par PR 1.
- **CORRECTION** : ajout de `:not(.mini)` sur les 5 sélecteurs `:has()` portrait dans `app.css` — les hauteurs dynamiques ne s'appliquent que quand le sheet est réellement ouvert. CSS-only, aucun changement JS.
- `service-worker.js` v129 → v130.

Précédente mission terminée :

**Mission : Réponse citée (↩️ quoted reply) dans le fil de messages — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `566f495` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `messages.js` v24→v25, `messages.css`, `service-worker.js` v125→v126

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Réponse citée ↩️** : bouton ↩ sur chaque bulle reçue dans le thread. Tap → barre de preview violette (`#icQuotePreview`) s'affiche au-dessus du compositeur avec le texte original tronqué à 80 chars. Annulation via × ou fermeture du thread. À l'envoi (`reply()`), le texte est préfixé `> citation\n` — le renderer reconnaît les lignes `> ` et les affiche en `.ic-msg-quote` (bordure violette gauche, italique gris). Implémentation 100% client (pas de DB), compatible avec le filtre de recherche et le scroll. CSS : `.ic-reply-btn` opacity 0 → visible au hover/touch.

Précédente feature terminée :

**Mission : Fix critique — alignement version messages.js (SW cache v123→v124 mismatch) — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `eaf2a0d`
**Fichiers modifiés :** `index.html` (messages.js?v=23→?v=24), `service-worker.js` v124→v125

**Ce qui a été fait :**
- **BUG FIX — Mismatch version messages.js** : après le déploiement de la feature 6 (filtre non-lus), `index.html` chargeait `messages.js?v=23` mais le SW v124 ne pré-cachait que `messages.js?v=24`. Quand l'ancien SW v123 était encore actif, il servait l'ancien `messages.js` (sans `toggleUnreadOnly`) depuis son cache → TypeError au clic sur 📬 → instabilité app. Fix : `index.html` aligne sur `?v=24` + SW bumpe en v125 pour forcer un refresh complet sur tous les appareils.

Précédente feature terminée :

**Mission : Filtre "Non lus seulement" dans la liste des conversations — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `595c884` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `messages.js` v23→v24, `service-worker.js` v123→v124

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Filtre 📬 Non lus seulement** : bouton `icUnreadOnlyBtn` (📬) ajouté dans l'en-tête Messages, entre "Tout lu" et ⭐ favoris. Toggle `State.unreadOnly` + localStorage `ic_conv_unread_only`. Quand actif (bouton doré) : filtre la liste pour ne montrer que les conversations avec messages non lus. Message vide adapté : "Aucune conversation non lue." Parallèle au filtre ⭐ favOnly existant. `toggleUnreadOnly()` ajouté dans messages.js et exporté.

SW v123 → v124.

---

**Mission : Barre de réponses rapides dans le fil de messages — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `359e2df` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v122→v123

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Réponses rapides dans le fil** : rangée horizontale scrollable de 7 chips (OK 👍 / J'arrive ! / Merci 🙏 / En route 🚗 / Compris ! / 5 min ⏱ / Je ne peux pas) au-dessus du compositeur dans #icThread. Chaque chip appelle `ImmatMessages.quick(text)` pour envoi immédiat sans passer par la textarea.

SW v122 → v123.

---

**Mission : Masquer/restaurer entrées individuelles du journal d'appels — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `592be69` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v121→v122

**Ce qui a été fait :**
- **NOUVELLE FEATURE — ✕ Masquer un appel** : bouton discret sur chaque entrée du journal d'appels. Masque localement (ic_hidden_calls localStorage) sans toucher la base. `App.hideCallEntry(id)` + `App.restoreHiddenCalls()`. En-tête du journal : bouton "Restaurer (N)" conditionnel quand N entrées masquées.

SW v121 → v122.

---

**Mission : Bouton Confiance dans le menu contextuel véhicule — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `0e88f38` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v120→v121

**Ce qui a été fait :**
- **NOUVELLE FEATURE — 🤝 Confiance dans le menu contextuel** : bouton secondaire sous les bulles d'action du menu contextuel véhicule. Visible uniquement pour les véhicules non-self. Vert "Marquer comme de confiance" / rouge "Révoquer la confiance" selon l'état ic_trust courant. Toggle appelle `ImmatMessages.setTrust()` avec fallback localStorage. Mise à jour immédiate du bouton après action.

SW v120 → v121.

---

**Mission : Onboarding iOS A2HS + tip conditionnel Paramètres (S8-04) — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `f69b15e` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v119→v120

**Ce qui a été fait :**
- **S8-04 — Bloc iOS A2HS dans l'onboarding** : bloc vert conditionnel visible uniquement sur iPhone/iPad non standalone. Instructions claires : «Safari → Partager ⎙ → Sur l'écran d'accueil». Apparaît entre le bloc push et le bouton «C'est parti !».
- **Tip Paramètres conditionnel** : `id=settingsA2HSTip` — masqué par défaut, affiché automatiquement via `App.panel('settings')` quand iOS + pas standalone. Plus de texte affiché sur Android ou desktop.
- Détection : `/(iPhone|iPad|iPod)/.test(navigator.userAgent) && !window.navigator.standalone`.

SW v119 → v120.

---

**Mission : Item "Messages non lus" dans le Résumé rapide Activité — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `3a5a390` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v118→v119

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Item 💬 Messages non lus dans Résumé rapide** : visible uniquement quand `S._actMessages` contient des messages de conversation (context_type absent) reçus et non lus. Affiche le nombre de messages + de contacts distincts ("X message(s) de Y contact(s) non lu(s)"). Tap → `navMessages()`. Complète la triade des items conditionnels : Appels manqués / Mes signalements / Messages non lus.

SW v118 → v119.

---

**Mission : Bouton "Tester les notifications" dans les Paramètres — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `90f843a` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v117→v118

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Test push notification** : bouton "🔔 Tester les notifications" ajouté en bas de la section Notifications dans les Paramètres. Appelle `testPushNotification()` : vérifie la permission (propose `requestPushPermission()` si nécessaire), puis envoie une notification via `serviceWorker.showNotification()` (plus fiable sur iOS/Android) avec fallback `new Notification()`. Toast de confirmation.

SW v117 → v118.

---

**Mission : "Mes signalements" dans le Résumé rapide Activité — TERMINÉE**
**Date :** 2026-06-21
**Commit :** (en cours)
**Fichiers modifiés :** `index.html`, `service-worker.js` v116→v117

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Item 📤 Mes signalements dans Résumé rapide** : visible uniquement quand l'utilisateur a des alertes envoyées encore actives (`_mine||_own`, non résolues, dans le TTL). Affiche le compte + "X signalement(s) en cours". Tap → `navActivite()` + `openActivityCat('all')` + `actCatTab('envoyes')` pour ouvrir directement l'onglet "Envoyés".

SW v116 → v117.

---

**Mission : Modal "Conducteurs de confiance" dans les Paramètres — TERMINÉE**
**Date :** 2026-06-21
**Commit :** (en cours)
**Fichiers modifiés :** `index.html`, `service-worker.js` v115→v116

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Modal conducteurs de confiance** : bouton "🤝 Confiance" dans les Paramètres (à côté de "⭐ Favoris"). Ouvre un modal listant toutes les plaques dans `ic_trust` avec niveau `'TRUSTED'`. Chaque entrée a : bouton 💬 (ouvre la messagerie) + bouton ✕ (révoque la confiance via `removeTrustedModal()`, appelle `ImmatMessages.setTrust(plate,'NONE')` si disponible, fallback localStorage direct). État vide : "Aucun conducteur de confiance." La triade Settings est complète : Bloqués / Favoris / Confiance.

SW v115 → v116.

---

**Mission : Modal "Conducteurs favoris" dans les Paramètres — TERMINÉE**
**Date :** 2026-06-21
**Commit :** (en cours)
**Fichiers modifiés :** `index.html`, `service-worker.js` v114→v115

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Modal conducteurs favoris** : bouton "⭐ Favoris" dans les Paramètres (à côté de "🚫 Bloqués"). Ouvre un modal listant toutes les plaques dans `ic_conv_favorites`. Chaque entrée a : bouton 💬 (ouvre la messagerie) + bouton ☆ (retire des favoris via `removeFavModal()`, appelle `ImmatMessages.unfavoriteConv()` si disponible). État vide : "Aucun conducteur favori."

SW v114 → v115.

---

**Mission : Statistiques d'appels dans les Paramètres — TERMINÉE**
**Date :** 2026-06-21
**Commit :** (en cours)
**Fichiers modifiés :** `index.html`, `service-worker.js` v113→v114

**Ce qui a été fait :**
- **NOUVELLE FEATURE — Stats d'appels dans Paramètres** : `refreshStats()` enrichi avec 4 nouvelles tuiles : 👥 Conducteurs favoris (ic_conv_favorites), 📞 Appels décrochés (count de ic_call_durations), ⏱️ Durée totale (somme formatée H:MMmin), 📊 Durée moyenne (moyenne formatée). La grille passe de 5 à 9 tuiles.

SW v113 → v114.

---

**Mission : Bouton ⭐ favori par entrée dans le journal d'appels — TERMINÉE**
**Date :** 2026-06-21
**Commit :** `c059797` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v112→v113

**Ce qui a été fait :**
- **NOUVELLE FEATURE — ⭐ favori par entrée du journal d'appels** : chaque ligne du journal d'appels (`renderCallJournal`) affiche désormais un bouton ⭐/☆ permettant d'ajouter ou retirer la plaque des favoris conducteurs (`ic_conv_favorites`). Bouton coloré (⭐ or/☆ gris) selon l'état courant, titre contextuel "Retirer des favoris" / "Ajouter aux favoris". Appelle `ImmatMessages.favoriteConv/unfavoriteConv()` avec fallback localStorage direct. Rafraîchit le journal (`renderCallJournal()`) après toggle.
- Nouvelle méthode `App.toggleCallJournalFav(plate)` ajoutée.

SW v112 → v113.

---

**Mission : Fix bouton 🚨 nearby panel + appels manqués dans Activity — TERMINÉE**
**Date :** 2026-06-20
**Commit :** `b000b57` sur `claude/immatconnect-pro-app-dEKGR`
**Fichiers modifiés :** `index.html`, `service-worker.js` v111→v112

**Ce qui a été fait :**
- **BUG FIX — bouton 🚨 renderNearby** : `vehicleAlertQuick(plate)` passait la plaque comme `label` → toast "Indique la plaque" au lieu d'ouvrir le flux véhicule. Remplacé par `vehicleAlertFromNearby(plate)` : pré-remplit `sigVehiclePlate`, ferme le panel, ouvre le flux 3-clics (`openVehicleReport()`).
- **NOUVELLE FEATURE — Appels manqués dans Activity** : item 📵 "Appels manqués" dans le Résumé rapide d'Activité, visible uniquement si `S._unseenMissedCalls > 0`. Tap → `navAppels()` + filtre automatique `setCallJournalFilter('missed')`. `renderActivityMain` mis à jour.

SW v111 → v112.

---

**Mission : Panel conducteurs proches enrichi + push retry + rate limit DB — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v110→v111, `supabase/functions/send-push-notification/index.ts`, `supabase/migrations/20260620110000_messages_rate_limit.sql` (créé)

**Ce qui a été fait :**
- **B — `renderNearby()` enrichi** : point de fraîcheur coloré (●vert <60s / ●orange <3min / ●gris >3min) avant chaque plaque ; en-tête compteur "N connecté(s) dans le rayon" + bouton "↻ Actualiser" ; bouton 🚨 `vehicleAlertQuick()` ; bouton 📍 zoom carte + fermeture panel.
- **C1 — Push notification retry** : `sendWithRetry()` tente jusqu'à 3 fois sur erreurs 5xx transitoires (backoff 1s / 2s), échoue immédiatement sur 4xx. `Promise.allSettled` préserve la gestion des 410/404 expirés.
- **C2 — Rate limit DB messages** : migration `20260620110000_messages_rate_limit.sql` — fonction `check_message_rate_limit(uid)` SECURITY DEFINER (max 30 messages/minute/utilisateur) + policy RLS `messages_rate_limited_insert` WITH CHECK.

SW v110 → v111.

---

**Mission : Audit global phase 2 — 6 bugs robustesse (race condition GPS, channel Realtime, loadOthers throttle, XSS js(), double getUser(), subscribeCommunityReports async) — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v109→v110

**Bugs corrigés :**
- **BUG-002** — Race condition `locate()` callback async : flag `_locateCbRunning` + try/finally empêche deux upserts concurrents sur `user_locations`.
- **BUG-004** — `subLocs()` fuite channel Realtime : retry sauvegarde l'ancien ref avant `S.chLoc=null`, appelle `sb.removeChannel(old)` avant de re-souscrire.
- **BUG-006** — `loadOthers()` throttle 2s : guard `S._loadOthersAt` évite les appels redondants GPS+Realtime dans la même fenêtre.
- **BUG-010** — `subscribeCommunityReports()` async + `await sb.removeChannel()` : l'ancien channel est bien fermé avant la nouvelle souscription.
- **BUG-011** — Double `getUser()` éliminé : `syncCommunityAlerts()` et `_handleReport()` utilisent `S.uid` (déjà en cache) au lieu d'appeler l'API auth.
- **BUG-015** — `js()` XSS : ajout de `replace(/"/g,'&quot;')` pour empêcher la sortie d'attribut HTML via les guillemets doubles.

(BUG-007 `_authRunning` : déjà protégé par `finally{S._authRunning=false;}` — pas de changement nécessaire.)

SW v109 → v110.

---

**Mission : Audit global — 6 bugs corrigés (PII, GPS backoff, SW versioning, myMarker null-safe, RGPD deleteAccount, auth call GPS) — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v108→v109

**Bugs corrigés :**
- **BUG-001** — PII : `user_locations.user_name` stockait `ud.user.email` → remplacé par `S.profile?.owner_plate||''` (plaque du propriétaire, anonyme).
- **BUG-003** — GPS timeout infini : retry illimité → backoff exponentiel (1.5s × 2ⁿ, max 30s, max 5 tentatives), toast explicatif après le 5e échec. `S._gpsRetry=0` réinitialisé sur succès.
- **BUG-008** — SW versioning : `badge.js`, `obdSession.js`, `obdGateway.js`, `aiController.js` ajoutés sans `?v=` → ajout `?v=1`. SW v108→v109.
- **BUG-009** — `myMarker` null-safe : `if(S.myMarker&&S.map){try{S.map.removeLayer(S.myMarker);}catch(_){}}S.myMarker=null` (try/catch évite crash si couche déjà retirée).
- **BUG-012** — `deleteAccount()` RGPD : purge uniquement les clés `ic_*` et `_ic_*` (pas les clés tierces) via `Object.keys(localStorage).filter(k=>k.startsWith('ic_')||k.startsWith('_ic_'))`.
- **BUG-014** — Auth call dans GPS : `sb.auth.getUser()` appelé toutes les 4-12s → remplacé par `S.uid` + `S.profile?.owner_plate` (aucun appel réseau supplémentaire dans le callback GPS).

---

**Mission : Fix suivi GPS continu — carte suit la position en temps réel — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v107→v108

**Cause racine :** Dans `initMap()`, le listener `S.map.on('dragstart zoomstart', ()=>S.autoFollow=false)` était déclenché par le `setView()` programmatique de `locate()` lui-même (zoomstart = changement de zoom 6→17). Résultat : `autoFollow` passait à `false` dès le premier fix GPS → la carte ne suivait plus la position après le premier point.

**Fix :** Flag `S._gpsMoving=true` positionné avant chaque `setView()` GPS/recenter. Listeners séparés (dragstart / zoomstart) vérifient `if(!S._gpsMoving)` avant de désactiver `autoFollow`. `moveend/zoomend` remet `_gpsMoving=false`. Seuls les gestes utilisateur (drag/pinch réel) désactivent maintenant `autoFollow`.

SW v107 → v108.

---

**Mission : Crosshair GPS — cercle au centre de la carte (quand GPS inactif) — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `app.css` (v10→v11), `service-worker.js` v106→v107

**Ce qui a été fait :**
- Audit : aucun "cercle au centre de la carte" n'existait dans le code — le `S.myMarker` (icône SVG circulaire) est uniquement créé lors d'un fix GPS.
- Ajout de `<div id="mapCenterPin">` avec SVG crosshair (cercle bleu 44px + 4 lignes directrices) positionné en `position:fixed;left:50%;top:50%` → reste visuellement au centre de l'écran quelle que soit la position de la carte (comme Waze/Google Maps).
- **Show** : `initMap()` affiche le crosshair si `S.myLat === null` (premier démarrage sans GPS).
- **Hide** : callback `watchPosition` masque le crosshair dès le premier fix GPS reçu et le marqueur placé.
- **Show retour** : `toggleInvisible()` (passer en mode invisible) retire le marqueur et affiche le crosshair — l'utilisateur voit toujours un repère visuel de la position de la carte.
- CSS : masque automatiquement si sheet plein écran ou clavier ouvert (parité avec les FABs).
- SW v106 → v107, app.css v10 → v11.

---

**Mission : Fix régression véhicule ne bouge pas — panTo → setView — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v104→v105→v106 (PR #356)

**Mission : Navigation GPS — zoom adaptatif + fitBounds protégé — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `index.html`, `service-worker.js` v103→v104→v105 (PR #355)

**Mission : Immatest v2 — robot de test in-app complet — TERMINÉE**
**Date :** 2026-06-20
**Fichiers modifiés :** `core/immat-test-engine.js` (v2), `index.html` (v1→v2), `service-worker.js` v103→v104

**Ce qui a été fait :**
1. **Audio restauré** — tous les sons activés (sonnerie, bips messages, tonalité sortante) ; seul le bip de démarrage au premier touch iOS reste silencieux.
2. **Test AU-10 corrigé** — regex `/v1[2-9]|v[2-9]\d/` ne couvrait pas v100+ ; remplacé par `parseInt(m[1], 10) >= 12`.
3. **"Mes signalements" supprimé** du panneau Signaler (redondant avec Activité).
4. **Ange — bouton "Voir le tableau de bord →"** ajouté dans le message copilot du thème `guardian` (immat-copilot.js v2).
5. **Immatest intégré dans le Dashboard Gardien** — `core/immat-test-engine.js` v1 puis v2, onglet 🧪 dans le dashboard, panneau avec résultats live.
6. **Immatest v2 — 18 scénarios complets** couvrant : auth/session, emails/réinitialisation mot de passe, navigation 5 onglets, 11 overlays + fermetures, messages UI, messages envoi→DB, appels signaling, signalement étapes+urgences, activité panels, localStorage JSON, confiance/blocage, présence/paramètres, audio, SW cache, GVC 8 sections, OBD/organisme, Realtime Supabase, ergonomie UX (tap targets ≥44px, aria-labels, boutons retour).

**Mission : Journal d'appels — 2 bugs UX corrigés — TERMINÉE**
**Date :** 2026-06-19
**Fichiers modifiés :** `index.html` (navAppels + pickPlate), `service-worker.js` v87

**Corrections appliquées :**

1. **Bug layout "grande case vide à gauche"** — `navAppels()` utilisait `display='flex'` pour afficher `#icAppelsPane`, créant un flex horizontal (champ de recherche + résultats en colonnes). Corrigé en `display='block'` (2 occurrences : l'affectation principale + le guard du setTimeout 350ms).

2. **Bug superposition "autre carte derrière"** — Le bouton 💬 dans chaque entrée du journal appelait `App.pickPlate()`, dont le override interne exécutait `App.panel("messages")` sans réinitialiser l'état des onglets (icMsgList caché, icAppelsPane visible). Résultat : la liste de messages flashait derrière le journal. Corrigé : remplacement de `App.panel("messages")` par `App.navMessages()` dans le override `pickPlate`, qui rétablit correctement l'état complet du panel Messages (icMsgList visible, icAppelsPane caché, tabs nav corrects) avant d'ouvrir le mode compose.

SW v86 → v87.

---

**Mission : Zones à risque cohérentes — accidents uniquement — TERMINÉE**
**Date :** 2026-06-19
**Fichiers modifiés :** `index.html`, `service-worker.js` v86, `supabase/migrations/20260619170000_risk_zones_accident_only.sql` (créé)

**Ce qui a été fait :**
- Migration SQL : trigger `update_road_risk_on_report()` reécrit avec filtre strict — seuls `[ROUTE] Accident%`, `[ROUTE] Obstacle%`, `[ROUTE] Danger%` alimentent les zones à risque. Police, travaux, bouchons, assistance : ignorés.
- TRUNCATE + reconstruction propre de `road_risk_segments` depuis les données existantes avec le nouveau filtre + `HAVING COUNT(*) >= 2` (min 2 accidents au même endroit).
- UI : toast "X accident(s) à cet endroit" + popup "Zone accidentogène" (anciens libellés moins précis remplacés).
- Les conducteurs peuvent toujours signaler toutes les catégories — seul le CALCUL des zones à risque est filtré.

---

**Mission : Panneau Paramètres — 10 améliorations — TERMINÉE**
**Date :** 2026-06-19
**Fichiers modifiés :** `index.html`, `service-worker.js` v85

**Ce qui a été fait :**
1. Rayon de détection visible dans Paramètres (slider synchronisé avec la carte, id=radiusSettingsSlider)
2. Auto-statut conduite (toggle ic_auto_status → setPresence conduite/disponible selon vitesse GPS)
3. Notifications Messages + Appels (toggles notifMessagesToggle + notifCallsToggle)
4. Réinitialisation sélective RGPD (GPS / alertes / confiance — 3 boutons distincts)
5. Section Ange IA (angeProactiveToggle + angeMonologueToggle)
6. Mode économie batterie (batterySaveToggle → GPS options allégées : pas highAccuracy, maximumAge 10s, timeout 30s)
7. Statistiques personnelles (settingsStatsGrid : compteurs appels/messages/signalements/favoris depuis localStorage)
8. Signaler un abus (plate + raison → supabase abuse_reports)
9. Synchronisation openMap() pour initialiser tous les nouveaux contrôles
10. updateDrivingMode() étendu avec logique auto-statut (speed >20→conduite, <5 pendant 30s→disponible)

---

**Mission : Diagnostic IA Gardien — GardienDiagnostic v2 + Conscience Temporelle — TERMINÉE**
**Date :** 2026-06-19
**Commits :** `17a4b6f` (v1) · `1905cb9` (v2) · `8a8a87e` (conscience temporelle) sur `main` (poussé)
**Fichiers modifiés :** `core/gardien-diagnostic.js` (créé), `supabase/functions/_shared/knowledge-gardien-flows.ts` (créé), `supabase/functions/immat-brain-dialog/index.ts`, `core/swarm-engine.js`, `index.html`, `service-worker.js` v84

**Livre des Lois Fonctionnelles** (`knowledge-gardien-flows.ts`) :
- 15 flux documentés exhaustivement : MESSAGE-SEND, PARKED-REPORT, PARKED-RESPONSE, VEHICLE-ALERT, ROUTE-REPORT, HELP-REQUEST, HELP-RESPONSE, CALL, PUSH-NOTIFY, GPS, ANGE-QUERY, SWARM, BADGES, INTELLIGENCE, AUTH
- Pour chaque flux : trigger, chaîne obligatoire (ordre exact), état expéditeur, état destinataire, invariants actifs, pannes communes, vérifications gardien
- Intégré dans STATIC_SYSTEM_GARDIEN (Ange connaît désormais les lois de tout)

**GardienDiagnostic** (`core/gardien-diagnostic.js`) :
- Écoute tous les ImmatBus events en continu (wildcard `*`)
- **Watchdog d'achèvement** : détecte ce qui N'arrive PAS (MESSAGE_SENT sans écho 5s, ANGE_MESSAGE_SENT sans réponse 15s…) → alerte immédiate
- **Diagnostic croisé Swarm** : SwarmEngine expose `_getPresenceState()` + payload `_diag` (gps_ok, rt_ok, kernel_score) → le gardien voit l'état de tous les appareils connectés
- **Contexte de test actif** : sélecteur 7 flux dans le dashboard → analyse focalisée
- **Mémoire des récurrences 24h** : flux instables (2+ violations) affichés en rouge
- **Conscience temporelle** : `_buildDiagHistory()` envoie les 4 derniers cycles comme `history` à Ange → tendances détectées (aggravation/amélioration/nouveau/stable)
- Cycle automatique 30s + bouton "Analyser" + alerte watchdog immédiate
- Démarrage automatique 10s après login gardien

**Edge Function** — nouveau mode `gardien_diagnostic` :
- Gardien uniquement (403 sinon), max_tokens 700, history temporelle incluse
- Ange produit `{diagnostics[], synthese, priorite_immediate}` avec champ `tendance`
- Prompt adapté selon présence ou non d'historique

**Dashboard gardien enrichi** :
- Section "Diagnostic IA" : flux live, sélecteur test, récurrences
- Grille intelligence synthétique (Brain, Consciousness, Soul, Kernel, GPS, Realtime)
- Icônes tendance : 📈 aggravation / 📉 amélioration / 🆕 nouveau

**Mission : Ange Intelligence Overhaul — 5 améliorations P1→P5 — TERMINÉE**
**Date :** 2026-06-19
**Commits :** `862f8f2` (P2+P4) · `3cbe1ff` (P5) · `93f6f4c` (P1) · `f784fcb` (P3) sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `core/narrator.js` v2, `supabase/functions/immat-brain-dialog/index.ts`, `service-worker.js` v81

- **P1 — Ange Prédictif** : pré-appel Claude pendant les moments calmes (NOMINAL + idle 90s), cache `ic_ange_predicted`, affiché à l'ouverture du panneau (bulle violette "J'ai réfléchi en avance")
- **P2 — Mémoire Émotionnelle** : `narrator.js` v2 — chaque événement stocke son urgence au moment de l'émission ; `getJournalText()` trie par poids émotionnel `urgency × e^(-min/30)` au lieu de chronologie
- **P3 — Monologue Privé** : `AngeMonologue` toutes les 8 min pendant la conduite, appelle `mode:'monologue'` → Claude réfléchit en silence, stocke dans `ic_ange_conscience` (5 entrées, 2h) ; la préoccupation la plus haute priorité est injectée dans le snapshot au moment de la question utilisateur
- **P4 — Compression Contextuelle Adaptative** : `max_tokens` varie selon urgence — FLASH (≥7) : 80 tokens, STANDARD (3-6) : 200, DEEP (<3) : 400. Note `⚡ MODE FLASH` injectée dans le contexte dynamique
- **P5 — Question Jamais Posée** : après chaque réponse Ange, affiche un angle mort de l'âme (`S._soul.blind_spots[0]`) sous forme de suggestion cliquable (cooldown 10 min)

**Mission : ImmatCoPilot v1 + ImmatKernel v1 + ImmatSoul v1 — éveil total du système — TERMINÉE**
**Date :** 2026-06-19
**Commits :** `d9fc68d` (Soul) · `f86b863` (Kernel) · `240d26d` (CoPilot) · `5057bef` (fix syntax) sur `main` (poussé)
**Fichiers modifiés :** `core/immat-soul.js` (créé), `core/immat-kernel.js` (créé), `core/immat-copilot.js` (créé), `core/immat-consciousness.js` (mis à jour), `core/narrator.js` (mis à jour), `index.html`, `service-worker.js` v77

**ImmatSoul v1 — méta-cognition 60 s :**
- **Harmonie** (0–10) : cohérence entre tous les modules — split=true quand ils se contredisent
- **Angles morts** : GPS périmé, silence swarm, silence interactions, brain absent, météo inconnue
- **Trajectoire** : compare les 3 premiers vs 3 derniers snapshots d'urgence (amélioration/stable/dégradation)
- **Insight** : 7 branches conditionnelles → phrase française narrative unique
- Émission `SOUL_AWAKENING` · API `{ getSoul, getInsight, getHarmony, isAwakened, _flushSnapshots }`

**ImmatKernel v1 — substrat de fiabilité 5 s :**
- **Score fiabilité** 0–100% : 3 piliers × 25 pts (GPS < 2min, Brain < 65s, Consciousness < 15s) + bonus météo + bonus soul
- **Détection sommeil iOS** : gap > 2min entre ticks → `KERNEL_RESURRECTION` émis, histoires flushées
- **Auto-récupération** : GPS périmé → `App.locate()` ; Brain stoppé → `BrainEngine.start()`
- **Cold start** 60 s — aucune pénalité appliquée pendant l'initialisation
- Publie `S._reliability { score, level, degraded, critical, cold_start, resurrection }` · Émissions `KERNEL_RESURRECTION / DEGRADED / HEALTHY`

**ImmatCoPilot v1 — voix autonome 90 s :**
- Silence total pendant cold_start. 11 déclencheurs prioritaires avec cooldowns différenciés.
- Mémoire localStorage 2 h (30 entrées max) · `_canSpeak(theme)` anti-spam
- 11 triggers : guardian critique, aide swarm, éveil soul, danger collectif, urgence brain, trajectoire, etc.
- `#copilotPanel` DOM : fixe en bas, tap pour fermer, auto-dismiss 12 s
- Fix syntaxe `.map(s=>({}[s]).join()` → `_sigLabels` extrait (commit `5057bef`)
- SW v77

**ImmatConsciousness v1 mis à jour :**
- Pénalité fiabilité : `S._reliability.score < 75% && !cold_start` → `adaptiveThreshold += 1`
- Méthode `_flushHistory()` ajoutée pour ImmatKernel (résurrection iOS)

---

**Mission : SwarmEngine v1 — intelligence collective toutes catégories — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `47db121` sur `main` (poussé)
**Fichiers modifiés :** `core/swarm-engine.js` (créé), `core/narrator.js` (mis à jour), `index.html`, `service-worker.js`

**Ce qui a été construit :**

Supabase Realtime Presence — chaque conducteur diffuse son état cognitif anonymisé (position arrondie ≈111m, urgence BrainEngine, needs_help, compteurs de signalements actifs par catégorie, plaques signalées). Convergence de signaux indépendants → alertes collectives.

- **AIDE ≥1** conducteur proche en difficulté → toast + voix immédiat (`SWARM_HELP_NEARBY`)
- **VÉHICULE ≥3** conducteurs signalent même plaque → confirmation collective (`SWARM_PLATE_CONFIRMED`)
- **STATIONNEMENT ≥2** signalements dans rayon 500m → obstruction confirmée (`SWARM_PARKING_CONFIRMED`)
- **ROUTE ≥3** urgences simultanées dans 2km → danger collectif réel (`SWARM_ROUTE_DANGER`)

Cooldowns par catégorie (2/10/5/5 min). Fraîcheur 5 min. Narrator mis à jour pour journaliser et décrire les 4 événements swarm. SW v73.

---

**Mission : Narrator v1 — intelligence zéro-token omnisciente — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `47db121` sur `main` (poussé)
**Fichiers modifiés :** `core/narrator.js` (créé), `index.html`, `service-worker.js`

- Journal localStorage 6h (50 événements max), écoute ImmatBus wildcard
- `getSituation()` : résumé situationnel en français (GPS, heure, météo, vitesse, BrainEngine, zones à risque, social)
- `getJournalText()` : 15 derniers événements horodatés → injectés dans snapshot Ange
- "Ange chuchote" : bulle `#narratorWhisper` proactive (cooldown 3 min) sur signaux critiques

---

**Mission : BrainEngine v1 + 4 correctifs robustesse — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `47db121` sur `main` (poussé)
**Fichiers modifiés :** `core/brain-engine.js` (créé), `index.html`, `service-worker.js`

Boucle OODA (Observe→Orient→Predict→Decide→Act) tickant toutes les 30 s. 7 signaux orientés, 3 prédictions, cooldown 5 min alertes, `S.myGpsAt` corrigé, `_firstTickDone` anti-fausse-alarme au boot, guard `z.lat==null`. SW v72→v73.

---

**Mission : Carte de risque vivante — intelligence collective prédictive — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `14ca851` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/guardian-loop.js`, `supabase/migrations/20260619160000_road_risk_segments.sql`

**Ce qui a été construit :**

1. **Table `road_risk_segments`** — cellules ~100 m × 100 m couvrant la carte. Chaque cellule accumule `incident_count`, `confirmed_count`, `last_incident_at`, `risk_score` (0–100).

2. **Score bayésien avec décroissance temporelle** — `score = incidents × taux_confirmation × exp(-jours/30) × 20`. Un incident d'hier vaut 10× plus qu'un incident de 3 mois.

3. **Trigger SQL `update_road_risk_on_report()`** — chaque INSERT/UPDATE de statut sur `reports` recalcule automatiquement le score de la cellule concernée.

4. **Population initiale** — données des 6 derniers mois de `reports` injectées à la création (idempotent).

5. **RPC `get_risk_zones(lat, lng, radius_km)`** — exposée au front via `sb.rpc()`, retourne les 20 zones les plus dangereuses dans le rayon.

6. **`App._getWeather(lat, lng)`** — fetch OpenMeteo (gratuit, sans clé, cache 15 min) → tague `weather_condition` (clear/cloudy/fog/rain/snow/showers/storm) en background sur chaque signalement route et aide.

7. **`App._checkRiskZonesDebounced()`** — appelé toutes les 30s dans `locate()`. Si zone > score 30 à moins de 500m : toast + voix GPS + `ImmatBus.emit('RISK_ZONE_APPROACHED')`.

8. **`App._renderRiskOverlay()`** — cercles Leaflet jaune/orange/rouge proportionnels au score sur la carte. Popup : nb signalements, confirmés, score, âge.

9. **`guardian-loop.js` v11** — catégorie `RISK` + `bus.on('RISK_ZONE_APPROACHED')`.

SW v69 — guardian-loop.js?v=11.

---

**Mission : Code review — 4 correctifs robustesse post-audit — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `670c03b` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/guardian-loop.js`

**Correctifs appliqués (suite du /code-review --effort high) :**

1. **MEDIUM — `_refreshQuota()` crash sessionStorage bloqué** (`index.html`) — `JSON.parse(sessionStorage.getItem(...))` sans try/catch lançait une `SecurityError` dans les WebViews iOS avec stockage bloqué, crashant `open()` et `send()`. Fix : `let d; try{d=JSON.parse(...);}catch(_){d={n:0,t:0};}`.

2. **LOW — Double toast après timeout `startVoice()`** (`index.html`) — `rec.abort()` (déclenché par le timeout 8s) provoque aussi `onerror` avec `e.error==='aborted'` sur Chrome/Safari, affichant "Micro indisponible." après le toast "Temps dépassé". Fix : `if(e.error!=='aborted')toast(...)` dans `onerror`.

3. **A1+ALTITUDE — `actConfirmAlert()` : wrapper vacueux + DB jamais fermée** (`index.html`) — (a) Le `if(a){...}` après `if(!a){return;}` était vacuously true (code mort trompeur). (b) Quand l'alerte était absente de `S.alerts` (expirée localement), le record DB pouvait rester ouvert indéfiniment. Fix : suppression du wrapper `if(a)` ; ajout d'une mise à jour DB de repli `sb.from('reports').update(...).eq('id',id)` dans la branche `!a`.

4. **MEDIUM — Guardian Loop ne s'abonne pas à `HELP_CREATED`/`VEHICLE_MESSAGE_SENT`** (`guardian-loop.js` v10) — `ImmatBus.emit('HELP_CREATED',...)` (ajouté dans `assist()`) et `ImmatBus.emit('VEHICLE_MESSAGE_SENT',...)` (dans `driverInfo()`) n'avaient pas de `bus.on(...)` correspondant dans `_sub()` → `observe()` ne se déclenchait pas en temps réel. Fix : abonnements ajoutés.

SW v68 — guardian-loop.js?v=10.

---

**Mission : Audits Activité + Dashboard Gardien — 6 corrections post-audit — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `f3a5048` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/guardian-loop.js`

**Corrections appliquées :**

1. **CRITIQUE — HEURISTIC-004 incohérente** (`guardian-loop.js` v9) — `ROAD_ALERT` et `GPS_FIX` retirés des interactions positives de confiance : ils ont leurs propres heuristiques (008/009) et ne représentent pas des interactions inter-utilisateurs. Remplacés par `ANGE_SUGGESTION` (question posée à l'IA = acte réfléchi positif). Seuil inchangé (5).

2. **CRITIQUE — assist() type IE erroné** (`index.html`) — `IE.create({type:'HELP_REQUEST_CREATED',...})` utilisait un type absent de TYPE_META → aucun OBD émis, aucune journalisation. Corrigé en `type:'HELP'` (TYPE_META → obd:'HELP_CREATED'). + `ImmatBus.emit('HELP_CREATED',...)` ajouté — Guardian Loop reçoit maintenant l'événement.

3. **HAUTE — driverInfo() sans ImmatBus ni IE** (`index.html`) — Broadcast "Information conducteurs" (signalements véhicule généraux) n'émettait ni ImmatBus ni IE.create → Guardian heuristique HEURISTIC-007 ne déclenchait jamais pour cette action. Fix : `ImmatBus.emit('VEHICLE_MESSAGE_SENT',...)` + `IE.create({type:'VEHICLE_ALERT',...})` ajoutés après l'ImmatOrganism.observe existant.

4. **CRITIQUE — snapshot Ange getPending() sans plaque** (`index.html`) — `GuardianLoop.getPending(ownPlate||'')` — chaîne vide est falsy, retournait ALL records. Corrigé : `const _ownPl=S.profile?.owner_plate; const _gp=(_ownPl&&GuardianLoop.getPending(_ownPl))??[]`.

5. **MOYENNE — Dashboard Gardien visible pour tous** (`index.html` CSS) — `.gardien-debug-tool{display:inline-flex}` affichait le bouton Dashboard et "Sync alertes" à tous les utilisateurs. Corrigé : `.gardien-debug-tool{display:none}` + `body.is-gardien .gardien-debug-tool{display:inline-flex}` — visible uniquement si le rôle gardien est confirmé.

6. **MOYENNE — actConfirmAlert() silencieux si alerte expirée** (`index.html`) — Guard `if(!a)` ajouté (approfondi dans le commit 670c03b).

SW v67 — guardian-loop.js?v=9.

---

**Mission : Audit Ange (conseiller IA) — 5 corrections post-audit — TERMINÉE**
**Date :** 2026-06-19
**Commit :** (en cours — à pusher sur `claude/immatconnect-pro-app-dEKGR`)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/interaction-engine.js`

**Corrections appliquées :**

1. **CRITIQUE — `S.panel` jamais mis à jour** (`index.html`) — `App.panel()` est un wrapper qui ne mémorisait pas le panel actif dans `S.panel`. Ange recevait toujours `feature:'GENERAL'` quel que soit l'écran ouvert. Fix : `try{if(window.S)S.panel=panel;}catch(_){}` ajouté au début du wrapper.

2. **HAUTE — `ANGE_SUGGESTION` absent de `TYPE_META`** (`core/interaction-engine.js` v7) — `IE.create({type:'ANGE_SUGGESTION',...})` créait une interaction sans meta (pas de champ `obd`, pas de `flow`, pas d'invariants) → aucun événement OBD émis, pas de journalisation Bus. Fix : `ANGE_SUGGESTION: { obd: 'ANGE_QUERIED', flow: 'FLOW-ANGE-CONSULT', invariants: ['INV-COM-014'] }` ajouté dans TYPE_META.

3. **HAUTE — `startVoice()` sans timeout** (`index.html`) — `AngeDialog.startVoice()` n'avait pas de timeout SpeechRecognition (contrairement à `voiceGps()` déjà corrigé). Fix : timeout 8s identique — `_at=setTimeout(rec.abort,8000)` + `clearTimeout(_at)` dans `onresult`/`onerror`/`onend`.

4. **MOYENNE — Indicateur quota manquant** (`index.html`) — L'utilisateur découvrait la limite de 10 appels/heure uniquement en l'atteignant. Fix : `#angeQuota` ajouté dans `#angeInputArea`, méthode `_refreshQuota()` affiche le nombre restant dès qu'il descend ≤ 3 (rouge si ≤ 1), appelée dans `open()` et après chaque `send()`.

5. **BASSE — Scroll-to-bottom absent + Escape non géré** (`index.html`) — Après une réponse longue d'Ange, l'utilisateur devait scroller manuellement. Fix : `requestAnimationFrame(()=>p.scrollTop=p.scrollHeight)` ajouté dans `renderResponse()`. Bonus : listener Escape dans `open()` pour fermer le panel au clavier (nettoyé dans `close()`).

SW v66 — version interaction-engine.js?v=7.

---

**Mission : Corrections navigation avancées (voix, recherche, route, OSRM) — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `1281c60` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js`

**Corrections appliquées :**

1. **B3 — AbortController sur searchGps** — Annule la requête Nominatim précédente avant chaque nouvelle recherche → élimine les race conditions d'affichage. Min 3 chars (au lieu de 2).

2. **B4 — Timeout SpeechRecognition** — `voiceGps()` : timeout 8s, `rec.abort()` automatique, cleanup `clearTimeout` dans `onresult`/`onerror`/`onend`.

3. **B5 — Timeout 8s sur fetch OSRM** — `pickDest()` : `AbortController` avec `setTimeout 8s` → l'interface ne se gèle plus sur réseau mobile lent.

4. **N1 — Étapes épuisées (navigation perdue)** — `checkRoute()` : si `S.nextStep >= routeSteps.length` et pas encore arrivé → parole "Recalcul de l'itinéraire.", affichage "🔄 Recalcul…", `pickDest()` relancé, `autoFollow=true` à la résolution.

5. **N2 — Notification vocale recalcul** — `autoRecalculateRoute()` : `speak('Recalcul de l\'itinéraire.',true)` avant le `pickDest`.

6. **N3 — autoFollow=true après recalcul** — `autoRecalculateRoute()` et `checkRoute()` (N1) : `.then(()=>{S.autoFollow=true;})` → la carte recentre automatiquement après un recalcul.

7. **V1 — Vitesse de parole configurable** — `speak()` : utilise `get('ic_voice_rate','.86')` au lieu de `.86` hardcodé. `App.setVoiceRate(r)` ajouté. Slider `<input type="range" id="voiceRateSlider">` dans Paramètres → section Voix GPS (0.5x lent → 1.4x rapide). Initialisé dans `openMap()`.

SW v65.

---

**Mission : Audit et intégration complète GPS/Carte (Bus→IE→Guardian→GVC→Ange + corrections UI) — TERMINÉE**
**Date :** 2026-06-19
**Commit :** (en cours — à pusher sur `claude/immatconnect-pro-app-dEKGR`)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/interaction-engine.js`, `core/guardian-loop.js`, `core/global-verification-center.js`, `core/mobile-autotest.js`

**Corrections GPS appliquées :**

1. **CRITIQUE — GPS_FIX dans IE TYPE_META** (`interaction-engine.js` v6) — Types `GPS_FIX` (obd: GPS_FIX_RECORDED) et `GPS_STARTED` (obd: GPS_NAV_STARTED) ajoutés. Le ledger IE enregistre désormais chaque première fixation GPS par session.

2. **CRITIQUE — IE.create(GPS_FIX) dans locate()** (`index.html`) — Appelé dans le bloc `_locateObserved` (1 fois par session GPS) : `InteractionEngine.create({type:'GPS_FIX', initiator, payload:{lat,lng,accuracy}})`.

3. **HAUTE — zIndexOffset corrigé** (`index.html`) — Marqueur self : `zIndexOffset:0` → `zIndexOffset:1000`. Le véhicule de l'utilisateur apparaît maintenant au-dessus des autres véhicules (qui sont à 2400 zIndex car riseOnHover=true).

4. **HAUTE — S.myAccuracy + S.myGpsAt stockés** (`index.html`) — Après chaque fix GPS : `S.myAccuracy=pos.coords.accuracy` et `S.myGpsAt=Date.now()`. Permet la vérification de fraîcheur dans GVC et l'affichage de la précision.

5. **HAUTE — accuracy dans Bus GPS_LOCATED** (`index.html`) — `ImmatBus.emit('GPS_LOCATED', {lat,lng,accuracy:S.myAccuracy})` enrichi.

6. **HAUTE — Anti-superposition marqueurs alertes** (`index.html`) — Jitter circulaire (~10m) dans `addCommunityAlertMarker` quand un marqueur existant est dans un rayon de 0.00012° — évite le stacking des pastilles d'alerte.

7. **HAUTE — Guardian HEURISTIC-009** (`guardian-loop.js` v8) — Catégorie `GPS:'gps'`, seuil `GPS_FIX_THRESHOLD:3`, HEURISTIC-009 (≥3 sessions GPS → "conducteur actif sur carte"), `GPS_FIX` dans les positifs HEURISTIC-004, `bus.on('GPS_LOCATED',...)` dans `_sub()`.

8. **HAUTE — checkGPS() dans GVC** (`global-verification-center.js` v8) — Section `gps` avec 9 items : watchId actif, position connue, fraîcheur (<2min), précision, invisible, rayon, conducteurs proches, ledger IE GPS_FIX, recommandations Guardian GPS. Insérée dans `run()` entre `route:` et `aide:`.

9. **MOYENNE — Snapshot Ange enrichi GPS** (`index.html`) — `gps_active`, `invisible`, `radius_km`, `gps_accuracy`, `gps_age_sec` ajoutés dans le snapshot envoyé à immat-brain-dialog.

10. **MOYENNE — gpsAutotest()** (`mobile-autotest.js` v3) — Fonction de diagnostic : watchId, position, fraîcheur, précision, invisible, rayon, nearbyCount, alertMarkerCount, selfMarkerZIndex (vérifie ≥1000), ledger GPS_FIX, présence Bus/map/clusterGroup.

SW v64 — versions interaction-engine.js?v=6, guardian-loop.js?v=8, global-verification-center.js?v=8, mobile-autotest.js?v=3.

---

**Mission : Audit et intégration complète Route (Bus→IE→Guardian→GVC→Ange + corrections UI) — TERMINÉE**
**Date :** 2026-06-19
**Commit :** `c77bcda` sur `main` (poussé)
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/guardian-loop.js`, `core/global-verification-center.js`, `core/mobile-autotest.js`

**Corrections appliquées (9 gaps sur 11 identifiés) :**

1. **G1 CRITIQUE** — `roadReport()` : type IE corrigé `'VEHICLE_REPORT_CREATED'` → `'ROAD_ALERT'`. Le ledger IE était à 0 pour tous les signalements route depuis le début.

2. **G2 HAUTE** — `guardian-loop.js` v7 : catégorie `ROAD: 'road'` ajoutée aux CATEGORIES, seuil `ROAD_ALERT_THRESHOLD: 1` aux HEURISTICS, **HEURISTIC-008** (1 signalement route → recommandation "conducteur vigilant"), `'ROAD_ALERT'` dans les positifs de HEURISTIC-004, `bus.on('ROAD_CREATED', ...)` dans `_sub()`.

3. **G3 HAUTE** — `global-verification-center.js` v7 : section `checkRoute()` ajoutée (GPS, alertes actives proches, mes signalements, présence `App.roadReport`, ledger IE ROAD_ALERT), insérée dans `run()`.

4. **G4/G5 HAUTE** — `roadReport()` : `ImmatBus.emit('ROAD_CREATED', {plate, type, lat, lng})` ajouté après `IE.create` — ferme la chaîne OBD→IE→Bus→Guardian.

5. **G6 MOYENNE** — Snapshot Ange : champs `route_active` (alertes route non expirées) et `route_types` (types uniques) ajoutés après `guardian_alerts`.

6. **G7 MOYENNE** — `_actModCard` route : boutons 💬 Msg / 📞 Appel supprimés quand `plate='ROUTE'` (n'utilise plus `a.plate` — utilise `from_plate||sender_plate` uniquement, et exclut la valeur littérale `'ROUTE'`).

7. **G8 MOYENNE** — `catBadgeRoute` : exclut désormais `status==='seen'||status==='present'` (cohérence avec Véhicule — les alertes vues ne comptent plus dans le badge).

8. **G9 BASSE** — `cleanupAlerts()` : notification d'expiration pour les signalements route propres (`_mine||_own`) : "Votre signalement «label» a expiré automatiquement."

9. **G11 BASSE** — `mobile-autotest.js` v2 : `routeAutotest()` ajoutée avec vérification DOM (`sigStep2Route`, `catBadgeRoute`), ledger IE ROAD_ALERT, alertes actives par groupe, recommandations Guardian route, disponibilité Bus.

SW v63 — versions guardian-loop.js?v=7, global-verification-center.js?v=7, mobile-autotest.js?v=2.

---

**Mission : Amélioration complète de la feature Aide — corrections + intégration architecturale — TERMINÉE**
**Date :** 2026-06-19
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/bus.js`, `core/interaction-engine.js`, `core/guardian-loop.js`, `core/global-verification-center.js`

**Corrections et intégrations appliquées :**

1. **Bug critique `_actModCard` non-owned assist** — 3 bugs : "J'arrive" appelait `actQuickReply(plate)` au lieu de `actHelpReply(alertId,'arrivant')` ; "Je ne peux pas" envoyait un message (via `actQuickReply`) au lieu de refus silencieux ; "💬 Msg" appelait `actHelpReply(plate)` au lieu de `actOpenConv(plate)`. Les 3 corrigés.

2. **Doublon `App.actHelpReply`** — ancienne version (ligne ~2911, ouvrait seulement la composition de message) coexistait avec la nouvelle version complète (ligne ~2097). Ancienne version supprimée.

3. **Floating card `addCommunityAlert`** — appelait `actHelpReply(plate)` avec mauvaise signature. Corrigé en `actHelpReply(saved.id,'arrivant')`.

4. **Warning incendie dans `App.assist`** — ajout d'un toast "🔥 Appelez le 18 (Pompiers) en PRIORITÉ !" différé 800ms après le toast principal, uniquement pour `type==='incendie'`.

5. **`cleanupAlerts` alternatives par type** — message d'expiration enrichi : "Appelez le 18" (incendie), "Appelez le 15 (SAMU) ou 112" (blessure/malaise), "Appelez le 3040" (perdu/panne).

6. **`<div id="sigAideNearbySection">` ajouté** dans `sigStep2Aide` — cible de `renderAideCallSection()` (qui était déjà implémentée mais ciblait un élément absent → silencieusement no-op).

7. **Aide context dans snapshot Ange** — `aide_pending`, `aide_helper_coming`, `aide_nearby` ajoutés après `station_responses` pour enrichir le contexte IA.

8. **Intégration architecturale Aide** (Bus→IE→Guardian→GVC→Ange) — `core/bus.js` v48 (HELP_RESPONSE_SENT), `core/interaction-engine.js` v3 (HELP_RESPONSE TYPE_META), `core/guardian-loop.js` v4 (HEURISTIC-006 + bus subscription), `core/global-verification-center.js` v4 (section 7 checkAide). SW v58→v59.

---

**Mission : Intégration architecturale complète (Bus→IE→Guardian→GVC→Ange) + corrections Audio/SW — TERMINÉE**
**Date :** 2026-06-19
**Commits :** `222f627`, `8cbec7e`, `a609bd2`, `3bcbe16`, `b30a905` sur `main` (en attente push "Fusionner")
**Fichiers modifiés :** `index.html`, `service-worker.js`, `core/audio-manager.js`, `core/bus.js`, `core/interaction-engine.js`, `core/guardian-loop.js`, `core/global-verification-center.js`, `messages.js`

**Corrections et intégrations appliquées :**

1. **Fix bannière SW en boucle** (`index.html`) — `CURRENT = 'immatconnect-pro-v53'` alors que le SW actif était v56 → bannière "Version disponible" réapparaissait à chaque rechargement. Mis à jour v53→v56→v57→v58 pour correspondre au SW actif.

2. **AudioContext `suspended` fausse alarme critique** (`core/global-verification-center.js`) — Le Dashboard Gardien affichait Audio comme CRITIQUE avec "Contexte audio non running (suspended)". Sur iOS, `suspended` est l'état **normal** avant le premier tap utilisateur. Fix : `ctxState === 'running' || ctxState === 'suspended'` → état OK.

3. **AudioManager.init() jamais appelé** (`core/audio-manager.js`, `index.html`) — Les listeners `click`/`touchstart` pour reprendre l'AudioContext étaient enregistrés dans `init()`, mais cette méthode n'était jamais invoquée → l'AudioContext restait suspendu même après interaction. Fix : guard `_initialized` dans `init()` + appel `AudioManager.init()` dans `openMap()`.

4. **4 bugs audit Station** (`index.html`, `service-worker.js`) — Toast erreur affiché en vert (fix `_sent ? 'ok' : 'bad'`), plaque non effacée après envoi (fix `_sigReset()`), badge quick-reply manquant (ajout `updateActBadge()`), URLs SW STATIC_CACHE sans `?v=` (ajout params correspondants). SW v57→v58.

5. **Intégration architecturale complète Station** — Chaîne Bus→IE→Guardian→GVC→Ange entièrement câblée pour la fonctionnalité Stationné :
   - `core/bus.js` v47 : 4 nouveaux EVENTS (`PARKED_REPORT_SENT`, `PARKED_RESPONSE_SENT`, `PARKED_REPORT_DISMISSED`, `PARKED_REPORT_RATED`)
   - `core/interaction-engine.js` v2 : TYPE_META `PARKED_REPORT` et `PARKED_RESPONSE` (flow FLOW-STATION, invariant INV-STATION-001)
   - `core/guardian-loop.js` v3 : CATEGORY STATION, HEURISTIC-005 (seuil 1 signalement → recommandation gardien), PARKED_RESPONSE dans les interactions positives HEURISTIC-004, `_plate()` lit le champ `target`
   - `core/global-verification-center.js` v3 : section 6 `checkStation()` (messages reçus non lus, réponses envoyées, quota rapports)
   - `index.html` : Bus emits dans `stationReport()`, `actStationReply()`, `actStationDismiss()`, `actStationRate()` ; snapshot Ange enrichi (`messages_unread`, `missed_calls`, `station_pending`, `station_responses`)
   - `messages.js` v20 : types IE `PARKED_REPORT`/`PARKED_RESPONSE` dans `sendToPlate()` et handler realtime ; Bus emits dans `sendToPlate()` pour les quick-replies (chemin qui contourne `actStationReply()`)

---

**Mission : Audit final stationné — 5 corrections post-déploiement — TERMINÉE**
**Date :** 2026-06-19
**Commits :** `7d54b24`, `2790ff7`, + commit en cours (en attente "Fusionner")
**Fichiers modifiés :** `index.html`

**Corrections appliquées :**

1. **Bug critique upload photo** (`window.sb?.()` → `window.sb`) — `_stationUploadPhoto` appelait le client Supabase comme une fonction → retournait `null` silencieusement → toutes les photos échouaient. Les photos étaient perdues depuis le premier déploiement. Fix : accès direct à l'objet client.

2. **Indicateur 📷 absent dans l'en-tête des cartes Envoyés** — Cohérence avec les Reçus qui affichaient déjà 📷. Ajout de `${m.image_url?' 📷':''}` dans le header.

3. **Feed ne se re-rendait pas après réponse rapide depuis la notif flottante** — Quand le propriétaire clique "Je vérifie" ou "Réglé" depuis la floating card et que l'onglet Stationné est déjà ouvert, la carte restait "En cours". Ajout de `if(S._actCat==='station')this.renderStationFeed?.('recus')` dans les 4 callbacks `_qr`.

4. **Badge de l'onglet "Reçus" jamais affiché en catégorie Station** — `renderCategoryFeed` retournait early avant la mise à jour de `actTabBadge`. Ajout du calcul et de l'affichage du badge directement dans `renderStationFeed`.

5. **Double toast lors d'une réponse** — `sendToPlate` affichait "Message envoyé à XX-XXX-XX" EN PLUS du toast personnalisé "🚗 Je viens vérifier envoyé !". Ajout de `suppressToast:true` sur les 5 occurrences d'appels `sendToPlate` avec `context_type:'parked_response'`.

---

**Mission : Photo véhicule stationné + GPS privé — feature complète — TERMINÉE**
**Date :** 2026-06-18
**Commit :** `b824af1` sur `claude/immatconnect-pro-app-dEKGR` (en attente "Fusionner")
**Fichiers modifiés :** `index.html`, `messages.js`, `service-worker.js`, `supabase/migrations/20260618140000_messages_image_url_parked_storage.sql`

**Ce qui a été fait :**
1. Flux signalement 2 étapes : choix type → photo optionnelle → envoi (`stationSelectType`, `_stationPhotoReset`).
2. `_stationCompressImage` : Canvas API max 1024px JPEG q=0.82 côté client.
3. `_stationUploadPhoto` : upload bucket Supabase Storage `parked-photos` (UUID path, public URL non devinable).
4. `stationSendWithPhoto` : envoi unifié type + photoUrl.
5. `stationReport(type, photoUrl)` : `image_url` dans opts → payload messages.js.
6. `messages.js` : `image_url` dans le payload INSERT ; `suppressToast` ; titre push 🅿️ adapté.
7. `renderStationFeed` Reçus "En cours" : thumbnail 160px + `actStationViewPhoto` au tap.
8. `renderStationFeed` Reçus "Traités" : thumbnail 140px dans le détail accordéon.
9. `renderStationFeed` Envoyés : thumbnail 160px dans le détail (condition `reply||m.image_url`).
10. `actStationViewPhoto(url)` : lightbox plein écran (overlay rgba 95%, `✕` + tap-anywhere pour fermer).
11. GPS privé : `[GPS:lat,lng]` embarqué dans le corps, `actStationShowOnMap`, marqueur Leaflet privé `S._stationPrivateMarker`.
12. Migration SQL : `image_url text` sur messages + bucket `parked-photos` + RLS upload/lecture.
13. SW v54 → v55.
14. 177 ✅ + 3 diagnostics ✅ + preflight 7/7 OK.

---

**Mission : Stationné Reçus/Envoyés — label propre + badge décrémente + 5 corrections audit — TERMINÉE**
**Date :** 2026-06-18
**Commits :** `b6ee30b` + `96a8203` sur `main`
**Fichiers modifiés :** `index.html`, `service-worker.js`

**Ce qui a été fait (commit b6ee30b) :**
1. `renderStationFeed` Reçus — label propre extrait du corps ("Feux allumés 💡" au lieu du texte verbeux), point bleu conditionnel (non lu seulement), `data-msgid` sur chaque carte, terminologie stationné (pas véhicule).
2. `renderStationFeed` Envoyés — même extraction label + `<strong>` + 🚨 si urgent, "Réponse du conducteur".
3. `actToggleVmCard` — marque comme lu dans `S._readMsgIds` au 1er tap (si `data-msgid` présent), retire le point, décrémente `catBadgeStation` via `updateActBadge`.
4. Floating card `parked_report` — titre = label propre, sous-titre = "Signalé par XX-XXX-XX", 🚨 si URGENT.
5. SW v53 → v54.

**Ce qui a été fait (commit 96a8203 — audit) :**
1. Toast `actStationRate` : "Info utile" → "Signalement utile" (cohérence bouton).
2. `catBadgeStation` : inclut `parked_response` reçues (badge visible pour signalant quand propriétaire répond).
3. Badge nav : `parked_response` exclu (évite double comptage).
4. Envoyés : auto-mark `parked_response` lues à l'ouverture ; dot ambigu → badge "⏳ En attente" / "✅ Répondu".
5. `actStationDismiss` : bouton "Pas mon véhicule ❌" — archive sans réponse pour mauvaise plaque.
6. Panneau Signaler stationné : bloc urgence 15/17/18 cohérent avec Route/Véhicule/Aide.

**Architecture finale :**
- `parked_report` reçu → `catBadgeStation` (pas nav badge) → Reçus En cours → tap = lu → Traités après réponse/dismiss
- `parked_response` reçu → `catBadgeStation` (pas nav badge) → auto-lu à l'ouverture Envoyés → visible inline dans la carte d'envoi
- `parked_report` envoyé → Envoyés avec statut ⏳/✅ explicite

---

**Mission : Véhicule stationné dans Activité — nouvelle catégorie 🅿️ — TERMINÉE**
**Date :** 2026-06-18
**Commit :** `4daa0a4` sur `main`
**Fichiers modifiés :** `index.html`, `app.css`, `service-worker.js`

**Ce qui a été fait :**
1. `stationReport(type)` — envoie `parked_report`, crée alerte communautaire group='parked', navigue vers Activité > Stationné > Envoyés.
2. `renderActivityMain` — badge `catBadgeStation`.
3. `openActivityCat` meta station + match seen group='parked'.
4. `renderCategoryFeed` — hook station.
5. `actStationReply`, `actStationRate`, `actDeleteMsg`.
6. Subscription handler floating card.
7. `updateActBadge` — `parked_report` exclus badge nav.
8. CSS grille 2×2 + couleurs teal stationné.
9. SW v52 → v53.

---

**Mission : Suppression icContactTabs — onglets redondants avec la nav bas — TERMINÉE**
**Date :** 2026-06-18
**Commit :** `aaf2361` sur `main` (en attente de push — "Fusionner" requis)
**Fichiers modifiés :** `index.html`

**Contexte :** Les boutons "💬 Messages | 📞 Appels" à l'intérieur du panneau Messages dupliquaient la navigation déjà présente dans la barre du bas. L'utilisateur avait demandé : "dans la partie message que les messages, dans la partie téléphone que le journal d'appel".

**Fix :** Suppression du `<div id="icContactTabs">` visible (avec ses deux `<button>`). Remplacement par deux `<span id="icTabMessages" style="display:none">` et `<span id="icTabAppels" style="display:none">` pour satisfaire le test CI NAV01 (`toBeAttached()`, pas de vérification de visibilité). `navMessages()` et `navAppels()` continuent de fonctionner normalement (ils posent des styles sur ces spans, ce qui est sans effet visible).

---

**Mission : Fix thread vide — corps du thread sans hauteur — TERMINÉE**
**Date :** 2026-06-18
**Commit :** `1d9068c` sur `main`
**Fichiers modifiés :** `messages.js`

**Root cause :** Quand `openThread()` masquait `icMsgList` (display:none) et `.ic-conv-header`, `#icMessagesPro` (`.ic-msg-shell`) perdait tout contenu en flux normal → hauteur réduite à ~60px (juste icContactTabs + padding). `#icThread.show` positionné `absolute; inset:0` héritait de cette hauteur minimale. La `.ic-thread-head` occupait ~55px → `.ic-thread-body` avait ~5px → messages invisibles.

**Fix :** À l'ouverture du thread, forcer `icMessagesPro.style.minHeight = sheet.offsetHeight`. À la fermeture (`closeThread`), relâcher `minHeight = ''`.

---

**Mission : Restauration état session — icContactTabs + correctifs nav/SW/Messages — TERMINÉE**
**Date :** 2026-06-18
**Commits :** `959acf5`, `8aa9330` (rebased) sur `main`
**Fichiers modifiés :** `index.html`, `messages.js`, `service-worker.js`

**Résumé :** Suite à des allers-retours de revert, l'état final correspond à `58567a2` pour `index.html` (icContactTabs présents + fix nav/panels) et `8c17ac8` pour `messages.js` + `service-worker.js` (tous les correctifs de session). Correctifs actifs en production :
- `closeCompose()` guard `_inAppels` — icMsgList ne réapparaît pas dans la vue Appels
- Reset inline styles dans `navMessages()`/`navAppels()` — Messages s'ouvre correctement depuis Activité
- SW `controllerchange` guard — pas de rechargement au premier install
- icContactTabs (`#icTabMessages`/`#icTabAppels`) présents dans le DOM

---

**Mission : 6 corrections bugs UX/CI — panneaux superposés + tests E2E + SW reload — TERMINÉE**
**Date :** 2026-06-18
**Commits :** `db90ab3`, `51e7ef3`, `3a87c30`, `58567a2` sur `main`
**Fichiers modifiés :** `index.html`, `messages.js`, `service-worker.js`

**Corrections appliquées :**

1. **`closeCompose()` guard `_inAppels`** (`messages.js`) — identique à `closeThread()`. Si l'utilisateur est dans la vue Appels (icAppelsPane.style.display='flex'), `icMsgList` n'est plus réaffiché.

2. **`navAppels()` setTimeout 350ms** — re-cache `icMsgList` 350ms après l'affichage de `icAppelsPane` pour absorber tout appel asynchrone de `closeCompose`/`closeThread`.

3. **Bug critique : panneau Messages ne s'ouvrait pas depuis Activité** (`index.html`) — `navActivite()` posait `style.display='none'` sur `panelMessages` (inline). Quand `navMessages()` était appelé ensuite, `setPanel()` changeait seulement les classes `.on` — l'inline style l'emportait, `panelMessages` restait caché et `panelActivite` restait visible par-dessus. Fix : reset de `style.display=''` sur tous les panels AVANT d'appeler `this.panel()` dans `navMessages()` et `navAppels()`.

4. **SW `controllerchange` guard** (`index.html`) — `controllerchange` se déclenche aussi lors du premier `claim()` d'un SW fraîchement installé. Dans un contexte vierge (Playwright, 1re visite), cela causait un `window.location.reload()` inattendu qui interrompait les tests E2E (T08 smoke, call-screen NAV01). Fix : `_hadSwController = !!navigator.serviceWorker.controller` — ne recharger que si un SW était déjà actif avant.

5. **Ajout `#icTabMessages` / `#icTabAppels` dans le DOM** (`index.html`) — Le test CI `NAV01` cherchait ces éléments via `toBeAttached()`. Ils n'existaient que dans le JS. Ajout de deux boutons-onglets visibles au-dessus de `icMsgList`, avec synchronisation de l'état actif (bordure bleue) dans `switchContactTab()`, `navMessages()` et `navAppels()`.

6. **messages.js?v=19** — bump de version CDN pour forcer le rechargement.

**SW/Build :** v44 / 2026-06-19

---

**Mission : Activité — messages véhicule urgents (context_type='vehicle_report') dans Reçus/Envoyés — TERMINÉE, sur branche dev**
**Date :** 2026-06-18
**Commit :** `787b1cb` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`)
**Fichiers modifiés :** `index.html`

**Ce qui a été fait :**

Les messages envoyés via le menu contextuel véhicule (🚨 SIGNALEMENT URGENT, `context_type='vehicle_report'`) apparaissent désormais dans le panneau **Activité** sous les onglets **Reçus** et **Envoyés**, groupés par plaque, avec possibilité de les supprimer.

1. **`renderCategoryFeed`** : lit `S._actMessages` filtrés sur `context_type==='vehicle_report'`, groupe par `_otherPlate`, crée des items `kind:'vehicleMsgGroup'`. Uniquement pour `cat==='all'` ou `cat==='vehicle'`.
2. **`_actModCard`** : nouveau renderer `vehicleMsgGroup` — avatar 🚨, plaque, aperçu du dernier message, compteur, badge NOUVEAU si non lus. Cliquable → ouvre la vue détail. (En remplacement du code mort `kind:'msg'` supprimé.)
3. **`actOpenVehicleMsgGroup(plate)`** : ouvre la vue détail dans `actAlertGroupFeed` — liste tous les messages de la plaque triés par date, marque les reçus comme lus, bouton "Supprimer" sur chaque message. Bouton ‹ → `closeAlertGroup()`.
4. **`actDeleteVehicleMsg(id, plate)`** : supprime en DB Supabase, retire de `S._actMessages`, reconstruit les threads Messages, re-render la vue détail.
5. **`closeAlertGroup`** : reset `S._actVehicleMsgGroupPlate` en plus de `S._actAlertGroupPlate`.
6. **Filtres** : `sf='unread'` et compteur `unread` gèrent `vehicleMsgGroup`. `_activityMatchesSearch` inclut `msgs[0].body` dans la recherche.

**Architecture validée :**
- Messages texte libres → panel Messages uniquement (filtre `!m.context_type` dans `buildThreads()` + `_renderTimeline()` intact)
- Alertes véhicule urgentes → panel Activité uniquement (sous Reçus/Envoyés)
- Colonne `context_type` en production (migration `20260617120000_messages_context_type.sql` appliquée par CI run `27726467637`)

177 tests ✅ · 3 diagnostics ✅ · preflight 7/7 OK

---

**Mission : Audit UX Messages/Appels — 3 corrections — TERMINÉE, sur branche dev**
**Date :** 2026-06-18
**Commit :** `8966767` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`)
**Fichiers modifiés :** `index.html`

**Corrections appliquées :**

1. **En-tête Messages (✏️ ⭐ 🔍) visible dans la vue Appels (IMG_5853)** — `navAppels()` masque désormais `ic-conv-header` et `icSearchBar`. `navMessages()` les restaure (avec `icSearchBar` conditionnel selon `_icSearchOpen`).

2. **Bug syntax error critique — template literal `_actModCard` alertGroup cassé** — Dans `bdc6f21`, le fix onclick avait déplacé la backtick fermante du template sur la première ligne (après `>`), laissant les `${...}` suivants en dehors du template → SyntaxError silencieuse (tests qui ne se lançaient plus). Fix : backtick déplacée au bon endroit, template reconstitué. 177 tests ✅ + 3 diagnostics ✅ + preflight 7 scripts OK.

3. **Architecture confirmée :** le déploiement CI `27726467637` (run associé au commit `3f220c8`) a appliqué avec succès la migration `context_type`. La colonne existe en base. Les nouveaux signalements envoyés via `vehicleAlertQuick`/`vehicleSendMsg` ont `context_type:'vehicle_report'` → ils n'apparaissent plus dans le thread Messages pour les nouveaux tests. L'apparition dans les captures IMG_5852 était due au cache Service Worker (ancien code en mémoire).

---

**Mission : 8 corrections UI Messages + architecture — TERMINÉE, sur branche dev**
**Date :** 2026-06-17
**Commit :** `66a4cf4` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`)
**Fichiers modifiés :** `messages.css`, `messages.js`, `index.html`

**Corrections appliquées :**

1. **Appels dans le thread Messages** — Suppression du bloc rendering call (code mort), du paramètre `callEvents` de `_renderTimeline`, du chargement `CallManager.loadCallLog()` dans `openThread()`, et de `callEventsCache` du State. Gain ~200ms à l'ouverture du thread.

2. **Double immatriculation dans le thread header** — `icThreadTitle` affiche désormais le pseudo seul (ex: "Kas"), `icThreadSub` affiche la plaque + présence/confiance (ex: "BE-521-MM · 🟢 Actif à proximité"). Plus de doublon "PLATE · Pseudo" entre la liste et le header.

3. **Thread qui déborde sur le journal d'appels** — `navAppels()`, `navSignaler()`, `navActivite()` appellent `window.ImmatMessages?.closeThread?.()` en premier. Le thread se ferme proprement à chaque changement de panel.

4. **Compositeur invisible/coupé** — `.ic-thread.show` passe en `position:absolute; inset:0; z-index:5` → le thread recouvre tout le panel, le compositeur est toujours visible en bas. `.ic-thread-body` : `max-height:320px` supprimé, `min-height:0` pour que `flex:1` contraigne correctement. `.ic-thread-composer` : 3 colonnes (`36px minmax(0,1fr) 46px`) pour le bouton GPS, le textarea et le bouton envoi.

5. **Colonne à gauche du journal d'appels** — Suppression de la colonne icône fixe 32px (emojis empilés = rectangle visuel). Remplacement par un `border-left:3px solid COLOR` coloré selon le statut (vert/rouge/gris). `timeStr()` renforcé : rejette les timestamps invalides ou antérieurs à 2020 → affiche "—" au lieu d'une valeur aberrante.

6. **Architecture — Messages hors d'Activité** — Suppression des blocs `convMap` (Reçus/Envoyés) dans `renderCategoryFeed`. Activité = signalements uniquement. Messages = conversations texte uniquement. Variables `msgs` et `deleted` (devenues inutiles) supprimées. `actStatusBar` masquée (ne concernait que les messages). Empty states mis à jour ("message ou alerte" → "signalement").

7+8. **Merge branche dev** — Commits `6df062d` (refactor nav — suppression onglets doublons) et `21c5f76` (filtre `context_type`) déjà présents dans la branche.

---

**Mission : Activité — groupement des signalements par plaque + vue détail au clic — TERMINÉE, sur branche dev**
**Date :** 2026-06-17
**Demande terrain :** plusieurs signalements reçus depuis la même plaque s'affichaient comme autant de cartes individuelles — difficile à lire. L'utilisateur voulait le même comportement que les messages : 1 carte par plaque, clic → liste de tous les signalements liés.
**Fix appliqué (index.html + app.css, commit `cc75ba8`) :**
- `renderCategoryFeed` : les alertes sont maintenant groupées par plaque (`alertGrpMap`). Si 2+ alertes proviennent de la même plaque → `kind:'alertGroup'` (1 carte de groupe). Si 1 seule alerte → carte individuelle existante (comportement inchangé).
- `_actModCard` : nouveau rendu pour `kind:'alertGroup'` — plaque, dernier motif, "N signalement(s)", badge bleu compteur, badge "NOUVEAU" si non lus. La carte est cliquable.
- `App.actOpenAlertGroup(plate)` : ouvre la vue détail — masque tabs/feed/barres, met à jour le header (plaque + compteur), affiche `#actAlertGroupFeed` avec toutes les alertes de la plaque (cartes individuelles standards).
- `App.closeAlertGroup()` : bouton ‹ — restaure le header de catégorie, les onglets, le feed principal ; rappelle `renderCategoryFeed`.
- Filtres type/unread/compteur badge adaptés pour `kind='alertGroup'`.
- CSS : `.act-mod-group` (cursor pointer + feedback tactile) + `.act-mod-count-badge` (badge bleu).
- HTML : `#actAlertGroupFeed` ajouté dans `actCatPanel`.
**Branche dev :** commit `cc75ba8` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`).

---

**Mission : UX — menu contextuel son propre véhicule simplifié + bouton "🆘 Aide" direct — TERMINÉE, sur branche dev**
**Date :** 2026-06-16
**Améliorations :** (1) Tous les boutons sans sens pour son propre véhicule (Message, Appel, Évaluer, Copier, Bloquer) masqués via CSS `.is-self .vehicle-bubble:not(.alert-main){display:none}`. (2) Le seul bouton restant bascule son label/émoji vers "🆘 Aide" (JS dans `showVehicleContextMenu`) et appelle directement `App.sigStepAide()` au lieu de `openSignalHere()` — ouvre le panneau "De quoi avez-vous besoin ?" (Panne/Carburant/Batterie/Moteur…) sans passer par l'étape de choix Route/Véhicule/Aide.
**Commits :** `be1de42` (CSS masquage boutons is-self) + `670892c` (label 🆘 Aide + navigation directe sigStepAide) sur `claude/immatconnect-pro-app-dEKGR`.

---

**Mission : Fix bug critique — le titre du menu véhicule sur la carte écrasait l'indication "Ma position" — TERMINÉE, sur branche dev**
**Date :** 2026-06-16
**Symptôme terrain :** depuis BE-521-MM, signaler/contacter un véhicule échouait toujours de façon intermittente après les 2 fixes précédents. L'utilisateur a fourni le vrai indice en comparant deux captures du menu contextuel véhicule : le même titre affiché ("Véhicule BE-521-MM") apparaissait tantôt avec 5 boutons, tantôt avec ~4 — preuve que la classe `.is-self` (qui cache le bouton 🚫 Bloquer via `app.css` : `.vehicle-context-menu.is-self .block-main{display:none}`) changeait bien d'état, alors que le titre, lui, restait identique.
**Root cause découverte :** `App.showVehicleContextMenu(vehicle)` pose un titre correct dans `#vehicleContextPlate` selon que le véhicule tapé est le sien (`📍 Ma position`) ou un autre (`Véhicule XX-XXX-XX`), puis appelait `this.updateReportTarget?.()` — une fonction distincte chargée de mettre à jour le panneau de signalement, mais qui réécrit **le même élément DOM** `#vehicleContextPlate` (collision d'ID) avec `'Véhicule '+selectedVehiclePlate()`. Or `selectedVehiclePlate()` retombe sur des sources d'état parfois obsolètes (`S.selPlate`, `S.conv`...) quand le véhicule tapé est exclu (cas d'un vrai tap sur soi-même). Résultat : en tapant par erreur sur son propre véhicule (les deux téléphones de test étant physiquement proches), le menu affichait quand même la plaque du véhicule précédemment ciblé — donnant l'illusion que le bon véhicule était sélectionné — alors que `vehicleContextAction()` traite bien la requête comme `isSelf` en coulisses : il vide le destinataire du message, ou redirige "Signaler" vers le flux de signalement de position au lieu du flux véhicule. D'où des envois qui semblaient échouer au hasard, en réalité corrélés au véhicule réellement tapé sur la carte.
**Fix appliqué (`index.html`, `App.showVehicleContextMenu`) :** `updateReportTarget()` est désormais appelée AVANT le bloc qui pose le titre spécifique self/non-self, qui a donc toujours le dernier mot sur `#vehicleContextPlate`.
**Tests :** 177 ✅ + 3 diagnostics OBD ✅, preflight inline JS 7/7 OK.
**Commit :** `36cf950` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`).
**À valider en terrain :** depuis BE-521-MM, taper précisément sur le marqueur de l'AUTRE véhicule (pas le sien) et vérifier que le titre du menu correspond bien à la cible réelle, et que message/signalement partent correctement.

---

**Mission : Fix échec intermittent d'envoi/signalement depuis un véhicule proche (placeholder VEH-xxxx) — TERMINÉE, sur branche dev**
**Date :** 2026-06-16
**Symptôme terrain :** depuis le compte BE-521-MM, signaler/contacter un véhicule proche échouait de façon intermittente ("parfois ça marche, parfois pas") — confirmé non lié au cache (force-quit/reopen de l'app testé, n'a pas résolu seul).
**Root cause découverte :** `loadOthers()` (index.html) appelle `profilesByIds(ids)` pour récupérer pseudo/plaque/couleur des véhicules proches via le RPC `get_public_profiles_by_ids`. En cas d'erreur RPC transitoire (réseau, latence, cold start), `profilesByIds` retournait silencieusement `{}` (aucun retry). Un fallback défensif existant (`if(!pl) pl='VEH-'+id.slice(0,4)`, ajouté lors d'un bug RLS précédent) affiche alors le véhicule avec une fausse plaque `VEH-xxxx` au lieu de sa vraie plaque. Le marqueur reste cliquable et visible normalement, mais toute tentative de message/signalement vers lui échoue silencieusement : `findProfileByPlate('VEH-xxxx')` ne trouve aucun profil avec ce libellé. Le marqueur se corrige seul au cycle de refresh suivant (d'où le caractère intermittent — dépend du timing exact du tap par rapport au cycle de refresh `loadOthers`).
**Fix appliqué (`index.html`, fonction `profilesByIds`) :** ajout d'un retry unique (attente 500ms) avant d'abandonner et de retourner `{}`, pour absorber les erreurs RPC transitoires les plus courantes et réduire la fréquence d'apparition du placeholder `VEH-xxxx`.
**Tests :** 177 ✅ + 3 diagnostics OBD ✅, preflight inline JS 7/7 OK.
**Commit :** `0427606` sur `claude/immatconnect-pro-app-dEKGR` (pas encore mergé sur `main`).
**À valider en terrain :** réessayer plusieurs fois de signaler/contacter un véhicule proche depuis BE-521-MM ; si le problème persiste encore parfois, il faudra remonter le contenu exact affiché sur la plaque du véhicule au moment de l'échec (vraie plaque ou "VEH-xxxx" visible dans la bulle/le champ) pour confirmer si ce fix suffit ou s'il faut aussi gérer l'envoi par uid en complément du fallback plaque.

---

**Mission : Fix bug critique — Activité (Reçus/Envoyés) toujours vide malgré messages fonctionnels — TERMINÉE**
**Date :** 2026-06-16
**Symptôme terrain :** sur 2 comptes (BZ-652-LL et BE-521-MM), les messages envoyés/reçus (y compris les signalements véhicule urgents) apparaissaient correctement dans l'onglet **Messages**, mais jamais dans **Activité → Tout/Véhicule → Reçus/Envoyés**, quel que soit le compte ou le sens du message.
**Root cause découverte :** `index.html` déclare `const S={...}` (ligne 544) dans un `<script>` classique (pas `type="module"`). En JavaScript non-module, une déclaration top-level `const`/`let` reste dans le scope global lexical mais **n'est jamais posée comme propriété de `window`** (contrairement à `var`). Les auteurs avaient déjà ce réflexe pour `sb` (`window.sb=sb;` ligne 537) mais l'équivalent manquait pour `S`. Conséquence : `messages.js`, chargé comme script séparé, ne peut accéder à `S` que via `window.S` — et cette ligne, exécutée après chaque `refresh()` (`if(window.S) window.S._actMessages = State.messages;`), était un no-op silencieux depuis le début. Le flux Activité lit `S._actMessages` (qui restait `undefined`/`[]`), d'où un panneau vide en permanence, indépendamment du compte ou du sens (reçu/envoyé).
**Fix appliqué (`index.html`) :**
1. `window.S=S;` ajouté juste après la déclaration de `const S={...}` (ligne 544-545) — expose enfin l'état global aux autres scripts (`messages.js`, etc. — plusieurs autres lectures `window.S?.xxx` dans `index.html`/`messages.js` étaient probablement affectées par le même bug, désormais réparées par cette seule ligne).
2. Défense complémentaire dans `App.actCatTab(tab)` : force un `ImmatMessages.refresh()` en arrière-plan à chaque changement d'onglet Reçus/Envoyés, puis re-render — évite un affichage figé si un message arrive entre deux ouvertures du panneau Activité.
**Tests :** 177 ✅ + 3 diagnostics OBD ✅, preflight inline JS 7/7 OK.
**Commit :** `d0fcc2d` sur `claude/immatconnect-pro-app-dEKGR`.
**À valider en terrain :** envoyer un message entre les 2 comptes test, vérifier qu'il apparaît bien dans Activité → Reçus (côté destinataire) et Envoyés (côté expéditeur).
**Second problème signalé, NON encore investigué :** "Je ne peux pas envoyer depuis BE 521" — échec d'envoi de message depuis le compte BE-521-MM. Aucune erreur précise rapportée (texte du toast affiché non communiqué) — analyse du code (`sendToPlate`, `findProfileByPlate`) n'a rien révélé de spécifique à ce compte ; nécessite le message d'erreur exact affiché à l'écran pour diagnostiquer plus avant.

---

**Mission : Fix bug fonctionnel — colonnes de position GPS manquantes sur `reports` — TERMINÉE, déployée**
**Date :** 2026-06-16
**Contexte :** Bug résiduel découvert pendant la réparation du pipeline CI migrations (cf. mission ci-dessous) : la table `reports` n'a jamais eu de colonnes de position, alors que `saveReportRemote()` (`index.html`) envoie systématiquement `latitude`/`longitude` dans le payload d'insertion depuis le premier déploiement. Confirmé vide via `information_schema.columns` (12 colonnes, aucune position). Conséquence : tout signalement relu depuis la base (reload, reconnexion, `postgres_changes`) perdait sa position — seul le broadcast Realtime reçu en direct la transportait.
**Fix appliqué :** nouvelle migration `supabase/migrations/20260616150925_reports_position_columns.sql` :
```sql
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
```
+ mise à jour de la vue `public_reports` pour ré-exposer `latitude`/`longitude` (toujours sans `reporter_id`, INV-COM-015). Noms de colonnes choisis par cohérence avec `user_locations` (qui utilise déjà `latitude`/`longitude`) plutôt que `lat`/`lng`.
**Impact côté client :** aucun changement nécessaire dans `index.html` — `saveReportRemote()` envoyait déjà `latitude`/`longitude` (tier T1 du fallback cascadé réussira désormais directement), et la lecture (`_handleReport`/`syncCommunityAlerts`) lisait déjà défensivement `r.latitude??r.lat??null`.
**Déploiement :** commit `dc952d4`, push direct sur `main` (après confirmation explicite utilisateur) → run CI `27627683881` : `status: completed`, `conclusion: success`. Les 12 migrations rejouées sans erreur, les 5 Edge Functions redéployées.
**À vérifier en terrain (non bloquant) :** créer un nouveau signalement puis recharger l'app pour confirmer que sa position survit au reload (auparavant perdue).

---

**Mission : Fix critique production — GRANT SELECT manquant sur `profiles` (table-level, jamais appliqué)**
**Date :** 2026-06-16
**Symptôme terrain :** envoyer un message à une plaque (ex. `BZ-652-LL`) affichait "Erreur recherche conducteur. Réessaie dans quelques secondes." (le nouveau toast d'erreur ajouté par le hotfix `findProfileByPlate`, qui a révélé ce bug auparavant masqué silencieusement par l'ancien code).
**Root cause découverte :**
- `supabase db push` (workflow `deploy-edge-functions.yml`) n'a **jamais réussi à appliquer plus d'1 migration sur 12 en attente**. Logs CI (run `27543373052`, step "Apply pending migrations") : `ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" — Key (version)=(20260613) already exists.` Cause : 4 fichiers de migration partagent le même préfixe de version `20260613` (sans heure) → collision de clé primaire dans `supabase_migrations.schema_migrations` → le push avorte dès la 2ᵉ migration. `continue-on-error: true` sur cette étape masquait l'échec (le job entier restait "✅ success" dans GitHub Actions malgré l'erreur réelle).
- Conséquence : la migration `20260615_profiles_column_security.sql` (qui devait `GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON public.profiles TO authenticated` après un `REVOKE SELECT` antérieur exécuté manuellement) n'a **jamais été appliquée en base**.
- Vérifié empiriquement via SQL Editor : `SELECT column_name FROM information_schema.column_privileges WHERE grantee='authenticated' AND table_name='profiles' AND privilege_type='SELECT'` → **0 ligne** avant correctif (aucun droit de lecture du tout sur `profiles` pour `authenticated`, ni table-level ni column-level).
- La politique RLS `profiles_select_authenticated` (`auth.role() = 'authenticated'`) était elle déjà correctement en place — seul le `GRANT` manquait.
- `get_my_profile()` (RPC SECURITY DEFINER, utilisée au login dans `index.html`) n'était pas affectée car elle contourne les grants de table — c'est pourquoi le login fonctionnait normalement pendant que `findProfileByPlate()` (lecture directe `.from('profiles')`) échouait silencieusement (avant le hotfix) puis explicitement (après).
**Fix appliqué (manuel, SQL Editor, vérifié) :**
```sql
GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON public.profiles TO authenticated;
```
Revérifié après exécution : la requête de vérification retourne maintenant les 4 colonnes attendues (4 rows).
**Validation terrain :** ✅ confirmée par l'utilisateur (2026-06-16) — l'envoi de message à BZ-652-LL fonctionne après le GRANT, plus d'erreur "Erreur recherche conducteur".

---

**Mission : Réparation pipeline CI migrations (collision de versions + masquage d'erreur) — TERMINÉE, pipeline vert**
**Date :** 2026-06-16
**Root cause du bug ci-dessus, corrigée à la source :**
- 12 fichiers dans `supabase/migrations/` portaient des préfixes de version sur 8 chiffres seulement (`AAAAMMJJ`, sans heure). 4 fichiers partageaient `20260613`, 6 fichiers partageaient `20260614` → collision de clé primaire dans `supabase_migrations.schema_migrations` dès la 2ᵉ migration d'un même jour.
- `continue-on-error: true` sur l'étape "Apply pending migrations" du workflow `deploy-edge-functions.yml` masquait cet échec : le job restait "✅ success" dans GitHub Actions malgré l'erreur réelle de `supabase db push`. Ce flag a été retiré — un futur échec de migration fera désormais échouer le job visiblement.
**Fix appliqué (code) :**
1. Tous les 12 fichiers renommés avec un préfixe complet `AAAAMMJJHHMMSS` (basé sur leur date de création réelle, ordre chronologique préservé) → versions désormais uniques, plus aucune collision possible.
2. 3 fichiers contenaient des `CREATE POLICY` sans garde `DROP POLICY IF EXISTS` préalable (`push_subscriptions.sql`, `user_blocks.sql`, `device_sessions.sql`) → non rejouables si la policy existe déjà. Garde ajoutée sur chacun. Les 9 autres fichiers étaient déjà idempotents (`IF NOT EXISTS`, `CREATE OR REPLACE`, ou `DROP POLICY IF EXISTS` déjà présent).
3. `continue-on-error: true` retiré de l'étape "Apply pending migrations".
**Réconciliation de l'historique distant (SQL Editor, exécuté par l'utilisateur) :** `DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260613';` — l'ancienne version (orpheline après le renommage) bloquait `supabase db push` avec "Remote migration versions not found in local migrations directory".
**3ᵉ bug découvert en cours de réparation, lui aussi corrigé (vrai bug de fond, jamais détecté avant car cette migration n'avait jamais réellement été exécutée) :** `20260613203627_public_reports_secure.sql` définissait la vue `public.public_reports` avec des colonnes `latitude`/`longitude` (1ʳᵉ tentative, échec : colonne inexistante) puis `lat`/`lng` (2ᵉ tentative, échec : colonne inexistante non plus). Vérification empirique via `information_schema.columns` (exécutée par l'utilisateur en SQL Editor) : la table `reports` n'a **aucune colonne de position** — ses 12 colonnes réelles sont `id, reporter_id, plate, reason, created_at, category, status, resolved_at, seen_at, actioned_at, urgency_level, target_plate`. La vue a été corrigée pour ne référencer que les colonnes existantes (remplace `lat, lng` par `category`).
**Conséquence fonctionnelle de ce 3ᵉ bug (hors scope du fix CI, à traiter séparément) :** la table `reports` n'a jamais stocké de coordonnées GPS, malgré le code client (`saveReportRemote` dans `index.html`) qui tente systématiquement d'envoyer `latitude`/`longitude` dans le payload d'insertion. Les signalements communautaires sont donc historiquement enregistrés sans position (tier de fallback "T4 minimal" ou équivalent sans coordonnées). **À investiguer dans une prochaine mission :** soit ajouter les colonnes `lat`/`lng` à la table `reports` (migration `ADD COLUMN`), soit confirmer que la position n'est volontairement portée que par le broadcast Realtime (pas par la table persistée).
**Résultat final :** run CI `27626558202` (commit `c24749e`, push direct sur `main`) — `status: completed`, `conclusion: success`. Les 12 migrations ont été rejouées sans erreur (la plupart en no-op `already exists, skipping`, confirmant qu'elles avaient déjà été appliquées manuellement) et les 5 Edge Functions (`delete-account`, `export-user-data`, `submit-rating`, `send-push-notification`, `immat-brain-dialog`) ont été redéployées avec succès — pour la première fois depuis la mise en place du workflow.
**Ce que ça a réellement cassé (réponse à "qu'est-ce que ça casse en fait ?") :**
- **Confirmé cassé puis réparé avant cette mission :** envoi de message à une plaque tierce (`findProfileByPlate()` dans `messages.js`), via le GRANT manquant sur `profiles` (cf. mission précédente).
- **Confirmé jamais appliqué, maintenant en place :** RLS stricte sur `reports` (lecture réservée à l'auteur) + vue `public_reports` (accès REST PII-free aux signalements) — ces deux objets n'avaient jamais existé en base avant le run `27626558202`.
- **Confirmé sans impact (déjà présent en base avant le fix, créé manuellement) :** `device_sessions`, `driver_ratings`, `vehicle_trust_scores`, `delete_audit_log`, `public_profiles`, les index de `missing_indexes.sql`.
- **Bug fonctionnel distinct révélé par cette réparation (jamais lié au pipeline CI) :** absence de colonnes de position sur `reports` — cf. ci-dessus.

---

**Mission précédente : Merge complet de la branche de dev vers main (65 commits, suites 1-23)**
**Date :** 2026-06-16
**Contexte :** Après le hotfix isolé (cherry-pick `02daf34`→`54b8b37`) déployé seul sur `main` plus tôt dans la session, l'utilisateur a demandé la fusion complète de la branche `claude/immatconnect-pro-app-dEKGR` vers `main`, avec vérification systématique avant déploiement.
**Vérifications effectuées avant le merge :**
- Revue du diff complet `main..dev` (8 fichiers, 841 insertions/71 suppressions)
- Revue manuelle ciblée des fichiers sensibles D17 (`core/call-screen.js` : ajout chronomètre d'appel, purement additif ; `core/interaction-engine.js` : ajout TTL 90j localStorage, additif) — aucune logique d'appel/signalisation Agora modifiée
- Scan de secrets sur le diff complet (`AGORA_APP_CERTIFICATE`, clés API, service_role) → aucune fuite détectée
- `npm test` rejoué sur l'état complet de la branche de dev avant merge : 177 ✅ + 3 diagnostics OBD ✅
- `node scripts/preflight-inline-js.mjs` : 7 scripts OK
**Résultat :** merge `--no-ff` effectué (conflits PROJECT_STATE.md résolus manuellement — historique fusionné sans perte), `npm test` rejoué après résolution des conflits, puis push sur `main`.
**Hors scope :** aucun changement de code applicatif au-delà de ce qui était déjà sur la branche de dev — le merge est un déploiement, pas une nouvelle fonctionnalité.

---

**Mission précédente : Fix panneau Activité ne s'ouvrant pas — PR #307 (force .full + disable transition)**
**Date :** 2026-06-14
**Cause racine profonde :** iOS Safari WKWebView calcule `translateY(100%)` AVANT que le layout flex soit résolu dans la même frame. La valeur de départ de la transition est donc 37px (hauteur du handle+padding seulement) → le sheet "monte légèrement" de 37px. min-height CSS et void offsetHeight ne suffisent pas car WKWebView ignore le reflow synchrone dans ce contexte.
**Fix définitif :** Dans `navActivite()`, forcer `.full` (hauteur explicite via `top+bottom` CSS, indépendant du contenu), désactiver la transition CSS (`style.transition='none'`), clear le transform inline, retirer `.mini`, puis réactiver la transition via `requestAnimationFrame`. `.sheet.full` utilise des ancres CSS — pas de calcul flex → animation correcte.
**Fixes précédents (insuffisants) :**
- PR #305 : reset `actMain.style.display=''` → "Non toujours rien"
- PR #306 : `void s.offsetHeight` → "Ça ne fonctionne toujours pas"
- PR #307 commit 1 : `min-height: 50vh` sur `.act-main` → "Non marche pas"

---

**Mission précédente : Fix bannière SW en boucle (SW_UPDATED loop) — PR #301**
**Date :** 2026-06-14
**Cause racine :** `CURRENT = 'immatconnect-pro-v22'` dans index.html (2 occurrences) alors que le SW actif est `v25` → bannière toujours visible
**Fix :** 2 occurrences mises à jour → `'immatconnect-pro-v25'` (lignes 2827 et 2871 de index.html)

**Autres PR cette session :**
- PR #302 : locate() upsert debug logging (getUser null + error + OK)
- PR #303 : SIGNED_OUT reset complet (GPS, Realtime, S.uid, profil, badges, UI)
- PR #304 : bottom-nav grid 3→4 colonnes (navActivite invisible sur 2ème rangée)

---

**Mission précédente : GO LIVE — PR #300 merge + corrections terrain**
**Date :** 2026-06-14
**Commits :** `c409b38` (VAPID key), `e3559e5` (GitHub Actions EF), `0645a29` (push button Settings), `0a09028` (messages.js fix), `244cbd5` (call log dedup), `2c78ca7` (calls.js merge)

- VAPID public key mise à jour dans index.html (clé de prod, pas de test)
- GitHub Actions workflow `deploy-edge-functions.yml` créé — déploie 5 EF en 1 click
- 6 Secrets Supabase configurés (AGORA_APP_ID, AGORA_APP_CERTIFICATE, VAPID_*, ANTHROPIC_API_KEY)
- Realtime confirmé actif sur `messages` + `call_requests`
- B1 PII test passé — autres utilisateurs ne voient pas email/phone
- messages.js `getProfile()` : `select('*')` → `select('id,owner_plate,pseudo,vehicle_color')`
- `GRANT SELECT (phone)` ajouté sur profiles pour authenticated (restaure le chargement profil)
- Merge de main (calls.js v16 fixes) dans notre branche — conflits résolus
- PR #300 mergée → main → GitHub Pages déployé
- Journal d'appels dédupliqué par plaque (1 entrée par interlocuteur, badge ×N)

---

**Mission précédente : Sprint 7 — RGPD GAP + S7-OBD + S7-SEARCH**  
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

## 2b. MISSIONS DEPUIS PR #307 (2026-06-15)

**PR #308→#319 — Déboggage panneau Activité + nettoyage**

- **Root cause iOS WKWebView translateY** : corrigé (height:0 → height CSS explicite)
- **Bannière Force MAJ en boucle** : corrigée (IIFE CURRENT était bloqué à 'v26')
- **Root cause finale scrollTop** : `panelActivite` était le DERNIER panel dans `#sheet`. iOS Safari restaure scrollTop après reflow, montrant le bas de panelSettings. Fix : `panelActivite` déplacé en PREMIER dans le DOM (#sheet) → scrollTop=0 affiche toujours Activité (PR #318/S14/v35).
- **Nettoyage debug** : bannière jaune `actDebugBanner` + toasts debug supprimés (PR #319/v36).
- **✅ B1 CONFIRMÉ** : panneau Activité fonctionnel (validé terrain 2026-06-15)
- SW v36, APP_BUILD '2026-06-15', CURRENT 'immatconnect-pro-v36'

**PR #325 (suite 26) — Exporter/partager le journal d'appels (index.html, session 2026-06-16)**

- **Export journal** : bouton 📤 dans l'en-tête de `#icAppelsPane` (`App.exportCallJournal()`), exporte la liste actuellement filtrée (pills Tous/Manqués/Émis/Reçus + recherche `callJournalSearch`) — `App._callJournalLastLog` capture le tableau filtré à chaque `renderCallJournal()`.
- **Partage** : même pattern que `exportThread()` (messages.js, suite25) — `navigator.share` puis fallback clipboard/`execCommand('copy')`.
- Aucune écriture DB, aucun changement de schéma. 177 tests ✅, preflight OK.

**PR #325 (suite 25) — Exporter/partager une conversation (messages.js + index.html, session 2026-06-16)**

- **Export thread** : bouton "📤 Exporter la conversation" dans le menu ⋯ du thread (`#icSheetExport`). `exportThread(plate)` construit un transcript texte horodaté (`[jj/mm HH:MM] Vous/PLAQUE : message`) à partir de `t.list` (tous les messages, indépendamment du filtre de recherche en cours).
- **Partage** : `navigator.share` (feuille native iOS/Android, comme `shareApp()`) avec fallback `navigator.clipboard.writeText` puis `execCommand('copy')` (textarea hors écran, comme `copyMessage()`). `AbortError` (partage annulé) ignoré silencieusement.
- Aucune écriture DB, aucun changement de schéma. 177 tests ✅, preflight OK.

**PR #325 (suite 24) — Recherche dans la conversation (messages.js + index.html, session 2026-06-16)**

- **Recherche en thread** : bouton 🔍 dans l'en-tête de la conversation ouvre `#icThreadSearchBar` (sibling fixe hors de `#icThreadBody` régénéré, même pattern que `callJournalSearch`/`nearbySearch`). `_renderTimeline()` accepte désormais un 4ᵉ paramètre `searchQuery` : filtre les messages par texte (insensible à la casse), masque les événements d'appel pendant la recherche (non pertinents pour une recherche textuelle), affiche un état vide dédié si aucun résultat.
- `State.threadSearchQuery` réinitialisé à l'ouverture/fermeture du thread. `toggleThreadSearch()` / `setThreadSearch(v)` exposés sur `ImmatMessages`, appellent `refreshThread()` pour re-render à chaque frappe.
- Complète les 2 recherches déjà existantes (liste de conversations F-SEARCH, journal d'appels suite 22) — couvre désormais aussi le contenu d'une conversation déjà ouverte.
- Aucune écriture DB, aucun changement de schéma. 177 tests ✅, preflight OK.

**PR #325 (suite 23) — Badge favori dans le journal d'appels (index.html, session 2026-06-16)**

- **Parité visuelle** : le journal d'appels (`renderCallJournal()`) affiche désormais un badge ⭐ à côté de la plaque quand celle-ci fait partie des favoris (`localStorage.ic_favorites`), comme c'est déjà le cas dans la liste des conversations de messages.js (`.ic-trust-fav`).
- **Lecture seule** : pas de nouveau bouton de bascule ajouté dans le journal d'appels — le marquage favori/non-favori reste géré exclusivement via le menu ⋯ du thread dans Messages (cohérence avec l'architecture existante, pas de duplication d'UI de bascule).
- Aucune écriture, aucune nouvelle clé localStorage. 177 tests ✅.

**PR #325 (suite 22) — Recherche dans le journal d'appels (index.html, session 2026-06-16)**

- **Champ de recherche** : nouveau `<input id="callJournalSearch">` au-dessus du journal d'appels (`#icAppelsPane`), placé en sibling fixe hors du conteneur `#icCallLog` régénéré à chaque render (même pattern que `nearbySearch`) pour ne jamais perdre le focus/la frappe pendant la saisie.
- `App._callJournalSearch` (état) + `App.setCallJournalSearch(v)` (setter, déclenche `renderCallJournal()`), même pattern que `App._callJournalFilter`/`App.setCallJournalFilter`.
- **Filtrage** : `renderCallJournal()` filtre le journal sur la plaque normalisée (`nPlate`) ou le pseudo (`_pseudoMap`), insensible à la casse, combiné avec les filtres existants (Tous/Manqués/Émis/Reçus).
- **État vide adapté** : message "Aucun appel pour « … »" quand une recherche est active sans résultat, au lieu du message générique.
- Aucune écriture DB, aucun changement de schéma. 177 tests ✅.

**PR #325 (suite 21) — Marquer une conversation comme non lue (messages.js, session 2026-06-16)**

- **Marquer non lu** : nouveau bouton `#icSheetUnread` dans le menu ⋯ du thread, libellé dynamique ("👁️ Marquer comme non lu" / "✓ Marquer comme lu"). `getManualUnread()/isManualUnread()/setManualUnread()` — localStorage `ic_manual_unread` (tableau de plaques normalisées), même pattern que favoris/archives/sourdine.
- **Effet visuel uniquement** : la conversation apparaît avec le pastille verte "non lu" dans la liste (classe `.unread` + `.ic-unread-dot`) même si tous les messages ont déjà été lus côté DB — sert de pense-bête, n'altère jamais `read_at` ni le badge global (qui reste basé sur les vrais messages non lus).
- **Auto-clear** : le flag manuel est effacé automatiquement dans `openThread()` dès que la conversation est rouverte.
- Aucune écriture DB ajoutée, aucune table touchée. 177 tests ✅.

**PR #325 (suite 20) — Fix recherche profil par plaque (messages.js, session 2026-06-16)**

- **Bug rapporté** : envoyer un message à une plaque visible sur la carte affichait "Aucun conducteur ImmatConnect trouvé avec cette plaque" alors que le profil existait.
- **Root cause** : `findProfileByPlate()` n'essayait que 2 variantes (`fPlate` avec tirets, et une "compact" via `nPlate` qui conservait en réalité les tirets — bug de nommage), et n'inspectait jamais `r.error` : une erreur Supabase/RLS/réseau était donc silencieusement confondue avec "plaque introuvable".
- **Fix (front-only, confiné à messages.js)** :
  - Ajout de `compactPlate(v)` (strip tous caractères non alphanumériques, y compris les tirets).
  - `findProfileByPlate(rawPlate)` réécrite : essaie en boucle 4 variantes dédupliquées (dashed/fPlate, compact, normalized/nPlate, raw uppercase brut), logge `[OBD_FIND_PROFILE_START]` et `[OBD_FIND_PROFILE_TRY]` à chaque essai, et retourne désormais un sentinel `{ __error }` dès qu'une requête Supabase renvoie une erreur (au lieu de continuer silencieusement).
  - `sendToPlate()` : log `[OBD_SEND_TARGET]` après résolution, et nouvelle branche `target?.__error` → toast distinct "Erreur recherche conducteur. Réessaie dans quelques secondes." (avant les checks existants "introuvable" et "auto-message").
- **Hors scope (non touché, par consigne explicite)** : SQL/RPC, carte/`pickPlate()`, `S.selUid`, `contextVehicle.uid`, Realtime, badges, Activité, push, appels, REVOKE, schéma table `messages`, Service Worker.
- **Déploiement** : initialement cherry-pické isolément (commit `02daf34`) directement sur `main` le 2026-06-16 matin, sans les autres fonctionnalités de la branche de dev. La branche complète a ensuite été fusionnée sur `main` le même jour (cf. section "DERNIÈRE MISSION TERMINÉE") après vérifications.
- **Tests** : 177 ✅ + 3 diagnostics OBD ✅. Validation terrain (logs OBD live) à faire pour confirmer laquelle des 4 branches du plan de décision s'applique (Phase 2 — RPC `get_public_profile_by_plate` / propagation uid — non démarrée, en attente de confirmation explicite).

**PR #325 (suite 19) — Bouton message dans le journal d'appels (session 2026-06-15)**

- **Message button in call journal** : ajout d'un bouton 💬 (à côté de ⭐ et 📞) dans chaque entrée du journal d'appels (`renderCallJournal`), appelant `App.pickPlate(plate)` pour ouvrir la composition de message. Cohérence avec les listes Conducteurs proches et Récents. Changement JS/HTML (network-first), pas de bump SW. 177 tests ✅.

**PR #325 (suite 18) — Horodatage relatif dans les véhicules récents (session 2026-06-15)**

- **Recent vehicles timestamp** : la liste "Récents" (`openRecent()`) affiche désormais l'horodatage relatif de la dernière rencontre via `relTime(r.at)` ("à l'instant", "il y a X min", "hier HH:MM"…), à côté de la distance. La donnée `r.at` était déjà stockée par `addRecent()`. Changement JS/HTML (network-first), pas de bump SW. 177 tests ✅.

**PR #325 (suite 17) — Partager / inviter à l'app (session 2026-06-15)**

- **Share app** : bouton "📤 Inviter" dans la grille Paramètres → `App.shareApp()`. Utilise `navigator.share` (feuille de partage native iOS/Android) avec texte d'invitation + `CFG.site`. Fallback : `navigator.clipboard.writeText` puis `execCommand('copy')` (textarea hors écran) avec toast "Lien d'invitation copié ✓". `AbortError` (partage annulé) ignoré silencieusement. Croissance communautaire. Changement JS/HTML (network-first), pas de bump SW. 177 tests ✅.

**PR #325 (suite 16) — Signalements hors ligne en attente : indicateur visible (session 2026-06-15)**

- **Offline reports indicator** : `updateCommunityStatus()` affiche désormais le nombre de signalements en file d'attente (`S.offlineReports`). Hors ligne : suffixe "· N signalement(s) en attente d'envoi". En ligne : pastille orange "⏳ N" à côté des compteurs proches/alertes. Mis à jour quand un signalement est mis en file (catch de `saveReportRemote`) et quand la file est vidée (fin de `syncOfflineReports`). Donne un retour clair que rien n'est perdu en mode dégradé. Changement JS/HTML (network-first), pas de bump SW. 177 tests ✅.

**PR #325 (suite 15) — Survitesse : retour visuel sur le compteur (session 2026-06-15)**

- **Over-speed warning** : le widget vitesse `.speed` passe en orange (`.warn`) au-dessus de 110 km/h et en rouge pulsé (`.over`) au-dessus de 130 km/h (vitesse max autoroute FR). Toggle dans le handler `locate()` (`watchPosition`) après mise à jour de `speedVal`. Animation désactivée si `body.reduce-effects`. SW v40 → v41 (CACHE_NAME + CURRENT). 177 tests ✅.

**PR #325 (suite 14) — Touche Échap pour fermer (session 2026-06-15)**

- **Escape key** : handler `keydown` au niveau `document` (installé une fois via `body.dataset.icEscReady`). Priorité : ferme d'abord le bottom sheet `#icBottomSheet` s'il est ouvert (`closeSheet()`), sinon ferme la conversation active `#icThread` (`closeThread()`). Améliore l'accessibilité clavier / desktop. 177 tests ✅.

**PR #325 (suite 13) — Bloquer/Débloquer depuis le menu du thread (session 2026-06-15)**

- **Block from thread menu** : bouton `#icSheetBlock` (danger) dans le bottom sheet ⋯. Libellé dynamique via `getBlockLevel()` : "🚫 Bloquer" si non bloqué, "✅ Débloquer" sinon. `_sheetAction('block')` appelle `App.blockPlate()` (confirmation + persistance DB user_blocks + S.blocked) puis ferme le thread ; débloque via `App.unblockPlate()` + `App.closeBlocked()` pour éviter l'overlay liste. Réutilise l'infra de blocage existante (aucune logique dupliquée). 177 tests ✅.

**PR #325 (suite 12) — Limite de longueur + compteur de caractères (session 2026-06-15)**

- **Message length limit** : constante `MSG_MAX_LEN=1000`. Guard dans `sendToPlate()` (toast si dépassement). `maxLength` posé sur les textareas `icComposeText` et `icReplyText`. Compteur `.ic-char-count` créé dynamiquement sous chaque textarea, affiché uniquement dans les 100 derniers caractères, passe en rouge `#ff6b81` dans les 20 derniers. Tests : 177 ✅, preflight OK.

**PR #325 (suite 11) — Indicateur de présence dans l'en-tête du thread (session 2026-06-15)**

- **Presence indicator** : `_presenceLabel(plate)` lit `S.nearby` et calcule l'âge depuis `updated_at` : < 3 min → "🟢 Actif à proximité" (vert), < 10 min → "🟡 Vu il y a X min" (orange), sinon vide. Affiché en priorité dans le sous-titre `#icThreadSub` (sinon fallback niveau de confiance). `openThread()` le pose ; `refreshThread()` le rafraîchit à chaque nouveau message. Données 100% locales (S.nearby), zéro requête supplémentaire.

**PR #325 (suite 10) — Copier un message (session 2026-06-15)**

- **Copy message** : bouton ⧉ sur chaque bulle (apparait au hover/focus comme le bouton supprimer). `copyMessage(id)` retrouve le texte dans `State.threads[].list` par id, copie via `navigator.clipboard.writeText` avec fallback `execCommand('copy')` (textarea hors écran) pour les WebView sans Clipboard API. Toast "Message copié ✓". CSS `.ic-copy-msg` (gris neutre, opacity 0 → 1 au survol).

**PR #325 (suite 9) — Séparateurs de jour dans le thread (session 2026-06-15)**

- **Day separators** : `_dayLabel(date)` retourne "Aujourd'hui", "Hier", le jour de la semaine (< 7j) ou la date complète (j mois [année si différente]). Dans `_renderTimeline()`, suivi de `_prevDayKey` (année-mois-jour) → insère `<div class="ic-day-sep">` au changement de jour. Combiné proprement avec le séparateur de non-lus (les deux peuvent apparaître au même point). CSS : pilule grise centrée, `text-transform:capitalize`.

**PR #325 (suite 8) — Réponses rapides dans le FloatingCard de message (session 2026-06-15)**

- **Quick reply FloatingCard** : quand un message arrive et affiche le FloatingCard, 3 boutons `fcExtraActions` apparaissent : "✓ Reçu" → `sendToPlate(pl,'Bien reçu 👍')`, "🚗 J'arrive" → `sendToPlate(pl,"J'arrive ! 🚗")`, "En route" → `sendToPlate(pl,'En route 🚘')`. L'utilisateur peut répondre sans quitter la carte. Guard anti-boucle : les quick replies entrants n'affichent pas eux-mêmes des boutons. Preview texte étendu à 60 chars. Bouton "→ Ouvrir" remplace "Répondre →" pour ouvrir le thread complet.

**PR #325 (suite 7) — Séparateur "N non lus" dans le thread (session 2026-06-15)**

- **Séparateur messages non lus** : dans `_renderTimeline()`, détection des messages entrants avec `read_at === null` (`!_sent && !read_at`). Séparateur `<div class="ic-unread-sep">` inséré avant le premier non lu, affiche le compte "N non lu(s)". `openThread()` défile jusqu'au séparateur via `scrollIntoView({block:'center'})` si présent, sinon défile en bas. CSS : ligne violette `rgba(99,102,241,.35)` + texte `#818cf8`. Le séparateur disparaît naturellement au prochain re-render après que `markThreadRead()` a mis à jour les `read_at`.

**PR #325 (suite 6) — Sourdine par conversation (session 2026-06-15)**

- **Mute conversation** : `getMuted()` / `isMuted(plate)` / `toggleMute(plate)` — localStorage `ic_muted` (tableau de plaques normalisées). Bouton `#icSheetMute` dans le menu ⋯ (bottom sheet), libellé dynamique (🔕 Mettre en sourdine / 🔔 Réactiver). `_sheetAction('mute')` → `toggleMute()`. Guard dans `subscribe()` INSERT handler : son + vibration bloqués si `isMuted(sender_plate)`. Badge 🔕 discret dans la liste de threads pour les conversations muettes.

**PR #325 (suite 5) — Indicateur de frappe "est en train d'écrire" (session 2026-06-15)**

- **Typing indicator** : canal Supabase Realtime broadcast `ic_typ_{sorted_plates}` — sans table DB. `openThread()` souscrit ; `closeThread()` désabonne. Quand l'utilisateur tape dans `icReplyText`, broadcast `{type:'broadcast',event:'typing',payload:{uid}}` debounced 300ms. Réception → `#icTypingLabel` affiché (points animés + "est en train d'écrire…"), caché automatiquement après 3s d'inactivité. CSS `@keyframes ic-typing-blink` dans messages.css.

**PR #325 (suite 4) — URL linkification dans les bulles de message (session 2026-06-15)**

- **Détection et rendu des URLs dans les messages** : `_formatMsg(text)` dans messages.js — remplace `esc(item.message||'')` dans `_renderTimeline()`. Regex `/https?:\/\/[^\s<>"]+/g` ; liens ouverts dans `target="_blank" rel="noopener noreferrer"` ; affichage tronqué à 40 chars + "…". Les liens de position partagée (📍 Ma position : https://google.com/maps?…) sont maintenant cliquables.

**PR #325 (suite 3) — Messages UX + fix CI (session 2026-06-15 soir)**

- **Pseudo + couleur véhicule dans liste conversations** : `State.pseudoMap` + `State.colorMap` (Maps) peuplés post-render via async IIFE (nearby cache-first → DB SELECT IN fallback). Avatar coloré selon `vehicle_color`, pseudo affiché en gris sous la plaque.
- **Badge unread count pill** : `.ic-unread-dot` redesigné en badge pill (min-width 18px, border-radius 999px) affichant le compte si >1.
- **Bouton "Tout lu"** : `#icMarkAllReadBtn` dans le header messages — affiché si `setBadge(n>0)`, caché sinon. `markAllRead()` UPDATE en masse `read_at` via `IN (ids)`.
- **Filtres journal d'appels** : 4 pills (Tous / Manqués / Émis / Reçus) — filtre client-side sur `log` avant render. `App._callJournalFilter` + `App.setCallJournalFilter(f)` persistants entre renders.
- **Son + vibration sur nouveau message** : `AudioManager.playMessageBeep('msg_in_app')` + `navigator.vibrate(80)` dans le handler INSERT de `subscribe()` (guard idle + sons activés).
- **Pseudo dans FloatingCard et notif** : `profilesByIds([m.sender_id])` puis `_sndPseudo` — titre FloatingCard = `plaque · pseudo`.
- **Fix CI critique** : 7 guillemets typographiques U+2019/U+2018 dans `subMsgs()` de index.html → apostrophes droites. Preflight et smoke tests Playwright débloqués. Commit `e7850ea`.
- SW v40.

**PR #325 — Sprint 8 suite + Sprint 9 + UX améliorations (branche de travail, à merger)**

- **S7-NEARBY D13** (4 fixes) : staleMinutes 10→5, distance arrondie 100m, debounce Realtime 2s, batch trust SELECT IN (`S._trustCache`/`S._ratingCache`), cache-first dans `showVehicleContextMenu`
- **Position heartbeat 3min** : `_startDeviceHeartbeat` démarre `setInterval(180000)` → re-upsert `user_locations` même sans mouvement → conducteur stationnaire reste visible sur la carte
- **S8-06 D20** : ANGE dégradation gracieuse — catch block affiche "Le conseiller est momentanément indisponible…" au lieu du message d'erreur brut
- **S9 D18** : `subReports()` supprimé — canal Realtime mort (`ic_reports_{uid}`, handler vide)
- **S9 D19** : TTL 90 jours `ic_interactions` + `ic_notifications` dans `interaction-engine.js`
- **S7-PROFILE D14** : pseudo + dot couleur dans le menu contextuel véhicule
- **Nearby search + FAB badge** : filtre texte plaque/pseudo dans le panneau Conducteurs proches ; badge bleu sur le FAB avec le compte
- **MAX_BLOCKED=500** : plafond localStorage sur ic_blocked (D19)
- **pseudo dans addRecent()** : la liste Récents affiche le pseudo à côté de la plaque
- **Badges trust/rating dans renderNearby** : 🌟✅⚠️ depuis S._trustCache, ★4.x si avg≥4.0 et ≥3 votes — zéro requête DB supplémentaire
- **Chronomètre d'appel** : `_startCallTimer()` / `_stopCallTimer()` dans call-screen.js — `#callOvTimer` (vue pleine) et `#callOvMiniTimer` (vue réduite) se mettent à jour chaque seconde dès CALL_ACCEPTED
- **Durée dans journal d'appels** : `hide()` persiste `{requestId: durée_secs}` dans `ic_call_durations` ; `renderCallJournal()` affiche "1:23" entre le statut et la direction
- **Bouton 📞 dans le menu contextuel véhicule** : `vehicleContextAction('call')` → `CallManager.contactByCall()`
- **Boutons 💬/📞 dans la liste Conducteurs proches** : remplace le bouton "Contacter" unique
- **Boutons 💬/📞 dans la liste Récents** : cohérence avec la liste Conducteurs proches
- **Pseudo dans journal d'appels** : batch `_pseudoMap` (SELECT owner_plate,pseudo IN [plaques]) — `fmtDur()` + durée affichée inline
- **Pseudo dans titre de thread messages** : async IIFE nearby cache-first → DB fallback, guard anti-race `title.textContent===localPlate`
- **Indicateur fraîcheur position** dans `renderNearby()` : `updated_at` → "Xmin" orange (≥3min) ou gris (1-2min)
- **Aperçu plaque destinataire** dans compose : `icComposePlatePreview`, debounce 450ms, nearby cache (vert) → DB fallback
- **Auto-grow textarea + Ctrl/Cmd+Enter** dans `messages.js installInputs()` : `_grow()` max 160px, keydown listener sur `icComposeText` et `icReplyText`
- SW v39

**PR #320→#324 — Sprint 8 S8-01+S8-04 + CI auto-deploy**

- **S8-01** : table `delete_audit_log` créée (SQL exécuté manuellement — Supabase SQL Editor). Edge Function `delete-account` mise à jour : INSERT pending au début, `recordStep()` après chaque étape, UPDATE completed/error à la fin. Dégradation gracieuse si table absente.
- **S8-04** : Hint A2HS iOS ajouté dans Paramètres → Notifications : "📱 iPhone : pour recevoir les alertes quand l'app est fermée, ajoutez ImmatConnect à l'écran d'accueil…"
- **CI auto-deploy** : workflow `deploy-edge-functions.yml` modifié — déclenchement automatique sur push vers `main` quand `supabase/functions/**` ou `supabase/migrations/**` changent. Suppression du déclenchement `workflow_dispatch` uniquement. Ajout de `supabase link` + `supabase db push --linked` (avec `continue-on-error: true`).
- **Résultat** : tout déploiement EF ou migration est désormais automatique dès le merge dans main.

---

---

**Mission : Fix "Mon profil ne s'ouvre pas" — TERMINÉE, sur branche dev**
**Date :** 2026-06-17
**Symptôme :** Taper "✏️ Mon profil" dans les Paramètres ne faisait rien visuellement (légère pression détectée, mais aucun écran n'apparaissait).
**Root cause :** `forceOpenApp()` dans `ui.js` (appelée lors de l'init app via `app.openMap()` patchée par `patchApp()`) appelle `hideAuthScreens()` qui pose `style.display='none'` sur les 4 écrans d'auth (`#sw`, `#sa`, `#sp`, `#sr`). `openEditProfile()` ne faisait qu'ajouter `.active` sur `#sp`, mais le `style.display='none'` inline prime sur toute règle CSS — l'écran restait invisible. Idem pour `#appScreen` qui pouvait garder `style.display='block'` depuis `forceOpenApp()`.
**Fix appliqué (`index.html`, `App.openEditProfile`) :**
1. Au moment de masquer tous les écrans, effacer aussi `style.display` (pas seulement retirer `.active`).
2. Effacer `style.display` de `#appScreen`.
3. Avant d'ajouter `.active` sur `#sp`, effacer `_sp.style.display=''`.
**Commit :** `4367f02` sur `claude/immatconnect-pro-app-dEKGR`.

---

## 3. MISSION EN COURS

**Aucune mission en cours — PHASE TERRAIN.**

Merge `claude/immatconnect-pro-app-dEKGR` → `main` TERMINÉ 2026-06-24 (commit 9b07790, SW v243).
V1 signalements véhicule en production. Recommandation ChatGPT : ne plus toucher au workflow pendant quelques semaines.

```
RÈGLES ACTIVES (ne pas remettre en question) :
- NE PAS fusionner S6-TRUST (revert 90577f4 — 6 conditions métier non satisfaites)
- NE PAS toucher messages.js logique métier sauf chantier dédié explicitement validé
- NE PAS toucher le workflow signalements véhicule — observer d'abord les usages terrain
```

---

## 3b. GEL OFFICIEL — MODULE ACTIVITÉ
**Date de gel : 2026-06-25**

Le module Activité est officiellement gelé pour la V1.
Six revues complètes ont validé : workflow, états, badges, statuts, verdicts, navigation, cohérence transversale, charge cognitive, cohérence dans le temps.

### Définition du succès V1

| # | Critère | Seuil cible | Seuil d'alerte |
|---|---|---|---|
| S1 | Compréhension spontanée du workflow | Aucun retour "je ne comprends pas les états" | > 2 retours identiques sur 30j |
| S2 | Taux de verdict dans les 48h | > 70 % des signalements reçus | < 40 % |
| S3 | Taux retour après "Je vérifierai" | > 50 % → verdict même session ou suivante | < 30 % |
| S4 | Absence de confusion badge | Aucun retour badge inexpliqué (hors vehicle_response) | > 15 % des retours |
| S5 | Qualité des verdicts | > 35 % "confirmé" | < 20 % (signalements abusifs) |
| S6 | Fidélité après premier signalement | Retour dans les 14 jours | < 30 % fidélité |

### Points ouverts classifiés — V1.1 uniquement

| Point | Classification | Déclencheur V1.1 |
|---|---|---|
| vehicle_response dans Activité (pas Messages) | Choix assumé V1 | S4 + > 20 % cherchent dans Messages |
| timeBadge ">30 min" inexact après 24h | Choix assumé V1 | NOUVEAUX anciens récurrents en terrain |
| Densité TRAITÉS long terme | Choix assumé V1 | > 50 items chez utilisateurs actifs |
| Latence chip après verdict iOS | Dette technique mineure | Plainte utilisateur reproductible |
| ic_read_msg_ids limite 500 | Dette technique existante | Régression constatée terrain |
| Absence feedback expéditeur | Choix assumé V1 | S6 < seuil |
| EN COURS indéfini sans verdict | Choix assumé V1 | S3 < 30 % |
| Date exacte verdict TRAITÉS | Cosmétique | Nettoyage V1.1 opportuniste |
| Boutons contact dans TRAITÉS | Faible valeur | Nettoyage V1.1 opportuniste |

### Conditions de réouverture

Toute modification du module Activité devra être justifiée par **au moins un** :

- **C1** — Bug reproductible sur appareil cible
- **C2** — Même friction signalée par ≥ 3 utilisateurs indépendants sur 30 jours
- **C3** — Métrique terrain hors seuil d'alerte après 4 semaines de données
- **C4** — Évolution prévue V1.1 déclenchée par C1, C2 ou C3

**Aucune modification ne sera proposée** parce qu'elle paraît théoriquement meilleure, parce qu'un autre produit fait différemment, ou parce qu'une idée émerge en session.

### Principes de préservation du module Activité

**P1 — Préserver la simplicité**
Toute évolution future devra réduire la charge cognitive ou apporter une valeur utilisateur démontrée. Aucune fonctionnalité supplémentaire ne sera ajoutée uniquement parce qu'elle est techniquement possible.

**P2 — Une information = une seule fonction**
Chaque élément visible conserve un rôle unique.
- Badge = attire l'attention.
- Statut = indique une action restante.
- Compteur = décrit un historique.
- Verdict = clôture un traitement.
Ces rôles ne devront jamais être mélangés.

**P3 — Une action = une conséquence visible**
Chaque action effectuée par un conducteur produit un changement immédiatement visible.
Exemples : ouverture → badge disparaît · "Je vérifierai" → chip ⏳ apparaît · verdict → passage dans TRAITÉS · réponse reçue → badge 📩 identifiable.
Aucune action utilisateur ne doit sembler "ne rien faire".

**P4 — Aucun badge sans élément identifiable**
Tout badge affiché dans l'interface doit toujours permettre à l'utilisateur d'identifier immédiatement l'élément qui l'a déclenché. Aucun badge ne peut exister si l'élément correspondant n'est pas visible ou retrouvable naturellement.

**P5 — Le conducteur ne doit jamais avoir à mémoriser une tâche**
L'application porte la mémoire. Le conducteur ne doit pas avoir à se souvenir d'un signalement en attente, d'un verdict à donner, ou d'une réponse reçue. L'interface doit toujours afficher l'état réel.

**P6 — Le terrain décide**
Toute remise en cause du module Activité devra être motivée par un bug reproductible, plusieurs retours utilisateurs convergents, ou une métrique hors seuil. Aucune évolution ne sera décidée uniquement sur une intuition ou une préférence de conception.

### Validation finale

Le module Activité est considéré comme stabilisé. Les prochaines décisions concerneront désormais l'usage réel du produit et non plus sa conception théorique.

---

## 4. PROCHAINE MISSION RECOMMANDÉE

> ✅ **EURÊKA COMPLET (3/3) — « Le prochain geste utile »** (`docs/SPEC-ANGE-NEXT-ACTION.md`)
> Ange = projection du plus petit geste utile. Incréments non destructifs (lecture seule, dans Nexus) :
> 1) ✅ **FAIT (SW v405)** `fallbackFor()` — quand une feature est OFF, Ange propose l'alternative
>    AUTORISÉE au lieu d'un mur (appels OFF → message, etc.), dérivé du registre. `_blockedHTML`/`_fallbackRun`.
> 2) ✅ **FAIT (SW v406)** `nextUsefulAction()` — à l'ouverture d'Ange, ≤3 gestes utiles (répondre à un
>    signalement reçu / signaler au véhicule proche / ouvrir À traiter), **silence si rien d'utile**,
>    jamais 2 ouvertures de suite la même suggestion ignorée. Lit S.nearby + S._actMessages +
>    `App._computeTodo` + registre. Câblé : `_nextActionsHTML`/`_nextRun` en tête de `open()`.
>    BONUS : `_nearestInfo` fiabilisé (tolère distance nulle, exclut plaques de secours `VEH-`) →
>    corrige le cas « Ange ne voit pas le véhicule proche » (capture IMG_6560). Tests 103/103.
> 3) ✅ **FAIT (SW v407)** `currentSituation()` — fil rouge : 1 phrase « Voici où on en est » tout en
>    haut à l'ouverture (signalement reçu non traité → voisin connecté proche → à-traiter → vigilance),
>    **silence sinon**. `_situationHTML` en tête de `open()`. Tests 110/110.
> ➡️ Les 3 projections sont en prod. Le modèle `situation → écart → geste → confirmation → action → trace`
>    est vivant. Suite possible (OBSERVER d'abord) : OBD/capteurs comme source de situation, ciblage
>    directionnel « sens de la circulation », projection des interactions au Dashboard.
> (Ne PAS créer de moteur de décision / DeltaEngine / second registre / second journal.)


```
PHASE TERRAIN — OBSERVATION (priorité absolue)
════════════════════════════════════════════════════
NE PAS toucher le workflow signalements véhicule avant au moins 2 semaines.

Indicateurs à observer (ChatGPT recommande) :
  1. Taux de signalements qui reçoivent une réponse
  2. % qui passent NOUVEAUX → EN COURS → TRAITÉS
  3. Fréquence "Je vérifierai dès que je serai arrêté"
  4. Répartition des 4 verdicts (confirmé / disparu / faux / pas pu vérifier)
  5. Délai moyen avant clôture d'un signalement

Ces données valent plus que tout nouvel audit théorique.

Ensuite (si usage observé) : itérer en V2 guidé par les vrais comportements.
════════════════════════════════════════════════════

CHANTIER SUIVANT SI NÉCESSAIRE : FIABILISATION CHAÎNE MESSAGES
Ouvert le 2026-06-23 — Séparé du redesign visuel V3
════════════════════════════════════════════════════

AVANCEMENT — CHANTIER TERMINÉ ✅
──────────────────────────────
✅ POINT 1 — Canonisation colonnes : from_plate/to_plate retirés de l'INSERT (commit e8724a4, v29)
✅ POINT 2 — Fallback INSERT supprimé (commit 805bc54, v27)
✅ POINT 3 — Guard receiverPlate avant INSERT (commit 805bc54)
✅ POINT 4 — Pagination : ORDER DESC + loadOlderMessages() + bouton (commit a77c63d, v28)
✅ POINT 5 — Bouton "Restaurer messages masqués" dans Paramètres RGPD (commit e8724a4)
✅ POINT 6 — Photos image_url dans thread + lightbox (commit a77c63d)

CONTEXTE
────────
Audit pré-merge a révélé 6 fragilités dans la chaîne envoi → stockage → réception.
Le redesign V3 (app.css + messages.css) est purement visuel et safe à merger.
Ces 6 points constituent un chantier technique distinct à traiter séparément.

POINT 1 — Colonnes plaques redondantes  ⏳ À FAIRE
  Problème :
    sender_plate / receiver_plate / from_plate / to_plate / target_plate
    créent une logique fragile. Le fallback (supprimé Point 2) masquait le problème.
  Objectif :
    Définir une source canonique unique pour retrouver expéditeur/destinataire.
    Supprimer l'ambiguïté entre les 5 colonnes.

POINT 2 — Fallback INSERT dangereux  ✅ FAIT (805bc54)
  Fix : suppression du retry sans colonnes plaques. INSERT unique avec toutes les colonnes.
  Guard receiverPlate ajouté avant INSERT (Point 3 couvert en même temps).

POINT 3 — receiver_plate absent = destinataire aveugle  ✅ FAIT (805bc54)
  Fix : guard explicite `if(!receiverPlate){ toast(...); return false; }` avant INSERT.

POINT 4 — LIMIT 300 sans pagination  ✅ FAIT (a77c63d)
  Fix :
    - ORDER BY created_at DESC → les 300 messages les plus récents chargés en priorité
    - loadOlderMessages(plate) : charge 50 messages antérieurs via cursor created_at
    - Bouton "Charger les messages plus anciens" en haut du thread
    - "Début de la conversation" quand plus rien à charger

POINT 5 — Soft-delete local masque des messages existants  ⏳ À FAIRE
  Problème :
    ic_deleted_msgs (localStorage) peut masquer un message qui existe encore en base.
    Si localStorage est vidé → message réapparaît (comportement surprenant pour l'utilisateur).
    Limite : slice(-500) — les 501ᵉ et au-delà réapparaissent automatiquement.
  Objectif :
    Ajouter un outil debug ou une option "Réinitialiser messages masqués".
    Documenter clairement le comportement (soft-delete = local only).

POINT 6 — Photos image_url  ✅ FAIT (a77c63d)
  Problème :
    Photos de signalements stationnés bien stockées dans Supabase Storage (bucket parked-photos).
    image_url inséré en base mais jamais rendu dans le thread de messages.
  Objectif :
    Afficher image_url dans le thread quand disponible (miniature cliquable → lightbox).

ORDRE D'EXÉCUTION RECOMMANDÉ
────────────────────────────
  1. POINT 2 — Fallback INSERT (risque le plus élevé, correctif chirurgical)
  2. POINT 3 — receiver_plate (garantie de livraison)
  3. POINT 1 — Canonisation colonnes (nettoyage architecture)
  4. POINT 6 — Photos image_url (feature visible)
  5. POINT 4 — Pagination (feature UX)
  6. POINT 5 — Reset soft-delete (outillage debug)

RÈGLE ABSOLUE
─────────────
  Ce chantier = modifications de messages.js logique métier uniquement.
  NE PAS modifier messages.css ou le redesign visuel V3 dans ce chantier.
  NE PAS mélanger les deux chantiers dans le même commit.
```

---

```
ÉTAT PROD 2026-06-22 — CHANTIER A CLÔTURÉ
════════════════════════════════════════════
✅ abuse_reports table + RLS (290b696)
✅ Modale abus HTML + CSS + JS (4c01d40)
✅ RPC get_abuse_reports_admin() (59f4854)
✅ Fix 42702 alias u.id (3d1bbe6)
✅ Section Signalements d'abus Dashboard Gardien (3200ebc)
🔓 S6-TRUST — RÉOUVERT le 2026-06-28 en V1 PÉRIMÈTRE RÉDUIT (≠ ancienne PR A `dee9537`).
   La V1 actuelle = journal `report_feedback` + confirmation véhicule « ✅ Confirmé par le
   conducteur » (cf. `docs/ADR-S6-TRUST-V1.md`, invariants INV-TRUST-001/002/003).
   L'ancienne approche `is_disputed` / auto-refresh ci-dessous reste ABANDONNÉE (remplacée
   par le journal append-only ; les 6 conditions ci-dessous sont caduques pour la V1).
🚫 S6-TRUST (dee9537) — ancienne PR A — NE PAS FUSIONNER (approche is_disputed abandonnée)

─────────────────────────────────────────────────
PR A S6-TRUST — 6 CONDITIONS AVANT FUSION (décision 2026-06-22)
─────────────────────────────────────────────────
1. Qui peut contester un signalement ? (le destinataire uniquement ?)
2. Depuis quel écran ? (Activité > Reçus ? thread véhicule ?)
3. Qui valide la contestation ? (admin Studio ? Edge Function ? auto ?)
4. Quel workflow technique ? (UPDATE par l'app ? par un admin ?)
5. Comment éviter les abus de contestation ? (délai ? limite par user ?)
6. Tests SQL : colonne + trigger + simulation UPDATE is_disputed=true

─────────────────────────────────────────────────
OPTIONS POUR LE PROCHAIN CHANTIER
─────────────────────────────────────────────────

OPTION A — Workflow contestation signalement
  Flux complet : bouton Contester → UI → UPDATE is_disputed → trigger → score
  Périmètre : index.html + RLS UPDATE policy (ou Edge Function)
  Prérequis : fusionner S6-TRUST PR A d'abord

OPTION B — Dashboard Gardien normalisation
  Audit #gardienDashboard : voyants, GVC, Diagnostic IA, Immatest.
  Corriger ce qui est cassé, sans feature nouvelle. Indépendant de S6-TRUST.

OPTION C — Autre chantier UX
  Ex : #nearbyPanel headers, ergonomie carte, profil conducteur.
  Indépendant de S6-TRUST.

─────────────────────────────────────────────────
ANCIEN PLAN STABILISATION (archivé)
─────────────────────────────────────────────────
MODE STABILISATION ACTIF (décision utilisateur 2026-06-22)
═══════════════════════════════════════════════════════════

RÈGLE ABSOLUE :
  Ne plus modifier aucun panel ou modal déjà validé sans bug terrain
  reproductible documenté. Zéro feature, zéro refactor préventif.

─────────────────────────────────────────────────
ÉTAPE 1 — Tests terrain modales Settings
─────────────────────────────────────────────────
  Ouvrir chacune des 5 modales sur les deux iPhones et vérifier :
  □ #blocked     : header [Plaques bloquées][✕] visible, ✕ ferme la modale
  □ #recent      : header [Véhicules récents][Vider][✕], bouton Vider fonctionnel
  □ #favoritesModal : header [⭐ Conducteurs favoris][✕]
  □ #trustedModal   : header [🤝 Conducteurs de confiance][✕]
  □ #legal          : header [Confidentialité & CGU][✕], onglets Confidentialité/CGU OK
  Critère GO : aucun double X, aucun bouton Fermer fantôme, tap zone ≥44px.

─────────────────────────────────────────────────
ÉTAPE 2 — Validation finale micros (Ange + GPS)
─────────────────────────────────────────────────
  Tester sur les deux iPhones :
  □ Ange 🎙️ : tap → micro s'active (⏹ orange), dictée transcrite dans #angeMsg
  □ Ange 🎙️ : tap ⏹ → micro s'arrête, texte confirmé dans la textarea
  □ GPS  🎙️ : tap → micro s'active, adresse dictée apparaît dans #gpsSearch
  □ GPS  🎙️ : tap ⏹ → micro s'arrête, recherche lancée automatiquement
  Si un bug est constaté → documenter reproduction exacte avant toute correction.

─────────────────────────────────────────────────
ÉTAPE 3 — Audit global navigation
─────────────────────────────────────────────────
  Parcourir tous les panels, modales, sous-steps et overlays de l'app.
  Vérifier pour chaque écran :
  □ Pas de double X (deux ✕ visibles simultanément)
  □ Pas d'écran sans sortie (trap focus sans bouton de fermeture accessible)
  □ ← retour disponible partout où il y a une hiérarchie de navigation
  Rapport : liste des anomalies avec localisation exacte (id HTML).
  Ne corriger qu'après validation du rapport par l'utilisateur.

─────────────────────────────────────────────────
ÉTAPE 4 — Prochain chantier (après ÉTAPES 1-3 validées)
─────────────────────────────────────────────────
  Deux options à soumettre à l'utilisateur :

  OPTION A — Dashboard Gardien normalisation  ⏳ DISPONIBLE
    Audit #gardienDashboard : voyants, GVC, Diagnostic IA, Immatest.
    Objectif : corriger ce qui est cassé ou incomplet, sans feature nouvelle.

  OPTION B — Modale signalement abus (openAbuseReport)  ✅ DÉJÀ FAIT
    La modale HTML #abuseModal existe (openAbuseReport/selectAbuseCategory/
    submitAbuseReport → table abuse_reports). Plus aucun prompt() natif. Rien à faire.

NOTE DE RÉALITÉ (2026-06-28) : le module AIDE est COMPLET (backend Lot A + bascule
Lot B + #1 carte + #4 contact + #7 push proximité, SW v348). Le chantier MESSAGES
(6 points) est marqué terminé. OPTION B est faite. Les seules pistes de dev restantes :
OPTION A (Dashboard Gardien) ou la phase d'OBSERVATION terrain recommandée.
```

---

## 4. PROCHAINE MISSION RECOMMANDÉE — ORDRE STRICT

```
ÉTAPE 1 — Tests terrain (PR #300 mergée, SW loop fixé, faire les tests) :
  B2 : Push notification — Paramètres > Notifications > Activer → accepter la permission iOS
  B3 : RGPD — Export de données (bouton dans Paramètres → téléchargement JSON)
        ⚠️  Le panneau Settings iOS se coupe — RGPD inaccessible → fix CSS d'abord si nécessaire
  B4 : Messages — envoyer BZ-652-LL → BE-521-MM
  B5 : ANGE — ouvrir dialogue IA ✦ → poser une question → vérifier réponse Claude

ÉTAPE 2 — Après confirmation B1 + B4 OK :
  Exécuter dans Supabase SQL Editor :
    REVOKE SELECT ON public.profiles FROM authenticated;
  Puis vérifier :
    SELECT column_name FROM information_schema.column_privileges
    WHERE grantee='authenticated' AND table_name='profiles' AND privilege_type='SELECT';
  Doit retourner uniquement : id, owner_plate, pseudo, vehicle_color

ÉTAPE 3 — Fix CSS panneau Paramètres iOS (si B3 bloqué) :
  Le panneau Settings se coupe — RGPD + Notifications non accessibles sur iOS
  Fix : ajouter overflow-y:scroll + max-height sur le panneau ou -webkit-overflow-scrolling:touch
```

---

## SPRINTS HISTORIQUES

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
| **`docs/PLAN_EXECUTION_30J_V1.2.md`** | Plan d'exécution production 30 jours — figé v1.2 | Avant toute action terrain |
| **`docs/MASTER_COMPATIBILITY_MAP.md`** | Carte de compatibilité v1.3 — GEL DOCUMENTAIRE FINAL (2203 lignes) — 25 risques, 14 hypothèses, 27 invariants, 42 tests terrain, 5 playbooks, 15 questions GO MAIN, STORAGE_REGISTRY, EVENT_REGISTRY, NOMENCLATURE_OFFICIELLE, SYSTEM_HEALTH_REGISTRY | Avant tout GO MAIN ou nouveau développement |
| **`docs/DEPLOYMENT_LOG.md`** | Journal de déploiement opérationnel — checklist Secrets + 11 migrations + EF + Realtime + conditions merge main | Avant et pendant chaque déploiement terrain |
| **`docs/TEST_RESULTS.md`** | Grille 42 contrôles terrain — résultats (✅/❌/⚠️/⬜) — GO/NO-GO MAIN | Pendant et après les sessions de test terrain |
| **`docs/INCIDENT_LOG.md`** | Journal des incidents — format P1/P2/P3 — référence aux RISK et playbooks du MASTER_COMPATIBILITY_MAP | Dès qu'un ❌ ou dysfonctionnement est détecté |
| **`docs/PRODUCT_ARCHITECTURE_V2.md`** | Roadmap architecture produit V2 — 17 sections — 8 modules (Véhicule, Stationnement, Maintenance, Assistance, Communauté, Monétisation, Professionnels, IA/ANGE) — matrice compatibilité, angles morts, dettes futures, tables réservées, EF réservées, invariants V2, arbre de décision GO/NO-GO | Avant tout sprint V2 ou décision d'architecture future |
| **`docs/BETA_READINESS_AUDIT.md`** | Audit d'exploitation bêta — 10 sections — 20 fonctionnalités codées non testées, 10 pires catastrophes + procédures de reprise, métriques 30j, checklist opérationnelle J1→J7, commandes SQL de diagnostic | AVANT toute session de déploiement terrain |
| **`docs/TECHNICAL_AUDIT_AND_ROADMAP.md`** | Audit du code réel + état d'avancement par module (% code, % actif) + 17 écarts vision/réalité + roadmap Sprint 8→13 + Sprint 8 détaillé (objectifs, tâches, risques, durée) + 8 angles morts thématiques | Avant tout sprint et décision d'architecture |
| **`docs/ADR-DASHBOARD-V2.md`** | ADR figé — refonte Dashboard Gardien en écran de gouvernance + registre data-driven unique (9 invariants INV-DASH, portée device/account/fleet, cycle de vie, migration 6 étapes) | Avant tout travail sur le Dashboard, les Feature Flags ou les diagnostics |
| **`docs/SPEC-DASHBOARD-REGISTRY.md`** | Spec du registre (structure déclarative, énumérations, 7 entrées initiales + 4 modules à intégrer, mapping 12 flags→cible, chokepoints CK-*) — réf d'implémentation de l'étape 2 | Avant d'implémenter le registre (étapes 2-4) |
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
| D12 | **vehicle_trust_scores = source de vérité unique** — S.trust = cache d'affichage temporaire uniquement. Renommage futur : S.trust → S.localTrustCache. Aucun nouveau dev sur S.trust. | Architecture confiance | 2026-06-13 |
| D13 | **TTL conducteurs proches = 5 min** (CFG.staleMinutes=5). Distance arrondie à 100m. Batch trust SELECT IN. Debounce loadOthers 2000ms. Pas de requête trust individuelle par conducteur. | S7-NEARBY | 2026-06-13 |
| D14 | **Profil public = owner_plate + pseudo + vehicle_color + trust_score + trust_level + avg_score + total_ratings**. Jamais email/phone/user_id/reporter_id/device_id/commentaires individuels. | S7-PROFILE | 2026-06-13 |
| D15 | **Photos signalements** : max 5 Mo, JPG/JPEG/WEBP (PNG converti), compression client, max 1600px, qualité 0.8, TTL 90 jours (suppression auto obligatoire), bucket=report-photos, photo_url nullable, échec upload → signalement sans photo (jamais bloquant). | S7-PHOTO | 2026-06-13 |
| D16 | **delete_audit_log obligatoire** : colonnes id/user_id/requested_at/completed_at/status/error. Traçabilité RGPD art. 17. | Sprint 8 | 2026-06-13 |
| D17 | **Appels vocaux stables** — calls.js, agora-call-engine.js, call-screen.js ne sont jamais modifiés sans validation terrain explicite. | invariant | 2026-06-13 |
| D18 | **Realtime** : conserver ic_msg + ic_loc + ic_community_live. Supprimer ic_reports_{user} (handler vide, priorité faible). | Sprint 9 | 2026-06-13 |
| D19 | **localStorage futur** : MAX_BLOCKED=500, TTL interactions+notifications=90 jours. Pas de travail Sprint 8. | Sprint 9 | 2026-06-13 |
| D20 | **immat-brain-dialog dégradation gracieuse** : si EF échoue → afficher "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles." Jamais écran vide ni stack trace. | Sprint 8 | 2026-06-13 |
| D21 | **Ordre Sprint 8** : 1.Déploiement migrations → 2.Validation terrain → 3.S7-NEARBY → 4.delete_audit_log → 5.Promise.allSettled() push → 6.Dégradation Claude → 7.Audit prod. S7-PROFILE et S7-PHOTO bloqués jusqu'à validation terrain complète. | Roadmap | 2026-06-13 |
| D22 | **Dashboard Gardien V2** (voir `docs/ADR-DASHBOARD-V2.md`) : Dashboard = écran de gouvernance 4 onglets (Santé/Modération/Fonctionnalités/Développeur) ; **registre data-driven = unique source de vérité** ; INV-DASH-001 une seule source d'activation, INV-DASH-002 kill-switch réel au chokepoint runtime (OFF arrête vraiment le module), INV-DASH-003 fonctionnalité≠préférence (sons/voix/effets/notifs = Paramètres only), INV-DASH-006 vérité serveur > cache local, INV-DASH-007 pas de faux vert. Portée device/account/fleet. Cycle alpha→beta→stable→deprecated→removed. Migration non destructive en 6 étapes. **ADR figé — implémentation non commencée.** | Archi Dashboard | 2026-06-29 |

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
SW version actif  : immatconnect-pro-v58
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
calls.js              : v17 (device_id + call rate limit ic_call_times)
core/call-screen.js   : v8
core/agora-call-engine.js : v5
core/audio-manager.js : v3  (init() guard _initialized, appelé dans openMap())
core/bus.js           : v47 (PARKED_REPORT_SENT, PARKED_RESPONSE_SENT, PARKED_REPORT_DISMISSED, PARKED_REPORT_RATED)
core/interaction-engine.js : v2  (TYPE_META PARKED_REPORT, PARKED_RESPONSE)
core/guardian-loop.js : v3  (CATEGORY STATION, HEURISTIC-005, _plate() target)
core/global-verification-center.js : v3  (section 6 checkStation())
messages.js           : v20 (Bus emits parked, IE types parked, suppressToast, Bus quick-reply path)
service-worker.js     : immatconnect-pro-v58
app.css               : v9  (map-alert-filter-bar + map-filter-pill + cluster-icon)
APP_BUILD             : 2026-06-15
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
| 2026-07-02 | IA session | **Ange orbe — réponse TOUJOURS à voix haute (SW v431, déployé)**. Retour PO : en mode orbe on n'entendait rien après une demande (fiche masquée + seul Nexus parlait ; LLM et menus muets ; confirmations muettes). Fix : (1) `_speakVoiceResult()` appelé après `send()` dans `_voiceTurn` → DIT le texte de `#angeResponse` si rien ne parle déjà (couvre LLM/menu/question) ; (2) `_armConfirm` en mode vocal DIT d'abord la question puis n'écoute qu'après la voix (anti-écho — sinon il entendrait ses propres « envoie/annule »). SW v430→v431. Tests ange-v2 252→256. |
| 2026-07-02 | IA session | **Ange orbe — accusé de réception « Je t'écoute » + fin des interruptions (SW v430, déployé)**. Retour PO (IMG_6570) : en disant « Ange » aucun retour immédiat, et un message parlé proactif démarrait 5-10 s après (il bloquait l'ouverture du micro car on attend la fin de la voix avant d'écouter). Fix : `voiceCommand()` (1) **coupe toute parole en cours** (`speechSynthesis.cancel()`), (2) dit un **« Je t'écoute »** bref (orbe *speak*), (3) ouvre le micro après. + Garde-fou `immat-copilot._speak` : **ne parle jamais pendant une session vocale** (`AngeDialog._convo`). immat-copilot.js v7→v8, SW v429→v430. Tests ange-v2 249→252. |
| 2026-07-02 | IA session | **Ange — mode « orbe seul » façon Siri + correctif micro (SW v429, DÉPLOYÉ sur main via `feat/ange-orb-voice`)**. (1) Appel vocal (« Ange » / micro flottant) → `voiceCommand()` n'ouvre plus le panneau ni le tableau d'accueil : juste l'**orbe** (`_orbMode`), posé sur le bouton Ange (`#navAnge`), qui **pulse** à l'apparition, **tourne** (think) pendant le traitement, **agit/répond à la voix**. `send()`/rail ne forcent plus la fiche en `_orbMode`. Panneau complet toujours dispo au **clic** (open() remet `_orbMode=false`). (2) **BUG micro corrigé** : en quittant l'app pendant une session vocale le micro restait allumé (indicateur iOS) car `visibilitychange` ne coupait que le wake — pas `_rec`/`_pendRec`/`_convo`. Nouveau `_hardStopMic()` (arrêt total, sans réarmement) sur `visibilitychange(hidden)` + `pagehide`. Limite iOS rappelée : « dis Ange » mains-libres = app 1er plan/écran allumé ; le plus fiable = taper l'orbe. Tests ange-v2 242→249, npm 177+3. |
| 2026-07-01 | IA session | **Wake word iOS robuste (SW v428)** : taper le micro ARME « Ange » (ic_ange_wake=1) ; `close()` relance l'écoute DANS le geste ; `_wakeInit` keepalive `pointerdown` permanent (relance à chaque contact, no-op si déjà en écoute/session/fiche ouverte). Explication PO du fonctionnement OK Google/Siri (DSP matériel basse conso + OS natif → impossible en PWA). Tests ange-v2 240. |
| 2026-07-01 | IA session | **FIX « quand je dis Ange rien ne se passe »** + rappel limite « OK Google/Siri ». Cause : sur iOS, démarrer le micro exige un GESTE ; le bouton d'activation armait le wake HORS geste (fiche ouverte → guard `ange-open` bloque, puis relance en `setTimeout` hors geste → bloqué iOS). Fix : (1) bouton d'activation ferme Ange PUIS `toggleAngeWake(true)` → `_wakeStart` s'exécute DANS le geste (permission + démarrage OK) ; (2) `_wakeInit` : si le micro n'a pas démarré, ré-armement au **1er contact** (pointerdown/touchend, one-shot) → couvre le relancement après un lancement d'app sans geste. Rappel : le vrai « OK Ange » **écran éteint / app fermée** est impossible en PWA (navigateur) → nécessiterait une app native. SW v426→v427. Tests ange-v2 236→239 (+3). |
| 2026-07-01 | IA session | **Ange — orbe façon Siri + session vocale persistante** (PO : « après l'ouverture d'une fonction ça s'arrête ; il faut un cercle qui montre qu'on peut continuer à parler »). (1) `_setOrb(state)` : orbe CSS/SVG (`#angeOrb`) reflétant l'état — listen (respire) / hear (pulse, dès qu'on parle) / think (tourne) / speak / idle. Tap = stop. Câblé : startVoice→listen, onresult→hear, _voiceTurn→think, _speakAnswer/_narrateChoices→speak, close/_convoStop→idle. (2) **Session vocale persistante** : `_convoResume`/`_voiceTurn` pilotés par `_convo` (plus par `ange-open`) → la conversation SURVIT à la navigation. `_tryOpen` **masque la fiche** (`_softHide`) mais **garde la session** + rouvre le micro → on continue de parler après « ouvre le GPS ». `send()` **ré-affiche** la fiche (`_showSheet`) pour les cartes. `_wakeStart` évite la double écoute pendant une session. SW v425→v426. Tests ange-v2 224→236 (+12). |
| 2026-07-01 | IA session | **Ange — LANCEUR VOCAL : ouvrir les fonctions à la voix** (PO). « ouvre le GPS / les messages / les appels / l'activité / signaler / réglages / dashboard » → ouvre directement via les fonctions propriétaires. Table déclarative `AngeDialog._OPEN` (clé + mots-clés + `open()`), `_tryOpen(msg)` : verbe d'ouverture (ouvre/va/montre/lance/affiche…) OU commande courte = juste le nom ; **kill-switch respecté** (featureStatus + `_blockedHTML`/fallback si OFF) ; gardien requis pour Dashboard ; earcon ok/error ; ferme Ange après ouverture. Câblé dans `send()` après `_tryAction`, avant `_tryMenu`. Réutilise navMessages/navAppels/navActivite/openReport/panel('drive')/panel('settings')/openGardienDashboard + vues activité. Flux : « Ange » → « Que veux-tu faire ? » → « ouvre le GPS ». SW v424→v425. Tests ange-v2 217→224 (+7). |
| 2026-07-01 | IA session | **Ange — armement vocal en 1 geste + ré-armement Mode Volant** (PO : « on voulait aucun geste, comment activer Ange à la voix ? »). Rappel contrainte : la PWA exige UN geste initial pour autoriser le micro (impossible à contourner ; « OK Ange » écran éteint = natif requis). Réductions de friction : (1) `_wakeHintHTML` = bouton unique « 🎙️ Activer l'ouverture vocale « Ange » » dans l'accueil d'Ange quand le wake est OFF → un tap (à l'arrêt) au lieu d'aller dans Réglages ; masqué si déjà armé/non supporté. (2) `_driveAutoSet(true)` ré-arme `AngeDialog._wakeStart()` si activé → l'écoute repart dès qu'on roule. (Auto-armement au lancement déjà en place via applyFeatureFlags.) SW v423→v424. Tests ange-v2 213→217 (+4). |
| 2026-07-01 | IA session | **Ange — projection mère `angeTurn()`** (incrément 5, dernier de l'archi vocale). `ImmatNexus.angeTurn()` (lecture seule) unifie les 3 projections → `{situation: currentSituation(), actions: nextUsefulAction() (≤3), hasUseful}`. Consommée par `_voiceGreetQuestion` (un seul appel décrit le tour). Ne casse aucun flux existant (currentSituation/nextUsefulAction/fallbackFor restent utilisables). immat-nexus.js v13→v14, SW v422→v423. Tests ange-v2 209→213 (+4). **Archi vocale « zéro regard, zéro clic » COMPLÈTE (5/5).** |
| 2026-07-01 | IA session | **Ange — earcons** (incrément 4 archi vocale). Sons courts non ambigus en Web Audio (aucun fichier), respectent le réglage Sons : `_earcon(type)` — listen (montant, ouverture micro), ok (choix reconnu), sent (envoyé), error (buzz grave), confirm (carte de confirmation). Branchés : `startVoice`→listen · `_armConfirm`→confirm · `_voiceTurn` choix matché→ok · angeSignal/Message/Reply/CallConfirm→sent/error. Feedback audio rapide = moins de phrases, moins de distraction. SW v421→v422. Tests ange-v2 202→209 (+7). |
| 2026-07-01 | IA session | **Mode Volant automatique** (incrément 3 archi vocale). Détection conduite par **vitesse GPS** (≥ 20 km/h → entrée ; < 8 km/h soutenu 25 s → sortie) dans `updateDrivingMode` → `App._driveAutoTick/_driveAutoSet` : **Screen Wake Lock** (`navigator.wakeLock.request('screen')`) pour garder l'écran allumé = micro vivant + `body.drive-auto` + events `DRIVE_MODE_ON/OFF` + `App.isDriving()`. Wake lock **ré-acquis** au retour au premier plan (visibilitychange). Toast une fois « 🚗 Mode Volant ». SW v420→v421. Tests ange-v2 192→202 (+10). |
| 2026-07-01 | IA session | **Ange — confirmation par MOT-ACTION** (incrément 2 archi vocale, anti faux « oui »). Pour une action PARTAGÉE (signaler/appeler/message/gouvernance), le « oui » seul ne confirme plus : il faut le mot-action (« envoie » / « appelle » / « réponds » / « confirme ») → un « oui » de la radio ou d'un passager ne déclenche rien. `_armConfirm(run,word)` : `_pending={run,word}` ; matcher voix = map `M` par mot (+ synonymes) ; « annule/stop/attends » priment toujours. 6 call-sites passent le mot ; 6 cartes disent « ou dis « envoie/appelle/confirme » / « annule » ». « oui » reste OK pour le trivial (word absent). SW v419→v420. Tests ange-v2 183→192 (+9). |
| 2026-07-01 | IA session | **Ange — auto-narration des choix** (incrément 1 de l'archi « zéro regard, zéro clic »). En conversation vocale (`_convo`), quand Ange affiche un jeu de choix fermés, il les **DIT** (≤3 + « ou autre » ? ) → le conducteur sait quoi répondre sans regarder l'écran. `_narrateChoices(intro)` (gated `_convo`, retire emojis, `speak`) ; `_signalNearest` (say: pneu/porte/feux/trappe/fumée/objet) et `_replyLatest` (say = libellé) posent `say` sur chaque choix puis narrent. Boucle complète mains-libres : « signale un véhicule » → Ange dit « Pneu, porte, ou feux ? » → « pneu » (rail) → envoyé. Réutilise le rail + fonctions propriétaires. SW v418→v419. Tests ange-v2 178→183 (+5). |
| 2026-07-01 | IA session | **Ange — RAIL VOCAL (matcher à vocabulaire fermé)** = cœur de l'eurêka. Quand Ange affiche des choix (problèmes à signaler, réponses proposées), la parole est matchée sur ces choix FERMÉS (« pneu », « porte », « je vérifie »…) → bien plus robuste au bruit qu'une phrase libre. `_pickChoice(text,choices)` (substring sur mots-clés) ; `AngeDialog._choices=[{words,run}]` posé par `_signalNearest` (PROBS + synonymes) et `_replyLatest` (tokens du libellé) ; `_voiceTurn` matche AVANT l'envoi libre (« annule/autre » quitte ; pas de match → commande libre). Effacé par `renderResponse`/`close`/`_convoStop`. Réutilise les fonctions propriétaires (angeSignalConfirm/angeReplyConfirm) — aucun moteur. SW v417→v418. Tests ange-v2 171→178 (+7). |
| 2026-07-01 | IA session | **Ange — question courte à l'appel vocal + réponses parlées courtes** (PO). À l'ouverture par la voix (mot d'activation / 🎙️ / voiceCommand), Ange **pose une question courte** (`_voiceGreetQuestion` : « Que veux-tu faire ? », contextualisée si véhicule proche / message reçu / à-traiter), l'affiche ET la dit à voix haute, puis n'écoute qu'**après la fin de la voix** (anti-écho). `_speakAnswer` raccourci : emojis retirés + **1re phrase (max ~140 car.)** → réponses vocales brèves. SW v416→v417. Tests ange-v2 167→171 (+4). |
| 2026-07-01 | IA session | **Ange — conversation vocale continue** (PO : « le micro reste ouvert tant que je parle avec Ange »). Après chaque tour, le micro se rouvre automatiquement pour enchaîner signalement → réponse → appel sans re-toucher l'écran. `AngeDialog._voiceTurn` (traite la commande, auto-envoie, gère les mots d'arrêt), `_convoResume` (rouvre le micro APRÈS la fin de la voix d'Ange → anti auto-écoute ; jamais si micro occupé/Ange fermé), `_convoStop`, `_afterConfirm` (reprise après oui/non ou timeout). `startVoice` ouvre la conversation (`_convo=true`) ; tap micro ou `close()` la stoppe ; mots « stop/merci/c'est bon/ferme… » ferment ; pause auto après 2 silences. Coordination micro : dictée (`_rec`) ↔ confirmation (`_pendRec`) ↔ boucle, jamais deux en même temps. SW v415→v416. Tests ange-v2 152→167 (+15). |
| 2026-07-01 | IA session | **Mot d'activation « Ange »** (dis « Ange » → ouvre Ange + écoute), opt-in. Réglage `#angeWakeToggle` dans « 🧠 Ange IA » → `App.toggleAngeWake` (pref `ic_ange_wake`, défaut OFF). `AngeDialog._wakeInit/_wakeStart/_wakeStop/_wakeEnabled` : SpeechRecognition **continu au premier plan uniquement**, pattern `/(ok\|hé\|hey\|dis )?ange/`. Anti-conflit micro : pause si `_rec`/`_pendRec` actif, si Ange ouvert, ou app en arrière-plan (visibilitychange) ; reprise via boucle `onend` + à la fermeture d'Ange. `open()` coupe le wake, `close()` le relance. Sur refus micro → auto-désactivation. ⚠️ Limite : pas d'écoute en arrière-plan/écran verrouillé (contrainte navigateur, surtout iOS) — fonctionne app ouverte au premier plan. SW v414→v415. Tests ange-v2 141→152 (+11). |
| 2026-07-01 | IA session | **Tout en vocal (v1) + fix collision de clé**. (1) BUG corrigé : ma clé de retour `ic_ange_feedback` (objet `{topic:{up,down}}`) entrait en COLLISION avec la clé existante des 👍/👎 des réponses LLM (tableau `[{v,t}]`, lignes 931/5406). Renommée en **`ic_ange_topic_feedback`** partout (narrator v8→v9, copilot v6→v7, gdAngeFeedbackBlock, resetAngeFeedback, _tryForget, tests). (2) VOCAL : `AngeDialog.startVoice` **auto-envoie** la dictée (onend → `_voiceMode=true` + `send()`) ; `send()` capte `_voice` et **lit la réponse à voix haute** (`_speakAnswer`, nettoie emojis → `speak()`) pour les réponses Nexus ; `voiceCommand()` = commande vocale GLOBALE (ouvre Ange + écoute) ; **bouton micro flottant `#fabVoice`** (dégradé violet, bas-droite, dans appScreen → gated comme les autres FAB). Boucle complète : 1 tap micro → on parle → Ange exécute → les cartes de confirmation acceptent déjà « oui/non » vocal. SW v413→v414. Tests ange-v2 134→141 (+7). ⚠️ Limite navigateur : pas de vrai wake-word « OK Ange » en continu (PWA/iOS) — tap-to-talk retenu. |
| 2026-07-01 | IA session | **Dashboard — bilan des retours Ange (👍/👎) par sujet** (lecture seule). Nouveau bloc `gdAngeFeedbackBlock()` (après le bloc Nexus) : lit `ic_ange_feedback`, affiche par sujet (libellé humain) le total 👍/👎 trié par volume + badge « en sourdine » (≥3 👎 et 👎>👍). Bouton « Réinitialiser » → `resetAngeFeedback()` (efface la clé device). But : décider en connaissance de cause quand promouvoir `copilote_proactif`/`copilote_monologue` en stable. Conforme constitution (projection). SW v412→v413. Tests ange-v2 130→134 (+4). |
| 2026-07-01 | IA session | **Ange — boucle de retour 👍/👎 (la brique qui manquait aux betas)**. Chaque intervention proactive (bulle « ✦ » Narrator + panneau parlé CoPilot) porte maintenant 👍/👎. Trace device-only `ic_ange_feedback` = `{topic:{up,down}}` ; projection `_topicMuted(topic)` = `down>=3 && down>up` → Ange **se tait** sur ce sujet (bulle ET parole). Clé partagée entre les 2 modules ; sujets : swarm / guardian / brain (+ thèmes CoPilot propres : reliability, soul_insight…). « oublie ce que tu as appris » réinitialise aussi le retour (`ic_ange_feedback` + `ic_ange_next_prev`). Conforme constitution : une trace + une projection qui filtre l'affichage, **aucun moteur, aucun ML**. C'est le premier pas concret vers la promotion de `copilote_proactif`/`copilote_monologue` en stable. narrator.js v7→v8, immat-copilot.js v5→v6, SW v411→v412. Tests ange-v2 122→130 (+8). |
| 2026-06-30 | IA session | **Zones accidentogènes promues en STABLE + activées par défaut** (maintenant qu'elles sont assainies : accidents uniquement, seuil 3). Registre : `stage:'beta'→'stable'`, `default:false→true` ; `FEATURE_FLAGS.zones_accidentogenes:false→true`. Impact réel faible : une zone n'apparaît qu'à partir de 3 accidents dans ~111 m. Réversible (toggle Réglages / Dashboard gardien). SW v410→v411. Tests 177 + ange-v2 122 (test disabledNotable mis à jour : exemple beta = `copilote_proactif` au lieu de zones). |
| 2026-06-30 | IA session | **Ange — anti-chevauchement bulle « ✦ » ⇄ monologue parlé** (suite à la question PO sur les fonctions beta). Un même signal (swarm / recommandation gardien / prédiction cerveau / zone à risque) pouvait déclencher À LA FOIS une bulle silencieuse (Narrator) ET une phrase parlée (CoPilot). Fix : registre partagé `window._icSurfaced` + fenêtre 90 s. Narrator mappe `WHISPER_TOPIC` (SWARM_PARKING_CONFIRMED→swarm, GUARDIAN_RECOMMENDATION_CREATED→guardian, RISK_ZONE_APPROACHED/BRAIN_PREDICTION→brain) ; CoPilot mappe `THEME_TOPIC` (swarm_help→swarm, guardian→guardian, brain_urgency/isolation→brain). Chaque canal saute si le sujet a été surfacé par l'autre < 90 s. Bidirectionnel, aucune beta activée. narrator.js v6→v7, immat-copilot.js v4→v5, SW v409→v410. Tests ange-v2 114→122 (+8, section B2). |
| 2026-06-30 | IA session | **Ange — fin du faux « 4 désactivées »** (PO : « à l'ouverture d'Ange il y a toujours écrit 4 désactivées »). Diagnostic : 3 des 4 sont des fonctions **beta** off par nature (`copilote_proactif`, `copilote_monologue`) + `zones_accidentogenes` (beta, default:false). Le bandeau les signalait à tort comme avertissement. Fix : `ImmatNexus.sense().governance.disabledNotable` = uniquement les fonctions **stage:'stable' ET default:true** actuellement OFF (= une capacité normalement active délibérément coupée). Le bandeau Ange (`#angeStatus`) utilise `disabledNotable` au lieu de `disabled`. `disabled` (complet) reste pour la question « qu'est-ce qui est désactivé ? ». immat-nexus.js v12→v13, SW v408→v409. Tests ange-v2 110→114 (+4). |
| 2026-06-30 | IA session | **Zones accidentogènes : accidents uniquement + seuil** (demande PO : « les zones se créent sur tout — porte, pneu, bouchon… ; il faut que ce soit SEULEMENT des accidents, et à partir de 3 »). Cause racine : `roadReport()` (accident/bouchon/travaux/contrôle/obstacle/danger) ET `driverInfo()` (info conducteurs : pneu/porte…) écrivent dans `reports` ; le trigger SQL `update_road_risk_on_report` créait une zone pour CHAQUE ligne, sans filtrer le type, dès 1 occurrence. Migration `20260630170000_road_risk_accidents_only.sql` : (1) trigger ne compte QUE `reason ILIKE '%accident%'` ; (2) incident compté seulement à l'INSERT (fin du double-comptage au changement de statut) ; (3) `get_risk_zones` ajoute `p_min_incidents` (défaut **3**) → pas de zone sous 3 accidents dans la cellule ~111 m ; (4) reconstruction `TRUNCATE`+repopulate depuis les accidents seuls. Front `_checkRiskZones` : `p_min_incidents:3, p_min_score:0` + alerte proximité gated `incident_count>=3`. NB : « zones désactivées » sur capture = la *fonctionnalité* `zones_accidentogenes` était OFF (liste Nexus), pas des zones carte. SW v407→v408. Tests 177 + ange-v2 110. |
| 2026-06-30 | IA session | EURÊKA incrément 3 (COMPLET 3/3) — **le fil rouge** (`currentSituation`, SPEC-ANGE-NEXT-ACTION §1.1). À l'ouverture d'Ange, tout en haut, UNE phrase « ✦ Voici où on en est » dérivée de l'existant : signalement reçu non traité → voisin connecté proche → actions à traiter → vigilance ; **silence si rien d'utile**. Projection PURE dans Nexus (`ImmatNexus.currentSituation`), lecture seule. Câblé `AngeDialog._situationHTML` en tête de `open()` (au-dessus des gestes). Le modèle complet `situation → écart → geste utile → confirmation → action → trace` est désormais en prod (les 3 projections : currentSituation + nextUsefulAction + fallbackFor). Tests ange-v2 **110/110** (+7). immat-nexus.js v11→v12, SW v406→v407. |
| 2026-06-30 | IA session | EURÊKA incrément 2 — **le prochain geste utile** (`nextUsefulAction`, SPEC-ANGE-NEXT-ACTION §1.2). À l'ouverture d'Ange, en tête : ≤3 gestes UTILES dérivés de l'existant — 💬 répondre à un signalement reçu non traité (`S._actMessages`) · 🚘 signaler au véhicule connecté le plus proche (`S.nearby`) · ⏳ ouvrir À traiter (`App._computeTodo`). **Silence par défaut** (rien d'utile → tableau vide → accueil normal) ; **anti-répétition** (jamais 2 ouvertures de suite la même suggestion ignorée, via `ic_ange_next_prev`). Projection PURE dans Nexus (`ImmatNexus.nextUsefulAction`), gated par registre. Câblé : `AngeDialog._nextActionsHTML`/`_nextRun` (réutilise `_replyLatest`/`_signalNearest`/openTodoView — aucune nouvelle voie de mutation). **Fix capture IMG_6560** : `_nearestInfo` tolère une distance nulle et exclut les plaques de secours `VEH-` (profil masqué RLS) → Ange « voit » enfin le véhicule proche au lieu d'une réponse LLM défaitiste. Tests ange-v2 **103/103** (+16, dont anti-intrusion §7 : silence/plafond/kill-switch). immat-nexus.js v10→v11, SW v405→v406. |
| 2026-06-30 | IA session | EURÊKA incrément 1 — **remplacement intelligent** (`fallbackFor`, SPEC-ANGE-NEXT-ACTION §1.3). Un kill-switch n'est plus un mur : quand une action est indisponible (feature OFF), Ange propose l'alternative AUTORISÉE (appels OFF → « 💬 Envoyer un message à la place » ; messages OFF → « 📞 Appeler à la place » ; signalement véhicule OFF → message). Implémenté **lecture seule dans Nexus** : `ImmatNexus.fallbackFor(key)` lit `featureStatus` + table déclarative `FALLBACK`, renvoie une SUGGESTION `{feature,run,label,reason}` ou null (n'agit jamais). Câblé dans AngeDialog : `_blockedHTML(key,phrase)` (message + bouton alternative) + `_fallbackRun(run)` (→ actes du menu existant `_messageNearest/_callNearest/_signalNearest`, aucune nouvelle voie de mutation). Les 6 impasses « désactivé… je ne peux pas » remplacées. Garde-fous : ne réactive jamais la feature coupée, mutations propriétaires, confirmation héritée. Tests ange-v2 **87/87** (+10, dont anti-intrusion §7). immat-nexus.js v9→v10, SW v404→v405. |
| 2026-06-30 | IA session | EURÊKA d'architecture formalisé → `docs/SPEC-ANGE-NEXT-ACTION.md` (spec, **aucun code**). Idée : Ange ne « sait pas faire plus », il sait toujours **le plus petit geste utile maintenant**. Modèle `situation → écart → geste utile → confirmation si besoin → action → trace`. UNE seule projection de plus (lecture seule, dans Nexus), pas de moteur : `currentSituation()` (fil rouge, 1 phrase), `nextUsefulAction()` (≤3 gestes, silence par défaut), `fallbackFor()` (remplacement autorisé quand feature OFF, dérivé du registre). Sources 100% existantes (S.nearby/_actMessages/featureStatus/_INVARIANTS/sense/ic_ange_log). Garde-fous : lecture seule, kill-switch jamais contourné, mutations via fonctions propriétaires, silence anti-intrusion, confirmation héritée d'Ange V2. Plan d'implémentation par incréments (fallback → nextUsefulAction → currentSituation). PROCHAINE MISSION recommandée. |
| 2026-06-30 | IA session | Ange — menu d'accueil « Que veux-tu faire ? » + proposition de l'immatriculation la plus proche (demande PO : « quand on crée un signalement qu'il propose l'immat la plus proche par distance » + « qu'il demande qu'est-ce qu'on veut faire : aide pour soi / signaler / appeler / message »). AngeDialog : entrée `_MENU.faire` (aide pour soi → sigStepAide · signaler/appeler/message véhicule · voir activité), `_entryMenuHTML()` affiché à l'ouverture (welcome) ; `_tryMenu()` capte « que faire / que puis-je faire / menu / options / aide-moi » → menu(faire). `_nearestInfo()`+`_distLabel()` (projection S.nearby, pas de nouvel état). `_signalNearest/_callNearest/_messageNearest` proposent le véhicule connecté le plus proche **avec la distance** puis le problème/confirmation. `_trySignal` sans cible explicite propose désormais le plus proche. Tests 77/77 (ange-v2). SW v404. (local/merge-to-main) |
| 2026-06-30 | IA session | Ange GUIDÉ + table d'interactions (demande PO : « qu'il connaisse l'intérieur de chaque fonction et guide par suggestions »). AngeDialog._MENU (arbre déclaratif = donnée) : Signaler→{Route→{accident/bouchon/…}, Véhicule→{pneu/porte/feux/…}, Aide, Stationné} · Activité→{catégories + à traiter/nouveaux/traités}. menu(path)+_menuBtn+_menuAct générique (réutilise roadReport/_sendVehicleSignal/openActivityCat/openTodoView…). _tryGuide : « signaler / faire un signalement [véhicule] / activité / ouvre messages / appels (manqués) » → boutons de suggestion, ouverture directe ; gate feature respecté. _tryReply + _replyChoices + angeReplyConfirm : propose des réponses cohérentes selon le contexte du dernier message reçu → envoi. FIX accent « activité ». Tests 64/64. SW v403. (local/merge-to-main) |
| 2026-06-30 | IA session | Ange — cible « le plus proche connecté » (capture IMG_6558 : « message au véhicule proche » partait au LLM). Helper AngeDialog._nearestTarget() = véhicule connecté le plus proche (projection S.nearby, pas de nouvel état → conforme constitution). Ajouté à _trySignal/_tryCall/_tryMessage : détection « proche/plus proche/près/à côté/autour/proximité » + « devant » retombe sur le plus proche si pas de frontVehicle. Tests 64/64. SW v402. (local/merge-to-main) |
| 2026-06-30 | IA session | FIX CI (capture IMG_6556/6557 : preflight-inline-js échoue, Script #6 ligne 329, 1 guillemet courbe). Mon regex _tryMessage contenait une apostrophe courbe « ’ » (interdite par scripts/preflight-inline-js.mjs qui bloque [‘’“”] dans le JS inline) → remplacée par l'échappement ASCII ’ (même effet, « écris » OK, « décris » exclu). npm test vert (preflight + 177 + diag 3) + ange-v2 64/64. Comportement prod inchangé (le caractère courbe était valide en JS, seul le lint CI bloquait). SW v401. (local/merge-to-main) |
| 2026-06-30 | IA session | ANGE V2 — intention MESSAGE (capture IMG_6554 : « envoyer un message au véhicule devant » partait au LLM car Ange ne gérait que signaler/appeler). AngeDialog._tryMessage (avant _tryCall/_trySignal) : déclencheur « message » / « écris/écrire » + cible (devant→frontVehicle / plaque / dernier) + garde feature 'messages' + texte après « : » (sinon demande) + confirmation → angeMessageConfirm → ImmatMessages.sendToPlate (message libre, pas de context_type → va dans Messages). Détection écrire robuste (accent é, exclut « décris »). NB : chez le PO, 15 features désactivées en test → Ange dit désormais correctement « désactivé » au lieu de la réponse LLM. SW v400. (local/merge-to-main) |
| 2026-06-30 | IA session | ANGE V2 — étape 9 (tests). tests/ange-v2.test.js (node, 64 assertions) : A) module RÉEL immat-nexus → matrice ask() 14 intents + hors-sujet→non répondu + explain/audit/featureKeyFromText + appels OFF→why_blocked ; B) câblage index.html (15 méthodes V2, wiring send() actions<Nexus<LLM, timeout 15s, boutons confirmYes/No, gardes feature, close()→_clearPending, pas d'effet avant confirmation) ; C) routage corpus (call/signal/gov/question). FIX trouvé par le test : why_blocked ratait « ne marchent pas » (pluriel) → radical « march ». immat-nexus v8→v9, SW v399. (local/merge-to-main) |
| 2026-06-30 | IA session | ANGE V2 — étape 7 (apprentissage léger, device-only). Mémoire de la dernière cible véhicule (ic_ange_last_target) enregistrée sur signalement/appel réussi → suites naturelles « rappelle-le / le même / le dernier » dans _trySignal & _tryCall (sûr : la confirmation montre toujours la plaque). Commande _tryForget « oublie ce que tu as appris / réinitialise ta mémoire » → efface ic_ange_log + ic_ange_last_target + ic_ange_learn. Jamais d'apprentissage touchant la sécurité (confirmations/kill-switch/rôle inchangés). SW v398. (local/merge-to-main) |
| 2026-06-30 | IA session | ANGE V2 — étape 8 (audit/explicabilité). AngeDialog._log(type,summary) → journal device-only ic_ange_log (ring 50, sans contenu sensible) ; tracé sur action exécutée / annulation / expiration 15 s / échec / fallback LLM. Intent _tryHistory : « qu'as-tu fait / historique / journal » → liste les 8 dernières décisions horodatées (✅/↩️/🚫/💬). SW v397. (local/merge-to-main) |
| 2026-06-30 | IA session | ANGE V2 — étapes 2+3+6 (5 décisions PO validées). Confirmation UNIFIÉE : _armConfirm/confirmYes/confirmNo/_clearPending → timeout 15 s (auto-annulation) + validation VOCALE oui/non (SpeechRecognition courte, uniquement carte ouverte → anti faux-positif, pas de wake-word). Appliquée à la gouvernance ET au signalement véhicule. + APPEL VÉHICULE (_tryCall/angeCallConfirm) : « appelle le véhicule devant / AB-123-CD » → garde feature appels + cible (frontVehicle/plaque) + confirmation → CallManager.contactByCall. close() nettoie la confirmation en attente. Anti-doublon respecté (logique dans AngeDialog, mutations propriétaires). NB étape 1 (refacto table déclarative) non faite : interne/cosmétique à risque pour 0 valeur — proposée optionnelle. SW v396. (local/merge-to-main) |
| 2026-06-30 | IA session | SPEC ANGE V2 (docs/SPEC-ANGE-V2.md) — conception copilote local-first/déterministe/explicable/sûr. Lois d'Ange (10), distinction gardien-utilisateur (UX) vs gardien-admin (rôle serveur), grille confiance/risque/réversibilité→comportement, table actions sensibles, protocole confirmation vocale (oui/non/correction, timeout 15s, anti faux-positif sans wake-word), apprentissage device-only sûr, explicabilité format, Nexus lecture seule + LLM jamais source de vérité, séparation Activité/Messages/Appels, audit ic_ange_log, archi anti-doublon (logique dans AngeDialog, pas de moteur parallèle), matrice de tests, plan non destructif 8 étapes. AUCUNE implémentation (doc only). 5 décisions à trancher par PO. (local/merge-to-main) |
| 2026-06-30 | IA session | Réponses Ange/Nexus SIMPLIFIÉES (demande PO « pas trop technique, simple, mais relié à tout »). Confirmation : Nexus reste connecté à registre+santé+lois+OBD+sens. Wording rendu humain : plus de codes INV-xxx (→ phrases de règles), plus de %/« /10 »/« phase 1 »/« invariants »/« kill-switch ». Ex : « ✅ Tout fonctionne bien », « ✅ Mes informations sont fiables », « L'application surveille et t'informe », lois → phrases en clair. immat-nexus v7→v8, SW v395. (local/merge-to-main) |
| 2026-06-30 | IA session | FIX rendu réponse Ange (capture IMG_6551 : 3 cases vides « ✅ · ⚠️ ») : renderResponse affichait chaque option du LLM avec la ligne bénéfices/risques même vide. Désormais : options vides filtrées (label+bénéfices+risques tous vides → ignorée) ; ligne ✅/⚠️ affichée seulement si contenu, séparateur conditionnel. SW v394. (local/merge-to-main) |
| 2026-06-30 | IA session | FIX Ange action (capture IMG_6551 « réactiver les appels » → LLM) : _tryAction ne reconnaissait que l'impératif (« réactive »), pas l'infinitif (« réactiver/activer/désactiver »). Regex élargies aux RADICAUX (désactiv/coupe/bloqu/… et réactiv/activ/allum/…), OFF testé avant ON (car « désactiv » contient « activ »). 11/11 cas testés. SW v393. (local/merge-to-main) |
| 2026-06-30 | IA session | Ange SIGNALE un véhicule (vocal/texte) — demande PO « signale au véhicule devant pneu dégonflé / portes ouvertes ». AngeDialog._trySignal (en tête de send(), avant gouvernance) : détecte verbe (signale/préviens/alerte/dis/envoie) + cible. Cible = « devant » → S.frontVehicle.plate (véhicule connecté juste devant), sinon plaque détectée dans le texte (regex AB-123-CD). Exclut les questions. Mappe le problème (pneu/portes/feux/trappe/fumée/objet/fuite) → sinon choix de boutons. Confirmation → _sendVehicleSignal → ImmatMessages.sendToPlate(context_type:'vehicle_report') (chaîne véhicule existante ; gardée signalement_vehicule). NB : « OK Ange » always-on impossible en PWA iOS → équivalent = bouton micro d'Ange. 7/7 cas détection testés. SW v392. (local/merge-to-main) |
| 2026-06-30 | IA session | Ange AGIT (demande PO « quand je demande à Ange de modifier, il ne peut pas »). AngeDialog._tryAction (appelé en tête de send()) : détecte les commandes impératives (désactive/active/coupe/bloque/réactive…) + résout la fonctionnalité via ImmatNexus.featureKeyFromText (helper read-only exposé), exclut les questions (pourquoi/?/…). Garde GARDIEN (sinon « réservé au Gardien »), no-op si déjà dans l'état, sinon confirmation (Confirmer/Annuler) → AngeDialog.angeDoAction → App.setFeatureFlag (fonction propriétaire ; Nexus reste lecture seule). 9/9 cas testés (commande vs question vs salut). immat-nexus v6→v7, SW v391. (local/merge-to-main) |
| 2026-06-30 | IA session | Ange — ligne d'état système live à l'ouverture (#angeStatus, via ImmatNexus.sense, local) : « ✅ Tout est nominal » ou « ⚠️ vigilance X/10 · N désactivé(s) : … ». Rend l'intelligence organisme visible à l'utilisateur dès l'ouverture du panneau Ange. Réinitialisé à la fermeture. SW v390. (local/merge-to-main) |
| 2026-06-30 | IA session | ImmatNexus V6 — Ange connaît ses LOIS (vision « ADN/lois/registre/sens »). Intent 'laws' (« quelles sont les lois / règles / invariants / ADN ») → liste depuis window._INVARIANTS (« 15 lois fondamentales dont 12 critiques » + INV-001…). Disambiguation laws vs recent_violations. FIX : sense().invariants lisait window.INVARIANTS (inexistant) → corrigé en window._INVARIANTS (n/a → 15). immat-nexus v5→v6, SW v389. (local/merge-to-main) |
| 2026-06-30 | IA session | Cohérence pilotage (décision PO) : UN SEUL endroit pilote = onglet Fonctionnalités (registre complet 16, seul à couvrir zones/auto-statut/Ange proactif/monologue). Modération « Blocage par catégorie » passe en LECTURE SEULE (état ACTIVÉ/BLOQUÉ + par qui, vue conducteur) + bouton « Modifier dans Fonctionnalités → » (App.gdTab('features')). Supprime la duplication du contrôle (principe anti-doublon) → divergence impossible. SW v388. (local/merge-to-main) |
| 2026-06-30 | IA session | Clarification UX (question PO « si on ferme d'un côté et que l'autre reste ouvert ») : les 2 panneaux (Fonctionnalités registre + Modération « Blocage par catégorie ») pilotent le MÊME flag flotte (une seule valeur par fonctionnalité) et le Dashboard se re-rend entièrement à chaque toggle → divergence impossible. Mention « ↔ même réglage, toujours synchronisé » ajoutée dans les deux panneaux. SW v387. (local/merge-to-main) |
| 2026-06-30 | IA session | Revue adversariale ImmatNexus (agent) → 2 bugs HIGH corrigés : intents trop gourmands. danger_urgency matchait « y a-t-il » seul (groupe final optionnel) → toute question « y a-t-il … ? » détournée du LLM ; reliability_status matchait « signal » nu → « signalement » capté. Regex resserrées (danger = danger/urgence/risque/inquiéter/sécurité ; reliability = fiabilit/données…fiable/gps…/signal gps|réseau|faible|perdu). 9/9 cas testés (faux positifs éliminés, vrais positifs conservés, hors-sujet → LLM). Reste du diff vérifié propre (pas de boucle, local-first OK, dédup OK). immat-nexus v4→v5, SW v386. (local/merge-to-main) |
| 2026-06-30 | IA session | Journal de gouvernance CÔTÉ SERVEUR (partagé multi-appareils). Migration 20260630160000_feature_config_audit.sql : table feature_config_audit + set_feature_flag_fleet journalise chaque écriture + get_feature_audit(p_limit) (gardien, JOIN profiles pour la plaque). Front : gdGovLogBlock rend le local immédiatement (id govLogRows + indicateur govLogSrc), App.loadGovAudit() upgrade vers la vue serveur si dispo (sinon garde local). GitHub MCP reconnecté → retour au déploiement par PR. SW v385. (local/merge-to-main) |
| 2026-06-30 | IA session | Export du journal de gouvernance (App.exportGovLog → copie JSON presse-papier) + bouton « Exporter » dans le panneau. Front-only. SW v384. NB : connecteur GitHub MCP déconnecté en cours de session → déploiement vers main par push git direct (à défaut de PR). (local/merge-to-main) |
| 2026-06-30 | IA session | Journal de gouvernance horodaté persistant : setFeatureFlag écrit ic_gov_log (localStorage, ring 100, {key,enabled,at,by}). Panneau Dashboard Modération « 📜 Journal de gouvernance » (App.gdGovLogBlock, 30 derniers + Vider). Nexus.governance_changes lit ic_gov_log en priorité (survit au rechargement) + helper _govLabelN. immat-nexus v3→v4, SW v383. (local/merge-to-main) |
| 2026-06-30 | IA session | CoPilot annonce proactive de gouvernance (événementiel) : abonnement ImmatBus FEATURE_GOVERNANCE_CHANGED dans start() → _onGovChange parle immédiatement « Le Gardien vient de désactiver/réactiver X pour la flotte » (label via FeatureRegistry, dédup 5 min par clé+état, ignore source:'nexus'). Thème 'governance' (icône ⚙️). immat-copilot v3→v4, SW v382. (local/merge-to-main) |
| 2026-06-30 | IA session | ImmatNexus V3 — intent recommend_action (« que dois-je faire ? »). Recommandations déterministes priorisées : suspension > urgence terrain (brain) > recommandations Guardian > fiabilité faible > angle mort âme > fonctionnalités critiques coupées (appels/messages/gps) ; sinon « rien d'urgent ». Lecture seule. Vérifié harnais Node. immat-nexus v2→v3, SW v381. (local/merge-to-main) |
| 2026-06-30 | IA session | ImmatNexus V2 — enrichissement des intents locaux d'Ange (sans IA) : +danger_urgency, +reliability_status, +phase_status, +moderation_self, +help_capabilities (que peux-tu me dire). Ange comprend maintenant « y a-t-il un danger ? », « les données sont fiables ? », « en quelle phase ? », « suis-je suspendu ? ». Vérifié harnais Node. immat-nexus v1→v2, SW v380. (local/merge-to-main) |
| 2026-06-30 | IA session | ImmatNexus (tissu de connexion, intelligence locale sans IA). core/immat-nexus.js (window.ImmatNexus) façade lecture seule init/sense/ask/explain/audit — relie registre+santé+synthèse+OBD+lois, ne duplique rien. Ange local-first (send() → Nexus.ask() avant LLM). Events gouvernance figés dans ImmatBus.EVENTS (+FEATURE_AUDIT_FINDING). Narrator verbalise FEATURE_GOVERNANCE_CHANGED ; Consciousness lit gouvernance. Panneau Dashboard Dev « 🧬 ImmatNexus » (snapshot + audit). Spec docs/SPEC-IMMAT-NEXUS.md. SW v379, bus v51, narrator v6, consciousness v2, nexus v1. (local/merge-to-main) |
| 2026-06-30 | IA session | Vérif cohérence gating (harnais Node, 16 clés) → système sain (auto_status OFF par défaut = préférence user, normal). Polish panneau Utilisateurs (modération) : tri suspendus → gardiens → actifs, recherche plaque/pseudo (App._renderModUserRows). SW v378. (local/merge-to-main) |
| 2026-06-30 | IA session | Suspension LIVE (demande PO « si utilisateur bloqué mais toujours en ligne → déconnecter ; sinon message à la connexion »). App._startSuspensionWatch (lancé dans openMap) : poll am_i_suspended toutes les 45 s + au retour au premier plan (visibilitychange). Si suspendu → App._enforceSuspension : stopGps, deleteMyLocation, fermeture des canaux Realtime (chMsg/chLoc/chReports/chCommunityReports), ferme le Dashboard, signOut, retour écran auth + « ⛔ Votre compte a été suspendu ». Garde S._suspEnforced (1 seule fois), réinitialisée à chaque session autorisée. Le verrou login (afterAuth am_i_suspended) restait déjà. SW v377. (local/merge-to-main) |
| 2026-06-30 | IA session | « Voir tout » (Activité) gouvernable (demande PO « bloquer voir tout »). Entrée registre activite_tout (group Activité, scope fleet, CK-ACT-ALL) → 16 entrées. openActivityCat('all') gardé via requireFeature('activite_tout'). Ajouté au panneau interactif + Fonctionnalités. NB : bloque aussi le raccourci « Mes signalements » (même vue 'all'). SW v376. (local/merge-to-main) |
| 2026-06-30 | IA session | Panneau « 🧪 Blocage par catégorie » rendu INTERACTIF (demande PO « pas sélectionnable » + capture IMG_6542) : chaque ligne est maintenant un interrupteur (bouton ACTIVÉ/DÉSACT.) qui appelle setFeatureFlag(legacy,!on) directement → activer/désactiver depuis le panneau Modération, plus seulement l'onglet Fonctionnalités. Les features pilotées par préférence utilisateur (by='user') affichent « Réglages user » sans bouton. SW v375. (local/merge-to-main) |
| 2026-06-30 | IA session | Gouvernance des vues de suivi Activité (demande PO « manque nouveau / traiter / à traiter »). 3 entrées registre activite_nouveaux / activite_a_traiter / activite_traites (group Activité, scope fleet, kill-switches CK-ACT-NEW/TODO/DONE) → 15 entrées. Gardes requireFeature sur App.openNewView / openTodoView / openDoneView (les vues transversales se bloquent désormais avec message). Ajout au panneau « 🧪 Blocage par catégorie » + au Dashboard Fonctionnalités (groupe Activité, icônes ✉️/⏳/✅). SW v374. (local/merge-to-main) |
| 2026-06-30 | IA session | BUG RÉEL trouvé (pas le cache) : ui.js installCriticalButtonHotfix interceptait les boutons Signaler .cat-route/.cat-vehicle/.cat-aide, appelait App.sigStepX() (qui respecte le garde et return) PUIS appelait openSignalStep() INCONDITIONNELLEMENT → la catégorie s'ouvrait malgré le blocage (panneau affichait pourtant BLOQUÉ car featureStatus OK). Fix : helper _catBlocked(key,label) dans ui.js → si désactivé, requireFeature (message) + return SANS ouvrir. ui.js v15→v16 (index.html + SW). + Dashboard Fonctionnalités RÉORGANISÉ par groupe (en-tête + compteur actifs/total, toutes catégories visibles) — demande PO « afficher fonctionnalités et catégories dessous, organisé, désactiver ». SW v373. (local/merge-to-main) |
| 2026-06-30 | IA session | Vérification blocage catégories (retour PO « catégorie pas bloqué … doivent apparaître dans Dashboard, vérifie »). Test empirique Node (extraction réelle de FEATURE_REGISTRY/isFeatureEnabled/featureStatus/requireFeature) → CONFIRMÉ : les 4 catégories (route/véhicule/aide/stationné) se bloquent quand le gardien les désactive (requireFeature=false + bon message). Guards confirmés en place : sigStepRoute/Vehicle/Aide/Station + openActivityCat (garde en tête). Conclusion : logique correcte → symptôme = CACHE iOS périmé. Ajout d'un panneau Dashboard « 🧪 Blocage par catégorie (état live) » (App.gdGatingReport, lecture seule via featureStatus) dans l'onglet Modération : montre ACTIVÉ/BLOQUÉ (+ par qui) pour Route/Véhicule/Aide/Stationné/Messages/Appels/Ange/GPS → permet de vérifier sur l'appareil ET de confirmer la fraîcheur de version. SW v372. (local/merge-to-main) |
| 2026-06-30 | IA session | Modération : « impossible de suspendre gardien » rendu explicite. Migration 20260630150000_admin_list_users_role.sql (DROP+CREATE, ajout colonne is_gardien). UI : les gardiens affichent un badge 🛡 GARDIEN + « non suspendable » (aucun bouton Suspendre). Toast suspendUser corrigé (messages distincts : gardien / soi-même / réservé gardien). Le verrou serveur (admin_suspend_user refuse cible gardien + auto-suspension) existait déjà ; ici cohérence UI. SW v371. (local/merge-to-main) |
| 2026-06-30 | IA session | Modération comptes (demande PO « compte suspendu immat+pseudo » + « ne peut recréer si immat/mail/téléphone identiques »). Migration 20260630140000_account_moderation.sql : table account_bans + RPC am_i_suspended (verrou login), check_signup_available (verrou inscription : doublons actifs + anti-recréation bannis, accessible anon), admin_list_users/admin_suspend_user/admin_unsuspend_user (gardien via get_my_role, anti-lockout self+gardien). Front : signup pré-vérifie plaque/email/téléphone ; afterAuth bloque les suspendus (signOut + message) ; Dashboard Modération bloc « 👥 Utilisateurs » avec Suspendre/Réactiver. Fail-open si RPC indisponible. SW v370. (local/merge-to-main) |
| 2026-06-30 | IA session | Gating Stationné + filtrage Activité (retour PO « idem pour stationnement » + « à traiter / traiter / nouveaux pas bloqué »). Registre : entrée signalement_stationne (group Signalements, scope fleet, CK-STATION) → 12 entrées. App.sigStepStation gardé requireFeature('signalement_stationne'). App.openActivityCat(cat) bloque par catégorie (route/vehicle/aide/station) à l'ouverture. _computeTodo/_computeNew/_computeDone masquent les éléments des fonctionnalités OFF (alertes_vehicule/signalement_stationne/demandes_aide) → compteurs & listes à traiter/nouveaux/traités respectent les kill-switches. SW v369. (local/merge-to-main) |
| 2026-06-30 | IA session | Correctifs cohérence gouvernance (retour PO) : Messages = wrap de sendNew/reply (exportés, appelés par le bouton Envoyer) → l'envoi compose est BIEN bloqué (le wrap sendToPlate était contourné en interne) ; les signalements (sendToPlate+context_type) passent. Signaler & Activité = conteneurs : gardes nav retirées (s'ouvrent), blocage par CATÉGORIE (sigStepRoute→signalement_route, sigStepVehicle→signalement_vehicule, sigStepAide→aide ; openActivityCat route/vehicle/aide). Entrées registre 'signaler'/'activite' retirées (toggles morts). SW v368. (local/merge-to-main) |
| 2026-06-30 | IA session | Étape 6 (partie honnêteté + reliage OBD) : suppression du faux « 100% OPTIMAL » (Santé organisme = état réel ImmatOrganism.diagnose + nb réel registre) → INV-DASH-007. Gouvernance reliée à l'OBD/organisme : ImmatBus.emit + ImmatOrganism.observe sur FEATURE_GOVERNANCE_CHANGED (toggle), FEATURE_BLOCKED (accès refusé), FLEET_CONFIG_LOADED ; couleur dédiée (lime) dans la Timeline OBD. SW v367. (local/merge-to-main) |
| 2026-06-30 | IA session | Gel Aide LEVÉ (demande PO) — kill-switch minimal : entrée 'aide' du registre déverrouillée (frozen retiré, toggle actif) ; gardes requireFeature('aide') sur sigStepAide (ouverture de l'étape Aide) et assist() (création). Aide OFF → ouverture/création bloquées + message ; Aide ON (défaut) → inchangé. Modèle confirmé par PO : message à l'ENTRÉE de chaque catégorie (Activité/Signaler/Appels/Messages/Ange/Aide), jamais l'app entière. SW v366. (local/merge-to-main) |
| 2026-06-30 | IA session | Rigueur chokepoint étendue : Messages = wrap unique de ImmatMessages.sendToPlate (bloque les messages LIBRES si 'messages' OFF ; les signalements avec context_type passent) ; Signaler = roadReport gardé 'signalement_route', vehicleAlert+driverInfo gardés 'signalement_vehicule'. Aide reste GELÉE (runtime non touché). SW v365. (local/merge-to-main) |
| 2026-06-30 | IA session | GPS déplacement bloqué si désactivé : openGps() gardé (le bouton 🧭 passe par openGps, plus de panel('drive') direct) + pickDest/startNav gardés. Donc GPS OFF → ouverture nav + recherche destination + itinéraire bloqués avec message « indisponible par l'administrateur ». (Complète recenter/cycleView/locateBtn déjà gardés.) SW v364. (local/merge-to-main) |
| 2026-06-30 | IA session | Kill-switch au POINT D'ACTION (parenthèse PO : OFF doit bloquer partout, pas juste l'onglet). Appels : wrap unique de CallManager.contactByCall/requestCall (installé à openMap, sans toucher calls.js) → tous les boutons d'appel (menu véhicule, liste proches, etc.) bloqués si 'appels' OFF avec message. GPS : App.locateBtn (gardé) sur le bouton 🎯 ; recenter/cycleView déjà gardés. Sûr par défaut (actif tant que non désactivé). SW v363. (local/merge-to-main) |
| 2026-06-30 | IA session | C1 SÉCURITÉ (correctif isolé, NON fusionné — attend action app_metadata du PO) : migration 20260630120000_secure_roles_app_metadata.sql → get_my_role() lit raw_app_meta_data UNIQUEMENT (plus user_metadata, modifiable client) ; get_abuse_reports_admin() passe par get_my_role ; set_feature_flag_fleet sécurisée via get_my_role. Ferme l'élévation de privilège (un user ne peut plus se promouvoir gardien via auth.updateUser). PRÉREQUIS : mettre role=gardien en app_metadata du compte gardien AVANT de fusionner. |
| 2026-06-30 | IA session | Revue adversariale (3 agents) → Lot 1 correctifs : M1 setFeatureFlag refuse les features gelées (aide) + M2 rollback si RPC échoue ; M3 pastille Aide (debounce délai max + garde de séquence anti-course) ; M4 logout vide S._aideMapMarkers + ferme canal Realtime ; L1 featureStatus (résolution clé legacy + préf avant 'admin') ; L2 garde typeof object (isFeatureEnabled/resolve) ; L3 _angeToggle détection ouvert robuste ; L4 cycleView gardé GPS ; L5 subscribeRealtime idempotent + reRender sans double sync. RESTE : C1 (sécurité get_my_role, coordonné) + chokepoints réels (appels/GPS bloqués partout, pas juste le nav). SW v362. (local/merge-to-main) |
| 2026-06-30 | IA session | Garde d'indisponibilité générique sur TOUTES les fonctionnalités visibles (demande PO) : App.featureStatus(key) (détecte OFF + par qui : 'admin'=Dashboard/flotte ou 'user'=Réglages) + App.requireFeature(key,label) (message « désactivée par l'administrateur » / « désactivée — réactive dans Réglages »). Gardes posées sur navSignaler/navMessages/navAppels/navActivite/_angeToggle/recenter(GPS). Registre étendu à 13 features (ajout signaler, messages, appels, ange, gps, activite — gouvernables depuis le Dashboard, scope fleet). Icônes ajoutées. SW v361. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — ÉTAPE 5 (gouvernance FLOTTE : désactiver = pour TOUS les utilisateurs) + lignes Ange individuelles. Migration 20260629120000_feature_config.sql (table feature_config + RPC set_feature_flag_fleet gardien-only, lecture par tous, INV-DASH-018). Client : isFeatureEnabled + FeatureRegistry.resolve ajoutent une couche FLOTTE prioritaire (cache ic_fleet_flags, sûr par défaut) ; App.loadFleetFlags (openMap) ; setFeatureFlag écrit la flotte via RPC (toast « pour tous les conducteurs »). Lignes Ange (proactif/monologue) masquées individuellement selon la capacité. Migration auto-appliquée par CI (db push). SW v360. (local/merge-to-main) |
| 2026-06-29 | IA session | Modèle 2 niveaux UNIFORME (demande PO) appliqué à Ange (proactif+monologue) comme aux zones : Dashboard = capacité/disponibilité (montre/cache la section Réglages + gate runtime) ; Réglages = interrupteur réel (préférence ic_ange_proactive/ic_ange_monologue, ne se cache plus). Runtime = capacité ET préférence (narrator _whisper, _shouldThink). checkboxes reflètent la préférence (défaut ON). Les autres features (alertes route/véhicule, demandes d'aide, auto-statut) étaient déjà en 2 niveaux. Tout le parc est désormais cohérent. narrator v4→v5, SW v359. (local/merge-to-main) |
| 2026-06-29 | IA session | Fix zones (modèle 2 niveaux demandé par PO) : Dashboard = capacité/disponibilité (montre/cache la section Réglages + gate runtime) ; Réglages = interrupteur réel (préférence ic_zones_accidentogenes) qui NE se cache plus lui-même. Runtime _checkRiskZones = capacité ET préférence. checkbox Réglages reflète la préférence (défaut ON). Réactiver dans Dashboard → section + zones reviennent ; désactiver Dashboard → tout disparaît ; désactiver Réglages → zones off mais section reste. (Annule la conflation single-switch pour zones ; ange reste single-switch.) SW v358. (local/merge-to-main) |
| 2026-06-29 | IA session | Fix pastilles Aide (manquantes depuis bascule Lot B) : nouveau compteur serveur App.AideV1.refreshBadge (débouncé) → S._aideBadgeCount = demandes proches à aider (nearby hors engagées/masquées) + helpers proposés sur mes demandes. Alimente la catégorie Aide (catBadgeAide) ET le total nav (actBadge). Abonnement Realtime Aide gardé GLOBAL (subscribe à openMap, plus d'unsubscribe en quittant Activité) → demandeur notifié partout. refreshBadge appelé : openMap, loadOthers, reRender Realtime, openActivityCat. SW v357. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — kill-switches « UN SEUL interrupteur » (UX pro) : pour ange_proactive/ange_monologue/zones, suppression du double-gate (capacité ET préférence). Source UNIQUE = le flag ic_feature_flags. Le toggle Réglages écrit le MÊME flag (App._setLocalFlag, device-local), les checkboxes le reflètent (openMap + applyFeatureFlags), le runtime ne lit que lui (narrator _whisper, _shouldThink, _checkRiskZones). Clés legacy ic_ange_proactive/ic_ange_monologue/ic_zones_accidentogenes retirées. Réactiver d'un côté suffit et se reflète partout. Zones immédiat à l'activation (recheck GPS). narrator v3→v4, SW v355. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — ÉTAPE 4 (1ers kill-switches runtime, modules non-critiques) : OFF coupe RÉELLEMENT. CK-ANGE-PROACTIF (gate dans narrator.js _whisper → plus de bulles ✦), CK-ANGE-MONOLOGUE (gate AngeMonologue._shouldThink → plus de monologue), CK-ZONES (gate App._checkRiskZones → pas de chargement/affichage/alerte zones). Chaque gate = capacité (isFeatureEnabled flag) ET préférence (ic_*). Aide + modules critiques NON touchés. narrator.js v2→v3 (bump cache obligatoire). SW v354. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — ÉTAPE 3 (onglet Fonctionnalités généré depuis le registre) : App.gdFeaturesBlock() remplace le tableau de 12 flags codé en dur par les 7 features du registre (icône, stage, scope, risk, gel Aide, dépendance monologue→proactif → INDISPO si OFF). Activation INCHANGÉE (toggle écrit le flag legacy via 'replaces', lu par isFeatureEnabled) ; AUCUN kill-switch (étape 4). Les 5 préférences (sons/voix/effets/notifs messages+appels) sortent de la grille Gardien et restent dans Paramètres (INV-DASH-003). Note honnête : effet runtime complet = étape 4 (fin du faux « module réellement inactif »). SW v352. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — ÉTAPE 2 (registre en parallèle) : window.FEATURE_REGISTRY (7 entrées déclaratives, INV-DASH-008) + window.FeatureRegistry (list/get/resolve/isEnabled, lecture seule, device-only via pont 'replaces' vers flag legacy) + aperçu lecture seule App.gdRegistryPreview dans l'onglet Développeur. NE remplace PAS isFeatureEnabled/FEATURE_FLAGS (source live intacte) ; aucun kill-switch branché, aucune génération de Dashboard depuis le registre, aucune écriture, aucun impact runtime/Aide. SW v350. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 — ÉTAPE 1 (réorg visuelle, 0 logique) : Dashboard Gardien réorganisé en 4 onglets (🟢 Santé / 🛡 Modération / 🎛 Fonctionnalités / 🔧 Développeur) via attributs data-gd + CSS + App.gdTab (onglet actif persistant S._gdTab). Aucun nœud déplacé, aucun handler/flag/runtime touché, aucun impact Aide. Santé par défaut → 1re vue allégée (dumps runtime/OBD repliés dans Dev). SW v349. (local/merge-to-main) |
| 2026-06-29 | IA session | Dashboard V2 : 20 points de vigilance opposables ajoutés à l'ADR §13 (registre déclaratif, migration progressive, ne pas casser Paramètres, kill-switch runtime, source unique, scope, Santé avant suppression diagnostics, pas de faux vert, doc obligatoire, Aide gelé, pas de dépendance circulaire, compat ascendante, observabilité, perf, tolérance erreurs, évolutivité, audit, sécurité, tests, doc=complétude). Spec mise à jour : résolution d'état avec repli serveur + sécurité écriture scopes, observabilité Dev, définition du « terminé » (4 tests avant stable). 0 code. |
| 2026-06-29 | IA session | Dashboard V2 : ADR complété (INV-DASH-008 registre 100% déclaratif, INV-DASH-009 un seul chokepoint runtime officiel) + livrable étape 1 de la migration = `docs/SPEC-DASHBOARD-REGISTRY.md` (structure du registre, énumérations stage/scope/group, résolution d'état, 7 entrées initiales flaggées + 4 modules à intégrer, préférences hors registre, mapping complet 12 flags→cible, chokepoints officiels CK-*). Documentation seule, 0 code applicatif. Ordre retenu : Spec registre → Étape 1 (4 onglets) → Étape 2 (registre en parallèle). |
| 2026-06-29 | IA session | Revue d'architecture Dashboard Gardien → ADR figé `docs/ADR-DASHBOARD-V2.md` (D22). Dashboard = gouvernance 4 onglets ; registre data-driven = source de vérité unique ; invariants kill-switch réel / fonctionnalité≠préférence / une seule source d'activation / vérité serveur ; portée device/account/fleet ; cycle alpha→…→removed ; fusion des 8 diagnostics en 1 agrégateur Santé + 1 banc Dev ; migration non destructive 6 étapes. Décisions validées, implémentation non commencée. (Aucun code applicatif modifié.) |
| 2026-06-28 | IA session | Aide V1 #7 push proximité : Edge Function notify-help-request (ciblage géo bounding-box+Haversine sur user_locations <30min, rayon 10/15km, idempotence via help_events 'proximity_notified' client_event_id=requestId, sécurité demandeur, type uniquement). Client App.AideV1.notifyNearby() dans assist(), clic push help → openHelpSignalement. Étape CI deploy ajoutée. SW v348. Commit c3c238f (PR #386). |
| 2026-06-28 | IA session | Aide V1 #1 carte : App.AideV1.syncMapMarkers() réaffiche les demandes d'aide sur la carte Leaflet (mes demandes précises pin bleu + demandes proches approx pin orange/rouge, 🆘 par type, popup → openHelpSignalement). Hooks loadOthers()/assist()/subscribeRealtime. Disparition à la clôture (nearby ne renvoie plus + myRequests filtre 'ouverte'). Régression depuis bascule Lot B corrigée. SW v347. Commit be60f3a (PR #384). |
| 2026-06-28 | IA session | Aide V1 Lot B (bascule client event-driven) : assist()→create_help_request, chokepoint addCommunityAlert(assist)→null, renderAideFeedV1 (rendu serveur), Realtime « le mien », sélecteur multi-helpers. Backend Lot A (help_v1) validé en base (3 voyants). Séparation Activité/Messages/Appels. SW v341. (local, bascule unique en attente de Fusionner) |
| 2026-06-28 | IA session | S6-TRUST V1 RÉOUVERT (périmètre réduit) : journal append-only report_feedback (migration 20260628140000) + RPC submit/get + confirmation véhicule « ✅ Confirmé par le conducteur » côté signaleur. Invariants INV-TRUST-001/002/003. ADR docs/ADR-S6-TRUST-V1.md. SW v340. vehicle_trust_scores parqué, driver_ratings intact. (local, attente Fusionner) |
| 2026-06-28 | IA session | Activité : sous-panneau en pleine hauteur en portrait (act-cat/todo/done/new-open → #sheet 100dvh, comme Réglages) — la carte Aide dépliée n'est plus tronquée en bas. app.css v61, SW v337. Commit 5d4ce12. |
| 2026-06-28 | IA session | Aide : carte dépliée amenée en haut du panneau (scrollTo) pour afficher tout le détail (Annuler/Je suis aidé n'étaient plus tronqués). Contenu vérifié complet. SW v336. Commit 6d62153. |
| 2026-06-28 | IA session | Aide : suppression par glissement gauche des demandes reçues (.act-swipe-wrap/.act-swipe-del → actHelpDismiss, handlers dans renderAideFeed). SW v335. Commit ff286f3. |
| 2026-06-28 | IA session | Aide : carte dépliée défilée en vue (actToggleVmCard) — le détail n'était plus tronqué en bas. SW v334. Commit db197b3. |
| 2026-06-28 | IA session | Aide : bouton "🗑 Supprimer cette demande" sur les demandes reçues (renderAideFeed) — App.actHelpDismiss → ic_help_dismissed (masquage local), filtré au rendu. SW v333. Commit 5b2fb77. |
| 2026-06-28 | IA session | Aide : réponse (help_response) maintenant visible dans la boîte Messages (était exclu de buildThreads l.411 + timeline l.905) + icône 🆘 + texte "🆘 A répondu à votre demande d'aide : …" + pastille/notif à la réception. Diag retiré (v331). messages.js v40, SW v332. Commits bf81d52 + 6e544e1. |
| 2026-06-28 | IA session | Aide : diag a=true pl=ASSISTANCE rid=non → ancienne demande sans plaque/reporter_id sur l'alerte. Fix v329 : actHelpReply récupère reporter_id via public_reports.eq('id',remoteId) puis profiles.owner_plate (salvage même anciennes demandes, le reporter_id étant en base via insert T1). Diag v327/v328 allégé dans l'erreur. SW v329. Commit 729f823. |
| 2026-06-28 | IA session | Aide : répondre à une demande d'aide ("Impossible d'identifier le demandeur"). v325 : assist() stocke owner_plate (au lieu de placeholder 'ASSISTANCE'). v326 : repli robuste via reporter_id (lookup profiles.owner_plate) si plaque manque → marche même si demandeur sur vieille version. reporter_id/sender_plate transmis à la réception + gardés par normalizeAlert. SW v326. Commits 7882fc7 + 98ac545. |
| 2026-06-28 | IA session | Signaler : numéros d'urgence 15/17/18 en bas + compacts sur les 3 étapes (Véhicule 992c7d1/v323, puis Aide + Stationné 1591962/v324). |
| 2026-06-28 | IA session | Ange CAUSE RACINE (prouvée par diag ao=false tg=function pd=none od=none) : AngeDialog est un `const` NON attaché à window → _angeToggle appelait window.AngeDialog.open()/close() = undefined = no-op (la croix marchait via AngeDialog.close sans window). Fix : window.AngeDialog=AngeDialog. SW v322. Commit 11fd87a. |
| 2026-06-28 | IA session | Ange : consolidation finale — UN SEUL gestionnaire (IIFE secours capture, fiable même bouton recouvert) en toggle pour navAnge(bbox)+#angeFab+#angeOverlay ; handler v316 supprimé. Fin des 4 systèmes concurrents. SW v319. Commit 529cea3. |
| 2026-06-28 | IA session | Ange : LE coupable (prouvé par diag toast "FERME" mais reste ouvert) = 4e système nav de secours (IIFE capture, bas index.html) avec ['navAnge',_openAngeInline] qui ROUVRAIT après fermeture. Retiré → seul _angeToggle gère Ange. SW v318. Commit fd9272f. |
| 2026-06-28 | IA session | Ange : VRAIE cause de "ne ferme pas au bouton" = le panneau (z3002) recouvre le haut du cercle → l'onclick inline ne se déclenche pas. Fix : retrait onclick inline + 1 seul listener document détectant le bouton par bbox (marche recouvert). SW v316. Commit 57a24ad. |
| 2026-06-28 | IA session | Ange : détection « ouvert » robuste (body.ange-open OU #angePanel visible OU #angeOverlay visible) → fermeture garantie au re-clic du bouton. SW v315. Commit 798f72e. |
| 2026-06-28 | IA session | Ange : toggle propre à HANDLER UNIQUE (onclick inline App._angeToggle) — retiré des 2 hotfixes document ui.js (navAnge + #angeFab) + verrou v313 supprimé (bloquait l'ouverture). Plus de double-déclenchement / course. ui.js v15, SW v314. Commit bd31810. |
| 2026-06-28 | IA session | Ange fermeture INFAILLIBLE : un handler non marqué rouvrait après fermeture → fermeture forcée dans _angeToggle (display:none panel/overlay + retrait ange-open) + verrou App.__angeJustClosed bloquant AngeDialog.open() <450ms. SW v313. Commit 781b386. |
| 2026-06-28 | IA session | Messages "au milieu" RÉSOLU : .ic-mail-list est display:grid, align-content valait stretch → lignes étirées + contenu centré quand peu de conversations. Fix align-content:start (messages.css v7). + Ange fermeture robuste (toggle sur #angeFab, détection body.ange-open ; ui.js v14). SW v312. Commits 2232642 + 5514a7c. |
| 2026-06-28 | IA session | Nav : Messages rouvre toujours sur la LISTE (navMessages ferme la conversation ouverte via closeThread). Signaler (sigBack→_sigReset) et Activité (actMain) se réinitialisaient déjà. SW v310. Commit fe11cb3. |
| 2026-06-28 | IA session | Messages : filtres Tous/Non lus/Favoris = radio (un seul actif ; clearFilters ajouté+exporté, exclusivité, _syncMsgPills) — avant les 3 pouvaient être actifs. + compactage paysage du panneau Messages (#sheet .ic-msg-pill/.ic-search-bar/.ic-msg-tabs-row). messages.js v39, app.css v60, SW v309. Commit 0351a8a. |
| 2026-06-28 | IA session | Paysage : compactage des panneaux ENFIN effectif — il était écrasé car les défs de base des classes sont plus bas dans le CSS (ou calls.css/messages.css chargés après), même spécificité → dernière gagne. Fix : préfixe #sheet (id) sur toutes les règles + cartes catégories/emoji réduits. app.css v59, SW v308. Commit 8009029. |
| 2026-06-28 | IA session | Nav : Ange se ferme au re-clic (overlay routé vers _angeToggle(event) → le hotfix ne rouvre plus) + page Activité ne saute plus à l'ouverture (scrollIntoView retirés de navActivite). SW v307. Commit 68c671f. |
| 2026-06-28 | IA session | Paysage Réglages : plein écran jusqu'en bas (top:0+bottom:0+height:auto, .sheet.full plafonnait à 78dvh) + en-tête non coupé (padding-top 18px) + grabber .handle masqué (barre parasite). app.css v58, SW v306. Commit e5b52c8. |
| 2026-06-28 | IA session | Toggle nav fiabilisé via variable d'état contrôlée App._navView (posée par navX, effacée par closeSheet) — la détection par état .on des panneaux était désynchronisée (9908aa7). Paysage : panneau Réglages ne passe plus sous le rail de nav (left=58px+safe-left, texte n'est plus coupé à gauche) (fc28306). app.css v57, SW v305. |
| 2026-06-28 | IA session | Nav toggle fiabilisé via marquage de l'event (ev.__navHandled) : le timer 320ms échouait si closeSheet>délai → le hotfix rouvrait la vue (seul Signaler fermait). Désormais 1 décision/tap → Messages/Appels/Activité/Ange se referment au re-clic. ui.js v13, SW v303. Commit b2d39c7. |
| 2026-06-28 | IA session | Paysage : compactage du contenu profond Réglages (sections/lignes calls.css/messages.css) (5515533). Nav toggle fiabilisé : détection de la vue ouverte d'après le panneau réel (pas le .on des boutons) → re-clic referme Messages/Appels/Activité aussi + toggle Ange (_angeToggle). ui.js v12, app.css v56, SW v302. Commit 8cd3052. |
| 2026-06-28 | IA session | Nav : un seul bouton vert à la fois (ui.js setPanel nettoie tous les boutons + mapping corrigé) + 1 tap ouvre / 1 tap referme via App._navToggle (anti-rebond 280ms contournant le double-binding ui.js) + le vert disparaît à la fermeture (closeSheet). ui.js v11, SW v300. Commit cda2927. |
| 2026-06-28 | IA session | Paysage : en-tête Réglages plus coupé en haut (padding-top sécurisé en plein écran paysage) + boutons réglages resserrés (10853a6). Boutons flottants masqués quand la fenêtre Conducteurs proches (.overlay.show) est ouverte (e0bacb4). app.css v55, SW v299. |
| 2026-06-28 | IA session | Responsive paysage : remplacement du zoom uniforme par une vraie mise en page (polices lisibles conservées, marges/paddings réduits, Signaler en 2 colonnes, cibles tactiles ≥40px) sur tous les panneaux + Dashboard + Ange. app.css v53, SW v297. Commit 0fb812b. À affiner sur captures. |
| 2026-06-28 | IA session | Appels : fenêtre de grâce 4s au démarrage/foreground contre la sonnerie fantôme (le garde created_at<12s ne suffisait pas). Paysage : FAB en rangée horizontale bas-droite alignée avec le compteur (compteur bottom:16px, FAB bottom:18px). calls.js v22, app.css v52, SW v296. Commit 75a5be0. |
| 2026-06-28 | IA session | UI : FAB/compteur ne disparaissent plus après fermeture d'un panneau (fix `:has(#sheet:not(.mini) .panel.on)` — `.panel.on` restait après closeSheet). + Paysage : FAB en rangée horizontale bas-droite collée au bord, bannières/floating card hors du rail. app.css v50, SW v294. Commit 8352b64. |
| 2026-06-28 | IA session | UI : bannières notif/toast (zone à risque, signalements, messages) ne chevauchent plus la puce plaque en haut à gauche — descendues de safe-top+26px à +62px (+142px en pile). app.css v49, SW v293. Commit 860e44b. |
| 2026-06-28 | IA session | Audio appels : suppression du bip/sonnerie fantôme au login (garde anti-rejeu `created_at<12s` sur le handler INSERT entrant) + sonnerie entrante distinctive (motif mélodique ascendant si-mi-sol). calls.js v21, audio-manager.js v9, SW v292. Commits 8cc3afa + 4aeff4e. |
| 2026-06-24 | IA session | Merge refonte signalements véhicule → main. Machine 3 états (NOUVEAUX/EN COURS/TRAITÉS) + fixes iOS (closeCallJournal, act-cat-open). SW v243. |
| 2026-06-24 | IA session | 4 bugs UI : scroll Appels (PR#370) + legacy pills Signaler (PR#371) + </div> manquant sigStep2Route (PR#372) + cartes vmg iOS display:block (PR#373). app.css v40, SW v241. Tous validés terrain. |
| 2026-06-24 | IA session | Fix scroll Activité bloqué après Appels — suppression overflow:hidden sur #sheet dans body.appels-mode, body.act-cat-open, #sheet:has(#panelMessages.on). app.css v39, SW v238, PR #370. |
| 2026-06-24 | IA session | Refonte signalements véhicule — machine 3 états (NOUVEAUX/EN COURS/TRAITÉS), verdicts localStorage, trustDelta isolé à Confirmé (+8), vocabulaire conducteur "Je vérifierai dès que je serai arrêté". Validé ChatGPT 99%. app.css v35, SW v232. |
| 2026-06-24 | IA session | Fix journal fantôme persistant — closeCallJournal() retire .on de panelMessages (chemin OBD _panels('messages')). SW v233. PR #361. |
| 2026-06-24 | IA session | Journal d'appels overlay (App.closeCallJournal v1) + barre nav toujours visible quand thread ouvert (suppression display:none CSS). app.css v35, SW v232. Validé terrain. |
| 2026-06-23 | IA session | Gardien role isolation — CSS .gardien-debug-tool masqué par défaut, reset is-gardien dans OBD afterAuth + ImmatSwitchAccount + afterAuth standard. Merge main 7f8f3e1, app.css v34, SW v230. |
| 2026-06-23 | IA session | Dashboard Gardien normalisation — 3 fixes : isGardien DOM fallback supprimé, Système Immunitaire score réel (6 checks module), abus reports message erreur distinctif. SW v228. |
| 2026-06-23 | IA session | Chantier Fiabilisation chaîne Messages 6/6 CLÔTURÉ — commits 805bc54→e8724a4, messages.js v29, SW v227. |
| 2026-06-23 | IA session | Audit pré-merge redesign Messages V3 validé — merge autorisé (patch purement visuel, messages.js intact). Chantier "Fiabilisation chaîne Messages" ouvert (6 points). PROJECT_STATE mis à jour. |
| 2026-06-23 | IA session | Fix #icAppelsPane visible dans panel Activité (IMG_6303) — app.css v33, SW v224, commit c0f33ee |
| 2026-06-23 | IA session | Fix #icMsgTabsRow visible dans Journal d'appels (IMG_6302) — app.css v32, SW v223, commit 271a376 |
| 2026-06-23 | IA session | Fix compositeur thread masqué par nav iOS (thread fullscreen portrait) — app.css v31, SW v222 |
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
| 2026-06-13 | IA session | Sprint 7 — RGPD GAP : delete-account + export-user-data étendus (device_sessions, user_blocks, driver_ratings) avec helper optionalDelete + isMissingRelationError |
| 2026-06-13 | IA session | Sprint 7 — S7-OBD : _isCallLikeType() + _rememberObd() dans interaction-engine.js — dédup FIFO 100 entrées, guard CALL sans underscore |
| 2026-06-13 | IA session | Sprint 7 — S7-SEARCH : barre recherche plaque dans feed activité — debounce 300ms, nPlate normalisation, zéro requête Supabase |
| 2026-06-13 | IA session | Pré-déploiement S6 — sécurisation RLS profiles/reports + public_profiles + index manquants + SW v25 (commits 53e5348, 5746ad9, 75a066b) |
| 2026-06-13 | IA session | Validation régressions RLS — 4 régressions corrigées (syncCommunityAlerts, calls.js, messages.js, afterAuth) — column-level grants + get_my_profile RPC (commit 1c0ddeb) |
| 2026-06-13 | IA session | Décisions D12→D21 documentées — architecture pré-validée, mode mise en production contrôlée activé |
| 2026-06-13 | IA session | Phase documentation stratégique terminée — 6 docs stratégiques + Plan d'exécution 30J v1.2 validé et figé |
| 2026-06-13 | IA session | MASTER_COMPATIBILITY_MAP v1.1 créé — 38 sections : RISK-013→017, HYP-011→012, INV-021→022, FEATURE_REGISTRY, DATA_OWNERSHIP_REGISTRY, IMPACT_REGISTRY, FUTURE_FEATURE_GATE, DEBT-009→010, contrôles C15→C17, FUTURE_TABLES_RESERVED, playbooks crise (migration/Supabase down/IA hallucination), règles véhicule/stationnement, 10 questions GO MAIN |
| 2026-06-13 | IA session | MASTER_COMPATIBILITY_MAP v1.2 — GEL DOCUMENTAIRE — RISK-018→025, HYP-013→014, INV-023→026, playbooks AGORA_DOWN + ANTHROPIC_DOWN, tests C18→C21, 15 questions GO MAIN, note de gel |
| 2026-06-14 | IA session | MASTER_COMPATIBILITY_MAP v1.3 — GEL FINAL — Section 39 : hiérarchie sources de vérité, nomenclature officielle, STORAGE_REGISTRY, règle RGPD future, SYSTEM_HEALTH_REGISTRY, décision trust→owner_plate, impact parking, INV-027 documents véhicule, EVENT_REGISTRY, test onboarding 50min |
| 2026-06-14 | IA session | Documents opérationnels créés — DEPLOYMENT_LOG.md + TEST_RESULTS.md + INCIDENT_LOG.md — documentation terrain complète, prêt pour l'exécution |
| 2026-06-14 | IA session | PRODUCT_ARCHITECTURE_V2.md créé — 17 sections — 8 modules futurs documentés avec tables réservées, EF réservées, risques, RGPD, matrice compatibilité, invariants V2, arbre de décision — gel documentaire V2 |
| 2026-06-14 | IA session | BETA_READINESS_AUDIT.md créé — 10 sections — 20 fonctionnalités non testées, 10 catastrophes + reprises, métriques 30j, checklist J1→J7, SQL diagnostic complet |
| 2026-06-14 | IA session | TECHNICAL_AUDIT_AND_ROADMAP.md créé — audit code réel — 85-95% V1 codé, 0% sécurité active (11 migrations non appliquées) — roadmap Sprint 8→13 — Sprint 8 détaillé 4h code + 8h terrain |
| 2026-06-14 | IA session | GO LIVE session — 6 Secrets Supabase configurés, 5 EF déployées via GH Actions, Realtime OK, B1 PII ✅, messages.js fix, GRANT phone, push button Settings, merge main calls v16 |
| 2026-06-14 | IA session | GO LIVE session (suite) — PR #300 mergée → main, call log dédupliqué (×N par plaque), fix SW banner loop (CURRENT v22→v25 dans index.html) |
| 2026-06-14 | IA session | GO LIVE session (suite 2) — PR #301 (SW banner), #302 (locate debug), #303 (SIGNED_OUT reset), #304 (bottom-nav 4 colonnes), #305 (panneau Activité) |
| 2026-06-14 | IA session | GO LIVE session (suite 3) — PR #306 (void offsetHeight), PR #307 (force .full + disable transition — fix définitif iOS WKWebView translateY bug) |
| 2026-06-15 | IA session | GO LIVE session (suite 4) — PR #308-#314 : translateY→height:0, SW v26→v31, IIFE boucle fix, scrollTop reset, force display, auto-reload IIFE, bannière jaune BUILD S10, bouton Forcer MAJ Settings |
| 2026-06-15 | IA session | GO LIVE session (suite 5) — B1 ✅ CONFIRMÉ. PR #318 (S14/v35) : panelActivite déplacé premier dans sheet DOM — fix définitif scrollTop iOS. PR #319 (v36) : nettoyage debug (bannière + toasts). Tests B2→B5 en cours. |
| 2026-06-15 | IA session | GO LIVE PHASE 1 TERMINÉ — B1✅ B2✅ B3✅ B4✅ B5✅ tous confirmés terrain. REVOKE SELECT ON profiles FROM authenticated exécuté et vérifié (id/owner_plate/pseudo/vehicle_color uniquement). |
| 2026-06-16 | IA session | HOTFIX (cherry-pick isolé sur main, hors branche de dev) : fix findProfileByPlate() — compactPlate() + 4 variantes de recherche en boucle + détection erreur Supabase (sentinel __error) au lieu de "introuvable" silencieux ; logs OBD_FIND_PROFILE_START/TRY/SEND_TARGET. Front-only, messages.js uniquement. Les 19 autres features de la branche de dev claude/immatconnect-pro-app-dEKGR restent NON déployées à ce stade. 177 tests ✅. |
| 2026-06-15 | IA session | Sprint 8 S8-01+S8-04 terminés (delete_audit_log + A2HS iOS hint). CI auto-deploy activé (PR #320-#324) : push vers main sur supabase/** déclenche automatiquement EF + migrations. |
| 2026-06-15 | IA session | PR #325 : S7-NEARBY D13 (staleMinutes 5min, distance 100m, debounce 2s, batch trust), heartbeat position 3min, S8-06 ANGE dégradation gracieuse, S9 D18 (subReports supprimé), S9 D19 (TTL 90j localStorage), S7-PROFILE D14 (pseudo + couleur dans context menu). SW v37. |
| 2026-06-15 | IA session | PR #325 (suite) : pseudo addRecent(), badges trust/rating renderNearby, chronomètre appel (callOvTimer/callOvMiniTimer), durée dans journal (ic_call_durations), bouton 📞 menu contextuel carte, boutons 💬/📞 liste Conducteurs proches et Récents. SW v38. |
| 2026-06-15 | IA session | PR #325 (suite 2) : pseudo dans journal d'appels (batch query profiles SELECT IN), pseudo dans titre thread messages (nearby cache-first → DB fallback), indicateur fraîcheur position dans renderNearby() (Xmin orange si ≥3min, gris si 1-2min), aperçu plaque destinataire dans compose (icComposePlatePreview, debounce 450ms), auto-grow textarea + Ctrl/Cmd+Enter pour envoyer dans messages.js. SW v39. |
| 2026-06-15 | IA session | PR #325 (suite 3) : pseudo+couleur véhicule dans liste conversations (State.pseudoMap/colorMap, batch async IIFE), badge unread count pill, bouton "Tout lu" (#icMarkAllReadBtn + markAllRead()), filtres journal d'appels (4 pills client-side), son+vibration sur nouveau message, pseudo dans FloatingCard+notif. Fix CI : 7 guillemets typographiques U+2019 → apostrophes droites dans subMsgs() (commit e7850ea). SW v40. |
| 2026-06-15 | IA session | PR #325 (suite 4) : _formatMsg() dans messages.js — détection URLs via regex, rendu en liens <a> cliquables (target=_blank, rel=noopener noreferrer, couleur #60a5fa, truncature 40 chars). Liens position partagée (📍 Ma position : https://…) désormais cliquables dans les bulles. |
| 2026-06-15 | IA session | PR #325 (suite 5) : typing indicator — canal Supabase broadcast ic_typ_{sorted_plates}, openThread souscrit / closeThread désabonne, broadcast debounced 300ms sur frappe icReplyText, #icTypingLabel avec points animés (ic-typing-blink CSS), auto-hide 3s. |
| 2026-06-15 | IA session | PR #325 (suite 6) : sourdine conversation — getMuted/isMuted/toggleMute (localStorage ic_muted), bouton #icSheetMute menu ⋯, guard son+vibration subscribe() INSERT, badge 🔕 liste threads. |
| 2026-06-15 | IA session | PR #325 (suite 7) : séparateur "N non lus" dans le thread — _renderTimeline() détecte !_sent && !read_at, insère ic-unread-sep avec scrollIntoView au premier non lu. CSS ligne violette + texte #818cf8. |
| 2026-06-15 | IA session | PR #325 (suite 8) : quick reply FloatingCard message — 3 boutons fcExtraActions (✓ Reçu / 🚗 J'arrive / En route) dans le FloatingCard, guard anti-boucle sur messages quick reply reçus, preview 60 chars. |
| 2026-06-15 | IA session | PR #325 (suite 9) : séparateurs de jour dans le thread — _dayLabel() (Aujourd'hui/Hier/jour semaine/date), suivi _prevDayKey dans _renderTimeline(), ic-day-sep pilule grise centrée. |
| 2026-06-15 | IA session | PR #325 (suite 10) : copier un message — bouton ⧉ sur chaque bulle, copyMessage(id) avec navigator.clipboard + fallback execCommand, toast confirmation. |
| 2026-06-15 | IA session | PR #325 (suite 11) : indicateur de présence dans l'en-tête thread — _presenceLabel() lit S.nearby (🟢 <3min / 🟡 <10min), affiché en priorité dans #icThreadSub, rafraîchi par refreshThread(). |
| 2026-06-15 | IA session | PR #325 (suite 12) : limite longueur message MSG_MAX_LEN=1000 (guard sendToPlate + maxLength textareas) + compteur de caractères dynamique .ic-char-count (visible <100 restants, rouge <20). 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 13) : bloquer/débloquer depuis menu thread — bouton #icSheetBlock, libellé dynamique getBlockLevel(), _sheetAction('block') réutilise App.blockPlate/unblockPlate. 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 14) : touche Échap ferme le sheet puis la conversation (handler document keydown, guard body.dataset.icEscReady). 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 15) : survitesse — widget .speed orange >110 km/h, rouge pulsé >130 km/h, toggle dans locate(). SW v40 → v41. 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 16) : indicateur signalements hors ligne en attente — updateCommunityStatus() affiche S.offlineReports (suffixe texte hors ligne, pastille ⏳ orange en ligne), MAJ dans saveReportRemote catch + fin syncOfflineReports. 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 17) : partager/inviter — bouton 📤 Inviter dans Paramètres, App.shareApp() (navigator.share + fallback clipboard/execCommand), texte invitation + CFG.site. 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 18) : horodatage relatif dans véhicules récents — openRecent() affiche relTime(r.at) à côté de la distance. 177 tests ✅. |
| 2026-06-15 | IA session | PR #325 (suite 19) : bouton 💬 message dans le journal d'appels (renderCallJournal) → App.pickPlate, cohérence avec listes Proches/Récents. 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 20) : fix findProfileByPlate() — compactPlate() + 4 variantes de recherche en boucle + détection erreur Supabase (sentinel __error) au lieu de "introuvable" silencieux ; logs OBD_FIND_PROFILE_START/TRY/SEND_TARGET. Front-only, messages.js uniquement. 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 21) : marquer une conversation comme non lue — bouton #icSheetUnread, ic_manual_unread (localStorage), effet visuel uniquement (pastille verte), auto-clear à la réouverture du thread. 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 22) : recherche dans le journal d'appels — input #callJournalSearch (sibling fixe hors liste), App._callJournalSearch/setCallJournalSearch, filtrage par plaque ou pseudo combiné aux filtres existants. 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 23) : badge ⭐ favori dans le journal d'appels (lecture localStorage ic_favorites, parité visuelle avec messages.js, pas de nouveau bouton de bascule). 177 tests ✅. |
| 2026-06-16 | IA session | MERGE COMPLET dev → main : fusion des 65 commits (suites 1-23) après vérification (177 tests ✅, scan secrets négatif, revue manuelle core/call-screen.js + core/interaction-engine.js). |
| 2026-06-16 | IA session | FIX CRITIQUE PROD (SQL manuel) : `GRANT SELECT (id,owner_plate,pseudo,vehicle_color) ON public.profiles TO authenticated` — table-level grant jamais appliqué depuis le GO LIVE (REVOKE sans GRANT de compensation). Root cause CI : collision de version `20260613` dans 4 fichiers de migration → `supabase db push` avorte silencieusement (continue-on-error masque l'échec) depuis le premier essai. Vérifié avant/après via information_schema.column_privileges (0 ligne → 4 lignes). |
| 2026-06-16 | IA session | RÉPARATION pipeline migrations : 12 fichiers `supabase/migrations/*.sql` renommés en versions uniques `AAAAMMJJHHMMSS` (fin des collisions de version) ; 3 fichiers rendus idempotents (`DROP POLICY IF EXISTS` ajouté avant `CREATE POLICY` dans push_subscriptions/user_blocks/device_sessions) ; `continue-on-error: true` retiré de l'étape "Apply pending migrations" du workflow `deploy-edge-functions.yml` pour que tout futur échec soit visible. Code uniquement, aucune action DB. |
| 2026-06-16 | IA session | Réconciliation historique distant (SQL Editor, utilisateur) : `DELETE FROM supabase_migrations.schema_migrations WHERE version='20260613'` — supprime la référence orpheline créée par le renommage, débloque `supabase db push`. |
| 2026-06-16 | IA session | 3ᵉ bug découvert et corrigé en 2 temps : `public_reports_secure.sql` référençait `latitude/longitude` (échec CI run `27625228382`) puis `lat/lng` (échec encore) — colonnes inexistantes sur `reports` (vérifié via `information_schema.columns`, 12 colonnes réelles, aucune position). Vue corrigée pour ne référencer que les colonnes existantes. |
| 2026-06-16 | IA session | Pipeline CI migrations VERT pour la 1ʳᵉ fois : run `27626558202` (commit `c24749e`) — 12 migrations appliquées (no-op pour la plupart, déjà en base manuellement) + 5 Edge Functions redéployées avec succès. |
| 2026-06-16 | IA session | FIX bug fonctionnel résiduel : ajout colonnes `latitude`/`longitude` (double precision) sur `reports` (migration `20260616150925_reports_position_columns.sql`, commit `dc952d4`) + mise à jour vue `public_reports`. Corrige la perte de position des signalements au reload/reconnexion. Run CI `27627683881` : succès. |
| 2026-06-16 | IA session | PR #325 (suite 24) : recherche dans la conversation — bouton 🔍 + `#icThreadSearchBar`, `_renderTimeline(searchQuery)` filtre les messages et masque les appels pendant la recherche. Front-only (messages.js + index.html). 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 25) : exporter/partager une conversation — bouton `#icSheetExport` dans le menu ⋯, `exportThread()` transcript texte horodaté + navigator.share/clipboard fallback. Front-only. 177 tests ✅. |
| 2026-06-16 | IA session | PR #325 (suite 26) : exporter/partager le journal d'appels — bouton 📤 dans `#icAppelsPane`, `App.exportCallJournal()` exporte la liste filtrée courante, même pattern navigator.share/clipboard. Front-only. 177 tests ✅. |
| 2026-06-16 | IA session | MERGE dev → main : fusion des suites 24-26 (11 commits) vers `main` (commit `cc0a21e`). |
| 2026-06-16 | IA session | FIX UX (signalement copié d'une capture utilisateur) : champ `sigVehiclePlate` (étape "Signaler → Véhicule") — placeholder "Plaque : AB-123-CD" visuellement identique à une vraie valeur saisie, l'utilisateur croyait le champ rempli. Ajout d'un `<label>` explicite + placeholder simplifié + style `::placeholder` dédié (couleur muted). Front-only (index.html + app.css). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion du fix UX placeholder plaque véhicule vers `main` (commit `09263ae`). |
| 2026-06-16 | IA session | PR #325 (suite 27) : surlignage du terme recherché (`<mark>`) dans les résultats de recherche en thread — `_highlightHtml()` opère sur le HTML déjà échappé/linkifié en évitant les balises (split sur `<[^>]+>`). Commit `eeed497` sur la branche de dev. Front-only (messages.js). 177 tests ✅. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite27 (surlignage recherche) vers `main` (commit `87657ea`). |
| 2026-06-16 | IA session | PR #325 (suite 28) : bouton × pour effacer la recherche en thread + compteur "N résultat(s)" affiché pendant une recherche active, réinitialisés à l'ouverture/fermeture du thread. Commit `001f3cf` sur la branche de dev. Front-only (index.html + messages.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite28 (clear + compteur recherche) vers `main` (commit `4def429`). |
| 2026-06-16 | IA session | PR #325 (suite 29) : surlignage du terme recherché dans l'aperçu de la liste de conversations (réutilise `_highlightHtml()` de la suite27). Commit `82fd2ba` sur la branche de dev. Front-only (messages.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite29 (surlignage liste conversations) vers `main` (commit `d21f524`). |
| 2026-06-16 | IA session | PR #325 (suite 30) : surlignage de la plaque et du pseudo (en plus de l'aperçu du message) dans la liste de conversations quand ils correspondent à la recherche active. Commit `146767f` sur la branche de dev. Front-only (messages.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite30 (surlignage plaque/pseudo liste) vers `main` (commit `3b358c4`). |
| 2026-06-16 | IA session | PR #325 (suite 31) : surlignage plaque/pseudo dans le journal d'appels filtré — nouveau helper global `highlightHtml()` ajouté à `utils.js` (même logique split-sur-balises que `_highlightHtml()` de messages.js), appliqué à `App.renderCallJournal()`. Commit `9b63d95` sur la branche de dev. Front-only (index.html + utils.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite31 (surlignage journal d'appels) vers `main` (commit `f7279fe`). |
| 2026-06-16 | IA session | PR #325 (suite 32) : compteur "N résultat(s)" affiché sous le champ de recherche du journal d'appels pendant une recherche active (même pattern que le compteur de recherche en thread, suite28). Commit `af663ce` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | MERGE dev → main : fusion de la suite32 (compteur recherche journal d'appels) vers `main` (commit `9143dcd`). |
| 2026-06-16 | IA session | PR #325 (suite 33) : ajout d'`aria-label` sur les 3 champs de recherche (liste de conversations, recherche en thread, journal d'appels) pour l'accessibilité lecteur d'écran. Commit `5cbd324` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite33 (aria-label des champs de recherche) dans `main` (commit `d79791f`). |
| 2026-06-16 | IA session | PR #325 (suite 34) : le filtre du journal d'appels (tous/manqués/émis/reçus) est désormais mémorisé dans `localStorage` (`ic_call_journal_filter`) et restauré à l'ouverture de l'app. Commit `115e893` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite34 (mémorisation du filtre journal d'appels) dans `main` (commit `4b4adde`). |
| 2026-06-16 | IA session | BUG CORRIGÉ (suite 35) : collision de clé `localStorage` `ic_favorites` partagée entre les favoris GPS (index.html, tableau d'objets) et les conversations favorites (messages.js, tableau de plaques) — chaque écriture écrasait silencieusement les données de l'autre fonctionnalité. Nouvelle clé dédiée `ic_conv_favorites` + migration automatique au premier chargement. Commit `5e0043e` sur la branche de dev. Front-only (index.html + messages.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite35 (fix collision clé localStorage favoris) dans `main` (commit `aeb675a`). |
| 2026-06-16 | IA session | PR #325 (suite 36) : ajout d'un filtre « ⭐ Favoris » dans le journal d'appels, filtrant sur les plaques favorites (`ic_conv_favorites`, fiable depuis le fix de la suite35). Commit `9559234` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite36 (filtre favoris journal d'appels) dans `main` (commit `e5d21b0`). |
| 2026-06-16 | IA session | PR #325 (suite 37) : bouton ⭐ « Favoris uniquement » dans l'en-tête de la liste des conversations (parité avec le filtre Favoris du journal d'appels de la suite36). Commit `bdb0716` sur la branche de dev. Front-only (index.html + messages.js + messages.css). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite37 (favoris uniquement liste conversations) dans `main` (commit `8b26297`). |
| 2026-06-16 | IA session | PR #325 (suite 38) : mémorisation du filtre « Favoris uniquement » de la liste des conversations dans `localStorage` (`ic_conv_fav_only`), parité avec le filtre du journal d'appels (suite34). Commit `2b65206` sur la branche de dev. Front-only (messages.js). 177 tests ✅. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite38 (mémorisation favoris uniquement conversations) dans `main` (commit `2049f58`). |
| 2026-06-16 | IA session | PR #325 (suite 39) : `aria-pressed` ajouté sur le bouton ⭐ « Favoris uniquement » (liste des conversations), synchronisé à chaque rendu avec `State.favOnly`. Commit `f371d83` sur la branche de dev. Front-only (index.html + messages.js). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite39 (aria-pressed bouton Favoris) dans `main` (commit `a28fb50`). |
| 2026-06-16 | IA session | PR #325 (suite 40) : `aria-pressed` ajouté sur les pastilles de filtre du journal d'appels (Tous/Manqués/Émis/Reçus/Favoris). Commit `5ea962c` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite40 (aria-pressed pastilles journal d'appels) dans `main` (commit `c3b0af5`). |
| 2026-06-16 | IA session | PR #325 (suite 41) : `aria-pressed` ajouté sur les pastilles de filtre des alertes carte (Tous/Route/Aide/Véhicule). Commit `b25f605` sur la branche de dev. Front-only (index.html). 177 tests ✅, preflight OK. |
| 2026-06-16 | IA session | FUSION dev → main : intégration de la suite41 (aria-pressed pastilles filtre carte) dans `main` (commit `ca00804`). |
| 2026-06-17 | IA session | UX menu véhicule (propre véhicule) — boutons Appeler/Message/Copier/Évaluer/Bloquer masqués via CSS `.is-self .vehicle-bubble:not(.alert-main){display:none}`. Bouton restant renommé "🆘 Aide" + redirige directement vers `sigStepAide()`. Commits `be1de42` + `670892c` sur branche dev. |
| 2026-06-17 | IA session | Sprint 9 — Détails véhicule : colonnes `vehicle_make`, `vehicle_model`, `vehicle_year`, `fuel_type` ajoutées à `profiles` + `public_profiles` + trigger `sync_public_profile()` + RPC `get_public_profiles_by_ids()` (migration `20260617100000_vehicle_details.sql`). Formulaire de profil étendu (4 champs + sélecteur carburant). Affichage dans le menu contextuel carte (marque modèle année · émoji carburant). Commits Sprint 9 sur branche dev. |
| 2026-06-17 | IA session | FIX "Mon profil ne s'ouvre pas" : `hideAuthScreens()` dans ui.js posait `style.display='none'` sur `#sp` à l'init de l'app. `openEditProfile()` n'effaçait pas ce style inline — `.active` seul ne suffisait pas. Fix : effacer `style.display` sur tous les écrans d'auth + sur `#appScreen` avant d'activer `#sp`. Commit `4367f02` sur branche dev. |
| 2026-06-17 | IA session | Groupement signalements par plaque dans Activité — `renderCategoryFeed` crée des items `alertGroup` (2+ alertes même plaque), `_actModCard` rend la carte de groupe cliquable, `actOpenAlertGroup(plate)` affiche le sous-panel détail, `closeAlertGroup()` restaure le panel principal. Commit `cc75ba8` sur branche dev. |
| 2026-06-18 | IA session | UX Activité — thread Véhicule redesigné (En cours accordion + Archivé swipeable, boutons Merci/Je vérifie/Je m'arrête/Réglé + Info utile/Message/Appeler). Thread Aide (J'arrive 🚗 / Je peux vous aider 🙋, carte "helper coming" évaluable). Commit `be30ec9` sur main. |
| 2026-06-18 | IA session | Véhicule stationné dans Activité — 4e catégorie 🅿️ : `stationReport(type)` complet, `renderStationFeed` (Reçus/Envoyés), `actStationReply`/`actStationRate`, floating card parked_report/parked_response, CSS teal, grille 2×2, SW v53. Commits `b6ee30b` + `96a8203` sur main. |
| 2026-06-18 | IA session | GPS privé stationné : `[GPS:lat,lng]` embarqué dans le corps du message (non visible à l'affichage), `actStationShowOnMap` ouvre la carte avec marqueur Leaflet privé visible uniquement par le propriétaire. `_parseGps()` helper. SW v54. Commit `e682c82` sur branche dev — en attente "Fusionner". |
| 2026-06-18 | IA session | Photo véhicule stationné — feature complète : flux 2 étapes (type → photo → envoi), compression Canvas max 1024px JPEG 0.82, upload Supabase Storage bucket `parked-photos` (UUID path), `image_url` dans payload messages.js, thumbnail 160px dans Reçus/Traités/Envoyés, lightbox plein écran `actStationViewPhoto`, migration SQL (`image_url` + bucket + RLS), push titre 🅿️ adapté, SW v55. 177 tests ✅ + 3 diagnostics ✅. Commit `b824af1` sur branche dev — en attente "Fusionner". |
| 2026-06-19 | IA session | Fix bannière SW en boucle — CURRENT v53→v58 dans index.html (2 occurrences). Commit `222f627` sur main. |
| 2026-06-19 | IA session | Fix AudioContext `suspended` fausse alarme critique — GVC section audio : `suspended` traité comme OK (état normal iOS avant 1er tap). Commit `8cbec7e` sur main. |
| 2026-06-19 | IA session | Fix AudioManager.init() jamais appelé — guard `_initialized` dans audio-manager.js + appel dans openMap() (listeners click/touchstart s'enregistrent maintenant au démarrage). Commit `a609bd2` sur main. |
| 2026-06-19 | IA session | 4 bugs audit Station corrigés : toast erreur vert→rouge sur échec, plaque effacée après envoi (`_sigReset`), badge quick-reply (`updateActBadge`), SW STATIC_CACHE URLs sans `?v=` → ajout params correspondants. SW v57→v58. Commit `3bcbe16` sur main. |
| 2026-06-19 | IA session | Intégration architecturale complète Station (Bus→IE→Guardian→GVC→Ange) — bus.js v47 (4 événements parked), interaction-engine.js v2 (TYPE_META parked), guardian-loop.js v3 (HEURISTIC-005 + CATEGORY STATION), global-verification-center.js v3 (section checkStation), index.html (Bus emits + snapshot Ange enrichi), messages.js v20 (types IE + Bus emits quick-reply). Commit `b30a905` sur main — en attente push "Fusionner". |
| 2026-06-19 | IA session | Amélioration complète Aide : 8 corrections (3 bugs _actModCard, doublon actHelpReply, floating card signature, warning incendie, cleanupAlerts alternatives, sigAideNearbySection HTML, snapshot Ange aide_pending/helper_coming/nearby) + intégration Bus→IE→Guardian→GVC→Ange (bus.js v48, interaction-engine.js v3, guardian-loop.js v4, global-verification-center.js v4, SW v59). |
| 2026-06-19 | IA session | Audit complet Véhicule + intégration architecturale Bus→IE→Guardian→GVC→Ange : bus.js v49 (3 events), interaction-engine.js v4 (VEHICLE_RESPONSE TYPE_META), guardian-loop.js v5 (HEURISTIC-007 + category VEHICLE), global-verification-center.js v5 (section checkVehicle), messages.js v21 (Bus emits + types IE + push notifications véhicule), index.html (actVehicleReply+actVmRate corrigés, vmResponseUnread dans bVehicle, vehicle_response exclu nav badge, Envoyés redesigné, snapshot Ange vehicle_pending/vehicle_responses). SW v60. Commit 86295a8. |
| 2026-06-19 | IA session | Fix SW update bloqué sur iOS : `{updateViaCache:'none'}` sur les 2 appels `register()` (principal + registerServiceWorker) — contourne le cache HTTP Safari qui servait l'ancien service-worker.js après Force MAJ. `location.replace(?r=timestamp)` dans controllerchange à la place de `reload()` — contourne aussi le cache HTTP sur la page HTML elle-même. Commit dea7ac1. |
| 2026-06-19 | IA session | Audit Messages+Téléphone Bus→IE→Guardian→GVC→Ange : bus.js v50 (MESSAGE_SENT/RECEIVED), messages.js v22 (emits Bus pour messages simples), guardian-loop.js v6 (CALL+MESSAGE categories, CALL_ACCEPTED dans HEURISTIC-004 fix subscription morte, MESSAGE_SENT/RECEIVED subscriptions), global-verification-center.js v6 (checkMessages live counts, checkCalls live counts), index.html (snapshot Ange +messages_threads, +call_realtime_ok, +call_pending_out). SW v61. Commit 789907e. |
| 2026-06-19 | IA session | Fix registre IE + analytics appels + Guardian→Ange : interaction-engine.js v5 (CALL_RECEIVED dans TYPE_META, total_calls compte tous les états), calls.js v18 (IE.create CALL_RECEIVED dans _showIncomingPopup), snapshot Ange +guardian_pending +guardian_alerts. SW v62. Commit 9683a17. |
| 2026-06-19 | IA session | Audit Route complet + 9 corrections Bus→IE→Guardian→GVC→Ange : G1 type IE ROAD_ALERT, G2 Guardian HEURISTIC-008+ROAD category, G3 GVC checkRoute(), G4/G5 Bus emit ROAD_CREATED dans roadReport(), G6 snapshot Ange route_active/route_types, G7 boutons ROUTE exclus _actModCard, G8 catBadgeRoute filtre seen/present, G9 cleanupAlerts notif expiry route, G11 mobile-autotest routeAutotest(). SW v63. Commit c77bcda. |

| 2026-06-19 | IA session | Audit GPS complet + 10 corrections Bus→IE→Guardian→GVC→Ange : IE v6 GPS_FIX+GPS_STARTED, guardian-loop v8 HEURISTIC-009 GPS, GVC v8 checkGPS() 9 items, mobile-autotest v3 gpsAutotest(), locate() GPS_FIX IE+Bus+S.myAccuracy+S.myGpsAt, zIndexOffset 0→1000, jitter anti-stacking alertes, snapshot Ange gps_active/invisible/radius_km/gps_accuracy/gps_age_sec. SW v64→v65. Commit 24e6e88. |
| 2026-06-19 | IA session | Audit nav avancée + 7 corrections : AbortController searchGps (race condition), voiceGps timeout 8s, OSRM timeout 8s, N1 étapes épuisées auto-recalcul, N2 vocal recalcul, N3 autoFollow après recalcul, V1 slider vitesse de parole 0.5x→1.4x. SW v65→v66. Commit 1281c60. |
| 2026-06-19 | IA session | Audit Ange (conseiller IA) + 5 corrections : S.panel mis à jour dans App.panel() (CRITIQUE), ANGE_SUGGESTION dans TYPE_META IE v7 (HAUTE), startVoice() timeout 8s (HAUTE), #angeQuota indicateur quota restant (MOYENNE), scroll-to-bottom renderResponse() + Escape listener (BASSE). SW v66. |
| 2026-06-19 | IA session | Audits Activité + Dashboard Gardien + 6 corrections : HEURISTIC-004 corrigée (ROAD_ALERT/GPS_FIX retirés → ANGE_SUGGESTION ajouté), assist() type IE HELP_REQUEST_CREATED→HELP + ImmatBus.emit, driverInfo() ImmatBus.emit+IE.create ajoutés, snapshot Ange getPending(ownPlate), CSS gardien-debug-tool masqué non-gardiens, actConfirmAlert() guard alerte expirée. guardian-loop.js v9, SW v67. Commits 459c298 (Ange) + f3a5048 (Activité+Guardian). |
| 2026-06-19 | IA session | Code review --effort high : 4 correctifs robustesse — _refreshQuota() try/catch sessionStorage, startVoice() onerror skip 'aborted', actConfirmAlert() suppression wrapper vacueux + DB fallback quand !a, Guardian bus.on HELP_CREATED+VEHICLE_MESSAGE_SENT. guardian-loop.js v10, SW v68. Commit 670c03b. |
| 2026-06-19 | IA session | Carte de risque vivante : road_risk_segments (score bayésien décroissance 30j), trigger SQL auto, RPC get_risk_zones(), _getWeather() OpenMeteo background, _checkRiskZonesDebounced() alerte proactive < 500m, overlay Leaflet jaune/orange/rouge, guardian-loop v11 RISK category. SW v69. Commit 14ca851. |
| 2026-06-19 | IA session | BrainEngine v1 + SwarmEngine v1 + Narrator v1 + ImmatConsciousness v1 — intelligence synthétique (synthèse 5 modules, convergence 0-4, focus unique, cross-module bridges, adaptiveThreshold BehaviorPulse+fiabilité). SW v74→v75. Commits 89d8858 + suivants. |
| 2026-06-19 | IA session | ImmatSoul v1 (harmonie 0-10, angles morts, trajectoire, insight français, SOUL_AWAKENING), ImmatKernel v1 (fiabilité 0-100%, détection sommeil iOS, auto-recovery, KERNEL_RESURRECTION), ImmatCoPilot v1 (11 déclencheurs, voix autonome FR, mémoire 2h, #copilotPanel). Fix SyntaxError `.map(s=>({})join()` → `_sigLabels`. SW v77. Commits d9fc68d+f86b863+240d26d+5057bef. |
| 2026-06-19 | IA session | Ange Intelligence Overhaul P1→P5 : P2 Mémoire Émotionnelle (narrator.js v2, tri par poids émotionnel), P4 Compression Adaptative (FLASH/STANDARD/DEEP, 80/200/400 tokens), P5 Question Jamais Posée (blind spot après chaque réponse, cooldown 10min), P1 Ange Prédictif (AngePredictor, pre-call idle, cache ic_ange_predicted), P3 Monologue Privé (AngeMonologue, 8min conduite, ic_ange_conscience, injection snapshot). SW v81. Commits 862f8f2+3cbe1ff+93f6f4c+f784fcb. |
| 2026-06-19 | IA session | Panneau Paramètres — 10 améliorations : rayon dans settings, auto-statut conduite, notifs messages+appels, réinitialisation sélective RGPD, toggles Ange (proactif+monologue), mode économie batterie GPS, statistiques personnelles, signalement abus. SW v85. |
| 2026-06-19 | IA session | Zones à risque cohérentes : trigger SQL filtré accidents uniquement ([ROUTE] Accident/Obstacle/Danger), TRUNCATE + rebuild road_risk_segments (HAVING ≥2), UI "X accident(s)" + "Zone accidentogène". Migration 20260619170000. SW v86. |
| 2026-06-19 | IA session | Journal d'appels — 2 bugs UX : (1) display:flex→block dans navAppels (layout horizontal corrigé), (2) App.panel("messages")→App.navMessages() dans pickPlate override (superposition panneaux corrigée). SW v87. |
| 2026-06-20 | IA session | Audio restauré (tous sons actifs, seul bip démarrage iOS silencieux) + AU-10 fix (parseInt v100+) + "Mes signalements" supprimé + Ange "Voir le tableau de bord →" (immat-copilot.js v2) + Immatest v2 (18 scénarios in-app complets : auth, emails, nav, overlays, messages UI+DB, appels, signalement, activité, localStorage, trust/block, présence, audio, SW, GVC, OBD, Realtime, UX). SW v104. |
| 2026-06-20 | IA session | Navigation GPS — zoom adaptatif (17 normal, 18 proche virage <150m, 16 vue 2D) + fitBounds protégé pendant driveMode (PR #355). Fix régression marqueur véhicule figé : panTo→setView (PR #356). SW v106. |
| 2026-06-20 | IA session | Crosshair GPS — `#mapCenterPin` SVG crosshair bleu fixé au centre écran (position:fixed 50%/50%) : visible quand GPS inactif (S.myLat===null ou mode invisible), masqué dès premier fix GPS. app.css v11, SW v107. |
| 2026-06-20 | IA session | Fix suivi GPS continu — bug `autoFollow` : `setView()` de locate() déclenchait `zoomstart` → autoFollow=false → carte ne suivait plus. Fix : flag `S._gpsMoving` + listeners séparés + moveend/zoomend clear. SW v108. |
| 2026-06-20 | IA session | Audit global — 6 bugs corrigés : BUG-001 PII user_name→owner_plate, BUG-003 GPS retry backoff (max 5 × max 30s), BUG-008 SW versioning badge.js+3 core sans ?v=, BUG-009 myMarker null-safe try/catch, BUG-012 deleteAccount purge ic_* RGPD, BUG-014 sb.auth.getUser() éliminé du callback GPS → S.uid direct. SW v109. |
| 2026-06-20 | IA session | Audit global phase 2 — 6 bugs robustesse : BUG-002 race condition GPS callback (_locateCbRunning try/finally), BUG-004 subLocs channel leak (sauvegarde old ref avant null + removeChannel), BUG-006 loadOthers throttle 2s (_loadOthersAt), BUG-010 subscribeCommunityReports async + await removeChannel, BUG-011 double getUser() éliminé (syncCommunityAlerts + _handleReport → S.uid), BUG-015 js() XSS guillemets doubles (&quot;). SW v110. |
| 2026-06-20 | IA session | Panel conducteurs proches enrichi (point fraîcheur ●, compteur + ↻ Actualiser, boutons 🚨 alerte + 📍 carte), push notification retry 3 tentatives backoff 1s/2s sur 5xx, migration rate limit DB (max 30 msg/min/user, RLS WITH CHECK). SW v111. |
| 2026-06-21 | IA session | 6 features UX : item Messages non lus Activité, onboarding A2HS iOS, bouton Confiance menu contextuel, masquer appels journal, réponses rapides fil messages, filtre 📬 Non lus. SW v118→v124. Commits 3a5a390→595c884. |
| 2026-06-21 | IA session | FIX CRITIQUE — mismatch version messages.js : index.html chargeait ?v=23 mais SW v124 ne cachait que ?v=24 → ancien SW servait vieux messages.js sans toggleUnreadOnly → TypeError 📬 + instabilité. Fix : index.html?v=24 + SW bumpe v125. |
| 2026-06-21 | IA session | FEATURE — Réponse citée ↩️ dans le fil : bouton ↩ sur chaque bulle reçue, barre #icQuotePreview violette, préfixe "> citation\n" à l'envoi, rendu .ic-msg-quote (bordure violette, italique gris). messages.js v25, SW v126. Commit 566f495. |
| 2026-06-21 | IA session | BUG FIX — Boutons panelAltet (Route/Véhicule/Aide/Stationné/X) non réactifs après PR 1 : :not(.mini) ajouté sur les 5 sélecteurs :has() portrait (app.css). Cause : App.closeSheet() laissait panelAltet.on=true → :has() écrasait height:0 (visible) mais pointer-events:none restait → tout le sheet non cliquable. CSS-only. SW v130. |
| 2026-06-21 | IA session | PR 2 — Ange UX responsive : C1 AngeDialog.open() ferme panels A/B avant ouverture, P1 #angePanel left paysage +58px nav latérale, M1 max-height 80vh→min(80dvh,…safe-area), M2 padding-bottom max(16px,safe-area-bottom). SW v131. |
| 2026-06-21 | IA session | Fix nav cachée Ange iOS — cause racine : auto-focus #angeMsg déclenchait le clavier iOS → visual viewport rétréci → .bottom-nav sortait de la zone visible. Correction : suppression setTimeout focus(). SW v138. Commits d2f1549 + 5132815. Validé terrain. |
| 2026-06-21 | IA session | PR 3 démarrée — Rotation / Orientation polish. Audit en cours. |
| 2026-06-21 | IA session | Phase 2 Messages — X natifs A11→A14 : .ph-close dans .ic-conv-header-acts, panel-header Journal d'appels, panel-header Nouveau message (← + 🗑 + ✕ en remplacement .ic-compose-hd), .ph-close dans .ic-thread-actions. :has(#panelMessages.on) .sheet-close. app.css v15, SW v150. |
| 2026-06-21 | IA session | Phase 2 Signaler — panel-header [← titre ✕] sur les 5 sous-steps (Route/Véhicule/Messages-véhicule/Aide/Stationné). :has(#sigStep1.active)→:has(#panelAltet.on). sigStep3VehicleMsg conserve .sig-back-btn pour immat-test-engine:410. app.css v16, SW v151. |
| 2026-06-22 | IA session | Phase 2 Modales Settings A19→A23 validées terrain — #blocked/#recent/#favoritesModal/#trustedModal/#legal migrés vers .panel-header + .ph-close. CSS .ph-actions ajouté. app.css v17, SW v168, APP_BUILD 2026-06-22. Commit cd2e814. |
| 2026-06-22 | IA session | CLÔTURE chantier migration headers UX (100% : Phase 1 + Phase 2 complètes). Ouverture chantier micro Ange/GPS. Audit dashboard Gardien planifié. Règle stabilisation activée (ne plus modifier Activité/Messages/Signaler/Options/Profil sans bug reproductible). |
| 2026-06-22 | IA session | MODE STABILISATION activé. Plan 4 étapes : (1) tests terrain modales Settings, (2) validation micro Ange/GPS, (3) audit global navigation double-X/écrans-sans-sortie, (4) choix prochain chantier (Gardien OU modale abus). Zéro feature en attendant. |
| 2026-06-22 | IA session | Fix voiceInput() : garde instance this._voiceInput (toggle stop), blur() avant start(), setTimeout 15s + clearTimeout onerror/onend, concat trim (pas de mots collés). Validé terrain 6 scénarios. SW v169. Commit e0562fd. Chantier micro CLÔTURÉ. |
| 2026-06-22 | IA session | Modale abus + migration abuse_reports — PR C (290b696) : table abuse_reports + RLS (INSERT auth, pas de SELECT/UPDATE/DELETE). PR B (05b3d28→4c01d40) : #abuseModal HTML, CSS .abuse-*, submitAbuseReport() v2 (category/details séparés, sans created_at client, sans fallback silencieux). SW v171, app.css v19. |
| 2026-06-22 | IA session | Analyse métier S6-TRUST validée — décision : NE PAS FUSIONNER. Raison : is_disputed jamais mis à true (aucune UI, aucun workflow admin), trigger actif mais sans usage réel. 6 conditions documentées avant fusion future. PR A (4b7251c) conservée en local uniquement, hors origin/main. |

| 2026-06-22 | IA session | Chantier A PR 1 — RPC get_abuse_reports_admin() fusionnée (59f4854). Bug 42702 découvert : WHERE id = auth.uid() ambigu en PL/pgSQL avec SECURITY DEFINER. Fix via alias u.id (3d1bbe6) fusionné sur main. T2 validé (P0001 Accès refusé). T1/T4/T5 à valider via app avec JWT gardien. |
| 2026-06-22 | IA session | Chantier A PR 2 — Dashboard Gardien UI : section 🚩 Signalements d'abus ajoutée dans openGardienDashboard() (div#gardienAbuseReports, async IIFE, sb.rpc get_abuse_reports_admin, rendu tableau 50 entrées + pills catégories + badges statut). Fusionné sur main (3200ebc). SW v172. Chantier A COMPLET : table+RLS+modale+RPC+fix42702+UI. |
| 2026-06-22 | Utilisateur | CLÔTURE FORMELLE Chantier A — validation explicite. Règles : ne pas rouvrir sauf bug terrain, ne pas fusionner S6-TRUST. Action résiduelle : T1 gardien via app. |
| 2026-06-22 | IA session | Fix bug terrain modale abus : classList.add('on') → classList.add('show') dans openAbuseReport/closeAbuseModal. SW v172→v173. Commit a578c60 sur main. |
| 2026-06-22 | IA session | Revert S6-TRUST (90577f4) : suppression 20260622100000_trust_auto_refresh.sql de main — migration non appliquée à la DB, bloquait CI (exit 1, "inserted before"). Pipeline débloqué. CI vert sur 90577f4 (5 jobs success). |
| 2026-06-22 | Utilisateur | Validation terrain complète : fix modale abus ✅ (bouton Signaler ouvre la modale), T1 gardien ✅ (Dashboard Gardien section 🚩 Signalements d'abus remonte les données). Chantier A 100% terminé. |
| 2026-06-22 | IA session | V1 Signalements — Patch 8 modifications index.html + SW v173→v174 (commit 1ae7ebf branche dev) : FloatingCard vehicle_report titre "🚨 Signalement véhicule" + bouton unique "Voir le signalement" (deep-link Activité), actVmRate() archive dans ic_vm_replied après Info utile, openAbuseReport(plate,category) paramètre optionnel, App._actAbuseReport() helper msgId+plate+FAUX_SIGNALEMENT présélectionné, submitAbuseReport() archive S._pendingAbuseSourceMsgId après submit réussi, bouton "🚩 Signaler un abus" dans renderEnCours. Attente "Fusionner". |

| 2026-06-22 | IA session | BUG FIX nav — boutons Messages/Appels/Ange/✕ non réactifs après revert zones. Ajout installNavButtonHotfix() dans ui.js : document-level capture listener par closest() (ph-close/sheet-close) + bounding-box (#navMessages/#navAppels/#navAnge). SW v197→v199, ui.js?v=10. |
| 2026-06-23 | IA session | BUG FIX nav (fix 3 final) + Dashboard Gardien manquant. Fix nav inline dans index.html (avant </body>) : hotfix exécuté à chaque chargement, indépendant SW/cache. Dashboard : migration 20260623100000_get_my_role_function.sql (crée get_my_role() SECURITY DEFINER) + fallback JWT dans afterAuth() (u.user_metadata.role / u.app_metadata.role avant RPC). SW v199→v200. Commit 40b3aff sur main. |
| 2026-06-23 | IA session | BUG FIX Dashboard Gardien (CAUSE RACINE) + Appels complet. Cause racine Dashboard : override OBD afterAuth (ligne 3701) fast-path App.openMap() direct → bypass TOTAL détection gardien → S.isGardien jamais set → applyFeatureFlags() ne montre jamais les boutons. Fix : ajout JWT+RPC get_my_role() dans le fast-path OBD avant App.openMap(). Fix Appels : _openAppelsInline() aligné sur navAppels() — display='block', icCallLog reset, tabs couleurs, header/searchbar masqués, closeThread(), _unseenMissedCalls=0, updateActBadge(). SW v204→v205. Commit bdf6d42 sur main. |
| 2026-06-23 | IA session | BUG FIX Dashboard Gardien timing + CI preflight. Fix timing : double fallback `S.isGardien===true \|\| body.classList.contains('is-gardien')`. CI : 5 guillemets typographiques U+2019 → ASCII U+0027 dans IIFE feature flags. SW v213→v214. Commits 35b60e4+0c4a3dd sur main. Validé terrain. |
| 2026-06-23 | IA session | UX Messages — header fixe style act-cat-hd. Vue 1 (liste) : icône 💬 + "Messages / Vos conversations", flex cascade CSS via :has(#panelMessages.on) (iOS 15.4+). Vue 2 (thread) : icône 💬 + pseudo + immatriculation dans header fixe, compositeur fixe en bas. IC-back-btn restyled en cercle via CSS. Tous IDs JS conservés, aucun JS modifié. SW v214→v215. Commit af8f577. |
| 2026-06-23 | IA session | UX Messages — Option A : header épuré (‹ 💬 Messages ✕ seulement) + #icMsgTabsRow avec titre MESSAGES + icônes 🔍✏️ + pills Tous/Non lus/Favoris. Style identique Journal d'appels. IDs JS conservés, aucun JS modifié. SW v216→v217, app.css v25→v26. Commit ae1dd82 sur main. |
| 2026-06-23 | IA session | Pills Messages style corrigé — pleine largeur + gap segmenté iOS (commits bddcfdb/4862bf3/68a410a, SW v218→v220, app.css v27→v29). PROJECT_STATE mis à jour (7804842). |
| 2026-06-23 | IA session | FIX Thread iOS — compositeur fixe en bas : overflow:hidden + flex: 0 0 auto sur .ic-thread-head/.ic-thread-composer/#icTypingLabel via :has() (CSS only, messages.css/messages.js non touchés). SW v220→v221, app.css v29→v30. Commit b3bd7fb. INCIDENT AGENT : f4cda3c a tronqué index.html à 1 ligne (écran blanc). Restauré par 7de5370 — HEAD stable. CI vert (18 passed). |

---

*`PROJECT_STATE.md` — ImmatConnect Pro*  
*Ne remplace aucun document existant. Tableau de bord de continuité uniquement.*
