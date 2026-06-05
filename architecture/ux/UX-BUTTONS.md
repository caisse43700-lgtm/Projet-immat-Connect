# Amélioration Navigation Fonctionnalités

# UX-BUTTONS — Inventaire exhaustif des boutons

**Date :** 2026-06-04  
**Source :** index.html (audit exhaustif)  
**Total :** 152 boutons/contrôles actifs

---

## Navigation principale

| ID | Texte | onclick | Panel |
|---|---|---|---|
| `navMap` | Carte | `App.navMap()` | bottom nav |
| `navSignaler` | Signaler | `App.navSignaler()` | bottom nav |
| `navActivite` | Activité | `App.navActivite()` | bottom nav |
| `longSos` | SOS | `App.startSosHold(event)` (3s) | carte |
| — | Menu profil (avatar) | `App.openDrawer()` | top bar |
| — | Contacter (véhicule devant) | `App.contactFrontVehicle()` | frontCarBanner |
| — | Recentrer | `App.recenter()` | carte |
| — | Conducteurs proches | `App.openNearby()` | carte |
| — | Vue (satellite/carte) | `App.cycleView()` | carte |
| `sheetArrowOpen` | ▲ | `App.openSheet()` | sheet |
| `sheet-close` | ✕ | `App.closeSheet()` | sheet |

---

## Auth / Profil setup

| Texte | onclick |
|---|---|
| Se connecter | `App.goAuth('login')` |
| Créer un compte gratuit | `App.goAuth('signup')` |
| Connexion (tab) | `App.setMode('login')` |
| Inscription (tab) | `App.setMode('signup')` |
| Mot de passe oublié ? | `App.forgotPwd()` |
| Renvoyer email confirmation | `App.resendConfirm()` |
| Voir (×4 password fields) | `App.eye(fieldId, btn)` |
| Enregistrer et continuer | `App.saveProfile()` |
| Se déconnecter | `App.logout()` |
| Mettre à jour (mot de passe) | `App.updatePwd()` |
| ← Retour | `App.show('sw')` |

---

## Signalement (reportPanel)

| Texte | onclick | Étape |
|---|---|---|
| ← Retour | `App.sigBack()` | 1→0 |
| 🚦 Route | `App.sigStepRoute()` | 1 |
| 🚘 Véhicule | `App.sigStepVehicle()` | 1 |
| 🆘 Aide | `App.sigStepAide()` | 1 |
| 💥 Accident | `App.roadReport('accident');App.sigDone()` | 2-Route |
| 🚦 Bouchon | `App.roadReport('bouchon');App.sigDone()` | 2-Route |
| ⚠️ Obstacle | `App.roadReport('obstacle');App.sigDone()` | 2-Route |
| 🚧 Travaux | `App.roadReport('travaux');App.sigDone()` | 2-Route |
| 👮 Contrôle | `App.roadReport('controle');App.sigDone()` | 2-Route |
| ❗ Danger | `App.roadReport('danger');App.sigDone()` | 2-Route |
| 🔴 Pneu | `App.vehicleAlertQuick('Pneu crevé ou à plat')` | 2-Véh. |
| 💡 Feu | `App.vehicleAlertQuick('Feu arrière ou avant défaillant')` | 2-Véh. |
| 🚪 Portière | `App.vehicleAlertQuick('Portière ou coffre mal fermé')` | 2-Véh. |
| 🔥 Fumée | `App.vehicleAlertQuick('Fumée ou odeur de brûlé')` | 2-Véh. |
| ⛓️ Objet | `App.vehicleAlertQuick('Objet traînant sous le véhicule')` | 2-Véh. |
| ⚠️ Autre | `App.vehicleAlertQuick('Autre problème visible')` | 2-Véh. |
| 🚗 Panne | `App.assist('panne');App.sigDone()` | 2-Aide |
| ⛽ Carburant | `App.assist('carburant');App.sigDone()` | 2-Aide |
| 🔋 Batterie | `App.assist('batterie');App.sigDone()` | 2-Aide |
| ⚙️ Moteur | `App.assist('moteur');App.sigDone()` | 2-Aide |
| 🔥 Incendie | `App.assist('incendie');App.sigDone()` | 2-Aide |
| 🧭 Perdu | `App.assist('perdu');App.sigDone()` | 2-Aide |

---

## Messages (panelMessages)

| ID | Texte | onclick |
|---|---|---|
| — | 🔍 | `ImmatMessages.toggleSearch()` |
| — | ✏️ | `ImmatMessages.setMode('compose')` |
| — | ‹ (retour compose) | `ImmatMessages.closeCompose()` |
| — | 🗑 (supprimer tous) | `ImmatMessages.deleteAllMessages()` |
| — | ➤ (envoyer compose) | `ImmatMessages.sendNew()` |
| — | ‹ (retour thread) | `ImmatMessages.closeThread()` |
| `icCallBtn` | 📞 | `ImmatMessages.callActive()` |
| — | ⋯ (menu thread) | `ImmatMessages.openThreadMenu()` |
| — | Je m'arrête | `ImmatMessages.quick('Je m\'arrête, merci.')` |
| — | Je vérifie | `ImmatMessages.quick('Je vérifie, merci.')` |
| — | Bien reçu | `ImmatMessages.quick('Bien reçu.')` |
| — | 🙏 Merci | `ImmatMessages.quick('🙏 Merci !')` |
| — | ➤ (répondre) | `ImmatMessages.reply()` |

### Bottom sheet messages
| ID | Texte | onclick |
|---|---|---|
| `icSheetFav` | ⭐ Ajouter/Retirer favoris | `ImmatMessages._sheetAction('fav')` |
| `icSheetArch` | 📁 Archiver / 📂 Désarchiver | `ImmatMessages._sheetAction('arch')` |
| `icSheetTrust` | ✓ Marquer/Révoquer confiance | `ImmatMessages._sheetAction('trust')` |
| `icSheetDel` | 🗑 Supprimer la conversation | `ImmatMessages._sheetAction('del')` |

---

## Paramètres (panelSettings)

| Texte | onclick |
|---|---|
| ✏️ Mon profil | `App.openEditProfile()` |
| 🚫 Bloqués | `App.openBlocked()` |
| 🕘 Récents | `App.openRecent()` |
| ⚖️ Confidentialité | `App.openLegal()` |
| 🔔 Sons | `App.toggleSounds()` |
| ⚡ Performance | `App.toggleReduceEffects()` |
| 🧹 Cache | `App.clearOfflineCache()` |
| 🔊 Voix GPS | `App.toggleVoice()` |
| 🔍 Dashboard (Gardien) | `App.openGardienDashboard()` |
| 🔄 Sync alertes (Gardien) | `App.forceSyncAlerts()` |
| ⏻ Déconnexion | `App.logout()` |
| `allowCallsToggle` (checkbox) | `CallManager.setCallPreferences(checked)` |
| 🔇 Personne | `ImmatMessages.setCallLevel(1)` |
| 🤝 Confiance | `ImmatMessages.setCallLevel(2)` |
| 📍 Contexte | `ImmatMessages.setCallLevel(3)` |
| 🌐 Tous | `ImmatMessages.setCallLevel(4)` |
| `dndToggle` (checkbox) | `ImmatMessages.setDnd(checked)` |
| 🟢 Disponible | `ImmatMessages.setPresence('disponible')` |
| 🚗 Conduite | `ImmatMessages.setPresence('conduite')` |
| 🟡 Occupé | `ImmatMessages.setPresence('occupé')` |
| ⚫ Invisible | `ImmatMessages.setPresence('invisible')` |
| ⭕ Hors ligne | `ImmatMessages.setPresence('hors-ligne')` |
| `voiceGenderBtn` | Femme ♀ / Homme ♂ | `App.toggleVoiceGender()` |

---

## Activité (panelActivite)

| Texte | onclick |
|---|---|
| 🚦 Route | `App.openActivityCat('route')` |
| 🚘 Véhicule | `App.openActivityCat('vehicle')` |
| 🆘 Aide | `App.openActivityCat('aide')` |
| Voir tout › | `App.openActivityCat('all')` |
| ‹ Retour | `App.closeActivityCat()` |
| Reçus | `App.actCatTab('recus')` |
| Envoyés | `App.actCatTab('envoyes')` |
| Tout marquer lu | `App.markAllCatRead()` |

### Boutons dynamiques dans actModCard (générés JS)
| Contexte | Boutons |
|---|---|
| Message reçu (non envoyé) | Je m'arrête · Je vérifie · 🙏 Merci · 💬 Msg · 📞 Appel |
| Message envoyé | 💬 Répondre · Supprimer |
| Alerte véhicule reçue | Je m'arrête · Je vérifie · Merci · 💬 Msg · 📞 Appel |
| Alerte assist reçue | ✋ J'arrive · Je ne peux pas · 💬 Msg · 📞 Appel |
| Mon alerte assist (helper_coming) | 🙏 Merci · ✓ Résolu · Retirer |
| Mon alerte (générique) | ✓ Résolu · Retirer |
| Alerte route reçue | ✓ Toujours là · ✓ Disparu |

---

## Appels

| Texte | onclick |
|---|---|
| 💬 Message (callContactModal) | `CallManager.contactByMessage(plate)` |
| 🤝 Contact (callContactModal) | `CallManager.contactByCall(plate, uid)` |
| Annuler (callContactModal) | `CallManager.closeContactModal()` |
| 💬 Envoyer un message (callNotAllowed) | `CallManager.closeNotAllowedModal()` |
| Fermer (callNotAllowed) | `document.getElementById('callNotAllowedModal').classList.remove('show')` |
| Refuser (callIncomingPopup) | `CallManager.refuseCall(requestId)` |
| Accepter (callIncomingPopup) | `CallManager.acceptCall(requestId)` |
| Annuler (callSentBanner) | `CallManager.cancelCallRequest(requestId)` |

---

## FloatingCard

| ID | Texte | onclick |
|---|---|---|
| `fcBtn1` | Vu (variable) | `App.fcAction(1)` |
| `fcBtn2` | → (variable) | `App.fcAction(2)` |

---

## Drawer

| Texte | onclick |
|---|---|
| Navigation GPS | `App.closeDrawer();App.panel('drive')` |
| Conducteurs proches | `App.closeDrawer();App.openNearby()` |
| Mode invisible | `App.closeDrawer();App.toggleInvisible()` |
| Paramètres | `App.closeDrawer();App.panel('settings')` |

---

## Modaux profil

| Texte | onclick |
|---|---|
| J'ai compris (legal) | `App.closeLegal()` |
| Fermer (blocked) | `App.closeBlocked()` |
| Vider (recent) | `App.clearRecent()` |
| Fermer (recent) | `App.closeRecent()` |

---

## Résumé par panel

| Panel | Boutons |
|---|---|
| Navigation principale | 11 |
| Auth / profil setup | 11 |
| Signalement | 23 |
| Messages + bottom sheet | 18 |
| Paramètres | 24 |
| Activité + actModCard dynamiques | 8 + ~7 |
| Appels | 8 |
| FloatingCard | 2 |
| Drawer | 4 |
| Modaux profil | 4 |
| **TOTAL contrôles** | **~152** |
