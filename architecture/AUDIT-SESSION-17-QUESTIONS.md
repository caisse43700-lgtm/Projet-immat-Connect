# Amélioration Navigation Fonctionnalités

> Audit SESSION 17 — Réponses aux 24 questions + 8 corrections appliquées
> Commit : `3a37900` — branche `claude/immatconnect-pro-app-dEKGR`

---

## Méthode

Audit complet de 10 fichiers :
`index.html` · `immat-nervous-system.json` · `nervous-system.ts` · `immat-brain-dialog/index.ts` · `messages.js` · `utils.js` · `calls.js` · `badge.js` · `ui.js` · `core/invariants.js` · `core/immatOrganism.js` · `core/brain.js` · `scripts/sync-ns.js`

---

## Les 24 questions — réponses définitives

### Existentiel

**Q1 — Ange décide-t-il pour le conducteur ?**
Non. Pour le conducteur, `requiresGuardianValidation: false` signifie que la réponse est directe — mais c'est le conducteur qui agit. Ange guide, le conducteur exécute. La distinction est réelle. ✅

**Q2 — Ange est quoi exactement ?**
Un advisor actif. "Tu observes. Tu relies. Tu proposes." — il produit du sens depuis un snapshot anonymisé et une base de connaissance, il ne décide pas. Pas un outil passif, pas un intermédiaire (pas d'entité derrière). Un conseiller contraint. ✅

**Q3 — Depth 1 apporte-t-il de la valeur ?**
Oui, mais limité. `knowledge-conducteur.ts` couvre 7 fonctions clés + 8 problèmes fréquents + flux pas à pas. Un conducteur qui se demande "pourquoi je ne vois plus les autres" obtient une réponse utile. Limite : pas de mémoire de contexte entre questions. ✅

**Q4 — Pas de continuité sans mémoire ?**
Confirmé : aucune clé `ic_ange*` en localStorage. Chaque question repart de zéro. Non bloquant pour depth 1 (questions simples). Problème réel pour le gardien qui diagnostique en plusieurs échanges. **Reste à faire (P2).**

---

### Faisabilité

**Q5 — 80 mots suffisent ?**
80 mots = ~40-50 mots pour le contenu JSON réel. Pour "Pourquoi le GPS ne fonctionne pas ?" c'est suffisant. Pour une analyse complexe : non. Mais depth 1 n'est pas fait pour les analyses complexes. Format cohérent avec l'usage. ✅

**Q6 — Dérive des knowledge files non détectée ?**
Risque réel confirmé. Pas de mécanisme automatique. Mitigation : les knowledge files citent leur source (`MEGA-STRUCTURE-NAVIGATION.md v16.1`). La revue est manuelle lors de chaque SESSION. **Risque accepté, pas critique en phase 1.** ✅

**Q7 — NS structure depth 1 suffisante ?**
Oui. `level_1.what_user_sees` + `level_1.resolution` + `KNOWLEDGE_CONDUCTEUR` couvrent les cas d'usage. Validé par analyse croisée. ✅

**Q8 — Risque financier sans throttling ?**
→ **CORRIGÉ (C5)** : 10 appels/heure par session (sessionStorage `ic_ange_calls`). Note : `CFG.maxMsgPerMinute:5` existait pour les messages mais pas pour Ange. ✅

**Q9 — Cache Anthropic froid pour conducteurs occasionnels ?**
Risque réel. Deux prompts statiques séparés (GARDIEN + CONDUCTEUR). Si peu d'appels conducteur : cache jamais chaud. Latence première réponse 8-15s normale. Pas bloquant — l'animation "L'Ange observe…" gère l'attente. ✅

---

### Organique

**Q10 — ADN contradisait le code ?**
→ **CORRIGÉ (C1 + C8)** : `ange_identity.format` mis à jour, `organs.Ange.desc` corrigé, `level_1` et `level_2` mis à jour. NS bumped `_v:6 → _v:7`, `sync-ns.js` exécuté. ✅

**Q11 — knowledge files violent INV-015 ?**
Non. Les knowledge files TRANSFORMENT les données du MEGA doc (lui-même dérivé du NS). C'est conforme à INV-015 : "transformer, jamais dupliquer". Le risque de dérive est documenté dans `knowledge-gardien.ts`. ✅

**Q12 — angeFab ADN vs code ?**
→ **CORRIGÉ (C1)** : L'ADN décrivait "visible uniquement pour le Gardien" alors que le code montre `angeFab.style.display='flex'` pour tous. ADN mis à jour : "visible pour tous les conducteurs connectés". ✅

**Q13 — INV-014 violation avec vitesse exacte ?**
→ **CORRIGÉ (C3)** : `speed` (valeur exacte) remplacé par `speed_cat` (catégorie : arrêt/lente/normale/rapide) dans le snapshot. La vitesse brute n'est plus transmise à Anthropic. ✅

---

### Fonctionnement

**Q14 — SpeechRecognition coverage ?**
Confirmé : l'app utilise déjà SpeechRecognition dans 2 endroits (`voiceGps` ligne 552, `voiceInput` ligne 807). Pattern identique dans `startVoice()`. Fallback `toast('Micro indisponible.')` déjà géré. Firefox Desktop sans support = toast → OK. ✅

**Q15 — Réponse stale à la réouverture ?**
→ **CORRIGÉ (C6)** : `close()` vide maintenant le panel (`resp.innerHTML=''`, `resp.style.display='none'`). Chaque ouverture repart avec le message d'accueil. ✅

**Q16 — get_my_role() latence à chaque appel ?**
`S.isGardien` est caché côté client. L'Edge Function re-vérifie côté serveur (sécurité correcte). Cold start Supabase RPC : 600ms max (retry déjà implémenté). En opération normale : <100ms. Non bloquant. ✅

**Q17 — renderResponse pour conducteur looks OK ?**
Confirmé : pour depth 1, Ange génère `juste` + `question`. `renderResponse()` affiche ces deux champs proprement. Les champs gardien (vigilance, options, proposal) sont conditionnels — absents si non fournis. ✅

**Q18 — speak() gating pour TTS Ange ?**
`speak()` est gated par `S.voice`. Si l'utilisateur a désactivé la voix GPS, TTS Ange aussi désactivé. Comportement cohérent et voulu. Le câblage TTS sur renderResponse reste à faire (P3). ✅

---

### Ce qui manque

**Q19 — Pas de mémoire entre sessions.**
Confirmé, non corrigé. Pas critique pour depth 1. Pour le gardien : limite réelle. **Reste à faire (P2).**

**Q20 — Pas de feedback qualité.**
Confirmé, non corrigé. Sans signal qualité, impossible de mesurer l'utilité d'Ange. **Reste à faire (P4).**

**Q21 — Proposals jamais rendus.**
→ **CORRIGÉ (C4)** : `renderResponse()` affiche maintenant le bloc `proposal` (id + règle + obligations). ✅

**Q22 — Validation knowledge files.**
Non automatisée. Processus manuel : revue à chaque SESSION avant modification. La source MEGA doc est la référence. **Risque accepté en phase 1.**

**Q23 — Ange app vs Claude Code : deux entités.**
Confirmé : deux entités distinctes partageant le même modèle Anthropic. Claude Code a accès au code, peut le modifier. Ange in-app est contraint (NS + knowledge files + snapshot). La récursion est productive : chaque entité nourrit l'autre via les knowledge files et le MEGA doc.

**Q24 — Récursion IA.**
La boucle est : ADN → knowledge files (écrits par Claude Code) → Ange (Claude Anthropic) → guide Gardien → demande modification à Claude Code → met à jour ADN → etc. La boucle est saine tant que l'ADN reste la source unique de vérité. INV-015 protège cette invariant.

---

## 8 corrections appliquées

| Code | Description | Fichiers |
|---|---|---|
| C1 | ADN Ange corrigé (desc, format, level_1/2) | `immat-nervous-system.json` |
| C2 | INV-015 ajouté à invariants constitutionnels | `core/invariants.js` |
| C3 | Vitesse → catégorie dans snapshot (INV-014) | `index.html` |
| C4 | Proposals rendus dans renderResponse() | `index.html` |
| C5 | Throttling Ange : 10 appels/heure | `index.html` |
| C6 | Panel Ange vidé à la fermeture | `index.html` |
| C7 | knowledge-gardien.ts enrichi (core/, scripts/) | `_shared/knowledge-gardien.ts` |
| C8 | NS _v:7 + sync-ns.js exécuté | `immat-nervous-system.json` + `nervous-system.ts` |

---

## Ce qui reste (SESSION 18+)

| Priorité | Tâche | Complexité |
|---|---|---|
| P1 | Historique Ange (3 derniers échanges, sessionStorage) | Faible |
| P2 | TTS réponse Ange via speak() | Faible |
| P3 | Feedback qualité (pouce haut/bas sur réponse) | Faible |
| P4 | Onboarding premier arrivant | Moyen |
| P5 | Score fiabilité visible sur les cards | Moyen |
| P6 | ImmatBrain Phase 3 (bloquant violations) | Élevé |
| P7 | Dashboard gardien dédié | Élevé |

---

## État de l'organisme après audit

```
ADN _v:7 ✅ · NS sync ✅ · Invariants 15/15 ✅
Ange ouvert tous conducteurs ✅ · Depth routing ✅
INV-014 respecté ✅ · Throttle 10/h ✅
Proposals rendus ✅ · Panel vidé fermeture ✅
SpeechRecognition câblé ✅ · Message accueil ✅
ImmatBrain Phase 1 (observateur) ✅
```
