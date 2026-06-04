# Amélioration Navigation Fonctionnalités

# SESSION 45 — Audit liens manquants : conséquences, dette, oublis
**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Objet :** Audit transversal complet — exports `window`, cache, service worker, dead code, dette architecturale

---

## Résultat global

**4 corrections appliquées · 1 dette architecturale documentée · 0 régression**

---

## Corrections appliquées

### Fix 1 — `brain.js` : export `window.ImmatBrain` manquant

**Symptôme :** `openGardienDashboard()` lit `window.ImmatBrain?.getPhase?.() ?? 1` → toujours `1` car `window.ImmatBrain` était `undefined`.

```javascript
// AVANT
if (typeof module !== 'undefined') module.exports = { ImmatBrain };

// APRÈS
if (typeof window !== 'undefined') window.ImmatBrain = ImmatBrain;
if (typeof module !== 'undefined') module.exports = { ImmatBrain };
```

**Impact :** Le dashboard Gardien affiche maintenant la vraie phase du cerveau (Phase 1 → prochain affichage correct si phase change).

---

### Fix 2 — `openGardienDashboard()` : appel `init()` en tête

**Symptôme :** Si le Gardien ouvrait le dashboard sans avoir d'abord ouvert la carte (`openMap()` non appelé), `ImmatOrganism._initialized` restait `false` → `diagnose()` retournait `initialized: false`.

```javascript
// AVANT
openGardienDashboard(){
  const el=$('gardienDashboard'), body=$('gardienDashboardBody');

// APRÈS
openGardienDashboard(){
  try{window.ImmatOrganism?.init?.()}catch(e){}   // ← filet
  const el=$('gardienDashboard'), body=$('gardienDashboardBody');
```

**Impact :** `init()` est idempotent (`if(_initialized)return`). Appel systématique = dashboard toujours opérationnel peu importe l'ordre de navigation.

---

### Fix 3 — Cache busting sur les scripts `core/`

**Symptôme :** `core/invariants.js`, `core/bus.js`, `core/brain.js`, `core/governance.js`, `core/immatOrganism.js` chargés sans `?v=`. Après la modification de `immatOrganism.js` (SESSION 44), les navigateurs pouvaient servir l'ancienne version depuis leur cache disque.

```html
<!-- AVANT -->
<script src="core/immatOrganism.js"></script>

<!-- APRÈS -->
<script src="core/immatOrganism.js?v=45"></script>
```

Appliqué à tous les 5 fichiers `core/`. À incrémenter à chaque modification d'un de ces fichiers.

---

### Fix 4 — Service worker : nettoyage des vieux caches

**Symptôme :** Le `activate` handler ne supprimait pas les caches des versions précédentes (`immatconnect-pro-v1`, `v2`, `v3`…). Hors ligne, l'utilisateur pouvait recevoir du contenu d'un ancien cache.

```javascript
// AVANT
self.addEventListener('activate', event => {
  self.clients.claim();
});

// APRÈS
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

Le cache actif (`immatconnect-pro-v4`) est conservé. Tous les autres sont supprimés au premier chargement.

---

## Dette architecturale — `bus.js` / `brain.js` : danger latent

### Situation actuelle

`bus.js` déclare `const ImmatBus` mais **n'exporte PAS** `window.ImmatBus`.

`brain.js` lit `window.ImmatBus` pour obtenir sa référence au bus :
```javascript
const { ImmatBus: _ImmatBus } = typeof require !== 'undefined'
  ? require('./bus')
  : { ImmatBus: window.ImmatBus || null };  // ← null en navigateur
```

**Conséquence actuelle :** `brain._ImmatBus = null` → le cerveau ne peut pas émettre d'événements dans le bus → **le monitoring OBD des violations est aveugle** en production.

### Pourquoi on ne corrige PAS ça maintenant

`brain.js` appelle `_audit(invId, context, true)` avec `violation = true` **hardcodé** dans :
- `canDisplayVehicleOnMap()` → INV-001 — tiré à chaque véhicule affiché sur la carte
- `canAddVehicleToAlerts()` → INV-001 + INV-002
- `canShowPersistentCallBanner()` → INV-008

Si `window.ImmatBus` était défini, chaque véhicule sur la carte émettrait un `INVARIANT_VIOLATED` dans le bus. Le dashboard afficherait **'Dégradé ⚠️' en permanence** (`recent.length > 0`).

### Signification intentionnelle (Phase 1)

Le design Phase 1 est : observer et journaliser ce qui SE PASSE, même si c'est techniquement une violation de l'invariant (qui serait bloquée en Phase 3). Ce n'est pas un bug de brain.js — c'est la philosophie Observateur.

**Mais** : le tableau de santé OBD (`health`) n'est pas conçu pour absorber ces violations permanentes. Il confondrait "violations observées en Phase 1" avec "système dégradé".

### Solution correcte (à planifier)

Deux options architecturales :
- **Option A** : Changer `_audit(invId, ctx, true)` → `_audit(invId, ctx, false)` dans les fonctions Phase 1 (observation sans violation formelle). Connecter le bus. Dashboard sain.
- **Option B** : Ajouter un filtre dans `diagnose()` — ne marquer `health='degraded'` que pour les violations non-Phase-1, ou pour les violations explicitement émises via `ImmatOrganism.observe('INVARIANT_VIOLATED', ...)`.

**En attendant** : le monitoring des violations est non-fonctionnel mais la détection de santé OBD (`health='ok'`) est correcte. Aucun risque utilisateur.

---

## Dead code résiduel de reportPanel (inoffensif)

Après SESSION 43, ces fonctions ont des branches mortes null-safe :

| Fonction | Branche morte | Branche vivante |
|---|---|---|
| `updateReportTarget()` | `vehicleMode`, `title`, `line` (panel null) | `ctx.textContent` → vehicleContextPlate ✅ |
| `setReportMode(mode)` | Tout (guard `if(!p)return`) | — |
| `reportVehicleOrDrivers(label)` | `vehicleAlert()` (vehicle-only jamais true) | `driverInfo()` toujours — **mais aucun appelant actif** |

Ces fonctions sont null-safe. Elles ne seront touchées que si une refonte active du reportPanel est planifiée.

---

## Matrice de cohérence exports `window`

| Fichier | `window.X` exporté | Utilisé depuis index.html |
|---|---|---|
| `core/invariants.js` | ✅ `window._INVARIANTS` | Non (lecture par brain.js via require/window) |
| `core/bus.js` | ❌ manquant | ❌ (volontairement — voir dette) |
| `core/brain.js` | ✅ **ajouté SESSION 45** | `window.ImmatBrain?.getPhase?.()` (dashboard) |
| `core/governance.js` | ❌ manquant | Non (non utilisé depuis index.html) |
| `core/immatOrganism.js` | ✅ ajouté SESSION 44 | `window.ImmatOrganism?.init/diagnose()` |

---

## Tests

```
Tests unitaires : 162 ✅ pass  |  0 ❌ fail
```

---

## Récapitulatif

| # | Problème | Sévérité | Statut |
|---|---|---|---|
| 1 | `window.ImmatBrain` manquant → phase toujours "1" | Mineur | ✅ Corrigé |
| 2 | `openGardienDashboard` sans `init()` → risque si ordre navigation inhabituel | Mineur | ✅ Corrigé |
| 3 | Scripts `core/` sans version → cache navigateur post-SESSION 44 | Modéré | ✅ Corrigé |
| 4 | SW sans nettoyage vieux caches → hors ligne : contenu obsolète | Mineur | ✅ Corrigé |
| 5 | `bus.js` → `window.ImmatBus` manquant + `brain._audit(true)` hardcodé → OBD aveugle + risque 'degraded' permanent si connecté | Architectural | ⚠️ Documenté, à planifier |
| 6 | Dead code `setReportMode` / `reportVehicleOrDrivers` (null-safe) | Cosmétique | ⏳ À nettoyer plus tard |
| 7 | Deploy workflow ne ciblait que `main` → aucune correction déployée | Critique | ✅ Corrigé SESSION 45 (même commit que SESSION 44b) |
