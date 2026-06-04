# SESSION 15 — IC-003 · IC-002 · Ange Conducteur

> Fichier cible : index.html
> Date : 2026-06-02
> Branche : claude/immatconnect-pro-app-dEKGR

---

## CONTEXTE

SESSION 15 ferme les 3 dettes prioritaires identifiées par l'AUDIT-CROISE-SESSION-14 :

- **IC-003** — A ne voyait pas "Helper en route" quand B disait "J'arrive"
- **IC-002** — A ne savait pas si B avait vu son alerte véhicule
- **Ange Conducteur** — Le bouton ✦ était invisible pour les conducteurs normaux

---

## MODIFICATION ① — IC-003 + IC-002 dans `subMsgs`

### Chercher (ligne ~722, dans le handler `subMsgs`)

```javascript
      try{this.showFloatingCard('💬','Message de '+(pl||'inconnu'),''+((m.message||'').slice(0,40)),'Vu','Répondre →',null,async()=>{this.panel('messages');try{window.ImmatMessages?.setMode?.('inbox');await window.ImmatMessages?.refresh?.();if(pl)window.ImmatMessages?.openThread?.(pl)}catch(e){}})}catch(e){}
```

### Remplacer par

```javascript
      const _txt=String(m.message||'');let _ic003=false;
      if(_txt.startsWith("J'arrive")||_txt.startsWith("J'arrive")){const _myAssist=(S.alerts||[]).find(a=>(a._own||a._mine)&&a.group==='assist'&&a.status!=='resolved'&&a.status!=='gone');if(_myAssist){_myAssist.status='helper_coming';_myAssist._helperPlate=pl;saveAlerts();schedFeed();_ic003=true;try{this.showFloatingCard('✋','Helper en route',pl+' vient vous aider','OK','💬 Messages',()=>{},()=>{S.conv=pl;this.panel('messages');try{window.ImmatMessages?.setMode?.('inbox');window.ImmatMessages?.openThread?.(pl)}catch(e2){}},'urgent')}catch(e){}}}
      if(_txt.includes('note confiance actuelle')){const _myVeh=(S.alerts||[]).find(a=>(a._own||a._mine)&&(a.group==='vehicle'||a.type==='vehicule'));if(_myVeh){_myVeh.status='seen_by_driver';saveAlerts();}toast('✓ '+(pl||'Le conducteur')+' a vu votre signalement','ok');}
      if(!_ic003&&!_txt.includes('note confiance actuelle')){try{this.showFloatingCard('💬','Message de '+(pl||'inconnu'),''+(_txt.slice(0,40)),'Vu','Répondre →',null,async()=>{this.panel('messages');try{window.ImmatMessages?.setMode?.('inbox');await window.ImmatMessages?.refresh?.();if(pl)window.ImmatMessages?.openThread?.(pl)}catch(e){}})}catch(e){}}
```

### Effet

**IC-003 — "Helper en route" quand B dit "J'arrive" :**

```
AVANT : A reçoit FloatingCard "💬 Message de [plaque]" — sans contexte aide
APRÈS : A reçoit FloatingCard "✋ Helper en route — [plaque] vient vous aider"
        + card Activité → Aide passe à status 'helper_coming'
```

**IC-002 — "Vu par le conducteur" quand B répond à une alerte véhicule :**

```
AVANT : A reçoit FloatingCard "💬 Message de [plaque]" avec feedback brut
APRÈS : A reçoit toast discret "✓ [plaque] a vu votre signalement"
        + card Activité → Véhicule passe à status 'seen_by_driver'
        + la FloatingCard message est supprimée (remplacée par le toast)
```

---

## MODIFICATION ② — `_actModCard` statusBadge

### Chercher (ligne ~1082, dans `_actModCard`)

```javascript
let statusBadge=isOwn?'<span class="act-mod-status-lbl mine">Mon signalement</span>':(a.status==='seen'||a.status==='present')?'<span class="act-mod-status-lbl vu">Vu</span>':'';
```

### Remplacer par

```javascript
let statusBadge=isOwn?(a.status==='helper_coming'?`<span class="act-mod-status-lbl vu">✋ En route${a._helperPlate?' · '+e(a._helperPlate):''}</span>`:'<span class="act-mod-status-lbl mine">Mon signalement</span>'):(a.status==='seen'||a.status==='present')?'<span class="act-mod-status-lbl vu">Vu</span>':(a.status==='seen_by_driver'?'<span class="act-mod-status-lbl vu">Vu par le conducteur</span>':'');
```

### Effet

| Status alerte | Badge affiché |
|---|---|
| `helper_coming` (sur demande aide de A) | `✋ En route · [plaque helper]` |
| `seen` / `present` (alerte route/aide reçue par B) | `Vu` |
| `seen_by_driver` (alerte véhicule envoyée par A) | `Vu par le conducteur` |
| autre | aucun badge |

---

## MODIFICATION ③ — Ange Conducteur visible pour tous

### Chercher (ligne ~526, dans `openMap`)

```javascript
if(S.isGardien){document.body.classList.add('is-gardien');if($('angeFab'))$('angeFab').style.display='flex';}else if(S.isGardien===undefined){sb.rpc('get_my_role').then(({data:r})=>{if(r==='gardien'){S.isGardien=true;document.body.classList.add('is-gardien');if($('angeFab'))$('angeFab').style.display='flex';}else S.isGardien=false;}).catch(()=>{S.isGardien=false;});}
```

### Remplacer par

```javascript
if(S.isGardien){document.body.classList.add('is-gardien');if($('angeFab'))$('angeFab').style.display='flex';}else if(S.isGardien===undefined){sb.rpc('get_my_role').then(({data:r})=>{if(r==='gardien'){S.isGardien=true;document.body.classList.add('is-gardien');}else S.isGardien=false;if($('angeFab'))$('angeFab').style.display='flex';}).catch(()=>{S.isGardien=false;if($('angeFab'))$('angeFab').style.display='flex';});}else{if($('angeFab'))$('angeFab').style.display='flex';}
```

### Effet

```
AVANT : bouton ✦ visible uniquement si role === 'gardien'
APRÈS : bouton ✦ visible pour tout conducteur authentifié après connexion
        gardien → is-gardien CSS + ✦ visible
        conducteur → ✦ visible (sans is-gardien)
        erreur réseau → ✦ visible quand même (fail-open)
```

---

## RÉSUMÉ DES FLUX FERMÉS

### FLOW-002 — Helper arrive (IC-003)

```
B dit "J'arrive" via Activité
  → actQuickReply → message DB ("J'arrive, je viens vous aider.")
  → subMsgs chez A détecte startsWith("J'arrive")
  → myAssist.status = 'helper_coming' + myAssist._helperPlate = plaque B
  → saveAlerts() + schedFeed()
  → FloatingCard "✋ Helper en route — [plaque] vient vous aider"
  → Card Activité → Aide : badge "✋ En route · [plaque]"
```

### FLOW-005 — Alerte véhicule (IC-002)

```
B répond à alerte véhicule via respondVehicleAlert()
  → message DB ("Info utile — note confiance actuelle : 65%")
  → subMsgs chez A détecte includes('note confiance actuelle')
  → myVeh.status = 'seen_by_driver'
  → saveAlerts()
  → toast "✓ [plaque] a vu votre signalement"
  → Card Activité → Véhicule : badge "Vu par le conducteur"
```

---

## TESTS À VALIDER EN TERRAIN

| Test | Scénario | Attendu |
|---|---|---|
| IC-003-01 | B clique "✋ J'arrive" sur demande aide de A | A voit FloatingCard "✋ Helper en route" |
| IC-003-02 | A reste dans Activité → Aide | Badge "✋ En route · [plaque]" sur la card |
| IC-003-03 | A n'a pas de demande aide active | Rien ne se passe (guard vérifié) |
| IC-002-01 | B répond "Info utile" sur alerte véhicule | A voit toast "✓ [plaque] a vu votre signalement" |
| IC-002-02 | A ouvre Activité → Véhicule | Badge "Vu par le conducteur" sur la card |
| ANGE-01 | Conducteur normal se connecte | Bouton ✦ visible en bas de carte |
| ANGE-02 | Gardien se connecte | Bouton ✦ visible + CSS is-gardien actif |

---

## DETTES RESTANTES APRÈS SESSION 15

| Ref | Description | Priorité |
|---|---|---|
| IC-004 | notificationIntensity(distance, severity) | P2 — terrain |
| DA-001 | reportPanel overlay 2 étapes cohérent | P3 — terrain |
| FLOW-005 labels | "Toujours là" / "Résolu" inadaptés pour véhicule | P3 |
| FloatingCard msg | callback btn1 "Vu" = null → topMsgBadge pas décrémenté | P4 |

---

## COMMITS DE RÉFÉRENCE

```
fix: IC-003 helper en route · IC-002 vu par conducteur · Ange Conducteur btn
```
