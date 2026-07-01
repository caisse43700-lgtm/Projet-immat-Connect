# docs/research — Papiers de recherche interne

Mémoire d'ingénierie d'ImmatConnect Pro : les **choix d'architecture testés**, pas seulement décidés.

Chaque papier suit la même trame : **hypothèse explicite → protocole mesurable → chiffres bruts →
verdict → règle réutilisable**. Objectif : pouvoir, dans un an, retrouver *quelle hypothèse a été
testée, quel protocole, quels résultats, et pourquoi la décision a été prise*.

Les papiers sont indexés par le numéro de **décision** correspondante dans
`PROJECT_STATE.md` (section « Décisions validées »).

| Réf | Sujet | Verdict | Fichier |
|---|---|---|---|
| D23 | Le « catalogue de faits autorisés » réduit-il le code ? | **NO-GO** (généralisation) | [`D23-verdict-catalogue-faits-nogo.md`](./D23-verdict-catalogue-faits-nogo.md) |

> Convention : un papier n'est créé que lorsqu'une hypothèse a été **réellement testée avec des
> mesures**. Les décisions non expérimentales restent dans `PROJECT_STATE.md`.
