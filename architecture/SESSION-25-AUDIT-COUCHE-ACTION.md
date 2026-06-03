# Amélioration Navigation Fonctionnalités

> SESSION 25 — Audit couche ACTION · Réponse aux 8 questions
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## VERDICT GLOBAL

La SESSION 24 est complète **pour la couche compréhension**.

Il existe une lacune, mais ce n'est pas une couche manquante.
C'est un lien manquant.

---

## CE QUI EXISTE DÉJÀ (audit du référentiel réel)

| Donnée | Fichier | Contenu actuel |
|---|---|---|
| Intentions | `intentions.json` | `chemin` = texte libre (ex: "carte → marqueur → Envoyer message") |
| Tutoriels | `tutorials.json` | `TUT-005` = "Envoyer un message à un conducteur" — étapes complètes |
| Interactions | `interactions.json` | `INT-001` = "Message direct" — parcours complet |
| Flows | `IMMAT-FLOW-INDEX.json` | `FLOW-DIRECT-MESSAGE` — code entries précis |
| Impact | `organs.json` | `impact_analyse` par organe |

Quand un conducteur dit "Je veux prévenir le conducteur devant moi" :

- L'intention existe → `INT-CONTACT-DRIVER`
- Le tutoriel existe → `TUT-005`
- L'interaction existe → `INT-001`
- Le flow existe → `FLOW-DIRECT-MESSAGE`

**Le problème n'est pas l'absence de données. C'est l'absence de liens entre elles.**

`INT-CONTACT-DRIVER.chemin` = chaîne de texte libre.
Ange lit ce texte, mais ne peut pas retrouver `TUT-005` ou `INT-001` automatiquement.

---

## RÉPONSES AUX 8 QUESTIONS

### 1. La théorie du tout SESSION 24 est-elle complète ?

**Réponse** : Complète pour la compréhension. Incomplète pour la liaison.

La chaîne INTENTION → ADN → Constitution → NS → Organes → Référentiel → Ange est solide.
Mais à l'intérieur du Référentiel, les nœuds ne sont pas encore connectés entre eux.
`intentions.json` connaît les intentions. `tutorials.json` connaît les étapes. Ils ne se parlent pas.

---

### 2. Existe-t-il une couche manquante entre compréhension et action ?

**Réponse** : Non, ce n'est pas une couche. C'est un champ.

Créer une nouvelle couche "ACTIONS" serait une dette supplémentaire.
La solution est d'ajouter dans chaque intention un champ `liens` qui référence les IDs existants.

```json
{
  "id": "INT-CONTACT-DRIVER",
  "besoin": "Contacter un conducteur spécifique",
  "chemin": "carte → marqueur → Envoyer message...",
  "liens": {
    "tutorial": "TUT-005",
    "interaction": "INT-001",
    "flow": "FLOW-DIRECT-MESSAGE"
  }
}
```

Ange ne possède rien de nouveau. Il sait où chercher.

---

### 3. Faut-il formaliser les actions disponibles pour chaque intention ?

**Réponse** : Oui — mais via des références, pas via une nouvelle logique.

L'erreur serait de créer :
```json
{ "command": "App.panel('messages')" }
```

Ce serait dupliquer le code dans le référentiel — violation d'INV-015.

La bonne formulation :
```json
{ "tutorial": "TUT-005", "flow": "FLOW-DIRECT-MESSAGE" }
```

Ange dit "Voici comment faire" en lisant `TUT-005.etapes`.
Ange dit "Voici le code concerné" en lisant `FLOW-DIRECT-MESSAGE.repérage.code`.

---

### 4. Faut-il formaliser les aperçus pour le Gardien ?

**Réponse** : Non.

Les aperçus A/B/C sont contextuels — ils dépendent de la demande précise du Gardien.
`organs.json.impact_analyse` + `IMMAT-FLOW-INDEX` donnent déjà au Gardien les éléments pour construire ces aperçus.

Stocker les aperçus dans le référentiel signifierait stocker des hypothèses — elles deviennent fausses dès que le code change.

Le Gardien construit les aperçus dans la conversation. Ange fournit les matériaux (impacts, flows, code entries).

---

### 5. Faut-il formaliser les workflows utilisateur complets ?

**Réponse** : Partiellement — mais c'est déjà là.

`tutorials.json` = workflows conducteur (étapes lisibles par l'utilisateur).
`IMMAT-FLOW-INDEX.json` = workflows organiques (code entries + validation).

Ce qui manque : chaque intention ne sait pas quel tutorial lui correspond.
C'est le même problème que la question 3 — résolu par le champ `liens`.

---

### 6. Ces ajouts créent-ils une dette ou réduisent-ils une dette ?

**Réponse** : Réduction de dette, à une condition.

| Action | Impact |
|---|---|
| Ajouter `liens` dans `intentions.json` | Réduction : Ange trouve les ressources sans chercher |
| Créer `actions.json` (nouveau fichier) | Dette nouvelle : une vérité de plus à maintenir |
| Créer une couche "commandes" JS | Dette critique : duplication + couplage |
| Créer des aperçus pré-stockés | Dette certaine : ils se désynchornisent immédiatement |

La condition : les `liens` ne contiennent que des IDs existants. Jamais de logique nouvelle.

---

### 7. Quelle est la structure la plus légère et la plus cohérente ?

**Réponse** : Un champ `liens` dans `intentions.json`, rien d'autre.

```json
// intentions.json — chaque intention enrichie avec :
"liens": {
  "tutorial": "TUT-005",       // tutoriel correspondant (pour conducteur)
  "interaction": "INT-001",    // interaction correspondante
  "flow": "FLOW-DIRECT-MESSAGE" // flow organique (pour gardien)
}
```

`sync-knowledge.js` génère ensuite dans `knowledge-conducteur.ts` :
```
INT-CONTACT-DRIVER → Voir TUT-005 (Envoyer un message à un conducteur)
```

Et dans `knowledge-gardien.ts` :
```
INT-CONTACT-DRIVER → FLOW-DIRECT-MESSAGE | code: ImmatMessages.sendNew()...
```

**Aucun fichier nouveau. Aucune logique nouvelle. Juste des ponts.**

---

### 8. Comment conserver "Ange ne possède rien. Ange relie tout." ?

**Réponse** : En ne stockant jamais de vérité dans les liens.

Les `liens` sont des adresses, pas du contenu.
`"tutorial": "TUT-005"` dit où chercher — pas ce qu'il faut faire.
La vérité reste dans `tutorials.json`, `interactions.json`, `IMMAT-FLOW-INDEX.json`.

Test d'invariant : si Ange disparaît demain, les données restent cohérentes dans l'organisme.
Si les `liens` disparaissent, l'organisme continue de fonctionner — les conducteurs aussi.

---

## STRUCTURE FINALE RECOMMANDÉE

```
INTENTION (intentions.json)
  ↓ liens.tutorial
TUTORIEL (tutorials.json) ← réponse conducteur : "Voici comment faire"
  ↓ liens.interaction
INTERACTION (interactions.json) ← réponse conducteur : "Voici le parcours complet"
  ↓ liens.flow
FLOW (IMMAT-FLOW-INDEX.json) ← réponse gardien : "Voici le code, les organes, la validation"
```

Ange lit le `liens` de l'intention détectée et sert le bon niveau selon le rôle :
- **Conducteur** → `tutorial.etapes` + `tutorial.conseil`
- **Gardien** → `flow.repérage.code` + `organs.impact_analyse`

---

## PISTE 2 (APERÇUS GARDIEN) — VERDICT NON

Les aperçus A/B/C du Gardien ne peuvent pas être pré-stockés.

Exemple : "Comment améliorer l'affichage du marqueur véhicule ?"
→ Option A : modifier `icon()` dans `locate()`
→ Option B : modifier le CSS du marqueur
→ Option C : ajouter une animation

Ces options naissent de la demande, pas du référentiel.
Ce que le Gardien a besoin de stocker : **la décision retenue**, pas les variantes.
C'est déjà fait via `decisions.json`.

---

## PISTE 3 (WORKFLOWS) — DÉJÀ COUVERT

Les workflows conducteur existent dans `tutorials.json`.
Les workflows organiques existent dans `IMMAT-FLOW-INDEX.json`.

Ce qui manque : les liens (résolus par la Piste 1).
Aucun nouveau fichier de workflow n'est nécessaire.

---

## CE QUI CHANGE EN SESSION 25

**Une seule modification** : enrichir `intentions.json` avec `liens` par intention.

**Cascade automatique** :
1. `intentions.json` : champ `liens` ajouté
2. `sync-knowledge.js` : section `LIENS OPÉRATIONNELS` générée
3. `knowledge-conducteur.ts` : Ange sait pointer vers le bon tutoriel
4. `knowledge-gardien.ts` : Ange sait pointer vers le bon flow

**Aucun nouveau fichier JSON. Aucune nouvelle logique. 0 dette créée.**

---

## RÉPONSE À L'INTUITION FINALE

> La prochaine étape ne serait plus ADN/Constitution/NS/Conscience
> mais INTENTION → ACTION → APERÇU → APPLICATION

Verdict : l'intuition est juste, mais les couches existent déjà.

```
INTENTION  → intentions.json          (✅ SESSION 24)
ACTION     → tutorials.json           (✅ existant — juste non lié)
APERÇU     → organs.impact_analyse    (✅ SESSION 24 — juste non lié)
APPLICATION → IMMAT-FLOW-INDEX        (✅ existant — juste non lié)
```

SESSION 25 = **créer les ponts**, pas créer les couches.

---

## DÉCISION REQUISE GARDIEN

| Question | Option A | Option B |
|---|---|---|
| Champ `liens` dans intentions.json | Ajouter (recommandé) | Reporter à plus tard |
| Couvrir toutes les intentions | Oui (10 intentions) | Priorité aux 6 primaires seulement |
| Mettre à jour sync-knowledge.js | Oui, section LIENS générée | Manuellement dans le prompt |

---

## RÈGLE FINALE

> SESSION 24 a résolu la compréhension.
> SESSION 25 résout la liaison.
> L'organisme reste l'unique source de vérité.
> Ange ne possède rien. Ange relie tout.
