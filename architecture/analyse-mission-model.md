# Analyse — Mission Model
> Date : 2026-06-02
> Statut : analyse validée, implémentation = ajouts ciblés dans fichiers existants

---

## Verdict

La mission existe déjà dans trois endroits.
Ce qui manque n'est pas la mission — c'est la taxonomie formelle et le mapping.

---

## Ce qui existe déjà

| Source | Contenu |
|---|---|
| ADN-1, ADN-3, ADN-6 | Pourquoi ImmatConnect existe |
| Constitution WHY-001 à WHY-006 | Résoudre un problème réel, réduire la friction |
| TRF-006 | "Quel coût réel cette évolution réduit-elle ?" |
| TRF-007 | "Si on la supprime, qui souffre ?" |
| D-001 à D-007 | Anti-dérive — ce que l'organisme ne doit jamais devenir |

Ce qui manque : une taxonomie formelle des finalités et un mapping organe → finalités.

---

## Hiérarchie des couches

```
ADN (identité immuable — antérieure)
  ↓
Consciousness (qui est le système)
  ↓
Mission-model (pourquoi il agit — dérivé de qui)
  ↓
Nervous System (comment il perçoit et route)
  ↓
Trust (crédibilité des signaux)
  ↓
Agency (décision humaine)
```

Mission-model n'est pas plus fondamentale que Consciousness.
Elle n'est pas orthogonale à Trust — elle est au-dessus.
Elle est dérivée de l'ADN, pas antérieure.

---

## Seul apport irremplaçable

Sans taxonomy formelle des finalités :
- TRF-006 reste subjectif (pas de référentiel de coûts)
- Deux évolutions compatibles ADN ne peuvent pas être arbitrées
- Dans 5 ans : feature creep silencieux, toutes les features "conformes"
  mais l'organisme dilué

---

## Solution — pas un nouveau fichier

Créer mission-model.json violerait TRF-005 (duplication) et INV-015
(la mission a déjà trois sources canoniques).

### Ajout 1 — transformation-laws.json

Ajouter une section `finalites` comme référentiel d'arbitrage pour TRF-006 :

```json
"finalites": {
  "SEC": "sécurité conducteur",
  "ENT": "entraide entre conducteurs",
  "PRV": "prévention des dangers",
  "FRI": "réduction de la friction",
  "PRI": "protection de la vie privée",
  "LNK": "qualité du lien conducteur ↔ conducteur"
}
```

TRF-006 devient alors précis :
"Cette évolution réduit-elle un coût réel pour SEC? FRI? LNK?"

### Ajout 2 — immat-nervous-system.json

Chaque organe reçoit une clé `serves` :

```json
"Signalements": { "serves": ["SEC", "ENT", "PRV"], ... }
"Messages":      { "serves": ["LNK", "ENT"], ... }
"Carte":         { "serves": ["SEC", "PRV", "FRI"], ... }
"Auth":          { "serves": ["PRI", "SEC"], ... }
"Profil":        { "serves": ["LNK", "PRI"], ... }
"Ange":          { "serves": ["FRI", "SEC"], ... }
```

Une évolution qui ne sert aucune finalité est refusée par TRF-006.
Une évolution qui sert plus de finalités gagne l'arbitrage.

---

## Réponses aux 4 questions

| Question | Réponse |
|---|---|
| Manque-t-elle réellement ? | Partiellement — la mission existe, le mapping non |
| Plus fondamentale que Trust ? | Non — orthogonales, plans différents |
| Plus fondamentale que Consciousness ? | Non — l'identité précède la finalité dans l'ADN |
| Nécessaire dans 5 ans ? | Oui — seul outil d'arbitrage entre évolutions ADN-compatibles |

---

## Ordre de priorité mis à jour

```
PRIORITÉ 1 — immat-nervous-system.json
  level_1 · level_2 · PERCEPTION · serves (6 organes)

PRIORITÉ 2 — transformation-laws.json
  Ajouter section finalites (SEC, ENT, PRV, FRI, PRI, LNK)

PRIORITÉ 3 — immat-consciousness.json
  Racine commune des deux Anges

PRIORITÉ 4 — trust-system.json
  Confiance privée contextuelle

PRIORITÉ 5 (future) — agency-model.json
  Décision humaine formalisée
```

---

```
status    : analyse validée
implement : ajouts ciblés dans fichiers existants (pas de nouveau fichier)
blocked_by: PRIORITÉ 1 (level_1 + level_2 des organes)
```
