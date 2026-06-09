# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

> Ce fichier est **le seul point d'entrée** pour toute IA reprenant le projet.
> Aucun fichier de diagnostic, d'audit ou de roadmap ne remplace ce fichier.
> Un nouveau fichier créé pour un diagnostic reste une **annexe** — jamais un point d'entrée.

### Protocole obligatoire pour toute IA

```
AVANT de travailler  → lire ce fichier intégralement
PENDANT le travail   → les diagnostics détaillés sont dans leurs annexes (voir §DOCUMENTS)
AVANT de quitter     → mettre à jour ce fichier (état, preuves, prochain test, prochaine action)
```

**Dernière mise à jour** : 2026-06-09 — _recentOutgoingIds (race _pendingCallId) + cache v13 + callFlowBehaviorAutotest

---

## ÉTAT DU PROJET

```
Dépôt          : caisse43700-lgtm/Projet-immat-Connect
Branche active : claude/immatconnect-pro-app-dEKGR
Main           : c20712e — CI GREEN (branche feature en avance sur main)
BUG A          : ARCHIVÉ — mergé PR #269 (5859393) — 2026-06-08
BUG B realtime : RÉSOLU — call_requests ajoutée à supabase_realtime — 2026-06-09
BUG B recovery : RÉSOLU — _recoverIncomingPendingCalls() + polling 5s×12 — 2026-06-09
C1             : CORRECTIF DÉPLOYÉ — en attente de test terrain
C2             : CORRECTIF DÉPLOYÉ — Web Audio API (oscillateurs synthétisés, pas de fichier audio)
T2             : RÉSOLU — 9a239ed + e7058b4 (overlay caller conservé à l'acceptation)
T3             : RÉSOLU — b64f204 (messages non auto-ouverts)
SPAM           : RÉSOLU — messages.js + migration_disable_call_limits.sql (SQL manuel requis)
CACHE          : v13 — service-worker.js + ?v= bumps (calls.js v6, call-screen.js v2...)
_pendingCallId : MITIGÉ — _recentOutgoingIds TTL 90s (race condition timer 31s)
```

---

## HISTORIQUE COMPLET DES CORRECTIFS — SESSION 2026-06-08/09

### BUG A — Erreur 23505 au second appel (ARCHIVÉ)

**Cause racine :**
```
Index UNIQUE partiel : call_requests_unique_pending_idx
  ON call_requests (requester_id, receiver_id) WHERE status='pending'
Aucun code ne faisait UPDATE status='expired' à l'expiration UI (30s)
→ la ligne restait 'pending' en DB
→ le second INSERT violait l'index → erreur 23505
```

**Correctifs (`calls.js`) :**
- `_showSentBanner()` : timeout 31s → UPDATE status='expired' en DB
- `_recoverPendingRequest()` : retour anticipé si expiré → UPDATE status='expired' en DB

**Preuve :** test terrain 2026-06-08 — second appel réussi sans erreur 23505.
**Merge :** PR #269 → main `5859393`.

---

### BUG B — B ne reçoit pas la popup (RÉSOLU)

**Cause racine :**
```
Table call_requests absente de la publication supabase_realtime
→ canal realtime subscribed=true mais aucun event INSERT reçu
→ _showIncomingPopup() jamais appelée
→ aucune popup, aucune sonnerie
```

**Preuve SQL :**
```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Résultat : uniquement 'messages' — call_requests absente
```

**Fix DB :**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE call_requests;
```

**Correctifs code (`calls.js`, `bus.js`) déployés :**

| Correctif | Détail |
|---|---|
| `_recoverIncomingPendingCalls()` | Query receiver_id=uid, status=pending, expires_at>now() — dedup via `_seenIncomingCallIds` |
| Polling 5s×12 (`_startIncomingRecoveryPolling`) | Recovery automatique 60s après init — plus besoin de recharger manuellement |
| `visibilitychange` | Déclenche aussi la recovery entrante au retour au premier plan |
| `_lastSubscribeStatus` tracé | `realtimeStatus` exposé dans `getRuntimeState()` |
| `getRuntimeState()` enrichi | `callOverlayVisible`, `uidKnown`, `seenIncomingCount`, `visibilityState` |
| `bus.js EVENTS` | `CALL_RECEIVED`, `CALL_MISSED`, `CALL_CANCELLED`, `CALL_INITIATED` ajoutés |

**Preuve terrain :** popup "Appel manqué" visible sur écran B après correction DB — 2026-06-09.

---

### C1 — BZ-652-LL ne peut pas émettre d'appel (CORRECTIF DÉPLOYÉ)

**Cause racine :**
```
vehicleContextAction() applique nPlate() qui supprime les tirets :
  BE-521-MM → BE521MM
contactByCall() cherche en DB : eq('owner_plate', 'BE521MM')
DB contient : owner_plate = 'BE-521-MM' → NO MATCH → "Conducteur introuvable"
```

**Correctif (`calls.js` — `contactByCall`) :**
```js
let { data } = await _sb.from('profiles').select('id').eq('owner_plate', plate).maybeSingle();
if (!data) {
    const withDashes = plate.replace(/[\s-]/g,'').replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/i,'$1-$2-$3');
    if (withDashes !== plate) {
        ({ data } = await _sb.from('profiles').select('id').eq('owner_plate', withDashes).maybeSingle());
    }
}
```

**Statut :** déployé sur main `c20712e` — **test terrain requis**.

---

### C2 — Sonnerie iOS (CORRECTIF DÉPLOYÉ)

**Cause :** éléments `<audio>` sans `src` → `_play()` retournait false immédiatement ; AudioContext suspendu sans geste utilisateur.

**Correctifs (`core/audio-manager.js` — Phase 7+) :**
- `_getCtx()` : création lazy de l'AudioContext
- `_synth(freq, durationSec, startSec)` : oscillateur + enveloppe de gain
- `_ringOnce()` : pattern ring-ring (880Hz + 1100Hz harmonique × 2 doubles bips)
- `_outgoingBeep()` : bip sortant unique 660Hz
- `playIncomingRingtone()` : essaie `<audio src>` d'abord, puis synthèse + `setInterval(_ringOnce, 2600)`
- `unlockFromUserGesture()` : appelle `ctx.resume()` sur premier clic/touchstart
- `stopCallAudio()` : arrête `_ringingInterval` + éléments `<audio>`
- `getRuntimeState()` : ajout `webAudioContextState`, `synthAvailable`

**Statut :** déployé — **test terrain requis** (vérifier que la sonnerie joue sur iOS Safari).

---

### C3 — Pas de son après décrochage (HORS SCOPE)

L'appel ImmatConnect est une **demande de contact**, pas un appel VoIP.
Accepter → ouvre la conversation messages. Aucun canal audio prévu en Phase 1.

---

## TESTS TERRAIN — 2026-06-09 (BZ-652-LL ↔ BE-521-MM)

Tests réalisés avec deux appareils réels sur iOS Safari en production.
Branche : `claude/immatconnect-pro-app-dEKGR`

### T1 — Appel multiple bloqué ✅ RÉSOLU
**Symptôme :** "Trop de demandes. Réessaie dans quelques minutes." après 3 appels en 10 min.
**Cause :** Trigger PostgreSQL `call_request_on_insert()` — anti-spam max 3/10min + cooldown 5min après refus. Check localStorage messages (20 msg/min).
**Correctifs :**
- `messages.js` : suppression check `_checkSpam()` côté frontend
- `migration_disable_call_limits.sql` : trigger remplacé par `return new` (sans limites)
- **Action requise :** exécuter ce SQL dans Supabase → SQL Editor :
```sql
create or replace function public.call_request_on_insert()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;
```
**Commits :** `d6ec808`

---

### T2 — Caller voit "raccroché" quand receiver accepte ✅ RÉSOLU
**Symptôme :** Quand BE-521-MM décroche, l'overlay de BZ-652-LL disparaît brutalement (mode outgoing → idle sans transition).
**Cause :** Handler UPDATE Realtime côté caller appelait `_hideSentBanner()` → `CallScreen.hide()` immédiatement, sans émettre `CALL_ACCEPTED` sur le bus. `showAccepted()` n'était jamais appelé côté caller.
**Correctif (`calls.js` — handler `requester_id=eq.uid`) :**
- Suppression de `_hideSentBanner()` dans le chemin `status='accepted'`
- Émission `ImmatOrganism.observe('CALL_ACCEPTED', ...)` → bus → `CallScreen.showAccepted()`
- Fallback legacy (sans CallScreen) conservé
**Commit :** `9a239ed`

---

### T3 — Messages s'ouvrent automatiquement dès l'acceptation ✅ RÉSOLU
**Symptôme :** "Dès que je décroche voilà les messages, dès que j'appelle voilà les messages."
**Cause (receiver) :** `acceptCall()` appelait `window.App?.actOpenConv?.(plate)` directement → conversation ouverte AVANT l'overlay "Contact accepté".
**Cause (caller) :** `showAccepted()` avait un `setTimeout(actOpenConv, 600)` → ouverture automatique 600ms après.
**Correctifs :**
- `calls.js` : suppression `actOpenConv()` direct dans `acceptCall()`
- `call-screen.js` : suppression `setTimeout(actOpenConv, 600)` dans `showAccepted()`
- `call-screen.js` : ajout boutons **Message** + **Fermer** dans l'overlay mode `'accepted'`
- `call-screen.js` : auto-hide accepted : 2 500ms → 10 000ms
**Commit :** `b64f204`

---

### T4 — Bip sortant silencieux sur iOS ✅ RÉSOLU (code review)
**Symptôme :** Aucun son quand BZ-652-LL initie un appel sur iOS Safari.
**Cause :** `playOutgoingTone()` condition `ctx.state !== 'suspended'` → inversée. Sur iOS, AudioContext démarre suspendu → condition false → ni beep ni `ctx.resume()`.
**Correctif (`core/audio-manager.js`) :** alignement sur le pattern de `playIncomingRingtone()` avec `ctx.resume().then(...)`.
**Commit :** `17385f2`

---

### T5 — Fuite d'interval sonnerie (race condition) ✅ RÉSOLU (code review)
**Symptôme :** Sonnerie pouvant continuer en boucle après annulation si `stopCallAudio()` appelé pendant `ctx.resume()` en cours.
**Cause :** Le callback `.then()` de `ctx.resume()` créait `_ringingInterval` sans vérifier si la sonnerie avait été annulée entre temps.
**Correctif (`core/audio-manager.js`) :** Guard `if (_currentlyPlaying !== null) return` dans les callbacks `.then()`.
**Commit :** `17385f2`

---

### T6 — Dead code mode 'incall' ✅ RÉSOLU (code review)
**Symptôme :** `_hangupFromMini()` ne pouvait pas déclencher `_hangupIncall()` — branche morte.
**Cause :** `_state.mode === 'incall'` jamais assigné (modes réels : idle/incoming/outgoing/accepted/missed/expired).
**Correctif (`core/call-screen.js`) :** Suppression de la branche `'incall'` dans `toggleMute()` et `_hangupFromMini()`.
**Commit :** `17385f2`

---

### T7 — CALL_ACCEPTED non émis côté caller (wiring manquant) ✅ RÉSOLU (audit)
**Symptôme :** CallScreen côté appelant n'affichait pas "Contact accepté" — overlay restait en 'outgoing' sans transition.
**Cause :** `_showIncomingPopup()` et `_showSentBanner()` ne déclenchaient pas les méthodes CallScreen directement. Le bus ImmatBus gérait le routing mais le handler UPDATE Realtime n'émettait pas `CALL_ACCEPTED`.
**Correctif :** voir T2.

---

### T8 — audioBlocked check incorrect (audit autotest) ✅ RÉSOLU
**Symptôme :** `callsAutotest()` signalait `audioBlocked: true` même quand la synthèse Web Audio fonctionnait.
**Cause :** Check basé sur `incomingRingtoneReady` (présence fichier `<audio src>`) au lieu de `synthAvailable`.
**Correctif (`core/mobile-autotest.js`) :** `audioBlocked = !(amState.synthAvailable || amState.incomingRingtoneReady)`.
**Commit :** `0b91115`

---

### T9 — Limites spam trop strictes pour les tests ✅ RÉSOLU
**Symptôme :** Impossible de tester rapidement — erreur après 3 appels en 10 min.
**Cause :** Trigger DB + check localStorage messages.
**Correctif :** voir T1.

---

## AUDIT CORRECTIFS — 2026-06-09

### Corrections apportées (branch `claude/immatconnect-pro-app-dEKGR`)

| Fichier | Correction | Statut |
|---|---|---|
| `core/call-screen.js` | `showIncoming()` appelle `AudioManager.playIncomingRingtone()` | ✅ |
| `core/call-screen.js` | `showOutgoing()` appelle `AudioManager.playOutgoingTone()` | ✅ |
| `core/call-screen.js` | `hide()` appelle `AudioManager.stopCallAudio('CallScreen.hide')` | ✅ |
| `core/call-screen.js` | `showAccepted()` → "Contact accepté", auto-hide 2.5s, pas de timer | ✅ |
| `core/call-screen.js` | Texte UX : "Demande de contact" / "Demande de contact envoyée…" | ✅ |
| `calls.js` | Fallback legacy `_showIncomingPopup()` appelle `AudioManager.playIncomingRingtone()` | ✅ |
| `calls.js` | Expiry timeout legacy appelle `AudioManager.stopCallAudio()` | ✅ |
| `service-worker.js` | CACHE_NAME `v12` — `audio-manager.js` + `call-screen.js` ajoutés | ✅ |
| `tests.js` | Suite 21 — AU-01 à AU-15 — 177/177 pass | ✅ |

---

## INCIDENTS ACTIFS

### Action DB requise — Spam limit appels
Exécuter `migration_disable_call_limits.sql` dans **Supabase → SQL Editor** pour désactiver le trigger anti-spam sur `call_requests`. Sans cette étape, la limite 3 appels/10min est toujours active en DB.

### C2 — Sonnerie iOS à re-tester
Recharger la page sur iOS Safari → recevoir un appel → vérifier que la sonnerie joue.
Console : `AudioManager.getRuntimeState()` → `webAudioContextState` doit être `"running"` après un tap.

---

## PROCHAINE ACTION

1. **Recharger la page** sur les deux appareils (cache v13 force le rechargement des JS)
2. **Autotest OBD** dans la console : `ImmatMobileAutotest.run().callFlowBehaviorAutotest` → vérifier `pass: true`
3. **Exécuter le SQL** dans Supabase SQL Editor (`migration_disable_call_limits.sql`) pour désactiver le trigger spam
4. **Re-tester le flux complet** : BZ-652-LL appelle BE-521-MM → BE-521-MM voit l'overlay entrant → accepte → les deux voient "Contact accepté" avec boutons Message/Fermer → taper Message pour ouvrir la conversation
5. **Vérifier sonnerie iOS** après rechargement : `AudioManager.getRuntimeState().webAudioContextState` → `"running"` après un tap

---

## DOCUMENTS DE RÉFÉRENCE

| Document | Rôle | Type |
|---|---|---|
| `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` | Diagnostic INC-001 consolidé | Annexe |
| `docs/CALL_PENDING_EXPIRY_STATIC_ANALYSIS.md` | Analyse statique `calls.js` | Annexe |
| `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md` | Revue externe | Annexe |
| `docs/CALL_SOURCE_OF_TRUTH.md` | États appel documentés | Référence permanente |
| `docs/INTERACTION_LEDGER_REGISTRY.md` | Forme événements IE | Référence permanente |
| `docs/INTERACTION_ORGANISM_MAP.md` | Qui possède quoi | Référence permanente |

---

## ARCHIVES — Incidents résolus

| Incident | Date | Cause racine | Commit |
|---|---|---|---|
| Phases 0–10 + post-merge | 2026-06-08 | Architecture complète — CI green 4/4 | `docs/archives/ARCHIVE_PHASES_0_10.md` |
| BUG A — 23505 second appel | 2026-06-08 | Index UNIQUE pending jamais libéré côté DB | `5859393` |
| BUG B — Popup absente | 2026-06-09 | `call_requests` absente de `supabase_realtime` | Fix DB + `9ed6847` |
| C2 — Sonnerie iOS | 2026-06-09 | `<audio>` sans src + AudioContext suspendu | Web Audio API synthesis |
| T1 — Spam limit trop stricte | 2026-06-09 | Trigger DB 3/10min + localStorage 20 msg/min | `d6ec808` + SQL migration |
| T2 — Caller voit raccroché | 2026-06-09 | Handler UPDATE ne lançait pas CALL_ACCEPTED sur bus | `9a239ed` |
| T3 — Messages auto-ouverts | 2026-06-09 | `actOpenConv()` appelé direct dans `acceptCall()` + `showAccepted()` | `b64f204` |
| T4 — Bip sortant iOS silencieux | 2026-06-09 | Condition `!== 'suspended'` inversée dans `playOutgoingTone()` | `17385f2` |
| T5 — Fuite interval sonnerie | 2026-06-09 | Promise `.then()` sans guard si `stopCallAudio()` appelé entre temps | `17385f2` |
| T6 — Dead code 'incall' | 2026-06-09 | Mode jamais assigné dans `toggleMute` + `_hangupFromMini` | `17385f2` |
| T8 — audioBlocked erroné | 2026-06-09 | Check `incomingRingtoneReady` au lieu de `synthAvailable` | `0b91115` |

---

## INVARIANTS — NE JAMAIS VIOLER

```
ANTHROPIC_API_KEY  → jamais dans le code
owner_plate        → immutable (INV-006)
INV-COM-009        → pas de DELETE sans consentement
INV-COM-010/015    → payload anonymisé, pas de contenu message dans Edge Functions
InteractionEngine  → tous appels dans try/catch, non-bloquants
Corrections        → ciblées uniquement, pas de réécriture globale
CI                 → vérifier green avant chaque merge
SESSION_CONTINUATION.md → toujours mis à jour dans le même commit que le code
```
