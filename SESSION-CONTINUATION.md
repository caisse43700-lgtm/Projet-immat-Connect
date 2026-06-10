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

## PROCHAINE ACTION — TEST TERRAIN

GitHub Pages à jour après PR #285 + #286 mergées.

URL de test :
```
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?v=agora1
```

Checklist :
```text
□ Recharger les deux téléphones (vider le cache si besoin)
□ A (BZ-652-LL) appelle B (BE-521-MM)
□ B accepte
□ Les deux voient "📞 Appel en cours"
□ Popup micro apparaît sur iOS → Autoriser
□ Audio bidirectionnel (A entend B, B entend A)
□ Bouton Muet fonctionne
□ Bouton Raccrocher coupe le canal
□ Rappel immédiat possible (pas de pending fantôme)
```

### En cas de problème audio

1. Ouvrir Guardian Dashboard → Diagnostic → vérifier voyant **Agora** (🟢 OK ?)
2. Vérifier que le popup micro a bien été accepté (iOS Réglages → Safari → Micro)
3. Console Safari : Menu → Avancé → Web Inspector → chercher `[AgoraCall]`

---

## HISTORIQUE COMPLET DES PR MERGÉES

| PR | Branche | Objet | Date |
|---|---|---|---|
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
