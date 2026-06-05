# IMMATCONNECT — OBD GAP RESOLUTION AUDIT

## Objectif

Identifier les problèmes restants dans la chaîne organique et appliquer une résolution documentaire non destructive.

Ce document ne modifie pas :

- le runtime ;
- Supabase ;
- l'UI ;
- les fichiers générés ;
- le comportement actuel de l'application.

Il prépare les corrections futures en évitant la dette, les liens artificiels et les ruptures d'ADN.

---

## Diagnostic synthétique

L'organisme est cohérent, mais certaines capacités actives ne sont pas encore complètement reliées à la chaîne :

```text
Loi → Boucle → Organe → Sens → Intention → Feature → Flow → Invariant → Source → Test
```

Les problèmes détectés sont des problèmes de cartographie et de traçabilité, pas des bugs runtime.

---

## Problème P1 — Features actives sans flow explicite

### Constat

Certaines features existent et fonctionnent, mais leur flow n'est pas encore formalisé.

Features concernées :

```text
F-GPS
F-SIGNAL-ROUTE
F-APPEL
F-SOS
F-ANGE
F-PROFIL
```

### Risque

```text
La fonctionnalité marche,
mais le Gardien ne peut pas toujours suivre son cycle complet.
```

### Résolution judicieuse

Ne pas inventer de comportement.
Créer progressivement des flows documentaires correspondant strictement au réel :

```text
F-SIGNAL-ROUTE  → FLOW-ROAD-REPORT
F-SOS           → FLOW-SOS
F-APPEL         → FLOW-AUDIO-CALL
F-GPS           → FLOW-GPS-NAVIGATION
F-PROFIL        → FLOW-PROFILE-MANAGEMENT
F-ANGE          → FLOW-ANGE-DIALOG
```

### Garde-fou

Chaque nouveau flow devra contenir uniquement des éléments vérifiables :

```text
UI réelle
code réel
state réel
data réelle
validation réelle
mémoire réelle
```

---

## Problème P2 — Intentions actives avec `flow: null`

### Constat

Certaines intentions sont connues, mais non rattachées à un flow.

Exemples :

```text
INT-SIGNAL-ROAD
INT-NAVIGATE
INT-SOS
INT-ASK-ANGE
INT-MANAGE-PROFILE
INT-CONFIRM-DANGER
INT-RESOLVE-ALERT
INT-FEEL-SAFE
```

### Risque

```text
L'intention humaine est comprise,
mais son parcours organique n'est pas complet.
```

### Résolution judicieuse

Ne pas forcer un rattachement faux.
Utiliser trois états :

```text
flow: "FLOW-ID"        → lien validé
flow: null             → dette assumée
flow_pending: "FLOW-X" → lien proposé mais non encore validé
```

### Garde-fou

Un flow ne doit être rattaché que si son comportement est réel et vérifiable.

---

## Problème P3 — Flow index partiel

### Constat

`architecture/IMMAT-FLOW-INDEX.json` couvre les flux principaux mais pas encore tout l'organisme actif.

Flows actuels :

```text
FLOW-MAP-SELF-MARKER
FLOW-VEHICLE-ALERT
FLOW-ASSIST-REQUEST
FLOW-DIRECT-MESSAGE
FLOW-BADGES
```

### Risque

```text
Une partie du système est auditable,
une autre reste implicite.
```

### Résolution judicieuse

Compléter le flow index par priorité, sans toucher au code :

1. route/report ;
2. SOS ;
3. appel audio ;
4. GPS ;
5. profil ;
6. Ange.

### Garde-fou

Ne pas créer plus de flows que nécessaire.
Un flow doit représenter un cycle vivant, pas un détail technique.

---

## Problème P4 — Risque de dépendance excessive à Ange

### Constat

Ange est l'organe le plus complet en termes de sens.

### Risque

```text
L'organisme devient compréhensible uniquement via Ange.
```

### Résolution judicieuse

Maintenir deux portes de compréhension :

```text
OBD documentaire
Ange assistant
```

Ange peut expliquer, conseiller, proposer.
OBD doit permettre à un humain ou à une IA externe de comprendre sans Ange.

### Garde-fou

Toute action importante doit rester accessible par l'UI native.

---

## Problème P5 — `sentir` encore fragile

### Constat

`sentir` correspond à la compréhension du contexte.

### Risque

```text
Le système pourrait interpréter avant d'avoir assez de contexte.
```

### Résolution judicieuse

Ne pas activer `sentir` comme capacité autonome tant que la cartographie n'est pas complète.

Conditions minimales avant activation forte :

```text
features actives reliées
intentions actives reliées
flows avec impacts
flows avec validation
Ange non vital
```

---

## Problème P6 — Future vérification automatique trop brutale

### Constat

Des checks trop stricts peuvent bloquer les petites corrections.

### Risque

```text
La gouvernance protège,
mais ralentit inutilement.
```

### Résolution judicieuse

Introduire les contrôles progressivement :

```text
Phase A : warnings seulement
Phase B : rapport Gardien
Phase C : blocage uniquement pour impact moyen/fort
```

### Garde-fou

Toujours appliquer la rigueur proportionnelle à l'impact.

---

## Résolution globale appliquée

La résolution retenue est :

```text
1. Ne pas modifier le runtime.
2. Ne pas modifier les fichiers générés.
3. Ne pas créer de source de vérité concurrente.
4. Documenter les gaps.
5. Définir les flows à créer.
6. Définir les garde-fous.
7. Préparer un rattachement progressif.
```

Cela renforce l'architecture sans casser l'existant.

---

## Ordre recommandé des prochaines corrections réelles

### Étape 1 — Ajouter les flows documentaires manquants

Dans `architecture/IMMAT-FLOW-INDEX.json` :

```text
FLOW-ROAD-REPORT
FLOW-SOS
FLOW-AUDIO-CALL
FLOW-GPS-NAVIGATION
FLOW-PROFILE-MANAGEMENT
FLOW-ANGE-DIALOG
```

### Étape 2 — Mettre à jour les features

Dans `knowledge/features.json`, rattacher chaque feature active à son flow réel.

### Étape 3 — Mettre à jour les intentions

Dans `knowledge/intentions.json`, rattacher uniquement les intentions dont le flow est validé.

### Étape 4 — Synchroniser

Exécuter :

```bash
node scripts/sync-knowledge.js --check
```

Puis, si nécessaire :

```bash
node scripts/sync-knowledge.js
```

### Étape 5 — Ajouter des warnings non bloquants

Plus tard seulement, dans `scripts/sync-knowledge.js --check`.

---

## Critères de réussite

La correction sera réussie si :

```text
L'application fonctionne comme aujourd'hui.
Les flows correspondent au réel.
Aucun lien artificiel n'est introduit.
Aucune vérité n'est dupliquée.
Aucun fichier généré n'est modifié manuellement.
Chaque gap est visible ou résolu.
Ange reste utile mais non vital.
```

---

## Verdict

Les problèmes constatés peuvent être réglés sans refonte technique.

La meilleure stratégie est :

```text
cartographier
rattacher
synchroniser
contrôler progressivement
```

Cette approche est cohérente avec l'ADN organique :

```text
Tout découle.
Rien ne se force.
Rien ne se duplique.
Rien ne casse.
```
