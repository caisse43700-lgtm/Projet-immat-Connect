# RESEARCH — CONJECTURES ET THÉORIES EN DÉVELOPPEMENT

**Version : Ω∞ (post-audit)**
**Statut : VIVANT — mise à jour à chaque cycle de recherche**
**Rôle : catalogue des éléments épistémiquement non-stabilisés**

---

## AVERTISSEMENT ÉPISTÉMIQUE

Ce fichier documente des éléments dont le statut épistémique est < 85% (voir FRONTIER.md, Partie VI). Aucun élément de ce fichier ne doit être traité comme une norme active. Tout usage dans une décision opérationnelle doit mentionner explicitement le statut et l'incertitude.

---

## PAI — PRINCIPE D'INADÉQUATION CONSTITUTIVE

**Statut : CONJECTURE [70%]**
**Proposé en : Audit Ω+**

### Formulation
> Dans tout système normatif expressif opérant dans un domaine dont l'espace d'états croît avec le temps, il existe un écart structurel irréductible entre la capacité normative du système et la réalité qu'il tente de gouverner.

### Argument principal
Soit S un système normatif avec N_s normes. Soit D un domaine avec |états(D,t)| croissant. Pour tout t suffisamment grand, |états(D,t)| > N_s (si N_s est fini). L'ajout de normes ne résout pas le problème — l'espace d'états croît plus vite que le corpus normatif.

### Pourquoi pas un théorème (70% et non 85%+)
1. "Espace d'états" n'est pas formellement défini
2. "Croissant avec le temps" n'est pas toujours vrai (domaines stables)
3. La borne sur N_s suppose qu'un corpus normatif ne peut pas croître infiniment — hypothèse plausible mais non prouvée
4. L'analogie avec l'incomplétude de Gödel n'est pas une extension légitime

### Chemin vers 85%+
1. Formaliser la notion d'"espace d'états normatif"
2. Prouver la borne de croissance relative normes/états
3. Démontrer pour au moins 3 domaines distincts

### Utilisations légitimes actuelles
- Justifie l'existence de la couche F (frontière explicite)
- Justifie PCP (on ne peut pas tout normer)
- Explique l'inadéquation permanente entre V1 et la réalité des véhicules

---

## PEC — PRINCIPE D'ÉQUIVALENCE CONSTITUTIVE

**Statut : CONJECTURE [60%] — révisé en Ω+ (était 65%)**
**Ancien nom : "Gödel généralisé aux normatifs" — abandon de cette formulation**

### Formulation révisée (Ω+)
> Conjecture d'incomplétude constitutive : tout système normatif suffisamment expressif contient des propositions vraies qu'il ne peut pas prouver depuis ses propres axiomes.

### Pourquoi la formulation originale était incorrecte
"Gödel généralisé aux normatifs" suggérait une extension légitime du théorème d'incomplétude de Gödel. Or Gödel s'applique aux systèmes formels arithmétiques — son extension aux systèmes normatifs est une analogie, pas une extension mathématique. Statut abaissé de 65% à 60%.

### Argument résiduel
T-01 (Non-Autojuridiction) suggère déjà que le système ne peut pas se valider lui-même. PEC étend cela : il ne peut pas non plus *prouver* certaines de ses propres vérités. Mais cette extension n'est pas formalisée.

### Chemin vers stabilisation
1. Identifier une proposition vraie spécifique d'ImmatConnect qui n'est pas prouvable depuis l'ADN
2. Montrer que ce n'est pas un artefact de la formulation mais un résultat structurel
3. Généraliser de cet exemple

---

## HCC — HYPOTHÈSE DE COMPLÉTUDE CONSTITUTIONNELLE

**Statut : HYPOTHÈSE [55%]**

### Formulation
> Un système constitutionnel peut, en principe, couvrir tous les cas de son domaine si son corps de règles est suffisamment riche.

### Relation à PAI
HCC est la négation de PAI. Si PAI est vrai, HCC est fausse. Si HCC est vraie, PAI est faux.

**Selon PAI(légitimité) :** HCC = affirmation que l'autorité constitutionnelle peut être totale. PAI dit le contraire.

### Intérêt de maintenir HCC dans RESEARCH
HCC représente la position "optimiste" — peut-être que l'écart PAI est réductible à zéro avec suffisamment de normes bien conçues. Tant que HCC n'est pas réfutée, elle reste une contraposition utile pour tester PAI.

---

## TGSC — THÉORÈMES ET CONJECTURES DU SYSTÈME CONSTITUTIONNEL

**Correction CORR-5 : séparation explicite théorèmes / conjectures**

### THÉORÈMES (statut ≥ 85%)

**I-α — Unicité du référent [98%]**
> Pour tout véhicule v dans le domaine d'ImmatConnect, il existe exactement un identifiant officiel de référence à tout instant t.
*Dérivé de : ADN-2*

**I-δ — Transitivité normative [90%]**
> Si une norme N1 est valide et implique une norme N2, alors N2 est valide dans le système.
*Dérivé de : cohérence logique du corpus*

**I-ζ — Irréductibilité du noyau [85%]**
> Aucun élément de N (noyau) n'est dérivable des autres éléments de N.
*Dérivé de : définition de l'ADN constitutionnel + preuve de minimalité SMS*

### CONJECTURES (statut 55-84%)

**I-β — Convergence normative [65%]**
> Tout ensemble de normes cohérentes dérivées de N converge vers un équilibre stable après un nombre fini de révisions.
*Incertitude : "convergence" et "équilibre stable" non formalisés*

**I-γ — Complétude partielle [60%]**
> Il existe un sous-ensemble S de N tel que toutes les situations du domaine sont couvertes par une norme dérivable de S.
*Incertitude : dépend de la définition de "couverture" — lié à PAI*

**I-ε — Incomplétude constitutive [60%]**
> (= PEC reformulé) ImmatConnect contient des vérités qu'il ne peut pas prouver depuis son ADN.
*Incertitude : voir PEC*

---

## TEC — THÉORIE DE L'ÉQUIVALENCE CONSTITUTIVE

**Statut : COMPLÉMENTAIRE à SMS [70%]**
**Note Ω+ : renommé "complémentaire" (n'est pas "rivale" de SMS)**

### Formulation
> Deux constitutions sont équivalentes si et seulement si elles définissent les mêmes droits et obligations pour l'ensemble des entités du système, quelles que soient leurs formulations superficielles.

### Relation à SMS
TEC étudie la *sémantique* des constitutions (qu'est-ce qu'elles disent en substance), SMS étudie la *structure* (comment elles survivent). TEC et SMS sont complémentaires : une constitution SMS-valide peut ne pas être TEC-équivalente à une autre, et vice versa.

### Application potentielle
Permettrait de comparer deux versions constitutionnelles (ex : V1 vs V2) pour vérifier si les droits et obligations fondamentaux sont préservés malgré des reformulations.

**Priorité :** BASSE pour V3. Utile pour les révisions majeures futures.

---

## SCD — SCHÉMA DE COHÉRENCE DYNAMIQUE

**Statut : OUTIL PÉDAGOGIQUE [archivé]**
**Note Ω+ : archivé comme outil, pas comme norme**

### Description
SCD est une représentation graphique/schématique permettant de visualiser les relations entre éléments du corpus à un instant t.

### Pourquoi archivé
SCD n'est pas une norme — c'est un outil de visualisation. Le maintenir dans le corpus actif crée une fausse impression qu'il a autorité normative.

### Usage légitime
Formation des nouveaux opérateurs. Onboarding. Jamais comme référence normative.

**Voir :** ARCHIVE.md#SCD

---

## AGENDA DE RECHERCHE V3

| Priorité | Sujet | Objectif | Condition |
|----------|-------|---------|-----------|
| 1 | Formaliser PAI | Passer de 70% à 85% | Définir "espace d'états normatif" |
| 2 | Résoudre DEP-1 | Méthode formelle statuts épistémiques | Voir FRONTIER.md §VI |
| 3 | Tester I-β (convergence) | Contre-exemples ou validation | Simulation sur corpus V1 |
| 4 | Développer A-11 | Légitimité moment fondateur | Décision humaine (A-2 d'abord) |
| 5 | Tester TEC sur V1/V2 | Comparer sémantiques | Après V2 stabilisée |

---

## T-02 — LOI DE DÉCOUVERTE DE L'ADN

**Statut : THÉORÈME [80%]**
**Ajouté en : Gel Ω∞.2 (Mission Ω∞-V2.0)**

### Formulation
> Aucun système ne peut connaître immédiatement son ADN fondamental. Il ne peut que l'inférer progressivement à partir de ce qui survit aux tests de destruction, reconstruction, transmission, falsification, évolution et mutation.

### Dérivation
T-02 est dérivable de trois éléments de V1 :
- **A-(-1)** : le système ne peut pas auto-fonder sa propre légitimité → il ne peut pas non plus connaître immédiatement ses propres fondements.
- **T-01** : le système ne peut pas se juger de l'intérieur → il ne peut pas non plus *connaître* son ADN de l'intérieur.
- **PAI [70%]** : il y a un écart structurel irréductible entre normes et réalité → cet écart implique un processus d'inférence progressive, jamais une connaissance immédiate.

Ensemble → le système approche son ADN asymptotiquement. Il ne le décrète pas.

### Pourquoi 80% et non 85%
T-02 hérite de l'incertitude de PAI [70%]. Si PAI est validé à 85%+, T-02 monte à ~88%.

### Ce que T-02 ajoute à V1
A-(-1), T-01 et PAI impliquent T-02 conjointement mais ne l'énoncent pas.
T-02 ajoute explicitement :
1. La **dimension temporelle** : "progressivement"
2. Le **mécanisme d'inférence** : via les tests de survie, pas via la déduction directe
3. La **conséquence épistémologique** : l'ADN est une découverte, pas un décret

### Conséquence constitutionnelle
La Genèse (HISTORY.md + AUDIT-OMEGA.md + ARCHIVE.md) n'est pas accessoire.
Elle est le *justificatif épistémologique* de l'ADN.
Sans la Genèse, l'ADN est un dogme.
Avec la Genèse, l'ADN est une inférence validée.

### Chemin vers 88%+
1. Valider PAI à 85%+ (voir agenda de recherche ci-dessus)
2. Formaliser "survivre aux tests" comme critère objectif

---

## MODÈLE DE MORTALITÉ CONSTITUTIONNELLE

**Statut : OPÉRATIONNEL [confirmé]**
**Ajouté en : Gel Ω∞.2 (Mission Ω∞-V2.0)**

### Contexte
V1 raisonnait en termes de destruction → reconstruction (8 scénarios de survie).
Le modèle de mortalité complète cette approche en distinguant les *types* de mort,
leurs causes, et les mécanismes préventifs spécifiques à chacun.

### 7 types de mort constitutionnelle

────────────────────────────────────
**TYPE 1 — MORT PARTIELLE**

Définition : perte d'une partie de P ou F. N intact.
Impact : système fonctionnel en mode dégradé.
  C1 (identité) : survit.
  C2-C6 : partiellement affectées selon l'ampleur.
Exemple : perte de PROTOCOLS.md — le système sait qui il est mais
          perd ses modes opératoires.
Mécanisme préventif : F-15 (Intégrité Dégradée) + sauvegardes P.
Récupération : reconstruction de P depuis N et F. Délai : court.

────────────────────────────────────
**TYPE 2 — MORT FONCTIONNELLE**

Définition : N intact mais tout P perdu.
Impact : le système connaît son identité mais ne peut plus agir.
  C1 : survit. C2-C6 : échouent.
Exemple : ADN conservé, toute la couche procédurale détruite.
Mécanisme préventif : A-9 (non-régression) + politique d'entropie Phase 2.
Récupération : reconstruction de P depuis N. Délai : moyen (5-10 sessions).

────────────────────────────────────
**TYPE 3 — MORT IDENTITAIRE**

Définition : un ou plusieurs éléments ADN invalidés sans remplacement possible.
Impact : le système ne sait plus ce qu'il est.
Exemple : contre-exemple valide à ADN-4 sans alternative → le système perd
          son interdiction d'auto-fondation et dérive vers la circularité.
Mécanisme préventif : MMV (voir LIFECYCLE.md) — toute mutation ADN évaluée
          sur le risque de mort avant acceptation.
Récupération : impossible sans révision constitutionnelle majeure (audit Ω-style).

────────────────────────────────────
**TYPE 4 — EXTINCTION**

Définition : perte complète de l'ADN ET de toutes les archives (Genèse incluse).
Impact : reconstruction impossible.
Condition : destruction physique de TOUS les supports (y compris ARCHIVE.md,
            HISTORY.md, AUDIT-OMEGA.md).
Mécanisme préventif : réplication des archives sur supports indépendants.
Récupération : impossible.

────────────────────────────────────
**TYPE 5 — RÉSURRECTION**

Définition : reconstruction depuis un backup partiel.
Condition : au moins un exemplaire complet de l'ADN existe quelque part.
Délai estimé V1 : 5-10 sessions (validé dans scénarios de survie).
Limite : si la Genèse est perdue, la résurrection produit un ADN *dogmatique*
         (sans justification épistémologique — voir T-02).
         Le système survit mais perd sa légitimité par découverte.
Mécanisme : CORPUS-FINAL-CONSOLIDATED.md comme point d'entrée de résurrection.

────────────────────────────────────
**TYPE 6 — MUTATION LÉTALE**

Définition : changement de N qui crée une contradiction interne.
Exemple : ajouter un 8e élément ADN qui contredit ADN-4 — le système a deux
          fondements contradictoires et ne peut plus se dériver de lui-même.
Impact : effondrement de la cohérence interne. C1 échoue.
Mécanisme préventif : MMV Q8 (que risque-t-elle de casser ?) + MMV Q10
          (augmente-t-elle le risque de mort ?).
Récupération : supprimer l'élément fautif + audit Ω ciblé.

────────────────────────────────────
**TYPE 7 — MUTATION BÉNÉFIQUE**

Définition : changement de N résolvant une lacune sans contradiction.
Exemple : formalisation de PAI de 70% à 85% → intégration comme T-03.
Impact : corpus plus solide, aucune perte de cohérence.
Condition : MMV validé (10 questions passées, voir LIFECYCLE.md).
Résultat : croissance contrôlée du noyau.

────────────────────────────────────

### Matrice de risque

| Type | Réversible | N intact | Récupérable | Mécanisme préventif |
|------|-----------|---------|------------|-------------------|
| Mort partielle | Oui | Oui | Oui | F-15 + sauvegardes |
| Mort fonctionnelle | Oui | Oui | Oui | A-9 + politique d'entropie |
| Mort identitaire | Non | Non | Partiel | MMV |
| Extinction | Non | Non | Non | Réplication archives |
| Résurrection | — | Oui | Oui | CORPUS-FINAL |
| Mutation létale | Oui | Non | Oui | MMV Q8/Q10 |
| Mutation bénéfique | Oui | Oui | Oui | MMV complet |

### Relation avec les scénarios de survie V1

Les 8 scénarios de survie de SMS.md correspondent à :
- "Perte 30% de P" → Mort partielle (Type 1)
- "Perte 60% de P" → Mort fonctionnelle proche (Type 2)
- "Perte tout sauf ADN" → Résurrection (Type 5)
- "Axiome invalidé" → Mutation bénéfique ou létale (Type 6/7 selon la résolution)
- "Contre-exemple à PAI" → Mutation bénéfique possible (Type 7)

Le modèle de mortalité formalise et étend ces scénarios.

---

*Gel Ω∞.2 — Mise à jour post-Mission Ω∞-V2.0*
*Fichier: docs/constitution/RESEARCH.md*
