# FRONTIER — COUCHE F : LIMITES, HYPOTHÈSES ET CONJECTURES

**Version : Ω∞ (post-audit complet)**
**Statut : PARTIEL — enrichissement requis pour V3**
**Rôle dans SMS : composante F (ce que le système ne sait pas)**

---

## DÉFINITION DE LA COUCHE F

La couche F (Frontière) est l'ensemble des mécanismes permettant à ImmatConnect de :
1. Identifier ce qu'il sait (→ N, noyau)
2. Identifier ce qu'il ne sait pas encore (→ lacunes Γ, hypothèses H)
3. Identifier ce qu'il ne peut structurellement pas savoir (→ PAI, PEC)
4. Traiter chaque cas de façon appropriée (→ PCL, protocoles de lacunes)

**Principe fondateur de F :** Un système qui ne reconnaît pas ses limites finit par les dépasser sans le savoir. F protège contre la dérive silencieuse.

---

## PARTIE I — TAXONOMIE DES LACUNES Γ

### Γ-1 : LACUNE CRITIQUE
**Définition :** Absence de règle dans un domaine où une décision incorrecte produit un préjudice irréversible.

**Exemples :**
- A-11 : Légitimité du moment fondateur (qui a le droit de fonder la constitution ?)
- Conflit entre deux AF-IRR dans un cas limite

**Protocole :** Décision humaine requise avant toute action. Interdiction d'automatiser.

---

### Γ-2 : LACUNE MAJEURE
**Définition :** Absence de règle dans un domaine qui affecte la cohérence systémique mais où une décision incorrecte est réversible.

**Exemples :**
- A-8 (mémoire constitutionnelle non implémentée)
- DR-2 (espace de liberté constitutionnel non défini)

**Protocole :** Documenter la lacune. Utiliser PCL. Décision différée jusqu'au prochain cycle standard.

---

### Γ-3 : LACUNE NORMALE
**Définition :** Absence de règle dans un domaine opérationnel courant. Impact limité à des cas spécifiques.

**Exemples :**
- Cas-limite de véhicules temporaires dans AF-IRR-2
- Comportement non défini lors de notifications concurrentes

**Protocole :** Documenter. Appliquer la règle la plus proche (analogie). Compléter au prochain cycle micro.

---

### Γ-4a : LACUNE CONCEPTUELLE
**Définition :** Confusion entre le modèle et la réalité — le système présente ses propres constructions comme des observations empiriques.

**Exemples :**
- "Bidirectionnelle" dans AF-IRR-3 original (choix de design présenté comme fait)
- Effet Pygmalion (A-12) : ImmatConnect prétend décrire ImmatConnect mais le crée

**Protocole :** CORR-style révision. Toute Γ-4a doit être corrigée avant déploiement.

---

### Γ-4b : LACUNE FERTILE
**Définition :** Zone d'incomplétude qui, une fois explorée, génère de nouvelles connaissances constitutionnelles positives.

**Exemples :**
- La lacune "qu'est-ce qui est indestructible ?" → a généré SMS et ADN
- La lacune "comment gérer les redondances ?" → a généré PCP

**Protocole :** Ne pas forcer la résolution prématurée. Documenter comme H-X (hypothèse) en attendant maturation.

---

## PARTIE II — PCL : PROTOCOLE DE CLASSIFICATION DES LIMITES

### Étape 1 — Identification
La situation ne peut pas être résolue par les normes actives.
→ Documenter la situation précisément.

### Étape 2 — Classification
Classer selon Γ-1 à Γ-4b (voir ci-dessus).

### Étape 3 — Application conditionnelle

**Condition α (Γ-1) :** Urgence + préjudice irréversible possible
→ Suspendre l'automatisation. Décision humaine immédiate.

**Condition β (Γ-2 à Γ-4b) :** Pas d'urgence critique
→ Appliquer la règle la plus proche par analogie. Documenter. Consigner dans MC-ID.

### Étape 4 — Résolution ou escalade
- Si résolution trouve : tester contre N. Si cohérent → AJOUTER (PCP).
- Si résolution impossible : escalader vers révision constitutionnelle.

---

## PARTIE III — HYPOTHÈSES SILENCIEUSES H-0 À H-13

Les hypothèses silencieuses sont des suppositions non documentées sur lesquelles ImmatConnect repose implicitement.

**Danger :** Si une hypothèse silencieuse est fausse, le système se comporte incorrectement sans déclencher d'erreur visible.

### H-0 à H-8 (héritage V1 — voir CORE.md)

### H-9 — Stabilité juridique
**Énoncé :** ImmatConnect suppose un contexte juridique d'immatriculation stable.
**Classe :** Γ-1 CRITIQUE
**Risque :** Si la définition légale d'un véhicule change, le système est invalide.
**Action :** Monitorer l'évolution juridique. Documenter les dépendances légales.

### H-10 — Fiabilité des données
**Énoncé :** ImmatConnect suppose que les données d'immatriculation reçues sont fiables.
**Classe :** Γ-2
**Risque :** Données corrompues ou frauduleuses non détectées.
**Action :** Audit de validation des données dans les protocoles.

### H-11 — Identifiabilité des entités responsables
**Énoncé :** ImmatConnect suppose que les entités responsables de véhicules sont toujours identifiables.
**Classe :** Γ-1 CRITIQUE
**Risque :** Véhicules abandonnés, propriétaires inconnus, cas de faillite, véhicules autonomes sans responsable désigné.
**Action :** Décision humaine requise pour ces cas-limites.

### H-12 — Stabilité de la définition de "véhicule"
**Énoncé :** ImmatConnect suppose que la définition de "véhicule" est stable et non-ambiguë.
**Classe :** Γ-4a (conceptuelle)
**Risque :** Drones, véhicules autonomes, véhicules amphibies, micro-mobilité — catégories émergentes.
**Action :** Définir explicitement le périmètre dans la prochaine révision.

### H-13 — Réception et compréhension des notifications
**Énoncé :** ImmatConnect suppose que les notifications sont reçues et comprises par les entités responsables.
**Classe :** Γ-2
**Risque :** Barrière linguistique, canaux défaillants, entités non réactives.
**Action :** Protocole de confirmation dans PROTOCOLS.md.

---

## PARTIE IV — PAI : PRINCIPE D'INADÉQUATION CONSTITUTIVE

**Formulation :**
> Dans tout système normatif expressif opérant dans un domaine dont l'espace d'états croît avec le temps, il existe un écart structurel irréductible entre la capacité normative du système et la réalité qu'il tente de gouverner.

**Statut :** CONJECTURE [70%] — pas encore un théorème

**Implications :**
- L'écart entre les normes d'ImmatConnect et la réalité des véhicules/responsabilités est *structurel*, pas accidentel.
- Cet écart ne peut pas être éliminé par plus de normes — il peut seulement être *reconnu et géré*.
- PAI justifie l'existence de la couche F : si l'écart est irréductible, il faut une frontière explicite.

**Unification :**
| Élément | Relation à PAI |
|---------|---------------|
| HCC | PAI(légitimité) — l'autorité est toujours partielle |
| PEC | PAI(temporalité) — le système est toujours en retard |
| PRA | PAI(méthode) — les règles ne couvrent pas tous les cas |
| DES (archivé) | PAI(épistémologie) — doublé par les 3 autres |

**Chemin vers théorème :**
1. Formaliser "espace d'états croissant" (mesure d'entropie normative)
2. Prouver que pour tout système normatif S et domaine D avec |états(D,t)| croissant, il existe t* tel que |normes(S)| < |états(D,t*)| pour t > t*
3. Montrer que cet écart est structurel (pas résolvable par ajout de normes)

---

## PARTIE V — DÉPENDANCES CRITIQUES DEP-1 À DEP-6

Les DEP sont des éléments dont ImmatConnect dépend mais qui ne sont pas documentés formellement — dépendances à la mémoire orale.

### DEP-1 — Méthode de calcul des statuts épistémiques
**Description :** Comment calcule-t-on qu'un élément est à 70% vs 85% vs 92% ?
**Risque :** Sans méthode documentée, les scores sont subjectifs et non-reproductibles.
**Action requise :** Documenter la méthode dans ce fichier (FRONTIER.md, section VI).

### DEP-2 — Critère de reclassification Γ
**Description :** Quand est-ce qu'une lacune Γ-3 devient Γ-2 ? Γ-4b devient Γ-4a ?
**Risque :** Sans critère, les reclassifications sont arbitraires.
**Action requise :** Formaliser les critères de reclassification.

### DEP-3 — Procédure de révision majeure
**Description :** Comment se déroule concrètement un audit Ω ? Qui doit être présent ? Quel quorum ?
**Risque :** Sans procédure, la révision majeure est impossible sans les fondateurs.
**Action requise :** Documenter dans PROTOCOLS.md.

### DEP-4 — Définition de "fondateur" vs "opérateur"
**Description :** Qui a le droit de réviser N ? Qui peut seulement modifier P ?
**Risque :** Sans distinction claire, n'importe qui peut revendiquer un pouvoir de révision de N.
**Action requise :** A-2 (Souverain) — décision humaine urgente.

### DEP-5 — Critère Γ-4a vs Γ-4b
**Description :** Comment distinguer une lacune conceptuelle (Γ-4a, corriger) d'une lacune fertile (Γ-4b, laisser mûrir) ?
**Risque :** Corriger prématurément une Γ-4b ou laisser traîner une Γ-4a.
**Action requise :** Formaliser le critère de distinction.

### DEP-6 — Condition de transition fondateur → gouverné
**Description :** Quand ImmatConnect n'est plus sous l'autorité de ses fondateurs mais sous celle de ses utilisateurs/opérateurs ?
**Risque :** DR-3 — la transition n'est pas documentée.
**Action requise :** Documenter dans PROTOCOLS.md.

---

## PARTIE VI — MÉTHODE PROVISOIRE DE CALCUL DES STATUTS ÉPISTÉMIQUES

*(Provisoire — DEP-1 : à formaliser)*

### Échelle
| Score | Signification |
|-------|-------------|
| 95-100% | Certitude logique (axiome, définition) |
| 85-94% | Théorème avec chaîne de dérivation complète |
| 70-84% | Proposition bien argumentée avec exemples et contre-exemples testés |
| 55-69% | Conjecture plausible avec arguments, contre-exemples non testés |
| 40-54% | Hypothèse de travail |
| < 40% | Intuition non argumentée — rejeter ou archiver en hypothèse |

### Facteurs de réduction
- Contre-exemple non réfuté : -15%
- Chaîne de dérivation incomplète : -8%
- Analogie non prouvée (ex : Gödel/normatif) : -10%
- Hypothèse silencieuse sous-jacente non documentée : -5%

### Facteurs d'augmentation
- Dérivation formelle complète : +10%
- Contre-exemples testés et réfutés : +5% par contre-exemple
- Validation par audit indépendant : +8%

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/FRONTIER.md*
