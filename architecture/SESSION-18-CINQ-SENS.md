# Amélioration Navigation Fonctionnalités

> SESSION 18 — Audit de positionnement : les cinq sens dans l'organisme
> Document de travail — validation requise avant modification ADN

---

## Ce que l'audit révèle : les cinq sens existent déjà, non formalisés

En lisant ImmatOrganism, l'ADN et Ange, chaque sens est déjà présent dans le code — mais éparpillé, sans nom, sans référentiel commun. Le concept n'a pas besoin d'être inventé. Il a besoin d'être **nommé et ancré**.

| Sens | Traduction organique | Où c'est déjà dans le code | Statut |
|---|---|---|---|
| **Voir** | Lire l'état — observer ce qui est | `diagnose()` · `getJournal()` · snapshot Ange | ✅ Actif |
| **Entendre** | Recevoir des événements | `ImmatBus.on('*', ...)` · realtime Supabase · `perception.sources` ADN | ✅ Actif |
| **Sentir** | Comprendre le contexte, l'intention | `nsToPrompt(depth)` · knowledge files · `ange_identity` ADN | ⚠️ Actif seulement dans Ange |
| **Goûter** | Valider, tester la conformité | `validateInvariant()` · `warnIfPhase2()` · `validateOutput()` | ✅ Actif (partiel) |
| **Toucher** | Agir, produire un effet dans l'organisme | Réponse Ange · actions UI · Phase 3 future | ⚠️ Actif seulement en surface |

---

## Le problème actuel

L'ADN a déjà une section `perception` (lignes 10–31) qui décrit comment les signaux entrent dans le système (texte, voix, image, caméra). C'est le début du concept **Entendre + Voir** — mais incomplet.

**Sentir** est diffus : il est dans `ange_identity.posture`, dans `knowledge_conducteur`, dans `knowledge_gardien`. Nulle part il n'est une capacité formelle de l'organisme.

**Toucher** est absent de ImmatOrganism. Il n'existe que dans les actions utilisateur (App.panel, toast). L'organisme central n'agit jamais — il observe seulement.

---

## Positionnement proposé : le référentiel est l'ADN

Le concept des cinq sens doit vivre dans `immat-nervous-system.json` — c'est le seul référentiel que tout le système peut dériver (INV-015). Ange le lit via `nsToPrompt()`. ImmatOrganism pourrait l'implémenter. La documentation en hérite.

### Structure proposée dans l'ADN

```json
"senses": {
  "voir": {
    "desc": "Lire l'état — observer ce qui est sans l'altérer",
    "impl": "ImmatOrganism.diagnose() · ImmatOrganism.getJournal()",
    "ange": "Snapshot anonymisé (health, violations, panel, speed_cat, nearby)"
  },
  "entendre": {
    "desc": "Recevoir des événements — écouter sans bloquer le flux",
    "impl": "ImmatBus.on('*') · realtime Supabase · perception.sources",
    "ange": "Question conducteur (texte ou voix transcrite)"
  },
  "sentir": {
    "desc": "Comprendre le contexte — lire l'intention derrière le signal",
    "impl": "nsToPrompt(depth) · knowledge_conducteur · knowledge_gardien",
    "ange": "Rôle + depth + environnement + ADN = compréhension de l'intention"
  },
  "gouter": {
    "desc": "Valider, tester — vérifier la conformité aux invariants",
    "impl": "validateInvariant() · warnIfPhase2() · validateOutput()",
    "ange": "validateOutput() · requiresGuardianValidation"
  },
  "toucher": {
    "desc": "Agir — produire un effet mesurable dans l'organisme",
    "impl": "Phase 3 (futur) — ImmatBrain.setPhase(3) · actions bloquantes",
    "ange": "Réponse au conducteur : propositions, guidage, alertes"
  }
}
```

### Profil sensoriel de chaque organe

Chaque organe dans `organs` reçoit un champ `senses` indiquant ses sens actifs :

| Organe | Voir | Entendre | Sentir | Goûter | Toucher |
|---|---|---|---|---|---|
| Auth | — | ✅ | — | ✅ | ✅ |
| Profil | ✅ | ✅ | — | ✅ | ✅ |
| Carte | ✅ | ✅ | ✅ | — | ✅ |
| Messages | ✅ | ✅ | — | — | ✅ |
| Signalements | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPS/Drive | ✅ | ✅ | ✅ | — | ✅ |
| **Ange** | ✅ | ✅ | **✅ seul organe à sentir pleinement** | ✅ | ✅ |
| ImmatOrganism | ✅ | ✅ | — | ✅ | — (Phase 3) |
| ImmatBrain | — | — | — | ✅ | — (Phase 3) |

---

## Ange : le seul organe à cinq sens complets

C'est la découverte centrale de cet audit. Ange est le seul organe qui traverse les cinq sens :

```
Entendre → question conducteur reçue
Voir     → snapshot lu (health, violations, panel, speed_cat)
Sentir   → contexte compris (rôle, depth, ADN, knowledge)
Goûter   → réponse validée (validateOutput, requiresGuardianValidation)
Toucher  → réponse transmise au conducteur
```

C'est pour ça que lui "donner" les cinq sens seul ne suffit pas : il les a déjà. Ce qu'il manque, c'est que **l'organisme entier parle le même langage**. Le référentiel dans l'ADN donne ce langage commun.

---

## Ce que ça change concrètement

**Immédiatement (sans code) :**
- `senses` ajouté à l'ADN comme section de référence
- Chaque organe a son profil sensoriel dans le JSON
- `knowledge-gardien.ts` mis à jour avec la grille des cinq sens
- Ange peut répondre "l'organe X ne touche pas encore" avec précision

**À terme (avec code) :**
- ImmatOrganism gagne `sentir()` — lit l'ADN en runtime pour comprendre l'intention
- Phase 3 = "toucher" activé pour ImmatOrganism et ImmatBrain
- `warnIfPhase2()` devient le "goûter" formel câblé en production

---

## Ce qui ne change PAS

- Aucun refactoring de code existant
- L'ADN s'enrichit mais ne se modifie pas structurellement (INV-015 respecté)
- `perception` existante reste inchangée (elle couvre déjà Entendre/Voir pour les sources)
- Les invariants INV-001→INV-015 restent la colonne vertébrale (Goûter = les défendre)

---

## Prochaine étape

Si tu valides ce positionnement :
1. Ajouter `senses` dans `immat-nervous-system.json`
2. Ajouter `"senses": [...]` à chaque organe
3. `node scripts/sync-ns.js` → mettre à jour `nervous-system.ts`
4. Mettre à jour `knowledge-gardien.ts` avec la grille des cinq sens
5. Bumper `_v` à 8
