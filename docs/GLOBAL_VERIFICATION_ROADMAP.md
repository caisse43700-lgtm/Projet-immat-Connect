# ImmatConnect Pro — Global Verification Roadmap

Module : `core/global-verification-center.js`
Point d'entrée UI : Dashboard Gardien → bouton **Global**
Lecture seule — aucune écriture DB, aucun appel lancé, aucun message envoyé.

---

## Check 1 — Démarrage app

Vérifie que les modules fondamentaux sont initialisés au chargement de la page.

| Vérification | Attendu | Source |
|---|---|---|
| `window.App` présent | présent | DOM chargé |
| `window.ImmatBus` présent | présent | core/bus.js |
| Client Supabase (`window.sb`) présent | présent | ui.js |
| Auth UID connue | oui | CallManager.getRuntimeState() |
| Plaque connue | non nulle | CallManager.getRuntimeState().myPlate |

**Résultat OK :** App, Bus, Supabase, auth et plaque tous disponibles.
**Résultat Critique :** Un module manquant bloque toutes les fonctionnalités.

---

## Check 2 — Dashboard Gardien

Vérifie que l'interface du dashboard et ses outils de diagnostic sont accessibles.

| Vérification | Attendu | Source |
|---|---|---|
| `#gardienDashboard` dans le DOM | présent | index.html |
| `#gardienDashboardBody` dans le DOM | présent | index.html |
| `GuardianDashboardSummary` chargé | présent | guardian-dashboard-summary.js |
| `GuardianSummaryEngine` chargé | présent | guardian-summary-engine.js |
| Boutons Diagnostic/Copier injectés | présents | après ouverture dashboard |

**Résultat OK :** Dashboard et moteurs de diagnostic disponibles.
**Note :** Les boutons n'apparaissent qu'après avoir ouvert le dashboard.

---

## Check 3 — Messages

Vérifie que le module de messagerie est opérationnel.

| Vérification | Attendu | Source |
|---|---|---|
| `window.ImmatMessages` présent | présent | messages.js |
| `ImmatMessagesRuntimeDiagnostics` présent | présent | messages-runtime-diagnostics.js |
| `#icMessagesPro` dans le DOM | présent | index.html |
| `#icMsgList` dans le DOM | présent | index.html |
| `ImmatMessages.sendToPlate` disponible | fonction | messages.js |

**Résultat OK :** Envoi de messages possible via plaque.
**Résultat Attention :** `#icMessagesPro` absent = onglet Messages pas encore ouvert.

---

## Check 4 — Appels contact

Vérifie le cycle complet de demande de contact (vocal via Agora).

| Vérification | Attendu | Source |
|---|---|---|
| `window.CallManager` présent | présent | calls.js |
| `window.CallScreen` présent | présent | call-screen.js |
| Realtime Supabase | SUBSCRIBED | CallManager.getRuntimeState() |
| `window.AgoraCallEngine` présent | présent | agora-call-engine.js |
| `window.AgoraRTC` SDK chargé | présent | CDN download.agora.io |

**Résultat OK :** Appels vocaux Agora disponibles, Realtime actif.
**Résultat Critique :** Realtime non SUBSCRIBED = appels impossibles.

---

## Check 5 — Audio actuel

Vérifie les capacités audio disponibles (sonneries + voix).

| Vérification | Attendu | Source |
|---|---|---|
| `window.AudioManager` présent | présent | audio-manager.js |
| Contexte WebAudio | running | AudioManager.getRuntimeState() |
| Ringtone prête | oui | AudioManager.getRuntimeState() |
| `navigator.mediaDevices.getUserMedia` | disponible | navigateur |

**Note importante :**
- **Audio ringtone** (sonnerie entrante/sortante) → géré par `AudioManager`
- **Audio voix bidirectionnel** (appel vocal) → géré par `AgoraCallEngine`
- Ces deux systèmes sont indépendants.

**iOS Safari :** Le contexte audio doit être débloqué par un tap utilisateur.
`getUserMedia` = accès micro = nécessite HTTPS + tap + autorisation Safari.

---

## Check 6 — WebRTC / Agora

Évalue les capacités de communication vocale disponibles.

| Vérification | Résultat attendu |
|---|---|
| `navigator.mediaDevices.getUserMedia` | PRÉSENT |
| `window.RTCPeerConnection` | PRÉSENT (API native) |
| `window.AgoraRTC` (SDK Agora) | PRÉSENT |
| `window.AgoraCallEngine` (moteur) | PRÉSENT |
| Canal Agora actif (`isJoined`) | non (idle) hors appel |
| Stratégie voix | Agora RTC (remplace WebRTC natif) |

**Clarification :**
L'app utilise **Agora RTC** (fiable iOS/Android) à la place de WebRTC natif.
WebRTC natif (RTCPeerConnection) est présent dans le navigateur mais **non utilisé**.
`getUserMedia` est utilisé par Agora pour capturer le micro.

---

## Check 7 — Cache / Service Worker

Vérifie que la version en production est bien la dernière.

| Vérification | Attendu | Source |
|---|---|---|
| HTTPS actif | oui | location.protocol |
| Service Worker supporté | oui | navigator.serviceWorker |
| Service Worker actif | oui | navigator.serviceWorker.controller |
| Marqueur URL | présent | location.search |
| Visibilité page | visible | document.visibilityState |

**Risque cache :** Sans marqueur URL (ex: `?v=agora1`), une ancienne version peut être servie.
**Version cache SW :** `immatconnect-pro-v12` (Agora intégré).

---

## Check 8 — Statut global

Agrégation de tous les checks en un seul statut avec cause principale.

| Statut | Signification |
|---|---|
| 🟢 OK | Tous les modules fonctionnels |
| 🟠 Attention | Au moins un module non critique dégradé |
| 🔴 Critique | Au moins un module critique défaillant |

**Rapport copiable :**
Le bouton **Global** dans le Dashboard Gardien affiche le rapport complet.
Un sous-panel "Voir rapport ingénieur" contient la version texte copiable.

---

## Architecture du module

```
window.GlobalVerificationCenter.run()
  → checkApp()           sync
  → checkDashboard()     sync
  → checkMessages()      sync
  → checkCalls()         sync
  → checkAudio()         sync
  → checkWebRTC()        sync
  → checkCache()         sync
  → checkSupabase()      async (auth.getUser)
  → agrège statuts
  → produit rapport texte
  → retourne { globalStatus, sections, topIssues, recommendedActions, report }
```

---

## Invariants

- Lecture seule stricte — aucune écriture DB
- Aucun appel lancé, aucun message envoyé
- Aucune modification de l'état métier
- Aucun changement Supabase sans validation utilisateur
