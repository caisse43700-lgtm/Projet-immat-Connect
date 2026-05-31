# INVENTAIRE PRODUIT VIVANT — IMMATCONNECT PRO
# Basé sur lecture intégrale du code : index.html, messages.js, ui.js, badge.js, utils.js
# Date : 2026-05-31 — SESSION 7

---

## PHASE 1 — CARTOGRAPHIE COMPLÈTE DU CODE

### Écrans (flux auth)

| ID DOM | Nom | Déclencheur |
|--------|-----|-------------|
| `#sw` | Écran d'accueil | boot() si pas de session |
| `#sa` | Connexion / Inscription | goAuth() |
| `#sp` | Profil conducteur | afterAuth() si profil incomplet |
| `#sr` | Reset mot de passe | hash URL type=recovery |
| `#appScreen` | Application principale | openMap() |

### Navigation principale (bottom nav)

| ID | Label | Panel activé | Badge |
|----|-------|--------------|-------|
| `#navMap` | Carte | ferme le sheet | — |
| `#navSignaler` | Signaler | panelAltet | — |
| `#navActivite` | Activité | panelActivite | `#actBadge` |

### Panneaux dans le sheet (glissant bas)

| ID Panel | Nom utilisateur | Contenu |
|----------|----------------|---------|
| `#panelAltet` | Signaler | 3 étapes : Route / Véhicule / Aide |
| `#panelDrive` | Navigation GPS | Recherche, favoris, historique, contrôles |
| `#panelContact` | (Obsolète) | Formulaire message legacy |
| `#panelMessages` | Messages | ImmatMessages : Inbox / Envoyés / Nouveau |
| `#panelSettings` | Paramètres | 10 boutons de configuration |
| `#panelActivite` | Activité | Catégories + résumé + sous-panneau |

### Sous-panneaux panelAltet

| ID | Contenu |
|----|---------|
| `#sigStep1` | Choix catégorie : Route / Véhicule / Aide |
| `#sigStep2Route` | Types route : Accident / Bouchon / Obstacle / Travaux / Contrôle / Danger |
| `#sigStep2Vehicle` | Types véhicule : Pneu / Feu / Portière / Fumée / Objet / Autre + champ plaque |
| `#sigStep2Aide` | Types aide : Panne / Carburant / Batterie / Moteur / Incendie / Perdu |

### Sous-panneaux panelActivite

| ID | Contenu |
|----|---------|
| `#actMain` | 3 catégories (Route/Véhicule/Aide) + résumé Nouveaux/En cours/Traités |
| `#actCatPanel` | Sous-panneau avec onglets Reçus / Envoyés / Nouveau |

### Overlays (flottants sur la carte)

| ID | Nom | Déclencheur | Statut |
|----|-----|-------------|--------|
| `#reportPanel` | Signaler (legacy) | openReport() — redirigé vers altet | Obsolète |
| `#nearbyPanel` | Conducteurs proches | FAB 👥 ou drawer | Actif |
| `#alertsPanel` | Alertes actives | openAlerts() dans Drive | Doublon |
| `#floatingCard` | Carte flottante | showFloatingCard() | Actif |
| `#vehicleContextMenu` | Menu véhicule | clic sur marqueur | Actif |

### Drawers / Modals

| ID | Nom | Contenu |
|----|-----|---------|
| `#drawer` | Menu profil | Rayon, navigation, préférences |
| `#legal` | Confidentialité | Info vie privée |
| `#blocked` | Plaques bloquées | Liste + débloquer |
| `#recent` | Véhicules récents | Liste + contacter |

### Éléments fixes sur la carte

| Élément | Contenu | Visible quand |
|---------|---------|---------------|
| `.top-bar` | Chip profil + statut communauté | Toujours |
| `.fab-stack` | 4 boutons : Recentrer / Proches / Vue / SOS | Toujours |
| `.speed` | Vitesse km/h | Toujours |
| `#inst` | Instructions navigation | GPS actif + route |
| `#frontCarBanner` | Véhicule devant | Mode conduite + <350m |
| `#reputationToast` | Fiabilité augmentée | Après feedback utile |
| `#notif` | Notification message | Nouveau message reçu |
| `#toast` | Toast messages | Actions diverses |

### Badges et compteurs

| ID | Représente | Mis à jour par |
|----|-----------|----------------|
| `#actBadge` | Total non lus (msgs + alertes) | updateActBadge() |
| `#topMsgBadge` | Idem (legacy, caché à -9999px) | updateActBadge() |
| `#catBadgeRoute` | Alertes route actives | renderActivityMain() |
| `#catBadgeVehicle` | Alertes véhicule + msgs non lus | renderActivityMain() |
| `#catBadgeAide` | Demandes aide actives | renderActivityMain() |
| `#resumeNewBadge` | Total non lus (résumé) | renderActivityMain() |
| `#resumeEncBadge` | Total "en cours" | renderActivityMain() |
| `#actTabBadge` | Non lus dans onglet Reçus | renderCategoryFeed() |

### Marqueurs carte

| Type | Style | Déclencheur |
|------|-------|-------------|
| Mon véhicule | Cercle couleur + flèche heading | locate() |
| Autres véhicules | Cercle couleur + 🚗 | loadOthers() |
| Alertes/Signalements | Icône colorée (rouge/orange/noir) | addCommunityAlertMarker() |
| Tracé itinéraire | Ligne bleue | pickDest() |

### Actions vocales

| Fonction | Usage |
|---------|-------|
| `voiceGps()` | Dicter adresse GPS |
| `voicePlate()` | Dicter plaque dans iTarget |
| `voiceMsg()` | Dicter message |
| Voix navigation | Instructions OSRM lues par synthèse vocale |

---

## PHASE 2 — CLASSIFICATION PAR CATÉGORIE PRODUIT

### CAT-1 : Carte / GPS

**Ce qui existe :** Carte Leaflet, marqueur propre (couleur + heading), marqueurs autres véhicules, clustering (< 16m), vue conduite/2D, recentrage, invalidation resize, mode nuit auto.

**Ce qui fonctionne :** Affichage, clustering, clic marqueur → menu contexte.

**Ce qui est incomplet :** loadOthers() recrée tout à chaque update (INC-005). Pas de zoom automatique sur un signalement cliqué depuis la carte. Pas d'indication visuelle du véhicule sélectionné sur la carte après sélection.

**Ce qui est confus :** S.selPlate est défini au clic mais n'est pas reflété visuellement sur la carte (pas de highlight du marqueur).

**Ce qui manque :** Bouton "Signaler ici" directement depuis la carte. Bouton "Voir mon trajet" visible.

**Doublon :** Aucun ici.

**Mérite un bouton d'action :** "📍 Signaler ici" sur la carte (tap long ou bouton contextuel).

---

### CAT-2 : Véhicules proches

**Ce qui existe :** `#nearbyPanel` (overlay), liste avec plaque + pseudo + distance + bouton Contacter. `#frontCarBanner` (mode conduite, <350m). Sélecteur rayon (1/5/10/25 km) dans le drawer. `#recent` (véhicules récents vus).

**Ce qui fonctionne :** nearbyPanel correct. addRecent() automatique à chaque loadOthers().

**Ce qui est incomplet :** nearbyPanel n'affiche pas la couleur véhicule (renderNearby génère du HTML avec dot() — OK en réalité). Pas de tri alternatif. Pas de filtre par couleur.

**Ce qui est confus :** Le rayon est dans le drawer (profil), pas dans le panneau Proches — peu logique.

**Ce qui manque :** Bouton "Vider les récents" dans openRecent(). Bouton "Supprimer" sur chaque récent.

**Ce qui peut être supprimé :** Rien.

**Mérite un bouton :** "Vider la liste" dans openRecent().

---

### CAT-3 : Messages

**Ce qui existe :**
- ImmatMessages : Inbox (conversations groupées) / Envoyés / Nouveau (compose)
- Thread de conversation avec bulles envoyé/reçu
- Suppression par message (bouton × sur bulle) ✅
- Suppression de conversation (bouton 🗑 dans thread header) ✅
- 3 réponses rapides : "Je m'arrête / Je vérifie / Bien reçu" ✅
- Markage comme lu automatique à l'ouverture du thread ✅
- Restauration messages supprimés (Settings → "📨 Restaurer msgs") ✅
- Rate limiting : 5 messages/minute ✅

**Ce qui fonctionne :** Toute la messagerie fonctionne via ImmatMessages.

**Ce qui est incomplet :**
- panelContact (legacy) toujours dans le DOM — double de panelMessages
- `App.sendMsg()` et `ImmatMessages.sendToPlate()` coexistent (deux chemins)
- Pas de recherche dans les messages
- Pas de "marquer comme non lu"

**Ce qui est confus :**
- L'onglet "Messages" du bottom nav correspond à panelActivite (badge actBadge), pas panelMessages
- L'utilisateur peut recevoir une notification puis tomber soit sur Activity soit sur Messages

**Ce qui manque :** Aucun bouton d'appel téléphonique malgré les numéros existants en DB.

**Doublon :** panelContact vs panelMessages — panelContact est obsolète.

**Mérite une amélioration :** Bouton "📞 Appeler" si numéro disponible.

---

### CAT-4 : Alertes véhicule

**Ce qui existe :**
- vehicleAlertQuick() : 6 types (Pneu / Feu / Portière / Fumée / Objet / Autre)
- Envoi via ImmatMessages.sendToPlate() + broadcast temps réel
- Réception via floatingCard + addCommunityAlert()
- Répondre : "Info utile / Reçu / Vu / En attente"
- signalRecapCard : récapitulatif dernier signalement reçu
- respondVehicleAlert() : réponse + confiance trustDelta + message DB

**Ce qui fonctionne :** Le flux complet (envoi → réception → réponse) fonctionne.

**Ce qui est incomplet :**
- vehicleAlertQuick() peut envoyer deux fois (INC-007 — sendToPlate + broadcast)
- signalRecapCard toujours affiché même vide (hidden seulement si pas d'alertes)
- Pas de notification push native systématique

**Ce qui est confus :**
- vehicleAlert() (via contextMenu) vs vehicleAlertQuick() (via panelAltet step2Vehicle) — deux chemins distincts

**Ce qui manque :** Rien de bloquant.

---

### CAT-5 : Signalements route

**Ce qui existe :**
- 6 types route : Accident / Bouchon / Obstacle / Travaux / Contrôle / Danger
- roadReport() : addCommunityAlert + saveReportRemote (4 tentatives fallback)
- Mode hors ligne : S.offlineReports + syncOfflineReports() automatique toutes 90s
- Marqueurs carte avec couleur par niveau d'urgence
- Filtres dans panelAltet : Toutes / Route / Aide / Véhicule / Urgent

**Ce qui fonctionne :** Complet et robuste (4 tentatives DB + fallback local).

**Ce qui est incomplet :**
- Pas de catégorie "Météo" (verglas, brouillard)
- Filtres peu visibles (pills en scroll horizontal)
- Pas de confirmation de réception par l'émetteur ("combien l'ont vu")

**Ce qui est confus :**
- alertsPanel (overlay legacy) ET alertsList dans panelAltet — mêmes alertes, deux endroits

**Doublon :** alertsPanel vs alertsList dans panelAltet.

---

### CAT-6 : Activité / Feed

**Ce qui existe :**
- Écran principal : 3 catégories (Route/Véhicule/Aide) + résumé
- Sous-panneau catégorie : Reçus / Envoyés / Nouveau
- Carte par item : alerte ou conversation, avec actions contextuelles
- "📍 Voir sur la carte" pour alertes géolocalisées ✅
- "💬 Répondre" depuis l'activité ✅
- "Retirer" pour mes propres signalements ✅
- "Disparu / Toujours là" pour alertes route ✅
- "Je peux aider" pour demandes d'aide ✅
- Barre TTL (durée de vie restante) sur chaque alerte ✅
- markAllCatRead() ✅

**Ce qui fonctionne :** Structure claire et actions contextuelles bien pensées.

**Ce qui est incomplet :**
- INC-006 : sélection carte non reflétée dans Activité
- `_actMsgCard` et `_actAlertCard` — méthodes présentes mais apparemment inutilisées (voir Phase 7)
- Tab "Nouveau" redirige juste vers navSignaler — pas de création directe

**Ce qui est confus :**
- Différence entre panelMessages (ImmatMessages) et section Véhicule dans Activité — deux endroits pour les conversations
- Onglet "Reçus" marque automatiquement comme vu à l'ouverture — peut sembler intrusif

---

### CAT-7 : Notifications / Badges

**Ce qui existe :**
- `#actBadge` : badge Activité dans nav (total msgs non lus + alertes)
- `#topMsgBadge` : badge legacy caché (hors écran, -9999px)
- 3 badges catégorie dans actMain (Route/Véhicule/Aide)
- 2 badges résumé dans actMain (Nouveaux/En cours)
- 1 badge onglet Reçus dans actCatPanel
- floatingCard : notification visuelle auto-cachée après 8s
- `#notif` : bandeau notification message entrant
- `#reputationToast` : toast fiabilité
- Browser Notification API (si permission accordée)
- Vibration sur alerte urgente ✅

**Ce qui fonctionne :** Globalement correct après INC-003 corrigé.

**Ce qui est incomplet :**
- floatingCard disparaît après 8s — pas de liste "notifications non vues"
- Browser Notification : requestPermission() appelé au boot mais jamais relancé si refusé

**Ce qui est confus :**
- #topMsgBadge caché mais toujours mis à jour (vestige legacy pour compatibilité)
- Les 3 badges catégories dans actMain ET les badges résumé ET actBadge — 5 compteurs différents pour des données similaires

**Badge qui peut mentir :**
- catBadgeVehicle inclut msgs non lus + alertes véhicule — peut être > total réel si un message appartient aux deux

---

### CAT-8 : Profil / Identité

**Ce qui existe :**
- Inscription avec email / mot de passe / téléphone / plaque / couleur
- Indicateur de force mot de passe en temps réel ✅
- Vérification plaque disponible ✅
- Validation plaque FR (AB-123-CD) ✅
- Validation téléphone FR (0612345678) ✅
- Profil affiché dans top bar (chip : plaque + pseudo + couleur)
- Mode invisible (position retirée de la carte) ✅
- Pending profile pour reprendre après confirmation email ✅
- Multi-comptes : nettoyage session avant switch ✅

**Ce qui est incomplet :**
- Pas de modification du profil après création (pas d'écran "Modifier mon profil")
- Pas de suppression de compte
- Le pseudo et la couleur ne sont pas modifiables depuis l'app une fois créés

**Ce qui est confus :**
- profil conducteur (sp) vs drawer : deux endroits avec des infos profil
- Pas d'avatar, juste une couleur

**Ce qui manque :** Page "Modifier mon profil" accessible depuis le drawer.

---

### CAT-9 : Téléphone / Appel / Contact

**Ce qui existe :**
- nPhone() et vPhone() dans utils.js — validation numéro FR
- Stockage phone dans profiles.phone
- Numéro collecté à l'inscription

**Ce qui fonctionne :** Stockage OK.

**Ce qui est incomplet :**
- **Aucun bouton "Appeler" dans l'app** — le numéro est stocké mais jamais exposé à l'utilisateur
- Aucun `tel:` href dans le code
- Aucun accès au numéro depuis la liste "Conducteurs proches" ou le menu véhicule

**Ce qui manque :** CRITIQUE pour l'utilité — si un conducteur a donné son numéro, il s'attend à pouvoir être appelé.

**Recommandation :** Bouton "📞 Appeler" visible uniquement si le profil du conducteur a un téléphone valide. Vérification : récupérer le profil du destinataire et afficher ou masquer le bouton.

---

### CAT-10 : Navigation / Itinéraire

**Ce qui existe :**
- Recherche Nominatim (France, biais position, tri par distance) ✅ (XSS corrigé)
- Calcul OSRM route voiture ✅
- Instructions étape par étape ✅
- Voix GPS (synthèse vocale FR) ✅
- Recalcul automatique si déviation > 450m ✅
- Arrêt GPS propre stopGps() ✅
- POI rapides : Carburant / Resto / Parking / Garage / Recharge / Santé ✅
- Favoris GPS (jusqu'à 20) ✅
- Historique GPS (jusqu'à 20) ✅

**Ce qui est incomplet :**
- navPremium (ETA, Restant, Limite, Trafic, Voie, Recalcul) — données partiellement simulées
  - limitVal : estimé depuis la vitesse actuelle (50/80/110)
  - trafficVal : basé sur l'heure (7-9h, 17-19h = dense)
  - laneVal : "Suivre" si nextStep > 0, sinon "Tout droit"
  - Non basé sur des données réelles

**Ce qui est confus :**
- panelDrive contient à la fois navigation + favoris + boutons de carte (locate, stop, alertes, recentrer) — trop dense

**Ce qui manque :** Bouton "Annuler la navigation" visible une fois commencée.

**Ce qui peut être supprimé / simplifié :** navPremium avec données fausses donne une impression de fonctionnalité premium qui ne l'est pas vraiment.

---

### CAT-11 : Favoris / Récents / Blocage

**Ce qui existe :**
- Favoris GPS : sauvegarder destination courante → liste dans panelDrive ✅
- Historique GPS : auto-ajouté à chaque destination ✅
- Véhicules récents : auto-ajouté à chaque loadOthers() → modal openRecent() ✅
- Blocage : blockPlate() → S.blocked → localStorage → exclut des marqueurs carte ✅
- Déblocage : unblockPlate() dans modal ✅

**Ce qui est incomplet :**
- Pas de bouton "Supprimer" sur favori individuel
- Pas de bouton "Supprimer" sur historique GPS individuel
- Pas de "Vider les récents" en masse
- Favoris limitent à 4 en affichage (slice(0,4)) mais 20 stockés

**Ce qui est confus :**
- Favoris et Historique dans panelDrive — peu visibles si l'utilisateur n'ouvre pas Navigation

**Ce qui mérite un bouton :** "× Supprimer" sur chaque favori et historique.

---

### CAT-12 : Paramètres

**Ce qui existe (panelSettings, 10 boutons) :**
- 🚫 Bloqués → openBlocked()
- 🕘 Récents → openRecent()
- ⚖️ Confidentialité → openLegal()
- 🔔 Sons → toggleSounds()
- ⚡ Performance → toggleReduceEffects()
- 🧹 Cache → clearOfflineCache()
- 🔊 Voix GPS → toggleVoice()
- 📨 Restaurer msgs → restoreMessages()
- 🔄 Sync alertes → forceSyncAlerts()
- ⏻ Déconnexion → logout()

**Dans le drawer (profil) :**
- Rayon de détection (select 1/5/10/25 km)
- Navigation GPS
- Conducteurs proches
- Mode invisible
- Voix GPS (doublon settings)
- Sons (doublon settings)
- Performance (doublon settings)
- Vider le cache (doublon settings)
- Confidentialité (doublon settings)
- Déconnexion (doublon settings)

**Doublon massif :** Presque toutes les options du panelSettings sont aussi dans le drawer.

**Ce qui manque :**
- Modifier profil conducteur (plaque, pseudo, couleur, téléphone)
- Rayon de détection accessible dans panelSettings (seulement dans drawer)
- Langue (une seule langue de toute façon)

---

### CAT-13 : Hors ligne / Resync

**Ce qui existe :**
- S.offlineReports : file d'attente hors ligne (max 50) ✅
- syncOfflineReports() : toutes les 90s ✅
- window.addEventListener('online') : sync immédiate à la reconnexion ✅
- cacheState() : sauvegarde état GPS toutes les 30s ✅
- S.alerts en localStorage → persisté entre sessions ✅
- S.favorites, S.gpsHistory, S.recent → persistés ✅
- clearOfflineCache() → vide tout ✅

**Ce qui fonctionne :** Robuste.

**Ce qui est incomplet :**
- Pas d'indicateur visuel "Hors ligne" permanent (seulement toast)
- Pas de compteur "X signalements en attente de sync"

---

### CAT-14 : Sécurité / Données personnelles

**Ce qui existe :**
- XSS Nominatim : corrigé (INC-009) ✅
- esc() pour tout rendu HTML ✅
- Rate limiting messages : 5/minute ✅
- Mode invisible : suppression position DB ✅
- Données supprimées à la déconnexion ✅
- RLS Supabase : clé publishable exposée (Q-4 non vérifiée)
- Multi-comptes : isolation par email ✅

**Ce qui est incomplet :**
- RLS Supabase non vérifié — à faire côté dashboard

---

### CAT-15 : Éléments inutiles, doublons ou incomplets

| Élément | Statut | Recommandation |
|---------|--------|----------------|
| `#panelContact` | Obsolète — redirigé vers panelMessages par ui.js | Supprimer après validation |
| `#reportPanel` | Obsolète — redirigé vers panelAltet | Supprimer après validation |
| `#alertsPanel` | Doublon de alertsList dans panelAltet | Fusionner ou supprimer |
| `App._actMsgCard` | Jamais appelé directement | Vérifier et supprimer si mort |
| `App._actAlertCard` | Jamais appelé directement | Vérifier et supprimer si mort |
| `#topMsgBadge` | Legacy, caché à -9999px | Garder pour compat, commenter |
| Trust system (local) | Doublon de ReliabilityPro (DB) | Décision Gardien : unifier |
| navPremium (données simulées) | Trompeuse | Masquer ou documenter |
| Drawer + panelSettings | Doublon de toutes les options | Simplifier drawer ou settings |
| Tab "Nouveau" dans actCatPanel | Redirige juste vers navSignaler | Inutile — supprimer |

---

## PHASE 3 — FICHES PANNEAUX ET FONCTIONNALITÉS

### FICHE F-01 — panelAltet (Signaler)

- **Nom affiché :** Signaler
- **Nom technique :** panelAltet / App.navSignaler()
- **Fichier :** index.html lignes 63-153 + App.sigStep* + App.roadReport + App.vehicleAlertQuick + App.assist
- **À quoi ça sert :** Créer un signalement route, alerter un véhicule, demander de l'aide
- **Catégorie :** CAT-4 + CAT-5
- **Données lues :** S.myLat, S.myLng, S.selPlate, S.contextVehicle, $('sigVehiclePlate').value
- **Données écrites :** S.alerts, S.offlineReports, DB reports
- **Déclencheur :** navSignaler() / contextMenu "Signaler" / openVehicleReport()
- **Résultat attendu :** Signalement créé, broadcast, marqueur carte
- **Résultat actuel :** Fonctionne. 4 fallbacks DB.
- **Problèmes :** GPS requis pour route/aide (sinon toast error). Plaque à saisir manuellement pour alerte véhicule si pas de contextVehicle.
- **Interaction autres onglets :** Activité (S.alerts), carte (marqueur)
- **Badge lié :** catBadgeRoute / catBadgeVehicle / catBadgeAide
- **Mémoire / historique :** S.alertHistory (150 items)
- **Bouton supprimer :** Oui — via Activité "Retirer"
- **Bouton appeler :** Non
- **Swipe :** Non
- **Indispensable / utile / confus / doublon / inutile :** INDISPENSABLE
- **Recommandation :** Garder — améliorer l'affichage des alertes actives (filtres trop petits)

---

### FICHE F-02 — panelMessages (Messages)

- **Nom affiché :** Messages (dans panelActivite) / ouvert depuis contextMenu
- **Nom technique :** panelMessages / ImmatMessages
- **Fichier :** index.html lignes 157-202, messages.js 1-588
- **À quoi ça sert :** Messagerie plaque-à-plaque complète
- **Données lues :** Supabase table messages, S._actMessages
- **Données écrites :** S._actMessages, localStorage ic_deleted_msgs, badge
- **Déclencheur :** pickPlate(), clic notification, actOpenConv()
- **Résultat attendu :** Thread de conversation ouvert
- **Résultat actuel :** Fonctionne
- **Problèmes :** panelContact legacy toujours présent. Double canal (INC-001).
- **Badge lié :** actBadge, topMsgBadge
- **Mémoire :** Tout en Supabase + ic_deleted_msgs local
- **Bouton supprimer message :** Oui ✅ (bouton × dans bulle)
- **Bouton supprimer conversation :** Oui ✅ (🗑 dans thread header)
- **Bouton appeler :** NON — MANQUANT malgré numéros en DB
- **Swipe :** Non
- **Indispensable :** INDISPENSABLE
- **Recommandation :** Garder — ajouter bouton appel si numéro disponible

---

### FICHE F-03 — panelDrive (Navigation GPS)

- **Nom affiché :** Navigation GPS
- **Nom technique :** panelDrive
- **Fichier :** index.html ligne 154, App.searchGps/pickDest/startNav/checkRoute
- **À quoi ça sert :** Calcul itinéraire, recherche d'adresses, POI
- **Données lues :** S.myLat/myLng, S.routeDest, S.favorites, S.gpsHistory, Nominatim API, OSRM API
- **Données écrites :** S.routeLayer, S.routeSteps, S.routeDest, S.favorites, S.gpsHistory
- **Déclencheur :** drawer "Navigation GPS" / panel('drive')
- **Résultat attendu :** Tracé sur carte, instructions
- **Résultat actuel :** Fonctionne. Recalcul auto.
- **Problèmes :** navPremium avec données simulées. Pas de bouton "Annuler navigation".
- **Badge :** Aucun
- **Mémoire :** S.favorites + S.gpsHistory (localStorage)
- **Bouton supprimer favori :** NON — MANQUANT
- **Bouton supprimer historique :** NON — MANQUANT
- **Swipe :** Non
- **Indispensable :** UTILE mais pas critique
- **Recommandation :** Garder — ajouter bouton "✕" sur favoris et historique. Masquer navPremium si données fausses ou supprimer les champs trompeurs.

---

### FICHE F-04 — panelActivite (Activité)

- **Nom affiché :** Activité
- **Nom technique :** panelActivite / App.renderActivityFeed / renderCategoryFeed
- **Fichier :** index.html lignes 204-253, App.openActivityCat/renderCategoryFeed/_actModCard
- **À quoi ça sert :** Vue centralisée de tous les messages et alertes reçus/envoyés
- **Données lues :** S._actMessages, S.alerts, S.alertHistory
- **Données écrites :** statuts alertes (seen/present/gone), suppression conversations
- **Déclencheur :** navActivite()
- **Résultat attendu :** Feed chronologique avec actions contextuelles
- **Résultat actuel :** Fonctionne. Barre TTL, actions conditionnelles par type.
- **Problèmes :** S.selPlate non reflété (INC-006). Tab "Nouveau" inutile (redirige vers navSignaler).
- **Badge lié :** actBadge
- **Mémoire :** S.alertHistory (3h dans renderCategoryFeed)
- **Bouton supprimer :** Oui ✅ (conversations) / Oui ✅ (mes alertes → Retirer)
- **Bouton marquer lu :** Oui ✅ (markAllCatRead)
- **Swipe :** Non
- **Indispensable :** INDISPENSABLE
- **Recommandation :** Garder — corriger INC-006 (5 lignes). Supprimer tab "Nouveau".

---

### FICHE F-05 — panelSettings (Paramètres)

- **Nom affiché :** (accessible depuis le drawer)
- **Nom technique :** panelSettings
- **Fichier :** index.html ligne 203
- **Contenu :** 10 boutons (voir CAT-12)
- **Problèmes :** DOUBLON massif avec le drawer.
- **Recommandation :** Supprimer le panel, concentrer dans le drawer. OU supprimer les doublons du drawer.

---

### FICHE F-06 — nearbyPanel (Conducteurs proches)

- **Nom affiché :** Conducteurs proches
- **Fichier :** index.html ligne 274 + renderNearby()
- **Contenu :** Liste véhicules dans le rayon + bouton Contacter
- **Problèmes :** Pas de bouton "Appeler". Rayon réglé dans drawer, pas ici.
- **Recommandation :** Garder — ajouter bouton Appeler si numéro, déplacer sélecteur rayon ici.

---

### FICHE F-07 — drawer (Menu profil)

- **Fichier :** index.html lignes 287-312
- **Contenu :** Profil affiché + rayon + navigation + préférences
- **Problèmes :** Doublon avec panelSettings. Pas d'accès "Modifier profil".
- **Recommandation :** Simplifier — garder uniquement Rayon, Mode invisible, Déconnexion. Supprimer les doublons.

---

### FICHE F-08 — vehicleContextMenu

- **Fichier :** index.html ligne 52 + showVehicleContextMenu()
- **Contenu :** 2 boutons : "💬 Envoyer message" / "⚠️ Signaler problème"
- **Déclencheur :** Clic sur marqueur autre véhicule
- **Résultat :** Correct
- **Ce qui manque :** Bouton "📞 Appeler" (si numéro disponible). Bouton "🚫 Bloquer".
- **Recommandation :** Garder — enrichir avec Appeler + Bloquer

---

### FICHE F-09 — floatingCard (Carte flottante)

- **Fichier :** index.html lignes 275-285 + showFloatingCard/hideFloatingCard/fcAction
- **Contenu :** Icône + titre + sous-titre + 2 boutons
- **Durée :** 8 secondes auto-cache
- **Déclencheur :** Nouveau message reçu, nouvelle alerte, alerte véhicule urgente
- **Problème :** Disparaît après 8s sans historique — message perdu si l'utilisateur ne voit pas
- **Recommandation :** Garder — ajouter #notif comme fallback (déjà en place pour les messages)

---

### FICHE F-10 — SOS

- **Fichier :** index.html ligne 49 + startSosHold/cancelSosHold/sos()
- **Contenu :** Bouton SOS (hold 3s) → assist('panne') + confirm 112
- **Protection :** 2 confirmations avant appel 112
- **Résultat :** Fonctionne
- **Recommandation :** Garder tel quel

---

### FICHE F-11 — Fiabilité / Réputation (AppReliabilityPro)

- **Fichier :** index.html lignes 1362-1501
- **Contenu :** Score 0-100%, 5 niveaux, reward/penalize par feedback
- **Déclencheur :** signalFeedback() après un message de signalement
- **Problème :** Doublon avec trustDelta() local (S.trust en localStorage)
- **Données :** reliability_score, reliability_points, reliability_level en DB profiles
- **Visibilité :** Le score existe en DB mais n'est jamais affiché dans l'interface utilisateur
- **Recommandation :** DÉCISION GARDIEN — afficher le score dans le profil ou supprimer l'un des deux systèmes

---

## PHASE 4 — AUDIT DES ACTIONS MANQUANTES

| Question | Réponse | Verdict | Action recommandée |
|---------|---------|---------|-------------------|
| Peut-on supprimer un message ? | OUI ✅ bouton × dans bulle ImmatMessages | OK | Rien |
| Peut-on supprimer une conversation ? | OUI ✅ bouton 🗑 dans thread + actDeleteConv | OK | Rien |
| Peut-on masquer un signalement ? | OUI ✅ dismissAlert() depuis carte (popup) | OK | Rendre plus visible dans Activité |
| Peut-on marquer une alerte comme lue ? | OUI ✅ markAlertSeen() + auto en navActivite() | OK | Rien |
| Peut-on faire disparaître un badge ? | OUI ✅ badge tombe à 0 après lecture | OK | Rien |
| Peut-on appeler un conducteur ? | **NON ❌** | **MANQUANT CRITIQUE** | Ajouter bouton tel: si profile.phone valide |
| Peut-on contacter depuis la carte ? | OUI ✅ contextMenu "💬 Envoyer message" | OK | Ajouter Appeler ici aussi |
| Peut-on signaler depuis sa position ? | OUI ✅ roadReport(), assist() | OK | Rendre plus visible |
| Peut-on signaler bouchon sans cliquer véhicule ? | OUI ✅ navSignaler → Route → Bouchon | OK | Rien |
| Peut-on garder mémoire des signalements ? | OUI ✅ S.alertHistory (150 items) | OK | Rendre accessible depuis Activité Envoyés |
| Peut-on retrouver ce qui a été traité ? | OUI ✅ Activité > Envoyés + historique alertes | OK | Peu visible |
| Peut-on annuler une action ? | **NON ❌** (sauf Restaurer msgs) | Partiellement | Toast avec "Annuler" sur suppression ? |
| Peut-on bloquer proprement ? | OUI ✅ blockPlate() | OK | Ajouter dans contextMenu carte |
| Peut-on débloquer proprement ? | OUI ✅ modal Bloqués | OK | Rien |
| Peut-on supprimer un favori GPS ? | **NON ❌** | **MANQUANT** | Bouton × dans renderFavs() |
| Peut-on supprimer un historique GPS ? | **NON ❌** | **MANQUANT** | Bouton × dans renderHistory() |
| Peut-on vider les récents ? | **NON ❌** (pas en masse) | Manquant | Bouton "Vider" dans openRecent() |
| Peut-on modifier son profil ? | **NON ❌** | **MANQUANT** | Écran modifier profil dans drawer |
| Peut-on voir son score de fiabilité ? | **NON ❌** (en DB, pas affiché) | Manquant | Afficher dans profil drawer |

---

## PHASE 5 — AUDIT DES BADGES ET COMPTEURS

### `#actBadge` (bottom nav Activité)

- **Incrémenté par :** updateActBadge() — S._actMessages filtré (received + non lu) + S.alerts filtré (status ≠ seen/gone/resolved, TTL valide, isNearby)
- **Décrémenté par :** updateActBadge() (recalcul complet)
- **Disparaît quand :** total = 0
- **Données réelles :** ✅ Oui — basé sur les vrais objets
- **Peut bloquer :** Non — recalcul à chaque appel
- **Peut être faux :** Possible si S.alerts contient des alertes TTL expirées non nettoyées (cleanupAlerts toutes 60s résout ça)
- **Lisible mobile :** Oui — petite mais visible
- **Verdict :** ✅ CORRECT après INC-003

---

### `#topMsgBadge` (legacy, caché à -9999px)

- **Incrémenté par :** updateActBadge() (même calcul que actBadge)
- **Raison d'existence :** Compatibilité avec badge.js et ui.js syncBadge() qui le lisent
- **Peut bloquer :** Non
- **Verdict :** Garder caché pour compatibilité, ne pas en faire un nouveau badge visible

---

### `#catBadgeRoute` / `#catBadgeVehicle` / `#catBadgeAide`

- **Mis à jour par :** renderActivityMain() — S.alerts filtré par groupe
- **catBadgeVehicle** : compte alertes véhicule + msgs non lus — peut inclure les deux
- **Peut être faux :** Si une alerte est à la fois groupe='vehicle' ET liée à un message → comptée deux fois dans catBadgeVehicle
- **Verdict :** Acceptable — signale "il y a quelque chose" même si chiffre approximatif

---

### `#resumeNewBadge` / `#resumeEncBadge`

- **Mis à jour par :** renderActivityMain()
- **resumeNewBadge :** alertes status ≠ seen/present + msgs non lus
- **resumeEncBadge :** alertes status = seen/present
- **Verdict :** Cohérent

---

### `#actTabBadge` (dans l'onglet Reçus)

- **Mis à jour par :** renderCategoryFeed()
- **Compte :** items avec unread > 0 OU alerte non vue et non mine
- **Verdict :** Correct dans le contexte

---

### Conclusion badges

**Aucun badge ne ment réellement.** Après INC-003, le chemin est unifié. Le seul risque est catBadgeVehicle qui peut légèrement surestimer si un message et une alerte concernent le même conducteur. Acceptable.

**Amélioration possible :** Rendre actBadge plus grand sur mobile (actuellement petit `.nav-badge`).

---

## PHASE 6 — AUDIT DES FLUX RÉELS UTILISATEUR

### Flux 1 : Prévenir un conducteur proche

**Parcours actuel :**
1. FAB 👥 → nearbyPanel → "Contacter" (1 clic) OU clic marqueur → contextMenu → "💬 Envoyer message" (2 clics)
2. panelMessages en mode compose, plaque pré-remplie
3. Écrire → ➤
**Clics :** 2-3. **Confusion :** Nulle. **Friction :** Aucune. **Bouton manquant :** Appel téléphonique.

---

### Flux 2 : Signaler un bouchon à ma position

**Parcours actuel :**
1. navSignaler → step1 → "Route" → step2Route → "Bouchon"
**Clics :** 4. **Confusion :** Faible. **Friction :** Requiert GPS actif. **Bouton manquant :** "Signaler ici" depuis la carte (1 clic de moins).

---

### Flux 3 : Signaler un problème sur un véhicule

**Via carte :**
1. Clic marqueur → "⚠️ Signaler" → sigStepVehicle (plaque pré-remplie) → type
**Clics :** 3. **Friction :** Nulle si véhicule sélectionné.

**Via Signaler sans véhicule sélectionné :**
1. navSignaler → "Véhicule" → saisir plaque manuellement → type
**Clics :** 4 + saisie plaque. **Friction :** Saisie plaque difficile en conduisant.

---

### Flux 4 : Recevoir un message

1. floatingCard apparaît (8s) → "Répondre →" → panel messages, thread ouvert
**Clics :** 1. **Parfait.**

---

### Flux 5 : Lire le message

1. navActivite → catégorie Véhicule → tap conversation → actOpenConv() → panelMessages
**Clics :** 3. **Bon.**

---

### Flux 6 : Supprimer un message

**Dans thread :** Bouton × sur la bulle → confirm → supprimé. 2 clics. ✅
**Dans Activity :** Bouton "Supprimer" sur card conversation → confirm → supprimé. 2 clics. ✅
**Aucune suppression réelle en DB** — localStorage ic_deleted_msgs.

---

### Flux 7 : Recevoir et marquer une alerte comme lue

1. Notification (floatingCard + notif bar + badge)
2. navActivite → badge disparaît (auto-seen à l'ouverture) OU bouton "Vu" dans panelAltet
**Confusion :** Aller dans Activité = auto-seen pour TOUTES les alertes (navActivite() ligne 873-880). Peut sembler intrusif.

---

### Flux 8 : Appeler un conducteur si téléphone disponible

**Parcours actuel :** IMPOSSIBLE — le numéro n'est pas exposé.
**Parcours souhaité :** Bouton "📞 Appeler" dans contextMenu ou nearbyPanel ou thread.

---

### Flux 9 : Cliquer un véhicule puis aller dans Activité

1. Clic marqueur → S.selPlate défini
2. navActivite → INC-006 : rien n'est mis en évidence
**Bouton manquant :** Lien carte ↔ Activité. Correction prête (5 lignes CSS).

---

### Flux 10 : Retrouver l'historique d'un signalement

1. navActivite → catégorie → Envoyés → voir mon signalement passé ✅
2. panelAltet → sigStep2Route → "Historique des signalements" (details) ✅
**Confusion :** Deux endroits différents pour l'historique. Lequel consulter ?

---

### Flux 11 : Nettoyer les notifications anciennes

1. navActivite → "Tout marquer lu" ✅
2. Settings → "🧹 Cache" → vide tout (alertes, favoris, récents) ✅
3. dismissAlert() depuis marqueur carte → popup ✅
**Bon ensemble d'outils.**

---

### Flux 12 : SOS

1. Maintenir bouton SOS 3 secondes → assist('panne') + confirm appel 112 × 2
**Clics :** 2 confirmations. **Protection adéquate.**

---

## PHASE 7 — DOUBLONS ET ÉLÉMENTS INUTILES

| Élément | Classe | Description du doublon | Recommandation |
|---------|--------|------------------------|----------------|
| `#panelContact` | E | Panel message legacy — redirigé vers Messages par ui.js | Supprimer (après test) |
| `#reportPanel` | E | Panel signalement legacy — redirigé vers panelAltet | Supprimer (après test) |
| `#alertsPanel` | B | Overlay alertes — doublon de alertsList dans panelAltet | Fusionner : openAlerts() → panelAltet |
| `App._actMsgCard()` | D | Méthode HTML — non appelée directement (renderCategoryFeed utilise _actModCard) | Vérifier usage, supprimer si mort |
| `App._actAlertCard()` | D | Idem | Idem |
| Trust system (local) | B | trustDelta() + S.trust — doublon de AppReliabilityPro | Décision Gardien — unifier sur DB |
| navPremium (faux) | D | Données simulées (trafic, limite, voie) | Masquer les champs non réels |
| Drawer + panelSettings | B | Toutes les options en double | Simplifier drawer, un seul endroit |
| Tab "Nouveau" actCatPanel | E | Redirige juste vers navSignaler | Supprimer |
| `App.setMode` dans index.html | C | Conflit de nommage avec ImmatMessages.setMode | Renommer App.setMode → App.setAuthMode |
| `window.setUnreadMsgCount` | B | Défini dans badge.js ET messages.js | Garder badge.js, messages.js vérifie existence |
| `App.sendMsg()` | B | Coexiste avec ImmatMessages.sendToPlate() | Décision Q-1 — garder un seul chemin |

**Légende :** A garder / B fusionner / C renommer / D masquer / E supprimer après validation

---

## PHASE 8 — PROPOSITIONS ERGONOMIQUES

### PROP-01 — Bouton "📞 Appeler" si numéro disponible

**Valeur :** HAUTE — raison première d'avoir donné son numéro
**Difficulté :** FAIBLE — récupérer profile.phone du conducteur ciblé, créer lien tel:
**Risque :** Faible — ADN-6 (consentement déjà donné à l'inscription)
**Fichiers :** index.html — showVehicleContextMenu(), renderNearby(), openThread header
**Correction minimale :** Lors du chargement du profil du destinataire, si phone valide → afficher bouton href="tel:+33..."
**Test :** Cliquer un véhicule → contextMenu → vérifier présence/absence du bouton selon profil

---

### PROP-02 — Bouton "× Supprimer" sur chaque favori GPS

**Valeur :** MOYENNE
**Difficulté :** TRÈS FAIBLE — 2 lignes dans renderFavs()
**Risque :** Nul
**Fichiers :** index.html — renderFavs()
**Correction :** Ajouter `<button onclick="App.deleteFav(i)">×</button>` + App.deleteFav(i) qui filtre S.favorites
**Test :** Ajouter un favori, le supprimer, vérifier disparition

---

### PROP-03 — "Vider les récents" dans openRecent()

**Valeur :** FAIBLE-MOYENNE
**Difficulté :** TRÈS FAIBLE — 1 bouton + S.recent = []
**Risque :** Nul
**Fichiers :** index.html — openRecent()
**Test :** Ouvrir Récents → vider → vérifier liste vide

---

### PROP-04 — Bouton "Signaler ici" depuis la carte (tap long)

**Valeur :** HAUTE — réduit de 2 clics le flux signalement
**Difficulté :** MOYENNE — ajouter un FAB contextuel ou tap long sur carte
**Risque :** Faible — attention à ne pas déclencher accidentellement
**Fichiers :** index.html — carte Leaflet, initMap()
**Option simple :** Ajouter un bouton FAB dédié "⚠️" qui ouvre panelAltet directement depuis la carte
**Test :** Tap → signalement route → vérifier position envoyée correcte

---

### PROP-05 — Correction INC-006 : sélection carte → mise en évidence Activité

**Valeur :** MOYENNE — cohérence UX
**Difficulté :** TRÈS FAIBLE — 5 lignes dans renderCategoryFeed()
**Risque :** Nul
**Fichiers :** index.html — renderCategoryFeed()
**Correction :** Dans `_actModCard`, si item.plate === S.selPlate → ajouter classe CSS 'selected'
**Test :** Cliquer véhicule carte → aller Activité → vérifier mise en évidence

---

### PROP-06 — Bloquer depuis le contextMenu carte

**Valeur :** MOYENNE — accès direct sans passer par les paramètres
**Difficulté :** FAIBLE — ajouter bouton dans vehicleContextMenu
**Risque :** Faible — confirmation requise
**Fichiers :** index.html — vehicleContextMenu HTML + vehicleContextAction()
**Correction :** Ajouter `<button onclick="App.vehicleContextAction('block')">🚫 Bloquer</button>` + case 'block' dans vehicleContextAction()

---

### PROP-07 — Simplifier navPremium

**Valeur :** HAUTE — éviter de tromper l'utilisateur avec des données fausses
**Difficulté :** FAIBLE — masquer les champs non réels
**Risque :** Nul
**Fichiers :** index.html — panelDrive HTML + updateNavPremium()
**Correction :** Garder uniquement ETA et Restant (calculés depuis OSRM). Supprimer Limite, Trafic, Voie, Recalcul (données simulées).

---

### PROP-08 — Supprimer tab "Nouveau" dans actCatPanel

**Valeur :** FAIBLE — simplification
**Difficulté :** TRÈS FAIBLE — supprimer le bouton HTML + cas dans actCatTab()
**Risque :** Nul
**Fichiers :** index.html ligne 248

---

### PROP-09 — Afficher le score de fiabilité dans le profil

**Valeur :** HAUTE — rend visible un système déjà implémenté
**Difficulté :** MOYENNE — récupérer reliability_score depuis profiles + afficher dans drawer
**Risque :** Faible — lecture seule
**Fichiers :** index.html — openMap() ou drawer
**Correction :** Après openMap(), afficher "Fiabilité : X% (Niveau)" dans drawer

---

### PROP-10 — Modifier son profil depuis le drawer

**Valeur :** HAUTE — attendu par tout utilisateur
**Difficulté :** MOYENNE — réutiliser écran sp (panelProfil) depuis l'app
**Risque :** Faible — validation côté Supabase
**Fichiers :** index.html — drawer + saveProfile()
**Correction :** Bouton "✏️ Modifier profil" dans drawer → ouvre sp avec données pré-remplies

---

## PHASE 9 — PLAN DE PERFECTIONNEMENT

### BLOC 1 — Corrections immédiates à fort impact

| # | Action | Impact | Difficulté | Fichier |
|---|--------|--------|-----------|---------|
| B1-1 | Bouton 📞 Appeler dans contextMenu/nearbyPanel | CRITIQUE | FAIBLE | index.html |
| B1-2 | Corriger INC-006 (sélection carte → Activité) | HAUTE | TRÈS FAIBLE | index.html |
| B1-3 | Supprimer tab "Nouveau" dans actCatPanel | MOYENNE | TRÈS FAIBLE | index.html |
| B1-4 | Bouton × sur favoris GPS | MOYENNE | TRÈS FAIBLE | index.html |
| B1-5 | Masquer navPremium champs faux (Limite/Trafic/Voie) | HAUTE | FAIBLE | index.html |
| B1-6 | Bouton "Vider les récents" dans openRecent() | FAIBLE | TRÈS FAIBLE | index.html |
| B1-7 | Bloquer depuis vehicleContextMenu | MOYENNE | FAIBLE | index.html |

---

### BLOC 2 — Améliorations UX simples

| # | Action | Impact | Difficulté |
|---|--------|--------|-----------|
| B2-1 | Score fiabilité visible dans drawer | MOYENNE | FAIBLE |
| B2-2 | Bouton "✏️ Modifier profil" dans drawer | HAUTE | MOYENNE |
| B2-3 | FAB "⚠️ Signaler ici" depuis la carte | HAUTE | MOYENNE |
| B2-4 | Badge catBadgeVehicle plus précis (ne pas doubler compter) | FAIBLE | FAIBLE |
| B2-5 | "Annuler" dans toast suppression (undo 5s) | FAIBLE | MOYENNE |
| B2-6 | Sélecteur rayon accessible dans nearbyPanel | FAIBLE | TRÈS FAIBLE |

---

### BLOC 3 — Décisions Gardien nécessaires

| # | Question | Impact si décidé |
|---|---------|-----------------|
| G-1 | Q-1 : doubles canaux intentionnels ? → INC-001/002/007 | HAUTE — simplifie architecture |
| G-2 | Trust local vs ReliabilityPro DB → unifier ? | MOYENNE |
| G-3 | Q-3 : INC-006 sélection carte → Activité ? (5 lignes) | FAIBLE |
| G-4 | Supprimer panelContact, reportPanel, alertsPanel ? | FAIBLE |
| G-5 | Fusionner panelSettings dans drawer ? | FAIBLE |
| G-6 | Q-4 : vérifier RLS Supabase | CRITIQUE sécurité |

---

### BLOC 4 — À reporter / V2 / non prioritaire

| # | Action | Raison du report |
|---|--------|-----------------|
| V2-1 | Optimisation loadOthers() (INC-005) | < 20 véhicules OK |
| V2-2 | Recherche dans les messages | Complexité |
| V2-3 | Catégorie Météo (verglas, brouillard) | Faible urgence |
| V2-4 | Swipe pour supprimer | Complexité gesture |
| V2-5 | Marquer message comme "non lu" | Rarement utile |
| V2-6 | Filtres conducteurs proches par couleur | Faible valeur |
| V2-7 | Stats d'utilisation (nb signalements, messages) | Cosmétique |

---

## SYNTHÈSE FINALE

### TOP 10 ACTIONS LES PLUS UTILES

1. ✅ Appel audio WebRTC in-app (ImmatCall) — B1-1 (SESSION 8)
2. Modifier son profil depuis le drawer — B2-2
3. ✅ navPremium temps réel (Vitesse/Autour/Alertes) — B2-1 (SESSION 8)
4. ✅ Bouton × supprimer favori GPS — B3-1 (SESSION 8)
5. ✅ INC-006 corrigé — sélection carte → act-mod-selected — B6-1 (SESSION 8)
6. ✅ Bloquer depuis contextMenu carte — B5-1 (SESSION 8)
7. FAB "Signaler ici" depuis la carte — B2-3
8. Score fiabilité visible dans profil — PROP-09
9. ✅ Vider la liste "Véhicules récents" — B4-1 (SESSION 8)
10. Décider INC-001/002 (doubles canaux) — G-1

---

### TOP 10 INCOHÉRENCES PRODUIT

1. panelContact obsolète toujours dans le DOM
2. reportPanel obsolète toujours dans le DOM
3. alertsPanel (overlay) doublon de alertsList (panelAltet)
4. panelSettings duplique entièrement le drawer
5. Numéro de téléphone stocké mais jamais affiché (remplacé par ImmatCall WebRTC — SESSION 8)
6. ✅ navPremium données temps réel — SESSION 8
7. Deux systèmes de score (trust local + ReliabilityPro DB)
8. ✅ INC-006 corrigé — SESSION 8
9. ✅ Tab "Nouveau" supprimé — SESSION 8
10. _actMsgCard et _actAlertCard potentiellement du code mort

---

### TOP 10 ÉLÉMENTS À FUSIONNER OU SUPPRIMER

1. **Supprimer** panelContact (après test)
2. **Supprimer** reportPanel (après test)
3. **Fusionner** alertsPanel dans panelAltet
4. **Simplifier** drawer (garder Rayon + Invisible + Déconnexion)
5. **Supprimer** panelSettings (si drawer simplifié suffit)
6. **Supprimer** tab "Nouveau" dans actCatPanel
7. **Vérifier et supprimer** _actMsgCard/_actAlertCard si code mort
8. **Fusionner** trust system local → ReliabilityPro DB (un seul score)
9. **Masquer** champs navPremium non réels (Limite/Trafic/Voie)
10. **Fusionner** sendMsg() → ImmatMessages.sendToPlate() (un seul chemin d'envoi)

---

### TOP 10 BOUTONS / ACTIONS MANQUANTS

1. ✅ 📞 Appel audio WebRTC in-app — SESSION 8 (Activité + sigStep2Vehicle + sigStep2Aide)
2. ✏️ Modifier mon profil (drawer)
3. ✅ × Supprimer favori GPS individuel — SESSION 8
4. ✅ × Supprimer historique GPS individuel — SESSION 8
5. ✅ Vider la liste "Récents" en masse — SESSION 8
6. ⚠️ Signaler ici (FAB carte ou tap long)
7. ✅ 🚫 Bloquer depuis contextMenu carte — SESSION 8
8. 🏆 Mon score de fiabilité (dans profil)
9. Annuler navigation GPS (une fois commencée)
10. Bouton "Supprimer" sur chaque item de la liste Bloqués (remplacer "Débloquer" qui est peu clair)

---

### TOP 5 DÉCISIONS À SOUMETTRE AU GARDIEN

1. **G-1** Q-1 : Les doubles canaux (INC-001/002/007) sont-ils intentionnels ou accidentels ?
   → Impact : simplifie l'architecture si accidentels

2. **G-6** Q-4 : Vérifier RLS Supabase (sécurité critique)
   → Impact : si RLS manquant, les données de tous les conducteurs sont exposées

3. **G-2** Unifier trust system local (S.trust) et ReliabilityPro (DB) ?
   → Si oui : supprimer trustDelta() et S.trust, tout passer par DB

4. **G-4** Supprimer panelContact, reportPanel, alertsPanel du DOM ?
   → Après vérification qu'aucun chemin de code actif ne les utilise

5. **G-5** Fusionner panelSettings dans le drawer ?
   → Simplification UX — un seul point d'accès aux paramètres

---

*Inventaire généré : SESSION 7, 2026-05-31*
*Mis à jour : SESSION 8, 2026-05-31 — 8 corrections appliquées (B1-1 à B7-1)*
*Basé sur : index.html (1807L→~1970L), messages.js (588L), ui.js (391L), badge.js (95L), utils.js (62L)*
*Total code analysé : 2943 lignes*
*Fichier : INVENTAIRE-PRODUIT.md*
