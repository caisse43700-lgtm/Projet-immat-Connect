# Amélioration Navigation Fonctionnalités

> SESSION 26 — Audit général · 5 bugs corrigés
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## MÉTHODOLOGIE

Lecture complète de : `badge.js`, `ui.js`, `utils.js`, `messages.js`, `calls.js`, `index.html` (chaîne badge + FAB + openReport + nav).

Analyse de l'ordre de chargement des scripts (lignes 1840-1843 index.html).

---

## BUG-001 — Critique · badge.js écrase setUnreadMsgCount

### Diagnostic

Ordre de chargement dans `index.html` :
```
ligne 357  : <script> inline → function setUnreadMsgCount(n){ ... App.updateActBadge?.() }
ligne 1841 : <script src="badge.js"> → window.setUnreadMsgCount = setBadge  ← ÉCRASEMENT
ligne 1842 : <script src="messages.js"> → window.setUnreadMsgCount = window.setUnreadMsgCount || setBadge
```

`badge.js` utilisait une assignation inconditionnelle. Il écrasait la fonction de `index.html`, qui est la seule à appeler `App.updateActBadge()`.

**Conséquence** : `markRead()` et `openInboxBadge()` appellaient `setUnreadMsgCount(0)` → badge.js's `setBadge` → `S.unreadMsgCount = 0` mais l'`actBadge` (onglet Activité) ne se mettait PAS à jour visuellement.

### Correctif — `badge.js`

```javascript
// AVANT
window.setUnreadMsgCount = setBadge;

// APRÈS
window.setUnreadMsgCount = window.setUnreadMsgCount || setBadge;
```

La version de `index.html` (qui appelle `updateActBadge`) est préservée. badge.js sert de fallback uniquement si la fonction n'est pas encore définie.

---

## BUG-002 — Moyen · Timer FAB laisse S.tapLat en mémoire

### Diagnostic

Dans `showSignalHere(e)`, le timer 5 secondes cachait uniquement l'élément DOM :
```javascript
S._tapFabTimer = setTimeout(() => { fab.style.display = 'none'; }, 5000);
```

Après 5 secondes, le FAB disparaissait visuellement mais `S.tapLat` et `S.tapLng` restaient en mémoire.

**Conséquence** : Si l'utilisateur ouvrait le `reportPanel` via un autre chemin (bouton FAB fixe, `openAssist()`, etc.) plusieurs minutes plus tard, ses coordonnées d'un ancien tap auraient été utilisées silencieusement pour le signalement, avec parfois le toast "À X km de votre position" sans que l'utilisateur comprenne pourquoi.

### Correctif — `index.html`

```javascript
// AVANT
S._tapFabTimer = setTimeout(() => { fab.style.display = 'none'; }, 5000);

// APRÈS
S._tapFabTimer = setTimeout(() => { this.clearSignalHereContext?.() }, 5000);
```

`clearSignalHereContext()` efface `S.tapLat`, `S.tapLng`, le timer, le FAB et l'indicateur.

**Note** : si l'utilisateur clique le FAB avant les 5s, `openSignalHere()` appelle `clearTimeout(S._tapFabTimer)` → le timer ne se déclenche pas → `S.tapLat` reste valide jusqu'à `roadReport()`. Le fix ne crée aucune régression.

---

## BUG-003 — Bas · Distance DA-FAB-004 utilise une approximation incorrecte

### Diagnostic

```javascript
// SESSION 25 — implémentation initiale
const _dKm = Math.hypot(rLat - S.myLat, rLng - S.myLng) * 111;
```

`Math.hypot * 111` est une approximation qui suppose que 1 degré ≈ 111 km dans TOUTES les directions. C'est vrai pour la latitude, mais faux pour la longitude : à 48°N (Paris), 1 degré de longitude ≈ 74 km — pas 111 km.

**Conséquence** : La distance est surestimée d'environ 30-40% pour les déplacements est-ouest. Un signalement à 7 km réels vers l'est déclenchait le toast "10 km".

`utils.js` (déjà chargé en ligne 18) expose `km(lat1, lng1, lat2, lng2)` — haversine propre.

### Correctif — `index.html`

```javascript
// AVANT
const _dKm = Math.hypot(rLat - S.myLat, rLng - S.myLng) * 111;

// APRÈS
const _dKm = km(rLat, rLng, S.myLat, S.myLng);
```

---

## MORT-001 — `alertsPanel` dans ui.js

### Diagnostic

`ui.js` listait `alertsPanel` dans son tableau `floating` utilisé par `closeFloating()` :
```javascript
const floating = [
  'reportPanel', 'nearbyPanel', 'alertsPanel',  // ← mort depuis SESSION 19
  'drawer', 'legal', 'blocked', 'recent', 'vehicleContextMenu'
];
```

`alertsPanel` a été supprimé du DOM en SESSION 19 (DEC-006). Chaque appel à `closeFloating()` faisait `hide(null)` — un no-op, mais code mort trompeur.

### Correctif — `ui.js`

Suppression de `'alertsPanel'` du tableau.

---

## BUG-004 — Bas · ui.js openReport ne reset pas les étapes

### Diagnostic

`ui.js` monkey-patche `App.openReport` :
```javascript
// AVANT (ui.js)
App.openReport = function () {
  try { App.panel('altet'); } catch(e) {}
};
```

L'original dans `index.html` appelait `App.sigBack?.()` → `_sigReset()` → reset des étapes UI vers step 1.

**Conséquence** : si l'utilisateur était à l'étape 2 (type de route) puis appelait `openAssist()` → `openReport()` → la sheet s'ouvrait sur l'étape 2 au lieu de l'étape 1.

### Correctif — `ui.js`

```javascript
// APRÈS
App.openReport = function () {
  try { App.panel('altet'); } catch(e) {}
  try { App._sigReset?.(); } catch(e) {}
};
```

---

## AUTRES POINTS EXAMINÉS (aucune action)

| Point | Verdict |
|---|---|
| `messages.js` séquence de 6 requêtes DB | Performance connue — pas de fix sans schéma DB |
| `calls.js` `closeNotAllowedModal` → ouvre conversation | Intentionnel (redirection UX documentée) |
| `ui.js syncNav` : messages → navActivite | Intentionnel (messages sous onglet Activité) |
| `messages.js` setBadge n'appelle pas `setUnreadMsgCount` | Sans impact : `refresh()` appelle `updateActBadge()` après |
| `ic_deleted_msgs` capped à 500 | Raisonnable, pas de bug |

---

## FICHIERS MODIFIÉS

| Fichier | Bug corrigé |
|---|---|
| `badge.js` | BUG-001 — `||` au lieu de `=` |
| `index.html` | BUG-002 — timer FAB → clearSignalHereContext |
| `index.html` | BUG-003 — `km()` haversine au lieu de Math.hypot |
| `ui.js` | MORT-001 — alertsPanel supprimé du tableau floating |
| `ui.js` | BUG-004 — openReport appelle _sigReset |

---

## COMMITS

```
fix(audit-s26): badge.js ne remplace plus setUnreadMsgCount (BUG-001)
fix(audit-s26): timer FAB appelle clearSignalHereContext — coordonnées nettoyées (BUG-002)
fix(audit-s26): distance roadReport utilise km() haversine (BUG-003)
fix(audit-s26): ui.js — alertsPanel mort supprimé + openReport reset étapes (MORT-001 + BUG-004)
```

---

## BILAN DETTE

| ID | Statut |
|---|---|
| BUG-001 badge écrasé | ✅ Résolu |
| BUG-002 tapLat persistant | ✅ Résolu |
| BUG-003 distance approximative | ✅ Résolu |
| MORT-001 alertsPanel mort | ✅ Résolu |
| BUG-004 openReport sans sigReset | ✅ Résolu |
| DA-004 ic_blocked DB vs localStorage | ⏳ Session dédiée |
| DEC-007 statuts alertes → 3 statuts | ⏳ Session dédiée |
