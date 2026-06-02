# Amélioration Navigation Fonctionnalités

> SESSION 17 — Ange ouvert à tous + Vocal + Knowledge files
> Commit : `091b2f1` — branche `claude/immatconnect-pro-app-dEKGR`

---

## Ce qui a été fait

### 1. Ange ouvert à tous les conducteurs

**Fichier** : `supabase/functions/immat-brain-dialog/index.ts`

Avant : tout utilisateur non-gardien recevait une erreur 403 `forbidden_role`.  
Après : tous les utilisateurs authentifiés peuvent poser une question à l'Ange.

Le rôle détermine la profondeur de la réponse :

| Rôle | Depth | Contexte |
|---|---|---|
| `gardien` | 3 | Technique complet : organes, invariants, inhibitions, code |
| `protecteur` | 2 | Usage + comportement (futur) |
| `observer` / conducteur | 1 | Usage simple, langage clair |

`requiresGuardianValidation` est maintenant `false` pour les conducteurs (réponse directe) et `true` pour les gardiens (validation humaine requise).

---

### 2. Knowledge files — base de connaissance Ange

**Fichiers créés** :
- `supabase/functions/_shared/knowledge-conducteur.ts`
- `supabase/functions/_shared/knowledge-gardien.ts`

Ces fichiers enrichissent les system prompts générés par `nsToPrompt()` :

**knowledge-conducteur.ts** couvre :
- Navigation principale (carte, GPS, signalements, messages, activité, profil)
- Actions pas à pas (signaler, contacter, SOS, invisible)
- Durées des alertes
- Boutons rapides messages
- Problèmes fréquents et solutions

**knowledge-gardien.ts** couvre :
- Fichiers clés et leurs rôles
- Organes + points d'entrée code (fichier:ligne)
- Inhibitions actives (S._authRunning, S._reporting, S._recalcLock)
- Invariants critiques
- Profil technique du snapshot Ange
- Pont Claude : comment formuler une demande de modification
- Tensions architecturales connues
- Protocole modification sûre (5 règles)

---

### 3. Vocal Ange — bouton 🎙️

**Fichier** : `index.html`

Ajout d'un bouton microphone à côté de la textarea d'AngeDialog :
- Clic → SpeechRecognition (fr-FR) → transcription → remplit la textarea
- Retour visuel : 🎤 orange pendant l'écoute → 🎙️ après
- Fallback toast "Micro indisponible" si SpeechRecognition absent (navigateurs non supportés)

---

### 4. Message d'accueil Ange

**Fichier** : `index.html`

À la première ouverture (panel vide), un message d'accueil apparaît :
> "Pose-moi une question sur l'application, la navigation, ou un problème rencontré."

Il disparaît dès que l'Ange affiche une vraie réponse (flag `data-welcome` supprimé dans `renderResponse`).

---

### 5. Snapshot Ange enrichi

**Fichier** : `index.html` — `AngeDialog.send()` ligne ~1915

Avant : `{ health, summary, violations, panel }`  
Après : `{ health, summary, violations, panel, speed, driving, hasRoute, nearby, alerts }`

| Champ | Source | Description |
|---|---|---|
| `speed` | `S.lastSpeed` | Vitesse actuelle en km/h |
| `driving` | `S.driveMode` | Navigation GPS active |
| `hasRoute` | `S.routeDest` | Destination définie |
| `nearby` | `S.nearby.length` | Conducteurs proches |
| `alerts` | `S.alerts` filtrés | Alertes actives (non gone/resolved) |

---

## Architecture finale Ange

```
Utilisateur pose une question
       ↓
AngeDialog.send() [index.html ~1908]
  → snapshot enrichi (7 champs)
  → sb.functions.invoke('immat-brain-dialog')
       ↓
immat-brain-dialog [Edge Function]
  → Auth check (401 si non connecté)
  → get_my_role() → depth 1/2/3
  → staticSystem = SYSTEM_GARDIEN ou SYSTEM_CONDUCTEUR
  → SYSTEM = nsToPrompt(depth) + knowledge file
  → Anthropic API [claude-sonnet-4-6]
  → validateOutput(isGardien)
  → { ok, juste, question, requiresGuardianValidation, ... }
       ↓
AngeDialog.renderResponse(data) [index.html ~1868]
  → affiche réponse + vigilance + options + question
```

---

## Ce qui reste à faire (SESSION 18+)

| Priorité | Tâche | Effort |
|---|---|---|
| P1 | Throttling appels Ange (rate limit par user, ex. 10/heure) | Faible |
| P2 | Historique conversation Ange (localStorage, 3 derniers échanges) | Faible |
| P3 | `speak()` sur la réponse Ange (TTS après réponse reçue) | Faible |
| P4 | Onboarding premier arrivant (message d'accueil carte) | Moyen |
| P5 | Score fiabilité visible sur les cards d'alertes | Moyen |
| P6 | Dashboard gardien dédié (pas juste 2 boutons debug) | Élevé |

---

## Historique SESSION 17

- `knowledge-conducteur.ts` créé — guide usage conducteur
- `knowledge-gardien.ts` créé — guide technique gardien
- `immat-brain-dialog/index.ts` : 403 supprimé, routing rôle → depth, validateOutput role-based
- `index.html` : bouton 🎙️ + startVoice() + message accueil + snapshot enrichi
- Commit `091b2f1` pushé sur `claude/immatconnect-pro-app-dEKGR`
