# D23 — Le « catalogue de faits autorisés » réduit-il le code ? — VERDICT NO-GO

> **Papier de recherche interne · ImmatConnect Pro**
> Statut : **clos — NO-GO sur la généralisation** · Décision `PROJECT_STATE.md` D23
> Date : 2026-07-01 · Auteur : session IA (protocole validé avec le PO)
> Nature : expérience d'architecture mesurée, réfutation propre d'une hypothèse.

---

## 0. Résumé exécutif (TL;DR)

On a testé si la théorie « **tout est un fait autorisé** » (un catalogue déclaratif de faits +
un moteur générique qui en dérive vocal / confirmation / autorisation / dashboard) **réduit le
code** d'ImmatConnect. Deux migrations réelles et mesurées ont été réalisées sur branche isolée :
`SIGNAL_VEHICULE` (E2) puis `SIGNAL_ROUTE` (E3, réutilisant le même moteur).

**Résultat brut, moteur inclus dans le solde :** E2 = **+29 LOC**, E2+E3 = **+45 LOC**.

**Conclusion :** le catalogue **ne réduit pas le code** ; il **déplace la complexité** vers de la
déclaration verbeuse. Ce qu'il apporte réellement (mesuré) : **change-locality 6→2**, duplication
supprimée, **dérives de vocabulaire éliminées**, cohérence inter-consommateurs garantie.

**Décision :** NO-GO comme architecture générale. Le prototype est conservé comme preuve. Une
**règle d'emploi ciblée** est adoptée (§8).

---

## 1. Hypothèse testée

> **H1** — « Si on modélise chaque action comme un *fait autorisé* déclaré une seule fois, et qu'un
> *moteur générique* en dérive tous les usages (mots vocaux, besoin de confirmation, mot-action,
> autorisation, ligne de dashboard, explication), alors on **écrit moins de code** que la somme des
> implémentations impératives dispersées — le moteur s'amortissant sur le nombre de faits. »

Corollaire opérationnel testé en E3 :

> **H2** — « Ajouter un 2ᵉ fait amortit le coût fixe du moteur et fait tendre le solde LOC vers ≤ 0. »

---

## 2. Cadre expérimental (contraintes strictes, imposées par le PO)

1. **Branche uniquement** — aucune fusion sur `main` sans verdict GO explicite.
2. **Suppression réelle** du code spécifique remplacé (pas de duplication laissée en place).
3. **Mesures avant/après obligatoires.**
4. **Moteur inclus dans le solde LOC** — on ne cache pas le coût fixe du moteur générique.
5. **Aucun contournement si le solde est mauvais** — chiffres bruts d'abord, conclusion ensuite.
6. **UX inchangée** (ou meilleure) — la migration ne doit rien dégrader côté utilisateur.
7. **Moteur sans branche par-fait** — aucun `if (id === 'X')` dans le générique.

### Métriques relevées

| # | Métrique | Définition |
|---|---|---|
| 1 | change-locality | nombre de sites à éditer pour ajouter/modifier/retirer une option |
| 2 | LOC net (moteur inclus) | insertions − suppressions de code produit |
| 3 | duplication supprimée | nombre de copies de la même liste avant → après |
| 4 | indirection / hops | sauts d'accès ajoutés (littéral local → appel catalogue) |
| 5 | time-to-locate | effort pour trouver l'endroit à éditer |
| 6 | tests existants | `npm test` (177 + 3 diagnostic) |
| 7 | tests Ange / vocal | `tests/ange-v2.test.js`, `tests/facts-proto.test.js` |
| 8 | UX vocale | mots écoutés, mot dit, libellés, menus |
| 9 | pureté du moteur | aucune branche spécifique par-fait |

---

## 3. Artéfacts

| Artéfact | Emplacement | Statut |
|---|---|---|
| Prototype (moteur + 3 faits) | `core/immat-facts.js` | **sur `main`** (PR #473) — preuve |
| Tests du prototype | `tests/facts-proto.test.js` | sur `main` |
| **E2** — migration `SIGNAL_VEHICULE` | branche `local/merge-to-main`, commit **`a13617c`** | **non fusionné** |
| **E3** — 2ᵉ fait `SIGNAL_ROUTE` | branche `local/merge-to-main`, commit **`1a3cd96`** | **non fusionné** |
| Ce papier + décision D23 | branche `docs/research-catalogue-faits-nogo` | à conserver |

> Le code E2/E3 reste **isolé** sur `local/merge-to-main` : c'est la matière de preuve, pas du code
> destiné à la production.

---

## 4. Protocole détaillé

### E2 — `SIGNAL_VEHICULE`

**État initial** — la liste des problèmes véhicule était codée en dur en **4 sites** :

- `PROBS` dans `_signalNearest` (rail vocal + boutons) ;
- `LBL` dans `_trySignal` (parse dictée libre) ;
- `choices` dans `_trySignal` (boutons de repli) ;
- `_MENU.signaler.vehicule.children` (menu Ange).

**Dérive constatée** : `LBL` portait un 7ᵉ problème (« Fuite sous le véhicule ») **absent** des 3
autres copies — symptôme classique d'une duplication non synchronisée.

**Transformation** — une source unique `FACTS.SIGNAL_VEHICULE.problems`
(`key / label / short / say / words`, + `offer:false` pour « Fuite » = reconnu à la voix mais non
proposé en bouton, ce qui **préserve l'UX** tout en rendant la dérive explicite et intentionnelle).
Deux helpers **génériques** consomment ce champ sans aucune branche par-fait :

- `offered(f)` → options réellement proposées (filtre `offer !== false`) ;
- `matchOption(f, texte)` → première option dont un mot-clé est présent (vocabulaire fermé).

`voiceHints` et `propose` rendus *problems-aware* de façon générique. Chargement :
`index.html` (`immat-facts.js?v=1`) + `service-worker.js` (`v428 → v429`).

### E3 — `SIGNAL_ROUTE` (le test d'amortissement)

Deuxième fait **à liste d'options** → il **réutilise le même `offered()`** (zéro nouvelle ligne de
moteur). État initial : incidents route codés en dur en **2 sites** (`_MENU.signaler.route.children`
+ grille HTML statique `#sigStep2Route`). Après : `FACTS.SIGNAL_ROUTE.problems`
(+ `icon` / `sev` pour la grille HTML, rendue par `App.sigStepRoute()`).

> La taxonomie **manuelle** `App.vehicleSelectType` (pneu/feu/portiere/fumee/objet/autre) a été
> **laissée intacte** : vocabulaire différent de la voie Ange ; l'unifier aurait **changé l'UX**,
> donc hors périmètre d'une migration à iso-comportement.

Chargement : `immat-facts.js?v=2`, `service-worker.js` `v430`.

---

## 5. Résultats bruts

### 5.1 change-locality

| Fait | Avant | Après |
|---|---|---|
| `SIGNAL_VEHICULE` | 4 sites | 1 déclaration |
| `SIGNAL_ROUTE` | 2 sites | 1 déclaration |
| **Cumulé** | **6 sites** | **2 déclarations** (6 consommateurs nourris) |

### 5.2 LOC net (code produit, **moteur inclus**)

| Périmètre | index.html | immat-facts.js | service-worker.js | **Net** |
|---|---:|---:|---:|---:|
| E2 seul | −1 | +29 *(≈20 moteur / ≈10 donnée)* | +1 | **+29** |
| E3 seul | −7 | +23 *(100 % donnée, moteur inchangé)* | 0 | **+16** |
| **Cumulé E2+E3** | −8 | +52 *(≈20 moteur / ≈32 donnée)* | +1 | **+45** |

### 5.3 duplication

- Véhicule : **4 copies → 1** (+ dérive « Fuite » supprimée).
- Route : **2 copies → 1** (icônes / libellés / sévérité unifiés).

### 5.4 indirection

- **+1 hop** par consommateur (littéral local → `FactCatalog.get(...).offered()`).

### 5.5 time-to-locate

- Avant : `grep « Pneu dégonflé »` → 4 emplacements sur ~300 lignes, **risque d'oubli** (prouvé par
  la dérive « Fuite »).
- Après : **1 emplacement connu**, édition atomique, oubli impossible.

### 5.6 tests

| Suite | Avant | Après |
|---|---|---|
| `npm test` | 177 + 3 | **177 + 3 ✅** |
| `tests/facts-proto.test.js` | 18 | **31 ✅** |
| `tests/ange-v2.test.js` | 240 | **242 ✅** |

### 5.7 UX & pureté moteur

- **UX vocale inchangée** (mots écoutés, mot dit, libellés, menus reproduits à l'identique ;
  « Fuite » toujours reconnue et non offerte ; parse `matchOption` marginalement **plus** tolérant,
  jamais moins).
- **Moteur 100 % générique** : `offered` / `matchOption` opèrent sur le champ `f.problems` ;
  `APPEL` et `FEATURE_TOGGLE` (sans `problems`) traversent sans effet. **Aucune branche par-fait.**

---

## 6. Analyse

**H2 est RÉFUTÉE.** L'amortissement du moteur a bien lieu — les ~20 lignes du moteur sont **fixes**
et **partagées** par 2 faits (E3 n'en ajoute aucune). Mais le solde LOC **monte** (+29 → +45),
parce que **chaque déclaration de fait est plus verbeuse que le code impératif terse qu'elle
remplace** (métadonnées riches : `key/label/short/icon/sev/say/words`).

Autrement dit : **ce n'est pas le moteur qui plombe le solde, c'est la verbosité déclarative
elle-même.** Amortir le moteur ne suffit donc pas ; il faudrait que chaque fait nourrisse
**beaucoup** de consommateurs verbeux pour que la dérivation économise plus que ce que la
déclaration coûte. ImmatConnect n'a pas cette densité (le meilleur cas, `SIGNAL_VEHICULE`, ne
comptait que 4 consommateurs, et le solde y était déjà +29).

**H1 est donc invalidée à cette échelle** sur le critère LOC. En revanche, sur des axes que H1 ne
visait pas explicitement, le catalogue gagne réellement : **locality**, **anti-duplication**,
**anti-dérive**, **cohérence**.

---

## 7. Verdict

> **NO-GO** pour faire du catalogue de faits l'**architecture générale** d'ImmatConnect.
>
> Le critère principal fixé (solde LOC, moteur inclus) n'est pas atteint : à 2 faits, le solde
> **empire** (+45 LOC). Le catalogue **centralise et rend cohérent** — il ne **retire pas** de code.
> Conformément à la règle « aucun contournement si le solde est mauvais », on ne généralise pas et
> on **ne fusionne pas** E2/E3 sur `main`.

Ce qui reste **acquis et vrai** (à ne pas jeter) : change-locality 6→2, duplication supprimée,
dérives éliminées, tests verts, moteur générique sans branche par-fait.

---

## 8. Règle d'emploi future (adoptée)

> **Employer un catalogue de faits UNIQUEMENT si les 4 conditions sont réunies :**
> 1. **plusieurs consommateurs réels** du même fait ;
> 2. **forte duplication** existante ;
> 3. **risque de dérive prouvé** (incohérences déjà observées) ;
> 4. **gain de locality > coût d'indirection**.
>
> **Sinon : garder le code direct** (plus simple, moins de LOC, moins de hops).

Le point de bascule qui rendrait le catalogue gagnant en LOC n'est **pas** « plus de faits » mais
« **des faits à très nombreux consommateurs verbeux chacun** » (p. ex. un fait nourrissant 8–10
écrans / rails / exports). Réévaluer D23 seulement si cette densité apparaît.

---

## 9. Reproductibilité

```bash
# Prototype (sur main)
node tests/facts-proto.test.js          # dérivations génériques

# Code mesuré E2+E3 (branche isolée, non fusionnée)
git checkout local/merge-to-main
npm test                                # 177 + 3 diagnostic
node tests/ange-v2.test.js              # 242
node tests/facts-proto.test.js          # 31

# Chiffres bruts
git diff --numstat <parent-E2> HEAD -- index.html core/immat-facts.js service-worker.js
```

Commits de référence : **E2 `a13617c`**, **E3 `1a3cd96`** (sur `local/merge-to-main`).

---

## 10. Portée & enseignement méta

Ce document vaut au-delà de son sujet : il fixe une **méthode** pour trancher un choix
d'architecture chez ImmatConnect — *hypothèse explicite → protocole mesurable → chiffres bruts →
verdict → règle réutilisable*. Une théorie séduisante (« tout est un fait ») a été **testée plutôt
que crue**, puis **réfutée proprement** comme socle général tout en étant **retenue comme outil
ciblé**. On construit ainsi une **mémoire d'ingénierie**, pas seulement un historique Git.
