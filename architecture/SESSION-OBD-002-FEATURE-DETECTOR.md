# Amélioration Navigation Fonctionnalités

## SESSION OBD-002 — Détecteur automatique de features orphelines

**Date** : 2026-06-04
**Règle** : `NO_ORPHAN_FEATURE`
**Statut** : ✅ Implémenté — 0 HIGH, 0 MEDIUM, 0 LOW

---

## Problème résolu

Toute feature ajoutée au code sans être déclarée dans `knowledge/` crée une
dérive silencieuse entre le code réel et le système nerveux de l'organisme.
Ce détecteur automatise la vérification de cette règle.

---

## 4 fichiers créés

### 1. `scripts/detect-orphan-features.js`
Scanner principal. Analyse 15 fichiers source (HTML, JS, TS).

**Ce qu'il détecte** :
| Type | Sévérité | Exemple |
|------|----------|---------|
| Panel HTML non déclaré | HIGH | `id="newFeaturePanel"` |
| Edge Function inconnue | HIGH | `functions.invoke('new-fn')` |
| App.* non utilitaire | MEDIUM | `App.openCamera()` |
| Événement OBD inconnu | MEDIUM | `observe('NEW_EVENT')` |
| Clé localStorage ic_* | LOW | `ic_new_key` |

**Usage** :
```bash
node scripts/detect-orphan-features.js           # rapport stdout
node scripts/detect-orphan-features.js --save    # écrit reports/
node scripts/detect-orphan-features.js --check   # exit 1 si HIGH
```

### 2. `tests/organism/no-orphan-feature.test.js`
Suite de 10 assertions. Vérifie :
- Structure JSON du rapport valide
- 15 fichiers scannés (dont index.html, messages.js, calls.js)
- **0 finding HIGH** (test bloquant)
- Champs requis présents sur chaque finding
- Sévérités valides (high/medium/low)

```bash
node tests/organism/no-orphan-feature.test.js
# ✔ SUCCÈS — 15 fichiers, 0 HIGH, 0 MEDIUM, 0 LOW
```

### 3. `reports/orphan-features-report.json`
Rapport initial généré après audit complet du codebase.
```json
{
  "stats": { "high": 0, "medium": 0, "low": 0, "total": 0 },
  "scanned_files": ["index.html", "messages.js", "calls.js", ...]
}
```

### 4. `architecture/organism/FEATURE-REGISTRY.md`
Registre des 11 features déclarées + whitelists complètes :
- Panels HTML connus (19 panels)
- Événements OBD connus (20 événements)
- Edge Functions connues (3)
- Clés localStorage ic_* (14)
- Procédure d'ajout de feature

---

## Résultat du scan initial

```
Fichiers scannés : 15
Findings HIGH    : 0  ← règle respectée
Findings MEDIUM  : 0
Findings LOW     : 0
```

---

## Intégration CI (Phase 2)

Ajouter dans `.github/workflows/` ou `tests.yml` :
```yaml
- name: Vérifier features orphelines
  run: node scripts/detect-orphan-features.js --check
```
Phase 1 = warning (current). Phase 2 = `--check` bloque le merge sur HIGH.

---

## Procédure pour ajouter une feature

1. Déclarer dans `knowledge/features.json` (id F-X, organe, actions)
2. Si App.* nouveau : ajouter dans `knowledge/organs.json` → `code_entry`
3. Implémenter
4. `node scripts/detect-orphan-features.js --check` → doit rester à 0 HIGH
5. `node scripts/detect-orphan-features.js --save` → met à jour le rapport

---

*SESSION OBD-002 complète — commit 2fd95fe*
