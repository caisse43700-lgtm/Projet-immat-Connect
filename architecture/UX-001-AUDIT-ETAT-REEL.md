# Amélioration Navigation Fonctionnalités

# UX-001 — Audit État Réel vs Cible

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Sources :** `index.html`, `calls.js`, `messages.js`, `UX-BACKLOG.md`, `UX-CONSTITUTION.md`, `UX-MAP.md`

---

## Méthode

Chaque organe UX (RADAR · SIGNAL · CONTACT · AIDE · ROUTE · MOI) est audité :
- ce que le code fait réellement
- ce que le backlog/spec dit
- les écarts (status stale, fonctions manquantes, décisions bloquées)

---

## 1. RADAR — Carte et conducteurs proches

### Ce qui est implémenté
- Carte Leaflet avec marqueurs SVG colorés (rond + plaque)
- Marqueurs alertes par emoji/type
- Clustering Leaflet basique
- `nearbyPanel` : liste des conducteurs dans le rayon
- `addCommunityAlertMarker()` : ajout sur carte avec level (urgent/important/info)
- `syncCommunityAlerts()` + `cleanupAlerts()` (TTL, expiration)
- FAB Signaler accessible depuis la carte
- Long press carte → `tapLat`/`tapLng` → signalement positionné (SESSION 23)

### Ce qui manque vs cible UX-MAP
| Feature | Backlog | État réel |
|---|---|---|
| Direction véhicule (rotation heading GPS) | P3-001 🔲 | Absent — aucun champ `heading` dans les marqueurs |
| Alertes hiérarchisées visuellement (couleur urgence) | P3-002 🔲 | Partiel — `level` présent mais rendu visuel uniforme |
| Fiches flottantes légères au tap alerte | P3-003 🔲 | Absent — tap alerte → actModCard (panel lourd) |
| Mode conduite UI minimaliste | P3-004 🔲 | Absent |
| Silhouette véhicule avec état | P3-005 🔲 | Absent — rond SVG uniforme |
| TTL visible sur marqueur | P3-009 🔲 | Absent |

### Décision en attente
Aucune — tout ce qui est P3 est assumé futur.

---

## 2. SIGNAL — Signalement (reportPanel)

### Ce qui est implémenté
- `reportPanel` en 2 étapes visuelles (sigStep1 / sigStep2) ← SESSION 19
- Pré-chargement plaque cible depuis contexte (`sigVehiclePlate`, `sigStepVehicle`)
- 3 flux : route (`roadReport`) / aide (`assist`) / véhicule (`vehicleAlert` → Messages)
- `vehicleAlert()` → ouvre Messages/compose avec plaque + message prérempli ← SESSION 16
- FAB "📍 Signaler ici" avec coordonnées tap ← SESSION 23
- Nettoyage `cleanupAlerts()` avec TTL par type
- Broadcast community alerts via Supabase Realtime
- `_own`/`_mine` distinguent mes propres alertes

### Statuts stales dans le backlog
| Item | Backlog dit | Réalité |
|---|---|---|
| P1-005 reportPanel 2 étapes | ✅ SESSION 19 | ✅ Confirmé — `sigStep1`/`sigStep2` présents |
| P1-006 pré-chargement plaque | ✅ SESSION 19 | ✅ Confirmé — `sigVehiclePlate` pré-rempli |

### Ce qui manque
| Feature | Backlog | État réel |
|---|---|---|
| P2-016 Unifier statuts (seen/present/gone/resolved) | 💬 à décider | En cours d'utilisation : `seen`, `present`, `gone`, `resolved`, `helper_coming`, `seen_by_driver` — 6 valeurs, pas documentées uniformément |
| P3-022 Signalement abus complet avec backend | 🔲 | Absent |
| P3-023 SOS canal prioritaire distinct | 🔲 | SOS = `assist('panne')` + confirm 112 — pas de canal dédié |

### Décision bloquée
- **DA-007** : Enum statuts alertes — les 6 valeurs ne sont documentées nulle part. Risque de divergence si une 7e est ajoutée.

---

## 3. CONTACT — Messages + Appels

### Messages — Ce qui est implémenté
- Conversations par plaque, threads, favoris, archivées (with bottom sheet SESSION 19-20)
- Mode compose / inbox avec fil de messages
- `read_at` tracé en DB → unread count correct
- Soft-delete (INV-COM-009 : localStorage `ic_deleted_msgs`)
- Trust / blocage (localStorage `ic_trust`, `ic_blocked`)
- Events OBD : `MSG_SENT`, `MSG_RECEIVED`, `CONV_FAVORITED`, `CONV_ARCHIVED`, `CONV_DELETED`, `CONTACT_TRUSTED`, `CONTACT_REVOKED`
- `subscribe()` channel unique (SESSION 21 — guard `if(!State.channel)`)

### Messages — Ce qui manque
| Feature | Backlog | État réel |
|---|---|---|
| P2-004 Lu côté émetteur (✓✓) | 💬 à concevoir | `read_at` en DB mais aucun marqueur visible dans le fil |
| P2-014 Bouton "Signaler abus" sur message | 💬 à concevoir | Absent — aucun `reportAbuse` dans messages.js |
| P3-010 Recherche dans les messages | 🔲 futur | Absent — `CONV_SEARCHED` OBD event présent mais UI absente |
| P3-013 Marquer "non lu" | 🔲 futur | Absent |
| P2-008 Unifier trust local + ReliabilityPro DB | 💬 à décider | `ic_trust` localStorage seulement |
| P2-009 Migrer blocage vers DB | 💬 à décider | `ic_blocked` localStorage seulement |

### Appels — État réel (IMPORTANT — CORRECTION DE PERCEPTION)

**La SESSION 8 "Appel audio WebRTC (ImmatCall)" n'existe plus (ou n'a jamais été une vraie voix).**

Le code actuel dans `calls.js` est **Phase 1 uniquement** :
```
A → requestCall() → INSERT call_requests (pending)
B → callIncomingPopup → acceptCall() → UPDATE (accepted) → actOpenConv(plate)
```
`acceptCall()` ouvre une **conversation Messages**, pas un appel voix.  
Zero `RTCPeerConnection`, zero `getUserMedia` dans tout le codebase.

| Feature | Backlog dit | Réalité |
|---|---|---|
| "Appel audio WebRTC" SESSION 8 | ✅ historique | ⚠️ STALE — Phase 1 contact-request seulement, aucun WebRTC |
| Anti-spam, unicité pending, cooldown | ✅ implémenté | ✅ Confirmé — triggers DB + RPC `can_receive_calls()` |
| Journal appels `loadCallLog()` | ✅ implémenté | ✅ Confirmé |
| Préférences `allow_calls` | ✅ implémenté | ✅ Confirmé |
| WebRTC voix Phase B | — non mentionné dans backlog | ❌ Non implémenté — chantier complet à concevoir |

---

## 4. AIDE — Flux helper demandeur

### Ce qui est implémenté (CORRECTION — status stales dans backlog)

Le backlog marque P2-005 "Je viens aider" et P2-006 "Fil de réponse helper" comme **💬 à concevoir**. Le code dit autre chose :

**P2-005 "Je viens aider" — LARGEMENT IMPLÉMENTÉ**  
Dans `_actModCard()` (ligne ~1299), pour une alerte `group==='assist'` reçue par un non-propriétaire :
```html
<button onclick="actQuickReply(plate, 'J\'arrive, je viens vous aider.')">✋ J'arrive</button>
<button onclick="actQuickReply(plate, 'Je ne peux pas aider cette fois.')">Je ne peux pas</button>
<button onclick="actHelpReply(plate)">💬 Msg</button>
<button onclick="CallManager.contactByCall(plate,'')">📞 Appel</button>
```

**P2-006 Fil de réponse — PARTIELLEMENT IMPLÉMENTÉ**  
Quand B reçoit un message commençant par "J'arrive" et que A a une alerte `assist` active :
- Status mis à `helper_coming` + `_helperPlate` enregistrés
- FloatingCard affichée à A : "✋ Helper en route — [plaque B] vient vous aider"
- A voit ensuite "🙏 Merci" dans son actModCard (si `helper_coming` + `_helperPlate`)

**Ce qui manque dans ce flux** :
| Gap | Description |
|---|---|
| Confirmation retour au helper | Quand A reçoit le "J'arrive" et passe en `helper_coming`, B ne reçoit aucun retour visuel que sa proposition a bien été vue |
| Déclencheur limité | `helper_coming` se déclenche uniquement si le message *commence* par "J'arrive" — fragile, dépend du texte exact de `actQuickReply` |
| Aucun OBD event `HELP_RESPONDED` | Le flux aide ne génère pas d'événement organisme côté répondant |

**P0-001 Aide cycle sans confirmation** — le cycle est donc : 95% complet, manque uniquement la confirmation retour au helper.

---

## 5. ROUTE — panelDrive / GPS

### Ce qui est implémenté
- Géolocalisation `watchPosition` avec callback `onGPS()`
- `navPremium` : Vitesse GPS réelle + Proches (count) + Alertes actives
- Favoris GPS (lieux, routes)
- `trackingOn` / `trackingOff` — partage position
- Données simulées supprimées (trafic, voies, limite) ← SESSION 8+

### Ce qui manque
| Feature | Backlog | État réel |
|---|---|---|
| Mode conduite UI dédiée | P3-004 🔲 | Absent |
| P3-001 Heading rotation | P3-001 🔲 | Pas de champ heading GPS collecté |

---

## 6. MOI — Profil + Paramètres

### Ce qui est implémenté
- Modification pseudo, couleur, avatar
- "✏️ Mon profil" dans Réglages ← SESSION 19
- Préférences appel (`allow_calls`) modifiables
- Debug tools réservés au Gardien (`body.is-gardien`) ← SESSION 10
- Plaque immuable après création (UI + DB)

### Ce qui manque
| Feature | Backlog | État réel |
|---|---|---|
| P2-003 Score fiabilité visible | 🔲 futur | Absent — cohérent avec D-004 (pas de réputation publique) |

---

## Synthèse des écarts critiques

### Statuts stales (backlog incorrect vs code réel)

| Item | Backlog dit | Réalité | Action |
|---|---|---|---|
| "Appel audio WebRTC" SESSION 8 | ✅ fait | ⚠️ Phase 1 seulement — aucun WebRTC | Corriger historique backlog |
| P2-005 "Je viens aider" | 💬 à concevoir | ✅ Implémenté via `actQuickReply` "✋ J'arrive" | Marquer ✅ |
| P2-006 Fil de réponse helper | 💬 à concevoir | ✅ 80% — `helper_coming` + FloatingCard | Marquer ✅ partiel |

### Gaps réels non encore traités

| ID | Gap | Priorité | Organe |
|---|---|---|---|
| GAP-001 | Confirmation retour au helper (P0-001 restant) | P1 | AIDE |
| GAP-002 | Marqueur "lu" ✓✓ côté émetteur | P2 | CONTACT |
| GAP-003 | Bouton "Signaler abus" sur message | P2 | CONTACT |
| GAP-004 | Unifier enum statuts alertes (6 valeurs non documentées) | P2 | SIGNAL |
| GAP-005 | `HELP_RESPONDED` OBD event manquant | P2 | AIDE |
| GAP-006 | WebRTC voix Phase B — appel voix réel | P3 | CONTACT |
| GAP-007 | Tri/recherche dans les messages | P3 | CONTACT |
| GAP-008 | Fiches flottantes légères au tap marqueur alerte | P3 | RADAR |

### Décisions Gardien encore ouvertes (DA-xxx)

| DA | Question | Priorité |
|---|---|---|
| DA-004 | Blocage `ic_blocked` : migrer vers DB ? | P2 |
| DA-005 | Trust `ic_trust` : unifier avec ReliabilityPro DB ? | P2 |
| DA-007 | Statuts alertes : documenter les 6 valeurs officiellement | P2 |

---

## Prochaines sessions recommandées

| Session | Contenu | Priorité |
|---|---|---|
| SESSION 22 | GAP-001 : Confirmation retour helper (OBD `HELP_RESPONDED` + toast/FloatingCard vers B) | P1 |
| SESSION 22b | Corriger backlog : P2-005/P2-006 → ✅, WebRTC → ⚠️ Phase 1 seulement | P2 |
| SESSION 23 | GAP-004 : Documenter officiellement les 6 statuts alertes dans `knowledge/` | P2 |
| SESSION 24 | DA-004/DA-005 : Décision blocage + trust → selon décision Gardien | P2 |
| Phase B | GAP-006 : WebRTC voix — conception + implémentation RTCPeerConnection | P3 |
