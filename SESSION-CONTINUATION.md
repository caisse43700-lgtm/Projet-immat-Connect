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

### PR #288 — feat: Global Verification Center + correctif réception (en attente merge)

**Branche :** `global-verification-center`

**Pourquoi :** Deux changements critiques groupés :

1. **CORRECTIF RÉCEPTION (hotfix)** — Plus de réception signalée après PR #285.
   Cause : `AgoraRTC_N-4.20.0.js` (~600 KB CDN) chargé en synchrone AVANT
   `call-notification-runtime.js` — bloquait le chargement de ce script sur iOS mobile lent.
   Fix : `call-notification-runtime.js` déplacé avant le CDN Agora + `async` ajouté au CDN.

2. **Global Verification Center** — Audit 8 sections en lecture seule depuis Dashboard Gardien.
   Bouton "Global" (vert) dans le header → `window.GlobalVerificationCenter.run()`.

| Fichier | Changement |
|---|---|
| `index.html` | `call-notification-runtime.js` avant Agora CDN, CDN Agora `async` |
| `core/global-verification-center.js` | Nouveau — 8 sections read-only (app/dashboard/messages/calls/audio/webrtc/cache/supabase) |
| `core/guardian-dashboard-summary.js` | v1.6 — bouton Global + panel _globalCheckInlinePanel |
| `service-worker.js` | v13 — global-verification-center.js en cache statique |

---

### Mergé sur main 2026-06-10 (PR #289 + merge direct)

Tout ce qui précède est en production. En plus, 5 correctifs appels mergés :

| Correctif | Fichier | Détail |
|---|---|---|
| Coupure appel après ~20s | `calls.js` | Timer `_onMissed` (basé sur expires_at) stocké dans `_missedTimers`, annulé dans `acceptCall()`/`refuseCall()` — plus de CALL_MISSED sur appel accepté |
| Raccrochage non synchronisé | `core/agora-call-engine.js` | Handler `user-left` Agora → émet `CALL_ENDED` sur ImmatBus → `CallScreen.hide()` des deux côtés |
| Micro iOS bloqué | `calls.js` + `core/call-screen.js` | `getUserMedia({audio:true})` déclenché dans le geste utilisateur (tap Accepter / tap Contact), avant la chaîne async |
| Boutons trop gros | `index.html` + `core/call-screen.js` | CSS `.cs-btn` + grille 2×2 `.cs-actions-grid` en mode accepté |
| Diagnostic moteur vocal | `core/agora-call-engine.js` | `getRuntimeState()` → joined/channel/published/remoteUsersCount/lastError |

---

## SONNERIE TÉLÉPHONE RÉELLE — audio-manager v3 (2026-06-10, après retour terrain)

**Retour terrain :** bip entendu côté appelant mais AUCUNE sonnerie côté destinataire.

**Cause :** le fallback Web Audio nécessite un AudioContext débloqué par un geste
utilisateur récent. L'appel entrant arrive via Realtime (sans geste) → contexte
suspendu → silence. De plus le son ne ressemblait pas à un téléphone.

**Fix (audio-manager.js v3) :**
1. Génération au démarrage d'une vraie sonnerie téléphone : WAV en mémoire
   (Blob URL), bitonalité 440+480 Hz, cadence 1.5s ON / 3.5s OFF, loopée.
   Assignée à `callAudioIncoming.src`. + tonalité retour (440 Hz) pour
   `callAudioOutgoing` + double bip pour `messageAudioBeep`.
2. `unlockFromUserGesture()` joue maintenant TOUS les éléments en muet au
   premier tap — iOS les autorise ensuite à être rejoués à tout moment,
   y compris à l'arrivée d'un appel sans geste. C'est LE mécanisme fiable iOS.
3. Le fallback Web Audio reste en dernier recours.

```text
Mécanisme iOS critique :
tap quelconque dans l'app → éléments <audio> joués en muet → "débloqués"
appel entrant (sans geste) → el.play() AUTORISÉ car élément déjà débloqué
```

---

## ÉTAT PRODUCTION — 2026-06-11 ✅ APPELS VOCAUX FONCTIONNELS

```text
Validé terrain : BZ-652-LL ↔ BE-521-MM — audio bidirectionnel confirmé
```

### Correctifs session 2026-06-11 (PR #292 → #297, tous mergés sur main)

| Fix | Cause | PR |
|---|---|---|
| Token Agora null | Edge Function `get-agora-token` jamais déployée en CI (seulement `immat-brain-dialog`) | #294 |
| HTTP 401 | JWT verification Supabase activée par défaut au redéploiement CI — désactivée via Dashboard | manuel |
| Token null → fallback natif | `npm:agora-token@2.0.4` potentiellement CJS incompatible Deno — implémentation Web Crypto native | #293 |
| Guard double-join | `joinCall()` appelée deux fois en parallèle → `INVALID_OPERATION` | #293 |
| Audio unidirectionnel (A entend B, B n'entend pas A) | `user-published` enregistré APRÈS `join()` → événement raté si A déjà présent | #296 |
| Race condition preMicTrack | `__preMicTrack` pas encore résolu quand `joinCall()` tourne → `null` → fallback iOS échoue | #295 |
| `[object Object]` dans diagnostic | `lastCallEvents` converti via `String(array)` → noms d'événements maintenant affichés | #297 |
| 3 bugs post-audit | guard `_busSignalBound`, `getRuntimeState` read-only, `requestId` dans `CALL_ENDED` | #292 |
| Faux positif « vieille version en cache » | `checkCache()` flaguait Critique dès que l'URL n'avait pas de `?v=x` (heuristique). Remplacé par vraie vérification : `CACHE_NAME` du service-worker.js réseau comparé à `caches.keys()`. Marqueur URL devenu informatif. SW v18, GVC v1.1 | branche feature |
| Stale CALL_ACCEPTED dans Agora | `bus.on('CALL_ACCEPTED')` pouvait joindre un canal Agora même après annulation (event Supabase en retard). `_terminalRequestIds` Set — tout event terminal marque le requestId, `CALL_ACCEPTED` ignoré si marqué | branche feature |
| Action locks double-tap | `_withLock()` wrapper sur Accepter/Refuser/Annuler/Raccrocher — verrou 1.5s, double-tap ignoré | branche feature |
| "Fermer" pendant appel actif | Bouton "Fermer" remplacé par "Réduire" en mode `accepted` — l'appel reste actif (passe en mini), impossible de rater le raccrocher | branche feature |
| `acceptCall()` else : audio non stoppé explicitement | Ajout `AudioManager.stopCallAudio('accept-no-row')` dans la branche échec de acceptCall() | branche feature |
| Variable `wasCallScreenIncoming` inutilisée | Supprimée dans acceptCall() | branche feature |

---

## ÉTAT — 2026-06-11 — RÉPARATION COMPLÈTE calls.js v16 EN PRODUCTION

### Versions en production

```text
calls.js v16 — poussé sur main via MCP GitHub API
Commit local : sur branche claude/immatconnect-pro-app-dEKGR + main
SW : immatconnect-pro-v21 actif — réseau-first, sert toujours le dernier calls.js
```

### Audit complet 2026-06-11 — 4 bugs confirmés, 4 fixes appliqués

#### FIX #1 — `cancelCallRequest` : `_missedTimers.delete(requestId)` manquant

**Cause :** `cancelCallRequest()` n'appelait pas `_missedTimers.delete(requestId)`. Toutes les
autres fonctions (acceptCall, refuseCall, postgres_changes UPDATE, poll detect, broadcast CANCEL)
le font. Nettoyage défensif ajouté.

```js
// après _pendingCallPlate = null :
_missedTimers.delete(requestId); // ← ajouté
```

#### FIX #2 — Double `showOutgoing()` → double tonalité + double render

**Cause :** `requestCall()` appelait `_showSentBanner()` (→ `showOutgoing` direct) PUIS émettait
`CALL_INITIATED` (→ `showOutgoing` via bus call-screen.js). Résultat : overlay rendu deux fois,
timer 30s remis à zéro, double tonalité audio.

**Fix :** ordre inversé dans `requestCall` (CALL_INITIATED en premier), déduplication dans
`_showSentBanner` via `getState()`.

```js
// requestCall — nouvel ordre :
_emitCallEvent('CALL_INITIATED', {...});   // bus → showOutgoing + audio (1er)
_showSentBanner(receiverPlate, data.id);  // 31s timer + dedup check (2ème)

// _showSentBanner — déduplication :
const csState = window.CallScreen.getState();
if (csState.mode === 'outgoing' && csState.requestId === requestId) return; // déjà affiché
```

Path de recovery (`_recoverPendingRequest` → `_showSentBanner`) non affecté : mode ≠ 'outgoing'
au retour arrière-plan → direct `showOutgoing` appelé normalement.

#### FIX #3 — Overlay "Appel en cours" côté A affiche `--` après accept de B

**Cause :** `outgoingUpdateHandler` émettait `CALL_ACCEPTED` avec `r.receiver_plate` brut,
qui peut être `null` en DB → `showAccepted` affichait `--`.

**Fix :** fallback sur `_pendingCallPlate` (mémorisé au moment de l'appel) :

```js
const acceptedPlate = r.receiver_plate || _pendingCallPlate || null;
_emitCallEvent('CALL_ACCEPTED', {'with': acceptedPlate, plate: acceptedPlate, ...});
```

#### FIX #4 — Overlay sortant affiche `--` en recovery (race condition)

**Cause :** `_recoverPendingRequest()` appelée sur visibilitychange avant que `_pendingCallPlate`
soit défini. Partiellement corrigé en v15 — guards maintenus en v16.

```js
// _recoverPendingRequest : fallback _pendingCallPlate + guard if (!receiverPlate) return
// _showSentBanner : effectivePlate = plate || _pendingCallPlate || null
```

### PROCHAINE ACTION — TEST TERRAIN v16

Tester sur les deux iPhones (BZ-652-LL ↔ BE-521-MM) :
1. A appelle B → overlay sortant affiche BE-521-MM (plus de `--`) ← **BUG SIGNALÉ, À CONFIRMER**
2. B accepte → "Appel en cours" côté A affiche BE-521-MM (plus de `--`) ← **À CONFIRMER**
3. A annule → B ferme dans les 1.5s (poll ou broadcast) ← **À CONFIRMER**
4. Une seule tonalité d'appel côté A (plus de double bip) ← **À CONFIRMER**
5. A peut rappeler immédiatement après annulation ← **DÉJÀ OK**

---

## ÉTAT — 2026-06-11 — DIAGNOSTIC SW BLOQUÉ + CORRECTIFS TIMING

### Diagnostic : pourquoi l'utilisateur était sur v8 alors que la production est v20

La capture d'écran du Dashboard montrait `CACHE_NAME: immatconnect-pro-v8`. La version en production est v20/v21. Cause identifiée : `cache.addAll()` est **atomique** — si un seul fichier STATIC_CACHE renvoie une erreur réseau (timeout, 503 GitHub Pages CDN), l'install entier échoue silencieusement. Le browser reste sur la dernière version installée avec succès (v8).

**Fix appliqué (SW v21) :** `Promise.allSettled([...STATIC_CACHE, ...CDN_CACHE].map(url => cache.add(url)))` — non-atomique. Un fichier en échec ne bloque plus l'install.

### Bugs persistants après v8 : état exact

Malgré le SW v8, les scripts `calls.js?v=9`, `call-screen.js?v=4` étaient servis depuis le réseau (cache-first → network-first). Les correctifs P0/P1 ÉTAIENT déployés mais les bugs persistaient quand même. Deux causes racines :

**Bug 1 — Plaque '--' côté appelant :**
- `_recoverPendingRequest()` appelée sur `visibilitychange` refetchait la DB. Si `receiver_plate` était null en DB, écrasait l'affichage correct avec '--'.
- Fix : `_pendingCallPlate` mémorisé en mémoire dans `requestCall()`. `_recoverPendingRequest` l'utilise en fallback.
- Fix : `showOutgoing()` accepte maintenant `data.to || data.plate` (défensif).
- Log ajouté : `console.log('[CallManager] requestCall → plaque:', ...)` pour diagnostic.

**Bug 2 — CANCEL ne ferme pas B immédiatement :**
- La subscription Supabase Realtime du canal signal prend ~300ms à s'établir (SUBSCRIBED). Si A annule dans cette fenêtre, `ch.send()` est ignoré silencieusement.
- Fix A : `cancelCallRequest()` attend maintenant `_signalReady` (Promise qui résout sur SUBSCRIBED) avec timeout 3s avant d'envoyer CANCEL.
- Fix B : dans le callback `.subscribe()`, quand SUBSCRIBED, B vérifie la DB pour détecter un CANCEL émis pendant la fenêtre d'abonnement.
- `_signalReady` effacé dans `_leaveCallSignal()`.

---

## TÂCHES SUIVANTES

### P0 — Propagation annulation ✅ CORRIGÉ (calls.js v13)

### P1 — Plaque visible des deux côtés ✅ CORRIGÉ

### P2 — Haut-parleur / écouteur

- Par défaut : route écouteur (privé)
- Bouton Haut-parleur ON/OFF séparé du Muet
- Si la route audio n'est pas contrôlable → afficher "Sortie audio contrôlée par le téléphone"
- Exposer dans diagnostics : `speakerSupported`, `speakerEnabled`, `audioRouteKnown`, `audioRoute`, `lastSpeakerError`, `muteState`

### P3 — Dashboard / Diagnostics

Ajouter un bloc "Call State Integrity" :
```
requestId actif, CallScreen mode/plate/requestId, pendingCallId,
signalRequestId, signalChannel présent, listeners actifs (receiver/requester),
missedTimers, UI entrante/sortante visible, dernier cancel/hangup reçu,
derniers événements CALL_*
```

---

## SUPABASE

```text
URL        : https://vemgdkkbldgyvaisudkd.supabase.co
Anon key   : sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ
Edge Functions déployées :
  - get-turn-credentials  (ancienne, pour WebRTC natif — obsolète)
  - get-agora-token       (nouvelle, pour tokens Agora RTC)
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
