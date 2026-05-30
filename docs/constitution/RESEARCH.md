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

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/RESEARCH.md*
