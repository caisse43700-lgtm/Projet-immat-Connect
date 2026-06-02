# Architecture Mère des Deux Anges — ImmatConnect

> Mission : vérifier que ce que nous construisons pour l'Ange Gardien
> est suffisamment fondamental pour engendrer les deux Anges.
> Date : 2026-06

---

## Verdict global

Le système nerveux actuel est une projection niveau 3 d'une architecture mère
qui n'existe pas encore sur le papier, mais qui existe déjà dans les faits.

Pour devenir la mère des deux Anges, il faut ajouter deux choses :

1. Les niveaux 1 et 2 sur chaque organe
2. La couche PERCEPTION avant le signal

Rien d'autre ne manque. Le routage, les contraintes, les dépendances,
les inhibitions — tout est déjà bon.

---

## Q1 — Le système nerveux actuel est-il déjà l'architecture mère ?

Non. Pas encore. Mais les os sont bons.

Ce qui est juste :
- Le mécanisme de routage signal → mot-clé → organe est déjà universel.
  Il ne sait pas qui pose la question. Il route vers Carte, Messages,
  Signalements — peu importe que ce soit un conducteur ou un Gardien.
- Les organes, les contraintes, les dépendances — tous sont depth-agnostic.

Ce qui manque :
- Chaque organe n'existe aujourd'hui qu'à un seul niveau — le niveau technique
  (numéros de ligne, variables S., appels RPC).
  Il n'existe pas encore de niveau utilisateur ni de niveau comportemental.

---

## Q2 — Faut-il distinguer Organe et Vue de l'Organe ?

Oui. C'est la distinction exacte. Elle a déjà un nom : projection.

Un organe est une entité unique et stable.
Une projection est ce qu'un acteur donné peut voir et toucher de cet organe.

```
Organe : Carte
│
├── Projection Utilisateur
│     "Je ne vois plus les conducteurs"
│     → GPS actif ? Autorisations ? Rayon trop petit ?
│
└── Projection Gardien
      locate():554 · loadOthers():652
      S.myMarker · S.otherMkrs
      canal realtime · INV-005 · INV-012
```

Le routage traverse l'organe.
La résolution descend dans la projection appropriée.

---

## Q3 — Le système nerveux devrait-il avoir plusieurs couches ?

Exactement 3. Pas plus.

```
Niveau 1 — Usage humain
  Vocabulaire utilisateur · Questions naturelles · Résolutions simples

Niveau 2 — Comportement fonctionnel
  Ce que fait l'organe · Ses états possibles · Ses modes de défaillance

Niveau 3 — Implémentation technique  ← ce que nous avons aujourd'hui
  Points d'entrée code · Variables d'état · Contraintes · Dépendances
```

L'Ange Utilisateur navigue jusqu'au niveau 2 maximum.
L'Ange Gardien traverse les 3 niveaux.

Le routage est identique pour les deux.
Seule la profondeur de résolution change.

---

## Q4 — Faut-il une couche PERCEPTION avant le signal ?

Oui. Et elle est déjà là implicitement — elle n'est juste pas nommée.

```
AVANT LE SIGNAL
┌──────────────────────────────────────────────────────┐
│  Texte  → direct                     → signal        │
│  Voix   → SpeechRecognition          → signal        │
│  Image  → analyse visuelle           → signal        │
│  Caméra → lecture plaque / contexte  → signal        │
└──────────────────────────────────────────────────────┘
         ↓
    Signal normalisé (toujours du texte)
         ↓
    Routage mot-clé → organe
```

La PERCEPTION normalise l'entrée.
Le système nerveux ne voit jamais un son ni une image.
Il voit toujours un signal texte normalisé.

Ce découplage est important : quand la caméra arrivera,
le système nerveux n'aura pas à changer.

---

## Q5 — Une seule constitution, deux profondeurs d'accès

C'est possible. C'est le bon objectif.

Structure cible pour chaque organe :

```json
"Carte": {
  "signal_keys": ["marqueur", "rond", "GPS", "conducteurs", "icon", "locate"],

  "level_1": {
    "what_user_sees": [
      "Ma position",
      "Les conducteurs proches",
      "Les alertes sur la carte"
    ],
    "common_questions": [
      "Je ne vois plus les conducteurs",
      "Ma position est fausse",
      "La carte ne charge pas"
    ],
    "resolution": [
      "Vérifier GPS actif",
      "Vérifier autorisations navigateur",
      "Vérifier le rayon sélectionné"
    ]
  },

  "level_2": {
    "behaviors": [
      "Affiche marqueurs depuis DB",
      "Met à jour position via watchPosition",
      "Charge les autres via loadOthers()"
    ],
    "failure_modes": [
      "GPS refusé — S.myLat reste null",
      "Canal realtime déconnecté — marqueurs figés",
      "INV-005 violé — marqueur affiché sans persistance DB"
    ]
  },

  "level_3": {
    "entry": {
      "icon": "index.html:409",
      "locate": "index.html:554",
      "loadOthers": "index.html:652"
    },
    "constraints": ["INV-005", "INV-011", "INV-012"],
    "deps": ["Profil"],
    "data": ["S.map", "S.myMarker", "S.otherMkrs", "S.myLat", "S.myLng"]
  }
}
```

Un seul objet. Deux Anges qui lisent à des profondeurs différentes.

---

## Q6 — Où se situe chaque acteur dans la boucle fondamentale ?

```
PERCEPTION
  Conducteur ───── génère des signaux depuis son contexte réel (conduite, alertes, GPS)
  Gardien ───────── génère des signaux depuis son contexte technique (code, bugs, architecture)
        ↓
SIGNAL normalisé (toujours du texte)
        ↓
ROUTAGE
  Mot-clé → Organe   (identique pour les deux Anges)
        ↓
PROFONDEUR
  Ange Utilisateur ── lit niveau 1      → répond en langage utilisateur
  Ange Gardien ─────── lit niveaux 1+2+3 → répond en langage technique
        ↓
CONTRAINTES
  Invariants INV-001 à INV-015   (identiques pour les deux)
        ↓
RÉSOLUTION
  Ange Utilisateur ── "Vérifie que le GPS est activé dans les réglages"
  Ange Gardien ─────── "locate():554 — S.myLat est null, watchPosition n'a pas déclenché"
        ↓
DÉCISION
  Gardien ────────────── valide toujours. Sans exception.
```

Cette boucle survivrait si Claude disparaissait.
Elle survivrait si le code changeait.
Elle survivrait si l'interface évoluait.

La boucle est indépendante de l'implémentation.

---

## Ce que nous avons. Ce qu'il manque.

| Couche | État |
|---|---|
| Boucle fondamentale | ✅ Correcte — universelle |
| Routage signal → organe | ✅ Depth-agnostic — prêt pour les deux Anges |
| Organes niveau 3 (technique) | ✅ Complet |
| Invariants | ✅ INV-001 à INV-015 |
| Organes niveau 1 (usage humain) | ✗ Manquant |
| Organes niveau 2 (comportement) | ✗ Manquant |
| Couche PERCEPTION formalisée | ✗ Non nommée |

---

## Prochaine étape proposée

Ajouter les niveaux 1 et 2 sur les 6 organes dans immat-nervous-system.json.
Formaliser la couche PERCEPTION.

Le système nerveux devient alors l'architecture mère capable de produire
les deux Anges sans duplication, sans contradiction, sans deux systèmes séparés.

---

## Principe de clôture

L'Ange Gardien agit sur l'organisme.
L'Ange Utilisateur agit dans l'organisme.

Même signal. Même organe. Deux profondeurs.
Une seule constitution.
