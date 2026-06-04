# APPLIQUER SESSION 13 — Guide copier-coller
> Fichier cible unique : `index.html`
> 5 modifications. Chercher le texte AVANT → remplacer par APRÈS.
> Ordre d'application : peu importe.

---

## ① FloatingCard — bouton 2 contextuel

**Chercher** (dans la fonction `addCommunityAlert`, ligne ~727) :

```
'Vu','→',()=>this.actConfirmAlert(saved.id,'seen'),()=>{this.navActivite?.();},saved.level)
```

**Remplacer par :**

```
'Vu',saved.group==='assist'?'✋ J\'aide':'🗺 Voir',()=>this.actConfirmAlert(saved.id,'seen'),saved.group==='assist'?()=>{this.actHelpReply?.(nPlate(saved.plate||''));}:()=>{App.actViewOnMap?.(saved.id);},saved.level)
```

---

## ② _actModCard — boucle aide (cards Activité principale)

**Chercher** (dans `App._actModCard`, ligne ~1084) :

```javascript
  let actions='';
  if(isOwn)actions=`<button class="act-mod-btn-del" onclick="App.actConfirmAlert('${e(a.id)}','gone')">Retirer</button>`;
  else if(a.group==='assist')actions=`<button class="act-mod-btn-reply" onclick="App.actHelpReply('${e(plate)}')">💬 Je peux aider</button>`;
```

**Remplacer par :**

```javascript
  let actions='';
  if(isOwn&&a.group==='assist')actions=`<button class="act-mod-btn-ok" onclick="App.actConfirmAlert('${e(a.id)}','resolved')">✓ Résolu</button><button class="act-mod-btn-del" onclick="App.actConfirmAlert('${e(a.id)}','gone')">Retirer</button>`;
  else if(isOwn)actions=`<button class="act-mod-btn-del" onclick="App.actConfirmAlert('${e(a.id)}','gone')">Retirer</button>`;
  else if(a.group==='assist')actions=`<button class="act-mod-btn-quick" onclick="App.actQuickReply('${e(plate)}','J\\'arrive, je viens vous aider.')">✋ J'arrive</button><button class="act-mod-btn-del" onclick="App.actQuickReply('${e(plate)}','Je ne peux pas aider cette fois.')">Je ne peux pas</button><button class="act-mod-btn-reply" onclick="App.actHelpReply('${e(plate)}')">💬 Contacter</button>`;
```

> Note : les blocs `else if(a.group==='vehicle'...)` et `else if(a.group==='route')` entre les deux `else if` ne changent pas.
> La ligne `if(a.lat!=null)actions+=...📍 Voir...` s'ajoute juste après (voir ⑤ ci-dessous si absent).

---

## ③ _actAlertCard — boucle aide (cards Activité détail catégorie)

**Chercher** (dans `App._actAlertCard`, ligne ~1156) :

```javascript
  let actions='';
  if(isOwn){
    actions=`<button class="act-btn-done" onclick="App.actConfirmAlert('${esc(a.id)}','gone')">Retirer mon signalement</button>`;
  } else if(item.type==='aide'){
    actions=`<button class="act-btn-reply" onclick="App.actHelpReply('${esc(plate)}')">Je peux aider →</button>`;
  }
```

**Remplacer par :**

```javascript
  let actions='';
  if(isOwn&&item.type==='aide'){
    actions=`<button class="act-btn-ok" onclick="App.actConfirmAlert('${esc(a.id)}','resolved')">✓ Résolu</button><button class="act-btn-done" onclick="App.actConfirmAlert('${esc(a.id)}','gone')">Retirer</button>`;
  } else if(isOwn){
    actions=`<button class="act-btn-done" onclick="App.actConfirmAlert('${esc(a.id)}','gone')">Retirer mon signalement</button>`;
  } else if(item.type==='vehicle'){
    actions=`<button class="act-btn-ok" onclick="App.actConfirmAlert('${esc(a.id)}','seen')">✓ Toujours là</button>
             <button class="act-btn-done" onclick="App.actConfirmAlert('${esc(a.id)}','resolved')">✓ Résolu</button>`;
  } else if(item.type==='route'){
    actions=`<button class="act-btn-ok" onclick="App.actConfirmAlert('${esc(a.id)}','present')">Toujours là</button>
             <button class="act-btn-done" onclick="App.actConfirmAlert('${esc(a.id)}','gone')">Disparu</button>`;
  } else if(item.type==='aide'){
    actions=`<button class="act-btn-ok" onclick="App.actQuickReply('${esc(plate)}','J\\'arrive, je viens vous aider.')">✋ J'arrive</button><button class="act-btn-done" onclick="App.actQuickReply('${esc(plate)}','Je ne peux pas aider cette fois.')">Je ne peux pas</button><button class="act-btn-reply" onclick="App.actHelpReply('${esc(plate)}')">💬 Contacter</button>`;
  }
  if(a.lat!=null)actions+=`<button class="act-btn-map" onclick="App.actViewOnMap('${esc(a.id)}')">📍 Voir</button>`;
```

---

## ④ actHelpReply — ouvre compose sans auto-envoi

**Chercher** (ligne ~1258) :

```javascript
App.actHelpReply=function(plate){
  if(!plate) return;
  this.panel('messages');
  try{
    if(window.ImmatMessages){
      window.ImmatMessages.sendToPlate?.(plate,'Je peux vous aider, où êtes-vous ?');
    }
  }catch(e){}
  toast('Message d\'aide envoyé à '+plate,'ok');
};
```

**Remplacer par :**

```javascript
App.actHelpReply=function(plate){
  if(!plate) return;
  this.panel('messages');
  try{
    if(window.ImmatMessages){
      ImmatMessages.setMode?.('compose');
      if($('icComposePlate'))$('icComposePlate').value=plate;
      setTimeout(()=>{try{$('icComposeText')?.focus()}catch(e){}},120);
    }
  }catch(e){}
};
```

---

## ⑤ navPremium — labels clarifiés

**Chercher** (dans `panelDrive`, ligne ~146) :

```html
<b id="limitVal">--</b>Vitesse
```

**Remplacer par :**

```html
<b id="limitVal">--</b>km/h
```

---

**Chercher** :

```html
<b id="trafficVal">--</b>Autour
```

**Remplacer par :**

```html
<b id="trafficVal">--</b>Proches
```

---

## Récapitulatif

| # | Zone | Chercher | Résultat |
|---|---|---|---|
| ① | FloatingCard | `'→',()=>this.navActivite` | bouton contextuel aide/route |
| ② | _actModCard | `if(isOwn)actions=...Retirer` | ✓ Résolu + J'arrive + Je ne peux pas |
| ③ | _actAlertCard | `Je peux aider →` | même boucle en vue détail |
| ④ | actHelpReply | `sendToPlate?.(plate,'Je peux…` | compose pré-rempli, pas d'auto-envoi |
| ⑤ | navPremium | `Vitesse` / `Autour` | `km/h` / `Proches` |
