# UX-BACKLOG — ImmatConnect
> Source : UX-DECISIONS.md · UX-FRICTIONS.json · INVENTAIRE-PRODUIT.md Phase 9
> Statut de chaque item : ✅ fait · 🔧 à implémenter · 💬 à décider · 🔲 futur

---

## P0 — Bloquants utilisateur

Ces items affectent directement des parcours P0 (JRN-001 à JRN-006).

| ID | Item | Friction | Statut |
|---|---|---|---|
| P0-001 | Cycle aide sans confirmation helper | FRI-009 | 💬 à concevoir |
| P0-002 | Retour émetteur quand alerte véhicule vue | JRN-005 | 💬 à concevoir |
| P0-003 | Pas de confirmation lecture message | FRI-006 | 💬 à concevoir (P2) |

---

## P1 — Corrections impactantes

### Supprimer / Nettoyer

| ID | Item | Décision | Statut |
|---|---|---|---|
| P1-001 | Supprimer `panelContact` du DOM | D-001 | 🔧 à implémenter |
| P1-002 | Supprimer ou masquer données simulées navPremium (Limite, Trafic, Voie, Recalcul) | DA-002 | 💬 décision Gardien requise |
| P1-003 | Supprimer onglet "Nouveau" dans panelActivite → navSignaler | D-008 | ✅ fait (SESSION 8) |

### Sécurité UX

| ID | Item | Décision | Statut |
|---|---|---|---|
| P1-004 | SOS protégé par appui long (pas tap simple) | D-005 | ✅ fait (BTN-C05 `long-sos`) |

### Ergonomie

| ID | Item | Friction | Statut |
|---|---|---|---|
| P1-005 | reportPanel trop long — simplifier en 2 étapes | FRI-008 / DA-001 | 💬 décision Gardien requise |
| P1-006 | reportPanel : pré-charger la plaque cible depuis le contexte | FRI-008 | 🔧 à implémenter |

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
| P2-001 | Bouton "Modifier profil" dans le drawer | B2-2 | 🔧 à implémenter |
| P2-002 | FAB "Signaler ici" contextuel avec coordonnées du tap | B2-3 | 🔧 à implémenter |
| P2-003 | Score fiabilité visible dans profil/drawer | PROP-09 | 🔧 à implémenter |
| P2-004 | Marqueur "lu" côté émetteur (confirmation lecture message) | FRI-006 | 💬 à concevoir |
| P2-005 | Réponse structurée à une demande d'aide ("je viens") | FRI-009 | 💬 à concevoir |
| P2-006 | Fil de réponse helper → demandeur d'aide | FRI-009 | 💬 à concevoir |

### Nettoyage technique

| ID | Item | Décision | Statut |
|---|---|---|---|
| P2-007 | Déplacer "Restaurer msgs" + "Sync alertes" vers outils Gardien | D-007 / FRI-004 | 🔧 à implémenter |
| P2-008 | Unifier trust local (ic_trust) et ReliabilityPro DB | FRI-005 | 💬 à décider |
| P2-009 | Migrer blocage (ic_blocked) de localStorage vers DB | DA-004 / FRI-007 | 💬 à décider |
| P2-010 | Supprimer ou archiver code mort `_actMsgCard` + `_actAlertCard` | INVENTAIRE | 🔧 à implémenter |

### Clarté UI

| ID | Item | Statut |
|---|---|---|
| P2-011 | Clarifier message plaque immuable lors de l'inscription | UX-SCREENS sp | 🔧 à implémenter |
| P2-012 | Séparer onglets Activité : Conversations / Alertes | DA-003 | 💬 à décider |
| P2-013 | Distinction visuelle messages vs alertes dans Activité Reçus | DA-003 | 🔧 à implémenter |

---

## P3 — Futur / V2

### Carte immersive

| ID | Item | Ref | Statut |
|---|---|---|---|
| P3-001 | Véhicules avec direction (rotation selon heading GPS) | UX-MAP Étape 1 | 🔲 futur |
| P3-002 | Alertes hiérarchisées visuellement (urgent/important/info) | UX-MAP Étape 1 | 🔲 futur |
| P3-003 | Fiches flottantes légères au tap (conducteur + alerte) | UX-MAP Étape 1 | 🔲 futur |
| P3-004 | Mode conduite dédié (UI minimaliste) | UX-MAP Étape 2 | 🔲 futur |
| P3-005 | Silhouette véhicule avec état (alerte / aide / normal) | UX-MAP Étape 2 | 🔲 futur |
| P3-006 | Clustering intelligent (> 3 véhicules dans 100m) | UX-MAP Étape 2 | 🔲 futur |
| P3-007 | Mode nuit automatique | UX-MAP Étape 3 | 🔲 futur |
| P3-008 | Vue 3D légère en conduite | UX-MAP Étape 3 | 🔲 futur |
| P3-009 | TTL visible sur marqueur alerte (badge temporisateur) | UX-MAP | 🔲 futur |

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
| DEC-006 | Doubles canaux alertes (panelAltet + alertsPanel) : intentionnel ? | Architecture interface | INVENTAIRE G-1 |

---

## Déjà fait — SESSION 8

| Item | Session |
|---|---|
| Appel audio WebRTC (ImmatCall) | SESSION 8 |
| navPremium données temps réel (Vitesse / Autour / Alertes) | SESSION 8 |
| Bouton × supprimer favori GPS | SESSION 8 |
| INC-006 corrigé (carte → act-mod-selected) | SESSION 8 |
| Bloquer depuis contextMenu carte | SESSION 8 |
| Vider liste "Véhicules récents" | SESSION 8 |
| Tab "Nouveau" supprimé dans actCatPanel | SESSION 8 |
| SOS appui long (D-005) | SESSION 8 |
| Options Ange sélectionnables (clic = remplissage textarea) | SESSION 9 |
| NS v6 (access_policy 3 rôles + data[] organes) | SESSION 9 |
| nsToPrompt(depth:1/2/3) — projections selon le rôle | SESSION 9 |
| Fix sources/juste contradictoires (validateOutput) | SESSION 9 |
| sync-ns.js — génération mécanique TS depuis JSON | SESSION 9 |
| Architecture UX modulaire /architecture/ux/ (10 fichiers) | SESSION 9 |
