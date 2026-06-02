# AUDIT — Base de Connaissance pour l'Ange
> Version 15.0 · 2026-06-02 · Branche claude/immatconnect-pro-app-dEKGR

---

## RÉSUMÉ EXÉCUTIF

L'Ange possède déjà un "ADN" structuré : `immat-nervous-system.json`.  
Il connaît ses 6 organes, ses invariants, ses inhibitions.  
**Ce qu'il ne sait pas** : ce que l'application peut faire — aucune carte des fonctionnalités,  
aucune liste des actions disponibles par rôle, aucune version de référence.

**Ce document répond à :**
1. Est-ce que le fichier est dans la base ? Non. Où devrait-il être ?
2. Comment le rendre accessible à l'Ange selon le rôle ?
3. Quelle structure adopter (racine, grille, map) ?
4. Où dans l'ADN ?
5. Plan d'implémentation SESSION 16.

---

## PARTIE 1 — ÉTAT DE L'ART

### 1.1 Ce qui existe aujourd'hui

| Fichier | Rôle actuel | Accessible à l'Ange ? |
|---|---|---|
| `immat-nervous-system.json` | ADN de l'Ange — organes, routing, invariants | ✅ Oui (via Edge Function) |
| `architecture/ux/UX-BUTTONS.json` | 926 lignes — index de tous les boutons | ❌ Non |
| `architecture/ux/UX-INTERACTIONS.json` | Interactions A↔B | ❌ Non |
| `architecture/ux/UX-SCREENS.json` | Écrans et panels | ❌ Non |
| `architecture/ux/UX-JOURNEYS.json` | Parcours utilisateur | ❌ Non |
| `architecture/ux/UX-OBJECTS.json` | Objets métier | ❌ Non |
| `architecture/ux/UX-NOTIFICATION-MATRIX.json` | Matrice notifications | ❌ Non |
| `architecture/ARCHITECTURE-FONCTIONNELLE-COMPLETE.md` | Architecture lisible humain (1659 lignes) | ❌ Non |
| `architecture/MATRICE-INTERACTIONS-COMPLETE.md` | Tous les flux A↔B | ❌ Non |

### 1.2 Ce que l'Ange reçoit aujourd'hui à chaque appel

```
AngeDialog.send() → immat-brain-dialog (Edge Function)
  body: {
    message:  "ta question",
    feature:  "sm" (panel actif),
    mode:     "consultation",
    snapshot: {
      health:     score ImmatOrganism,
      summary:    résumé diagnostique,
      violations: [3 premières violations],
      panel:      panel actif
    }
  }
```

**Ce que l'Ange NE reçoit PAS :**
- La liste des fonctionnalités disponibles
- Ce que l'utilisateur peut faire dans le panel actif
- Les flux A↔B en cours ou possibles
- Le rôle réel (gardien vs conducteur) — connu de la Edge Function mais pas structuré dans le prompt

### 1.3 Les 3 niveaux d'accès définis dans `access_policy`

| Niveau | Nom | Depth | Ce qu'il voit |
|---|---|---|---|
| `guardian` | Gardien | 3 | Tout — technique, code, contraintes, invariants |
| `protector` | Protecteur | 2 | Usage + comportement — sans technique |
| `observer` | Observateur | 1 | Usage seulement |

**Aujourd'hui** : seul le niveau `guardian` (depth=3) est implémenté dans la Edge Function.  
Les niveaux `protector` et `observer` sont définis dans `access_policy` mais **pas encore utilisés**.

### 1.4 Les 6 organes de l'Ange (ce qu'il connaît)

```
Auth · Profil · Carte · Messages · Signalements · Ange
```

Ces organes décrivent les composants techniques — **pas** les fonctionnalités visibles des utilisateurs.

---

## PARTIE 2 — DIAGNOSTIC — CE QUI MANQUE

### 2.1 Le gap entre l'ADN et les fonctionnalités

```
ADN ACTUEL                      FONCTIONNALITÉS (manquant dans l'ADN)
─────────────────               ─────────────────────────────────────
Organe "Signalements"     ──→   ??? signaler la route
                                ??? signaler un véhicule  
                                ??? demander de l'aide
                                ??? "J'arrive" → helper_coming
                                ??? SOS 3 secondes
                                ??? FLOW-001 à FLOW-008

Organe "Messages"         ──→   ??? envoyer un message
                                ??? composer / répondre / supprimer
                                ??? openThread
                                ??? topMsgBadge

Organe "Carte"            ──→   ??? zoomer / localiser
                                ??? menu contextuel véhicule (3 actions)
                                ??? favoris / historique
                                ??? mode invisible
```

L'Ange connaît les "tuyaux" mais pas ce qui circule dedans.

### 2.2 Problèmes concrets identifiés

**Problème A — L'Ange ne peut pas guider un conducteur**
Si un conducteur pose "comment contacter un véhicule ?", l'Ange répond avec le routing
technique (`Signalements[alerte|signalement|route]`) sans savoir qu'il faut aller dans
Carte → clic véhicule → "Envoyer message" ou panel "Signaler".

**Problème B — L'Ange ne peut pas guider un gardien sur les modifications**
Si un gardien demande "quelles fonctionnalités sont disponibles pour les conducteurs ?",
l'Ange n'a aucune carte à consulter — il répond sur les organes, pas les fonctionnalités.

**Problème C — Pas de versioning**
Quand le code évolue (nouvelle fonctionnalité, bouton retiré), l'Ange continue à répondre
avec des informations obsolètes. Il n'y a aucun mécanisme de synchronisation.

**Problème D — La coupure gardien / conducteur**
La Edge Function refuse les non-gardiens (ligne 266 : `role !== 'gardien'`).
Les conducteurs normaux n'ont pas accès à l'Ange via la Edge Function.
Pourtant, le bouton ✦ est maintenant visible pour tous (SESSION 15).
→ **Incohérence** : bouton visible mais Edge Function fermée.

---

## PARTIE 3 — ARCHITECTURE PROPOSÉE

### 3.1 La racine : `immat-nervous-system.json`

**C'est déjà l'ADN de l'Ange. Il faut l'enrichir, pas créer un nouveau fichier.**

La section à ajouter s'appelle `feature_map`. Elle devient la carte des fonctionnalités —
la "grille" que l'utilisateur a demandée.

```
immat-nervous-system.json  ← la racine (existe, v6)
├── ange_identity           ← qui est l'Ange (existe)
├── perception              ← comment il perçoit les signaux (existe)
├── routing                 ← routing signal → organe (existe)
├── organs                  ← 6 organes techniques (existe)
├── access_policy           ← 3 niveaux guardian/protector/observer (existe)
├── inhibitions             ← ce que l'Ange ne fait jamais (existe)
├── invariants              ← règles inviolables (existe)
└── feature_map             ← NOUVEAU : carte des fonctionnalités
    ├── version             ← "15.0"
    ├── last_updated        ← "2026-06-02"
    ├── user_map            ← ce que le CONDUCTEUR peut faire
    └── admin_map           ← tout user_map + ce que le GARDIEN peut faire en plus
```

### 3.2 Structure détaillée de `feature_map`

```json
"feature_map": {
  "version": "15.0",
  "last_updated": "2026-06-02",

  "user_map": {
    "_desc": "Fonctionnalités accessibles à tout conducteur authentifié",
    "navigation": {
      "panels": ["carte", "signaler", "activite", "messages", "gps", "profil"],
      "tabbar": ["BTN-N01", "BTN-N02", "BTN-N03", "BTN-N04", "BTN-N05"]
    },
    "carte": {
      "actions": [
        "voir les autres conducteurs sur la carte",
        "zoomer / dézoomer",
        "se localiser (bouton GPS)",
        "ouvrir menu contextuel véhicule",
        "basculer mode nuit/jour",
        "mode invisible (ne pas apparaître)"
      ],
      "vehicule_context_menu": [
        "Envoyer un message",
        "Signaler ce véhicule",
        "Appeler ce conducteur"
      ],
      "btns": ["BTN-M01..BTN-M15"]
    },
    "signalement": {
      "types": ["route", "vehicule", "aide"],
      "route_labels": ["Ralentissement", "Accident", "Danger", "Travaux", "Police", "Route mouillée"],
      "vehicule_labels": ["Pneu à plat", "Feu arrière cassé", "Fuite d'huile", "Objet sur le toit"],
      "aide_labels": ["Panne", "Crevaison", "Accident", "Besoin d'aide"],
      "flows": ["FLOW-001", "FLOW-003", "FLOW-004"],
      "btns": ["BTN-R01..BTN-R20"]
    },
    "activite": {
      "cards": ["route", "vehicule", "aide", "messages"],
      "actions_par_card": {
        "route": ["Vu ✓", "Résolu"],
        "vehicule": ["Toujours là", "Résolu"],
        "aide": ["✋ J'arrive", "Passer"],
        "messages": ["Répondre →", "Ignorer"]
      },
      "status_badges": {
        "helper_coming": "✋ En route · [plaque]",
        "seen_by_driver": "Vu par le conducteur",
        "seen": "Vu",
        "mine": "Mon signalement"
      },
      "flows": ["FLOW-002", "FLOW-005"],
      "btns": ["BTN-AC01..BTN-AC15"]
    },
    "messages": {
      "modes": ["inbox", "compose", "sent"],
      "actions": ["lire", "répondre", "supprimer message", "supprimer conversation", "marquer lu"],
      "flows": ["FLOW-006"],
      "btns": ["BTN-MSG01..BTN-MSG10"]
    },
    "gps": {
      "actions": ["rechercher destination", "calculer itinéraire", "démarrer navigation", "arrêter"],
      "voix": ["instructions virages", "distance", "recalcul"],
      "premium": ["trafic en temps réel", "alertes conducteurs sur le trajet"],
      "btns": ["BTN-GPS01..BTN-GPS08"]
    },
    "profil": {
      "champs": ["pseudo", "plaque", "téléphone", "couleur véhicule"],
      "actions": ["modifier profil", "changer voix GPS", "toggle effets", "nettoyage cache", "déconnexion", "SOS"],
      "btns": ["BTN-P01..BTN-P12"]
    },
    "sos": {
      "declencheur": "bouton SOS (3s maintenu)",
      "effet": "message urgence envoyé aux conducteurs proches + activation mode aide",
      "flow": "FLOW-007"
    }
  },

  "admin_map": {
    "_desc": "Tout user_map + fonctionnalités gardien/admin",
    "_extends": "user_map",
    "ange": {
      "acces": "bouton ✦ → AngeDialog.open()",
      "fonctions": [
        "consultation fonctionnalités",
        "diagnostic technique (ImmatOrganism)",
        "proposition d'évolution (proposal)",
        "routing organe technique",
        "lecture invariants et inhibitions"
      ],
      "depth": 3,
      "limites": [
        "jamais de décision à la place du gardien",
        "jamais de modification code / DB",
        "requiresGuardianValidation toujours true"
      ]
    },
    "gardien_tools": {
      "outils_debug": ["body.is-gardien CSS", "gardien-debug-tool class"],
      "supervision": ["voir toutes les alertes", "voir tous les signalements"],
      "moderation": ["résoudre alertes", "bannir plaque"],
      "edge_functions": ["immat-brain-dialog", "create-call-request", "respond-call-request"]
    }
  }
}
```

### 3.3 Comment `feature_map` entre dans le prompt de l'Ange

Dans `nervous-system.ts`, la fonction `nsToPrompt()` génère le system prompt.  
Il faut l'enrichir pour inclure `feature_map` selon le depth :

```
depth=3 (guardian)  → admin_map complet inclus dans le prompt
depth=2 (protector) → user_map inclus (fonctionnalités conducteur)
depth=1 (observer)  → résumé navigation seulement
```

**Texte ajouté au prompt (depth=3) :**
```
FONCTIONNALITÉS v{version} :
CONDUCTEUR : carte[voir/zoomer/localiser/menu-véhicule] · signaler[route/vehicule/aide] ·
activité[cards/badges] · messages[inbox/compose] · gps[nav/voix] · profil · sos
GARDIEN : tout_conducteur + ange[consultation/proposal/routing] + debug + supervision
FLOWS : FLOW-001..008 — voir feature_map.flows pour détail
```

### 3.4 Enrichissement du snapshot côté client (`AngeDialog.send()`)

Pour que l'Ange connaisse le contexte en temps réel, enrichir le `snapshot` envoyé :

```javascript
// Dans AngeDialog.send(), ligne ~1890
let snapshot = {};
try {
  const _d = window.ImmatOrganism?.diagnose?.() || {};
  snapshot = {
    health:     _d.health,
    summary:    _d.summary,
    violations: (_d.violations || []).slice(0, 3).map(v => ({invariant:v.invariant, severity:v.severity})),
    panel:      S.panel || 'GENERAL',
    // NOUVEAU :
    role:       S.isGardien ? 'gardien' : 'conducteur',
    features:   _getActivePanelFeatures(S.panel)  // fonction à créer
  };
} catch(e) {}
```

```javascript
// Fonction utilitaire à ajouter
function _getActivePanelFeatures(panel) {
  const map = {
    'sm':       ['carte', 'localiser', 'menu-véhicule', 'signaler'],
    'altet':    ['signaler-route', 'signaler-véhicule', 'demander-aide'],
    'activite': ['voir-alertes', 'j-arrive', 'résoudre', 'badges'],
    'messages': ['inbox', 'compose', 'répondre'],
    'drive':    ['gps', 'navigation', 'voix', 'itinéraire'],
    'profil':   ['modifier-profil', 'sos', 'déconnexion']
  };
  return map[panel] || ['général'];
}
```

---

## PARTIE 4 — DIFFÉRENCIATION DES RÔLES

### 4.1 Ce que voit / peut faire chaque rôle

| Fonctionnalité | Conducteur | Gardien/Admin |
|---|---|---|
| Carte (voir, zoomer, localiser) | ✅ | ✅ |
| Menu contextuel véhicule | ✅ | ✅ |
| Signaler route / véhicule / aide | ✅ | ✅ |
| Activité (cards, badges, J'arrive) | ✅ | ✅ |
| Messages (inbox, compose) | ✅ | ✅ |
| GPS navigation + voix | ✅ | ✅ |
| Profil + SOS | ✅ | ✅ |
| Bouton ✦ (Ange) | ✅ (SESSION 15) | ✅ |
| Ange → réponse IA (Edge Function) | ❌ (403 actuel) | ✅ |
| Ange → lecture technique (organes, invariants) | ❌ | ✅ |
| Debug tools (`is-gardien`) | ❌ | ✅ |
| Supervision alertes globales | ❌ | ✅ |

### 4.2 La coupure gardien / conducteur dans l'Edge Function

**État actuel (ligne 266 de `immat-brain-dialog/index.ts`) :**
```typescript
if (roleErr || role !== 'gardien') {
  return Response.json({ ok: false, reason: 'forbidden_role' }, { status: 403 });
}
```

**Conséquence SESSION 15 :**  
Le bouton ✦ est visible pour tous les conducteurs — mais s'ils cliquent et posent une question,  
ils reçoivent une erreur 403 silencieuse (ou "Erreur : forbidden_role").

**Ce qu'il faut faire (SESSION 16) :**  
Créer deux branches dans la Edge Function :
- Gardien → `nsToPrompt(3)` : accès complet (technique + fonctionnalités admin)
- Conducteur → `nsToPrompt(2)` : accès usage + fonctionnalités conducteur

```typescript
// SESSION 16 — à implémenter
const isGardien = (role === 'gardien');
const depth = isGardien ? 3 : 2;
const systemPrompt = nsToPrompt(depth);
```

---

## PARTIE 5 — VERSIONING

### 5.1 Principe

`feature_map.version` suit la numérotation des sessions : **"15.0"**, "16.0", "16.1"...

Format : `"{session}.{patch}"` — patch = correction mineure sans nouvelle session.

### 5.2 Qui met à jour `feature_map` ?

Quand une session ajoute / modifie / retire une fonctionnalité :
1. Modifier `feature_map` dans `immat-nervous-system.json`
2. Incrémenter `version` et mettre à jour `last_updated`
3. Redéployer la Edge Function (pour que `nervous-system.ts` recharge le JSON)

### 5.3 Comment l'Ange signale une base obsolète

Dans le prompt (à ajouter) :
```
Si un utilisateur demande une fonctionnalité non listée dans feature_map,
réponds : "Cette fonctionnalité n'est pas répertoriée dans la base v{version}.
Elle est peut-être nouvelle — le gardien doit mettre à jour feature_map."
```

### 5.4 Trace dans le snapshot

Le client envoie `knowledge_version: "15.0"` dans le snapshot.  
La Edge Function peut comparer avec sa propre version et signaler un écart.

---

## PARTIE 6 — RISQUES ET CONTRAINTES

| Risque | Impact | Mitigation |
|---|---|---|
| `feature_map` trop grosse → context window saturée | Moyen | Compresser le texte généré dans `nsToPrompt()` — 1 ligne par panel |
| Redéploiement Edge Function à chaque update | Faible | Normal — toute modif `nervous-system.ts` exige redéploiement |
| Incohérence entre `feature_map` et code réel | Élevé | Discipline de mise à jour à chaque session |
| Gardien → conducteur : accès partiel ou absent | Élevé (SESSION 15 crée l'incohérence) | Corriger la Edge Function en SESSION 16 |
| `UX-BUTTONS.json` non synchronisé avec `feature_map` | Faible | `feature_map` référence les IDs BTN-xxx, pas le contenu complet |

**Contrainte SQL :**  
La solution ne touche à aucun schéma DB — uniquement `immat-nervous-system.json`,
`_shared/nervous-system.ts`, et `index.html`. Contrainte respectée.

---

## PARTIE 7 — CE QUI EST DÉJÀ LÀ ET PEUT ÊTRE RÉUTILISÉ

Les fichiers `architecture/ux/` sont déjà une base de connaissance — ils ne sont juste pas
branchés à l'Ange. Ils servent de **source de référence** pour remplir `feature_map` :

| Fichier UX | Alimente | Utilisé comment |
|---|---|---|
| `UX-BUTTONS.json` | `feature_map.*.btns[]` | Références BTN-xxx dans feature_map |
| `UX-SCREENS.json` | `feature_map.*.panels[]` | Liste des panels par feature |
| `UX-INTERACTIONS.json` | `feature_map.*.flows[]` | Références FLOW-xxx dans feature_map |
| `UX-JOURNEYS.json` | `feature_map.*.user_map.navigation` | Parcours utilisateur complets |
| `UX-NOTIFICATION-MATRIX.json` | `feature_map.*.notifications` | À ajouter en v2 |

`feature_map` n'est pas une duplication — c'est un résumé référençant ces fichiers.

---

## PARTIE 8 — PLAN SESSION 16

### Étape 1 — Ajouter `feature_map` dans `immat-nervous-system.json`
- Modifier le fichier (509 lignes, version 6 → 7)
- Ajouter la section complète `feature_map` avec `user_map` et `admin_map`
- Version : "15.0" (rétroactif — la connaissance couvre SESSION 15)

### Étape 2 — Mettre à jour `_shared/nervous-system.ts`
- Ajouter le type `feature_map` dans les imports
- Enrichir `nsToPrompt()` pour inclure `feature_map` selon le depth

### Étape 3 — Corriger la Edge Function `immat-brain-dialog/index.ts`
- Retirer le 403 systématique pour non-gardien
- Brancher depth selon le rôle (depth=3 gardien, depth=2 conducteur)
- Passer les fonctionnalités conducteur dans le prompt depth=2

### Étape 4 — Enrichir `AngeDialog.send()` dans `index.html`
- Ajouter `role` et `features` dans le snapshot
- Ajouter la fonction `_getActivePanelFeatures(panel)`

### Ordre d'exécution
```
1. immat-nervous-system.json  (données — source unique)
2. nervous-system.ts          (transformation — dérivée)
3. immat-brain-dialog         (consommateur — Edge Function)
4. index.html AngeDialog      (client — enrichit snapshot)
```

### Commits attendus
```
feat: feature_map v15.0 dans immat-nervous-system.json
feat: nsToPrompt enrichi avec feature_map selon depth
fix: Edge Function — conducteur depth=2, gardien depth=3
feat: snapshot enrichi avec role et features dans AngeDialog
```

---

## PARTIE 9 — RÉPONSES DIRECTES AUX QUESTIONS

**"Est-ce que ce fichier est enregistré dans la base ?"**  
Non. `ARCHITECTURE-FONCTIONNELLE-COMPLETE.md` est dans le repo git mais n'est pas dans
l'ADN de l'Ange. L'Ange ne peut pas le consulter.

**"Il faudrait qu'il soit accessible et qu'on sache où il est."**  
Sa version structurée et condensée doit vivre dans `immat-nervous-system.json` sous `feature_map`.
C'est là que l'Ange va la chercher. C'est déjà la "racine".

**"Il va être modifié, il va évoluer."**  
`feature_map.version` + `last_updated` permettent de tracer chaque évolution.
Chaque session qui modifie une fonctionnalité met à jour ces deux champs.

**"S'identifier par ange utilisateur et administrateur."**  
`feature_map.user_map` = conducteur.  
`feature_map.admin_map` = gardien/admin (étend user_map).  
La Edge Function branché sur `nsToPrompt(depth=2 ou 3)` selon le rôle.

**"Ce qui permettra à l'Ange quand il a fait une modification de relier au codage."**  
`feature_map` référence les IDs boutons (`BTN-xxx`), les flows (`FLOW-xxx`), les panels (`sm`,
`altet`, `activite`...) — les mêmes que dans le code. Le pont est explicite.

**"Référence déjà toutes les actions, toutes les fonctionnalités."**  
C'est exactement ce que `feature_map` fait — une carte exhaustive, par panel, par rôle,
avec références croisées vers les fichiers UX JSON existants.

**"Il faut que ça soit dans une partie de l'ADN. Je sais pas laquelle."**  
**`immat-nervous-system.json`** — c'est l'ADN existant de l'Ange.
`feature_map` devient la 9ème section de ce fichier (après les 8 sections actuelles).

---

## ANNEXE — SCHÉMA COMPLET DE CONNECTIVITÉ

```
FICHIER SOURCE (la racine)
immat-nervous-system.json  v7 (après SESSION 16)
│
├── ange_identity, perception, routing, organs, access_policy, inhibitions, invariants
└── feature_map (NOUVEAU)
    ├── version: "15.0"
    ├── user_map: {navigation, carte, signalement, activite, messages, gps, profil, sos}
    └── admin_map: {∪ user_map + ange, gardien_tools}
         │
         ▼
TRANSFORMATION (dérivée, pas dupliquée)
_shared/nervous-system.ts
  nsToPrompt(depth=3) → system prompt gardien (admin_map inclus)
  nsToPrompt(depth=2) → system prompt conducteur (user_map inclus)
         │
         ▼
EDGE FUNCTION (consomme la transformation)
immat-brain-dialog/index.ts
  → depth selon role (3=gardien, 2=conducteur)
  → STATIC_SYSTEM mis en cache Anthropic (prompt caching)
  → dynamicContext = snapshot (panel, role, features)
         │
         ▼
CLIENT (enrichit le contexte dynamique)
index.html · AngeDialog.send()
  snapshot.role     = 'gardien' | 'conducteur'
  snapshot.features = features du panel actif
  snapshot.knowledge_version = "15.0"
         │
         ▼
RÉPONSE ANGE
JSON validé · requiresGuardianValidation=true
  juste / sources / options / vigilance / proposal
  → rendu dans AngeDialog.renderResponse()
```

---

*Audit produit en SESSION 15 — implémentation prévue SESSION 16.*
