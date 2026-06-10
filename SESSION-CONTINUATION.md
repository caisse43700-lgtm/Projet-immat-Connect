# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour l'état de production `main`.

## ÉTAT PRODUCTION — 2026-06-10

```text
Dépôt                 : caisse43700-lgtm/Projet-immat-Connect
Branche production     : main — servie par GitHub Pages
URL terrain            : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Branche en cours       : feature/agora-voice-calls
```

## CE QUI A ÉTÉ FAIT DANS CETTE SESSION

### Intégration Agora.io (appel vocal) — branche feature/agora-voice-calls

**Pourquoi Agora ?**
WebRTC natif échoue sur iOS Safari (pas de popup micro, coupure après 5-10s).
Agora RTC est fiable sur iOS/Android/Desktop sans configuration ICE/STUN/TURN.
Modèle gratuit : 10 000 min/mois (~166h d'appels).

**App ID Agora** : `4771f029e9c6446e872a598870bb74f3` (public par conception)
**App Certificate** : À configurer dans secrets Supabase (`AGORA_APP_CERTIFICATE`) — JAMAIS dans le code.

### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `core/agora-call-engine.js` | Nouveau — moteur Agora, remplace call-webrtc.js |
| `supabase/functions/get-agora-token/index.ts` | Nouveau — génère le token RTC côté serveur |
| `core/call-screen.js` | Modifié — boutons Muet/Raccrocher en mode accepté |
| `index.html` | Modifié — charge Agora SDK + agora-call-engine.js |
| `service-worker.js` | Modifié — v12, cache Agora SDK |

### Comment ça fonctionne

```text
A appelle B →
B accepte →
calls.js émet CALL_ACCEPTED { requestId, plate, _src }
ImmatBus distribue l'événement aux deux téléphones

AgoraCallEngine (abonné à ImmatBus) :
  → reçoit CALL_ACCEPTED
  → fetchToken(channelName=requestId, uid=random) depuis Edge Function
  → si AGORA_APP_CERTIFICATE configuré → token signé
  → sinon → token null (App ID only mode, OK par défaut Agora)
  → client.join(APP_ID, channelName, token, uid)
  → createMicrophoneAudioTrack + publish
  → subscribe to remote user → play()

CallScreen :
  → affiche "📞 Appel en cours"
  → boutons : Muet | Raccrocher | 💬 Message | Fermer
  → Raccrocher → AgoraCallEngine.leaveCall() + hide()
  → Muet → AgoraCallEngine.toggleMute()
```

### Testing mode (défaut, pas de certificate requis)

Par défaut, un projet Agora est en mode "App ID only" (pas de certificate).
Le token est `null` → `client.join(APP_ID, channel, null, uid)` fonctionne.
Activer App Certificate = sécurité renforcée, nécessite le déploiement de l'Edge Function.

## PROCHAINES ACTIONS

### 1. Déployer l'Edge Function `get-agora-token` (optionnel pour test)

Dans Supabase Dashboard → Edge Functions → New Function → copier le contenu de :
`supabase/functions/get-agora-token/index.ts`

Pas obligatoire pour les premiers tests (le client tombe en mode null si l'endpoint échoue).

### 2. Créer la PR feature/agora-voice-calls → main

La branche `feature/agora-voice-calls` est prête.
Merger dans `main` déploie sur GitHub Pages.

### 3. Test terrain

URL de test après merge :
```
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?v=agora1
```

Vérifier :
- A appelle B
- B accepte
- Les deux voient "📞 Appel en cours"
- Le popup micro apparaît sur iOS (Agora demande le micro au bon moment)
- L'audio est bidirectionnel
- Bouton Muet fonctionne
- Bouton Raccrocher coupe le canal Agora

### 4. Si App Certificate voulu (sécurité)

1. Agora console → Default Project → Configure → Security → activer App Certificate
2. Copier le certificate
3. Supabase Dashboard → Settings → Edge Functions → Secrets → ajouter `AGORA_APP_CERTIFICATE`
4. Déployer l'Edge Function `get-agora-token`
5. Les tokens seront automatiquement générés

## Correctifs production récents sur `main`

| Commit | Objet | Statut |
|---|---|---|
| `de35c060` | Supprime l'ouverture automatique conversation dans `calls.js` sur accepted | déployé |
| `a7f6d5f7` | `core/call-screen.js` : accepted doit afficher Message/Fermer | déployé |
| `f9088541` | Nettoie les anciens `pending` avant nouvel appel + retry 23505 | déployé |
| PR Guardian | Boutons Diagnostic/Copier dans header Dashboard Gardien | déployé |

## Invariants

```text
ANTHROPIC_API_KEY → jamais dans le code
AGORA_APP_CERTIFICATE → jamais dans le code, toujours secrets Supabase
owner_plate → immutable (INV-006)
pas de DELETE sans consentement (INV-COM-009)
payload anonymisé, pas de contenu message dans Edge Functions (INV-COM-010/015)
main = production GitHub Pages
pas d'ouverture automatique de messages sur accepted
```
