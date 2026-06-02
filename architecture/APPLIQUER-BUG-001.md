# BUG-001 — Alertes véhicule bloquées de S.alerts

> Fichier cible : index.html
> Découvert lors de l'audit croisé SESSION 14.

---

## Diagnostic

### Symptôme

```
catBadgeVehicle = 0 toujours
```

Les alertes véhicule n'apparaissaient jamais dans Activité.
`pendingSignalCount()` retournait toujours 0.

### Cause racine

Dans `upsertAlert` (ligne ~404), une garde bloquait toutes les alertes véhicule :

```javascript
function upsertAlert(alert){
  if(!alert||!alert.key)return null;
  if(alert.group==='vehicle')return null;  // ← BUG
  ...
}
```

Les alertes reçues via `vehicle_alert` broadcast ont `group='vehicle'`.
Elles étaient rejetées avant d'entrer dans `S.alerts`.

### Bug masqué jusqu'en SESSION 14

Avant SESSION 14, `catBadgeVehicle` était alimenté par les messages non lus :

```javascript
// AVANT (SESSION 14 corrigé)
const bVehicle = alertes.filter(vehicle).length + msgs.filter(nonLus).length;
```

La suppression des messages du calcul a rendu le bug visible.

---

## Correction

### Chercher (ligne ~404, dans `upsertAlert`)

```javascript
function upsertAlert(alert){if(!alert||!alert.key)return null;if(alert.group==='vehicle')return null;if(['resolved','gone','expired','deleted']
```

### Remplacer par

```javascript
function upsertAlert(alert){if(!alert||!alert.key)return null;if(['resolved','gone','expired','deleted']
```

La seule modification : suppression de `if(alert.group==='vehicle')return null;`

---

## Pourquoi c'est sûr

| Vérification | Résultat |
|---|---|
| `isNearby(a)` quand `lat=null` | Retourne `true` → alertes ciblées toujours visibles ✅ |
| Doublon FloatingCard | `addCommunityAlert` appelé avec `notify:false` → pas de doublon ✅ |
| Marqueur carte parasite | `syncAlertMarkers` ne crée un marqueur que si `lat!=null` ✅ |
| TTL nettoyage | `CATS.vehicule.ttl = 1h` → nettoyage automatique ✅ |
| localStorage | `saveAlerts()` persiste jusqu'à 80 alertes ✅ |

---

## Effet

### Avant

```
Alerte véhicule reçue
  → FloatingCard (8s) ← seule trace
  → S.alerts : vide
  → catBadgeVehicle : 0
  → Activité → Véhicule : vide
```

### Après

```
Alerte véhicule reçue
  → FloatingCard (8s)
  → S.alerts : alerte stockée ✅
  → catBadgeVehicle++ ✅
  → Activité → Reçus → Véhicule : alerte visible ✅
  → Si B rate la FloatingCard : retrouve dans Activité ✅
```

---

## Commit de référence

```
288ba60  fix: BUG-001 — alertes véhicule stockées dans S.alerts
```
