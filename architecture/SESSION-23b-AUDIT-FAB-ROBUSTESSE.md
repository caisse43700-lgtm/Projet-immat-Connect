# Amélioration Navigation Fonctionnalités

> SESSION 23b — Audit robustesse FAB "📍 Signaler ici"
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## CONTEXTE

SESSION 23 a implémenté le FAB "📍 Signaler ici" (P2-002).
SESSION 23b applique les 10 points d'audit de robustesse sur le cycle de vie du FAB.

---

## PROBLÈMES IDENTIFIÉS ET CORRIGÉS

### Point 1 — Double timer

**Problème** : Chaque `showSignalHere()` créait un nouveau `setTimeout` sans annuler le précédent.

**Verdict SESSION 23b** : Déjà corrigé en SESSION 23 original (`clearTimeout(S._tapFabTimer)` avant le nouveau timer).

**Statut** : ✅

---

### Point 2 — FAB visible lors des changements de panneau

**Problème** : `panel(p)` ne masquait pas le FAB. Le FAB restait visible en naviguant entre panneaux.

**Correctif** :
```javascript
// Dans panel(p) — première action
panel(p){
  clearTimeout(S._tapFabTimer);
  if($('fabSignalHere')) $('fabSignalHere').style.display='none';
  // NE PAS effacer S.tapLat ici
  ['altet','drive','messages','settings','activite'].forEach(x=>{...});
  ...
}
```

**Statut** : ✅

---

### Point 3 — Indicateur de position manquant

**Problème** : L'utilisateur ouvrait reportPanel sans savoir que le signalement s'enverrait aux coordonnées du tap (et non à sa position GPS).

**Correctif HTML** (dans `reportPanel`, après `<p>`) :
```html
<div id="signalHereIndicator"
  style="display:none;background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.25);
         border-radius:10px;padding:7px 12px;font-size:12px;color:#ff3b5c;margin-bottom:6px">
  📍 Signalement à la position choisie sur la carte
</div>
```

**Correctif JS** — affiché dans `openSignalHere()`, masqué dans `clearSignalHereContext()`.

**Statut** : ✅

---

### Point 4 — Signalement très éloigné du GPS

**Problème** : Rien n'empêche un signalement Paris → clic à Marseille → carte polluée.

**Décision requise Gardien** (DA-FAB-004) :

| Option | Comportement | Avantage | Inconvénient |
|---|---|---|---|
| A — Libre | Pas de limite | Simple | Signalements fantômes possibles |
| B — Rayon max | Bloquer si distance > Xkm depuis GPS | Intégrité carte | Exclut GPS inactif |
| C — Avertissement | Toast si distance > Xkm, pas de blocage | Équilibre | Conducteur peut ignorer |

**Statut** : ⏳ Décision Gardien (DA-FAB-004)

---

### Point 5 — Nettoyage sur fermeture

**Problème** : Fermer reportPanel (bouton `×`) ne nettoyait pas `S.tapLat/S.tapLng`.

**Correctif** — bouton `×` de `reportPanel` :
```html
<!-- AVANT -->
<button type="button" class="close-x" onclick="App.closeOverlay('reportPanel')">×</button>

<!-- APRÈS -->
<button type="button" class="close-x" onclick="App.sigBack?.();App.closeOverlay('reportPanel')">×</button>
```

**Et** `closeOverlay()` enrichi :
```javascript
closeOverlay(id){
  $(id)?.classList.remove('show');
  if(id==='reportPanel') this.clearSignalHereContext?.();
}
```

**Statut** : ✅

---

### Point 6 — `clearSignalHereContext()` centralisée

**Problème** : Le nettoyage du contexte FAB (tapLat, timer, FAB, indicator) était dispersé dans plusieurs fonctions.

**Nouvelle méthode unique** :
```javascript
clearSignalHereContext(){
  S.tapLat=null; S.tapLng=null;
  clearTimeout(S._tapFabTimer);
  if($('fabSignalHere')) $('fabSignalHere').style.display='none';
  if($('signalHereIndicator')) $('signalHereIndicator').style.display='none';
},
```

**Appelée par** :
- `sigBack()` (abandon par l'utilisateur)
- `closeOverlay('reportPanel')` (fermeture overlay)

**NE PAS appeler dans** :
- `openSignalHere()` → le tapLat doit survivre jusqu'à `roadReport()`
- `panel()` → masque seulement le FAB visuel, ne nettoie pas tapLat

**Statut** : ✅

---

### Point 7 — FAB en mode conduite active

**Problème** : Si `panelDrive` est ouvert, le clic droit sur la carte déclenche le FAB — risque distraction.

**Décision requise Gardien** (DA-FAB-007) :

| Option | Comportement |
|---|---|
| A — Désactivé | `showSignalHere()` retourne si `$('panelDrive')` actif |
| B — Réduit | FAB affiché mais texte raccourci "📍 Signaler" |
| C — Inchangé | Libre à tout moment |

**Statut** : ⏳ Décision Gardien (DA-FAB-007)

---

### Point 8 — Long press mobile

**Problème** : Leaflet émet `contextmenu` sur long press mobile (500ms) mais le comportement natif peut interférer.

**Verdict** : Leaflet gère correctement ce cas avec `e.originalEvent?.preventDefault?.()` déjà en place. Aucune action requise.

**Statut** : ✅ (déjà correct)

---

### Point 9 — `_sigReset()` extrait de `sigBack()`

**Problème** : `openSignalHere()` appelait `App.sigBack?.()` qui effaçait `S.tapLat` — le tapLat était perdu avant la sélection du type.

**Solution** : Extraction de `_sigReset()` pour la partie UI pure.

```javascript
App._sigReset = function(){
  ['sigStep2Route','sigStep2Vehicle','sigStep2Aide']
    .forEach(id => $(id)?.classList.remove('active'));
  $('sigStep1')?.classList.add('active');
};

App.sigBack = function(){
  App.clearSignalHereContext?.();  // efface tapLat + timer + FAB + indicator
  App._sigReset();                  // réinitialise l'UI des étapes
};

App.resetSignalPanel = App.sigBack;
```

`openSignalHere()` appelle `App._sigReset?.()` (UI seul) **sans** effacer tapLat.

**Statut** : ✅

---

### Point 10 — Isolation de `roadReport()`

**Verdict** : `roadReport()` consomme et efface immédiatement `S.tapLat/S.tapLng` (`rLat=S.tapLat??S.myLat; S.tapLat=null`). Déjà correct en SESSION 23.

**Statut** : ✅ (déjà correct)

---

## CYCLE DE VIE COMPLET — ÉTAT FINAL

```
Clic droit (ou long press mobile) sur la carte
  → showSignalHere(e) : stocker tapLat/tapLng, afficher FAB (5s)
  
FAB visible 5s :
  - Autre clic carte → masque FAB (mais garde tapLat)
  - Changement panel() → masque FAB (mais garde tapLat)
  - Timer 5s → masque FAB (mais garde tapLat)
  - Clic FAB "📍 Signaler ici" → openSignalHere()
  
openSignalHere() :
  → masque FAB
  → affiche signalHereIndicator dans reportPanel
  → panel('altet') (ouvre le sheet sigStep1)
  → _sigReset() (réinitialise UI étapes — ne touche PAS tapLat)
  
Conducteur sélectionne type (Route) :
  → roadReport(type) : consomme rLat=tapLat, efface tapLat=null
  
Abandon (× ou sigBack) :
  → clearSignalHereContext() : tapLat=null + timer + FAB + indicator
  → _sigReset() : étapes UI reset
```

---

## DÉCISIONS EN ATTENTE (Gardien requis)

| ID | Question | Impact |
|---|---|---|
| DA-FAB-004 | Signalement tap éloigné : libre / rayon max / avertissement ? | Intégrité carte |
| DA-FAB-007 | FAB en mode conduite : désactiver / réduire / inchangé ? | Sécurité conducteur |

---

## FICHIERS MODIFIÉS

| Fichier | Modification |
|---|---|
| `index.html` | reportPanel `×`, signalHereIndicator, clearSignalHereContext, openSignalHere, panel, closeOverlay, _sigReset, sigBack |
| `knowledge/decisions.json` | _v:3 — P2-002, DA-002-CLOS, SESSION-23b, DA-FAB-004, DA-FAB-007 |
| `supabase/functions/_shared/knowledge-gardien.ts` | Régénéré (198 lignes) |
| `supabase/functions/_shared/knowledge-conducteur.ts` | Régénéré (104 lignes) |

---

## COMMIT

```
fix(session23b): audit FAB Signaler ici — robustesse cycle de vie
```
