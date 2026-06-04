# Amélioration Navigation Fonctionnalités

# UX-ORGANS — Les 6 Organes UX : code réel

**Date :** 2026-06-04  
**Source :** index.html · calls.js · messages.js · service-worker.js  
**Principe :** chaque organe = une intention conducteur + ses implémentations exactes

---

## Organe 1 — RADAR

**Intention :** Voir les conducteurs proches, sa propre position.

### Panels
| ID | Type | Description |
|---|---|---|
| `panelAltet` | panel principal | Carte Leaflet + signalement |
| `nearbyPanel` | overlay | Liste conducteurs dans le rayon |
| `frontCarBanner` | banner | Véhicule devant détecté |
| `floatingCard` | overlay | Notification alerte flottante |

### Fonctions App clés
| Fonction | Rôle |
|---|---|
| `initMap()` | Initialise la carte Leaflet |
| `locate()` | Démarre watchPosition GPS |
| `loadOthers()` | Charge user_locations dans le rayon |
| `subLocs()` | Supabase Realtime channel `immat_locs` |
| `renderNearby()` | Affiche la liste nearbyPanel |
| `openNearby()` | Ouvre nearbyPanel |
| `updateFrontVehicle()` | Détecte et affiche frontCarBanner |
| `showVehicleContextMenu()` | Menu contextuel au tap marqueur |
| `cycleView()` | Bascule vue satellite/carte |
| `recenter()` | Recentre la carte sur ma position |
| `updateCommunityStatus()` | Badge navPremium proches + alertes |

### Supabase
| Appel | Table | Rôle |
|---|---|---|
| `SELECT lat,lng,name` | `user_locations` | Charge positions conducteurs |
| `UPSERT lat,lng,updated_at` | `user_locations` | Diffuse ma position |
| `DELETE eq(id)` | `user_locations` | Supprime ma position (logout/invisible) |
| Realtime channel `immat_locs` | `user_locations` | Mises à jour temps réel |

### OBD Events
`MAP_SELF_LOCATED`, `GPS_STARTED`

### localStorage
`ic_radius`, `ic_invisible`, `ic_tracking`

---

## Organe 2 — SIGNAL

**Intention :** Alerter les autres — véhicule, route, aide.

### Panels
| ID | Type | Description |
|---|---|---|
| `reportPanel` | overlay | Panel signalement (2 étapes) |
| `sigStep1` | sous-panel | Choix catégorie (Route / Véhicule / Aide) |
| `sigStep2Route` | sous-panel | Types incident route |
| `sigStep2Vehicle` | sous-panel | Types problème véhicule |
| `sigStep2Aide` | sous-panel | Types besoin aide |
| `fabSignalHere` | FAB fixe | "📍 Signaler ici" avec coordonnées tap |

### Fonctions App clés
| Fonction | Rôle |
|---|---|
| `sigStepRoute()` | Affiche sigStep2Route |
| `sigStepVehicle()` | Affiche sigStep2Vehicle |
| `sigStepAide()` | Affiche sigStep2Aide |
| `sigBack()` | Retour à sigStep1 |
| `sigDone()` | Ferme reportPanel |
| `roadReport(type)` | Signalement route → broadcast |
| `vehicleAlertQuick(label)` | Alerte véhicule rapide → Messages compose |
| `vehicleAlert(label)` | Alerte véhicule → Messages compose avec plaque |
| `assist(type)` | Demande aide → broadcast |
| `openSignalHere()` | Ouvre reportPanel avec tapLat/tapLng |
| `addCommunityAlert(raw)` | Normalise + sauvegarde + synchronise UI |
| `saveReportRemote(payload)` | INSERT dans reports |

### Supabase
| Appel | Table | Rôle |
|---|---|---|
| `INSERT payload` | `reports` | Sauvegarde signalement |
| `UPDATE status` | `reports` | Résoudre/fermer alerte |
| Realtime channel `immat_reports` | `reports` | Reçoit les alertes des autres |

### OBD Events
`ROAD_CREATED`, `HELP_CREATED`, `VEHICLE_MESSAGE_SENT`, `SOS_TRIGGERED`

### localStorage
`ic_alerts` (liste alertes locales), `ic_alert_filter`

---

## Organe 3 — CONTACT

**Intention :** Communiquer — message direct ou demande de contact.

### Panels
| ID | Type | Description |
|---|---|---|
| `panelMessages` | panel principal | Conversations (inbox/compose/thread) |
| `icComposePanel` | sous-panel | Composition nouveau message |
| `icThread` | sous-panel | Fil de conversation |
| `icContextCard` | carte flottante | Alerte active liée au contact |
| `icBottomSheet` | bottom sheet | Menu thread (fav/arch/trust/del) |
| `icSheetBackdrop` | backdrop | Fond bottom sheet |
| `callContactModal` | modal | "Comment souhaitez-vous contacter ?" |
| `callNotAllowedModal` | modal | Conducteur n'accepte pas les appels |
| `callIncomingPopup` | popup | Appel entrant |
| `callSentBanner` | banner | Demande envoyée (annuler) |

### Fonctions ImmatMessages clés
| Fonction | Rôle |
|---|---|
| `setMode(mode)` | Bascule inbox / compose / thread |
| `sendNew()` | Envoie nouveau message (compose) |
| `sendToPlate(plate,msg)` | Envoie message depuis code externe |
| `reply()` | Envoie réponse dans thread actif |
| `openThread(plate)` | Ouvre le thread |
| `closeThread()` | Ferme le thread → retour inbox |
| `callActive()` | Demande de contact depuis thread |
| `openThreadMenu()` | Ouvre bottom sheet menu |
| `_sheetAction(action)` | fav / arch / trust / del |
| `closeSheet()` | Ferme bottom sheet |
| `favoriteConv()` / `unfavoriteConv()` | Favoris |
| `archiveConv()` / `unarchiveConv()` | Archive |
| `setTrust(plate, level)` | Confiance locale |
| `deleteThread(plate)` | Soft-delete (localStorage) |
| `setPresence(status)` | Statut présence |
| `setDnd(enabled)` | Ne pas déranger |
| `setCallLevel(level)` | Niveau autorisation appels |
| `subscribe()` | Channel Realtime messages (1 seul) |

### Fonctions CallManager clés
| Fonction | Rôle |
|---|---|
| `init(sb,uid,plate)` | Initialise CallManager |
| `openContactOptions(plate)` | Ouvre callContactModal |
| `contactByMessage(plate)` | → actOpenConv |
| `contactByCall(plate,uid)` | → requestCall |
| `requestCall(plate,uid)` | INSERT call_requests |
| `acceptCall(id)` | UPDATE accepted → actOpenConv |
| `refuseCall(id)` | UPDATE refused |
| `cancelCallRequest(id)` | UPDATE cancelled |
| `subscribeIncomingCalls(uid)` | Channel Realtime appels entrants |
| `loadCallPreferences()` | SELECT call_preferences |
| `setCallPreferences(allow)` | UPSERT call_preferences |

### Supabase
| Appel | Table/Fonction | Rôle |
|---|---|---|
| `SELECT *` | `messages` | Charge toutes les conversations |
| `INSERT message` | `messages` | Envoie un message |
| `UPDATE read_at` | `messages` | Marque lu |
| `INSERT call_requests` | `call_requests` | Demande de contact |
| `UPDATE status` | `call_requests` | Accepter/refuser/annuler |
| `RPC can_receive_calls` | Edge Function | Vérifie autorisation appel |
| Realtime `immat_messages_v13_[uid]` | `messages` | Messages en temps réel |
| Realtime `ic_calls_[uid]` | `call_requests` | Appels en temps réel |

### OBD Events
`MSG_SENT`, `MSG_RECEIVED`, `CONV_FAVORITED`, `CONV_ARCHIVED`, `CONV_DELETED`, `CONTACT_TRUSTED`, `CONTACT_REVOKED`, `CONV_SEARCHED`, `CONV_OPENED`, `CONV_CLOSED`, `CALL_INITIATED`, `CALL_RECEIVED`, `CALL_ACCEPTED`, `CALL_REFUSED`, `CALL_CANCELLED`

### localStorage
`ic_trust`, `ic_blocked`, `ic_archived`, `ic_favorites`, `ic_deleted_msgs`, `ic_unread_msg_count`, `ic_presence`, `ic_dnd`, `ic_call_level`

### Invariants
INV-COM-001 (conversation = 2 plaques), INV-COM-003 (double consentement appel), INV-COM-009 (soft-delete uniquement)

---

## Organe 4 — AIDE

**Intention :** Demander et recevoir de l'aide sur la route.

### Panels
(Réutilise sigStep2Aide + actModCard dans panelActivite)

### Fonctions clés
| Fonction | Rôle |
|---|---|
| `assist(type)` | Crée alerte group=assist |
| `actQuickReply(plate,msg)` | "✋ J'arrive" → sendToPlate + toast spécifique |
| `actHelpReply(plate)` | Ouvre Messages/compose vers demandeur |
| `actConfirmAlert(id,'resolved')` | Marque la demande comme résolue |
| `cleanupAlerts()` | TTL expiré → notif "aide non répondue" |

### Flux A↔B résumé
```
A → assist(type) → addCommunityAlert (group=assist) → broadcast
B → reçoit FloatingCard "✋ J'aide" → actQuickReply("J'arrive")
A → reçoit message "J'arrive" → helper_coming + FloatingCard
B → voit toast "✋ Aide proposée. Le conducteur sera notifié…"
B → OBD HELP_RESPONDED émis
A → bouton "🙏 Merci" visible
A → actConfirmAlert('resolved') → alerte fermée
```

### OBD Events
`HELP_CREATED`, `HELP_RESPONDED`

### Invariants
INV-COM-005 (autorisation contextuelle), INV-COM-011 (observable)

---

## Organe 5 — ROUTE

**Intention :** Naviguer — GPS, POI, favoris de route.

### Panels
| ID | Type | Description |
|---|---|---|
| `panelDrive` | panel | Navigation GPS complète |
| `navPremium` | div interne | Vitesse réelle · Proches · Alertes |

### Fonctions App clés
| Fonction | Rôle |
|---|---|
| `openGps()` | Ouvre panelDrive + démarrage suivi |
| `searchGps()` | Nominatim geocoding |
| `pickDest(lat,lng,name)` | Sélectionne destination |
| `startNav()` | Lance navigation OSRM |
| `checkRoute()` | Recalcule route si déviation |
| `voiceGps()` | Synthèse vocale instruction suivante |
| `updateNavPremium()` | Rafraîchit vitesse/proches/alertes |
| `toggleVoice()` / `toggleVoiceGender()` | Voix GPS |
| `renderFavs()` / `renderHistory()` | Lieux favoris + historique |
| `deleteFav(i)` / `deleteHistEntry(i)` | Supprime favori/historique |

### APIs externes
| API | Rôle |
|---|---|
| Nominatim (OSM) | Geocoding adresses |
| OSRM | Calcul d'itinéraire |
| browser.geolocation | GPS watchPosition |
| SpeechSynthesis | Voix navigation |

### localStorage
`ic_favs` (lieux favoris), `ic_gps_history`

---

## Organe 6 — MOI

**Intention :** Gérer son profil, ses paramètres, son historique.

### Panels
| ID | Type | Description |
|---|---|---|
| `panelSettings` | panel | Paramètres + préférences |
| `drawer` | drawer overlay | Menu profil + navigation rapide |
| `legal` | modal | Confidentialité |
| `blocked` | modal | Plaques bloquées |
| `recent` | modal | Véhicules récents |
| Écran profil setup `#sp` | page | Création plaque + pseudo + couleur |

### Fonctions App clés
| Fonction | Rôle |
|---|---|
| `saveProfile()` | UPSERT profiles |
| `openEditProfile()` | Ouvre édition profil |
| `openDrawer()` / `closeDrawer()` | Drawer |
| `openBlocked()` | Liste plaques bloquées |
| `openRecent()` | Véhicules récents |
| `openLegal()` | Confidentialité |
| `blockPlate(plate)` | Ajoute à ic_blocked |
| `unblockPlate(plate)` | Retire de ic_blocked |
| `logout()` | Déconnexion Supabase + localStorage |
| `toggleInvisible()` | Mode invisible (ic_invisible) |
| `toggleSounds()` / `toggleReduceEffects()` | Préférences |
| `openGardienDashboard()` | Dashboard Gardien (is-gardien only) |

### Supabase
| Appel | Table | Rôle |
|---|---|---|
| `SELECT *` | `profiles` | Charge profil |
| `UPSERT id,pseudo,owner_plate,color` | `profiles` | Sauvegarde profil |
| `RPC get_my_role` | — | Détermine role gardien/conducteur |
| `auth.signOut()` | — | Déconnexion |

### OBD Events
`PROFILE_SAVED`, `BADGE_RECOMPUTED`

### localStorage
`ic_sounds`, `ic_reduce_effects`, `ic_invisible`, `ic_voice`, `ic_voice_gender`, `ic_blocked`, `ic_recent`
