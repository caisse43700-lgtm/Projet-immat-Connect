# IMMATCONNECT — OBD STABILITY IMPROVEMENTS AUDIT

## Objectif

Ce document audite les améliorations proposées après `OBD-CROSS-LINK-AUDIT.md` afin de vérifier qu'elles peuvent renforcer l'architecture sans casser l'application actuelle.

Il ne modifie pas le code.
Il ne modifie pas les fichiers générés.
Il ne crée pas de nouvelle source de vérité.

Il sert à cadrer une évolution plus stable, plus fluide et plus cohérente de l'organisme.

---

## Base conservée

La base organique reste inchangée :

```text
ORGANISM-RULES.json
↓
immat-nervous-system.json
↓
knowledge-index.json
↓
knowledge/*.json
↓
sync-knowledge.js
↓
knowledge-conducteur.ts / knowledge-gardien.ts
```

Aucune amélioration ne doit contourner cette chaîne.

---

## Améliorations proposées à auditer

Les améliorations envisagées sont :

1. compléter les flows manquants ;
2. rattacher les intentions `flow:null` ;
3. rattacher toutes les features actives à un flow ;
4. renforcer la lisibilité OBD ;
5. maintenir Ange non vital ;
6. préparer `sentir` sans l'activer prématurément ;
7. étendre les checks automatiques plus tard.

---

## Audit des problèmes que ces améliorations pourraient créer

### R-001 — Trop de flows créés d'un coup

#### Problème possible

Créer trop de flows documentaires d'un coup peut rendre `IMMAT-FLOW-INDEX.json` lourd, verbeux et difficile à maintenir.

#### Risque

```text
Cartographie complète
mais illisible.
```

#### Résolution

Créer uniquement des flows pour les capacités actives déjà visibles dans l'application.

Priorité stricte :

```text
1. FLOW-ROAD-REPORT
2. FLOW-SOS
3. FLOW-AUDIO-CALL
4. FLOW-GPS-NAVIGATION
5. FLOW-PROFILE-MANAGEMENT
6. FLOW-ANGE-DIALOG
```

Ne pas créer de flows prospectifs tant que la capacité n'est pas active ou réservée.

---

### R-002 — Flow trop théorique

#### Problème possible

Un flow peut décrire une intention idéale mais ne pas correspondre au comportement réel.

#### Risque

```text
Documentation plus belle que la réalité.
```

Cela viole l'esprit de `REALITY_OVER_DOCUMENTATION`.

#### Résolution

Tout flow ajouté doit être basé sur :

```text
UI réelle
code réel
state réel
data réelle
validation réelle
mémoire réelle
```

Si une section est inconnue, indiquer explicitement :

```text
à vérifier
```

Ne jamais inventer un comportement.

---

### R-003 — Rattachement artificiel d'une intention

#### Problème possible

Forcer une intention à rentrer dans un flow existant peut masquer une vraie faiblesse d'architecture.

#### Risque

```text
La chaîne semble complète,
mais le lien est faux.
```

#### Résolution

Trois statuts sont autorisés :

```text
flow: "FLOW-ID"       → lien réel
flow: null            → dette assumée
flow_pending: "nom"   → flow à créer, non encore validé
```

Ne pas rattacher artificiellement.

---

### R-004 — Confusion feature / flow

#### Problème possible

Une feature peut être confondue avec un flow.

Exemple :

```text
F-SOS = capacité
FLOW-SOS = cycle complet d'usage
```

#### Risque

```text
Mauvaise granularité.
```

#### Résolution

Règle :

```text
Feature = ce que le conducteur peut faire.
Flow = comment cette capacité vit dans l'organisme.
```

Un flow doit répondre aux 7 questions de `IMMAT-FLOW-INDEX.json` :

```text
pourquoi
où visible
où stocké
qui peut agir
quel impact
comment valider
comment mémoriser
```

---

### R-005 — Ange trop protégé mais moins utile

#### Problème possible

En voulant éviter qu'Ange devienne vital, on pourrait trop le limiter.

#### Risque

```text
Ange reste sûr,
mais devient peu utile.
```

#### Résolution

Ange peut :

```text
expliquer
orienter
conseiller
proposer
résumer
identifier un risque
```

Ange ne peut pas :

```text
décider
modifier seul
être le seul chemin d'une action
remplacer une UI native
```

La règle n'est donc pas de réduire Ange.
Elle est de maintenir un chemin natif pour toute action importante.

---

### R-006 — `sentir` activé trop tôt

#### Problème possible

`sentir` représente la compréhension du contexte.
L'activer avant que les flows et intentions soient complets peut créer des interprétations fragiles.

#### Risque

```text
L'organisme croit comprendre,
mais son contexte est incomplet.
```

#### Résolution

`sentir` doit rester en préparation tant que ces conditions ne sont pas remplies :

```text
100 % des features actives ont un flow ou une dette explicite.
100 % des intentions actives ont un flow ou une dette explicite.
Les boucles vitales sont reliées aux organes.
Les flows indiquent leurs impacts et validations.
Ange reste non vital.
```

---

### R-007 — Check automatique trop strict

#### Problème possible

Un futur check peut bloquer des corrections mineures.

#### Risque

```text
La gouvernance ralentit les fixs simples.
```

#### Résolution

Appliquer une rigueur proportionnelle :

```text
Impact faible  → organe + fichier + test
Impact moyen   → organe + sens + invariant + test
Impact fort    → loi + boucle + organe + flow + invariant + test
```

Un fix orthographique ou visuel ne doit pas être traité comme une mutation ADN.

---

### R-008 — Check automatique trop faible

#### Problème possible

Si les checks restent purement documentaires, une dérive peut encore apparaître.

#### Risque

```text
Le document dit que tout est relié,
mais le code diverge.
```

#### Résolution

Ajouter plus tard un check non bloquant d'abord, puis bloquant seulement après stabilisation.

Ordre recommandé :

```text
Phase A : warning seulement
Phase B : warning + rapport Gardien
Phase C : blocage uniquement pour impact moyen/fort
```

---

### R-009 — OBD devient nouvelle vérité

#### Problème possible

Les documents OBD peuvent être confondus avec une source canonique.

#### Risque

```text
OBD remplace l'ADN.
```

#### Résolution

Chaque document OBD doit rappeler :

```text
OBD est une porte d'entrée et un diagnostic.
OBD ne définit pas la vérité.
La vérité vit dans les sources canoniques.
```

---

### R-010 — Amélioration sans perception conducteur

#### Problème possible

L'architecture devient plus belle, mais le conducteur ne perçoit aucune amélioration.

#### Risque

```text
Dette de compréhension.
```

#### Résolution

Toute amélioration organique doit indiquer si elle apporte :

```text
une meilleure sécurité
une meilleure compréhension
une meilleure stabilité
une meilleure maintenabilité
```

Si elle n'apporte aucune valeur perceptible ou structurelle, elle est inutile.

---

## Architecture supérieure proposée

La version supérieure ne remplace pas l'architecture actuelle.
Elle la rend plus lisible et plus vérifiable.

```text
Loi organique
↓
Boucle vitale
↓
Organe
↓
Sens
↓
Intention
↓
Feature
↓
Flow
↓
Invariant
↓
Source canonique
↓
Projection
↓
Test / preuve
```

Différence importante :

```text
Intention vient avant Feature.
```

Car `knowledge/intentions.json` indique déjà que l'intention est la vraie racine de compréhension.

---

## Ordre d'application recommandé

### Étape 1 — Aucun code

Compléter seulement l'audit et la cartographie.

### Étape 2 — Flows documentaires manquants

Créer les flows manquants dans `architecture/IMMAT-FLOW-INDEX.json`, mais uniquement pour le réel actif.

### Étape 3 — Rattacher les features

Mettre à jour `knowledge/features.json` pour relier les features actives à leurs flows.

### Étape 4 — Rattacher les intentions

Mettre à jour `knowledge/intentions.json` avec les flows validés.

### Étape 5 — Sync

Exécuter :

```bash
node scripts/sync-knowledge.js --check
```

Puis régénérer si nécessaire :

```bash
node scripts/sync-knowledge.js
```

### Étape 6 — Check renforcé futur

Ajouter plus tard des warnings dans `sync-knowledge.js --check` pour :

```text
feature active sans flow
intention active sans flow
flow sans intention
flow sans organe
feature avec organe absent du NS
```

---

## Critères de réussite

L'amélioration est réussie si :

```text
L'application fonctionne exactement comme avant.
Aucune logique runtime n'est modifiée.
Aucun fichier généré n'est édité à la main.
Chaque feature active a un flow ou une dette explicite.
Chaque intention active a un flow ou une dette explicite.
Aucun flow n'est inventé hors réalité.
Ange reste utile mais non vital.
OBD reste une entrée de diagnostic, pas une source de vérité.
```

---

## Verdict

Les améliorations proposées sont pertinentes, mais seulement si elles restent progressives et documentaires au départ.

La stratégie la plus sûre est :

```text
compléter les liens
avant de renforcer les checks
avant d'activer sentir
avant de toucher au code
```

Cette approche rend l'architecture supérieure à l'actuelle sans casser l'existant, car elle ne change pas le comportement de l'application.

Elle rend simplement visible ce qui était implicite.

---

## Décision recommandée

Ne pas lancer une refonte technique.

Lancer une refondation organique en trois temps :

```text
1. Cartographie complète
2. Rattachement complet
3. Contrôle progressif
```

C'est la voie la plus fluide, la plus légitime et la moins génératrice de dette.
