# SESSION 14 — CORRECTION DES BADGES

> Fichier cible : index.html
>
> Objectif :
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

## Effet

### Avant

```
catBadgeVehicle = alertes véhicule + messages non lus
```

### Après

```
catBadgeVehicle = alertes véhicule uniquement
```

Les messages sont désormais comptabilisés uniquement dans `topMsgBadge`.

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

## Effet

### Avant

```
actBadge    = messages + alertes
topMsgBadge = messages + alertes
```

### Après

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

## Effet

### Avant

```
topMsgBadge = messages + alertes véhicule non vues
```

### Après

```
topMsgBadge = messages uniquement
```

Les alertes restent dans `actBadge`.

---

# RÉSULTAT FINAL

## Badge Activité

```
actBadge = catBadgeRoute + catBadgeVehicle + catBadgeAide
```

Contient uniquement :
- Alertes route
- Alertes véhicule
- Demandes d'aide

---

## Badge Messages

```
topMsgBadge = messages directs non lus
```

Contient uniquement :
- Conversations
- Réponses aux alertes
- Réponses aux demandes d'aide

---

# RÈGLE OFFICIELLE

```
Activité = événements
Messages = conversations

Une alerte peut ouvrir une conversation.
Une conversation ne crée jamais d'alerte.
```

---

# IMPACT UX

### Avant

3 alertes + 5 messages :

```
actBadge    = 8
topMsgBadge = 8
```

L'utilisateur ne distingue pas ce qui relève :
- d'une action à traiter
- d'une conversation à lire

### Après

3 alertes + 5 messages :

```
actBadge    = 3
topMsgBadge = 5
```

Le conducteur comprend immédiatement :

```
Ce qui demande une action ≠ Ce qui relève d'une conversation
```

---

# ARCHITECTURE VALIDÉE

```
actBadge    = catBadgeRoute + catBadgeVehicle + catBadgeAide
topMsgBadge = messages directs non lus
Activité    = événements
Messages    = conversations
```

---

# COMMIT DE RÉFÉRENCE

```
918b762  fix: séparation badges actBadge (alertes) / topMsgBadge (messages)
```

---

# STATUT

✅ SESSION 14 APPLIQUÉE

✅ Cohérent avec UX-NOTIFICATION-MATRIX.json

✅ Cohérent avec FLOW-001 → FLOW-008

✅ Cohérent avec la règle : Alerte ≠ Message
