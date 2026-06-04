# Amélioration Navigation Fonctionnalités

# OBD-003 — Interaction Engine : Règles et invariants

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Principe :** Toute nouvelle fonctionnalité doit être visible par l'OBD.

---

## Nouvelle chaîne obligatoire

```
Feature
  ↓
Intention (WHY-001 à WHY-004)
  ↓
Flow (FLOW-xxx dans UX-JOURNEYS.md)
  ↓
Interaction (INT-xxx dans UX-INTERACTIONS.md)
  ↓
Observation OBD (window.ImmatOrganism?.observe?)
  ↓
Invariant (INV-COM-xxx dans knowledge/)
  ↓
Test (tests/organism/)
  ↓
Dashboard Gardien (visible dans angePanel / gardienDashboard)
```

---

## Règles NO_ORPHAN (nouvelles)

### NO_ORPHAN_INTERACTION
Toute interaction utilisateur (bouton, swipe, tap) doit appartenir à un INT-xxx documenté dans UX-INTERACTIONS.md.  
Détecteur : `scripts/detect-orphan-features.js` — patterns `onclick=` sans INT référencé.

**Violation** : bouton avec onclick qui n'est associé à aucun INT → HIGH finding.

### NO_ORPHAN_OBSERVATION
Tout `window.ImmatOrganism?.observe?.(event, ...)` doit :
1. Être dans `knownObserveEvents` du détecteur
2. Avoir un invariant ou un test qui le valide

**Violation** : event non déclaré dans whitelist → HIGH finding (déjà enforced).

### NO_ORPHAN_FLOW
Tout flux A↔B (JRN-xxx) doit avoir :
1. Un point d'entrée UI documenté (bouton dans UX-BUTTONS.md)
2. Un point de fin de cycle documenté
3. Au moins 1 OBD event émis

**Violation** : flux sans OBD event = flux invisible pour l'Ange et le Gardien.

### NO_ORPHAN_TEST
Toute nouvelle feature ajoutée après OBD-003 doit avoir un test dans `tests/organism/`.  
Chaîne minimale : 1 feature → 1 test assertion vérifiable sans navigateur.

---

## Inventaire OBD events actuels (vérifiés dans le code)

### Carte / GPS
| Event | Source | Invariant |
|---|---|---|
| `MAP_SELF_LOCATED` | index.html / locate() | INV-COM-010 |
| `GPS_STARTED` | index.html / openGps() | — |

### Signalements
| Event | Source | Invariant |
|---|---|---|
| `ROAD_CREATED` | index.html / roadReport() | INV-COM-011 |
| `HELP_CREATED` | index.html / assist() | INV-COM-005 |
| `VEHICLE_MESSAGE_SENT` | index.html / driverInfo() | INV-COM-001 |
| `SOS_TRIGGERED` | index.html / sos() | INV-COM-009 |
| `PROXIMITY_SIGNAL_SENT` | index.html | INV-COM-011 |
| `PROXIMITY_SIGNAL_RECEIVED` | index.html | INV-COM-011 |

### Messages
| Event | Source | Invariant |
|---|---|---|
| `MSG_SENT` | messages.js / sendToPlate | INV-COM-001 |
| `MSG_RECEIVED` | messages.js / subscribe | INV-COM-001 |
| `CONV_FAVORITED` | messages.js | INV-COM-006 |
| `CONV_ARCHIVED` | messages.js | INV-COM-006 |
| `CONV_DELETED` | messages.js / deleteThread | INV-COM-009 |
| `CONV_SEARCHED` | messages.js | INV-COM-006 |
| `CONV_OPENED` | messages.js | INV-COM-006 |
| `CONV_CLOSED` | messages.js | INV-COM-006 |
| `CONTACT_TRUSTED` | messages.js / setTrust | INV-COM-014 |
| `CONTACT_REVOKED` | messages.js / setTrust | INV-COM-014 |
| `PRESENCE_CHANGED` | messages.js / setPresence | INV-COM-010 |

### Appels
| Event | Source | Invariant |
|---|---|---|
| `CALL_INITIATED` | calls.js / requestCall | INV-COM-003 |
| `CALL_RECEIVED` | calls.js / subscribeIncomingCalls | INV-COM-003 |
| `CALL_ACCEPTED` | calls.js / acceptCall | INV-COM-003 |
| `CALL_REFUSED` | calls.js / refuseCall | INV-COM-003 |
| `CALL_CANCELLED` | calls.js / cancelCallRequest | INV-COM-003 |

### Aide
| Event | Source | Invariant |
|---|---|---|
| `HELP_RESPONDED` | index.html / actQuickReply | INV-COM-005 |

### Profil / Système
| Event | Source | Invariant |
|---|---|---|
| `PROFILE_SAVED` | index.html / saveProfile | — |
| `BADGE_RECOMPUTED` | badge.js | — |
| `ANGE_QUERIED` | index.html / AngeDialog | INV-COM-015 |

### Self-tests
| Event | Source | Invariant |
|---|---|---|
| `COMMUNICATION_SELFTEST_PASS` | tests/ | INV-COM-006 |
| `COMMUNICATION_SELFTEST_FAIL` | tests/ | INV-COM-006 |

---

## Events manquants identifiés (GAPs OBD)

| Event manquant | Déclencheur attendu | Priorité |
|---|---|---|
| `CALL_MISSED` | call_request expire sans réponse | P2 |
| `CALL_ENDED` | Fin de session voix (WebRTC Phase B) | P3 |
| `ABUSE_REPORTED` | Signalement abus sur message | P2 |
| `VEHICLE_MESSAGE_RECEIVED` | Alerte véhicule reçue par B | P2 |
| `BLOCK_APPLIED` | App.blockPlate() | P2 |
| `TRUST_LEVEL_CHANGED` | setCallLevel() | P2 |

---

## Invariants communication actuels (knowledge/communication-invariants.json)

| ID | Nom | Règle clé |
|---|---|---|
| INV-COM-001 | Conversation = 2 plaques | Toute interaction = échange entre 2 identités véhicule |
| INV-COM-002 | Pas de blocage sans relation | Blocage ne peut s'appliquer qu'après interaction |
| INV-COM-003 | Double consentement appel | A demande + B accepte — jamais automatique |
| INV-COM-004 | Blocage bilatéral effectif | Blocage bloque dans les 2 sens |
| INV-COM-005 | Autorisation contextuelle expire | Autorisation d'aide expire avec l'alerte |
| INV-COM-006 | Aucune feature orpheline | Toute feature déclarée, testée, observée |
| INV-COM-007 | Toutes features déclarées | Inventaire complet obligatoire |
| INV-COM-008 | Observations OBD obligatoires | Toute interaction observable |
| INV-COM-009 | Soft-delete uniquement | Jamais DELETE sur messages reçus |
| INV-COM-010 | Présence ≠ Géolocalisation | Présence sur carte ≠ coordonnées GPS brutes |
| INV-COM-011 | Interaction observable | Toute interaction → OBD event |
| INV-COM-012 | Interactions documentées | interactions.json requis |
| INV-COM-013 | Phase B/C validées par Gardien | Nouvelles phases nécessitent validation |
| INV-COM-014 | Priorités : BLOCKED > TRUSTED, URGENCY > DND | Règles de conflit |
| INV-COM-015 | Ange ≠ accès messages | Snapshot anonymisé, jamais contenu individuel |

---

## Nouveaux invariants à ajouter (proposés)

| ID | Nom | Règle |
|---|---|---|
| INV-COM-016 | NO_ORPHAN_INTERACTION | Tout bouton appartient à un INT-xxx documenté |
| INV-COM-017 | NO_ORPHAN_FLOW | Tout flux A↔B émet au moins 1 OBD event |
| INV-COM-018 | CALL_MISSED observé | Toute expiration call_request émet CALL_MISSED |
| INV-COM-019 | WEBRTC_CONSENT | Session voix WebRTC = consentement mutuel explicite avant ouverture canal audio |
