# VEHICLE ORGAN — Constitution exécutable
> Définition de VehicleOrgan comme organe vivant de ImmatOrganism
> Version : 1.0 — immatv2
> Dérivée de l'audit violations V-01 à V-07

---

## Identité

```
Nom          : VehicleOrgan
Rôle         : Organe responsable du cycle de vie des signalements véhicule
Phase active : Phase 2 — Conseiller
Hiérarchie   : ImmatOrganism → VehicleOrgan
Dépendances  : ImmatBus (communication), ImmatBrain (gouvernance)
Fichier      : core/organs/vehicleOrgan.js
```

---

## Ce que VehicleOrgan VOIT

VehicleOrgan observe le monde extérieur à travers ces entrées :

```
ENTRÉES ACTIVES (il les reçoit en temps réel)
├── Broadcast Realtime : vehicle_alert
│     → signalement entrant pour la plaque courante
├── Broadcast Realtime : vehicle_deletion
│     → suppression propagée depuis l'autre compte
├── ImmatBus : VEHICLE_MESSAGE_SENT
│     → confirmation d'un message envoyé
├── ImmatBus : VEHICLE_MESSAGE_RECEIVED
│     → message reçu depuis la table messages
├── ImmatBus : VEHICLE_QUICK_REPLY_SENT
│     → réponse rapide d'un destinataire
└── ImmatBus : SETTINGS_UPDATED
      → changement de préférences

ENTRÉES PASSIVES (il les lit à la demande)
├── Table Supabase `messages`
│     filtres : sender_id = moi OU receiver_id = moi
│               ET message contient marqueur signalement
├── Plaque courante du compte (S.profile.owner_plate)
└── État de connexion réseau
```

---

## Ce que VehicleOrgan POSSÈDE

Son état interne — personne d'autre n'y accède directement :

```
_sentAlerts[]
  Structure par signalement envoyé :
  {
    alertId        : string (uuid)
    plate          : string (plaque destinataire)
    senderPlate    : string (ma plaque)
    message        : string
    state          : 'CREATED'|'PERSISTED'|'DELIVERED'|'SEEN'|'REPLIED'
    createdAt      : timestamp
    persistedAt    : timestamp|null
    deliveredAt    : timestamp|null
    seenAt         : timestamp|null
    repliedAt      : timestamp|null
    urgent         : boolean
  }

_receivedAlerts[]
  Structure par signalement reçu :
  {
    alertId        : string
    plate          : string (plaque émetteur)
    myPlate        : string (ma plaque ciblée)
    message        : string
    state          : 'RECEIVED'|'SEEN'|'REPLIED'
    receivedAt     : timestamp
    seenAt         : timestamp|null
    reply          : string|null
    repliedAt      : timestamp|null
    urgent         : boolean
  }

_pendingDeletions[]
  IDs de messages en attente de propagation de suppression.

_log[]
  Journal interne de 100 entrées max (tous événements).
```

---

## Ce que VehicleOrgan PEUT FAIRE

```
CRÉER
  createAlert(plate, message, options)
  → Persiste en DB d'abord
  → Émet VEHICLE_ALERT_PERSISTED
  → Broadcast vehicle_alert ensuite
  → Retourne l'alertId

RECEVOIR
  receiveAlert(payload)
  → Crée une entrée dans _receivedAlerts
  → Émet VEHICLE_ALERT_STATUS_CHANGED (RECEIVED)
  → Déclenche badge update

RÉPONDRE
  sendQuickReply(alertId, reply)
  → Valide que alertId est connu
  → Persiste en DB
  → Lie la réponse au signalement dans _receivedAlerts
  → Émet VEHICLE_QUICK_REPLY_SENT

SUPPRIMER
  deleteAlert(alertId)
  → Exécute DELETE ou UPDATE status='deleted' en DB
  → Broadcast vehicle_deletion aux comptes concernés
  → Émet VEHICLE_MESSAGE_DELETED
  → N'accepte pas si DB injoignable

CALCULER LE BADGE
  computeBadgeContribution()
  → Retourne { urgent: n, normal: n, replied: n }
  → Distingue urgent / normal / répondu

EXPOSER L'ÉTAT
  getAlertState(alertId)
  → Retourne l'état courant du signalement
  getSentAlerts() / getReceivedAlerts()
  → Listes normalisées pour l'UI

INTROSPECTION
  getLog() / clearLog()
```

---

## Ce que VehicleOrgan NE PEUT JAMAIS FAIRE

```
❌  Créer un marqueur sur la carte
    (INV-001 — Véhicule jamais carte)

❌  Écrire dans S.alerts ou reports
    (INV-002 — Véhicule = messages uniquement)
    (INV-003 — Route et Aide = reports, jamais messages)

❌  Émettre un broadcast avant confirmation de persistance DB
    (VEH-INV-001 — Persist before notify)

❌  Marquer un message comme supprimé sans DELETE réel en DB
    (VEH-INV-002 — No ghost data)

❌  Afficher un état fictif ou estimé
    (INV-012 — Toute donnée visible existe réellement)

❌  Autoriser une réponse rapide sans alertId valide
    (VEH-INV-007 — Reply requires context)

❌  Décider seul d'une action critique sans événement Bus
    (INV-014 — L'IA ne décide jamais seule)

❌  Rendre ses données directement dans le DOM
    Il expose des données normalisées — l'UI les consomme
    (VEH-INV-004 — Single rendering authority)
```

---

## Lois que VehicleOrgan doit respecter

```
VEHICLE-001  Persist before notify
  La persistance précède toujours la notification.

VEHICLE-002  Real deletion only
  Toute suppression est réelle — jamais masquage local.

VEHICLE-003  Global deletion
  La suppression est propagée à tous les comptes concernés.

VEHICLE-004  Single rendering authority
  VehicleOrgan est la seule source de vérité pour l'affichage.

VEHICLE-005  Badge semantics
  Urgent ≠ normal ≠ répondu dans la contribution au badge.

VEHICLE-006  Alert state is always known
  L'état d'un signalement est toujours traçable côté émetteur.

VEHICLE-007  Reply requires context
  Toute réponse rapide est liée à un alertId valide.

INVARIANTS FONDATEURS HÉRITÉS
  INV-001  Véhicule jamais carte
  INV-002  Véhicule = messages uniquement
  INV-005  Badge = contenu réel
  INV-011  Une seule source de vérité
  INV-012  Toute donnée visible existe réellement
  INV-013  Toute interaction a un contexte réel
  INV-014  L'IA ne décide jamais seule
```

---

## Événements que VehicleOrgan ÉMET

```
VEHICLE_ALERT_CREATED
  Quand   : Dès la tentative de création
  Payload : { alertId, plate, message, urgent }
  Avant   : Persistance DB — signale l'intention

VEHICLE_ALERT_PERSISTED
  Quand   : Après confirmation INSERT en DB
  Payload : { alertId, plate, senderPlate, at }
  Après   : Ce seul événement autorise le broadcast

VEHICLE_ALERT_STATUS_CHANGED
  Quand   : À chaque transition d'état
  Payload : { alertId, plate, previousState, newState, at }
  États   : CREATED→PERSISTED→DELIVERED→SEEN→REPLIED

VEHICLE_MESSAGE_SENT
  Quand   : Message véhicule envoyé (déjà existant)
  Payload : { plate, message, at }

VEHICLE_MESSAGE_RECEIVED
  Quand   : Message véhicule reçu (déjà existant)
  Payload : { plate, message, at }

VEHICLE_QUICK_REPLY_SENT
  Quand   : Réponse rapide (Je m'arrête, Je vérifie, Merci)
  Payload : { alertId, plate, reply, at }
  Distinct de VEHICLE_MESSAGE_SENT — contient alertId

VEHICLE_MESSAGE_DELETED
  Quand   : Après DELETE confirmé en DB
  Payload : { messageId, plate, deletedBy, at }

VEHICLE_DELETION_PROPAGATED
  Quand   : Après broadcast de suppression confirmé
  Payload : { messageId, plate, propagatedAt }

BADGE_RECOMPUTED (contribution véhicule)
  Quand   : À chaque changement d'état d'un signalement
  Payload : { vehicle: { urgent: n, normal: n, replied: n } }

INVARIANT_VIOLATED
  Quand   : Si une garde est déclenchée (INV-001, INV-002, etc.)
  Payload : { inv: 'INV-001', context: {...} }
```

---

## Événements que VehicleOrgan REÇOIT

```
VEHICLE_MESSAGE_SENT
  Source  : Lui-même ou code externe
  Action  : Mise à jour _sentAlerts, log

VEHICLE_MESSAGE_RECEIVED
  Source  : Realtime Supabase
  Action  : Crée entrée dans _receivedAlerts
            Déclenche badge update

VEHICLE_QUICK_REPLY_SENT
  Source  : Realtime (autre compte répond)
  Action  : Met à jour state→REPLIED dans _sentAlerts
            Émet VEHICLE_ALERT_STATUS_CHANGED

VEHICLE_MESSAGE_DELETED
  Source  : Broadcast Realtime (autre compte supprime)
  Action  : Retire de _receivedAlerts ou _sentAlerts
            Met à jour l'UI via BADGE_RECOMPUTED

SETTINGS_UPDATED
  Source  : ImmatBus (changement de préférences)
  Action  : Recharge les préférences de filtrage

INVARIANT_VIOLATED
  Source  : ImmatBus (toute garde déclenchée)
  Action  : Log + signal d'anomalie
```

---

## Cycle d'états d'un signalement envoyé

```
    [Compte A — émetteur]

    CREATED         ← vehicleAlertQuick() appelée
       ↓
    PERSISTED       ← INSERT DB confirmé → broadcast autorisé
       ↓
    DELIVERED       ← Compte B a reçu le broadcast OU rechargé ses messages
       ↓
    SEEN            ← Compte B a ouvert le message (read_at set)
       ↓
    REPLIED         ← Compte B a envoyé une réponse rapide

    À tout moment → état consultable via getAlertState(alertId)
```

---

## Cycle d'états d'un signalement reçu

```
    [Compte B — destinataire]

    RECEIVED        ← broadcast vehicle_alert OU postgres_changes INSERT
       ↓
    SEEN            ← Compte B ouvre la conversation (read_at set)
       ↓
    REPLIED         ← Compte B clique Je m'arrête / Je vérifie / Merci
```

---

## Ce que VehicleOrgan N'EST PAS

```
VehicleOrgan n'est pas un routeur de messages.
VehicleOrgan n'est pas un moteur de notifications.
VehicleOrgan n'est pas un composant UI.
VehicleOrgan n'est pas une base de données.
VehicleOrgan n'est pas ImmatBrain.

VehicleOrgan est la mémoire et la conscience
des interactions véhicule-à-véhicule.
```

---

## Checklist de validation (avant intégration dans l'app réelle)

```
□  VEHICLE-001 : createAlert() refuse le broadcast si INSERT échoue
□  VEHICLE-002 : deleteAlert() exécute DELETE en DB (pas localStorage)
□  VEHICLE-003 : deleteAlert() broadcast la suppression
□  VEHICLE-004 : getSentAlerts() / getReceivedAlerts() exposent le format canonique
□  VEHICLE-005 : computeBadgeContribution() distingue urgent/normal/replied
□  VEHICLE-006 : getAlertState() retourne un état valide pour tout alertId connu
□  VEHICLE-007 : sendQuickReply() refuse si alertId inconnu
□  INV-001 : guardMapMarker() bloque tout véhicule
□  INV-002 : guardChannel() bloque tout canal non-messages
□  182 tests existants : tous verts après implémentation
□  Nouveaux tests : ≥ 1 par loi VEHICLE-001 à VEHICLE-007
```
