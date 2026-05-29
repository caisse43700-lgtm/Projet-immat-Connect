# ImmatConnect — Spécification Officielle Produit
> Version 1.0 — Source de vérité absolue. Le code s'aligne sur ce document, jamais l'inverse.

---

## Table des matières

1. [Domain Model](#1-domain-model)
2. [State Model](#2-state-model)
3. [Capability Model](#3-capability-model)
4. [View Model](#4-view-model)
5. [Interaction Model](#5-interaction-model)
6. [Règles Métier Officielles](#6-règles-métier-officielles)
7. [UX Officielle](#7-ux-officielle)
8. [Test Model](#8-test-model)
9. [Audit de Conformité](#9-audit-de-conformité)
10. [Plan de Correction Priorisé](#10-plan-de-correction-priorisé)

---

## 1. Domain Model

### 1.1 Utilisateur

| Attribut | Valeur |
|---|---|
| **Description** | Personne physique propriétaire d'un compte ImmatConnect |
| **Rôle métier** | Acteur de toutes les interactions de l'application |
| **Identifiant** | `auth.users.id` (UUID Supabase Auth) |
| **Source de vérité** | Supabase Auth + table `profiles` |
| **Propriétaire** | Lui-même |
| **Durée de vie** | Permanente jusqu'à suppression manuelle |
| **Dépendances** | Véhicule, Message, SignalementRoute, DemandeAide, DemandeAppel, PréférenceAppel |
| **Suppression** | Cascade sur toutes les entités liées (ON DELETE CASCADE) |

**Données** : `id`, `email`, `pseudo`, `owner_plate`, `phone`, `vehicle_color`, `created_at`

---

### 1.2 Véhicule

| Attribut | Valeur |
|---|---|
| **Description** | Véhicule associé à un utilisateur, identifié par sa plaque d'immatriculation |
| **Rôle métier** | Identifiant visuel et point de contact entre conducteurs |
| **Identifiant** | `owner_plate` (texte normalisé format `AB-123-CD`) |
| **Source de vérité** | Colonne `owner_plate` dans `profiles` |
| **Propriétaire** | L'Utilisateur associé |
| **Durée de vie** | Identique à l'Utilisateur |
| **Dépendances** | Utilisateur (1:1), Messages, Signalements |
| **Suppression** | Via suppression de l'Utilisateur |

**Règle** : une plaque est unique dans le système. Deux comptes ne peuvent pas partager la même plaque.

---

### 1.3 SignalementRoute

| Attribut | Valeur |
|---|---|
| **Description** | Incident sur la voie publique signalé par un conducteur |
| **Rôle métier** | Alerter les conducteurs proches d'un danger ou d'une gêne sur la route |
| **Identifiant** | `reports.id` (UUID) |
| **Source de vérité** | Table `reports` (Supabase) + `S.alerts` (mémoire locale) |
| **Propriétaire** | Le conducteur créateur (`reporter_id`) |
| **Durée de vie** | 30 min (bouchon) à 2h (travaux). Nettoyage par TTL côté client |
| **Dépendances** | Utilisateur (créateur), Localisation |
| **Suppression** | Résolution : `status = 'resolved'`, `resolved_at = now()` |

**Types** : `accident`, `bouchon`, `obstacle`, `travaux`, `controle`, `danger`

**Plate fictive** : `plate = 'ROUTE'` (jamais une vraie plaque)

---

### 1.4 DemandeAide

| Attribut | Valeur |
|---|---|
| **Description** | Demande d'assistance émise par un conducteur en difficulté |
| **Rôle métier** | Informer les conducteurs proches d'un besoin d'aide |
| **Identifiant** | `reports.id` (UUID), partagé avec SignalementRoute via `category` |
| **Source de vérité** | Table `reports` (`category = 'help'`) + `S.alerts` |
| **Propriétaire** | Le conducteur demandeur (`reporter_id`) |
| **Durée de vie** | 45 min. TTL identique aux alertes route |
| **Dépendances** | Utilisateur (demandeur), Localisation |
| **Suppression** | Résolution : `status = 'resolved'` — **uniquement par le créateur** |

**Types** : `panne`, `carburant`, `batterie`, `moteur`, `incendie`, `perdu`

**Plate fictive** : `plate = 'ASSISTANCE'`

**Règle critique** : un tiers ne peut PAS résoudre une DemandeAide. Seul le créateur peut fermer sa propre demande (`_mine = true`).

---

### 1.5 AlerteVéhicule

| Attribut | Valeur |
|---|---|
| **Description** | Notification envoyée par un conducteur à propos du véhicule d'un autre conducteur |
| **Rôle métier** | Prévenir un conducteur d'un problème visible sur son véhicule |
| **Identifiant** | Aucun identifiant persistant — événement éphémère |
| **Source de vérité** | `messages` table + broadcast Realtime `vehicle_alert` |
| **Propriétaire** | Le conducteur émetteur |
| **Durée de vie** | TTL UI = 60 min. Pas de persistance en DB autonome |
| **Dépendances** | Utilisateur (émetteur + destinataire), Message |
| **Suppression** | Disparition par TTL ou action "Vu" |

**Règle critique** : l'AlerteVéhicule n'est JAMAIS dans `S.alerts`. Elle transite par `S._actMessages` uniquement.

---

### 1.6 Message

| Attribut | Valeur |
|---|---|
| **Description** | Communication textuelle directe entre deux conducteurs |
| **Rôle métier** | Canal de communication privé entre deux plaques |
| **Identifiant** | `messages.id` (UUID ou entier) |
| **Source de vérité** | Table `messages` (Supabase) |
| **Propriétaire** | L'expéditeur (`sender_id`) |
| **Durée de vie** | Permanente jusqu'à suppression locale (localStorage) |
| **Dépendances** | Utilisateur (expéditeur + destinataire), Conversation |
| **Suppression** | Soft-delete local uniquement (`ic_deleted_msgs` dans localStorage) |

**Champs** : `sender_id`, `receiver_id`, `sender_plate`, `receiver_plate`, `target_plate`, `from_plate`, `to_plate`, `message`, `status`, `read_at`, `created_at`

**Note** : la redondance des champs plaque (`sender_plate` / `from_plate`) est une dette technique héritée. La source de vérité est `sender_id` / `receiver_id`.

---

### 1.7 Conversation

| Attribut | Valeur |
|---|---|
| **Description** | Ensemble des messages échangés entre deux plaques |
| **Rôle métier** | Vue agrégée de l'historique des échanges avec un conducteur |
| **Identifiant** | `_otherPlate` (plaque de l'interlocuteur) |
| **Source de vérité** | Dérivé de `messages` — entité calculée, jamais persistée |
| **Propriétaire** | Partagé entre les deux interlocuteurs |
| **Durée de vie** | Tant que des messages existent |
| **Dépendances** | Message (1:N) |
| **Suppression** | Soft-delete local de tous les messages du thread |

---

### 1.8 DemandeAppel

| Attribut | Valeur |
|---|---|
| **Description** | Demande d'initiation de contact vocal entre deux conducteurs |
| **Rôle métier** | Permettre à un conducteur de proposer un contact à un autre, avec consentement explicite |
| **Identifiant** | `call_requests.id` (UUID) |
| **Source de vérité** | Table `call_requests` (Supabase) |
| **Propriétaire** | Le demandeur (`requester_id`) |
| **Durée de vie** | 30 secondes (expiration automatique) |
| **Dépendances** | Utilisateur (demandeur + destinataire), PréférenceAppel |
| **Suppression** | Transition vers état terminal : `accepted`, `refused`, `expired`, `cancelled` |

**Règle critique** : ImmatConnect ne transmet JAMAIS de numéro de téléphone. L'"appel" ouvre une Conversation, il n'initie pas d'appel téléphonique réel.

---

### 1.9 PréférenceAppel

| Attribut | Valeur |
|---|---|
| **Description** | Paramètre de consentement d'un utilisateur aux demandes d'appel entrants |
| **Rôle métier** | Contrôle du canal de contact — opt-in explicite requis |
| **Identifiant** | `call_preferences.user_id` (UUID = clé primaire) |
| **Source de vérité** | Table `call_preferences` (Supabase) |
| **Propriétaire** | L'Utilisateur lui-même |
| **Durée de vie** | Permanente — un enregistrement par utilisateur |
| **Dépendances** | Utilisateur (1:1) |
| **Suppression** | Cascade depuis Utilisateur |

**Valeur par défaut** : `allow_calls = false` (opt-out par défaut)

---

### 1.10 Localisation

| Attribut | Valeur |
|---|---|
| **Description** | Position GPS temps réel d'un conducteur |
| **Rôle métier** | Afficher les véhicules proches sur la carte, calculer les distances |
| **Identifiant** | `user_locations.user_id` |
| **Source de vérité** | Table `user_locations` + channel Realtime `ic_loc` |
| **Propriétaire** | L'Utilisateur |
| **Durée de vie** | Éphémère — mise à jour continue, expiration à déconnexion |
| **Dépendances** | Utilisateur |
| **Suppression** | À déconnexion ou passage en mode invisible |

---

## 2. State Model

### 2.1 DemandeAppel

```
           ┌─────────┐
     ──────►  pending  ├──── requester annule ──────► cancelled
           └────┬────┘
                │
        ┌───────┼──────────┐
        ▼       ▼          ▼
    accepted  refused   expired
```

| Transition | Acteur | Condition |
|---|---|---|
| `pending → accepted` | Destinataire | Clique "Accepter" dans les 30s |
| `pending → refused` | Destinataire | Clique "Refuser" |
| `pending → expired` | Système (pg_cron / UI) | `expires_at < now()` |
| `pending → cancelled` | Demandeur | Clique "Annuler" |

**Transitions interdites** (garanties par trigger DB `call_request_on_update`) :

- `accepted → *` — état terminal
- `refused → *` — état terminal
- `expired → *` — état terminal
- `cancelled → *` — état terminal

**Règles anti-spam** (garanties par trigger DB `call_request_on_insert`) :
- Max 3 demandes en 10 minutes entre les mêmes utilisateurs
- Cooldown 5 minutes après un refus
- Un seul `pending` possible entre deux utilisateurs (unique index)

---

### 2.2 SignalementRoute

```
    active ──── résolution ──── resolved
      │
      └── TTL dépassé ──────── (supprimé de S.alerts localement)
```

| Transition | Acteur | Condition |
|---|---|---|
| `→ active` | Tout utilisateur | Création via `roadReport()` |
| `active → resolved` | Tout utilisateur | Clic "Disparu" dans l'Activité |
| `active → résolu local` | Système | TTL expiré |

**Propagation** : résolution → broadcast `resolve_report` → DB `UPDATE status='resolved'`

---

### 2.3 DemandeAide

```
    active ──── résolution (créateur seulement) ──── resolved
      │
      └── TTL dépassé ──────── (supprimé de S.alerts localement)
```

| Transition | Acteur | Condition |
|---|---|---|
| `→ active` | Le conducteur demandeur | Création via `assist()` |
| `active → resolved` | **Créateur uniquement** (`_mine = true`) | Clic "Disparu" |

**Règle critique** : `canResolveAlert(a) = a.group === 'assist' ? a._mine === true : true`

---

### 2.4 Message

```
    sent ──── livré ──── read (read_at non null)
```

| État | Condition |
|---|---|
| `sent` | INSERT en DB réussi |
| `read` | `read_at` renseigné par le destinataire à l'ouverture du thread |
| `deleted (local)` | ID dans `ic_deleted_msgs` localStorage |

---

## 3. Capability Model

### 3.1 Matrice capacités par rôle

| Action | Créateur | Destinataire | Tiers (C) |
|---|---|---|---|
| **DemandeAppel — Créer** | ✅ | ❌ | ❌ |
| **DemandeAppel — Annuler** | ✅ | ❌ | ❌ |
| **DemandeAppel — Accepter** | ❌ | ✅ | ❌ |
| **DemandeAppel — Refuser** | ❌ | ✅ | ❌ |
| **DemandeAppel — Lire** | ✅ | ✅ | ❌ |
| **SignalementRoute — Créer** | ✅ | — | ✅ |
| **SignalementRoute — Résoudre** | ✅ | — | ✅ |
| **DemandeAide — Créer** | ✅ | — | — |
| **DemandeAide — Résoudre** | ✅ | — | ❌ |
| **Message — Envoyer** | ✅ | ✅ | — |
| **Message — Lire** | ✅ (envoyés) | ✅ (reçus) | ❌ |
| **Message — Supprimer** | ✅ (local) | ✅ (local) | ❌ |
| **PréférenceAppel — Modifier** | ✅ (la sienne) | — | ❌ |
| **PréférenceAppel — Lire (via RPC)** | Oui (boolean) | Oui (boolean) | Oui (boolean) |

**Garanties Supabase RLS** :
- `call_requests` : lecture filtrée sur `requester_id = auth.uid() OR receiver_id = auth.uid()`
- `call_preferences` : lecture/écriture filtrée sur `user_id = auth.uid()`
- `can_receive_calls()` : RPC SECURITY DEFINER — retourne uniquement un boolean, ne révèle pas la table

---

## 4. View Model

### 4.1 Matrice de visibilité officielle

| Entité | Carte | Activité | Messages | Conversation | Paramètres |
|---|:---:|:---:|:---:|:---:|:---:|
| SignalementRoute | ✅ marqueur | ✅ liste | ❌ | ❌ | ❌ |
| DemandeAide | ✅ marqueur | ✅ liste | ❌ | ❌ | ❌ |
| AlerteVéhicule | ❌ **JAMAIS** | ✅ liste | ✅ | ✅ | ❌ |
| Message | ❌ | ✅ aperçu | ✅ liste | ✅ thread | ❌ |
| Conversation | ❌ | ✅ aperçu | ✅ liste | ✅ thread | ❌ |
| DemandeAppel | ❌ | ✅ historique | ✅ | ✅ | ❌ |
| PréférenceAppel | ❌ | ❌ | ❌ | ❌ | ✅ |
| Localisation | ✅ marqueur | ❌ | ❌ | ❌ | ❌ |
| Véhicule | ✅ marqueur | ✅ | ✅ | ✅ | ❌ |

### 4.2 Violations identifiées dans le code actuel

| Violation | Gravité | Statut |
|---|---|---|
| AlerteVéhicule → "Voir sur la carte" (bouton présent) | Critique | ✅ Corrigé (V9) |
| AlerteVéhicule → `S.alerts` (pollution) | Critique | ✅ Corrigé (V9) |
| DemandeAppel → bannière persistante à l'accueil | Majeur | ✅ Corrigé (v2) |
| `call_preferences` lisible par tous (`using (true)`) | Critique (sécurité) | ✅ Corrigé (v2) |

---

## 5. Interaction Model

### 5.1 Parcours Route

```
Conducteur A détecte un incident
    │
    ▼
Onglet Signaler → Route → Type (bouchon, accident…)
    │
    ▼
roadReport(type)
    ├── addCommunityAlert({group:'route', _mine:true})  → S.alerts + marqueur carte
    ├── saveReportRemote()                               → reports table (DB)
    └── broadcast 'new_report'                           → Realtime → conducteurs proches
                │
                ▼
        Conducteur B voit le marqueur sur la carte
                │
                ▼
        Activité → "Disparu" ou "Toujours là"
                │
                ▼
        dismissAlert({silent:false})
            ├── S.alerts filtré
            ├── marqueur retiré
            ├── broadcast 'resolve_report'  → B voit disparaître chez lui
            └── UPDATE reports SET status='resolved'
```

---

### 5.2 Parcours Aide

```
Conducteur A en panne
    │
    ▼
Onglet Signaler → Aide → Type (panne, carburant…)
    │
    ▼
assist(type)
    ├── addCommunityAlert({group:'assist', _mine:true})  → S.alerts + marqueur carte
    └── saveReportRemote()                                → reports table
                │
                ▼
        Conducteur B voit l'alerte aide
                │
        Seul A peut résoudre (canResolveAlert → _mine)
                │
                ▼
        A clique "Disparu" → dismissAlert → resolved
```

---

### 5.3 Parcours Véhicule (officiel)

```
Conducteur B reçoit une alerteVéhicule
    │
    ▼
Activité → onglet Véhicule → alerte affichée
    │
    ├── "Je m'arrête"  ──► actQuickReply() → ImmatMessages.sendToPlate()
    ├── "Je vérifie"   ──► actQuickReply() → ImmatMessages.sendToPlate()
    ├── "Merci"        ──► actQuickReply() → ImmatMessages.sendToPlate()
    └── "Contacter"    ──► CallManager.openContactOptions()
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              → Message               → Appel (si activé)
```

**Règle** : aucune de ces actions ne crée de `report`, ne modifie `S.alerts`, ni ne pose de marqueur carte.

---

### 5.4 Parcours Appel (officiel)

```
Prérequis : B a activé allow_calls = true dans ses Paramètres
    │
    ▼
A clique "Contacter" sur l'alerte véhicule de B
    │
    ▼
Modal "Comment contacter ?"
    ├── "Message" → ImmatMessages.sendToPlate()
    └── "Appel"   → contactByCall()
                        │
                        ▼
                can_receive_calls(B.uid)  [RPC SECURITY DEFINER]
                        │
                   ┌────┴────┐
                   ▼         ▼
                false       true
                  │           │
                  ▼           ▼
         Modal               INSERT call_requests
         "non autorisé"          │
         → proposer Message      ▼
                         Bannière "Demande envoyée" (30s)
                                 │
                         ┌───────┴───────┐
                         ▼               ▼
                    B voit popup    Timeout 30s
                    (Realtime)      → expired
                         │
                    ┌────┴────┐
                    ▼         ▼
                Accepter    Refuser
                    │           │
                    ▼           ▼
             Conversation    Toast "refusée"
             ouverte         Cooldown 5 min
```

**Ce que "Appel" signifie** : ouverture d'une conversation textuelle. **Aucun appel téléphonique**. Aucun numéro partagé.

---

## 6. Règles Métier Officielles

### 6.1 Route

- **Stockage** : `reports` (DB) + `S.alerts` (mémoire) + `S.alertMarkersById` (carte)
- **group** : toujours `'route'`
- **plate** : toujours `'ROUTE'` (jamais une plaque réelle)
- **Visible** : Carte (marqueur) + Activité (liste)
- **Résolution** : tout utilisateur peut résoudre
- **Propagation** : broadcast bidirectionnel `resolve_report`

### 6.2 Aide

- **Stockage** : `reports` (DB) + `S.alerts` (mémoire) + `S.alertMarkersById` (carte)
- **group** : toujours `'assist'`
- **plate** : toujours `'ASSISTANCE'`
- **Visible** : Carte (marqueur) + Activité (liste)
- **Résolution** : créateur uniquement (`_mine = true`)
- **Propagation** : broadcast `resolve_report` uniquement si `_mine` OU `isRouteAlert`

### 6.3 Véhicule

- **Stockage** : `messages` (DB) + `S._actMessages` (mémoire)
- **group** : toujours `'vehicle'`
- **Visible** : Activité + Messages + Conversation
- **Interdit** : `S.alerts`, `S.alertMarkersById`, `reports`, marqueur carte, "Voir sur la carte"
- **Transport** : `ImmatMessages.sendToPlate()` ou broadcast `vehicle_alert`

### 6.4 Appels

- **Stockage** : `call_requests` + `call_preferences`
- **Visible** : Activité (historique) + Conversation (après acceptation) + Paramètres (préférence)
- **Interdit** : accueil principal, carte, panel Signaler
- **Opt-in** : `allow_calls = false` par défaut — l'utilisateur doit activer explicitement
- **Confidentialité** : aucun numéro de téléphone transmis — l'appel ouvre une Conversation

### 6.5 Messages

- **Stockage** : `messages` (DB), soft-delete local (`localStorage`)
- **Channel Realtime** : `immat_messages_v12_{uid}` — `postgres_changes` sur `*`
- **Normalisation** : `_sent` / `_received` / `_otherPlate` calculés à la lecture
- **Thread** : groupé par `_otherPlate`

---

## 7. UX Officielle

### 7.1 Accueil / Carte

**Autorisé** :
- Navigation GPS temps réel
- Marqueurs conducteurs proches
- Marqueurs alertes Route et Aide
- FAB actions (recentrer, conducteurs proches, vue, SOS)
- Menu contexte véhicule (Envoyer message, Signaler problème)

**Interdit** :
- Bannière appel persistante bloquant la carte
- Overlay plein écran non demandé
- Marqueurs alertes Véhicule
- Téléphone mis en avant comme action principale

---

### 7.2 Onglet Activité

**Structure officielle** :

```
Activité
├── Alertes Route & Aide (avec actions : Vu / Toujours là / Disparu)
├── Alertes Véhicule (avec actions : Je m'arrête / Je vérifie / Merci / Contacter)
└── Messages (aperçu threads, avec action : Répondre / Supprimer)
```

**Pour les alertes Véhicule, toujours afficher** :
- "Je m'arrête" → `actQuickReply(plate, 'Je m\'arrête.')`
- "Je vérifie" → `actQuickReply(plate, 'Je vérifie.')`
- "Merci" → `actQuickReply(plate, 'Merci.')`
- "Contacter" → `CallManager.openContactOptions(plate)`

**Jamais afficher pour Véhicule** : "Voir sur la carte"

**Pour les alertes Route, afficher** :
- "📍 Voir sur la carte" → `actViewOnMap(id)`
- "Toujours là" → `actConfirmAlert(id, 'present')`
- "Disparu" → `actConfirmAlert(id, 'gone')`

---

### 7.3 Paramètres — Section Communication

**À créer / maintenir** :

```
Communication
─────────────
[toggle] Autoriser les demandes d'appel

"Aucun appel ne démarre sans votre acceptation.
 Votre numéro n'est jamais partagé."
```

**Comportement** :
- Toggle off par défaut (`allow_calls = false`)
- Changement → `CallManager.setCallPreferences(bool)` → upsert `call_preferences`
- Lecture au chargement → `CallManager.loadCallPreferences()`

---

### 7.4 Modal "Comment contacter ?"

```
Contacter [PLAQUE]
──────────────────
[💬 Message]    [📞 Appel]

               Annuler
```

- Appuyer sur overlay → fermer
- "Message" → `ImmatMessages.sendToPlate()` (ou `actOpenConv`)
- "Appel" → vérifie `can_receive_calls()` → si false : modal "non autorisé"

---

### 7.5 Modal "Appels non autorisés"

```
🚫
Ce conducteur n'a pas activé les appels internes.
[PLAQUE] n'a pas autorisé les demandes d'appel.

[💬 Envoyer un message]
         Fermer
```

- "Envoyer un message" → ferme le modal + `actOpenConv(plate)`

---

### 7.6 Popup appel entrant (Receiver)

```
┌────────────────────────────────┐
│ 📞  Demande d'appel             │
│     [PLAQUE] souhaite vous     │
│     contacter                  │
│                                │
│  [Refuser]        [Accepter]  │
└────────────────────────────────┘
```

- Apparaît depuis le haut (slide down)
- Disparaît automatiquement après `expires_at` (30s)
- "Refuser" → `refuseCall(id)` → cooldown 5 min pour le demandeur
- "Accepter" → `acceptCall(id)` → ouvre la Conversation

---

### 7.7 Bannière "Demande envoyée" (Requester)

```
┌────────────────────────────────────┐
│ 📞  Demande envoyée à [PLAQUE]     │
│     En attente de réponse…         │
│                          [Annuler] │
└────────────────────────────────────┘
```

- Apparaît en bas (slide up)
- Disparaît après 31s (expire côté UI)
- "Annuler" → `cancelCallRequest(id)` → status = 'cancelled'
- Persistance : restaurée après refresh via `_recoverPendingRequest()`

---

## 8. Test Model

### 8.1 Tests Métier (invariants produit)

| ID | Règle testée | Résultat attendu |
|---|---|---|
| BM-01 | `upsertAlert({group:'vehicle'})` | Retourne `null` — rien dans `S.alerts` |
| BM-02 | `actQuickReply(plate, msg)` ne crée pas de report | `S.alerts.length` inchangé |
| BM-03 | DemandeAide résolue par tiers | Bloqué (`canResolveAlert = false`) |
| BM-04 | DemandeAide résolue par créateur | Accepté (`_mine = true`) |
| BM-05 | SignalementRoute résolu par tiers | Accepté |
| BM-06 | `can_receive_calls()` sans préférence | Retourne `false` |
| BM-07 | `can_receive_calls()` avec `allow_calls=true` | Retourne `true` |
| BM-08 | Double pending même paire | Erreur `23505` |
| BM-09 | 4e demande en 10 min | Erreur `spam_limit` |
| BM-10 | Demande après refus < 5 min | Erreur `cooldown_active` |
| BM-11 | Transition `accepted → refused` | Bloquée (trigger DB) |
| BM-12 | Auto-appel (requester = receiver) | Bloqué (constraint `no_self_call`) |
| BM-13 | AlerteVéhicule visible sur carte | ❌ Interdit — test d'absence de marqueur |
| BM-14 | Plaque dupliquée à l'inscription | Bloquée (unicité `owner_plate`) |

### 8.2 Tests UI (comportement des vues)

| ID | Scénario | Résultat attendu |
|---|---|---|
| UI-01 | Onglet Activité, alerte `group='vehicle'` | Boutons : Je m'arrête / Je vérifie / Merci / Contacter. Pas de "Voir sur la carte" |
| UI-02 | Onglet Activité, alerte `group='route'` | Boutons : Voir sur la carte / Toujours là / Disparu |
| UI-03 | Modal Contacter avec `allow_calls=false` | Modal "non autorisé" + bouton "Envoyer un message" |
| UI-04 | Modal Contacter avec `allow_calls=true` | Popup popup entrant côté receiver |
| UI-05 | Bannière envoyée → refresh navigateur | Bannière restaurée si demande encore pending et non expirée |
| UI-06 | Paramètres → toggle appels → désactiver | `setCallPreferences(false)` → upsert DB |
| UI-07 | Clic "Contacter" → bouton Message | Ouvre la conversation, pas de call_request créé |

### 8.3 Tests Realtime

| ID | Scénario | Résultat attendu |
|---|---|---|
| RT-01 | A signale bouchon → B (même rayon) | B voit le marqueur sans refresh |
| RT-02 | A résout bouchon → B | B perd le marqueur sans refresh |
| RT-03 | B refresh après RT-02 | Bouchon absent (`resolvedRemoteIds` protège) |
| RT-04 | A envoie demande appel → B | B voit popup en < 2s |
| RT-05 | B accepte → A | A voit la conversation ouverte |
| RT-06 | Canal CHANNEL_ERROR | Reconnect auto en 5s |
| RT-07 | App en background → retour | `_recoverPendingRequest()` restaure l'état |

### 8.4 Tests Supabase RLS

| ID | Acteur | Action | Résultat attendu |
|---|---|---|---|
| RLS-01 | Utilisateur C | `SELECT call_requests` | 0 lignes |
| RLS-02 | Utilisateur C | `UPDATE call_requests SET status='accepted'` | Erreur RLS |
| RLS-03 | Utilisateur C | `SELECT call_preferences WHERE user_id = B` | 0 lignes |
| RLS-04 | Utilisateur A | `can_receive_calls(B.uid)` | Boolean (pas la table) |
| RLS-05 | Non authentifié | `can_receive_calls(B.uid)` | Erreur (revoke sur `anon`) |
| RLS-06 | Receiver B | `UPDATE call_requests SET status='accepted' WHERE id=X` | OK si `status='pending'` |
| RLS-07 | Receiver B | `UPDATE call_requests SET status='accepted'` where `status='refused'` | Erreur RLS (`status='pending'` requis) |

### 8.5 Tests multi-utilisateurs A/B/C

| ID | Description |
|---|---|
| ABC-01 | A crée bouchon → B voit → C voit → A résout → B et C perdent le marqueur simultanément |
| ABC-02 | A envoie demande appel à B → C ne voit rien |
| ABC-03 | B accepte appel de A → C ne peut pas s'interposer |
| ABC-04 | A refuse appel de B → B ne peut pas re-demander avant 5 min |
| ABC-05 | A et B s'envoient des messages → C ne peut pas les lire |
| ABC-06 | B aide en panne → A résout (étranger) → Bloqué |
| ABC-07 | B aide en panne → B résout (créateur) → OK |

---

## 9. Audit de Conformité

| Fonction / Règle | Fichier | Conforme | Non conforme | Cause | Risque |
|---|---|:---:|:---:|---|---|
| `upsertAlert` rejette `group:'vehicle'` | index.html:418 | ✅ | | | |
| `dismissAlert` ne re-broadcast pas si `opts.silent` | index.html:880 | ✅ | | | |
| DB update étendu au créateur (`_mine`) | index.html:880 | ✅ | | | |
| `navMap` appelle `initMap` + `syncAlertMarkers` | index.html:934 | ✅ | | | |
| `can_receive_calls()` RPC au lieu de SELECT direct | calls.js:105 | ✅ | | | |
| Erreurs granulaires 23505 / spam_limit / cooldown | calls.js:131 | ✅ | | | |
| `_recoverPendingRequest` au init + visibilitychange | calls.js:32 | ✅ | | | |
| `_visibilityBound` guard (un seul listener) | calls.js:34 | ✅ | | | |
| RLS `call_pref_self` remplace `using (true)` | migration_v2.sql:30 | ✅ | | | |
| REPLICA IDENTITY FULL sur `call_requests` | migration_v2.sql:80 | ✅ | | | |
| Trigger transitions invalides | migration_v2.sql:115 | ✅ | | | |
| Trigger anti-spam backend | migration_v2.sql:141 | ✅ | | | |
| Unique index pending | migration_v2.sql:183 | ✅ | | | |
| "Voir sur la carte" absent des alertes véhicule | index.html:1153 | ✅ | | | |
| Quick replies véhicule → `ImmatMessages`, pas `reports` | index.html:1132 | ✅ | | | |
| Section Paramètres "Communication" | index.html | | ⚠️ | Absent du HTML actuel | Fonctionnelle mais non exposée dans les Settings |
| `loadCallPreferences` appelé au chargement Paramètres | index.html | | ⚠️ | Non câblé dans le panel settings | Pas de persistance UI |
| Soft-delete messages → DB | messages.js:492 | | ⚠️ | Soft-delete local uniquement (localStorage) | Réapparition après vidage cache |
| Champs plaque redondants (`from_plate`, `to_plate`…) | messages.js:457 | | ⚠️ | Dette technique — fallback schéma | Complexité, source de bugs |
| pg_cron nettoyage `call_requests` expirés | migration_v2.sql:201 | | ⚠️ | Documenté mais non activé par défaut | Accumulation lignes pending expirées |

---

## 10. Plan de Correction Priorisé

### Critique — Blocage fonctionnel

Aucun blocage critique identifié dans l'état actuel du code.

---

### Majeur — Expérience utilisateur dégradée

#### M-01 — Section "Communication" absente des Paramètres

| Attribut | Valeur |
|---|---|
| **Cause racine** | Le toggle `allow_calls` n'est pas exposé dans le panel Settings |
| **Fichier** | `index.html` — panel settings |
| **Impact utilisateur** | L'utilisateur ne peut pas activer les appels → fonctionnalité inaccessible |
| **Difficulté** | Faible (ajout HTML + câblage JS) |
| **Risque régression** | Nul |

**Correction** : Ajouter dans le panel Paramètres :

```html
<div class="settings-section">
  <div class="settings-label">Communication</div>
  <div class="settings-row">
    <span>Autoriser les demandes d'appel</span>
    <input type="checkbox" id="allowCallsToggle"
           onchange="CallManager.setCallPreferences(this.checked)">
  </div>
  <div class="settings-hint">
    Aucun appel ne démarre sans votre acceptation.<br>
    Votre numéro n'est jamais partagé.
  </div>
</div>
```

Et au chargement du panel Settings :

```js
CallManager.loadCallPreferences().then(v => {
  const el = document.getElementById('allowCallsToggle');
  if (el) el.checked = v;
});
```

---

#### M-02 — Soft-delete messages local uniquement

| Attribut | Valeur |
|---|---|
| **Cause racine** | `deleteMessage` / `deleteThread` stockent les IDs supprimés dans localStorage |
| **Fichier** | `messages.js:492` |
| **Impact utilisateur** | Messages réapparaissent après vidage cache ou changement d'appareil |
| **Difficulté** | Moyenne (nécessite colonne `deleted_by` ou table de soft-delete en DB) |
| **Risque régression** | Moyen |

---

#### M-03 — pg_cron non activé par défaut

| Attribut | Valeur |
|---|---|
| **Cause racine** | Documenté dans la migration mais non exécuté |
| **Fichier** | `migration_calls_v2.sql:201` |
| **Impact utilisateur** | Les demandes pending expirées restent en DB → pression inutile sur l'index unique |
| **Difficulté** | Faible (exécuter 2 lignes SQL) |
| **Risque régression** | Nul |

---

### Mineur — Dette technique

#### m-01 — Champs plaque redondants dans `messages`

| Attribut | Valeur |
|---|---|
| **Cause racine** | Schéma DB évolutif — plusieurs champs pour la même information |
| **Fichier** | `messages.js:457`, table `messages` |
| **Impact utilisateur** | Aucun visible — complexité interne |
| **Difficulté** | Élevée (migration schéma + rétrocompatibilité) |
| **Risque régression** | Élevé si touché |

**Décision** : Ne pas corriger maintenant. Documenter et laisser le fallback en place.

---

#### m-02 — `CATS` / `cat()` dupliqués entre `index.html` et `tests.js`

| Attribut | Valeur |
|---|---|
| **Cause racine** | `utils.js` ne contient pas les métadonnées d'alertes |
| **Fichier** | `index.html:407`, `tests.js:51` |
| **Impact utilisateur** | Aucun visible — risque de désynchronisation si les TTL changent |
| **Difficulté** | Faible (extraire dans `utils.js`) |
| **Risque régression** | Faible |

---

## Prochaine action prioritaire

**M-01** : Ajouter le toggle "Autoriser les appels" dans les Paramètres.

Sans cet ajout, la fonctionnalité complète des appels internes est techniquement opérationnelle mais **inaccessible à l'utilisateur** depuis l'interface.

---

*Spécification générée le 2026-05-29. Maintenir ce document à chaque évolution fonctionnelle.*
