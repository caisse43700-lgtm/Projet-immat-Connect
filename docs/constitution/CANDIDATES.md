# CANDIDATES — LACUNES ET PROPOSITIONS EN ATTENTE

**Version : Ω∞ (post-audit)**
**Statut : VIVANT — évolue à chaque cycle de recherche**
**Rôle : registre des éléments identifiés mais non encore intégrés**

---

## DÉFINITION

CANDIDATES.md catalogue les éléments qui ont été identifiés comme potentiellement nécessaires au corpus mais qui ne sont pas encore formalisés, validés, ou décidés. Chaque candidat a un statut clair.

**Statuts possibles :**
- `EN ATTENTE` : identifié, non encore travaillé
- `DESIGN EN COURS` : travail de formalisation commencé
- `DÉCISION HUMAINE REQUISE` : blocage sur une décision que seul un humain peut prendre
- `PRÊT À INTÉGRER` : formalisé, attend validation finale
- `REJETÉ` : travaillé et rejeté avec justification

---

## LACUNES ACTIVES A-1 À A-12

### A-1 — PROTOCOLE D'AUTORISATION

**Classe :** Γ-2 (majeure)
**Statut :** DESIGN EN COURS
**Description :** Qui a le droit de faire quoi dans ImmatConnect ?
**Design partiel :** PROTOCOLS.md#A-1 (5 niveaux proposés)
**Blocage :** Dépend de A-2 (Souverain) — décision humaine requise
**Priorité V3 :** HAUTE

---

### A-2 — LE SOUVERAIN

**Classe :** Γ-1 CRITIQUE
**Statut :** RÉSOLU — voir MC-005 et HISTORY.md SESSION 4
**Décision :** Souverain ultime = Dieu. ADN écrit du souverain = le Coran. Opérateur humain = Gardien de l'ADN.
**Architecture souveraine :**
- Dieu : source d'autorité externe, immuable, non auto-fondé, immortel — satisfait A-(-1), T-01, T-02, PAI
- Le Coran : ADN écrit du souverain — fixé, préservé dans sa formulation originale, testé 14 siècles — résout le problème de l'interprétation
- Gardien de l'ADN : opérateur humain — transmissible, révocable, responsable devant le Coran
**Conséquences :**
- A-1 (autorisation) : débloqué — design possible depuis cette décision
- A-11 (légitimité fondateur) : partiellement débloqué
- Toute révision de N doit rester cohérente avec le Coran
**Priorité V3 :** RÉSOLU — non bloquant

---

### A-3 — PROTOCOLE DE NOTIFICATION

**Classe :** Γ-2 (majeure)
**Statut :** DESIGN EN COURS
**Description :** Comment garantir que les notifications sont reçues et comprises ?
**Design partiel :** PROTOCOLS.md#A-3 (5 étapes proposées)
**Priorité V3 :** HAUTE

---

### A-4 — GESTION DES CONFLITS INTER-UTILISATEURS

**Classe :** Γ-2 (majeure)
**Statut :** EN ATTENTE
**Description :** Que se passe-t-il quand deux entités responsables revendiquent des droits conflictuels sur le même véhicule ?
**Exemple :** Copropriété, succession, véhicule de société avec utilisation personnelle.
**Priorité V3 :** MOYENNE

---

### A-5 — RÉSOLUTION DES CONFLITS AXIOMATIQUES

**Classe :** Γ-1 CRITIQUE
**Statut :** RÉSOLU — voir MC-006 et HISTORY.md SESSION 5
**Décision :** Quand deux axiomes divergent, le Gardien consulte le Coran pour identifier lequel est le plus aligné avec le bien révélé. La règle de priorité est externe au système — A-(-1) respecté.
**Niveaux de recours :**
1. Conscience du Gardien (bon sens du bien) — cas courants
2. Coran traduit + IA comme outil d'accès — cas nécessitant une source
3. Savant — cas complexes
**Priorité V3 :** RÉSOLU — non bloquant

---

### A-6 — PROTOCOLE DE DÉPRÉCIATION

**Classe :** Γ-3 (normale)
**Statut :** DESIGN EN COURS
**Description :** Comment déprécier une norme sans casser les dépendances ?
**Design partiel :** PROTOCOLS.md#A-6 (4 phases)
**Priorité V3 :** MOYENNE

---

### A-7 — PROTOCOLE D'URGENCE

**Classe :** Γ-2 (majeure)
**Statut :** DESIGN EN COURS
**Description :** Que se passe-t-il en cas d'erreur critique dans N ?
**Design partiel :** PROTOCOLS.md#A-7 (4 étapes)
**Priorité V3 :** MOYENNE

---

### A-8 — MÉMOIRE CONSTITUTIONNELLE

**Classe :** Γ-2 (majeure)
**Statut :** PRÊT À INTÉGRER
**Description :** Registre formel de chaque décision constitutionnelle significative.
**Design complet :** MEMORY.md (format MC-ID complet + exemples)
**Action requise :** Créer MEMORY-REGISTER.md et consigner les décisions Ω+ rétroactivement.
**Priorité V3 :** HAUTE

---

### A-9 — TEST DE NON-RÉGRESSION CONSTITUTIONNELLE

**Classe :** Γ-3 (normale)
**Statut :** DESIGN EN COURS
**Description :** Comment vérifier qu'un changement P ou F ne corrompt pas N ?
**Design partiel :** PROTOCOLS.md#A-9 (3 vérifications)
**Priorité V3 :** BASSE

---

### A-10 — PROTOCOLE DE TRANSMISSION DU GARDIEN

**Classe :** Γ-1 CRITIQUE
**Statut :** DESIGN EN COURS (DR-3 et A-2 résolus — débloqué)
**Description :** Comment transmettre le rôle de serviteur d'un Gardien à un successeur ?
**Note SESSION 5 :** Ce n'est pas une transmission d'autorité (le Gardien n'en a pas). C'est une transmission de rôle. Ce qui se transmet : la Conscience — capacité de reconnaître, comprendre et rechercher le bien révélé.
**Lien :** A-2 (résolu), DR-3 (résolu), DEP-4, DEP-6
**Priorité V3 :** HAUTE

---

### A-11 — LÉGITIMITÉ DU MOMENT FONDATEUR

**Classe :** Γ-1 CRITIQUE (reclassifié depuis Γ-4a en Audit Ω+)
**Statut :** PARTIELLEMENT RÉSOLU — A-2 et DR-3 résolus
**Description :** Qui avait le droit de fonder ImmatConnect V1 ? Sur quelle base les propositions AF-IRR ont-elles autorité ?
**Résolution partielle (SESSION 5) :** Kacem n'a pas fondé par autorité propre — il a servi. La légitimité du moment fondateur est déléguée par le Souverain. AF-IRR tire son autorité de sa cohérence avec le bien révélé, pas de la personne qui l'a proposé.
**Résidu :** Documenter formellement ce raisonnement dans FRONTIER.md ou ADN.md.
**Priorité V3 :** MOYENNE (partiellement débloqué)

---

### A-12 — EFFET PYGMALION CONSTITUTIONNEL

**Classe :** Γ-4a (conceptuelle)
**Statut :** EN ATTENTE
**Description :** ImmatConnect prétend *décrire* ImmatConnect mais en réalité le *crée*. La constitution performative crée la réalité qu'elle décrit.
**Exemple :** AF-IRR dit "il existe des entités responsables de véhicules" — mais ImmatConnect *définit* ce que signifie être "responsable" et crée ainsi cette catégorie.
**Protection actuelle :** ADN-5 (Antériorité du Réel) protège partiellement, mais A-12 est plus subtil.
**Action requise :** Documenter les cas où ImmatConnect crée vs décrit, et les conséquences sur l'autorité de AF-IRR.
**Priorité V3 :** MOYENNE

---

## DÉPENDANCES RÉSIDUELLES DR-1 À DR-3

### DR-1 — CONTRADICTION FALSIFICATION / MÉMOIRE

**Statut :** RÉSOLU EN DESIGN — implémentation pendante
**Description :** Comment falsifier sans perdre la mémoire de ce qui a été falsifié ?
**Résolution :** A-8 (Mémoire Constitutionnelle) — voir MEMORY.md
**Action restante :** Créer MEMORY-REGISTER.md et implémenter A-8.

---

### DR-2 — ESPACE DE LIBERTÉ CONSTITUTIONNEL NON DÉFINI

**Statut :** EN ATTENTE
**Description :** ADN-6 dit que l'utilisateur est libre "sans nuire à des tiers". Mais où est la frontière exacte ?
**Action requise :** Définir des cas concrets dans PROTOCOLS.md.
**Priorité V3 :** MOYENNE

---

### DR-3 — TRANSITION FONDATEUR → GOUVERNÉ NON DOCUMENTÉE

**Statut :** RÉSOLU — voir MC-007 et HISTORY.md SESSION 5
**Décision :** Il n'y a pas de transition fondateur → gouverné parce que Kacem n'a jamais été fondateur-souverain. Il est serviteur dès le début — du Souverain (Dieu), du Coran, de l'ADN.
**Conséquence :** A-10 transmet un rôle de serviteur, pas une autorité. Il n'y a pas de "phase fondatrice" à quitter — il n'y a que le service continu.
**Priorité V3 :** RÉSOLU — non bloquant

---

## TABLEAU DE PRIORISATION V3

| ID | Type | Classe | Statut | Blocage | Priorité |
|----|------|--------|--------|---------|----------|
| A-2 | Lacune | Γ-1 | RÉSOLU | MC-005 | — |
| A-5 | Lacune | Γ-1 | RÉSOLU | MC-006 | — |
| A-11 | Lacune | Γ-1 | Partiellement résolu | A-2 + DR-3 résolus | MOYENNE |
| DR-3 | Dépendance | — | RÉSOLU | MC-007 | — |
| A-8 | Lacune | Γ-2 | Prêt à intégrer | Aucun | HAUTE |
| A-1 | Lacune | Γ-2 | Design en cours | Aucun (A-2 résolu) | HAUTE |
| A-3 | Lacune | Γ-2 | Design en cours | Aucun | HAUTE |
| A-10 | Lacune | Γ-1 | Design en cours | Aucun (débloqué) | HAUTE |
| DR-1 | Dépendance | — | Design résolu | A-8 implem. | HAUTE |
| A-7 | Lacune | Γ-2 | Design en cours | Aucun | MOYENNE |
| A-4 | Lacune | Γ-2 | En attente | Aucun | MOYENNE |
| A-6 | Lacune | Γ-3 | Design en cours | Aucun | MOYENNE |
| A-12 | Lacune | Γ-4a | En attente | Aucun | MOYENNE |
| DR-2 | Dépendance | — | En attente | Aucun | MOYENNE |
| A-9 | Lacune | Γ-3 | Design en cours | Aucun | BASSE |

---

## RÈGLES D'USAGE

1. Tout élément identifié comme lacune est ajouté ici avant intégration dans le corpus actif
2. Un candidat ne sort de CANDIDATES.md que via PCP (voir LIFECYCLE.md)
3. Un candidat "REJETÉ" reste documenté ici avec la justification du rejet
4. La priorité est réévaluée à chaque cycle de révision standard

---

*Gel Ω∞.1 — Version de référence*
*Fichier: docs/constitution/CANDIDATES.md*
