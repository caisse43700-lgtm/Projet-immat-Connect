# Amélioration Navigation Fonctionnalités

> Audit complet navigation utilisateur · ImmatConnect
> Version 16.0 · 2026-06-02

---

## TABLE DE RÉFÉRENCE — GRILLE INFRASTRUCTURE

Cette table est la **source de référence** pour toutes les améliorations.
Elle sera mise à jour à chaque session qui modifie une fonctionnalité.

---

## PARTIE 1 — CARTE DES PANELS (état actuel)

| Panel | ID | Rôle | État | Priorité |
|---|---|---|---|---|
| Welcome | `sw` | Première page — connexion / inscription | ✅ OK | — |
| Auth | `sa` | Connexion et inscription | ⚠️ Formulaire dense | P2 |
| Profil Setup | `sp` | Compléter le profil avant carte | ⚠️ Plaque immuable mal annoncée | P2 |
| Réinit. MDP | `sr` | Nouveau mot de passe | ✅ OK | — |
| **Carte** | `sm` | Vue principale — radar conducteurs + alertes | ✅ Fonctionnel | P1 améliorations |
| **GPS** | `drive` | Navigation — itinéraire, voix, POI | ✅ FRI-002 résolu SESSION 16 | P2 améliorations |
| **Signaler** | `altet` (overlay) | Créer alerte route / véhicule / aide | ⚠️ 3 blocs trop longs | P1 SESSION 17 |
| **Activité** | `activite` | Historique des interactions | ✅ FRI-003/FLOW-005 résolus SESSION 16 | P2 améliorations |
| **Messages** | `messages` | Messagerie directe conducteur à conducteur | ✅ FRI-001 résolu SESSION 16 | P2 améliorations |
| Conducteurs proches | `nearby` (overlay) | Liste + contacter | ✅ OK | P2 |
| Alertes actives | `alerts` (overlay) | Voir toutes les alertes | ✅ OK | — |
| Contact | `contact` | LEGACY — OBSOLÈTE | 🔴 À supprimer | P1 |
| Paramètres | `settings` | Config conducteur | ⚠️ Debug tools intrus | P2 |
| Appel | `callOverlay` | WebRTC en cours | ✅ OK | — |

---

## PARTIE 2 — FRICTIONS IDENTIFIÉES (classées par priorité)

### 🔴 P1 — À corriger en priorité

#### ~~FRI-001~~ · ✅ RÉSOLU SESSION 16 · `vehicleAlert()` → panel `contact` inexistant
- **Était :** `vehicleAlert()` appelait `this.panel('contact')` — panel non reconnu, flux bloqué silencieusement.
- **Fix SESSION 16 :** Redirige vers `this.panel('messages')` + `ImmatMessages.setMode('compose')` + préremplissage plaque + message via `setTimeout 80ms`.

---

#### ~~FRI-002~~ · ✅ RÉSOLU SESSION 16 · Données simulées dans GPS (`navPremium`)
- **Était :** Cellule `limitVal` affichait la vitesse GPS actuelle avec label "km/h" → confusion avec limite légale. `trafficBar` toujours à 0%.
- **Fix SESSION 16 :** Label "km/h" → "Vitesse". Suppression du bloc `<div class="traffic-bar">`.

---

#### ~~FRI-003~~ · ✅ RÉSOLU SESSION 16 · Onglet "Nouveau" dans Messages
- **Était :** Libellé "Nouveau" ambigu avec le badge "Nouveaux" dans Activité.
- **Fix SESSION 16 :** Renommé "Composer ✏️".

---

#### FRI-008 · `reportPanel` — 3 blocs affichés en même temps
- **Problème :** Le panel Signaler affiche les 3 blocs (véhicule + route + aide) simultanément. L'utilisateur doit scroller pour trouver son type.
- **Impact :** Scroll inutile, confusion sur quoi choisir, contexte véhicule pas toujours visible.
- **Amélioration :** 2 étapes — Étape 1 : "Que signales-tu ?" (3 grandes cases : Véhicule / Route / Aide) → Étape 2 : sous-types.
- **Effort :** Moyen — restructurer le HTML + ajouter logique de navigation en 2 étapes.

---

#### FRI-010 · SOS sans protection (risque fausse alerte)
- **Problème :** L'alerte "incendie" dans reportPanel se déclenche d'un simple tap. Pas de confirmation supplémentaire.
- **Impact :** Fausses alertes SOS qui polluent le réseau et nuisent à la crédibilité de l'app.
- **Amélioration :** Appui long (1,5 seconde) + confirmation visuelle avant envoi.
- **Effort :** Moyen — ajouter `longpress` + modal de confirmation.

---

#### ~~FLOW-005~~ · ✅ RÉSOLU SESSION 16 · Labels inadaptés pour alerte véhicule
- **Était :** Boutons "Toujours là" / "Résolu" pour alerte `type === 'vehicle'` non-propriétaire — labels conçus pour la route.
- **Fix SESSION 16 :** "Toujours là" → "J'ai vérifié" · "Résolu" → "C'est bon" dans `_actAlertCard` branche `vehicle`.

---

### ⚠️ P2 — Amélioration progressive

#### FRI-004 · Debug tools dans Paramètres utilisateur
- **Problème :** "Restaurer messages" et "Sync alertes" sont des outils de débogage dans le panel paramètres du conducteur.
- **Impact :** L'utilisateur croit l'app cassée quand il voit ces boutons. Confusion avec les vrais paramètres.
- **Amélioration :** Déplacer ces outils vers un espace réservé au Gardien (`is-gardien`).
- **Effort :** Faible — ajouter la classe `gardien-debug-tool` + `display:none` par défaut.

---

#### FRI-006 · Pas de confirmation de lecture des messages
- **Problème :** L'émetteur d'un message ne sait jamais s'il a été lu.
- **Impact :** Frustration, relances inutiles, sentiment d'être ignoré.
- **Amélioration :** Indicateur "Lu" (double coche ou timestamp lecture) côté émetteur.
- **Effort :** Moyen — champ `read_at` dans la table messages + mise à jour realtime.

---

#### FRI-007 · Blocage conducteur local uniquement
- **Problème :** Les plaques bloquées sont dans `localStorage`. Perdues si cache vidé ou changement de navigateur.
- **Impact :** Perte de protection pour l'utilisateur.
- **Amélioration :** Synchroniser `ic_blocked` avec un champ en DB côté profil utilisateur.
- **Effort :** Moyen — champ JSON `blocked_plates` dans la table profils.

---

#### FRI-009 · Pas de cycle complet pour demande d'aide
- **Problème :** Quand A demande de l'aide, aucun helper ne peut confirmer qu'il arrive. A ne sait pas si quelqu'un vient.
- **Impact :** Anxiété, solitude, re-signalement inutile.
- **Amélioration :** Bouton "✋ J'arrive" dans la card activité → notifie A + marque `helper_coming` (FLOW-002 — partiellement implémenté en SESSION 15 via messages, à étendre à la carte).
- **Effort :** Moyen — étendre le mécanisme IC-003 à la carte et à l'activité.

---

#### FRI-011 · Carte comme fond statique
- **Problème :** Les marqueurs véhicules sont des cercles. Pas de direction, pas d'état visuel (en mouvement / arrêté / en danger).
- **Impact :** Expérience peu immersive, difficile de lire la situation d'un coup d'œil.
- **Amélioration :** Marqueurs orientés (heading), couleur selon état (aide demandée = rouge, alerte = orange, normal = bleu).
- **Effort :** Élevé — modifier `renderMarker()` + intégrer heading dans les données de position.

---

## PARTIE 3 — GRILLE DES INTERACTIONS

| ID | Interaction | Nature | État | Retour émetteur | Retour récepteur | Amélioration |
|---|---|---|---|---|---|---|
| INT-001 | Message direct | Communication | ✅ | toast envoi | badge +1 · notification | Confirmation lecture (P2) |
| INT-002 | Alerte véhicule | Alerte ciblée | ✅ | toast | FloatingCard | IC-002 ✅ SESSION 15 |
| INT-003 | Signalement route | Alerte collective | ✅ | marqueur carte | marqueur + badge | — |
| INT-004 | Demande d'aide | Urgence | ✅ | marqueur | marqueur + badge | Cycle helper (P2) |
| INT-005 | Appel WebRTC | Voix | ✅ | callOverlay | modal accepter | Améliorer message refus |
| INT-006 | Remerciement | Retour social | ❌ ABSENT | — | — | À concevoir (P2) |
| INT-007 | Résoudre alerte | Fin de cycle | ✅ | suppression marqueur | marqueur disparu | Visibilité bouton (P2) |
| INT-008 | Blocage plaque | Modération locale | ⚠️ | liste bloqués | (invisible) | Migrer DB (P2) |
| INT-009 | SOS | Urgence critique | ⚠️ PARTIEL | marqueur urgence | notification | Appui long + confirmation (P1) |
| INT-010 | Signalement abus | Modération | ❌ ABSENT | — | — | À concevoir (P2) |
| INT-011 | Notification système | Information | ✅ | — | toast · badge | Hiérarchie visuelle (P2) |

---

## PARTIE 4 — ÉTAT DE CHAQUE BOUTON D'ACTION PRINCIPAL

### Panel Carte (`sm`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| FAB Signaler | `App.panel('altet')` | ✅ | Voir FRI-008 |
| Badge conducteurs | `App.openNearby()` | ✅ | — |
| Badge alertes | `App.openAlerts()` | ✅ | — |
| Localiser (GPS) | `App.locate()` | ✅ | — |
| Mode nuit/jour | `App.autoNight()` | ✅ | — |
| ✦ Ange | `AngeDialog.open()` | ✅ SESSION 15 | Edge Function réservée Gardien |
| Clic marqueur véhicule | menu contextuel | ✅ | Marqueurs non orientés (FRI-011) |

### Panel GPS (`drive`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| Recherche destination | `App.searchGps()` | ✅ | — |
| Voix GPS | `App.voiceGps()` | ✅ | — |
| Démarrer navigation | `App.startNav()` | ✅ | — |
| Stop GPS | `App.stopGps()` | ✅ | — |
| POI (6 types) | `App.poi(type)` | ✅ | — |
| navPremium — vitesse actuelle | label "Vitesse" ✅ | ✅ SESSION 16 | FRI-002 résolu |
| navPremium — barre trafic | supprimée ✅ | ✅ SESSION 16 | FRI-002 résolu |

### Panel Signaler (`reportPanel`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| Bloc véhicule (6 types) | `App.vehicleAlert(label)` | ✅ | Voir FRI-008 |
| Bloc route (6 types) | `App.roadReport(type)` | ✅ | Voir FRI-008 |
| Bloc aide (6 types) | `App.assist(type)` | ✅ | FRI-010 pour SOS |
| Contexte plaque | `$('reportTargetLine')` | ⚠️ | Pas toujours visible |

### Panel Activité (`activite`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| Onglet Reçus | affiche feed | ✅ | — |
| Onglet Nouveau | `App.navSignaler()` | ✅ SESSION 16 | FRI-003 résolu — "Composer ✏️" |
| Card Aide — "✋ J'arrive" | `App.actQuickReply()` | ✅ SESSION 15 | — |
| Card Aide — "Passer" | dismiss | ✅ | — |
| Card Véhicule — "J'ai vérifié" | status update | ✅ SESSION 16 | FLOW-005 résolu |
| Card Véhicule — "C'est bon" | résoudre | ✅ SESSION 16 | FLOW-005 résolu |
| Badge "✋ En route · [plaque]" | affiché si `helper_coming` | ✅ SESSION 15 | — |
| Badge "Vu par le conducteur" | affiché si `seen_by_driver` | ✅ SESSION 15 | — |

### Panel Messages (`messages`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| Onglet Reçus | `setMode('inbox')` | ✅ | — |
| Onglet Envoyés | `setMode('sent')` | ✅ | — |
| Composer | `setMode('compose')` | ✅ | — |
| Envoyer | `App.sendMsg()` | ✅ | — |
| Répondre → | `App.quickReply()` | ✅ | — |
| Supprimer message | `App.deleteMessage()` | ✅ | — |
| Supprimer conversation | `App.deleteConv()` | ✅ | — |
| Marquer lu | `App.markRead()` | ✅ | Pas de confirmation lecture côté émetteur |
| Appeler | `CallManager.requestCall()` | ✅ | — |

### Panel Paramètres (`settings`)
| Bouton | Action | État | Problème |
|---|---|---|---|
| Toggle appels | `allowCallsToggle` | ✅ | — |
| Genre voix GPS | `App.toggleVoiceGender()` | ✅ | — |
| Réduire effets | `App.toggleReduceEffects()` | ✅ | — |
| Nettoyer cache | `App.clearOfflineCache()` | ✅ | — |
| Restaurer messages | `App.restoreMessages()` | ⚠️ | FRI-004 — outil debug ici |
| Sync alertes | `App.forceSyncAlerts()` | ⚠️ | FRI-004 — outil debug ici |
| Déconnexion | `App.logout()` | ✅ | — |
| SOS | `App.sosLong()` | ⚠️ | FRI-010 — pas de protection |
| Mode invisible | `App.toggleInvisible()` | ✅ | — |

---

## PARTIE 5 — PLAN D'AMÉLIORATION PRIORISÉ

### SESSION 16 — P1 (✅ FAIT)

| Réf | Action | Panel concerné | Résultat |
|---|---|---|---|
| FRI-001 | `vehicleAlert()` → `panel('messages')` + préremplissage | messages | ✅ Flux complet débloqué |
| FRI-002 | Label "km/h" → "Vitesse" + supprimer trafficBar | drive | ✅ Donnée non simulée |
| FRI-003 | Renommer onglet "Nouveau" → "Composer ✏️" | messages | ✅ Libellé clair |
| FLOW-005 | Labels "J'ai vérifié" / "C'est bon" pour véhicule | activite | ✅ Labels adaptés au contexte |
| FRI-010 | SOS — déjà protégé (`startSosHold` 3s + double confirm) | — | ✅ Déjà implémenté — rien à faire |
| FRI-008 | reportPanel en 2 étapes | altet (overlay) | 🔄 Reporté SESSION 17 |

### SESSION 17+ — P2 (amélioration progressive)

| Réf | Action | Panel concerné | Effort |
|---|---|---|---|
| FRI-004 | Debug tools → Gardien seulement | settings | Faible |
| FRI-006 | Confirmation lecture message | messages | Moyen |
| FRI-007 | Blocage → DB | settings | Moyen |
| FRI-009 | Cycle aide complet (helper sur carte) | carte · activite | Moyen |
| FRI-011 | Marqueurs orientés + état visuel | carte | Élevé |
| INT-006 | Remerciement (bouton social) | activite · messages | Moyen |
| INT-010 | Signalement abus | messages | Moyen |
| SA | Formulaire inscription 2 étapes | sa (auth) | Moyen |

---

## PARTIE 6 — CE QUI EST DÉJÀ ENREGISTRÉ ET À JOUR (SESSION 15)

| Réf | Fonctionnalité | Fichier modifié | Commit |
|---|---|---|---|
| IC-003 | FloatingCard "✋ Helper en route" | index.html | SESSION 15 |
| IC-002 | Toast "Vu par le conducteur" | index.html | SESSION 15 |
| IC-002 | Badge `seen_by_driver` dans `_actModCard` | index.html | SESSION 15 |
| IC-003 | Badge `helper_coming` dans `_actModCard` | index.html | SESSION 15 |
| Ange | Bouton ✦ visible pour tous les conducteurs | index.html | SESSION 15 |
| ARCH | Architecture fonctionnelle complète | ARCHITECTURE-FONCTIONNELLE-COMPLETE.md | 965cf96 |
| MATRICE | Toutes les interactions A↔B | MATRICE-INTERACTIONS-COMPLETE.md | c01d8e8 |
| AUDIT NS | Audit base connaissance Ange | AUDIT-BASE-CONNAISSANCE-ANGE.md | 9263f7e |
| MEGA | Méga structure croisée architecture + audit | MEGA-STRUCTURE-NAVIGATION.md | 2696e70 |
| FRI-001 | vehicleAlert → panel messages + préremplissage | index.html | SESSION 16 |
| FRI-002 | navPremium label "Vitesse" + suppr trafficBar | index.html | SESSION 16 |
| FRI-003 | Onglet "Composer ✏️" (ex "Nouveau") | index.html | SESSION 16 |
| FLOW-005 | Labels "J'ai vérifié" / "C'est bon" alerte véhicule | index.html | SESSION 16 |

---

## PARTIE 7 — RÈGLE DE MISE À JOUR

À chaque session qui modifie une fonctionnalité ou un bouton :
1. Mettre à jour la ligne correspondante dans ce document
2. Incrémenter la version en tête
3. Ajouter la ligne dans "Ce qui est déjà enregistré"

Ce document est la **source unique de référence** pour l'état de la navigation utilisateur.
