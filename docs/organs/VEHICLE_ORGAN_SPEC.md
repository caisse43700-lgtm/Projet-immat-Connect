# VEHICLE ORGAN SPEC — Spécification complète
> Premier organe complet de ImmatOrganism
> Branche : immatv2 — Ne pas appliquer sur main sans validation
> Dérivé de l'audit violations V-01 à V-07

---

## PARTIE 1 — VIOLATIONS → LOIS → TESTS

### Tableau de transformation V-01 à V-07

---

#### V-01 — Broadcast éphémère

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | `vehicleAlertQuick()` envoie le broadcast `vehicle_alert` avant ou en parallèle de l'INSERT DB. Si la DB échoue, le broadcast a déjà été envoyé. Si Compte B est hors ligne, il ne reçoit jamais le signalement. |
| **Comportement attendu** | L'INSERT DB est confirmé, puis le broadcast est envoyé. Le signalement existe toujours en DB et sera récupéré via `postgres_changes` au prochain chargement de Compte B. |
| **Loi créée** | `VEHICLE-LAW-001` — La persistance précède toujours la notification. |
| **Invariant associé** | `VEH-INV-001` — Aucune notification ne peut précéder l'écriture confirmée en base. |
| **Organe responsable** | VehicleOrgan — il ordonne le broadcast uniquement après réception du VEHICLE_ALERT_PERSISTED. |
| **Source de vérité** | Table Supabase `messages` — le broadcast est un raccourci temps réel, pas la source. |
| **Vues impactées** | Activité (Reçus), Messages (Inbox), Badge |
| **Événement ImmatBus** | `VEHICLE_ALERT_PERSISTED` — émis après INSERT confirmé, déclenche le broadcast |
| **Test obligatoire** | `VL-001` — Si INSERT échoue, VEHICLE_ALERT_PERSISTED n'est pas émis et aucun broadcast n'est envoyé. |

---

#### V-02 — Suppression fictive

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | `deleteThread()` / `deleteConv()` stockent les IDs supprimés dans `localStorage('ic_deleted_msgs')`. Aucun DELETE ou UPDATE en DB. Les messages existent toujours en base. Si l'utilisateur change d'appareil ou vide son cache, les messages "supprimés" réapparaissent. |
| **Comportement attendu** | La suppression exécute un UPDATE `status = 'deleted'` (ou DELETE) en DB. Le message ne peut plus être récupéré via les requêtes standard. |
| **Loi créée** | `VEHICLE-LAW-002` — Toute suppression est réelle et permanente en base. |
| **Invariant associé** | `VEH-INV-002` — Aucun message ne peut être affiché comme supprimé s'il existe en DB (spécialisation de INV-012). |
| **Organe responsable** | VehicleOrgan pour les messages de type véhicule — MessagesOrgan pour les messages ordinaires. |
| **Source de vérité** | Table Supabase `messages` — le statut `deleted` est la seule vérité. |
| **Vues impactées** | Activité (Envoyés/Reçus), Messages (tous onglets), Badge |
| **Événement ImmatBus** | `VEHICLE_MESSAGE_DELETED` — émis après UPDATE DB confirmé |
| **Test obligatoire** | `VL-002` — `deleteAlert()` appelle DB avant d'émettre VEHICLE_MESSAGE_DELETED. Si DB KO, l'événement n'est pas émis et la vue n'est pas mise à jour. |

---

#### V-03 — Suppression non propagée

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | Compte A supprime une conversation → suppression localStorage A uniquement. Compte B voit toujours le message intact. Les deux comptes ont un état divergent. |
| **Comportement attendu** | La suppression en DB déclenche automatiquement une mise à jour sur Compte B via `postgres_changes` UPDATE sur le statut du message. |
| **Loi créée** | `VEHICLE-LAW-003` — La suppression est globale. Elle atteint tous les comptes concernés. |
| **Invariant associé** | `VEH-INV-003` — Il est impossible que Compte A voie un message supprimé et Compte B le voie actif (spécialisation de LOI-ROUTE-04). |
| **Organe responsable** | VehicleOrgan (via RealtimeOrgan) — il écoute les `postgres_changes` UPDATE sur `messages` avec `status = 'deleted'`. |
| **Source de vérité** | Champ `status` de la table `messages` en DB — jamais localStorage. |
| **Vues impactées** | Activité (Envoyés/Reçus des deux comptes), Messages (les deux comptes), Badge (les deux comptes) |
| **Événement ImmatBus** | `VEHICLE_DELETION_PROPAGATED` — émis quand VehicleOrgan reçoit la suppression de l'autre compte |
| **Test obligatoire** | `VL-003` — Simuler UPDATE status='deleted' depuis DB → VehicleOrgan retire l'alerte de _receivedAlerts et émet VEHICLE_DELETION_PROPAGATED. |

---

#### V-04 — Double source de rendu

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | Le panneau Activité (onglet Reçus) et le panneau Messages affichent tous les deux les messages véhicule depuis `S._actMessages`. Chaque panneau reconstruit sa propre vue indépendamment. Aucune coordination entre les deux rendus. |
| **Comportement attendu** | VehicleOrgan expose une liste normalisée canonique. Activité et Messages la consomment. Aucun des deux ne reconstruit la donnée lui-même. |
| **Loi créée** | `VEHICLE-LAW-004` — VehicleOrgan est la seule autorité de rendu des données véhicule. |
| **Invariant associé** | `VEH-INV-004` — Aucune vue ne génère sa propre représentation des messages véhicule indépendamment (spécialisation de INV-011). |
| **Organe responsable** | VehicleOrgan expose `getSentAlerts()` et `getReceivedAlerts()`. ActivityOrgan et MessagesOrgan consomment ces méthodes. |
| **Source de vérité** | `VehicleOrgan._sentAlerts` et `VehicleOrgan._receivedAlerts` — alimentés depuis la DB. |
| **Vues impactées** | Activité, Messages |
| **Événement ImmatBus** | `VEHICLE_VIEW_REQUESTED` — les panneaux demandent les données via cet événement |
| **Test obligatoire** | `VL-004` — `getSentAlerts()` et `getReceivedAlerts()` retournent des tableaux avec le même format quelle que soit la vue consommatrice. |

---

#### V-05 — Badge sans sémantique

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | `updateActBadge()` additionne `unreadMsgs + unreadAlerts`. Les signalements véhicule comptent comme `unreadMsgs` ordinaires. Un signalement `🚨 URGENT` et un message "Bonjour" contribuent identiquement au badge. |
| **Comportement attendu** | VehicleOrgan fournit sa propre contribution au badge avec distinction : urgent / normal / répondu. Le badge global agrège les contributions de chaque organe. |
| **Loi créée** | `VEHICLE-LAW-005` — La contribution au badge d'un signalement véhicule distingue urgent, normal, et répondu. |
| **Invariant associé** | `VEH-INV-005` — Un signalement urgent ne peut jamais avoir la même priorité visuelle qu'un message ordinaire (extension de INV-005). |
| **Organe responsable** | VehicleOrgan — `computeBadgeContribution()` retourne `{ urgent, normal, replied }`. BadgeOrgan agrège. |
| **Source de vérité** | `VehicleOrgan._receivedAlerts` filtré par état. |
| **Vues impactées** | Badge global (navBar), Badge catégorie Véhicule (Activité) |
| **Événement ImmatBus** | `BADGE_RECOMPUTED` avec payload `{ vehicle: { urgent: n, normal: n, replied: n } }` |
| **Test obligatoire** | `VL-005` — Avec 2 alertes urgentes et 1 normale reçues, `computeBadgeContribution()` retourne `{ urgent: 2, normal: 1, replied: 0 }`. |

---

#### V-06 — État émetteur inconnu

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | Après `vehicleAlertQuick()`, Compte A n'a aucun moyen de savoir si son signalement a été livré, vu ou a reçu une réponse. Il n'existe pas d'état persistant côté émetteur. |
| **Comportement attendu** | VehicleOrgan maintient le cycle d'états du signalement côté émetteur : CREATED → PERSISTED → DELIVERED → SEEN → REPLIED. `getAlertState(alertId)` est disponible à tout moment. |
| **Loi créée** | `VEHICLE-LAW-006` — L'émetteur connaît l'état de son signalement à tout moment. |
| **Invariant associé** | `VEH-INV-006` — Aucun signalement ne peut rester dans un état indéterminé sans signal explicite. |
| **Organe responsable** | VehicleOrgan — maintient `_sentAlerts[]` avec état courant. |
| **Source de vérité** | `VehicleOrgan._sentAlerts[alertId].state` — mis à jour par les événements reçus. |
| **Vues impactées** | Activité (onglet Envoyés), indicateur de statut futur |
| **Événement ImmatBus** | `VEHICLE_ALERT_STATUS_CHANGED` — émis à chaque transition d'état |
| **Test obligatoire** | `VL-006` — Après `onMessageReceived()` (réponse reçue), l'état de l'alerte correspondante passe à REPLIED et VEHICLE_ALERT_STATUS_CHANGED est émis. |

---

#### V-07 — Réponse sans contexte

| Champ | Contenu |
|-------|---------|
| **Comportement observé** | `actQuickReply(plate, msg)` appelle `ImmatMessages.sendToPlate(plate, msg)` sans aucune référence au signalement original. Les boutons "Je m'arrête / Je vérifie / Merci" créent des messages orphelins non liés au signalement. |
| **Comportement attendu** | `sendQuickReply(alertId, reply)` valide que l'alertId existe dans `_receivedAlerts`. La réponse est liée au signalement dans la structure de données. |
| **Loi créée** | `VEHICLE-LAW-007` — Toute réponse rapide est liée à un signalement existant. |
| **Invariant associé** | `VEH-INV-007` — Aucune réponse rapide ne peut être émise sans alertId valide (spécialisation de INV-013). |
| **Organe responsable** | VehicleOrgan valide le contexte avant autorisation de la réponse. |
| **Source de vérité** | `VehicleOrgan._receivedAlerts[alertId]` — l'alerte doit exister et être dans un état répondable. |
| **Vues impactées** | Activité (boutons d'action), Messages (thread), État émetteur (→ REPLIED) |
| **Événement ImmatBus** | `VEHICLE_QUICK_REPLY_SENT` avec payload `{ alertId, plate, reply }` — distinct de VEHICLE_MESSAGE_SENT |
| **Test obligatoire** | `VL-007a` — `sendQuickReply(alertId_inconnu, 'Je m'arrête')` est refusé. `VL-007b` — `sendQuickReply(alertId_valide, ...)` lie la réponse et met à jour l'état de l'alerte. |

---

## PARTIE 2 — DÉFINITION COMPLÈTE DE VEHICLEORGAN

---

### 2.1 Ce que VehicleOrgan POSSÈDE

```
_sentAlerts : Map<alertId, SentAlert>
  ─ État des signalements que ce compte a envoyés
  ─ Persisté via localStorage (immatv2 uniquement) → à terme Supabase
  ─ Jamais accessible directement depuis l'extérieur

_receivedAlerts : Map<alertId, ReceivedAlert>
  ─ État des signalements reçus pour la plaque de ce compte
  ─ Alimenté par les postgres_changes + broadcast

_pendingDeletions : Set<messageId>
  ─ IDs en attente de confirmation de propagation
  ─ Retentative automatique si propagation non confirmée

_log : Array<LogEntry>   (max 100 entrées)
  ─ Journal interne de tous les événements traités
```

**Structure SentAlert :**
```
{
  alertId     : string (uuid du message en DB)
  plate       : string (plaque destinataire)
  senderPlate : string (ma plaque)
  message     : string (texte du signalement)
  urgent      : boolean
  state       : 'CREATED'|'PERSISTED'|'DELIVERED'|'SEEN'|'REPLIED'
  createdAt   : number (timestamp)
  persistedAt : number|null
  deliveredAt : number|null
  seenAt      : number|null
  repliedAt   : number|null
}
```

**Structure ReceivedAlert :**
```
{
  alertId    : string (uuid du message en DB)
  plate      : string (plaque émetteur)
  myPlate    : string (ma plaque, destinataire)
  message    : string
  urgent     : boolean
  state      : 'RECEIVED'|'SEEN'|'REPLIED'
  receivedAt : number
  seenAt     : number|null
  reply      : string|null
  repliedAt  : number|null
}
```

---

### 2.2 Ce que VehicleOrgan PEUT FAIRE

```
createAlert(plate, message, opts)
  → Valide que plate n'est pas une plaque système
  → INSERT en DB (table messages)
  → Attend confirmation DB
  → Émet VEHICLE_ALERT_PERSISTED
  → Envoie broadcast vehicle_alert
  → Retourne alertId

receiveAlert(broadcastPayload)
  → Vérifie que target_plate === ma plaque
  → Crée entrée dans _receivedAlerts (état: RECEIVED)
  → Émet VEHICLE_ALERT_STATUS_CHANGED

markSeen(alertId)
  → Met à jour _receivedAlerts[alertId].state = 'SEEN'
  → UPDATE read_at en DB
  → Émet VEHICLE_ALERT_STATUS_CHANGED

sendQuickReply(alertId, reply)
  → Valide que alertId ∈ _receivedAlerts
  → INSERT message de réponse en DB
  → Met à jour _receivedAlerts[alertId].reply + state = 'REPLIED'
  → Émet VEHICLE_QUICK_REPLY_SENT (avec alertId)

deleteAlert(alertId)
  → UPDATE status='deleted' en DB
  → Attend confirmation DB
  → Émet VEHICLE_MESSAGE_DELETED
  → Broadcast vehicle_deletion aux comptes concernés

computeBadgeContribution()
  → Filtre _receivedAlerts par état
  → Retourne { urgent: n, normal: n, replied: n }

getAlertState(alertId)
  → Cherche dans _sentAlerts puis _receivedAlerts
  → Retourne état courant ou null

getSentAlerts()    → copie normalisée de _sentAlerts (triée par date)
getReceivedAlerts() → copie normalisée de _receivedAlerts (triée par date)

guardMapMarker(entity)   → INV-001
guardChannel(entity, channel) → INV-002
isVehicleEntity(entity)

getLog() / clearLog()
```

---

### 2.3 Ce que VehicleOrgan NE PEUT JAMAIS FAIRE

```
❌  Créer un marqueur sur la carte                    [INV-001]
❌  Écrire dans S.alerts ou table reports             [INV-002 + INV-003]
❌  Émettre un broadcast avant INSERT DB confirmé     [VEH-INV-001]
❌  Marquer supprimé sans DELETE/UPDATE DB réel       [VEH-INV-002]
❌  Afficher "Voir sur la carte" pour un véhicule     [INV-001]
❌  Autoriser une réponse rapide sans alertId valide  [VEH-INV-007]
❌  Accéder directement au DOM ou au rendu UI         [VEH-INV-004]
❌  Décider seul d'une action critique                [INV-014]
```

---

### 2.4 Lois complètes

```
VEHICLE-LAW-001  Persist before notify
  Aucun broadcast avant INSERT DB confirmé.

VEHICLE-LAW-002  Real deletion only
  Suppression = UPDATE/DELETE en DB. Jamais localStorage.

VEHICLE-LAW-003  Global deletion
  Suppression propagée via postgres_changes à tous les comptes.

VEHICLE-LAW-004  Single rendering authority
  VehicleOrgan est la seule source de données pour les vues véhicule.

VEHICLE-LAW-005  Badge semantics
  urgent ≠ normal ≠ répondu dans computeBadgeContribution().

VEHICLE-LAW-006  Alert state is always known
  L'émetteur connaît l'état de son signalement à tout moment.

VEHICLE-LAW-007  Reply requires context
  sendQuickReply() requiert un alertId valide dans _receivedAlerts.
```

---

## PARTIE 3 — LIENS INTER-ORGANES

---

### 3.1 VehicleOrgan ↔ ActivityOrgan

```
DÉPENDANCE : ActivityOrgan consomme VehicleOrgan, pas l'inverse.

Ce qu'ActivityOrgan demande à VehicleOrgan :
  VehicleOrgan.getSentAlerts()     → onglet Envoyés (catégorie Véhicule)
  VehicleOrgan.getReceivedAlerts() → onglet Reçus (catégorie Véhicule)
  VehicleOrgan.getAlertState(id)   → indicateur d'état sur chaque item

Ce qu'ActivityOrgan NE fait pas :
  ❌ Il ne filtre pas S._actMessages lui-même pour les véhicules
  ❌ Il ne construit pas sa propre représentation des véhicules

Événements consommés par ActivityOrgan :
  VEHICLE_ALERT_STATUS_CHANGED  → rafraîchit l'item concerné
  VEHICLE_MESSAGE_DELETED       → retire l'item de la liste
  BADGE_RECOMPUTED              → met à jour le badge catégorie Véhicule

Contrat d'interface :
  VehicleOrgan.getSentAlerts() retourne :
  [{ alertId, plate, message, urgent, state, createdAt }]

  VehicleOrgan.getReceivedAlerts() retourne :
  [{ alertId, plate, message, urgent, state, receivedAt, reply }]
```

---

### 3.2 VehicleOrgan ↔ MessagesOrgan

```
RELATION : Complémentaire, non concurrente.

MessagesOrgan gère :
  - Tous les messages de conversation (table `messages`)
  - Les threads par plaque
  - L'envoi/réception générique
  - La persistance des messages ordinaires

VehicleOrgan gère :
  - Les messages de type "signalement véhicule"
  - Le cycle d'états alertId (CREATED → REPLIED)
  - La suppression réelle (VEH-INV-002)
  - La propagation (VEH-INV-003)

Règle de cohabitation :
  Un message véhicule est UN MESSAGE dans la table `messages`.
  MessagesOrgan le stocke. VehicleOrgan lui donne sa sémantique.

  MessagesOrgan.sendToPlate() peut être appelé par VehicleOrgan
  pour l'INSERT initial — mais VehicleOrgan gère la réponse.

Ce que MessagesOrgan NE fait pas pour les véhicules :
  ❌ Il ne gère pas l'état d'alerte (CREATED, SEEN, REPLIED)
  ❌ Il ne lie pas les réponses rapides à leur signalement
  ❌ Il ne calcule pas la contribution badge véhicule

Événements partagés :
  VEHICLE_MESSAGE_SENT      → MessagesOrgan rafraîchit son thread
  VEHICLE_MESSAGE_RECEIVED  → MessagesOrgan met à jour unread count
  VEHICLE_MESSAGE_DELETED   → MessagesOrgan retire le message de son thread
```

---

### 3.3 VehicleOrgan ↔ BadgeOrgan

```
RELATION : VehicleOrgan est un contributeur, BadgeOrgan est l'agrégateur.

VehicleOrgan expose :
  computeBadgeContribution() → { urgent: n, normal: n, replied: n }

BadgeOrgan appelle :
  VehicleOrgan.computeBadgeContribution()
  + RouteOrgan.computeBadgeContribution()   (futur)
  + MessagesOrgan.computeBadgeContribution() (futur)
  → somme et affiche le badge global

BadgeOrgan écoute sur ImmatBus :
  BADGE_RECOMPUTED → recalcule le total et met à jour le DOM

Règle :
  BadgeOrgan ne lit jamais S.alerts ni S._actMessages directement.
  Il ne fait que sommer les contributions des organes.

Affichage badge véhicule urgent :
  Si urgent > 0 → badge rouge pulsant (priorité max)
  Si normal > 0 → badge orange (priorité normale)
  Si replied > 0 → badge gris (tout traité)
  Si tout 0      → badge masqué
```

---

### 3.4 VehicleOrgan ↔ RealtimeOrgan

```
RELATION : RealtimeOrgan est le transporteur, VehicleOrgan est le destinataire.

RealtimeOrgan gère :
  - La connexion Supabase Realtime
  - Les postgres_changes sur toutes les tables
  - Les broadcast channels
  - La reconnexion automatique

Ce que RealtimeOrgan transmet à VehicleOrgan :
  postgres_changes INSERT sur `messages` (filtre: target_plate = ma plaque)
    → VehicleOrgan.receiveAlert()
  postgres_changes UPDATE sur `messages` (filtre: status = 'deleted')
    → VehicleOrgan.handleDeletion()
  broadcast event: 'vehicle_alert'
    → VehicleOrgan.receiveAlert() (chemin rapide)
  broadcast event: 'vehicle_deletion'
    → VehicleOrgan.handleDeletion() (chemin rapide)

Règle :
  RealtimeOrgan ne filtre pas par sémantique (urgent, normal).
  C'est VehicleOrgan qui interprète le payload.

Redondance voulue :
  broadcast = chemin rapide (si en ligne)
  postgres_changes = chemin de rattrapage (si arrivée tardive)
  Les deux aboutissent à VehicleOrgan.receiveAlert()
  VehicleOrgan déduplique par alertId.
```

---

## PARTIE 4 — FLUX NARRATIFS COMPLETS

---

### Comment naît un signalement véhicule

```
1. Conducteur A signale "Pneu à plat" sur le véhicule AB-123-CD

2. VehicleOrgan.createAlert('AB-123-CD', '⚠️ SIGNALEMENT : Pneu à plat...')
   ├── guardMapMarker() → allowed: true (pas de marqueur)
   ├── guardChannel() → allowed: true (canal messages)
   ├── isVehicleEntity() → true
   ├── INSERT en DB (table messages)
   │     sender_id, receiver_id, target_plate, message, status='accepted'
   ├── DB confirme → alertId = 'uuid-123'
   ├── _sentAlerts.set('uuid-123', { state: 'PERSISTED', ... })
   ├── Émet VEHICLE_ALERT_PERSISTED { alertId: 'uuid-123', plate: 'AB-123-CD' }
   └── Envoie broadcast vehicle_alert { target_plate, sender_plate, message, urgent }
```

---

### Comment il devient message

```
3. Le signalement est un message dans la table `messages` Supabase.
   Il se distingue par :
   - target_plate renseigné
   - message commençant par '⚠️ SIGNALEMENT' ou '🚨 SIGNALEMENT URGENT'

   MessagesOrgan le charge dans ses threads comme message ordinaire.
   VehicleOrgan l'enrichit avec son cycle d'états.

   Règle : un signalement véhicule EST un message.
   Un message n'EST PAS forcément un signalement.
```

---

### Comment il apparaît dans Activité — onglet Reçus

```
4. Compte B reçoit via broadcast vehicle_alert (si en ligne)
   OU via postgres_changes INSERT sur messages (si hors ligne au moment)

   VehicleOrgan.receiveAlert(payload)
   ├── Vérifie target_plate === ma plaque
   ├── Déduplique sur alertId (si déjà dans _receivedAlerts)
   ├── _receivedAlerts.set('uuid-123', { state: 'RECEIVED', urgent: true, ... })
   ├── Émet VEHICLE_ALERT_STATUS_CHANGED { alertId, newState: 'RECEIVED' }
   └── Émet BADGE_RECOMPUTED { vehicle: { urgent: 1, normal: 0, replied: 0 } }

   ActivityOrgan écoute VEHICLE_ALERT_STATUS_CHANGED
   → Recharge VehicleOrgan.getReceivedAlerts()
   → Affiche l'item dans l'onglet Reçus (catégorie Véhicule)
   → avec boutons "Je m'arrête / Je vérifie / Merci"
```

---

### Comment il apparaît dans Activité — onglet Nouveau

```
   L'onglet Nouveau est un panneau de CRÉATION.
   Il ne liste pas les signalements reçus.
   
   Règle : VehicleOrgan n'alimente pas l'onglet Nouveau.
   L'onglet Nouveau contient uniquement les boutons de création
   de nouveaux signalements.
```

---

### Comment il apparaît dans Activité — onglet Envoyés

```
5. Compte A voit son signalement dans l'onglet Envoyés.

   ActivityOrgan appelle VehicleOrgan.getSentAlerts()
   → Retourne [{ alertId: 'uuid-123', plate: 'AB-123-CD', state: 'PERSISTED', ... }]
   → Affiche l'item avec indicateur d'état (ex: "En attente de réponse")
   
   Quand l'état change (DELIVERED, SEEN, REPLIED) :
   → VEHICLE_ALERT_STATUS_CHANGED est émis
   → ActivityOrgan rafraîchit l'indicateur d'état en temps réel
```

---

### Comment il crée ou met à jour une conversation

```
6. Un signalement véhicule EST un message dans table `messages`.
   MessagesOrgan construit ses threads par plaque.
   
   Premier signalement A → B :
   → Crée le thread "AB-123-CD" dans MessagesOrgan
   
   Réponse B → A :
   → Ajoute un message dans le thread "AB-123-CD"
   
   VehicleOrgan.receiveAlert() (si réponse reçue par A)
   → Met à jour _sentAlerts['uuid-123'].state = 'REPLIED'
   → Émet VEHICLE_ALERT_STATUS_CHANGED
```

---

### Comment le badge est recalculé

```
7. Chaque événement qui change l'état d'une alerte déclenche :
   
   VehicleOrgan.computeBadgeContribution()
   → compte _receivedAlerts par état (non-replied = unread)
   → retourne { urgent: n, normal: n, replied: n }
   
   Émet BADGE_RECOMPUTED { vehicle: { ... } }
   
   BadgeOrgan écoute BADGE_RECOMPUTED
   → additionne toutes les contributions (vehicle + route + messages)
   → met à jour le DOM (badge navBar + badge catégorie)
   
   Règle : le badge se met à zéro quand tous les _receivedAlerts
   sont dans l'état REPLIED ou ont été supprimés.
```

---

### Comment il est conservé après refresh

```
8. Aujourd'hui (violation V-01) : le broadcast est éphémère.
   Après refresh, seuls les messages en DB sont récupérés.
   
   Avec VehicleOrgan complet :
   
   Au chargement de la page :
   ├── RealtimeOrgan établit la connexion Supabase
   ├── VehicleOrgan.init() charge depuis DB :
   │     SELECT * FROM messages
   │     WHERE (receiver_id = moi OR sender_id = moi)
   │     AND message LIKE '⚠️ SIGNALEMENT%' OR '🚨 SIGNALEMENT%'
   │     AND status != 'deleted'
   │     AND created_at > NOW() - INTERVAL '24h'
   ├── Reconstruit _sentAlerts et _receivedAlerts
   └── Émet BADGE_RECOMPUTED avec les nouveaux comptages
   
   Règle : VehicleOrgan est autonome au chargement.
   Il ne dépend pas du broadcast pour récupérer son état.
```

---

### Comment il est supprimé volontairement

```
9. Compte A ou B clique "Supprimer" (swipe gauche dans Messages
   ou bouton "Retirer" dans Activité)
   
   VehicleOrgan.deleteAlert(alertId)
   ├── Vérifie que alertId est connu (_sentAlerts ou _receivedAlerts)
   ├── UPDATE messages SET status='deleted' WHERE id=alertId
   ├── Attend confirmation DB (pas de localStorage fallback)
   ├── Si DB KO → erreur, rien n'est mis à jour
   ├── Si DB OK :
   │     ├── Retire alertId de _sentAlerts ou _receivedAlerts
   │     ├── Émet VEHICLE_MESSAGE_DELETED { alertId, plate }
   │     ├── Broadcast 'vehicle_deletion' { alertId, plate }
   │     └── Émet BADGE_RECOMPUTED
   
   L'autre compte reçoit via postgres_changes UPDATE status='deleted'
   → VehicleOrgan.handleDeletion(alertId)
   → Retire de _receivedAlerts ou _sentAlerts
   → Émet VEHICLE_DELETION_PROPAGATED
   → Émet BADGE_RECOMPUTED
```

---

### Comment il se synchronise entre deux comptes

```
10. Schéma de synchronisation complète :

    Compte A ──────────────────────────────────── Compte B
    
    createAlert()
    → INSERT DB ──────────→ postgres_changes INSERT ──→ receiveAlert()
    → broadcast ──────────→ (si en ligne) ────────────→ receiveAlert()
    
                           VehicleOrgan déduplique
                           si les deux arrivent.
    
    markSeen()                                 Compte B ouvre
    ← VEHICLE_ALERT_STATUS_CHANGED ←─────────── UPDATE read_at
    
    Réponse B :
    sendQuickReply()
    → INSERT DB ──────────→ postgres_changes INSERT ──→ messagesOrgan.refresh()
    → émet VEHICLE_QUICK_REPLY_SENT
                           Compte A :
    ← VEHICLE_ALERT_STATUS_CHANGED ←─────────── état→REPLIED
    
    deleteAlert() par A :
    → UPDATE status=deleted → postgres_changes UPDATE ─→ handleDeletion()
    → broadcast vehicle_deletion ──────────────────────→ handleDeletion()
                                                         VEHICLE_DELETION_PROPAGATED
```

---

### Pourquoi jamais sur la carte

```
    INV-001 — Véhicule jamais carte.
    
    Un signalement véhicule cible une plaque spécifique.
    Il n'a pas de coordonnées GPS pertinentes à afficher.
    (La position de l'émetteur ou du destinataire n'a pas
    de valeur publique dans ce contexte.)
    
    Afficher un marqueur véhicule sur la carte :
    - Violerait l'anonymat du destinataire
    - Créerait une surveillance de position
    - Mêlerait données privées (messages) et données publiques (carte)
    
    VehicleOrgan.guardMapMarker() bloque toute tentative.
    Tout code qui essaie d'ajouter un véhicule à la carte
    doit passer par guardMapMarker() et sera refusé.
```

---

### Pourquoi jamais via reports ou S.alerts

```
    INV-002 — Véhicule = messages uniquement.
    INV-003 — Route et Aide = reports, jamais messages.
    
    La table `reports` est conçue pour des signalements géolocalisés
    publics (obstacle, travaux, danger route). Ces données :
    - ont des coordonnées GPS
    - sont partagées avec tous les conducteurs proches
    - créent des marqueurs sur la carte
    - ont un TTL (elles expirent)
    
    Un message véhicule est une communication privée bilatérale.
    Le mélanger avec reports créerait :
    - une fuite de donnée privée vers la carte publique
    - une violation de INV-001
    - une confusion dans le rendu des marqueurs
    
    S.alerts est l'état local des signalements publics.
    VehicleOrgan ne touche jamais à S.alerts.
```

---

### Pourquoi jamais "Voir sur la carte"

```
    Le bouton "Voir sur la carte" est réservé aux signalements
    qui ont une position GPS associée et qui sont affichés
    sur la carte collaborative.
    
    Un signalement véhicule :
    - n'a pas de marqueur carte (INV-001)
    - n'est pas dans S.alerts (INV-002)
    - n'a donc rien à "voir sur la carte"
    
    Afficher ce bouton sur une alerte véhicule serait :
    - un mensonge (INV-012 — toute donnée visible existe réellement)
    - une violation de INV-001 si le clic tentait d'afficher quelque chose
    
    Le bouton "Voir sur la carte" est masqué ou absent
    pour toute entité classifiée comme véhicule par
    VehicleOrgan.isVehicleEntity().
```

---

## PARTIE 5 — CATALOGUE COMPLET DES ÉVÉNEMENTS IMMATBUS

```
Émis par VehicleOrgan :

VEHICLE_ALERT_CREATED         { alertId, plate, message, urgent }
VEHICLE_ALERT_PERSISTED       { alertId, plate, senderPlate, at }
VEHICLE_ALERT_STATUS_CHANGED  { alertId, plate, previousState, newState, at }
VEHICLE_MESSAGE_SENT          { plate, message, at }              [existant]
VEHICLE_MESSAGE_RECEIVED      { plate, message, at }              [existant]
VEHICLE_QUICK_REPLY_SENT      { alertId, plate, reply, at }       [distinct de SENT]
VEHICLE_MESSAGE_DELETED       { alertId, plate, deletedBy, at }
VEHICLE_DELETION_PROPAGATED   { alertId, plate, propagatedAt }
BADGE_RECOMPUTED              { vehicle: { urgent, normal, replied } }
INVARIANT_VIOLATED            { inv, context }

Reçus par VehicleOrgan :

VEHICLE_MESSAGE_RECEIVED      → update _receivedAlerts
VEHICLE_QUICK_REPLY_SENT      → update _sentAlerts état→REPLIED
VEHICLE_MESSAGE_DELETED       → handleDeletion() depuis autre compte
SETTINGS_UPDATED              → recharge préférences
INVARIANT_VIOLATED            → log anomalie
```

---

## PARTIE 6 — FICHIERS QUI SERONT MODIFIÉS

```
MODIFICATIONS REQUISES (immatv2 uniquement)

core/organs/vehicleOrgan.js           [EXPAND]
  → Ajouter : createAlert, receiveAlert, markSeen,
              sendQuickReply, deleteAlert, handleDeletion,
              computeBadgeContribution, getAlertState,
              getSentAlerts, getReceivedAlerts

core/bus.js                           [EXTEND]
  → Ajouter les nouveaux événements au registre EVENTS :
    VEHICLE_ALERT_CREATED, VEHICLE_ALERT_PERSISTED,
    VEHICLE_ALERT_STATUS_CHANGED, VEHICLE_QUICK_REPLY_SENT,
    VEHICLE_MESSAGE_DELETED, VEHICLE_DELETION_PROPAGATED

index.html                            [WIRE — plus tard]
  → vehicleAlertQuick() → déléguer à VehicleOrgan.createAlert()
  → actQuickReply() → déléguer à VehicleOrgan.sendQuickReply()
  → vehicle_alert broadcast handler → déléguer à VehicleOrgan.receiveAlert()
  → renderCategoryFeed() véhicule → consommer VehicleOrgan.getSentAlerts()
    / getReceivedAlerts()
  → updateActBadge() → consommer VehicleOrgan.computeBadgeContribution()
  → Retirer toute mention de "Voir sur la carte" pour group=vehicle

messages.js                           [WIRE — plus tard]
  → deleteThread() → déléguer la suppression réelle à VehicleOrgan.deleteAlert()
    si le thread est un signalement véhicule

tests.js                              [EXTEND]
  → Ajouter suite VL-001 à VL-010 (lois VEHICLE-001 à VEHICLE-007)

FICHIERS NON MODIFIÉS

core/invariants.js          [INCHANGÉ — INV-001/002 déjà présents]
core/brain.js               [INCHANGÉ — à câbler plus tard]
core/governance.js          [INCHANGÉ]
app.css / calls.css         [INCHANGÉS]
calls.js                    [INCHANGÉ]
main                        [JAMAIS MODIFIÉ depuis ce plan]
```

---

## PARTIE 7 — PLAN DE CORRECTION MINIMAL

```
Les corrections sont ordonnées du plus fondamental au plus visible.
Chaque étape est indépendante et testable isolément.

ÉTAPE 1 — Étendre core/bus.js (nouveaux événements)
  Durée estimée : 30 min
  Risque : aucun (ajout pur, pas de modification)
  Test : vérifier que les nouveaux EVENTS sont présents et gelés

ÉTAPE 2 — Étendre vehicleOrgan.js (état complet)
  Durée estimée : 2h
  Dépend de : Étape 1
  Contenu :
    - _sentAlerts + _receivedAlerts (Map avec structures définies)
    - createAlert() avec guard persist-before-notify [V-01]
    - receiveAlert() + déduplification [V-01]
    - deleteAlert() avec UPDATE DB réel [V-02]
    - handleDeletion() depuis broadcast entrant [V-03]
    - sendQuickReply() avec validation alertId [V-07]
    - computeBadgeContribution() [V-05]
    - getAlertState() [V-06]
    - getSentAlerts() / getReceivedAlerts() [V-04]
  Test : VL-001 à VL-010

ÉTAPE 3 — Câbler vehicleAlertQuick() dans index.html
  Durée estimée : 1h
  Dépend de : Étape 2
  Risque : régression sur l'envoi de signalement
  Contenu : remplacer le corps de vehicleAlertQuick() par
            VehicleOrgan.createAlert(plate, msg, { urgent })

ÉTAPE 4 — Câbler deleteThread() pour les véhicules
  Durée estimée : 1h
  Dépend de : Étape 2
  Risque : régression sur la suppression de messages ordinaires
  Contenu : détecter si le thread est un signalement véhicule,
            si oui → VehicleOrgan.deleteAlert(alertId)
            si non → comportement actuel (inchangé)

ÉTAPE 5 — Câbler le badge
  Durée estimée : 30 min
  Dépend de : Étape 2
  Contenu : updateActBadge() ajoute
            VehicleOrgan.computeBadgeContribution()

ÉTAPE 6 — Câbler renderCategoryFeed() véhicule
  Durée estimée : 2h
  Dépend de : Étapes 2, 3
  Risque : régression Activité (onglets Reçus/Envoyés)
  Contenu : remplacer le filtre msgs par
            VehicleOrgan.getSentAlerts() / getReceivedAlerts()

ÉTAPE 7 — Retirer "Voir sur la carte" pour véhicules
  Durée estimée : 30 min
  Dépend de : Étape 6
  Risque : aucun (suppression d'un bouton incorrect)
  Contenu : dans renderCategoryFeed(), si group=vehicle,
            pas de bouton "Voir sur la carte"
```

---

## PARTIE 8 — RISQUES DE RÉGRESSION

```
RISQUE R-01 — Envoi de signalement cassé
  Étape exposée : 3
  Symptôme : vehicleAlertQuick() ne fonctionne plus
  Mitigation : tester manuellement l'envoi avant de merger
  Rollback : git revert l'étape 3 isolément

RISQUE R-02 — Suppression de messages ordinaires cassée
  Étape exposée : 4
  Symptôme : deleteThread() ne supprime plus les conversations normales
  Mitigation : la détection "est-ce un signalement véhicule ?"
               doit avoir un fallback vers le comportement actuel
  Rollback : git revert l'étape 4

RISQUE R-03 — Badge incohérent pendant la transition
  Étape exposée : 5 (avant que tous les organes soient câblés)
  Symptôme : badge double-compte les signalements véhicule
  Mitigation : désactiver l'ancien calcul avant d'activer le nouveau
               (pas les deux simultanément)

RISQUE R-04 — Onglet Reçus vide après câblage
  Étape exposée : 6
  Symptôme : renderCategoryFeed() véhicule ne retourne rien
  Mitigation : vérifier que VehicleOrgan.init() est appelé au chargement
               et que les données sont bien chargées depuis DB

RISQUE R-05 — Régression sur main
  Étape exposée : toutes
  Mitigation : toutes les corrections sont sur immatv2 uniquement
               main n'est jamais touchée sans validation explicite
```

---

## PARTIE 9 — TESTS OBLIGATOIRES AVANT PREMIÈRE CORRECTION

```
Tests existants à vérifier en baseline (doit être 182 ✅) :
  node tests.js   → 182 ✅ pass | 0 ❌ fail

Tests à écrire AVANT l'Étape 1 (tests préventifs) :

VL-PRE-01 — vehicleAlertQuick() actuel envoie un message en DB
  (documenter le comportement existant avant de le remplacer)

VL-PRE-02 — La suppression actuelle ne touche pas la DB
  (confirmer la violation V-02 par test)

VL-PRE-03 — VEHICLE_ALERT_PERSISTED n'existe pas encore dans EVENTS
  (confirmer avant d'ajouter)

Tests à écrire APRÈS chaque étape :

ÉTAPE 1 (bus.js)
  VL-001 — VEHICLE_ALERT_PERSISTED présent dans EVENTS et gelé

ÉTAPE 2 (vehicleOrgan.js étendu)
  VL-002 — createAlert() n'émet pas VEHICLE_ALERT_PERSISTED si DB KO
  VL-003 — deleteAlert() appelle DB avant d'émettre VEHICLE_MESSAGE_DELETED
  VL-004 — handleDeletion() retire l'alerte et émet VEHICLE_DELETION_PROPAGATED
  VL-005 — computeBadgeContribution() distingue urgent/normal/replied
  VL-006 — getAlertState() retourne REPLIED après onMessageReceived
  VL-007a — sendQuickReply() refusé si alertId inconnu
  VL-007b — sendQuickReply() valide lie la réponse à l'alerte
  VL-008 — getSentAlerts() retourne une copie, pas la référence interne
  VL-009 — getReceivedAlerts() déduplique si reçu deux fois
  VL-010 — isVehicleEntity() → false pour ROUTE, ASSISTANCE, CONDUCTEURS

APRÈS TOUTES LES ÉTAPES
  → 182 tests existants : tous verts (zéro régression)
  → 10 nouveaux tests VL-001 à VL-010 : tous verts
  → Total attendu : 192 ✅ pass | 0 ❌ fail
```
