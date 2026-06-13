# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour tout assistant IA.
Lire ce fichier en entier avant toute action.

---

## SESSION 2026-06-13 — PHASE DOCUMENTATION STRATÉGIQUE (TERMINÉE)

### Ce qui a été produit (documents uniquement, aucun code modifié)

- Architecture Review pré-Sprint 8 (8 sections : RLS, indexes, Realtime, localStorage, SW, Edge Functions, Deployment, Risk)
- GO/NO-GO checklist sécurisation RLS (rollback corrigé — jamais USING(true))
- Validation terrain régressions RLS (4 régressions identifiées et corrigées en session précédente)
- Documents stratégiques (6) : Worst Case Scenarios, ANGE Spec, Business Review, CNIL, Cost Review, Roadmap
- **Plan d'exécution 30 jours v1.2 — VALIDÉ ET FIGÉ** → `docs/PLAN_EXECUTION_30J_V1.2.md`

### Décisions figées dans ce plan (ne plus rouvrir)

- Noms Edge Functions corrects : delete-account, export-user-data, submit-rating, send-push-notification (+ 4 existantes)
- Secrets : ANTHROPIC_API_KEY (pas OPENAI_API_KEY), VAPID_SUBJECT ajouté
- Modèle IA : Claude via immat-brain-dialog (pas gpt-4o-mini)
- ANGE = Assistant Numérique de Guidage et d'Écoute (définition unique)
- Rate limit client = UX uniquement ; rate limit serveur = sécurité réelle (table rate_limit_counters dédiée)
- Pas d'impact trust_level automatique sur volume de reports — needs_review flag + notification modération
- is_deleted ≠ suspension (colonne account_status = migration future)
- Export RGPD = messages envoyés + reçus avec minimisation
- Realtime = activer uniquement tables réellement abonnées
- 14 contrôles terrain (dont 11 critiques) — 0 KO critique = condition GO bêta

### État des fichiers après cette session

```
docs/PLAN_EXECUTION_30J_V1.2.md  → CRÉÉ (document figé)
PROJECT_STATE.md                  → MIS À JOUR (section 3, 4, 9, historique)
SESSION-CONTINUATION.md           → MIS À JOUR (cette entrée)
```

Aucune modification de code. Aucun commit de code. Phase documentation = terminée.

### Prochaine étape : exécution terrain (ordre strict)

1. Déployer 11 migrations Supabase (20260615 en dernier)
2. Configurer Secrets Supabase (AGORA_APP_CERTIFICATE, VAPID_PRIVATE_KEY, ANTHROPIC_API_KEY)
3. Déployer 4 Edge Functions nouvelles/modifiées
4. Activer Realtime sur tables confirmées uniquement
5. Tester VAPID sur mobile réel
6. Exécuter 14 contrôles terrain — 0 KO critique requis
7. GO bêta fermée 10–20 utilisateurs

---

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

---

## ÉTAT — 2026-06-12 — FIX OVERLAY '--' (call-screen.js v6, calls.js v17)

### Bug confirmé par diagnostic terrain (5 captures IMG_5584–IMG_5589)

Séquence observée dans les toasts :
1. `🔍 plate→--` (rouge) — `showAccepted` appelé avec plate null
2. `🔍 plate→BE-521-MM` (vert) — vrai CALL_ACCEPTED avec bonne plaque

### Cause racine — double CALL_ACCEPTED

`call-screen.js` n'avait aucun guard contre les événements Supabase Realtime périmés
(stale events d'un appel précédent). `agora-call-engine.js` avait déjà ce guard via
`_terminalRequestIds`. Bug symétrique, même fix.

### Fixes appliqués

#### Fix A — call-screen.js : _terminalRequestIds (stale event guard)

Toute terminaison d'appel (REFUSED / CANCELLED / MISSED / ENDED) ajoute le requestId
dans `_terminalRequestIds`. `showAccepted` ignore silencieusement les événements dont
le requestId est déjà terminal.

```js
var _terminalRequestIds = new Set();

function _addTerminal(e) {
  var rid = e && e.payload && e.payload.requestId;
  if (rid) _terminalRequestIds.add(rid);
}

// bus.on('CALL_ACCEPTED') :
if (rid && _terminalRequestIds.has(rid)) return; // stale event ignoré
```

#### Fix B — calls.js : _pendingCallPlate restauré en recovery

`_recoverPendingRequest` définissait `_pendingCallId` mais pas `_pendingCallPlate`.
Si l'app reprenait d'arrière-plan et que `receiver_plate` était null en DB, FIX #3
(`r.receiver_plate || _pendingCallPlate`) ne pouvait pas fonctionner.

```js
_pendingCallId = data.id;
if (receiverPlate) _pendingCallPlate = receiverPlate; // ← ajouté
```

#### Diagnostic retiré

Toasts `🔍` et MutationObserver supprimés de call-screen.js (cause identifiée).

### Versions après fix

```text
calls.js       : v=13 (index.html) — même logique v16, +1 ligne _recoverPendingRequest
call-screen.js : v=6 (index.html)  — _terminalRequestIds, diagnostic retiré
```

### ✅ VALIDÉ TERRAIN 2026-06-12

Overlay "📞 Appel en cours" affiche BE-521-MM. Plus de '--'.

### Cause racine confirmée

Supabase postgres_changes UPDATE n'inclut que les colonnes modifiées (status,
responded_at). `receiver_plate` absent du payload → `showAccepted({with: null})` → '--'.

Fix final (call-screen.js v7) : fallback sur `_state.plate` (déjà renseigné par
`showOutgoing`) si le payload ne contient pas de plaque.

---

## ÉTAT — 2026-06-12 — FIX PROPAGATION ANNULATION v14 (audit initial)

### Audit complet 4 bugs identifiés

| # | Sévérité | Cause | Fix |
|---|---|---|---|
| 1 | CERTAIN | `visibilitychange` appelle `_recoverIncomingPendingCalls` (query status=pending). Si A a annulé → status='cancelled' → null → overlay B reste ouvert | `_checkOngoingIncomingCall()` ajouté au handler visibilitychange |
| 2 | PROBABLE | iOS Safari throttle `setInterval` en background → poll 1.5s ne tourne pas | Intervalle réduit à 1s + vérification immédiate avant premier tick |
| 3 | POSSIBLE | Poll query `.eq('id', requestId)` sans `.eq('receiver_id', _uid)` → RLS peut retourner null silencieusement | `.eq('receiver_id', _uid)` ajouté à toutes les queries poll |
| 4 | CERTAIN | CANCEL broadcast envoyé une seule fois. B peut s'abonner ~300-500ms après → broadcast perdu | Retry broadcast après 300ms (deux envois) dans `cancelCallRequest` |

---

## ÉTAT — 2026-06-12 — FIX ARCHITECTURAL cancelCallRequest (calls.js v15)

### Cause racine du bug "annulation ne ferme pas B"

L'ancienne implémentation de `cancelCallRequest` écrivait en DB **EN DERNIER** :

```
1. attend _signalReady (jusqu'à 3s)
2. envoie broadcast CANCEL
3. attend 900ms
4. retry broadcast
5. _leaveCallSignal()
6. _hideSentBanner()
7. DB update cancelled ← TROP TARD
```

Conséquence : `postgres_changes` de B (3ème mécanisme de détection) se déclenchait
~1.1s après le tap d'annulation. Le poll 1s pouvait rater ce créneau.

### Fix architectural appliqué (v15)

Nouvelle séquence dans `cancelCallRequest` :

```
1. DB update FIRST → postgres_changes déclenché immédiatement chez B
2. _emitCallEvent CALL_CANCELLED (UI locale)
3. broadcast CANCEL (best-effort, B est peut-être déjà notifié par postgres_changes)
4. attente 300ms → retry broadcast (couvre B qui vient de s'abonner)
5. _leaveCallSignal()
```

### Mécanismes de détection côté B (tous fonctionnels après v15)

| Mécanisme | Latence après tap A | Statut |
|---|---|---|
| Broadcast CANCEL sur canal signal | 50-200ms | ✅ B abonné avant le cancel |
| postgres_changes UPDATE receiver_id | 200-500ms | ✅ DB en premier → immédiat |
| Poll DB 1s (`_startCancelPoll`) | 0-1000ms | ✅ vérif immédiate + 1s ticks |
| visibilitychange + `_checkOngoingIncomingCall` | au retour foreground | ✅ background safety |

### Versions après fix

```text
calls.js       : v=15 (index.html) — DB-first cancel, robustesse maximale
call-screen.js : v=5  (index.html) — serveur v7 en cache (réseau-first)
```

### PROCHAINE ACTION — TEST TERRAIN avec panneau diagnostic

**Panneau 🔬 flottant en bas à droite de l'app** :
- Tap 🔬 → panel sliding bas avec tous les événements CALL_* horodatés
- Bouton "État" → snapshot CallManager.getRuntimeState()
- Bouton "Copy" → copie tout dans le presse-papier pour partager
- Lit console.log [CallManager] + bus CALL_* events

Tester sur les deux iPhones (BZ-652-LL ↔ BE-521-MM) :
1. A appelle B → ouvrir 🔬 sur chaque téléphone, voir logs showIncomingPopup + requestCall
2. A annule → voir sur B : poll tick → st cancelled OU CANCEL broadcast reçu OU postgres_changes
3. Si B ne ferme pas → copier les logs 🔬 de B et partager pour diagnostic

**Logs clés à observer :**
- Sur A (annulation) : `cancelCallRequest → hasCh: true/false` + `DB → err: none` + `broadcast#1 envoyé`
- Sur B (réception annulation) : `poll tick #N → st: cancelled` OU `CANCEL broadcast reçu`
- Si `hasCh: false` sur A → le canal signal n'est pas ouvert → le broadcast ne peut pas partir
- Si `poll tick → st: null` → RLS bloque la requête ou le requestId est mauvais

---

## ÉTAT — 2026-06-12 ✅ APPELS + ANNULATION + PLAQUE FONCTIONNELS

```text
Validé terrain : BZ-652-LL ↔ BE-521-MM — 2026-06-12 23:31 UTC
- Annulation A → overlay B se ferme ✓
- Plaque de l'appelé visible sur l'overlay sortant ✓
- Appels vocaux bidirectionnels ✓
```

### Cause racine résolue — call-screen.js v8 (2026-06-12)

InteractionEngine ré-émettait CALL_INITIATED / CALL_ACCEPTED / CALL_MISSED sur ImmatBus
avec un payload différent (sans `requestId` au niveau racine). Le handler `bus.on('CALL_INITIATED')`
appelait `showOutgoing(e.payload)` pour les 3 émissions. La 3ème écrasait :
- `_state.requestId = null` → cancel et hangup silencieux (bouton Annuler/Raccrocher sans effet côté B)
- `_state.plate = '--'` → plaque de l'appelé non affichée

**Fix :** Guard `requestId` sur tous les handlers bus + dedup dans show* functions.

### Bugs résolus dans cette session (2026-06-12)

| Bug | Cause | Fix |
|---|---|---|
| A annule → B ne ferme pas | InteractionEngine écrase `_state.requestId=null` | call-screen.js v8 |
| Plaque `--` sur overlay sortant | Même cause | call-screen.js v8 |
| Double `showIncomingPopup` | realtime KO x2 → deux canaux | dedup + debounce v17 |
| CALL_MISSED après appel accepté | Double popup → deuxième timer échappait à clearTimeout | dedup v17 |
| DB cancel en dernier | cancelCallRequest écrivait en DB après broadcasts | DB-first v15 |

## ÉTAT — 2026-06-13 — AUDIT D'EXÉCUTION COMPLET

### Fichier créé : docs/IMPLEMENTATION_GAP_ANALYSIS.md

Audit d'exécution complet — confronte le code réel au MASTER_PLAN et à l'AUDIT_V2.

Contenu :
- Matrice 80+ fonctionnalités (Existe / Partielle / Absente / Priorité / Effort / Dépendances)
- Audit écran par écran (10 écrans)
- Audit base de données (tables, colonnes, index, RLS manquants)
- Audit production (blockers App Store / Play Store)
- Incohérences code vs MASTER_PLAN vs AUDIT_V2
- Éléments à supprimer (call-webrtc.js, get-turn-credentials, Inbox/Outbox séparés…)
- Roadmap Sprint 1→4
- Top 20 actions dans l'ordre exact

### PROCHAINE ACTION — SPRINT 1

**Action #01 (4h) :** Ajouter bouton urgence 15/17/18 dans sigStep2Vehicle et sigStep2Aide  
**Action #02 (30 min) :** Supprimer call-webrtc.js + get-turn-credentials  
**Action #03 (30 min) :** Effacer ic_pending_profile après signup réussi  
**Action #04 (1j) :** Onglet Appels dans nav principale + badge manqués  
**Action #05 (2j) :** Push notifications SW Level 2 (VAPID)  

### RÉSUMÉ ÉTAT DU PROJET (2026-06-13)

```
Fonctionnel : ~35% du plan
Bugs P0 appels : ✅ tous résolus (2026-06-12)
Blockers lancement : 5 (push, urgence, RGPD suppression, ic_pending_profile, onglet appels)
Sprint 1 cible : 2 semaines
Sprint 2 cible : +2 semaines
Sprint 3 cible : +3 semaines
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
