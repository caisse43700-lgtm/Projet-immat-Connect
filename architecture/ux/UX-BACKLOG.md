# UX-BACKLOG — ImmatConnect
> Source : UX-DECISIONS.md · UX-FRICTIONS.json · INVENTAIRE-PRODUIT.md Phase 9 · AUDIT-2026-06.md · UX-INTERACTION-SKELETON.md
> Statut de chaque item : ✅ fait · 🔧 à implémenter · 💬 à décider · 🔲 futur

---

## P0 — Bloquants utilisateur

Ces items affectent directement des parcours P0 (JRN-001 à JRN-006).

| ID | Item | Friction | Statut |
|---|---|---|---|
| P0-001 | Cycle aide sans confirmation helper | FRI-009 | 💬 à concevoir |
| P0-002 | Retour émetteur quand alerte véhicule vue | JRN-005 | ✅ fait (SESSION 19 — broadcast vehicle_seen) |
| P0-003 | Pas de confirmation lecture message | FRI-006 | 💬 à concevoir (P2) |
| P0-004 | `App.callSignalPlate()` inexistante — ReferenceError si appelée | MORT-001 | ✅ fait (SESSION 12) |

---

## P1 — Corrections impactantes

### Supprimer / Nettoyer

| ID | Item | Décision | Statut |
|---|---|---|---|
| P1-001 | Supprimer `panelContact` du DOM + fonctions legacy (clearMsg, sendMsg, voicePlate dans panelContact) | D-001 | ✅ fait (SESSION 11) |
| P1-002 | Supprimer ou masquer données simulées navPremium (Limite, Trafic, Voie, Recalcul) | DA-002 | 💬 décision Gardien requise |
| P1-003 | Supprimer onglet "Nouveau" dans panelActivite → navSignaler | D-008 | ✅ fait (SESSION 8) |
| P1-009 | Supprimer `signalRecapCard` (div caché, boutons morts, jamais affichée) | MORT-003 | ✅ fait (SESSION 12) |

### Sécurité UX

| ID | Item | Décision | Statut |
|---|---|---|---|
| P1-004 | SOS protégé par appui long (pas tap simple) | D-005 | ✅ fait (BTN-C05 `long-sos`) |

### Ergonomie

| ID | Item | Friction | Statut |
|---|---|---|---|
| P1-005 | reportPanel trop long — simplifier en 2 étapes | FRI-008 / DA-001 | ✅ fait (SESSION 19 — indicateur Étape 1/2 dans sigStep, DEC-001) |
| P1-006 | reportPanel : pré-charger la plaque cible depuis le contexte | FRI-008 | ✅ fait (sigStepVehicle + sigVehiclePlate) |

### Navigation

| ID | Item | Statut |
|---|---|---|
| P1-007 | Bouton Appeler dans nearbyPanel et contextMenu | ✅ fait (SESSION 8) |
| P1-008 | INC-006 : sélection carte → mise en évidence Activité | ✅ fait (SESSION 8) |

---

## P2 — Améliorations UX

### Fonctionnalités manquantes

| ID | Item | Ref | Statut |
|---|---|---|---|
| P2-001 | Bouton "Modifier profil" dans le drawer | BTN-MISS01 | ✅ fait (SESSION 19 — ✏️ Mon profil dans Réglages) |
| P2-002 | FAB "Signaler ici" contextuel avec coordonnées du tap | BTN-MISS02 | 🔧 à implémenter |
| P2-003 | Score fiabilité visible dans profil/drawer | PROP-09 | 🔲 futur |
| P2-004 | Marqueur "lu" côté émetteur (confirmation lecture message) | FRI-006 | 💬 à concevoir |
| P2-005 | Bouton "Je viens aider" — réponse structurée aide | BTN-MISS03 / FRI-009 | 💬 à concevoir |
| P2-006 | Fil de réponse helper → demandeur d'aide | FRI-009 | 💬 à concevoir |
| P2-014 | Bouton "Signaler abus" sur message reçu | BTN-MISS04 / INT-010 | 💬 à concevoir |
| P2-015 | Exposer `App.actViewOnMap()` avec un bouton dans la card alerte | MORT-002 | ✅ fait (déjà implémenté — `_actModCard` ligne ~1178) |
| P2-016 | Unifier status enum alertes (seen / present / gone / resolved) | UX-INTERACTION-SKELETON §5 | 💬 à décider |

### Nettoyage technique

| ID | Item | Décision | Statut |
|---|---|---|---|
| P2-007 | Debug tools ("Restaurer msgs" + "Sync alertes") → Gardien seulement | D-007 / FRI-004 | ✅ fait (SESSION 10 — gardien-debug-tool CSS) |
| P2-008 | Unifier trust local (ic_trust) et ReliabilityPro DB | FRI-005 | 💬 à décider |
| P2-009 | Migrer blocage (ic_blocked) de localStorage vers DB | DA-004 / FRI-007 | 💬 à décider |
| P2-010 | Supprimer code mort `_actMsgCard` + `_actAlertCard` | INVENTAIRE | ✅ fait (SESSION 21) |
| P2-017 | Supprimer badge `topMsgBadge` — remplacer par `actBadge` partout | AUDIT-2026 | ✅ fait (SESSION 21) |
| P2-018 | quickMsg() / quickReply() ciblaient iMsg/iTarget (champs morts panelContact) | — | ✅ corrigé (SESSION 10) |
| P2-019 | brain-dialog : retry RPC rôle si cold start Supabase | — | ✅ corrigé (SESSION 10) |

### Clarté UI

| ID | Item | Statut |
|---|---|---|
| P2-011 | Clarifier message plaque immuable lors de l'inscription | ✅ fait (SESSION 19 — hint champ iPlate) |
| P2-012 | Séparer onglets Activité : Conversations / Alertes | ✅ fait (SESSION 19 — filtres type Tout/Messages/Alertes dans actCatPanel) |
| P2-013 | Distinction visuelle messages vs alertes dans Activité Reçus | ✅ fait (SESSION 19 — filtres type DEC-003) |

---

## P3 — Futur / V2

### Carte immersive

| ID | Item | Ref | Statut |
|---|---|---|---|
| P3-001 | Véhicules avec direction (rotation selon heading GPS) | UX-MAP Étape 1 | 🔲 futur |
| P3-002 | Alertes hiérarchisées visuellement (urgent/important/info) | UX-MAP Étape 1 | 🔲 futur |
| P3-003 | Fiches flottantes légères au tap marqueur alerte | BTN-MISS06 / UX-MAP Étape 1 | 🔲 futur |
| P3-004 | Mode conduite dédié (UI minimaliste) | UX-MAP Étape 2 | 🔲 futur |
| P3-005 | Silhouette véhicule avec état (alerte / aide / normal) | UX-MAP Étape 2 | 🔲 futur |
| P3-006 | Clustering intelligent (> 3 véhicules dans 100m) | UX-MAP Étape 2 | 🔲 futur |
| P3-007 | Mode nuit automatique | UX-MAP Étape 3 | 🔲 futur |
| P3-008 | Vue 3D légère en conduite | UX-MAP Étape 3 | 🔲 futur |
| P3-009 | TTL visible sur marqueur alerte (badge temporisateur) | UX-MAP | 🔲 futur |

### Interactions manquantes

| ID | Item | Ref | Statut |
|---|---|---|---|
| P3-021 | INT-006 Remerciement formel — bouton "Je remercie" | BTN-MISS05 | ✅ fait (SESSION 19 — 🙏 Merci dédié, DEC-008) |
| P3-022 | INT-010 Signalement abus — complet avec backend | BTN-MISS04 | 🔲 à concevoir |
| P3-023 | SOS — canal prioritaire distinct (≠ assist panne) | INT-009 | 🔲 à concevoir |

### Fonctionnalités V2

| ID | Item | Ref | Statut |
|---|---|---|---|
| P3-010 | Recherche dans les messages | V2-2 | 🔲 futur |
| P3-011 | Catégorie alertes Météo (verglas, brouillard) | V2-3 | 🔲 futur |
| P3-012 | Swipe pour supprimer message/conversation | V2-4 | 🔲 futur |
| P3-013 | Marquer message comme "non lu" | V2-5 | 🔲 futur |
| P3-014 | Filtres conducteurs proches par couleur | V2-6 | 🔲 futur |
| P3-015 | Stats d'utilisation (nb signalements, messages envoyés) | V2-7 | 🔲 futur |
| P3-016 | Sélecteur rayon dans nearbyPanel | B2-6 | 🔲 futur |
| P3-017 | Undo 5s sur suppression (toast annuler) | B2-5 | 🔲 futur |

### Architecture IA

| ID | Item | Statut |
|---|---|---|
| P3-018 | `nsToPrompt(role, depth)` avec rôle explicite (gardien / protecteur / observateur) | 🔲 attendre existence du protecteur |
| P3-019 | Rôle Protecteur — accès profondeur 2 sans données techniques | 🔲 à concevoir |
| P3-020 | Rôle Observateur — accès profondeur 1, usage seulement | 🔲 futur lointain |

---

## Décisions Gardien en attente

Ces items sont bloqués sur une décision explicite du Gardien :

| ID | Question | Impact | Ref |
|---|---|---|---|
| DEC-001 | reportPanel : 2 étapes ou améliorer accordéon ? | Ergonomie signalement | DA-001 |
| DEC-002 | navPremium : supprimer ou marquer "Bientôt disponible" ? | Désinformation utilisateur | DA-002 |
| DEC-003 | Activité : séparer onglets Conversations / Alertes ? | Clarté interface | DA-003 |
| DEC-004 | Blocage : migrer vers DB ou garder localStorage ? | Vie privée vs persistance | DA-004 |
| DEC-005 | Trust : unifier ic_trust + ReliabilityPro ou garder séparé ? | Cohérence données | FRI-005 |
| DEC-006 | ~~Doubles canaux alertes (panelAltet + alertsPanel) : intentionnel ?~~ | ✅ résolu (SESSION 19 — alertsPanel DOM mort supprimé) | INVENTAIRE G-1 |
| DEC-007 | Status enum alertes : unifier seen/present/gone/resolved ? | Cohérence données | UX-INTERACTION-SKELETON §5 |
| DEC-008 | INT-006 Remerciement : bouton dédié ou workaround "Bien reçu" suffit ? | UX sociale | INT-006 |

---

## Historique des sessions

| Item | Session |
|---|---|
| P2-010 `_actMsgCard` + `_actAlertCard` code mort supprimé | SESSION 21 |
| P2-017 `topMsgBadge` supprimé — `actBadge` seul badge actif | SESSION 21 |
| P2-015 `App.actViewOnMap()` — déjà implémenté dans `_actModCard` | SESSION 21 |
| DEC-008 Bouton 🙏 Merci dédié (ic-quick + isOwn assist helper_coming) | SESSION 19 |
| DEC-001 Indicateur progression sigStep (barres Étape 1/2 · 2/2) | SESSION 19 |
| DEC-003 Filtres type Activité (Tout / Messages / Alertes) | SESSION 19 |
| DEC-006 alertsPanel DOM mort supprimé (INV-015 restored) | SESSION 19 |
| Appel audio WebRTC (ImmatCall) | SESSION 8 |
| navPremium données temps réel (Vitesse / Autour / Alertes) | SESSION 8 |
| Bouton × supprimer favori GPS | SESSION 8 |
| INC-006 corrigé (carte → act-mod-selected) | SESSION 8 |
| Bloquer depuis contextMenu carte | SESSION 8 |
| Vider liste "Véhicules récents" | SESSION 8 |
| Tab "Nouveau" supprimé dans actCatPanel (P1-003) | SESSION 8 |
| SOS appui long — D-005 (P1-004) | SESSION 8 |
| Bouton Appeler nearbyPanel/contextMenu (P1-007) | SESSION 8 |
| INC-006 sélection carte → Activité (P1-008) | SESSION 8 |
| Options Ange sélectionnables (clic = remplissage textarea) | SESSION 9 |
| NS v6 (access_policy 3 rôles + data[] organes) | SESSION 9 |
| nsToPrompt(depth:1/2/3) — projections selon le rôle | SESSION 9 |
| Fix sources/juste contradictoires (validateOutput) | SESSION 9 |
| sync-ns.js — génération mécanique TS depuis JSON | SESSION 9 |
| Architecture UX modulaire /architecture/ux/ (11 fichiers) | SESSION 9 |
| quickMsg/quickReply → icComposePlate/icComposeText — BUG-001 / P2-018 | SESSION 10 |
| Debug tools → Gardien seulement body.is-gardien — BUG-002 / P2-007 | SESSION 10 |
| brain-dialog retry RPC cold start 600ms — BUG-003 / P2-019 | SESSION 10 |
| UX-INTERACTION-SKELETON.md — squelette A→B complet | SESSION 10 |
| Boutons morts catalogués (MORT-001 à MORT-007) | SESSION 10 |
| Boutons manquants étendus (MISS-003 à MISS-006) | SESSION 10 |
| reportPanel pré-chargement plaque cible — P1-006 | SESSION 10 |
| panelContact supprimé — D-001 / P1-001 (voicePlate/voiceMsg/fallbacks migrés) | SESSION 11 |
| validateNSSchema() dans brain-dialog — DET-002 (fail-fast schéma NS) | SESSION 11 |
| DET-001 anchors symboliques NS (19 références lignes remplacées) | SESSION 11 |
| scripts/test-brain-routing.js — validation comportementale pipeline 100% | SESSION 11 |
| scripts/validate-ns-refs.js — vérification CI anchors symboliques | SESSION 11 |
| signalRecapCard supprimée + renderSignalRecap() — P1-009 / MORT-003 | SESSION 12 |
| clearMsg() + sendMsg() supprimés — MORT-004 (écriture $('iMsg') non gardée) | SESSION 12 |
| callSignalPlate() bouton mort supprimé — P0-004 / MORT-001 | SESSION 12 |
| Clôture phase architecturale — 9.7/10, filtre TRF-006 actif | SESSION 12 |
