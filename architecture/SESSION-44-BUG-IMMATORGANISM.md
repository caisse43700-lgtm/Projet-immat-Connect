# Amélioration Navigation Fonctionnalités

# SESSION 44 — Bug Dashboard Gardien : ImmatOrganism non initialisé
**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR` (commit `704bee2`)  
**Symptôme :** Dashboard Gardien → "Dégradé ⚠️ ImmatOrganism non initialisé." en production  
**Fichier corrigé :** `core/immatOrganism.js`  

---

## Diagnostic

### 8 questions posées

| Question | Réponse |
|---|---|
| 1. immatOrganism.js est-il chargé ? | ✅ Oui — présent dans `<script>` index.html |
| 2. ImmatOrganism existe dans window ? | ❌ **NON — c'est le bug principal** |
| 3. Fonction init() appelée au démarrage ? | ❌ Non — via `window.ImmatOrganism?.init?.()` qui était no-op |
| 4. Appelée seulement après login ? | ✅ Oui — dans `openMap()` |
| 5. Erreur silencieuse console ? | ✅ Oui — try/catch dans `openMap()` masque l'erreur |
| 6. Dashboard lit le bon état ? | ❌ Non — lit le fallback `{health:'inconnu'}` |
| 7. Service worker vieille version ? | ✅ Non — pas en cause |
| 8. Faux état dégradé ? | ✅ Partiellement — deux couches de faux négatif |

---

## Cause exacte

### Bug 1 — Principal : `const` ne crée pas `window.ImmatOrganism`

En JavaScript navigateur (scripts classiques, non-module) :
- `var X = ...` → `window.X` ✓
- `const X = ...` → variable de scope global accessible entre scripts, mais **jamais sur `window`**

```javascript
// core/immatOrganism.js AVANT
const ImmatOrganism = (function () { ... })();
// → window.ImmatOrganism === undefined
```

Conséquence en cascade :
```javascript
// openMap() — index.html ligne 535
try{ window.ImmatOrganism?.init?.() }catch(e){}
// → window.ImmatOrganism = undefined → ?.init?.() = undefined → no-op silencieux

// openGardienDashboard() — index.html ligne 542
const d = window.ImmatOrganism?.diagnose?.()
       || {health:'inconnu', summary:'ImmatOrganism non initialisé.', violations:[], events:[]};
// → window.ImmatOrganism = undefined → undefined || fallback → fallback utilisé
// → d.health = 'inconnu' → hLbl = 'Dégradé ⚠️'
// → d.summary = 'ImmatOrganism non initialisé.'
```

### Bug 2 — Secondaire : `journal.length === 0` → health 'degraded'

Même après correction du Bug 1, le dashboard aurait encore affiché "Dégradé" car :

```javascript
// diagnose() AVANT — ligne 101
const health = critical.length > 0 ? 'violated'
             : (recent.length > 0 || journal.length === 0) ? 'degraded'
             : 'ok';
```

Juste après `init()`, `_log()` écrit en `console.info` (pas dans le bus). Le journal du bus est vide → `journal.length === 0` → `'degraded'`.

Un journal vide signifie : aucun problème signalé = **système sain**, pas dégradé.

---

## Correction (2 lignes)

### Fix 1 — Export vers window

```javascript
// core/immatOrganism.js — ajouté AVANT module.exports
if (typeof window !== 'undefined') window.ImmatOrganism = ImmatOrganism;
if (typeof module !== 'undefined') module.exports = { ImmatOrganism };
```

### Fix 2 — Condition health

```javascript
// AVANT
const health = critical.length > 0 ? 'violated'
             : (recent.length > 0 || journal.length === 0) ? 'degraded'
             : 'ok';

// APRÈS
const health = critical.length > 0 ? 'violated'
             : recent.length > 0 ? 'degraded'
             : 'ok';
```

---

## Vérification après correction

```javascript
// Simulation navigateur (node.js)
window.ImmatOrganism.init();
const d = window.ImmatOrganism.diagnose();
// → initialized: true
// → health: 'ok'
// → summary: 'Système sain. 0 événement(s) en mémoire.'
```

Dashboard gardien affiche maintenant : **Sain ✅**

---

## Tests

```
Tests unitaires : 162 ✅ pass  |  0 ❌ fail
Smoke Playwright : 12/12 PASS (Desktop Chrome)
```

---

## Impact utilisateur

| Avant | Après |
|---|---|
| Dashboard : "Dégradé ⚠️ ImmatOrganism non initialisé." | Dashboard : "Sain ✅ Système sain." |
| `observe()` jamais appelé → journal bus toujours vide | `init()` effectif → `observe()` actif → bus peuplé |
| Violations non trackées | Violations trackées si elles surviennent |

**Aucun impact sur les fonctionnalités utilisateur** — signalements, messages, GPS, alertes fonctionnaient déjà (ils utilisaient `window.ImmatOrganism?.observe?.()` qui était un no-op silencieux).

---

## Test à faire en production

Après déploiement Pages :
1. Se connecter avec compte Gardien
2. Settings → 🔍 Dashboard
3. Vérifier : **Sain ✅** (non plus "Dégradé ⚠️")
4. Faire un signalement → "Actualiser" le dashboard → événement visible dans la liste
