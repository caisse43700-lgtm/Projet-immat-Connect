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

### Versions en production après commit

```
calls.js?v=10, call-screen.js?v=5, SW v21
```

## PROCHAINE ACTION — SI BUGS PERSISTENT

Si après mise à jour (SW v21) les bugs persistent toujours :
1. Ouvrir Safari DevTools (Mac → Safari → Develop → [iPhone]) — chercher `[CallManager] requestCall → plaque:` dans la console pour voir si la plaque est transmise.
2. Si plaque = null/empty dans le log → le problème est en amont de `requestCall` (UI modal, openContactOptions).
3. Si plaque est correcte mais affichage '--' → problème DOM ou race condition non couverte.

L'utilisateur doit faire une mise à jour forcée pour obtenir SW v21 :
- **iOS Safari** : Réglages → Safari → Avancé → Données de sites web → Supprimer caisse43700-lgtm.github.io

```text
□ Health Lab Phase 1 (outil de diagnostic audio pré-appel)
□ Indicateur niveau audio en temps réel pendant l'appel
```

---

## TÂCHES SUIVANTES — Source : CALL_STATE_CONTINUATION.md (ChatGPT, 2026-06-11)

> La voix fonctionne. Ne pas retoucher le moteur vocal. Corriger uniquement les incohérences d'état d'appel.

### Règles non négociables

```
- Un appel annulé ne peut jamais être accepté.
- Un statut terminal doit fermer l'UI des deux côtés.
- A doit toujours voir la plaque de B (et inversement).
- Le raccrochage doit se propager immédiatement des deux côtés.
- Muet = micro uniquement. Haut-parleur = sortie audio uniquement.
- Ne pas prétendre contrôler haut-parleur/écouteur si le SDK ne le supporte pas.
```

### P0 — Propagation annulation (critique) ✅ CORRIGÉ

**Corrections appliquées dans `calls.js` (branche feature) :**
- Nouveau listener `UPDATE receiver_id=eq.{uid}` : statut terminal → vide timer, stoppe audio, ferme UI, émet CALL_CANCELLED ou CALL_MISSED
- `acceptCall()` : si DB retourne 0 lignes (appel déjà annulé) → `_hideIncomingPopup()` + toast "Appel annulé ou expiré" — plus jamais de join signal/voix
- `_showSentBanner()` : appelle maintenant `CallScreen.showOutgoing({to,plate,requestId})` au lieu de sortir sans passer la plaque (→ fix P1 intégré)
- `broadcastHangup()` : envoie le broadcast HANGUP **avant** `_leaveCallSignal()` — évite que removeChannel coupe la connexion avant l'envoi

### P1 — Plaque visible des deux côtés ✅ CORRIGÉ (inclus dans P0)

- `_showSentBanner()` passe maintenant `{to, plate, requestId}` à `CallScreen.showOutgoing()`

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

Ajouter bloc "Call Identity" : plaque cible sortante, plaque appelant entrant, plaque affichée, requestId.

Ajouter bloc "Audio Route" : speaker support/enabled/route/lastError, muteState.

### Autotests à couvrir

1. A appelle B puis annule avant que B accepte → B ferme immédiatement, ne peut plus accepter
2. A annule, B tape Accepter très vite → pas d'accept, UI ferme, pas de join signal/voix
3. A appelle B → A voit la plaque de B, mode outgoing, requestId présent
4. B reçoit → B voit la plaque de A, mode incoming, requestId présent
5. A et B en appel, A raccroche → B ferme immédiatement
6. A et B en appel, B raccroche → A ferme immédiatement
7. Bouton Haut-parleur : fonctionnel ou clairement reporté non supporté ; Muet reste indépendant

---



**Problèmes signalés :** voix absente + raccrochage non synchronisé entre téléphones.

### Cause voix absente

`_accept()` appelait `getUserMedia` et **stoppait immédiatement** les tracks — Agora ne pouvait pas les réutiliser.
De plus, le SDK Agora (CDN async) pouvait ne pas être chargé au moment de l'appel.

**Fix :**
- `call-screen.js` v3 `_accept()` : si `AgoraRTC` disponible → `createMicrophoneAudioTrack()` → `w.__preMicTrack`
  sinon → `getUserMedia` → `w.__preMicStream` (stream conservé, pas stoppé)
- `calls.js` v7 `contactByCall()` : idem côté appelant (stream conservé dans `w.__preMicStream`)
- `agora-call-engine.js` v3 `_getMicTrack()` : réutilise `__preMicTrack` ou wrap `__preMicStream` en custom track Agora
- `agora-call-engine.js` v3 `joinCall()` : attend le SDK jusqu'à 8s via `_waitForSDK()`

### Cause raccrochage non synchronisé

`user-left` Agora ne tire que si les deux téléphones ont rejoint le canal Agora.
Si la voix échoue sur un côté, ce téléphone ne sait jamais que l'autre a raccroché.

**Fix :** canal de signalisation Supabase Realtime broadcast `ic_call_signal_{requestId}`
- `calls.js` : `_joinCallSignal(requestId)` → rejoint le canal à `CALL_ACCEPTED` (les deux côtés)
- `calls.js` : `broadcastHangup(requestId)` → diffuse `HANGUP` sur le canal
- `call-screen.js` `_hangup()` → appelle `CallManager.broadcastHangup(requestId)` + `CALL_ENDED` local
- Récepteur du broadcast → `CALL_ENDED` → `CallScreen.hide()` automatique

| Fichier | Version | Changement |
|---|---|---|
| `core/agora-call-engine.js` | v3 | `_waitForSDK()` + `_getMicTrack()` avec réutilisation preMicTrack/preMicStream |
| `core/call-screen.js` | v3 | `_accept()` pré-crée track Agora ; `_hangup()` appelle `broadcastHangup` |
| `calls.js` | v7 | `_joinCallSignal` / `_leaveCallSignal` / `broadcastHangup` ; `contactByCall` conserve stream |
| `service-worker.js` | v16 | Cache version bump |

---

## CORRECTIFS POST-AUDIT — 2026-06-10

3 bugs réels identifiés lors de l'audit de session, corrigés et poussés sur `claude/immatconnect-pro-app-dEKGR` (commit c59f76a) :

| Fichier | Bug | Correction |
|---|---|---|
| `calls.js` | `init()` empilait les subscriptions bus sur reconnexion | Guard `_busSignalBound` — `_bus.on('CALL_ENDED/MISSED')` exécuté une seule fois |
| `core/audio-manager.js` | `getRuntimeState()` appelait `_getOrCreateCtx()` — effet de bord création AudioContext | Utilise `_ctx` directement (read-only) |
| `core/agora-call-engine.js` | `CALL_ENDED` émis par `user-left` sans `requestId` | Ajout de `requestId: _currentChannel` dans le payload |

---

## PROCHAINE ACTION — TEST TERRAIN

URL de test (cache v16) :
```
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?v=agora4
```

Checklist :
```text
□ Recharger les deux téléphones avec ?v=agora4
□ IMPORTANT : taper une fois n'importe où dans l'app sur chaque téléphone
  (débloque l'audio iOS/Android — mécanisme pré-play muted)
□ A appelle B → B doit SONNER (vraie sonnerie téléphone bitonale)
□ A entend la tonalité de retour (tut… tut…)
□ B accepte → popup micro autorisé → audio bidirectionnel (VOIX)
□ Appel ne coupe PLUS après 20s
□ A raccroche → B ferme IMMÉDIATEMENT (broadcast Supabase ic_call_signal)
□ B raccroche → A ferme IMMÉDIATEMENT (idem)
□ Boutons compacts en grille 2×2
```

### En cas de problème voix

Console Safari (Menu → Avancé → Web Inspector) — chercher :
- `[CallScreen] preMicTrack Agora prêt` → track créé dans le geste ✅
- `[AgoraCall] Réutilise le track mic pré-créé` → track réutilisé par Agora ✅
- `[AgoraCall] Canal rejoint` → connexion réussie ✅
- `[AgoraCall] joinCall échoué` → voir erreur

### En cas de problème raccrochage

- `[CallManager] Signal canal rejoint` → canal broadcast opérationnel ✅
- `[CallManager] HANGUP diffusé` → signal envoyé ✅
- `[CallManager] HANGUP broadcast reçu → CALL_ENDED` → signal reçu ✅

### En cas de problème audio sonner

1. Ouvrir Guardian Dashboard → Diagnostic → vérifier voyant **Agora** (🟢 OK ?)
2. Vérifier que le popup micro a bien été accepté (iOS Réglages → Safari → Micro)
3. Confirmer qu'un tap a bien été fait sur l'app avant le test

---

## HISTORIQUE COMPLET DES PR MERGÉES

| PR | Branche | Objet | Date |
|---|---|---|---|
| #288 | global-verification-center | Global Verification Center + fix réception | 2026-06-10 (en attente) |
| #285 | feature/agora-voice-calls | Appels vocaux Agora RTC | 2026-06-10 |
| #286 | feature/agora-voice-calls | Diagnostics Agora | 2026-06-10 |
| #283 | guardian/actions-only | Guardian : boutons Diagnostic/Copier dans header | 2026-06-10 |
| #279 | guardian/refine-overlay | Guardian summary engine v1.1 overlay detection | 2026-06-10 |
| — | — | call-screen.js : Message/Fermer au lieu de "conversation ouverte" | antérieur |
| — | — | calls.js : supprime ouverture automatique conversation sur accepted | antérieur |
| — | — | Nettoie pending avant nouvel appel + retry 23505 | antérieur |

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
