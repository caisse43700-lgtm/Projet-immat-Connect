# Amélioration Navigation Fonctionnalités

# TRUST ENGINE — Niveaux de confiance formalisés

**Date :** 2026-06-04  
**Session :** 24  
**Source :** messages.js · index.html · knowledge/communication-invariants.json

---

## Niveaux formels

| Constante | Valeur | Déclencheur | Durée |
|---|---|---|---|
| `TRUST_NONE` | Aucune relation | Par défaut | Permanente |
| `TRUST_CONTEXTUAL` | Relation temporaire (signalement, aide, SOS actif) | Automatique via alerte active | Jusqu'à résolution alerte |
| `TRUST_CONTACT` | Confiance explicite accordée | `setTrust(plate, 'TRUSTED')` | Permanente jusqu'à révocation |
| `TRUST_PERMANENT` | Confiance maximale — conducteur de confiance permanent | `setTrust(plate, 'PERMANENT')` (Phase future) | Permanente |

---

## Implémentation Phase 1 (SESSION 24)

### Constantes
```javascript
const TRUST_LEVELS = {
  NONE:'TRUST_NONE',
  CONTEXTUAL:'TRUST_CONTEXTUAL',
  CONTACT:'TRUST_CONTACT',
  PERMANENT:'TRUST_PERMANENT'
};
```

### Stockage
```
ic_trust = { [plate]: 'TRUSTED'|'NONE' }         (existant)
ic_call_perm = '1'|'2'|'3'|'4'                    (existant — niveau réception)
```

### Fonctions
| Fonction | Rôle |
|---|---|
| `getTrustLevel(plate)` | → `TRUST_CONTACT` si 'TRUSTED', sinon `TRUST_NONE` |
| `getTrust(plate)` | Accès bas niveau → 'TRUSTED'|'NONE' |
| `setTrust(plate, level)` | Écrit ic_trust + OBD CONTACT_TRUSTED / CONTACT_REVOKED |
| `setCallLevel(level)` | Modifie le niveau de réception 1-4 + OBD TRUST_LEVEL_CHANGED {oldLevel, newLevel} |

---

## Mapping Trust ↔ CallLevel

| Trust Level | callLevel min pour recevoir des appels |
|---|---|
| TRUST_NONE | 4 (tout le monde) |
| TRUST_CONTEXTUAL | 3 (confiance + contexte actif) |
| TRUST_CONTACT | 2 (contacts de confiance) |
| TRUST_PERMANENT | 1 (par défaut auto-accepté) |

---

## OBD Events associés

| Event | Déclencheur | Payload |
|---|---|---|
| `CONTACT_TRUSTED` | `setTrust(plate, 'TRUSTED')` | `{plate}` |
| `CONTACT_REVOKED` | `setTrust(plate, 'NONE')` | `{plate}` |
| `TRUST_LEVEL_CHANGED` | `setCallLevel(level)` | `{oldLevel, newLevel}` |

---

## Invariants

- **INV-COM-018** : La confiance est toujours un acte explicite conducteur
- **INV-COM-020** : Toute décision de confiance est observable dans l'OBD
- **INV-COM-014** : BLOCKED > TRUSTED (priorité sécurité)

---

## Ce qui reste à implémenter (Phase future)

| Fonctionnalité | Session |
|---|---|
| `TRUST_CONTEXTUAL` auto-detection via alertes actives | SESSION 26 (Ange Actif) |
| `TRUST_PERMANENT` niveau distinct de CONTACT | SESSION 27 |
| Score fiabilité conducteur (AppReliabilityPro) → trust automatique | Phase DB |
| Trust partagé (A marque B de confiance → B notifié) | Phase DB |
