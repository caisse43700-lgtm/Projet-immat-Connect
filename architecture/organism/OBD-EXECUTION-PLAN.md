# OBD EXECUTION PLAN

## Principe

Aucune modification runtime.
Aucune modification Supabase.
Aucune modification UI.
Aucune modification métier.

Objectif : renforcer la cohérence sans changer le comportement actuel.

## Phase 1 — Cartographie complète

Compléter uniquement :
- intentions ↔ flows
- features ↔ flows
- flows ↔ organes
- flows ↔ boucles vitales

Aucun changement de code.

## Phase 2 — Déclaration des dettes explicites

Lorsqu'un flow manque :

```text
flow: null
```

reste autorisé mais doit être documenté.

Une dette visible est préférable à un faux lien.

## Phase 3 — Vérification de couverture

Objectif :

```text
100 % intentions
↓
flow ou dette explicite

100 % features
↓
flow ou dette explicite
```

## Phase 4 — Check non bloquant

Ajouter plus tard des warnings :

- feature sans flow
- intention sans flow
- flow sans organe
- flow sans boucle vitale

Aucun blocage CI.

## Phase 5 — Stabilisation

Lorsque la cartographie est complète :

```text
Loi
↓
Boucle
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
Source
↓
Test
```

Toute évolution devra pouvoir parcourir cette chaîne.

## Critère final

L'application doit fonctionner exactement comme avant.

La seule différence acceptable est :

- meilleure compréhension ;
- meilleure auditabilité ;
- meilleure traçabilité ;
- moins de dette future.
