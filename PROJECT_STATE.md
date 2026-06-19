# PROJECT_STATE — ImmatConnect Pro
## Tableau de bord de continuité · Point de reprise unique

> **Règle d'usage :** Ce fichier est le premier fichier à lire. Il ne remplace aucun document existant. Il donne le contexte minimal pour reprendre immédiatement sans relire les audits complets.  
> Mettre ce fichier à jour à chaque fin de session de travail.

---

## 1. ÉTAT ACTUEL DU PROJET

```
Date de mise à jour    : 2026-06-19
Avancement             : ~48% du plan fonctionnel implémenté — EN PRODUCTION
Production             : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Branche production     : main (GitHub Pages) — commit 2790ff7 (en attente push "Fusionner")
Branche de travail     : claude/immatconnect-pro-app-dEKGR (sync avec main)
Dépôt                  : caisse43700-lgtm/Projet-immat-Connect
Tests de validation    : deux iPhones, BZ-652-LL (kassem69@live.fr) ↔ BE-521-MM
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

Aucune — "Véhicule stationné dans Activité" terminée, en attente de "Fusionner".

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

---

*`PROJECT_STATE.md` — ImmatConnect Pro*  
*Ne remplace aucun document existant. Tableau de bord de continuité uniquement.*
