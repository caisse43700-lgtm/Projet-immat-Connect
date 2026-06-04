# UX-INTERACTION-SKELETON — Squelette des flux A→B
> Dérivé de : audit code index.html + UX-INTERACTIONS.json + UX-JOURNEYS.json
> Dernière vérification : 2026-06-02

---

## LÉGENDE

```
[BTN]          → bouton HTML existant + onclick trouvé en code
[BTN?]         → bouton manquant (non implémenté)
[AUTO]         → déclenché automatiquement (realtime, timer)
✓              → implémenté et vérifié
⚠              → implémenté mais incomplet
✗              → non implémenté
FC             → FloatingCard (notification urgente temporaire)
```

---

## 1. SQUELETTE PAR INTERACTION

---

### INT-001 — MESSAGE A → B

```
ACTEUR A                     SYSTÈME                         ACTEUR B
─────────────────────────────────────────────────────────────────────────

[BTN] Tap marqueur           → showVehicleContextMenu()
      ↓ "Contacter"          → vehicleContextAction('contact')
      ↓                      → panel('messages') + setMode('compose')
      ↓                      → icComposePlate = plate
[BTN] Envoyer                → ImmatMessages.sendNew()
                             → INSERT messages table              →[AUTO] Réception realtime
                             → toast "Message envoyé"           →[AUTO] Badge +1
                                                                →[AUTO] toast notification
                                                                →       panel messages / Reçus
                             ────────────────────────────────────────────
[BTN] nearbyPanel Contacter  → CallManager.openContactOptions()       |
[BTN] pickPlate(p)           → panel('messages') + compose            |
[BTN] actHelpReply(plate)    → panel('messages') + compose            |
                             ────────────────────────────────────────────

ACTEUR B (réponse)
[BTN] Répondre               → ImmatMessages.reply()
[BTN] Réponse rapide         → ImmatMessages.quick(t)
[BTN?] "Je remercie"         ✗ NON IMPLÉMENTÉ (INT-006)

RETOURS MANQUANTS
[?]   Confirmation lecture   ✗ Émetteur ne sait pas si B a lu (FRI-006)
[?]   "Vu" côté émetteur     ✗ Non implémenté
```

---

### INT-002 — ALERTE VÉHICULE A → B (conducteur ciblé)

```
ACTEUR A                     SYSTÈME                         ACTEUR B
─────────────────────────────────────────────────────────────────────────

[BTN] FAB Signaler           → openReport() → reportPanel overlay
      ↓ "Véhicule"           → sigStepVehicle()
      ↓ [input plaque]       → sigVehiclePlate.focus()
      ↓ [type alerte]        → vehicleAlertQuick(label)
                             → ImmatMessages.sendToPlate(plate, msg)
                             → INSERT messages table              → [AUTO] Réception realtime
                             → S.chCommunityReports.send(          → [AUTO] FloatingCard (FC)
                                event:'vehicle_alert')
                             → toast "Envoyé"
                             → sigDone() → fermeture → carte

                             ────────────────────────────────────────────
[BTN] marqueur → "Signaler"  → vehicleContextAction('signal')           |
                             → sigStepVehicle() + plate préremplie       |
                             ────────────────────────────────────────────

FC RÉCEPTEUR (8s auto-close)
[BTN] fcBtn1 "Vu"            → updateActBadge()                ✓
[BTN] fcBtn2 "Répondre"      → panel('messages') inbox         ✓

RETOURS MANQUANTS
[?]   A sait que B a vu      ✗ Pas de confirmation retour      ⚠ (FRI-006)
```

---

### INT-003 — SIGNALEMENT ROUTE (→ tous conducteurs proches)

```
ACTEUR A                     SYSTÈME                         PROCHES
─────────────────────────────────────────────────────────────────────────

[BTN] FAB Signaler           → reportPanel
      ↓ "Route"              → sigStepRoute()
      ↓ [type : accident…]   → roadReport(type)
                             → addCommunityAlert()               → [AUTO] Marqueur carte
                             → saveReportRemote()                → [AUTO] FC pour proches
                             → notifyAlert()                     → [AUTO] toast proches
                             → sigDone() → fermeture → carte

RÉSOLUTION (par l'émetteur ou un conducteur proche)
[BTN] actConfirmAlert(id,'resolved') → marqueur disparaît
[BTN] marqueur alerte tap    → ficheFlottante légère [BTN?]    ✗ MANQUANT (UX-MAP)
```

---

### INT-004 — DEMANDE D'AIDE (→ tous conducteurs proches)

```
ACTEUR A (en panne)          SYSTÈME                     CONDUCTEURS PROCHES
─────────────────────────────────────────────────────────────────────────────

[BTN] FAB Signaler           → reportPanel
      ↓ "Aide"               → sigStepAide()
      ↓ [type : panne…]      → assist(type)
                             → addCommunityAlert(group:'assist') → [AUTO] Marqueur aide
                             → saveReportRemote(category:'help') → [AUTO] FC proches
                             → toast "Demande envoyée"

CONDUCTEUR PROCHE (helper)
[BTN?] "Je viens aider"      ✗ NON IMPLÉMENTÉ (FRI-009)       ← CYCLE INCOMPLET
                               → Acteur A ne sait pas si aide arrive

RÉSOLUTION
[BTN] Résoudre               → actConfirmAlert(id,'resolved')  ✓
      ↓                      → marqueur supprimé
      ↓                      → helpers notifiés                 ⚠ toast seulement
```

---

### INT-005 — APPEL WEBRTC A → B

```
ACTEUR A                     SYSTÈME                         ACTEUR B
─────────────────────────────────────────────────────────────────────────

[BTN] panelMessages → Appeler → CallManager.openContactOptions(plate)
                             → callContactModal
[BTN] "Appeler"              → CallManager.contactByCall(plate, uid)
                             → can_receive_calls() RPC check    → SI AUTORISÉ :
                             → requestCall() INSERT             → [AUTO] callIncomingPopup
                                                                → [BTN] Accepter ou Refuser
                             → callSentBanner affiché           → SI REFUSÉ :
                                                                → [AUTO] toast émetteur

APPEL ACCEPTÉ
[AUTO] callOverlay           → WebRTC session                   ← WebRTC session
[BTN] Raccrocher             → fin appel                        ← fin appel

SI B N'ACCEPTE PAS LES APPELS
[AUTO] callNotAllowedModal   → explication ⚠ message à améliorer (DECISIONS DA-002)
[BTN] "Contacter par message" → panel('messages') compose      ✓
```

---

### INT-006 — REMERCIEMENT A → B

```
ACTEUR A                     SYSTÈME                         ACTEUR B
─────────────────────────────────────────────────────────────────────────

WORKAROUND ACTUEL
[BTN] ImmatMessages.quick('Bien reçu, merci.')  ✓ (mais générique)

MANQUANT
[BTN?] "Je remercie"         ✗ NON IMPLÉMENTÉ
       → Interaction dédiée avec icône/retour spécifique
       → Badge "Remerciement reçu" pour B
```

---

### INT-007 — RÉSOLUTION AIDE / ALERTE

```
ACTEUR A (demandeur)         SYSTÈME                         HELPERS
─────────────────────────────────────────────────────────────────────────

[BTN] panelActivite → Résoudre → actConfirmAlert(id,'resolved')
[BTN] marqueur → Résoudre    → actConfirmAlert(id,'resolved')
                             → UPDATE reports SET status='resolved' → [AUTO] marqueur supprimé
                             → helpers notifiés ⚠ toast seulement  ← notification incomplète
```

---

### INT-008 — BLOCAGE CONDUCTEUR B par A

```
ACTEUR A                     SYSTÈME
─────────────────────────────────────────────────────────────────────────

[BTN] message → Bloquer      → App.blockPlate(plate)
[BTN] vehicleContextMenu → Bloquer → vehicleContextAction('block')
                             → S.blocked.push(plate)
                             → localStorage 'ic_blocked' ⚠ VOLATILE (FRI-007)
                             → loadOthers() + loadMsgs() refresh
                             → [BTN] Débloquer dans panelSettings  ✓

MANQUANT
[?]   Persistance DB         ✗ Blocage perdu si cache effacé (DA-004)
```

---

### INT-009 — SOS

```
ACTEUR A (urgence)           SYSTÈME                         112 + PROCHES
─────────────────────────────────────────────────────────────────────────

[BTN] longSos (3s appui)     → startSosHold() timer 3s        ✓ D-005 implémenté
                             → confirm('Appeler 112 ?')
                             → tel:112                         → Appel urgences
                             → assist('panne') + annonce       → [AUTO] FC proches

PROBLÈME
       SOS = assist('panne') ⚠ Pas de canal prioritaire distinct
```

---

### INT-010 — SIGNALEMENT ABUS

```
ACTEUR A                     SYSTÈME
─────────────────────────────────────────────────────────────────────────

[BTN?] Message → Signaler abus ✗ NON IMPLÉMENTÉ
[BTN?] Alerte → Signaler faux  ✗ NON IMPLÉMENTÉ
```

---

## 2. BOUTONS MORTS (trouvés en code, inaccessibles ou cassés)

| ID | Bouton / Fonction | Ligne | Problème | Recommandation |
|---|---|---|---|---|
| MORT-001 | `App.callSignalPlate()` | 139 | Fonction inexistante en JS → ReferenceError | Supprimer le bouton |
| MORT-002 | `App.actViewOnMap(alertId)` | 1209 | Fonction implémentée mais aucun bouton ne l'appelle | Créer bouton dans card d'alerte ou supprimer la fonction |
| MORT-003 | `signalRecapCard` (btn Vu + Utile) | 125-139 | Div caché `display:none`, conditions d'affichage jamais vraies | Afficher ou supprimer entièrement |
| MORT-004 | `App.clearMsg()` + bouton "Vider message" | 167 | Dans panelContact (caché, jamais montré) | Supprimer avec panelContact |
| MORT-005 | `App.voicePlate()` + btn 🎙 Plaque | 167 | Dans panelContact (caché). `voiceInput('iTarget',...)` | Migrer vers `voiceInput('icComposePlate',...)` ou supprimer |
| MORT-006 | `App.voiceMsg()` (btn dans panelContact) | 167 | Dans panelContact (caché). `voiceInput('iMsg',...)` | Migrer vers `voiceInput('icComposeText',...)` ou supprimer |
| MORT-007 | `App.sendMsg()` (bouton Envoyer panelContact) | 167 | Dans panelContact (caché). Lit `iMsg`/`iTarget` | Supprimer avec panelContact |

---

## 3. BOUTONS REDONDANTS (intention similaire, 2 implémentations)

| Paire | BTN 1 | BTN 2 | Contexte | Verdict |
|---|---|---|---|---|
| Réponse rapide "Je m'arrête" | `ImmatMessages.quick('Je m\'arrête, merci.')` (panelMessages l.203) | `App.actQuickReply(plate, 'Je m\'arrête.')` (activité l.1186) | Panneaux différents | ACCEPTABLE — contextes distincts |
| Marquer alerte "Vu" | `App.fcAction(1)` → 'seen' (FloatingCard) | `App.actConfirmAlert(id,'present')` (activité) | Temps réel vs historique | INCOHÉRENCE STATUS — 'seen' ≠ 'present' |
| Marquer alerte "Vu" (legacy) | `App.markLastVehicleAlertSeen()` (signalRecapCard) | Les deux ci-dessus | signalRecapCard cachée | MORT — à supprimer |
| Contacter (depuis nearbyPanel) | `App.pickPlate(p)` → compose | `CallManager.openContactOptions(p)` → modal choix | Mêmes intentions | Choix → `CallManager` centralise ✓ |

---

## 4. BOUTONS MANQUANTS (parcours sans bouton)

| ID | Bouton à créer | Organe | JRN/FRI | Priorité | Impact |
|---|---|---|---|---|---|
| MISS-001 | "Modifier profil" dans drawer | MOI | B2-2 INVENTAIRE | P2 | Utilisateur ne peut pas modifier son profil post-inscription sans savoir aller dans sp |
| MISS-002 | "Signaler ici" contextuel (tap carte) | SIGNAL | B2-3 INVENTAIRE | P2 | FAB global seulement → perd les coordonnées exactes du danger |
| MISS-003 | "Je viens aider" (helper → demandeur) | AIDE | FRI-009 | P2 | Cycle aide incomplet — demandeur ne sait pas si aide arrive |
| MISS-004 | "Signaler abus" sur message reçu | CONTACT | INT-010 | P2 | Pas de moyen de signaler un message abusif |
| MISS-005 | "Je remercie" / Remerciement formel | CONTACT | INT-006 | P3 | Interaction sociale positive non structurée |
| MISS-006 | Fiche flottante sur tap marqueur alerte | SIGNAL | UX-MAP Étape 1 | P3 | Tap alerte ouvre rien → expérience carte passive |
| MISS-007 | "Annuler" explicite dans sigStep1 | SIGNAL | UX-MAP | P2 | X ferme le overlay mais certains utilisateurs cherchent "Annuler" |

---

## 5. COHÉRENCE STATUS ALERTES (incohérence identifiée)

Trois status utilisés pour "l'utilisateur a vu" :

| Status | Où | Sens | Problème |
|---|---|---|---|
| `'seen'` | FloatingCard fcAction(1) | "J'ai vu la notif FC" | ≠ "J'ai traité l'alerte" |
| `'present'` | activité "Toujours là" | "Danger toujours actif" | ≠ "J'ai vu" |
| `'gone'` | activité "Plus là" | "Danger disparu" | OK — terminal |
| `'resolved'` | résolution | "Résolu par demandeur" | OK — terminal |

**Recommandation** : Unifier enum. `'seen'` = vu par récepteur (système). `'present'` = confirmé actif par observateur. `'gone'` = disparu. `'resolved'` = clôturé par émetteur.

---

## 6. CARTOGRAPHIE ACCÈS PANELS

```
CARTE (panelAltet) ← panel par défaut
├── FAB Signaler → reportPanel (overlay)
│   ├── sigStep1 → sigStepRoute / sigStepVehicle / sigStepAide
│   ├── [Retour] → sigBack()
│   └── [X] → closeOverlay('reportPanel')
├── FAB Conducteurs → nearbyPanel (overlay)
│   ├── [Contacter] → panel('messages') + compose
│   └── [X] → closeOverlay('nearbyPanel')
├── FAB Vue → cycleView()
├── FAB Recentrer → recenter()
├── FAB SOS (appui long) → confirm + tel:112
├── FAB Ange (Gardien) → angePanel
└── Handle sheet → openSheet()
    ├── [Carte] navMap → panel('altet')
    ├── [Signaler] navSignaler → reportPanel
    └── [Activité] navActivite → panel('activite')

DRAWER (hamburger menu)
├── Navigation GPS → panel('drive')
├── Conducteurs proches → openNearby()
├── Mode invisible → toggleInvisible()
└── Paramètres → panel('settings')

BOTTOM NAV
├── [Carte] → navMap() → panel('altet')
├── [Signaler] → (accès reportPanel)
└── [Activité] → navActivite() → panel('activite')
```

---

## 7. FLUX COMPLETS VÉRIFIÉS

| Flux | Documenté | Implémenté | Complet | Score |
|---|---|---|---|---|
| INT-001 Message A→B | ✓ | ✓ | ⚠ sans read receipt | 90% |
| INT-002 Alerte véhicule | ✓ | ✓ | ⚠ sans retour émetteur | 85% |
| INT-003 Signalement route | ✓ | ✓ | ✓ | 95% |
| INT-004 Demande aide | ✓ | ✓ | ⚠ sans réponse helper | 80% |
| INT-005 Appel WebRTC | ✓ | ✓ | ✓ | 90% |
| INT-006 Remerciement | ✓ | ✗ | ✗ | 0% |
| INT-007 Résolution | ✓ | ✓ | ✓ | 95% |
| INT-008 Blocage | ✓ | ⚠ (local) | ⚠ | 70% |
| INT-009 SOS | ✓ | ✓ | ⚠ canal non distinct | 80% |
| INT-010 Signalement abus | ✓ | ✗ | ✗ | 0% |
