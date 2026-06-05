# Amélioration Navigation Fonctionnalités

# BLOCK ENGINE — Niveaux de blocage formalisés

**Date :** 2026-06-04  
**Session :** 24  
**Source :** index.html · messages.js · calls.js

---

## Niveaux formels

| Constante | Valeur | Canal bloqué | Alertes |
|---|---|---|---|
| `BLOCK_NONE` | Aucun blocage | — | Visibles |
| `BLOCK_MESSAGES` | Messages uniquement | ✗ Messages | ✓ Appels ✓ Alertes |
| `BLOCK_CALLS` | Appels uniquement | ✗ Appels | ✓ Messages ✓ Alertes |
| `BLOCK_ALL` | Tout — blocage complet | ✗ Messages ✗ Appels | ✗ Alertes filtrées |

---

## Implémentation SESSION 24

### Stockage
```
ic_blocked      = [plate, ...]              (existant — backward compat → BLOCK_ALL)
ic_block_levels = { [plate]: 'BLOCK_MESSAGES'|'BLOCK_CALLS'|'BLOCK_ALL' }   (nouveau)
```

### Fonctions (messages.js)
```javascript
function getBlockLevel(plate)
// → lit ic_block_levels[plate]
// → si absent mais plate dans ic_blocked → BLOCK_ALL (compat)
// → sinon → BLOCK_NONE
```

### API (index.html)
```javascript
App.blockPlate(p, level='BLOCK_ALL')
// → ajoute à ic_blocked (backward compat)
// → stocke level dans ic_block_levels[p]
// → émet BLOCK_APPLIED {plate, level}

App.unblockPlate(p)
// → retire de ic_blocked
// → supprime ic_block_levels[p]
```

### Guards implémentés

| Guard | Fichier | Condition |
|---|---|---|
| Messages filtrés | `messages.js normalizeRows()` | `getBlockLevel(plate) === BLOCK_MESSAGES\|ALL` |
| Appels bloqués | `calls.js _isCallBlocked()` | `ic_block_levels[plate] === BLOCK_CALLS\|ALL` ou `ic_blocked` |

---

## Tests BLOCK-001 à BLOCK-004

| Test | Scénario | Guard vérifié |
|---|---|---|
| BLOCK-001 | A bloque B → B ne peut plus envoyer de message | `normalizeRows` filtre BLOCK_MESSAGES\|ALL |
| BLOCK-002 | A bloque B → B ne peut plus appeler | `_isCallBlocked()` retourne true |
| BLOCK-003 | A bloque B avec BLOCK_CALLS → messages toujours visibles | `normalizeRows` passe BLOCK_CALLS |
| BLOCK-004 | unblockPlate → level supprimé → communications rétablies | `getBlockLevel` retourne BLOCK_NONE |

---

## OBD Events associés

| Event | Déclencheur | Payload |
|---|---|---|
| `BLOCK_APPLIED` | `blockPlate(p, level)` | `{plate, level}` |

---

## Invariants

- **INV-COM-019** : Un blocage possède toujours un périmètre défini
- **INV-COM-021** : Toute décision de blocage est observable dans l'OBD
- **INV-COM-004** : Un blocage interdit toute communication (BLOCK_ALL)
- **INV-COM-014** : BLOCKED > TRUSTED

---

## UI (Phase future)

Le niveau de blocage est actuellement toujours BLOCK_ALL (confirm dialog existant).  
Une interface de sélection du niveau (BLOCK_MESSAGES / BLOCK_CALLS / BLOCK_ALL) sera ajoutée dans une session dédiée UX.
