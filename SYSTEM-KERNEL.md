# SYSTEM-KERNEL — Noyau Opérationnel ImmatConnect
# Interface unique d'interrogation du savoir projet

**Usage :** Toute session commence par lire PROJET-INTEL.md.
Ce fichier s'interroge quand la tâche du jour est identifiée.
Format : query → domaine → 10 réponses précomputées → décision.

**Règle d'or :** Correction minimale. Ne pas toucher ce qui n'est pas ciblé.

---

## COMMENT INTERROGER CE FICHIER

1. Identifier le domaine fonctionnel de la demande (liste ci-dessous)
2. Lire les 10 réponses précomputées du domaine
3. Si la correction touche un ADN → vérifier la section GARDE-FOUS
4. Appliquer correction + noter dans PROJET-INTEL.md

---

## DOMAINES FONCTIONNELS

| # | Domaine | Mots-clés |
|---|---------|-----------|
| D1 | Badge & notifications | topMsgBadge, actBadge, unreadMsgCount, INC-003 |
| D2 | Messagerie P2P | messages.js, ImmatMessages, conv, selPlate |
| D3 | Carte & GPS | Leaflet, map, locate, loadOthers, marqueurs, INC-005 |
| D4 | Signalements & alertes | reports, S.alerts, addCommunityAlert, INC-002 |
| D5 | Navigation GPS | OSRM, routeDest, routeSteps, pickDest |
| D6 | Authentification | boot, afterAuth, auth, login, signup |
| D7 | Panneaux & navigation UI | App.panel, UIManager, syncNav, INC-004 |
| D8 | Alertes véhicule | vehicleAlertQuick, vehicleAlert, INC-007 |
| D9 | Canaux realtime | chMsg, chLoc, chReports, chCommunityReports, INC-001 |
| D10 | Activité & sélection carte | renderCategoryFeed, S.selPlate, INC-006 |

---

## D1 — BADGE & NOTIFICATIONS

### Contexte incohérence active : INC-003 (HAUTE PRIORITÉ)

**1. Fonctionnalité concernée**
Compteur de messages/alertes non lus affiché dans la navigation principale.
Deux badges : `#actBadge` (barre du bas) + `#topMsgBadge` (overlay fixe).

**2. Fichiers concernés**
- `index.html:327` — `pendingSignalCount()` : compte alertes véhicule non vues
- `index.html:328` — `setUnreadMsgCount(n)` : met à jour S.unreadMsgCount + localStorage + appelle updateCommunityStatus()
- `index.html:836` — `updateCommunityStatus()` : écrit #topMsgBadge (via S.unreadMsgCount + pendingSignalCount)
- `index.html:1267-1289` — `updateActBadge()` : écrit #actBadge ET #topMsgBadge (via S._actMessages + S.alerts)
- `badge.js:1-95` — `setBadge(n)` exposé comme `window.setUnreadMsgCount` — chemin 1

**3. ADN concernés**
- ADN-3 (Couplage Événement/Notification) : badge incorrect = obligation de notification non respectée
- VEHICLE-001 : un badge faux peut masquer une alerte urgente déjà persistée

**4. Incohérences connues**
- INC-003 : `#topMsgBadge` mis à jour par 2 logiques différentes :
  - `updateCommunityStatus()` calcule : `S.unreadMsgCount + pendingSignalCount()`
  - `updateActBadge()` calcule : `S._actMessages.filter(received+unread) + S.alerts.filter(status+TTL+isNearby)`
- Ces calculs peuvent diverger → badge incohérent

**5. Risques**
- CRITIQUE si le badge affiche 0 alors qu'il y a des alertes urgentes non vues
- FAIBLE si le badge surestime → l'utilisateur voit juste "plus" que réel
- Régression possible si updateCommunityStatus() est appelée à haute fréquence (elle l'est : locate, loadOthers, addCommunityAlert, renderAlerts, cleanupAlerts)

**6. Dépendances**
- `badge.js` expose `window.setUnreadMsgCount` = `setBadge` → appelle `App.updateCommunityStatus()`
- Ordre de chargement : badge.js chargé avant index.html (window.setUnreadMsgCount doit exister au boot)
- `updateActBadge()` est défini APRÈS boot (ligne 1267) — ne peut pas être appelé trop tôt

**7. Correction minimale recommandée (INC-003)**
Dans `updateCommunityStatus()` (index.html ligne 836), supprimer les 2 lignes qui écrivent #topMsgBadge et les remplacer par un appel à `this.updateActBadge?.()`.

Avant :
```javascript
const badge=$('topMsgBadge');
if(badge){badge.textContent=badgeFmt(mail);badge.style.display=mail>0?'flex':'none'}
```
Après :
```javascript
try{this.updateActBadge?.()}catch(e){}
```

Résultat : un seul chemin pour #topMsgBadge. updateCommunityStatus() garde son rôle pour le reste (affichage near/alerts count dans communityStatus, pas le badge).

**8. Test manuel**
1. Ouvrir l'app, recevoir un message → vérifier que #topMsgBadge s'incrémente
2. Aller dans Activité → marquer comme lu → vérifier que le badge tombe à 0
3. Recevoir une alerte communautaire → vérifier que le badge reflète l'alerte
4. updateCommunityStatus() s'appelle en boucle (locate, etc.) → vérifier stabilité badge

**9. Décisions historiques pertinentes**
- SESSION 6 : correction prête, non encore appliquée (Q-2 : Gardien doit valider unification)
- Recommandation unanime : updateActBadge() est le chemin le plus complet

**10. Ce qu'il ne faut surtout pas modifier**
- Ne pas toucher à la partie `el.innerHTML` de updateCommunityStatus() (affiche near+alerts dans la barre)
- Ne pas supprimer `S.unreadMsgCount` — utilisé ailleurs (badge.js, localStorage)
- Ne pas changer badge.js — il expose `window.setUnreadMsgCount` utilisé par messages.js

---

## D2 — MESSAGERIE P2P

**1. Fonctionnalité concernée**
Envoi/réception de messages plaque-à-plaque. Fil de conversation par plaque.

**2. Fichiers concernés**
- `messages.js:1-588` — module ImmatMessages (State, envoi, réception, rendu)
- `messages.js:37` — `sb()` : fonction (pas variable) — retourne le client Supabase
- `messages.js:571` — `unsubscribe()` : ✅ INC-008 corrigé (scope client)
- `index.html:324` — `S.conv` : plaque sélectionnée ('all' ou 'AB-123-CD')
- `index.html:324` — `S.selPlate` : plaque cliquée sur carte (distinct de S.conv)

**3. ADN concernés**
- ADN-2 : nPlate() est la fonction canonique pour tout lookup de plaque
- ADN-6 : tout message envoie des données à un tiers — consentement implicite par l'inscription

**4. Incohérences connues**
- INC-001 : S.chMsg (postgres_changes) + State.channel (broadcast) écoutent tous les deux les nouveaux messages → double notification possible
- INC-007 : vehicleAlertQuick() essaie ImmatMessages.sendToPlate() puis App.sendMsg() → double envoi possible (dépend de INC-001)

**5. Risques**
- Double badge si INC-001 non résolu
- Double message reçu si INC-007 non résolu
- Perte de canal si State.channel non nettoyé à la déconnexion (✅ corrigé INC-008)

**6. Dépendances**
- ImmatMessages patche App.panel() et App.pickPlate() et App.vehicleAlert()
- App.panel() est ensuite repatchée par ui.js — ordre critique (messages.js avant ui.js)
- State.channel est le 5e canal realtime — distinct de S.chMsg

**7. Correction minimale**
- INC-001/007 : décision Gardien requise (Q-1) avant correction
- Si accidentel : supprimer State.channel dans messages.js, garder S.chMsg
- Si intentionnel : ajouter déduplication par message ID avant d'appeler updateActBadge

**8. Test manuel**
- Envoyer un message → vérifier réception unique (pas double)
- Se déconnecter → vérifier que State.channel est nettoyé (console.log)
- Cliquer véhicule carte → "Contacter" → vérifier ouverture conversation correcte

**9. Décisions historiques**
- INC-008 : corrigé SESSION 6 — `const client = sb()` dans unsubscribe()
- Q-1 ouvert : les doubles canaux sont-ils intentionnels ? Décision Gardien requise

**10. Ce qu'il ne faut surtout pas modifier**
- `sb()` ligne 37 : fonction, pas variable — appels dans tout messages.js
- L'ordre de patching App.panel() — messages.js avant ui.js, sinon ui écrase messages
- nPlate() sur toute plaque avant lookup

---

## D3 — CARTE & GPS

**1. Fonctionnalité concernée**
Carte Leaflet avec position utilisateur + marqueurs autres conducteurs. Mode conduite.

**2. Fichiers concernés**
- `index.html:476` — `locate()` : watchPosition, appelle updateCommunityStatus(), envoie position Supabase
- `index.html:~530` — `loadOthers()` : recrée tous les marqueurs (INC-005)
- `index.html:324` — `S.map, S.myMarker, S.otherMkrs, S.nearby, S.driveMode, S.autoFollow`

**3. ADN concernés**
- ADN-5 : la position sur la carte doit refléter la réalité (pas une position mise en cache)
- ADN-6 : la position est partagée — S.invisible doit être respecté

**4. Incohérences connues**
- INC-005 (PERF) : loadOthers() supprime et recrée TOUS les marqueurs Leaflet à chaque update GPS
  Acceptable < 20 véhicules. À optimiser en V2 (diff des marqueurs).

**5. Risques**
- INC-005 : au-delà de 20 véhicules, scintillement/lag perceptible
- S.invisible non vérifié dans loadOthers — l'utilisateur invisible voit les autres mais n'est pas vu

**6. Dépendances**
- S.chLoc (realtime) déclenche loadOthers() à chaque UPDATE user_locations
- locate() appelle updateCommunityStatus() → met à jour le badge (chemin updateCommunityStatus)
- S.nearby alimenté par loadOthers() → lu par updateCommunityStatus() pour le compteur near

**7. Correction minimale**
- INC-005 : V2 uniquement — ne pas corriger maintenant (risque > bénéfice)

**8. Test manuel**
- Activer GPS → vérifier marqueur propre sur la carte
- Simuler 2e compte → vérifier apparition marqueur autre véhicule
- Mode invisible → vérifier non-apparition chez l'autre

**9. Décisions historiques**
- INC-005 accepté comme dette V2

**10. Ce qu'il ne faut surtout pas modifier**
- La logique S.invisible dans locate() — si supprimée, brise la vie privée (ADN-6)
- L'appel updateCommunityStatus() dans locate() — met à jour le badge après chaque fix GPS

---

## D4 — SIGNALEMENTS & ALERTES COMMUNAUTAIRES

**1. Fonctionnalité concernée**
Création, réception, affichage des signalements communautaires (accidents, pannes, dangers).
Marqueurs sur carte. Feed dans panneau Activité.

**2. Fichiers concernés**
- `index.html:734` — `addCommunityAlert(raw, opts)` : point d'entrée unique pour toute alerte
- `index.html:327` — `pendingSignalCount()` : compte alertes véhicule non vues
- `index.html:835` — `subscribeCommunityReports()` : écoute postgres_changes + broadcast
- `index.html:324` — `S.alerts, S.alertHistory, S.alertMarkersById`

**3. ADN concernés**
- ADN-3 + VEHICLE-001 : toute alerte doit être persistée avant notification
- addCommunityAlert() vérifie : déduplication par alertKey, TTL, isNearby

**4. Incohérences connues**
- INC-002 : S.chReports (postgres_changes) ET S.chCommunityReports (broadcast) appellent tous deux addCommunityAlert()
  → doublons possibles dans S.alerts si même alerte reçue par les deux canaux
  → addCommunityAlert() a une protection par alertKey() mais dépend de la qualité du matching

**5. Risques**
- Doublons visuels sur la carte (même signalement 2 fois)
- Compteur badge gonflé artificiellement

**6. Dépendances**
- Dépend de Q-1 (doubles canaux) — même décision que INC-001/002
- addCommunityAlert() appelle renderAlerts() + updateCommunityStatus() + showFloatingCard()

**7. Correction minimale**
- Si INC-002 accidentel : retirer l'écoute postgres_changes de subscribeCommunityReports(), garder uniquement broadcast
- Si intentionnel : s'assurer que alertKey() déduplique correctement (vérifier la fonction)

**8. Test manuel**
- Poster un signalement → vérifier qu'il apparaît UNE SEULE fois dans S.alerts
- Vérifier dans la console que addCommunityAlert() est appelé 1x ou 2x pour le même event

**9. Décisions historiques**
- Q-1 ouverte — décision Gardien requise avant correction INC-002

**10. Ce qu'il ne faut surtout pas modifier**
- La logique de déduplication alertKey() dans addCommunityAlert() — protège contre les doublons
- Le TTL par type d'alerte (ttlFor) — durée de vie différente selon gravité
- La vérification isNearby() — ne notifier que si dans le rayon configuré (ADN-6)

---

## D5 — NAVIGATION GPS (OSRM)

**1. Fonctionnalité concernée**
Calcul d'itinéraire OSRM, affichage du tracé sur la carte, instructions étape par étape.

**2. Fichiers concernés**
- `index.html` — `pickDest()`, `startNav()`, `checkRoute()`
- `index.html:324` — `S.routeDest, S.routeSteps, S.routeLayer, S.nextStep`
- `index.html:497` — `searchGps()` : ✅ INC-009 corrigé (XSS Nominatim)

**3. ADN concernés**
- ADN-6 : recherche d'adresse via Nominatim — données externes, potentiellement malformées
- INC-009 corrigé : data-* attributes remplacent inline onclick

**4. Incohérences connues**
- Aucune incohérence active sur ce domaine

**5. Risques**
- OSRM API externe — pas de fallback documenté si indisponible
- Nominatim gratuit — pas de garantie de disponibilité

**6. Dépendances**
- pickDest() appelle startNav() → S.routeDest défini → checkRoute() dans locate()

**7. Correction minimale**
- Aucune correction requise actuellement

**8. Test manuel**
- Rechercher une adresse → vérifier que le résultat affiche correctement (pas d'injection)
- Lancer navigation → vérifier tracé sur carte

**9. Décisions historiques**
- INC-009 : XSS corrigé SESSION 6 — data-* attributes + esc()

**10. Ce qu'il ne faut surtout pas modifier**
- La correction data-* attributes dans searchGps() — ne jamais revenir au inline onclick avec js()
- `esc()` est la fonction canonique pour données HTML, `js()` pour données JS (mais js() n'échappe pas les guillemets doubles HTML)

---

## D6 — AUTHENTIFICATION

**1. Fonctionnalité concernée**
Login / signup Supabase. Boot de l'app après auth. Gestion du profil.

**2. Fichiers concernés**
- `index.html:~boot` — `boot()` : vérification session, redirection login/app
- `index.html:~afterAuth` — `afterAuth()` : chargement profil + canaux realtime
- `index.html:318` — Clé publishable Supabase visible (Q-4 : RLS à vérifier)

**3. ADN concernés**
- ADN-6 : clé publishable exposée → acceptable UNIQUEMENT si RLS actif côté Supabase
- ADN-2 : owner_plate = identifiant primaire dans S.profile

**4. Incohérences connues**
- Q-4 ouverte : RLS Supabase non vérifié — action requise Gardien (dashboard Supabase)

**5. Risques**
- CRITIQUE si RLS désactivé : n'importe qui avec la clé peut lire messages et positions
- Clé publishable ≠ clé secrète — acceptable côté client, mais RLS obligatoire

**6. Dépendances**
- boot() → afterAuth() → load modules (messages.js, ui.js déjà chargés)
- afterAuth() lance les 4 canaux realtime + loadOthers() + updateActBadge()

**7. Correction minimale**
- Q-4 : vérification côté Supabase dashboard — aucun fichier à toucher

**8. Test manuel**
- Tenter requête Supabase sans auth → vérifier rejet (RLS)

**9. Décisions historiques**
- Q-4 ouverte depuis SESSION 6

**10. Ce qu'il ne faut surtout pas modifier**
- Ne jamais mettre la clé secrète Supabase dans le code client
- Ne pas modifier le schéma DB sans audit préalable (règle absolue BRIEFING section 5)

---

## D7 — PANNEAUX & NAVIGATION UI

**1. Fonctionnalité concernée**
Navigation entre panneaux (carte, messages, activité, profil). Gestion des overlays.

**2. Fichiers concernés**
- `ui.js:1-391` — UIManager : patche App.panel(), App.openReport(), App.openDrawer()
- `messages.js:~patch` — patche App.panel() une première fois
- `index.html:~App.panel` — définition originale de App.panel()
- `index.html:324` — `S.mode` : panel actif

**3. ADN concernés**
- Aucun ADN directement — INC-004 est technique, pas constitutionnel

**4. Incohérences connues**
- INC-004 (FAIBLE) : App.panel() patchée 2 fois — comportement implicite
  messages.js patche en premier, ui.js écrase après
  Ordre de chargement script dans index.html est critique

**5. Risques**
- Si l'ordre de chargement change (ui.js avant messages.js) : messages.js patch perdu
- Actuellement stable tant que l'ordre ne change pas

**6. Dépendances**
- syncNav() dans ui.js : mappe panel name → bouton nav actif (messages→navActivite, altet→navSignaler)
- Si un nouveau panel est ajouté, syncNav() doit être mis à jour

**7. Correction minimale**
- INC-004 : accepté comme risque faible — ne pas corriger sauf si restructuration index.html

**8. Test manuel**
- Naviguer entre tous les panneaux → vérifier highlighting bouton nav correct
- Ouvrir un message → vérifier panel 'messages' actif avec nav Activité highlighted

**9. Décisions historiques**
- INC-004 documenté, accepté

**10. Ce qu'il ne faut surtout pas modifier**
- L'ordre des scripts dans index.html : badge.js → messages.js → ui.js → (index.html déjà en mémoire)
- Les noms de panels dans syncNav() — 'messages', 'altet', 'map', 'profil'

---

## D8 — ALERTES VÉHICULE

**1. Fonctionnalité concernée**
Envoi rapide d'alerte à un autre véhicule (pneu crevé, lumière allumée, etc.).

**2. Fichiers concernés**
- `index.html:~vehicleAlertQuick` — tente ImmatMessages.sendToPlate() puis App.sendMsg() en fallback
- `messages.js:~vehicleAlert` — patché par messages.js

**3. ADN concernés**
- ADN-3 + VEHICLE-001 : l'alerte doit être persistée avant envoi

**4. Incohérences connues**
- INC-007 (MOYENNE) : double envoi possible — sendToPlate() ET sendMsg() peuvent tous deux réussir
  Dépend de INC-001 (double canal)

**5. Risques**
- Destinataire reçoit la même alerte deux fois
- Confusion utilisateur

**6. Dépendances**
- Dépend de Q-1 (doubles canaux) — même décision

**7. Correction minimale**
- Attendre décision Q-1 — si canaux unifiés, INC-007 se résout naturellement

**8. Test manuel**
- Envoyer alerte → vérifier réception unique chez destinataire

**9. Décisions historiques**
- INC-007 documenté, en attente Q-1

**10. Ce qu'il ne faut surtout pas modifier**
- Ne pas supprimer le fallback sans tester que sendToPlate() fonctionne seul

---

## D9 — CANAUX REALTIME

**1. Fonctionnalité concernée**
4 canaux Supabase realtime + 1 canal broadcast (messages.js).

**2. Fichiers concernés**
- `index.html:324` — `S.chMsg, S.chLoc, S.chReports, S.chCommunityReports`
- `messages.js:~State.channel` — 5e canal (broadcast messages)

**3. ADN concernés**
- ADN-3 : les canaux sont le mécanisme de l'obligation de notification

**4. Incohérences connues**
- INC-001 : S.chMsg + State.channel écoutent tous deux les messages → double notification
- INC-002 : S.chReports + S.chCommunityReports écoutent tous deux les signalements → doublons

**5. Risques**
- Double badge, double notification, double alerte sur la carte

**6. Dépendances**
- Les 5 canaux doivent tous être nettoyés à la déconnexion (logout)
- INC-008 : State.channel nettoyé dans unsubscribe() ✅ corrigé

**7. Correction minimale**
- Décision Q-1 requise. Si accidentel : supprimer State.channel OU S.chMsg

**8. Test manuel**
- À la déconnexion : vérifier dans les logs Supabase que tous les canaux sont unsubscribed

**9. Décisions historiques**
- INC-008 corrigé SESSION 6 — unsubscribe() scope client fixé
- Q-1 ouverte : intentionnel (redondance) ou accidentel ?

**10. Ce qu'il ne faut surtout pas modifier**
- Ne pas supprimer les deux canaux d'un coup sans tester la réception

---

## D10 — ACTIVITÉ & SÉLECTION CARTE

**1. Fonctionnalité concernée**
Panneau Activité : feed des messages + alertes + signalements.
Lien avec sélection d'un véhicule sur la carte.

**2. Fichiers concernés**
- `index.html:~renderCategoryFeed` — rendu du feed Activité
- `index.html:~renderActivityFeed` — rendu général
- `index.html:324` — `S.selPlate` : plaque sélectionnée via carte (≠ S.conv)
- `index.html:1267` — `updateActBadge()` : déclenche renderActivityMain

**3. ADN concernés**
- ADN-5 : si l'utilisateur clique un véhicule sur la carte, l'interface doit refléter cette réalité

**4. Incohérences connues**
- INC-006 (UX) : clic sur véhicule → S.selPlate défini → Activité ne le met pas en évidence
  L'intention utilisateur est ignorée

**5. Risques**
- Faible : UX seulement, pas de perte de données

**6. Dépendances**
- S.selPlate défini dans showVehicleContextMenu() ou pickPlate()
- renderCategoryFeed() ne lit pas S.selPlate actuellement

**7. Correction minimale (INC-006)**
Dans `renderCategoryFeed()`, ajouter classe CSS 'selected' si `S.selPlate` correspond à la plaque de l'item.
5 lignes de code maximum.

**8. Test manuel**
- Cliquer un véhicule sur la carte → aller dans Activité → vérifier mise en évidence

**9. Décisions historiques**
- Q-3 ouverte : décision UX Gardien

**10. Ce qu'il ne faut surtout pas modifier**
- Ne pas modifier S.selPlate dans renderCategoryFeed() — lecture seule
- S.conv et S.selPlate sont distincts et doivent le rester

---

## GARDE-FOUS CONSTITUTIONNELS

### Avant toute correction, vérifier :
1. La correction touche-t-elle un ADN ? → Discussion humaine obligatoire
2. La correction touche-t-elle VEHICLE-001 ? → Vérifier persist avant notify
3. La correction expose-t-elle des données tiers ? → Vérifier ADN-6
4. La correction envoie-t-elle une notification ? → Vérifier ADN-3

### Corrections toujours interdites :
- Modifier le schéma DB sans audit préalable
- Toucher au dossier immatrestore/
- Grosse refonte (plus de 20 lignes modifiées = red flag)
- Fusionner dans main sans validation Gardien

### Corrections toujours autorisées sans décision :
- Bug scope, variable non définie
- XSS, injection (ADN-6 — priorité haute)
- Correction ciblée < 5 lignes documentée dans BRIEFING.md

---

## ÉTAT DES INCOHÉRENCES (vue rapide)

| ID | D | Statut | Action requise |
|----|---|--------|----------------|
| INC-001 | D9 | 🔴 Actif | Décision Q-1 Gardien |
| INC-002 | D4 | 🔴 Actif | Décision Q-1 Gardien |
| INC-003 | D1 | 🟡 Correction prête | Appliquer (5 lignes) |
| INC-004 | D7 | 🟢 Accepté | Surveiller |
| INC-005 | D3 | 🟢 V2 | Ne pas toucher |
| INC-006 | D10 | 🟡 Correction prête | Décision Q-3 Gardien |
| INC-007 | D8 | 🔴 Actif | Décision Q-1 Gardien |
| INC-008 | D2 | ✅ Corrigé | SESSION 6 |
| INC-009 | D5 | ✅ Corrigé | SESSION 6 |

---

## RÉPONSE À LA QUESTION FINALE

**Le Noyau Opérationnel est-il la pièce manquante ?**

Oui et non.

Oui : ce fichier est la pièce qui transforme le corpus (lois) + la mémoire (PROJET-INTEL) + la carte terrain (TERRAIN-INTEL) en interface d'action directe. Sans lui, chaque session devait re-traverser 1807 lignes pour savoir quoi toucher.

Non : la vraie pièce manquante est plus simple. C'est la **discipline d'exécution**. Le corpus, la mémoire, le terrain, le Noyau — tout cela existe maintenant. Ce qui manque ce sont des corrections réelles appliquées à des bugs réels, testées et commitées. Le déclic n'est pas un document. C'est l'action.

Ce fichier a pour but de rendre l'action la plus rapide possible.

---

*Créé : SESSION 7, 2026-05-31*
*Fichier : SYSTEM-KERNEL.md*
*Dépend de : PROJET-INTEL.md (état), TERRAIN-INTEL.md (détails), ADN.md (principes)*
