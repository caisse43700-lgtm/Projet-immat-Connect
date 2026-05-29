# VEHICLE ORGAN — Définition officielle complète
> Référence canonique. Remplace CONSTITUTION + SPEC sur tout point de conflit.
> Branche : immatv2 — Version 1.0 — 29 mai 2026

---

## 0. STATUT DE CE DOCUMENT

Ce document est la **définition officielle finale** de VehicleOrgan.
Toute implémentation doit le respecter intégralement.
Toute décision qui contredit ce document doit d'abord modifier ce document,
avec validation humaine explicite, avant d'être codée.

---

## 1. IDENTITÉ

```
Nom              : VehicleOrgan
Rôle             : Organe de gestion du cycle de vie des signalements véhicule
Position          : ImmatOrganism → VehicleOrgan
Phase active     : Phase 2 — Conseiller
Fichier          : core/organs/vehicleOrgan.js
Dépendances      : ImmatBus (requis), Supabase client (requis au runtime)
Dépendances opt. : ImmatBrain (optionnel, enrichit la gouvernance)
```

---

## 2. PRINCIPE FONDATEUR

Un signalement véhicule est une **communication privée bilatérale**.
Il naît comme un message dans la table `messages`.
Il ne touche jamais la table `reports`.
Il ne crée jamais de marqueur sur la carte.
Il ne passe jamais par S.alerts.

Ce principe est non-négociable et ne peut être assoupli par aucune phase.

---

## 3. LES 7 LOIS

```
VEHICLE-LAW-001  Persist before notify
  Aucune notification n'est émise avant INSERT DB confirmé.
  Le broadcast est une conséquence de la persistance, jamais sa cause.

VEHICLE-LAW-002  Real deletion only
  Toute suppression exécute UPDATE status='deleted' en DB.
  Le localStorage n'est jamais utilisé pour simuler une suppression.

VEHICLE-LAW-003  Global deletion
  Toute suppression est propagée à tous les comptes concernés
  via postgres_changes UPDATE (canal principal)
  et broadcast vehicle_deletion (canal rapide).

VEHICLE-LAW-004  Single rendering authority
  VehicleOrgan est la seule source de données normalisées pour
  l'affichage des signalements véhicule.
  Aucune vue ne reconstruit cette donnée de façon autonome.

VEHICLE-LAW-005  Badge semantics
  La contribution au badge distingue : urgent / normal / répondu.
  Ces trois catégories ne sont jamais fusionnées en un compteur unique.

VEHICLE-LAW-006  Alert state is always known
  L'émetteur connaît l'état de son signalement à tout moment.
  Cycle : CREATED → PERSISTED → DELIVERED → SEEN → REPLIED.

VEHICLE-LAW-007  Reply requires context
  Toute réponse rapide porte un alertId valide.
  Une réponse sans alertId est un message ordinaire, pas une réponse rapide.
```

---

## 4. LES 7 INVARIANTS

```
VEH-INV-001  Persist before notify          [critique]
  Aucune notification ne peut précéder l'écriture confirmée en base.

VEH-INV-002  No ghost data                  [critique]
  Aucun message ne peut être présenté comme supprimé s'il existe en DB.
  (spécialisation de INV-012)

VEH-INV-003  Global deletion                [élevé]
  Les deux comptes d'une conversation ne peuvent pas avoir un état divergent
  sur la présence ou l'absence d'un message.

VEH-INV-004  Single rendering authority     [élevé]
  Aucune vue ne génère sa propre représentation des données véhicule.
  (spécialisation de INV-011)

VEH-INV-005  Badge semantics                [élevé]
  Un signalement urgent ≠ un message ordinaire dans le badge.
  (extension de INV-005)

VEH-INV-006  Alert state is always known    [élevé]
  L'état d'un signalement est toujours traçable côté émetteur.

VEH-INV-007  Reply requires context         [élevé]
  Aucune réponse rapide sans alertId valide.
  (spécialisation de INV-013)
```

---

## 5. CE QUE VEHICLEORGAN NE PEUT JAMAIS FAIRE

```
❌  Créer un marqueur sur la carte                       [INV-001]
❌  Écrire dans S.alerts                                 [INV-002]
❌  Écrire dans la table reports                         [INV-003]
❌  Émettre un broadcast avant INSERT DB confirmé        [VEH-INV-001]
❌  Marquer supprimé sans UPDATE/DELETE DB               [VEH-INV-002]
❌  Afficher "Voir sur la carte" pour un véhicule        [INV-001]
❌  Autoriser une réponse rapide sans alertId valide     [VEH-INV-007]
❌  Toucher le DOM directement                           [VEH-INV-004]
❌  Appeler une fonction d'affichage de carte            [INV-001]
❌  Décider seul d'une action critique                   [INV-014]
```

---

## 6. ALGORITHME DE DÉTECTION D'UN MESSAGE VÉHICULE

### 6.1 Problème actuel

La détection repose sur le contenu textuel du message :
`message.startsWith('⚠️ SIGNALEMENT')` ou `'🚨 SIGNALEMENT URGENT'`

C'est fragile : un utilisateur qui commence un message par ces caractères
déclencherait un faux positif.

### 6.2 Critères de détection robuste (sans migration SQL)

Un message est un **signalement véhicule** si et seulement si
**toutes** ces conditions sont vraies :

```
CONDITION 1 : target_plate est renseigné et non vide
  ET
CONDITION 2 : target_plate n'est pas une plaque système
  (pas 'ROUTE', 'ASSISTANCE', 'CONDUCTEURS', 'ALL')
  ET
CONDITION 3 : target_plate est une plaque réelle
  (2-7 caractères alphanumériques + tirets)
  ET
CONDITION 4 : message contient le marqueur canonique
  (voir 6.3)
  ET
CONDITION 5 : status != 'rejected' ET status != 'deleted'
```

### 6.3 Marqueur canonique

Format normalisé que VehicleOrgan impose à la création :

```
URGENT   : message commence par '🚨 SIGNALEMENT URGENT : '
NORMAL   : message commence par '⚠️ SIGNALEMENT : '
```

`isVehicleMessage(message, target_plate)` implémente les 5 conditions.

### 6.4 Evolution prévue (avec migration SQL — Phase 3+)

Ajouter `message_type VARCHAR DEFAULT NULL` à la table `messages`.
Valeurs : `null` (ordinaire), `'vehicle_alert'`, `'quick_reply'`, `'system'`.
Quand ce champ existe, la détection se fait sur `message_type = 'vehicle_alert'`.
La migration SQL doit passer par l'audit SQL avant application.

---

## 7. LES DEUX CHEMINS DE CRÉATION

Il existe deux fonctions de création dans le code actuel. VehicleOrgan
doit les unifier derrière une seule interface.

### 7.1 Chemin rapide — vehicleAlertQuick() [ligne 960]

```
Déclenché par : les boutons de l'écran Signaler (Pneu, Feu, etc.)
Comportement actuel :
  1. Construit le message avec prefix urgent/normal
  2. Appelle ImmatMessages.sendToPlate() → INSERT DB
  3. Envoie le broadcast vehicle_alert EN PARALLÈLE (violation V-01)

Comportement cible avec VehicleOrgan :
  1. VehicleOrgan.createAlert(plate, label, { urgent, path: 'quick' })
  2. INSERT DB → attendre confirmation
  3. Broadcast APRÈS confirmation
```

### 7.2 Chemin draft — vehicleAlert() [ligne 891]

```
Déclenché par : sélection d'un véhicule sur la carte puis choix du type
Comportement actuel :
  1. Prépare le message dans le champ iMsg
  2. Ouvre le panneau contact
  3. L'utilisateur envoie manuellement

Ce chemin NE passe PAS par vehicleAlertQuick().
Il passe par le panneau Contact → sendMsg ordinaire.

Comportement cible avec VehicleOrgan :
  Ce chemin reste inchangé pour l'instant.
  Il ne nécessite pas VehicleOrgan car c'est un message
  ordinaire préparé manuellement par l'utilisateur.
  VehicleOrgan.isVehicleMessage() le classifiera correctement
  à la réception si le message contient le marqueur.
```

### 7.3 Règle de clarté

```
vehicleAlertQuick() → VehicleOrgan.createAlert()    [à câbler — Étape 3]
vehicleAlert()      → chemin Contact inchangé        [non modifié]
```

---

## 8. ÉTAT INTERNE — STRUCTURES COMPLÈTES

### 8.1 _sentAlerts : Map<alertId, SentAlert>

```javascript
SentAlert = {
  alertId     : string,   // uuid du message en DB (row id)
  plate       : string,   // plaque destinataire (ex: 'AB-123-CD')
  senderPlate : string,   // ma plaque
  label       : string,   // libellé court (ex: 'Pneu crevé ou à plat')
  message     : string,   // texte complet envoyé
  urgent      : boolean,
  path        : 'quick' | 'manual',

  state       : SentState,
  createdAt   : number,   // Date.now() à la création
  persistedAt : number | null,
  deliveredAt : number | null,
  seenAt      : number | null,
  repliedAt   : number | null,
}

SentState = 'CREATED' | 'PERSISTED' | 'DELIVERED' | 'SEEN' | 'REPLIED'
```

### 8.2 _receivedAlerts : Map<alertId, ReceivedAlert>

```javascript
ReceivedAlert = {
  alertId    : string,   // uuid du message en DB
  plate      : string,   // plaque de l'émetteur
  myPlate    : string,   // ma plaque (celle ciblée)
  label      : string,   // libellé extrait du message
  message    : string,   // texte complet reçu
  urgent     : boolean,
  source     : 'broadcast' | 'postgres' | 'init',
               // comment cet alert est arrivé

  state      : ReceivedState,
  receivedAt : number,
  seenAt     : number | null,
  reply      : string | null,   // texte de la réponse rapide
  repliedAt  : number | null,
}

ReceivedState = 'RECEIVED' | 'SEEN' | 'REPLIED'
```

### 8.3 _pendingDeletions : Set<alertId>

IDs en attente de confirmation de propagation (max 50).
Retentative automatique toutes les 30s si non confirmé.

### 8.4 _log : Array<LogEntry>

```javascript
LogEntry = {
  type    : string,   // ex: 'VEHICLE_ALERT_PERSISTED', 'INV-001-BLOCKED'
  payload : object,
  at      : number,
}
```
Maximum 100 entrées. FIFO (shift quand plein).

---

## 9. MACHINE D'ÉTATS FORMELLE

### 9.1 Signalement envoyé (SentAlert)

```
             createAlert()
                  │
                  ▼
              CREATED ──────── INSERT DB échoue ──→ [erreur, pas de state]
                  │
                  │  INSERT DB confirmé
                  ▼
            PERSISTED ──────── broadcast envoyé
                  │
                  │  Compte B reçoit (broadcast ou postgres_changes)
                  ▼
            DELIVERED
                  │
                  │  Compte B ouvre le message (read_at set)
                  ▼
              SEEN
                  │
                  │  Compte B envoie réponse rapide
                  ▼
            REPLIED  ◄──────── état final observable
```

**Transitions interdites :**
- REPLIED → tout autre état (irréversible)
- sauter PERSISTED (ex: CREATED → DELIVERED) — impossible

### 9.2 Signalement reçu (ReceivedAlert)

```
  broadcast vehicle_alert ──┐
                             │  receiveAlert()
  postgres_changes INSERT ───┤  (déduplique par alertId)
                             │
                             ▼
                        RECEIVED
                             │
                             │  markSeen() (ouverture message)
                             ▼
                           SEEN
                             │
                             │  sendQuickReply()
                             ▼
                         REPLIED  ◄── état final

  handleDeletion() à tout état → alerte retirée de _receivedAlerts
```

### 9.3 Règle de déduplication

Quand broadcast ET postgres_changes arrivent pour le même alertId :
```
Si alertId ∈ _receivedAlerts → ignorer le doublon
Sinon → créer l'entrée, marquer source = 'broadcast' | 'postgres'
```

---

## 10. SÉQUENCE D'INITIALISATION

```javascript
VehicleOrgan.init(supabaseClient, options)
```

**Précondition :** utilisateur authentifié, plaque connue.
**Appelé par :** ImmatOrganism.init() après authentification.

```
Étape 1 — Stocker les dépendances
  _client = supabaseClient
  _myPlate = options.plate || ''

Étape 2 — Charger les alertes récentes depuis DB
  SELECT id, sender_id, receiver_id, target_plate, message,
         status, created_at, read_at,
         sender_plate, receiver_plate
  FROM messages
  WHERE (
    (receiver_id = moi OR target_plate = maPlate)   -- reçues
    OR
    (sender_id = moi AND isVehicleMessage(message, target_plate))  -- envoyées
  )
  AND status NOT IN ('rejected', 'deleted')
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 100

Étape 3 — Classifier chaque message
  Pour chaque row :
    Si sender_id = moi → _sentAlerts
      state = inférer depuis read_at du destinataire
    Sinon → _receivedAlerts
      state = inférer depuis read_at local
    isVehicleMessage(row.message, row.target_plate) = true ?
      → oui : classer / non : ignorer

Étape 4 — S'abonner aux événements ImmatBus
  ImmatBus.on(EVENTS.VEHICLE_MESSAGE_RECEIVED, receiveAlert)
  ImmatBus.on(EVENTS.VEHICLE_QUICK_REPLY_SENT, handleQuickReplyFromOther)
  ImmatBus.on(EVENTS.VEHICLE_MESSAGE_DELETED, handleDeletion)

Étape 5 — Émettre l'état initial du badge
  ImmatBus.emit(EVENTS.BADGE_RECOMPUTED, {
    vehicle: computeBadgeContribution()
  })

Étape 6 — Marquer comme initialisé
  _initialized = true

En cas d'échec de la requête DB :
  → _sentAlerts et _receivedAlerts restent vides
  → VehicleOrgan fonctionne en mode dégradé (pas de plantage)
  → log erreur + émet INVARIANT_VIOLATED avec contexte 'init_failed'
```

---

## 11. API CONTRACTUELLE COMPLÈTE

---

### `isVehicleEntity(entity) → boolean`

```
Précondition  : entity peut être null
Postcondition : true si et seulement si les 5 conditions de détection (§6.2) sont vraies
Effets       : aucun (pure function)
Erreurs      : jamais (try/catch interne)
```

---

### `isVehicleMessage(message, target_plate) → boolean`

```
Précondition  : strings ou null
Postcondition : true si le message porte le marqueur canonique ET la plaque est réelle
Effets        : aucun (pure function)
Erreurs       : jamais
```

---

### `guardMapMarker(entity) → GuardResult`

```
GuardResult = { allowed: boolean, invariant?: string, reason?: string }
Précondition  : entity quelconque
Postcondition : si isVehicleEntity → allowed=false + INV-001
Effets        : log interne + INVARIANT_VIOLATED sur Bus si bloqué
Erreurs       : jamais
```

---

### `guardChannel(entity, channel) → GuardResult`

```
Précondition  : entity quelconque, channel = string
Postcondition : si isVehicleEntity ET channel !== 'messages' → allowed=false + INV-002
Effets        : log interne + INVARIANT_VIOLATED sur Bus si bloqué
Erreurs       : jamais
```

---

### `createAlert(plate, label, opts) → Promise<string | null>`

```
opts = { urgent?: boolean, path?: 'quick'|'manual' }

Précondition  : plate valide, label non vide, _client initialisé
Précondition  : isVehicleEntity({ plate }) = true
Précondition  : plate !== maPlate (pas de signalement à soi-même)

Séquence :
  1. Construire le message avec marqueur canonique
  2. Émettre VEHICLE_ALERT_CREATED (intention)
  3. INSERT en DB → attendre
  4. Si erreur DB : log + retourner null (pas de broadcast)
  5. Si succès : alertId = row.id
  6. Créer SentAlert dans _sentAlerts avec state=PERSISTED
  7. Émettre VEHICLE_ALERT_PERSISTED { alertId, plate, senderPlate }
  8. Envoyer broadcast vehicle_alert { target_plate, sender_plate, label, urgent }
  9. Retourner alertId

Postcondition : alertId dans _sentAlerts avec state=PERSISTED
Retour        : alertId (string) si succès, null si échec DB
Erreurs       : absorbées (jamais de throw) — null retourné
```

---

### `receiveAlert(payload) → void`

```
payload = { alertId|id, target_plate, sender_plate, message|label, urgent }

Précondition  : payload non null
Vérification  : target_plate === maPlate → sinon ignorer silencieusement
Déduplication : si alertId ∈ _receivedAlerts → ignorer

Séquence :
  1. Vérifier target_plate
  2. Extraire alertId (= id du message en DB, ou Date.now() en fallback)
  3. Déduplication
  4. Créer ReceivedAlert dans _receivedAlerts avec state=RECEIVED
  5. Émettre VEHICLE_ALERT_STATUS_CHANGED { alertId, newState:'RECEIVED' }
  6. Émettre BADGE_RECOMPUTED

Postcondition : alertId dans _receivedAlerts avec state=RECEIVED
Erreurs       : absorbées
```

---

### `markSeen(alertId) → Promise<void>`

```
Précondition  : alertId ∈ _receivedAlerts
Séquence :
  1. UPDATE messages SET read_at=NOW() WHERE id=alertId
  2. _receivedAlerts[alertId].state = 'SEEN'
  3. Émettre VEHICLE_ALERT_STATUS_CHANGED { alertId, newState:'SEEN' }
  4. Émettre BADGE_RECOMPUTED
Erreurs : DB KO → log, état non changé
```

---

### `sendQuickReply(alertId, reply) → Promise<boolean>`

```
Précondition  : alertId ∈ _receivedAlerts avec state ≠ 'REPLIED' [VEH-INV-007]
Précondition  : reply non vide

Si alertId inconnu :
  → log anomalie VEH-INV-007
  → émettre INVARIANT_VIOLATED
  → retourner false (refus)

Séquence si alertId valide :
  1. INSERT message de réponse en DB (avec alertId en référence)
  2. _receivedAlerts[alertId].reply = reply
  3. _receivedAlerts[alertId].state = 'REPLIED'
  4. Émettre VEHICLE_QUICK_REPLY_SENT { alertId, plate, reply }
  5. Émettre VEHICLE_ALERT_STATUS_CHANGED { alertId, newState:'REPLIED' }
  6. Émettre BADGE_RECOMPUTED
  7. Retourner true

Postcondition : state=REPLIED dans _receivedAlerts, message en DB
Retour        : true si succès, false si refus ou erreur
```

---

### `deleteAlert(alertId) → Promise<boolean>`

```
Précondition  : alertId ∈ _sentAlerts OU _receivedAlerts

Si alertId inconnu → retourner false

Séquence :
  1. UPDATE messages SET status='deleted' WHERE id=alertId
  2. Attendre confirmation DB
  3. Si erreur DB : log + retourner false (rien n'est changé)
  4. Si succès :
     a. Retirer alertId de _sentAlerts et _receivedAlerts
     b. Ajouter alertId à _pendingDeletions
     c. Émettre VEHICLE_MESSAGE_DELETED { alertId, plate, deletedBy:maPlate }
     d. Broadcast vehicle_deletion { alertId }
     e. Retirer de _pendingDeletions
     f. Émettre VEHICLE_DELETION_PROPAGATED { alertId }
     g. Émettre BADGE_RECOMPUTED
     h. Retourner true

Postcondition : alertId absent de _sentAlerts et _receivedAlerts, status=deleted en DB
Retour        : true si succès, false si DB KO ou alertId inconnu
```

---

### `handleDeletion(alertId) → void`

```
Appelé quand : broadcast vehicle_deletion OU postgres_changes UPDATE status=deleted

Séquence :
  1. Si alertId absent des deux Maps → ignorer silencieusement
  2. Retirer alertId de _sentAlerts et _receivedAlerts
  3. Émettre VEHICLE_DELETION_PROPAGATED { alertId }
  4. Émettre BADGE_RECOMPUTED
```

---

### `computeBadgeContribution() → BadgeContrib`

```
BadgeContrib = { urgent: number, normal: number, replied: number }

Calcul sur _receivedAlerts uniquement (les envoyés ne créent pas de badge) :
  urgent  = count(state != 'REPLIED' AND urgent = true)
  normal  = count(state != 'REPLIED' AND urgent = false)
  replied = count(state = 'REPLIED')

Pure function. Jamais de throw.
```

---

### `getAlertState(alertId) → string | null`

```
Cherche dans _sentAlerts d'abord, puis _receivedAlerts.
Retourne .state si trouvé, null sinon.
Pure function.
```

---

### `getSentAlerts() → SentAlert[]`

```
Retourne une copie de _sentAlerts (Map → Array).
Triée par createdAt décroissant.
La copie protège l'état interne de toute mutation externe.
```

---

### `getReceivedAlerts() → ReceivedAlert[]`

```
Retourne une copie de _receivedAlerts (Map → Array).
Triée par receivedAt décroissant.
```

---

## 12. GESTION DES ERREURS ET CAS LIMITES

### 12.1 DB injoignable à la création

```
createAlert() → INSERT échoue
→ VEHICLE_ALERT_CREATED a déjà été émis (intention enregistrée)
→ Aucun broadcast envoyé [VEHICLE-LAW-001 respectée]
→ Alert NOT ajoutée à _sentAlerts
→ Retourne null
→ L'appelant doit afficher "Échec de l'envoi" à l'utilisateur
```

### 12.2 DB injoignable à la suppression

```
deleteAlert() → UPDATE échoue
→ Aucune modification de _sentAlerts/_receivedAlerts
→ Aucun broadcast
→ Retourne false
→ L'appelant doit afficher "Impossible de supprimer — réessaie"
→ _pendingDeletions non modifié
```

### 12.3 Broadcast reçu sans message en DB (race condition)

```
Compte B reçoit broadcast vehicle_alert
→ payload contient alertId mais DB n'a pas encore propagé l'INSERT

receiveAlert() est appelé :
→ ReceivedAlert créée avec source='broadcast'
→ alertId stocké même si non confirmé en DB

Quelques ms plus tard, postgres_changes INSERT arrive :
→ receiveAlert() appelé à nouveau avec le même alertId
→ Déduplication : alertId déjà dans _receivedAlerts → ignorer

Résultat : l'alerte est correctement gérée, sans doublon.
```

### 12.4 Suppression reçue pour un alertId inconnu

```
handleDeletion(alertId) appelé avec alertId inconnu :
→ Vérification : alertId ∉ _sentAlerts ET ∉ _receivedAlerts
→ Ignorer silencieusement (pas d'erreur, pas de log)
```

### 12.5 sendQuickReply sans connexion

```
Tentative d'INSERT échoue :
→ État _receivedAlerts NON modifié (state reste SEEN)
→ Retourne false
→ L'appelant affiche "Message non envoyé"
→ Pas d'émission de VEHICLE_QUICK_REPLY_SENT
```

### 12.6 Plusieurs appels rapides à createAlert (double-tap)

```
Si createAlert() est en cours (INSERT DB pending) :
→ Un flag _creating = true bloque les appels concurrents pour la même plaque
→ Retourne null immédiatement si bloqué
→ Flag remis à false après la réponse DB (succès ou échec)
```

---

## 13. INTÉGRATION IMMATBRAIN

ImmatBrain valide les décisions de VehicleOrgan avant exécution.
VehicleOrgan DEMANDE l'autorisation, ImmatBrain ACCORDE ou REFUSE.

### 13.1 Avant createAlert()

```javascript
ImmatBrain.canRequestVehicleAlert({
  senderPlate: maPlate,
  targetPlate: plate,
  phase: ImmatBrain.getPhase()
})
// → { allowed: boolean, reason: string }

Si non autorisé → createAlert() retourne null sans INSERT
```

Conditions de refus par ImmatBrain :
- `plate === maPlate` (auto-signalement)
- Phase < 2 (ImmatBrain pas encore actif)
- `plate` est une plaque système

### 13.2 Avant deleteAlert()

```javascript
ImmatBrain.canDelete({
  alertId,
  requestedBy: maPlate,
  alertOwner: alert.senderPlate
})
// Refus uniquement si phase >= 3 ET suppressions trop rapides (anti-spam)
```

### 13.3 Sur violation d'invariant

```javascript
// VehicleOrgan émet sur Bus :
ImmatBus.emit(EVENTS.INVARIANT_VIOLATED, { inv: 'INV-001', context: {...} })

// ImmatBrain écoute et enregistre dans son audit
ImmatBrain.validateInvariant('INV-001', false, context)
```

---

## 14. CATALOGUE COMPLET DES ÉVÉNEMENTS IMMATBUS

### 14.1 Émis par VehicleOrgan

| Événement | Payload | Déclencheur |
|-----------|---------|-------------|
| `VEHICLE_ALERT_CREATED` | `{ alertId, plate, message, urgent }` | Début de createAlert() |
| `VEHICLE_ALERT_PERSISTED` | `{ alertId, plate, senderPlate, at }` | Après INSERT DB confirmé |
| `VEHICLE_ALERT_STATUS_CHANGED` | `{ alertId, plate, previousState, newState, at }` | Toute transition d'état |
| `VEHICLE_MESSAGE_SENT` | `{ plate, message, at }` | Après INSERT DB envoi |
| `VEHICLE_MESSAGE_RECEIVED` | `{ plate, message, at }` | Après receiveAlert() |
| `VEHICLE_QUICK_REPLY_SENT` | `{ alertId, plate, reply, at }` | Après sendQuickReply() |
| `VEHICLE_MESSAGE_DELETED` | `{ alertId, plate, deletedBy, at }` | Après UPDATE DB suppression |
| `VEHICLE_DELETION_PROPAGATED` | `{ alertId, plate, propagatedAt }` | Après broadcast suppression |
| `BADGE_RECOMPUTED` | `{ vehicle: { urgent, normal, replied } }` | Tout changement d'état |
| `INVARIANT_VIOLATED` | `{ inv, context }` | Toute garde déclenchée |

### 14.2 Reçus par VehicleOrgan

| Événement | Source | Action |
|-----------|--------|--------|
| `VEHICLE_MESSAGE_RECEIVED` | RealtimeOrgan / App | → receiveAlert() |
| `VEHICLE_QUICK_REPLY_SENT` | ImmatBus (autre compte) | → handleQuickReplyFromOther() → state=REPLIED |
| `VEHICLE_MESSAGE_DELETED` | ImmatBus (autre compte) | → handleDeletion() |
| `SETTINGS_UPDATED` | ImmatBus | Rechargement préférences |
| `INVARIANT_VIOLATED` | ImmatBus | Log + signal anomalie |

---

## 15. LIENS INTER-ORGANES (CONTRATS D'INTERFACE)

### VehicleOrgan → ActivityOrgan

```
ActivityOrgan consomme :
  VehicleOrgan.getSentAlerts()      → onglet Envoyés, catégorie Véhicule
  VehicleOrgan.getReceivedAlerts()  → onglet Reçus, catégorie Véhicule
  VehicleOrgan.getAlertState(id)    → indicateur d'état par item

ActivityOrgan écoute :
  VEHICLE_ALERT_STATUS_CHANGED   → rafraîchit l'item
  VEHICLE_MESSAGE_DELETED        → retire l'item
  BADGE_RECOMPUTED               → met à jour badge catégorie Véhicule
```

### VehicleOrgan → MessagesOrgan

```
MessagesOrgan gère le stockage brut des messages.
VehicleOrgan enrichit avec la sémantique d'alerte.
Pas de couplage fort : ils partagent la même table `messages` en DB.

MessagesOrgan.sendToPlate() peut être appelé DANS createAlert()
pour l'INSERT initial — mais VehicleOrgan contrôle le flux.

VEHICLE_MESSAGE_DELETED → MessagesOrgan retire le message de son thread.
```

### VehicleOrgan → BadgeOrgan

```
VehicleOrgan expose : computeBadgeContribution() → { urgent, normal, replied }
BadgeOrgan agrège les contributions de tous les organes.
BadgeOrgan écoute : BADGE_RECOMPUTED → recalcule + met à jour DOM.
```

### VehicleOrgan → RealtimeOrgan

```
RealtimeOrgan transmet à VehicleOrgan (via ImmatBus) :
  postgres_changes INSERT messages → VEHICLE_MESSAGE_RECEIVED
  postgres_changes UPDATE messages (status=deleted) → VEHICLE_MESSAGE_DELETED
  broadcast 'vehicle_alert' → VEHICLE_MESSAGE_RECEIVED
  broadcast 'vehicle_deletion' → VEHICLE_MESSAGE_DELETED

VehicleOrgan ne connaît pas RealtimeOrgan directement.
Toute communication passe par ImmatBus.
```

---

## 16. CONFIGURATION

```javascript
VehicleOrgan.init(client, {
  plate      : string,    // plaque du compte courant — obligatoire
  maxLog     : number,    // taille du journal interne (défaut: 100)
  maxAlerts  : number,    // max _sentAlerts + _receivedAlerts (défaut: 200)
  ttlHours   : number,    // durée de vie des alertes au chargement init (défaut: 24)
  debug      : boolean,   // log console en mode dev (défaut: false)
})
```

---

## 17. CRITÈRES DE PASSAGE EN PHASE 3 — GARDIEN

VehicleOrgan passe de Phase 2 (Conseiller) à Phase 3 (Gardien) quand :

```
□  createAlert() est câblé sur vehicleAlertQuick() dans index.html
□  deleteAlert() est câblé sur deleteThread() pour les messages véhicule
□  computeBadgeContribution() remplace le calcul actuel pour les véhicules
□  getSentAlerts() / getReceivedAlerts() alimentent renderCategoryFeed()
□  Tous les tests VL-001 à VL-010 sont verts
□  Les 182 tests existants restent verts (zéro régression)
□  Validation humaine explicite
```

---

## 18. PLAN D'IMPLÉMENTATION ORDONNÉ

```
Étape 1  core/bus.js         Ajouter les 8 nouveaux événements       Risque : 0
Étape 2  vehicleOrgan.js     Implémenter l'état complet + API         Risque : faible
Étape 3  index.html          Câbler vehicleAlertQuick()               Risque : moyen
Étape 4  messages.js         Câbler deleteThread() véhicule           Risque : moyen
Étape 5  index.html          Câbler badge contribution véhicule       Risque : faible
Étape 6  index.html          Câbler renderCategoryFeed() véhicule     Risque : moyen
Étape 7  index.html          Retirer "Voir sur la carte" véhicule     Risque : nul
```

---

## 19. TESTS COMPLETS REQUIS

```
BASELINE (avant Étape 1)
  node tests.js → 182 ✅ | 0 ❌

TESTS PRÉVENTIFS (documentent l'existant)
  VL-PRE-01  vehicleAlertQuick() actuel envoie un message en DB
  VL-PRE-02  La suppression actuelle ne touche pas la DB (confirme V-02)
  VL-PRE-03  VEHICLE_ALERT_PERSISTED absent du registre EVENTS actuel

APRÈS ÉTAPE 1 (bus.js)
  VL-001     VEHICLE_ALERT_PERSISTED présent et gelé dans EVENTS

APRÈS ÉTAPE 2 (vehicleOrgan.js)
  VL-002     createAlert() → null si INSERT DB échoue, pas de broadcast
  VL-003     deleteAlert() → false si DB KO, état non modifié
  VL-004     handleDeletion() → retire l'alerte + VEHICLE_DELETION_PROPAGATED
  VL-005     computeBadgeContribution() → { urgent:2, normal:1, replied:0 } (cas test)
  VL-006     getAlertState() → 'REPLIED' après réponse reçue
  VL-007a    sendQuickReply(alertId_inconnu) → false + INVARIANT_VIOLATED
  VL-007b    sendQuickReply(alertId_valide) → true + state=REPLIED
  VL-008     getSentAlerts() → copie indépendante (mutation non propagée)
  VL-009     receiveAlert() déduplique sur alertId
  VL-010     isVehicleMessage() → false si plaque système

APRÈS TOUTES LES ÉTAPES
  182 tests existants : tous verts
  10 nouveaux VL-001→VL-010 : tous verts
  Objectif : 192 ✅ | 0 ❌
```
