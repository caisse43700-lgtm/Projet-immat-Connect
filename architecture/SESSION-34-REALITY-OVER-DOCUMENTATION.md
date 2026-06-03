# Amélioration Navigation Fonctionnalités

# SESSION 34 — REALITY_OVER_DOCUMENTATION

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## PRINCIPE

```
Si la documentation dit que quelque chose fonctionne
mais que le conducteur ne le perçoit pas,
alors la réalité a raison.
```

---

## FORMULATION CANONIQUE

**ID** : `REALITY_OVER_DOCUMENTATION`

**Principe** : Le comportement perçu par le conducteur prime sur le comportement théorique.

**Contre-exemple** : Une boucle parfaitement documentée mais invisible pour l'utilisateur.

**Test** : Le conducteur perçoit-il l'effet de cette fonctionnalité sans lire la documentation ? Si NON → la fonctionnalité n'existe pas encore.

**Corollaire** : Un bug non perçu n'est pas une priorité. Une valeur non perçue n'est pas une valeur.

---

## POURQUOI CETTE RÈGLE EST LA MÉTA-RÈGLE

Les 13 règles précédentes disent ce qu'on doit construire.

REALITY_OVER_DOCUMENTATION dit comment le juger.

Elle est la règle de vérification de toutes les autres.

| Règle | Elle dit... | REALITY_OVER_DOCUMENTATION vérifie... |
|---|---|---|
| INTENT_FIRST | Partir de l'intention | L'intention a-t-elle produit un comportement perçu ? |
| LOOP_CLOSURE | La boucle se ferme | Le conducteur ressent-il que la boucle s'est fermée ? |
| DISCOVERABILITY_TEST | Trouvable en 30s | Le conducteur l'a-t-il effectivement trouvé ? |
| TRANSPARENCY | Le conducteur comprend | A-t-il réellement compris, pas juste "pu comprendre" ? |

---

## APPLICATION IMMÉDIATE

SESSION 31 avait noté que la boucle CONTRIBUTION était documentée comme fonctionnelle (2/5) mais que le créateur d'un signalement ne percevait jamais son impact.

**Avant cette règle** : "La boucle CONTRIBUTION fonctionne — le signalement est bien envoyé."

**Après cette règle** : "La boucle CONTRIBUTION est incomplète tant que le créateur ne perçoit pas que son signalement a été utile."

La SESSION 33 (alertHistoryBox visible) est la première application concrète de ce principe : la valeur documentée (historique localStorage) est devenue valeur perçue.

---

## ÉTAT DES RÈGLES ORGANIQUES — 14/14

| # | ID | Nature |
|---|---|---|
| 1–10 | INTENT_FIRST → SOCIAL_VISIBILITY | Règles de construction |
| 11 | DISCOVERABILITY_TEST | Règle de découvrabilité |
| 12 | ANGE_SURVIVAL_TEST | Règle de dépendance |
| 13 | ATTENTION_IS_SCARCE | Règle d'économie d'attention |
| **14** | **REALITY_OVER_DOCUMENTATION** | **Méta-règle de vérification** |

---

## FICHIERS MODIFIÉS

| Fichier | Modification |
|---|---|
| `architecture/organism/ORGANISM-RULES.json` | _v:3 — règle 14 avec test et corollaire |
| `knowledge/decisions.json` | REALITY_OVER_DOCUMENTATION ajouté en regles_organiques |
| `knowledge/commits.json` | Session 34 ajoutée |
| `supabase/functions/_shared/knowledge-gardien.ts` | Regénéré (249 lignes) |
