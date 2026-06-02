# Amélioration Navigation Fonctionnalités

> ImmatConnect Pro — Document unique de référence  
> Architecture · Audit · État · Plan  
> Version 16.0 · 2026-06-02  
> *(fusion de MEGA-STRUCTURE-NAVIGATION + AUDIT-NAVIGATION-UTILISATEUR — sans doublon)*

---

## ÉTAT GLOBAL — TABLEAU DE BORD

| Panel | ID | Rôle | État SESSION 16 | Friction ouverte | Priorité |
|---|---|---|---|---|---|
| Welcome | `sw` | Landing — connexion / inscription | ✅ OK | — | — |
| Auth | `sa` | Connexion et inscription | ⚠️ Formulaire dense | Simplifier inscription 2 étapes | P2 |
| Profil Setup | `sp` | Compléter profil avant carte | ⚠️ Plaque immuable mal annoncée | Clarifier message plaque | P2 |
| Reset MDP | `sr` | Nouveau mot de passe | ✅ OK | — | — |
| **Carte** | `sm` | Vue principale — radar + alertes | ✅ Fonctionnel | Marqueurs non orientés FRI-011 | P2 |
| **GPS** | `drive` | Navigation — itinéraire, voix, POI | ✅ FRI-002 résolu SESSION 16 | — | — |
| **Signaler** | `altet` | Créer alerte route / véhicule / aide | ✅ 2 étapes implémentées | reportPanel overlay legacy FRI-008 | P1 SESSION 17 |
| **Activité** | `activite` | Historique des interactions | ✅ FLOW-005 résolu SESSION 16 | — | — |
| **Messages** | `messages` | Messagerie directe | ✅ FRI-001/003 résolus SESSION 16 | Confirmation lecture FRI-006 | P2 |
| Conducteurs proches | `nearby` | Liste + contacter | ✅ OK | — | P2 |
| Alertes actives | `alerts` | Voir toutes les alertes | ✅ OK | — | — |
| Paramètres | `settings` | Config conducteur | ⚠️ Debug tools intrus | FRI-004 | P2 |
| Appel | `callOverlay` | WebRTC en cours | ✅ OK | — | — |
| SOS | FAB 3s | Urgence | ✅ Protégé (appui long + double confirm) | — | — |

---

## GRILLE DES INTERACTIONS

| ID | Interaction | État SESSION 16 | Retour A | Retour B | Amélioration |
|---|---|---|---|---|---|
| INT-001 | Message direct | ✅ | toast envoi | badge +1 · notification | Confirmation lecture P2 FRI-006 |
| INT-002 | Alerte véhicule | ✅ SESSION 15/16 | toast · badge "Vu" | FloatingCard + Activité | — |
| INT-003 | Signalement route | ✅ | marqueur carte | marqueur + badge | — |
| INT-004 | Demande d'aide | ✅ | marqueur · "Helper en route" | FloatingCard + Activité | Cycle helper carte P2 |
| INT-005 | Appel WebRTC | ✅ | callOverlay | modal accepter | — |
| INT-006 | Remerciement | ❌ ABSENT | — | — | À concevoir P2 |
| INT-007 | Résoudre alerte | ✅ | suppression marqueur | marqueur disparu | — |
| INT-008 | Blocage plaque | ⚠️ LOCAL | liste bloqués | (invisible) | Migrer DB P2 FRI-007 |
| INT-009 | SOS | ✅ | marqueur urgence + 112 | notification | — |
| INT-010 | Signalement abus | ❌ ABSENT | — | — | À concevoir P2 |
| INT-011 | Notification système | ✅ | — | toast · badge | Hiérarchie visuelle P2 |

---

## SECTION 1 — AUTH & PROFIL

### Architecture

```
BOOT → getSession()
  ├── session active → afterAuth() → openMap()
  └── pas de session → sw (Welcome)

sw → goAuth('login' ou 'signup') → sa (Auth)
  ├── login() → afterAuth() → profil ou carte
  └── signup() → email confirmation → attente

sp (Profil Setup) → saveProfile() → openMap()
sr (Reset MDP)    → updatePwd()   → connexion
```

### Boutons

| Bouton | Fonction | État |
|---|---|---|
| Se connecter | `goAuth('login')` | ✅ |
| Créer un compte | `goAuth('signup')` | ✅ |
| Se connecter / S'inscrire | `handleAuth()` | ✅ |
| Mot de passe oublié ? | `forgotPwd()` | ✅ |
| Renvoyer confirmation | `resendConfirm()` | ✅ |
| Enregistrer et continuer | `saveProfile()` | ✅ |
| Mettre à jour (MDP) | `updatePwd()` | ✅ |
| Se déconnecter | `logout()` | ✅ |

### Frictions P2

| Point | Amélioration |
|---|---|
| Formulaire inscription dense | Diviser en 2 étapes SESSION 17 |
| Message plaque immuable peu visible | Alerte claire avant confirmation SESSION 17 |

---

## SECTION 2 — CARTE PRINCIPALE

### Architecture

```
initMap()
  ├── tileLayer OSM
  ├── dragstart/zoomstart → autoFollow=false
  └── initSheetDrag() ← gestures sheet

locate() ← GPS watchPosition
  ├── màj myLat/myLng/lastSpeed
  ├── autoFollow → setView()
  ├── màj myMarker (heading si dispo)
  ├── checkRoute() ← navigation GPS
  ├── updateDrivingMode() ← > 15 km/h
  └── upsert user_locations DB (si visible)

loadOthers() ← login + toutes les 20s + realtime
  ├── SELECT user_locations (10 min)
  ├── filtre par rayon + bloqués
  ├── crée marqueurs → clic → showVehicleContextMenu()
  ├── clusterCloseVehicles()
  └── updateFrontVehicle() ← bannière devant
```

### Marqueurs

| Marqueur | Taille | Icône | Interaction |
|---|---|---|---|
| Mon véhicule | 48×48 | SVG cercle coloré + flèche heading | — |
| Autre véhicule | 38×38 | SVG cercle coloré | Clic → menu contextuel |
| Alerte route | variable | Pin coloré (rouge/orange/foncé) | Popup Leaflet |

### Menu contextuel véhicule

```
Clic marqueur → showVehicleContextMenu()
  ├── [💬 Message]  → vehicleContextAction('contact') → Messages compose
  ├── [⚠️ Signaler] → vehicleContextAction('signal')  → sigStep2Vehicle
  └── [🚫 Bloquer]  → vehicleContextAction('block')   → blockPlate()
```

### FABs

| Bouton | Fonction | État |
|---|---|---|
| Chip profil (top-bar) | `openDrawer()` | ✅ |
| 🎯 Recentrer | `recenter()` | ✅ |
| 👥 Conducteurs | `openNearby()` | ✅ |
| 🗺 Vue | `cycleView()` | ✅ |
| SOS (3s maintenu) | `startSosHold()` → `sos()` | ✅ Protégé |
| ✦ Ange | `AngeDialog.open()` | ✅ SESSION 15 |
| Contacter (bannière devant) | `contactFrontVehicle()` | ✅ |

**Friction P2 — FRI-011 :** Marqueurs non orientés → heading + couleur selon état SESSION 17+

---

## SECTION 3 — NAVIGATION GPS

### Architecture pipeline

```
Recherche
  gpsSearch → searchGps() → Nominatim API (France)
    → résultats triés par distance → pickDest(lat, lon, name)
      → OSRM route API → routeLayer polyligne Leaflet
      → routeMini "[X km · Y min · arrivée HH:MM]" + [Démarrer]

Voix     → voiceGps() → SpeechRecognition fr-FR → searchGps()
POI      → poi(q) → gpsSearch.value = q → searchGps()

Navigation active
  [Démarrer] → startNav() → driveMode=true
  locate() → checkRoute()
    ├── arrivée < 35m → "Vous êtes arrivé" + driveMode=false
    ├── étape < 75m   → speak(instruction) + nextStep++
    └── déviation > 450m → autoRecalculateRoute() → pickDest()

Stop : stopGps() → retire routeLayer + routeMini
```

### navPremium dashboard (màj toutes les 5s) — ✅ FRI-002 SESSION 16

| Cellule | ID | Donnée réelle | État |
|---|---|---|---|
| ETA | `etaVal` | Heure d'arrivée calculée | ✅ |
| Restant | `remainVal` | Distance restante | ✅ |
| **Vitesse** | `limitVal` | S.lastSpeed (km/h GPS) | ✅ — label "km/h" → "Vitesse" SESSION 16 |
| Proches | `trafficVal` | S.nearby.length | ✅ |
| Alertes | `laneVal` | Alertes actives | ✅ |
| Recalcul | `recalcVal` | "Auto"/"OK" | ✅ |
| ~~Barre trafic~~ | ~~`trafficBar`~~ | ~~Toujours 0%~~ | ✅ supprimée SESSION 16 |

### Boutons GPS

| Bouton | Fonction | État |
|---|---|---|
| 🔍 Rechercher | `searchGps()` | ✅ |
| 🎙️ Voix | `voiceGps()` | ✅ |
| ⛽ Carburant | `poi('station essence')` | ✅ |
| 🍽️ Resto | `poi('restaurant')` | ✅ |
| 🅿️ Parking | `poi('parking')` | ✅ |
| 🔧 Garage | `poi('garage automobile')` | ✅ |
| 🔌 Recharge | `poi('borne recharge')` | ✅ |
| 🏥 Santé | `poi('hôpital')` | ✅ |
| Démarrer | `startNav()` | ✅ |
| 📍 Me localiser | `locate()` | ✅ |
| ⏹ Stop GPS | `stopGps()` | ✅ |
| ✅ Alertes | `openAlerts()` | ✅ |
| ⭐ Ajouter destination | `saveCurrentDestination()` | ✅ |

---

## SECTION 4 — SIGNALEMENT

### Architecture — panelAltet (2 étapes — implémenté)

```
navSignaler() → panelAltet → sigStep1 (choix catégorie)
  ├── [🚦 Route]    → sigStepRoute()   → sigStep2Route
  ├── [🚘 Véhicule] → sigStepVehicle() → sigStep2Vehicle
  └── [🆘 Aide]    → sigStepAide()    → sigStep2Aide

sigStep2Route   : 6 types → roadReport(type) + sigDone()
sigStep2Vehicle : plaque + 6 types → vehicleAlertQuick(label) + sigDone()
sigStep2Aide    : 6 types → assist(type) + sigDone()
sigBack()  → retour sigStep1
sigDone()  → sigStep1 + navMap()
```

### Pipeline roadReport(type)

```
Input : accident / bouchon / obstacle / travaux / controle / danger
  ├── Guard GPS
  ├── addCommunityAlert({ group:'route', _mine:true })
  ├── saveReportRemote()
  ├── toast "✅ Signalement envoyé"
  └── notifyAlert()

Chez B : FloatingCard + Activité/Route (Reçus) · TTL : 30–120 min
```

### Pipeline vehicleAlertQuick(label) — ✅ FRI-001 SESSION 16

```
Input : label + plate = sigVehiclePlate ou selectedVehiclePlate()
  ├── Guard : plaque obligatoire · Guard : pas sa propre plaque
  ├── msg = "⚠️ SIGNALEMENT : [label]. Pouvez-vous vérifier ?"
  ├── ImmatMessages.sendToPlate(plate, msg)
  ├── broadcast 'vehicle_alert'
  └── toast "✅ Alerte envoyée"

Chez B : FloatingCard ⚠️/🚨 + Activité/Véhicule (Reçus)

vehicleAlert() depuis menu contextuel (FRI-001 SESSION 16) :
  AVANT : this.panel('contact') → panel mort, flux silencieusement bloqué
  APRÈS : this.panel('messages') + setMode('compose')
          + icComposePlate.value = plate
          + icComposeText.value = msg (setTimeout 80ms)
```

### Pipeline assist(type)

```
Input : panne / carburant / batterie / moteur / incendie / perdu
  ├── Guard GPS
  ├── addCommunityAlert({ group:'assist', _mine:true })
  ├── saveReportRemote({ category:'help' })
  └── toast "🆘 Demande d'aide envoyée"

Chez B : FloatingCard + Activité/Aide (Reçus) · TTL : 30–45 min
```

### Boutons Signaler

| Étape | Bouton | Fonction | État |
|---|---|---|---|
| 1 | 🚦 Route | `sigStepRoute()` | ✅ |
| 1 | 🚘 Véhicule | `sigStepVehicle()` | ✅ |
| 1 | 🆘 Aide | `sigStepAide()` | ✅ |
| 1 | ← Retour | `sigBack()` | ✅ |
| 2R | 💥 Accident | `roadReport('accident')` + `sigDone()` | ✅ |
| 2R | 🚦 Bouchon | `roadReport('bouchon')` + `sigDone()` | ✅ |
| 2R | ⚠️ Obstacle | `roadReport('obstacle')` + `sigDone()` | ✅ |
| 2R | 🚧 Travaux | `roadReport('travaux')` + `sigDone()` | ✅ |
| 2R | 👮 Contrôle | `roadReport('controle')` + `sigDone()` | ✅ |
| 2R | ❗ Danger | `roadReport('danger')` + `sigDone()` | ✅ |
| 2V | 🔴 Pneu | `vehicleAlertQuick('Pneu crevé ou à plat')` | ✅ |
| 2V | 💡 Feu | `vehicleAlertQuick('Feu arrière ou avant défaillant')` | ✅ |
| 2V | 🚪 Portière | `vehicleAlertQuick('Portière ou coffre mal fermé')` | ✅ |
| 2V | 🔥 Fumée | `vehicleAlertQuick('Fumée ou odeur de brûlé')` | ✅ |
| 2V | ⛓️ Objet | `vehicleAlertQuick('Objet traînant sous le véhicule')` | ✅ |
| 2V | ⚠️ Autre | `vehicleAlertQuick('Autre problème visible')` | ✅ |
| 2A | 🚗 Panne | `assist('panne')` + `sigDone()` | ✅ |
| 2A | ⛽ Carburant | `assist('carburant')` + `sigDone()` | ✅ |
| 2A | 🔋 Batterie | `assist('batterie')` + `sigDone()` | ✅ |
| 2A | ⚙️ Moteur | `assist('moteur')` + `sigDone()` | ✅ |
| 2A | 🔥 Incendie | `assist('incendie')` + `sigDone()` | ✅ |
| 2A | 🧭 Perdu | `assist('perdu')` + `sigDone()` | ✅ |

**Friction P1 SESSION 17 — FRI-008 :** reportPanel overlay legacy affiche 3 blocs simultanés → passer en 2 étapes (panelAltet le fait déjà, overlay legacy à supprimer)

---

## SECTION 5 — ACTIVITÉ

### Architecture

```
panelActivite
  ├── actMain (écran principal)
  │     ├── [🚦 Route]    → openActivityCat('route')
  │     ├── [🚘 Véhicule] → openActivityCat('vehicle')
  │     ├── [🆘 Aide]    → openActivityCat('aide')
  │     └── [Voir tout ›] → openActivityCat('all')
  └── actCatPanel (sous-panneau)
        ├── Onglet Reçus   → actCatTab('recus')
        ├── Onglet Envoyés → actCatTab('envoyes')
        └── actCatFeed (cards)
```

### Badges

```
actBadge        = alertes non vues (status ≠ seen/gone/resolved/present)
topMsgBadge     = messages non lus (_received && !read_at)
catBadgeRoute   = S.alerts.filter(group='route').length
catBadgeVehicle = S.alerts.filter(group='vehicle'|type='vehicule').length
catBadgeAide    = S.alerts.filter(group='assist').length
```

### Cards — Message reçu

```
┌─────────────────────────────────────────┐
│ 💬 [PLAQUE]                   [heure]  │
│    [extrait 60 car]                     │
├─────────────────────────────────────────┤
│ [Je m'arrête] [Je vérifie] [Merci]     │
│ [Contacter]                             │
└─────────────────────────────────────────┘
[Je m'arrête] → actQuickReply(plate, "Je m'arrête.")
[Je vérifie]  → actQuickReply(plate, "Je vérifie.")
[Merci]       → actQuickReply(plate, "Merci.")
[Contacter]   → CallManager.openContactOptions(plate)
```

### Cards — Alerte véhicule reçue · ✅ FLOW-005 SESSION 16

```
┌─────────────────────────────────────────┐
│ 🚘 [plaque_A]                 [heure]  │
│    [raison / label]                     │
│    📍 Position (si lat) · TTL bar       │
├─────────────────────────────────────────┤
│ [✓ J'ai vérifié]  [✓ C'est bon]        │
│ [📍 Voir]                               │
└─────────────────────────────────────────┘
SESSION 16 : "Toujours là"/"Résolu" → "J'ai vérifié"/"C'est bon"
```

### Cards — Alerte route reçue

```
┌─────────────────────────────────────────┐
│ 💥 [label] · [dist]           [heure]  │
│    TTL bar                              │
├─────────────────────────────────────────┤
│ [Toujours là] → actConfirmAlert('present')
│ [Disparu]     → actConfirmAlert('gone') → broadcast → disparaît pour tous
│ [📍 Voir]
└─────────────────────────────────────────┘
```

### Cards — Demande d'aide reçue

```
┌─────────────────────────────────────────┐
│ 🚗 [plaque_A]                 [heure]  │
│    "[ASSISTANCE] Panne" · 📍 · TTL bar │
├─────────────────────────────────────────┤
│ [✋ J'arrive] → actQuickReply("J'arrive…") → IC-003 chez A
│ [Je ne peux pas] → actQuickReply("Je ne peux pas…")
│ [💬 Contacter]   → actHelpReply(plate)
│ [📍 Voir]
└─────────────────────────────────────────┘
```

### Cards — Mon signalement (émetteur)

```
┌─────────────────────────────────────────┐
│ 🚗 "Toi" · [raison] · Badge état · TTL │
├─────────────────────────────────────────┤
│ [✓ Résolu] [Retirer]   ← si assist     │
│ [Retirer]              ← autres         │
│ [📍 Voir]                               │
└─────────────────────────────────────────┘
Badges : "Mon signalement" / "✋ En route · [plaque]" (IC-003 ✅ S15)
         / "Vu par le conducteur" (IC-002 ✅ S15) / "Vu"
```

---

## SECTION 6 — MESSAGES

### Architecture

```
panelMessages
  ├── mode 'inbox'   (Reçus)        → liste → openThread(plate)
  ├── mode 'sent'   (Envoyés)       → liste envoyés
  └── mode 'compose' (Composer ✏️ — SESSION 16, ex "Nouveau")
        ├── icComposePlate + 🎙️ voicePlate()
        └── icComposeText + ➤ sendNew()

Thread
  ├── Réponses rapides : [Je m'arrête] [Je vérifie] [Bien reçu]
  ├── icReplyText + ➤ reply()
  └── Par message : [Accepter]/[Refuser] · [Info utile]/[Déjà réglé]/[Faux] · [Supprimer] [Bloquer]
```

### Boutons Messages

| Bouton | Fonction | État |
|---|---|---|
| Onglet Reçus | `setMode('inbox')` | ✅ |
| Onglet Envoyés | `setMode('sent')` | ✅ |
| **Composer ✏️** | `setMode('compose')` | ✅ SESSION 16 — ex "Nouveau" |
| ➤ Envoyer nouveau | `sendNew()` | ✅ |
| ➤ Envoyer réponse | `reply()` | ✅ |
| 🎙️ Voix plaque | `voicePlate()` | ✅ |
| [Info utile] | `signalFeedback(id, plate, 'utile')` | ✅ |
| [Déjà réglé] | `signalFeedback(id, plate, 'regle')` | ✅ |
| [Faux signalement] | `signalFeedback(id, plate, 'faux')` | ✅ |
| Supprimer | `deleteMessage(id)` | ✅ |
| Supprimer conversation | `deleteThread()` | ✅ |
| Bloquer | `blockPlate(plate)` | ✅ |

**Badge :** `topMsgBadge = S.unreadMsgCount` — décrémenté par `markRead()` et ouverture thread  
**Friction P2 — FRI-006 :** Pas d'indicateur "Lu" côté émetteur → ajouter `read_at` DB SESSION 17

---

## SECTION 7 — INTERACTIONS A↔B (FLUX COMPLETS)

### FLOW-001 — Demande d'aide

```
A → assist(type) → INSERT reports + broadcast new_report
B ← FloatingCard "✋ J'aide" / "🗺 Voir" + Activité/Aide (Reçus)
```

### FLOW-002 — Helper en route · ✅ IC-003 SESSION 15

```
B → actQuickReply(plate, "J'arrive, je viens vous aider.") → INSERT messages
A ← subMsgs détecte startsWith("J'arrive")
   → FloatingCard ✋ "Helper en route · [plaque]"
   → myAssist.status = 'helper_coming' + _helperPlate = plate
   → Card badge "✋ En route · [plaque]"
```

### FLOW-003 — Helper indisponible

```
B → actQuickReply(plate, "Je ne peux pas aider.") → INSERT messages
A ← FloatingCard 💬 "Message de [plaque]" (standard)
```

### FLOW-004 — Aide résolue

```
A → actConfirmAlert(id, 'resolved') → UPDATE reports + broadcast resolve_report
B ← dismissAlert() → alerte retirée + marqueur carte disparu
```

### FLOW-005 — Alerte véhicule · ✅ IC-002 SESSION 15 · Labels ✅ SESSION 16

```
A → vehicleAlertQuick(label) → INSERT messages + broadcast vehicle_alert
B ← FloatingCard ⚠️/🚨 "Alerte sur votre véhicule" + Activité/Véhicule
  → [✓ J'ai vérifié] ou [✓ C'est bon]  ← SESSION 16
B → respondVehicleAlert(id, kind) → INSERT messages "note confiance actuelle : X%"
A ← subMsgs détecte includes('note confiance actuelle')
   → toast "✓ [plaque] a vu votre signalement"
   → myVehAlert.status = 'seen_by_driver' + badge "Vu par le conducteur"
```

### FLOW-006 — Message direct

```
A → sendNew() ou reply() → INSERT messages
B ← FloatingCard 💬 [Vu] [Répondre →] + badge +1 + Activité
B → reply() → INSERT messages
A ← FloatingCard 💬 + Messages
```

### FLOW-007 — Signalement route

```
A → roadReport(type) → INSERT reports + broadcast new_report
Tous B dans rayon ← FloatingCard + Activité/Route
  → [Toujours là] → actConfirmAlert('present')
  → [Disparu]     → actConfirmAlert('gone') → broadcast → disparaît pour tous
```

### FLOW-008 — Demande de contact (CallManager)

```
A → CallManager.openContactOptions(plate)
  → Modal [💬 Message] [🤝 Contact]
  → contactByCall(plate, uid) → callSentBanner "En attente…"
B ← callIncomingPopup "[plaque A] vous demande un contact"
  → [Accepter] → callOverlay (appel actif)
  → [Refuser]  → bannière fermée chez A

Si B n'a pas activé les appels :
  → callNotAllowedModal [💬 Envoyer un message] [Fermer]
```

---

## SECTION 8 — PARAMÈTRES & DRAWER

### Drawer (menu profil)

```
Chip profil (top-bar) → openDrawer()
  ├── Plaque + Pseudo (affichage seul)
  ├── Rayon détection (1/5/10/25 km) → setRadius(v) → loadOthers()
  ├── [🧭 Navigation GPS]      → panel('drive')
  ├── [👥 Conducteurs proches]  → openNearby()
  ├── [👻 Mode invisible]       → toggleInvisible()
  └── [⚙️ Paramètres]          → panel('settings')
```

### Boutons Paramètres

| Bouton | Fonction | État |
|---|---|---|
| 🚫 Bloqués | `openBlocked()` | ✅ — local seulement, migrer DB FRI-007 P2 |
| 🕘 Récents | `openRecent()` | ✅ |
| ⚖️ Confidentialité | `openLegal()` | ✅ |
| 🔔 Sons | `toggleSounds()` | ✅ |
| ⚡ Performance | `toggleReduceEffects()` | ✅ |
| 🧹 Cache | `clearOfflineCache()` | ✅ |
| 🔊 Voix GPS | `toggleVoice()` | ✅ |
| Genre voix | `toggleVoiceGender()` | ✅ |
| Toggle Autoriser contacts | `CallManager.setCallPreferences(bool)` | ✅ |
| 📨 Restaurer msgs | `restoreMessages()` | ⚠️ Debug → Gardien FRI-004 P2 |
| 🔄 Sync alertes | `forceSyncAlerts()` | ⚠️ Debug → Gardien FRI-004 P2 |
| ⏻ Déconnexion | `logout()` | ✅ |

---

## SECTION 9 — REALTIME & AUTOMATISMES

### Canaux Supabase actifs

| Canal | Événements | Action |
|---|---|---|
| `ic_msg_[userId]` | INSERT messages | notif + IC-003/IC-002/FloatingCard |
| `ic_loc` | INSERT/UPDATE user_locations | loadOthers() |
| `ic_reports_[userId]` | INSERT reports | (non utilisé activement) |
| `ic_community_live` | INSERT/UPDATE reports + broadcasts | addCommunityAlert / dismissAlert / FloatingCard |

### Broadcasts custom

| Signal | Déclencheur | Effet chez B |
|---|---|---|
| `new_report` | roadReport() / assist() | addCommunityAlert + FloatingCard |
| `resolve_report` | actConfirmAlert('gone'/'resolved') | dismissAlert pour tous |
| `vehicle_alert` | vehicleAlertQuick() | FloatingCard ⚠️/🚨 |

### Automatismes temporels

| Intervalle | Action |
|---|---|
| Toutes les 20s | `loadOthers()` → refresh marqueurs |
| Toutes les 60s | `cleanupAlerts()` → retire alertes TTL expirées |
| Toutes les 90s | `syncOfflineReports()` → retry hors ligne |
| Toutes les 15s (visible) | `syncCommunityAlerts()` → sync DB |
| Toutes les 5s (visible) | `updateNavPremium()` → dashboard GPS |
| Toutes les 30s | `cacheState()` + `reconnectSafe()` |
| Chaque fix GPS | `checkRoute()` + `upsert user_locations` |
| Chaque visibilitychange | `syncCommunityAlerts()` + `updateActBadge()` |

---

## SECTION 10 — SOS · ✅ Déjà protégé

```
FAB SOS (3s maintenu)
  ├── pointerdown → startSosHold()
  │     → classList.add('holding') + toast "Maintiens 3 secondes"
  │     → setTimeout(sos, 3000)
  ├── pointerup / pointerleave → cancelSosHold() → clearTimeout
  └── Après 3s → sos()
        ├── assist('panne')  ← si position GPS disponible
        ├── confirm "Appeler le 112 en vraie urgence ?"
        └── confirm "Confirmation finale ?"
              └── location.href = 'tel:112'
```

---

## SECTION 11 — FIABILITÉ

### Score local trustDelta(plate, delta)

| Action | Delta |
|---|---|
| signalFeedback('utile') / respondVehicleAlert('utile') | +8 |
| respondVehicleAlert('merci') | +5 |
| signalFeedback('regle') / respondVehicleAlert('recu') | +3 |
| respondVehicleAlert('regle') | +2 |
| respondVehicleAlert('vu') | +1 |
| signalFeedback('faux') / respondVehicleAlert('faux') | -12 |

Stock : `ic_trust_scores { plate: 0–100 }` · Valeur initiale : 70

### Score persistant AppReliabilityPro

```
Déclenché après signalFeedback() (patch non-destructif)
  ├── Anti-spam (vérifie feedback déjà envoyé)
  ├── UPDATE profiles (reliability_score, reliability_points, reliability_level)
  ├── UPDATE messages (feedback, feedback_score_delta)
  └── INSERT messages → notification au reporter

Niveaux :
  ≥ 90 → "Expert communauté"   ≥ 75 → "Conducteur fiable"
  ≥ 55 → "Contributeur confirmé"   ≥ 35 → "Nouveau contributeur"
  < 35 → "Fiabilité à construire"
```

---

## SECTION 12 — ANGE ✦

### Conditions d'affichage · ✅ SESSION 15

```
openMap() → resolve rôle
  ├── rôle = 'gardien' → is-gardien CSS + angeFab visible
  ├── rôle ≠ 'gardien' → angeFab visible (conducteur normal)
  └── erreur réseau    → angeFab visible (fail-open)
```

### Dialogue IA

```
[✦] → AngeDialog.open() → angePanel
  ├── [Envoyer] → AngeDialog.send()
  │     ├── snapshot = ImmatOrganism.diagnose() + { panel, role, features }
  │     ├── sb.functions.invoke('immat-brain-dialog', { message, feature, mode, snapshot })
  │     └── renderResponse(data) :
  │           ├── r.juste / r.sources → texte principal
  │           ├── r.vigilance[]       → ⚡ orange
  │           ├── r.options[]         → cards cliquables
  │           └── r.question          → invitation répondre
  └── [✕] → AngeDialog.close()

NOTE P2 : Edge Function réservée Gardien → étendre aux conducteurs normaux (depth=2) SESSION 17
```

---

## PLAN D'AMÉLIORATION

### SESSION 16 — ✅ FAIT (commit b202697)

| Réf | Action | Résultat |
|---|---|---|
| FRI-001 | `vehicleAlert()` → `panel('messages')` + préremplissage compose | Flux débloqué |
| FRI-002 | navPremium : "km/h" → "Vitesse" + supprimer trafficBar | Donnée réelle affichée |
| FRI-003 | Onglet "Nouveau" → "Composer ✏️" | Libellé sans ambiguïté |
| FLOW-005 | Labels véhicule : "J'ai vérifié" / "C'est bon" | Contexte adapté |
| FRI-010 | SOS — vérification | Déjà protégé — rien à faire |
| FRI-008 | reportPanel overlay | Reporter SESSION 17 — panelAltet 2 étapes fonctionnel |

### SESSION 17+ — P2

| Réf | Action | Effort |
|---|---|---|
| FRI-008 | Supprimer reportPanel overlay legacy | Moyen |
| FRI-004 | Debug tools → réserver au Gardien | Faible |
| FRI-006 | Indicateur "Lu" côté émetteur + `read_at` DB | Moyen |
| FRI-007 | Blocage plaque → champ JSON profiles DB | Moyen |
| FRI-009 | Cycle aide complet (helper confirmé sur carte) | Moyen |
| FRI-011 | Marqueurs orientés (heading) + couleur selon état | Élevé |
| INT-006 | Bouton Remerciement social | Moyen |
| INT-010 | Signalement abus modération | Moyen |
| SA | Inscription en 2 étapes | Moyen |
| ANGE | Edge Function conducteurs normaux (depth=2) | Moyen |

---

## HISTORIQUE DES SESSIONS

| Session | Réf | Fonctionnalité | Fichier | Commit |
|---|---|---|---|---|
| 15 | IC-003 | FloatingCard "✋ Helper en route" | index.html | SESSION 15 |
| 15 | IC-002 | Toast + badge "Vu par le conducteur" | index.html | SESSION 15 |
| 15 | IC-003 | Badge `helper_coming` + plaque | index.html | SESSION 15 |
| 15 | Ange | Bouton ✦ visible tous conducteurs | index.html | SESSION 15 |
| 15 | ARCH | Architecture fonctionnelle complète | ARCHITECTURE-FONCTIONNELLE-COMPLETE.md | 965cf96 |
| 15 | MATRICE | Interactions A↔B | MATRICE-INTERACTIONS-COMPLETE.md | c01d8e8 |
| 15 | NS | Audit base connaissance Ange | AUDIT-BASE-CONNAISSANCE-ANGE.md | 9263f7e |
| 16 | FRI-001 | vehicleAlert → panel messages + préremplissage | index.html | b202697 |
| 16 | FRI-002 | navPremium "Vitesse" + suppr trafficBar | index.html | b202697 |
| 16 | FRI-003 | "Composer ✏️" (ex "Nouveau") | index.html | b202697 |
| 16 | FLOW-005 | Labels véhicule "J'ai vérifié"/"C'est bon" | index.html | b202697 |
| 16 | DOC | Ce document (fusion sans doublon) | MEGA-STRUCTURE-NAVIGATION.md | — |

---

## DONNÉES TECHNIQUES

### Objet S — État global

```javascript
S = {
  uid, profile, isGardien,
  map, myMarker, otherMkrs, alertMarkersById, nearby,
  myLat, myLng, lastSpeed, watchId, driveMode, autoFollow, mapView, frontVehicle,
  routeDest, routeLayer, routeSteps, nextStep, favorites, gpsHistory,
  alerts, alertHistory, alertFilter, offlineReports, resolvedRemoteIds,
  conv, selPlate, contextVehicle, unreadMsgCount, _actMessages,
  chMsg, chLoc, chReports, chCommunityReports,
  invisible, radiusKm, voice, sounds, mode,
  blocked, recent, trust, networkOnline, sosTimer, sheetSnap,
  _actCat, _actCatTab, _actLoadingP
}
```

### CATS — Catalogue des alertes

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

### Statuts d'une alerte

| Statut | Signification |
|---|---|
| `pending` | Créée, pas encore vue |
| `seen` | Vue par B |
| `present` | Confirmée "toujours là" (route) |
| `gone` | Retirée sans résolution |
| `resolved` | Résolue |
| `helper_coming` | B a dit "J'arrive" (IC-003) |
| `seen_by_driver` | B a répondu à l'alerte véhicule (IC-002) |

### localStorage — Clés

| Clé | Contenu | Limite |
|---|---|---|
| `ic_alerts` | S.alerts | 80 |
| `ic_alert_history` | S.alertHistory | 150 |
| `ic_offline_reports` | S.offlineReports | 50 |
| `ic_resolved_remote_ids` | IDs résolus | 200 |
| `ic_blocked` | S.blocked | illimité |
| `ic_recent_vehicles` | S.recent | 20 |
| `ic_favorites` | S.favorites | 20 |
| `ic_gps_history` | S.gpsHistory | 20 |
| `ic_trust_scores` | { plate: score } | illimité |
| `ic_unread_msg_count` | entier | — |
| `ic_deleted_msgs` | IDs supprimés | 500 |
| `ic_invisible` | '0'/'1' | — |
| `ic_radius` | '1'/'5'/'10'/'25' | — |
| `ic_voice` | '0'/'1' | — |
| `ic_sounds` | '0'/'1' | — |
| `ic_view` | 'drive'/'2d' | — |
| `ic_alert_filter` | all/route/assist/vehicle/urgent | — |
| `ic_reduce_effects` | '0'/'1' | — |
| `ic_voice_gender` | 'female'/'male' | — |

---

## GRAPHE DÉPENDANCES FONCTIONS

```
openMap()
  └─ initMap · subMsgs · subLocs · subscribeCommunityReports
     syncCommunityAlerts · loadOthers · updateActBadge · locate

locate()
  └─ checkRoute · updateDrivingMode · updateCommunityStatus · upsert user_locations

loadOthers()
  └─ clusterCloseVehicles · addRecent · updateFrontVehicle · updateCommunityStatus

addCommunityAlert()
  └─ normalizeAlert · upsertAlert · syncDerivedAlertUI
     showFloatingCard (si notify && isNearby)

syncDerivedAlertUI()
  └─ saveAlerts · syncAlertMarkers · renderAlerts · schedFeed · schedBadge

actConfirmAlert()
  └─ UPDATE reports DB · broadcast resolve_report · renderActivityFeed · updateActBadge

vehicleAlertQuick() / roadReport() / assist()
  └─ addCommunityAlert · saveReportRemote · notifyAlert

subMsgs INSERT
  └─ profilesByIds · notif · [IC-003 si J'arrive] · [IC-002 si feedback] · [FloatingCard]

signalFeedback() [AppReliabilityPro]
  └─ trustDelta · UPDATE profiles · UPDATE messages · INSERT notification reporter
```

---

## RÈGLE DE MISE À JOUR

À chaque session qui modifie une fonctionnalité :
1. Mettre à jour la ligne dans **ÉTAT GLOBAL — TABLEAU DE BORD**
2. Mettre à jour la section concernée (état SESSION + friction ouverte)
3. Déplacer l'item du Plan vers **HISTORIQUE DES SESSIONS**
4. Incrémenter la version en tête de document

> Ce document est la **source unique de référence** navigation ImmatConnect.  
> Il remplace et fusionne : `MEGA-STRUCTURE-NAVIGATION.md` (v15) + `AUDIT-NAVIGATION-UTILISATEUR.md` (v16).
