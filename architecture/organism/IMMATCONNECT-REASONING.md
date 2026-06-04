# Amélioration Navigation Fonctionnalités

# IMMATCONNECT — RAISONNEMENT FONDATEUR

> SESSION 30 — Document de référence permanent
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## POURQUOI CE DOCUMENT

Les décisions architecturales se délitent quand leur origine est oubliée.
Ce document fixe le raisonnement, pas les règles. Les règles sont dans `ORGANISM-RULES.json`.

---

## CE QUI CIRCULE DANS L'ORGANISME

Pas les données. Pas les messages. Pas les événements.

**L'attention.**

Conséquence : chaque écran, chaque action, chaque alerte demande un fragment de l'attention du conducteur.
Ajouter une fonctionnalité coûte de l'attention. L'attention est la ressource rare.

---

## POURQUOI UNE SEULE SOURCE DE VÉRITÉ

```
ADN → Constitution → NS → Référentiel
```

Chaque niveau dérive du précédent. Aucun n'existe indépendamment.

Si deux fichiers disent des choses différentes sur la même réalité, l'un est mensonger.
Et l'organisme développe une fièvre : deux comportements contradictoires pour la même intention.

**Règle** : quand on veut changer quelque chose, on remonte jusqu'à la source. On ne crée pas un deuxième fichier.

---

## POURQUOI ANGE NE POSSÈDE RIEN

Ange est un interprète. Il lit le NS, lit le référentiel, lit le contexte du conducteur.
Il relie. Il ne stocke pas.

Si Ange avait sa propre base de connaissance, il y aurait deux vérités sur ce que peut faire l'app.
Le conducteur obtiendrait des réponses contradictoires selon qu'il lit l'interface ou pose une question à Ange.

**Ce qui tue la confiance** : une app qui dit une chose et un assistant qui dit autre chose.

---

## POURQUOI L'INTENTION AVANT LA FONCTIONNALITÉ

Un conducteur qui pense "je veux prévenir quelqu'un" n'est pas en train de penser "je veux appuyer sur le bouton ⚠️".

L'interface est une traduction. Si on commence par l'interface, on traduit sans avoir le texte original.
On obtient des fonctionnalités que personne ne cherche.

**La règle** : trouver l'intention → trouver l'organe → trouver le chemin. Jamais l'inverse.

---

## POURQUOI LES CINQ SENS NE CHANGENT PAS

Les sens définissent ce que l'organisme **peut** faire, pas ce qu'il **fait**.
Les phases définissent ce qui est actif maintenant.

Changer les sens = changer la nature de l'organisme.
Les phases progressent. Les sens sont stables.

---

## POURQUOI LES BOUCLES VITALES, PAS LES ORGANES

Un organe qui ne ferme aucune boucle est un organe mort.
Il consomme de l'attention sans en restituer.

**Exemple** : si l'onglet Activité ne ferme pas la boucle CONFIANCE (le conducteur voit que son signalement a été utile), l'onglet perd de sa valeur à chaque ouverture.

L'évolution doit renforcer les boucles. Ajouter un organe ne fait pas vivre l'organisme.

---

## POURQUOI LA DETTE DE COMPRÉHENSION EST LE VRAI RISQUE

La dette technique se mesure et se rembourse. Elle est visible dans le code.

La dette de compréhension est invisible. Elle s'accumule dans la tête du conducteur.

**Symptôme** : le conducteur n'utilise pas une fonctionnalité parce qu'il ne comprend pas ce qu'elle fait.
**Conséquence** : l'organisme grossit mais rapetisse dans l'esprit du conducteur.

**Remède** : avant d'ajouter, vérifier que le conducteur comprendra sans explication.

---

## DÉCISIONS QUI NE DOIVENT PAS ÊTRE REDISCUTÉES

| Décision | Raison |
|---|---|
| Pas de ADN_v2 / NS_v2 / Référentiel_v2 | Une deuxième version = une deuxième vérité = divergence |
| Ange ne possède rien | Éviter deux vérités concurrentes |
| Intention avant fonctionnalité | Le conducteur part de son besoin, pas de l'interface |
| Carte = Maintenant / Activité = Passé / Messages = Communication | Invariant UX — mélanger crée de la confusion |
| Statuts alertes non unifiés | `seen ≠ present`, `gone ≠ resolved` — sémantiques protégées |
| ic_blocked en localStorage | DA-004 Option C — cross-device est un cas rare |
| Constitution INV-001→INV-015 inchangée | deepFrozen en production |

---

## CE QUE L'ORGANISME DOIT ÊTRE DANS DIX ANS

Pas plus complexe.
Plus évident.

Un conducteur qui ouvre l'app pour la première fois doit comprendre, en 30 secondes, ce qu'il peut faire.
Pas parce qu'il y a un tutoriel. Parce que les intentions sont visibles.
