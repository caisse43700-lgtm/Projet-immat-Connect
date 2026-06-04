# Amélioration Navigation Fonctionnalités

# PERMISSIONS MATRIX — Qui peut contacter qui, comment, pourquoi

**Date :** 2026-06-04  
**Session :** 24  
**Principe :** Toute interaction répond à 8 questions. Aucune ambiguïté.

---

## 8 questions fondamentales

1. **Qui peut contacter qui ?**
2. **Pourquoi ?**
3. **Par quel canal ?**
4. **Dans quelles conditions ?**
5. **Avec quelles restrictions ?**
6. **Avec quelle traçabilité OBD ?**
7. **Avec quel invariant ?**
8. **Avec quel test ?**

---

## Matrice des canaux par niveau de blocage

| Niveau blocage (A sur B) | Messages de B vers A | Appels de B vers A | Alertes visibles |
|---|---|---|---|
| `BLOCK_NONE` | ✓ | ✓ | ✓ |
| `BLOCK_MESSAGES` | ✗ filtré | ✓ | ✓ |
| `BLOCK_CALLS` | ✓ | ✗ rejeté | ✓ |
| `BLOCK_ALL` | ✗ filtré | ✗ rejeté | ✗ (alertes filtrées localement) |

**Guard messages :** `normalizeRows()` — `getBlockLevel(plate) !== BLOCK_ALL && !== BLOCK_MESSAGES`  
**Guard appels :** `_isCallBlocked(plate)` dans `requestCall()`

---

## Matrice des canaux par niveau de confiance (A sur B)

| Trust Level de A envers B | Messages | Appels (si callLevel le permet) | Alertes |
|---|---|---|---|
| `TRUST_NONE` | ✓ | ✓ si callLevel=4 (TOUS) | ✓ |
| `TRUST_CONTEXTUAL` | ✓ | ✓ si callLevel≥3 (CONTEXTE) | ✓ |
| `TRUST_CONTACT` | ✓ | ✓ si callLevel≥2 (CONFIANCE) | ✓ |
| `TRUST_PERMANENT` | ✓ | ✓ (toujours) | ✓ |

**Note :** Le callLevel contrôle la réception, pas l'émission. A peut contacter B même si A a trust=NONE envers B — c'est B qui décide s'il reçoit via ses préférences.

---

## Matrice des canaux par préférences d'appel (receiver B)

| callLevel de B | Peut recevoir des appels de |
|---|---|
| 1 | Personne |
| 2 | Contacts de confiance (getTrust='TRUSTED') |
| 3 | Confiance + contexte actif (alerte active proche) |
| 4 | Tous les conducteurs |

**Guard :** RPC `can_receive_calls(uid)` — évaluée côté Supabase

---

## Matrice des canaux pour l'Ange

| Action Ange | Condition | Contrainte |
|---|---|---|
| Proposer un contact (message) | `BLOCK_MESSAGES` absent | INV-COM-015 — Ange ≠ contenu messages |
| Proposer un appel | `_isCallBlocked` = false | INV-COM-003 — double consentement |
| Préparer un signalement véhicule | Toujours disponible | P-008 — validation conducteur obligatoire |
| Suggérer un blocage | Jamais — action humaine | INV-COM-018 — confiance = acte explicite |

---

## Cas de conflit (résolution par invariant)

| Conflit | Résolution | Invariant |
|---|---|---|
| BLOCKED + TRUSTED | BLOCKED gagne | INV-COM-014 |
| DND + URGENCY | URGENCY gagne | INV-COM-014 |
| SOS + INVISIBLE | SOS gagne | INV-COM-014 |
| TRUST_NONE + callLevel=4 | Appel autorisé (callLevel décide) | INV-COM-003 |
| BLOCK_CALLS + WebRTC | Bloqué localement avant RPC | INV-COM-019 |

---

## OBD traçabilité complète

| Canal | OBD envoyé | OBD reçu |
|---|---|---|
| Message | MSG_SENT | MSG_RECEIVED |
| Appel Phase A | CALL_INITIATED → CALL_ACCEPTED\|REFUSED\|CANCELLED\|MISSED | CALL_RECEIVED |
| Signalement véhicule | VEHICLE_MESSAGE_SENT | VEHICLE_MESSAGE_RECEIVED |
| Signalement route | ROAD_CREATED | — |
| Aide | HELP_CREATED | HELP_RESPONDED |
| SOS | SOS_TRIGGERED | — |
| Blocage | BLOCK_APPLIED | — |
| Confiance | CONTACT_TRUSTED\|REVOKED\|TRUST_LEVEL_CHANGED | — |
| Abus | ABUSE_REPORTED {category} | — |

---

## Invariants couverts

| Invariant | Canal |
|---|---|
| INV-COM-001 | Tout message appartient à 2 plaques |
| INV-COM-003 | Double consentement appel |
| INV-COM-004 | Blocage interdit toute communication |
| INV-COM-005 | Autorisation contextuelle expire |
| INV-COM-014 | BLOCKED > TRUSTED, URGENCY > DND, SOS > INVISIBLE |
| INV-COM-015 | Ange ≠ accès messages |
| INV-COM-018 | Confiance = acte explicite |
| INV-COM-019 | Blocage = périmètre défini |
| INV-COM-020 | Confiance observable OBD |
| INV-COM-021 | Blocage observable OBD |
| INV-CALL-001 | Un call_request → un seul CALL_MISSED |
