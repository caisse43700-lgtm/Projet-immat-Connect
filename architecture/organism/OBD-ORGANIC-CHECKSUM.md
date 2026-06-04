# IMMATCONNECT — OBD ORGANIC CHECKSUM

## Déclic architectural

Le problème n'est pas seulement de savoir si chaque élément existe.

Le vrai problème est de savoir si chaque élément peut prouver qu'il appartient encore à l'organisme.

Dans une architecture classique, on vérifie des fichiers.
Dans l'architecture organique d'ImmatConnect, il faut vérifier une continuité.

Cette continuité est appelée ici :

```text
Organic Checksum
```

---

## Définition

Un Organic Checksum est l'empreinte logique minimale qui prouve qu'une chose appartient à l'organisme.

Toute capacité importante doit pouvoir produire cette empreinte :

```text
Loi organique
+
Boucle vitale
+
Organe
+
Sens
+
Intention
+
Feature
+
Flow
+
Invariant
+
Source
+
Preuve
```

Si un maillon manque, l'élément n'est pas forcément faux.
Mais il est incomplet, fragile ou non encore stabilisé.

---

## Pourquoi c'est plus fort qu'un simple audit

Un audit répond :

```text
Est-ce que tout est présent ?
```

Le checksum organique répond :

```text
Est-ce que chaque chose peut remonter à sa raison d'être
et redescendre jusqu'à sa preuve ?
```

Cela évite :

- les features orphelines ;
- les intentions sans parcours ;
- les flows inventés ;
- les règles dupliquées ;
- les organes fantômes ;
- les projections désynchronisées ;
- Ange devenu dépendance vitale ;
- les évolutions qui marchent techniquement mais corrompent l'ADN.

---

## Forme canonique

Chaque élément critique devrait pouvoir être décrit ainsi :

```json
{
  "id": "...",
  "organic_checksum": {
    "law": "...",
    "vital_loop": "...",
    "organ": "...",
    "sense": "...",
    "intention": "...",
    "feature": "...",
    "flow": "...",
    "invariant": "...",
    "source": "...",
    "proof": "..."
  }
}
```

Ce format n'est pas une obligation immédiate.
Il est une direction de stabilisation.

---

## Règle fondamentale

```text
Une chose est stable si elle peut être comprise dans les deux sens.
```

### Sens descendant

```text
Loi
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
Source
↓
Preuve
```

### Sens remontant

```text
Preuve
↑
Source
↑
Invariant
↑
Flow
↑
Feature
↑
Intention
↑
Sens
↑
Organe
↑
Boucle vitale
↑
Loi
```

Si l'un des deux sens échoue, il existe une dette organique.

---

## Application immédiate sans casser l'existant

Ne pas modifier le runtime.
Ne pas modifier les projections générées.
Ne pas modifier Supabase.
Ne pas modifier l'UI.

L'application immédiate doit rester documentaire et progressive :

1. utiliser le checksum pour auditer ;
2. signaler les maillons manquants ;
3. compléter les flows réels ;
4. rattacher les intentions validées ;
5. rattacher les features validées ;
6. ajouter des warnings non bloquants plus tard.

---

## Statuts possibles

Chaque élément audité peut avoir un statut :

```text
COMPLETE
Le checksum est complet.

PARTIAL
Un ou plusieurs maillons manquent, mais la capacité est réelle.

PENDING
Le maillon est connu mais pas encore formalisé.

ORPHAN
L'élément ne peut pas être rattaché à l'organisme.

INVALID
Le rattachement est artificiel ou contredit la réalité.
```

---

## Principe anti-faux lien

Un lien manquant est préférable à un faux lien.

Il est autorisé d'écrire :

```text
flow: null
```

ou :

```text
flow_pending: "FLOW-X"
```

Mais il est interdit de rattacher une intention à un flow qui ne décrit pas son comportement réel.

---

## Exemple : Signalement route

État actuel : capacité réelle mais flow incomplet.

Checksum attendu :

```text
Loi          : INTENT_FIRST / TRANSPARENCY / LOOP_CLOSURE
Boucle       : CONTRIBUTION
Organe       : Signalements
Sens         : voir + entendre + sentir + goûter + toucher
Intention    : INT-SIGNAL-ROAD
Feature      : F-SIGNAL-ROUTE
Flow         : FLOW-ROAD-REPORT
Invariant    : INV-002 / INV-004 / INV-005
Source       : reports table + S.alerts + S.alertMarkersById
Preuve       : créer → afficher → diffuser → expirer/résoudre
```

Tant que `FLOW-ROAD-REPORT` n'est pas formalisé, le statut est :

```text
PARTIAL
```

---

## Exemple : Ange

Checksum attendu :

```text
Loi          : ANGE_ASSISTS / ANGE_SURVIVAL_TEST / REALITY_OVER_DOCUMENTATION
Boucle       : APPRENTISSAGE
Organe       : Ange
Sens         : voir + entendre + sentir + goûter + toucher
Intention    : INT-ASK-ANGE
Feature      : F-ANGE
Flow         : FLOW-ANGE-DIALOG
Invariant    : INV-010 / INV-014 / INV-015
Source       : immat-brain-dialog + knowledge-gardien/conducteur générés
Preuve       : poser question → réponse contextualisée → aucune action autonome
```

Condition de stabilité :

```text
L'application doit rester utilisable si Ange disparaît.
```

---

## Exemple : Profil

Checksum attendu :

```text
Loi          : TRANSPARENCY / SOCIAL_VISIBILITY
Boucle       : ORIENTATION / COMMUNAUTE
Organe       : Profil
Sens         : voir + entendre + goûter + toucher
Intention    : INT-MANAGE-PROFILE
Feature      : F-PROFIL
Flow         : FLOW-PROFILE-MANAGEMENT
Invariant    : INV-006 / INV-007 / INV-011
Source       : profiles table
Preuve       : modifier pseudo/couleur/téléphone → sauvegarder → état visible cohérent
```

---

## Pourquoi cela rapproche du 100 %

Les audits précédents ont identifié les gaps.
Le checksum organique transforme ces gaps en méthode universelle.

Il ne demande pas :

```text
Ajoute encore une couche.
```

Il demande :

```text
Prouve que chaque chose découle et revient à l'organisme.
```

C'est compatible avec l'idée centrale :

```text
Tout découle.
Rien ne se force.
Rien ne se duplique.
Rien ne casse.
```

---

## Score organique cible

Une capacité peut être notée :

```text
0/10 maillons : orpheline
1-4/10        : fragile
5-7/10        : partielle
8-9/10        : stable
10/10         : complète
```

L'objectif n'est pas de tout rendre parfait artificiellement.
L'objectif est de rendre visible chaque maillon manquant.

---

## Futur check automatique possible

Plus tard, `scripts/sync-knowledge.js --check` pourra afficher un rapport non bloquant :

```text
[organic-checksum] F-SIGNAL-ROUTE : 8/10 — flow manquant
[organic-checksum] INT-SOS        : 7/10 — flow manquant + preuve à formaliser
[organic-checksum] F-MESSAGES     : 10/10 — complete
```

Ne pas bloquer immédiatement.
D'abord observer.
Puis conseiller.
Puis seulement bloquer les ruptures fortes.

---

## Verdict

Le checksum organique est la pièce manquante entre :

```text
architecture documentée
```

et :

```text
architecture auto-auditable
```

Il permet de viser une cohérence proche de 100 % sans refonte technique, parce qu'il ne change pas le fonctionnement.

Il rend simplement impossible l'oubli silencieux.
