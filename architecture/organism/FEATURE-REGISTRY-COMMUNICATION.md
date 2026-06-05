# Registre Communication Engine — ImmatConnect Pro

> **SESSION OBD-002b** — Inventaire des composants du moteur de communication
>
> Ces composants DOIVENT être déclarés dans `knowledge/features.json`
> avant implémentation (règle `NO_ORPHAN_FEATURE`).
> Ce registre sert de liste d'attente pré-déclaration.

---

## Statut des composants

| Composant | Feature associée | Statut | Phase |
|-----------|-----------------|--------|-------|
| ConversationEngine | F-MESSAGES | ✅ déclaré | Phase 1 actif |
| CallLifecycleManager | F-APPEL | ✅ déclaré | Phase 1 (contact req.) |
| BlockManager | F-MESSAGES | ✅ déclaré (INV-010) | Phase 1 actif |
| NotificationManager | F-ACTIVITE | ✅ déclaré | Phase 1 actif |
| TrustManager | F-MESSAGES | 🟡 partiel | Phase 2 |
| ContextPermissionManager | F-APPEL | 🟡 partiel | Phase 2 |
| PresenceManager | F-CARTE | 🟡 partiel | Phase 1 (invisible) |
| PushManager | F-ACTIVITE | 🟡 partiel | Phase 2 |
| OfflineCommunicationQueue | F-MESSAGES | 🔴 non déclaré | Phase 2 |
| ReputationEngine | F-MESSAGES | 🔴 non déclaré | Phase 3 |
| CommunicationInbox | F-ACTIVITE | ✅ déclaré | Phase 1 actif |
| CommunicationHealthScore | — | 🔴 non déclaré | Phase 3 |
| EmergencyLayer | F-SOS + F-APPEL | 🟡 partiel | Phase 2 |
| CallTransportLayer | F-APPEL | 🔴 non déclaré (WebRTC) | Phase B |
| DeviceManager | — | 🔴 non déclaré | Phase 3 |
| ConflictResolutionPolicy | F-MESSAGES | 🔴 non déclaré | Phase 3 |

**Légende** :
- ✅ `déclaré` = présent dans features.json + flow + organe + invariant
- 🟡 `partiel` = fonctionnalité présente mais pas de feature dédiée séparée
- 🔴 `non déclaré` = à créer — doit d'abord être déclaré dans features.json

---

## Composants déclarés (Phase 1 — actifs)

### ConversationEngine (→ F-MESSAGES)
Gère les conversations directes conducteur à conducteur par plaque.
- **Code** : `messages.js` (ImmatMessages module)
- **Flow** : FLOW-DIRECT-MESSAGE
- **OBD** : `MSG_SENT`, `VEHICLE_MESSAGE_SENT`
- **Invariants** : INV-001, INV-004, INV-010

### CallLifecycleManager (→ F-APPEL)
Gère le cycle de vie des demandes de contact (Phase A = call_requests, Phase B = WebRTC).
- **Code** : `calls.js` (CallManager module)
- **Flow** : FLOW-CALL-REQUEST
- **OBD** : `CALL_INITIATED`, `CALL_ACCEPTED`, `CALL_REFUSED`, `CALL_CANCELLED`, `CALL_RECEIVED`
- **Invariants** : INV-010

### BlockManager (→ F-MESSAGES, INV-010)
Blocage bilatéral — ic_blocked localStorage.
- **Code** : `index.html` (`App.blockPlate`, `App.unblockPlate`)
- **Invariants** : INV-010

### NotificationManager / CommunicationInbox (→ F-ACTIVITE)
Badges non-lus, filtres Tout/Messages/Alertes.
- **Code** : `index.html` (`App.updateActBadge`, `App.renderActivityFeed`)
- **Flow** : FLOW-BADGES
- **OBD** : `BADGE_RECOMPUTED`

---

## Composants à créer (Phase 2)

### TrustManager
Réseau de confiance conducteur → conducteur.
> Avant implémentation : créer `F-TRUST` dans `knowledge/features.json`.

Concept (SESSION précédente) :
- Premier appel accepté = confiance permanente
- Autorisation contextuelle liée à la durée de l'alerte + 30 min
- `trust_delta` via `signalFeedback()`

### ContextPermissionManager
Autorisation contextuelle liée aux alertes actives.
> Avant implémentation : créer `F-CONTEXT-PERMISSIONS` dans `knowledge/features.json`.

### OfflineCommunicationQueue
File d'attente messages hors-ligne (ic_offline_reports existe pour alertes).
> Avant implémentation : créer `F-OFFLINE-MSGS` dans `knowledge/features.json`.

### CallTransportLayer (WebRTC — Phase B)
Couche transport audio P2P.
> Avant implémentation : mettre à jour `F-APPEL.note` et créer `F-WEBRTC-CALL`.

---

## Règle d'ajout

```bash
# 1. Déclarer dans features.json
#    id, nom, organe, description, intentions[], flows[], statut

# 2. Ajouter flow dans IMMAT-FLOW-INDEX.json

# 3. Implémenter

# 4. Vérifier
node scripts/detect-orphan-chain.js --check   # 0 HIGH requis
node scripts/detect-orphan-features.js --check # 0 HIGH requis

# 5. Mettre à jour ce registre
```

---

## Score actuel (SESSION OBD-002b)

```
ORGANISM_COHERENCE_SCORE : 83% — ATTENTION
Features déclarées       : 11
Findings HIGH            : 0
Findings MEDIUM          : 0
Findings LOW             : 11 (tests manquants — informatif)
```

*Mis à jour — SESSION OBD-002b — 2026-06-04*
