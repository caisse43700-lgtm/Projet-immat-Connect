# MATRICE COMPLÈTE DES INTERACTIONS — ImmatConnect Pro

> Source : index.html (audit exhaustif SESSION 15)
> Couvre : navigation, carte, véhicules, A↔B, floatingcard, messages, alertes, appels, GPS, paramètres

---

## CONVENTIONS

```
A = utilisateur qui initie l'action
B = utilisateur qui reçoit l'action
→  = sens de l'action
⟷  = interaction bidirectionnelle avec retour attendu
✉  = passe par la table messages (Supabase)
📡 = passe par broadcast realtime (Supabase channel)
💾 = stocké dans S.alerts (mémoire + localStorage)
🔔 = déclenche FloatingCard ou toast chez le destinataire
🚫 = sans retour attendu de l'autre utilisateur
```

---

## 1. NAVIGATION GLOBALE

### Barre du bas (bottom-nav)

| Bouton | Fonction | Panneau ouvert |
|---|---|---|
| 🗺 Carte | `navMap()` | Ferme le sheet, montre la carte |
| ⚠️ Signaler | `navSignaler()` | `panelAltet` — étape 1 (choix catégorie) |
| 🔔 Activité | `navActivite()` | `panelActivite` — écran principal Activité |

### Top-bar

| Élément | Geste | Résultat |
|---|---|---|
| Chip profil (plaque + pseudo) | Clic | Ouvre le **Drawer** (menu latéral) |
| `communityStatus` (👥 · ⚠️) | Affichage seul | Nombre de conducteurs proches + alertes actives |

### Carte (clic sur zone vide)
- Ferme tous les overlays (reportPanel, nearbyPanel, alertsPanel)
- Ferme le Drawer s'il est ouvert
- Réduit le sheet en position mini

---

## 2. CARTE (PLAN GPS)

### Interactions tactiles Leaflet

| Geste | Résultat |
|---|---|
| Drag / zoom-pinch | Déplacement/zoom libre — désactive l'auto-follow |
| Clic sur zone vide | Ferme menu contextuel véhicule + overlays + sheet |
| Clic sur marqueur véhicule autre | Ouvre le **menu contextuel véhicule** (voir §3) |
| Clic sur marqueur alerte route | Ouvre popup Leaflet avec bouton "Retirer" |

### FAB (boutons fixes sur la carte)

| Bouton | Fonction | Résultat |
|---|---|---|
| 🎯 Recentrer | `recenter()` | Recentre la carte sur ma position GPS |
| 👥 Conducteurs proches | `openNearby()` | Overlay liste des véhicules dans le rayon |
| 🗺 Vue | `cycleView()` | Bascule vue conduite ↔ vue 2D |
| **SOS** (maintien 3s) | `startSosHold()` → `sos()` | Lance `assist('panne')` + confirmation appel 112 |

### Marqueurs sur la carte

| Type | Apparence | Créé par |
|---|---|---|
| Mon véhicule | Couleur de mon profil + flèche heading | GPS `locate()` |
| Véhicule autre | Couleur du profil, `zIndexOffset 2400` | `loadOthers()` |
| Alerte route | Pin coloré (rouge urgent / orange important / foncé info) | `addCommunityAlertMarker()` |

### Bannière véhicule devant (`frontCarBanner`)

Apparaît automatiquement si un véhicule est à moins de 350m **ET** mode conduite actif (`driveMode=true`).

| Bouton | Fonction |
|---|---|
| Contacter | `contactFrontVehicle()` → `pickPlate()` → panel Messages |

### Instructions GPS (`inst`)

Affichées automatiquement pendant la navigation. Disparaissent en fin de route.

---

## 3. CLIC SUR UN VÉHICULE SUR LA CARTE

Clic sur marqueur véhicule → `showVehicleContextMenu()` → menu contextuel à 3 bulles.

### Menu contextuel véhicule

```
🗗 [PLAQUE DU VÉHICULE]
┌────────────────────────────────┐
│  💬 Message  ⚠️ Signaler  🚫 Bloquer  │
└────────────────────────────────┘
```

| Bulle | Fonction | Résultat |
|---|---|---|
| 💬 Message | `vehicleContextAction('contact')` | Panel Messages + mode compose pré-rempli plaque |
| ⚠️ Signaler | `vehicleContextAction('signal')` | Panneau Signaler → étape 2 Véhicule, plaque pré-remplie |
| 🚫 Bloquer | `vehicleContextAction('block')` | `blockPlate()` — confirm → plaque dans liste bloqués, disparaît de la carte |

Le menu se ferme sur clic carte vide, `hideVehicleContextMenu()`.

### Depuis la liste "Conducteurs proches"

| Bouton | Fonction | Résultat |
|---|---|---|
| Contacter | `pickPlate(plate)` | Panel Messages + mode compose pré-rempli |

---

## 4. INTERACTIONS A → B AVEC RETOUR ATTENDU

Ces interactions envoient quelque chose vers B et A s'attend à une réponse.

---

### 4.1 Alerte véhicule (A prévient B d'un problème sur son véhicule)

**Déclencheur A :** Panneau Signaler → Étape 2 Véhicule → bouton type de problème

**Problèmes disponibles :**
- 🔴 Pneu crevé ou à plat
- 💡 Feu arrière ou avant défaillant
- 🚪 Portière ou coffre mal fermé
- 🔥 Fumée ou odeur de brûlé
- ⛓️ Objet traînant sous le véhicule
- ⚠️ Autre problème visible

**Chemin technique :** `vehicleAlertQuick(label)`
1. Récupère plaque destinataire depuis `sigVehiclePlate` ou `selectedVehiclePlate()`
2. Envoie message via `ImmatMessages.sendToPlate(plate, msg)` ✉
3. Broadcast `vehicle_alert` 📡 sur channel `ic_community_live`

**Chez B (réception) :**
- 📡 Broadcast `vehicle_alert` reçu → `addCommunityAlert()` → stocké dans `S.alerts` 💾
- 🔔 FloatingCard : `[icon] Alerte sur votre véhicule` avec `[label] · Signalé par [plaque A]`
  - Btn1 "Vu" → `updateActBadge()`
  - Btn2 "Répondre" → panel Messages, conversation avec A
- Notification système (si permissions)

**Retour attendu de B → A :**
- B répond via `respondVehicleAlert(id, kind)` : envoie message feedback ✉
- Chez A : `subMsgs` détecte `note confiance actuelle` → toast "✓ [plaque B] a vu votre signalement" 🔔 (IC-002)
- Card Activité → Véhicule chez A : badge "Vu par le conducteur"

---

### 4.2 Demande d'aide (A demande une assistance)

**Déclencheur A :** Panneau Signaler → Étape 2 Aide → bouton type

**Types disponibles :**
- 🚗 Panne
- ⛽ Carburant
- 🔋 Batterie
- ⚙️ Moteur
- 🔥 Incendie
- 🧭 Perdu

**Chemin technique :** `assist(type)`
1. Crée alerte locale `group='assist', _mine=true` 💾
2. Sauvegarde en DB `reports` (category: 'help') ✉
3. Broadcast `new_report` 📡

**Chez B (réception) :**
- Alerte reçue via `subscribeCommunityReports` → `addCommunityAlert()` 💾
- 🔔 FloatingCard : `[icon] Incident [type]` avec plaque A
  - Btn1 "Vu" → `actConfirmAlert(id, 'seen')`
  - Btn2 "✋ J'aide" → `actHelpReply(plate)` → panel Messages compose vers A

**Dans Activité → Aide chez B :**
- Card avec actions : `✋ J'arrive` / `Je ne peux pas` / `💬 Contacter` / `📍 Voir`

**Retour attendu de B → A :**
- B clique "✋ J'arrive" → `actQuickReply(plate, "J'arrive, je viens vous aider.")` ✉
- Chez A : `subMsgs` détecte `startsWith("J'arrive")` → status `helper_coming` + 🔔 FloatingCard "✋ Helper en route · [plaque B]" (IC-003)
- Card Activité → Aide chez A : badge "✋ En route · [plaque B]"
- B clique "Je ne peux pas" → `actQuickReply(plate, "Je ne peux pas aider cette fois.")` ✉ — message seulement, aucune mise à jour de statut
- A clôture via ✓ Résolu → `actConfirmAlert(id, 'resolved')` : retire l'alerte de tous

---

### 4.3 Demande de contact (CallManager)

**Déclencheur A :** Bouton "Contacter" dans menu véhicule → `CallManager.openContactOptions(plate)`

**Modal "Comment souhaitez-vous contacter [plaque] ?"**

| Bouton | Résultat |
|---|---|
| 💬 Message | `CallManager.contactByMessage(plate)` → panel Messages compose |
| 🤝 Contact | `CallManager.contactByCall(plate, uid)` → envoie demande de contact |

**Flux demande de contact :**
1. A envoie demande → bannière `callSentBanner` chez A "En attente de réponse..."
2. Chez B : popup `callIncomingPopup` "[plaque A] vous demande un contact"
   - Bouton "Refuser" → `CallManager.refuseCall(requestId)` — ferme popup
   - Bouton "Accepter" → `CallManager.acceptCall(requestId)` — échange de contact

**Cas "non autorisé" :** si B n'a pas activé les demandes → modal `callNotAllowedModal` chez A
- Bouton "💬 Envoyer un message" → redirige vers Messages
- Bouton "Fermer"

**Annulation :** bouton "Annuler" sur `callSentBanner` → `CallManager.cancelCallRequest(requestId)`

---

### 4.4 Message direct (A envoie un message à B)

**Chemin :** Panel Messages → mode "Nouveau" (compose)
- Champ plaque destinataire `icComposePlate`
- Textarea message `icComposeText`
- Bouton ➤ → `ImmatMessages.sendNew()`

**Ou depuis conversation :**
- Textarea reply `icReplyText` + bouton ➤ → `ImmatMessages.reply()`

**Chez B (réception) :**
- `subMsgs` → notification barre `notif` → 🔔 FloatingCard "💬 Message de [plaque]"
  - Btn1 "Vu" (callback null — badge non décrémenté automatiquement)
  - Btn2 "Répondre →" → panel Messages, thread avec A

---

## 5. INTERACTIONS A → B SANS RETOUR ATTENDU

---

### 5.1 Signalement route (A informe les conducteurs proches)

**Déclencheur A :** Panneau Signaler → Étape 2 Route → bouton type

**Types disponibles :**
- 💥 Accident (urgent)
- 🚦 Bouchon (medium)
- ⚠️ Obstacle (urgent)
- 🚧 Travaux (info)
- 👮 Contrôle (info)
- ❗ Danger (urgent)

**Chemin :** `roadReport(type)`
- Alerte créée `group='route', _mine=true` 💾
- Marqueur sur la carte à la position GPS de A
- Sauvegarde DB + broadcast 📡

**Chez B :** FloatingCard `[icon] Incident [type]` avec position
- Btn1 "Vu"
- Btn2 "🗺 Voir" → `actViewOnMap()` → zoom carte sur la position

**Dans Activité → Route chez B :**
- Boutons : "Toujours là" / "Disparu" / "📍 Voir" / optionnellement "Contacter"

**Clôture :** A ou B clique "Disparu" → `actConfirmAlert(id, 'gone')` → retire alerte + marqueur + broadcast `resolve_report` 📡 pour tous

---

### 5.2 Information conducteurs (A informe sans cibler un véhicule)

**Déclencheur A :** Panneau ancien `reportPanel` → bloc "🚗 Informer les conducteurs"

**Options :**
- 💡 Feux allumés
- 🚪 Porte/coffre
- 💡 Éclairage
- 🔧 Élément détaché
- 🛞 Pneu/roue (urgent)
- 🚨 Fumée/feu (urgent)

**Chemin :** `driverInfo(label)` — diffusion générale, pas ciblée
- Alerte créée `group='vehicle', plate='CONDUCTEURS'` 💾
- Sauvegarde DB + broadcast

---

### 5.3 Mode invisible (A disparaît de la carte)

**Déclencheur :** Bouton dans Drawer ou panneau Drive → `toggleInvisible()`
- Position retirée de `user_locations`
- Marqueur A retiré de la carte
- GPS arrêté
- Toast "Invisible : position retirée"
- **Sans impact sur B** — A disparaît simplement de la liste des conducteurs proches

---

## 6. INTERACTIONS B → A (RÉPONSES)

---

### 6.1 B répond à alerte véhicule

**Chez B dans Activité → Véhicule :**

| Bouton | Fonction | Envoi vers A |
|---|---|---|
| "Je m'arrête" | `actQuickReply(plate, "Je m'arrête.")` | Message ✉ |
| "Je vérifie" | `actQuickReply(plate, "Je vérifie.")` | Message ✉ |
| "Merci" | `actQuickReply(plate, "Merci.")` | Message ✉ |
| "Contacter" | `CallManager.openContactOptions(plate)` | Modal choix message/contact |

**Chez B dans `renderMyAlertsBlock` (panneau Signaler → Véhicule) :**

| Bouton | Fonction | Envoi vers A |
|---|---|---|
| "Info utile" | `respondVehicleAlert(id, 'utile')` | Feedback "✅ Info utile — note confiance : X%" ✉ |
| "Reçu" | `respondVehicleAlert(id, 'recu')` | Feedback "✅ Reçu — note confiance : X%" ✉ |
| "Vu" | `markAlertSeen(id)` | Local uniquement — aucun envoi vers A |

**Chez A après feedback :** toast "✓ [plaque B] a vu votre signalement" + status `seen_by_driver` sur la card

---

### 6.2 B répond à demande d'aide

**Chez B dans Activité → Aide :**

| Bouton | Fonction | Résultat |
|---|---|---|
| "✋ J'arrive" | `actQuickReply(plate, "J'arrive, je viens vous aider.")` | Message ✉ → IC-003 chez A |
| "Je ne peux pas" | `actQuickReply(plate, "Je ne peux pas aider cette fois.")` | Message ✉ — sans IC chez A |
| "💬 Contacter" | `actHelpReply(plate)` | Panel Messages compose vers A (sans auto-envoi) |
| "📍 Voir" | `actViewOnMap(id)` | Zoom carte sur position de A |

**Chez A après "J'arrive" :** FloatingCard "✋ Helper en route · [plaque B]" + card Activité badge "✋ En route"

---

### 6.3 B confirme alerte route

**Chez B dans Activité → Route :**

| Bouton | Fonction | Résultat |
|---|---|---|
| "Toujours là" | `actConfirmAlert(id, 'present')` | Status `present` — alerte confirmée, reste visible |
| "Disparu" | `actConfirmAlert(id, 'gone')` | Alerte retirée + marqueur + broadcast résolution |
| "📍 Voir" | `actViewOnMap(id)` | Zoom carte sur la position |
| "Contacter" | `CallManager.openContactOptions(plate)` | Modal choix message/contact |

---

### 6.4 A clôture sa propre demande d'aide

**Chez A dans Activité → Aide (carte "Mon signalement") :**

| Bouton | Fonction | Résultat |
|---|---|---|
| "✓ Résolu" | `actConfirmAlert(id, 'resolved')` | Retire alerte + marqueur + broadcast résolution pour tous |
| "Retirer" | `actConfirmAlert(id, 'gone')` | Idem — retrait sans résolution explicite |

---

### 6.5 Feedback message (B reçoit message avec ⚠️)

Si un message reçu commence par `⚠️` (signalement préparé) :

| Bouton | Fonction | Envoi vers A |
|---|---|---|
| "Info utile" | `signalFeedback(id, sender, plate, 'utile')` | "✅ Info utile — note confiance : X%" ✉ |
| "Déjà réglé" | `signalFeedback(id, sender, plate, 'regle')` | "👌 Déjà réglé — note confiance : X%" ✉ |
| "Faux signalement" | `signalFeedback(id, sender, plate, 'faux')` | "❌ Faux signalement — note confiance : X%" ✉ |

---

## 7. PANNEAU SIGNALER (2 ÉTAPES)

### Étape 1 — Choix catégorie

| Bouton | Fonction | Étape suivante |
|---|---|---|
| 🚦 Route | `sigStepRoute()` | Étape 2 Route |
| 🚘 Véhicule | `sigStepVehicle()` | Étape 2 Véhicule (focus sur champ plaque) |
| 🆘 Aide | `sigStepAide()` | Étape 2 Aide |

### Étape 2 Route

| Bouton | Fonction |
|---|---|
| ← Retour | `sigBack()` → retour étape 1 |
| 💥 Accident | `roadReport('accident')` + `sigDone()` |
| 🚦 Bouchon | `roadReport('bouchon')` + `sigDone()` |
| ⚠️ Obstacle | `roadReport('obstacle')` + `sigDone()` |
| 🚧 Travaux | `roadReport('travaux')` + `sigDone()` |
| 👮 Contrôle | `roadReport('controle')` + `sigDone()` |
| ❗ Danger | `roadReport('danger')` + `sigDone()` |

**Alertes actives visibles** dans cette vue avec filtres : Toutes / Route / Aide / Véhicule / Urgent

### Étape 2 Véhicule

| Élément | Fonction |
|---|---|
| ← Retour | `sigBack()` |
| Champ plaque `sigVehiclePlate` | Saisie manuelle de la plaque cible |
| 🔴 Pneu | `vehicleAlertQuick('Pneu crevé ou à plat')` |
| 💡 Feu | `vehicleAlertQuick('Feu arrière ou avant défaillant')` |
| 🚪 Portière | `vehicleAlertQuick('Portière ou coffre mal fermé')` |
| 🔥 Fumée | `vehicleAlertQuick('Fumée ou odeur de brûlé')` |
| ⛓️ Objet | `vehicleAlertQuick('Objet traînant sous le véhicule')` |
| ⚠️ Autre | `vehicleAlertQuick('Autre problème visible')` |

**Mes alertes actives** affichées en bas avec boutons "Info utile", "Reçu", "Vu"

### Étape 2 Aide

| Bouton | Fonction |
|---|---|
| ← Retour | `sigBack()` |
| 🚗 Panne | `assist('panne')` + `sigDone()` |
| ⛽ Carburant | `assist('carburant')` + `sigDone()` |
| 🔋 Batterie | `assist('batterie')` + `sigDone()` |
| ⚙️ Moteur | `assist('moteur')` + `sigDone()` |
| 🔥 Incendie | `assist('incendie')` + `sigDone()` |
| 🧭 Perdu | `assist('perdu')` + `sigDone()` |

`sigDone()` → retour étape 1 + retour vue carte + toast "Signalement envoyé ✓"

---

## 8. PANNEAU ACTIVITÉ

### Écran principal

| Carte catégorie | Fonction |
|---|---|
| 🚦 Route (badge) | `openActivityCat('route')` → sous-panneau Route |
| 🚘 Véhicule (badge) | `openActivityCat('vehicle')` → sous-panneau Véhicule |
| 🆘 Aide (badge) | `openActivityCat('aide')` → sous-panneau Aide |
| "Voir tout ›" | `openActivityCat('all')` → sous-panneau toutes alertes |

**Résumé rapide :**
- ✉️ Nouveaux — count alertes non lues + messages reçus
- ⏳ En cours — count alertes en statut 'seen'/'present'
- ✅ Traités — historique consulté

### Sous-panneau catégorie

**Onglets :**
- "Reçus" → alertes reçues + messages reçus (selon catégorie)
- "Envoyés" → mes signalements envoyés + messages envoyés

**Bouton ‹ Retour** → `closeActivityCat()` → retour écran principal

**Bouton "Tout marquer lu"** → `markAllCatRead()` → tous les statuts passent à 'seen'

### Cards dans Activité — selon catégorie et sens

#### Card Message reçu (onglet Reçus, catégorie Véhicule/Tout)

| Bouton | Fonction |
|---|---|
| "Je m'arrête" | `actQuickReply(plate, "Je m'arrête.")` → message ✉ |
| "Je vérifie" | `actQuickReply(plate, "Je vérifie.")` → message ✉ |
| "Merci" | `actQuickReply(plate, "Merci.")` → message ✉ |
| "Contacter" | `CallManager.openContactOptions(plate)` |

#### Card Message envoyé (onglet Envoyés)

| Bouton | Fonction |
|---|---|
| "💬 Répondre" | `actOpenConv(plate)` → panel Messages, thread |
| "Supprimer" | `actDeleteConv(plate)` → confirm + suppression locale |

#### Card Alerte véhicule reçue (onglet Reçus)

| Bouton | Fonction |
|---|---|
| "Je m'arrête" | `actQuickReply(plate, "Je m'arrête.")` |
| "Je vérifie" | `actQuickReply(plate, "Je vérifie.")` |
| "Merci" | `actQuickReply(plate, "Merci.")` |
| "Contacter" | `CallManager.openContactOptions(plate)` |
| "📍 Voir" | `actViewOnMap(id)` (si lat disponible) |

#### Card Alerte route reçue (onglet Reçus)

| Bouton | Fonction |
|---|---|
| "Contacter" | `CallManager.openContactOptions(plate)` (si plaque connue) |
| "Toujours là" | `actConfirmAlert(id, 'present')` |
| "Disparu" | `actConfirmAlert(id, 'gone')` → retire + broadcast |
| "📍 Voir" | `actViewOnMap(id)` (si lat disponible) |

#### Card Demande d'aide reçue (onglet Reçus, catégorie Aide)

| Bouton | Fonction |
|---|---|
| "✋ J'arrive" | `actQuickReply(plate, "J'arrive, je viens vous aider.")` → IC-003 chez A |
| "Je ne peux pas" | `actQuickReply(plate, "Je ne peux pas aider cette fois.")` |
| "💬 Contacter" | `actHelpReply(plate)` → panel Messages compose |
| "📍 Voir" | `actViewOnMap(id)` |

#### Card Mon signalement (onglet Envoyés)

| Badge status | Signification |
|---|---|
| "Mon signalement" | Aucun retour reçu |
| "✋ En route · [plaque]" | B a dit "J'arrive" (IC-003) |
| "Vu par le conducteur" | B a répondu à l'alerte véhicule (IC-002) |
| "Vu" | B a vu l'alerte |

| Bouton (si aide) | Fonction |
|---|---|
| "✓ Résolu" | `actConfirmAlert(id, 'resolved')` |
| "Retirer" | `actConfirmAlert(id, 'gone')` |
| "📍 Voir" | `actViewOnMap(id)` |

| Bouton (autre) | Fonction |
|---|---|
| "Retirer" | `actConfirmAlert(id, 'gone')` |

---

## 9. PANNEAU MESSAGES

### Onglets

| Onglet | Fonction |
|---|---|
| Reçus | `ImmatMessages.setMode('inbox')` |
| Envoyés | `ImmatMessages.setMode('sent')` |
| Nouveau | `ImmatMessages.setMode('compose')` |

### Mode compose

- Champ plaque `icComposePlate` + bouton 🎙️ voix → `voicePlate()`
- Textarea `icComposeText`
- Bouton ➤ → `ImmatMessages.sendNew()`

### Thread conversation

| Élément | Fonction |
|---|---|
| 🗑 Supprimer | `ImmatMessages.deleteThread()` |
| × Fermer | `ImmatMessages.closeThread()` |
| Bouton "Je m'arrête" | `ImmatMessages.quick("Je m'arrête, merci.")` |
| Bouton "Je vérifie" | `ImmatMessages.quick("Je vérifie, merci.")` |
| Bouton "Bien reçu" | `ImmatMessages.quick("Bien reçu, merci.")` |
| Textarea reply + ➤ | `ImmatMessages.reply()` → envoie réponse |

---

## 10. PANNEAU NAVIGATION GPS (Drive)

### Recherche

| Élément | Fonction |
|---|---|
| Input `gpsSearch` + 🔍 | `searchGps()` → Nominatim → liste résultats |
| Bouton 🎙️ | `voiceGps()` → reconnaissance vocale → `searchGps()` |
| Résultat cliqué | `pickDest(lat, lon, name)` → calcul itinéraire OSRM |

### POI rapides

| Bouton | Fonction |
|---|---|
| ⛽ Carburant | `poi('station essence')` |
| 🍽️ Resto | `poi('restaurant')` |
| 🅿️ Parking | `poi('parking')` |
| 🔧 Garage | `poi('garage automobile')` |
| 🔌 Recharge | `poi('borne recharge')` |
| 🏥 Santé | `poi('hôpital')` |

### Route mini (après calcul)

| Bouton | Fonction |
|---|---|
| Démarrer | `startNav()` → `driveMode=true` + navigation active |

### Boutons navigation

| Bouton | Fonction |
|---|---|
| 📍 Me localiser | `locate()` → watchPosition GPS |
| ⏹ Stop GPS | `stopGps()` → clearWatch + arrêt navigation |
| ✅ Alertes | `openAlerts()` → panneau Signaler → alertes actives |
| 🎯 Recentrer | `recenter()` |
| 🗺 Vue | `cycleView()` |
| 👻 Invisible | `toggleInvisible()` |
| 🔊 Voix | `toggleVoice()` |

### Favoris GPS

| Bouton | Fonction |
|---|---|
| GPS (sur favori) | `routeSaved('fav', i)` → calcul itinéraire vers ce favori |
| × | `deleteFav(i)` |
| ⭐ Ajouter destination | `saveCurrentDestination()` |

### Historique GPS

| Bouton | Fonction |
|---|---|
| GPS (sur entrée) | `routeSaved('hist', i)` → calcul itinéraire |
| × | `deleteHistEntry(i)` |

### Dashboard navigation (navPremium — automatique)

- **ETA** — heure d'arrivée calculée
- **Restant** — distance restante
- **km/h** — vitesse actuelle GPS
- **Proches** — nombre de conducteurs dans le rayon
- **Alertes** — nombre d'alertes actives
- **Recalcul** — "Auto" si déviation > 450m

---

## 11. OVERLAY CONDUCTEURS PROCHES

Accessible : FAB 👥 sur la carte, ou Drawer → "Conducteurs proches"

Chaque ligne :
```
[point couleur] [PLAQUE] · [pseudo] · [distance]   [Contacter]
```

| Bouton | Fonction |
|---|---|
| Contacter | `pickPlate(plate)` → panel Messages compose |

---

## 12. FLOATINGCARD (notification temps réel)

Apparaît automatiquement, disparaît après 8 secondes.

### Types de FloatingCard

| Déclencheur | Icône | Titre | Btn1 | Btn2 |
|---|---|---|---|---|
| Alerte route/aide reçue | `meta.icon` | "Incident [type]" | "Vu" → `actConfirmAlert('seen')` | "🗺 Voir" ou "✋ J'aide" |
| Message reçu (standard) | 💬 | "Message de [plaque]" | "Vu" (null) | "Répondre →" → panel Messages |
| Alerte véhicule reçue (broadcast) | ⚠️ ou 🚨 | "Alerte sur votre véhicule" | "Vu" → `updateActBadge()` | "Répondre" → panel Messages |
| IC-003 : Helper en route | ✋ | "Helper en route" | "OK" | "💬 Messages" → thread |
| SOS envoyé | (toast) | — | — | — |

**Bouton btn1** → `fcAction(1)` → callback cb1 ou null + ferme la card
**Bouton btn2** → `fcAction(2)` → callback cb2 + ferme la card
**Auto-fermeture** : 8 secondes → `hideFloatingCard()`
**Niveau urgent** : css `alert-urgent` (rouge)

---

## 13. TIROIR (DRAWER)

Accessible : clic sur chip profil en haut à gauche.
Fermeture : clic sur fond `drawer-back` ou `closeDrawer()`.

| Élément | Fonction |
|---|---|
| **Rayon de détection** (select 1/5/10/25 km) | `setRadius(v)` → filtre les conducteurs et alertes |
| Navigation GPS | `panel('drive')` |
| Conducteurs proches | `openNearby()` |
| Mode invisible | `toggleInvisible()` |
| Paramètres | `panel('settings')` |

---

## 14. MODAUX SYSTÈME D'APPELS (CallManager)

### Modal "Comment souhaitez-vous contacter"

| Bouton | Fonction |
|---|---|
| 💬 Message | `CallManager.contactByMessage(plate)` → compose panel Messages |
| 🤝 Contact | `CallManager.contactByCall(plate, uid)` → demande de contact |
| Annuler | `CallManager.closeContactModal()` |

### Popup appel entrant (`callIncomingPopup`)

| Bouton | Fonction | Retour vers A |
|---|---|---|
| Refuser | `CallManager.refuseCall(requestId)` | Notification refus chez A |
| Accepter | `CallManager.acceptCall(requestId)` | Échange coordonnées + overlay appel |

### Bannière appel envoyé (`callSentBanner`)

| Bouton | Fonction |
|---|---|
| Annuler | `CallManager.cancelCallRequest(requestId)` |

### Modal "Contact non autorisé" (`callNotAllowedModal`)

| Bouton | Fonction |
|---|---|
| 💬 Envoyer un message | `CallManager.closeNotAllowedModal()` → panel Messages |
| Fermer | Ferme le modal |

---

## 15. SOS

**Déclencheur :** FAB "SOS" maintenu 3 secondes → `startSosHold()` → `sos()`

```
1. Toast "Maintiens 3 secondes pour SOS"
2. Après 3s → assist('panne') → demande d'aide envoyée aux conducteurs proches
3. confirm("Appeler le 112 uniquement en vraie urgence ?")
4. confirm("Confirmation finale : appeler le 112 ?")
5. Si confirmé → location.href='tel:112'
```

---

## 16. PARAMÈTRES

| Bouton | Fonction |
|---|---|
| 🚫 Bloqués | `openBlocked()` → liste plaques bloquées avec "Débloquer" |
| 🕘 Récents | `openRecent()` → liste véhicules récents avec "Contacter" et "Vider" |
| ⚖️ Confidentialité | `openLegal()` → modal texte légal |
| 🔔 Sons | `toggleSounds()` → on/off sons |
| ⚡ Performance | `toggleReduceEffects()` → on/off effets visuels |
| 🧹 Cache | `clearOfflineCache()` → efface favoris, historique, alertes, récents |
| 🔊 Voix GPS | `toggleVoice()` |
| Genre de voix | `toggleVoiceGender()` → Femme ♀ / Homme ♂ |
| Autoriser les demandes de contact | `CallManager.setCallPreferences(checked)` |
| 📨 Restaurer msgs (gardien) | `restoreMessages()` |
| 🔄 Sync alertes (gardien) | `forceSyncAlerts()` |
| ⏻ Déconnexion | `logout()` → confirm → retire position + déconnexion + redirect |

---

## 17. MODAUX SYSTÈME

| Modal | Ouverture | Fermeture |
|---|---|---|
| Confidentialité `#legal` | `openLegal()` | `closeLegal()` ou clic fond |
| Bloqués `#blocked` | `openBlocked()` | `closeBlocked()` ou clic fond |
| Récents `#recent` | `openRecent()` | `closeRecent()` ou clic fond |

---

## 18. BOUTON ANGE ✦ (`angeFab`)

Visible : **tous les conducteurs authentifiés** (gardien + conducteur depuis SESSION 15).

**Clic** → `AngeDialog.open()` → panel dialog IA

| Élément | Fonction |
|---|---|
| Textarea message | Saisie libre |
| Bouton "Envoyer" | `AngeDialog.send()` → `immat-brain-dialog` (Supabase function) |
| Bouton ✕ | `AngeDialog.close()` |
| Réponse IA | `renderResponse()` → texte + vigilances + options + question |
| Clic sur une option | Remplit le textarea avec le label de l'option |
| Clic sur une question | Focus textarea |

---

## 19. NOTIFICATIONS AUTOMATIQUES (SANS GESTE UTILISATEUR)

Ces interactions arrivent de B ou du système, sans action de A.

| Événement | Source | Canal | Résultat chez A |
|---|---|---|---|
| Nouveau rapport route/aide | `subscribeCommunityReports` | postgres_changes INSERT / broadcast | FloatingCard + badge actBadge++ |
| Rapport résolu | `subscribeCommunityReports` | postgres_changes UPDATE / broadcast `resolve_report` | Alerte retirée |
| Alerte véhicule | `subscribeCommunityReports` | broadcast `vehicle_alert` | FloatingCard urgent ⚠️/🚨 + badge |
| Nouveau message | `subMsgs` | postgres_changes INSERT | notif barre + FloatingCard 💬 ou ✋ |
| Mouvement véhicule | `subLocs` | postgres_changes * user_locations | `loadOthers()` → màj marqueurs |
| App au premier plan | `visibilitychange` | DOM event | `syncCommunityAlerts()` + `updateActBadge()` + `ImmatMessages.refresh()` |
| Réseau retrouvé | `window.online` | DOM event | `syncOfflineReports()` + `syncCommunityAlerts()` + toast |
| Réseau perdu | `window.offline` | DOM event | Toast "Mode hors ligne" |

---

## 20. RÉCAPITULATIF INTERACTIONS A↔B PAR FLUX

| Flux | A déclenche | B reçoit | B répond | A voit le retour |
|---|---|---|---|---|
| **FLOW-001** Aide | `assist(type)` | FloatingCard + Activité/Aide | "✋ J'arrive" | FloatingCard "Helper en route" + badge "En route" |
| **FLOW-002** Helper arrive | — (automatique) | — | "J'arrive" via actQuickReply | IC-003 : FloatingCard ✋ chez A |
| **FLOW-003** Helper indisponible | — | — | "Je ne peux pas" | Message reçu dans Messages |
| **FLOW-004** Aide résolue | `actConfirmAlert('resolved')` | Alerte retirée (broadcast) | — | Toast "Signalement retiré ✓" |
| **FLOW-005** Alerte véhicule | `vehicleAlertQuick(label)` | FloatingCard ⚠️ + Activité/Véhicule | "Info utile" / "Reçu" / "Merci" | IC-002 : toast "Vu par le conducteur" |
| **FLOW-006** Message direct | `ImmatMessages.sendNew()` | FloatingCard 💬 + Messages | Réponse textarea | FloatingCard 💬 |
| **FLOW-007** Signalement route | `roadReport(type)` | FloatingCard + Activité/Route | "Toujours là" / "Disparu" | Broadcast résolution |
| **FLOW-008** Contact | `CallManager.contactByCall()` | Popup appel entrant | Accepter / Refuser | Overlay appel ou modal refus |
