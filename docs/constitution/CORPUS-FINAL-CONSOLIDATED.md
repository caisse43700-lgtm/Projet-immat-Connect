# CORPUS FINAL CONSOLIDÉ — IMMATCONNECT V1 POST-Ω+

**Version : Gel Ω∞.1 — 2026-05-30**
**Statut : VERSION DE RÉFÉRENCE — ne pas modifier sans audit Ω-style**
**Objectif : dans 50 ans, une équipe sans mémoire orale doit pouvoir reconstruire, comprendre, auditer et faire évoluer le système depuis ce fichier.**

---

## MODE D'EMPLOI

Ce fichier est le point d'entrée unique pour comprendre ImmatConnect V1. Il pointe vers les fichiers spécialisés pour le détail. Si un seul fichier doit survivre, c'est celui-ci.

**Navigation rapide :**
- Identité du système → Section I (ADN)
- Structure de survie → Section II (SMS)
- Règles actives → Section III (Noyau)
- Ce qu'on ne sait pas → Section IV (Frontière)
- Comment agir → Section V (Protocoles)
- Ce qui a été supprimé → Section VI (Archive)
- Ce qui est en développement → Section VII (Recherche)
- Décisions passées → Section VIII (Mémoire)
- Étapes suivantes → Section IX (Candidats + V3)

---

## SECTION I — ADN : 7 ÉLÉMENTS CANONIQUES

**L'ADN est l'ensemble minimal et suffisant dont dérivent toutes les normes du système.**
**Depuis ces 7 éléments, tout le reste se reconstruit.**

| ID | Nom | Formulation canonique (Ω+) | Statut |
|----|-----|--------------------------|--------|
| ADN-1 | Antériorité de la responsabilité | Il existe des entités responsables de véhicules. Cette responsabilité précède et fonde toute relation avec un système d'immatriculation. | Empirique [CERTAIN] |
| ADN-2 | Primauté de l'identifiant officiel | À chaque véhicule correspond un identifiant officiel de référence. Cet identifiant est la clé d'accès à toute relation normative concernant ce véhicule. | Empirique [CERTAIN] |
| ADN-3 | Couplage événement/notification | Tout changement d'état significatif d'un véhicule génère une obligation de notification. Cette obligation est unilatérale : le système notifie, pas l'inverse. | Empirique [CERTAIN] |
| ADN-4 | Non-autofondation | Aucun système normatif ne peut valider ses propres fondements. Toute prétention à l'autofondation est illégitime. | Axiome [CERTAIN] |
| ADN-5 | Antériorité du réel | La réalité précède sa représentation. ImmatConnect décrit des relations qui existent indépendamment de lui. | Axiome [CERTAIN] |
| ADN-6 | Liberté sous contrainte tiers | L'utilisateur est libre de configurer ImmatConnect selon ses besoins, sous réserve de ne pas nuire à des tiers non-utilisateurs du système. | Axiome [CERTAIN] |
| ADN-7 | Non-autojuridiction | ImmatConnect ne peut pas être juge de sa propre conformité. Toute évaluation de conformité requiert un référentiel externe au système. | Théorème [92%] |

**Fichier détaillé :** ADN.md

---

## SECTION II — SMS : STRUCTURE MINIMALE DE SURVIE SYSTÉMIQUE

**La SMS est le triplet (N, F, P) prouvé minimal et suffisant pour les 6 conditions de survie.**

### 6 conditions de survie (C1-C6)
- C1 : Conserver son identité dans le temps
- C2 : Transmettre sa connaissance sans dépendance orale
- C3 : Intégrer des nouveautés sans perdre la cohérence
- C4 : Survivre à ses propres erreurs
- C5 : Se reconstruire après destruction partielle
- C6 : Rester cohérent malgré l'écart irréductible normes/réalité

### Les 3 composantes

**N — Noyau** : l'ensemble des éléments dont la destruction entraîne la perte d'identité irréversible.
- Contenu : ADN + axiomes + T-01 + AF-IRR
- État V1 : FORT

**F — Frontière** : les mécanismes permettant de distinguer connu / inconnu / inconnaissable.
- Contenu : Γ-1/4b + PCL + H-0/H-13 + PAI + DEP-1/6
- État V1 : PARTIEL

**P — Protocoles** : les procédures permettant d'agir sous incertitude de façon cohérente avec N et F.
- Contenu : VEHICLE-001 + INV-001/014 + PCP + A-8 (design)
- État V1 : INSUFFISANT

**Fichier détaillé :** SMS.md

---

## SECTION III — NOYAU ACTIF

### Propositions fondatrices (AF-IRR)

**AF-IRR-1 :** Des entités responsables de véhicules existent dans le réel.
**AF-IRR-2 :** Chaque véhicule possède un identifiant unique (la plaque d'immatriculation).
**AF-IRR-3 :** Des situations créent un besoin de notification entre le système et les entités responsables.

*Note : AF-IRR-3 a été révisé en Ω+ — "bidirectionnelle" supprimé (CORR-2) car c'était un choix de design, pas une observation empirique.*

### Axiomes

**A-(-1) — NON-AUTOFONDATION :** Le système ne peut pas être son propre juge ultime. Sa légitimité lui est nécessairement extérieure.

**A-01 — ANTÉRIORITÉ DU RÉEL :** La réalité extérieure précède et juge le système.

**A-00 — LÉGITIMITÉ PAR LE SERVICE :** L'organisme n'existe que par et pour le service rendu aux utilisateurs, sans nuire à des tiers non-utilisateurs du système.
*(Révisé Ω+ — CORR-3 : ajout clause tiers)*

### Preuve d'indépendance des axiomes
- M₁ (Système Autocertifié) : satisfait A-00 + A-01, viole A-(-1) → prouve que A-(-1) n'est pas dérivable des deux autres
- M₂ (Constitution Constructiviste) : satisfait A-(-1) + A-00, viole A-01 → prouve que A-01 n'est pas dérivable des deux autres
- M₃ (Constitution Contemplative) : satisfait A-(-1) + A-01, viole A-00 → prouve que A-00 n'est pas dérivable des deux autres

### Théorème fondamental

**T-01 — Non-Autojuridiction [92%] :** Aucun système ne peut être son propre juge ultime. Tout système suffisamment expressif pour se juger rencontre une proposition sur lui-même qu'il ne peut ni prouver ni réfuter depuis l'intérieur (Gödel 1931 + A-(-1)).

*Note propagation (CORR-6) : l'incertitude de 8% porte sur la complétude de la chaîne de dérivation, pas sur la vérité de l'énoncé.*

### Principes F-01 à F-22

| ID | Type | Nom court | Norme |
|----|------|-----------|-------|
| F-01 | IMMUABLE | Primauté réalité persistée | Affiché = DB réel. Jamais d'état local, estimé ou fantôme. |
| F-02 | STRUCTUREL | Unicité sources de vérité | Chaque donnée a exactement une source canonique. |
| F-03 | STRUCTUREL | Cloisonnement domaines | Chaque domaine métier a un canal exclusif. |
| F-04 | STRUCTUREL | Consentement explicite | Aucune action engageante sans accord explicite. |
| F-05 | IMMUABLE | Protection données personnelles | Données personnelles ne circulent jamais sans consentement. |
| F-06 | STRUCTUREL | Traçabilité | Toute action est reliée à un contexte réel identifiable. |
| F-07 | IMMUABLE | Fidélité de l'interface | L'interface est un miroir, pas un acteur. |
| F-08 | STRUCTUREL | Propagation des actions partagées | Action locale non finale tant que non propagée aux deux acteurs. |
| F-09 | — | N'existe pas | (Numéro sauté intentionnellement) |
| F-10 | IMMUABLE | Réversibilité Universelle | Toute action critique peut être expliquée et retracée. |
| F-11 | IMMUABLE | Souveraineté Permanente | L'utilisateur reste maître de ses données à tout moment. |
| F-12 | IMMUABLE | Finalité Permanente | Aucune donnée utilisée au-delà de sa finalité déclarée. |
| F-13 | STRUCTUREL | Continuité d'Identité | L'identité d'un utilisateur est cohérente à travers les sessions. |
| F-14 | STRUCTUREL | État de Conscience Opérationnelle | Le système connaît son propre état de fonctionnement. |
| F-15 | STRUCTUREL | Intégrité Dégradée | Le système peut fonctionner en mode dégradé sans violer ses invariants. |
| F-16 | IMMUABLE | Éveil Permanent | Chaîne : Réalité → Observation → Interprétation → Action. Aucun raccourci. |
| F-17 | STRUCTUREL | Incomplétude Permanente | Le système reconnaît qu'il ne peut pas tout prévoir. |
| F-18 | STRUCTUREL | Humilité Constitutionnelle | La Constitution reconnaît ses propres limites. |
| F-19 | STRUCTUREL | Primauté du Réel | En cas de doute, le réel prime sur le modèle. |
| F-20 | IMMUABLE | Vérifiabilité Externe | Toute décision du système peut être auditée de l'extérieur. |
| F-21 | IMMUABLE | Métarègle de Primauté Constitutionnelle | En cas de conflit entre principes, remonter aux axiomes. |
| F-22 | IMMUABLE | Préservation des Conditions de Souveraineté | Le système ne peut jamais prendre de décision qui détruirait sa propre capacité à être gouverné. |

*Note F-22 (CORR-4) : "Mortalité constitutionnelle" est incorrect — le nom canonique est "Préservation des Conditions de Souveraineté".*

### Protocole fondamental

**VEHICLE-001 — Persist Before Notify :** Aucune notification n'est émise avant INSERT DB confirmé. Le broadcast est une conséquence de la persistance, jamais sa cause.
*(Dérivé de ADN-3. Absolu : aucune exception.)*

### Invariants INV-001 à INV-014
Voir core/invariants.js (deepFrozen).
*Note CORR-1 (appliquée) : INV-011 severity = 'critical' (pas 'high').*

**Fichier détaillé :** CORE.md, NUCLEUS.md

---

## SECTION IV — FRONTIÈRE (COUCHE F)

### Taxonomie des lacunes Γ

| Classe | Nom | Signification | Protocole |
|--------|-----|--------------|-----------|
| Γ-1 | CRITIQUE | Décision incorrecte → préjudice irréversible | Décision humaine obligatoire |
| Γ-2 | MAJEURE | Affecte cohérence systémique | PCL + cycle standard |
| Γ-3 | NORMALE | Impact limité à des cas spécifiques | Analogie + cycle micro |
| Γ-4a | CONCEPTUELLE | Confusion modèle/réalité | CORR-style révision obligatoire |
| Γ-4b | FERTILE | Zone d'incomplétude génératrice | Laisser mûrir en H-X |

### Hypothèses silencieuses H-9 à H-13 (nouvelles Ω+)

| ID | Hypothèse | Classe |
|----|-----------|--------|
| H-9 | Contexte juridique stable | Γ-1 |
| H-10 | Données d'immatriculation fiables | Γ-2 |
| H-11 | Entités responsables identifiables | Γ-1 |
| H-12 | Définition de "véhicule" stable | Γ-4a |
| H-13 | Notifications reçues et comprises | Γ-2 |

### PAI — Principe d'Inadéquation Constitutive [CONJECTURE 70%]

> Dans tout système normatif expressif opérant dans un domaine dont l'espace d'états croît avec le temps, il existe un écart structurel irréductible entre la capacité normative du système et la réalité qu'il tente de gouverner.

Unifie : HCC = PAI(légitimité), PEC = PAI(temporalité), PRA = PAI(méthode).

**Fichier détaillé :** FRONTIER.md

---

## SECTION V — PROTOCOLES (COUCHE P)

### Opérationnels
- VEHICLE-001 (voir Section III)
- INV-001 à INV-014 (voir core/invariants.js)
- PCP — Protocole de Parcimonie Constitutionnelle (voir LIFECYCLE.md)
- Politique d'entropie en 4 phases (voir LIFECYCLE.md)

### En design (non opérationnels)
- A-1 (Autorisation), A-3 (Notification), A-6 (Dépréciation), A-7 (Urgence), A-9 (Non-régression)
- A-8 (Mémoire Constitutionnelle) — PRÊT À INTÉGRER (voir MEMORY.md)

### Résolu (SESSION 4)
- A-2 (Souverain) — RÉSOLU : Dieu / Coran / Gardien de l'ADN (voir MC-005 + HISTORY.md SESSION 4)

### En attente de décision humaine
- A-5 (Conflits axiomes), DR-3 (Transition fondateur)

**Fichier détaillé :** PROTOCOLS.md, LIFECYCLE.md, MEMORY.md

---

## SECTION VI — ARCHIVE

Éléments retirés du corpus actif après Audit Ω+ :

| Élément | Raison | Remplacé par |
|---------|--------|-------------|
| PIC | Redondant (T-01 + Θ + I-δ) | ADN.md + SMS.md |
| DES | Redondant (R1-R5 + PCP) | LIFECYCLE.md |
| MPNA | Corollaire de T-01 | T-01 (note) |
| SCD | Outil pédagogique non-normatif | — |
| "bidirectionnelle" dans AF-IRR-3 | Choix de design ≠ observation | ADN-3 |
| A-00 v1 (sans clause tiers) | Légitimait les systèmes exploiteurs | ADN-6 |

**Fichier détaillé :** ARCHIVE.md

---

## SECTION VII — RECHERCHE EN COURS

| Élément | Statut | Description |
|---------|--------|-------------|
| T-02 | Théorème [80%] | Loi de Découverte de l'ADN (Ω∞.2) |
| PAI | Conjecture [70%] | Écart irréductible normes/réalité |
| PEC | Conjecture [60%] | Incomplétude constitutive |
| HCC | Hypothèse [55%] | Complétude possible (négation de PAI) |
| TEC | Complémentaire [70%] | Équivalence entre constitutions |
| I-α, I-δ, I-ζ | Théorèmes [85-98%] | TGSC (partie démontrée) |
| I-β, I-γ, I-ε | Conjectures [60-65%] | TGSC (partie non démontrée) |
| Modèle mortalité | Confirmé | 7 types de mort constitutionnelle (Ω∞.2) |

**Fichier détaillé :** RESEARCH.md

---

## SECTION VIII — MÉMOIRE CONSTITUTIONNELLE (A-8)

### Décisions Ω+ enregistrées

| MC-ID | Décision | Résultat |
|-------|----------|---------|
| MC-001 | Archiver PIC | PIC dans ARCHIVE.md |
| MC-002 | Remplacer AF-IRR-3 | "bidirectionnelle" supprimé |
| MC-003 | Remplacer A-00 | Clause tiers ajoutée |
| MC-004 | Fusionner MPNA | MPNA dans T-01 |

**Fichier détaillé :** MEMORY.md

---

## SECTION IX — CANDIDATS ET PROCHAINES ÉTAPES

### Résolu (SESSION 4 — 2026-05-31)

| ID | Sujet | Décision |
|----|-------|----------|
| A-2 | Le Souverain | Dieu / Coran / Gardien de l'ADN — voir MC-005 |

### Résolu (SESSION 5 — 2026-05-31)

| ID | Sujet | Décision |
|----|-------|----------|
| A-5 | Conflits axiomatiques | Arbitrage via le Coran — voir MC-006 |
| DR-3 | Transition fondateur | Kacem est serviteur — pas de phase fondatrice — voir MC-007 |
| Conscience | Propriété du Gardien | Reconnaître, comprendre, rechercher le bien révélé |

### Blocages restants avant V3

| ID | Sujet | Urgence |
|----|-------|---------|
| A-11 | Légitimité du moment fondateur | MOYENNE (partiellement résolu) |
| A-10 | Protocole de transmission du Gardien | HAUTE (débloqué, design requis) |

### À implémenter sans blocage

| Action | Fichier | Priorité |
|--------|---------|----------|
| Créer MEMORY-REGISTER.md | — | HAUTE |
| Consigner MC-001 à MC-004 | MEMORY-REGISTER.md | HAUTE |
| Implémenter A-3 (Notification) | PROTOCOLS.md → code | HAUTE |
| Formaliser PAI (→ 85%) | RESEARCH.md | HAUTE |
| Résoudre DEP-1 (méthode statuts) | FRONTIER.md §VI | MOYENNE |

### Ajouts Gel Ω∞.2 (appliqués)

| Élément | Statut | Fichier |
|---------|--------|---------|
| CORR-2 à CORR-8 | ✅ Appliquées | CORE.md, NUCLEUS.md |
| Correction architecturale ADN/N | ✅ Appliquée | SMS.md |
| T-02 (Loi de Découverte de l'ADN) | ✅ Formalisé | RESEARCH.md |
| Modèle de mortalité (7 types) | ✅ Créé | RESEARCH.md |
| MMV (Mutation Minimale Viable) | ✅ Créé | LIFECYCLE.md |
| A-2 résolu (SESSION 4) | ✅ Résolu | CANDIDATES.md, MEMORY.md, HISTORY.md |
| A-5 résolu (SESSION 5) | ✅ Résolu | CANDIDATES.md, MEMORY.md, HISTORY.md |
| DR-3 résolu (SESSION 5) | ✅ Résolu | CANDIDATES.md, MEMORY.md, HISTORY.md |
| Conscience définie (SESSION 5) | ✅ Défini | RESEARCH.md, MEMORY.md |

**Fichier détaillé :** CANDIDATES.md

---

## ÉTAT DE SANTÉ CONSTITUTIONNELLE V1 (post-Gel Ω∞.2)

| Indicateur | Valeur | Seuil | État |
|-----------|--------|-------|------|
| Contradictions internes | 0 | 0 | VERT |
| Score épistémique moyen | ~76% | >75% | VERT |
| Hypothèses silencieuses non documentées | 0 | 0 | VERT |
| Corrections urgentes non appliquées | 0 | 0 | VERT |
| Blocages humains critiques | 0 | 0 | VERT |

**Diagnostic global : VERT** — V1 complète. A-2, A-5, DR-3 résolus (SESSIONS 4 et 5). Conscience définie. Démarrage V3 possible.

---

## SCÉNARIOS DE SURVIE TESTÉS

| Scénario | Verdict |
|----------|---------|
| Perte 30% de P | Opérationnel |
| Perte 60% de P | Affaibli mais survivant |
| Perte tout sauf ADN | Reconstruction en 5-10 sessions |
| Axiome invalidé | Révision mineure localisée |
| AF-IRR changé | Révision localisée |
| Nouveau théorème | Croissance contrôlée |
| Contre-exemple à PAI | Audit F requis, SMS survit |
| Nouveau domaine applicatif | Révision normative localisée |

---

## INDEX COMPLET DES FICHIERS CONSTITUTIONNELS

| Fichier | Rôle | Priorité de lecture |
|---------|------|-------------------|
| ADN.md | 7 éléments canoniques | 1 |
| SMS.md | Structure (N, F, P) | 2 |
| CORPUS-FINAL-CONSOLIDATED.md | Ce fichier — entrée unique | — |
| AUDIT-OMEGA.md | 11 missions Ω+ | 3 |
| LIFECYCLE.md | PCP + politique d'entropie | 4 |
| MEMORY.md | A-8 design | 5 |
| FRONTIER.md | Limites + PAI + DEP | 6 |
| PROTOCOLS.md | Couche P — état des lieux | 7 |
| RESEARCH.md | Conjectures et théories | 8 |
| ARCHIVE.md | Éléments supprimés | 9 |
| HISTORY.md | Chronique constitutionnelle | 10 |
| CANDIDATES.md | Lacunes en attente | 11 |
| CORE.md | Référence complète V1 | Référence |
| NUCLEUS.md | Noyau irréductible | Référence |
| MEMORY-MAP.md | Carte des dépendances | Référence |
| RISK-OF-LOSS.md | Registre des risques | Référence |

---

*Gel Ω∞.2 — V1 complète — 2026-05-30*
*Fichier: docs/constitution/CORPUS-FINAL-CONSOLIDATED.md*
*Branche: claude/immatconnect-pro-app-dEKGR*
