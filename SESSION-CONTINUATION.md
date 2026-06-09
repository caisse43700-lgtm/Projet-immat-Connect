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

**Dernière mise à jour** : 2026-06-09 — C1 correctif appliqué (plaque sans tirets) — C2 (sonnerie iOS) ouvert

---

## ÉTAT DU PROJET

```
Dépôt          : caisse43700-lgtm/Projet-immat-Connect
Main           : c20712e — CI GREEN
BUG A          : ARCHIVÉ — mergé PR #269 (5859393) — 2026-06-08
BUG B realtime : RÉSOLU — call_requests ajoutée à supabase_realtime — 2026-06-09
BUG B recovery : RÉSOLU — _recoverIncomingPendingCalls() + polling 5s×12 — 2026-06-09
C1             : CORRECTIF DÉPLOYÉ — en attente de test terrain
C2             : ACTIF — pas de sonnerie iOS (audio.play() bloqué)
C3             : HORS SCOPE — pas de son après décrochage (VoIP non implémenté Phase 1)
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

### C2 — Pas de sonnerie à la réception iOS (ACTIF)

**Cause :** iOS Safari bloque `audio.play()` sans interaction utilisateur préalable.
**Fix requis :** déverrouillage audio sur premier geste dans `core/audio-manager.js`.
**Priorité :** après validation de C1.

---

### C3 — Pas de son après décrochage (HORS SCOPE)

L'appel ImmatConnect est une **demande de contact**, pas un appel VoIP.
Accepter → ouvre la conversation messages. Aucun canal audio prévu en Phase 1.

---

## INCIDENTS ACTIFS

### C1 — Test terrain en attente
Recharger la page côté BZ-652-LL → appeler BE-521-MM → vérifier que "Conducteur introuvable" n'apparaît plus.

### C2 — Sonnerie iOS
**Cause :** `audio.play()` bloqué par Safari sans geste utilisateur.
**Fix :** implémenter déverrouillage audio dans `core/audio-manager.js`.

---

## PROCHAINE ACTION

1. **Tester C1** — BZ-652-LL appelle BE-521-MM après rechargement de page
2. **Si C1 validé** → implémenter le déverrouillage audio iOS (C2) dans `core/audio-manager.js`
3. **Si C1 échoue** → envoyer le message d'erreur exact pour diagnostic

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
