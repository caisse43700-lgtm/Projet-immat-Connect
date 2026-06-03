# Amélioration Navigation Fonctionnalités

> Récapitulatif complet — SESSIONS 21 → 24
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## SESSION 21 — Nettoyage backlog P2

### P2-010 — Code mort supprimé : `_actMsgCard` + `_actAlertCard`

**Problème** : Deux fonctions de 70 lignes au total existaient dans `index.html` mais n'étaient jamais appelées. `renderCategoryFeed()` utilisait exclusivement `_actModCard`.

**Action** : Suppression complète des deux fonctions.

**Fichier** : `index.html`

---

### P2-015 — MORT-002 résolu : `actViewOnMap()`

**Problème** : `App.actViewOnMap(alertId)` était implémentée mais aucun bouton n'y accédait.

**Constat** : Le bouton "📍 Voir" était déjà présent dans `_actModCard` depuis SESSION 19.

**Action** : Constat documenté, MORT-002 clos.

---

### P2-017 — `topMsgBadge` supprimé

**Problème** : `topMsgBadge` existait dans le HTML depuis la création mais était positionné hors écran (`position:fixed;top:-9999px`). Jamais visible. Trois fichiers JS le référençaient en null-safe.

**Action** :
- Suppression du `<span id="topMsgBadge">` dans `index.html`
- Nettoyage de `updateCommunityStatus()` et `updateActBadge()`
- `actBadge` (onglet Activité) devient le seul badge nav actif

**Fichier** : `index.html`

---

### SESSION 21b — `actBadge` étendu : alertes + messages

**Problème** : Après suppression de `topMsgBadge`, les messages non lus n'avaient plus de badge nav visible.

**Correctif `updateActBadge()`** :
```javascript
// AVANT
if(badge){badge.textContent=unreadAlerts>99?'99+':String(unreadAlerts);}

// APRÈS
const total=unreadAlerts+(Number(S.unreadMsgCount)||0);
if(badge){badge.textContent=total>99?'99+':String(total);badge.style.display=total>0?'flex':'none';}
```

**Correctif `setUnreadMsgCount()`** :
```javascript
// Ajout : déclenchement du badge nav à chaque message entrant
try{App.updateActBadge?.()}catch(e){}
```

**Règle finale** :
```
actBadge (onglet Activité) = unreadAlerts + S.unreadMsgCount
```

**Fichiers** : `index.html`, `architecture/ux/UX-NOTIFICATION-MATRIX.json`, `architecture/IMMAT-FLOW-INDEX.json`

---

## SESSION 22 — Nettoyage CSS/JS mort

### CSS mort supprimé — `app.css`

| Sélecteur | Raison |
|---|---|
| `body.night .act-card` | Classe absente du DOM depuis SESSION 21 |
| `body.night .act-filter` | Classe absente de tout fichier HTML/JS |
| `.act-card-actions button` | Classe absente de tout fichier HTML/JS |

**CSS conservé** (encore vivant) :
- `.act-ttl-bar` / `.act-ttl-fill` — utilisées dans `_actModCard`
- `.nav-badge` — utilisée par `actBadge`
- `body.night .sig-cat-btn` — utilisée dans `panelAltet`

---

### JS mort supprimé — `badge.js`

```javascript
// SUPPRIMÉ — élément topMsgBadge absent du DOM
const badge = $('topMsgBadge');
if (badge) {
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.style.display = n > 0 ? 'flex' : 'none';
  badge.setAttribute('aria-label', `${n} unread messages`);
}
```

---

### JS mort supprimé — `messages.js`

```javascript
// SUPPRIMÉ
const b = $('topMsgBadge');
if(b){
  b.textContent = n > 99 ? '99+' : String(n);
  b.style.display = n > 0 ? 'flex' : 'none';
}
```

---

### JS mort supprimé — `ui.js`

```javascript
// SUPPRIMÉ — branche else (setUnreadMsgCount est toujours définie)
} else {
  const badge = $('topMsgBadge');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
```

---

### Documentation — `AUDIT-UX-CLASSIFICATION.md`

- MORT-002 → ✅ résolu (P2-015)
- Bilan boutons morts : **0 restant**
- Section SESSION 21 ajoutée

---

## SESSION 23 — P2-002 FAB "Signaler ici" + DA-002 clos

### P2-002 — FAB "📍 Signaler ici"

**Flux utilisateur** :
```
Clic droit ou long press sur la carte
  → FAB "📍 Signaler ici" apparaît à la position cliquée (5s timeout)
  → Clic → reportPanel s'ouvre
  → Conducteur choisit Route → roadReport(type)
  → Signalement posté aux coordonnées du tap (pas GPS)
```

**HTML ajouté** (ligne 32, après `#map`) :
```html
<div id="fabSignalHere"
  style="display:none;position:fixed;z-index:800;background:rgba(255,59,92,.95);
         color:#fff;border-radius:24px;padding:9px 16px;font-size:13px;
         font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.35);
         cursor:pointer;white-space:nowrap;pointer-events:all"
  onclick="App.openSignalHere()">
  📍 Signaler ici
</div>
```

**`initMap()` modifié** :
```javascript
// AVANT
S.map.on('click', () => this.hideVehicleContextMenu());

// APRÈS
S.map.on('click', e => {
  this.hideVehicleContextMenu();
  if($('fabSignalHere')) $('fabSignalHere').style.display='none';
});
S.map.on('contextmenu', e => {
  e.originalEvent?.preventDefault?.();
  this.showSignalHere(e);
});
```

**Nouvelles méthodes** :
```javascript
showSignalHere(e) {
  S.tapLat = e.latlng.lat;
  S.tapLng = e.latlng.lng;
  const fab = $('fabSignalHere');
  if (!fab || !$('map')) return;
  const rect = $('map').getBoundingClientRect();
  fab.style.left = (rect.left + e.containerPoint.x) + 'px';
  fab.style.top  = (rect.top  + e.containerPoint.y) + 'px';
  fab.style.display = 'block';
  clearTimeout(S._tapFabTimer);
  S._tapFabTimer = setTimeout(() => { fab.style.display='none'; }, 5000);
},

openSignalHere() {
  if($('fabSignalHere')) $('fabSignalHere').style.display = 'none';
  clearTimeout(S._tapFabTimer);
  this.panel('altet');
  App.sigBack?.();
},
```

**`roadReport()` modifié** :
```javascript
// AVANT
if(S.myLat===null){ ... return toast('Active le GPS...','bad'); }
// ...utilise S.myLat, S.myLng

// APRÈS
const rLat = S.tapLat ?? S.myLat, rLng = S.tapLng ?? S.myLng;
S.tapLat = null; S.tapLng = null;  // nettoyage immédiat
if(rLat===null){ ... return toast('Active le GPS ou choisis un point sur la carte.','bad'); }
// ...utilise rLat, rLng
```

**`sigBack()` modifié** (nettoyage si abandon) :
```javascript
App.sigBack = function() {
  S.tapLat = null; S.tapLng = null;  // ← nouveau
  ['sigStep2Route','sigStep2Vehicle','sigStep2Aide']
    .forEach(id => $(id)?.classList.remove('active'));
  $('sigStep1')?.classList.add('active');
};
```

---

### DA-002 — navPremium : clos

Audit du code réel (`updateNavPremium()` ligne 618) :

| Cellule | Valeur réelle |
|---|---|
| Vitesse (`limitVal`) | `S.lastSpeed` km/h — GPS réel |
| Proches (`trafficVal`) | `(S.nearby||[]).length` — conducteurs connectés |
| Alertes (`laneVal`) | Alertes actives non résolues |
| ETA / Restant | Calculés depuis distance GPS + vitesse |
| Recalcul | `'OK'` / `'...'` / `'Auto'` selon l'état GPS |

Aucune donnée simulée. DA-002 est clos.

---

## SESSION 24 — Théorie du Tout · Référentiel ANGE

### Théorie du Tout

```
INTENTION → ADN → Constitution → NS → Organes
→ Référentiel Opérationnel → Ange → Conducteur / Gardien
```

Le conducteur ouvre ImmatConnect **pour rester connecté à son environnement routier**. Toutes les fonctionnalités découlent de cette intention.

---

### Orientation mentale

```
Carte     = Ce qui se passe AUTOUR DE MOI en ce moment
Activité  = Ce qui S'EST PASSÉ — alertes, messages, historique
Messages  = CE QUE LES AUTRES M'ONT DIT — conversations directes
```

---

### `intentions.json` v2 — nouvelles sections

**`theorie_du_tout`** : chaîne hiérarchique complète

**`orientation_mentale`** : définitions Carte / Activité / Messages

**`intentions_primaires`** — 6 suggestions ANGE "Comment puis-je vous aider ?" :
```
🚗 Prévenir un conducteur
🛣 Signaler un danger
🆘 Demander de l'aide
📍 Me guider
📨 Voir mes conversations
⚙️ Paramètres
```

**`etats_conducteur`** — états mentaux → intentions :
```
Je suis perdu           → INT-NAVIGATE, INT-LOCATE-SELF
Je veux prévenir        → INT-SIGNAL-VEHICLE, INT-CONTACT-DRIVER
J'ai besoin d'aide      → INT-REQUEST-HELP, INT-SOS
Je veux voir autour     → INT-LOCATE-SELF, INT-CHECK-ACTIVITY
J'ai vu un danger       → INT-SIGNAL-ROAD
Je veux contacter       → INT-CONTACT-DRIVER
```

---

### `organs.json` v2 — matrice d'impact

Le Gardien peut maintenant répondre à "quel impact si je modifie ça ?" **sans ouvrir le code** :

| Organe | UX | ADN | Sécurité | Risque |
|---|---|---|---|---|
| Auth | faible | nul | fort | élevé |
| Profil | fort | faible | moyen | moyen |
| Carte | fort | nul | nul | faible |
| Messages | fort | faible | moyen | moyen |
| Signalements | fort | fort | fort | élevé |
| Ange | fort | fort | moyen | élevé |

---

### `scripts/sync-knowledge.js` — nouvelles sections générées

**Dans `knowledge-conducteur.ts`** :
- `## COMMENT PUIS-JE VOUS AIDER ?` — 6 intentions primaires
- `## ORIENTATION MENTALE` — Carte / Activité / Messages

**Dans `knowledge-gardien.ts`** :
- `THÉORIE DU TOUT` — chaîne INTENTION → Gardien
- `ANALYSE D'IMPACT PAR ORGANE` — tableau UX/ADN/Sécurité/Risque

**Résultat** :
```
knowledge-conducteur.ts : 104 lignes (+14)
knowledge-gardien.ts    : 193 lignes (+19)
```

---

## ÉTAT FINAL DU CODEBASE

### Badges nav
```
actBadge (onglet Activité) = unreadAlerts + S.unreadMsgCount
Aucun autre badge nav actif.
```

### Références mortes
```
topMsgBadge        : 0 référence dans tout le codebase
_actMsgCard        : 0 référence
_actAlertCard      : 0 référence
act-card (CSS)     : 0 règle active
```

### Boutons morts (MORT-*)
```
0 restant (7 catalogués, 7 résolus)
```

### Backlog restant
```
DEC-007   Unifier statuts alertes seen/present/gone/resolved → 3 statuts  (décision Gardien)
DA-004    Blocage ic_blocked → DB ou localStorage ?                         (décision Gardien)
Phase 2   warnIfPhase2() câblage                                            (décision Gardien)
```

---

## COMMITS (ordre chronologique)

```
fix(session22): suppression CSS/JS mort — topMsgBadge + act-card + act-filter
chore(ange): sync knowledge SESSION 21/22 — decisions + projections TS
feat(p2-002): FAB Signaler ici — clic droit carte + roadReport coordonnées tap
feat(knowledge): SESSION 24 — intentions v2, impact organes, Théorie du Tout
docs: SESSION-24 Théorie du Tout — audit stratégique final livrable
```

---

## RÈGLE FINALE

> Ange ne possède rien. Ange relie tout.
> L'organisme reste l'unique source de vérité.
