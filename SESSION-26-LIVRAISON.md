# Amélioration Navigation Fonctionnalités

# SESSION 26 — LIVRAISON AngeAction API

**Date :** 2026-06-04  
**Commit :** `1e6c7e8`  
**Branch :** `claude/immatconnect-pro-app-dEKGR`  
**Tests :** `node tests/organism/ange-action.test.js` → **21/21 ✔** — Total cumulé : **106/106 ✔**

---

## Livraisons

### `AngeAction` — nouvel objet (index.html)

| Méthode | Rôle | Invariant |
|---|---|---|
| `checkPermissions(plate)` | Lit `getBlockLevel` + `getTrustLevel` + `isCallBlocked` — retourne `{canMessage, canCall, canSee, blockLevel, trustLevel}` | INV-ANGE-004 |
| `prepareInteraction({type,target,context,payload})` | Guard → preview → validation conducteur. Refuse si bloqué. | INV-ANGE-004 |
| `getContext()` | Snapshot anonymisé : frontVehicle, selPlate, activePlate, activeAlerts — sans myLat/myLng | INV-COM-015 |
| `execute(interaction)` | Re-vérifie permissions AVANT d'agir, dispatche vers l'API métier | INV-ANGE-003 |
| `_showPreview(interaction)` | Affiche zone `#angePreview` : type, cible, payload, boutons Confirmer/Annuler | — |
| `_hidePreview()` | Masque la preview et libère l'état en attente | — |

### Flux INV-ANGE-004 respecté

```
prepareInteraction()
  ↓
checkPermissions(plate)     ← source unique : Permissions Matrix
  ↓
Bloqué ?  → _showBlocked() → message d'erreur dans #angeResponse
  ↓
Non bloqué → _showPreview() → zone #angePreview avec bouton Confirmer
  ↓
Validation conducteur (clic Confirmer)
  ↓
execute()
  ↓
Re-vérification checkPermissions()   ← double guard
  ↓
Action métier (sendToPlate / contactByCall / vehicleAlertQuick / etc.)
  ↓
OBD ANGE_ACTION_EXECUTED
```

### Types supportés

| Type | Action JS | Guard |
|---|---|---|
| `MESSAGE` | `ImmatMessages.sendToPlate(plate, text)` | `canMessage` |
| `THANKS` | `ImmatMessages.sendToPlate(plate, '🙏 Merci')` | `canMessage` |
| `CALL` | `CallManager.contactByCall(plate)` | `canCall` |
| `VEHICLE_ALERT` | `App.vehicleAlertQuick(label)` | `canMessage` |
| `ROAD_ALERT` | `App.roadReport(type)` | aucun (alerte publique) |
| `HELP` | `App.assist(type)` | aucun (alerte publique) |
| `SOS` | `App.sos()` | double confirmation humaine (D-005) |
| `TRUST` | `ImmatMessages.setTrust(plate, 'TRUSTED')` | — |
| `BLOCK` | `App.blockPlate(plate)` | — |

### Autres changements

| Fichier | Changement |
|---|---|
| `calls.js` | `isCallBlocked` exposé dans l'API publique de `CallManager` |
| `messages.js` | `setContextTrust()` émet `TRUST_CONTEXTUAL_SET` OBD (activé) |
| `index.html` | `#angePreview` div ajouté dans `angePanel` |
| `scripts/detect-orphan-features.js` | `ANGE_ACTION_PREPARED`, `ANGE_ACTION_EXECUTED` dans `knownObserveEvents` |

### Knowledge Graph

- **INT-ANGE-ACTION** : nouvelle intention (INT-011, JRN-010, FLOW-ANGE-ACTION)
- **ANGE_ACTION_PREPARED** + **ANGE_ACTION_EXECUTED** : OBD events documentés avec invariants
- **TRUST_CONTEXTUAL_SET** : statut PENDING → actif
- **GAP-009** : marqué RÉSOLU SESSION-26

---

## État du système

| Composant | État |
|---|---|
| Communication Engine | ✅ 100% |
| Trust Engine | ✅ 100% |
| Block Engine | ✅ 100% |
| Permissions Matrix | ✅ 100% |
| OBD | ✅ 100% |
| Knowledge Graph | ✅ ~99% |
| AngeAction API | ✅ SESSION 26 implémenté |
| Interaction Engine | ⏳ SESSION 27 |
| Guardian Loop | ⏳ SESSION 28 |
| Knowledge Graph V2 | ⏳ SESSION 29 |
| WebRTC Phase B | ⏳ SESSION 30 |

---

## Prochaine session

**SESSION 27 — Interaction Engine**  
Créer l'objet `Interaction` comme objet métier central (id, type, initiator, target, payload, status, obd_events, journey_id, flow_id, invariants). Phase 1 : storage local `ic_interactions` + historique unifié + badge unifié.
