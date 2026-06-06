# AI ENTRYPOINT

OBD = source des donnees vehicule.
IA = copilote central.
Guide = cadre metier.
Session = eviter les reconnexions inutiles.
Validation = requise avant action sensible.

Fichiers a renseigner :
- Interface principale : index.html
- Logique OBD : a creer, proposition core/obdGateway.js
- Controleur IA : a creer, proposition core/aiController.js
- Guide metier : core/brain.js, core/governance.js, core/invariants.js
- Gestion session : a creer, proposition core/obdSession.js

Regles :
- lire le vrai fichier avant modification ;
- ne pas reecrire tout le HTML a l aveugle ;
- modifier seulement la zone necessaire ;
- demander confirmation avant modification sensible.

Prochaines taches :
1. Identifier le fichier HTML principal. FAIT : index.html.
2. Identifier la logique OBD existante. ETAT : non trouvee, a creer proprement.
3. Completer les chemins des fichiers importants. EN COURS.
4. Mettre en place la session OBD.
5. Ajouter le message : Vous etes connecte a l OBD. Que voulez-vous faire ?
6. Ajouter les propositions d action apres connexion.
7. Ajouter handleAiRequest(message).
8. Ajouter les confirmations avant actions sensibles.

Solution judicieuse retenue :
- ne pas ajouter la logique OBD directement dans le HTML ;
- garder index.html comme interface principale ;
- ajouter des modules separes dans core/ ;
- brancher ensuite index.html vers ces modules avec des scripts dedies.
