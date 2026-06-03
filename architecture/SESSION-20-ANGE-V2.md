# Amélioration Navigation Fonctionnalités

> SESSION 20 — ANGE V2 : Référentiel Opérationnel complet + Audit de liaison
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Ce qui a été créé

### Référentiel Opérationnel `knowledge/` — 9 fichiers JSON

| Fichier | Rôle | Accessible |
|---|---|---|
| `knowledge-index.json` | Index maître — liste fichiers + projections | admin |
| `intentions.json` | Mapping besoin → intention organique (10 intentions) | conducteur · gardien |
| `features.json` | Inventaire fonctionnalités reliées aux flux (11 features) | conducteur · gardien |
| `interactions.json` | Scénarios A→B condensés (7 interactions) | conducteur · gardien |
| `screens.json` | Cartographie panels/overlays + actions (4 auth + 5 panels + 2 overlays) | conducteur · gardien |
| `tutorials.json` | Base pédagogique conducteur (10 tutoriels pas-à-pas) | conducteur |
| `organs.json` | Profil organique synthétique — 6 organes avec senses + code_entry | gardien |
| `decisions.json` | 9 décisions impl + 5 en attente + 7 invariants critiques | gardien |
| `commits.json` | Mémoire technique S8→S19 | gardien |
| `meta.json` | Contexte technique statique : fichiers clés, inhibitions, protocole | gardien |

### `scripts/sync-knowledge.js`

Lit tous les JSON via `knowledge-index.json` + sources externes (ADN + FLOW-INDEX) et génère :

- `knowledge-conducteur.ts` (90 lignes) — features · tutoriels · interactions · intentions
- `knowledge-gardien.ts` (171 lignes) — tout le contexte technique complet

**Sources lues automatiquement :**
- `knowledge/*.json` via l'index
- `immat-nervous-system.json` → cinq sens + phases governance (en temps réel)
- `architecture/IMMAT-FLOW-INDEX.json` → 5 flux organiques avec code + state + validation

**Cycle de vie :**
```
Modifier knowledge/*.json → node scripts/sync-knowledge.js → TS mis à jour
Modifier immat-nervous-system.json → node scripts/sync-knowledge.js → senses/phases mis à jour automatiquement
```

---

## Audit de liaison — Résultats

| Point d'audit | Statut |
|---|---|
| Tous les JSON valides (python3 json.load) | ✓ 10/10 |
| Tous les chemins dans knowledge-index.json existent | ✓ 9/9 |
| Sources externes présentes (ADN, FLOW-INDEX, UX files) | ✓ 6/6 |
| ADN _v:8 — senses 5 sens présents | ✓ |
| ADN _v:8 — governance 5 phases présentes | ✓ |
| ADN organs — 6 organes (objet, accès par clé) | ✓ |
| Projection conducteur — 0 leak données Gardien | ✓ |
| Projection gardien — 8 fichiers référencés | ✓ |
| knowledge-gardien.ts — 14 sections clés présentes | ✓ |
| sync --check passe | ✓ |

---

## knowledge-gardien.ts — Sections générées

| Section | Source |
|---|---|
| FICHIERS CLÉS | `meta.json` |
| ORGANES — POINTS D'ENTRÉE CODE | `organs.json` |
| INHIBITIONS | `meta.json` |
| INVARIANTS CRITIQUES | `decisions.json` |
| PROFIL TECHNIQUE SNAPSHOT ANGE | `meta.json` |
| CINQ SENS ORGANIQUES | `immat-nervous-system.json` senses (live) |
| GRILLE SENSORIELLE PAR ORGANE | `organs.json` senses[] |
| PHASES (core/governance.js) | `immat-nervous-system.json` governance (live) |
| CYCLE DE VIE ADN | script statique |
| IMMATORGANISM — OBSERVATEUR | `meta.json` |
| FLUX ORGANIQUES (5 flows complets) | `architecture/IMMAT-FLOW-INDEX.json` (live) |
| PONT CLAUDE | `meta.json` |
| TENSIONS ARCHITECTURALES | `meta.json` |
| PROTOCOLE MODIFICATION SÛRE | `meta.json` |
| DÉCISIONS IMPLÉMENTÉES | `decisions.json` |
| DÉCISIONS EN ATTENTE | `decisions.json` |
| HISTORIQUE SESSIONS | `commits.json` |

---

## Règle "Une seule vérité → Deux projections"

```
ADN (immat-nervous-system.json)          → sync-ns.js  → nervous-system.ts
knowledge/*.json + ADN + FLOW-INDEX      → sync-knowledge.js → knowledge-conducteur.ts
                                                             → knowledge-gardien.ts
```

**Ne jamais modifier les TS directement** — violation INV-015.

---

## Ce qui n'a PAS changé

- `index.html` — aucune modification
- `immat-nervous-system.json` — aucune modification (déjà _v:8)
- Base de données — aucune modification
- Fonctionnalités app — aucune modification

---

## Prochaines sessions possibles

| Priorité | Action | Risque |
|---|---|---|
| P1 | DA-002 : navPremium simulé — décision Gardien (supprimer ou marquer Futur) | Faible |
| P2 | P2-015 : bouton "📍 Voir sur carte" dans card alerte (MORT-002) | Faible |
| P2 | P2-010 : supprimer code mort `_actMsgCard` + `_actAlertCard` | Faible |
| P3 | Niveau 1 cinq sens : câbler `warnIfPhase2()` en prod | Moyen |
| P3 | Créer `sentir(context)` dans ImmatOrganism | Faible |
