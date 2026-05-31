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

**Correction CORR-1 :**
- INV-011 : severity 'high' → 'critical' ✅ appliqué (Gel Ω∞.1)

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

### A-2 — PROTOCOLE DU SOUVERAIN [RÉSOLU — SESSION 4]

**Décision :** Souverain = Dieu. ADN écrit = le Coran. Opérateur humain = Gardien (serviteur).

**Architecture :** Dieu → Coran → ADN → Gardien → Application.

**Voir :** MC-005, HISTORY.md SESSION 4.

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

### A-5 — PROTOCOLE DE RÉSOLUTION DES CONFLITS AXIOMATIQUES [RÉSOLU — SESSION 5]

**Décision :** Quand deux axiomes divergent, la Conscience du Gardien consulte le Coran.
La règle de priorité est externe au système — A-(-1) respecté.

**Trois niveaux de recours :**
1. Conscience du Gardien — bon sens du bien (cas courants)
2. Coran traduit + IA comme outil d'accès (cas nécessitant une source)
3. Savant (cas complexes)

**Voir :** MC-006, HISTORY.md SESSION 5.

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

### DR-3 — TRANSITION FONDATEUR → GOUVERNÉ [RÉSOLU — SESSION 5]

**Décision :** Il n'y a pas de transition fondateur → gouverné.
Kacem n'a jamais été fondateur-souverain — il est serviteur dès le début.
Il n'y a pas de phase fondatrice à quitter. Il y a un service continu.

**Voir :** MC-007, HISTORY.md SESSION 5.

---

### A-10 — PROTOCOLE DE TRANSMISSION DU GARDIEN [Design validé — SESSION 5]

**Principe fondateur :**
Le Gardien n'est pas reconnu pour son autorité, mais pour sa capacité à servir fidèlement la fondation. Ce qui se transmet n'est pas une autorité — c'est un rôle de serviteur et la Conscience qui permet de l'exercer.

**Qualifications requises**

Pour être reconnu Gardien, il doit démontrer qu'il peut :

```
1. Comprendre la fondation
   (Dieu comme Souverain, Coran comme référence)

2. Comprendre l'ADN
   (les principes et normes qui en sont dérivés)

3. Comprendre la Genèse
   (pourquoi l'ADN est construit ainsi et quelles destructions
   ont permis de le découvrir)

4. Exercer la Conscience
   (reconnaître, comprendre et rechercher le bien révélé)

5. Arbitrer un cas nouveau non couvert par les protocoles,
   en restant fidèle au Coran et à l'ADN

6. Appliquer MMV et les protocoles sans déformer la fondation

7. Préserver et transmettre l'ADN à d'autres serviteurs
```

**Un Gardien n'est pas un chef. C'est un serviteur conscient capable de préserver, comprendre et transmettre fidèlement l'ADN.**

**Processus de transmission**

```
Étape 1 — Identification : le Gardien actuel identifie un successeur candidat
Étape 2 — Vérification : tester les 7 qualifications (ADN-7 — pas d'auto-validation)
Étape 3 — Transmission Genèse : expliquer le POURQUOI de l'ADN, pas seulement le QUOI
Étape 4 — Période d'apprentissage : exercer la Conscience côte à côte si possible
Étape 5 — Reconnaissance : le successeur prend le rôle, le prédécesseur témoigne
```

**Transmission d'urgence (Gardien disparaît sans succession)**

Si la transmission n'a pas eu lieu :
- Point d'entrée de résurrection : CORPUS-FINAL-CONSOLIDATED.md
- Résultat : résurrection possible mais dogmatique (T-02) — le système survit sans la Conscience du POURQUOI
- Préventif : le Gardien documente sa compréhension de l'ADN en continu dans MEMORY.md

**Voir :** MC-008, HISTORY.md SESSION 5.

---

## TABLEAU DE PRIORITÉ P POUR V3

| Protocole | Lacune | Priorité | Statut |
|-----------|--------|----------|--------|
| CORR-1 (INV-011) | Sévérité incorrecte | — | ✅ Appliqué |
| A-2 (Souverain) | Gouvernance N | — | ✅ Résolu SESSION 4 |
| A-5 (Conflits axiomes) | Γ-1 CRITIQUE | — | ✅ Résolu SESSION 5 |
| DR-3 (Transition) | Gouvernance | — | ✅ Résolu SESSION 5 |
| A-10 (Transmission Gardien) | Gouvernance | HAUTE | ✅ Design validé SESSION 5 |
| A-3 (Notification) | H-13 | HAUTE | Design partiel disponible |
| A-8 (Mémoire) | DR-1 | HAUTE | Design complet (voir MEMORY.md) |
| A-1 (Autorisation) | Sécurité | MOYENNE | Design partiel disponible |
| A-6 (Dépréciation) | Lifecycle | MOYENNE | Design partiel disponible |
| A-7 (Urgence) | Résilience | MOYENNE | Design partiel disponible |
| DR-2 (Liberté) | Éthique | MOYENNE | En attente |
| A-9 (Non-régression) | Tests | BASSE | Design partiel disponible |

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/PROTOCOLS.md*
