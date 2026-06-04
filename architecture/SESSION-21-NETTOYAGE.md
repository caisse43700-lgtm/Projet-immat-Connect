# Amélioration Navigation Fonctionnalités

> SESSION 21 — Nettoyage code mort P2-010 + P2-017 + audit P2-015
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Ce qui a changé

### `index.html` — 71 lignes supprimées

#### P2-010 — `App._actMsgCard` + `App._actAlertCard` supprimées

Ces deux fonctions (70 lignes au total) n'étaient jamais appelées.
`renderCategoryFeed` utilise **uniquement** `App._actModCard` depuis SESSION 19.

#### P2-017 — `topMsgBadge` supprimé (3 endroits)

| Supprimé | Emplacement |
|---|---|
| `<span id="topMsgBadge" ...>` (HTML caché off-screen) | ligne ~267 |
| `const badge=$('topMsgBadge'); if(badge){...}` | `updateCommunityStatus()` |
| `const legacy=$('topMsgBadge'); if(legacy){...}` | `updateActBadge()` |

Le badge `actBadge` (onglet Activité) est le seul badge actif. `topMsgBadge` était déjà rendu invisible avec `position:fixed;top:-9999px`.

---

## P2-015 — Déjà fait (constat d'audit)

`App.actViewOnMap()` est déjà exposée avec un bouton "📍 Voir" dans `_actModCard` :

```javascript
// ligne ~1178 dans _actModCard
if(a.lat!=null)actions+=`<button class="act-mod-btn-map" onclick="App.actViewOnMap('${e(a.id)}')">📍 Voir</button>`;
```

Backlog mis à jour : P2-015 → ✅ fait.

---

## Ce qui n'a PAS changé

- Aucune fonctionnalité supprimée — uniquement du code mort
- `App.actViewOnMap()` reste définie et active dans `_actModCard`
- `actBadge` (nav Activité) fonctionne identiquement
- Base de données — aucune modification

---

## Backlog restant (priorité suivante)

| ID | Item | Statut |
|---|---|---|
| DA-002 | navPremium simulé — supprimer ou marquer Futur ? | 💬 décision Gardien |
| P2-016 | Unifier status enum alertes seen/present/gone/resolved | 💬 à décider |
| DEC-007 | Status alertes 6→3 — session dédiée | 💬 à décider |
| Niveau 1 cinq sens | Câbler `warnIfPhase2()` en prod | 🔧 moyen risque |
