# Amélioration Navigation Fonctionnalités

# DOSSIER VALIDATION GARDIEN — Déploiement Sessions 32→36
**Date :** 2026-06-03  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Base de comparaison :** commit `fdcda70` (fin session 31)  
**Statut :** En attente de validation Gardien — aucun push production effectué

---

## 1. LISTE EXACTE DES FICHIERS MODIFIÉS

### Fichiers code (déployables)

| Fichier | Sessions | Nature des modifications |
|---|---|---|
| `index.html` | 33, 36, 36A | 4 modifications (voir détail) |
| `supabase/functions/immat-brain-dialog/index.ts` | 36c | 1 modification (7 lignes) |
| `knowledge/decisions.json` | 33, 34, 35, 36A | 6 nouvelles entrées |
| `scripts/sync-ns.js` | 36 | try/catch autour de generate() |
| `scripts/sync-knowledge.js` | 36 | vérification croisée R-04 |

### Fichiers générés automatiquement (dérivés)

| Fichier | Source canonique | Regeneré par |
|---|---|---|
| `supabase/functions/_shared/knowledge-gardien.ts` | knowledge/*.json | sync-knowledge.js |
| `supabase/functions/_shared/knowledge-conducteur.ts` | knowledge/*.json | sync-knowledge.js |
| `supabase/functions/_shared/nervous-system.ts` | immat-nervous-system.json | sync-ns.js |
| `knowledge/organs.json` | (session 32 — ajout intentions/features/boucles) | — |

---

## 2. DIFF FINAL

### index.html — 4 modifications

**2a. alertHistoryBox sorti de sigStep2Route (session 33)**
```diff
-    <details id="alertHistoryBox" class="altet-history" style="margin-top:12px">
-      <summary>Historique des signalements</summary>
-      <div id="alertHistoryList" class="altet-list"></div>
-    </details>
```
→ Retiré de l'intérieur de sigStep2Route.
```diff
+  <div id="alertHistoryBox" class="altet-history" style="display:none;margin-top:4px;...">
+    <div class="sig-section-hd" style="margin-bottom:6px">Mes signalements</div>
+    <div id="alertHistoryList" class="altet-list"></div>
+  </div>
```
→ Placé avant gpsErrorMsg. Toujours présent dans le DOM. `display:none` par défaut, togglé par `renderAlerts()` selon `S.alertHistory.length`.

**2b. trustDelta() limité à 300 entrées (session 36 — R-02)**
```diff
+  const _tk=Object.keys(S.trust);
+  if(_tk.length>300){const _drop=_tk.slice(0,_tk.length-300);_drop.forEach(k=>delete S.trust[k]);}
```

**2c. renderAlerts() — toggle display alertHistoryBox (session 33)**
```diff
+  const histBox=$('alertHistoryBox');
+  if(histBox)histBox.style.display=S.alertHistory.length?'':'none';
```

**2d. updateCommunityStatus() — garde hors ligne (session 36 — R-07)**
```diff
-updateCommunityStatus(){let el=$('communityStatus');if(!el)return;const active=
+updateCommunityStatus(){let el=$('communityStatus');if(!el)return;
+  if(!S.networkOnline){el.textContent='Hors ligne · GPS actif · alertes en cache';return;}
+  const active=
```

---

### supabase/functions/immat-brain-dialog/index.ts — 1 modification (session 36c)

```diff
+    if (!isGardien) {
+      delete result.route;
+      delete result.proposal;
+      delete result.invariants;
+      delete result.vigilance;
+    }
+
     return result;
```
→ Strippage actif des champs techniques avant retour au conducteur.

---

### scripts/sync-ns.js — 1 modification (session 36 — R-03)

```diff
-const generated = generate();
+let generated;
+try { generated = generate(); } catch(e) {
+  console.error('[sync-ns] ✗ Erreur lecture source :', e.message);
+  process.exit(1);
+}
```

---

### scripts/sync-knowledge.js — 1 modification (session 36 — R-04)

```diff
+  // R-04 : vérification croisée decisions.json ↔ ORGANISM-RULES.json
+  const orgRulesPath = path.join(ROOT, 'architecture', 'organism', 'ORGANISM-RULES.json');
+  if (fs.existsSync(orgRulesPath)) {
+    const orgRules = JSON.parse(fs.readFileSync(orgRulesPath, 'utf8'));
+    const orgIds = (orgRules.organic_rules || []).map(r => r.id).sort().join(',');
+    const decIds = (d.decisions.regles_organiques || []).map(r => r.id).sort().join(',');
+    if (orgIds !== decIds) {
+      console.error('[sync-knowledge] ✗ Désynchronisation règles ...');
+      ok = false;
+    }
+  }
```

---

### knowledge/decisions.json — 6 nouvelles entrées

2 décisions implémentées ajoutées :
- `SESSION-33` — alertHistoryBox correction
- `SESSION-36A-R07` — updateCommunityStatus offline

4 règles organiques ajoutées (session 32 + 34, gap corrigé session 35) :
- `DISCOVERABILITY_TEST`
- `ANGE_SURVIVAL_TEST`
- `ATTENTION_IS_SCARCE`
- `REALITY_OVER_DOCUMENTATION`

---

## 3. COMMIT PROPOSÉ

```
fix: sessions 32→36 — corrections risques systémiques + séparation Ange + règles organiques

Corrections implémentées :
- R-02 : ic_trust_scores limité à 300 entrées (trustDelta)
- R-03 : sync-ns.js try/catch autour de generate()
- R-04 : sync-knowledge.js --check vérifie decisions.json ↔ ORGANISM-RULES.json
- R-07 : updateCommunityStatus() affiche statut hors ligne (boucle ORIENTATION)
- AXE-5 : validateOutput() strippe route/proposal/invariants/vigilance pour conducteur
- SESSION-33 : alertHistoryBox visible dès le premier signalement (hors sigStep2Route)

Règles organiques :
- 14/14 règles présentes dans decisions.json (gap session 35 corrigé)
- DISCOVERABILITY_TEST + ANGE_SURVIVAL_TEST + ATTENTION_IS_SCARCE (session 32)
- REALITY_OVER_DOCUMENTATION (session 34)

Référentiel :
- ORGANISM-RULES.json == decisions.json : 14/14 règles identiques (vérifié)
- knowledge-gardien.ts régénéré (255 lignes)
- nervous-system.ts synchronisé (_v:8)
```

---

## 4. RÉSULTATS DES TESTS

### sync-ns --check
```
[sync-ns] ✓ TS à jour (_v:8)
```
✅

### sync-knowledge --check
```
[sync-knowledge] ✓ Les deux TS sont à jour
```
✅

### validate-ns-refs (DET-001)
```
✓ 19 anchors résolus
⚠ 2 avertissements (conflits routing — triés par profondeur par Claude)
✗ 1 anchor introuvable : Messages.sendMsg → App.sendMsg (legacy)
```

**Analyse du ✗ :**  
`App.sendMsg` est marqué `(legacy)` dans le NS — il s'agit d'une ancienne fonction remplacée par `ImmatMessages.sendNew()`. L'anchor est une référence historique, pas un appel actif. Non bloquant. Pré-existant avant session 32.

### test-brain-routing
```
SCORE ROUTING : 100% (22/22 questions avec organe attendu)
SCHÉMA NS     : ✓ valide
CONFLITS      : 2 (avertissements — non bloquants)
LACUNES       : 5 questions sans mot-clé (extension possible)
CRITIQUE      : 0 (aucune anomalie bloquante)
```
✅

---

## Synthèse pour validation

| Point | Résultat |
|---|---|
| Fichiers modifiés (code) | 5 fichiers + 3 générés |
| Lignes ajoutées (code) | ~40 lignes |
| Lignes supprimées (code) | ~4 lignes |
| Tests sync | ✅ 2/2 verts |
| Test NS refs | ⚠ 1 legacy non bloquant |
| Test routing | ✅ 100% |
| Bug bloquant | Aucun |
| Régression identifiée | Aucune |

**En attente de validation Gardien avant tout push vers production.**
