# RÉFLEXION — FLUX ET NOTIFICATIONS
> Bloc de questions ouvertes SESSION 13
> À trancher avant toute implémentation de notifications ou de routing

---

## PRINCIPE DE BASE À VALIDER

> Toute action d'un conducteur A produit **deux états visuels** :
> un état chez A (confirmation) et un état chez B (réception).
> Ces deux états doivent être localisables précisément dans l'interface.

---

## BLOC 1 — AIDE

### Quand A clique sur "Aide" (Panne, Carburant, etc.)

**Questions côté A :**
- Où A voit-il que sa demande est active ? Sur la carte uniquement ? Dans Activité aussi ?
- Dans quel onglet de Activité ? "Envoyés" → groupe "assist" ? Ou un onglet dédié "Mes demandes" ?
- A voit-il combien de conducteurs ont vu sa demande ? (aujourd'hui : non)
- Quand quelqu'un répond "J'arrive" → où A reçoit-il ça ? FloatingCard ? Badge messages ? Badge Activité ?
- Comment A clôture-t-il sa demande ? Dans Activité → card → bouton "Résolu" ? Sur le marqueur carte ?

**Questions côté B (helper potentiel) :**
- Où B voit-il la demande d'aide de A ? Sur la carte (marqueur) ? Toast ? Badge Activité ?
- Dans quel onglet de Activité B trouve-t-il les demandes d'aide reçues ? "Reçus" groupe "assist" ? Séparé ?
- Quel badge s'incrémente ? `actBadge` (nav bas) ? `catBadgeAide` ? Les deux ?
- Quand B dit "J'arrive" → dans quel panel B gère-t-il la suite ? Dans Activité ou dans Messages ?

**Question de cohérence :**
- L'aide est-elle un message ou une alerte ? Aujourd'hui elle est dans Activité (alerte). Mais la réponse passe par Messages (conversation). Cette séparation est-elle claire pour l'utilisateur ou confuse ?

---

## BLOC 2 — MESSAGE DIRECT

### Quand A envoie un message à B

**Questions côté A :**
- Après envoi : toast seul, ou badge Envoyés mis à jour également ?
- A voit-il que B a lu ? (aujourd'hui : non) — Si on l'ajoute, où ? Dans le thread, sous le message ?

**Questions côté B :**
- B reçoit quoi en premier ? Toast + badge top-bar seulement ? FloatingCard aussi ?
- Dans quel onglet B trouve-t-il le message ? "Reçus" dans Messages — OK. Mais est-ce que Activité s'incrémente aussi ? (aujourd'hui : non pour les messages simples)
- Si B est sur une autre page (panelDrive, panelSettings) et reçoit un message → que se passe-t-il visuellement ? Badge seulement ? Toast par-dessus ?
- Si B reçoit 3 messages de 3 personnes différentes pendant qu'il conduit → qu'est-ce qu'il voit ? 3 toasts empilés ? Un seul badge cumulatif ?

---

## BLOC 3 — ALERTE VÉHICULE

### Quand A signale un problème sur le véhicule de B

**Questions côté B :**
- B reçoit FloatingCard (déjà implémenté). Mais aussi badge Activité ? Les deux en même temps ?
- Si B est en train de conduire (panelDrive ouvert), la FloatingCard apparaît par-dessus ? Elle masque la navigation GPS ?
- Si B appuie "Vu" sur la FloatingCard → la card dans Activité passe-t-elle automatiquement en "lu" ? (aujourd'hui : pas certain)
- Si B rate la FloatingCard (elle disparaît en 8s) → où retrouve-t-il l'alerte ? Activité → Reçus → Véhicule ?

**Questions côté A :**
- A sait-il quand B a vu ? (aujourd'hui : non) — Si on ajoute ce retour, où A le voit-il ? Dans Activité → Envoyés → card de l'alerte ? Badge discret ?

---

## BLOC 4 — SIGNALEMENT ROUTE (broadcast)

### Quand A signale accident / bouchon

**Questions pour tous les B proches :**
- Toast seul ou FloatingCard aussi ? (selon le niveau d'urgence ?)
- Badge Activité s'incrémente → quel nombre affiché ? Total alertes actives ? Ou seulement non lues ?
- Si B ne regarde pas l'écran (téléphone en mode conduite) → son appareil fait-il un son ? Une vibration ? Actuellement : dépend des paramètres sons de Settings.
- Alerte bouchon à 3km vs accident à 100m → même notification ? Devrait-il y avoir une différence de traitement selon la distance ?

---

## BLOC 5 — POSITIONNEMENT DES BADGES (architecture globale)

Il existe **4 badges distincts** dans l'interface. Lequel s'incrémente pour quoi ?

| Badge | ID | Incrémenté par | Aujourd'hui clair ? |
|---|---|---|---|
| Badge nav Activité | `actBadge` | Toutes les alertes + messages ? | ⚠ à vérifier |
| Badge catégorie Route | `catBadgeRoute` | Alertes route non lues | Oui |
| Badge catégorie Véhicule | `catBadgeVehicle` | Alertes véhicule non lues | Oui |
| Badge catégorie Aide | `catBadgeAide` | Demandes aide non lues | Oui |
| Badge top-bar messages | `topMsgBadge` | Messages reçus non lus | Partiellement visible |

**Questions ouvertes :**
- Quand `actBadge` atteint 5 non-lus, qu'est-ce que ça signifie exactement pour l'utilisateur ? Messages + alertes mélangés ?
- Si l'utilisateur lit les alertes Route mais pas les autres → `actBadge` descend partiellement ? Ou seulement à 0 quand tout est lu ?
- Le badge messages top-bar et le badge Activité nav-bas sont-ils redondants ? Faut-il les unifier ?

---

## BLOC 6 — CLARTÉ DES ONGLETS

### panelActivite : Reçus / Envoyés

**Questions :**
- "Reçus" = alertes véhicule reçues + messages reçus + demandes aide proches. Est-ce que l'utilisateur comprend que tout ça est dans le même onglet ?
- "Envoyés" = alertes que j'ai envoyées + messages que j'ai envoyés. Idem.
- La séparation par catégorie (Route / Véhicule / Aide) suffit-elle à distinguer les types ?
- Faut-il séparer "Messages" de "Alertes" en deux onglets distincts ? (DA-003 — non tranchée)

### panelMessages : Reçus / Envoyés / Nouveau

**Questions :**
- "Reçus" dans Messages = seulement les conversations personnelles. Pas les alertes. C'est clair ?
- Le conducteur qui cherche la réponse à son alerte va-t-il chercher dans Messages ou dans Activité ?
- Si B répond à une alerte via quick reply "Je vérifie" → ce message atterrit dans Messages chez A. A doit-il chercher dans Messages ou Activité pour le retrouver ?

---

## RÉSUMÉ DES QUESTIONS BLOQUANTES

> Ces questions n'ont pas encore de réponse validée.
> Avant d'implémenter quoi que ce soit lié aux notifications,
> chacune doit être tranchée.

1. **Aide** : l'aide est-elle une alerte ou un message côté A ? côté B ?
2. **Retour alerte vue** : où atterrit le retour quand B confirme une alerte de A ?
3. **Badge unifié ou séparé** : `actBadge` + `topMsgBadge` — un seul compteur ou deux ?
4. **Activité vs Messages** : si la réponse à une alerte passe par Messages, comment l'utilisateur retrouve le fil ?
5. **FloatingCard par-dessus GPS** : acceptable ou bloquant en mode conduite ?
6. **Notification selon distance** : un bouchon à 500m mérite-t-il la même alerte qu'un à 5km ?

---

> Quand tu dis "fait" sur un de ces blocs → on implémente la réponse choisie.
