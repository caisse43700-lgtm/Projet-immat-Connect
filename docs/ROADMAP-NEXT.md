# ROADMAP-NEXT — ImmatConnect Pro

**Créé** : 2026-06-08  
**État de référence** : main @ `68f322b` — CI 4/4 green  
**Périmètre** : post-merge PR #268 — toutes les phases 0-10 sont sur main.

---

## Légende

| Priorité | Signification |
|---|---|
| P0 | Bloquant — à corriger avant tout autre travail |
| P1 | Important — valeur élevée, risque faible |
| P2 | Utile — à planifier |
| P3 | Optionnel — nice-to-have |

| Effort | Signification |
|---|---|
| XS | < 1h |
| S | 1–4h |
| M | 4–8h |
| L | 1–3 jours |
| XL | > 3 jours |

---

## 1. Dette technique

### DT-001 — Preflight : guillemets typographiques non détectés dans les template literals

| Champ | Valeur |
|---|---|
| **Fichier** | `scripts/preflight-inline-js.mjs` |
| **Priorité** | P1 |
| **Risque** | Moyen — un guillemet typographique dans un backtick-string passerait le preflight mais casserait le runtime JS |
| **Dépendances** | Aucune |
| **Effort** | XS |

**Description** : La détection actuelle split les lignes sur `/"[^"]*"/g` pour ignorer les doubles quotes, mais ne gère pas les template literals (backticks). Un `'` ou `'` à l'intérieur d'un `` `...` `` ne serait pas filtré et déclencherait un faux positif — ou, si le backtick encadre une expression avec une apostrophe typographique, la syntaxe JS serait invalide sans être détectée.

**Correction** : Ajouter un strip des template literals avant la détection de guillemets. Priorité P1 car c'est la seule défense statique contre la régression du bug parse error de `1065bab`.

---

### DT-002 — `source_module` / `privacy_level` : champs IE non renseignés par les appelants

| Champ | Valeur |
|---|---|
| **Fichiers** | `calls.js`, `messages.js`, `index.html`, `core/interaction-engine.js` |
| **Priorité** | P2 |
| **Risque** | Faible — les champs sont `null` par défaut, aucune régression |
| **Dépendances** | Aucune |
| **Effort** | S |

**Description** : `source_module` et `privacy_level` ont été ajoutés à `InteractionEngine.create()` (commit `578593d`) mais aucun appelant ne les passe encore. Le ledger stocke `null` pour tous les événements. Le Guardian ne peut donc pas filtrer par source ni par niveau de confidentialité.

**Correction** : Passer `source_module` (ex : `'calls.js'`, `'messages.js'`, `'index.html/blockPlate'`) et `privacy_level` (ex : `'public'`, `'anonymized'`, `'private'`) dans chaque appel `InteractionEngine.create()` existant.

---

### DT-003 — `getRuntimeState()` absent de `messages.js`

| Champ | Valeur |
|---|---|
| **Fichier** | `messages.js` |
| **Priorité** | P2 |
| **Risque** | Faible — OBD incomplet mais non bloquant |
| **Dépendances** | Aucune |
| **Effort** | XS |

**Description** : Tous les modules core exposent `getRuntimeState()` pour l'OBD (`calls.js`, `core/interaction-engine.js`, `core/audio-manager.js`, etc.), mais `messages.js` n'en expose pas. Le dashboard OBD ne peut pas lire l'état temps réel des messages (mode courant, thread actif, etc.).

---

## 2. Améliorations

### AM-001 — Assets audio : src réels

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/audio-manager.js`, éléments `<audio>` dans `index.html` |
| **Priorité** | P2 |
| **Risque** | Moyen — dépend de la stratégie Service Worker/cache |
| **Dépendances** | **Audit SW/cache requis avant toute implémentation** |
| **Effort** | M |

**Description** : `AudioManager` est câblé et fonctionnel mais les `src` des éléments audio sont vides. Les sons (bip message, sonnerie entrante, tonalité sortante) ne sont pas joués. Bloqué par l'absence de décision sur comment servir les assets audio sans conflit avec le Service Worker v11.

**Prérequis** : Définir la stratégie SW pour les assets audio (cache-first ? network-first ? précache au install ?), choisir les fichiers audio, puis brancher les `src`.

---

### AM-002 — Guardian : UI de recommandation visible pour l'utilisateur

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/guardian-loop.js`, `index.html` (panel Activité ou Settings) |
| **Priorité** | P2 |
| **Risque** | Faible — Guardian est déjà câblé en OBD, pas d'état critique à toucher |
| **Dépendances** | DT-002 (source_module/privacy_level) recommandé pour recommandations plus précises |
| **Effort** | M |

**Description** : Le Guardian analyse le ledger et génère des recommandations (HEURISTIC-001 à 004), mais celles-ci ne sont visibles que dans l'OBD dashboard. L'utilisateur ne les voit jamais. Une UI minimale (badge dans Activité ou alerte dans Settings) permettrait d'exposer les recommandations avec validation explicite.

**Contraintes impératives** :
- Validation utilisateur toujours requise avant toute action
- Chaque recommandation doit citer un `ledger_event_id`
- Le Guardian ne peut pas auto-appliquer ni muter l'état d'appel

---

### AM-003 — Consentement privacy avant acceptation d'appel

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/call-screen.js`, `calls.js` |
| **Priorité** | P2 |
| **Risque** | Moyen — touche au flux d'acceptation d'appel |
| **Dépendances** | Aucune bloquante |
| **Effort** | S |

**Description** : L'autotest (Phase 10) référence un check "privacy avant acceptation". Le flux actuel accepte un appel entrant directement sans étape de consentement sur la visibilité de la position GPS. À implémenter comme modale légère avant `CallManager.acceptCall()`.

---

## 3. Fonctionnalités futures

### FF-001 — Sons différenciés réels

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/audio-manager.js` |
| **Priorité** | P3 |
| **Risque** | Faible une fois AM-001 débloqué |
| **Dépendances** | AM-001 (assets audio) obligatoire |
| **Effort** | S |

**Description** : `AudioManager` définit déjà `playMessageBeep()`, `playIncomingRingtone()`, `playOutgoingTone()` — l'architecture est en place. Il suffit de brancher les bons fichiers audio sur les bons éléments HTML.

---

### FF-002 — Expansion de la couverture autotest mobile

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/mobile-autotest.js` |
| **Priorité** | P3 |
| **Risque** | Faible — autotest est read-only |
| **Dépendances** | Aucune |
| **Effort** | M |

**Description** : L'autotest Phase 10 couvre les flux principaux. Des scénarios edge-case restent non couverts : appel expiré/manqué avec audio bloqué, thread supprimé localement, signalement sans position GPS, Guardian recommendation avec evidence vide.

---

### FF-003 — Ledger InteractionEngine : export / visualisation

| Champ | Valeur |
|---|---|
| **Fichiers** | `core/interaction-engine.js`, OBD dashboard |
| **Priorité** | P3 |
| **Risque** | Faible — lecture seule du localStorage |
| **Dépendances** | DT-002 (source_module renseigné) recommandé pour utilité maximale |
| **Effort** | S |

**Description** : Le ledger accumule des événements dans localStorage mais n'est consultable que via l'OBD dashboard (vue brute JSON). Une vue filtrée par type/date/plaque dans le dashboard améliorerait l'utilisabilité pour le débogage et la revue de Guardian.

---

## Synthèse

| ID | Titre | Priorité | Effort | Risque | Dépendances |
|---|---|---|---|---|---|
| DT-001 | Preflight template literals | P1 | XS | Moyen | Aucune |
| DT-002 | source_module/privacy_level appelants | P2 | S | Faible | Aucune |
| DT-003 | getRuntimeState() dans messages.js | P2 | XS | Faible | Aucune |
| AM-001 | Assets audio src réels | P2 | M | Moyen | Audit SW/cache |
| AM-002 | Guardian UI recommandations | P2 | M | Faible | DT-002 (recommandé) |
| AM-003 | Consentement privacy appels | P2 | S | Moyen | Aucune |
| FF-001 | Sons différenciés réels | P3 | S | Faible | AM-001 |
| FF-002 | Expansion autotest edge-cases | P3 | M | Faible | Aucune |
| FF-003 | Ledger export/visualisation | P3 | S | Faible | DT-002 (recommandé) |

---

## Ordre suggéré

```
1. DT-001 — Preflight template literals   (XS, P1, aucune dépendance)
2. DT-003 — getRuntimeState() messages    (XS, P2, aucune dépendance)
3. DT-002 — source_module/privacy_level   (S,  P2, débloque AM-002 et FF-003)
4. AM-003 — Consentement privacy appels   (S,  P2, indépendant)
5. AM-001 — Assets audio                  (M,  P2, après audit SW/cache)
6. AM-002 — Guardian UI                   (M,  P2, après DT-002)
7. FF-*   — Fonctionnalités futures       (selon priorité produit)
```
