# APPLIQUER SESSION 14 — Guide copier-coller
> Fichier cible unique : `index.html`
> 3 modifications. Chercher le texte AVANT → remplacer par APRÈS.

---

## ① renderActivityMain — retirer les messages de catBadgeVehicle

**Chercher** (dans `App.renderActivityMain`, ligne ~940) :

```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length+msgs.filter(m=>m._received&&!m.read_at).length;
```

**Remplacer par :**

```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length;
```

**Pourquoi :** `catBadgeVehicle` ne doit contenir que des alertes véhicule. Les messages non lus appartiennent à `topMsgBadge`, pas à un badge d'alerte.

---

## ② updateActBadge — séparer actBadge (alertes) de topMsgBadge (messages)

**Chercher** (dans `App.updateActBadge`, ligne ~1284) :

```javascript
    const total=unreadMsgs+unreadAlerts;
    try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{total,msgs:unreadMsgs,alerts:unreadAlerts,_src:'ImmatConnect/updateActBadge'})}catch(e){}
    const badge=$('actBadge');
    if(badge){badge.textContent=total>99?'99+':String(total);badge.style.display=total>0?'flex':'none';}
    const legacy=$('topMsgBadge');
    if(legacy){legacy.textContent=badgeFmt(total);legacy.style.display=total>0?'flex':'none';}
```

**Remplacer par :**

```javascript
    try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{alerts:unreadAlerts,msgs:unreadMsgs,_src:'ImmatConnect/updateActBadge'})}catch(e){}
    const badge=$('actBadge');
    if(badge){badge.textContent=unreadAlerts>99?'99+':String(unreadAlerts);badge.style.display=unreadAlerts>0?'flex':'none';}
    const legacy=$('topMsgBadge');
    if(legacy){legacy.textContent=badgeFmt(unreadMsgs);legacy.style.display=unreadMsgs>0?'flex':'none';}
```

**Pourquoi :** Décision Gardien SESSION 13 — `actBadge` = événements (Route + Véhicule + Aide), `topMsgBadge` = conversations (messages directs). Ne jamais fusionner les deux.

---

## ③ updateCommunityStatus — retirer les alertes du badge messages

**Chercher** (dans `App.updateCommunityStatus`, ligne ~793) :

```javascript
const mail=(Number(S.unreadMsgCount)||0)+pendingSignalCount();
```

**Remplacer par :**

```javascript
const mail=Number(S.unreadMsgCount)||0;
```

**Pourquoi :** `pendingSignalCount()` compte les alertes véhicule non vues — ce sont des événements, pas des messages. Les inclure dans `topMsgBadge` mélangeait les deux catégories.

---

## Récapitulatif

| # | Fonction | Chercher | Résultat |
|---|---|---|---|
| ① | `renderActivityMain` | `+msgs.filter(m=>m._received&&!m.read_at).length` | catBadgeVehicle = alertes uniquement |
| ② | `updateActBadge` | `const total=unreadMsgs+unreadAlerts` | actBadge = alertes / topMsgBadge = messages |
| ③ | `updateCommunityStatus` | `+pendingSignalCount()` | topMsgBadge = messages uniquement |

---

## Résultat final

```
actBadge     = catBadgeRoute + catBadgeVehicle + catBadgeAide   (alertes seules)
topMsgBadge  = messages directs non lus                         (messages seuls)
```
