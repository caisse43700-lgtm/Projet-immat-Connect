# BRANCH STRATEGY — ImmatConnect
> Gouvernance des branches — ProjectBrain

---

## Les trois branches officielles

```
immatrestore   ← COFFRE-FORT (figé à jamais)
main           ← PRODUCTION (version réelle)
immatv2        ← LABORATOIRE (expérimentation)
```

---

## immatrestore — Coffre-fort

**SHA de référence :** `366332188bc9bfedbdd7afa5d7511ec6ba62b5ad`
**Date de création :** 29 mai 2026
**Tests au moment du gel :** 162 ✅ pass — 0 ❌ fail

### Règles absolues

- Ne jamais committer dessus
- Ne jamais merger dedans
- Ne jamais la rebaser
- Ne jamais la supprimer
- Ne jamais l'utiliser pour développer

### Usage autorisé

- Lecture seule pour restauration
- `git checkout immatrestore` pour inspecter un fichier précis
- `git diff immatrestore main` pour voir tout ce qui a changé depuis

### Ce qu'elle contient

L'application ImmatConnect complète et fonctionnelle :
- Signalements route bidirectionnels (Realtime Supabase)
- Système contact/appels (bannière, modal Message/Appel)
- Messages avec swipe-to-delete
- ImmatOrganism V1 Phase 1 Observateur
- CONSTITUTION.md v2
- 162 tests verts

---

## main — Production

**Rôle :** Version réelle, utilisée par de vrais utilisateurs.

### Ce qu'on peut faire sur main

- Corrections de bugs
- Améliorations UX
- Ajustements fonctionnels mineurs
- Tests en conditions réelles
- Évolutions prudentes validées

### Ce qu'on ne fait pas sur main

- Pas de refonte architecturale massive
- Pas de fusion automatique depuis immatv2
- Pas de migration SQL sans audit préalable
- Pas d'expérimentation dont on n'est pas sûr

### Cycle de vie

```
Développement → branche feature/fix → PR → tests → merge main
```

---

## immatv2 — Laboratoire

**SHA de départ :** `366332188bc9bfedbdd7afa5d7511ec6ba62b5ad` (identique à main au démarrage)

**Rôle :** Tester une nouvelle architecture sans risquer main.

### Ce qu'on expérimente sur immatv2

- Extraction des organes du monolithe `index.html`
- Branchement réel d'ImmatBus sur les actions
- ImmatBrain comme gouverneur métier actif
- Guardian / Constitution exécutable
- User Laws et Sync Laws comme code
- Refactor progressif des modules

### Règles

- immatv2 n'est **jamais** fusionnée automatiquement dans main
- immatv2 peut être cassée, abandonnée, repartie de zéro
- Une bonne idée de immatv2 → portée manuellement vers main après validation
- immatv2 peut diverger fortement de main — c'est voulu

### Comment prouver qu'immatv2 mérite de remplacer main

| Critère | Seuil |
|---------|-------|
| Tests existants | 162/162 ✅ |
| Nouveaux tests couvrant la nouvelle archi | ≥ 20 |
| Aucune régression UX | Validé manuellement |
| Approbation humaine explicite | Obligatoire |

---

## Règles de fusion (merge rules)

| Fusion | Autorisé ? | Condition |
|--------|-----------|-----------|
| feature → main | ✅ | Tests verts + review |
| immatv2 → main | ⛔ automatique | Validation humaine explicite requise |
| main → immatv2 | ✅ | Pour resynchroniser le labo avec la prod |
| quoi que ce soit → immatrestore | ⛔ jamais | Interdit absolument |

---

## Procédures de bascule

### "Passe sur main"

```bash
# 1. Vérifier branche actuelle
git branch --show-current

# 2. Sauvegarder si travail en cours
git add -A && git commit -m "checkpoint-immatv2-$(date +%Y-%m-%d-%H%M)-description"

# 3. Basculer
git checkout main
git pull origin main

# 4. Confirmer
git log --oneline -1
```

### "Passe sur immatv2"

```bash
# 1. Sauvegarder si travail en cours sur main
git add -A && git commit -m "checkpoint-main-$(date +%Y-%m-%d-%H%M)-description"

# 2. Basculer
git checkout immatv2

# 3. Confirmer
git log --oneline -1
```

### Format des commits checkpoint

```
checkpoint-main-YYYY-MM-DD-HHMM-description
checkpoint-immatv2-YYYY-MM-DD-HHMM-description
```

---

## Interdictions absolues

- Ne jamais changer de branche avec du travail non sauvegardé
- Ne jamais modifier immatrestore
- Ne jamais `reset --hard` sans validation explicite
- Ne jamais supprimer une branche sans validation
- Ne jamais merger immatv2 dans main sans approbation humaine
- Ne jamais appliquer une migration SQL sans audit d'impact

---

## Historique des décisions

| Date | Décision | Raison |
|------|----------|--------|
| 2026-05-29 | Création immatrestore SHA `3663321` | Protection de la version stable v1 |
| 2026-05-29 | Création immatv2 depuis main à jour | Laboratoire architecture ImmatOrganism |
| 2026-05-29 | Merge claude/v9-architecture → main | 6 commits session : swipe, ImmatOrganism, bannière |
