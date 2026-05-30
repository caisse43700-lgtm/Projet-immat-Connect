# PROTOCOLS — COUCHE P : PROTOCOLES OPÉRATIONNELS

**Version : Ω∞ (état des lieux + design)**
**Statut : INSUFFISANT — priorité de développement V3**
**Rôle dans SMS : composante P (comment agir sous incertitude)**

---

## AVERTISSEMENT

La couche P est actuellement la plus lacunaire de la SMS. VEHICLE-001 + INV-001/INV-014 = P minimal seulement. Toutes les lacunes A-1 à A-12 sont des lacunes de P. Ce fichier documente l'état existant et les designs approuvés en attente d'implémentation.

---

## PROTOCOLES EXISTANTS (OPÉRATIONNELS)

### VEHICLE-001 — Persist Before Notify

**Énoncé :** Tout état significatif d'un véhicule doit être persisté avant que toute notification soit émise.

**Dérivation depuis N :** ADN-3 (obligation de notification) + ADN-1 (responsabilité) → Si la notification échoue mais la persistance a eu lieu, l'état est récupérable. Si la persistance échoue, toute notification est potentiellement mensongère.

**Implémentation :** core/organs/vehicleOrgan.js + core/bus.js

**Cas d'exception :** Aucun — VEHICLE-001 est absolu. L'urgence justifie une persistance rapide, pas l'absence de persistance.

**Lien CORR :** Aucune correction requise.

---

### INV-001 à INV-014 — Invariants Constitutionnels

**Statut :** deepFrozen dans core/invariants.js

**Liste complète :** Voir core/invariants.js

**Correction urgente (CORR-1) :**
- INV-011 : severity 'high' → 'critical' (non encore appliqué)
- Raison : INV-011 concerne l'intégrité des données d'immatriculation — une violation est critique, pas seulement haute

**Règle d'usage :** Les invariants ne se modifient pas sans révision constitutionnelle de type Majeur (voir LIFECYCLE.md). Le deepFrozen est une protection technique qui reflète cette règle constitutionnelle.

---

## PROTOCOLES EN DESIGN (NON OPÉRATIONNELS)

### A-1 — PROTOCOLE D'AUTORISATION [Design requis]

**Lacune :** Qui a le droit de faire quoi dans ImmatConnect ?

**Contexte :** A-00 (ADN-6) définit la liberté de l'utilisateur mais ne définit pas les niveaux d'autorisation ni les gardiens des révisions constitutionnelles.

**Design proposé :**
```
Niveau 0 — Lecture : tout opérateur
Niveau 1 — Configuration : opérateurs autorisés
Niveau 2 — Révision P : responsables techniques
Niveau 3 — Révision F : architectes constitutionnels
Niveau 4 — Révision N : fondateurs / vote humain explicite
```

**Blocage DEP-4 :** Nécessite décision humaine sur "qui est le Souverain ?" (A-2).

**Priorité V3 :** HAUTE

---

### A-2 — PROTOCOLE DU SOUVERAIN [Décision humaine requise]

**Lacune Γ-1 CRITIQUE :** Qui a l'autorité ultime sur N (noyau) ?

**Options identifiées :**
1. Les fondateurs (ensemble des créateurs initiaux)
2. Un conseil de gouvernance désigné
3. Un vote de l'ensemble des opérateurs
4. Une règle algorithmique (ex : supermajorité sur audit Ω)

**Aucune option ne peut être choisie sans décision humaine explicite.**

**Conséquence actuelle :** Toute révision de N doit être bloquée jusqu'à résolution de A-2.

**État :** EN ATTENTE — décision humaine urgente avant V3.

---

### A-3 — PROTOCOLE DE NOTIFICATION [Design partiel]

**Lacune :** Comment garantir que les notifications sont reçues et comprises (H-13) ?

**Design proposé :**
```
Étape 1 : Persistance de l'état (VEHICLE-001)
Étape 2 : Émission de la notification
Étape 3 : Confirmation de réception (si canal le permet)
Étape 4 : Si non-confirmation dans T secondes → escalade
Étape 5 : Journalisation de l'issue (MC-ID si critique)
```

**Paramètre T :** À définir selon le contexte (urgence ou routine).

**Priorité V3 :** MOYENNE

---

### A-5 — PROTOCOLE DE RÉSOLUTION DES CONFLITS AXIOMATIQUES [Non résolu]

**Lacune Γ-1 CRITIQUE :** Que se passe-t-il quand deux axiomes pointent vers des décisions contradictoires ?

**Exemple théorique :** ADN-5 (Antériorité du Réel) vs ADN-6 (Liberté sous contrainte) — si la réalité impose une contrainte que l'utilisateur refuse, qui prime ?

**État :** Non résolu. Aucun contre-exemple concret identifié à ce jour, mais la lacune est structurelle.

**Action requise :** Définir un ordre de priorité axiomatique ou un protocole d'arbitrage.

**Proposition initiale (non validée) :**
```
Ordre de priorité (du plus fort au plus faible) :
1. ADN-4 (Non-autofondation) — logique pure, non négociable
2. ADN-5 (Antériorité du réel) — ontologique, non négociable
3. ADN-1 (Responsabilité) — empirique fondateur
4. ADN-2 (Identifiant) — empirique fondateur
5. ADN-3 (Notification) — empirique fondateur
6. ADN-7 (Non-autojuridiction) — dérivé, mais critique
7. ADN-6 (Liberté) — éthique, le plus contextuel
```

**Blocage :** Cette proposition n'est pas validée. Décision humaine requise.

---

### A-6 — PROTOCOLE DE DÉPRÉCIATION [Design requis]

**Lacune :** Comment déprécier une norme sans perdre les systèmes qui en dépendent ?

**Design proposé :**
```
Phase 1 — Annonce : noter [DÉPRÉCIÉ depuis vX.Y] dans le texte de la norme
Phase 2 — Transition : maintenir pendant N cycles
Phase 3 — Archivage : archiver dans ARCHIVE.md avec référence vers le remplacement
Phase 4 — Suppression : retirer des normes actives
```

**Paramètre N :** À définir selon l'impact. Suggestion : 3 cycles pour normes P, 5 cycles pour normes F, jamais pour normes N.

---

### A-7 — PROTOCOLE D'URGENCE [Design requis]

**Lacune :** Que se passe-t-il en cas de découverte d'une erreur critique dans N (noyau) ?

**Design proposé :**
```
Étape 1 : Geler tous les déploiements dépendant de l'élément N suspect
Étape 2 : Déclencher un audit Ω-style ciblé sur l'élément
Étape 3 : Si erreur confirmée → révision Critique (LIFECYCLE.md)
Étape 4 : Si erreur infirmée → documenter la tentative dans HISTORY.md
```

**Règle absolue :** Aucune correction de N sans audit complet. Pas de quick-fix sur le noyau.

---

### A-9 — PROTOCOLE DE TEST DE NON-RÉGRESSION CONSTITUTIONNELLE [Design requis]

**Lacune :** Comment vérifier qu'un changement dans P ou F ne corrompt pas N ?

**Design proposé :**
```
Avant tout commit constitutionnel :
1. Lister les éléments N dépendants du changement
2. Vérifier que chaque élément N reste valide après le changement
3. Vérifier que les 6 conditions C1-C6 (SMS) restent satisfaites
4. Documenter le test dans MC-ID
```

---

### DR-2 — ESPACE DE LIBERTÉ CONSTITUTIONNEL [Non défini]

**Lacune :** Quelle est la frontière exacte de ce que l'utilisateur peut configurer sans décision constitutionnelle ?

**Problème :** ADN-6 dit que l'utilisateur est libre "dans les limites de ne pas nuire à des tiers". Mais ces limites ne sont pas opérationnalisées.

**Action requise :** Définir des cas concrets de ce qui est dans / hors de l'espace de liberté.

---

### DR-3 — TRANSITION FONDATEUR → GOUVERNÉ [Non documentée]

**Lacune :** À quel moment ImmatConnect sort-il de la phase fondatrice pour entrer dans la phase gouvernée ?

**Conséquence :** Tant que cette transition n'est pas documentée, les fondateurs peuvent toujours intervenir à tous les niveaux — ce qui est une dépendance orale critique (DEP-6).

**Critères proposés (non validés) :**
- Quand le système est déployé en production avec des utilisateurs réels ?
- Quand un conseil de gouvernance est constitué ?
- Quand une révision majeure a été faite par des non-fondateurs ?

**Action requise :** Décision humaine.

---

## TABLEAU DE PRIORITÉ P POUR V3

| Protocole | Lacune | Priorité | Blocage |
|-----------|--------|----------|---------|
| CORR-1 (INV-011) | Sévérité incorrecte | URGENTE | Aucun |
| A-2 (Souverain) | Gouvernance N | CRITIQUE | Décision humaine |
| A-5 (Conflits axiomes) | Γ-1 CRITIQUE | HAUTE | Décision humaine |
| A-3 (Notification) | H-13 | HAUTE | Design partiel disponible |
| A-8 (Mémoire) | DR-1 | HAUTE | Design complet (voir MEMORY.md) |
| DR-3 (Transition) | Gouvernance | HAUTE | Décision humaine |
| A-1 (Autorisation) | Sécurité | MOYENNE | DEP-4 |
| A-6 (Dépréciation) | Lifecycle | MOYENNE | Aucun |
| A-7 (Urgence) | Résilience | MOYENNE | Aucun |
| DR-2 (Liberté) | Éthique | MOYENNE | Aucun |
| A-9 (Non-régression) | Tests | BASSE | Aucun |

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/PROTOCOLS.md*
