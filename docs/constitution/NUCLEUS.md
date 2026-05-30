# NUCLEUS — Noyau irréductible d'ImmatConnect

> Ce document seul permet à un nouvel architecte de reconstruire
> la Constitution, V1-MIN, les théorèmes, la taxonomie, et la
> logique du projet. Tout le reste en découle.
> Version : 30 mai 2026

---

## I. L'ACTE FONDATEUR

Trois faits incontournables du réel :

  AF-1 : Des entités responsables de véhicules existent dans le réel.
  AF-2 : Chaque véhicule a un identifiant unique : la plaque.
  AF-3 : Des situations créent un besoin de notification entre le
          système et les entités responsables. Cette obligation est
          unilatérale : le système notifie, pas l'inverse.

Test d'irréductibilité : supprimer l'un des trois détruit le projet —
il n'y a plus d'utilisateurs, plus d'adressage, ou plus de raison
d'exister. Aucune des trois propositions ne se dérive des deux autres.

---

## II. LES TROIS AXIOMES

Ces axiomes ne se déduisent pas de l'Acte Fondateur.
Ils sont des choix. Mais leur combinaison est la seule qui satisfait
les trois simultanément — c'est ce que prouvent M₁/M₂/M₃.

  A-(-1) NON-AUTOFONDATION
    Le système ne peut pas être son propre juge ultime.
    Sa légitimité lui est nécessairement extérieure.

  A-01 ANTÉRIORITÉ DU RÉEL
    La réalité extérieure précède et juge le système.

  A-00 LÉGITIMITÉ PAR LE SERVICE
    L'organisme n'existe que pour le service rendu aux utilisateurs,
    sans nuire à des tiers non-utilisateurs du système.
    Dès que le service cesse d'être la finalité première, ou que le
    service nuit à des tiers, la légitimité cesse.

### Preuve de minimalité — NE PAS PERDRE

  M₁ (Système Autocertifié) : satisfait A-00 + A-01, viole A-(-1)
    → prouve que A-(-1) ne se dérive pas de A-00 + A-01

  M₂ (Constitution Constructiviste) : satisfait A-(-1) + A-00, viole A-01
    → prouve que A-01 ne se dérive pas de A-(-1) + A-00

  M₃ (Constitution Contemplative) : satisfait A-(-1) + A-01, viole A-00
    → prouve que A-00 ne se dérive pas de A-(-1) + A-01

Conclusion : {A-(-1), A-01, A-00} est nécessaire et suffisante.
Ni plus, ni moins. Tout axiome supplémentaire proposé (A-02...) doit
produire un M₄ analogue pour être rejeté — ou modifier l'Acte Fondateur
pour être accepté.

---

## III. LE THÉORÈME FONDAMENTAL

  T-01 — Non-Autojuridiction [DÉMONTRÉ — 92%]

  Énoncé : aucun système ne peut être son propre juge ultime.

  Démonstration : A-(-1) + Second Théorème d'Incomplétude de Gödel
  (1931). Tout système suffisamment expressif pour se juger contient
  une proposition vraie qu'il ne peut ni prouver ni réfuter depuis
  l'intérieur.

  Note (CORR-6) : les 8% d'incertitude portent sur la complétude de
  la chaîne de dérivation, pas sur la vérité de l'énoncé.

  Corollaire MPNA (fusionné — CORR-8) : toute validation ultime de
  la Constitution doit être externe au système qu'elle gouverne.
  MPNA n'est pas une proposition autonome — reformulation directe
  de T-01. Voir ARCHIVE.md.

  Conséquence architecturale directe (F-16) :
    Chaîne obligatoire — Réalité → Observation → Interprétation
    → Action. L'interface ne peut jamais court-circuiter la Réalité.

---

## IV. LA TAXONOMIE DES LACUNES

  Γ-1 NORMATIVE
    Situation réelle, aucun principe existant.
    Inépuisable dans un domaine ouvert (D_os).
    → Ajouter une règle.

  Γ-2 PROCÉDURALE
    Principe existe, protocole d'application manquant.
    Finie pour un ensemble de principes donné.
    → Ajouter un protocole.

  Γ-3 STRUCTURELLE MATHÉMATIQUE
    Limite imposée par la logique (Gödel).
    Irréductible — ne peut pas être comblée de l'intérieur.
    → Reconnaître la limite. Ne jamais tenter de la "corriger".

  Γ-4a AMBIGUÏTÉ DE PRINCIPE
    Interprétations contradictoires d'un principe existant.
    → Loi dérivée d'interprétation.

  Γ-4b AMBIGUÏTÉ D'AXIOME
    Irréductible au niveau des principes — nécessite révision
    de l'Acte Fondateur lui-même.
    → Refondation partielle.

### Protocole de Classification des Limites (PCL)

  Étape 1 : PROVISOIRE — "non résolue à ce jour"
            Action : documenter, continuer à chercher.

  Étape 2 : CANDIDATE STRUCTURELLE — résiste aux tentatives
            Action : chercher la démonstration formelle (condition α)

  Étape 3 : STRUCTURELLE PROBABLE — démonstration produite (α)
            Action : soumettre à revue externe (condition β)

  Étape 4 : STRUCTURELLE CONFIRMÉE — revue externe validée (β)
            Label : "Irréductible — T-0n"

  RÈGLE ABSOLUE : aucun saut de l'Étape 1 à l'Étape 4.
  La déclaration d'irréductibilité sans démonstration formelle (α)
  est constitutionnellement invalide.

---

## V. LES RÈGLES FONDAMENTALES

### Principes immuables (dérivés directement des axiomes)

  F-01 : Affiché = DB réel. Jamais d'état local ou fantôme. (← A-01)
  F-05 : Données personnelles jamais transmises sans consentement. (← A-00)
  F-07 : L'interface est un miroir, jamais un acteur. (← A-01)
  F-10 : Toute action critique est explicable et traçable. (← A-(-1))
  F-11 : L'utilisateur reste maître de ses données à tout moment. (← A-00)
  F-16 : Réalité→Observation→Interprétation→Action. (← A-01, T-01)
  F-20 : Toute décision du système peut être auditée de l'extérieur. (← A-(-1))
  F-22 : Le système ne peut pas détruire sa propre gouvernabilité.
         [Préservation des Conditions de Souveraineté] (← A-(-1) + A-00)

### Règle technique fondamentale

  VEHICLE-001 — Persist before notify
    DB confirmé → Bus. Jamais Bus → DB.
    La notification est une conséquence de la persistance, jamais
    sa cause. Violation = données fantômes possibles (F-01 brisé).

---

## VI. V1-MIN — CE QUI GOUVERNE AUJOURD'HUI

Domaine : D_os (ouvert fort) — l'espace d'états croît avec le temps,
les acteurs ont une agentivité non bornée, des influences extérieures
non maîtrisées (RGPD, comportements, partenariats) s'appliquent.

31 éléments actifs :
  AF-1, AF-2, AF-3
  A-(-1), A-01, A-00
  F-01, F-05, F-06, F-07, F-10, F-11, F-12, F-16, F-20
  VEHICLE-001
  INV-001, INV-002, INV-003, INV-004, INV-005, INV-006,
  INV-007, INV-008, INV-009, INV-010, INV-011, INV-012,
  INV-013, INV-014
  VehicleOrgan (createAlert implémenté)

Les 20+ éléments restants (F-02/04/08/13-15/17-19/21/22, T-01 opérationnel,
PCL, CRC, CCB, BadgeOrgan, ContactOrgan) sont DORMANTS jusqu'aux
triggers V1-EXT.

---

## VII. LE PROTOCOLE DE FALSIFICATION

V1 est une théorie testable. Trois indicateurs la falsifient :

  TC — Taux de Confusion
    Définition : % d'alertes véhicule envoyées par le mauvais canal.
    Seuil critique : > 5%
    Interprétation : F-03 (cloisonnement) mal implémenté ou mal compris.

  DA — Délai d'Acquittement
    Définition : temps moyen entre notification et lecture.
    Seuil critique : > 120 secondes pour 50% des alertes.
    Interprétation : VEHICLE-001 correct mais expérience utilisateur cassée.

  CP — Cohérence de Persistance
    Définition : % de cas où l'UI affiche une alerte absente de la DB.
    Seuil critique : > 0% (zéro tolérance)
    Interprétation : violation directe de F-01 et VEHICLE-001.

Seuil d'activation : N ≥ 50 utilisateurs actifs simultanément.
Un seuil franchi = révision constitutionnelle obligatoire.

Sans ce protocole, V1 devient irréfutable par construction.
L'irréfutabilité est la mort d'une théorie vivante.

---

## VIII. CORRECTIONS APPLIQUÉES (GEL Ω∞.1 + Ω∞.2)

  CORR-1 : INV-011 severity 'critical' ✅ (core/invariants.js)
  CORR-2 : AF-3 "bidirectionnelle" supprimé ✅
  CORR-3 : A-00 clause tiers ajoutée ✅
  CORR-4 : F-22 nom canonique "Préservation des Conditions de Souveraineté" ✅
  CORR-5 : TGSC théorèmes/conjectures séparés ✅ (RESEARCH.md)
  CORR-6 : T-01 note propagation 8% ajoutée ✅
  CORR-7 : TEC renommé "complémentaire" ✅ (RESEARCH.md)
  CORR-8 : MPNA fusionné dans T-01 ✅

  DÉCISION HUMAINE ENCORE REQUISE :
  - A-02 : définition du Souverain (bloque tout l'axe gouvernance)
