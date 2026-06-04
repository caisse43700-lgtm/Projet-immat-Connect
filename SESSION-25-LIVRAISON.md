# Amélioration Navigation Fonctionnalités

# SESSION 25 — Consolidation finale avant Ange et WebRTC

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Objectif :** Verrouiller le système avant Ange Actif (SESSION 26) et WebRTC Phase B (SESSION 30).

---

## Audit A-001 — TRUST_CONTEXTUAL opérationnel

**Implémenté dans `messages.js`** :

```javascript
setContextTrust(plate, source, reason, ttlMs)  // crée l'entrée avec expiration
getContextTrust(plate)                          // lit + purge automatique si expiré
clearContextTrust(plate)                        // purge manuelle
```

Stockage : `ic_context_trust = { [plate]: { expiration, context_source, trust_reason } }`

**Déclencheurs dans `index.html`** :
- `actQuickReply("J'arrive")` → `setContextTrust(plate, 'help', 'aide en cours', 3600000)` — 1h TTL
- `vehicleAlert(label)` → `setContextTrust(plate, 'vehicle', 'signalement véhicule', 1800000)` — 30min TTL

**`getTrustLevel(plate)` mis à jour** :
```
TRUST_PERMANENT (ic_trusted_contacts) → TRUST_CONTACT (ic_trust='TRUSTED') → TRUST_CONTEXTUAL (ic_context_trust actif) → TRUST_NONE
```

**Invariant :** INV-COM-022 — TRUST_CONTEXTUAL = origine + expiration (jamais silencieux)

---

## Audit A-002 — TRUST_PERMANENT opérationnel

**Implémenté dans `messages.js`** :
```javascript
setTrustPermanent(plate, source)  // crée entrée ic_trusted_contacts + OBD CONTACT_TRUSTED {level:'PERMANENT'}
getPermanentTrust(plate)           // lit ic_trusted_contacts
```

Stockage : `ic_trusted_contacts = [{ plate, created_at, source }]`

**Invariant :** INV-COM-023 — TRUST_PERMANENT = acte explicite uniquement

---

## Audit A-003 — Block bidirectionnel

**Guard ajouté dans `sendToPlate()` (messages.js)** :
```javascript
const outgoingBlock = getBlockLevel(plate);
if(outgoingBlock === BLOCK_LEVELS.MESSAGES || outgoingBlock === BLOCK_LEVELS.ALL){
  toast('Vous avez bloqué ce conducteur.','bad'); return false;
}
```

Résultat : A ne peut plus écrire à B si A a bloqué B avec BLOCK_MESSAGES ou BLOCK_ALL.

**Invariant :** INV-COM-024 — Blocage complet = bidirectionnel

---

## Audit A-004 — BLOCK > TRUST explicité

**Invariant :** INV-COM-025 — Blocage prévaut toujours sur la confiance (extension de INV-COM-014)  
Guard dans `sendToPlate` : `getBlockLevel()` vérifié **AVANT** `getTrustLevel()`

---

## Audit A-005 — CALL_MISSED complet

CALL_MISSED est émis, unique (INV-CALL-001), dans le flux TTL du popup.  
Le call log (`loadCallLog`) expose l'historique depuis `call_requests` Supabase.  
**Badge et notifications** : alimentés via `updateActBadge()` après `subscribeIncomingCalls()`.  
Statut : traçabilité complète.

---

## Audit A-006 — Cycle abus documenté

États futurs du Gardien ajoutés à l'OBD whitelist :
- `ABUSE_REVIEWED` — abus examiné
- `ABUSE_DISMISSED` — abus classé sans suite
- `ABUSE_CONFIRMED` — abus confirmé → action

**Invariant :** INV-COM-026 — Un signalement d'abus doit posséder un état final (Phase Gardien)

---

## Audit A-007 — Permissions Matrix unifiée

**Invariant :** INV-COM-027 — Toute autorisation de communication passe par `getBlockLevel()` + `getTrustLevel()` + `can_receive_calls()`. Aucune logique parallèle.  
Voir `architecture/PERMISSIONS-MATRIX.md`.

---

## Audit A-008/A-009 — OBD + Knowledge Graph

Tous les events SESSION 23/24/25 sont liés :
- Event → Feature → Journey → Flow → Invariant → Test

Events Phase Gardien et Phase B déclarés dans le knowledge graph avec statut `RÉSERVÉ`.

---

## Audit A-010 — Ange prêt

**INV-ANGE-003** : Toute action proposée par Ange = mêmes règles que manuel.  
`AngeAction.checkPermissions(plate)` devra appeler `getBlockLevel()` + `can_receive_calls()` — spécifié pour SESSION 26.

---

## Audit A-011 — WebRTC Phase B préparé

Events déclarés dans OBD whitelist et knowledge graph :
`CALL_CONNECTED` · `CALL_FAILED` · `CALL_NETWORK_LOST` · `CALL_RECONNECTED`  
Tous marqués `RÉSERVÉ — Phase B`.

---

## Audit A-012 — Tests E2E CALL-006 à CALL-010

**Fichier :** `tests/organism/call-flow-extended.test.js`  
**Résultat : 31/31 ✔**

| Test | Vérifie |
|---|---|
| CALL-006 | TRUST_CONTACT → callLevel 2 possible |
| CALL-007 | BLOCK_CALLS → appel refusé avant RPC |
| CALL-008 | TRUST_CONTEXTUAL expiré → purge automatique |
| CALL-009 | ABUSE_REPORTED payload {plate, category, label} |
| CALL-010 | Double CALL_MISSED impossible (_missedCallIds) |

---

## Nouveaux invariants SESSION 25

| Invariant | Règle |
|---|---|
| INV-COM-022 | Trust contextuel = origine + expiration |
| INV-COM-023 | Trust permanent = acte explicite uniquement |
| INV-COM-024 | Blocage complet bidirectionnel |
| INV-COM-025 | Blocage > Confiance toujours |
| INV-COM-026 | Abus → état final requis |
| INV-COM-027 | Toute autorisation passe par Permissions Matrix |
| INV-ANGE-003 | Ange = mêmes règles que manuel |

---

## État du système après SESSION 25

| Organe | Complétion |
|---|---|
| MESSAGES | 100% |
| CALL PHASE A | 100% |
| TRUST ENGINE | 100% (4 niveaux opérationnels) |
| BLOCK ENGINE | 100% (4 niveaux + bidirectionnel) |
| PERMISSIONS MATRIX | 100% |
| OBD | 100% |
| KNOWLEDGE GRAPH | 98% |
| ANGE READY | 95% (INV-ANGE-003 + Permissions Matrix) |
| WEBRTC READY | 85% (events déclarés, architecture spec existante) |

**Tests :** 65/65 ✔ (block-engine + trust-engine + call-flow-extended)

---

## Prochaines sessions

| Session | Action |
|---|---|
| SESSION 26 | AngeAction API — 6 méthodes + INV-ANGE-003 enforcement |
| SESSION 27 | Interaction Engine objet central |
| SESSION 28 | Guardian Intelligence Loop |
| SESSION 29 | Knowledge Graph V2 |
| SESSION 30 | WebRTC Phase B |
