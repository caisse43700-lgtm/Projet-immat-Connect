# Amélioration Navigation Fonctionnalités

> SESSION 28 — DA-004 · Blocage ic_blocked · Option C implémentée
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## CONTEXTE

DA-004 était en attente depuis SESSION 19. La question : migrer `ic_blocked` de localStorage vers DB, ou garder localStorage ?

---

## DIAGNOSTIC DU CODE

### Ce que faisait le blocage avant SESSION 28

| Point | Comportement |
|---|---|
| Stockage | `localStorage` — `jget('ic_blocked', [])` |
| Carte | ✅ B masqué dans `loadOthers()` (ligne 682 index.html) |
| Messages | ❌ Messages de B visibles — aucun filtre dans `normalizeRows()` |
| Logout | ✅ ic_blocked NON effacé (correct) |
| Multi-appareil | ❌ Blocage perdu sur nouvel appareil |

**Gap réel** : le blocage cachait B sur la carte mais ses messages arrivaient quand même.

---

## OPTIONS ANALYSÉES

### Option A — Statu quo localStorage
- Aucune modification
- Gap messages non résolu

### Option B — Migrer vers DB
- Table `blocked_plates`, RPC Supabase, logique asynchrone
- Complexité élevée, migration DB interdite en session

### Option C — Corriger le gap, garder localStorage ✅ retenu
- Filtre les messages des bloqués dans `normalizeRows()` — messages.js
- Zéro migration DB, comportement synchrone préservé
- Corrige le vrai problème utilisateur

---

## CORRECTIF — `messages.js`

```javascript
// AVANT (ligne 172)
}).filter(m => m._otherPlate && m.status !== 'rejected' && !deletedIds.includes(String(m.id)));

// APRÈS
}).filter(m => {
  const blocked = window.S?.blocked || [];
  return m._otherPlate && m.status !== 'rejected' && !deletedIds.includes(String(m.id)) && !blocked.includes(nPlate(m._otherPlate));
});
```

### Pourquoi nPlate() sur _otherPlate

`_otherPlate` est formaté via `fPlate()` ("AB-123-CD").
`S.blocked` contient des plaques normalisées via `nPlate()` ("AB123CD").
La comparaison doit passer par `nPlate(m._otherPlate)` pour être fiable.

---

## EFFETS DE BORD VÉRIFIÉS

| Point | Impact | Verdict |
|---|---|---|
| Messages envoyés par A vers B bloqué | Non filtrés — A voit ses propres envois | ✅ correct (`_sent=true`) |
| B envoie à A (A a bloqué B) | Filtrés dans `normalizeRows` | ✅ objectif atteint |
| `S._actMessages` (feed Activité) | Alimenté depuis `State.messages` = résultat de `normalizeRows` | ✅ fil Activité aussi filtré |
| Badge messages | `setUnreadMsgCount` recalculé à chaque `refresh()` | ✅ badge correct |
| `loadOthers` carte | Inchangé — garde son propre filtre ligne 682 | ✅ |

---

## DÉCISION

DA-004 **clôturé** en Option C.

La migration DB (cross-device) reste possible comme P3 si le besoin devient réel. Aucune dette créée par ce choix.

---

## COMMIT

```
fix(da-004): messages.js filtre les messages des plaques bloquées (Option C)
```

---

## BILAN DÉCISIONS OUVERTES

| ID | Statut |
|---|---|
| DA-004 ic_blocked | ✅ Clôturé SESSION 28 — Option C |
| DEC-007 statuts alertes | ⏳ Session dédiée |
