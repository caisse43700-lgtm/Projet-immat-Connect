# MEMORY — A-8 MÉMOIRE CONSTITUTIONNELLE

**Version : Ω∞ (design complet)**
**Statut : DESIGN APPROUVÉ — implémentation requise**
**Problème résolu : DR-1 (contradiction falsification/mémoire)**

---

## CONTEXTE — DR-1

### Le problème
La falsification (principe F-X) exige qu'une norme invalide soit supprimée ou révisée. Mais si on supprime sans trace, on perd la mémoire de pourquoi la norme existait et de ce qui l'a invalidée. Un futur opérateur peut réintroduire la même norme, déclencher la même erreur, et déclencher la même réfutation — en boucle infinie.

**DR-1 : Contradiction falsification/mémoire** — Comment falsifier sans perdre la mémoire de ce qui a été falsifié et pourquoi ?

### La solution : A-8 Mémoire Constitutionnelle
Un registre formel de chaque décision constitutionnelle significative, incluant : la situation, le principe appliqué, la décision prise, le raisonnement, le résultat, et le statut actuel.

---

## FORMAT MC-ID — MÉMOIRE CONSTITUTIONNELLE

```
MC-ID : [MC-NNN]
DATE : [YYYY-MM-DD]
SITUATION : [description de la situation ou du cas rencontré]
PRINCIPE : [principe(s) constitutionnel(s) activé(s)]
DÉCISION : [AJOUTER / FUSIONNER / REMPLACER / ARCHIVER / REJETER / CORRIGER]
RAISONNEMENT : [pourquoi cette décision]
RÉSULTAT : [ce qui a changé dans le corpus]
STATUT : [ACTIF / ARCHIVÉ / RÉVISÉ par MC-NNN]
LIEN : [référence vers HISTORY.md si applicable]
```

---

## EXEMPLES DE MÉMOIRES CONSTITUTIONNELLES

### MC-001 — Suppression de PIC
```
MC-ID : MC-001
DATE : [date Audit Ω+]
SITUATION : PIC (Principe d'Irréductibilité Constitutionnelle) existe dans le corpus
PRINCIPE : PCP DÉCISION 4 — ARCHIVER (redondance)
DÉCISION : ARCHIVER
RAISONNEMENT : PIC est entièrement couvert par T-01 + Θ + I-δ. Aucune situation couverte par PIC n'est absente des trois autres. Maintenir PIC crée de la confusion sans ajouter d'information.
RÉSULTAT : PIC archivé dans ARCHIVE.md. Supprimé des normes actives.
STATUT : ARCHIVÉ
LIEN : ARCHIVE.md#PIC, AUDIT-OMEGA.md#Mission-6
```

### MC-002 — Révision AF-IRR-3
```
MC-ID : MC-002
DATE : [date Audit Ω+]
SITUATION : AF-IRR-3 contenait "bidirectionnelle" — un choix de design présenté comme observation empirique
PRINCIPE : A-01 (Antériorité du Réel) + ADN-3
DÉCISION : REMPLACER
RAISONNEMENT : "Bidirectionnelle" décrit une architecture possible, pas une réalité observée. ImmatConnect peut notifier sans écouter les retours. Présenter un choix de design comme une observation empirique (AF-IRR) est une erreur constitutionnelle de catégorie Γ-4a.
RÉSULTAT : AF-IRR-3 révisé — "bidirectionnelle" supprimé. Formulation canonique dans ADN-3.
STATUT : ACTIF (révision en vigueur)
LIEN : ADN.md#ADN-3, AUDIT-OMEGA.md#Mission-1
```

### MC-003 — Révision A-00 (clause tiers)
```
MC-ID : MC-003
DATE : [date Audit Ω+]
SITUATION : A-00 légitimait des systèmes exploiteurs — la liberté de l'utilisateur pouvait nuire à des tiers
PRINCIPE : ADN-6 (révisé) + éthique fondamentale
DÉCISION : REMPLACER
RAISONNEMENT : Contre-exemples Uber (liberté de la plateforme nuit aux chauffeurs) et Purdue (liberté commerciale nuit aux patients) montrent que A-00 sans contrainte tiers est insuffisant. Un axiome qui autorise des systèmes exploiteurs viole la mission fondatrice d'ImmatConnect.
RÉSULTAT : A-00 révisé avec clause "sans nuire à des tiers non-utilisateurs du système".
STATUT : ACTIF
LIEN : ADN.md#ADN-6, AUDIT-OMEGA.md#Mission-2
```

### MC-004 — Fusion MPNA dans T-01
```
MC-ID : MC-004
DATE : [date Audit Ω+]
SITUATION : MPNA existait comme corollaire autonome de T-01
PRINCIPE : PCP DÉCISION 2 — FUSIONNER
DÉCISION : FUSIONNER
RAISONNEMENT : MPNA est un corollaire direct de T-01. Toute situation couverte par MPNA est couverte par T-01. Maintenir MPNA comme entité autonome crée une fausse impression d'indépendance.
RÉSULTAT : MPNA fusionné dans T-01 comme note de corollaire. MPNA autonome archivé.
STATUT : ARCHIVÉ (contenu intégré dans T-01)
LIEN : ARCHIVE.md#MPNA, AUDIT-OMEGA.md#Mission-3
```

---

## RÈGLES D'USAGE DE A-8

### Obligation de consignation
Toute décision constitutionnelle de type Majeur ou Critique (voir LIFECYCLE.md) doit générer une entrée MC-ID.

Les décisions Micro et Standard peuvent être consignées mais ne sont pas obligatoires.

### Format de l'ID
MC-NNN où NNN est un entier croissant. Pas de réutilisation d'ID. Pas de suppression d'entrées.

### Règle de non-suppression
Une entrée MC-ID ne se supprime jamais. Elle peut être :
- **RÉVISÉE** (statut "RÉVISÉ par MC-NNN") : la décision originale a été reévaluée
- **ARCHIVÉE** (statut "ARCHIVÉ") : la norme associée a été archivée
- **ACTIF** : la décision reste en vigueur

### Accessibilité
Le registre MC doit être :
- Lisible par tout opérateur sans formation préalable
- Ordonné chronologiquement
- Searchable par PRINCIPE et par DÉCISION

---

## RELATION AVEC HISTORY.md

MEMORY.md (A-8) enregistre les décisions individuelles avec leur raisonnement.
HISTORY.md enregistre les événements constitutionnels majeurs (sessions d'audit, versions, cycles de révision).

**Analogie :**
- MEMORY.md = jurisprudence (chaque décision individuelle)
- HISTORY.md = chronique (les grandes étapes)

---

## IMPLÉMENTATION REQUISE

### État actuel
A-8 est **DESIGN APPROUVÉ** — le format existe, les exemples sont documentés, mais le registre MC n'est pas encore opérationnel.

### Prochaines étapes
1. Créer un fichier dédié `docs/constitution/MEMORY-REGISTER.md` pour le registre MC en production
2. Consigner les décisions Ω+ (MC-001 à MC-00X) rétroactivement
3. Définir le processus de consignation automatique (optionnel — peut rester manuel)

### Blocage DEP-1
DEP-1 : La méthode de calcul des statuts épistémiques est orale (non documentée). Sans DEP-1 résolu, les entrées MC ne peuvent pas documenter les scores épistémiques de façon reproductible.

**Action requise :** Documenter la méthode de calcul des statuts épistémiques dans FRONTIER.md.

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/MEMORY.md*
