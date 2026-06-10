# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour l'état de production `main`.

## ÉTAT PRODUCTION — 2026-06-10

```text
Dépôt                 : caisse43700-lgtm/Projet-immat-Connect
Branche production     : main — servie par GitHub Pages
URL terrain            : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Tests terrain          : deux iPhone/Safari, BZ-652-LL ↔ BE-521-MM
```

## CE QUI A ÉTÉ FAIT — SESSION 2026-06-10

### 1. Intégration Agora RTC (appels vocaux)

**Pourquoi :** WebRTC natif échoue sur iOS Safari — pas de popup micro, coupure après 5-10s.
Agora RTC est fiable sur iOS/Android/Desktop. 10 000 min/mois gratuites (~166h).

**Branche :** `feature/agora-voice-calls` → mergée dans `main` via PR #285.

#### Fichiers créés

| Fichier | Rôle |
|---|---|
| `core/agora-call-engine.js` | Moteur Agora — rejoint le canal sur CALL_ACCEPTED, gère mute/raccrocher |
| `supabase/functions/get-agora-token/index.ts` | Edge Function — génère le token RTC signé avec App Certificate |

#### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `core/call-screen.js` | Mode accepted : boutons Muet + Raccrocher + requestId conservé, auto-hide désactivé |
| `index.html` | Charge AgoraRTC_N-4.20.0.js (CDN) + agora-call-engine.js |
| `service-worker.js` | v12 — SDK Agora en cache CDN, download.agora.io dans CDN_HOSTS |

#### Déployé côté Supabase

| Élément | Statut |
|---|---|
| Edge Function `get-agora-token` | ✅ Déployée via Supabase Editor |
| Secret `AGORA_APP_CERTIFICATE` | ✅ Configuré (Primary Certificate copié depuis Agora console) |
| Secret `AGORA_APP_ID` | Non nécessaire — valeur publique déjà dans le code client |

### 2. Agora — App ID et Certificate

```text
App ID (public)     : 4771f029e9c6446e872a598870bb74f3
App Certificate     : dans secrets Supabase → AGORA_APP_CERTIFICATE (jamais dans le code)
Projet Agora        : Default Project — console.agora.io
Compte Agora        : connecté via GitHub OAuth
Quota gratuit       : 10 000 min/mois RTC — 0% utilisé au 2026-06-10
```

### 3. Guardian Dashboard Summary (sessions précédentes)

| PR | Objet | Statut |
|---|---|---|
| #277 | Guardian Summary carte compacte | mergée main |
| #278 | Compact card affinée | mergée main |
| #281 | Strip header | mergée main |
| #282 | Header strip visuel | mergée main |
| #283 | Actions-only (boutons Diagnostic/Copier) | mergée main |
| #279 | guardian-summary-engine v1.1 overlay detection | mergée main |

### 4. Correctifs appels (sessions précédentes)

| Commit | Objet | Statut |
|---|---|---|
| `de35c060` | Supprime ouverture automatique conversation sur accepted | déployé main |
| `a7f6d5f7` | call-screen.js : Message/Fermer au lieu de "conversation ouverte" | déployé main |
| `f9088541` | Nettoie pending avant nouvel appel + retry 23505 | déployé main |

## COMMENT ÇA FONCTIONNE — AGORA CALL

```text
A appelle B
  → calls.js émet CALL_INITIATED
  → CallScreen.showOutgoing()

B accepte
  → calls.js émet CALL_ACCEPTED { requestId, plate, _src }
  → ImmatBus distribue aux deux téléphones

AgoraCallEngine (abonné ImmatBus sur les deux téléphones) :
  → reçoit CALL_ACCEPTED
  → POST get-agora-token { channelName: requestId, uid: random }
  → Edge Function vérifie JWT, génère token signé (AGORA_APP_CERTIFICATE)
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

## PROCHAINE ACTION

### Tester les appels vocaux

URL (après merge PR #285) :
```
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?v=agora1
```

Checklist terrain :
```text
□ Recharger les deux téléphones
□ A (BZ-652-LL) appelle B (BE-521-MM)
□ B accepte
□ Les deux voient "📞 Appel en cours"
□ Popup micro apparaît sur iOS → accepter
□ Audio bidirectionnel (A entend B, B entend A)
□ Bouton Muet fonctionne
□ Bouton Raccrocher coupe le canal
□ Rappel immédiat fonctionne (pas de pending fantôme)
```

### Si l'audio ne fonctionne pas

1. Ouvrir Guardian Dashboard → Diagnostic → vérifier `realtime = SUBSCRIBED`
2. Vérifier dans la console Safari (iPhone → Réglages → Safari → Avancé → Web Inspector) les erreurs `[AgoraCall]`
3. Vérifier que le popup micro a bien été accepté

## INVARIANTS

```text
AGORA_APP_CERTIFICATE → jamais dans le code, toujours secrets Supabase ✅
App ID Agora 4771f029e9c6446e872a598870bb74f3 → public par conception, OK dans le client ✅
ANTHROPIC_API_KEY → jamais dans le code ✅
owner_plate → immutable (INV-006) ✅
pas de DELETE sans consentement (INV-COM-009) ✅
payload anonymisé, pas de contenu message dans Edge Functions (INV-COM-010/015) ✅
main = production GitHub Pages ✅
pas d'ouverture automatique de messages sur accepted ✅
```
