# Amélioration Navigation Fonctionnalités

> ImmatConnect Pro — Document de référence complet
> Croisement ARCHITECTURE-FONCTIONNELLE-COMPLETE + AUDIT-NAVIGATION-UTILISATEUR
> Version 15.0 · 2026-06-02

---

## ÉTAT GLOBAL — TABLEAU DE BORD

| Panel | ID | Rôle | État actuel | Friction | Priorité |
|---|---|---|---|---|---|
| Welcome | `sw` | Landing — connexion / inscription | ✅ OK | — | — |
| Auth | `sa` | Connexion et inscription | ⚠️ Formulaire dense | Simplifier inscription 2 étapes | P2 |
| Profil Setup | `sp` | Compléter profil avant carte | ⚠️ Plaque immuable mal annoncée | Clarifier message plaque | P2 |
| Reset MDP | `sr` | Nouveau mot de passe | ✅ OK | — | — |
| **Carte** | `sm` | Vue principale — radar + alertes | ✅ Fonctionnel | Marqueurs non orientés | P2 |
| **GPS** | `drive` | Navigation — itinéraire, voix, POI | 🔴 Label "km/h" ambigu · trafficBar toujours 0% | FRI-002 | **P1** |
| **Signaler** | `altet` | Créer alerte route / véhicule / aide | ✅ 2 étapes implémentées | reportPanel overlay legacy | P2 |
| **Activité** | `activite` | Historique des interactions | ⚠️ Labels véhicule inadaptés | FLOW-005 | **P1** |
| **Messages** | `messages` | Messagerie directe | ⚠️ Pas de confirmation lecture | FRI-006 | P2 |
| `vehicleAlert()` | (JS) | Alerte depuis menu contextuel | 🔴 Ouvre panel mort `contact` | FRI-001 | **P1** |
| Conducteurs proches | `nearby` | Liste + contacter | ✅ OK | — | P2 |
| Alertes actives | `alerts` | Voir toutes les alertes | ✅ OK | — | — |
| Paramètres | `settings` | Config conducteur | ⚠️ Debug tools intrus | FRI-004 | P2 |
| Appel | `callOverlay` | WebRTC en cours | ✅ OK | — | — |
| SOS | FAB 3s | Urgence | ✅ Déjà protégé | — | — |

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
sr (Reset MDP) → updatePwd() → connexion
```

### Boutons

| Bouton | Fonction |
|---|---|
| Se connecter | `goAuth('login')` |
| Créer un compte | `goAuth('signup')` |
| Se connecter / S'inscrire | `handleAuth()` |
| Mot de passe oublié ? | `forgotPwd()` |
| Renvoyer confirmation | `resendConfirm()` |
| Enregistrer et continuer | `saveProfile()` |
| Se déconnecter | `logout()` |
| Mettre à jour (MDP) | `updatePwd()` |

### État & Amélioration

| Point | État | Amélioration |
|---|---|---|
| Formulaire inscription | ⚠️ Dense | Diviser en 2 étapes (P2) |
| Message plaque immuable | ⚠️ Peu visible | Alerte claire avant confirmation (P2) |

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
Clic marqueur véhicule → showVehicleContextMenu()
  ├── [💬 Message]  → vehicleContextAction('contact') → Messages compose
  ├── [⚠️ Signaler] → vehicleContextAction('signal')  → sigStep2Vehicle
  └── [🚫 Bloquer]  → vehicleContextAction('block')   → blockPlate()
```

### FABs

| Bouton | Fonction |
|---|---|
| Chip profil (top-bar) | `openDrawer()` |
| 🎯 Recentrer | `recenter()` |
| 👥 Conducteurs | `openNearby()` |
| 🗺 Vue | `cycleView()` |
| SOS (3s maintenu) | `startSosHold()` → `sos()` |
| ✦ Ange | `AngeDialog.open()` |
| Contacter (bannière devant) | `contactFrontVehicle()` |

### État & Amélioration

| Point | État | Amélioration |
|---|---|---|
| Marqueurs véhicules | ⚠️ Cercles fixes | Orientés (heading) + couleur selon état (P2) FRI-011 |
| Ange visible | ✅ SESSION 15 | Edge Function réservée Gardien → à étendre (SESSION 16) |

---

## SECTION 3 — NAVIGATION GPS

### Architecture pipeline

```
Recherche
  gpsSearch → searchGps() → Nominatim API (France)
    → résultats triés par distance
    → pickDest(lat, lon, name)
      → OSRM route API
      → routeLayer polyligne Leaflet
      → routeMini "[X km · Y min · arrivée HH:MM]" + [Démarrer]

Voix
  🎙️ → voiceGps() → SpeechRecognition (fr-FR) → searchGps()

POI rapides
  poi(q) → gpsSearch.value = q → searchGps()

Navigation active
  [Démarrer] → startNav() → driveMode=true
  locate() → checkRoute()
    ├── arrivée < 35m → "Vous êtes arrivé" + driveMode=false
    ├── étape < 75m  → speak(instruction) + nextStep++
    └── déviation > 450m → autoRecalculateRoute() → pickDest()

Stop
  [⏹ Stop] → stopGps() → retire routeLayer + routeMini
```

### navPremium dashboard (mise à jour toutes les 5s)

| Cellule | ID | Contenu réel | État |
|---|---|---|---|
| ETA | `etaVal` | Heure d'arrivée calculée | ✅ Réel |
| Restant | `remainVal` | Distance restante | ✅ Réel |
| **km/h** | `limitVal` | **S.lastSpeed (vitesse GPS actuelle)** | ⚠️ Label "km/h" ambigu → **renommer "Vitesse"** |
| Proches | `trafficVal` | S.nearby.length | ✅ Réel |
| Alertes | `laneVal` | Alertes actives | ✅ Réel |
| Recalcul | `recalcVal` | "Auto"/"OK" | ✅ Réel |
| Barre trafic | `trafficBar` | Toujours 0% | 🔴 Simulé → **supprimer** |

### Boutons GPS

| Bouton | Fonction |
|---|---|
| 🔍 Rechercher | `searchGps()` |
| 🎙️ Voix | `voiceGps()` |
| ⛽ Carburant | `poi('station essence')` |
| 🍽️ Resto | `poi('restaurant')` |
| 🅿️ Parking | `poi('parking')` |
| 🔧 Garage | `poi('garage automobile')` |
| 🔌 Recharge | `poi('borne recharge')` |
| 🏥 Santé | `poi('hôpital')` |
| Démarrer | `startNav()` |
| 📍 Me localiser | `locate()` |
| ⏹ Stop GPS | `stopGps()` |
| ✅ Alertes | `openAlerts()` |
| ⭐ Ajouter destination | `saveCurrentDestination()` |

### État & Améliorations P1

| Friction | Problème | Fix SESSION 16 |
|---|---|---|
| **FRI-002** | Label "km/h" → utilisateur croit que c'est la limite de vitesse | Renommer → "Vitesse" |
| **FRI-002** | `trafficBar` toujours à 0% → donnée simulée affichée | Supprimer le div `trafficBar` |

---

## SECTION 4 — SIGNALEMENT

### Architecture — panelAltet (2 étapes — implémenté)

```
navSignaler() → panelAltet → sigStep1 (choix catégorie)
  ├── [🚦 Route]   → sigStepRoute()   → sigStep2Route
  ├── [🚘 Véhicule] → sigStepVehicle() → sigStep2Vehicle
  └── [🆘 Aide]   → sigStepAide()    → sigStep2Aide

sigStep2Route : 6 types → roadReport(type) + sigDone()
sigStep2Vehicle : plaque + 6 types → vehicleAlertQuick(label) + sigDone()
sigStep2Aide : 6 types → assist(type) + sigDone()

sigBack() → retour sigStep1
sigDone() → sigStep1 + navMap()
```

### Pipeline roadReport(type)

```
Input : accident / bouchon / obstacle / travaux / controle / danger
  ├── Guard GPS
  ├── addCommunityAlert({ group:'route', _mine:true })
  ├── saveReportRemote()
  ├── closeOverlay('reportPanel')
  ├── toast "✅ Signalement envoyé"
  └── notifyAlert()

Chez B : FloatingCard + Activité/Route (Reçus)
TTL : 30–120 min selon type
```

### Pipeline vehicleAlertQuick(label)

```
Input : label texte + plate = sigVehiclePlate ou selectedVehiclePlate()
  ├── Guard : plaque obligatoire
  ├── Guard : pas sa propre plaque
  ├── msg = "⚠️ SIGNALEMENT : [label]. Pouvez-vous vérifier ?"
  ├── ImmatMessages.sendToPlate(plate, msg)
  ├── broadcast 'vehicle_alert'
  └── toast "✅ Alerte envoyée"

Chez B : FloatingCard ⚠️/🚨 + Activité/Véhicule (Reçus)
```

### Pipeline assist(type)

```
Input : panne / carburant / batterie / moteur / incendie / perdu
  ├── Guard GPS
  ├── addCommunityAlert({ group:'assist', _mine:true })
  ├── saveReportRemote({ category:'help' })
  └── toast "🆘 Demande d'aide envoyée"

Chez B : FloatingCard + Activité/Aide (Reçus)
TTL : 30–45 min
```

### Boutons Signaler — étape 1

| Bouton | Fonction |
|---|---|
| 🚦 Route | `sigStepRoute()` |
| 🚘 Véhicule | `sigStepVehicle()` |
| 🆘 Aide | `sigStepAide()` |
| ← Retour | `sigBack()` |

### Boutons Signaler — étape 2 Route

| Bouton | Fonction |
|---|---|
| 💥 Accident | `roadReport('accident')` + `sigDone()` |
| 🚦 Bouchon | `roadReport('bouchon')` + `sigDone()` |
| ⚠️ Obstacle | `roadReport('obstacle')` + `sigDone()` |
| 🚧 Travaux | `roadReport('travaux')` + `sigDone()` |
| 👮 Contrôle | `roadReport('controle')` + `sigDone()` |
| ❗ Danger | `roadReport('danger')` + `sigDone()` |

### Boutons Signaler — étape 2 Véhicule

| Bouton | Fonction |
|---|---|
| 🔴 Pneu | `vehicleAlertQuick('Pneu crevé ou à plat')` |
| 💡 Feu | `vehicleAlertQuick('Feu arrière ou avant défaillant')` |
| 🚪 Portière | `vehicleAlertQuick('Portière ou coffre mal fermé')` |
| 🔥 Fumée | `vehicleAlertQuick('Fumée ou odeur de brûlé')` |
| ⛓️ Objet | `vehicleAlertQuick('Objet traînant sous le véhicule')` |
| ⚠️ Autre | `vehicleAlertQuick('Autre problème visible')` |

### Boutons Signaler — étape 2 Aide

| Bouton | Fonction |
|---|---|
| 🚗 Panne | `assist('panne')` + `sigDone()` |
| ⛽ Carburant | `assist('carburant')` + `sigDone()` |
| 🔋 Batterie | `assist('batterie')` + `sigDone()` |
| ⚙️ Moteur | `assist('moteur')` + `sigDone()` |
| 🔥 Incendie | `assist('incendie')` + `sigDone()` |
| 🧭 Perdu | `assist('perdu')` + `sigDone()` |

### vehicleAlert() depuis menu contextuel — BUG P1

```
PROBLÈME : vehicleAlert() (ligne ~804) appelle this.panel('contact')
           → 'contact' n'est pas dans la liste des panels reconnus
           → appel silencieusement ignoré → utilisateur bloqué

FIX SESSION 16 :
  this.panel('contact')
  → this.panel('messages') + setTimeout → Messages compose
    avec icComposePlate.value = plate
    et icComposeText.value = msg déjà rempli
```

---

## SECTION 5 — ACTIVITÉ

### Architecture — Structure

```
panelActivite
  ├── actMain (écran principal)
  │     ├── [🚦 Route]   → openActivityCat('route')
  │     ├── [🚘 Véhicule] → openActivityCat('vehicle')
  │     ├── [🆘 Aide]   → openActivityCat('aide')
  │     └── [Voir tout ›] → openActivityCat('all')
  └── actCatPanel (sous-panneau)
        ├── Onglet Reçus  → actCatTab('recus')
        ├── Onglet Envoyés → actCatTab('envoyes')
        └── actCatFeed (cards)
```

### Badges

```
actBadge = alertes non vues (S.alerts.filter status≠seen/gone/resolved/present)
topMsgBadge = messages non lus (S._actMessages.filter _received && !read_at)

catBadgeRoute   = S.alerts.filter(group='route').length
catBadgeVehicle = S.alerts.filter(group='vehicle'|type='vehicule').length
catBadgeAide    = S.alerts.filter(group='assist').length
```

### Cards — Message reçu

```
┌────────────────────────────────────────┐
│ 💬 [PLAQUE]                  [heure]  │
│    [extrait 60 car]                    │
├────────────────────────────────────────┤
│ [Je m'arrête] [Je vérifie] [Merci]    │
│ [Contacter]                            │
└────────────────────────────────────────┘

Boutons Reçu :
  [Je m'arrête] → actQuickReply(plate, "Je m'arrête.")
  [Je vérifie]  → actQuickReply(plate, "Je vérifie.")
  [Merci]       → actQuickReply(plate, "Merci.")
  [Contacter]   → CallManager.openContactOptions(plate)

Boutons Envoyé :
  [💬 Répondre] → actOpenConv(plate)
  [Supprimer]   → actDeleteConv(plate)
```

### Cards — Alerte véhicule reçue (B reçoit de A)

```
┌────────────────────────────────────────┐
│ 🚘 [plaque_A]                [heure]  │
│    [raison / label]                    │
│    📍 Position (si lat)                │
│    TTL bar ████░░░                     │
├────────────────────────────────────────┤
│ [Je m'arrête] [Je vérifie] [Merci]    │
│ [Contacter]   [📍 Voir]               │
└────────────────────────────────────────┘
```

### Cards — Alerte route reçue

```
┌────────────────────────────────────────┐
│ 💥 [label] · [dist]          [heure]  │
│    TTL bar                             │
├────────────────────────────────────────┤
│ [Contacter] [Toujours là] [Disparu]   │
│ [📍 Voir]                             │
└────────────────────────────────────────┘

[Toujours là] → actConfirmAlert(id, 'present')
[Disparu]     → actConfirmAlert(id, 'gone') → broadcast resolve
```

### Cards — Demande d'aide reçue (B voit la demande de A)

```
┌────────────────────────────────────────┐
│ 🚗 [plaque_A]                [heure]  │
│    "[ASSISTANCE] Panne"                │
│    📍 Position (si lat)                │
│    TTL bar                             │
├────────────────────────────────────────┤
│ [✋ J'arrive] [Je ne peux pas]         │
│ [💬 Contacter] [📍 Voir]              │
└────────────────────────────────────────┘

[✋ J'arrive]    → actQuickReply(plate, "J'arrive...") → IC-003 chez A
[Je ne peux pas] → actQuickReply(plate, "Je ne peux pas...")
[💬 Contacter]   → actHelpReply(plate) → compose Messages
```

### Cards — Mon signalement (A voit son propre envoi)

```
┌────────────────────────────────────────┐
│ 🚗 "Toi"                              │
│    [raison]                            │
│    Badge : état actuel                 │
│    TTL bar                             │
├────────────────────────────────────────┤
│ [✓ Résolu] [Retirer]   ← si assist    │
│ [Retirer]              ← autres        │
│ [📍 Voir]                              │
└────────────────────────────────────────┘

Badges d'état :
  "Mon signalement"        → initial
  "✋ En route · [plaque]" → B a dit "J'arrive" (IC-003 ✅ SESSION 15)
  "Vu par le conducteur"   → B a répondu alerte véhicule (IC-002 ✅ SESSION 15)
  "Vu"                     → alerte vue non-propre
```

### Labels FLOW-005 — Fix P1

```
PROBLÈME : Quand B reçoit une alerte véhicule (ex: "Pneu crevé"),
           les boutons affichent "✓ Toujours là" et "✓ Résolu"
           → labels conçus pour la route, pas le véhicule

ACTUEL (ligne 1165-1166 index.html) :
  <button>✓ Toujours là</button>   → actConfirmAlert('seen')
  <button>✓ Résolu</button>        → actConfirmAlert('resolved')

FIX SESSION 16 :
  <button>✓ J'ai vérifié</button>  → actConfirmAlert('seen')
  <button>✓ C'est bon</button>     → actConfirmAlert('resolved')
```

---

## SECTION 6 — MESSAGES

### Architecture

```
panelMessages
  ├── mode 'inbox' (Reçus)    → liste conversations → openThread(plate)
  ├── mode 'sent'  (Envoyés)  → liste envoyés
  └── mode 'compose' (Nouveau → SESSION 16 : renommer "Composer ✏️")
        ├── icComposePlate (plaque) + 🎙️ voicePlate()
        └── icComposeText + ➤ sendNew()

Thread
  ├── Réponses rapides : [Je m'arrête] [Je vérifie] [Bien reçu]
  ├── icReplyText + ➤ reply()
  └── Chaque message :
        ├── [Accepter] / [Refuser] (si pending)
        ├── [Info utile] [Déjà réglé] [Faux signalement] (si ⚠️)
        └── [Supprimer] [Bloquer]
```

### Tous les boutons Messages

| Bouton | Fonction |
|---|---|
| Onglet Reçus | `setMode('inbox')` |
| Onglet Envoyés | `setMode('sent')` |
| Composer ✏️ *(SESSION 16)* | `setMode('compose')` |
| ➤ Envoyer nouveau | `sendNew()` |
| ➤ Envoyer réponse | `reply()` |
| 🎙️ Voix plaque | `voicePlate()` |
| [Info utile] | `signalFeedback(id, sender, plate, 'utile')` |
| [Déjà réglé] | `signalFeedback(id, sender, plate, 'regle')` |
| [Faux signalement] | `signalFeedback(id, sender, plate, 'faux')` |
| Supprimer | `deleteMessage(id)` |
| Supprimer conversation | `deleteThread()` |
| Bloquer | `blockPlate(plate)` |

### Badge messages

```
topMsgBadge = S.unreadMsgCount (messages directs uniquement)
Décrémenté par markRead() et passage dans le thread
```

### État & Amélioration

| Point | État | Amélioration |
|---|---|---|
| Onglet "Nouveau" | ⚠️ Ambigu vs badge "Nouveaux" d'Activité | Renommer → "Composer ✏️" SESSION 16 |
| Confirmation lecture | ❌ Absent | Indicateur "Lu" côté émetteur P2 FRI-006 |

---

## SECTION 7 — INTERACTIONS A↔B (FLUX COMPLETS)

### FLOW-001 — Demande d'aide

```
A → assist(type) → INSERT reports + broadcast new_report
B ← FloatingCard "✋ J'aide" / "🗺 Voir" + Activité/Aide (Reçus)
```

### FLOW-002 — Helper en route (IC-003 ✅ SESSION 15)

```
B → actQuickReply(plate, "J'arrive, je viens vous aider.") → INSERT messages
A ← subMsgs détecte startsWith("J'arrive")
   → FloatingCard ✋ "Helper en route · [plaque] vient vous aider"
   → myAssist.status = 'helper_coming' + _helperPlate = plate
   → Card Activité/Aide badge "✋ En route · [plaque]"
```

### FLOW-003 — Helper indisponible

```
B → actQuickReply(plate, "Je ne peux pas aider cette fois.") → INSERT messages
A ← FloatingCard 💬 "Message de [plaque]" (standard)
```

### FLOW-004 — Aide résolue

```
A → actConfirmAlert(id, 'resolved') → UPDATE reports + broadcast resolve_report
B ← dismissAlert() → alerte retirée + marqueur carte disparu
```

### FLOW-005 — Alerte véhicule (IC-002 ✅ SESSION 15)

```
A → vehicleAlertQuick(label) → INSERT messages + broadcast vehicle_alert
B ← FloatingCard ⚠️/🚨 "Alerte sur votre véhicule" + Activité/Véhicule (Reçus)
  → Boutons : [✓ J'ai vérifié (SESSION 16)] [✓ C'est bon (SESSION 16)]
B → respondVehicleAlert(id, kind) → INSERT messages "note confiance actuelle : X%"
A ← subMsgs détecte includes('note confiance actuelle')
   → toast "✓ [plaque] a vu votre signalement"
   → myVehAlert.status = 'seen_by_driver'
   → Card badge "Vu par le conducteur"
```

### FLOW-006 — Message direct

```
A → ImmatMessages.sendNew() ou reply() → INSERT messages
B ← FloatingCard 💬 "Message de [plaque]" [Vu] [Répondre →]
  → badge +1 topMsgBadge + Activité/Véhicule (Reçus)
B → reply() → INSERT messages
A ← FloatingCard 💬 + Messages
```

### FLOW-007 — Signalement route

```
A → roadReport(type) → INSERT reports + broadcast new_report
Tous B dans le rayon ← FloatingCard + Activité/Route (Reçus)
  → [Toujours là] → actConfirmAlert('present')
  → [Disparu]     → actConfirmAlert('gone') → broadcast → disparaît pour tous
```

### FLOW-008 — Demande de contact (CallManager)

```
A → CallManager.openContactOptions(plate)
  → Modal "Comment contacter ?" [💬 Message] [🤝 Contact]
  → contactByCall(plate, uid) → callSentBanner "En attente…"
B ← callIncomingPopup "[plaque A] vous demande un contact"
  → [Accepter] acceptCall() → callOverlay (appel actif)
  → [Refuser]  refuseCall() → bannière fermée chez A

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

### Paramètres — tous les boutons

| Bouton | Fonction | État |
|---|---|---|
| 🚫 Bloqués | `openBlocked()` | ✅ (local seulement — P2 migrer DB) |
| 🕘 Récents | `openRecent()` | ✅ |
| ⚖️ Confidentialité | `openLegal()` | ✅ |
| 🔔 Sons | `toggleSounds()` | ✅ |
| ⚡ Performance | `toggleReduceEffects()` | ✅ |
| 🧹 Cache | `clearOfflineCache()` | ✅ |
| 🔊 Voix GPS | `toggleVoice()` | ✅ |
| Genre voix | `toggleVoiceGender()` | ✅ |
| Toggle Autoriser contacts | `CallManager.setCallPreferences(bool)` | ✅ |
| 📨 Restaurer msgs | `restoreMessages()` | ⚠️ Outil debug → déplacer vers Gardien (FRI-004 P2) |
| 🔄 Sync alertes | `forceSyncAlerts()` | ⚠️ Outil debug → déplacer vers Gardien (FRI-004 P2) |
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

## SECTION 10 — SOS

```
FAB SOS (3s maintenu)
  ├── pointerdown → startSosHold() → classList.add('holding')
  │                               → toast "Maintiens 3 secondes"
  │                               → setTimeout(sos, 3000)
  ├── pointerup / pointerleave → cancelSosHold() → clearTimeout
  └── Après 3s → sos()
        ├── assist('panne')   ← alerte aide GPS si position dispo
        ├── confirm "Appeler le 112 en vraie urgence ?"
        └── confirm "Confirmation finale ?"
              └── location.href = 'tel:112'

ÉTAT : ✅ Déjà protégé (appui long 3s + double confirmation)
```

---

## SECTION 11 — FIABILITÉ

### Score local trustDelta(plate, delta)

| Action | Delta |
|---|---|
| signalFeedback('utile') | +8 |
| respondVehicleAlert('utile') | +8 |
| respondVehicleAlert('merci') | +5 |
| signalFeedback('regle') | +3 |
| respondVehicleAlert('recu') | +3 |
| respondVehicleAlert('regle') | +2 |
| respondVehicleAlert('vu') | +1 |
| signalFeedback('faux') | -12 |
| respondVehicleAlert('faux') | -12 |

Score stocké : `ic_trust_scores { plate: 0-100 }` · Valeur initiale : 70

### Score persistant AppReliabilityPro

```
Déclenché après signalFeedback() (patch non-destructif)
  ├── Anti-spam (vérifie feedback déjà envoyé)
  ├── UPDATE profiles (reliability_score, reliability_points, reliability_level)
  ├── UPDATE messages (feedback, feedback_score_delta)
  └── INSERT messages → notification au reporter

Niveaux :
  ≥ 90 → "Expert communauté"
  ≥ 75 → "Conducteur fiable"
  ≥ 55 → "Contributeur confirmé"
  ≥ 35 → "Nouveau contributeur"
  < 35 → "Fiabilité à construire"
```

---

## SECTION 12 — ANGE ✦

### Conditions d'affichage (SESSION 15)

```
openMap() → resolve rôle
  ├── rôle = 'gardien' → is-gardien CSS + angeFab visible
  ├── rôle ≠ 'gardien' → angeFab visible (conducteur normal)
  └── erreur réseau    → angeFab visible (fail-open)
```

### Dialogue IA

```
angeFab [✦] → AngeDialog.open() → angePanel
  ├── Textarea libre
  ├── [Envoyer] → AngeDialog.send()
  │     ├── snapshot = ImmatOrganism.diagnose() + { panel, role, features }
  │     ├── sb.functions.invoke('immat-brain-dialog', { message, feature, mode, snapshot })
  │     └── renderResponse(data) :
  │           ├── r.juste / r.sources → texte principal
  │           ├── r.vigilance[]       → ⚡ orange
  │           ├── r.options[]         → cards cliquables
  │           └── r.question          → invitation répondre
  └── [✕] → AngeDialog.close()

ÉTAT : ✅ Bouton visible tous conducteurs (SESSION 15)
NOTE : Edge Function réservée Gardien — à étendre SESSION 16
```

---

## PLAN D'AMÉLIORATION PRIORISÉ

### SESSION 16 — P1 (à faire)

| Réf | Action | Code concerné | Effort |
|---|---|---|---|
| **FRI-001** | `vehicleAlert()` → remplacer `panel('contact')` par `panel('messages')` + préremplir compose | ligne ~804 index.html | Faible |
| **FRI-002** | navPremium : renommer "km/h" → "Vitesse" + supprimer `trafficBar` (toujours 0%) | ligne 146 index.html | Faible |
| **FRI-003** | Renommer onglet "Nouveau" → "Composer ✏️" dans panelMessages | ligne 152 index.html | Faible |
| **FLOW-005** | Labels véhicule : "Toujours là"→"J'ai vérifié" + "Résolu"→"C'est bon" | lignes 1165-1166 index.html | Faible |

### SESSION 17+ — P2 (amélioration progressive)

| Réf | Action | Effort |
|---|---|---|
| FRI-004 | Debug tools (Restaurer/Sync) → réserver au Gardien | Faible |
| FRI-006 | Confirmation lecture message (indicateur "Lu") | Moyen |
| FRI-007 | Blocage plaque → persisté en DB | Moyen |
| FRI-009 | Cycle aide complet (helper confirmé sur carte) | Moyen |
| FRI-011 | Marqueurs orientés + couleur selon état | Élevé |
| INT-006 | Bouton Remerciement | Moyen |
| INT-010 | Signalement abus | Moyen |
| SA | Inscription en 2 étapes | Moyen |
| ANGE | Edge Function → conducteurs normaux (depth=2) | Moyen |

---

## CE QUI EST DÉJÀ FAIT (SESSION 15)

| Réf | Fonctionnalité | Commit |
|---|---|---|
| IC-003 | FloatingCard "✋ Helper en route" quand B dit "J'arrive" | SESSION 15 |
| IC-002 | Toast "Vu par le conducteur" quand B répond alerte véhicule | SESSION 15 |
| IC-002 | Badge `seen_by_driver` dans cards Activité | SESSION 15 |
| IC-003 | Badge `helper_coming` avec plaque dans cards Activité | SESSION 15 |
| Ange | Bouton ✦ visible pour tous les conducteurs authentifiés | SESSION 15 |
| ARCH | Architecture fonctionnelle complète | 965cf96 |
| MATRICE | Toutes les interactions A↔B | c01d8e8 |
| AUDIT NS | Audit base connaissance Ange | 9263f7e |
| AUDIT NAV | Audit navigation utilisateur | 37b2c51 |

---

## DONNÉES TECHNIQUES

### Objet S — État global complet

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

### localStorage — Toutes les clés

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

signalFeedback() [patché AppReliabilityPro]
  └─ trustDelta · UPDATE profiles · UPDATE messages · INSERT notification reporter
```

---

## RÈGLE DE MISE À JOUR

À chaque session qui modifie une fonctionnalité :
1. Mettre à jour la ligne dans le tableau ÉTAT GLOBAL (tête de document)
2. Mettre à jour la section concernée (état + amélioration)
3. Déplacer l'item de "Plan d'amélioration" vers "Ce qui est déjà fait"
4. Incrémenter la version en tête de document
