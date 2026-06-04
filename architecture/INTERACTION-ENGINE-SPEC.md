# Amélioration Navigation Fonctionnalités

# INTERACTION ENGINE SPEC — SESSION 27

**Date :** 2026-06-04  
**Principe :** L'Interaction est l'objet métier central. Messages, Appels, Signalements, Aide, Confiance, Blocage sont des formes d'interactions.

---

## Vision

```
Conducteur A                          Conducteur B
      ↓                                      ↓
  intention                            réception
      ↓                                      ↓
  Interaction {                        Interaction {
    id,                                  id,
    type,                                type,
    initiator: plateA,                   initiator: plateA,
    target: plateB,                      target: plateB,
    timestamp,                           timestamp,
    payload,                             payload,
    status,                              status,
    obd_events[],                        obd_events[],
    journey_id,                          journey_id,
    flow_id,                             flow_id,
    invariants[]                         invariants[]
  }                                    }
```

---

## Objet Interaction

```javascript
{
  id:           string,       // UUID
  type:         'MESSAGE'|'CALL'|'VEHICLE_ALERT'|'ROAD_ALERT'|'HELP'|'SOS'|'TRUST'|'BLOCK',
  initiator:    plate,        // plaque émetteur
  target:       plate|null,   // plaque destinataire (null = public)
  timestamp:    ISO8601,
  payload:      object,       // contenu spécifique au type
  status:       'pending'|'accepted'|'refused'|'expired'|'resolved',
  obd_events:   string[],     // events OBD émis pour cette interaction
  journey_id:   'JRN-xxx',
  flow_id:      'FLOW-xxx',
  invariants:   string[]      // INV-COM-xxx, INV-ANGE-xxx
}
```

---

## Avantages de l'Interaction Engine

| Avant | Après |
|---|---|
| Messages dans `messages.js` | Interaction de type MESSAGE dans InteractionEngine |
| Appels dans `calls.js` | Interaction de type CALL |
| Signalements dans `index.html` | Interaction de type VEHICLE_ALERT / ROAD_ALERT |
| OBD dispersé dans 3 fichiers | OBD centralisé dans InteractionEngine |
| Knowledge Graph manuel | Knowledge Graph alimenté automatiquement |
| Ange accède à plusieurs APIs | Ange parle à InteractionEngine uniquement |

---

## Historique unifié

```javascript
InteractionEngine.getHistory(plate) → Interaction[]
// → tous les types pour cette plaque
// → triés par timestamp DESC
// → filtrés par permissions (getBlockLevel)
```

---

## Notifications unifiées

```javascript
InteractionEngine.notifyPending() → number
// → compte toutes les interactions en attente (messages, appels manqués, aide)
// → alimente un seul badge
```

---

## OBD simplifié

```javascript
InteractionEngine.observe(interaction)
// → déduit automatiquement l'event OBD à partir du type
// → vérifie flow_id + invariants avant d'émettre
// → conforme INV-OBD-001
```

---

## Phases d'implémentation

| Phase | Contenu | Session |
|---|---|---|
| Phase 1 | Objet Interaction + storage local `ic_interactions` | SESSION 27 |
| Phase 2 | Historique unifié + Badge unifié | SESSION 27 |
| Phase 3 | Ange → InteractionEngine (remplacement APIs multiples) | SESSION 28 |
| Phase 4 | Guardian Loop → InteractionEngine | SESSION 28 |
| Phase 5 | WebRTC → InteractionEngine (CALL Phase B) | SESSION 30 |

---

## Contraintes

- Backward compatible avec `messages.js` / `calls.js` / `index.html` (Phase 1)
- INV-COM-001 : toute Interaction appartient à 2 plaques (ou 1 + public)
- INV-COM-027 : les permissions restent dans Permissions Matrix
- INV-OBD-001 : chaque Interaction émet au moins 1 OBD event avec invariant + flow
