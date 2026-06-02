# ARCHITECTURE FONCTIONNELLE COMPLÈTE — ImmatConnect Pro

> Source : audit exhaustif index.html — SESSION 15
> Tout est lié, rien n'est omis.

---

## PARTIE 0 — SCHÉMA GLOBAL

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ImmatConnect Pro                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  COUCHE AUTH                                                         │    │
│  │  Bienvenue → Connexion / Inscription → Profil → openMap()           │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │ authentifié                              │
│  ┌────────────────────────────────▼────────────────────────────────────┐    │
│  │  COUCHE ÉTAT GLOBAL (S)                                              │    │
│  │  alerts · nearby · profile · map · conv · selPlate · trust          │    │
│  │  messages · blocked · favorites · gpsHistory · offlineReports       │    │
│  └──────┬───────────────┬──────────────┬──────────────┬───────────────┘    │
│         │               │              │              │                      │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────────────┐     │
│  │  CARTE      │ │  PANNEAUX   │ │ REALTIME │ │  AUTOMATISMES      │     │
│  │  Leaflet    │ │  (sheet)    │ │ Supabase │ │  setInterval       │     │
│  │  GPS        │ │  Activité   │ │ subMsgs  │ │  visibilitychange  │     │
│  │  Véhicules  │ │  Messages   │ │ subLocs  │ │  online/offline    │     │
│  │  Alertes    │ │  Signaler   │ │ subRep.  │ │  cleanupAlerts     │     │
│  │  Contexte   │ │  Drive      │ │ commRep. │ │  syncOffline       │     │
│  └──────┬──────┘ └──────┬──────┘ └────┬─────┘ └─────┬──────────────┘     │
│         │               │              │              │                      │
│  ┌──────▼───────────────▼──────────────▼──────────────▼──────────────┐     │
│  │  COUCHE A↔B                                                         │     │
│  │  FLOW-001 Aide · FLOW-002 Helper · FLOW-003 Indisponible            │     │
│  │  FLOW-004 Résolu · FLOW-005 Véhicule · FLOW-006 Message             │     │
│  │  FLOW-007 Route · FLOW-008 Contact                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  COUCHE FIABILITÉ — trustDelta() · AppReliabilityPro.rewardReporter() │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  COUCHE IA — AngeDialog → immat-brain-dialog (Supabase function)     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 — COUCHE DONNÉES & ÉTAT GLOBAL

### 1.1 Objet S (état en mémoire)

```javascript
S = {
  // Identité
  uid           : null,           // UUID Supabase de l'utilisateur connecté
  profile       : null,           // { id, pseudo, owner_plate, phone, vehicle_color }
  isGardien     : undefined,      // true/false/undefined

  // Carte
  map           : null,           // instance Leaflet
  myMarker      : null,           // marqueur mon véhicule
  otherMkrs     : [],             // marqueurs véhicules autres
  alertMarkersById : {},          // marqueurs alertes route indexés par id/key
  nearby        : [],             // [ { plate, pseudo, color, lat, lng, dist, uid } ]

  // GPS
  myLat, myLng  : null,           // position actuelle
  lastSpeed     : 0,              // vitesse km/h
  watchId       : null,           // ID du watchPosition
  driveMode     : false,          // true quand navigation active
  autoFollow    : true,           // centrage auto sur ma position
  mapView       : 'drive',        // 'drive' ou '2d'
  frontVehicle  : null,           // véhicule < 350m devant
  firstFix      : true,

  // Navigation GPS
  routeDest     : null,           // { lat, lon, name }
  routeLayer    : null,           // polyligne Leaflet
  routeSteps    : [],             // [ { lat, lon, text } ]
  nextStep      : 0,
  favorites     : [],             // destinations favorites
  gpsHistory    : [],             // historique destinations

  // Alertes
  alerts        : [],             // [ alerte ] — alertes actives en mémoire
  alertHistory  : [],             // historique alertes expirées
  alertFilter   : 'all',
  offlineReports: [],             // signalements en attente réseau
  resolvedRemoteIds : [],         // IDs DB des alertes résolues

  // Messages
  conv          : 'all',          // plaque de la conversation active
  selPlate      : null,           // plaque sélectionnée
  contextVehicle: null,           // { plate, lat, lng, marker }
  unreadMsgCount: 0,
  _actMessages  : [],             // messages chargés par ImmatMessages

  // Canaux Realtime
  chMsg, chLoc, chReports, chCommunityReports,

  // Préférences
  invisible     : false,
  radiusKm      : 5,              // rayon de détection (1/5/10/25 km)
  voice         : true,           // voix GPS
  sounds        : true,
  mode          : 'login',

  // Divers
  blocked       : [],             // plaques bloquées
  recent        : [],             // véhicules récents
  trust         : {},             // { plate: score 0-100 }
  networkOnline : true,
  sosTimer      : null,
  sheetSnap     : 'mini',

  // Activité
  _actCat       : null,           // catégorie ouverte
  _actCatTab    : 'recus',
  _actLoadingP  : null,           // Promise de chargement en cours
}
```

### 1.2 CATS — Catalogue des types d'alertes

| Type | Icône | Niveau | TTL | Groupe |
|---|---|---|---|---|
| accident | 💥 | urgent | 45 min | route |
| bouchon | 🚦 | important | 30 min | route |
| obstacle | ⚠️ | urgent | 45 min | route |
| travaux | 🚧 | info | 2 h | route |
| controle | 👮 | info | 1 h | route |
| danger | ❗ | urgent | 45 min | route |
| panne | 🚗 | urgent | 45 min | assist |
| carburant | ⛽ | important | 45 min | assist |
| batterie | 🔋 | important | 45 min | assist |
| moteur | ⚙️ | urgent | 45 min | assist |
| incendie | 🔥 | urgent | 30 min | assist |
| perdu | 🧭 | info | 45 min | assist |
| vehicule | 🚘 | important | 1 h | vehicle |
| info | ℹ️ | info | 1 h | misc |

### 1.3 Persistance localStorage

| Clé | Contenu | Limite |
|---|---|---|
| `ic_alerts` | `S.alerts` | 80 entrées |
| `ic_alert_history` | `S.alertHistory` | 150 entrées |
| `ic_offline_reports` | `S.offlineReports` | 50 entrées |
| `ic_resolved_remote_ids` | IDs résolus | 200 entrées |
| `ic_blocked` | `S.blocked` | illimité |
| `ic_recent_vehicles` | `S.recent` | 20 entrées |
| `ic_favorites` | `S.favorites` | 20 entrées |
| `ic_gps_history` | `S.gpsHistory` | 20 entrées |
| `ic_trust_scores` | `S.trust { plate: score }` | illimité |
| `ic_unread_msg_count` | entier | — |
| `ic_deleted_msgs` | IDs messages supprimés | 500 entrées |
| `ic_invisible` | '0' ou '1' | — |
| `ic_radius` | '1' / '5' / '10' / '25' | — |
| `ic_voice` | '0' ou '1' | — |
| `ic_sounds` | '0' ou '1' | — |
| `ic_view` | 'drive' ou '2d' | — |
| `ic_alert_filter` | 'all' / 'route' / 'assist' / 'vehicle' / 'urgent' | — |
| `ic_reduce_effects` | '0' ou '1' | — |
| `ic_voice_gender` | 'female' ou 'male' | — |

### 1.4 Tables Supabase utilisées

| Table | Opérations | Quand |
|---|---|---|
| `profiles` | SELECT, UPSERT | Auth, loadOthers, signalement |
| `user_locations` | SELECT, UPSERT, DELETE | GPS locate, loadOthers |
| `messages` | SELECT, INSERT, UPDATE | Messages, alertes véhicule, feedback |
| `reports` | SELECT, INSERT, UPDATE | Signalements route/aide |

### 1.5 Statuts possibles d'une alerte

```
créée → pending → seen → present → gone / resolved
                                 ↗
                    helper_coming (assist, côté A)
                    seen_by_driver (vehicle, côté A)
```

| Statut | Signification |
|---|---|
| `pending` | Créée, pas encore vue |
| `seen` | Vue par B (ou marquée manuellement) |
| `present` | Confirmée "toujours là" par B (route) |
| `gone` | Retirée sans résolution |
| `resolved` | Résolue (aide clôturée par A, ou route disparue) |
| `helper_coming` | B a dit "J'arrive" sur la demande aide de A |
| `seen_by_driver` | B a répondu à l'alerte véhicule de A |

---

## PARTIE 2 — COUCHE ÉCRANS & NAVIGATION

### 2.1 Arbre des écrans

```
BOOT
  ├── getSession()
  │     ├── session active → afterAuth() → openMap()
  │     └── pas de session → écran Bienvenue (sw)
  │
  ├── Bienvenue (sw) ──────────────────────────────────────────────────────
  │     ├── [Se connecter] → goAuth('login') → écran Auth (sa)
  │     └── [Créer un compte] → goAuth('signup') → écran Auth (sa)
  │
  ├── Auth (sa) ────────────────────────────────────────────────────────────
  │     ├── Onglet "Connexion" ↔ Onglet "Inscription"
  │     ├── Email + Mot de passe (+ champs inscription)
  │     ├── [Se connecter / S'inscrire] → handleAuth()
  │     │     ├── signup() → email confirmation → attente
  │     │     └── login() → afterAuth() → profil ou carte
  │     ├── [Mot de passe oublié ?] → forgotPwd() → email reset
  │     ├── [Renvoyer confirmation] → resendConfirm()
  │     └── [← Retour] → show('sw')
  │
  ├── Profil (sp) ─────────────────────────────────────────────────────────
  │     ├── Pseudo, Plaque, Téléphone, Couleur
  │     ├── [Enregistrer et continuer] → saveProfile() → openMap()
  │     └── [Se déconnecter] → logout()
  │
  ├── Reset mot de passe (sr) ──────────────────────────────────────────────
  │     ├── Nouveau MDP + Confirmation
  │     ├── [Mettre à jour] → updatePwd()
  │     └── [← Retour] → show('sw')
  │
  └── App principale (appScreen) ────────────────────────────────────────────
        ├── Carte (map)
        ├── Top-bar
        ├── FAB stack (recentrer, proches, vue, SOS)
        ├── Bannière véhicule devant
        ├── Indicateur vitesse
        ├── Menu contextuel véhicule
        ├── FloatingCard
        ├── Sheet avec panneaux (altet, drive, messages, settings, activite)
        ├── Navigation bas (carte, signaler, activité)
        ├── Overlays (reportPanel, nearbyPanel, alertsPanel, callOverlay)
        ├── Drawer (menu profil)
        ├── Modaux (legal, blocked, recent)
        ├── Appels (callContactModal, callNotAllowedModal, callIncomingPopup, callSentBanner)
        └── Ange ✦ (angeFab, angePanel)
```

### 2.2 Panels dans le Sheet

```
sheet (conteneur)
  ├── panelAltet    ← navSignaler() / panel('altet')
  │     ├── sigStep1        (choix catégorie)
  │     ├── sigStep2Route   (types route)
  │     ├── sigStep2Vehicle (types véhicule + plaque)
  │     └── sigStep2Aide    (types aide)
  │
  ├── panelDrive    ← panel('drive')
  │     ├── Recherche GPS (input + voix)
  │     ├── POI rapides
  │     ├── Résultats
  │     ├── Route mini (après calcul)
  │     ├── navPremium dashboard
  │     ├── Boutons navigation
  │     ├── Favoris GPS
  │     └── Historique GPS
  │
  ├── panelMessages ← panel('messages')
  │     ├── Onglets : Reçus / Envoyés / Nouveau
  │     ├── Liste conversations (icMsgList)
  │     └── Thread (icThread)
  │           ├── Réponses rapides
  │           └── Compositeur de réponse
  │
  ├── panelSettings ← panel('settings')
  │     ├── Boutons actions
  │     └── Sections (Communication, Voix GPS)
  │
  └── panelActivite ← navActivite() / panel('activite')
        ├── actMain (écran principal)
        │     ├── Catégories (Route / Véhicule / Aide)
        │     └── Résumé rapide (Nouveaux / En cours / Traités)
        └── actCatPanel (sous-panneau catégorie)
              ├── Onglets : Reçus / Envoyés
              └── actCatFeed (liste de cards)
```

### 2.3 Transitions entre panneaux — carte complète

```
Carte
  → navSignaler()          → panelAltet (étape 1)
  → navActivite()          → panelActivite
  → openDrawer()           → Drawer latéral
  → openNearby()           → nearbyPanel overlay
  → openAlerts()           → panelAltet (alertes actives)
  → clic véhicule          → menu contextuel véhicule
  → FAB Recentrer          → (reste sur carte, recentre)
  → FAB Vue                → (reste sur carte, bascule vue)
  → FAB Conducteurs proches → nearbyPanel
  → FAB SOS (3s)           → assist('panne') → carte + confirm 112

panelAltet
  → sigStepRoute()         → sigStep2Route
  → sigStepVehicle()       → sigStep2Vehicle
  → sigStepAide()          → sigStep2Aide
  → sigBack()              → sigStep1
  → sigDone()              → sigStep1 + navMap()
  → openAlerts()           → (reste sur panelAltet, affiche alertes)
  → setAlertFilter(f)      → (reste, filtre la liste)

panelMessages
  → setMode('inbox')       → liste conversations
  → setMode('sent')        → liste envoyés
  → setMode('compose')     → formulaire nouveau
  → openThread(plate)      → thread conversation
  → closeThread()          → liste conversations
  → deleteThread()         → suppression + liste

panelActivite
  → openActivityCat(cat)   → actCatPanel
  → openActivityCat('all') → actCatPanel tout
  → closeActivityCat()     → actMain

actCatPanel
  → actCatTab('recus')     → liste reçus
  → actCatTab('envoyes')   → liste envoyés
  → actModCard → Btn action → dépend du type (voir §6)
  → actViewOnMap()         → navMap() + zoom

Drawer
  → panel('drive')         → panelDrive
  → openNearby()           → nearbyPanel
  → toggleInvisible()      → (effet invisible)
  → panel('settings')      → panelSettings
```

---

## PARTIE 3 — COUCHE CARTE

### 3.1 Cycle de vie de la carte

```
openMap()
  └── initMap()                ← crée la carte Leaflet
        ├── tileLayer OSM
        ├── dragstart/zoomstart → autoFollow=false
        ├── click              → hideVehicleContextMenu()
        └── initSheetDrag()    ← gestures sur le sheet

locate() ← GPS watchPosition
  ├── màj myLat/myLng/lastSpeed
  ├── autoFollow → setView()
  ├── màj myMarker (avec heading si disponible)
  ├── checkRoute()             ← navigation GPS
  ├── updateDrivingMode()      ← mode conduite > 15 km/h
  ├── updateCommunityStatus()
  └── upsert user_locations DB (si visible)

loadOthers() ← au login + toutes les 20s + realtime
  ├── nettoie otherMkrs
  ├── SELECT user_locations (10 min max)
  ├── dédoublonne par user.id
  ├── profilesByIds() → noms/couleurs
  ├── filtre par rayon + bloqués
  ├── crée marqueurs Leaflet
  │     └── click → showVehicleContextMenu()
  ├── clusterCloseVehicles()   ← sépare véhicules trop proches
  ├── addRecent()              ← historique véhicules
  ├── updateFrontVehicle()     ← bannière véhicule devant
  └── updateCommunityStatus()
```

### 3.2 Marqueurs carte

```
Mon véhicule
  ├── Icône SVG cercle coloré + forme voiture + flèche heading
  ├── Taille 48×48
  └── Mis à jour à chaque fix GPS

Véhicule autre
  ├── Icône SVG cercle coloré + forme voiture
  ├── Taille 38×38
  ├── zIndexOffset 2400
  └── Clic → showVehicleContextMenu()

Alerte route
  ├── Icône pin coloré (rouge/orange/foncé selon level)
  ├── Popup Leaflet : label + reason + [Retirer]
  └── Créé si lat/lng disponibles uniquement
```

### 3.3 Menu contextuel véhicule

```
Clic sur marqueur véhicule
  └── showVehicleContextMenu({ plate, lat, lng, marker })
        ├── Positionné à la coordonnée du véhicule sur l'écran
        ├── S.selPlate = plate
        ├── S.contextVehicle = { plate, lat, lng }
        │
        ├── [💬 Message] → vehicleContextAction('contact')
        │     └── panel('messages') + mode compose + focus textarea
        │
        ├── [⚠️ Signaler] → vehicleContextAction('signal')
        │     └── sigVehiclePlate.value = plate
        │         + openVehicleReport() → sigStep2Vehicle
        │
        └── [🚫 Bloquer] → vehicleContextAction('block')
              └── blockPlate(plate) → confirm + S.blocked + localStorage
                  + loadMsgs() + loadOthers()
```

---

## PARTIE 4 — COUCHE SIGNALEMENT (FLUX DE CRÉATION)

### 4.1 Pipeline commun de création d'un signalement

```
Bouton Signaler
  ↓
addCommunityAlert(raw, opts)
  ├── normalizeAlert(raw)       ← normalise les champs
  ├── upsertAlert(alert)        ← anti-doublon + stockage S.alerts
  │     ├── Guard : alert.key obligatoire
  │     ├── Guard : statuts terminaux (resolved/gone/expired/deleted) → ignore
  │     ├── Dédoublonnage par clé (remoteId ou id)
  │     └── Retourne l'alerte upsertée
  ├── syncDerivedAlertUI()      ← save + marqueurs + renderAlerts + schedFeed/Badge
  └── Si opts.notify && isNearby() :
        ├── notifyAlert()       ← notification système
        └── showFloatingCard()  ← FloatingCard temps réel

saveReportRemote(payload)       ← parallèle avec addCommunityAlert
  ├── Essai T1 : INSERT complet avec reporter_id
  ├── Essai T2 : sans reporter_id (RLS restriction)
  ├── Essai T3 : avec lat/lng en alias
  ├── Essai T4 : champs minimaux
  ├── Si tous échouent → offlineReports + toast hors ligne
  └── _bcast() → broadcast 'new_report' sur ic_community_live
```

### 4.2 Signalement route — `roadReport(type)`

```
Input : type = accident/bouchon/obstacle/travaux/controle/danger
  ├── Guard GPS (myLat requis)
  ├── addCommunityAlert({ type, group:'route', _mine:true, lat, lng }, notify:false)
  ├── saveReportRemote({ plate:'ROUTE', reason, latitude, longitude })
  ├── closeOverlay('reportPanel')
  ├── toast "✅ Signalement envoyé"
  └── notifyAlert()

Visibilité : rayon de tous les conducteurs dans le rayon
Chez B : FloatingCard + Activité/Route (Reçus)
TTL : selon type (30–120 min)
```

### 4.3 Alerte véhicule ciblée — `vehicleAlertQuick(label)`

```
Input : label = texte du problème, plate = sigVehiclePlate ou selectedVehiclePlate()
  ├── Guard : plaque obligatoire
  ├── Guard : pas sa propre plaque
  ├── Construit msg : "⚠️ SIGNALEMENT : [label]. Pouvez-vous vérifier ?"
  │   ou "🚨 SIGNALEMENT URGENT : ..." si pneu/fumée/feu
  ├── ImmatMessages.sendToPlate(plate, msg)  ← message DB
  ├── Broadcast 'vehicle_alert' :
  │     { target_plate, sender_plate, label, msg, urgent }
  ├── toast "✅ Alerte envoyée au conducteur [plate]"
  └── sigDone()

Chez B : FloatingCard ⚠️/🚨 + Activité/Véhicule (Reçus)
          + stocké dans S.alerts via broadcast vehicle_alert
```

### 4.4 Demande d'aide — `assist(type)`

```
Input : type = panne/carburant/batterie/moteur/incendie/perdu
  ├── Guard GPS (myLat requis)
  ├── addCommunityAlert({ type, group:'assist', _mine:true, lat, lng }, notify:false)
  ├── saveReportRemote({ plate:'ASSISTANCE', reason, category:'help' })
  ├── toast "🆘 Demande d'aide envoyée"
  └── notifyAlert()

Chez B : FloatingCard + Activité/Aide (Reçus)
TTL : selon type (30–45 min)
Résolution : A clique "✓ Résolu" → actConfirmAlert('resolved')
```

---

## PARTIE 5 — COUCHE INTERACTIONS A↔B — FLUX COMPLETS

### FLOW-001 — Demande d'aide

```
A                              Réseau                         B
│                                │                            │
├─ assist(type) ──────────────────────────────────────────────►
│  myLat/myLng requis            │ INSERT reports             │
│                                │ broadcast new_report       │ ← addCommunityAlert()
│                                │                            ├─ FloatingCard
│                                │                            │    "✋ J'aide" → actHelpReply()
│                                │                            │    "🗺 Voir"  → actViewOnMap()
│                                │                            ├─ Activité/Aide (Reçus)
│                                │                            │    actions disponibles ↓
```

### FLOW-002 — Helper en route (IC-003)

```
B (suite FLOW-001)             Réseau                         A
│                                │                            │
├─ actQuickReply(plate,           │                            │
│   "J'arrive, je viens          │ INSERT messages            │
│    vous aider.")────────────────►                           │
│                                │ ← subMsgs INSERT           │
│                                │   txt.startsWith(          │
│                                │   "J'arrive")              ├─ FloatingCard ✋
│                                │                            │   "Helper en route"
│                                │                            │   "[plaque] vient vous aider"
│                                │                            │   [OK] [💬 Messages]
│                                │                            ├─ myAssist.status = 'helper_coming'
│                                │                            ├─ myAssist._helperPlate = plate
│                                │                            └─ Card Activité/Aide
│                                │                               badge "✋ En route · [plaque]"
```

### FLOW-003 — Helper indisponible

```
B                              Réseau                         A
│                                │                            │
├─ actQuickReply(plate,           │                            │
│   "Je ne peux pas              │ INSERT messages            │
│    aider cette fois.")─────────►                           │
│                                │ ← subMsgs INSERT           ├─ FloatingCard 💬
│                                │   (pas de détection        │   "Message de [plaque]"
│                                │    spéciale)               └─ Ouvre Messages si cliqué
```

### FLOW-004 — Aide résolue

```
A                              Réseau                         B (et tous)
│                                │                            │
├─ actConfirmAlert(id,'resolved')─►                          │
│                                │ UPDATE reports (resolved)  │
│                                │ broadcast resolve_report   │
│                                │                            ├─ dismissAlert() → alerte retirée
│                                │                            └─ marqueur carte retiré
│
├─ Alerte retirée de S.alerts localement
└─ Marqueur carte retiré
```

### FLOW-005 — Alerte véhicule (IC-002)

```
A                              Réseau                         B
│                                │                            │
├─ vehicleAlertQuick(label) ──────►                          │
│  (plaque B renseignée)         │ INSERT messages ✉          │
│                                │ broadcast vehicle_alert 📡 │
│                                │                            ├─ FloatingCard ⚠️/🚨
│                                │                            │   "Alerte sur votre véhicule"
│                                │                            │   [Vu] [Répondre]
│                                │                            ├─ Activité/Véhicule (Reçus)
│                                │                            │   actions disponibles ↓
│                                │                            │
│                       B répond │                            │
│                                │                            ├─ respondVehicleAlert(id, kind)
│                                │ INSERT messages ✉          │   (Info utile / Reçu)
│                                │ UPDATE profiles (score)    │
│◄───────────────────────────────┤                            │
│ ← subMsgs INSERT               │                            │
│   txt.includes('note confiance')                            │
├─ Toast "✓ [plaque] a vu        │                            │
│   votre signalement"           │                            │
└─ myVehAlert.status =           │                            │
   'seen_by_driver'              │                            │
   Card: "Vu par le conducteur"  │                            │
```

### FLOW-006 — Message direct

```
A                              Réseau                         B
│                                │                            │
├─ ImmatMessages.sendNew() ───────►                          │
│  ou ImmatMessages.reply()      │ INSERT messages ✉          │
│                                │                            │
│                                │ ← subMsgs INSERT           ├─ notif (barre haut)
│                                │   (pas "J'arrive"          ├─ FloatingCard 💬
│                                │    ni "note confiance")    │   "Message de [plaque]"
│                                │                            │   [Vu] [Répondre →]
│                                │                            └─ Activité/Véhicule (Reçus)
│
B répond via thread
│◄───────────────────────────────┤ INSERT messages ✉          │
├─ FloatingCard 💬               │                            │
└─ Activité/Véhicule (Reçus)    │                            │
```

### FLOW-007 — Signalement route

```
A                              Réseau                      Tous B dans le rayon
│                                │                            │
├─ roadReport(type) ──────────────►                          │
│  myLat/myLng requis            │ INSERT reports             │
│                                │ broadcast new_report 📡    │
│                                │                            ├─ addCommunityAlert() + FloatingCard
│                                │                            │   "[icon] Incident [type]"
│                                │                            │   [Vu] [🗺 Voir]
│                                │                            └─ Activité/Route (Reçus)
│                                │                               [Toujours là] [Disparu] [📍Voir]
│
Résolution par A ou B :
├─ actConfirmAlert(id,'gone') ────►                          │
│                                │ UPDATE reports (resolved)  │
│                                │ broadcast resolve_report   ├─ alerte retirée pour tous
└─ marqueur carte retiré         │                            └─ marqueur carte retiré
```

### FLOW-008 — Demande de contact (CallManager)

```
A                              Réseau                         B
│                                │                            │
├─ CallManager.openContactOptions │                            │
│   (plate)                      │                            │
├─ Modal "Comment contacter ?"   │                            │
│   [💬 Message] [🤝 Contact]    │                            │
│                                │                            │
│─ contactByCall(plate, uid) ─────►                          │
│                                │ (système appels)           ├─ callIncomingPopup
│ callSentBanner                 │                            │   "[plaque A] vous demande
│ "En attente de réponse…"       │                            │    un contact"
│ [Annuler]                      │                            │   [Refuser] [Accepter]
│                                │                            │
│ Si B n'a pas activé les appels :                            │
│ callNotAllowedModal            │                            │
│ [💬 Envoyer un message]        │                            │
│ [Fermer]                       │                            │
│                                │                            │
│ B accepte :                    │                            ├─ acceptCall(requestId)
│◄───────────────────────────────┤ échange coordonnées        │
└─ callOverlay (overlay appel)   │                            │
│                                │                            │
│ B refuse :                     │                            ├─ refuseCall(requestId)
│◄───────────────────────────────┤ notification refus         │
└─ (bannière fermée)             │                            │
```

---

## PARTIE 6 — COUCHE ACTIVITÉ (DÉTAIL COMPLET)

### 6.1 Cycle du badge `actBadge`

```
updateActBadge()
  ├── unreadAlerts = S.alerts.filter(
  │     status ≠ seen/gone/resolved/present
  │     && age < TTL
  │     && isNearby(a)
  │   ).length
  ├── unreadMsgs = S._actMessages.filter(
  │     _received && !read_at && !deleted
  │   ).length
  ├── actBadge.textContent = unreadAlerts    ← alertes uniquement
  └── topMsgBadge.textContent = unreadMsgs  ← messages uniquement

Appelé par :
  - navActivite() (après 300ms)
  - openActivityCat()
  - actConfirmAlert()
  - schedBadge() ← requestAnimationFrame
  - setInterval (5s via updateNavPremium)
  - visibilitychange
```

### 6.2 Badges des catégories

```
renderActivityMain()
  ├── catBadgeRoute   = S.alerts.filter(group='route').length
  ├── catBadgeVehicle = S.alerts.filter(group='vehicle'|type='vehicule').length
  └── catBadgeAide    = S.alerts.filter(group='assist').length

Résumé rapide :
  ├── Nouveaux  = alertes non vues + messages non lus
  └── En cours  = alertes en statut seen/present
```

### 6.3 Cards dans `actCatFeed` — tous les types

#### Type `msg` (message reçu)

```
┌─────────────────────────────────────────────────────┐
│ [NOUVEAU]  (si unread)                              │
│ 💬  [PLAQUE]          ●  ou  "Vu"    [heure]       │
│     [extrait message 60 car]                        │
├─────────────────────────────────────────────────────┤
│ [Je m'arrête] [Je vérifie] [Merci] [Contacter]     │  ← si reçu
│ [💬 Répondre] [Supprimer]                           │  ← si envoyé
└─────────────────────────────────────────────────────┘

Actions Reçu :
  [Je m'arrête]  → actQuickReply(plate, "Je m'arrête.")      → ✉ message
  [Je vérifie]   → actQuickReply(plate, "Je vérifie.")       → ✉ message
  [Merci]        → actQuickReply(plate, "Merci.")            → ✉ message
  [Contacter]    → CallManager.openContactOptions(plate)

Actions Envoyé :
  [💬 Répondre]  → actOpenConv(plate) → panel Messages, thread
  [Supprimer]    → actDeleteConv(plate) → confirm + localStorage
```

#### Type `alert` — alerte véhicule reçue

```
┌─────────────────────────────────────────────────────┐
│ [NOUVEAU]  (si non vue)                             │
│ 🚘  [plaque_expéditeur]    "Vu" / ""   [heure]    │
│     [raison / label]                               │
│     📍 Position disponible  (si lat)               │
│─────────────────────────────────────────────────────│
│ TTL bar ████████░░░░░░ (temps restant)              │
├─────────────────────────────────────────────────────┤
│ [Je m'arrête] [Je vérifie] [Merci] [Contacter]     │
│ [📍 Voir]  (si lat)                                │
└─────────────────────────────────────────────────────┘

Actions :
  [Je m'arrête]  → actQuickReply(plate, "Je m'arrête.")
  [Je vérifie]   → actQuickReply(plate, "Je vérifie.")
  [Merci]        → actQuickReply(plate, "Merci.")
  [Contacter]    → CallManager.openContactOptions(plate)
  [📍 Voir]      → actViewOnMap(id) → navMap() + zoom
```

#### Type `alert` — alerte route reçue

```
┌─────────────────────────────────────────────────────┐
│ [NOUVEAU]  (si non vue)                             │
│ 💥  [label] · [distance]   "Vu" / ""   [heure]    │
│     [plaque_expéditeur ou "Conducteur proche"]     │
│     📍 Position disponible  (si lat)               │
│─────────────────────────────────────────────────────│
│ TTL bar                                             │
├─────────────────────────────────────────────────────┤
│ [Contacter]  [Toujours là]  [Disparu]  [📍 Voir]   │
└─────────────────────────────────────────────────────┘

Actions :
  [Contacter]    → CallManager.openContactOptions(plate)
  [Toujours là]  → actConfirmAlert(id, 'present') — reste visible + confirmé
  [Disparu]      → actConfirmAlert(id, 'gone') → retire + broadcast
  [📍 Voir]      → actViewOnMap(id)
```

#### Type `alert` — demande d'aide reçue (B voit la demande de A)

```
┌─────────────────────────────────────────────────────┐
│ [NOUVEAU]  (si non vue)                             │
│ 🚗  [plaque_A ou "Conducteur proche"]  [heure]     │
│     [raison : "[ASSISTANCE] Panne"]                │
│     📍 Position disponible  (si lat)               │
│─────────────────────────────────────────────────────│
│ TTL bar                                             │
├─────────────────────────────────────────────────────┤
│ [✋ J'arrive]  [Je ne peux pas]  [💬 Contacter]    │
│ [📍 Voir]                                          │
└─────────────────────────────────────────────────────┘

Actions :
  [✋ J'arrive]     → actQuickReply(plate, "J'arrive, je viens vous aider.")
                      → IC-003 chez A : FloatingCard "Helper en route"
  [Je ne peux pas]  → actQuickReply(plate, "Je ne peux pas aider cette fois.")
  [💬 Contacter]    → actHelpReply(plate) → panel Messages compose (sans auto-envoi)
  [📍 Voir]         → actViewOnMap(id)
```

#### Type `alert` — mon signalement (A voit son propre envoi)

```
┌─────────────────────────────────────────────────────┐
│ 🚗  "Toi"                                          │
│     [raison]                                        │
│     "Mon signalement"  /  "✋ En route · [plaque]"  │
│     /  "Vu par le conducteur"                      │
│─────────────────────────────────────────────────────│
│ TTL bar                                             │
├─────────────────────────────────────────────────────┤
│ [✓ Résolu]  [Retirer]    ← si group=assist          │
│ [Retirer]                ← autres groupes           │
│ [📍 Voir]                ← si lat                  │
└─────────────────────────────────────────────────────┘

Statuts badge (évolution) :
  "Mon signalement"         → initial, personne n'a encore répondu
  "✋ En route · [plaque]"  → B a dit "J'arrive" (IC-003)
  "Vu par le conducteur"    → B a répondu à l'alerte véhicule (IC-002)
  "Vu"                      → alerte vue (non-propre)

Actions :
  [✓ Résolu]  → actConfirmAlert(id, 'resolved') — broadcast résolution
  [Retirer]   → actConfirmAlert(id, 'gone')
  [📍 Voir]   → actViewOnMap(id)
```

---

## PARTIE 7 — COUCHE MESSAGES

### 7.1 Modes du panel Messages

```
panelMessages
  ├── mode 'inbox' (Reçus)
  │     ├── icMsgList → liste des conversations reçues
  │     └── clic sur conversation → openThread(plate)
  │
  ├── mode 'sent' (Envoyés)
  │     └── liste des messages envoyés
  │
  └── mode 'compose' (Nouveau)
        ├── icComposePlate (plaque destinataire)
        │     └── 🎙️ voicePlate() → reconnaissance vocale
        ├── icComposeText (message)
        └── ➤ sendNew()
```

### 7.2 Thread conversation

```
icThread
  ├── icThreadTitle = "[PLAQUE]"
  ├── icThreadBody = bulles de messages
  ├── [🗑] deleteThread() → confirmation + suppression
  ├── [×] closeThread()   → retour liste
  ├── Réponses rapides :
  │     [Je m'arrête]  → quick("Je m'arrête, merci.")
  │     [Je vérifie]   → quick("Je vérifie, merci.")
  │     [Bien reçu]    → quick("Bien reçu, merci.")
  ├── icReplyText + ➤ reply()
  └── Chaque message dans le thread (legacy HTML) :
        ├── [Accepter] / [Refuser]  (si pending)
        ├── Textarea + [Répondre]   (si accepté/pending reçu)
        ├── [Info utile] [Déjà réglé] [Faux signalement]  (si msg ⚠️)
        ├── [Supprimer]
        └── [Bloquer]
```

### 7.3 Cycle du badge Messages

```
topMsgBadge = S.unreadMsgCount    ← uniquement messages directs
setUnreadMsgCount(n) → localStorage + updateCommunityStatus()
Décrémenté par :
  - markRead() (bouton dans Messages)
  - passage dans le thread
```

---

## PARTIE 8 — COUCHE NAVIGATION GPS

### 8.1 Pipeline de navigation

```
Recherche
  input gpsSearch (debounce 450ms)
  → searchGps()
    → Nominatim API (France, trié par distance)
    → Résultats : liste de boutons
      → pickDest(lat, lon, name)
        → addGpsHistory()
        → OSRM route API
        → routeLayer polyligne Leaflet
        → routeMini : "[X km · Y min · arrivée HH:MM]" + [Démarrer]
        → updateNavPremium()

Voix GPS
  🎙️ → voiceGps()
    → SpeechRecognition (fr-FR)
    → result.transcript → gpsSearch.value → searchGps()

POI rapides
  poi(q) → gpsSearch.value = q → searchGps()

Démarrage navigation
  [Démarrer] → startNav()
    → driveMode=true, autoFollow=true
    → closeSheet()
    → locate() (GPS haute précision)
    → speak("Démarrage de la navigation", force)
    → inst.show : première instruction

En route
  locate() → checkRoute()
    ├── Si arrivée (< 35m) → "Vous êtes arrivé" + driveMode=false
    ├── Si étape proche (< 75m) → speak(instruction) + nextStep++
    ├── Si déviation (> 450m) → autoRecalculateRoute() → pickDest()
    └── updateNavPremium()

Stop GPS
  [⏹ Stop] → stopGps()
    → clearWatch + driveMode=false + retire routeLayer + routeMini
```

### 8.2 navPremium dashboard (auto)

Mis à jour toutes les 5 secondes et à chaque fix GPS.

| Cellule | Contenu |
|---|---|
| ETA | Heure d'arrivée calculée (distance / max(vitesse, 42 km/h)) |
| Restant | Distance restante jusqu'à destination |
| km/h | `S.lastSpeed` (vitesse GPS actuelle) |
| Proches | `S.nearby.length` (conducteurs dans le rayon) |
| Alertes | Alertes actives dans S.alerts |
| Recalcul | "Auto" si en navigation, "OK" sinon |

---

## PARTIE 9 — COUCHE REALTIME

### 9.1 Canaux Supabase actifs

```
subMsgs() → canal 'ic_msg_[userId]'
  ├── postgres_changes * messages
  ├── Filtre : messages me concernant (receiver_id, target_plate, sender_plate...)
  └── Si INSERT reçu :
        ├── profilesByIds(sender_id)
        ├── notif() → barre notification haut
        └── IC-003 / IC-002 / FloatingCard standard (selon contenu)

subLocs() → canal 'ic_loc'
  └── postgres_changes * user_locations → loadOthers()

subReports() → canal 'ic_reports_[userId]'
  └── postgres_changes INSERT reports (channel vide — non utilisé activement)

subscribeCommunityReports() → canal 'ic_community_live'
  ├── postgres_changes INSERT reports → _handleReport() → addCommunityAlert(notify:true)
  ├── postgres_changes UPDATE reports (status=resolved) → dismissAlert()
  ├── broadcast 'new_report' → _handleReport() → addCommunityAlert(notify:true)
  ├── broadcast 'resolve_report' → dismissAlert() pour tous
  └── broadcast 'vehicle_alert' → addCommunityAlert(notify:false) + FloatingCard ⚠️
```

### 9.2 Automatismes temporels

```
setInterval()
  ├── toutes les 60s  → autoNight()       ← mode nuit auto (20h–7h)
  ├── toutes les 60s  → cleanupAlerts()   ← retire alertes expirées + marqueurs
  ├── toutes les 90s  → syncOfflineReports() ← retry signalements hors ligne
  ├── toutes les 15s  → syncCommunityAlerts() ← synchronisation DB alertes (si visible)
  ├── toutes les 30s  → cacheState()      ← snapshot position dans localStorage
  ├── toutes les 30s  → reconnectSafe()   ← reconnexion session expirée
  ├── toutes les 5s   → updateNavPremium() ← dashboard GPS
  └── toutes les 20s  → loadOthers()      ← refresh marqueurs véhicules

visibilitychange (app au premier plan)
  ├── syncCommunityAlerts()
  ├── updateActBadge()
  └── ImmatMessages.refresh()

window.online
  ├── syncOfflineReports()
  ├── syncCommunityAlerts()
  └── toast "Connexion retrouvée"

window.offline
  └── toast "Mode hors ligne"

orientationchange
  └── S.map.invalidateSize() (après 400ms)
```

---

## PARTIE 10 — COUCHE FIABILITÉ (SYSTÈME DE CONFIANCE)

### 10.1 Score local `trustDelta(plate, delta)`

```
Utilisé par :
  - signalFeedback('utile')   → +8
  - signalFeedback('regle')   → +3
  - signalFeedback('faux')    → -12
  - respondVehicleAlert('utile') → +8
  - respondVehicleAlert('merci') → +5
  - respondVehicleAlert('recu')  → +3
  - respondVehicleAlert('regle') → +2
  - respondVehicleAlert('faux')  → -12
  - respondVehicleAlert('vu')    → +1

Score stocké : ic_trust_scores { plate: 0-100 }
Valeur initiale : 70 (par défaut)
Envoyé avec chaque feedback : "note confiance actuelle : X%"
```

### 10.2 Score persistant `AppReliabilityPro.rewardReporter()`

```
Déclenché après signalFeedback() (patch non-destructif)

  ├── Anti-spam : vérifie si le message a déjà un feedback
  ├── Lit profil du reporter (reliability_score, reliability_points)
  ├── Calcule nouveau score :
  │     utile → +1 point, +1 score
  │     regle/inutile → +0
  │     faux → -1 score
  ├── UPDATE profiles (reliability_score, reliability_points, reliability_level)
  ├── UPDATE messages (feedback, feedback_score_delta, feedback_at)
  └── INSERT messages → notification au reporter :
        "🏆 Votre signalement a été confirmé utile. Fiabilité : X% → Y%. Niveau : Z"
        "⚠️ Votre signalement a été marqué comme faux..."
        "ℹ️ Retour reçu..."

Niveaux de fiabilité :
  ≥ 90  → "Expert communauté"
  ≥ 75  → "Conducteur fiable"
  ≥ 55  → "Contributeur confirmé"
  ≥ 35  → "Nouveau contributeur"
  < 35  → "Fiabilité à construire"
```

---

## PARTIE 11 — COUCHE ANGE ✦

### 11.1 Conditions d'affichage du bouton

```
openMap() → resolve rôle
  ├── rôle = 'gardien'   → is-gardien CSS + angeFab.display='flex'
  ├── rôle ≠ 'gardien'   → angeFab.display='flex' (conducteur normal)
  └── erreur réseau      → angeFab.display='flex' (fail-open)
```

### 11.2 Dialogue IA

```
angeFab [✦]
  └── AngeDialog.open() → angePanel.display='flex' + focus textarea

angePanel
  ├── Textarea libre (question/situation)
  ├── [Envoyer] → AngeDialog.send()
  │     ├── Capture snapshot ImmatOrganism.diagnose()
  │     │     { health, summary, violations, panel }
  │     ├── sb.functions.invoke('immat-brain-dialog', {
  │     │     message, feature:S.panel, mode:'consultation', snapshot
  │     │   })
  │     ├── Si erreur → affiche message d'erreur dans angeResponse
  │     └── renderResponse(data) :
  │           ├── r.juste / r.sources → texte principal
  │           ├── r.vigilance[]       → "⚡ [item]" en orange
  │           ├── r.options[]         → cards cliquables
  │           │     click → textarea.value = option.label
  │           └── r.question          → question de suivi cliquable
  │                 click → focus textarea
  └── [✕] → AngeDialog.close()
```

---

## PARTIE 12 — COUCHE SOS

### 12.1 Flux SOS complet

```
FAB "SOS" (bouton maintenu)
  │
  ├── pointerdown → startSosHold()
  │     ├── classList.add('holding') ← animation visuelle
  │     ├── toast "Maintiens 3 secondes pour SOS"
  │     └── sosTimer = setTimeout(sos, 3000)
  │
  ├── pointerup/pointerleave → cancelSosHold()
  │     ├── clearTimeout(sosTimer)
  │     └── classList.remove('holding')
  │
  └── Après 3s → sos()
        ├── Si myLat → assist('panne')    ← demande d'aide aux conducteurs proches
        ├── confirm("Appeler le 112 uniquement en vraie urgence ?")
        └── Si oui → confirm("Confirmation finale : appeler le 112 ?")
              └── Si oui → location.href = 'tel:112'
```

---

## PARTIE 13 — COUCHE PROFIL & PARAMÈTRES

### 13.1 Profil utilisateur

```
Inscription (signup)
  ├── Champs : email, mot de passe, confirmation, téléphone, plaque, couleur
  ├── Validation : vPhone(), vPlate(), sPwd(), confirmation
  ├── plateAvailable() → vérifie unicité
  ├── sb.auth.signUp() → email de confirmation
  └── upsert profiles (email, pseudo, owner_plate, phone, vehicle_color)

Connexion (login)
  ├── sb.auth.signInWithPassword()
  └── afterAuth() → charge profil → openMap() ou show('sp')

Profil incomplet (sp)
  ├── Champs : pseudo, plaque, téléphone, couleur
  ├── saveProfile() → upsert profiles → openMap()
  └── logout()

Réinitialisation mot de passe
  ├── forgotPwd() → resetPasswordForEmail → email envoyé
  ├── URL recovery → show('sr')
  └── updatePwd() → sb.auth.updateUser({ password })
```

### 13.2 Paramètres — toutes les actions

| Action | Fonction | Effet |
|---|---|---|
| 🚫 Bloqués | `openBlocked()` | Liste + débloquer → `unblockPlate()` |
| 🕘 Récents | `openRecent()` | Liste + contacter → `pickPlate()` + `closeRecent()` |
| ⚖️ Confidentialité | `openLegal()` | Modal texte + [J'ai compris] |
| 🔔 Sons | `toggleSounds()` | on/off ic_sounds |
| ⚡ Performance | `toggleReduceEffects()` | Toggle CSS reduce-effects |
| 🧹 Cache | `clearOfflineCache()` | Vide favoris, historique, alertes, récents, reports |
| 🔊 Voix GPS | `toggleVoice()` | on/off voix navigation |
| Genre voix | `toggleVoiceGender()` | female ↔ male → SpeechSynthesis |
| Autoriser contacts | `CallManager.setCallPreferences(bool)` | Persisté DB |
| 📨 Restaurer msgs (gardien) | `restoreMessages()` | Vide ic_deleted_msgs + reload |
| 🔄 Sync alertes (gardien) | `forceSyncAlerts()` | syncCommunityAlerts() + subscribeCommunityReports() |
| ⏻ Déconnexion | `logout()` | Confirm + retire position + unsubscribe + signOut + redirect |

---

## PARTIE 14 — COUCHE DRAWER (MENU PROFIL)

```
Chip profil (top-bar) → openDrawer()
  └── Drawer latéral (modal)
        ├── Plaque + Pseudo (affichage seul)
        ├── Rayon de détection (select 1/5/10/25 km)
        │     → setRadius(v) → loadOthers() + renderAlerts()
        │
        ├── Section Navigation :
        │     [🧭 Navigation GPS]      → closeDrawer() + panel('drive')
        │     [👥 Conducteurs proches]  → closeDrawer() + openNearby()
        │     [👻 Mode invisible]       → closeDrawer() + toggleInvisible()
        │
        └── Section Paramètres :
              [⚙️ Paramètres]           → closeDrawer() + panel('settings')

Fermeture : clic sur fond drawer-back ou closeDrawer()
```

---

## PARTIE 15 — FLOATINGCARD — SYSTÈME COMPLET

### 15.1 API FloatingCard

```
showFloatingCard(icon, title, sub, btn1Label, btn2Label, cb1, cb2, level)
  ├── Met à jour : fcIcon, fcTitle, fcSub, fcBtn1, fcBtn2
  ├── _fcCallbacks = [cb1, cb2]
  ├── Si level='urgent' → classe 'alert-urgent' (rouge)
  ├── display='flex'
  └── Auto-fermeture : clearTimeout + setTimeout 8000 → hideFloatingCard()

fcAction(n)
  ├── Appelle _fcCallbacks[n-1] si fonction
  └── hideFloatingCard()
```

### 15.2 Tous les types de FloatingCard déclenchées

| Déclencheur | Icon | Titre | Sub | Btn1 | Btn2 | Level |
|---|---|---|---|---|---|---|
| Alerte route/aide reçue (nearby) | meta.icon | "Incident [type]" | plaque + raison | "Vu" → `actConfirmAlert('seen')` | "🗺 Voir" ou "✋ J'aide" | selon meta.level |
| Alerte véhicule broadcast | ⚠️ ou 🚨 | "Alerte sur votre véhicule" | label + "Signalé par [plaque]" | "Vu" → `updateActBadge()` | "Répondre" → Messages | urgent |
| Message reçu (standard) | 💬 | "Message de [plaque]" | extrait 40 car | "Vu" (null) | "Répondre →" → Messages inbox | — |
| IC-003 : Helper en route | ✋ | "Helper en route" | "[plaque] vient vous aider" | "OK" (vide) | "💬 Messages" → thread | urgent |

---

## PARTIE 16 — VOIX GPS (SYNTHÈSE VOCALE)

```
speak(txt, force=false)
  ├── Guard : S.voice requis
  ├── Guard : pas de doublon (txt === lastSpoken) sauf force=true
  ├── speechSynthesis.cancel() ← coupe voix en cours
  ├── SpeechSynthesisUtterance(txt)
  │     lang='fr-FR', rate=0.86, pitch=0.98
  ├── _bestFrVoice() :
  │     Préférences par nom : marie, amélie, audrey, thomas, nicolas...
  │     Fallback : localService → premier français
  └── speechSynthesis.speak()

Déclenché par :
  - startNav()           "Démarrage de la navigation"
  - checkRoute()         instructions tournants + "Vous êtes arrivé"
  - autoRecalculateRoute() "Recalcul..." (via pickDest → speak)
  - pickDest()           "Itinéraire calculé"
  - toggleVoice()        "Voix GPS activée/désactivée"
  - toggleVoiceGender()  "Voix masculine/féminine activée"
```

---

## PARTIE 17 — DÉPENDANCES ENTRE FONCTIONS (GRAPHE)

```
openMap()
  └─ initMap() · subMsgs() · subLocs() · subscribeCommunityReports()
     syncCommunityAlerts() · startMsgs() · loadOthers() · updateActBadge()
     renderFavs() · renderHistory() · renderMyAlertsBlock() · locate()
     CallManager.init()

locate()
  └─ checkRoute() · updateDrivingMode() · updateCommunityStatus()
     upsert user_locations · loadOthers() (si > 8s depuis dernier)

loadOthers()
  └─ clusterCloseVehicles() · addRecent() · renderNearby()
     updateFrontVehicle() · updateCommunityStatus()

addCommunityAlert()
  └─ normalizeAlert() · upsertAlert() · syncDerivedAlertUI()
     showFloatingCard() (si notify && isNearby)

syncDerivedAlertUI()
  └─ saveAlerts() · syncAlertMarkers() · renderAlerts()
     renderMyAlertsBlock() · schedFeed() · schedBadge()
     updateCommunityStatus()

actConfirmAlert()
  └─ UPDATE reports DB · broadcast resolve_report
     S.alerts.filter(remove) · saveAlerts()
     renderActivityFeed() · updateActBadge()

actQuickReply()
  └─ ImmatMessages.sendToPlate()
     [fallback] icComposePlate.value + panel('messages')

vehicleAlertQuick()
  └─ ImmatMessages.sendToPlate()
     broadcast vehicle_alert sur ic_community_live

roadReport() / assist()
  └─ addCommunityAlert() · saveReportRemote() · notifyAlert()

saveReportRemote()
  └─ INSERT reports (4 tentatives) · _bcast(broadcast new_report)
     [fallback] offlineReports + saveAlerts()

subMsgs INSERT reçu
  └─ profilesByIds() · notif() · [IC-003 si J'arrive] · [IC-002 si feedback]
     [FloatingCard standard sinon]

renderActivityFeed()
  └─ si catPanel visible → renderCategoryFeed()
     sinon → renderActivityMain()

renderActivityMain()
  └─ setBadge(catBadgeRoute) · setBadge(catBadgeVehicle) · setBadge(catBadgeAide)

updateActBadge()
  └─ actBadge.text = unreadAlerts · topMsgBadge.text = unreadMsgs
     renderActivityMain()

signalFeedback() [patché par AppReliabilityPro]
  └─ original() → message feedback ✉ · trustDelta()
     AppReliabilityPro.rewardReporter()
       └─ UPDATE profiles (score/points/level) · UPDATE messages (feedback)
          INSERT messages (notification au reporter)
```

---

## PARTIE 18 — RÉCAPITULATIF PAR UTILISATEUR

### Ce que fait A (initiateur)

```
DÉCLENCHER
  • Signalement route        → roadReport(type)
  • Alerte véhicule ciblée   → vehicleAlertQuick(label)
  • Demande d'aide           → assist(type)
  • Message direct           → ImmatMessages.sendNew()
  • Demande de contact       → CallManager.contactByCall()
  • SOS                      → sos() (maintien 3s)

GÉRER SES PROPRES ALERTES
  • Clôturer aide            → actConfirmAlert(id, 'resolved')
  • Retirer signalement      → actConfirmAlert(id, 'gone')
  • Voir sa position sur carte → actViewOnMap(id)

RECEVOIR LES RETOURS
  • IC-002 : B a vu l'alerte véhicule     → toast "Vu par le conducteur"
  • IC-003 : B arrive pour aider          → FloatingCard "Helper en route"
  • Message direct de B                  → FloatingCard 💬
  • Réponse de B à l'alerte              → FloatingCard 💬 + Messages

NAVIGUER
  • Trouver une destination   → searchGps() / poi() / voiceGps()
  • Calculer un itinéraire    → pickDest()
  • Démarrer la navigation    → startNav()
  • Voir les conducteurs      → openNearby()
```

### Ce que fait B (destinataire)

```
RECEVOIR
  • Alerte véhicule          → FloatingCard ⚠️ + Activité/Véhicule
  • Demande d'aide           → FloatingCard + Activité/Aide
  • Signalement route        → FloatingCard + Activité/Route
  • Message direct           → FloatingCard 💬 + Messages

RÉPONDRE À ALERTE VÉHICULE
  • Je m'arrête              → actQuickReply("Je m'arrête.")      → ✉ A
  • Je vérifie               → actQuickReply("Je vérifie.")       → ✉ A
  • Merci                    → actQuickReply("Merci.")            → ✉ A
  • Info utile               → respondVehicleAlert('utile')       → ✉ + score A
  • Reçu                     → respondVehicleAlert('recu')        → ✉ + score A
  • Vu                       → markAlertSeen(id)                  → local seulement
  → Retour chez A : "Vu par le conducteur" (IC-002)

RÉPONDRE À DEMANDE D'AIDE
  • ✋ J'arrive               → actQuickReply("J'arrive...")       → IC-003 chez A
  • Je ne peux pas           → actQuickReply("Je ne peux pas...") → message A
  • 💬 Contacter             → actHelpReply(plate)                → compose Messages
  • 📍 Voir                  → actViewOnMap(id)

CONFIRMER ALERTE ROUTE
  • Toujours là              → actConfirmAlert('present')         → confirmée
  • Disparu                  → actConfirmAlert('gone')            → retirée pour tous

GÉRER LES MESSAGES
  • Accepter demande         → accept(id, sender, plate)          → ✉ "acceptée"
  • Refuser demande          → reject(id)                        → local
  • Supprimer message        → deleteMessage(id) / deleteThread()
  • Bloquer plaque           → blockPlate(plate)
```

---

## PARTIE 19 — INTERACTIONS SANS RETOUR UTILISATEUR (AUTOMATIQUES)

```
Toutes les 20s
  loadOthers() → màj marqueurs véhicules sur carte

Toutes les 60s
  cleanupAlerts() → retire alertes TTL expirées + leurs marqueurs

Toutes les 15s (si app visible)
  syncCommunityAlerts() → sync alertes DB (3h glissantes)

Toutes les 90s (si réseau)
  syncOfflineReports() → retry signalements hors ligne

Toutes les 5s (si app visible)
  updateNavPremium() → ETA / vitesse / proches / alertes

Toutes les 30s
  cacheState() → snapshot position localStorage
  reconnectSafe() → garde session active

Chaque fix GPS
  checkRoute() → instructions + recalcul si déviation
  updateNavPremium()
  upsert user_locations (si visible)
  loadOthers() (si > 8s depuis dernier)

Realtime continu
  subMsgs → messages reçus → FloatingCard / IC-003 / IC-002
  subLocs → positions → marqueurs carte
  subscribeCommunityReports → alertes → FloatingCard / badges
```

---

## ANNEXE A — TOUS LES BOUTONS DE L'APP (INDEX COMPLET)

### Auth / Profil

| Bouton | Écran | Fonction |
|---|---|---|
| Se connecter | Bienvenue | `goAuth('login')` |
| Créer un compte | Bienvenue | `goAuth('signup')` |
| Se connecter / S'inscrire | Auth | `handleAuth()` |
| Onglet Connexion | Auth | `setMode('login')` |
| Onglet Inscription | Auth | `setMode('signup')` |
| 👁 Voir (MDP) | Auth | `eye('iPwd', btn)` |
| Mot de passe oublié ? | Auth | `forgotPwd()` |
| Renvoyer confirmation | Auth | `resendConfirm()` |
| ← Retour | Auth | `show('sw')` |
| Enregistrer et continuer | Profil | `saveProfile()` |
| Se déconnecter | Profil | `logout()` |
| Mettre à jour | Reset MDP | `updatePwd()` |

### Carte & FABs

| Bouton | Fonction |
|---|---|
| Chip profil (top-bar) | `openDrawer()` |
| 🎯 FAB Recentrer | `recenter()` |
| 👥 FAB Conducteurs | `openNearby()` |
| 🗺 FAB Vue | `cycleView()` |
| SOS (3s) | `startSosHold()` → `sos()` |
| Contacter (bannière devant) | `contactFrontVehicle()` |
| ✕ sheet | `closeSheet()` |
| Handle sheet | `toggleSheet()` (tap) / drag (haut/bas) |

### Menu contextuel véhicule

| Bouton | Fonction |
|---|---|
| 💬 Message | `vehicleContextAction('contact')` |
| ⚠️ Signaler | `vehicleContextAction('signal')` |
| 🚫 Bloquer | `vehicleContextAction('block')` |

### Navigation bas

| Bouton | Fonction |
|---|---|
| 🗺 Carte | `navMap()` |
| ⚠️ Signaler | `navSignaler()` |
| 🔔 Activité | `navActivite()` |

### Panneau Signaler — étape 1

| Bouton | Fonction |
|---|---|
| 🚦 Route | `sigStepRoute()` |
| 🚘 Véhicule | `sigStepVehicle()` |
| 🆘 Aide | `sigStepAide()` |

### Panneau Signaler — étape 2 Route

| Bouton | Fonction |
|---|---|
| ← Retour | `sigBack()` |
| 💥 Accident | `roadReport('accident')` + `sigDone()` |
| 🚦 Bouchon | `roadReport('bouchon')` + `sigDone()` |
| ⚠️ Obstacle | `roadReport('obstacle')` + `sigDone()` |
| 🚧 Travaux | `roadReport('travaux')` + `sigDone()` |
| 👮 Contrôle | `roadReport('controle')` + `sigDone()` |
| ❗ Danger | `roadReport('danger')` + `sigDone()` |
| Filtres alertes | `setAlertFilter(f)` |
| Vu (sur alerte) | `markAlertSeen(id)` |
| En attente (sur alerte) | `markAlertPending(id)` |

### Panneau Signaler — étape 2 Véhicule

| Bouton | Fonction |
|---|---|
| ← Retour | `sigBack()` |
| 🔴 Pneu | `vehicleAlertQuick('Pneu crevé ou à plat')` |
| 💡 Feu | `vehicleAlertQuick('Feu arrière ou avant défaillant')` |
| 🚪 Portière | `vehicleAlertQuick('Portière ou coffre mal fermé')` |
| 🔥 Fumée | `vehicleAlertQuick('Fumée ou odeur de brûlé')` |
| ⛓️ Objet | `vehicleAlertQuick('Objet traînant sous le véhicule')` |
| ⚠️ Autre | `vehicleAlertQuick('Autre problème visible')` |
| Info utile (mes alertes) | `respondVehicleAlert(id, 'utile')` |
| Reçu (mes alertes) | `respondVehicleAlert(id, 'recu')` |
| Vu (mes alertes) | `markAlertSeen(id)` |

### Panneau Signaler — étape 2 Aide

| Bouton | Fonction |
|---|---|
| ← Retour | `sigBack()` |
| 🚗 Panne | `assist('panne')` + `sigDone()` |
| ⛽ Carburant | `assist('carburant')` + `sigDone()` |
| 🔋 Batterie | `assist('batterie')` + `sigDone()` |
| ⚙️ Moteur | `assist('moteur')` + `sigDone()` |
| 🔥 Incendie | `assist('incendie')` + `sigDone()` |
| 🧭 Perdu | `assist('perdu')` + `sigDone()` |

### Panneau Activité — écran principal

| Bouton | Fonction |
|---|---|
| 🚦 Route | `openActivityCat('route')` |
| 🚘 Véhicule | `openActivityCat('vehicle')` |
| 🆘 Aide | `openActivityCat('aide')` |
| Voir tout › | `openActivityCat('all')` |

### Panneau Activité — sous-panneau

| Bouton | Fonction |
|---|---|
| ‹ Retour | `closeActivityCat()` |
| Onglet Reçus | `actCatTab('recus')` |
| Onglet Envoyés | `actCatTab('envoyes')` |
| Tout marquer lu | `markAllCatRead()` |

### Cards Activité — boutons selon type (détail)

| Bouton | Contexte | Fonction |
|---|---|---|
| Je m'arrête | msg reçu / alerte véhicule reçue | `actQuickReply(plate, "Je m'arrête.")` |
| Je vérifie | msg reçu / alerte véhicule reçue | `actQuickReply(plate, "Je vérifie.")` |
| Merci | msg reçu / alerte véhicule reçue | `actQuickReply(plate, "Merci.")` |
| Contacter | msg / véhicule / route | `CallManager.openContactOptions(plate)` |
| 💬 Répondre | msg envoyé | `actOpenConv(plate)` |
| Supprimer | msg envoyé | `actDeleteConv(plate)` |
| ✋ J'arrive | demande aide reçue | `actQuickReply(plate, "J'arrive...")` |
| Je ne peux pas | demande aide reçue | `actQuickReply(plate, "Je ne peux pas...")` |
| 💬 Contacter | demande aide reçue | `actHelpReply(plate)` |
| Toujours là | alerte route reçue | `actConfirmAlert(id, 'present')` |
| Disparu | alerte route reçue | `actConfirmAlert(id, 'gone')` |
| ✓ Résolu | mon aide (envoyé) | `actConfirmAlert(id, 'resolved')` |
| Retirer | mes signalements | `actConfirmAlert(id, 'gone')` |
| 📍 Voir | toutes alertes avec lat | `actViewOnMap(id)` |

### Panneau Messages

| Bouton | Fonction |
|---|---|
| Onglet Reçus | `ImmatMessages.setMode('inbox')` |
| Onglet Envoyés | `ImmatMessages.setMode('sent')` |
| Onglet Nouveau | `ImmatMessages.setMode('compose')` |
| 🗑 Supprimer thread | `ImmatMessages.deleteThread()` |
| × Fermer thread | `ImmatMessages.closeThread()` |
| Je m'arrête (rapide) | `ImmatMessages.quick("Je m'arrête, merci.")` |
| Je vérifie (rapide) | `ImmatMessages.quick("Je vérifie, merci.")` |
| Bien reçu (rapide) | `ImmatMessages.quick("Bien reçu, merci.")` |
| ➤ Envoyer nouveau | `ImmatMessages.sendNew()` |
| ➤ Envoyer réponse | `ImmatMessages.reply()` |
| 🎙️ Voix plaque | `voicePlate()` |
| Accepter | `App.accept(id, sender, plate)` |
| Refuser | `App.reject(id)` |
| Répondre (inline) | `App.reply(receiver, plate, tid)` |
| Info utile (⚠️) | `App.signalFeedback(id, sender, plate, 'utile')` |
| Déjà réglé (⚠️) | `App.signalFeedback(id, sender, plate, 'regle')` |
| Faux signalement (⚠️) | `App.signalFeedback(id, sender, plate, 'faux')` |
| Supprimer (msg) | `App.deleteMessage(id)` |
| Bloquer (msg) | `App.blockPlate(plate)` |

### Panneau Drive (Navigation GPS)

| Bouton | Fonction |
|---|---|
| 🔍 Rechercher | `App.searchGps()` |
| 🎙️ Voix | `App.voiceGps()` |
| ⛽ Carburant | `App.poi('station essence')` |
| 🍽️ Resto | `App.poi('restaurant')` |
| 🅿️ Parking | `App.poi('parking')` |
| 🔧 Garage | `App.poi('garage automobile')` |
| 🔌 Recharge | `App.poi('borne recharge')` |
| 🏥 Santé | `App.poi('hôpital')` |
| Démarrer (route mini) | `App.startNav()` |
| 📍 Me localiser | `App.locate()` |
| ⏹ Stop GPS | `App.stopGps()` |
| ✅ Alertes | `App.openAlerts()` |
| 🎯 Recentrer | `App.recenter()` |
| 🗺 Vue | `App.cycleView()` |
| 👻 Invisible | `App.toggleInvisible()` |
| 🔊 Voix | `App.toggleVoice()` |
| GPS (favori) | `App.routeSaved('fav', i)` |
| × (favori) | `App.deleteFav(i)` |
| ⭐ Ajouter destination | `App.saveCurrentDestination()` |
| GPS (historique) | `App.routeSaved('hist', i)` |
| × (historique) | `App.deleteHistEntry(i)` |

### Overlays

| Bouton | Fonction |
|---|---|
| × (tous overlays) | `closeOverlay(id)` |
| Contacter (nearby) | `pickPlate(plate)` |
| Débloquer (bloqués) | `App.unblockPlate(plate)` |
| Contacter (récents) | `pickPlate(plate)` + `closeRecent()` |
| Vider (récents) | `App.clearRecent()` |
| J'ai compris (légal) | `App.closeLegal()` |

### Drawer

| Bouton | Fonction |
|---|---|
| Rayon (select) | `setRadius(v)` |
| 🧭 Navigation GPS | `closeDrawer()` + `panel('drive')` |
| 👥 Conducteurs proches | `closeDrawer()` + `openNearby()` |
| 👻 Mode invisible | `closeDrawer()` + `toggleInvisible()` |
| ⚙️ Paramètres | `closeDrawer()` + `panel('settings')` |
| Fond drawer | `closeDrawer()` |

### Paramètres

| Bouton | Fonction |
|---|---|
| 🚫 Bloqués | `openBlocked()` |
| 🕘 Récents | `openRecent()` |
| ⚖️ Confidentialité | `openLegal()` |
| 🔔 Sons | `toggleSounds()` |
| ⚡ Performance | `toggleReduceEffects()` |
| 🧹 Cache | `clearOfflineCache()` |
| 🔊 Voix GPS | `toggleVoice()` |
| Genre voix | `toggleVoiceGender()` |
| Toggle Autoriser contacts | `CallManager.setCallPreferences(bool)` |
| 📨 Restaurer msgs | `restoreMessages()` |
| 🔄 Sync alertes | `forceSyncAlerts()` |
| ⏻ Déconnexion | `logout()` |

### Appels (CallManager)

| Bouton | Fonction |
|---|---|
| 💬 Message (modal contact) | `CallManager.contactByMessage(plate)` |
| 🤝 Contact (modal contact) | `CallManager.contactByCall(plate, uid)` |
| Annuler (modal contact) | `CallManager.closeContactModal()` |
| Refuser (popup entrant) | `CallManager.refuseCall(requestId)` |
| Accepter (popup entrant) | `CallManager.acceptCall(requestId)` |
| Annuler (bannière envoyé) | `CallManager.cancelCallRequest(requestId)` |
| 💬 Envoyer un message (non autorisé) | `CallManager.closeNotAllowedModal()` |
| Fermer (non autorisé) | ferme le modal |

### Ange ✦

| Bouton | Fonction |
|---|---|
| ✦ (FAB) | `AngeDialog.open()` |
| Envoyer | `AngeDialog.send()` |
| ✕ Fermer | `AngeDialog.close()` |
| Option IA (clic) | remplit textarea avec label de l'option |
| Question IA (clic) | focus textarea |

### FloatingCard

| Bouton | Fonction |
|---|---|
| Btn1 (label variable) | `App.fcAction(1)` → callback cb1 |
| Btn2 (label variable) | `App.fcAction(2)` → callback cb2 |
