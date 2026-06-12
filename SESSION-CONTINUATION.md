# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour tout assistant IA.
Lire ce fichier en entier avant toute action.

## ÉTAT PRODUCTION — 2026-06-10

```text
Dépôt                 : caisse43700-lgtm/Projet-immat-Connect
Branche production     : main — servie par GitHub Pages
URL terrain            : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Tests terrain          : deux iPhone/Safari, BZ-652-LL ↔ BE-521-MM
```

---

## JOURNAL DES ACTIONS — SESSION 2026-06-10

### PR #285 — feat: appels vocaux Agora RTC (mergée main)

**Pourquoi :** WebRTC natif échoue sur iOS Safari — pas de popup micro, coupure après 5-10s.
Agora RTC = fiable iOS/Android/Desktop. 10 000 min/mois gratuites (~166h).

**Fichiers créés :**

| Fichier | Rôle |
|---|---|
| `core/agora-call-engine.js` | Moteur Agora — rejoint canal sur CALL_ACCEPTED, mute/raccrocher |
| `supabase/functions/get-agora-token/index.ts` | Edge Function — génère token RTC signé |

**Fichiers modifiés :**

| Fichier | Changement |
|---|---|
| `core/call-screen.js` | Mode accepted : boutons Muet + Raccrocher, requestId conservé, auto-hide désactivé |
| `index.html` | Charge AgoraRTC_N-4.20.0.js (CDN) + agora-call-engine.js |
| `service-worker.js` | v12 — SDK Agora en cache CDN, download.agora.io dans CDN_HOSTS |

---

### PR #286 — feat: diagnostics Agora (mergée main)

Audit post-intégration — 3 fichiers de diagnostic mis à jour :

| Fichier | Ajout |
|---|---|
| `core/calls-runtime-diagnostics.js` | `agoraRuntime()` → hasAgoraRTC, isJoined, isMuted, currentChannel |
| `core/mobile-autotest.js` | `agoraAutotest()` + flags AgoraCallEngine/AgoraRTC dans modules() |
| `core/guardian-summary-engine.js` | 8ème voyant "agora" (computeAgora) — critique si SDK absent |

---

### Déploiement Supabase (fait manuellement par l'utilisateur)

| Élément | Statut |
|---|---|
| Edge Function `get-agora-token` | ✅ Déployée via Supabase Editor (version standalone sans _shared/cors.ts) |
| Secret `AGORA_APP_CERTIFICATE` | ✅ Configuré — Primary Certificate copié depuis console.agora.io |

---

## ÉTAT AGORA

```text
App ID (public)     : 4771f029e9c6446e872a598870bb74f3
App Certificate     : dans secrets Supabase → AGORA_APP_CERTIFICATE (jamais dans le code)
Projet Agora        : Default Project — console.agora.io
Compte Agora        : connecté via GitHub OAuth
Quota gratuit       : 10 000 min/mois RTC — 0% utilisé au 2026-06-10
Edge Function URL   : https://vemgdkkbldgyvaisudkd.supabase.co/functions/v1/get-agora-token
```

---

## COMMENT FONCTIONNENT LES APPELS VOCAUX

```text
A appelle B
  → calls.js émet CALL_INITIATED → CallScreen.showOutgoing()

B accepte
  → calls.js émet CALL_ACCEPTED { requestId, plate, _src } sur les deux téléphones

AgoraCallEngine (abonné ImmatBus, s'exécute sur les deux téléphones) :
  → reçoit CALL_ACCEPTED
  → POST get-agora-token { channelName: requestId, uid: random(1-999999) }
  → Edge Function vérifie JWT Bearer, génère token signé (AGORA_APP_CERTIFICATE)
  → client.join(APP_ID, channelName, token, uid)
  → createMicrophoneAudioTrack() → publish()
  → subscribe remote user → audioTrack.play()

CallScreen :
  → affiche "📞 Appel en cours"
  → boutons : Muet | Raccrocher | 💬 Message | Fermer
  → Raccrocher → AgoraCallEngine.leaveCall() + hide()
  → Muet → AgoraCallEngine.toggleMute()

Fin d'appel (refus/annulation/manqué) :
  → ImmatBus émet CALL_REFUSED / CALL_CANCELLED / CALL_MISSED
  → AgoraCallEngine.leaveCall() automatique
```

---

### Mergé sur main 2026-06-10 (PR #289 + merge direct)

5 correctifs appels mergés sur main :

| Correctif | Fichier | Détail |
|---|---|---|
| Coupure appel après ~20s | `calls.js` | Timer `_onMissed` stocké dans `_missedTimers`, annulé dans `acceptCall()`/`refuseCall()` |
| Raccrochage non synchronisé | `core/agora-call-engine.js` | Handler `user-left` Agora → émet `CALL_ENDED` |
| Micro iOS bloqué | `calls.js` + `core/call-screen.js` | `getUserMedia({audio:true})` dans le geste utilisateur |
| Boutons trop gros | `index.html` + `core/call-screen.js` | CSS `.cs-btn` + grille 2×2 `.cs-actions-grid` |
| Diagnostic moteur vocal | `core/agora-call-engine.js` | `getRuntimeState()` |

---

## SONNERIE TÉLÉPHONE RÉELLE — audio-manager v3 (2026-06-10)

Fix : WAV en mémoire (Blob URL), bitonalité 440+480 Hz, cadence 1.5s ON / 3.5s OFF, loopée.
`unlockFromUserGesture()` joue tous les éléments en muet au premier tap — déblocage iOS.

---

## ÉTAT PRODUCTION — 2026-06-11 ✅ APPELS VOCAUX FONCTIONNELS

```text
Validé terrain : BZ-652-LL ↔ BE-521-MM — audio bidirectionnel confirmé
```

### Correctifs session 2026-06-11 (PR #292 → #297, tous mergés sur main)

| Fix | Cause | PR |
|---|---|---|
| Token Agora null | Edge Function jamais déployée en CI | #294 |
| HTTP 401 | JWT verification activée par défaut — désactivée Dashboard | manuel |
| Token null → fallback natif | Web Crypto native | #293 |
| Guard double-join | `joinCall()` deux fois → `INVALID_OPERATION` | #293 |
| Audio unidirectionnel | `user-published` enregistré APRÈS `join()` | #296 |
| Race condition preMicTrack | `__preMicTrack` pas résolu → fallback iOS échoue | #295 |
| `[object Object]` diagnostic | `lastCallEvents` via `String(array)` | #297 |

---

## ÉTAT — 2026-06-12 — RÉPARATION COMPLÈTE calls.js v16 EN PRODUCTION

### Versions en production

```text
calls.js v16 — commit 7581e90 sur main (via MCP GitHub API)
SW : immatconnect-pro-v21 actif — réseau-first, sert toujours le dernier calls.js
```

### Audit complet 2026-06-12 — 4 bugs confirmés, 4 fixes appliqués

#### FIX #1 — `cancelCallRequest` : `_missedTimers.delete(requestId)` manquant

Toutes les autres fonctions (acceptCall, refuseCall, postgres_changes UPDATE, poll detect,
broadcast CANCEL) appelaient `_missedTimers.delete()`. `cancelCallRequest` ne le faisait pas.
Nettoyage défensif ajouté après `_pendingCallPlate = null`.

#### FIX #2 — Double `showOutgoing()` → double tonalité + double render

**Cause :** `requestCall()` appelait `_showSentBanner()` (→ `showOutgoing` direct) PUIS émettait
`CALL_INITIATED` (→ `showOutgoing` via bus). Résultat : overlay rendu deux fois, timer 30s remis à zéro.

**Fix :** ordre inversé dans `requestCall` (CALL_INITIATED en premier), déduplication dans
`_showSentBanner` via `CallScreen.getState().requestId`.

```js
// requestCall — nouvel ordre :
_emitCallEvent('CALL_INITIATED', {...});   // bus → showOutgoing + audio (1er)
_showSentBanner(receiverPlate, data.id);  // 31s timer + dedup check (2ème)

// _showSentBanner — déduplication :
const csState = window.CallScreen.getState();
if (csState.mode === 'outgoing' && csState.requestId === requestId) return;
```

Recovery (`_recoverPendingRequest` → `_showSentBanner`) non affecté : mode ≠ 'outgoing' → direct `showOutgoing`.

#### FIX #3 — Overlay "Appel en cours" côté A affiche `--` après accept de B

**Cause :** `outgoingUpdateHandler` émettait `CALL_ACCEPTED` avec `r.receiver_plate` brut,
qui peut être `null` en DB.

**Fix :**
```js
const acceptedPlate = r.receiver_plate || _pendingCallPlate || null;
_emitCallEvent('CALL_ACCEPTED', {'with': acceptedPlate, plate: acceptedPlate, ...});
```

#### FIX #4 — Guards v15 maintenus (overlay sortant affiche `--` en recovery)

`_recoverPendingRequest` : `if (!receiverPlate) return` avant d'appeler `_showSentBanner`.
`_showSentBanner` : `effectivePlate = plate || _pendingCallPlate || null`.

### PROCHAINE ACTION — TEST TERRAIN v16

Tester sur les deux iPhones (BZ-652-LL ↔ BE-521-MM) :
1. A appelle B → overlay sortant affiche BE-521-MM (plus de `--`) ← **BUG SIGNALÉ, À CONFIRMER**
2. B accepte → "Appel en cours" côté A affiche BE-521-MM (plus de `--`) ← **À CONFIRMER**
3. A annule → B ferme dans les 1.5s (poll ou broadcast) ← **À CONFIRMER**
4. Une seule tonalité d'appel côté A (plus de double bip) ← **À CONFIRMER**

---

## TÂCHES SUIVANTES

### P1 — Plaque visible des deux côtés ✅ CORRIGÉ v16

### P2 — Haut-parleur / écouteur

- Par défaut : route écouteur (privé)
- Bouton Haut-parleur ON/OFF séparé du Muet
- Exposer dans diagnostics : `speakerSupported`, `speakerEnabled`, `audioRoute`, `muteState`

### P3 — Dashboard / Diagnostics

Ajouter un bloc "Call State Integrity" :
```
requestId actif, CallScreen mode/plate/requestId, pendingCallId,
signalRequestId, signalChannel présent, missedTimers, UI entrante/sortante visible,
derniers événements CALL_*
```

---

## SUPABASE

```text
URL        : https://vemgdkkbldgyvaisudkd.supabase.co
Anon key   : sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ
Edge Functions déployées :
  - get-turn-credentials  (obsolète)
  - get-agora-token       (tokens Agora RTC)
  - immat-brain-dialog    (IA dialogue)
  - create-call-request   (créer demande d'appel)
  - respond-call-request  (répondre à une demande)
```

---

## INVARIANTS DE SÉCURITÉ

```text
AGORA_APP_CERTIFICATE → jamais dans le code, toujours secrets Supabase
App ID Agora 4771f029e9c6446e872a598870bb74f3 → public par conception Agora, OK dans le client
ANTHROPIC_API_KEY → jamais dans le code
owner_plate → immutable (INV-006)
pas de DELETE sans consentement (INV-COM-009)
payload anonymisé, pas de contenu message dans Edge Functions (INV-COM-010/015)
main = production GitHub Pages
pas d'ouverture automatique de messages sur accepted
```
