# TOUT CE QUI A ÉTÉ FAIT — SESSION 14

> Date : 2026-06-02
> Branche : claude/immatconnect-pro-app-dEKGR

---

# CONTEXTE SESSION 14

SESSION 14 est une session de consolidation.

Aucune nouvelle architecture n'a été créée.

Deux objectifs uniquement :

1. Commiter le fichier UX-NOTIFICATION-MATRIX créé en SESSION 13 mais non poussé.
2. Appliquer la décision Gardien de séparation stricte entre alertes et conversations.

Principe désormais officiel :

> Activité = événements
> Messages = conversations
> Une alerte peut ouvrir une conversation.
> Une conversation ne crée jamais d'alerte.

---

# FICHIER : architecture/ux/UX-NOTIFICATION-MATRIX.json

## Commit

```
2dc81c3 docs: grammaire canonique des flux de notification — UX-NOTIFICATION-MATRIX.json
```

Le fichier avait été produit en SESSION 13 mais n'avait jamais été commité.
SESSION 14 l'intègre officiellement au dépôt.

---

## Contenu principal

### Principe

> Alerte ≠ Message

### Séparation des badges

**actBadge = événements uniquement**

Contient :
- catBadgeRoute
- catBadgeVehicle
- catBadgeAide

Ne contient jamais : Messages directs

---

**topMsgBadge = conversations uniquement**

Contient :
- Messages directs
- Réponses aux alertes
- Réponses aux demandes d'aide

Ne contient jamais : Alertes

---

### Intensité des notifications

Distance ↓ → Critique / Urgent / Important / Info

avec comportement :
- FloatingCard
- Toast
- Badge
- Marqueur seul

selon gravité et distance.

---

### Flows documentés

```
FLOW-001  Demande aide
FLOW-002  Helper arrive
FLOW-003  Helper indisponible
FLOW-004  Aide résolue
FLOW-005  Alerte véhicule
FLOW-006  Message direct
FLOW-007  Signalement route
FLOW-008  Confirmation route
```

Chaque flow répond aux 7 questions officielles :
1. Où A déclenche
2. Où A confirme
3. Où A suit
4. Où B reçoit
5. Où B agit
6. Où A voit le retour
7. Comment le cycle se clôture

---

# FICHIER : index.html

## Commit

```
918b762 fix: séparation badges actBadge (alertes) / topMsgBadge (messages)
```

---

## Correction ① — renderActivityMain

### Chercher : `const bVehicle=`

AVANT :
```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length+msgs.filter(m=>m._received&&!m.read_at).length;
```

APRÈS :
```javascript
const bVehicle=activeAlerts.filter(a=>a.group==='vehicle'||a.type==='vehicule').length;
```

**Pourquoi :** `catBadgeVehicle` doit représenter uniquement des alertes véhicule. Les messages n'ont pas leur place dans ce badge.

---

## Correction ② — updateActBadge()

### Chercher : `const total=unreadMsgs+unreadAlerts`

AVANT :
```javascript
const total=unreadMsgs+unreadAlerts;
try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{total,msgs:unreadMsgs,alerts:unreadAlerts,_src:'ImmatConnect/updateActBadge'})}catch(e){}
const badge=$('actBadge');
if(badge){badge.textContent=total>99?'99+':String(total);badge.style.display=total>0?'flex':'none';}
const legacy=$('topMsgBadge');
if(legacy){legacy.textContent=badgeFmt(total);legacy.style.display=total>0?'flex':'none';}
```

APRÈS :
```javascript
try{window.ImmatOrganism?.observe?.('BADGE_RECOMPUTED',{alerts:unreadAlerts,msgs:unreadMsgs,_src:'ImmatConnect/updateActBadge'})}catch(e){}
const badge=$('actBadge');
if(badge){badge.textContent=unreadAlerts>99?'99+':String(unreadAlerts);badge.style.display=unreadAlerts>0?'flex':'none';}
const legacy=$('topMsgBadge');
if(legacy){legacy.textContent=badgeFmt(unreadMsgs);legacy.style.display=unreadMsgs>0?'flex':'none';}
```

**Pourquoi :** Les deux badges montraient exactement la même valeur (msgs + alertes). Désormais :
- `actBadge` = alertes non traitées
- `topMsgBadge` = messages non lus

Exemple — 3 alertes + 5 messages :

| | Avant | Après |
|---|---|---|
| actBadge | 8 | 3 |
| topMsgBadge | 8 | 5 |

---

## Correction ③ — updateCommunityStatus()

### Chercher : `const mail=`

AVANT :
```javascript
const mail=(Number(S.unreadMsgCount)||0)+pendingSignalCount();
```

APRÈS :
```javascript
const mail=Number(S.unreadMsgCount)||0;
```

**Pourquoi :** `pendingSignalCount()` compte les alertes véhicule non vues. Ces alertes restent dans `actBadge` et ne doivent pas polluer `topMsgBadge`.

---

# RÉSUMÉ DES MODIFICATIONS SESSION 14

| Élément | Type | Résultat |
|---|---|---|
| UX-NOTIFICATION-MATRIX.json | Documentation | Commit officiel |
| catBadgeVehicle | JS | Messages retirés |
| actBadge | JS | Alertes uniquement |
| topMsgBadge | JS | Messages uniquement |
| updateCommunityStatus | JS | Retrait des alertes du compteur messages |

**Bilan** : 2 commits, -7 lignes, 0 nouvelle architecture.

---

# ÉTAT GLOBAL APRÈS SESSION 14

| Dimension | Statut |
|---|---|
| Architecture | TERMINÉE ✅ |
| Documentation | TERMINÉE ✅ |
| Système nerveux | TERMINÉ ✅ |
| Pipeline Ange Gardien | TERMINÉ ✅ |
| Classification UX | TERMINÉE ✅ |
| UX-NOTIFICATION-MATRIX | TERMINÉ ✅ |
| Séparation badges | TERMINÉE ✅ |
| Boucle aide | 90% ✅ |
| FloatingCard contextuelle | CORRIGÉE ✅ |
| Voir sur carte (MORT-002) | CORRIGÉ ✅ |
| navPremium labels | CORRIGÉS ✅ |
| Validation terrain | EN COURS 🚀 |
| Ange Conducteur | À COMMENCER |

---

# CE QUI RESTE À FAIRE

## Dettes encore ouvertes

| Ref | Description | Statut |
|---|---|---|
| IC-002 | "Vu par le conducteur" dans Activité → Envoyés | Reporté terrain |
| FLOW-002 | "Helper en route" dans card aide côté A | Reporté terrain |
| FLOW-007 | Intensité notification selon distance | Reporté terrain |
| DA-001 | reportPanel en 2 étapes | Validé non implémenté |
| DA-004 | Blocage : localStorage ou DB | Décision non prise |

## Ange Conducteur — 6 décisions non tranchées

1. `brain-dialog` ou endpoint dédié `brain-driver` ?
2. Bouton ✦ dédié conducteur ou partagé selon rôle ?
3. Contexte injecté exact ?
4. `requiresGuardianValidation` : `true` ou `false` ?
5. NS depth 1 ou depth 2 ?
6. Niveau d'autonomie : réponse directe ou confirmation ?

---

# DIRECTIVE GARDIEN

> Phase Architecture : TERMINÉE
> Phase Validation Terrain : EN COURS
>
> Le prochain travail doit porter sur :
> - l'usage réel
> - les comportements réels
> - les frictions réelles
>
> et non sur une nouvelle couche d'architecture.

**Filtre actif : TRF-006 — Quel coût réel cette modification réduit-elle ?**
