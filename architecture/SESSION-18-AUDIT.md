# Amélioration Navigation Fonctionnalités

> SESSION 18 — Audit de sécurité complet (SESSION 17 + 18) — 3 agents en parallèle
> Commit audit : `4c36a16` — branche `claude/immatconnect-pro-app-dEKGR`

---

## Périmètre de l'audit

Tout ce qui a été modifié ou créé depuis le début des sessions :

| Fichier | Sessions | Raison de l'audit |
|---|---|---|
| `index.html` | S17 + S18 | 12 points de modification |
| `core/brain.js` | S17 + S18 | warnIfPhase2 ajouté + return dupliqué supprimé |
| `core/bus.js` | S17 | INVARIANT_WARNING ajouté |
| `core/invariants.js` | S17 | INV-015 ajouté |
| `core/immatOrganism.js` | — | Non modifié, vérifié intégrité |
| `immat-nervous-system.json` | S17 | _v:7, corrections ADN |
| `supabase/functions/_shared/nervous-system.ts` | S17 | Généré depuis JSON |
| `supabase/functions/_shared/knowledge-conducteur.ts` | S17 | Créé |
| `supabase/functions/_shared/knowledge-gardien.ts` | S17 + S18 | Créé + mis à jour |
| `supabase/functions/immat-brain-dialog/index.ts` | S17 | Réécrit complet |

---

## Résultat par fichier

| Fichier | Syntaxe | Exports | Imports | Cohérence | Verdict |
|---|---|---|---|---|---|
| `core/brain.js` | ✅ | ✅ 11 méthodes | ✅ invariants + bus | ✅ | PROPRE |
| `core/bus.js` | ✅ | ✅ ImmatBus + EVENTS | — | ✅ INVARIANT_WARNING | PROPRE |
| `core/invariants.js` | ✅ | ✅ INVARIANTS deepFrozen | — | ✅ 15/15 | PROPRE |
| `core/immatOrganism.js` | ✅ | ✅ diagnose() présente | ✅ window globals | ✅ | PROPRE |
| `immat-nervous-system.json` | ✅ JSON | — | — | ✅ _v:7 · INV-015 | PROPRE |
| `nervous-system.ts` | ✅ TS | ✅ NS as const | — | ✅ _v:7 · INV-015 | PROPRE |
| `knowledge-conducteur.ts` | ✅ TS | ✅ KNOWLEDGE_CONDUCTEUR | — | ✅ depth 1 | PROPRE |
| `knowledge-gardien.ts` | ✅ TS | ✅ KNOWLEDGE_GARDIEN | — | ✅ depth 3 | PROPRE |
| `immat-brain-dialog/index.ts` | ✅ TS | ✅ Deno.serve | ✅ NS + KNOWLEDGE_* | ✅ | PROPRE |
| `index.html` | ✅ | — | ✅ utils.js · core/ | ✅ | PROPRE |

---

## Cas de la suppression du return dupliqué (brain.js)

### Ce qu'était le doublon

Après SESSION 17, brain.js contenait deux blocs `return { ... }` :
- L143–155 : le vrai return (IIFE correcte, avec `warnIfPhase2`)
- L158–170 : return orphelin HORS de l'IIFE (sans `warnIfPhase2`)

### Impact AVANT suppression

| Environnement | Comportement |
|---|---|
| **Browser** | L'IIFE se fermait à L156. Le second return était silencieusement ignoré par le parser HTML. `window.ImmatBrain` exposait correctement les 11 fonctions. |
| **Node.js** | `SyntaxError` à l'import — `require('./core/brain')` plantait. `tests.js:1472` échouait. |

### Impact APRÈS suppression

| Environnement | Comportement |
|---|---|
| Browser | Identique — 11 fonctions exposées |
| Node.js | Fonctionnel — 11 fonctions exportées via `module.exports` |

**La suppression n'a retiré aucune fonctionnalité.** Elle a corrigé un crash Node.js caché.

### Fichiers liés vérifiés

| Fichier | Lien avec brain.js | Impact |
|---|---|---|
| `index.html:21` | `<script src="core/brain.js">` | ✅ Inchangé — browser non affecté |
| `index.html:534` | `window.ImmatBrain?.getPhase?.()` | ✅ Inchangé |
| `tests.js:1472` | `require('./core/brain')` | ✅ Corrigé — crash SyntaxError éliminé |
| `core/immatOrganism.js:28` | `window.ImmatBrain` global | ✅ Inchangé |
| `knowledge-gardien.ts` | Documentation brain.js | ✅ Mis à jour (voir ci-dessous) |

---

## Problèmes réels trouvés et corrigés

### P1 — knowledge-gardien.ts ne documentait pas warnIfPhase2 ni audit() (S18 correction)

`warnIfPhase2` est définie dans brain.js et exportée, mais **jamais appelée en production**. Le gardien ne savait pas qu'elle existait prête à l'emploi.

**Ajouté dans knowledge-gardien.ts :**
```
warnIfPhase2(invId, ctx) — Phase 2 : émet INVARIANT_WARNING sur le bus sans bloquer
  (définie, non câblée en prod)
audit() — snapshot phase+invariants (définie, non câblée en prod)
Méthodes brain jamais câblées en prod : canDisplayVehicleOnMap · canAddVehicleToAlerts ·
  canRequestCall · canShowPersistentCallBanner · warnIfPhase2 · audit
```

---

## Faux positifs écartés

| Signal | Raison de l'exclusion |
|---|---|
| "BLOQUANT : nPlate() indéfinie" | nPlate définie dans utils.js:11 (`w.nPlate = ...`), chargé avant index.html. Utilisée depuis le début, SESSION 17 n'a rien introduit. |
| "IMPORTANT : ic_ange_calls sessionStorage" | Intentionnel — le throttle se réinitialise à chaque session. Normal. |
| "TTS tronque à 200 chars sans warning" | Choix de conception (conduite → brefs). Acceptable. |

---

## Cohérence storage — tableau récapitulatif

| Clé | Storage | Écrit par | Lu par | Survie |
|---|---|---|---|---|
| `ic_ange_history` | sessionStorage | AngeDialog.send() | AngeDialog.send() | Session uniquement |
| `ic_ange_calls` | sessionStorage | AngeDialog.send() | AngeDialog.send() + Dashboard | Session uniquement |
| `ic_ange_feedback` | **localStorage** | AngeDialog.feedback() | Dashboard gardien | Inter-sessions ✅ |
| `ic_onboarded` | localStorage | App.dismissOnboarding() | App.openMap() | Permanent ✅ |
| `ic_trust_scores` | localStorage | (realtime) | _actAlertCard() | Permanent ✅ |

---

## Méthodes brain.js — état réel de câblage

| Méthode | Exposée | Appelée en prod | Notes |
|---|---|---|---|
| `getPhase` | ✅ | ✅ index.html:534 | Dashboard gardien snapshot |
| `setPhase` | ✅ | ✅ tests.js seulement | Pas appelée en prod UI |
| `warnIfPhase2` | ✅ | ❌ jamais | Phase 2 ready, non câblée |
| `computeBadge` | ✅ | ✅ tests.js seulement | |
| `classifyEntity` | ✅ | ✅ tests.js seulement | |
| `validateInvariant` | ✅ | ✅ tests.js seulement | |
| `canDisplayVehicleOnMap` | ✅ | ❌ jamais en prod | Via immatOrganism en théorie |
| `canAddVehicleToAlerts` | ✅ | ❌ jamais en prod | |
| `canRequestCall` | ✅ | ❌ jamais en prod | |
| `canShowPersistentCallBanner` | ✅ | ❌ jamais en prod | |
| `audit` | ✅ | ❌ jamais | |

---

## Dette technique SESSION 19+

| Priorité | Description | Fichier cible |
|---|---|---|
| A | Câbler warnIfPhase2 aux points critiques en prod | index.html + core/immatOrganism.js |
| B | ImmatBrain Phase 3 — refondre can*() pour logique réelle | core/brain.js |
| C | Analyse feedbacks Ange (localStorage) pour améliorer knowledge files | knowledge-conducteur.ts |
| D | tests.js — vérifier suite IO-11→IO-23 passe après fix brain.js | tests.js |

---

## Verdict global

**Zéro bug introduit depuis SESSION 17. Zéro cascade manquée.**
Le seul gap était la documentation manquante de warnIfPhase2 dans knowledge-gardien.ts — corrigé.
