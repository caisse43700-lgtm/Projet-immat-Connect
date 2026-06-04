# Amélioration Navigation Fonctionnalités

> SESSION 23 — P2-002 FAB "Signaler ici" + DA-002 navPremium confirmé
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## P2-002 — FAB "📍 Signaler ici" (BTN-MISS02)

### Flux utilisateur

```
Clic droit ou long press sur la carte
  → FAB "📍 Signaler ici" apparaît à la position cliquée (5s timeout)
  → Clic sur le FAB → openSignalHere()
  → reportPanel s'ouvre (étape 1 — catégorie)
  → Conducteur choisit Route → roadReport(type)
  → Signalement posté aux coordonnées du tap (pas GPS)
```

### Implémentation

**HTML** — `#fabSignalHere` (ligne 32, après `#map`) :
```html
<div id="fabSignalHere" style="display:none;position:fixed;z-index:800;
  background:rgba(255,59,92,.95);color:#fff;border-radius:24px;padding:9px 16px;
  font-size:13px;font-weight:700;..." onclick="App.openSignalHere()">
  📍 Signaler ici
</div>
```

**initMap()** — handler contextmenu :
```javascript
S.map.on('click', e => {
  this.hideVehicleContextMenu();
  if($('fabSignalHere')) $('fabSignalHere').style.display='none';
});
S.map.on('contextmenu', e => {
  e.originalEvent?.preventDefault?.();
  this.showSignalHere(e);  // ← nouveau
});
```

**Nouvelles méthodes** :
```javascript
showSignalHere(e) {
  S.tapLat = e.latlng.lat; S.tapLng = e.latlng.lng;
  // positionne le FAB en position fixe depuis containerPoint
  // timeout 5s auto-hide
}
openSignalHere() {
  // cache FAB, ouvre reportPanel step 1
}
```

**roadReport()** — coordonnées tap en priorité :
```javascript
const rLat = S.tapLat ?? S.myLat, rLng = S.tapLng ?? S.myLng;
S.tapLat = null; S.tapLng = null;  // nettoyage immédiat
if(rLat === null) return toast('Active le GPS ou choisis un point sur la carte.','bad');
// ... utilise rLat/rLng pour addCommunityAlert + saveReportRemote
```

**sigBack()** — nettoyage si l'utilisateur abandonne :
```javascript
S.tapLat = null; S.tapLng = null;
```

### Contraintes respectées

| Règle | État |
|---|---|
| Pas de modification schema DB | ✅ `roadReport` envoie les coords tap, pas de nouveau champ |
| assist() inchangé | ✅ demande d'aide = toujours position GPS propre |
| FAB non intrusif | ✅ seulement sur clic droit / long press (contextmenu) |
| Nettoyage anti-pollution | ✅ `S.tapLat` effacé dans roadReport() ET sigBack() |

---

## DA-002 — navPremium : résolu (audit SESSION 23)

Statut antérieur : "décision Gardien requise — données simulées".

**Audit code réel** (ligne 618 — `updateNavPremium()`) :

| Cellule | ID | Valeur réelle |
|---|---|---|
| ETA | `etaVal` | Calculé depuis distance GPS / vitesse moyenne |
| Restant | `remainVal` | Distance GPS vers destination |
| Vitesse | `limitVal` | `S.lastSpeed` km/h (GPS réel) |
| Proches | `trafficVal` | `(S.nearby||[]).length` (conducteurs connectés) |
| Alertes | `laneVal` | Alertes actives non résolues |
| Recalcul | `recalcVal` | `'OK'` / `'...'` / `'Auto'` (état recalcul GPS) |

Aucune donnée simulée. DA-002 est clos.

---

## Fichiers modifiés

| Fichier | Nature |
|---|---|
| `index.html` | FAB `#fabSignalHere` + `showSignalHere` + `openSignalHere` + `roadReport` tap coords + `sigBack` nettoyage |
| `architecture/ux/UX-BACKLOG.md` | P2-002 ✅, P1-002/DA-002 ✅, historique SESSION 23 |
