# Amélioration Navigation Fonctionnalités

> SESSION 19 — ADN _v:8 : Les cinq sens organiques formalisés
> Niveau 0 — zéro code modifié, zéro risque, zéro dette
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Ce qui a changé

### `immat-nervous-system.json` — _v:7 → _v:8

**Trois ajouts, zéro modification existante :**

#### 1. Section `senses` (niveau racine, après `ange_identity`)

Les cinq sens formalisés comme vocabulaire organique :

| Sens | Phase activation | Implémentation actuelle |
|---|---|---|
| `voir` | Phase 1 | `ImmatOrganism.diagnose()` · snapshot Ange |
| `entendre` | Phase 1 | `ImmatBus.on('*')` · realtime Supabase |
| `gouter` | Phase 2 | `validateInvariant()` · `warnIfPhase2()` (non câblé prod) |
| `toucher` | Phase 3 | `can*()` (non câblés) · réponse Ange |
| `sentir` | Phase 4 | `nsToPrompt(depth)` · knowledge files · FLOW-INDEX (Ange seulement) |

Chaque sens contient : `desc` · `impl` · `ange` · `phase_activation` · `note` si partiel.

Lien avec la boucle organique :
```
entendre → identifier l'intention
voir     → repérer les composants
sentir   → comprendre le contexte
toucher  → mesurer l'impact et agir
gouter   → tester la conformité
```

#### 2. Profil sensoriel `senses: [...]` sur chaque organe

| Organe | Voir | Entendre | Sentir | Goûter | Toucher |
|---|---|---|---|---|---|
| Auth | — | ✅ | — | ✅ | ✅ |
| Profil | ✅ | ✅ | — | ✅ | ✅ |
| Carte | ✅ | ✅ | ✅ | — | ✅ |
| Messages | ✅ | ✅ | — | — | ✅ |
| Signalements | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ange** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Ange = seul organe à cinq sens complets.** C'est la découverte de SESSION 18 — maintenant formalisée dans l'ADN.

**ImmatOrganism** ne sentit pas encore (manquant explicitement dans notes). C'est la dette connue.

#### 3. Section `governance` — mapping phases ↔ sens

Lie les phases de `core/governance.js` à leur sens activé :

```
Phase 1 Observateur  → voir + entendre           (ACTIF)
Phase 2 Conseiller   → + gouter                  (prêt, non câblé prod)
Phase 3 Gardien      → + toucher                 (prêt, non câblé prod)
Phase 4 Coordinateur → + sentir                  (sentir() à créer)
Phase 5 Intelligence → conscience complète       (human_approval requis)
```

---

### `nervous-system.ts` — regénéré via `node scripts/sync-ns.js`

Dérivé automatiquement du JSON (INV-015). Contient _v:8, toutes les nouvelles sections.

---

### `knowledge-gardien.ts` — grille cinq sens ajoutée

Section **CINQ SENS ORGANIQUES** et **GRILLE SENSORIELLE PAR ORGANE** ajoutées.  
L'Ange peut maintenant répondre avec précision : "L'organe X ne touche pas encore."

---

## Ce qui n'a PAS changé

- Aucun code JavaScript ou TypeScript fonctionnel modifié
- Aucun invariant modifié ou ajouté
- La section `perception` existante reste inchangée (elle couvre déjà Entendre/Voir pour les sources)
- Aucune fonctionnalité app modifiée
- `_doc`, `ange_identity`, `routing`, `access_policy`, `inhibitions`, `invariants` → intacts

---

## Niveau 1 — prochaines sessions (non urgents)

| Étape | Action | Risque |
|---|---|---|
| Câbler `warnIfPhase2()` en prod | Points critiques index.html + immatOrganism.js | Faible |
| Créer `sentir(context)` dans ImmatOrganism | Lit snapshot + ADN, retourne intention détectée | Faible |
| Ajouter IO-29/IO-30 dans tests.js | Validation comportementale Phase 4 | Faible |
| Phase 3 réelle | `can*()` retournent false câblés | Moyen — validation Gardien requise |
