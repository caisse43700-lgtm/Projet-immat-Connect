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

**Dernière mise à jour** : 2026-06-10 — SQL spam validé + Phase B WebRTC activée (core/call-webrtc.js) — cache v14

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
SPAM           : RÉSOLU — SQL exécuté Supabase 2026-06-10 (`Success. No rows returned.`)
CACHE          : v14 — service-worker.js + call-webrtc.js ajouté
_pendingCallId : MITIGÉ — _recentOutgoingIds TTL 90s (race condition timer 31s)
PHASE B WebRTC : ACTIVÉE — core/call-webrtc.js — Metered TURN — Supabase Broadcast signaling
```

---

## PREUVE DB — 2026-06-10

SQL exécuté dans Supabase SQL Editor pour désactiver le trigger anti-spam sur `call_requests` :

```sql
create or replace function public.call_request_on_insert()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;
```

Résultat Supabase observé :

```
Success. No rows returned.
```

Conséquence : la limite DB 3 appels / 10 min ne doit plus fausser les tests terrain.

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

**Fix DB :**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE call_requests;
```

**Preuve terrain :** popup "Appel manqué" visible sur écran B après correction DB — 2026-06-09.

---

## TESTS TERRAIN — 2026-06-09/10 (BZ-652-LL ↔ BE-521-MM)

Tests réalisés avec deux appareils réels sur iOS Safari en production.
Branche : `claude/immatconnect-pro-app-dEKGR`

### T1 — Appel multiple bloqué ✅ RÉSOLU + DB VALIDÉE

**Symptôme :** "Trop de demandes. Réessaie dans quelques minutes." après 3 appels en 10 min.

**Cause :** Trigger PostgreSQL `call_request_on_insert()` — anti-spam max 3/10min + cooldown 5min après refus. Check localStorage messages (20 msg/min).

**Correctifs :**
- `messages.js` : suppression check `_checkSpam()` côté frontend
- `migration_disable_call_limits.sql` : trigger remplacé par `return new` (sans limites)
- SQL exécuté manuellement dans Supabase le 2026-06-10

**Preuve :** Supabase SQL Editor → `Success. No rows returned.`

---

### T2 — Caller voit "raccroché" quand receiver accepte ✅ RÉSOLU

**Symptôme :** Quand BE-521-MM décroche, l'overlay de BZ-652-LL disparaît brutalement (mode outgoing → idle sans transition).

**Cause :** Handler UPDATE Realtime côté caller appelait `_hideSentBanner()` → `CallScreen.hide()` immédiatement, sans émettre `CALL_ACCEPTED` sur le bus. `showAccepted()` n'était jamais appelé côté caller.

**Correctifs :**
- Suppression de `_hideSentBanner()` dans le chemin `status='accepted'`
- Émission `CALL_ACCEPTED` vers bus / CallScreen
- Hardening `e7058b4` : pont `ImmatBus.emit` + `ImmatOrganism.observe`
- `_pendingCallId` mitigé par `_recentOutgoingIds` TTL 90s

---

### T3 — Messages s'ouvrent automatiquement dès l'acceptation ✅ RÉSOLU

**Symptôme :** "Dès que je décroche voilà les messages, dès que j'appelle voilà les messages."

**Correctifs :**
- `calls.js` : suppression `actOpenConv()` direct dans `acceptCall()`
- `call-screen.js` : suppression `setTimeout(actOpenConv, 600)` dans `showAccepted()`
- `call-screen.js` : ajout boutons **Message** + **Fermer** dans l'overlay mode `'accepted'`
- L'ouverture conversation doit nécessiter un clic explicite sur **Message**

---

## INCIDENTS ACTIFS

### C2 — Sonnerie iOS à re-tester

Recharger la page sur iOS Safari → recevoir un appel → vérifier que la sonnerie joue.
Console : `AudioManager.getRuntimeState()` → `webAudioContextState` doit être `"running"` après un tap.

---

## PROCHAINE ACTION

1. **Recharger la page** sur les deux appareils (cache v14)
2. **Déployer l'Edge Function** `get-turn-credentials` dans Supabase + ajouter les secrets METERED_TURN_USERNAME / METERED_TURN_CREDENTIAL
3. **Test terrain Phase B** :
   - BZ-652-LL appelle BE-521-MM
   - BE-521-MM accepte → les deux autorisent le micro (popup Safari)
   - Vérifier audio bidirectionnel
   - Console : `CallWebRTC.getRuntimeState()` → `state: "connected"`
4. **Si audio fonctionne** → tester Mute et Speaker
5. **Si audio échoue** → envoyer `CallWebRTC.getRuntimeState()` + `iceState` pour diagnostic

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
