# Amélioration Navigation Fonctionnalités

# SESSION 29 — ÉTAT BRANCHE, DÉPLOIEMENT, AUDIT ANGE P2-1

**Date :** 2026-06-06  
**Commit HEAD :** `4eed05f`  
**Tests :** 328/328 ✔

---

## 1. Vérification P1 — commit d5e0a4b ✅ CONFIRMÉ

| Correction | Fichier | Contenu confirmé |
|---|---|---|
| P1-1 `window.CallManager = CallManager` | `calls.js` (+2 lignes) | ✅ |
| P1-2 `invisBtn` dupliqué → `invisDrawerBtn` | `index.html` (-1 ID) | ✅ |
| P1-3 `guardian-loop.js?v=1` chargé | `index.html` (+1 `<script>`) | ✅ |
| P1-4 Autoloader OBD dans `immatOrganism.js` | `core/immatOrganism.js` (+19 lignes) | ✅ |
| P1-5 `obdSession.js` + `obdGateway.js` + `aiController.js` | `core/` (3 nouveaux fichiers) | ✅ |
| P1-6 Service worker v5→v6, 2→19 fichiers cachés | `service-worker.js` (+15 lignes) | ✅ |

**Total commit d5e0a4b :** 7 fichiers, 359 insertions, 3 suppressions.

---

## 2. Situation branche vs déploiement

### Branche courante
```
claude/immatconnect-pro-app-dEKGR  HEAD → 4eed05f
```

### Ancêtre commun avec origin/main
```
c2c6f9e  (commit de la dernière sync)
```

### Divergence
```
Notre branche : +3 commits  (SESSION 28, P1, docs)
origin/main   : +35 commits (PRs #68/74/83, ponts, Ange, diagnostics)
```

### Déploiement GitHub Pages
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]   ← uniquement main
```

**Conclusion :** Les corrections P1 ne sont PAS encore sur `main` → pas encore en production.

---

## 3. Risque de conflit avec PRs #68, #74, #83

| Élément | Notre branche | origin/main | Risque |
|---|---|---|---|
| `core/obdSession.js` | ✅ Intégré (même source) | ✅ Présent | **Aucun — identiques** |
| `core/obdGateway.js` | ✅ Intégré (même source) | ✅ Présent | **Aucun — identiques** |
| `core/aiController.js` | ✅ Intégré (même source) | ✅ Présent | **Aucun — identiques** |
| `core/immatOrganism.js` autoloader | ✅ Notre version | ✅ Leur version | **Faible — même logique** |
| `service-worker.js` | v6 — 19 fichiers | Leur version | **Faible — notre v6 est plus complète** |
| `ui.js` | V6 (378 lignes, complet) | V7 (164 lignes, recovery) | **⚠️ CONFLIT MAJEUR** |

---

## 4. Conflit ui.js — explication

origin/main a réécrit `ui.js` en version V7 "recovery" pendant la période de bugs :

```javascript
// origin/main ui.js (V7 — 164 lignes)
if (window.__ImmatConnectSafeUIV7) return;
// "SAFE AUTH + MAP + BUTTONS RECOVERY"
// Écrit pour réparer une régression
```

Notre branche conserve `ui.js` **V6 (378 lignes)** — version complète et architecturée.

**Décision : garder notre V6.** La V7 de main est une rustine temporaire. Notre V6 est plus complète.

---

## 5. Stratégie de déploiement recommandée

### Option A — PR : `claude/immatconnect-pro-app-dEKGR` → `main` (recommandé)

**Avantages :**
- Déploiement automatique via GitHub Pages
- Processus propre avec historique
- Notre V6 complète remplace la V7 rustine

**Conflits à résoudre manuellement :**
- `ui.js` → garder la nôtre (V6)
- `service-worker.js` → garder la nôtre (v6, 19 fichiers)
- `index.html` → merger Ange UI depuis main + garder nos SessionS 17-28

**À faire avant la PR :**
- Intégrer l'Ange UI depuis main dans notre index.html (P2-1)
- Vérifier les conflits sur interaction-engine.js

### Option B — Changer deploy.yml pour déployer depuis notre branche

```yaml
# Modifier pour tester notre branche en production
branches: [main, claude/immatconnect-pro-app-dEKGR]
```

**Avantages :** Valider P1 sans merger immédiatement  
**Inconvénients :** Deux branches déploient en prod simultanément

---

## 6. P2-1 — Audit Ange/Gardien ← À NE FAIRE QU'APRÈS VALIDATION P1

**L'Ange existe. Il n'est pas absent du code. Il est absent de notre branche.**

### Ce qui existe dans origin/main (jamais intégré chez nous)

| Élément | Fichier | Ligne (main) | État chez nous |
|---|---|---|---|
| `<button id="angeFab">✦</button>` | `index.html` | 2029 | ❌ Absent |
| `<div id="angeOverlay">` | `index.html` | 2030 | ❌ Absent |
| `<div id="angePanel">` | `index.html` | 2031 | ❌ Absent |
| CSS `#angeFab` (position fixed, style ✦) | `index.html` | 2010 | ❌ Absent |
| CSS `#angePanel` (bottom sheet) | `index.html` | 2012 | ❌ Absent |
| `AngeDialog.open/close/send/startVoice/feedback` | `index.html` | 2049+ | ❌ Absent |
| `AngeAction` (SESSION 26) | `index.html` | 2174+ | ✅ Présent |
| `window.AngeAction = AngeAction` | `index.html` | 2288 | ✅ Présent |
| Logique rôle gardien → `angeFab.style.display='flex'` | `index.html` | 546 + 580 | ✅ Guard if() présent |

### Ce qui existe dans notre branche

- `AngeAction` (SESSION 26) — défini dans index.html ✅
- `window.AngeAction` exposé ✅
- `checkPermissions()`, `prepareInteraction()`, `execute()` ✅
- Logique `if($('angeFab'))` — guard présent mais angeFab absent → silencieux ✅

### Ce qui manque dans notre branche

- Le bouton `angeFab` ✦ visible
- L'overlay et le panel `angePanel`
- `AngeDialog` (open/close/send/voice/feedback/renderResponse)
- Le CSS pour le bouton et le panel

### Architecture AngeDialog (origin/main)

```
AngeDialog.open()
  → affiche angePanel + angeOverlay
  → focus sur #angeMsg (textarea)

AngeDialog.send()
  → récupère #angeMsg.value
  → appelle l'edge function Ange
  → AngeDialog.renderResponse(r)

AngeDialog.renderResponse(r)
  → affiche r.juste, r.vigilance[], r.options[]
  → boutons 👍👎 feedback
  → TTS si S.voice activé

AngeDialog.startVoice()
  → SpeechRecognition → remplit #angeMsg

Bouton angeFab : visible uniquement si :
  → conducteur = toujours visible (style.display='flex')
  → gardien = visible + classe is-gardien
```

### Conclusion P2-1

Ne pas reconstruire l'Ange. **Il faut porter 4 blocs de origin/main vers notre branche :**

1. Le bouton `<button id="angeFab">` + CSS
2. L'overlay `<div id="angeOverlay">`
3. Le panel `<div id="angePanel">` avec textarea + bouton envoyer
4. L'objet `AngeDialog` (open/close/send/startVoice/feedback/renderResponse)

**Taille estimée :** ~100 lignes dans index.html. Aucun conflit avec nos sessions.

---

## 7. Fichiers présents dans origin/main mais absents de notre branche

| Fichier | Utilité | Priorité |
|---|---|---|
| `core/diagnostic/bus-bridge.js` | Bridge ImmatBus → diagnostic | P3 |
| `core/diagnostic/claude-obd-gateway.js` | Gateway Claude/OBD | P3 |
| `core/diagnostic/diagnostic-adapter.js` | Adaptateur diagnostics | P3 |
| `core/diagnostic/diagnostic-inbox.js` | Boîte de réception diagnostics | P3 |
| `core/diagnostic/obd-report.js` | Générateur de rapports OBD | P3 |
| `core/diagnostic/path-registry.js` | Registre des chemins | P3 |
| `core/diagnostic/source-tracer.js` | Traceur de source | P3 |
| `.github/workflows/e2e-diagnostics.yml` | CI diagnostics E2E | P3 |
| `diagnostic-tests.js` | Tests diagnostics | P3 |
| `AI_ENTRYPOINT.md` | Doc point d'entrée IA | P3 |
| `SAFE_CHANGE_PROTOCOL.md` | Protocole changements sûrs | P3 |

Tous P3 — pas bloquants pour la prod. Intégrables proprement après validation P1.

---

## 8. Réponses aux 6 questions de l'audit

**Q1 — Branche à devenir main ?**  
Oui. `claude/immatconnect-pro-app-dEKGR` contient tout le travail SESSION 17-28 + corrections P1. Elle doit devenir main via PR, après intégration de l'Ange UI (P2-1).

**Q2 — main contient déjà ces corrections ?**  
Non. Les 3 commits P1 (`828958e`, `d5e0a4b`, `4eed05f`) sont absents de main.

**Q3 — Quelle PR ouvrir ?**  
`claude/immatconnect-pro-app-dEKGR` → `main`. Conflits à résoudre : ui.js (garder V6), service-worker.js (garder v6).

**Q4 — Risque de conflit avec PRs #68/74/83 ?**  
Minimal — les 3 fichiers OBD sont identiques. Le seul vrai conflit est `ui.js` (résolu en gardant notre V6).

**Q5 — Tester en production avant merger ?**  
Option possible : ajouter `claude/immatconnect-pro-app-dEKGR` dans deploy.yml branches. À décider.

**Q6 — Ange est-il reconstruit ou reconnecté ?**  
Reconnecté uniquement. L'Ange existe dans origin/main. Porter 4 blocs HTML/JS vers notre branche suffit.

---

## 9. Prochaine action recommandée

```
ÉTAPE 1 : Valider P1 → décider mode (PR immédiate OU test branche d'abord)
ÉTAPE 2 : Porter Ange UI depuis origin/main (P2-1, ~100 lignes)
ÉTAPE 3 : PR claude/immatconnect-pro-app-dEKGR → main
ÉTAPE 4 : Déploiement GitHub Pages automatique
ÉTAPE 5 : Test production complet
ÉTAPE 6 : P2-2/P2-3 si nécessaire
```
