# AGENTS.md — Point d'entrée pour tout agent IA (ChatGPT, Codex, etc.)

> **Lire ce fichier intégralement avant toute action.**
> Ensuite lire `SESSION-CONTINUATION.md` pour l'état détaillé des incidents.

---

## C'est quoi ce projet ?

**ImmatConnect Pro** — PWA mobile permettant aux conducteurs de se contacter via leur plaque d'immatriculation.
Exemple : A voit la voiture B mal garée → scanne la plaque → envoie un message ou demande un appel.

**Dépôt GitHub :** `caisse43700-lgtm/Projet-immat-Connect`
**Branche principale :** `main` — CI doit rester vert

---

## Stack technique

| Élément | Détail |
|---|---|
| Frontend | HTML/CSS/JS vanilla — PWA (Service Worker) |
| Backend | Supabase (PostgreSQL + Realtime + Auth + Edge Functions) |
| Audio | Web Audio API (oscillateurs synthétisés — pas de fichiers audio) |
| Tests | `node tests.js` — doit afficher `162 ✅ pass | 0 ❌ fail` |

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `calls.js` | Logique complète des appels entrants/sortants |
| `core/audio-manager.js` | Sonneries synthétisées Web Audio API |
| `core/bus.js` | Bus d'événements interne (ImmatBus) |
| `core/call-screen.js` | Affichage overlay appel entrant/sortant |
| `core/call-notification-runtime.js` | Vibration, notification navigateur, audio |
| `core/interaction-engine.js` | Historique et analytics des interactions |
| `index.html` | Page principale — inclut tous les scripts |
| `SESSION-CONTINUATION.md` | État détaillé des incidents et correctifs |

---

## État actuel (2026-06-09)

```
BUG A (23505 second appel)  : RÉSOLU — merge PR #269 — commit 5859393
BUG B (popup non reçue)     : RÉSOLU — call_requests ajoutée à supabase_realtime + polling recovery
C1 (Conducteur introuvable) : CORRECTIF DÉPLOYÉ — en attente de test terrain
C2 (Sonnerie iOS)           : CORRECTIF DÉPLOYÉ — Web Audio API synthesis (commit f664e78)
C3 (Son après décrochage)   : HORS SCOPE — Phase 1 = demande de contact, pas VoIP
```

---

## Incidents actifs — tests terrain requis

### C1 — Plaque sans tirets
- **Symptôme :** BZ-652-LL appelle BE-521-MM → "Conducteur introuvable"
- **Cause :** `nPlate()` retire les tirets → `BE521MM` ≠ `BE-521-MM` en DB
- **Fix :** `contactByCall()` dans `calls.js` — essaie d'abord sans tirets, puis avec tirets reconstruits
- **Test :** BZ-652-LL recharge la page → appelle BE-521-MM → pas de "Conducteur introuvable"

### C2 — Sonnerie iOS
- **Symptôme :** aucune sonnerie à la réception d'un appel (éléments `<audio>` sans `src`)
- **Cause :** `_play()` retourne false si `!el.src` ; AudioContext suspendu sans geste utilisateur
- **Fix :** `core/audio-manager.js` — oscillateurs Web Audio API + `ctx.resume()` sur premier geste
- **Test :** recevoir un appel sur iOS Safari → la sonnerie doit jouer

---

## Règles absolues (INVARIANTS)

```
ANTHROPIC_API_KEY  → jamais dans le code
owner_plate        → immutable (INV-006) — ne jamais modifier la plaque d'un profil
INV-COM-009        → pas de DELETE sans consentement explicite
INV-COM-010/015    → payload anonymisé dans Edge Functions — jamais le contenu d'un message
InteractionEngine  → tous appels dans try/catch, non-bloquants
Corrections        → ciblées uniquement — pas de réécriture globale
CI                 → vérifier green (node tests.js) avant chaque commit
SESSION-CONTINUATION.md → toujours mis à jour dans le même commit que le code
```

---

## Workflow standard

```bash
# Vérifier les tests avant tout commit
node tests.js
# Résultat attendu : 162 ✅ pass | 0 ❌ fail

# Lancer le diagnostic runtime (dans la console navigateur)
CallsRuntime.getRuntimeState()
AudioManager.getRuntimeState()
```

---

## Prochaine action

1. **Tester C1** — BZ-652-LL appelle BE-521-MM après rechargement → pas de "Conducteur introuvable"
2. **Tester C2** — recevoir un appel sur iOS Safari → sonnerie synthétisée joue
3. **Si échec** → envoyer le message d'erreur exact + résultat `AudioManager.getRuntimeState()`

---

## Pour l'état détaillé

Lire `SESSION-CONTINUATION.md` — contient :
- Historique complet de tous les correctifs avec cause racine et preuves
- SQL exécuté en base
- Commits associés
- Archives des incidents résolus
