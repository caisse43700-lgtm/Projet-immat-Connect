# ARCHIVE — ÉLÉMENTS SUPPRIMÉS, FUSIONNÉS OU REMPLACÉS

**Version : Ω∞ (post-audit Ω+)**
**Statut : LECTURE SEULE — aucune modification autorisée**
**Règle absolue : les archives ne se suppriment jamais. Elles peuvent être annotées.**

---

## AVERTISSEMENT

Ce fichier contient des éléments retirés du corpus actif. Ils ne sont pas des normes opérationnelles. Leur présence ici sert à :
1. Préserver la mémoire de pourquoi ils ont existé
2. Expliquer pourquoi ils ont été retirés
3. Empêcher leur réintroduction accidentelle (DR-1)

**Si vous trouvez une proposition qui ressemble à un élément archivé ici : consultez d'abord ce fichier avant de la réintroduire.**

---

## PIC — PRINCIPE D'IRRÉDUCTIBILITÉ CONSTITUTIONNELLE

**Statut archive : SUPPRIMÉ — REDONDANT**
**Date : Audit Ω+**
**Mémoire : MC-001 (voir MEMORY.md)**

### Formulation originale
> Le noyau constitutionnel d'ImmatConnect ne peut être réduit à un sous-ensemble de ses éléments sans perte d'identité systémique.

### Raison de suppression
PIC est entièrement couvert par :
- T-01 (Non-Autojuridiction) — fonde l'irréductibilité par rapport à l'externe
- Θ (invariant de noyau) — fonde l'irréductibilité interne
- I-δ (Transitivité normative) — couvre la cohérence de l'irréductibilité

Maintenir PIC comme norme autonome crée une fausse impression qu'il ajoute quelque chose. Il n'ajoute rien que les trois autres n'offrent pas déjà.

### Ce qui est couvert par d'autres éléments
La notion de "noyau irréductible" est désormais formalisée dans :
- ADN.md (7 éléments canoniques + preuve de minimalité)
- SMS.md (composante N + Tests A/B/C/D de minimalité)

### Avertissement de réintroduction
Si quelqu'un propose un "Principe d'Irréductibilité" à l'avenir, vérifier d'abord si cette irréductibilité est couverte par ADN.md + SMS.md avant d'envisager tout ajout.

---

## DES — DOCTRINE D'ÉVOLUTION SYSTÉMIQUE

**Statut archive : SUPPRIMÉ — REDONDANT**
**Date : Audit Ω+**

### Formulation originale
> ImmatConnect évolue par accumulation de connaissances vérifiées, non par révolution arbitraire.

### Raison de suppression
DES est entièrement couvert par :
- R1 à R5 (règles d'évolution — dans CORE.md)
- PCP (Protocole de Parcimonie Constitutionnelle — dans LIFECYCLE.md)
- La politique d'entropie (dans LIFECYCLE.md)

DES énonçait un principe général que R1-R5 et PCP opérationnalisent complètement. Maintenir DES sans les détails crée une fausse impression de couverture.

### Ce qui est couvert par d'autres éléments
- "Accumulation de connaissances vérifiées" → PCP DÉCISION 1 (AJOUTER — critères formels)
- "Non par révolution arbitraire" → PCP DÉCISION 3 (REMPLACER — critères formels)
- "Évolution systémique" → LIFECYCLE.md Phase 1-4

---

## MPNA — MÉCANISME DE PRÉVENTION DE LA NON-AUTOJURIDICTION

**Statut archive : FUSIONNÉ DANS T-01**
**Date : Audit Ω+**
**Mémoire : MC-004 (voir MEMORY.md)**

### Formulation originale
> Tout mécanisme susceptible de permettre à ImmatConnect de s'évaluer lui-même doit être détecté et neutralisé.

### Raison de fusion
MPNA est un corollaire direct de T-01. T-01 dit qu'ImmatConnect ne peut pas être juge de sa propre conformité. MPNA dit qu'il faut détecter et neutraliser les mécanismes qui permettraient cette auto-évaluation. Mais cette opérationnalisation est déjà dans T-01 + A-9 (Protocole de non-régression).

### Où trouver le contenu
- Principe : T-01 (ADN-7) dans CORE.md et ADN.md
- Opérationnalisation : A-9 dans PROTOCOLS.md

---

## SCD — SCHÉMA DE COHÉRENCE DYNAMIQUE

**Statut archive : ARCHIVÉ — OUTIL PÉDAGOGIQUE (non-normatif)**
**Date : Audit Ω+**

### Description
SCD était une représentation graphique/schématique des relations entre éléments du corpus.

### Raison d'archivage
SCD est utile comme outil pédagogique mais n'a aucune autorité normative. Le maintenir dans le corpus actif créait une fausse impression d'autorité.

### Utilisation légitime
Formation et onboarding uniquement. Jamais comme référence normative dans une décision constitutionnelle.

### Reconstruction si besoin
Le SCD peut être reconstruit à tout moment depuis :
- MEMORY-MAP.md (carte des dépendances)
- ADN.md + SMS.md (structure de base)
- CORE.md (relations détaillées)

---

## "BIDIRECTIONNELLE" DANS AF-IRR-3

**Statut archive : TERME SUPPRIMÉ**
**Date : Audit Ω+ (CORR-2)**

### Formulation originale d'AF-IRR-3
> La relation entre ImmatConnect et les entités responsables de véhicules est bidirectionnelle.

### Raison de suppression
"Bidirectionnelle" décrit une architecture possible (le système écoute les retours des entités responsables), pas une réalité empiriquement observée. Présenter un choix de design comme une observation fondatrice (AF-IRR) est une erreur constitutionnelle de catégorie Γ-4a.

### Formulation révisée
Voir AF-IRR-3 dans CORE.md et ADN-3 dans ADN.md.

---

## A-00 V1 — AVANT RÉVISION CLAUSE TIERS

**Statut archive : REMPLACÉ PAR A-00 révisé**
**Date : Audit Ω+ (CORR-3)**

### Formulation originale
> L'utilisateur est libre de configurer ImmatConnect selon ses besoins.

### Raison de remplacement
Sans clause de protection des tiers, A-00 v1 légitimait des systèmes exploiteurs. Contre-exemples validés :
- Uber : la liberté de la plateforme de configurer ses algorithmes nuit aux chauffeurs (tiers)
- Purdue Pharma : la liberté commerciale nuit aux patients et familles (tiers)

### Formulation révisée
Voir A-00 dans CORE.md et ADN-6 dans ADN.md.

---

## REGISTRE DES ARCHIVES

| ID | Type | Raison | Date | Référence vers |
|----|------|--------|------|---------------|
| PIC | Suppression | Redondant (T-01 + Θ + I-δ) | Audit Ω+ | ADN.md + SMS.md |
| DES | Suppression | Redondant (R1-R5 + PCP) | Audit Ω+ | LIFECYCLE.md |
| MPNA | Fusion | Corollaire de T-01 | Audit Ω+ | T-01 (CORE.md) + A-9 (PROTOCOLS.md) |
| SCD | Archivage | Outil, non-normatif | Audit Ω+ | — |
| "bidirectionnelle" | Suppression terme | Choix design ≠ observation | Audit Ω+ | ADN.md#ADN-3 |
| A-00 v1 | Remplacement | Sans clause tiers | Audit Ω+ | ADN.md#ADN-6 |

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/ARCHIVE.md*
