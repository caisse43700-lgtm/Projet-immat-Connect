/**
 * knowledge-gardien-flows.ts — ImmatConnect Pro
 * Livre des Lois Fonctionnelles — référentiel complet des flux et comportements attendus.
 *
 * Ce fichier est LA source de vérité sur ce que l'application DOIT faire
 * dans chaque scénario. Ange l'utilise pour détecter les anomalies et produire
 * des diagnostics précis. Toute nouvelle fonctionnalité DOIT être documentée ici.
 *
 * Structure par flux :
 *   id, nom, trigger, acteurs, chaine_obligatoire, etat_expediteur, etat_destinataire,
 *   invariants_actifs, pannes_communes, verification_gardien
 */

// ── LOI GLOBALE — S'applique à TOUS les flux ─────────────────────────────────
export const LOIS_GLOBALES = `
=== LOIS GLOBALES (s'appliquent à tous les flux) ===

L1 — Miroir d'état (INV-008) : tout ce qui est persisté en DB DOIT être visible dans l'UI dans les 3 secondes.
L2 — Traçabilité (INV-013) : tout flux déclenche ImmatBus.emit() ET IE.create() dans cet ordre.
L3 — Badge cohérence : tout message/alerte reçu incrémente le badge correspondant ; tout tap sur la carte décrémente.
L4 — Realtime requis : les messages et alertes entre conducteurs transitent via Supabase Realtime. Sans canal SUBSCRIBED, le destinataire ne reçoit rien en temps réel.
L5 — RLS stricte : les conducteurs ne lisent que ce qui les concerne (own_plate, user_id). Jamais de données croisées.
L6 — Atomic fail-safe (INV-004) : si l'INSERT DB échoue, aucune émission Bus, aucun toast succès, aucun marqueur carte.
L7 — Idempotence affichage : rerendre un feed ne duplique pas les entrées (filtrage par id).
L8 — Push conditionnel : notification push uniquement si app fermée/arrière-plan ET push_subscriptions présent pour l'utilisateur cible.
`;

// ── FLUX 1 — Message texte libre ─────────────────────────────────────────────
export const FLOW_MESSAGE_SEND = `
=== FLOW-MESSAGE-SEND — Envoi message texte entre conducteurs ===

TRIGGER : ImmatMessages.sendToPlate(plate, msg) depuis la vue thread
ACTEURS : expéditeur (A), destinataire (B)

CHAÎNE OBLIGATOIRE (dans cet ordre) :
  1. findProfileByPlate(plate) → retourne {id, owner_plate, pseudo} — sinon toast "Conducteur introuvable"
  2. sb.from('messages').insert({from_user_id, to_user_id, body, context_type:null}) → retourne {id}
  3. ImmatBus.emit('MESSAGE_SENT', {plate, preview}) côté A
  4. IE.create({type:'MESSAGE_SENT', initiator:plate_A}) enregistré dans ledger OBD
  5. Supabase Realtime INSERT déclenche sur abonnement B : canal "messages:to_user_id=eq.{B.user_id}"
  6. ImmatMessages.refresh() côté B → S._actMessages mis à jour
  7. buildThreads() reconstruit les threads — message visible dans thread B

ÉTAT EXPÉDITEUR (A) après envoi :
  - Message visible dans thread ouvert (bulle droite)
  - Message visible dans liste conversations (aperçu tronqué)
  - icReplyText vidé
  - Badge nav Messages A : inchangé

ÉTAT DESTINATAIRE (B) après réception :
  - Message visible dans thread (si ouvert) OU liste conversations (aperçu mis à jour)
  - icNavMsgBadge incrémenté +1
  - Son + vibration si son activé (AudioManager)
  - Push notification si B hors app (titre : pseudo_A, corps : aperçu)

INVARIANTS ACTIFS : INV-008 (miroir), INV-012 (persistance avant affichage), INV-013 (traçabilité)

PANNES COMMUNES :
  P1 — findProfileByPlate retourne null
       Cause probable : GRANT SELECT manquant sur profiles, plaque non normalisée, compte supprimé
       Signal : OBD_FIND_PROFILE_* dans console, toast "Conducteur introuvable"
  P2 — INSERT échoue (erreur RLS)
       Cause probable : RLS trop restrictive, quota messages atteint, to_user_id null
       Signal : erreur Supabase dans console, toast "Impossible d'envoyer"
  P3 — Realtime ne déclenche pas chez B
       Cause probable : canal non souscrit, WebSocket fermé (iOS arrière-plan), reconnexion en cours
       Signal : B.startMsgs() pas appelé, statut canal != SUBSCRIBED
  P4 — Push non reçue
       Cause probable : push_subscriptions vide pour B, SW non actif, VAPID mal configuré
       Signal : table push_subscriptions = 0 lignes pour B.user_id

VÉRIFICATION GARDIEN :
  ✓ S._actMessages contient le message (côté A et B) dans les 3s
  ✓ Canal Realtime messages SUBSCRIBED pour les deux utilisateurs
  ✓ push_subscriptions non vide pour le destinataire
  ✓ ledger IE : MESSAGE_SENT présent dans les 10 dernières entrées
`;

// ── FLUX 2 — Signalement véhicule stationné ──────────────────────────────────
export const FLOW_PARKED_REPORT = `
=== FLOW-PARKED-REPORT — Signalement véhicule stationné ===

TRIGGER : App.stationReport(type, photoUrl?) depuis sigStep2Station
ACTEURS : signalant (A), propriétaire du véhicule (B)

CHAÎNE OBLIGATOIRE :
  1. S.myLat/myLng présents (GPS actif) — sinon toast "Position GPS requise"
  2. sigVehiclePlate non vide — sinon toast "Plaque requise"
  3. Photo optionnelle : _stationUploadPhoto() → photoUrl dans bucket 'parked-photos'
  4. ImmatMessages.sendToPlate(plate_B, corps, {context_type:'parked_report', report_type:type, image_url?})
     → INSERT messages avec context_type='parked_report'
  5. saveReportRemote({group:'parked', type, lat, lng}) → INSERT reports
  6. addCommunityAlert({group:'parked'}) → S.alerts mis à jour
  7. ImmatBus.emit('PARKED_REPORT_SENT', {plate, type})
  8. IE.create({type:'PARKED_REPORT', flow:'FLOW-STATION'})
  9. Navigation → Activité > Stationné > Envoyés

ÉTAT EXPÉDITEUR (A) :
  - Activité > Stationné > Envoyés : carte avec label propre, statut "⏳ En attente"
  - Alerte communautaire créée (marqueur carte visible tous conducteurs proches)
  - catBadgeStation : inchangé côté A (c'est A qui envoie)
  - Toast "Signalement envoyé ✅"

ÉTAT DESTINATAIRE B (propriétaire) :
  - Activité > Stationné > Reçus > En cours : carte avec label, point bleu (non lu)
  - catBadgeStation B incrémenté +1
  - icNavActBadge incrémenté +1
  - Push notification : "🅿️ [type] — plaque A"
  - Si photo : thumbnail 160px dans la carte Reçus

INVARIANTS ACTIFS : INV-001 (canal véhicule), INV-008 (miroir), INV-012 (persistance)

PANNES COMMUNES :
  P1 — GPS absent → signalement sans position → marqueur carte invisible
  P2 — Upload photo échoue → photoUrl null → signalement envoyé sans photo (silencieux)
  P3 — findProfileByPlate(B) échoue → message non envoyé à B → B ne reçoit rien
  P4 — context_type manquant → message apparaît dans thread Messages (panneau Messages) au lieu de Activité (bug d'architecture)
  P5 — Canal Realtime B non souscrit → B ne reçoit pas en temps réel

VÉRIFICATION GARDIEN :
  ✓ messages table : context_type='parked_report' pour ce signalement
  ✓ reports table : latitude/longitude non null, group='parked'
  ✓ B voit la carte dans Activité > Stationné > Reçus
  ✓ catBadgeStation B > 0
`;

// ── FLUX 3 — Réponse au stationné ────────────────────────────────────────────
export const FLOW_PARKED_RESPONSE = `
=== FLOW-PARKED-RESPONSE — Réponse conducteur au signalement stationné ===

TRIGGER : App.actStationReply(plate_A, msg) depuis Activité > Stationné > Reçus
ACTEURS : propriétaire B (répond), signalant A (reçoit la réponse)

CHAÎNE OBLIGATOIRE :
  1. ImmatMessages.sendToPlate(plate_A, msg, {context_type:'parked_response'})
  2. ImmatBus.emit('PARKED_RESPONSE_SENT', {plate})
  3. IE.create({type:'PARKED_RESPONSE'})
  4. Carte B passe de "En cours" à "Traités" (si statut updated dans DB ou local)

ÉTAT B (répondant) :
  - Carte Reçus passe à "Traités"
  - catBadgeStation B décrémenté (alerte traitée)

ÉTAT A (signalant) :
  - Envoyés : statut passe de "⏳ En attente" à "✅ Répondu"
  - Réponse visible inline dans la carte Envoyés
  - catBadgeStation A incrémenté (réponse reçue)
  - icNavActBadge A incrémenté

PANNES COMMUNES :
  P1 — parked_response apparaît dans Messages au lieu d'Envoyés → context_type absent
  P2 — Statut "⏳ En attente" ne passe pas à "✅ Répondu" → Realtime non déclenché ou ic_vm_replied non mis à jour
`;

// ── FLUX 4 — Alerte véhicule rapide ──────────────────────────────────────────
export const FLOW_VEHICLE_ALERT = `
=== FLOW-VEHICLE-ALERT — Alerte véhicule rapide (message direct à une plaque) ===

TRIGGER : App.vehicleAlertQuick(label) ou App.driverInfo(label) depuis menu contextuel carte
ACTEURS : signalant (A), conducteur cible (B identifié par plaque)

CHAÎNE OBLIGATOIRE :
  1. selectedVehiclePlate() ou sigVehiclePlate → plaque_B non vide
  2. ImmatMessages.sendToPlate(plate_B, label, {context_type:'vehicle_report'})
     → INSERT avec context_type='vehicle_report'
  3. ImmatBus.emit('VEHICLE_MESSAGE_SENT', {plate, label})
  4. IE.create({type:'VEHICLE_ALERT'})

ÉTAT A :
  - Activité > Véhicule > Envoyés : carte avec la plaque + label + statut ⏳/✅
  - Toast "Message envoyé ✅"

ÉTAT B :
  - Activité > Véhicule > Reçus : carte 🚨 avec plaque A + label
  - catBadgeRoute incrémenté (selon catégorie) OU catBadgeStation selon type
  - icNavActBadge incrémenté
  - Push : "🚨 [label] — plaque A"

PANNES COMMUNES :
  P1 — context_type manquant → message dans thread Messages chez B (mauvais panneau)
  P2 — plaque_B vide (selectedVehiclePlate() null) → envoi vers mauvaise cible ou échec silencieux
  P3 — B dans liste bloqués → message bloqué silencieusement
`;

// ── FLUX 5 — Signalement route ────────────────────────────────────────────────
export const FLOW_ROUTE_REPORT = `
=== FLOW-ROUTE-REPORT — Signalement route (broadcast communautaire) ===

TRIGGER : App.roadReport(type) depuis sigStep2Route
ACTEURS : signalant (A), tous conducteurs proches (rayon S.radiusKm)

CHAÎNE OBLIGATOIRE :
  1. S.myLat/myLng présents
  2. saveReportRemote({group:'route', type, lat, lng, plate:'ROUTE'}) → INSERT reports
  3. ImmatBus.emit('ROAD_CREATED', {plate, type, lat, lng})
  4. IE.create({type:'ROAD_ALERT', flow:'FLOW-SIGNAL-ROUTE'})
  5. addCommunityAlert({group:'route'}) → S.alerts + marqueur carte
  6. _getWeather() background (optionnel, non bloquant)

ÉTAT A :
  - Marqueur route sur la carte (orange/rouge selon type)
  - Alerte visible dans Activité > Route > Envoyés
  - catBadgeRoute inchangé côté A
  - cleanupAlerts() programmé (TTL selon type)

ÉTAT CONDUCTEURS PROCHES :
  - Realtime broadcasts → addCommunityAlert() reçu
  - Marqueur route sur leur carte
  - Activité > Route > Reçus : alerte visible
  - catBadgeRoute incrémenté
  - icNavActBadge incrémenté
  - BrainEngine : signal RISK_ZONE_NEAR ou HIGH_RISK_CONTEXT si urgence élevée

INVARIANTS ACTIFS : INV-002 (canal route), INV-008, INV-013

PANNES COMMUNES :
  P1 — GPS absent → saveReportRemote sans lat/lng → marqueur carte à (0,0) ou invisible
  P2 — Realtime broadcast non reçu → conducteurs proches ne voient pas l'alerte
  P3 — catBadgeRoute non incrémenté → badge Activité ne reflète pas l'alerte
  P4 — Marqueur carte dupliqué → syncCommunityAlerts() appelé plusieurs fois sans dédup

VÉRIFICATION GARDIEN :
  ✓ reports table : latitude/longitude non null, group='route', type correct
  ✓ S.alerts contient l'alerte (group='route')
  ✓ Marqueur Leaflet présent sur la carte
`;

// ── FLUX 6 — Demande d'aide ───────────────────────────────────────────────────
export const FLOW_HELP_REQUEST = `
=== FLOW-HELP-REQUEST — Demande d'aide SOS ===

TRIGGER : App.assist(type) depuis sigStep2Aide
ACTEURS : conducteur en difficulté (A), conducteurs proches (helpers)

CHAÎNE OBLIGATOIRE :
  1. S.myLat/myLng présents (CRITIQUE — sans GPS l'aide ne peut pas localiser A)
  2. saveReportRemote({group:'assist', type, needs_help:true, lat, lng}) → INSERT reports
  3. ImmatBus.emit('HELP_CREATED', {plate, type, lat, lng})
  4. IE.create({type:'HELP', flow:'FLOW-ASSIST-REQUEST'})
  5. addCommunityAlert({group:'assist', needs_help:true})
  6. Si type==='incendie' → toast "🔥 Appelez le 18" différé 800ms (CRITIQUE SÉCURITÉ)
  7. Realtime broadcast → helpers reçoivent l'alerte

ÉTAT A :
  - Alerte aide visible dans Activité > Aide > Envoyés (statut: cherche aide)
  - Marqueur SOS sur la carte A (rouge pulsant)
  - cleanupAlerts() TTL 30 min (aide expire)

ÉTAT HELPERS PROCHES :
  - FloatingCard "Conducteur en difficulté" (type, position)
  - Activité > Aide > Reçus : carte avec boutons "J'arrive 🚗" / "Je ne peux pas"
  - catBadgeHelp incrémenté
  - renderAideCallSection() : bouton appel direct vers A
  - SwarmEngine : SWARM_HELP_NEARBY si ≥1 helper nearby

INVARIANTS ACTIFS : INV-003 (canal aide), INV-007 (consentement GPS), INV-008

PANNES COMMUNES :
  P1 — GPS absent → lat/lng null → helpers ne peuvent pas localiser A → SOS inutile
  P2 — type='incendie' sans toast pompiers → SÉCURITÉ — toast obligatoire
  P3 — actHelpReply(plate) au lieu de actHelpReply(alertId, statut) → bouton J'arrive casse
  P4 — renderAideCallSection() cible DOM absent → bouton appel silencieusement absent
`;

// ── FLUX 7 — Réponse à l'aide ─────────────────────────────────────────────────
export const FLOW_HELP_RESPONSE = `
=== FLOW-HELP-RESPONSE — Réponse d'un helper à la demande d'aide ===

TRIGGER : App.actHelpReply(alertId, 'arrivant') depuis Activité > Aide > Reçus
ACTEURS : helper (B), conducteur en difficulté (A)

CHAÎNE OBLIGATOIRE :
  1. sb.from('reports').update({status:'helper_coming', helper_plate:B.plate}).eq('id', alertId)
  2. ImmatMessages.sendToPlate(plate_A, "J'arrive !", {context_type:'help_response'})
  3. ImmatBus.emit('HELP_RESPONSE_SENT', {plate:plate_A, key:'arrivant'})
  4. IE.create({type:'HELP_RESPONSE'})

ÉTAT B (helper) :
  - Carte Reçus passe à "En route" (status helper_coming)

ÉTAT A (en difficulté) :
  - Activité Aide Envoyés : statut "🚗 Un conducteur arrive"
  - Carte "helper coming" visible avec plaque B
  - Bouton évaluation helper (après résolution)
`;

// ── FLUX 8 — Appel vocal ──────────────────────────────────────────────────────
export const FLOW_CALL = `
=== FLOW-CALL — Appel vocal P2P via Agora RTC ===

TRIGGER : CallManager.contactByCall(plate_B, '') depuis journal/proches/menu contextuel
ACTEURS : appelant (A), appelé (B)

CHAÎNE OBLIGATOIRE — PHASE SIGNALING :
  1. CallManager.canCall() → vérifie perms (callLevel, blocklist)
  2. CallManager.initiateCall(plate_B) → INSERT call_requests {caller_plate, callee_plate, status:'pending', channel_name}
  3. Realtime INSERT déclenche chez B : canal "call_requests:callee_plate=eq.{B.plate}"
  4. _showIncomingPopup() côté B : overlay entrant (sonnerie WAV + vibration)
  5. IE.create({type:'CALL_RECEIVED'}) côté B (dans _showIncomingPopup)
  6. B accepte → call_requests UPDATE {status:'accepted'}
  7. Realtime UPDATE déclenche chez A : overlay sortant mis à jour "Connexion..."
  8. Agora RTC joinChannel() des deux côtés avec channel_name + token Agora
  9. Connexion audio établie
 10. call_requests UPDATE {status:'connected', started_at}

ÉTAT A (appelant) — overlay sortant :
  - #callOverlay visible (sortant), plaque B affichée
  - Minuterie démarre (callOvTimer)
  - Journal appel : émis, heure, durée

ÉTAT B (appelé) — overlay entrant :
  - #callOverlay visible (entrant), plaque A affichée
  - Sonnerie WAV (AudioManager) + vibration
  - Bouton ✅ Accepter / ❌ Refuser
  - Push notification si app fermée

ANNULATION (A annule avant réponse B) :
  - call_requests UPDATE {status:'cancelled'}
  - Realtime déclenche chez B → overlay fermé
  - Aucune entrée "appel manqué" si B n'a pas encore vu l'overlay

APPEL MANQUÉ (B ne répond pas 30s) :
  - call_requests UPDATE {status:'missed'}
  - Journal appel B : manqué (badge CALL_MISSED)

INVARIANTS ACTIFS : INV-004 (atomicité), INV-008 (miroir overlay)

PANNES COMMUNES :
  P1 — Realtime canal call_requests non souscrit chez B → B ne reçoit pas l'appel
  P2 — Token Agora expiré ou AGORA_APP_CERTIFICATE absent → joinChannel() échoue
  P3 — AudioContext suspendu iOS (avant 1er tap) → sonnerie silencieuse
  P4 — overlay B ne se ferme pas à l'annulation A → Realtime UPDATE non traité
  P5 — callOvTimer double (overlay ouvert deux fois sans fermeture) → minuterie dupliquée

VÉRIFICATION GARDIEN :
  ✓ call_requests table : statut cohérent avec l'état des overlays
  ✓ Canal Realtime call_requests SUBSCRIBED pour les deux conducteurs
  ✓ AudioContext.state === 'running' (après 1er tap)
`;

// ── FLUX 9 — Notification push ────────────────────────────────────────────────
export const FLOW_PUSH_NOTIFY = `
=== FLOW-PUSH-NOTIFY — Notification push en arrière-plan ===

TRIGGER : toute action qui envoie un message à un utilisateur (message, signalement, appel entrant)
ACTEURS : envoyeur (action), destinataire (B hors app)

CHAÎNE OBLIGATOIRE :
  1. B a appelé subscribePush() → push_subscriptions contient B.user_id avec endpoint/p256dh/auth
  2. Service Worker immat-brain-dialog (ou Edge Function dédiée) lit push_subscriptions
  3. web-push.sendNotification(subscription, payload) → HTTP 201
  4. SW B reçoit 'push' event → self.registration.showNotification(titre, options)
  5. Notification visible sur écran de B (OS)
  6. B tape la notif → 'notificationclick' → clients.openWindow('./') ou focus onglet existant
  7. App reçoit PUSH_NOTIFICATION_CLICKED → navigation vers le bon panneau

PRÉREQUIS :
  - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT configurés dans Supabase Secrets
  - B a accordé la permission Notifications (Notification.permission === 'granted')
  - SW actif (registration.active !== null)
  - App ajoutée à l'écran d'accueil iOS (PWA installée)

PANNES COMMUNES :
  P1 — push_subscriptions vide pour B → pas de notification
  P2 — Secrets VAPID absents → web-push.sendNotification() échoue 401
  P3 — iOS non installé en PWA → notifications bloquées par Safari
  P4 — SW non actif (page jamais visitée) → push event perdu
  P5 — Permission Notification refusée → toast "Activer les notifications dans Paramètres"

VÉRIFICATION GARDIEN :
  ✓ push_subscriptions : 1 ligne par utilisateur actif
  ✓ Notification.permission === 'granted' (dans console)
  ✓ navigator.serviceWorker.controller !== null
`;

// ── FLUX 10 — GPS et localisation ─────────────────────────────────────────────
export const FLOW_GPS = `
=== FLOW-GPS — Localisation et partage de position ===

TRIGGER : App.locate() → navigator.geolocation.watchPosition()
ACTEURS : conducteur (A), autres conducteurs proches

CHAÎNE OBLIGATOIRE :
  1. navigator.geolocation.watchPosition() → S.watchId != null
  2. Position reçue → S.myLat, S.myLng, S.myGpsAt = Date.now(), S.myAccuracy
  3. ImmatBus.emit('GPS_LOCATED', {lat, lng, acc})
  4. IE.create({type:'GPS_FIX'})
  5. Si !S.invisible → sb.from('user_locations').upsert({lat approx, lng approx, user_id})
  6. Marqueur propre sur carte (zIndexOffset 1000 pour apparaître au-dessus)
  7. loadOthers() → fetch conducteurs proches → marqueurs carte
  8. BrainEngine reçoit nouvelle position → met à jour S._brainOrientation

ÉTAT ATTENDU :
  - S.watchId : nombre (non null)
  - S.myLat, S.myLng : décimaux valides (non 0)
  - S.myGpsAt : timestamp < 2 min (sinon ImmatKernel pénalise)
  - Marqueur propre visible sur carte (cercle bleu/couleur véhicule)
  - user_locations : ligne upsertée dans les 10s

PANNES COMMUNES :
  P1 — Permission GPS refusée → S.watchId null → aucun signalement possible
  P2 — iOS bloque position arrière-plan → S.myGpsAt > 2min → ImmatKernel dégradé
  P3 — S.invisible = true → position non partagée → absence carte proches
  P4 — Précision > 100m → signalements positionnés imprécisément
  P5 — jitter anti-stacking absent → marqueurs empilés à la même position

VÉRIFICATION GARDIEN :
  ✓ S.watchId non null
  ✓ S.myGpsAt frais (< 120s)
  ✓ user_locations : row présente pour user_id actuel
  ✓ ImmatKernel.getReliability().score >= 75
`;

// ── FLUX 11 — Consultation Ange ───────────────────────────────────────────────
export const FLOW_ANGE_QUERY = `
=== FLOW-ANGE-QUERY — Consultation du conseiller IA Ange ===

TRIGGER : AngeDialog.send() depuis le panneau ✦ Ange
ACTEURS : conducteur (A), Edge Function immat-brain-dialog, Claude API

CHAÎNE OBLIGATOIRE :
  1. _refreshQuota() vérifie ic_ange_quota (max 10 appels/h) → quota non épuisé
  2. buildSnapshot() → objet snapshot enrichi (GPS, Brain, Soul, Kernel, Narrator, Guardian...)
  3. AngeMonologue.getTopConcern() → snapshot.ange_preoccupation (si P3 actif)
  4. sb.functions.invoke('immat-brain-dialog', {body:{message, snapshot, history, mode:'consultation'}})
  5. Edge Function : auth JWT + get_my_role() → depth 1/2/3, isGardien
  6. compressionLevel dérivé de brain_urgency : FLASH≥7 (80 tokens), STANDARD≥3 (200), DEEP (400/800 gardien)
  7. Claude API → réponse JSON {juste?, sources?, question?, options?, route?}
  8. validateOutput() → structure nettoyée
  9. ImmatBus.emit('ANGE_RESPONSE_RECEIVED', {mode})
  10. renderResponse(data) → HTML dans #angeResponse
  11. IE.create({type:'ANGE_SUGGESTION'})
  12. P5 : si S._soul.blind_spots[0] présent → suggestion angle mort (cooldown 10 min)

ÉTAT ATTENDU :
  - #angeResponse : contenu HTML visible
  - _history mis à jour (max 6 messages = 3 échanges)
  - ic_ange_quota : incrémenté
  - Panneau Ange scrollé vers le bas (renderResponse)

MODES SPÉCIAUX :
  - 'prediction' : AngePredictor toutes 2min idle → cache ic_ange_predicted (120 tokens)
  - 'monologue' : AngeMonologue toutes 8min conduite → cache ic_ange_conscience (180 tokens)
  - 'gardien_diagnostic' : GardienDiagnostic → analyse anomalies (300 tokens)

PANNES COMMUNES :
  P1 — Quota épuisé → bouton désactivé, #angeQuota affiche "0 restantes"
  P2 — Edge Function 401 → JWT expiré ou utilisateur déconnecté
  P3 — Claude API 529 → surcharge Anthropic (retry manuel)
  P4 — Réponse non-JSON → validateOutput() retourne fallback
  P5 — S.panel non mis à jour → feature toujours 'GENERAL' quel que soit l'écran

VÉRIFICATION GARDIEN :
  ✓ ic_ange_quota < 10 (quota non épuisé)
  ✓ ANTHROPIC_API_KEY présent dans Supabase Secrets
  ✓ snapshot.brain_urgency correctement rempli (non 0 si urgence réelle)
  ✓ renderResponse() a scrollé vers le bas
`;

// ── FLUX 12 — Swarm Engine ────────────────────────────────────────────────────
export const FLOW_SWARM = `
=== FLOW-SWARM — Intelligence collective (SwarmEngine) ===

TRIGGER : SwarmEngine.start(sb) → Supabase Realtime Presence sur canal 'swarm'
ACTEURS : tous les conducteurs connectés dans le rayon

CHAÎNE OBLIGATOIRE :
  1. SwarmEngine.start(sb) → canal Presence 'swarm' rejoint
  2. Chaque conducteur émet son état anonymisé (pos arrondie ±111m, urgence, needs_help, compteurs)
  3. sync() déclenche à chaque changement Presence → analyse collective
  4. Seuils détectés :
     - AIDE : ≥1 conducteur needs_help dans rayon → SWARM_HELP_NEARBY
     - VÉHICULE : ≥3 signalent même plaque → SWARM_PLATE_CONFIRMED
     - STATIONNEMENT : ≥2 dans 500m → SWARM_PARKING_CONFIRMED
     - ROUTE : ≥3 urgences dans 2km → SWARM_ROUTE_DANGER
  5. ImmatBus.emit(event, payload) → CoPilot + BrainEngine réagissent
  6. Toast + voix CoPilot si seuils atteints

PANNES COMMUNES :
  P1 — Canal Presence non rejoint (SUBSCRIBED absent) → aucune intelligence collective
  P2 — Conducteurs trop loin (rayon < 5km) → swarm silencieux (normal)
  P3 — Cooldowns actifs → alertes swarm répétées supprimées (5-10 min)
`;

// ── FLUX 13 — Badges et compteurs ─────────────────────────────────────────────
export const FLOW_BADGES = `
=== FLOW-BADGES — Cohérence des badges et compteurs ===

RÈGLES DE BADGE (s'appliquent à tous les flux) :

NAV BADGE (icNavMsgBadge, icNavActBadge) :
  - Incrémente : message reçu non lu, alerte reçue non vue
  - Décrémente : tap sur la carte correspondante (marque comme lu)
  - Zéro : ouverture du panneau Messages/Activité (mark-all-read)

CATÉGORIE BADGES (catBadgeStation, catBadgeRoute, catBadgeVehicle, catBadgeHelp) :
  - Incrémente : réception alerte/message dans la catégorie
  - Décrémente : tap sur la carte de l'alerte
  - Calcul : updateActBadge() recalcule depuis S._actMessages

BADGES EXCLUS DU NAV BADGE (ne comptent PAS dans icNavActBadge) :
  - parked_report envoyé (c'est moi qui signale, pas une réception)
  - parked_response reçue dans l'onglet Envoyés (déjà compté dans catBadgeStation)
  - vehicle_response (pour éviter double comptage)

RÈGLE D'OR :
  Tout ce qui est "non lu" doit avoir un badge visible.
  Tout ce qui est "lu" (vu, tapé) doit avoir son badge décrémenté.
  Un badge à 0 ne doit JAMAIS affecter négativement la navigation.

PANNES COMMUNES :
  P1 — Badge négatif → décrémentation sans vérification > 0
  P2 — Badge non décrémenté après tap → S._readMsgIds non mis à jour
  P3 — Double comptage → même message compté dans nav badge ET catégorie badge
  P4 — Badge bloqué à X > 0 → alerte marquée 'seen' mais non exclue du calcul

VÉRIFICATION GARDIEN :
  ✓ icNavMsgBadge = nombre messages non lus (textes libres uniquement)
  ✓ icNavActBadge = nombre alertes non vues (toutes catégories SAUF envoyé)
  ✓ catBadgeStation = parked_report reçu non lu + parked_response reçu non lu
  ✓ Pas de badge < 0
`;

// ── FLUX 14 — Modules intelligence ────────────────────────────────────────────
export const FLOW_INTELLIGENCE = `
=== FLOW-INTELLIGENCE — Modules d'intelligence synthétique ===

MODULES ACTIFS (démarrés dans openMap()) :
  1. BrainEngine (30s) : OODA → urgency 0-10, signals[], predictions[] → S._brainOrientation
  2. ImmatConsciousness (5s) : convergence 0-4, focus (NOMINAL/MODERATE/HIGH/CRITICAL), trend → S._consciousness
  3. ImmatSoul (60s) : harmony 0-10, blind_spots[], trajectory, insight → S._soul
  4. ImmatKernel (5s) : reliability 0-100%, degraded/critical flags → S._reliability
  5. ImmatCoPilot (90s) : 11 triggers, voix FR, #copilotPanel
  6. SwarmEngine : Presence collective
  7. Narrator : journal 50 événements 6h

COHÉRENCE ATTENDUE :
  - Si S._reliability.score < 50 → ImmatConsciousness.adaptiveThreshold += 2
  - Si S._soul.blind_spots contient 'GPS périmé' → S.myGpsAt > 120s (cohérent)
  - Si BrainEngine.urgency >= 7 → Ange compressionLevel = 'FLASH' (80 tokens)
  - Si ImmatKernel détecte sommeil iOS → KERNEL_RESURRECTION émis → flush historiques

VÉRIFICATION GARDIEN :
  ✓ S._brainOrientation non null (BrainEngine a tourné)
  ✓ S._consciousness non null (ImmatConsciousness a tourné)
  ✓ S._soul non null (ImmatSoul a tourné ≥1 fois après 60s)
  ✓ S._reliability.score défini (ImmatKernel actif)
  ✓ Narrator.getJournalText() retourne une chaîne non vide après 30s
`;

// ── FLUX 15 — Auth et session ──────────────────────────────────────────────────
export const FLOW_AUTH = `
=== FLOW-AUTH — Authentification et initialisation session ===

TRIGGER : sb.auth.onAuthStateChange() → SIGNED_IN
ACTEURS : conducteur (A), Supabase Auth

CHAÎNE OBLIGATOIRE :
  1. onAuthStateChange SIGNED_IN → afterAuth(session)
  2. sb.rpc('get_my_profile') → {id, owner_plate, pseudo, vehicle_color, ...}
  3. App.openMap(profile, email)
  4. CallManager.init(sb, userId, plate)
  5. ImmatMessages.startMsgs() → subscribeCommunityReports() + subLocs()
  6. GuardianLoop.observe(plate) → heuristiques guardian démarrées
  7. AudioManager.init() → listeners click/touchstart pour AudioContext
  8. ImmatKernel.start() + BrainEngine.start() + Narrator.start()
  9. SwarmEngine.start(sb) + ImmatConsciousness.start() + ImmatSoul.start()
 10. ImmatCoPilot.start()
 11. App.locate() → GPS watchPosition()
 12. App.loadOthers() → conducteurs proches
 13. App.syncCommunityAlerts() → alertes communautaires

ÉTAT ATTENDU après 5s :
  - S.profile non null
  - S.watchId non null (GPS actif)
  - CallManager initialisé
  - Tous les canaux Realtime SUBSCRIBED
  - Tous les modules intelligence démarrés
  - Carte visible avec marqueurs

PANNES COMMUNES :
  P1 — get_my_profile() retourne null → profil non créé → app bloquée à l'onboarding
  P2 — S._authRunning verrou bloqué → double init évitée mais session incomplete
  P3 — ImmatMessages.startMsgs() pas appelé → aucun message reçu en temps réel
  P4 — Modules intelligence non démarrés (exception silencieuse) → intelligence aveugle

VÉRIFICATION GARDIEN :
  ✓ S.profile.owner_plate non null
  ✓ Tous les canaux Realtime : statut SUBSCRIBED
  ✓ S._brainOrientation, S._consciousness, S._reliability non null après 65s
`;

// ── EXPORT CONSOLIDÉ ──────────────────────────────────────────────────────────
export const KNOWLEDGE_GARDIEN_FLOWS = [
  LOIS_GLOBALES,
  FLOW_MESSAGE_SEND,
  FLOW_PARKED_REPORT,
  FLOW_PARKED_RESPONSE,
  FLOW_VEHICLE_ALERT,
  FLOW_ROUTE_REPORT,
  FLOW_HELP_REQUEST,
  FLOW_HELP_RESPONSE,
  FLOW_CALL,
  FLOW_PUSH_NOTIFY,
  FLOW_GPS,
  FLOW_ANGE_QUERY,
  FLOW_SWARM,
  FLOW_BADGES,
  FLOW_INTELLIGENCE,
  FLOW_AUTH,
].join('\n\n');
