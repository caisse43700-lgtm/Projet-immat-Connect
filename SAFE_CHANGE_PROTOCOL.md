# SAFE CHANGE PROTOCOL

Objectif : eviter toute reecriture accidentelle d un gros fichier comme index.html.

## Regles obligatoires

1. Ne jamais modifier index.html directement sur main.
2. Creer une branche de travail avant toute modification HTML.
3. Ne jamais remplacer un fichier complet si une modification ciblee suffit.
4. Avant modification, lire le fichier et noter la zone exacte a modifier.
5. Appliquer une seule modification par commit.
6. Verifier le diff avant de continuer.
7. Si le diff montre une suppression massive, annuler immediatement.
8. Pour index.html, preferer ajouter un petit fichier JS separe puis le charger ensuite.

## Strategie pour index.html

Le fichier index.html est un fichier critique.

Toute modification doit etre limitee a une petite zone connue.

Pour charger de nouveaux modules, utiliser une branche dediee et ajouter uniquement les lignes script necessaires.

## Branche conseillee

Nom de branche : safe/html-script-load

## Verification attendue

Avant validation, le diff doit montrer uniquement quelques lignes ajoutees ou modifiees.

Si le diff remplace presque tout le fichier, la modification est invalide.

## Dernier incident connu

Une tentative de modification de index.html a reecrit le fichier avec un contenu tronque.

Correction appliquee : main a ete restaure sur le commit 7c41811f6392d7ed25f3d5be467d3f485cdc00c0.

Commit problematique a eviter : ee5442834bc6f3ab1ac2a88b482dc1d79ce4cb82.
