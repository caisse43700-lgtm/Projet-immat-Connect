# ImmatConnect Pro — Point d'entrée IA

## ⚑ LIRE EN PREMIER : PROJECT_STATE.md

Avant toute action, lire intégralement :

```
PROJECT_STATE.md
```

Ce fichier est le tableau de bord de continuité unique du projet. Il contient :
- l'état actuel (ce qui fonctionne, ce qui bloque) ;
- la dernière mission terminée et le commit correspondant ;
- la prochaine mission recommandée avec l'ordre exact des actions ;
- les décisions validées (à ne pas remettre en question) ;
- les connaissances critiques à ne jamais perdre ;
- les règles anti-régression.

## Règle absolue

```
PROJECT_STATE.md est le point de reprise unique.
SESSION-CONTINUATION.md est le journal technique détaillé (historique, bugs, fixes).
docs/IMPLEMENTATION_GAP_ANALYSIS.md est le plan d'exécution (matrice + roadmap + top 20).
docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md est la référence fonctionnelle et produit.

Hiérarchie : PROJECT_STATE.md → SESSION-CONTINUATION.md → IMPLEMENTATION_GAP_ANALYSIS.md → AUDIT_V2.md
```

## Avant de quitter

Mettre à jour **dans cet ordre** :

1. `PROJECT_STATE.md` :
   - section "2. DERNIÈRE MISSION TERMINÉE" : décrire ce qui vient d'être fait + SHA commit
   - section "3. MISSION EN COURS" : vider ou indiquer le statut
   - section "4. PROCHAINE MISSION RECOMMANDÉE" : mettre à jour si changé
   - section "MISE À JOUR — Historique" : ajouter une ligne avec la date et le résumé

2. `SESSION-CONTINUATION.md` :
   - Ajouter l'état technique détaillé, les bugs rencontrés, les fixes appliqués.

Commiter les deux fichiers dans le même commit que le code.

## Règle de mise à jour PROJECT_STATE.md

```
À chaque mission terminée → PROJECT_STATE.md mis à jour obligatoirement.
PROJECT_STATE.md est la première lecture pour toute IA ou développeur reprenant le projet.
Ne jamais terminer une session sans mettre PROJECT_STATE.md à jour.
```
