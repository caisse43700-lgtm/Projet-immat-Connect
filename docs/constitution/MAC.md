# MAC — MOTEUR D'ANALYSE CONSTITUTIONNELLE

**Version : V1 — SESSION 6**
**Statut : OPÉRATIONNEL**
**Rôle : transformer le corpus en outil d'aide à la décision**

Ce document ne crée aucune nouvelle théorie.
Il prend le corpus existant et répond à la question : *quand un problème réel apparaît, quel élément du corpus activer et pour quoi faire ?*

---

## COMMENT UTILISER CE MOTEUR

Un problème réel apparaît. Tu poses les 5 questions ci-dessous dans l'ordre.
Chaque question pointe vers les composants du corpus à activer.

```
PROBLÈME DÉTECTÉ
      ↓
Q1 — Que regarder ?          → identifie le composant ADN concerné
Q2 — Quel protocole ?        → identifie PCP / MMV / correction directe
Q3 — Quel niveau de risque ? → classe le problème (Γ-1 à TECHNIQUE)
Q4 — Correction minimale ?   → MMV Q7 appliqué au code
Q5 — Impact mission ?        → ADN-1 + ADN-3 comme boussole
```

---

## PARTIE I — COMPOSANTS DU CORPUS : RÔLES OPÉRATIONNELS

### ADN-1 — Antériorité de la Responsabilité

**Rôle concret :** vérifie que l'entité responsable reste au centre — pas le véhicule, pas l'algorithme.

**Quand l'invoquer :**
- Une feature propose d'envoyer des actions automatiques sans intervention humaine
- Un composant prend des décisions à la place de l'utilisateur

**Type de problème détecté :** déshumanisation, délégation non consentie à un bot ou à l'algorithme.

**Décision aidée :** *"Qui est responsable de cette action ? Est-ce un humain ou le système ?"*

**Lien code :** toute fonction `sendMsg()`, `vehicleAlert()`, `saveReportRemote()` — doit toujours partir d'une action humaine.

**Interaction :** ADN-3 — la notification doit toujours être liée à une responsabilité humaine réelle.

---

### ADN-2 — Primauté de l'identifiant officiel

**Rôle concret :** la plaque est toujours la clé. Tout le reste (nom, téléphone, UID Supabase) est secondaire.

**Quand l'invoquer :**
- On propose d'identifier un véhicule autrement que par la plaque
- On propose de contacter quelqu'un sans connaître sa plaque

**Type de problème détecté :** ambiguïté d'identification, référents multiples pour un même objet.

**Décision aidée :** *"Quelle est la clé canonique de cette donnée ?"*

**Lien code :** `nPlate()` dans utils.js est l'implémentation de ADN-2. Chaque lookup de véhicule passe par `nPlate()`.

---

### ADN-3 — Couplage Événement/Notification

**Rôle concret :** tout changement d'état significatif d'un véhicule doit notifier. Pas l'inverse.

**Quand l'invoquer :**
- Un état change sans que personne soit notifié
- Une notification est émise sans changement d'état persisté
- Un canal realtime est cassé ou orphelin

**Type de problème détecté :** notifications perdues, fausses notifications, désynchronisation état/interface.

**Décision aidée :** *"Est-ce que ce changement d'état DOIT générer une notification ? Et la persistance a-t-elle eu lieu avant ?"*

**Lien code :** VEHICLE-001 est l'implémentation technique de ADN-3.

**Exemples :**
- INC-008 viole ADN-3 — `unsubscribe()` cassé = canal orphelin = notifications perdues
- INC-003 viole ADN-3 indirectement — badge incorrect peut masquer une alerte réelle

**Interaction :** VEHICLE-001 (implémentation), ADN-1 (la notification part d'une responsabilité humaine).

---

### ADN-4 — Non-autofondation

**Rôle concret :** aucun composant ne peut valider sa propre légitimité.

**Quand l'invoquer :**
- Un module vérifie sa propre conformité
- Une règle se justifie par elle-même ("c'est la règle parce que c'est la règle")
- Un composant produit ET valide la même donnée

**Type de problème détecté :** validation circulaire, auto-certification.

**Décision aidée :** *"Qui valide cette règle — et est-ce indépendant de celui qui l'applique ?"*

**Interaction :** ADN-7 (corollaire), T-01 (théorème dérivé).

---

### ADN-5 — Antériorité du Réel

**Rôle concret :** le code décrit la réalité, ne la définit pas. Si la réalité change, le code suit — pas l'inverse.

**Quand l'invoquer :**
- On ajoute une contrainte dans le code qui n'existe pas dans la réalité (ex : format de plaque trop strict)
- L'interface affiche un état qui ne correspond plus à la réalité terrain
- Une règle code crée une réalité nouvelle plutôt que de la décrire (A-12)

**Type de problème détecté :** modèle qui dérive de la réalité, Effet Pygmalion (A-12).

**Décision aidée :** *"Cette règle vient-elle de la réalité ou du code ?"*

**Exemple :** INC-006 — `S.selPlate` (sélection carte) non visible dans Activité = le code dit "véhicule sélectionné" mais la réalité perçue par l'utilisateur ne le confirme pas.

---

### ADN-6 — Liberté sous contrainte tiers

**Rôle concret :** une action d'un utilisateur ne doit pas nuire à quelqu'un qui n'a pas consenti.

**Quand l'invoquer :**
- Une nouvelle feature expose des données d'un utilisateur à un autre sans consentement
- Une faille de sécurité permet à un acteur externe d'affecter l'utilisateur
- Une feature crée des notifications non souhaitées

**Type de problème détecté :** atteinte à la vie privée, spam, exploitation, injection externe.

**Décision aidée :** *"Est-ce que cette action pourrait nuire à quelqu'un qui n'a pas consenti ?"*

**Exemple :** INC-009 viole ADN-6 — XSS Nominatim permettait à un acteur externe de nuire à l'utilisateur via l'app.

---

### ADN-7 — Non-autojuridiction

**Rôle concret :** ImmatConnect ne peut pas être juge de sa propre conformité. Même règle pour chaque composant.

**Quand l'invoquer :**
- Un composant valide lui-même sa propre sortie
- Le Gardien valide seul une décision qui touche N (requiert un tiers)
- Un test valide du code qu'il est censé tester

**Type de problème détecté :** validation circulaire dans le code ou la gouvernance.

**Décision aidée :** *"Qui est le juge indépendant ici ?"*

**Lien code :** ADN-7 impose que `core/invariants.js` soit deepFrozen — le code ne peut pas s'auto-modifier.

---

### VEHICLE-001 — Persist Before Notify

**Rôle concret :** règle technique absolue. Avant toute notification : l'état est persisté en base.

**Quand l'invoquer :** toute fonction qui modifie un état ET notifie quelqu'un en même temps.

**Type de problème détecté :** notification émise avant persistance → message mensonger → désynchronisation.

**Décision aidée :** *"Dans quelle ordre : je persiste ou je notifie ?"*

**Réponse toujours la même :** persister d'abord. Sans exception.

**Lien code :** `saveReportRemote()` → puis `_bcast()` (ligne 838). Ordre correct dans l'existant.

**Cas d'exception :** aucun.

---

### INV-001 à INV-014 — Invariants Constitutionnels

**Rôle concret :** règles techniques deepFrozen dans `core/invariants.js`. Ne peuvent pas être violées par accident.

**Quand l'invoquer :** avant toute modification de `core/invariants.js`.

**Type de problème détecté :** régression sur une règle fondamentale du système.

**Décision aidée :** *"Est-ce que la modification que je propose touche un invariant ?"*

**Correction active :** INV-011 severity 'critical' (CORR-1 appliqué).

**Règle :** les invariants ne se modifient pas sans révision constitutionnelle de type Majeur.

---

### PCP — Protocole de Parcimonie Constitutionnelle

**Rôle concret :** gouverne comment le corpus évolue. Empêche l'inflation normative.

**Quand l'invoquer :** toute modification des couches F (frontières) ou P (protocoles).

**Ce que PCP ne gouverne PAS :** les bugs techniques (→ correction directe), les modifications ADN (→ MMV).

**5 décisions disponibles :**

| Décision | Quand | Action |
|----------|-------|--------|
| AJOUTER | Besoin nouveau, aucun existant ne couvre | Justifier unicité + dérivation ADN |
| FUSIONNER | Deux éléments recouvrent le même terrain | Supprimer le moins précis, intégrer dans l'autre |
| REMPLACER | Élément existant doit être mis à jour | Archiver l'ancien, activer le nouveau |
| ARCHIVER | Élément valide mais obsolète | Documenter dans ARCHIVE.md avec justification |
| REJETER | Proposition contredite par l'ADN | Documenter le rejet avec raison |

**Décision aidée :** *"Comment intégrer ce nouveau besoin sans créer une nouvelle couche inutile ?"*

---

### MMV — Mutation Minimale Viable

**Rôle concret :** 10 questions obligatoires avant toute modification de N (noyau) ou de l'ADN.

**Quand l'invoquer :** uniquement pour les modifications touchant ADN-X ou N. Pas pour les bugs, pas pour P/F.

**Questions éliminatoires (réponse insatisfaisante = REFUSER) :**
- Q4 : Respecte-t-elle l'ADN existant ?
- Q8 : Que risque-t-elle de casser ?
- Q10 : Augmente-t-elle le risque de mort constitutionnelle ?

**Ce que MMV ne gouverne PAS :** les bugs (→ correction directe), les features F/P (→ PCP).

**Décision aidée :** *"Est-ce que cette modification du noyau est vraiment nécessaire et sûre ?"*

---

### T-01 — Non-Autojuridiction

**Rôle concret :** requiert un référentiel externe pour toute évaluation de conformité du système.

**Quand l'invoquer :**
- Le système tente de valider sa propre conformité constitutionnelle
- Le Gardien seul veut décider d'une révision de N

**Application au code :** les tests doivent être indépendants du code testé. Un composant ne valide pas ses propres sorties.

**Lien :** ADN-7 est le corollaire opérationnel de T-01.

---

### T-02 — Découverte Progressive de l'ADN

**Rôle concret :** une incohérence découverte aujourd'hui n'invalide pas le corpus — elle l'enrichit.

**Quand l'invoquer :**
- On trouve une contradiction dans le corpus
- Une nouvelle réalité terrain n'est pas couverte par l'ADN existant
- Un protocole existant ne fonctionne pas dans un nouveau cas

**Décision aidée :** *"Est-ce un bug dans le corpus (à corriger) ou une découverte de réalité nouvelle (à intégrer) ?"*

**Conséquence pratique :** ne pas paniquer quand une incohérence apparaît. La documenter dans CANDIDATES.md, déclencher le processus normal.

---

### Conscience du Gardien

**Rôle concret :** mécanisme d'arbitrage pour les situations non couvertes par aucun protocole.

**Quand l'invoquer :**
- Aucun protocole existant ne couvre la décision
- Deux protocoles donnent des réponses contradictoires
- La décision touche à des valeurs (bien/mal) et pas juste à de la technique

**Décision aidée :** *"Est-ce que le Gardien doit décider en conscience plutôt que par protocole ?"*

**3 niveaux de recours (A-5) :**
1. Conscience du Gardien (bon sens, cas courants)
2. Coran traduit + IA (cas nécessitant une source)
3. Savant (cas complexes)

---

### Modèle de mortalité (7 types)

**Rôle concret :** identifier quel type de mort constitutionnelle est à risque avant une décision majeure.

**Quand l'invoquer :** MMV Q10 — toute modification de N.

**Types :** mort par corruption (T1), par oubli (T2), par fragmentation (T3), par fossilisation (T4), par décapitation (T5), par mutation létale (T6), par résurrection dogmatique (T7).

**Détail complet :** `docs/constitution/RESEARCH.md`

---

## PARTIE II — LES 5 QUESTIONS DU MOTEUR

### Q1 — Que regarder quand une incohérence est détectée ?

```
Incohérence détectée
      ↓
Est-ce dans le code (bug technique) ?
  OUI → TERRAIN-INTEL.md pour le contexte. Correction directe.
        Pas besoin d'invoquer le corpus.
  NON → continuer ↓

Est-ce une désynchronisation état/interface ?
  OUI → ADN-5 (réalité ≠ représentation) + VEHICLE-001 (persist before notify)

Est-ce une notification manquante ou fausse ?
  OUI → ADN-3 + VEHICLE-001

Est-ce une faille de sécurité ou atteinte à la vie privée ?
  OUI → ADN-6

Est-ce une question de gouvernance (qui décide ?) ?
  OUI → ADN-7 + T-01

Est-ce une contradiction dans le corpus lui-même ?
  OUI → T-02 (découverte progressive) + A-5 (arbitrage via Coran)
         Ne pas corriger sans CANDIDATES.md + Conscience du Gardien
```

---

### Q2 — Quel protocole appliquer ?

| Type de changement | Protocole | Document |
|-------------------|-----------|----------|
| Bug technique (code) | Correction directe | TERRAIN-INTEL |
| Ajout d'une feature | PCP DÉCISION 1 | LIFECYCLE.md |
| Modification feature existante | PCP DÉCISION 3 | LIFECYCLE.md |
| Suppression feature | PCP DÉCISION 4 | LIFECYCLE.md |
| Modification protocole P | PCP | LIFECYCLE.md + PROTOCOLS.md |
| Modification axiome F | PCP + révision Majeure | LIFECYCLE.md |
| Modification ADN / N | MMV + vote Gardien | LIFECYCLE.md |
| Urgence noyau | A-7 (gel + audit) | PROTOCOLS.md#A-7 |
| Transmission du Gardien | A-10 | PROTOCOLS.md#A-10 |
| Conflit entre deux axiomes | A-5 (Coran) | PROTOCOLS.md#A-5 |

---

### Q3 — Quel niveau de risque ?

| Niveau | Ce que ça touche | Exemple |
|--------|-----------------|---------|
| Γ-1 CRITIQUE | ADN-X, T-01, T-02, architecture souveraine | Modifier ADN-3, changer le Souverain |
| Γ-2 MAJEUR | F-01 à F-22, VEHICLE-001, INV-0XX | Modifier un invariant, changer persist-before-notify |
| Γ-3 NORMAL | Protocoles P (A-1 à A-10) | Ajouter une étape à A-3 |
| Γ-4 CONCEPTUEL | Définitions, interprétations | Clarifier ce qu'est "un tiers" dans ADN-6 |
| TECHNIQUE | Bug dans le code, pas d'impact corpus | XSS, scope error, race condition |

**Règle pratique :** si le problème n'est pas dans le corpus, c'est TECHNIQUE. Corriger directement, documenter dans TERRAIN-INTEL.

---

### Q4 — Quelle est la correction minimale viable ?

Appliquer MMV Q7 à toute correction : *"Existe-t-il une correction plus petite qui résout le même problème ?"*

**Pour les bugs (niveau TECHNIQUE) :**
La correction minimale est celle qui :
1. Corrige exactement le symptôme — pas plus
2. Ne change pas le comportement des composants voisins
3. Ne touche pas au schéma DB
4. Ne nécessite pas de refactoring

**Pour les features (niveau Γ-3 ou Γ-2) :**
La correction minimale respecte PCP — ne pas ajouter si on peut modifier l'existant.

**Pour le noyau (niveau Γ-1) :**
La correction minimale passe les 10 questions MMV. Si Q3 dit "peut-on résoudre sans toucher N ?" → toujours chercher cette option d'abord.

**Exemples de corrections minimales appliquées :**
- INC-008 : `const client = sb()` — une ligne. Pas de refactoring du module.
- INC-009 : `data-*` attributes — deux caractères changés dans la chaîne HTML. Pas de réécriture de searchGps().

---

### Q5 — Quel impact sur la mission du produit ?

**Mission d'ImmatConnect (depuis ADN-1 + ADN-3) :**
> Permettre aux entités responsables de véhicules de communiquer entre elles et d'être notifiées correctement des changements significatifs concernant leurs véhicules.

**Matrice d'impact :**

| Le problème touche... | Impact mission | Urgence |
|----------------------|----------------|---------|
| La notification (ADN-3) | DIRECT — la mission ne s'accomplit pas | HAUTE |
| La responsabilité (ADN-1) | DIRECT — le sujet fondateur est affecté | HAUTE |
| La sécurité des tiers (ADN-6) | DIRECT — la mission nuit au lieu d'aider | HAUTE |
| L'identification du véhicule (ADN-2) | DIRECT — la clé est corrompue | HAUTE |
| L'interface/UX (ADN-5) | INDIRECT — la réalité n'est pas bien représentée | MOYENNE |
| La performance | INDIRECT — l'expérience se dégrade | BASSE |
| La gouvernance interne | INDÉPENDANT de la mission court terme | VARIABLE |

---

## PARTIE III — MATRICE DE CORRESPONDANCE RAPIDE

*Pour un problème donné, quels composants activer en premier ?*

| Type de problème | Composants prioritaires |
|-----------------|------------------------|
| Bug sécurité (injection, XSS) | ADN-6 + correction directe |
| Canal realtime cassé | ADN-3 + VEHICLE-001 |
| Données désynchronisées | ADN-3 + ADN-5 + VEHICLE-001 |
| Badge/compteur incorrect | ADN-3 (notification correcte ?) |
| Feature UX manquante | ADN-5 + PCP DÉCISION 1 |
| Conflit entre deux features | ADN-6 (qui nuit à qui ?) + PCP |
| Gouvernance (qui peut modifier ?) | A-1 (autorisation) + ADN-7 |
| Modification profonde du corpus | MMV + PCP selon le niveau |
| Problème non couvert | T-02 + Conscience du Gardien + CANDIDATES.md |

---

## PARTIE IV — EXEMPLES CONCRETS (SESSION 6)

### Exemple 1 — INC-008 (unsubscribe scope)

```
Q1 → Bug technique (variable non définie) → TERRAIN-INTEL, pas de corpus requis
Q2 → Correction directe (bug code)
Q3 → TECHNIQUE
Q4 → Correction minimale : const client = sb() — une ligne ✅
Q5 → Impact : ADN-3 — canal orphelin = notifications perdues à la déconnexion
```

### Exemple 2 — INC-009 (XSS Nominatim)

```
Q1 → Faille sécurité → ADN-6 (acteur externe peut nuire à l'utilisateur)
Q2 → Correction directe (bug sécurité)
Q3 → TECHNIQUE (impact ADN-6 documenté mais pas de changement corpus)
Q4 → Correction minimale : data-* au lieu d'inline onclick — deux lignes ✅
Q5 → Impact : ADN-6 direct — l'app devenait un vecteur pour nuire à l'utilisateur
```

### Exemple 3 — INC-003 (badge 3 chemins) — NON CORRIGÉ

```
Q1 → Désynchronisation état/interface → ADN-5 (le badge ne reflète pas la réalité)
     + ADN-3 (le badge est une notification — elle doit être correcte)
Q2 → Décision design requise → PCP DÉCISION 3 (REMPLACER un des 3 chemins)
     avant correction → décision Gardien (Q-2 dans PROJET-INTEL)
Q3 → Γ-3 NORMAL (touche un protocole P)
Q4 → Correction minimale : unifier les 3 chemins en un seul point de vérité
     Mais nécessite décision sur lequel conserver → bloqué sur Q-2
Q5 → Impact : ADN-3 indirect — badge incorrect peut masquer une alerte urgente
```

### Exemple 4 — A-2 résolu (Le Souverain) — SESSION 4

```
Q1 → Contradiction gouvernance (qui peut réviser N ?) → ADN-4 + ADN-7 + T-01
Q2 → MMV + vote Gardien (modification N — architecture souveraine)
Q3 → Γ-1 CRITIQUE
Q4 → Correction minimale : résolution externe (Dieu → Coran) — pas de modification code
Q5 → Impact fondation : sans Souverain résolu, A-1 (autorisation) est impossible
```

---

*Créé : SESSION 6, 2026-05-31*
*Fichier : docs/constitution/MAC.md*
