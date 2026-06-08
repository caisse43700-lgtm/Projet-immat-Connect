# SESSION CONTINUATION — ImmatConnect Pro

Ce fichier est le point d'entrée pour toute IA qui reprend ce projet.

> **RÈGLE OBLIGATOIRE** : Ce fichier doit être mis à jour dans **chaque commit de phase**.
> Il doit toujours refléter l'état exact du commit dans lequel il se trouve.
> Mettre à jour : SITUATION EXACTE (commit + CI) + tableau des phases + PROCHAINES PHASES.
> L'ajouter dans chaque `git add` avec le code de la phase.

**Dernière mise à jour** : 2026-06-08 — CI green confirmé, branche prête pour merge

---

## SITUATION EXACTE

```
Dépôt    : caisse43700-lgtm/Projet-immat-Connect
Branche  : feature-calls-runtime-diagnostics
Commit   : 69b5135  (CI green confirmé — dernier commit)
CI       : GREEN TOTAL — tous commits vérifiés
           e154e43 (P8 Ange)      → success ✓
           7ba25f3 (P9 Guardian)  → success ✓
           792f31f (P10 Autotest) → success ✓
           511c24c (docs)         → success ✓
           69b5135 (CI confirm)   → success ✓
```

## PROCHAINE ACTION RECOMMANDÉE

```
La branche est PRÊTE POUR MERGE.
Roadmap phases 0–10 : toutes complètes.
CI : green sur tous les commits.
Frictions navigation P1 (FRI-001/002/003, FLOW-005) : toutes déjà résolues dans le code.

→ Créer une pull request feature-calls-runtime-diagnostics → main (ou master)
  si l'utilisateur le demande explicitement.

→ Sinon, traiter les tâches résiduelles basse priorité (voir tableau plus bas).
```

---

## PROTOCOLE OBLIGATOIRE AVANT TOUT CODE

```
1. Inspecter CI sur la branche feature-calls-runtime-diagnostics
2. Si CI unknown ou pending → attendre ou déclencher
3. Si CI red → télécharger artifact obd-e2e-evidence
                lire diagnostic-artifacts/playwright-output.log
                corriger UNIQUEMENT la première vraie erreur
4. Si CI green → roadmap complète. Traiter les tâches résiduelles si besoin (voir tableau "Tâches résiduelles connues")
5. Toujours mettre à jour docs/SESSION-LOG.md après chaque correction
```

Outil CI : `mcp__github__actions_list` avec `method: list_workflow_runs` + `branch: feature-calls-runtime-diagnostics`.
Le résultat est trop grand pour être lu directement — extraire avec python3 + regex.

---

## PHASES COMPLÉTÉES — avec commits

| Phase (session) | Phase (roadmap) | Contenu | Commit | CI |
|---|---|---|---|---|
| 0 | 0 — CI recovery | IIFE guardian-loop (Illegal return) | `4950cb7` | green |
| 1 | 1 — Audit calls.js | calls.js audit + getRuntimeState() + CALL_SOURCE_OF_TRUTH.md | `10c775c` | green |
| 2 | 5+6 — CallScreen | CallScreen squelette fermé par défaut | `a2cad44` | green |
| 2b | — | Délégation CallManager → CallScreen (Phase 2) | `c810cea` | green |
| 3 | 3 — Registry | InteractionEngine câblage calls.js + registryRuntime | `f2e7b3d` | green |
| 4 | 4 — Messages | sendToPlate(opts) + actQuickReply context | `c27c29d` | green |
| 5 | — | roadReport/assist/vehicleAlertQuick → InteractionEngine | `5b26eab` | green |
| 7 | 7 — Audio | AudioManager + CallNotificationRuntime squelettes | `c40adcf` | green |
| 8 | 8 — Ange | Snapshot enrichi + NAVIGATE_ACTIVITY/MAP + ANGE_SUGGESTION ledger | `e154e43` | green ✓ |
| 9 | 9 — Guardian | getRuntimeState() + _guardianBusSubscribe + guardianRuntime OBD + autotest | `7ba25f3` | green ✓ |
| 10 | 10 — Autotest | 6 sections autotest : messages/calls/help/reports/registry/ange+guardian | `792f31f` | green ✓ |

---

## PROCHAINES PHASES

### Roadmap COMPLÈTE — toutes phases implémentées

Phases 0–10 sont terminées. Le projet satisfait les critères d'acceptation globaux du MASTER_IMPLEMENTATION_ROADMAP :
- CI green requis avant merge
- OBD stable (read-only, modulaire)
- Pas de return illégal / erreurs de parse
- Pas de ghost overlays (autotest)
- Pas de messagerie parallèle (autotest)
- Source de vérité appels documentée
- Messages avec contexte
- Appels visibles sans audio
- Audio différencié
- Privacy avant acceptation (autotest)
- Ange route correctement
- Guardian basé sur evidence
- Autotests couvrent les flux critiques

### Tâches résiduelles connues (non bloquantes)

| Tâche | Priorité | Note |
|---|---|---|
| `DIRECT_MESSAGE_RECEIVED` → InteractionEngine | Basse | Realtime subscription dans messages.js |
| Assets audio (src) | Basse | Bloqué par stratégie Service Worker/cache |
| `App.blockPlate()` direct → InteractionEngine | Basse | Seuls blocages Ange-triggered sont loggés |
| `source_module`/`privacy_level` dans IE events | Basse | Champ structurel, non bloquant |

---

### Phase 10 — Mobile autotest expansion (COMPLÉTÉE)

**Objectif** : Valider l'organisme complet interaction via `core/mobile-autotest.js`.

**Catégories de tests à ajouter** :
- Messages : send/receive/reload, local delete, context badges
- Calls : outgoing/incoming pending, accept/refuse/cancel, expired/missed, quick reply contextuel, audio blocked fallback, no ghost overlay
- Help : create, accept, resolve, message link, map link, resolved/expired terminal
- Reports : create, activity entry, message link, map link, treated/expired
- Registry/OBD : ledger event created, diagnostics read-only, reconstruction safe
- Ange/Guardian : Ange routes to owner, Guardian cites evidence, no auto unsafe action

**Fichier concerné** : `core/mobile-autotest.js`

---

### Phase 9 — Guardian integration (COMPLÉTÉE)

**Objectif** : Guardian utilise les evidence du ledger pour recommander des actions sécurité/confiance.

**Lire d'abord** :
- `docs/INTERACTION_LEDGER_REGISTRY.md`
- `core/guardian-loop.js`

**Règles** :
- Guardian PEUT : recommander review/block/trust/abuse, citer evidence
- Guardian NE PEUT PAS : auto-appliquer sans validation, muter l'état d'appel, devenir UI messagerie
- Chaque recommandation doit citer un `ledger_event_id`

**Critères d'acceptation** :
- OBD voit le lifecycle des recommandations
- Validation utilisateur toujours requise
- Evidence citée pour chaque recommandation

**Fichiers concernés** :
- `core/guardian-loop.js` — déjà existant, à auditer + enrichir
- `core/calls-runtime-diagnostics.js` — ajouter guardianRuntime
- `core/mobile-autotest.js` — ajouter GuardianLoop checks

---

### Phase 10 — Mobile autotest expansion (roadmap)

**Objectif** : Valider l'organisme complet interaction.

**Catégories de tests à ajouter dans `core/mobile-autotest.js`** :
- Messages : send/receive/reload, local delete, context badges
- Calls : outgoing/incoming pending, accept/refuse/cancel, expired/missed, quick reply contextuel, audio blocked fallback, no ghost overlay
- Help : create, accept, resolve, message link, map link, resolved/expired terminal
- Reports : create, activity entry, message link, map link, treated/expired
- Registry/OBD : ledger event created, diagnostics read-only, reconstruction safe
- Ange/Guardian : Ange routes to owner, Guardian cites evidence, no auto unsafe action

**Fichier concerné** :
- `core/mobile-autotest.js`

---

## INVENTAIRE DES FICHIERS CRÉÉS CETTE SESSION

### Nouveaux fichiers core/

| Fichier | API publique | Rôle |
|---|---|---|
| `core/call-screen.js` | `CallScreen.showOutgoing/showIncoming/showMissed/showExpired/showAccepted/hide/getState` | Projection visuelle état appel. Observateur ImmatBus uniquement. |
| `core/audio-manager.js` | `AudioManager.init/unlockFromUserGesture/playMessageBeep/playIncomingRingtone/playOutgoingTone/stopCallAudio/stopAll/getRuntimeState` | Gestion sons. Pas d'assets audio pour l'instant (src vide). |
| `core/call-notification-runtime.js` | `CallNotificationRuntime.onIncomingPending/.../onMessageReceived/getRuntimeState` | Coordonne audio + vibration + notification navigateur. |
| `core/calls-runtime-diagnostics.js` | `ImmatCallsRuntimeDiagnostics.run()` | OBD lecture seule : état CallManager, CallScreen, AudioManager, InteractionEngine. |
| `core/mobile-autotest.js` | `ImmatMobileAutotest.run()` | Autotest DOM : modules, boutons, panels, signaler, ange, messages, calls. |
| `core/interaction-engine.js` | `InteractionEngine.create/updateStatus/getHistory/getAnalytics/getRuntimeState` | Ledger localStorage des événements interaction. |

### Fichiers modifiés (changements majeurs)

| Fichier | Changement clé |
|---|---|
| `calls.js` | `getRuntimeState()` + `InteractionEngine.create()` dans requestCall/acceptCall/refuseCall/cancelCallRequest/CALL_MISSED + délégation CallScreen |
| `messages.js` | `sendToPlate(plate, text, opts)` — opts optionnel, `InteractionEngine.create(MESSAGE)` avec context_type/context_id |
| `index.html` | CallScreen + AudioManager + CallNotificationRuntime chargés ; actQuickReply(plate,msg,contextType,contextId) ; boutons activité passent context ; roadReport/assist → InteractionEngine.create ; AngeDialog snapshot enrichi + NAVIGATE_ACTIVITY/MAP ; DOM audio IDs |
| `core/guardian-loop.js` | Wrappé en IIFE (fix Illegal return) |

### Docs créés/complétés

| Fichier | Statut |
|---|---|
| `docs/CALL_SOURCE_OF_TRUTH.md` | Audit complet (tous TODOs remplis) |
| `docs/INTERACTION_LEDGER_REGISTRY.md` | Audit Phase 3 ajouté (réponses open questions + état câblage) |
| `docs/SESSION-LOG.md` | Journal technique de toutes les corrections session |

---

## ARCHITECTURE — FLUX DONNÉES

```
ImmatBus (core/bus.js)
  ↓ emit
CallScreen      ← CALL_INITIATED/RECEIVED/ACCEPTED/REFUSED/CANCELLED/MISSED
AudioManager    ← (via CallNotificationRuntime)
CallNotificationRuntime ← CALL_*/MSG_RECEIVED

CallManager (calls.js)
  → InteractionEngine.create(CALL_REQUEST/ACCEPTED/REFUSED/CANCELLED/MISSED)
  → CallScreen (si chargé, sinon fallback legacy popup/banner)

messages.js
  → InteractionEngine.create(MESSAGE) avec context_type/context_id optionnel

index.html roadReport
  → InteractionEngine.create(VEHICLE_REPORT_CREATED)

index.html assist
  → InteractionEngine.create(HELP_REQUEST_CREATED)

AngeDialog.send()
  → snapshot enrichi avec call_mode + audio_blocked
  → InteractionEngine.create(ANGE_SUGGESTION)

AngeAction.execute()
  → route vers Messages / Calls / Signaler / Safety / Activity / Map
  → InteractionEngine.create(action type)
```

---

## INVARIANTS — NE JAMAIS VIOLER

```
ANTHROPIC_API_KEY = jamais dans le code — seulement dans Supabase secrets
owner_plate       = immutable (INV-006)
INV-COM-009       = pas de DELETE sans consentement explicite
INV-COM-010/015   = payload anonymisé — pas de contenu message dans Edge Function payloads
Production        = ne pas auto-corriger
DB/code           = ne pas modifier automatiquement sans validation
Gros patchs       = interdits — corrections ciblées uniquement
ImmatBus Phase 1  = observe/journalise uniquement, ne bloque rien
InteractionEngine = tous appels dans try/catch, non-bloquants
```

---

## CONTRAINTES TECHNIQUES

```
- Tous les fichiers core/ sont des IIFE : (function(w){ ... })(window);
- 'use strict'; en haut de chaque IIFE
- window.ModuleName = { ... }; à la fin de chaque IIFE
- Pas d'assets audio (src vide) tant que Service Worker/cache non audité
- Pas de Supabase write depuis les diagnostics
- getRuntimeState() = toujours lecture seule
- CI green requis avant chaque phase product
- Corrections par string replacement ciblé (Edit tool), pas de réécriture globale
```

---

## COMMENT INSPECTER LE CI

```python
# Après mcp__github__actions_list (résultat sauvegardé dans fichier)
import re
txt = open('/path/to/result.txt').read()
runs = re.findall(
  r'"id":\s*(\d+).*?"head_sha":\s*"([^"]+)".*?"status":\s*"([^"]+)".*?"conclusion":\s*("([^"]+)"|null).*?"created_at":\s*"([^"]+)"',
  txt
)
for r in runs[:5]: print(r)
```

Chercher `792f31f` dans head_sha — conclusion doit être `"success"`.

---

## DÉCISION MATRIX

| Situation | Action |
|---|---|
| CI inconnu | Ne pas coder. Inspecter CI. |
| CI green | Roadmap complète. Traiter tâches résiduelles ou préparer merge. |
| CI red | Télécharger obd-e2e-evidence → lire playwright-output.log → corriger première erreur uniquement |
| Blocker inconnu | Documenter dans docs/SESSION-LOG.md avec template BLOCAGE |
| Tentation de gros refactor | Stop. Correction ciblée uniquement. |
| Doute sur propriétaire d'un état | Consulter docs/INTERACTION_ORGANISM_MAP.md |
| Doute sur forme d'événement | Consulter docs/INTERACTION_LEDGER_REGISTRY.md |

---

## DOCS DE RÉFÉRENCE ARCHITECTURALE

```
docs/MASTER_IMPLEMENTATION_ROADMAP.md    → roadmap complet phases 0-10
docs/INTERACTION_ORGANISM_MAP.md         → qui possède quoi
docs/INTERACTION_LEDGER_REGISTRY.md      → forme événements + câblage
docs/CALL_SOURCE_OF_TRUTH.md             → états appel documentés
docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md → règles audio
docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md  → plan implémentation audio
docs/SESSION-LOG.md                      → journal technique de session
```

---

## TEMPLATE CORRECTION (à copier dans SESSION-LOG.md)

```text
## DATE — Phase X : description

### CAUSE
### CORRECTIF
### RISQUE
### STATUT CI
### PROCHAINE ACTION
```

## TEMPLATE BLOCAGE (à copier dans SESSION-LOG.md)

```text
BLOCAGE
Date:
Context:
Evidence:
Hypothesis tested:
Result:
Invalidated hypotheses:
Do not repeat:
Next piste:
Next action:
```
