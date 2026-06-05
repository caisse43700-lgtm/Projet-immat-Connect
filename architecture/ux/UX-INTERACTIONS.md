# Amélioration Navigation Fonctionnalités

# UX-INTERACTIONS — 10 flux A↔B complets

**Date :** 2026-06-04  
**Source :** index.html · calls.js · messages.js · architecture/**  
**Format :** A → Action → UI → JS → Supabase → Realtime → B → Notification → Réponse → Fin de cycle

---

## INT-001 — Message conducteur

**Intention :** A envoie un message direct à B.

```
A
├── UI : panelMessages / compose ou actQuickReply / Activité
├── JS : ImmatMessages.sendNew() ou ImmatMessages.sendToPlate(plate, msg)
│         → INSERT INTO messages {sender_id, receiver_id, sender_plate, receiver_plate, message}
├── Supabase : messages.INSERT → Realtime postgres_changes event='INSERT'
│
↓ REALTIME
│
B
├── Realtime : subscribe() → callback INSERT → refresh()
├── UI : thread se met à jour · badge actBadge +1
├── Notification : notifyAlert si visible
│
B répond (optionnel)
├── UI : quick reply ("Je vérifie" / "🙏 Merci") ou textarea + reply()
├── JS : ImmatMessages.reply() → INSERT message retour
│
Fin de cycle
├── A : reçoit réponse via Realtime → thread à jour
├── OBD A : MSG_SENT {to: plate}
├── OBD B : MSG_RECEIVED {_src: subscribe}
└── Invariant INV-COM-001 respecté (plaque = unité interaction)
```

**Trous identifiés :**
- GAP-002 : aucun ✓✓ lu visible côté A
- `read_at` tracé en DB mais non affiché dans le fil

**Statut :** 90% — fonctionnel, marqueur lu absent

---

## INT-002 — Signalement véhicule (A → B spécifique)

**Intention :** A prévient un conducteur B d'un problème sur son véhicule.

```
A
├── UI : tap marqueur véhicule B → contextMenu → "Prévenir"
│      ou : reportPanel → sigStep2Vehicle → vehicleAlertQuick(label)
├── JS : App.vehicleAlert(label)
│         → panel('messages') + setMode('compose') + icComposePlate=B + icComposeText=msg
├── A envoie manuellement : ImmatMessages.sendNew()
│         → INSERT messages {sender_plate=A, receiver_plate=B, message}
├── Supabase : messages.INSERT + reports.INSERT {plate=B, group='vehicle'}
│
↓ REALTIME
│
B
├── Realtime : messages subscribe() → refresh() → badge +1
├── UI : Activité → actModCard type=vehicle
│         boutons : "Je m'arrête" / "Je vérifie" / "Merci" / 💬 Msg / 📞 Appel
├── Notification : FloatingCard "🚗 Le véhicule vous a contacté"
│
B répond
├── actQuickReply(plate, "Je m'arrête.") ou actOpenConv(plate)
│
Fin de cycle
├── A : reçoit réponse dans thread Messages
├── OBD A : VEHICLE_MESSAGE_SENT
├── Statut alerte : peut passer → seen_by_driver
└── Invariant INV-COM-001, INV-COM-011
```

**Trous identifiés :**
- A ne reçoit pas de notification push quand B dit "Je vérifie" (retour seulement par message)

**Statut :** 85% — boucle retour partielle

---

## INT-003 — Signalement route (broadcast)

**Intention :** A signale un incident à tous les conducteurs proches.

```
A
├── UI : reportPanel → sigStep2Route → bouton type
│         ou longpress carte → fabSignalHere
├── JS : App.roadReport(type)
│         → addCommunityAlert({type, lat, lng, group='route', _mine=true})
│         → saveReportRemote({plate:'ROUTE', reason, latitude, longitude})
│         → INSERT reports
├── Supabase : reports.INSERT
│
↓ REALTIME
│
B (conducteurs dans le rayon)
├── Realtime : subscribeCommunityReports → postgres_changes INSERT
├── JS : addCommunityAlert(data, {notify:true})
├── UI : marqueur alerte sur carte · FloatingCard type
│
Fin de cycle
├── OBD A : ROAD_CREATED {type, lat, lng}
├── TTL : auto-cleanup par cleanupAlerts()
└── Invariant INV-COM-011 (observable)
```

**Statut :** 95% — complet et fiable

---

## INT-004 — Demande d'aide (assist)

**Intention :** A en difficulté demande de l'aide aux conducteurs proches.

```
A
├── UI : reportPanel → sigStep2Aide → bouton type
├── JS : App.assist(type)
│         → addCommunityAlert({type, group='assist', _mine=true})
│         → saveReportRemote({plate:'ASSISTANCE', category:'help'})
│         → INSERT reports
├── OBD A : HELP_CREATED {type, lat, lng}
│
↓ REALTIME
│
B (conducteurs proches)
├── Realtime : subscribeCommunityReports → addCommunityAlert(data, {notify:true})
├── UI : FloatingCard "✋ J'aide" + marqueur alerte sur carte
├── Activité : actModCard group=assist
│         boutons : "✋ J'arrive" / "Je ne peux pas" / 💬 Msg / 📞 Appel
│
B répond : "✋ J'arrive"
├── JS : App.actQuickReply(plate, "J'arrive, je viens vous aider.")
│         → ImmatMessages.sendToPlate(plate, msg)
│         → INSERT messages
│         → toast "✋ Aide proposée. Le conducteur sera notifié dès réception."
│         → OBD B : HELP_RESPONDED {to: plate}
│
↓ REALTIME → A
│
A reçoit message "J'arrive"
├── JS : refresh() → détection txt.startsWith("J'arrive")
│         → alerte._mine.status = 'helper_coming'
│         → alerte._helperPlate = B
├── UI : FloatingCard "✋ Helper en route · B vient vous aider"
│         actModCard : badge "✋ En route · B" + bouton "🙏 Merci"
│
A clôture
├── JS : App.actConfirmAlert(id, 'resolved') ou actQuickReply(B, "🙏 Merci pour votre aide !")
│
Fin de cycle
├── OBD A : HELP_CREATED
├── OBD B : HELP_RESPONDED
├── Alerte : status → resolved/gone → cleanupAlerts()
└── Invariant INV-COM-005 (autorisation contextuelle)
```

**Statut :** 95% — complet depuis SESSION 22

---

## INT-005 — Demande de contact / Appel Phase A

**Intention :** A demande un contact à B (pas de voix — Phase 1 uniquement).

```
A
├── UI : carte → contextMenu → "Contacter" → callContactModal
│         ou : nearbyPanel → "Appeler"
│         ou : actModCard → "📞 Appel"
├── JS : CallManager.openContactOptions(plate, uid)
│         → contactByCall(plate, uid)
│         → RPC can_receive_calls(target_uid) → vérifie autorisation
│         → requestCall(plate, uid) → INSERT call_requests {status:'pending', expires_at}
├── Supabase : call_requests.INSERT
├── UI A : callSentBanner "Demande envoyée à [B]" (8s · Annuler)
├── OBD A : CALL_INITIATED {to: plate, requestId}
│
↓ REALTIME
│
B
├── Realtime : ic_calls_[uid] → INSERT filter receiver_id=B
├── UI B : callIncomingPopup "Appel entrant de [A]" · Accepter / Refuser
├── OBD B : CALL_RECEIVED {from: plate, requestId}
│
B accepte
├── JS : CallManager.acceptCall(id)
│         → UPDATE call_requests {status:'accepted', responded_at}
│         → App.actOpenConv(A.plate)   ← ouvre conversation Messages
├── OBD B : CALL_ACCEPTED {with: plate, requestId}
│
B refuse
├── JS : CallManager.refuseCall(id)
│         → UPDATE call_requests {status:'refused', responded_at}
├── OBD B : CALL_REFUSED {requestId}
│
↓ REALTIME → A (si accepté)
│
A (via UPDATE filter requester_id=A)
├── _hideSentBanner()
├── toast "Demande acceptée → ouverture conversation"
├── App.actOpenConv(B.plate)
│
Expiration (TTL expires_at)
├── UI : callIncomingPopup disparaît automatiquement
├── callSentBanner disparaît (timer 8s UI)
├── OBD : CALL_MISSED manquant ← GAP IDENTIFIÉ
│
Fin de cycle
├── Anti-spam : 23505 (doublon), spam_limit, cooldown_active gérés
├── RLS : call_requests SELECT/INSERT protégé
└── Invariant INV-COM-003 (double consentement)
```

**IMPORTANT :** Aucun WebRTC. L'appel "accepté" ouvre une conversation Messages.

**Trous identifiés :**
- OBD `CALL_MISSED` non émis lors d'expiration
- OBD `CALL_ENDED` non applicable (pas de session voix)

**Statut :** 90% — Phase 1 complète, Phase B (voix) = chantier non démarré

---

## INT-006 — SOS

**Intention :** A en danger grave déclenche une alerte d'urgence.

```
A
├── UI : bouton SOS (appui long 3s) → startSosHold(event)
│         → timer 3000ms → sos()
│         → cancelSosHold() si relâché avant
├── JS : App.sos()
│         → OBD : SOS_TRIGGERED {lat, lng}
│         → assist('panne') → broadcast alerte urgente
│         → confirm("Appeler le 112 ?") × 2
│         → location.href = 'tel:112'
│
↓ REALTIME
│
B (conducteurs proches)
├── Reçoit alerte group=assist, level='urgent'
├── FloatingCard + marqueur urgent sur carte
│
Fin de cycle
├── OBD A : SOS_TRIGGERED
├── Invariant INV-COM-009, INV-COM-011
└── D-005 (3s hold + double confirm 112)
```

**Trous identifiés :**
- Pas de canal SOS distinct des alertes `assist` ordinaires (P3-023)
- Pas de déclenchement automatique du 112 sans confirmation

**Statut :** 80% — fonctionnel mais pas de canal prioritaire dédié

---

## INT-007 — Confiance

**Intention :** A marque B comme conducteur de confiance (ou révoque).

```
A
├── UI : bottom sheet thread → "✓ Marquer de confiance" ou "✓ Révoquer confiance"
├── JS : ImmatMessages._sheetAction('trust')
│         → setTrust(plate, trust === 'TRUSTED' ? 'NONE' : 'TRUSTED')
│         → localStorage ic_trust
├── OBD A : CONTACT_TRUSTED ou CONTACT_REVOKED
│
Effet
├── Trust niveau ≥ 2 → CallManager callLevel 2 → reçoit appels des contacts de confiance
├── Priority rules : BLOCKED > TRUSTED (INV-COM-014)
│
Fin de cycle
├── Stockage : localStorage ic_trust seulement (DA-005 en attente)
└── Invariant D-004 (confiance = interactions, pas personnes)
```

**Trous identifiés :**
- ic_trust non synchronisé avec ReliabilityPro DB (DA-005 ouvert)
- Aucune notification à B qu'il est maintenant "de confiance"

**Statut :** 75% — fonctionnel local, pas persistant DB

---

## INT-008 — Blocage

**Intention :** A bloque B — plus aucune communication possible.

```
A
├── UI : carte → contextMenu → "Bloquer" · ou : settings → Bloqués
├── JS : App.blockPlate(plate)
│         → ic_blocked localStorage
│         → hideVehicleContextMenu()
│
Effet
├── B disparaît de la carte pour A
├── Messages de B filtrés (côté client)
├── Invariant INV-COM-014 : BLOCKED > TRUSTED
│
Déblocage
├── UI : Settings → "🚫 Bloqués" → liste → débloquer
├── JS : App.unblockPlate(plate)
│
Fin de cycle
├── Stockage : localStorage ic_blocked seulement (DA-004 ouvert)
└── Côté B : aucune notification, aucun effet (privé pour A)
```

**Trous identifiés :**
- ic_blocked localStorage — volatile, non synchronisé DB (DA-004)
- B non informé (voulu par conception — privé)
- Blocage DB absent = blocage perdu si localStorage effacé

**Statut :** 70% — fonctionnel localement, sans persistance DB

---

## INT-009 — Signalement abus

**Intention :** A signale un abus (message inapproprié, harcèlement).

**Statut :** 0% — Non implémenté (GAP-003)

```
Flux cible (non encore implémenté)
├── UI : message reçu → bouton "⚠️ Signaler"
├── JS : signalAbus(messageId, plate) → INSERT reports {type='abuse', target_plate=B}
├── Supabase : reports.INSERT (privé, visible auteur + gardien)
├── Gardien : alert dans dashboard
└── OBD : ABUSE_REPORTED
```

---

## INT-010 — Interaction Ange

**Intention :** L'assistant Ange répond aux questions du conducteur.

```
A
├── UI : bouton Ange → angeOverlay
│         → textarea → bouton Envoyer
├── JS : AngeDialog.send(query)
│         → Edge Function `immat-brain-dialog`
│         → ImmatOrganism.diagnose() → snapshot anonymisé
│         → Réponse IA structurée
├── OBD A : ANGE_QUERIED
│
Règles
├── Ange n'accède PAS aux messages individuels (INV-COM-015)
├── Snapshot = agrégats anonymisés (pas de plaque, pas de contenu)
├── Fail-open : si Edge Function down → réponse dégradée
│
Fin de cycle
├── OBD : ANGE_QUERIED
└── Invariant INV-COM-015 (Ange ≠ accès messages)
```

**Trous identifiés :**
- Ange ne peut pas encore déclencher d'actions (envoyer message, préparer appel)
- L'Ange ne sait pas que l'utilisateur veut prévenir le véhicule devant lui

**Statut :** 60% — répond aux questions, ne peut pas agir

---

## Tableau récapitulatif

| ID | Interaction | Statut | OBD A | OBD B | Trou principal |
|---|---|---|---|---|---|
| INT-001 | Message | 90% | MSG_SENT | MSG_RECEIVED | ✓✓ lu absent |
| INT-002 | Alerte véhicule | 85% | VEHICLE_MESSAGE_SENT | — | Retour A partiel |
| INT-003 | Signalement route | 95% | ROAD_CREATED | — | — |
| INT-004 | Demande aide | 95% | HELP_CREATED | HELP_RESPONDED | — (SESSION 22) |
| INT-005 | Demande contact | 90% | CALL_INITIATED | CALL_ACCEPTED/REFUSED | CALL_MISSED absent |
| INT-006 | SOS | 80% | SOS_TRIGGERED | — | Canal dédié absent |
| INT-007 | Confiance | 75% | CONTACT_TRUSTED | — | Pas DB |
| INT-008 | Blocage | 70% | — | — | Pas DB, volatile |
| INT-009 | Signalement abus | 0% | — | — | Non implémenté |
| INT-010 | Ange | 60% | ANGE_QUERIED | — | Ange passif seulement |
