# LIFECYCLE — PROTOCOLE DE PARCIMONIE CONSTITUTIONNELLE ET POLITIQUE D'ENTROPIE

**Version : Ω∞ (architecture vivante)**
**Statut : OPÉRATIONNEL**
**Objectif : contrôler la croissance constitutionnelle pour éviter l'inflation normative**

---

## PARTIE I — PCP : PROTOCOLE DE PARCIMONIE CONSTITUTIONNELLE

### Définition
Le PCP est l'ensemble des procédures formelles régissant l'évolution du corpus constitutionnel. Son rôle est d'empêcher l'inflation normative tout en permettant la croissance légitime.

**Principe fondateur** : Une norme inutile est pire qu'une norme manquante — elle crée de la confusion sans réduire l'incertitude.

---

### DÉCISION 1 — AJOUTER

**Critères requis (tous obligatoires) :**
1. L'élément n'est pas dérivable des éléments existants
2. L'élément couvre une situation non couverte (lacune Γ identifiée)
3. L'élément est dérivable de N (noyau)
4. L'élément a été testé contre les contre-exemples connus
5. Le score épistémique est documenté

**Format requis :**
```
ID : [XXX-NN]
Formulation : [énoncé canonique]
Dérivation depuis N : [chemin de dérivation]
Lacune couverte : [Γ-X]
Score épistémique : [XX%]
Tests contre-exemples : [liste]
Décision : AJOUTER
Validé par : [humain/audit]
Date : [YYYY-MM-DD]
```

**Seuil d'approbation :**
- Score ≥ 80% : validation par consensus
- Score 60-79% : statut CONJECTURE, révision requise dans 3 cycles
- Score < 60% : REJETER ou archiver en hypothèse H-X

---

### DÉCISION 2 — FUSIONNER

**Critères requis :**
1. Deux éléments couvrent le même espace normatif
2. L'un des deux est dérivable de l'autre
3. La fusion conserve toute l'information des deux éléments

**Exemple Ω+ :** MPNA fusionné dans T-01 (MPNA est un corollaire direct de T-01 — pas une proposition indépendante)

**Format requis :**
```
Éléments fusionnés : [A] + [B]
Élément résultant : [C]
Information conservée : [liste]
Information perdue : [aucune / liste si applicable]
Décision : FUSIONNER
```

---

### DÉCISION 3 — REMPLACER

**Critères requis :**
1. Un contre-exemple valide invalide l'élément existant
2. La reformulation couvre le cas du contre-exemple
3. La reformulation reste dérivable de N

**Exemple Ω+ :** A-00 remplacé par A-00 révisé (clause tiers non-utilisateurs ajoutée après contre-exemple Uber/Purdue)

**Format requis :**
```
Élément remplacé : [XXX-NN v1]
Contre-exemple : [description]
Élément remplaçant : [XXX-NN v2]
Archivage de v1 : [ARCHIVE.md]
Décision : REMPLACER
```

---

### DÉCISION 4 — ARCHIVER

**Critères :**
1. L'élément est redondant (couvert par un autre) OU
2. L'élément est pédagogiquement utile mais pas normatif OU
3. L'élément a été remplacé

**L'archivage préserve l'information sans la maintenir comme norme active.**

**Format requis :**
```
Élément archivé : [XXX-NN]
Raison : [redondance / pédagogie / remplacement]
Référence vers : [élément actif qui couvre le même espace]
Archivé dans : ARCHIVE.md
Décision : ARCHIVER
```

---

### DÉCISION 5 — REJETER

**Critères (l'un suffit) :**
1. L'élément contredit un élément de N (noyau)
2. L'élément n'est pas dérivable de N
3. L'élément est un doublon exact d'un élément existant
4. Le score épistémique est < 40%

**Format requis :**
```
Élément rejeté : [proposition]
Raison : [contradiction N / non-dérivable / doublon / score insuffisant]
Contre-argument éventuel : [si applicable]
Décision : REJETER
```

---

## PARTIE II — POLITIQUE D'ENTROPIE

### Définition
L'entropie constitutionnelle est la tendance naturelle du corpus à se dégrader par accumulation, contradiction interne, et dérive sémantique.

**Loi d'entropie constitutionnelle :** Sans maintenance active, tout corpus normatif dérive vers l'incohérence en O(n²) — le nombre de contradictions potentielles croît au carré du nombre de normes.

---

### PHASE 1 — CROISSANCE (0 à N normes actives)

**Déclencheur :** Nouveau domaine applicatif ou nouvelles lacunes Γ identifiées

**Règles :**
- Chaque ajout suit PCP DÉCISION 1
- Ratio maximum : 3 nouvelles normes par cycle de révision
- Chaque ajout déclenche un test de non-contradiction avec l'ensemble existant
- Documentation obligatoire dans CANDIDATES.md avant intégration

**Indicateur de santé :** Score de densité normative = (normes actives) / (situations couvertes)
- Score > 2 : inflation — déclencher Phase 3 (Compression)
- Score < 0.5 : lacunes — déclencher Phase 1 (Croissance ciblée)

---

### PHASE 2 — MAINTENANCE (corpus stable)

**Déclencheur :** Aucun ajout ni suppression depuis N cycles

**Opérations :**
- Audit de cohérence interne (chaque norme testée contre toutes les autres)
- Révision des scores épistémiques (mise à jour selon nouvelles données)
- Mise à jour des exemples et contre-exemples
- Test des hypothèses silencieuses H-0 à H-13

**Fréquence :** Tous les 5 cycles de développement (ou avant tout déploiement majeur)

**Livrables :** Rapport de maintenance → HISTORY.md

---

### PHASE 3 — COMPRESSION (corpus trop dense)

**Déclencheur :** Score de densité normative > 2, ou contradictions détectées

**Opérations (dans l'ordre) :**
1. Identifier les doublons → DÉCISION FUSIONNER ou ARCHIVER
2. Identifier les redondances → DÉCISION ARCHIVER
3. Identifier les contradictions → DÉCISION REMPLACER
4. Vérifier que N (noyau) est intact après compression

**Contrainte absolue :** La compression ne peut pas réduire la couverture normative — elle réduit la redondance, pas l'information.

---

### PHASE 4 — ARCHIVAGE (corpus dépassé ou remplacé)

**Déclencheur :** Révision majeure (nouvelle version constitutionnelle)

**Opérations :**
- Snapshot de la version actuelle → ARCHIVE.md avec timestamp
- Documentation des raisons de la révision → HISTORY.md
- Migration des éléments valides vers la nouvelle version
- Conservation intégrale de l'archive (jamais de suppression d'archive)

**Règle absolue :** Une archive ne se supprime jamais. Une archive peut être annotée ("invalidée par [élément] le [date]") mais le contenu reste intact.

---

## CYCLES DE RÉVISION

| Cycle | Type | Déclencheur |
|-------|------|-------------|
| Micro | Correction | Bug ou erreur factuelle |
| Standard | Ajout/Modification | Nouvelle lacune Γ identifiée |
| Majeur | Révision constitutionnelle | Contre-exemple à N, ou audit Ω |
| Critique | Révision d'urgence | Contradiction dans N, ou CORR-1-style |

**Règle des cycles :**
- Micro : immédiat, commit unique, pas de consultation
- Standard : délibération documentée, PCP requis
- Majeur : audit Ω-style, validation humaine
- Critique : interruption de développement, priorité absolue

---

## MÉTRIQUES DE SANTÉ CONSTITUTIONNELLE

| Métrique | Seuil vert | Seuil orange | Seuil rouge |
|----------|-----------|-------------|------------|
| Contradictions internes | 0 | 1-2 | 3+ |
| Normes sans dérivation documentée | 0 | 1-3 | 4+ |
| Score épistémique moyen | > 75% | 60-75% | < 60% |
| Hypothèses silencieuses non documentées | 0 | 1-5 | 6+ |
| Corrections urgentes non appliquées | 0 | 1 | 2+ |

**État actuel de V1 (post-Gel Ω∞.2) :**
- Contradictions internes : 0
- Normes sans dérivation : 0
- Score épistémique moyen : ~76%
- Hypothèses silencieuses non documentées : 0 (H-9 à H-13 documentées dans FRONTIER.md)
- Corrections urgentes non appliquées : 0 (CORR-1 à CORR-8 toutes appliquées)

**Diagnostic global V1 : VERT** — post-Gel Ω∞.2. Blocages restants : A-2, A-5, DR-3 (décision humaine).

---

## MMV — MUTATION MINIMALE VIABLE

**Ajouté en : Gel Ω∞.2 (Mission Ω∞-V2.0)**
**Rôle : gouverner les mutations de niveau ADN (modifications de N)**

### Distinction MMV / PCP

PCP (Protocole de Parcimonie Constitutionnelle) gouverne les changements à **F** et **P**.
MMV gouverne les changements à **N** (noyau) et à **l'ADN** lui-même.

Ce sont deux protocoles complémentaires, non concurrents.

| Type de changement | Protocole |
|-------------------|-----------|
| Modification de ADN / N | **MMV** |
| Ajout à F ou P | **PCP** |
| Correction technique (bug) | Directe |

### Les 10 questions MMV

Toute mutation candidate de niveau N doit répondre aux 10 questions suivantes.
Une réponse insatisfaisante à Q4, Q8 ou Q10 est éliminatoire.

```
Q1  : Quel problème réel cette mutation résout-elle ?
Q2  : Quelle partie de N touche-t-elle ? (ADN-X, axiome, théorème, AF-IRR ?)
Q3  : Est-elle nécessaire ? Peut-on résoudre le problème sans toucher à N ?
Q4  : Respecte-t-elle l'ADN existant ? (aucune contradiction avec ADN-1/7)
Q5  : Respecte-t-elle F ? (cohérente avec les frontières reconnues)
Q6  : Respecte-t-elle P ? (implémentable sans réécrire tous les protocoles)
Q7  : Existe-t-il une mutation plus petite qui résout le même problème ?
Q8  : Que risque-t-elle de casser ? (liste explicite des dépendances impactées)
Q9  : Peut-on revenir en arrière ? (réversibilité — archivage de l'état avant)
Q10 : Augmente-t-elle ou réduit-elle le risque de mort constitutionnelle ?
      (référence au modèle de mortalité dans RESEARCH.md)
```

### 6 décisions possibles

| Décision | Condition | Action |
|----------|-----------|--------|
| **ACCEPTER** | 10 questions passées, Q4/Q8/Q10 satisfaisantes | Appliquer MMV, documenter MC-ID |
| **REFUSER** | Q4 ou Q8 ou Q10 éliminatoire | Archiver la proposition avec justification |
| **LABORATOIRE** | Q3-Q9 ok mais Q10 incertain | Tester en isolation, réévaluer après |
| **EXPRESSION NON ADN** | Q2 : ne touche pas vraiment N | Rediriger vers PCP |
| **MUTATION ADN** | Q2 confirme changement d'un élément ADN | Appliquer MMV complet + vote humain |
| **ARCHIVAGE** | Mutation valide mais différée | Documenter dans CANDIDATES.md |

### Règle de validation

- **MUTATION ADN** requiert toujours un vote humain explicite (A-2 doit être résolu avant).
- **ACCEPTER** sans vote humain n'est autorisé que pour N hors ADN (axiomes dérivés, protocoles de N).
- Tout résultat MMV génère une entrée MC-ID dans MEMORY.md.

### Relation avec le modèle de mortalité

Q10 connecte directement MMV au modèle de mortalité (RESEARCH.md) :
- Mutation létale (Type 6) = mutation qui échoue à Q4 ou Q10
- Mutation bénéfique (Type 7) = mutation qui passe les 10 questions

---

*Gel Ω∞.2 — Mise à jour post-Mission Ω∞-V2.0*
*Fichier: docs/constitution/LIFECYCLE.md*
