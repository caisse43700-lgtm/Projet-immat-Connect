# Amélioration Navigation Fonctionnalités

# ANGE ↔ MESSAGES ↔ APPELS — L'Interaction comme objet central

**Date :** 2026-06-04  
**Principe :** L'Interaction est l'objet central. Message + Appel + Signalement + Confiance sont des formes d'interactions. Ange orchestre les intentions.

---

## Vision : Interaction comme objet central

```
Conducteur
  ↓ intention
Interaction
  ├── Message (INT-001)
  ├── Appel Phase A (INT-005)
  ├── Signalement véhicule (INT-002)
  ├── Signalement route (INT-003)
  ├── Aide (INT-004)
  ├── SOS (INT-006)
  ├── Confiance (INT-007)
  └── Blocage (INT-008)
```

---

## Ce qu'Ange peut faire aujourd'hui

| Capacité | Implémenté | Limite |
|---|---|---|
| Répondre à des questions | ✅ | Réponses textuelles seulement |
| Afficher des options cliquables | ✅ | Options pré-définies dans le prompt |
| Accéder au contexte anonymisé | ✅ | ImmatOrganism.diagnose() — snapshot |
| Suggérer une action | 🔧 Partiel | Suggestion textuelle, pas d'exécution |
| Déclencher une action | ❌ | Non implémenté — Phase Ange Actif |

---

## Ce qu'Ange doit pouvoir faire (Phase Ange Actif)

### Exemple complet : "Préviens le conducteur devant moi que son pneu semble dégonflé"

```
Utilisateur
  → "Préviens le conducteur devant moi que son pneu semble dégonflé"
  ↓
Ange — Détection intention
  → intent: SIGNAL_VEHICLE
  → target: "conducteur devant moi" → S.frontVehicle?.plate
  → content: "Pneu crevé ou à plat"
  ↓
Ange — Détection cible
  → plate = S.frontVehicle?.plate || null
  → si null → "Aucun véhicule détecté devant vous. Souhaitez-vous sélectionner sur la carte ?"
  ↓
Ange — Prévisualisation
  → Affiche : "Je vais envoyer : '⚠️ SIGNALEMENT : Pneu crevé ou à plat. Pouvez-vous vérifier votre véhicule ?' à [plaque]"
  → Boutons : ✅ Envoyer · ✏️ Modifier · ✗ Annuler
  ↓
Validation conducteur (obligatoire)
  → Tap ✅
  ↓
Ange — Exécution
  → App.vehicleAlertQuick('Pneu crevé ou à plat') vers plaque cible
  → ImmatMessages.sendToPlate(plate, msg)
  ↓
Ange — Confirmation
  → "Signalement envoyé à [plaque]. Le conducteur a été notifié."
  ↓
OBD observé
  → VEHICLE_MESSAGE_SENT {label, plate, _src: 'ImmatConnect/ange/signal'}
  → ANGE_QUERIED {intent: 'SIGNAL_VEHICLE'}
```

### Règle fondamentale
**Ange ne modifie jamais sans validation conducteur.**  
P-008 (UX-CONSTITUTION) : toute action irréversible requiert une confirmation.

---

## Interface Ange ↔ Actions (à implémenter)

### 1. Envoyer un message

```javascript
// Ange détecte intent MESSAGE + cible
AngeAction.prepareMessage({
  to: plate,          // plaque cible détectée
  draft: text,        // texte suggéré
  preview: true       // afficher prévisualisation
})
// → ouvre panelMessages/compose avec draft pré-rempli
// → conducteur valide + sendNew()
```

### 2. Préparer un appel

```javascript
AngeAction.prepareCall({
  plate: plate,
  uid: uid
})
// → CallManager.openContactOptions(plate, uid)
// → conducteur confirme via callContactModal
```

### 3. Répondre à un signalement

```javascript
AngeAction.prepareQuickReply({
  plate: plate,
  suggestedMsg: "J'arrive, je viens vous aider."
})
// → actModCard pré-sélectionné
// → conducteur confirme
```

### 4. Créer une demande de contact

```javascript
AngeAction.prepareContact({ plate, uid })
// → identique à prepareCall
```

### 5. Vérifier les autorisations

```javascript
AngeAction.checkPermissions(plate)
// → can_receive_calls(uid)
// → callLevel check
// → trust check
// → réponse: "Ce conducteur accepte les demandes de contact"
```

### 6. Comprendre le contexte

```javascript
AngeAction.getContext()
// → S.frontVehicle (véhicule devant)
// → S.selPlate (véhicule sélectionné sur carte)
// → S.alerts.filter(_mine) (mes alertes actives)
// → State.activePlate (thread Messages actif)
// → S.myLat/myLng JAMAIS transmis — seul le contexte structurel
```

---

## Intentions Ange détectables

| Intent | Pattern | Action |
|---|---|---|
| `SIGNAL_VEHICLE` | "préviens", "avertis", "signale à" | vehicleAlertQuick |
| `SIGNAL_ROAD` | "signale", "bouchon", "accident" | roadReport |
| `SEND_MESSAGE` | "envoie", "écris", "dis-lui" | prepareMessage |
| `REQUEST_CONTACT` | "appelle", "contacte", "demande contact" | prepareCall |
| `ASK_HELP` | "panne", "besoin d'aide", "moteur" | assist |
| `MARK_TRUST` | "marque de confiance", "fais confiance" | setTrust |
| `NAVIGATE` | "navigue vers", "va à", "comment aller" | searchGps |
| `SOS` | "SOS", "urgence", "112" | sos() (toujours avec confirmation) |

---

## Contraintes techniques

| Contrainte | Raison |
|---|---|
| Ange ne lit jamais le contenu des messages | INV-COM-015 |
| Ange ne connaît pas les plaques dans les conversations | INV-COM-015 |
| Ange propose, conducteur valide | P-008 + P-004 |
| Snapshot = agrégats anonymisés | INV-COM-010 |
| Toute action Ange = OBD event {_src: 'ange/xxx'} | INV-COM-008 |
| Ange ne peut pas déclencher le 112 directement | D-005 (SOS = double confirm humain) |

---

## Architecture technique (Phase Ange Actif)

```
AngeDialog.send(query)
  ↓
immat-brain-dialog (Edge Function)
  ├── ImmatOrganism.diagnose() → snapshot
  ├── Intent detection (LLM)
  ├── Parameter extraction (plate, type, message)
  └── Response {intent, params, preview, confirmation_required}
  ↓
AngeAction.execute(intent, params)
  ├── preview: true → affiche prévisualisation
  ├── confirm_callback → attendre tap conducteur
  └── execute_callback → déclenche l'action JS
  ↓
OBD observe(intent_event, {_src: 'ange/intent'})
```

---

## Statut implémentation

| Composant | Statut |
|---|---|
| AngeDialog.send() + Edge Function | ✅ Implémenté |
| ImmatOrganism.diagnose() snapshot | ✅ Implémenté |
| Intent detection | 🔧 Textuel (options pré-définies) |
| AngeAction (actions JS) | ❌ Non implémenté |
| Prévisualisation + confirmation | ❌ Non implémenté |
| Context extraction (S.frontVehicle, S.selPlate) | 🔧 Partiel |
