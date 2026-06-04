# Amélioration Navigation Fonctionnalités

# UX-TRUST — Système de confiance et de blocage

**Date :** 2026-06-04  
**Source :** messages.js · index.html · knowledge/communication-invariants.json  
**Principe fondateur :** D-004 — La confiance évalue les INTERACTIONS, pas les PERSONNES.

---

## 1. Confiance locale (ic_trust)

### Stockage
```
localStorage.ic_trust = JSON { [normalized_plate]: 'TRUSTED' | 'NONE' }
```

### Fonctions (messages.js)
| Fonction | Rôle |
|---|---|
| `getTrust(plate)` | Lit ic_trust → 'TRUSTED' ou 'NONE' |
| `setTrust(plate, level)` | Écrit ic_trust + OBD event |
| `ImmatMessages._sheetAction('trust')` | Toggle TRUSTED ↔ NONE via bottom sheet |

### UI
- Bottom sheet thread → "✓ Marquer de confiance" / "✓ Révoquer confiance"
- Label dynamique selon état actuel
- Settings → niveaux d'appel : 🔇 Personne · 🤝 Confiance · 📍 Contexte · 🌐 Tous

### OBD Events
- `CONTACT_TRUSTED {plate}` — quand setTrust → 'TRUSTED'
- `CONTACT_REVOKED {plate}` — quand setTrust → 'NONE'

### Effets
- Niveau appel ≥ 2 (`callLevel = 2`) → reçoit les appels des contacts TRUSTED
- Filtre Activité : messages de plaques TRUSTED prioritaires visuellement

### Invariants
- D-004 : pas de score public, pas de réputation personnelle
- INV-COM-014 : BLOCKED > TRUSTED (la priorité est toujours côté sécurité)

---

## 2. Score fiabilité persistant (AppReliabilityPro)

### Stockage
- DB : colonne `reliability_score` + `reliability_level` dans `profiles`
- Accessible via `AppReliabilityPro.getScore(uid)`

### Calcul local (trustDelta)
| Action | Delta |
|---|---|
| Signalement confirmé "Toujours là" | +8 |
| Signalement confirmé "Résolu" | +3 |
| Signalement contesté / faux | -12 |
| Rapport conducteur de confiance | +3 |

### Niveaux
| Niveau | Label |
|---|---|
| 0-30 | Débutant |
| 31-60 | Conducteur |
| 61-85 | Régulier |
| 86+ | Expert |

### Règle UX
- P2-003 (Score fiabilité visible dans profil) = 🔲 futur — cohérent avec D-004
- Aucun score public — score personnel uniquement, non partagé

---

## 3. Blocage (ic_blocked + ic_block_levels)

### Stockage
```
localStorage.ic_blocked      = JSON Array [normalized_plate, ...]   (backward compat → BLOCK_ALL)
localStorage.ic_block_levels = JSON { [plate]: 'BLOCK_MESSAGES'|'BLOCK_CALLS'|'BLOCK_ALL' }
```

### Niveaux (SESSION 24)
| Niveau | Messages | Appels | Alertes |
|---|---|---|---|
| `BLOCK_NONE` | ✓ | ✓ | ✓ |
| `BLOCK_MESSAGES` | ✗ | ✓ | ✓ |
| `BLOCK_CALLS` | ✓ | ✗ | ✓ |
| `BLOCK_ALL` | ✗ | ✗ | ✗ |

### Fonctions
| Fonction | Rôle |
|---|---|
| `App.blockPlate(plate, level='BLOCK_ALL')` | Ajoute à ic_blocked + ic_block_levels |
| `App.unblockPlate(plate)` | Retire de ic_blocked + supprime ic_block_levels[plate] |
| `ImmatMessages.getBlockLevel(plate)` | Retourne le niveau de blocage actuel |

### Guards
- `messages.js normalizeRows()` → filtre `BLOCK_MESSAGES` et `BLOCK_ALL`
- `calls.js _isCallBlocked()` → rejette `BLOCK_CALLS` et `BLOCK_ALL` avant RPC

### UI
- Carte → contextMenu → "Bloquer" (BLOCK_ALL par défaut)
- Settings → "🚫 Bloqués" → liste + débloquer
- Messages → bottom sheet → (sélection niveau : phase future)

### Effets
- BLOCK_ALL : Messages filtrés, appels rejetés avant RPC
- BLOCK_MESSAGES : appels et alertes toujours visibles
- BLOCK_CALLS : messages et alertes toujours visibles

### OBD
- `BLOCK_APPLIED {plate, level}` — émis à chaque blockPlate()

### Invariants
- INV-COM-004 : Un blocage interdit toute communication
- INV-COM-014 : BLOCKED > TRUSTED (le blocage prime toujours)
- INV-COM-019 : Un blocage possède toujours un périmètre défini
- INV-COM-021 : Toute décision de blocage est observable dans l'OBD
- B n'est jamais informé du blocage (privé pour A par conception)

### Décision ouverte DA-004
Migrer ic_blocked vers DB pour persistance cross-device.  
Option A : DB → persistant + cross-device  
Option B : localStorage → plus rapide, plus privé

---

## 4. Autorisations appels (callLevel)

### Stockage
```
localStorage.ic_call_level = 1 | 2 | 3 | 4
DB : call_preferences { user_id, allow_calls }
```

### Niveaux
| Level | Label | Reçoit les appels de |
|---|---|---|
| 1 | 🔇 Personne | Aucun |
| 2 | 🤝 Confiance | Contacts TRUSTED uniquement |
| 3 | 📍 Contexte | Conducteurs avec interaction active |
| 4 | 🌐 Tous | Tous conducteurs |

### UI
- Settings → 4 boutons niveau
- Toggle `allowCallsToggle` → `CallManager.setCallPreferences(checked)`

### Vérification
- `RPC can_receive_calls(target_uid)` — vérifié AVANT tout INSERT call_requests
- RLS : call_preferences accessible au propriétaire seulement

### Règle
- D-002 : CallManager = seul gestionnaire des appels, jamais en direct

---

## 5. Priorités et conflits

```
BLOCKED > TRUSTED > CONTEXTE > TOUT > PERSONNE
```

- Si BLOCKED : aucune action possible (messages filtrés, appels bloqués, disparition carte)
- Si TRUSTED + DND actif : DND s'applique (INV-COM-014 — URGENCY > DND pour SOS)
- Si TRUSTED + callLevel=1 : pas d'appels (callLevel prime sur trust)

---

## 6. Décisions ouvertes

| DA | Question | Impact |
|---|---|---|
| DA-004 | Migrer ic_blocked vers DB | Persistance cross-device |
| DA-005 | Unifier ic_trust + ReliabilityPro DB | Cohérence données |

---

## 7. Trust Engine formel (SESSION 24)

Voir `architecture/TRUST-ENGINE.md` pour la spécification complète des 4 niveaux.

```javascript
TRUST_LEVELS = { NONE, CONTEXTUAL, CONTACT, PERMANENT }
BLOCK_LEVELS = { NONE, MESSAGES, CALLS, ALL }
```

Fonctions disponibles via `window.ImmatMessages` :
- `getBlockLevel(plate)` → BLOCK_NONE | BLOCK_MESSAGES | BLOCK_CALLS | BLOCK_ALL
- `getTrustLevel(plate)` → TRUST_NONE | TRUST_CONTACT
- `TRUST_LEVELS` · `BLOCK_LEVELS` (constantes exportées)

---

## 8. Ce qui n'existe pas (par choix)

- Pas de score public visible par les autres (D-004 / DR-001 rejeté)
- Pas de réputation personnelle partagée
- Pas de "listes noires communautaires"
- Pas de badge de confiance visible sur les marqueurs carte
