# TERRAIN-INTEL — Intelligence Technique ImmatConnect Pro

**Rôle de ce document : adjoint terrain**
Une nouvelle session Claude (ou un nouveau Gardien) lit ce fichier en premier.
Il donne la vision globale, les interactions réelles entre composants, et les incohérences constatées.
Il est mis à jour à chaque intervention significative.

**Dernière mise à jour : 2026-05-31**
**Basé sur la lecture complète de : index.html (1807L), messages.js (588L), utils.js (62L), badge.js (95L), ui.js (391L)**

---

## RÈGLE D'USAGE

Avant toute intervention sur le code :
1. Lire la section correspondante ici
2. Vérifier si une incohérence connue est déjà documentée
3. Après intervention : mettre à jour TERRAIN-INTEL si le comportement change

---

## 1. ARCHITECTURE GÉNÉRALE

### Fichiers et rôles

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `index.html` | 1807 | Tout : App object, état S, tous les panneaux HTML, fonctions métier |
| `messages.js` | 588 | Module ImmatMessages — messagerie P2P plaque-à-plaque |
| `utils.js` | 62 | Fonctions partagées : esc(), nPlate(), fPlate(), km(), etc. |
| `badge.js` | 95 | Module ImmatBadge — compteur messages non lus |
| `ui.js` | 391 | Module UIManager — navigation, panneaux, overlays |

### Ordre de chargement (fin de index.html)

```
1. index.html → App défini, boot() lancé
2. badge.js   → window.setUnreadMsgCount exposé
3. messages.js → ImmatMessages + patches App
4. ui.js      → UIManager + patches App
```

L'ordre est critique. Si un fichier charge avant que App soit défini, les patches attendent via `setTimeout(install, 250)`.

### Globals exposés sur window

```
window.App                  — objet principal, toutes les fonctions métier
window.S                    — état global (voir section 2)
window.sb                   — client Supabase (null si non chargé)
window.ImmatMessages        — module messagerie
window.ImmatBadge           — module badge
window.UIManager            — module navigation
window.AppReliabilityPro    — module fiabilité (inline dans index.html)
window.ImmatSwitchAccount   — fonction changement de compte (inline index.html)
window.setUnreadMsgCount    — alias de badge.js setBadge()
```

---

## 2. ÉTAT GLOBAL S — CARTE COMPLÈTE

L'objet `S` (window.S) est la mémoire vive de l'application. Tout passe par là.

### Identité et session

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.uid` | string | afterAuth, fixMultiComptes | partout |
| `S.profile` | object | afterAuth, openMap | loadOthers, ownPlate(), updateReportTarget |
| `S.mode` | string | setMode() | handleAuth |

### GPS et carte

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.myLat`, `S.myLng` | number\|null | locate() watchPosition | pushLocation, checkRoute, searchGps, loadOthers |
| `S.myMarker` | Leaflet Marker | updateMap() | logout, toggleInvisible |
| `S.map` | Leaflet Map | initMap() | partout |
| `S.mapView` | '2d'\|'drive' | cycleView() | recenter, updateMap |
| `S.watchId` | number\|null | locate() | logout, toggleInvisible, stopGps |
| `S.driveMode` | boolean | startNav, stopGps | updateDrivingMode, locate |
| `S.autoFollow` | boolean | recenter, startNav | updateMap |
| `S.lastSpeed` | number | updateMap | updateNavPremium, updateDrivingMode |

### Véhicules et communauté

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.nearby` | array | loadOthers() | updateCommunityStatus, renderNearby |
| `S.otherMkrs` | array Leaflet | loadOthers() | loadOthers (nettoyage) |
| `S.selPlate` | string\|null | pickPlate, showVehicleContextMenu | selectedVehiclePlate, sendMsg |
| `S.conv` | string | pickPlate, vehicleAlert | loadMsgs, sendMsg |
| `S.contextVehicle` | object\|null | showVehicleContextMenu | selectedVehiclePlate, updateReportTarget |
| `S.blocked` | array | blockPlate, unblockPlate | loadMsgs, loadOthers |
| `S.recent` | array | loadOthers (ajout) | openRecent |

### Alertes et signalements

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.alerts` | array | addCommunityAlert, syncCommunityAlerts, chReports | renderAlerts, renderCategoryFeed, updateActBadge, cleanupAlerts |
| `S.alertHistory` | array | addCommunityAlert | renderCategoryFeed (onglet envoyés) |
| `S.alertMarkersById` | object | addCommunityAlert (markers carte) | actConfirmAlert, cleanupAlerts |
| `S.offlineReports` | array | saveReportRemote (échec) | syncOfflineReports |
| `S.resolvedRemoteIds` | array | actConfirmAlert | syncCommunityAlerts (filtre) |

### Canaux realtime

| Propriété | Canal Supabase | Initié par | Écoute |
|-----------|---------------|------------|--------|
| `S.chMsg` | postgres_changes messages | subMsgs() | INSERT sur `messages` |
| `S.chLoc` | postgres_changes user_locations | subLocs() | INSERT/UPDATE sur `user_locations` |
| `S.chReports` | postgres_changes reports | subReports() | INSERT sur `reports` |
| `S.chCommunityReports` | broadcast community | subscribeCommunityReports() | new_report, resolve_report, vehicle_alert |

⚠️ Voir section 4 — INCOHÉRENCE #2 et #3 sur les doublons de canaux.

### Messages et badges

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.unreadMsgCount` | number | badge.js setBadge, chMsg callback | updateCommunityStatus |
| `S._actMessages` | array | ImmatMessages (via refresh) | renderActivityFeed, renderCategoryFeed, updateActBadge |
| `S._actCat` | string\|null | openActivityCat | renderCategoryFeed |
| `S._actCatTab` | string\|null | actCatTab | renderCategoryFeed |

### Navigation GPS

| Propriété | Type | Écrit par | Lu par |
|-----------|------|-----------|--------|
| `S.routeDest` | object\|null | pickDest | checkRoute, autoRecalculateRoute, updateNavPremium |
| `S.routeSteps` | array | pickDest | checkRoute |
| `S.routeLayer` | Leaflet Polyline | pickDest | pickDest (nettoyage), stopGps |
| `S.nextStep` | number | checkRoute | checkRoute |
| `S.favorites` | array | saveCurrentDestination | renderFavs |
| `S.gpsHistory` | array | addGpsHistory | renderHistory |

---

## 3. RÉSEAU D'INTERACTIONS PRINCIPAL

### INTERACTION A — Véhicule sur carte ↔ Panneau Activité

C'est l'interaction la plus complexe et la moins documentée.

**Sens carte → Activité :**
```
Clic sur marqueur véhicule
→ App.showVehicleContextMenu(lat, lng, plate, uid)
  → S.selPlate = plate
  → S.contextVehicle = {plate, uid, lat, lng}
  → affiche menu contextuel flottant

Dans le menu contextuel :
  → "Contacter" → App.pickPlate(plate)
    → S.selPlate = plate, S.conv = plate
    → App.panel('messages')
    → ImmatMessages.setMode('compose')
  → "Signaler" → App.openVehicleReport()
    → App.panel('altet') + App.sigStepVehicle()
```

**Sens Activité → carte :**
```
Panneau Activité → carte d'alerte → bouton "📍 Voir sur la carte"
→ App.actViewOnMap(alertId)
  → cherche alerte dans S.alerts ou S.alertHistory
  → App.closeActivityCat()
  → App.navMap()
  → S.map.setView([lat, lng], 17)
```

**Lien indirect entre les deux :**
- `S.alerts` alimente les marqueurs sur la carte (via `renderAlerts`) ET les cartes dans le panneau Activité (via `renderCategoryFeed`)
- `S.nearby` alimente le compteur communauté (via `updateCommunityStatus`) ET les marqueurs carte (via `loadOthers`)
- Il n'existe pas de lien direct : un changement dans Activité ne met pas à jour la carte automatiquement et vice versa

**Zone floue identifiée :**
Si l'utilisateur clique sur un véhicule sur la carte (S.selPlate = 'AB-123-CD'), puis navigue vers le panneau Activité — la sélection n'est pas mise en évidence dans Activité. Activité ne lit pas S.selPlate.

---

### INTERACTION B — App.panel() — la fonction pivot

`App.panel()` est la fonction la plus appelée de l'application. Elle est **patchée 2 fois** après sa définition originale.

**Chaîne d'exécution quand on appelle App.panel('activite') :**

```
1. ui.js (dernier patch installé)
   → normalize('activite') → 'activite'
   → closeFloating(null) — ferme reportPanel, nearbyPanel, etc.
   → showSheet()
   → appelle l'ancienne version (messages.js patch)

2. messages.js patch (__FinalMessagesCompatibility)
   → normalize : 'contact' → 'messages', sinon passe tel quel
   → appelle l'ancienne version (définition originale)

3. Définition originale (index.html)
   → toggle classes .on sur chaque panneau HTML
   → toggle classes .on sur les onglets de navigation

4. Retour dans ui.js patch
   → setPanel('activite') — syncNav + toggle panels (redondant avec étape 3)
   → setTimeout 100ms → App.renderActivityFeed() + App.updateActBadge()
```

**Panels disponibles :** altet, drive, messages, settings, activite

**Traduction des alias (ui.js normalize) :**
- 'alert' | 'alerte' → 'altet'
- 'contact' | 'message' | 'reçus' | 'received' → 'messages'
- 'activité' | 'activity' → 'activite'

---

### INTERACTION C — Realtime → Interface

**Canal positions (S.chLoc) → carte :**
```
Supabase user_locations change
→ S.chLoc callback
→ App.loadOthers()
  → nettoie TOUS les marqueurs S.otherMkrs
  → requête Supabase user_locations (toutes les positions < staleMinutes)
  → recrée TOUS les marqueurs
  → met à jour S.nearby
  → App.renderNearby() + App.updateCommunityStatus()
```

**Canal messages (S.chMsg) → badge :**
```
Supabase messages INSERT
→ S.chMsg callback
→ App.updateCommunityStatus() → met à jour #communityStatus et #topMsgBadge
→ App.updateActBadge() → met à jour #actBadge et #topMsgBadge
→ Si panneau messages actif → ImmatMessages.refresh()
```

**Canal signalements postgres (S.chReports) → carte + activité :**
```
Supabase reports INSERT
→ S.chReports callback
→ App.addCommunityAlert(payload)
  → ajoute dans S.alerts
  → crée marqueur Leaflet dans S.alertMarkersById
  → App.renderAlerts() — met à jour le panneau altet
  → App.updateCommunityStatus()
  → App.updateActBadge()
```

**Canal broadcast signalements (S.chCommunityReports) → même effet :**
```
Broadcast 'new_report'
→ S.chCommunityReports callback
→ App.addCommunityAlert(payload) — même chemin que ci-dessus
```

---

### INTERACTION D — Badge #topMsgBadge — 3 chemins

Le badge en haut à droite est mis à jour par 3 fonctions différentes avec des logiques différentes.

```
Chemin 1 : badge.js setBadge(n)
  → lit S.unreadMsgCount
  → écrit directement sur #topMsgBadge
  → efface .status-mail-badge

Chemin 2 : App.updateActBadge()
  → lit S._actMessages (non lus) + S.alerts (non vus, non expirés)
  → écrit sur #actBadge ET sur #topMsgBadge (via variable 'legacy')

Chemin 3 : App.updateCommunityStatus()
  → lit S.alerts (proches, actifs) + S.unreadMsgCount + pendingSignalCount()
  → écrit sur #communityStatus ET sur #topMsgBadge (via variable 'badge')
```

La valeur affichée dépend du dernier chemin exécuté.

---

### INTERACTION E — Signalement véhicule — 4 chemins

```
Chemin 1 : Carte → menu contexte → "Signaler"
  → App.openVehicleReport()
  → App.panel('altet') + App.sigStepVehicle()
  → L'utilisateur choisit un motif dans sigStep2Vehicle
  → App.vehicleAlertQuick(label)
  → ImmatMessages.sendToPlate(plate, msg) si disponible
     sinon App.sendMsg()

Chemin 2 : Panneau Signaler → étape 1 → "Prévenir un véhicule"
  → App.sigStepVehicle()
  → même suite que Chemin 1

Chemin 3 : App.vehicleAlert(label) — appelé depuis les cartes d'alerte
  → patchée par messages.js (__FinalMessagesCompatibility)
  → prépare compose dans ImmatMessages
  → App.panel('messages')

Chemin 4 : Panneau Activité → carte véhicule → "Répondre"
  → App.actOpenConv(plate)
  → App.panel('messages')
  → ImmatMessages.openThread(plate)
```

---

## 4. INCOHÉRENCES CONSTATÉES

### INC-001 — Double canal messages
**Sévérité : MOYENNE**
**Fichiers :** index.html (`subMsgs`), messages.js (`subscribe`)
**Description :** Deux canaux Supabase écoutent les nouveaux messages :
- `S.chMsg` (postgres_changes) dans index.html → déclenche updateCommunityStatus
- `State.channel` (broadcast) dans messages.js → déclenche refresh du module
**Risque :** Un message reçu peut déclencher deux notifications visuelles, ou le badge peut être incrémenté deux fois.
**Statut :** Non corrigé — comportement à observer

### INC-002 — Double canal signalements
**Sévérité : MOYENNE**
**Fichiers :** index.html (`subReports` + `subscribeCommunityReports`)
**Description :** `S.chReports` (postgres_changes) et `S.chCommunityReports` (broadcast) appellent tous les deux `addCommunityAlert()`.
**Risque :** Un signalement peut apparaître en double dans `S.alerts` si les deux canaux reçoivent l'événement avant la déduplication.
**Protection existante :** `addCommunityAlert()` vérifie `S.alerts.find(a => a.remoteId === id)` pour les remoteIds — mais seulement si remoteId est disponible immédiatement.
**Statut :** Non corrigé — surveillance recommandée

### INC-003 — Badge #topMsgBadge — 3 logiques concurrentes
**Sévérité : FAIBLE à MOYENNE**
**Fichiers :** badge.js, index.html (updateActBadge, updateCommunityStatus)
**Description :** Trois fonctions avec des logiques de calcul différentes écrivent sur le même élément DOM #topMsgBadge.
**Symptôme observable :** Le badge peut flasher entre deux valeurs différentes, ou afficher un décompte différent selon l'action déclenchante.
**Statut :** Non corrigé

### INC-004 — App.panel() patchée 2 fois — comportement implicite
**Sévérité : FAIBLE**
**Fichiers :** messages.js (patch 1), ui.js (patch 2)
**Description :** Les deux patches capturent l'ancienne version via `bind()` et la chaînent. Le comportement final dépend de l'ordre de chargement des fichiers.
**Risque :** Si l'ordre de chargement change (ex: ui.js avant messages.js), les comportements de normalisation et de refresh changent silencieusement.
**Statut :** Non corrigé — ordre fixé par index.html ligne 1802-1804

### INC-005 — loadOthers() recrée tous les marqueurs à chaque update
**Sévérité : PERFORMANCE**
**Fichier :** index.html (`loadOthers`, ~ligne 503)
**Description :** À chaque changement de position (la mienne ou celle d'un autre), loadOthers() supprime et recrée tous les marqueurs Leaflet. Pas de mise à jour différentielle.
**Risque :** Avec 20+ véhicules visibles et des GPS actifs, l'interface peut trembler à chaque update (marqueurs qui disparaissent et réapparaissent).
**Statut :** Non corrigé — acceptable pour V1, à optimiser en V2

### INC-006 — S.selPlate non visible depuis le panneau Activité
**Sévérité : UX**
**Fichier :** index.html (renderCategoryFeed ne lit pas S.selPlate)
**Description :** Si l'utilisateur clique sur un véhicule sur la carte (→ S.selPlate = 'XX-000-XX'), puis navigue vers Activité, le véhicule sélectionné n'est pas mis en évidence dans les listes d'Activité.
**Symptôme :** L'utilisateur pense avoir sélectionné un véhicule, va dans Activité pour voir son historique, ne voit rien de mis en évidence.
**Statut :** Non corrigé — décision design requise

### INC-007 — vehicleAlertQuick() — double envoi possible
**Sévérité : MOYENNE**
**Fichier :** index.html (`vehicleAlertQuick`, ~ligne 910)
**Description :** `vehicleAlertQuick()` appelle `ImmatMessages.sendToPlate()` si disponible. Mais `App.vehicleAlert()` est aussi patchée par messages.js pour préparer le compose. Selon le chemin d'appel, les deux peuvent se déclencher.
**Risque :** Le destinataire reçoit le même message deux fois.
**Statut :** Non corrigé — à surveiller avec des tests manuels

### INC-008 — unsubscribe() messages.js — scope client [CORRIGÉ]
**Sévérité : CORRIGÉE**
**Fichier :** messages.js ligne 571
**Description :** `client` non défini dans le scope de unsubscribe → crash silencieux, canal non nettoyé à la déconnexion.
**Fix appliqué :** 2026-05-31 — `const client = sb();` ajouté
**Commit :** fix(P0) : XSS Nominatim + scope unsubscribe messages

### INC-009 — XSS Nominatim searchGps() [CORRIGÉ]
**Sévérité : CORRIGÉE**
**Fichier :** index.html, fonction searchGps()
**Description :** display_name de Nominatim injecté dans un onclick inline via js() qui n'échappe pas les guillemets doubles HTML.
**Fix appliqué :** 2026-05-31 — données placées dans data-* attributes
**Commit :** fix(P0) : XSS Nominatim + scope unsubscribe messages

---

## 5. FLUX UTILISATEUR PRINCIPAUX

### Flux 1 — Connexion
```
boot() → sb.auth.getSession()
→ session existe → App.afterAuth()
  → patchée par fixMultiComptesSessionCache (lit profil par user.id)
  → si profil complet → App.openMap(profil, email)
    → initMap() + locate() + subMsgs() + subLocs() + subReports() + subscribeCommunityReports()
→ pas de session → App.show('sw') (écran bienvenue)
```

### Flux 2 — Réception d'une alerte communautaire
```
Autre utilisateur crée signalement
→ Supabase INSERT dans reports
→ S.chReports callback → App.addCommunityAlert()
→ S.alerts mis à jour
→ Marqueur Leaflet créé sur la carte
→ App.updateActBadge() → #actBadge incrémenté
→ App.showFloatingCard() — notification flottante 8 secondes
→ Si panneau Activité ouvert → App.renderActivityFeed() se re-render au prochain focus
```

### Flux 3 — Envoi d'un message à un véhicule
```
Utilisateur tape plaque dans iTarget + message dans iMsg
→ App.sendMsg()
  → vérif rate limit (maxMsgPerMinute, défini dans index.html)
  → sb.from('messages').insert(...)
  → ImmatMessages.refresh() pour mettre à jour la vue
  → S.conv = plaque destinataire
```

### Flux 4 — Navigation GPS
```
App.openGps() → panel 'drive' + focus sur champ recherche
→ Utilisateur tape adresse → App.searchGps() (appel Nominatim)
→ Résultats affichés → Utilisateur clique → App.pickDest(lat, lon, name)
  → Appel OSRM pour calcul itinéraire
  → S.routeSteps créé, S.routeLayer affiché sur carte
→ App.startNav() → S.driveMode = true
  → setInterval checkRoute() vérifie la progression
  → autoRecalculateRoute() si déviation > 450m
```

---

## 6. ZONES FLOUES — COMPORTEMENT AMBIGU

### ZF-1 — Que se passe-t-il si subMsgs() est appelé deux fois ?
`subMsgs()` vérifie `if(S.chMsg) await sb.removeChannel(S.chMsg)` avant de recréer. Semble sûr. Mais si `afterAuth()` est appelé deux fois rapidement (ex: onAuthStateChange + boot), les 4 subscriptions peuvent se créer en parallèle.

### ZF-2 — Comportement de App.panel() si UIManager n'est pas encore chargé
Si `App.panel('messages')` est appelé avant que ui.js soit chargé (possible pendant le boot), c'est la définition originale qui s'exécute — sans `closeFloating()` ni `syncNav()`. Le sheet peut rester dans un état incohérent.

### ZF-3 — pendingSignalCount() référencée mais non trouvée dans les fichiers lus
`App.updateCommunityStatus()` appelle `pendingSignalCount()` (index.html ligne 836). Cette fonction n'a pas été localisée dans les 5 fichiers. Peut-être définie ailleurs ou dans une partie non lue de index.html.

### ZF-4 — S._actMessages peuplé par ImmatMessages mais lu par App
`S._actMessages` est peuplé par le module ImmatMessages (messages.js) mais lu par `App.renderActivityFeed()` et `App.updateActBadge()` (index.html). Le couplage est implicite via l'objet S global.

---

## 7. HISTORIQUE DES INTERVENTIONS

| Date | Type | Fichier | Description | Commit |
|------|------|---------|-------------|--------|
| 2026-05-31 | fix P0 | messages.js | Bug scope unsubscribe() — client non défini | 5ca4c22 |
| 2026-05-31 | fix P0 | index.html | XSS Nominatim searchGps() — data-* attributes | 5ca4c22 |

---

## 8. QUESTIONS OUVERTES POUR LA PROCHAINE SESSION

Ces questions nécessitent une décision ou une investigation :

1. **INC-001/002** : Les doubles canaux sont-ils intentionnels (redondance) ou accidentels ? À clarifier avec le Gardien.
2. **INC-003** : Unifier le calcul du badge en un seul chemin ou accepter les trois ?
3. **ZF-3** : Localiser `pendingSignalCount()` — elle existe dans index.html dans une partie de code non encore mappée précisément.
4. **INC-006** : Décision design — quand on sélectionne un véhicule sur la carte, doit-il être mis en évidence dans Activité automatiquement ?
5. **RLS Supabase** : La clé publishable est visible dans index.html ligne 318. Acceptable seulement si RLS est correctement configuré côté Supabase. Non vérifié depuis le code.

---

*Document créé : 2026-05-31*
*Prochaine mise à jour : après la prochaine intervention sur le code*
*Fichier : docs/app/TERRAIN-INTEL.md*
