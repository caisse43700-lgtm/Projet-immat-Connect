# Amélioration Navigation Fonctionnalités

# SESSION 46 — Audit post-merge PR #49 : dettes créées, liens manquants
**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Objet :** Conséquences du merge PR #49 → `main` · nettoyage · processus établi

---

## Ce que le merge PR #49 a créé comme dettes

### Dette 1 — `deploy.yml` trigger redondant ✅ Corrigé

En SESSION 45, le trigger `claude/immatconnect-pro-app-dEKGR` avait été ajouté à `deploy.yml` pour tenter de déployer directement depuis la branche. Ce trigger échouait systématiquement (protection d'environnement `github-pages`). Après le merge dans `main`, ce trigger est devenu du bruit : chaque push sur la branche génère un run "Déploiement GitHub Pages" en échec dans GitHub Actions.

**Correction :** Trigger retiré. `deploy.yml` ne cible plus que `main` + `workflow_dispatch`.

```yaml
# AVANT (SESSION 45)
branches: [main, claude/immatconnect-pro-app-dEKGR]

# APRÈS (SESSION 46)
branches: [main]
```

---

### Dette 2 — Branche de travail désynchronisée ✅ Corrigé

Après un merge PR dans `main`, la branche de travail `claude/immatconnect-pro-app-dEKGR` ne contenait pas le commit de merge (`88f9090`). Toute nouvelle divergence aurait créé des conflits potentiels.

**Correction :** `git merge origin/main` → fast-forward. Les deux branches pointent maintenant sur le même commit.

---

### Dette 3 — Règle `?v=XX` à incrémenter ⚠️ Process

Les scripts `core/` ont reçu `?v=45` en SESSION 45. À chaque prochaine modification d'un fichier `core/`, incrémenter le numéro de version (→ `?v=46`, etc.) pour invalider le cache navigateur.

**Fichiers concernés :**
```html
<script src="core/invariants.js?v=45"></script>
<script src="core/bus.js?v=45"></script>
<script src="core/brain.js?v=45"></script>
<script src="core/governance.js?v=45"></script>
<script src="core/immatOrganism.js?v=45"></script>
```

---

## Processus de déploiement — maintenant établi

```
Développement  →  Commits sur claude/immatconnect-pro-app-dEKGR
Tests CI        →  Tests unitaires + E2E automatiques sur la branche (162 ✅)
Déploiement    →  PR → merge dans main → Pages déployé automatiquement
Sync branche   →  git merge origin/main (fast-forward) après chaque merge PR
```

Ce cycle est prouvé opérationnel (PR #48 SESSION ~40, PR #49 SESSION 45).

---

## Dettes héritées toujours ouvertes (non créées par ce merge)

### Dette architecturale — `bus.js` / `brain._audit()` ⚠️ Documenté SESSION 45

`bus.js` n'exporte pas `window.ImmatBus`. `brain.js` lit `window.ImmatBus` → null → violations jamais émises dans le bus. Le monitoring OBD des violations INV-001/002/007/008 est aveugle.

**Pourquoi non corrigé :** `brain._audit('INV-001', ctx, true)` est hardcodé à `violation=true`. Si le bus était connecté, chaque véhicule sur la carte émettrait un `INVARIANT_VIOLATED` → dashboard 'Dégradé' permanent. Nécessite décision architecturale sur Phase 1 vs monitoring.

### Dead code inoffensif — `setReportMode()` / `reportVehicleOrDrivers()` ⏳

Fonctions orphelines après suppression `#reportPanel` (SESSION 43). Null-safe, aucun appelant actif. À nettoyer lors d'une refonte planifiée.

---

## État production après PR #49

| Vérification | Statut |
|---|---|
| Dashboard Gardien → "Sain ✅" | ✅ Attendu (fix SESSION 44 déployé) |
| signalHereIndicator dans sigStep1 | ✅ Déployé (SESSION 43b) |
| `window.ImmatBrain` → phase réelle | ✅ Déployé (SESSION 45) |
| Scripts `core/` avec `?v=45` | ✅ Déployé (SESSION 45) |
| Service worker nettoyage vieux caches | ✅ Déployé (SESSION 45) |
| Tests unitaires | 162 ✅ / 0 ❌ |

---

## Résumé

**3 dettes créées par le merge → 2 corrigées immédiatement, 1 processuelle.**  
**1 dette architecturale héritée → documentée, à planifier.**  
**Aucun impact fonctionnel utilisateur.**
