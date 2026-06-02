# UX-DECISIONS — ImmatConnect
> Décisions validées, en attente, rejetées.
> Source : INVENTAIRE-PRODUIT.md · SPEC.md · CONSTITUTION.md · sessions de travail
> Règle : toute décision est datée. Toute décision rejetée explique pourquoi.

---

## DÉCISIONS VALIDÉES

### D-001 — panelContact SUPPRIMÉ
- **Quoi** : Le panel legacy `#panelContact` est obsolète.
- **Pourquoi** : `panelMessages` le remplace entièrement. ui.js redirige déjà.
- **Action** : Supprimer du DOM après confirmation que 0 accès directs subsistent.
- **Statut** : Validée — à implémenter

### D-002 — CallManager = seul gestionnaire des appels
- **Quoi** : Tout contact téléphonique passe par `CallManager`, jamais directement.
- **Pourquoi** : Consentement explicite requis (INV-010). Numéro jamais partagé sans accord.
- **Statut** : Validée — implémentée

### D-003 — Messages ≠ Alertes — séparation stricte
- **Quoi** : `panelMessages` = conversations personnelles. `panelAltet` = alertes route/aide.
- **Pourquoi** : INV-001 / INV-002 / INV-003. Canaux séparés. Pas de croisement.
- **Statut** : Validée — implémentée

### D-004 — La confiance évalue les INTERACTIONS, pas les PERSONNES
- **Quoi** : Pas de score public. Pas de réputation personnelle.
- **Pourquoi** : ADN-6, D-001 (pas de réseau social), INV-010.
- **Statut** : Validée — pas d'implémentation scoring public

### D-005 — SOS protégé par appui long ou confirmation
- **Quoi** : Le SOS ne peut pas être déclenché par un simple tap.
- **Pourquoi** : Risque de fausse alerte. Action irréversible (INV-009).
- **Statut** : Validée — à implémenter (P1)

### D-006 — owner_plate immuable après création
- **Quoi** : La plaque d'immatriculation ne peut pas être modifiée.
- **Pourquoi** : INV-006. Identité véhicule canonique.
- **Statut** : Validée — implémentée (DB + UI bloque modification)

### D-007 — Debug tools hors paramètres utilisateur
- **Quoi** : "Restaurer msgs" et "Sync alertes" n'appartiennent pas aux paramètres conducteur.
- **Pourquoi** : P-011. Ces outils sont pour le Gardien, pas l'utilisateur.
- **Statut** : Validée — à implémenter (P2)

### D-008 — Activité = REÇUS uniquement (pas onglet Nouveau)
- **Quoi** : L'onglet "Nouveau" dans Activité redirige inutilement vers navSignaler.
- **Pourquoi** : Friction, confusion. L'utilisateur ne comprend pas pourquoi "Nouveau" = signaler.
- **Statut** : Validée — à corriger (P1)

---

## DÉCISIONS EN ATTENTE

### DA-001 — reportPanel : fusionner ou simplifier ?
- **Question** : Le reportPanel en 3 blocs (véhicule / route / aide) est-il trop long ?
- **Option A** : Garder les 3 blocs, améliorer le UX (accordéon, étapes).
- **Option B** : Étape 1 = choisir nature (véhicule / route / aide), étape 2 = choisir type.
- **Statut** : En attente — décision Gardien requise

### DA-002 — navPremium : supprimer ou marquer futur ?
- **Question** : Les données simulées (trafic, limite vitesse, voies) dans panelDrive sont trompeuses.
- **Option A** : Supprimer immédiatement.
- **Option B** : Garder mais marquer "Bientôt disponible" clairement.
- **Statut** : En attente — décision Gardien requise

### DA-003 — panelActivite : séparer messages et alertes ?
- **Question** : L'onglet Reçus mélange messages personnels et alertes système.
- **Option A** : 2 onglets — Conversations / Alertes.
- **Option B** : Garder le mélange, améliorer la distinction visuelle.
- **Statut** : En attente

### DA-004 — Blocage : local ou DB ?
- **Question** : Le blocage est actuellement local uniquement (ic_blocked).
- **Option A** : Migrer vers DB (soft-delete M-02).
- **Option B** : Garder local — plus rapide, plus privé.
- **Statut** : En attente

---

## DÉCISIONS REJETÉES

### DR-001 — Score de réputation public
- **Proposition** : Afficher un score de fiabilité public par conducteur.
- **Rejet** : Transformerait ImmatConnect en réseau social (contre WHY-004). Violation INV-010.
- **Alternative retenue** : Trust évalue les interactions, pas les personnes (D-004).

### DR-002 — Messagerie générale (hors contexte véhicule)
- **Proposition** : Permettre d'envoyer un message sans contexte véhicule.
- **Rejet** : Contre P-001 (toute interaction nécessite un contexte réel).

### DR-003 — Appel comme fonctionnalité centrale
- **Proposition** : Mettre l'appel en avant dans la navigation.
- **Rejet** : P-003 (message prioritaire sur appel). L'appel est secondaire.
