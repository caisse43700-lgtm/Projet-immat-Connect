# AUDIT IMMATCONNECT — GLOBAL V1

**Auditeur :** IA indépendante (Claude Sonnet 4.6)
**Date :** 2026-06-13
**Version production auditée :** calls.js v17 · call-screen.js v8 · agora-call-engine.js v5 · SW v21
**Document de référence :** `docs/IMMATCONNECT_INTERACTION_ARCHITECTURE_MASTER_PLAN.md`
**Périmètre :** Dépôt `caisse43700-lgtm/Projet-immat-Connect` — branche `main`
**Méthode :** Lecture intégrale du code source, comparaison plan vs implémentation,
recherche délibérée d'oublis, incohérences, doublons, risques et angles morts.

---

## Résumé exécutif

ImmatConnect Pro est une PWA de communication inter-conducteurs par immatriculation.
L'application permet d'envoyer des messages, de passer des appels vocaux (Agora RTC)
et de signaler des incidents routiers ou de stationnement à des conducteurs proches.

**Ce qui fonctionne :** Les appels vocaux sont stables (Agora RTC — validé terrain
iOS Safari), les mécanismes de propagation d'événements d'appel sont robustes (4 voies
redondantes), le Service Worker réseau-first garantit la fraîcheur du code déployé,
et le Dashboard Gardien offre une visibilité diagnostique temps réel.

**Ce qui ne fonctionne pas encore :** Le MASTER_PLAN définit une architecture
ambitieuse (Inbox/Outbox séparés, Activity unifiée, ResolutionCenter, Trust Engine
complet, multi-véhicules, Recherche globale, Historique véhicule) dont environ 30 %
est implémenté. L'incohérence la plus grave est la **fusion des Appels dans le panneau
Messages** — antipattern UX qui masque la valeur différenciante de l'appel vocal.

**Risque P0 non résolu :** Aucune notification push système. Si l'app est fermée,
l'utilisateur B ne reçoit pas l'appel de A. C'est le frein d'adoption le plus important.

**Bilan :** Architecture événementielle solide, stack serveur appropriée, mais un écart
structurel important entre la vision documentée et l'implémentation actuelle.

---

## Forces

### Architecture événementielle
- `ImmatBus` (pub/sub interne) découple les modules : `calls.js`, `call-screen.js`,
  `agora-call-engine.js` communiquent sans dépendance directe.
- `InteractionEngine` centralise le stockage de toutes les interactions
  (25 types couverts, cycle de vie par statuts PENDING/ACCEPTED/RESOLVED/etc.).
- `ImmatOrganism` assure le pont OBD (observabilité des événements).

### Appels vocaux iOS-fiables
- Agora RTC 4.20 remplace WebRTC natif — résout les problèmes de micro iOS Safari.
- Pré-capture micro dans le geste utilisateur (`__preMicTrackPromise`) contourne
  la restriction iOS "getUserMedia hors geste interdit".
- 4 mécanismes de détection d'annulation (broadcast + postgres_changes + poll + visibilitychange).
- Guard `_terminalRequestIds` bloque les stale events Supabase dans `AgoraCallEngine`
  et `CallScreen` — évite de rejoindre un canal terminé.

### Service Worker réseau-first
- `immatconnect-pro-v21` : cache non-atomique (`Promise.allSettled`) — une erreur
  réseau sur un fichier n'annule plus l'installation entière.
- Toujours la dernière version JS servie depuis le réseau, fallback cache si offline.

### Diagnostic terrain
- Dashboard Gardien : 8 voyants temps réel (auth/db/messages/calls/agora/guardian/cache/supabase).
- Panel debug `🔬` flottant : logs CALL_* horodatés, snapshot `getRuntimeState()`,
  export clipboard. Outil de diagnostic terrain sans déploiement de code.
- Global Verification Center : 8 sections d'audit read-only depuis le Dashboard.

### Sécurité de base
- `owner_plate` immuable (INV-006) — impossible de voler la plaque d'un autre.
- App Certificate Agora jamais côté client — uniquement dans secrets Supabase.
- BLOCK_ALL / BLOCK_CALLS côté client (localStorage) + `is_call_blocked()` avant requestCall.
- Invariants documentés et référencés dans le code (INV-COM-xxx, INV-CALL-xxx).

### Robustesse du cancellation flow
- `cancelCallRequest` : DB UPDATE en premier (postgres_changes immédiat chez B),
  puis broadcast + retry 300ms.
- Guard `_seenIncomingCallIds` + debounce reconnect : élimine les doubles popups
  entrants causés par deux canaux Realtime simultanés.
- Guard `_missedTimers.delete(requestId)` dans `acceptCall` / `cancelCallRequest` /
  `refuseCall` — élimine les CALL_MISSED sur appel accepté.

---

## Faiblesses

### Faiblesses structurelles majeures

**1. Appels et Messages mélangés dans le même panneau**
`panelMessages` contient à la fois les conversations texte et la logique d'appel.
Il n'y a pas d'historique d'appels visible. Les appels manqués n'ont pas de badge
persistant. Ce mélange contredit le principe clé du MASTER_PLAN :
"Messages != Appels != Signalements."

**2. InteractionEngine ré-émet sur ImmatBus avec payload incomplet**
`_emitObd()` appelle `ImmatOrganism.observe()` qui re-publie sur ImmatBus avec
`{interactionId, type, flow_id, invariant}` — sans `requestId`. Chaque CALL_*
est donc émis 2 à 3 fois avec des payloads différents. Ce bug structurel a été
la cause racine de plusieurs bugs critiques (annulation silencieuse, plaque '--').
Le workaround (guard `e.payload.requestId` en v8) est correct mais ne résout pas
la cause racine dans `InteractionEngine`.

**3. localStorage pour les interactions critiques**
`InteractionEngine` stocke les 200 dernières interactions en localStorage.
Problèmes : (a) non synchronisé entre appareils, (b) quota navigateur ~5 MB,
(c) perdu si l'utilisateur vide le cache, (d) inaccessible pour un tableau de bord
agrégé côté serveur.

**4. Notifications push absentes**
Aucun `push` event dans le Service Worker. Si l'app est en background iOS,
la WebSocket Supabase Realtime est suspendue par le système. Les appels entrants
sont silencieux, les messages ne sonnent pas. C'est le frein d'adoption le plus critique.

**5. Photos sur signalements non implémentées**
Supabase Storage est disponible mais non utilisé. Chaque signalement est textuel.
L'absence de photo réduit la crédibilité des signalements (impossibilité de
prouver un stationnement gênant, une plaque illisible, etc.).

### Faiblesses techniques secondaires

**6. Double émission `_emitCallEvent`**
`_emitCallEvent()` appelle à la fois `ImmatBus.emit()` ET `ImmatOrganism.observe()`.
L'Organism re-publie sur le bus. Résultat : chaque CALL_* est traité 2x minimum
par tous les abonnés. Sans le guard v8, `CallScreen` rendait l'overlay 3 fois.

**7. `cancelCallRequest` sans guard d'idempotence**
Si A tape deux fois rapidement sur "Annuler", deux `cancelCallRequest` sont lancés.
Le second échoue silencieusement (RLS retourne une erreur 0 rows updated) mais
produit un broadcast CANCEL redondant.

**8. Poll 1s en foreground consomme de la batterie**
`_startCancelPoll()` (déclenché à chaque appel entrant) tourne à 1s d'intervalle.
Il n'y a pas de mécanisme de `clearInterval` si le Realtime fonctionne — le poll
et le Realtime coexistent sans coordination.

**9. `speaker toggle` — stub vide**
`CallScreen.toggleSpeaker()` est un stub vide. Il n'y a pas de bouton haut-parleur
fonctionnel dans l'overlay. iOS n'expose pas d'API WebRTC pour forcer le haut-parleur,
mais Agora SDK expose `setAudioOutput` sur certaines plateformes — non exploité.

**10. Pas d'expiration automatique des pré-tracks iOS**
Si A appelle B puis rappelle avant que B ait accepté, `__preMicTrackPromise` est
écrasé par le second appel sans attendre la résolution du premier. L'ancien track
n'est pas libéré → fuite de ressource micro potentielle.

---

## Incohérences

### Plan vs implémentation

| Ce que définit le MASTER_PLAN | Réalité dans le code |
|---|---|
| Inbox séparé | Absent — fusionné dans `panelMessages` |
| Outbox séparé | Absent — fusionné dans `panelMessages` |
| Activity comme fil unifié | Partiellement implémenté (`panelActivite` — skeleton) |
| Messages != Appels != Signalements | Appels dans Messages (antipattern) |
| Cycle de vie complet des signalements | Création seule — pas de résolution, expiration, fusion |
| ResolutionCenter | Absent |
| Préférences utilisateur (section 6) | Absentes — pas d'opt-in push, pas de thème, pas de préférences de notification |
| Trust Engine (section 7) | Partiel — BLOCK_ALL/BLOCK_CALLS seul, pas de score de confiance |
| Cohérence graphique (section 9) | Non auditée dans le document, non vérifiée en code |
| Recherche globale (section 10) | Absente |
| Historique véhicule (section 11) | Absent |
| Gestion grands parkings (section 12) | Absente |
| Confidentialité et floutage (section 13) | Absent — pas de floutage photos/plaques tiers |
| Dashboard métier (section 14) | Partiel — Dashboard Gardien = diagnostic technique, pas métriques métier |
| Vision stratégique (section 15) | Non formalisée dans le code |

### Incohérences internes au code

**InteractionEngine vs calls.js — source de vérité duale**
`calls.js` maintient `_pendingCallId`, `_pendingCallPlate`, `_missedTimers` en RAM.
`InteractionEngine` maintient les mêmes interactions en localStorage.
Les deux peuvent diverger (ex: recovery après crash → `_pendingCallId` perdu en RAM,
présent en DB, absent en localStorage si l'app a été tuée).

**`navSignaler` ouvre `panelAltet`, pas un panel dédié**
`App.navSignaler()` appelle `this.panel('altet')`. Le formulaire de signalement
est dans le même panneau que les alertes communautaires. Pas de panel "Signaler"
dédié malgré l'existence d'un bouton nav dédié.

**`openInboxBadge` ouvre `panelAltet`**
`openInboxBadge()` navigue vers le panel Alertes. Le badge "inbox" en navigation
représente donc les alertes, pas une vraie Inbox de messages. Le nom est trompeur.

**`call-webrtc.js` obsolète mais présent**
`core/call-webrtc.js` (WebRTC natif — remplacé par Agora) existe encore dans le
répertoire. `index.html` ne le charge plus, mais sa présence crée de la confusion
pour les futurs développeurs.

**`CallScreen.version = 'v8'` — versioning dans le code source**
Le numéro de version est hardcodé dans le fichier JS. Il doit être mis à jour
manuellement à chaque modification. Risque de désynchronisation avec `index.html?v=`.

---

## Angles morts

### 1. Notifications push (critique)
**Problème :** iOS suspend les WebSockets en background. Sans push natif,
B ne reçoit pas l'appel si son écran est verrouillé.
**Ce qui manque :**
- Event `push` dans `service-worker.js`
- `registration.pushManager.subscribe()` côté client
- Configuration Supabase Web Push (VAPID key)
- APNs pour iOS (certificat Apple Push Services)
- FCM pour Android (clé serveur Firebase)
- Actions dans la notification ("Accepter" / "Refuser" sans ouvrir l'app)

### 2. Véhicule prêté / loué
La plaque est liée au compte propriétaire. Si le véhicule est prêté,
tous les appels arrivent au propriétaire, pas au conducteur actuel.
Pas de mode "délégation temporaire" ni de concept de "conducteur en cours".

### 3. Changement de plaque
`owner_plate` est immuable (INV-006). Mais les plaques changent légalement
(véhicule revendu, nouvelle immatriculation européenne). Il n'existe aucun
flow de migration. L'utilisateur doit créer un nouveau compte et perd son historique.

### 4. Appel en arrière-plan iOS
Quand l'app est minimisée pendant un appel Agora actif, iOS peut suspendre
le contexte audio WebRTC après ~30s (politique background audio). Agora SDK
inclut un mécanisme keep-alive audio, mais son comportement sur iOS Safari
n'a pas été audité dans ce code.

### 5. Réseau dégradé pendant un appel
Agora gère la reconnexion automatique. Mais il n'y a pas d'indicateur visuel
de qualité réseau dans l'overlay "Appel en cours". L'utilisateur ne sait pas
si l'appel est en cours de reconnexion ou si son interlocuteur a raccroché.

### 6. Double appel simultané
Si A appelle B pendant que B appelle A (collision), les deux reçoivent un
CALL_RECEIVED de l'autre. Les deux affichent l'overlay entrant. Il n'y a pas
de mécanisme de résolution de collision (ex: l'appel du numéro le plus bas
prend la priorité).

### 7. Accessibilité (WCAG 2.1)
- Overlays d'appel sans `role="dialog"` ni `aria-labelledby`
- Toasts sans `aria-live="polite"` — non lus par les lecteurs d'écran
- Boutons d'action sans labels accessibles (icônes seules dans certains cas)
- Contraste des couleurs variables CSS non vérifié (fond sombre dynamique)
- Gestes : tap-to-dismiss non annoncé aux technologies d'assistance

### 8. Quota localStorage
`InteractionEngine` stocke jusqu'à 200 interactions. Chaque interaction peut
contenir un payload arbitraire. Sur iOS Safari, le quota localStorage est
~2.5 MB par origine. Si des payloads sont lourds (ex: texte long de messages),
le quota peut être atteint → `_save()` échoue silencieusement (try/catch vide).
Pas d'alerte utilisateur, pas de nettoyage automatique des entrées les plus anciennes
au-delà du simple `slice(-MAX_INTERACTIONS)`.

### 9. Synchronisation des profils
La plaque est mémorisée dans `_myPlate` (RAM) et dans `S.profile.owner_plate`
(localStorage/state). Si l'utilisateur change de compte sans recharger l'app
(ex: SSO multi-compte), `_myPlate` garde l'ancienne valeur et les appels sont
envoyés avec la mauvaise plaque expéditeur.

### 10. Expiration des call_requests en DB
Les call_requests expirent via `expires_at` (timestamp). La mise à jour
`status='expired'` est effectuée côté client dans `_recoverPendingRequest`
(condition `new Date(data.expires_at) <= new Date()`). Si aucun client n'est
actif, les entrées restent `status='pending'` indéfiniment. Il n'y a pas
de `pg_cron` job côté Supabase pour nettoyer les entrées expirées.

---

## Risques

### Risques P0 (bloquants pour l'adoption)

| ID | Risque | Probabilité | Impact | Statut |
|---|---|---|---|---|
| R-P0-01 | App fermée → appel entrant silencieux (pas de push) | Certain | Critique | Non résolu |
| R-P0-02 | Spam d'appels vers une même plaque (pas de rate limit client) | Moyenne | Haute | Non résolu |
| R-P0-03 | `pg_cron` absent → call_requests jamais expirés en DB | Haute | Moyenne | Non résolu |

### Risques P1 (dégradation UX significative)

| ID | Risque | Probabilité | Impact | Statut |
|---|---|---|---|---|
| R-P1-01 | Quota localStorage dépassé → interactions silencieusement perdues | Moyenne | Haute | Non résolu |
| R-P1-02 | InteractionEngine double-émission → handlers appelés 2-3x | Certain | Haute | Workaround v8 |
| R-P1-03 | iOS micro reste allumé si appel annulé avant acceptation | Rare | Moyenne | Résolu v5 |
| R-P1-04 | Double popup entrant sur multi-appareils | Haute | Haute | Résolu v17 |
| R-P1-05 | Appel en background iOS — audio suspendu après ~30s | Possible | Haute | Non audité |

### Risques P2 (incidents ponctuels)

| ID | Risque | Probabilité | Impact | Statut |
|---|---|---|---|---|
| R-P2-01 | Double `cancelCallRequest` sur double-tap | Faible | Faible | Partiel (_withLock) |
| R-P2-02 | Poll 1s coexiste avec Realtime → consommation batterie inutile | Certain | Faible | Non résolu |
| R-P2-03 | `call-webrtc.js` obsolète crée confusion futurs devs | Certain | Faible | Non résolu |
| R-P2-04 | Fuite pré-track micro si rappel rapide avant acceptation | Possible | Faible | Non résolu |
| R-P2-05 | Qualité audio Agora non monitorée → dégradation silencieuse | Certain | Moyenne | Non résolu |

### Risques sécurité

| ID | Risque | Probabilité | Impact | Statut |
|---|---|---|---|---|
| R-SEC-01 | Usurpation de plaque | Faible | Critique | Résolu (INV-006) |
| R-SEC-02 | Injection payload via broadcast Supabase | Faible | Haute | Partiel — payloads non validés côté récepteur |
| R-SEC-03 | App Certificate Agora exposé | Faible | Critique | Résolu (secrets Supabase) |
| R-SEC-04 | RGPD photos (visages/plaques tiers) si implémenté naïvement | Certain | Critique | Risque futur |
| R-SEC-05 | Abus SOS (fausses urgences — pas de cooldown) | Possible | Haute | Non résolu |

---

## UX

### Navigation

La barre de navigation propose 4 onglets : **Alertes · Messages · Signaler · Activité**.
Un 5ème panneau (Paramètres) est accessible via l'icône dans l'en-tête.

**Problèmes identifiés :**

1. **Appels dans Messages** — L'appel vocal est une fonctionnalité premium et
   différenciante. La noyer dans Messages la dévalorise et crée une confusion
   sur le modèle d'usage.

2. **"Signaler" ouvre Alertes** — `App.navSignaler()` appelle `this.panel('altet')`.
   Le formulaire de signalement n'a pas son propre panneau dédié. Après un signalement,
   l'utilisateur se retrouve dans le panel Alertes sans transition claire.

3. **Badge "Inbox" pointe vers Alertes** — `openInboxBadge()` navigue vers `panelAltet`.
   Un utilisateur qui voit un badge sur l'onglet "Messages" cherche des messages,
   pas des alertes géographiques.

4. **Welcome screen sans aperçu** — Aucune fonctionnalité visible avant connexion.
   Un utilisateur qui découvre l'app n'a aucune raison tangible de créer un compte.

5. **Overlay d'appel sans haut-parleur** — `toggleSpeaker()` est un stub vide.
   Par défaut, iOS route l'audio vers l'écouteur (oreille). L'utilisateur doit
   aller dans le Centre de contrôle pour activer le haut-parleur.

6. **Appel manqué sans trace** — Si B manque un appel, l'overlay s'affiche
   8 secondes (`showMissed`) puis disparaît. Il n'y a pas d'entrée persistante
   dans l'historique, pas de badge, pas de notification système.

7. **Pas de retour haptique sur les boutons critiques** — Accepter / Refuser / Raccrocher
   devraient déclencher une vibration (`navigator.vibrate`) pour confirmer l'action
   sur mobile.

### Flux entrant (B reçoit un appel)

- ✅ Sonnerie bitonale (440+480 Hz) — distinguable
- ✅ Overlay plein écran avec plaque appelant et boutons Accepter/Refuser
- ✅ Timer 30s → CALL_MISSED automatique
- ❌ Pas de notification si app fermée (push absent)
- ❌ Pas d'avatar ou photo véhicule pour identifier visuellement l'appelant
- ❌ Vibration absente sur les boutons Accepter/Refuser

### Flux sortant (A appelle)

- ✅ Overlay "Demande de contact envoyée" avec plaque du destinataire
- ✅ Tonalité de retour d'appel (440 Hz loop)
- ✅ Bouton Annuler
- ❌ Pas d'indication de la progression (ex: "B est en train de répondre…")
- ❌ Pas d'indication si B est "occupé" (en appel) ou "disponible"

### Flux appel en cours

- ✅ Overlay "📞 Appel en cours" avec plaque
- ✅ Bouton Muet, Raccrocher, Message, Réduire
- ✅ Mini-overlay quand minimisé (plaque + raccrocher)
- ❌ Pas d'indicateur de durée d'appel
- ❌ Pas de bouton haut-parleur fonctionnel
- ❌ Pas d'indicateur de qualité réseau / audio

---

## Architecture

### Modules et responsabilités

```
calls.js (CallManager)
  Rôle : orchestration métier des appels (DB, Realtime, états, timers)
  Taille : 788 lignes — limite haute mais acceptable
  Couplages : Supabase, ImmatBus, AudioManager, CallScreen, AgoraCallEngine
  Problème : contient à la fois la logique métier ET les interactions UI
             (_showSentBanner, _showIncomingPopup) — violation SRP partielle

core/call-screen.js (CallScreen)
  Rôle : rendu visuel pur de l'état d'appel
  Taille : 296 lignes — bien dimensionné
  Architecture : correcte — CallScreen ne modifie jamais l'état métier

core/agora-call-engine.js (AgoraCallEngine)
  Rôle : couche audio RTC (Agora SDK)
  Taille : 293 lignes — bien dimensionné
  Architecture : correcte — découplé via ImmatBus

core/interaction-engine.js (InteractionEngine)
  Rôle : stockage et cycle de vie de toutes les interactions
  Taille : 234 lignes
  Problème : stockage localStorage uniquement (voir Faiblesses #3)
  Problème : _emitObd() ré-émet sur ImmatBus avec payload tronqué (voir Faiblesses #2)

core/audio-manager.js (AudioManager)
  Rôle : génération et lecture des sons (WAV en mémoire)
  Architecture : correcte — isolation parfaite
  Mécanisme iOS : unlock via premier geste → play() autorisé sans geste ultérieur

index.html
  Rôle : tout le reste (App, auth, carte, signalements, messages, navigation)
  Taille : >1500 lignes — monolithique
  Problème : App est un objet global avec >100 méthodes — difficulté de maintenance
```

### Bus événementiel — problème structurel

```
_emitCallEvent('CALL_INITIATED', payload)
  → ImmatBus.emit('CALL_INITIATED', payload)         [émission 1]
  → ImmatOrganism.observe('CALL_INITIATED', payload)
      → ImmatOrganism publie sur ImmatBus             [émission 2]
      → InteractionEngine.create() → _emitObd()
          → ImmatOrganism.observe(obd_event, {interactionId, type, flow_id})
              → ImmatOrganism publie sur ImmatBus     [émission 3 — payload différent]
```

Chaque CALL_* déclenche 2 à 3 émissions ImmatBus. Les abonnés doivent
être défensifs (guard `requestId`, dedup par `requestId`) pour ne pas
traiter les émissions secondaires.

### Dépendances de chargement

```
index.html charge dans l'ordre :
  1. call-notification-runtime.js (avant Agora — fix iOS réception)
  2. AgoraRTC_N-4.20.0.js (CDN, async)
  3. calls.js
  4. core/call-debug-panel.js
  5. core/call-screen.js
  ...autres modules core...
```

Le chargement `async` du CDN Agora crée une fenêtre où `window.AgoraRTC`
est undefined. `agora-call-engine.js` gère cela via `_waitForSDK()` (polling
100ms, timeout 8s). Correct mais fragile si le CDN Agora est lent.

---

## Messages

### Implémentation actuelle

Les messages sont gérés via `ImmatMessages` (module non audité dans ce document
car le fichier source n'était pas dans le répertoire `core/`).

**Ce qui est observable depuis index.html :**
- Conversations par plaque (`S.conv`)
- Réception Realtime via canal `chMsg`
- Mode Inbox / Compose dans `ImmatMessages`
- Suppression de conversation (localStorage + marquage deleted)
- Compteur non lus (`S.unreadMsgCount`)

### Manques identifiés

1. **Pas d'accusé de lecture (read receipt)** — L'expéditeur ne sait pas si
   son message a été lu. Absence de `read_at` en DB.

2. **Pas de notification push** — Si B a l'app fermée, le message arrive
   silencieusement. B le découvre à la prochaine ouverture.

3. **Suppression locale uniquement** — `deleteThread` marque les messages
   "deleted" en localStorage. La suppression n'est pas propagée à l'expéditeur
   et les messages restent en DB (conformité RGPD partielle : l'utilisateur
   peut "masquer" mais pas vraiment supprimer ses données).

4. **Pas de chiffrement bout-en-bout** — Les messages sont stockés en clair
   dans Supabase. Les administrateurs de la base ont accès aux conversations.
   Pour une app véhicule, les messages peuvent contenir des informations
   de localisation implicites.

5. **Historique limité** — `ImmatMessages` charge les messages depuis
   localStorage (`ic_deleted_msgs`) et probablement Supabase. La politique
   de rétention n'est pas documentée dans le code source audité.

6. **Pas de réponses rapides (quick replies)** — `App.quickReply(t)` existe
   mais est déclenché uniquement depuis les alertes véhicule, pas depuis
   l'overlay d'appel manqué.

---

## Appels

### Flux complet (état production)

**Appel sortant (A) :**
1. `contactByCall(plate, uid)` — dans geste utilisateur
2. Pré-capture micro iOS (`__preMicTrackPromise`)
3. Lookup `profiles` si `uid` inconnu
4. `requestCall(plate, receiverId)`
5. `INSERT call_requests {status:'pending', expires_at: +30s}`
6. `CALL_INITIATED` → `showOutgoing()` + tonalité sortante
7. Canal signal créé (`ch:requestId`)

**Appel entrant (B) :**
1. `postgres_changes INSERT` sur `call_requests WHERE receiver_id = uid`
2. `_showIncomingPopup(row)` — guard `_seenIncomingCallIds`
3. `CALL_RECEIVED` → `showIncoming()` + sonnerie
4. Timer `_missedTimers.set(requestId, setTimeout(_onMissed, msUntilExpiry))`

**Acceptation (B) :**
1. `_accept()` dans geste → pré-capture micro iOS
2. `acceptCall(requestId)` → `UPDATE {status:'accepted'}`
3. Recherche plaque appelant (`_incomingCallPlate` ou DB)
4. `CALL_ACCEPTED` → `showAccepted()` des deux côtés
5. `AgoraCallEngine.joinCall(requestId)` — fetch token → join → publish

**Fin d'appel :**
1. Raccrocher → `leaveCall()` + broadcast `HANGUP` + `CALL_ENDED`
2. Partenaire : `user-left` Agora → `CALL_ENDED` → `hide()`
3. `leaveCall()` libère `__preMicTrackPromise / __preMicTrack / __preMicStream`

### Manques identifiés

1. **Durée d'appel non mesurée** — Pas de chronomètre visible, pas de durée
   stockée en DB pour l'historique.
2. **Pas d'historique d'appels** — Aucun écran listant les appels passés,
   reçus, manqués avec horodatage et durée.
3. **Haut-parleur non fonctionnel** — `toggleSpeaker()` est un stub.
4. **Qualité audio non monitorée** — Agora SDK expose des événements
   `network-quality`, `connection-state-change` non écoutés.
5. **Pas de reconnexion visible** — Si la connexion Agora coupe et se reconnecte,
   l'utilisateur ne voit rien. L'appel peut sembler "mort" alors qu'il est en
   cours de reconnexion.
6. **Pas de file d'attente** — Si B est en appel et que A appelle, B ne reçoit
   pas de signal "en attente". A attend 30s et obtient un CALL_MISSED.

---

## Inbox

### État actuel

**Inbox n'existe pas** en tant qu'écran dédié.

Le MASTER_PLAN définit Inbox comme une section distincte contenant les interactions
reçues (messages, appels entrants, signalements concernant le véhicule).

Dans l'implémentation actuelle :
- Les messages reçus sont dans `panelMessages` (flux entrant + sortant mélangés)
- Les alertes véhicule arrivent dans `panelAltet` (mélangées aux alertes communautaires)
- Les appels entrants sont gérés via overlay éphémère (0 persistance)
- `openInboxBadge()` navigue vers `panelAltet` — pas une Inbox

### Impact

L'utilisateur B n'a aucun endroit unique pour voir "ce qui m'est destiné".
Les appels manqués disparaissent après 8s d'overlay. Les messages non lus
sont dans le même panneau que les messages envoyés.

### Recommandation

Créer un écran `Inbox` agrégé :
```
Inbox (filtres : Tout | Appels | Messages | Alertes)
├── 📵 Appel manqué de BZ-652-LL · il y a 5 min  [Rappeler] [Message]
├── 💬 Message de BE-521-MM · "Ton clignotant..." · il y a 12 min  [Lire]
└── 🚗 Alerte véhicule · Stationnement gênant · il y a 1h  [Voir]
```

---

## Outbox

### État actuel

**Outbox n'existe pas** en tant qu'écran dédié.

Dans l'implémentation actuelle :
- Les messages envoyés sont dans `panelMessages` (mélangés aux reçus)
- Les appels passés ne sont pas tracés dans une liste
- Les signalements émis sont dans `panelActivite` (partiellement)
- `_pendingCallId` en RAM = seule trace d'un appel sortant en cours

### Impact

L'utilisateur A ne peut pas consulter son historique d'envois. Il ne sait pas
combien de fois il a contacté BZ-652-LL cette semaine, ce qui rend difficile
l'auto-modération et empêche toute gestion d'abus côté client.

### Recommandation

Intégrer dans l'Activity Screen (voir section suivante) plutôt que créer
une Outbox séparée. La distinction Inbox/Outbox est moins pertinente qu'un
fil d'activité chronologique avec filtres directionnels (reçu/envoyé).

---

## Activity

### État actuel

`panelActivite` existe avec un skeleton d'interface :
- 4 catégories : Route · Véhicule · Aide · (Voir tout)
- `App.openActivityCat(cat)` ouvre une catégorie filtrée
- `App.renderActivityFeed()` et `App.renderActivityMain()` sont implémentés
- `App.renderCategoryFeed(cat, tab)` : rendu par catégorie + sous-onglets

Mais : le feed est centré sur les **alertes** (signalements reçus), pas sur
les interactions complètes (messages + appels + signalements émis + reçus).

### Ce qui manque

1. **Appels dans Activity** — Les appels passés, reçus, manqués ne sont pas
   dans le fil d'activité.
2. **Messages dans Activity** — Les messages ne sont pas agrégés dans Activity.
3. **Filtres directionnels** — Pas de distinction "je l'ai envoyé" / "il m'a été envoyé".
4. **Recherche dans Activity** — `InteractionEngine.search()` existe mais n'est pas
   exposé dans l'UI.
5. **Horodatage relatif** — Les entrées devraient afficher "il y a 5 min" pas un timestamp ISO.
6. **Pagination** — Pour les utilisateurs actifs, le feed peut devenir long.
   Pas de pagination ni de lazy loading.

---

## Signalements Route

### Implémentation actuelle

Les signalements de type "route" sont créés via `App.sigStepRoute()`.
Ils sont diffusés sur le canal Realtime `ic_community_live` comme `broadcast 'new_report'`
et stockés en DB dans la table `reports`.

**Champs actuels :** `reason`, `plate`, `latitude`, `longitude`, `created_at`, `reporter_id`

### Manques identifiés

1. **Pas de photo** — Un accident de route sans photo réduit la crédibilité du signalement.

2. **Pas de validation anti-doublon** — Si 5 conducteurs signalent le même accident,
   5 entrées distinctes sont créées. La carte affiche 5 marqueurs au même endroit.
   `alertKey()` existe côté client mais ne fusionne que localement (pas cross-device).

3. **Pas d'expiration automatique** — Un signalement de route reste actif jusqu'à
   sa suppression manuelle. Un "embouteillage" d'il y a 6h reste visible.
   `ttlFor()` calcule le TTL côté client mais ne supprime pas en DB.

4. **Pas de confirmation communautaire** — Pas de bouton "Confirmer" pour valider
   un signalement existant (ex: "J'ai aussi vu cet accident"). Système de votes absent.

5. **Pas de résolution** — Une fois l'accident dégagé, l'utilisateur peut
   `resolve` mais il n'y a pas de notification aux conducteurs qui avaient
   signalé le même incident.

6. **Catégories insuffisantes** — Les types de signalements route actuels
   ne couvrent pas : déversement de matières, objet sur la chaussée, faune,
   chantier temporaire, bison futé (bouchons prévisibles).

---

## Signalements Stationnement

### Spécificité du domaine

Le signalement de stationnement est fondamentalement différent du signalement route :
- La cible est un **propriétaire absent** (pas un conducteur qui passe)
- L'urgence peut varier de faible (gêne mineure) à absolue (enfant en véhicule)
- La résolution passe souvent par un appel ou un message direct au propriétaire

### Implémentation actuelle

`App.sigStepVehicle()` déclenche le formulaire véhicule.
Les alertes véhicule sont diffusées via `broadcast 'vehicle_alert'`
avec `{target_plate, sender_plate, label, urgent}`.

La réception côté propriétaire affiche un `showFloatingCard` avec deux actions :
"Vu" et "Répondre" (→ ouvre une conversation avec l'expéditeur).

### Manques identifiés

1. **Pas de niveaux d'urgence différenciés** — Un `urgent: true/false` binaire
   ne suffit pas. Les niveaux requis :
   - `LOW` — Lumières oubliées, stationnement légèrement gênant
   - `MEDIUM` — Stationnement bloquant, pneu crevé visible
   - `HIGH` — Alarme déclenchée, dommage visible
   - `CRITICAL` — Animal en véhicule (chaleur), enfant seul
   - `ABSOLUTE` — Urgence vitale → afficher 15/17/18 EN PREMIER

2. **Pas de flow URGENCE VITALE** — Pour un enfant ou animal en véhicule,
   l'app devrait afficher immédiatement les numéros d'urgence (15, 17, 18)
   AVANT de permettre le signalement ImmatConnect. C'est une obligation éthique.

3. **Pas d'escalade automatique** — Si le propriétaire ne répond pas dans
   5 minutes à un signalement CRITICAL, l'app devrait suggérer d'appeler
   les secours.

4. **Pas de photo** — Impossible de prouver l'état du véhicule (vitre cassée,
   fumée, etc.) sans photo.

5. **Résolution non synchronisée** — Quand le propriétaire revient et déplace
   son véhicule, le signalement reste actif chez les autres conducteurs jusqu'à
   l'expiration TTL ou une action manuelle.

6. **Vérification de plaque** — N'importe qui peut signaler n'importe quelle
   plaque. Il n'y a pas de vérification que la plaque cible existe dans le système.
   Un utilisateur malveillant peut harceler un propriétaire via des faux signalements.

---

## Dashboard

### Dashboard Gardien (technique)

8 voyants de santé en temps réel :

| Voyant | Ce qu'il vérifie |
|---|---|
| `auth` | Session Supabase + utilisateur connecté |
| `db` | Latence lecture table `profiles` |
| `messages` | Canal Realtime `chMsg` actif |
| `calls` | CallManager initialisé + canal signal |
| `agora` | SDK Agora chargé + `joinCall` status + lastError |
| `guardian` | Module guardian chargé |
| `cache` | `CACHE_NAME` SW réseau vs caches.keys() |
| `supabase` | Edge Functions disponibles |

**Global Verification Center :** 8 sections d'audit automatique (app / dashboard /
messages / calls / audio / webrtc / cache / supabase).

### Manques dashboard technique

1. **Call State Integrity** — Pas de voyant/bloc dédié à l'état de l'appel en cours :
   `requestId`, mode `CallScreen`, `plate`, `signalChannel`, `missedTimers`, etc.

2. **Qualité audio Agora** — `packet_loss`, `latency`, `jitter` disponibles via SDK
   mais non collectés ni affichés.

3. **Erreur Agora détaillée** — `AgoraCallEngine.getRuntimeState().lastError` existe
   mais n'est pas intégré au Dashboard Gardien comme voyant distinct.

4. **Taille localStorage** — Pas de métriques sur l'utilisation du quota
   (`ic_interactions`, `ic_notifications`, `ic_alerts`, etc.).

### Dashboard métier (absent)

Le MASTER_PLAN mentionne un "Dashboard métier" (section 14).
Il n'existe pas. Les métriques utiles pour le propriétaire du produit seraient :

- Appels passés / reçus / manqués / acceptés (par jour/semaine)
- Taux d'acceptation des appels
- Signalements créés / résolus
- Messages envoyés / reçus
- Utilisateurs actifs (DAU/MAU)
- Quota Agora utilisé (minutes RTC)
- Erreurs Edge Function (`get-agora-token` failures)

Ces métriques ne peuvent être produites que via Supabase Analytics ou un outil tiers
(ex: PostHog, Plausible) — non intégré.

---

## OBD

### Qu'est-ce que l'OBD dans ImmatConnect ?

"OBD" (On-Board Diagnostics) est utilisé dans ce projet comme métaphore pour
l'observabilité interne des interactions, non comme protocole automobile réel.

`ImmatOrganism` collecte des événements OBD. `InteractionEngine._emitObd()` publie
un événement OBD pour chaque interaction créée.

### Fichiers OBD

```
core/obdGateway.js         — gateway OBD
core/obdSession.js         — session OBD
core/diagnostic/obd-report.js      — rapport OBD
core/diagnostic/claude-obd-gateway.js — gateway IA
core/diagnostic/diagnostic-adapter.js
core/diagnostic/bus-bridge.js
core/diagnostic/diagnostic-inbox.js
core/diagnostic/path-registry.js
core/diagnostic/source-tracer.js
```

### Observations

1. **Infrastructure présente, usage limité** — L'infrastructure OBD est riche
   mais son usage concret dans l'UI est difficile à identifier. Les événements
   OBD semblent surtout utilisés pour le logging et le dashboard technique.

2. **Couplage OBD ↔ ImmatBus** — `_emitObd()` passe par `ImmatOrganism.observe()`
   qui re-publie sur ImmatBus. Ce couplage crée les émissions multiples décrites
   dans les Faiblesses (voir #2).

3. **Pas de métriques OBD exposées à l'utilisateur** — Le vrai OBD automobile
   (consommation, km, vitesse) n'est pas implémenté. Le `panelDrive` (Dashboard
   Drive) est prévu dans la navigation mais son contenu n'a pas été audité ici.

4. **`core/invariants.js`** — Ce fichier centralise probablement les invariants
   INV-xxx référencés dans le code. Son contenu n'a pas été audité dans ce document.

---

## Sécurité

### Points forts

- **Plaque immuable** (INV-006) : `owner_plate` est en lecture seule après création.
  Impossible de voler l'identité d'un autre conducteur.
- **App Certificate Agora côté serveur** : Le secret `AGORA_APP_CERTIFICATE` est dans
  les secrets Supabase, jamais exposé au client. Les tokens sont générés HMAC-SHA256
  côté Edge Function.
- **RLS Supabase** : Les call_requests sont filtrées par `requester_id` / `receiver_id`.
  La requête `.eq('receiver_id', _uid)` est systématique dans les queries poll.
- **JWT Bearer sur Edge Function** : `get-agora-token` requiert un JWT Supabase valide.
  Un utilisateur non authentifié ne peut pas obtenir de token Agora.
- **BLOCK_ALL / BLOCK_CALLS** : Mécanisme de blocage côté client avec persistance localStorage.

### Points faibles

1. **Blocage côté client uniquement** — `_isCallBlocked()` vérifie localStorage.
   Si l'utilisateur vide son cache, les blocages sont perdus. Un utilisateur bloqué
   pourrait appeler si B change d'appareil. Les blocages devraient être persistés en DB.

2. **Payloads broadcast non validés** — Les événements Supabase broadcast reçus
   (`CANCEL`, `HANGUP`, `new_report`, `vehicle_alert`) sont traités sans validation
   de schema. Un attaquant ayant accès à l'anon key Supabase pourrait injecter des
   événements broadcast malveillants (ex: `CANCEL` factice pour couper un appel en cours).

3. **Anon key dans le client** — `sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ`
   est visible dans `calls.js`. C'est normal pour une anon key Supabase (publique par
   conception), mais combiné avec la faiblesse #2, elle représente une surface d'attaque
   pour les broadcasts malveillants.

4. **Pas de validation côté serveur des signalements** — N'importe quel utilisateur
   authentifié peut envoyer un signalement `vehicle_alert` à n'importe quelle plaque.
   Il n'y a pas de vérification que la plaque cible est un utilisateur actif de l'app.

5. **Pas de rate limiting sur les signalements** — Un utilisateur malveillant peut
   spammer les alertes véhicule vers une plaque cible.

6. **Pas de signature des messages broadcast** — Un broadcast `CANCEL` ne contient
   que `{requestId}`. N'importe qui avec l'anon key peut envoyer un CANCEL sur
   n'importe quel canal signal s'il connaît le format de nommage des canaux.

---

## Anti-abus

### Mécanismes actuels

| Mécanisme | Implémentation | Couverture |
|---|---|---|
| Blocage d'appels | `_isCallBlocked()` localStorage | Client seul — non persisté en DB |
| BLOCK_ALL / BLOCK_CALLS | `ic_block_levels` localStorage | Client seul |
| Filtre BLOCK_ALL dans getHistory | `InteractionEngine.getHistory()` | localStorage |
| RLS call_requests | `.eq('requester_id', _uid)` | Serveur |
| Guard spam_limit | `error.message.includes('spam_limit')` | Indique une RLS en place |

### Manques identifiés

1. **Rate limit appels non implémenté côté client** — `_isCallBlocked()` ne vérifie
   pas la fréquence des appels. Un utilisateur peut appeler la même plaque 100 fois
   de suite (même si RLS `spam_limit` bloque côté serveur, l'UX est dégradée).

2. **Cooldown SOS absent** — Aucun délai minimum entre deux signalements SOS.
   Un utilisateur malveillant peut spammer les alertes SOS vers la communauté.

3. **Signalement d'abus de contact absent** — Il n'y a pas de bouton "Signaler
   ce contact" dans le fil de conversation. L'utilisateur ne peut que bloquer,
   pas signaler à une modération.

4. **Validation de plaque minimale** — Le format FR (AB-123-CD) est normalisé
   à l'input, mais aucune vérification que la plaque correspond à un véhicule
   réel (base SIV). N'importe quelle chaîne formatée est acceptée.

5. **Faux profils** — Un utilisateur peut créer un compte avec une plaque inventée
   et envoyer des messages/signalements depuis cette identité.

6. **Blocages non synchronisés entre appareils** — Si B bloque A sur son iPhone,
   le blocage n'est pas actif sur son iPad (localStorage différent).

7. **Pas de système de réputation** — Trust Engine prévu dans le MASTER_PLAN
   mais non implémenté. Pas de score, pas d'historique de fiabilité des signalements.

---

## Multi-appareils

### État actuel

| Donnée | Stockage | Comportement multi-appareils |
|---|---|---|
| Session auth | Supabase (JWT) | ✅ Cross-device via Supabase Auth |
| call_requests | Supabase DB | ✅ Cross-device |
| Signalements | Supabase DB | ✅ Cross-device |
| Messages | Supabase DB + localStorage | ⚠️ DB synchronisé, cache local non |
| Interactions | localStorage | ❌ Non cross-device |
| Blocages | localStorage | ❌ Non cross-device |
| `_pendingCallId` | RAM | ❌ Perdu si l'app se ferme |
| `_seenIncomingCallIds` | RAM (Set) | ❌ Perdu si l'app se ferme |

### Bug multi-appareils résolu (v17)

Si B a deux appareils connectés simultanément, les deux recevaient le INSERT
`call_request` via postgres_changes et appelaient `_showIncomingPopup()`.
Fix : guard `_seenIncomingCallIds` + debounce reconnect Realtime.

### Problème résiduel

Si B accepte l'appel sur l'appareil 1, l'appareil 2 affiche encore l'overlay
entrant (sonnerie active). Il n'y a pas de mécanisme "appel pris sur un autre
de mes appareils" → ferme l'overlay sur tous les autres appareils.

### Recommandation

```
call_requests : ajouter colonne accepted_device_id
Lors de acceptCall() : UPDATE { accepted_device_id: myDeviceId }
Autres appareils de B : postgres_changes UPDATE → si accepted_device_id != myDeviceId → hide()
```

Un `device_id` unique persistant (UUID stocké en localStorage) doit être
assigné à chaque appareil au premier démarrage.

---

## Évolutivité

### Scalabilité technique

**Supabase Realtime** — Le canal `ic_community_live` (alertes communautaires)
est un canal unique partagé. À grande échelle (>1000 utilisateurs simultanés dans
une même zone), tous reçoivent tous les broadcasts. Pas de géo-partitionnement
des canaux broadcast.

**Appels vocaux** — Agora RTC gère la scalabilité audio (cloud distribué).
La limite du plan gratuit est 10 000 min/mois (~166h). Au-delà, facturation
à la minute. Pas d'alerte ni de monitoring de consommation.

**localStorage** — InteractionEngine limite à 200 interactions. Pour un utilisateur
très actif, l'historique se tronque silencieusement. Aucune migration vers DB prévue.

**pg_cron (absent)** — Sans nettoyage serveur des `call_requests` expirés et des
`reports` anciens, la table grossit indéfiniment. Sur Supabase free tier (500 MB),
cela peut devenir un problème en 6-12 mois d'usage intensif.

### Scalabilité fonctionnelle

**Ajout de nouveaux types d'interaction** — `TYPE_META` dans `InteractionEngine`
est extensible. L'ajout d'un nouveau type nécessite : une entrée dans `TYPE_META`,
un handler dans `calls.js` ou le module concerné, et potentiellement un écran dédié.

**Ajout de nouveaux canaux Realtime** — L'architecture actuelle crée un canal par
appel (`ch:requestId`). Pour 100 appels simultanés, 100 canaux Supabase. La limite
Supabase free est 200 canaux simultanés → risque à >200 utilisateurs actifs.

**Modules CSS** — Le CSS est dans `index.html` (monolithique). Ajouter des features
UX (haut-parleur, historique d'appels, Inbox) requiert d'éditer le CSS inline,
ce qui complique les revues de code.

---

## Recommandations

### Recommandation 1 — Résoudre la cause racine InteractionEngine (P1)

Corriger `_emitObd()` pour ne pas publier sur ImmatBus avec un payload
qui écrase les events CALL_*. Option A : ne plus passer par ImmatOrganism
pour les CALL_* events. Option B : inclure `requestId` dans le payload OBD
si l'interaction en source en contient un.

### Recommandation 2 — Implémenter les notifications push (P0)

Sans push, ImmatConnect ne peut pas être l'outil principal de communication
entre conducteurs. Un appel manqué sans notification système = adoption bloquée.
Priorité absolue côté iOS.

### Recommandation 3 — Séparer Appels de Messages dans la navigation (P1)

Créer un onglet "Appels" distinct avec :
- Historique (manqués / reçus / passés)
- Badge rouge pour appels manqués
- Bouton "Rappeler" sur chaque entrée
- Durée affichée pour les appels terminés

### Recommandation 4 — Bouton Urgence 🚨 distinct (P0 éthique)

Pour les cas enfant/animal en véhicule, afficher 15 / 17 / 18 avant
tout formulaire ImmatConnect. C'est une obligation morale, pas un choix UX.

### Recommandation 5 — Persister les blocages en DB (P1)

`BLOCK_CALLS` / `BLOCK_ALL` doivent être dans Supabase pour être
cross-device et résistants à la suppression du cache.

### Recommandation 6 — Ajouter `pg_cron` pour le nettoyage DB (P2)

Expirer les `call_requests` et archiver les `reports` anciens côté serveur.
Évite la croissance indéfinie des tables et les requêtes sur entrées périmées.

### Recommandation 7 — Supprimer `core/call-webrtc.js` (P3)

Le fichier est obsolète (remplacé par Agora). Sa présence crée de la confusion.
Le supprimer réduit le bruit pour les futurs développeurs.

### Recommandation 8 — Haut-parleur Agora (P2)

`AgoraRTC.createMicrophoneAudioTrack` et `setAudioOutput` sont disponibles.
Explorer `HTMLAudioElement.setSinkId()` pour router vers le haut-parleur.
Afficher "Non supporté sur cet appareil" si l'API est absente plutôt qu'un stub.

### Recommandation 9 — Indicateur qualité réseau Agora (P2)

Abonner `_client.on('network-quality', ...)` dans `agora-call-engine.js`.
Afficher un indicateur (🟢🟡🔴) dans l'overlay d'appel.

### Recommandation 10 — `device_id` unique par appareil (P1)

UUID persisté en localStorage. Requis pour les recommandations multi-appareils
(anti-double popup, "appel pris sur autre appareil", blocages cross-device).

---

## Roadmap

### Sprint 1 — Fondamentaux UX manquants (2 semaines)

| Tâche | Fichiers touchés | Priorité |
|---|---|---|
| Onglet "Appels" séparé de Messages | `index.html`, `calls.js` | P0 |
| Historique d'appels (manqués/reçus/passés) | `calls.js`, `index.html` | P0 |
| Badge persistant "appel manqué" | `index.html`, `calls.js` | P0 |
| Bouton 🚨 Urgence → 15/17/18 | `index.html` | P0 éthique |
| Bouton haut-parleur (Agora / setSinkId) | `core/agora-call-engine.js`, `core/call-screen.js` | P1 |
| Retour haptique boutons Accepter/Refuser/Raccrocher | `core/call-screen.js` | P2 |
| Supprimer `core/call-webrtc.js` | suppression fichier | P3 |

### Sprint 2 — Sécurité et anti-abus (2 semaines)

| Tâche | Fichiers touchés | Priorité |
|---|---|---|
| Persister blocages en DB Supabase | `calls.js`, migration DB | P1 |
| Rate limit appels côté client (3/10min) | `calls.js` | P1 |
| Cooldown SOS (5 min) | `index.html` | P1 |
| Bouton "Signaler ce contact" | `index.html`, `core/interaction-engine.js` | P2 |
| Validation broadcast Supabase (schema check) | `calls.js` | P2 |
| `pg_cron` nettoyage call_requests expirés | migration Supabase | P2 |
| `device_id` unique par appareil | `calls.js`, `index.html` | P1 |

### Sprint 3 — Notifications push et photos (3 semaines)

| Tâche | Fichiers touchés | Priorité |
|---|---|---|
| Push notifications SW (`push` event) | `service-worker.js` | P0 |
| Supabase Web Push (VAPID) | config Supabase | P0 |
| APNs iOS (certificat Apple) | config Apple Developer | P0 |
| FCM Android | config Firebase | P0 |
| Actions "Accepter/Refuser" dans la notif | `service-worker.js` | P1 |
| Photos signalements (Storage + compression) | `index.html`, Edge Function | P1 |
| Alerte RGPD avant upload photo | `index.html` | P1 |
| Accusé de lecture messages (read_at DB) | `index.html`, migration DB | P2 |

### Sprint 4 — Architecture et scalabilité (4 semaines)

| Tâche | Fichiers touchés | Priorité |
|---|---|---|
| Corriger cause racine `_emitObd()` InteractionEngine | `core/interaction-engine.js` | P1 |
| Activity Screen unifiée (remplace Inbox/Outbox) | `index.html` | P1 |
| Migration interactions localStorage → Supabase | `core/interaction-engine.js`, migration DB | P2 |
| Indicateur qualité réseau Agora | `core/agora-call-engine.js`, `core/call-screen.js` | P2 |
| Chronomètre durée d'appel | `core/call-screen.js`, `calls.js` | P2 |
| Cycle de vie signalement complet | `index.html`, migration DB | P2 |
| Géo-partitionnement canaux Realtime | `index.html` | P3 |
| Dashboard métier (métriques usage) | nouveau fichier `core/analytics.js` | P3 |

---

## Priorités P0 / P1 / P2

### P0 — Bloquants pour l'adoption

| ID | Description | Impact |
|---|---|---|
| P0-01 | Notifications push (app fermée = appel perdu) | Critique — frein adoption |
| P0-02 | Onglet "Appels" séparé de Messages | Haute — valeur produit masquée |
| P0-03 | Historique appels manqués | Haute — perte d'information |
| P0-04 | Bouton Urgence 🚨 → 15/17/18 | Critique — obligation éthique/légale |

### P1 — Dégradation UX significative

| ID | Description | Impact |
|---|---|---|
| P1-01 | Corriger cause racine `_emitObd()` (double émission) | Haute — dette technique |
| P1-02 | Persister blocages en DB Supabase | Haute — sécurité |
| P1-03 | Rate limit appels côté client | Haute — anti-spam |
| P1-04 | `device_id` unique + "appel pris sur autre appareil" | Haute — multi-appareils |
| P1-05 | Bouton haut-parleur fonctionnel | Moyenne — UX appel |
| P1-06 | Photos sur signalements | Moyenne — crédibilité |

### P2 — Améliorations souhaitables

| ID | Description | Impact |
|---|---|---|
| P2-01 | Cooldown SOS | Moyenne — anti-abus |
| P2-02 | Signalement d'abus de contact | Moyenne — modération |
| P2-03 | Indicateur qualité réseau Agora | Moyenne — UX appel |
| P2-04 | Chronomètre durée d'appel | Faible — UX appel |
| P2-05 | `pg_cron` nettoyage DB | Faible — scalabilité |
| P2-06 | Supprimer `core/call-webrtc.js` | Faible — maintenance |
| P2-07 | Retour haptique boutons critiques | Faible — UX mobile |
| P2-08 | Accusé de lecture messages | Faible — UX messaging |

---

## Questions ouvertes

**Q1 — Architecture notification push**
Quel provider push choisir ? Options : (A) Supabase Web Push natif (VAPID),
(B) Firebase FCM (cross-platform, meilleur support Android), (C) les deux.
APNs iOS requiert un compte Apple Developer payant ($99/an) et un certificat.
Y a-t-il déjà un compte Apple Developer actif ?

**Q2 — RGPD et photos**
Les photos de signalements peuvent contenir des visages et des plaques tiers.
Y a-t-il un DPO (Data Protection Officer) ou un conseil juridique pour valider
la politique de traitement des photos avant implémentation ?

**Q3 — Validation plaque SIV**
L'API SIV (Service d'Immatriculation des Véhicules) est-elle accessible
via un partenaire homologué ? Sans SIV, la vérification de plaque reste
purement syntaxique — des plaques inventées sont acceptées.

**Q4 — Modèle économique et quota Agora**
Le quota gratuit Agora est de 10 000 min/mois. À combien d'utilisateurs
actifs ce quota sera-t-il dépassé ? Quel est le plan de facturation prévu
(Agora facture ~0.99$/1000 min au-delà du free tier) ?

**Q5 — Signalements en zone blanche**
Les signalements utilisent la géolocalisation en temps réel. Si l'utilisateur
est dans une zone sans réseau, l'app tente `syncOfflineReports()` au retour
en ligne. Mais les appels vocaux ne fonctionnent pas hors réseau — l'app
gère-t-elle la distinction "signalement offline OK, appel offline impossible" ?

**Q6 — Propriété des données conversations**
Si un utilisateur supprime son compte, que deviennent les conversations
avec d'autres utilisateurs ? Les messages de l'utilisateur supprimé
restent-ils visibles pour l'autre partie ?

**Q7 — Déploiement Edge Function**
L'Edge Function `get-agora-token` est déployée manuellement via Supabase Editor.
Est-ce que le CI/CD (GitHub Actions) déploie automatiquement les nouvelles
versions ? Si non, un changement de code dans `supabase/functions/` sans
redéploiement manuel ne prendra pas effet.

**Q8 — Accessibilité réglementaire**
Si ImmatConnect Pro est distribué sur l'App Store ou le Play Store,
les exigences WCAG 2.1 AA s'appliquent (loi française RGAA, EN 301 549 européenne).
Un audit d'accessibilité formalisé est-il prévu avant la publication ?

**Q9 — Trust Engine — modèle de confiance**
Le MASTER_PLAN mentionne un Trust Engine. Quel est le modèle de confiance
envisagé ? (A) auto-évaluation, (B) notation croisée conducteurs,
(C) validation par signalements vérifiés, (D) autre ? Sans définition claire
du modèle, l'implémentation sera difficile à cadrer.

**Q10 — Gestion des grands parkings**
Le MASTER_PLAN mentionne "Gestion grands parkings" (section 12).
Dans un parking de 1000 places, comment ImmatConnect aide-t-il à retrouver
un conducteur gênant sans GPS précis (signal GPS dégradé en sous-sol) ?
L'approche technique (QR code de place, beacon BLE, numéro de place manuel)
n'est pas définie.

---

*Fin de l'audit — Document créé par IA indépendante — 2026-06-13*
*Ce document est une annexe au MASTER_PLAN et ne le remplace pas.*
*Il doit être mis à jour à chaque changement architectural majeur.*
