# SESSION 14 — APPLIQUER LES CORRECTIONS BADGES

> Fichier cible : index.html
> Objectif : appliquer la séparation officielle :
>
> actBadge     = alertes
> topMsgBadge  = messages
>
> Décision Gardien SESSION 13.
> Alerte ≠ Message.

---

# ① renderActivityMain

## Chercher

```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length+msgs.filter(m=>m._received&&!m.read_at).length;
```

## Remplacer par

```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length;
```

## Raison

Avant :

```
catBadgeVehicle = alertes véhicule + messages non lus
```

Après :

```
catBadgeVehicle = alertes véhicule uniquement
```

Les messages appartiennent à `topMsgBadge`.

---

# ② updateActBadge

## Chercher

```javascript
const total=unreadMsgs+unreadAlerts;
try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{total,msgs:unreadMsgs,alerts:unreadAlerts,_src:'ImmatConnect/updateActBadge'})}catch(e){}
const badge=$('actBadge');
if(badge){badge.textContent=total>99?'99+':String(total);badge.style.display=total>0?'flex':'none';}
const legacy=$('topMsgBadge');
if(legacy){legacy.textContent=badgeFmt(total);legacy.style.display=total>0?'flex':'none';}
```

## Remplacer par

```javascript
try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{alerts:unreadAlerts,msgs:unreadMsgs,_src:'ImmatConnect/updateActBadge'})}catch(e){}
const badge=$('actBadge');
if(badge){badge.textContent=unreadAlerts>99?'99+':String(unreadAlerts);badge.style.display=unreadAlerts>0?'flex':'none';}
const legacy=$('topMsgBadge');
if(legacy){legacy.textContent=badgeFmt(unreadMsgs);legacy.style.display=unreadMsgs>0?'flex':'none';}
```

## Raison

Avant :

```
actBadge    = messages + alertes
topMsgBadge = messages + alertes
```

Après :

```
actBadge    = alertes uniquement
topMsgBadge = messages uniquement
```

---

# ③ updateCommunityStatus

## Chercher

```javascript
const mail=(Number(S.unreadMsgCount)||0)+pendingSignalCount();
```

## Remplacer par

```javascript
const mail=Number(S.unreadMsgCount)||0;
```

## Raison

Avant :

```
topMsgBadge = messages + alertes véhicule non vues
```

Après :

```
topMsgBadge = messages uniquement
```

Les alertes restent dans `actBadge`.

---

# RÉSULTAT FINAL

```
actBadge = catBadgeRoute + catBadgeVehicle + catBadgeAide
```

Alertes uniquement.

---

```
topMsgBadge = messages directs non lus
```

Conversations uniquement.

---

# RÈGLE OFFICIELLE

```
Activité = événements
Messages = conversations

Une alerte peut ouvrir une conversation.
Une conversation ne crée jamais d'alerte.
```

---

## Commit

```
918b762  fix: séparation badges actBadge (alertes) / topMsgBadge (messages)
```
