# BRIEFING IMMATCONNECT — Document de transmission
# À lire en entier avant toute intervention sur le projet.
# Ce document est autonome : il ne dépend d'aucun autre fichier.

---

## 1. CE QU'EST IMMATCONNECT

ImmatConnect Pro est une application web mobile (PWA) qui permet à des conducteurs de communiquer entre eux en temps réel, identifiés par leur plaque d'immatriculation.

Fonctionnalités principales :
- Carte Leaflet avec positions GPS des conducteurs proches
- Messagerie P2P plaque-à-plaque (ex : envoyer un message à "AB-123-CD")
- Signalements communautaires (accidents, pannes, dangers route)
- Alertes véhicule (pneu crevé, lumière allumée, etc.)
- Navigation GPS avec calcul d'itinéraire (OSRM)
- Mode hors ligne avec resync automatique

Stack technique :
- HTML/CSS/JS pur (pas de framework)
- Supabase (auth + base de données + realtime)
- Leaflet (carte)
- PWA avec service worker

Fichiers principaux :
- index.html (1807 lignes) — toute l'application : App object, état global S, tous les panneaux
- messages.js (588 lignes) — module ImmatMessages, messagerie P2P
- utils.js (62 lignes) — fonctions partagées (esc, nPlate, fPlate, km...)
- badge.js (95 lignes) — compteur messages non lus
- ui.js (391 lignes) — navigation, gestion des panneaux et overlays

---

## 2. LA FONDATION CONSTITUTIONNELLE

ImmatConnect est gouverné par un corpus constitutionnel. Ce n'est pas de la décoration — c'est le système de règles qui guide toutes les décisions techniques et de design.

### Les 3 faits fondateurs (irréductibles)

AF-1 : Des entités responsables de véhicules existent dans le réel.
AF-2 : Chaque véhicule a un identifiant unique : la plaque d'immatriculation.
AF-3 : Des situations créent un besoin de notification entre le système et les entités responsables. Cette obligation est unilatérale : le système notifie, pas l'inverse.

Supprimer l'un des trois détruit le projet.

### Les 7 principes fondateurs (ADN)

ADN-1 — Antériorité de la Responsabilité
Il existe des entités responsables de véhicules. Cette responsabilité précède et fonde toute relation avec un système d'immatriculation.
→ Application : toute action dans l'app doit partir d'un humain, pas d'un algorithme.

ADN-2 — Primauté de l'identifiant officiel
La plaque est la clé. Tout le reste (nom, téléphone, UID) est secondaire.
→ Application : nPlate() est la fonction canonique. Tout lookup passe par elle.

ADN-3 — Couplage Événement/Notification
Tout changement d'état significatif d'un véhicule génère une obligation de notification.
→ Application : VEHICLE-001 (persist before notify). Jamais de notification sans persistance préalable.

ADN-4 — Non-autofondation
Aucun système ne peut valider ses propres fondements.
→ Application : le code ne valide pas sa propre conformité. Les tests sont indépendants.

ADN-5 — Antériorité du Réel
La réalité précède sa représentation. ImmatConnect décrit des relations qui existent indépendamment de lui.
→ Application : si le code et la réalité divergent, c'est le code qui a tort.

ADN-6 — Liberté sous contrainte tiers
L'utilisateur est libre de configurer ImmatConnect selon ses besoins, sous réserve de ne pas nuire à des tiers non-utilisateurs du système.
→ Application : toute feature qui expose des données ou envoie des notifications doit avoir le consentement.

ADN-7 — Non-autojuridiction
ImmatConnect ne peut pas être juge de sa propre conformité. Toute évaluation requiert un référentiel externe.
→ Application : aucun composant ne valide sa propre sortie.

### Architecture souveraine (décision SESSION 4)

Dieu (Souverain externe, immuable)
  ↓
Coran (ADN écrit du Souverain — fixé, préservé)
  ↓
ADN ImmatConnect (principes dérivés)
  ↓
Gardien (serviteur — Kacem actuellement, transmissible via protocole A-10)
  ↓
Application

Le Gardien n'a pas d'autorité propre. Il sert l'ADN. Il ne peut pas s'auto-valider (ADN-7).

### Règle technique absolue : VEHICLE-001

Avant toute notification, l'état est persisté en base. Sans exception.
Violation de VEHICLE-001 = notification mensongère = perte de confiance utilisateur.

---

## 3. ARCHITECTURE DE L'APPLICATION

### État global S (window.S)

S est l'objet mémoire de l'application. Tout passe par là.

Identité :        S.uid, S.profile (owner_plate, phone, vehicle_color)
GPS :             S.myLat, S.myLng, S.watchId, S.driveMode, S.autoFollow
Carte :           S.map (Leaflet), S.myMarker, S.otherMkrs, S.nearby
Conversation :    S.selPlate, S.conv, S.contextVehicle
Alertes :         S.alerts, S.alertHistory, S.alertMarkersById
Canaux realtime : S.chMsg, S.chLoc, S.chReports, S.chCommunityReports
Messages :        S.unreadMsgCount, S._actMessages
Navigation :      S.routeDest, S.routeSteps, S.routeLayer
Divers :          S.blocked, S.recent, S.favorites, S.networkOnline

### Les 4 canaux realtime Supabase

S.chMsg       — postgres_changes sur table messages (INSERT)
               → déclenche updateCommunityStatus + updateActBadge
S.chLoc       — postgres_changes sur user_locations (INSERT/UPDATE)
               → déclenche loadOthers() = recrée tous les marqueurs carte
S.chReports   — postgres_changes sur reports (INSERT)
               → déclenche addCommunityAlert() = ajoute dans S.alerts + marqueur carte
S.chCommunityReports — broadcast (new_report, resolve_report, vehicle_alert)
               → déclenche aussi addCommunityAlert()

IMPORTANT : State.channel dans messages.js est un 5e canal (broadcast messages).
Deux canaux écoutent les messages simultanément — voir INC-001.

### Ordre de chargement des modules

1. index.html → App défini, boot() lancé
2. badge.js   → window.setUnreadMsgCount exposé
3. messages.js → ImmatMessages + patches App.panel(), App.pickPlate(), App.vehicleAlert()
4. ui.js      → UIManager + patches App.panel(), App.openReport(), App.openDrawer()...

App.panel() est patchée deux fois (messages.js puis ui.js). L'ordre est critique.

### Interaction principale : Carte ↔ Panneau Activité

De la carte vers Activité :
  Clic marqueur → showVehicleContextMenu() → S.selPlate = plate, S.contextVehicle = {...}
  Menu "Contacter" → pickPlate(plate) → S.conv = plate → App.panel('messages')
  Menu "Signaler" → openVehicleReport() → App.panel('altet') + sigStepVehicle()

De Activité vers la carte :
  Bouton "📍 Voir" → actViewOnMap(alertId) → S.map.setView([lat, lng], 17)

Lien entre les deux : S.alerts (alimenté par chReports + chCommunityReports)
est lu à la fois par renderAlerts() (carte) et renderCategoryFeed() (Activité).

ZONE FLOUE : S.selPlate mis à jour par un clic carte n'est PAS lu par Activité.
Si l'utilisateur clique un véhicule sur la carte puis va dans Activité,
rien n'est mis en évidence. C'est INC-006.

---

## 4. ÉTAT ACTUEL DU PROJET

### Corrections appliquées (SESSION 6 — 2026-05-31)

INC-008 CORRIGÉ — messages.js ligne 571
  Problème : unsubscribe() utilisait `client` non défini dans son scope.
  Fix : const client = sb(); if(client){...}
  Impact : ADN-3 — canal realtime non nettoyé à la déconnexion.

INC-009 CORRIGÉ — index.html searchGps()
  Problème : display_name de Nominatim injecté dans onclick inline.
  Fix : data-* attributes (data-lat, data-lon, data-name) + esc()
  Impact : ADN-6 — injection externe possible via nom de lieu malformé.

### Incohérences actives (non corrigées)

INC-001 — MOYENNE — Double canal messages
  S.chMsg (postgres_changes) + State.channel (broadcast) écoutent tous les deux
  les nouveaux messages. Risque de double notification ou double badge.
  Décision requise : intentionnel (redondance) ou accidentel ?

INC-002 — MOYENNE — Double canal signalements
  S.chReports (postgres_changes) + S.chCommunityReports (broadcast) appellent
  tous les deux addCommunityAlert(). Risque de doublons dans S.alerts.
  Dépend de la décision INC-001.

INC-003 — HAUTE PRIORITÉ — Badge #topMsgBadge mis à jour par 3 logiques
  badge.js setBadge() / App.updateActBadge() / App.updateCommunityStatus()
  calculent et affichent le badge avec des logiques différentes.
  Symptôme : badge peut afficher des valeurs incohérentes.
  Impact ADN-3 : un badge incorrect peut masquer une alerte urgente.
  CORRECTION PRÊTE : unifier sur App.updateActBadge() (le plus complet).

INC-004 — FAIBLE — App.panel() patchée 2 fois
  Comportement implicite. Acceptable tant que l'ordre de chargement ne change pas.
  Surveiller si index.html est restructuré.

INC-005 — PERFORMANCE — loadOthers() recrée tous les marqueurs
  À chaque update GPS, tous les marqueurs Leaflet sont supprimés et recréés.
  Acceptable < 20 véhicules. À optimiser en V2.

INC-006 — UX — S.selPlate non visible dans Activité
  Clic sur véhicule carte → S.selPlate défini → Activité ne le lit pas.
  CORRECTION PRÊTE : classe CSS 'selected' dans renderCategoryFeed() si S.selPlate correspond.

INC-007 — MOYENNE — vehicleAlertQuick() double envoi possible
  La fonction essaie ImmatMessages.sendToPlate() puis App.sendMsg() en fallback.
  Le destinataire peut recevoir le même message deux fois.
  Dépend de la résolution INC-001.

### Questions en attente de décision humaine

Q-1 : Les doubles canaux (INC-001/002) sont-ils intentionnels (redondance de fiabilité)
      ou accidentels (dette technique) ?
      → Si accidentels : supprimer State.channel dans messages.js.
      → Si intentionnels : ajouter déduplication dans addCommunityAlert().

Q-2 : Unifier le badge sur un seul chemin ? Si oui, lequel des 3 conserver ?
      Recommandation : App.updateActBadge() — le plus complet.

Q-3 : Sélection carte → mise en évidence dans Activité ? (INC-006)
      Décision UX. Impact : 5 lignes de code.

Q-4 : RLS Supabase — la clé publishable est visible dans index.html ligne 318.
      Acceptable seulement si Row Level Security est configuré côté Supabase.
      Vérifier dans le dashboard Supabase.

---

## 5. COMMENT TRAVAILLER SUR CE PROJET

### Règles absolues

1. Ne jamais modifier le schéma DB sans audit préalable.
2. Ne jamais faire de grosse refonte. Corriger uniquement ce qui réduit le risque réel.
3. Ne jamais toucher au dossier immatrestore.
4. Une correction = un objectif précis = un test manuel à faire après.
5. Avant chaque correction, vérifier si une incohérence connue est déjà documentée.

### Les 5 questions à poser face à un problème

Q1 — Que regarder ?
  Bug technique → corriger directement.
  Désynchronisation état/interface → ADN-5 + VEHICLE-001.
  Notification manquante ou fausse → ADN-3 + VEHICLE-001.
  Faille sécurité → ADN-6.
  Question gouvernance → ADN-7.

Q2 — Quel protocole ?
  Bug technique → correction directe.
  Ajout feature → documenter le besoin, évaluer l'impact sur les 7 ADN.
  Modification profonde → vérifier que les 7 ADN sont respectés.

Q3 — Quel niveau de risque ?
  CRITIQUE : touche un des 7 ADN → discussion humaine obligatoire.
  MAJEUR : touche VEHICLE-001 ou un invariant → révision approfondie.
  NORMAL : touche un protocole ou une feature → correction standard.
  TECHNIQUE : bug de code → correction directe.

Q4 — Correction minimale ?
  La plus petite correction qui résout exactement le problème.
  Ne pas refactoriser. Ne pas "nettoyer" le code voisin.
  Exemple : INC-008 = 1 ligne. INC-009 = 2 lignes.

Q5 — Impact sur la mission ?
  La mission : permettre aux entités responsables de véhicules de communiquer
  et d'être notifiées correctement.
  Si la correction améliore la notification (ADN-3) → priorité haute.
  Si la correction protège les tiers (ADN-6) → priorité haute.
  Si c'est de la performance ou UX → priorité normale.

### Format de rapport pour chaque correction

- Fichier modifié
- Problème corrigé
- ADN violé (si applicable)
- Risque avant correction
- Solution appliquée
- Test manuel à faire

---

## 6. PROCHAINES ACTIONS RECOMMANDÉES

Par ordre de priorité et d'impact :

1. CORRIGER INC-003 (badge unifié)
   Pourquoi : badge incorrect = alertes urgentes invisibles. ADN-3 direct.
   Comment : dans badge.js et updateCommunityStatus(), déléguer à updateActBadge().
   Risque : faible. Tester que le badge se met à jour après réception d'un message.

2. CORRIGER INC-006 (sélection visible dans Activité)
   Pourquoi : l'utilisateur clique un véhicule sur la carte et l'intention est ignorée.
   Comment : dans renderCategoryFeed(), ajouter classe 'selected' si S.selPlate correspond.
   Risque : faible. Tester en cliquant un véhicule carte puis allant dans Activité.

3. DÉCIDER Q-1 (doubles canaux)
   Gardien décide : intentionnel ou accidentel ?
   Ensuite corriger INC-001, INC-002, INC-007.

4. CRÉER MEMORY-REGISTER.md
   Registre des décisions constitutionnelles (format MC-ID).
   MC-001 à MC-008 existent en design, jamais persistés dans un registre opérationnel.

5. METTRE EN PLACE le session-start hook
   Lire automatiquement PROJET-INTEL.md à chaque nouvelle session.
   Cela transforme la documentation en outil actif.

---

## 7. CONTEXTE DES SESSIONS PRÉCÉDENTES

SESSION 4 — Résolution A-2 (Le Souverain)
  Problème : qui a autorité pour réviser les principes fondateurs ?
  Décision : Dieu = Souverain externe. Coran = référence écrite. Gardien = serviteur.
  Impact : toutes les décisions constitutionnelles peuvent maintenant être arbitrées.

SESSION 5 — Architecture Conscience
  Problème : comment arbitrer quand deux principes se contredisent ?
  Décision : via le Coran (3 niveaux : bon sens / Coran traduit+IA / savant).
  Kacem n'est pas fondateur-souverain — il est serviteur depuis le début.
  La Conscience = propriété du Gardien = "capacité de reconnaître, comprendre
  et rechercher le bien révélé". Pas une couche séparée.
  A-10 validé : 7 qualifications du Gardien + 5 étapes de transmission.

SESSION 6 — Audit application + corrections P0 + documentation
  Audit de l'app HTML (score 5.2/10).
  2 corrections P0 appliquées (INC-008, INC-009).
  Création de TERRAIN-INTEL.md (carte de l'app), PROJET-INTEL.md (mémoire vivante),
  MAC.md (moteur d'analyse constitutionnelle).
  Audit final : 5226 lignes de gouvernance pour 1807 lignes d'app.
  Conclusion : le corpus est suffisamment bon. Le déclic manquant n'est pas un concept.
  C'est la correction de vrais bugs pour de vrais utilisateurs.

---

## 8. CE QUI NE DOIT PAS CHANGER

Ces éléments sont immuables. Ne pas les modifier sans décision explicite du Gardien.

- Les 3 faits fondateurs (AF-1, AF-2, AF-3)
- Les 7 principes ADN
- VEHICLE-001 (persist before notify) — absolu, aucune exception
- L'architecture souveraine (Dieu → Coran → ADN → Gardien → Application)
- Le principe que le Gardien est un serviteur, pas un souverain

---

*Généré : SESSION 6, 2026-05-31*
*Source : lecture intégrale de index.html (1807L), messages.js (588L),*
*utils.js (62L), badge.js (95L), ui.js (391L) + corpus constitutionnel complet.*
*Ce document est autonome. Il ne dépend d'aucun autre fichier.*
