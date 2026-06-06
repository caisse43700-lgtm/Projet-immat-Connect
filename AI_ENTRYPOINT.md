# AI ENTRYPOINT

OBD = source des donnees vehicule.
IA = copilote central.
Guide = cadre metier.
Session = eviter les reconnexions inutiles.
Validation = requise avant action sensible.

Fichiers a renseigner :
- Interface principale :
- Logique OBD :
- Controleur IA :
- Guide metier :
- Gestion session :

Regles :
- lire le vrai fichier avant modification ;
- ne pas reecrire tout le HTML a l aveugle ;
- modifier seulement la zone necessaire ;
- demander confirmation avant modification sensible.

Prochaines taches :
1. Identifier le fichier HTML principal.
2. Identifier la logique OBD existante.
3. Completer les chemins des fichiers importants.
4. Mettre en place la session OBD.
5. Ajouter le message : Vous etes connecte a l OBD. Que voulez-vous faire ?
6. Ajouter les propositions d action apres connexion.
7. Ajouter handleAiRequest(message).
8. Ajouter les confirmations avant actions sensibles.
