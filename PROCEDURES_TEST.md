# ImmatConnect Pro — Procédures de test par fonctionnalité

---

## Comment exécuter les tests automatisés

```bash
node tests.js
```

Aucune installation requise. Node.js suffit.

---

## Procédure 1 — Authentification & Profil

**Objectif :** vérifier que la connexion et la création de profil fonctionnent.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Ouvrir l'app | Écran de connexion affiché |
| 2 | S'inscrire avec un email valide | Email de confirmation reçu |
| 3 | Confirmer l'email | Redirection vers écran profil |
| 4 | Remplir pseudo + plaque (ex: AB-123-CD) + téléphone | Champs validés sans erreur |
| 5 | Enregistrer | Carte s'affiche, toast "Connecté à ImmatConnect" |
| 6 | Recharger la page | Session restaurée automatiquement, pas de reconnexion demandée |

**Cas limites :**
- Plaque invalide (ex: ABC-12-CD) → message d'erreur
- Téléphone invalide (ex: 123) → message d'erreur
- Email déjà utilisé → message "compte existant"

---

## Procédure 2 — Carte & Géolocalisation

**Objectif :** vérifier que la position est affichée et mise à jour.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Autoriser la géolocalisation | Marqueur de ta position apparaît sur la carte |
| 2 | Se déplacer (ou simuler) | Marqueur se déplace en temps réel |
| 3 | Ouvrir l'app sur un 2ème appareil | Les deux véhicules se voient mutuellement |
| 4 | Changer le rayon (sélecteur) | Seuls les véhicules dans le rayon s'affichent |
| 5 | Activer mode Invisible | Marqueur retiré de la carte des autres |

**Reconnect automatique (Bug #6 corrigé) :**
- Couper le réseau 10 secondes puis le rétablir
- Les positions reprennent à s'afficher dans les 5 secondes

---

## Procédure 3 — Envoi de message (Contact)

**Objectif :** vérifier qu'un message part et arrive correctement.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Saisir une plaque destinataire connue | Champ accepte la plaque |
| 2 | Écrire un message | Champ texte rempli |
| 3 | Envoyer | Toast "Message envoyé à XX-XXX-XX" |
| 4 | Sur le compte destinataire | Toast + floating card "💬 Message de..." apparaît |
| 5 | Cliquer "Répondre →" sur la floating card | Onglet Messages s'ouvre sur la bonne conversation |

**Test realtime (Bug #8 corrigé) :**
- Ouvrir la console navigateur sur le compte destinataire
- Envoyer un message depuis le compte expéditeur
- Vérifier qu'il n'y a qu'**un seul** appel réseau vers Supabase (pas deux en parallèle)

---

## Procédure 4 — Onglet Activité : navigation

**Objectif :** vérifier la navigation entre les panneaux.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Cliquer sur "Activité" dans la nav | Panneau principal s'affiche (3 cartes + Résumé rapide) |
| 2 | Cliquer sur "Véhicule" | Sous-panneau Véhicule s'ouvre, onglets Reçus/Envoyés/Nouveau visibles |
| 3 | Cliquer "‹" retour | Retour au panneau principal |
| 4 | Cliquer "Voir tout ›" | Sous-panneau "all" s'ouvre |
| 5 | Cliquer "Route" | Sous-panneau Route s'ouvre (onglet Nouveau visible) |

---

## Procédure 5 — Onglet Activité > Reçus

**Objectif :** vérifier que les messages reçus apparaissent bien.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Recevoir un message depuis un 2ème compte | Badge rouge apparaît sur l'onglet Activité |
| 2 | Ouvrir Activité > Véhicule > Reçus | La conversation du 2ème compte est listée |
| 3 | Ouvrir immédiatement après connexion (sans attente) | Messages visibles dès l'ouverture (Bug #1 corrigé) |
| 4 | Lire le message | Badge diminue ou disparaît |
| 5 | Supprimer la conversation | Elle disparaît de la liste et le badge se met à jour (Bug A corrigé) |

**Test Bug #1 (myPlate vide) :**
- Se déconnecter puis se reconnecter
- Ouvrir Activité immédiatement (< 1 seconde)
- Les messages liés par plaque doivent être visibles sans attendre

---

## Procédure 6 — Onglet Activité > Envoyés

**Objectif :** vérifier que les messages envoyés apparaissent bien.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Envoyer un message depuis l'onglet Contact | Toast de confirmation |
| 2 | Aller dans Activité > Véhicule > Envoyés | La conversation envoyée est listée |
| 3 | Vérifier _otherPlate | La plaque affichée est celle du destinataire (pas la mienne) |
| 4 | Envoyer plusieurs messages au même destinataire | Une seule conversation (groupée par plaque) |

---

## Procédure 7 — Signalement & Alertes

**Objectif :** vérifier l'envoi et la réception des signalements.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Appuyer sur "⚠️ Signaler" | Panneau signalement s'ouvre |
| 2 | Choisir "Accident" | Confirmation "Signalement envoyé" |
| 3 | Sur les autres comptes proches | Floating card "💥 Accident" apparaît |
| 4 | Signaler un véhicule par plaque | Le propriétaire reçoit **une seule** floating card (Bug #7 corrigé, plus de double toast) |
| 5 | Cliquer "Toujours là" | Alerte confirmée, badge Activité ne s'incrémente pas (déjà corrigé PR #24) |
| 6 | Cliquer "Disparu" | Alerte retirée, badge Activité diminue |

**Test Bug #7 (double alerte) :**
- Compte A signale le véhicule AB-123-CD
- Sur le compte AB-123-CD : vérifier qu'il n'y a qu'**une seule** notification visuelle (floating card), pas de toast supplémentaire

---

## Procédure 8 — Résilience Realtime (reconnect)

**Objectif :** vérifier que les channels reprennent après une coupure réseau.

| Canal | Test | Résultat attendu |
|-------|------|-----------------|
| Positions (ic_loc) | Couper réseau 10s → rétablir | Positions reprennent dans les 5s (Bug #6 corrigé) |
| Reports (ic_reports) | Couper réseau 10s → rétablir | Alertes vehicule reprennent dans les 5s (Bug #6 corrigé) |
| Messages (ic_msg) | Couper réseau 10s → rétablir | Messages reprennent dans les 5s (déjà géré avant) |
| Alertes (ic_community_live) | Couper réseau 10s → rétablir | Signalements reprennent dans les 5s |

---

## Procédure 9 — Logout & Multi-comptes

**Objectif :** vérifier qu'aucune donnée du compte A ne fuite sur le compte B.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Se connecter avec le compte A | Messages du compte A visibles |
| 2 | Se déconnecter | Retour à l'écran de login |
| 3 | Se connecter avec le compte B | Messages du compte B (pas ceux de A) |
| 4 | Vérifier l'onglet Activité du compte B | Aucune conversation fantôme de A (Bug Anomalie 2 corrigé PR #25) |
| 5 | Envoyer un message depuis un 3ème compte vers B | Badge s'incrémente bien sur B (pas sur A) |

---

## Résumé des bugs couverts par les procédures

| Bug | Procédure | Corrigé dans |
|-----|-----------|-------------|
| Bug A — badge bloqué après suppression | 5, 6 | PR #25 |
| Bug Anomalie 1 — badge temps réel | 3, 5 | PR #25 |
| Bug Anomalie 2 — channel fantôme logout | 9 | PR #25 |
| Bug #1 — myPlate vide au boot | 5 | PR #26 |
| Bug #6 — channels morts silencieux | 8 | PR #26 |
| Bug #7 — double alerte visuelle | 7 | PR #26 |
| Bug #8 — double refresh SQL | 3 | PR #26 |
