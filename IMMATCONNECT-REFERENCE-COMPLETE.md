# Amélioration Navigation Fonctionnalités

# IMMATCONNECT — RÉFÉRENCE ARCHITECTURE COMPLÈTE

**Date :** 2026-06-04  
**Branch :** `claude/immatconnect-pro-app-dEKGR`  
**Tests :** 207/207 ✔

---

## SESSIONS LIVRÉES

| Session | Commit | Tests | Contenu |
|---|---|---|---|
| S23 | `a5e9ade` | 65/65 ✔ | OBD events CALL_MISSED, VEHICLE_MESSAGE_RECEIVED, BLOCK_APPLIED, TRUST_LEVEL_CHANGED, ABUSE_REPORTED |
| S24 | `592318d` | 65/65 ✔ | Trust Engine + Block Engine + Permissions Matrix |
| S25 | `817314e` | 65/65 ✔ | INV-COM-022→028, revokePermanentTrust, TRUST_CONTEXTUAL_EXPIRED |
| Audit Final | `bb88df9` | 37/37 ✔ | V-001→V-007 verrouillés |
| Audit Livraison | `fe58a53` | — | SESSION-AUDIT-LIVRAISON.md |
| S26 | `1e6c7e8` | 21/21 ✔ | AngeAction API (INV-ANGE-004) |
| S26 docs | `8f11bd2` | — | SESSION-26-LIVRAISON.md |
| S27 Phase 1/2 | `11d0dde` | 34/34 ✔ | InteractionEngine create/history/badge |
| S27 docs | `45ae04c` | — | SESSION-27-LIVRAISON.md |
| S27B→F | `f3fb598` | 67/67 ✔ | History/Status/Notify/Search/Analytics + INV-INT-001→008 |
| S27 référence | `7860fdc` | — | SESSION-27-COMPLET-LIVRAISON.md |

---

## FICHIERS CRÉÉS / MODIFIÉS

### Nouveaux fichiers

| Fichier | Session | Rôle |
|---|---|---|
| `core/interaction-engine.js` | S27 | Objet Interaction central |
| `architecture/ANGE-ACTION-SPEC.md` | S25/Audit | Spec AngeAction SESSION 26 |
| `architecture/INTERACTION-ENGINE-SPEC.md` | S25/Audit | Spec InteractionEngine SESSION 27 |
| `architecture/TRUST-ENGINE.md` | S24 | Spec Trust Engine |
| `architecture/BLOCK-ENGINE.md` | S24 | Spec Block Engine |
| `architecture/PERMISSIONS-MATRIX.md` | S24 | Spec Permissions Matrix |
| `tests/organism/permissions-audit.test.js` | Audit | V-001→V-007 — 37 tests |
| `tests/organism/ange-action.test.js` | S26 | ANGE-001→010 — 21 tests |
| `tests/organism/interaction-engine.test.js` | S27 | IE-001→010 — 34 tests |
| `tests/organism/interaction-engine-extended.test.js` | S27B→F | IEX-001→010 — 67 tests |
| `tests/organism/trust-engine.test.js` | S24 | TRUST-001→005 — 17 tests |
| `tests/organism/block-engine.test.js` | S24 | BLOCK-001→004 — 17 tests |
| `tests/organism/call-flow-extended.test.js` | S24 | CALL-006→010 — 31 tests |

### Fichiers modifiés

| Fichier | Changements clés |
|---|---|
| `messages.js` | getBlockLevel, getTrustLevel, setContextTrust, getContextTrust, TRUST_CONTEXTUAL_EXPIRED, revokePermanentTrust, TRUST_CONTEXTUAL_SET OBD, sendToPlate outgoing guard |
| `calls.js` | _missedCallIds Set, _isCallBlocked(), guard requestCall(), isCallBlocked API publique |
| `index.html` | blockPlate(level), unblockPlate, setContextTrust dans actQuickReply/vehicleAlert, AngeAction objet, #angePreview, InteractionEngine chargé |
| `knowledge/communication-invariants.json` | INV-COM-018→028, INV-ANGE-003/004, INV-OBD-001, INV-INT-001→008 |
| `knowledge/immat-knowledge-graph.json` | 30+ invariants indexés, INT-ANGE-ACTION, INT-INTERACTION, features_trust_block, GAP-009/010 résolus |
| `scripts/detect-orphan-features.js` | 15+ nouveaux OBD events dans whitelist |

---

## PERMISSIONS MATRIX — SOURCE UNIQUE

```javascript
// Seules 3 fonctions autorisent/refusent une communication (INV-COM-028)
getBlockLevel(plate)      // messages.js
getTrustLevel(plate)      // messages.js
can_receive_calls()       // calls.js RPC Supabase
```

### Niveaux BLOCK

| Niveau | Messages | Appels |
|---|---|---|
| BLOCK_NONE | ✅ | ✅ |
| BLOCK_MESSAGES | ❌ | ✅ |
| BLOCK_CALLS | ✅ | ❌ |
| BLOCK_ALL | ❌ | ❌ |

### Niveaux TRUST

| Niveau | Description |
|---|---|
| TRUST_NONE | Inconnu |
| TRUST_CONTEXTUAL | Lié à un signalement actif, expire automatiquement |
| TRUST_CONTACT | Contact confirmé (setTrust) |
| TRUST_PERMANENT | Confiance explicite (setTrustPermanent) |

### Règle de priorité (INV-COM-025)

```
BLOCK_ALL > BLOCK_MESSAGES > TRUST_PERMANENT > TRUST_CONTACT > TRUST_CONTEXTUAL
```

---

## ANGEACTION — FLUX OBLIGATOIRE (INV-ANGE-004)

```
prepareInteraction({type, target, context, payload})
  ↓
checkPermissions(target)     ← lecture Permissions Matrix UNIQUEMENT
  ↓
Bloqué ?
  → Oui → _showBlocked() → fin
  → Non → _showPreview() → bouton Confirmer
              ↓
          Validation conducteur (P-008)
              ↓
          execute()
              ↓
          checkPermissions() [re-vérification]
              ↓
          Action métier (sendToPlate / contactByCall / etc.)
              ↓
          OBD ANGE_ACTION_EXECUTED
              ↓
          InteractionEngine.create()
```

### Types supportés

| Type | Action | Guard |
|---|---|---|
| MESSAGE | ImmatMessages.sendToPlate() | canMessage |
| THANKS | ImmatMessages.sendToPlate('🙏 Merci') | canMessage |
| CALL | CallManager.contactByCall() | canCall |
| VEHICLE_ALERT | App.vehicleAlertQuick() | canMessage |
| ROAD_ALERT | App.roadReport() | aucun |
| HELP | App.assist() | aucun |
| SOS | App.sos() | double confirmation humaine |
| TRUST | ImmatMessages.setTrust() | — |
| BLOCK | App.blockPlate() | — |

---

## INTERACTION ENGINE — API COMPLÈTE

```javascript
// Phase 1 — Création
InteractionEngine.create({type, initiator, target, payload, status?, journey_id?, flow_id?, invariants?})
  → Interaction  // ic_interactions + OBD auto

// Phase 2 — Historique
InteractionEngine.getHistory(plate, {limit?, types?, status?})     → Interaction[]
InteractionEngine.getHistoryUnified(plate, opts?)                   → {interactions, unreadCount, lastActivity}
InteractionEngine.notifyPending(plate)                              → number

// 27C — Statuts normalisés
InteractionEngine.updateStatus(id, status)  → boolean
InteractionEngine.resolve(id, status?)      → boolean
InteractionEngine.STATUSES                  // {PENDING, RECEIVED, VIEWED, RESPONDED, ACCEPTED,
                                            //  REJECTED, EXPIRED, RESOLVED, ARCHIVED, CANCELLED, BLOCKED, FAILED}

// 27D — Notifications
InteractionEngine.createNotification({interaction_id, type, plate, message}) → Notification
InteractionEngine.getNotifications({viewed?, limit?, plate?})                → Notification[]
InteractionEngine.markNotificationViewed(id)                                  → boolean
InteractionEngine.getPendingNotificationCount(plate?)                         → number

// 27E — Recherche
InteractionEngine.search({plate?, type?, types?, dateFrom?, dateTo?, status?, organ?, limit?})
  → Interaction[]

// 27F — Analytics
InteractionEngine.getAnalytics(plate?)
  → {total, total_messages, total_calls, total_alerts, total_help, total_sos,
     total_trust, total_blocks, total_abuse, by_type{}, by_status{}}

// OBD
InteractionEngine.observe(interaction)
```

### Storages

| Clé | Contenu | Max |
|---|---|---|
| `ic_interactions` | Interaction[] | 200 |
| `ic_notifications` | Notification[] | 100 |

### TYPE_META — 19 types avec OBD + flow + invariant

| Type | OBD | Flow | Invariant(s) |
|---|---|---|---|
| MESSAGE | MSG_SENT | FLOW-001 | INV-COM-001 |
| THANKS | MSG_SENT | FLOW-001 | INV-COM-001 |
| CALL | CALL_INITIATED | FLOW-008 | INV-COM-003 |
| VEHICLE_ALERT | VEHICLE_MESSAGE_SENT | FLOW-005 | INV-COM-001 |
| ROAD_ALERT | ROAD_CREATED | FLOW-007 | INV-COM-011 |
| HELP | HELP_CREATED | FLOW-003 | INV-COM-005 |
| SOS | SOS_TRIGGERED | FLOW-SOS | INV-COM-014 |
| TRUST | CONTACT_TRUSTED | FLOW-TRUST | INV-COM-018 |
| BLOCK | BLOCK_APPLIED | FLOW-BLOCK | INV-COM-019 |
| ABUSE | ABUSE_REPORTED | FLOW-ABUSE | INV-COM-026 |
| CONTACT_REQUEST | CONTACT_TRUSTED | FLOW-TRUST | INV-COM-018 |
| CONTACT_ACCEPTED | CONTACT_TRUSTED | FLOW-TRUST | INV-COM-018 |
| CONTACT_REJECTED | CONTACT_REVOKED | FLOW-TRUST | INV-COM-018 |
| CALL_REQUEST | CALL_INITIATED | FLOW-008 | INV-COM-003 |
| CALL_ACCEPTED | CALL_ACCEPTED | FLOW-008 | INV-COM-003 |
| CALL_REFUSED | CALL_REFUSED | FLOW-008 | INV-COM-003 |
| CALL_MISSED | CALL_MISSED | FLOW-008 | INV-COM-003 + INV-CALL-001 |
| CALL_CANCELLED | CALL_CANCELLED | FLOW-008 | INV-COM-003 |

---

## TOUS LES INVARIANTS ACTIFS

### INV-COM — Communication

| ID | Règle résumée |
|---|---|
| INV-COM-001 | Toute interaction appartient à 2 plaques |
| INV-COM-003 | Tout appel nécessite une permission valide |
| INV-COM-004 | Un blocage interdit toute communication |
| INV-COM-005 | Une autorisation contextuelle expire automatiquement |
| INV-COM-009 | Pas de suppression physique d'historique |
| INV-COM-010 | Présence ≠ Géolocalisation |
| INV-COM-014 | BLOCKED > TRUSTED — sécurité prime |
| INV-COM-015 | L'Ange n'accède jamais au contenu des messages |
| INV-COM-018 | La confiance est toujours un acte explicite |
| INV-COM-019 | Un blocage possède toujours un périmètre défini |
| INV-COM-020 | Toute décision de confiance est observable OBD |
| INV-COM-021 | Toute décision de blocage est observable OBD |
| INV-COM-022 | Trust contextuel = origine + expiration |
| INV-COM-023 | Trust permanent = acte explicite uniquement |
| INV-COM-024 | Blocage complet = bidirectionnel |
| INV-COM-025 | Blocage > Confiance toujours |
| INV-COM-026 | Abus → état final requis (REVIEWED/DISMISSED/CONFIRMED) |
| INV-COM-027 | Autorisation via Permissions Matrix uniquement |
| INV-COM-028 | Source unique = getBlockLevel + getTrustLevel + can_receive_calls |

### INV-CALL

| ID | Règle résumée |
|---|---|
| INV-CALL-001 | CALL_MISSED unique par requestId (_missedCallIds Set) |

### INV-ANGE

| ID | Règle résumée |
|---|---|
| INV-ANGE-003 | Ange = mêmes règles que actions manuelles |
| INV-ANGE-004 | checkPermissions() OBLIGATOIRE avant toute action Ange |

### INV-OBD

| ID | Règle résumée |
|---|---|
| INV-OBD-001 | Tout OBD event lié à un flow_id + un invariant |

### INV-INT — Interaction (nouveaux S27)

| ID | Règle résumée |
|---|---|
| INV-INT-001 | Toute action conducteur produit une Interaction |
| INV-INT-002 | Toute notification référence une Interaction |
| INV-INT-003 | Toute Interaction possède un statut normalisé |
| INV-INT-004 | Toute Interaction possède un Flow |
| INV-INT-005 | Toute Interaction possède un Invariant |
| INV-INT-006 | Toute Interaction possède un test |
| INV-INT-007 | Toute Interaction observable remonte à l'OBD |
| INV-INT-008 | Toute Interaction est indexée dans le Knowledge Graph |

---

## OBD EVENTS ACTIFS (36/41)

| Event | Source | Invariant |
|---|---|---|
| MSG_SENT | messages.js/sendToPlate | INV-COM-001 |
| MSG_RECEIVED | messages.js/subscribe | INV-COM-001 |
| CALL_INITIATED | calls.js/requestCall | INV-COM-003 |
| CALL_RECEIVED | calls.js/subscribeIncomingCalls | INV-COM-003 |
| CALL_ACCEPTED | calls.js/acceptCall | INV-COM-003 |
| CALL_REFUSED | calls.js/refuseCall | INV-COM-003 |
| CALL_CANCELLED | calls.js/cancelCallRequest | INV-COM-003 |
| CALL_MISSED | calls.js TTL timeout | INV-COM-003 + INV-CALL-001 |
| VEHICLE_MESSAGE_SENT | index.html/driverInfo | INV-COM-001 |
| VEHICLE_MESSAGE_RECEIVED | index.html/subscribeCommunityReports | INV-COM-001 |
| ROAD_CREATED | index.html/roadReport | INV-COM-011 |
| HELP_CREATED | index.html/assist | INV-COM-005 |
| HELP_RESPONDED | index.html/actQuickReply | INV-COM-005 |
| SOS_TRIGGERED | index.html/sos | INV-COM-014 |
| CONTACT_TRUSTED | messages.js/setTrust | INV-COM-018 |
| CONTACT_REVOKED | messages.js/revokePermanentTrust | INV-COM-018 |
| TRUST_LEVEL_CHANGED | messages.js/setCallLevel | INV-COM-018 |
| TRUST_CONTEXTUAL_SET | messages.js/setContextTrust | INV-COM-022 |
| TRUST_CONTEXTUAL_EXPIRED | messages.js/getContextTrust | INV-COM-022 |
| BLOCK_APPLIED | index.html/blockPlate | INV-COM-019 |
| ABUSE_REPORTED | messages.js/_reportAbuse | INV-COM-026 |
| ANGE_QUERIED | index.html/AngeDialog.send | INV-COM-015 |
| ANGE_ACTION_PREPARED | index.html/AngeAction.prepareInteraction | INV-ANGE-004 |
| ANGE_ACTION_EXECUTED | index.html/AngeAction.execute | INV-ANGE-003 |
| CONV_FAVORITED | messages.js/favoriteConv | INV-COM-006 |
| CONV_ARCHIVED | messages.js/archiveConv | INV-COM-006 |
| CONV_DELETED | messages.js/deleteThread | INV-COM-009 |
| CONV_SEARCHED | messages.js/toggleSearch | INV-COM-006 |
| CONV_OPENED | messages.js/openThread | INV-COM-006 |
| CONV_CLOSED | messages.js/closeThread | INV-COM-006 |
| PRESENCE_CHANGED | messages.js/setPresence | INV-COM-010 |
| MAP_SELF_LOCATED | index.html/locate | INV-COM-010 |
| GPS_STARTED | index.html/openGps | — |
| PROFILE_SAVED | index.html/saveProfile | — |
| BADGE_RECOMPUTED | badge.js | — |
| ABUSE_REVIEWED *(réservé)* | GARDIEN | INV-COM-026 |
| CALL_CONNECTED *(réservé)* | WebRTC Phase B | INV-COM-013 |

---

## ÉTAT DU SYSTÈME

| Composant | État | Tests |
|---|---|---|
| Communication Engine | ✅ 100% | inclus dans 207 |
| Trust Engine | ✅ 100% | 17 ✔ |
| Block Engine | ✅ 100% | 17 ✔ |
| Permissions Matrix | ✅ 100% | 37 ✔ |
| OBD (≥80% avec invariant) | ✅ 92% | inclus |
| Knowledge Graph | ✅ ~99% | inclus |
| AngeAction API | ✅ 100% | 21 ✔ |
| Interaction Engine (19 types) | ✅ 100% | 34 ✔ |
| History / Badge unifié (27B) | ✅ 100% | 67 ✔ |
| Status normalisé (27C) | ✅ 100% | 67 ✔ |
| Notification Engine (27D) | ✅ 100% | 67 ✔ |
| Search Engine (27E) | ✅ 100% | 67 ✔ |
| Analytics Engine (27F) | ✅ 100% | 67 ✔ |
| INV-INT-001→008 | ✅ 100% | 67 ✔ |
| **Guardian Loop** | ⏳ SESSION 28 | — |
| **Knowledge Graph V2** | ⏳ SESSION 29 | — |
| **WebRTC Phase B** | ⏳ SESSION 30 | — |

**TOTAL : 207/207 ✔**

---

## SESSIONS RESTANTES

### SESSION 28 — Guardian Intelligence Loop

Objet `Recommendation` :
```javascript
{
  id, severity, category, evidence,
  feature_id, flow_id, invariant_id,
  status, decision, commit
}
```

Boucle :
```
Interaction → Observation → Simulation → Recommendation → Gardien → Validation → Patch → Tests → KG
```

**Règle : le système propose. Le Gardien valide. Jamais automatique.**

### SESSION 29 — Knowledge Graph V2

```
100% — 0 GAP — 0 nœud isolé — 0 orphelin
```

### SESSION 30 — WebRTC Phase B

```
CallManager → InteractionEngine → Supabase Realtime → RTCPeerConnection → Audio P2P
```

Prérequis : SESSION 28 + SESSION 29 terminées.

---

## RÈGLE FONDAMENTALE

Toute nouvelle fonctionnalité doit obligatoirement suivre :

```
Interaction
  ↓ Feature
  ↓ Journey
  ↓ Flow
  ↓ Permissions Matrix
  ↓ OBD (flow_id + invariant)
  ↓ Invariant
  ↓ Test
  ↓ Knowledge Graph
```

**0 dette · 0 orphelin · 0 invisible · 0 divergence**
