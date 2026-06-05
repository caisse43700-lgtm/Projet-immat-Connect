# Amélioration Navigation Fonctionnalités

# SESSION 23 — Complétion OBD : 6 events manquants

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Objectif :** 0 événement métier non observé — chaque interaction conducteur remonte à l'OBD

---

## Bilan

| Event | Statut avant | Statut après | Fichier | Déclencheur |
|---|---|---|---|---|
| `CALL_MISSED` | ❌ MANQUANT | ✅ Implémenté | `calls.js` | TTL popup entrant expiré sans réponse |
| `VEHICLE_MESSAGE_RECEIVED` | ❌ MANQUANT | ✅ Implémenté | `index.html` | Broadcast `vehicle_alert` reçu |
| `BLOCK_APPLIED` | ❌ MANQUANT | ✅ Implémenté | `index.html` | `blockPlate()` confirmé par conducteur |
| `TRUST_LEVEL_CHANGED` | ❌ MANQUANT | ✅ Implémenté | `messages.js` | `setCallLevel()` niveaux 1-4 |
| `ABUSE_REPORTED` | ❌ MANQUANT | ✅ Implémenté | `messages.js` + `index.html` | `_sheetAction('abuse')` + bouton sheet |
| `CALL_ENDED` | ⚠️ Réservé Phase B | ✅ Whitelist (déjà présent) | — | WebRTC Phase B — aucun code à émettre Phase A |

---

## Détail des modifications

### 1. CALL_MISSED — `calls.js` ligne ~266

**Avant :**
```javascript
if (ms > 0) setTimeout(() => popup.classList.remove('show'), ms);
```

**Après :**
```javascript
if (ms > 0) setTimeout(() => {
  popup.classList.remove('show');
  try{ window.ImmatOrganism?.observe?.('CALL_MISSED',{requestId:req.id,from:plate,_src:'ImmatConnect/calls/subscribeIncomingCalls'}); }catch(e){}
}, ms);
```

**Quand :** Le popup `callIncomingPopup` expire (TTL `expires_at`) sans que B réponde.  
**Payload :** `{requestId, from: plate, _src}`

---

### 2. VEHICLE_MESSAGE_RECEIVED — `index.html` ligne ~978

**Ajouté dans** le handler `vehicle_alert` broadcast de `subscribeCommunityReports()`.  
**Quand :** Un conducteur proche envoie un signalement véhicule qui arrive via Realtime.  
**Payload :** `{from: sender_plate, urgent: bool, _src}`

---

### 3. BLOCK_APPLIED — `index.html` ligne ~989

**Ajouté dans** `blockPlate()`, après `safeSet('ic_blocked', ...)`.  
**Quand :** Un conducteur confirme le blocage d'une plaque.  
**Payload :** `{plate, _src}`

---

### 4. TRUST_LEVEL_CHANGED — `messages.js` ligne ~1079

**Ajouté dans** `setCallLevel()`, après `saveCallSettings()`.  
**Quand :** Un conducteur modifie son niveau de permission d'appel (1-4).  
**Payload :** `{level, _src}`

---

### 5. ABUSE_REPORTED — `messages.js` + `index.html`

**Bouton ajouté** dans `#icBottomSheet` (index.html) :
```html
<button type="button" id="icSheetAbuse" class="ic-sheet-btn danger"
  onclick="ImmatMessages._sheetAction('abuse')">🚨 Signaler un abus</button>
```

**Case ajouté** dans `_sheetAction()` (messages.js) :
```javascript
else if(action === 'abuse') {
  if(!confirm('Signaler un abus de '+plate+' ?')) return;
  try{ window.ImmatOrganism?.observe?.('ABUSE_REPORTED',{plate,_src:'...'}); }catch(e){}
  toast('Abus signalé. Merci pour votre vigilance.','ok');
}
```

**Double confirmation :** confirm() (INV-COM-014 — action irréversible)

---

## Fichiers de connaissance mis à jour

### `scripts/detect-orphan-features.js`

- `icSheetAbuse` ajouté à `knownPanels`
- `TRUST_LEVEL_CHANGED`, `ABUSE_REPORTED`, `BLOCK_APPLIED` ajoutés à `knownObserveEvents`

### `knowledge/communication-invariants.json`

| Invariant | Règle |
|---|---|
| INV-COM-018 (nouveau) | La confiance est toujours un acte explicite conducteur — setCallLevel() uniquement, jamais automatique |
| INV-COM-019 (nouveau) | Un blocage interdit toute communication y compris OBD — BLOCK_APPLIED → loadMsgs() → normalizeRows() filter |

### `knowledge/immat-knowledge-graph.json`

- 5 events ajoutés : `CALL_MISSED`, `VEHICLE_MESSAGE_RECEIVED`, `BLOCK_APPLIED`, `TRUST_LEVEL_CHANGED`, `ABUSE_REPORTED`
- `INT-BLOCK` mis à jour : `obd_events: ["BLOCK_APPLIED"]`, invariants INV-COM-004+014+019
- `INT-TRUST` mis à jour : `obd_events: ["CONTACT_TRUSTED","CONTACT_REVOKED","TRUST_LEVEL_CHANGED"]`
- GAP-005 résolu : `status: "RESOLVED-SESSION-23"`

---

## Couverture OBD finale (27 → 32 events)

| Catégorie | Events | Statut |
|---|---|---|
| Appels Phase A | CALL_INITIATED, CALL_RECEIVED, CALL_ACCEPTED, CALL_REFUSED, CALL_CANCELLED, **CALL_MISSED** | ✅ 6/6 |
| Appels Phase B | CALL_ENDED | ⚠️ Réservé — whitelist uniquement |
| Messages | MSG_SENT, MSG_RECEIVED, CONV_FAVORITED, CONV_ARCHIVED, CONV_DELETED, CONV_SEARCHED, CONV_OPENED, CONV_CLOSED | ✅ 8/8 |
| Signalements | ROAD_CREATED, HELP_CREATED, HELP_RESPONDED, SOS_TRIGGERED, **VEHICLE_MESSAGE_RECEIVED**, VEHICLE_MESSAGE_SENT | ✅ 6/6 |
| Trust / Blocage | CONTACT_TRUSTED, CONTACT_REVOKED, **TRUST_LEVEL_CHANGED**, **BLOCK_APPLIED**, **ABUSE_REPORTED** | ✅ 5/5 |
| Carte / GPS | MAP_SELF_LOCATED, GPS_STARTED, PRESENCE_CHANGED | ✅ 3/3 |
| Profil / Ange | PROFILE_SAVED, BADGE_RECOMPUTED, ANGE_QUERIED | ✅ 3/3 |

**Résultat : 0 événement métier non observé.**

---

## Prochaines sessions (roadmap)

| Session | Action | Priorité |
|---|---|---|
| SESSION 24 | Trust Engine (4 niveaux) + Block Engine (4 niveaux) | P2 |
| SESSION 25 | Tests E2E appels complets | P2 |
| SESSION 26 | AngeAction API implementation | P2 |
| SESSION 27 | Interaction Engine objet central | P2 |
| SESSION 28 | Guardian Intelligence Loop | P2 |
| SESSION 29 | Knowledge Graph V2 | P2 |
| SESSION 30 | WebRTC Phase B | P3 |
