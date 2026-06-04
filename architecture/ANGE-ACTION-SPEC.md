# Amélioration Navigation Fonctionnalités

# ANGE ACTION SPEC — SESSION 26

**Date :** 2026-06-04  
**Prérequis :** Communication Engine 100% · Trust Engine 100% · Block Engine 100% · Permissions Matrix 100%  
**Principe :** Ange propose. Le conducteur valide. L'exécution suit les mêmes règles que le manuel.

---

## Architecture cible

```
Ange
  ↓
checkPermissions(plate)    ← INV-ANGE-004 OBLIGATOIRE
  ↓
prepareInteraction({type, target, context, payload})
  ↓
Prévisualisation conducteur
  ↓
Validation explicite (P-008)
  ↓
execute()
  ↓
OBD observe(intent_event, {_src: 'ange/intent'})
```

---

## prepareInteraction() — méthode unifiée

```javascript
AngeAction.prepareInteraction({
  type:    'MESSAGE'|'CALL'|'VEHICLE_ALERT'|'ROAD_ALERT'|'HELP'|'SOS'|'THANKS'|'TRUST'|'BLOCK',
  target:  plate,          // plaque cible (null si non résolu)
  context: snapshot,       // ImmatOrganism.diagnose() — anonymisé
  payload: {}              // contenu spécifique au type
})
```

### Flux interne

1. `checkPermissions(target)` → `getBlockLevel(target)` + `getTrustLevel(target)` + `can_receive_calls(uid)`
2. Si non autorisé → réponse Ange "Ce conducteur a bloqué les communications"
3. Si autorisé → construire preview selon type
4. Afficher preview + boutons [✅ Confirmer · ✏️ Modifier · ✗ Annuler]
5. Sur confirmation → `execute()`
6. OBD observe

---

## Types d'interaction

| Type | Action JS | Vérification préalable |
|---|---|---|
| `MESSAGE` | `ImmatMessages.sendToPlate(plate, text)` | `getBlockLevel !== MESSAGES\|ALL` |
| `CALL` | `CallManager.contactByCall(plate)` | `_isCallBlocked(plate) === false` + `can_receive_calls()` |
| `VEHICLE_ALERT` | `App.vehicleAlertQuick(label)` | `getBlockLevel !== MESSAGES\|ALL` |
| `ROAD_ALERT` | `App.roadReport(type)` | aucune (alerte publique) |
| `HELP` | `App.assist(type)` | aucune (alerte publique) |
| `SOS` | `App.sos()` | double confirmation humaine obligatoire (D-005) |
| `THANKS` | `ImmatMessages.sendToPlate(plate, '🙏 Merci')` | `getBlockLevel !== MESSAGES\|ALL` |
| `TRUST` | `ImmatMessages.setTrust(plate, 'TRUSTED')` | confirmation conducteur obligatoire |
| `BLOCK` | `App.blockPlate(plate)` | confirmation conducteur obligatoire |

---

## checkPermissions()

```javascript
AngeAction.checkPermissions(plate) {
  const blockLevel   = window.ImmatMessages?.getBlockLevel?.(plate);
  const trustLevel   = window.ImmatMessages?.getTrustLevel?.(plate);
  const canCallRpc   = /* can_receive_calls() via Supabase */ null; // async
  return {
    canMessage: blockLevel !== 'BLOCK_MESSAGES' && blockLevel !== 'BLOCK_ALL',
    canCall:    !window.CallManager?._isCallBlocked?.(plate) && canCallRpc,
    blockLevel,
    trustLevel
  };
}
```

---

## getContext()

```javascript
AngeAction.getContext() {
  return {
    frontVehicle:  window.S?.frontVehicle  || null,  // véhicule devant (plate seulement)
    selPlate:      window.S?.selPlate      || null,  // plaque sélectionnée sur carte
    activePlate:   window.State?.activePlate || null, // conversation Messages active
    activeAlerts:  (window.S?.alerts||[]).filter(a=>a._mine).map(a=>({id:a.id,type:a.type,group:a.group})),
    // myLat/myLng JAMAIS transmis — INV-COM-015 + INV-COM-010
  };
}
```

---

## Invariants applicables

| Invariant | Règle |
|---|---|
| INV-ANGE-003 | Ange = mêmes règles que manuel |
| INV-ANGE-004 | checkPermissions() OBLIGATOIRE avant toute action |
| INV-COM-015 | Ange ≠ accès contenu messages |
| INV-COM-027 | Autorisation via Permissions Matrix uniquement |
| INV-COM-028 | Pas de logique parallèle d'autorisation |
| P-008 | Validation conducteur pour toute action irréversible |
| D-005 | SOS = double confirmation humaine |

---

## État implémentation

| Composant | Statut SESSION 26 |
|---|---|
| `AngeAction.checkPermissions(plate)` | À implémenter |
| `AngeAction.prepareInteraction({type, target, context, payload})` | À implémenter |
| Preview UI dans `angePanel` | À implémenter |
| Confirmation callback | À implémenter |
| OBD `ANGE_QUERIED {intent}` | ✅ Existant |
| `AngeDialog.send()` + Edge Function | ✅ Existant |
| `ImmatOrganism.diagnose()` snapshot | ✅ Existant |
