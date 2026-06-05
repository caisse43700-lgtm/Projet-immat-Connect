# Amélioration Navigation Fonctionnalités

# UX-JOURNEYS — 10 parcours utilisateur A↔B

**Date :** 2026-06-04  
**Source :** code réel + UX-INTERACTIONS.md  
**Format :** chaque journey = séquence d'écrans + condition de fin + contrôles

---

## JRN-001 — Inscription et premier message

**Objectif :** Un conducteur s'inscrit et envoie son premier message.

```
BIENVENUE (#sw)
  → tap "Créer un compte"
AUTH (#sa, mode signup)
  → email + mot de passe + plaque + pseudo + couleur
  → App.handleAuth() → signup() → Supabase auth.signUp()
  → email confirmation si requis
PROFIL SETUP (#sp)
  → App.saveProfile() → UPSERT profiles
  → App.openMap() → APP SCREEN
CARTE (panelAltet)
  → tap autre véhicule → contextMenu
  → "Contacter" → callContactModal
  → "💬 Message" → panelMessages / compose
  → icComposePlate = plaque B
  → icComposeText = message
  → sendNew() → INSERT messages
  → toast "Message envoyé"
FIN DE CYCLE
  ✓ Compte créé, profil complet, premier message envoyé
  OBD : PROFILE_SAVED, MSG_SENT
```

**Condition de fin :** B reçoit le message dans son activité.

---

## JRN-002 — Signaler un véhicule en danger

**Objectif :** A remarque un pneu crevé sur le véhicule B devant lui.

```
CARTE (panelAltet)
  → A voit véhicule B devant (frontCarBanner ou marqueur)
  → tap "Contacter" (frontCarBanner) OU tap marqueur → contextMenu → "Prévenir"
  → sigStepVehicle() → reportPanel sigStep2Vehicle
  → bouton "🔴 Pneu"
  → vehicleAlertQuick('Pneu crevé ou à plat')
  → vehicleAlert(label) → panel('messages') + compose pré-rempli
MESSAGES (panelMessages, compose)
  → A vérifie le message pré-rempli
  → sendNew() → INSERT messages {to: B, message: "🚨 SIGNALEMENT..."}
  → INSERT reports {plate: B, group: 'vehicle'}
FIN A
  ✓ Message et rapport envoyés
  OBD A : VEHICLE_MESSAGE_SENT
  toast "Signalement préparé. Appuie sur Envoyer."

B (côté réception)
  → Realtime → MSG_RECEIVED → badge +1
  → Activité → actModCard type=vehicle
  → FloatingCard "🚗 Le véhicule vous a contacté"
  → boutons "Je m'arrête" / "Je vérifie" / "💬 Msg"
  → actQuickReply(A, "Je vérifie.") OU actOpenConv(A)
FIN CYCLE ✓ B a été alerté et a répondu
```

**Contrôles :**
- A doit avoir sélectionné un véhicule cible (selectedVehiclePlate)
- A ne peut pas s'alerter lui-même

---

## JRN-003 — Demander de l'aide (panne)

**Objectif :** A est en panne et demande de l'aide.

```
CARTE (panelAltet)
  → tap "Signaler" (navSignaler)
  → reportPanel → sigStep1 → "🆘 Aide"
  → sigStepAide()
  → sigStep2Aide → bouton "🚗 Panne"
  → assist('panne') + sigDone()
  → addCommunityAlert({group:'assist', level:'urgent'})
  → saveReportRemote() → INSERT reports
  → toast "🆘 Demande d'aide envoyée"
  OBD A : HELP_CREATED

B (conducteur proche)
  → Realtime → subscribeCommunityReports → addCommunityAlert
  → FloatingCard "🆘 Panne — Conducteur proche — ✋ J'aide"
  → tap "✋ J'aide" → actHelpReply(A) → panelMessages/compose vers A
  OU
  → Activité → actModCard group=assist
  → bouton "✋ J'arrive"
  → actQuickReply(A, "J'arrive, je viens vous aider.")
  → sendToPlate(A, msg)
  → toast B "✋ Aide proposée. Le conducteur sera notifié dès réception."
  OBD B : HELP_RESPONDED

A reçoit message "J'arrive"
  → Realtime → MSG_RECEIVED → refresh()
  → détection txt.startsWith("J'arrive")
  → alerte.status = 'helper_coming', _helperPlate = B
  → FloatingCard "✋ Helper en route · B vient vous aider"
  → actModCard badge "✋ En route · B" + bouton "🙏 Merci"
  → actQuickReply(B, "🙏 Merci pour votre aide !")
  OU actConfirmAlert(id, 'resolved')
FIN CYCLE ✓ Aide demandée, proposée, confirmée, résolue
```

---

## JRN-004 — Demande de contact (appel Phase A)

**Objectif :** A veut parler à B et envoie une demande de contact.

```
CARTE / ACTIVITÉ
  → tap marqueur B → contextMenu → "Contacter"
  OU actModCard → "📞 Appel"
  → CallManager.openContactOptions(B.plate, B.uid)
  → callContactModal "Comment souhaitez-vous contacter [B] ?"
  → bouton "🤝 Contact"
  → contactByCall(B.plate, B.uid)
  → RPC can_receive_calls(B.uid) → vérifie autorisation
  → requestCall(B.plate, B.uid)
  → INSERT call_requests {status:'pending', expires_at: +30s}
  → callSentBanner "Demande envoyée à [B]" (8s · Annuler)
  OBD A : CALL_INITIATED

B (callIncomingPopup)
  → Realtime ic_calls_[B.uid] → INSERT filter receiver_id=B
  → callIncomingPopup "Appel entrant de [A]"
  → boutons "Accepter" / "Refuser"
  OBD B : CALL_RECEIVED

B accepte
  → acceptCall(id) → UPDATE status='accepted'
  → actOpenConv(A.plate)
  OBD B : CALL_ACCEPTED
  → A : Realtime UPDATE filter requester_id=A
  → hideSentBanner, toast "Accepté → conversation ouverte"
  → actOpenConv(B.plate)

B refuse
  → refuseCall(id) → UPDATE status='refused'
  OBD B : CALL_REFUSED
  → A : toast "Demande refusée."
  
Expiration (30s)
  → callIncomingPopup se masque
  → [MANQUE] OBD CALL_MISSED non émis

FIN CYCLE ✓ Contact établi par conversation Messages
IMPORTANT : Aucun WebRTC — la "conversation" = thread Messages standard
```

---

## JRN-005 — Signalement route

**Objectif :** A signale un bouchon.

```
CARTE
  → navSignaler (bottom nav)
  → reportPanel → "🚦 Route"
  → sigStep2Route → "🚦 Bouchon"
  → roadReport('bouchon') + sigDone()
  → addCommunityAlert({type:'bouchon', level:'important', TTL:30min})
  → saveReportRemote() → INSERT reports
  → toast "✅ Signalement envoyé"
  OBD A : ROAD_CREATED

B (tous conducteurs proches)
  → Realtime subscribeCommunityReports
  → FloatingCard "🚦 Bouchon — Conducteur proche"
  → marqueur bouchon sur carte
  → Activité → actModCard (route)
  → boutons "✓ Toujours là" / "✓ Disparu"

TTL
  → cleanupAlerts() après 30min
  → marqueur retiré de la carte

FIN CYCLE ✓ Alerte diffusée, TTL géré, marqueur nettoyé
```

---

## JRN-006 — SOS

**Objectif :** A est en danger grave.

```
CARTE
  → maintien 3s bouton SOS (#longSos)
  → startSosHold(event) → timer 3000ms
  → sos()
  → assist('panne') → broadcast alerte urgente
  → OBD : SOS_TRIGGERED {lat, lng}
  → confirm("Appeler le 112 ?")
  → confirm("Confirmation finale ?")
  → location.href = 'tel:112'

B (conducteurs proches)
  → Realtime → FloatingCard "🚗 Panne — urgent"
  → marqueur urgence sur carte
  [Traitement identique à JRN-003]

FIN CYCLE ✓ Alerte urgente diffusée + 112 en option
LIMITE : SOS = alias de assist('panne') — pas de canal prioritaire dédié
```

---

## JRN-007 — Marquer conducteur de confiance

**Objectif :** A marque B comme conducteur de confiance après une bonne interaction.

```
MESSAGES (panelMessages, thread ouvert avec B)
  → tap ⋯ (menu thread)
  → openThreadMenu()
  → icBottomSheet affiche "✓ Marquer de confiance"
  → tap bouton
  → _sheetAction('trust')
  → setTrust(B, 'TRUSTED')
  → localStorage ic_trust[B] = 'TRUSTED'
  → closeSheet()
  → toast "B marqué de confiance"
  OBD A : CONTACT_TRUSTED {plate: B}

Effet
  → Si callLevel ≥ 2 : B peut appeler A
  → Priority : BLOCKED > TRUSTED

Révoquer
  → Même flow → "✓ Révoquer confiance"
  → setTrust(B, 'NONE')
  OBD A : CONTACT_REVOKED

FIN CYCLE ✓ Trust local mis à jour
LIMITE : localStorage uniquement — non synchronisé DB (DA-005)
```

---

## JRN-008 — Bloquer un conducteur

**Objectif :** A ne veut plus avoir d'interactions avec B.

```
CARTE (contextMenu)
  → tap marqueur B → contextMenu → "Bloquer"
  → App.blockPlate(B)
  → ic_blocked.push(B)
  → B disparaît de la carte
  → B ne peut plus appeler A
  → hideVehicleContextMenu()

OU depuis Settings
  → panelSettings → "🚫 Bloqués" → App.openBlocked()
  → liste des plaques bloquées
  → App.unblockPlate(plate) pour débloquer

Invariant
  → INV-COM-014 : BLOCKED > TRUSTED (blocage prime toujours)
  → B n'est pas informé du blocage

FIN CYCLE ✓ Blocage effectif immédiatement côté A
LIMITE : localStorage uniquement (DA-004) — volatile
```

---

## JRN-009 — Confiance et autorisation appel

**Objectif :** A veut décider qui peut lui envoyer une demande de contact.

```
SETTINGS (panelSettings)
  → Section "Autorisations d'appel"
  → Toggle allowCallsToggle → CallManager.setCallPreferences(checked)
    → UPSERT call_preferences {user_id, allow_calls}
  → Niveau appel : 🔇 / 🤝 / 📍 / 🌐
    → ImmatMessages.setCallLevel(1-4)
    → localStorage ic_call_level

Quand B tente de contacter A
  → contactByCall(A.plate, A.uid)
  → RPC can_receive_calls(A.uid)
  → Si false : callNotAllowedModal "[A] n'a pas activé les demandes de contact"
  → bouton "💬 Envoyer un message" → ouvre conversation

FIN CYCLE ✓ Contrôle d'accès respecté
```

---

## JRN-010 — Interaction Ange

**Objectif :** A pose une question à l'assistant Ange.

```
APP SCREEN
  → bouton Ange → angeOverlay
  → textarea → question (ex: "Comment signaler un bouchon ?")
  → bouton Envoyer → AngeDialog.send(query)
  → Edge Function immat-brain-dialog
    → ImmatOrganism.diagnose() → snapshot anonymisé
    → Réponse IA structurée + options cliquables
  → OBD A : ANGE_QUERIED

Exemple "préfixé" (options Ange)
  → tap option suggestion → remplissage textarea
  → validation manuelle avant envoi

Règle INV-COM-015
  → Ange ne voit pas les messages individuels
  → Snapshot = agrégats anonymisés

FIN CYCLE ✓ Réponse IA reçue, actions proposées, validation manuelle obligatoire
LIMITE : Ange ne peut pas encore déclencher d'actions directement
```

---

## Tableau contrôles par journey

| JRN | Doublons | Trous fonctionnels | Retours absents | OBD manquants |
|---|---|---|---|---|
| JRN-001 | — | — | — | — |
| JRN-002 | — | Retour A quand B voit | — | — |
| JRN-003 | — | — | — | — |
| JRN-004 | — | CALL_MISSED | Confirmation côté A | CALL_MISSED |
| JRN-005 | — | — | — | — |
| JRN-006 | — | Canal SOS dédié | — | — |
| JRN-007 | — | Sync DB | — | — |
| JRN-008 | — | Persistance DB | — | — |
| JRN-009 | — | — | — | — |
| JRN-010 | — | Ange actif (actions) | — | — |
