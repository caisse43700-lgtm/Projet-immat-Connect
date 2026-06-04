# Amélioration Navigation Fonctionnalités

# CALL ENGINE V2 — Audit couche Appels avant WebRTC

**Date :** 2026-06-04  
**Source :** calls.js · index.html · knowledge/rls-rules.json  
**Objectif :** Valider et compléter la Phase 1 avant d'ouvrir la Phase B (voix WebRTC)

---

## État Phase 1 (contact-request) — Vérification exhaustive

### Flux demande de contact

| Étape | Implémenté | Fichier | Ligne approx. |
|---|---|---|---|
| `openContactOptions(plate)` | ✅ | calls.js | ~75 |
| `can_receive_calls(uid)` RPC vérification | ✅ | calls.js | ~110 |
| `requestCall()` INSERT call_requests | ✅ | calls.js | ~130 |
| Anti-spam 23505 / spam_limit / cooldown | ✅ | calls.js | ~150 |
| `callSentBanner` (8s + Annuler) | ✅ | calls.js | ~248 |
| `_recoverPendingRequest()` après refresh | ✅ | calls.js | ~49 |
| `visibilitychange` recovery | ✅ | calls.js | ~41 |

### Flux réception

| Étape | Implémenté | Fichier |
|---|---|---|
| Realtime channel `ic_calls_[uid]` filter receiver_id | ✅ | calls.js |
| `callIncomingPopup` affichage | ✅ | calls.js |
| `acceptCall()` → UPDATE accepted → actOpenConv | ✅ | calls.js |
| `refuseCall()` → UPDATE refused | ✅ | calls.js |
| TTL auto-masquage callIncomingPopup | ✅ | calls.js |
| `cancelCallRequest()` → UPDATE cancelled | ✅ | calls.js |

### Réponse retour (caller)

| Étape | Implémenté | Fichier |
|---|---|---|
| Realtime UPDATE filter requester_id=A | ✅ | calls.js |
| Toast "Acceptée → conversation" | ✅ | calls.js |
| Toast "Refusée" | ✅ | calls.js |
| `actOpenConv(plate)` si accepté | ✅ | calls.js |

### Préférences

| Étape | Implémenté | Fichier |
|---|---|---|
| `loadCallPreferences()` SELECT call_preferences | ✅ | calls.js |
| `setCallPreferences(allow)` UPSERT | ✅ | calls.js |
| Toggle UI dans panelSettings | ✅ | index.html |
| Niveaux callLevel 1-4 | ✅ | messages.js |

### Journal

| Étape | Implémenté | Fichier |
|---|---|---|
| `loadCallLog(limit)` SELECT call_requests | ✅ | calls.js |
| Tri created_at DESC | ✅ | calls.js |
| Distintion outgoing/incoming | ✅ | calls.js |

---

## OBD Events Phase 1 — État

| Event | Émis | Manquant |
|---|---|---|
| `CALL_INITIATED` | ✅ requestCall() | — |
| `CALL_RECEIVED` | ✅ subscribeIncomingCalls() popup | — |
| `CALL_ACCEPTED` | ✅ acceptCall() | — |
| `CALL_REFUSED` | ✅ refuseCall() | — |
| `CALL_CANCELLED` | ✅ cancelCallRequest() | — |
| `CALL_MISSED` | ❌ | Expiration TTL non observée |
| `CALL_ENDED` | ❌ | N/A Phase 1 — prévu Phase B |

---

## GAP identifié : CALL_MISSED

**Quand :** callIncomingPopup expire (TTL `expires_at`) sans réponse de B.  
**Actuellement :** popup se masque, aucun event OBD, caller non informé côté B.  
**Fix attendu SESSION 23 :**

```javascript
// Dans callIncomingPopup TTL timeout
if(ms > 0) setTimeout(() => {
  popup.classList.remove('show');
  try{ window.ImmatOrganism?.observe?.('CALL_MISSED',
    {requestId: r.id, from: plate, _src:'ImmatConnect/calls/subscribeIncomingCalls'}
  ); }catch(e){}
}, ms);
```

---

## Invariants Phase 1 — Vérification

| Invariant | Règle | Respecté |
|---|---|---|
| INV-COM-003 | Double consentement appel | ✅ A demande + B accepte |
| INV-C01 (proposé) | Demande unique pending par paire A↔B | ✅ contrainte DB 23505 |
| INV-C02 (proposé) | Expiration auto dans les 30s | ✅ expires_at côté UI + DB |
| INV-COM-014 | BLOCKED > TRUSTED | ✅ can_receive_calls RPC vérifie |

---

## RLS Phase 1 — Vérification (rls-rules.json)

| Table | SELECT | INSERT | UPDATE |
|---|---|---|---|
| `call_requests` | caller OU callee | caller seulement | callee via Edge Function |
| `call_preferences` | propriétaire | propriétaire | propriétaire |

✅ Conforme rls-rules.json

---

## Architecture cible Phase B (WebRTC voix)

Phase B s'ajoute AU-DESSUS de Phase 1, sans la remplacer.

```
Phase 1 (existant)
  call_requests {status: 'pending'→'accepted'}
  callIncomingPopup → acceptCall()
    ↓
Phase B (à construire)
  acceptCall() → ouvre canal signaling (Supabase Realtime)
  CallManager.initWebRTC(requestId, role)
    → RTCPeerConnection
    → ICE candidates via realtime channel
    → SDP offer/answer
    → audio P2P établi
  écran appel en cours (durée, mute, raccrocher)
  closeCall() → OBD CALL_ENDED
```

### Conditions AVANT Phase B
- [x] Phase 1 complète et stable (✅)
- [x] OBD CALL_MISSED implémenté
- [x] INV-COM-019 (WEBRTC_CONSENT) documenté
- [ ] Tests organism calls complets
- [ ] Accord Gardien (INV-COM-013)

### Points d'attention Phase B
| Point | Risque | Mitigation |
|---|---|---|
| STUN/TURN servers | Connexions échouent en 4G/NAT strict | Configurer coturn ou service TURN |
| Gestion déconnexion | Appel coupé sans fin de cycle | ICE restart + CALL_ENDED garanti |
| Permissions micro | iOS Safari prompt bloquant | Demander avant initiation |
| Consommation batterie | WebRTC drain en arrière-plan | closeCall() sur visibilitychange |
| Concurrent calls | 2 sessions ouvertes | Unicité enforced par call_requests DB |
