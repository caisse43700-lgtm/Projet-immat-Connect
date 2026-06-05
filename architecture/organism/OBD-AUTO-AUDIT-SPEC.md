# OBD AUTO AUDIT

## Objectif

Faire apparaitre les oublis structurels sans bloquer le fonctionnement.

## Warnings non bloquants

### W-001
Feature sans flow.

### W-002
Intention sans flow.

### W-003
Flow sans organe.

### W-004
Flow sans validation.

### W-005
Flow sans memoire.

### W-006
Feature reference un flow inexistant.

### W-007
Intention reference un flow inexistant.

## Score organique

100
- 2 par W-001
- 2 par W-002
- 3 par W-003
- 2 par W-004
- 2 par W-005
- 3 par W-006
- 3 par W-007

## Affichage

Le mode --check reste vert.

Il affiche ensuite :

ORGANIC SCORE : XX/100

et la liste des warnings.

## Regle

Un warning n'empeche jamais la generation.

Il rend simplement visible ce qui manque.
