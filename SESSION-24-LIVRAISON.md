# Amélioration Navigation Fonctionnalités

# SESSION 24 — Trust Engine + Block Engine + Permissions Matrix

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Commit :** (voir git log)  
**Objectif :** Chaque interaction répond à 8 questions. Aucune ambiguïté. Aucune interaction orpheline.

---

## Vérifications complémentaires SESSION 23 (VC-001 à VC-004)

### VC-001 — CALL_MISSED unique (INV-CALL-001)

**Implémenté dans `calls.js`** — `_missedCallIds` Set :
```javascript
const _missedCallIds = new Set();
// Dans TTL timeout :
if(!_missedCallIds.has(req.id)){
  _missedCallIds.add(req.id);
  ImmatOrganism.observe('CALL_MISSED', {...});
}
```
Un call_request → 1 seul CALL_MISSED garanti.

### VC-002 — ABUSE_REPORTED avec catégorie

**6 catégories implémentées :**

| Catégorie | Label | Bouton HTML |
|---|---|---|
| `ABUSE_SPAM` | Spam | `icAbuseCategories > button` |
| `ABUSE_HARASSMENT` | Harcèlement | idem |
| `ABUSE_INSULT` | Insulte | idem |
| `ABUSE_FALSE_ALERT` | Fausse alerte | idem |
| `ABUSE_CALL_MISUSE` | Abus d'appel | idem |
| `ABUSE_OTHER` | Autre | idem |

**Flux UX :**
1. Bottom sheet → "🚨 Signaler un abus ▾" → affiche `icAbuseCategories`
2. Tap catégorie → confirm → `ABUSE_REPORTED {plate, category, label}` → fermeture
3. `openThreadMenu()` reset `icAbuseCategories` à hidden à chaque ouverture

**Payload enrichi :** `{plate, category:'ABUSE_SPAM', label:'Spam', _src}`

### VC-003 — TRUST_LEVEL_CHANGED payload enrichi

```javascript
// Avant :
{ level: 4 }
// Après :
{ oldLevel: 2, newLevel: 4, _src:'...' }
```

`oldLevel` lu depuis `localStorage.getItem('ic_call_perm')` AVANT la modification.

### VC-004 — Tests BLOCK-001 à BLOCK-004

**Fichier :** `tests/organism/block-engine.test.js`  
**Résultat :** 17/17 ✔

---

## Trust Engine

### Constantes formalisées
```javascript
const TRUST_LEVELS = { NONE:'TRUST_NONE', CONTEXTUAL:'TRUST_CONTEXTUAL', CONTACT:'TRUST_CONTACT', PERMANENT:'TRUST_PERMANENT' };
```

### Fonctions ajoutées à `messages.js`
| Fonction | Rôle |
|---|---|
| `getTrustLevel(plate)` | Retourne TRUST_CONTACT si TRUSTED, sinon TRUST_NONE |
| `TRUST_LEVELS` | Constantes exportées via `window.ImmatMessages` |

---

## Block Engine

### Niveaux formels (4 niveaux)

| Niveau | Messages | Appels | Alertes |
|---|---|---|---|
| `BLOCK_NONE` | ✓ | ✓ | ✓ |
| `BLOCK_MESSAGES` | ✗ | ✓ | ✓ |
| `BLOCK_CALLS` | ✓ | ✗ | ✓ |
| `BLOCK_ALL` | ✗ | ✗ | ✗ |

### Stockage
```
ic_blocked       = [plate, ...]              (compat — BLOCK_ALL)
ic_block_levels  = { [plate]: level }        (NOUVEAU)
```

### Guards implémentés
- `messages.js normalizeRows()` — filtre BLOCK_MESSAGES et BLOCK_ALL
- `calls.js _isCallBlocked()` — rejette BLOCK_CALLS et BLOCK_ALL avant RPC

### API
```javascript
App.blockPlate(p, level='BLOCK_ALL')    → stocke dans ic_blocked + ic_block_levels
App.unblockPlate(p)                     → nettoie ic_blocked + ic_block_levels
ImmatMessages.getBlockLevel(plate)      → BLOCK_NONE|MESSAGES|CALLS|ALL
```

---

## Permissions Matrix

**Fichier :** `architecture/PERMISSIONS-MATRIX.md`

8 questions pour chaque interaction :
1. Qui peut contacter qui ?
2. Pourquoi ?
3. Par quel canal ?
4. Dans quelles conditions ?
5. Avec quelles restrictions ?
6. Avec quelle traçabilité OBD ?
7. Avec quel invariant ?
8. Avec quel test ?

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `calls.js` | +`_missedCallIds`, +`_isCallBlocked()`, guard `requestCall()` |
| `messages.js` | +`getBlockLevel`, +`getTrustLevel`, +`BLOCK_LEVELS`, +`TRUST_LEVELS`, +`_reportAbuse()`, normalizeRows guard, oldLevel TRUST_LEVEL_CHANGED |
| `index.html` | +`icAbuseCategories` div, `blockPlate(p, level)`, `unblockPlate` cleanup |
| `knowledge/communication-invariants.json` | +INV-COM-018, 019, 020, 021, INV-CALL-001 |
| `knowledge/immat-knowledge-graph.json` | +6 invariants indexés |
| `scripts/detect-orphan-features.js` | +`block_levels`, `trusted` localStorage |
| `architecture/TRUST-ENGINE.md` | NOUVEAU |
| `architecture/BLOCK-ENGINE.md` | NOUVEAU |
| `architecture/PERMISSIONS-MATRIX.md` | NOUVEAU |
| `architecture/ux/UX-TRUST.md` | Mis à jour — niveaux formels + session 24 |
| `tests/organism/block-engine.test.js` | NOUVEAU — 17/17 ✔ |
| `tests/organism/trust-engine.test.js` | NOUVEAU — 17/17 ✔ |

---

## Nouveaux invariants

| Invariant | Règle |
|---|---|
| INV-COM-018 | Confiance = acte explicite conducteur (setCallLevel uniquement) |
| INV-COM-019 | Blocage = périmètre défini (BLOCK_MESSAGES\|CALLS\|ALL) |
| INV-COM-020 | Toute décision de confiance observable OBD |
| INV-COM-021 | Toute décision de blocage observable OBD |
| INV-CALL-001 | Un call_request → un seul CALL_MISSED |

---

## État du système après SESSION 24

| Organe | Complétion |
|---|---|
| MESSAGES | 100% |
| CALL PHASE A | 98% (CALL_MISSED unique ✓) |
| TRUST ENGINE | 90% (TRUST_CONTEXTUAL + TRUST_PERMANENT : Phase future) |
| BLOCK ENGINE | 95% (UI sélection niveau : Phase future) |
| OBD | 100% |
| PERMISSIONS MATRIX | 100% documentée |
| KNOWLEDGE GRAPH | 95% |
| ANGE | 60% |
| WEBRTC | 0% |

---

## Prochaines sessions

| Session | Action | Priorité |
|---|---|---|
| SESSION 25 | Tests E2E appels complets | P2 |
| SESSION 26 | AngeAction API implementation | P2 |
| SESSION 27 | Interaction Engine objet central | P2 |
| SESSION 28 | Guardian Intelligence Loop | P2 |
| SESSION 29 | Knowledge Graph V2 | P2 |
| SESSION 30 | WebRTC Phase B | P3 |
