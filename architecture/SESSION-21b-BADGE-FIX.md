# Amélioration Navigation Fonctionnalités

> SESSION 21 — Addendum : réserve Gardien résolue — actBadge = alertes + messages
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Résultat de l'audit Gardien

### Vérification 0 référence active

```
grep -R "_actMsgCard|_actAlertCard|topMsgBadge" .
```

| Fichier | Résultat |
|---|---|
| `index.html` | 0 référence ✓ |
| `*.ts`, `*.json` actifs | 0 référence ✓ |
| `badge.js`, `messages.js`, `ui.js` | Refs null-safe (`if(badge)`) — `$('topMsgBadge')` retourne null, inoffensif ✓ |

---

### Analyse UX-NOTIFICATION-MATRIX.json

Règle officielle avant SESSION 21 :
- `actBadge` = alertes seulement
- `topMsgBadge` = messages (mais off-screen depuis la création — jamais visible)

**Constat** : avant SESSION 21, les messages non lus n'avaient **aucun badge nav visible**. `topMsgBadge` était intentionnellement caché (`position:fixed;top:-9999px`). Pas de régression introduite.

---

## Corrections apportées

### 1. `updateActBadge()` — formule étendue

```javascript
// AVANT
if(badge){badge.textContent=unreadAlerts>99?'99+':String(unreadAlerts);...}

// APRÈS
const total = unreadAlerts + (Number(S.unreadMsgCount) || 0);
if(badge){badge.textContent=total>99?'99+':String(total);badge.style.display=total>0?'flex':'none';}
```

Le badge nav `actBadge` couvre maintenant **toute l'activité non lue** (alertes + messages).

### 2. `setUnreadMsgCount()` — déclenche le badge nav

```javascript
// Ajout : App.updateActBadge?.()
function setUnreadMsgCount(n){
  S.unreadMsgCount = Math.max(0, Number(n)||0);
  // ... localStorage
  try{App.updateCommunityStatus()}catch(e){}
  try{App.updateActBadge?.()}catch(e){}  // ← nouveau
}
```

Quand un nouveau message arrive via realtime, le badge nav se met à jour immédiatement.

### 3. `IMMAT-FLOW-INDEX.json` — doc morte corrigée

```
FLOW-VEHICLE-ALERT ui: _actAlertCard (type='vehicle')
→ _actModCard (group='vehicle')
```

### 4. `UX-NOTIFICATION-MATRIX.json` — badge_rules mis à jour

| Avant | Après |
|---|---|
| `actBadge = alertes` | `actBadge = alertes + messages (total activité)` |
| `topMsgBadge = messages` | Supprimé |
| `badge_separation` = TODO | `badge_separation` = ✅ fait SESSION 21 |

---

## État final badge nav

```
actBadge (onglet Activité) = unreadAlerts + S.unreadMsgCount
```

La séparation alertes/messages est désormais **dans le panel Activité** via les filtres DEC-003 (Tout / Messages / Alertes) — pas via deux badges distincts dans la nav.

---

## Fichiers modifiés

| Fichier | Nature |
|---|---|
| `index.html` | `updateActBadge()` + `setUnreadMsgCount()` |
| `architecture/IMMAT-FLOW-INDEX.json` | Doc `_actAlertCard` → `_actModCard` + impact FLOW-BADGES |
| `architecture/ux/UX-NOTIFICATION-MATRIX.json` | badge_rules + badge_separation ✅ |
