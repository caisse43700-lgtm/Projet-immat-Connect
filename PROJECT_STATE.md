# PROJECT_STATE — ImmatConnect Pro
## Tableau de bord de continuité · Point de reprise unique

> **Règle d'usage :** Ce fichier est le premier fichier à lire. Il ne remplace aucun document existant. Il donne le contexte minimal pour reprendre immédiatement sans relire les audits complets.  
> Mettre ce fichier à jour à chaque fin de session de travail.

---

## 1. ÉTAT ACTUEL DU PROJET

```
Date de mise à jour    : 2026-06-14
Avancement             : ~40% du plan fonctionnel implémenté — GO LIVE en cours
Production             : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Branche production     : main (GitHub Pages)
Branche de travail     : claude/immatconnect-pro-app-dEKGR
Dépôt                  : caisse43700-lgtm/Projet-immat-Connect
Tests de validation    : deux iPhones, BZ-652-LL (kassem69@live.fr) ↔ BE-521-MM
```

### Ce qui fonctionne en production (validé terrain 2026-06-14)

- Appels vocaux bidirectionnels via Agora RTC ✅
- Annulation A → overlay B se ferme ✅
- Plaque de l'appelé affichée sur l'overlay sortant ✅
- Messages texte en temps réel (Supabase Realtime) ✅
- Signalements Route / Véhicule / Aide ✅
- Carte radar Leaflet ✅
- Sonnerie téléphone (WAV généré en mémoire) ✅
- Dashboard Gardien (8 voyants + Global Verification Center) ✅
- Service Worker v25 (network-first, allSettled non-bloquant) ✅
- 6 Secrets Supabase configurés (AGORA_APP_ID, AGORA_APP_CERTIFICATE, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, ANTHROPIC_API_KEY) ✅
- 5 Edge Functions déployées via GitHub Actions ✅
- Realtime actif sur messages + call_requests ✅
- B1 PII test PASSED ✅ (colonnes email/phone non exposées aux autres utilisateurs)
- messages.js : getProfile() utilise colonnes explicites (fix column-level security) ✅

### Ce qui bloque (P0) — à corriger avant GO MAIN

~~1. **Panneau Paramètres iOS** — scrollable coupé, RGPD (Export/Supprimer) + Notifications inaccessibles~~ ✅ résolu
~~2. **Tests terrain B2→B5** — non complétés (push / RGPD / messages / ANGE)~~ ✅ tous passés
~~3. **REVOKE SELECT sur profiles** — en attente validation B1+B4~~ ✅ exécuté et vérifié

**Aucun blocage P0 restant — GO LIVE phase 1 validé.**

---

## 2. DERNIÈRE MISSION TERMINÉE

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
**Reste à faire (non bloquant, planifié) :** corriger les noms de fichiers de migration en collision (préfixes `20260613`/`20260614`/`20260615` dupliqués) dans `supabase/migrations/` pour que `supabase db push` cesse d'avorter silencieusement, puis laisser CI rejouer proprement les migrations restantes (`device_sessions`, `driver_ratings`, `missing_indexes`, `public_profiles_secure`, `public_reports_secure`, `user_trust`, `delete_audit_log`) qui sont elles aussi potentiellement jamais appliquées.
**Validation terrain :** ✅ confirmée par l'utilisateur (2026-06-16) — l'envoi de message à BZ-652-LL fonctionne après le GRANT, plus d'erreur "Erreur recherche conducteur".

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

## 3. MISSION EN COURS

PR #325 active — nombreuses améliorations UX en attente de merge dans main (voir section 2b).

---

## 4. PROCHAINE MISSION RECOMMANDÉE

```
Phase 2 — Améliorations et stabilisation :
  - Supprimer l'Edge Function get-turn-credentials du dashboard Supabase (S3-6, manuel)
  - Tests de non-régression appels vocaux (scénarios 1→5 du checklist anti-régression)
  - Sprint 8 : S7-NEARBY (conducteurs proches), delete_audit_log, Promise.allSettled() push
  - B5 ANGE : amélioration des réponses si nécessaire
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
SW version actif  : immatconnect-pro-v41
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
service-worker.js     : immatconnect-pro-v25
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

---

*`PROJECT_STATE.md` — ImmatConnect Pro*  
*Ne remplace aucun document existant. Tableau de bord de continuité uniquement.*
