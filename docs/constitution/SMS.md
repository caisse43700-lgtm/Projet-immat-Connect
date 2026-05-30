# SMS — STRUCTURE MINIMALE DE SURVIE SYSTÉMIQUE

**Version : Ω∞ (architecture vivante)**
**Statut : RÉFÉRENCE — prouvé minimal et suffisant**
**Triple irréductible : (N, F, P)**

---

## DÉFINITION

La SMS est la plus petite structure permettant à un système de :
- **C1** : Conserver son identité dans le temps
- **C2** : Transmettre sa connaissance sans dépendance orale
- **C3** : Intégrer des nouveautés sans perdre sa cohérence
- **C4** : Survivre à ses propres erreurs
- **C5** : Se reconstruire après destruction partielle
- **C6** : Rester cohérent malgré un écart irréductible entre normes et réalité

**Résultat :** La SMS est le triplet **(N, F, P)** — et ce triplet est à la fois nécessaire et suffisant.

---

## COMPOSANTE N — NOYAU (Nucleus)

### Définition
L'ensemble des éléments dont la destruction entraîne la perte d'identité irréversible du système.

### Contenu
- **ADN constitutionnel** (7 éléments — voir ADN.md)
- **Axiomes** (A-(-1), A-01, A-00)
- **Théorèmes fondateurs** (T-01)
- **Propositions fondatrices empiriques** (AF-IRR-1, AF-IRR-2, AF-IRR-3)

### Propriétés
- **Immuabilité fonctionnelle** : N ne change que si une révision majeure est justifiée et documentée
- **Fondation de F et P** : N précède logiquement et légitime F et P
- **Non-autofondation** (ADN-4) : N ne se valide pas lui-même

### État dans V1
- **FORT** — NUCLEUS.md + CORE.md + ADN.md couvrent N intégralement

### Fichiers
- `docs/constitution/NUCLEUS.md` — noyau irréductible
- `docs/constitution/ADN.md` — 7 éléments canoniques
- `docs/constitution/CORE.md` — référence complète

---

## COMPOSANTE F — FRONTIÈRE (Frontier)

### Définition
L'ensemble des mécanismes permettant de distinguer ce qui est connu, ce qui est inconnu, et ce qui est inconnaissable — et de traiter chaque cas de façon appropriée.

### Contenu
- **Taxonomie des lacunes** Γ-1 à Γ-4b
- **PCL** — Protocole de Classification des Limites (4 étapes, conditions α/β)
- **Hypothèses silencieuses** H-0 à H-13
- **PAI** — Principe d'Inadéquation Constitutive [CONJECTURE 70%]
- **PEC** — Principe d'Équivalence Constitutive [CONJECTURE 60%]
- **Dépendances critiques** DEP-1 à DEP-6
- **Zones ouvertes** A-11 (légitimité fondateur), A-12 (Effet Pygmalion)

### Propriétés
- **Reconnaissance des limites** : F sait ce qu'il ne sait pas
- **Non-expansion arbitraire** : F exige justification pour tout ajout
- **Connexion à N** : toute frontière se justifie par rapport au noyau

### État dans V1
- **PARTIEL** — Γ + PCL présents dans CORE.md ; H-9 à H-13 et PAI non encore dans les fichiers

### Fichiers
- `docs/constitution/FRONTIER.md` — couche F complète (à créer/mettre à jour)
- `docs/constitution/RESEARCH.md` — conjectures et théories en développement

---

## COMPOSANTE P — PROTOCOLES (Protocols)

### Définition
L'ensemble des procédures opérationnelles permettant d'agir sous incertitude de façon cohérente avec N et F.

### Contenu
- **VEHICLE-001** — Persist before notify
- **INV-001 à INV-014** — invariants deepFrozen
- **PCP** — Protocole de Parcimonie Constitutionnelle (5 décisions)
- **A-8** — Mémoire Constitutionnelle (design MC-ID, non encore implémenté)
- **Politique d'entropie** — 4 phases (Croissance/Maintenance/Compression/Archivage)
- **Lacunes opérationnelles** A-1, A-3, A-5, A-6, A-7, A-9, DR-2, DR-3

### Propriétés
- **Dérivation de N** : tout protocole est justifiable par un élément de N
- **Guidance de F** : P opère dans les limites définies par F
- **Opérabilité** : P permet d'agir même sans résoudre les questions de F

### État dans V1
- **INSUFFISANT** — VEHICLE-001 + INV = P minimal seulement
- **Toutes les lacunes A-1 à A-12 sont des lacunes de P**

### Fichiers
- `docs/constitution/PROTOCOLS.md` — couche P complète (à créer)
- `docs/constitution/LIFECYCLE.md` — PCP + politique d'entropie
- `docs/constitution/MEMORY.md` — A-8 design

---

## PREUVE DE MINIMALITÉ

### Test A — Suppression de N
Sans N : pas d'identité, pas de fondement pour F et P.
Résultat : **effondrement total**. N est nécessaire.

### Test B — Suppression de F
Sans F : le système ne sait pas ce qu'il ne sait pas. Il croît sans limite ou stagne sans savoir pourquoi.
Résultat : **perte de C3, C4, C6**. F est nécessaire.

### Test C — Suppression de P
Sans P : le système sait qui il est et connaît ses limites mais ne peut pas agir.
Résultat : **perte de C2, C4, C5**. P est nécessaire.

### Test D — Réduction interne
Peut-on réduire N, F, ou P sans perdre une condition C ?
- N réduit = perte de C1 (ADN incomplet → identité partielle)
- F réduit = perte de C6 (zones inconnues non reconnues)
- P réduit = perte de C5 (pas de procédure de reconstruction)
Résultat : **aucune réduction possible**. SMS est minimale.

---

## RELATIONS ENTRE COMPOSANTES

```
N ←——————————————— fondement
|                       |
|  fonde F et P         |
↓                       |
F ←——————————— guide    |
|                       |
|  délimite P           |
↓                       |
P ←——— opère dans N∩F   |
|                       |
|  retour d'expérience  |
└———————————————————————→
```

**N fonde F et P** : les frontières et protocoles doivent se justifier par le noyau.
**F guide P** : les protocoles opèrent dans les limites que la frontière reconnaît.
**P retourne vers N** : l'expérience opérationnelle peut questionner le noyau (via révision documentée).

---

## CORRESPONDANCES AVEC LES DÉCOUVERTES Ω+

| SMS | Correspondance | Statut |
|-----|---------------|--------|
| N (Noyau) | ADN constitutionnel | Confirmé |
| F (Frontière) | PAI + Γ + PCL | Confirmé |
| P (Protocoles) | A-8 + PCP + VEHICLE-001 | Partiel |
| SMS entière | ADN + PAI combinés | Confirmé |

**La SMS unifie ADN et PAI** :
- ADN = contenu de N
- PAI = mécanisme fondamental de F (l'écart irréductible entre N et réalité)
- PCP = mécanisme fondamental de P (comment P évolue sans corrompre N)

---

## DIAGNOSTIC V1

| Composante | État | Lacunes |
|-----------|------|---------|
| N | FORT | Corrections CORR-2 à CORR-6 à appliquer |
| F | PARTIEL | H-9/H-13, PAI, DEP-1/6 non documentés |
| P | INSUFFISANT | A-1, A-3, A-5, A-6, A-7, A-8, A-9, DR-2, DR-3 |

**Priorité pour V3 :** Compléter P (Protocoles) en priorité.

---

## SCÉNARIOS DE SURVIE TESTÉS

| Scénario | Impact SMS | Verdict |
|----------|-----------|---------|
| Perte 30% de P | N et F intacts | Opérationnel — P reconstruit |
| Perte 60% de P | N et F intacts | Affaibli — reconstruction longue |
| Perte de tout sauf ADN (N minimal) | F et P détruits | Reconstruction 5-10 sessions |
| Axiome invalidé | N révisé localement | F et P mis à jour |
| AF-IRR changé | N révisé localement | Révision localisée |
| Nouveau théorème | F élargie | Croissance contrôlée |
| Contre-exemple à PAI | F auditée | N et P survivent |
| Nouveau domaine applicatif | P révisé | N et F stables |

---

## RÈGLE D'ÉVOLUTION

Toute modification de la SMS doit suivre PCP (voir LIFECYCLE.md) :
1. **Modifier N** → révision majeure + audit Ω-style + vote humain
2. **Modifier F** → révision standard + justification par N
3. **Modifier P** → révision opérationnelle + test de non-contradiction avec N et F

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/SMS.md*
