# CONSTITUTION IMMATCONNECT v1
> Référence absolue du produit. Toute PR, refactor ou nouvelle fonctionnalité doit se conformer à ce document.
> Le code s'aligne sur la Constitution. Jamais l'inverse.

---

## Table des matières

- [WHY MODEL — Raison d'être](#why-model)
- [Vision Produit](#vision-produit)
- [Principes Fondateurs](#principes-fondateurs)
- [Invariants Système](#invariants-système)
- [Domain Model](#domain-model)
- [Sources de Vérité](#sources-de-vérité)
- [State Model](#state-model)
- [Capability Model](#capability-model)
- [View Model](#view-model)
- [Interaction Model](#interaction-model)
- [UX Model](#ux-model)
- [Test Model](#test-model)
- [Audit Terrain](#audit-terrain)
- [Audit des Tests Existants](#audit-des-tests-existants)
- [Tableau de Conformité](#tableau-de-conformité)
- [Plan de Correction Priorisé](#plan-de-correction-priorisé)
- [Modèle Anti-Dérive](#modèle-anti-dérive)
- [Gouvernance des Futures Évolutions](#gouvernance)
- [Critères de Validation PR](#critères-de-validation-pr)

---

## WHY MODEL

### WHY-001
ImmatConnect existe pour permettre à des conducteurs de résoudre rapidement des situations réelles liées à la conduite, grâce à des interactions contextualisées.

### WHY-002
L'objectif principal n'est pas de communiquer.
L'objectif principal est de **résoudre un problème réel**.
La communication est un moyen. Elle n'est jamais une finalité.

### WHY-003
Toute fonctionnalité doit pouvoir répondre à la question :
> "Quel problème conducteur réel est résolu ?"

Si aucune réponse claire n'existe : la fonctionnalité doit être remise en question.

### WHY-004
L'application doit réduire la friction entre :
- signalement
- compréhension
- résolution

### WHY-005
La vitesse de résolution est plus importante que la quantité d'interactions.

### WHY-006
Une fonctionnalité ne doit jamais être ajoutée uniquement parce qu'elle est techniquement possible. Elle doit être justifiée par un besoin conducteur réel.

---

## Vision Produit

ImmatConnect est une **plateforme d'assistance contextuelle entre conducteurs**.

**ImmatConnect n'est PAS :**
- un réseau social
- WhatsApp
- une application d'appels
- une messagerie générale
- une carte remplie de tout
- un outil de contact direct sans contexte

**Règle fondamentale :** toute interaction doit avoir un contexte réel.

**Exemples de contexte réel :**
- un signalement route (accident, bouchon…)
- une demande d'aide (panne, carburant…)
- un problème signalé sur un véhicule
- une conversation liée à un événement conducteur

L'appel n'est jamais une fonctionnalité principale.
L'appel est une possibilité **secondaire** après une interaction réelle.

---

## Principes Fondateurs

| ID | Principe |
|---|---|
| **P-001** | Toute interaction doit partir d'un contexte réel. |
| **P-002** | Le véhicule est une interaction ciblée, pas une alerte cartographique. |
| **P-003** | Le message est prioritaire sur l'appel. |
| **P-004** | L'appel est toujours secondaire, jamais central. |
| **P-005** | Aucune communication ne doit être déclenchée sans action explicite. |
| **P-006** | Aucune donnée ne doit avoir deux sources de vérité concurrentes. |
| **P-007** | Un badge doit toujours correspondre à un contenu réel visible. |
| **P-008** | L'utilisateur doit comprendre immédiatement ce qu'il voit. |
| **P-009** | L'interface ne doit jamais laisser croire qu'un appel direct est en cours si ce n'est qu'une demande de contact. |
| **P-010** | Les parcours Route, Aide, Véhicule, Message et Appel doivent rester séparés mais cohérents. |
| **P-011** | Un état affiché doit toujours être actionnable ou explicitement transitoire. |
| **P-012** | La suppression d'une donnée doit être propagée à tous les états dérivés (badges, UI, cache). |
| **P-013** | Le timing asynchrone ne doit jamais produire un état vide trompeur. |

---

## Invariants Système

> Un invariant violé est un bug. Pas une dette. Un bug.

| ID | Invariant | Garant |
|---|---|---|
| **INV-001** | Un signalement véhicule ne crée jamais de marqueur carte | `upsertAlert` rejette `group:'vehicle'` |
| **INV-002** | Le véhicule utilise uniquement `messages` / `ImmatMessages` / `S._actMessages` | Architecture V9 |
| **INV-003** | Route et Aide utilisent `reports` / `S.alerts` / carte / activité | Architecture V9 |
| **INV-004** | Une demande d'appel ne doit jamais apparaître comme une fonctionnalité principale | Vue Model |
| **INV-005** | Une demande d'appel ne peut exister qu'après une interaction conducteur contextualisée | Parcours Appel |
| **INV-006** | Une demande d'appel ne doit jamais créer de bannière persistante bloquant l'accueil | UX Model |
| **INV-007** | Une demande d'appel n'est jamais un appel direct | Vocabulaire + UX |
| **INV-008** | Aucun appel ne démarre sans acceptation explicite | `call_preferences.allow_calls = false` par défaut |
| **INV-009** | Aucun numéro de téléphone n'est exposé | Architecture — pas de champ `phone` transmis |
| **INV-010** | Une réponse rapide véhicule crée un message | `actQuickReply` → `ImmatMessages.sendToPlate` |
| **INV-011** | Une activité affichée correspond à une donnée réelle existante | `S._actMessages` peuplé avant rendu |
| **INV-012** | Un badge ne peut jamais indiquer un élément qui n'existe pas dans la liste correspondante | `updateActBadge` calculé depuis données visibles |
| **INV-013** | Les messages reçus apparaissent dans Activité > Reçus | `m._received === true` + `S._actMessages` peuplé |
| **INV-014** | Les messages envoyés apparaissent dans Activité > Envoyés | `m._sent === true` + `S._actMessages` peuplé |
| **INV-015** | L'appel est accessible uniquement via "Contacter" | Pas de bouton appel global |
| **INV-016** | "Contacter" apparaît uniquement dans un contexte véhicule/message/aide pertinent | `_actModCard`, `vehicleContextMenu` |
| **INV-017** | L'accueil ne doit jamais être bloqué par un état appel sortant | Bannière non-bloquante ou remplacée par toast |
| **INV-018** | Les paramètres centralisent les préférences de communication | Toggle `allow_calls` dans panel Settings |
| **INV-019** | `renderCategoryFeed` ne peut pas s'exécuter avec `S._actMessages` vide si des messages existent en DB | Attendre la résolution de `ImmatMessages.refresh()` |
| **INV-020** | La catégorie active (`_actCat`) ne doit pas masquer les messages dans l'onglet "all" | Filtre `filterByCat` doit inclure `msg` dans "all" |

---

## Domain Model

### Utilisateur

| Attribut | Valeur |
|---|---|
| **Rôle** | Acteur de toutes les interactions |
| **Propriétaire** | Lui-même |
| **Source de vérité** | `auth.users` + `profiles` |
| **Durée de vie** | Permanente |
| **Création** | Inscription email/password |
| **Lecture** | `auth.getUser()` + `profiles.select()` |
| **Modification** | `profiles.update()` |
| **Suppression** | Cascade — supprime toutes les entités liées |
| **Écrans** | Tous |
| **Interdictions** | Pas de profil social, pas d'abonnements |

### Profil

| Attribut | Valeur |
|---|---|
| **Rôle** | Identité conducteur visible — pseudo, plaque, couleur |
| **Propriétaire** | L'Utilisateur |
| **Source de vérité** | Table `profiles` |
| **Durée de vie** | Permanente |
| **Création** | À l'inscription, complété dans écran profil |
| **Lecture** | `profiles.select()` + `S.profile` (cache local) |
| **Modification** | `profiles.update()` via écran profil |
| **Suppression** | Avec l'Utilisateur |
| **Écrans** | Profil, Carte (marqueur), Drawer |
| **Interdictions** | `owner_plate` doit être unique |

### Paramètres

| Attribut | Valeur |
|---|---|
| **Rôle** | Préférences utilisateur — communication, carte, notifications |
| **Propriétaire** | L'Utilisateur |
| **Source de vérité** | `call_preferences` (Supabase) + `localStorage` pour préfs locales |
| **Durée de vie** | Permanente |
| **Création** | Upsert à la première modification |
| **Lecture** | `CallManager.loadCallPreferences()` + `localStorage` |
| **Modification** | `CallManager.setCallPreferences()` + `localStorage.setItem()` |
| **Suppression** | Cascade Utilisateur |
| **Écrans** | Paramètres uniquement |
| **Interdictions** | Jamais dérivés depuis badges ou état UI |

### SignalementRoute

| Attribut | Valeur |
|---|---|
| **Rôle** | Alerter les conducteurs proches d'un incident voie publique |
| **Propriétaire** | Conducteur créateur (`reporter_id`) |
| **Source de vérité** | `reports` (DB) + `S.alerts` (mémoire) |
| **Durée de vie** | 30 min (bouchon) → 2h (travaux). TTL par type |
| **Création** | `roadReport(type)` → `addCommunityAlert` + `saveReportRemote` |
| **Lecture** | `S.alerts` + `syncCommunityAlerts()` (fetch DB) |
| **Modification** | Résolution uniquement (`status='resolved'`) |
| **Suppression** | `dismissAlert` → broadcast `resolve_report` + UPDATE DB |
| **Écrans** | Carte (marqueur) + Activité (liste) |
| **Interdictions** | Jamais dans Messages, Conversation, Paramètres. `plate` = `'ROUTE'` toujours |

### DemandeAide

| Attribut | Valeur |
|---|---|
| **Rôle** | Informer les conducteurs proches d'un besoin d'assistance |
| **Propriétaire** | Conducteur demandeur (`reporter_id`, `_mine=true`) |
| **Source de vérité** | `reports` (`category='help'`) + `S.alerts` |
| **Durée de vie** | 45 min |
| **Création** | `assist(type)` → `addCommunityAlert` + `saveReportRemote` |
| **Lecture** | `S.alerts` |
| **Modification** | Résolution : **créateur uniquement** |
| **Suppression** | `dismissAlert` si `_mine=true` → UPDATE DB |
| **Écrans** | Carte (marqueur) + Activité (liste) |
| **Interdictions** | Résolution par tiers bloquée. `plate` = `'ASSISTANCE'` toujours |

### AlerteVéhicule

| Attribut | Valeur |
|---|---|
| **Rôle** | Prévenir un conducteur d'un problème visible sur son véhicule |
| **Propriétaire** | Conducteur émetteur |
| **Source de vérité** | `messages` (DB) + broadcast `vehicle_alert` |
| **Durée de vie** | TTL UI 60 min. Pas de persistance propre |
| **Création** | `vehicleAlert(label)` → `ImmatMessages.sendToPlate()` |
| **Lecture** | `S._actMessages` (dérivé de `messages`) |
| **Modification** | Aucune |
| **Suppression** | TTL ou action "Vu" |
| **Écrans** | Activité + Messages + Conversation |
| **Interdictions** | **JAMAIS** dans `S.alerts`, `reports`, marqueur carte, "Voir sur la carte" |

### Message

| Attribut | Valeur |
|---|---|
| **Rôle** | Communication textuelle privée entre deux conducteurs |
| **Propriétaire** | Expéditeur (`sender_id`) |
| **Source de vérité** | Table `messages` |
| **Durée de vie** | Permanente en DB, soft-delete local |
| **Création** | `ImmatMessages.sendToPlate()` |
| **Lecture** | `ImmatMessages.refresh()` → normalization → `S._actMessages` |
| **Modification** | `read_at` renseigné à l'ouverture du thread |
| **Suppression** | Soft-delete local (`localStorage`) uniquement |
| **Écrans** | Activité + Messages + Conversation |
| **Interdictions** | Jamais dans Carte, Signaler, Paramètres |

### Conversation

| Attribut | Valeur |
|---|---|
| **Rôle** | Vue agrégée des échanges avec un conducteur |
| **Propriétaire** | Partagé entre les deux interlocuteurs |
| **Source de vérité** | Dérivée de `messages` — entité calculée, jamais persistée |
| **Durée de vie** | Tant que des messages existent |
| **Création** | Automatique au premier message |
| **Lecture** | `ImmatMessages.buildThreads()` |
| **Modification** | Implicite à chaque nouveau message |
| **Suppression** | Soft-delete de tous les messages du thread |
| **Écrans** | Messages + Conversation |
| **Interdictions** | Jamais persistée directement en DB |

### RéponseRapide

| Attribut | Valeur |
|---|---|
| **Rôle** | Message contextuel prédéfini en un clic |
| **Propriétaire** | L'utilisateur qui répond |
| **Source de vérité** | Crée un `Message` — pas d'entité propre |
| **Durée de vie** | Identique au Message créé |
| **Création** | `actQuickReply(plate, text)` → `ImmatMessages.sendToPlate()` |
| **Lecture** | Via `Message` créé |
| **Modification** | Impossible |
| **Suppression** | Via suppression du `Message` |
| **Écrans** | Activité (boutons) |
| **Interdictions** | Ne doit jamais créer de `report`. Ne doit jamais modifier `S.alerts` |

### DemandeAppel

| Attribut | Valeur |
|---|---|
| **Rôle** | Demande de contact contextualisé entre deux conducteurs |
| **Propriétaire** | Demandeur (`requester_id`) |
| **Source de vérité** | Table `call_requests` |
| **Durée de vie** | 30 secondes (expiration) |
| **Création** | `CallManager.requestCall()` — si `allow_calls=true` |
| **Lecture** | `CallManager.subscribeIncomingCalls()` (Realtime) + `_recoverPendingRequest()` |
| **Modification** | Transitions état uniquement (trigger DB) |
| **Suppression** | Jamais supprimée — transition vers état terminal |
| **Écrans** | Activité (discret) + Conversation (contexte post-acceptation) + Paramètres |
| **Interdictions** | Jamais accueil principal, Carte, Signaler. Jamais bannière bloquante |

### Notification

| Attribut | Valeur |
|---|---|
| **Rôle** | Information éphémère à l'attention de l'utilisateur |
| **Propriétaire** | Système |
| **Source de vérité** | Aucune — état UI transitoire uniquement |
| **Durée de vie** | 3-4 secondes (toast), 30s (bannière bannnie), durée du popup |
| **Création** | `toast()`, `notifyAlert()`, `showFloatingCard()` |
| **Lecture** | Visuelle uniquement |
| **Modification** | Impossible |
| **Suppression** | Timeout automatique |
| **Écrans** | Tous — superposition |
| **Interdictions** | Ne doit jamais être source de vérité d'un état métier |

### Badge

| Attribut | Valeur |
|---|---|
| **Rôle** | Indicateur visuel du nombre d'éléments non vus |
| **Propriétaire** | Calculé par le système |
| **Source de vérité** | **Toujours dérivé** des données visibles. Jamais source primaire |
| **Durée de vie** | Synchronisé à chaque rendu |
| **Création** | `updateActBadge()`, `setBadge()` |
| **Lecture** | Affichage UI |
| **Modification** | `schedBadge()` → recalcul depuis `S._actMessages` + `S.alerts` |
| **Suppression** | Remis à 0 à la lecture |
| **Écrans** | Nav (tous les onglets) |
| **Interdictions** | Jamais utilisé pour piloter un état métier. N'est jamais > nombre d'éléments visibles |

### Activité

| Attribut | Valeur |
|---|---|
| **Rôle** | Vue consolidée de tout ce qui concerne l'utilisateur |
| **Propriétaire** | Système (vue calculée) |
| **Source de vérité** | **Toujours dérivée** de `S.alerts` + `S._actMessages` |
| **Durée de vie** | Recalculée à chaque événement |
| **Création** | `renderCategoryFeed()` |
| **Lecture** | Affichage UI |
| **Modification** | `renderActivityFeed()` déclenché par `schedFeed()` |
| **Suppression** | Vide si les sources sont vides |
| **Écrans** | Onglet Activité uniquement |
| **Interdictions** | Jamais utilisée comme source de vérité. Jamais affichée avant que les sources soient prêtes |

---

## Sources de Vérité

```
ROUTE
├── DB      → reports (status=active, category=route)
├── Client  → S.alerts (group='route')
└── Dérivés → carte (marqueurs), activité (liste)

AIDE
├── DB      → reports (status=active, category=help)
├── Client  → S.alerts (group='assist')
└── Dérivés → carte (marqueurs), activité (liste)

VÉHICULE
├── DB      → messages (sender_id/receiver_id)
├── Client  → ImmatMessages.State + S._actMessages
└── Dérivés → activité (Reçus/Envoyés), messages, conversation

APPELS
├── DB      → call_requests, call_preferences
├── Client  → CallManager._pendingCallId, _visibilityBound
└── Dérivés → popup entrant, bannière envoyée, paramètres

PARAMÈTRES
├── DB      → call_preferences (+ tables futures)
├── Client  → localStorage (préfs locales non critiques)
└── Dérivés → UI paramètres

BADGES
└── TOUJOURS calculés depuis les données visibles (jamais source primaire)

ACTIVITÉ
└── TOUJOURS vue dérivée de S.alerts + S._actMessages (jamais source primaire)
```

---

## State Model

### DemandeAppel

```
           ┌─────────┐
    ──────► │ pending │
           └────┬────┘
     ┌──────────┼──────────┬──────────┐
     ▼          ▼          ▼          ▼
  accepted   refused    expired   cancelled
```

| Transition | Acteur | Condition | Garant |
|---|---|---|---|
| `→ pending` | Demandeur | `allow_calls=true`, pas de pending existant | Trigger INSERT + unique index |
| `pending → accepted` | Destinataire | Dans les 30s | RLS + trigger UPDATE |
| `pending → refused` | Destinataire | Dans les 30s | RLS + trigger UPDATE |
| `pending → expired` | Système | `expires_at < now()` | pg_cron ou UI timeout |
| `pending → cancelled` | Demandeur | Avant expiration | RLS `call_req_cancel` |

**Transitions interdites** (garanties par trigger `call_request_on_update`) :
- Tout état terminal (`accepted`, `refused`, `expired`, `cancelled`) → tout autre état

### SignalementRoute

```
→ active ──── tout utilisateur ──── resolved
    └── TTL dépassé ──────────────── (retiré de S.alerts)
```

| Transition | Acteur | Garant |
|---|---|---|
| `→ active` | Tout utilisateur | `roadReport()` |
| `active → resolved` | **Tout utilisateur** | `dismissAlert` + DB UPDATE |

### DemandeAide

```
→ active ──── créateur UNIQUEMENT ──── resolved
    └── TTL dépassé ─────────────────── (retiré de S.alerts)
```

| Transition | Acteur | Garant |
|---|---|---|
| `→ active` | Créateur | `assist()` |
| `active → resolved` | **Créateur uniquement** (`_mine=true`) | `canResolveAlert()` |

### Message

```
→ sent ──── livré ──── read (read_at non null)
                └────── deleted (localStorage)
```

---

## Capability Model

### Matrice complète

| Action | Créateur | Destinataire | Tiers C |
|---|:---:|:---:|:---:|
| **Route — Créer** | ✅ | — | ✅ |
| **Route — Résoudre** | ✅ | — | ✅ |
| **Route — Voir** | ✅ | ✅ | ✅ |
| **Aide — Créer** | ✅ | — | — |
| **Aide — Résoudre** | ✅ | — | ❌ |
| **Aide — Voir** | ✅ | ✅ | ✅ |
| **Message — Envoyer** | ✅ | ✅ | — |
| **Message — Lire (envoyés)** | ✅ | — | ❌ |
| **Message — Lire (reçus)** | — | ✅ | ❌ |
| **Message — Supprimer** | ✅ (local) | ✅ (local) | ❌ |
| **DemandeAppel — Créer** | ✅ | — | ❌ |
| **DemandeAppel — Annuler** | ✅ | — | ❌ |
| **DemandeAppel — Accepter** | ❌ | ✅ | ❌ |
| **DemandeAppel — Refuser** | ❌ | ✅ | ❌ |
| **DemandeAppel — Lire** | ✅ | ✅ | ❌ |
| **PréférenceAppel — Modifier** | ✅ | — | ❌ |
| **can_receive_calls(uid)** | ✅ (boolean) | ✅ (boolean) | ✅ (boolean) |

---

## View Model

### Matrice de visibilité officielle

| Entité | Accueil | Carte | Activité | Messages | Conversation | Signaler | Paramètres |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| SignalementRoute | ❌ | ✅ marqueur | ✅ liste | ❌ | ❌ | ✅ création | ❌ |
| DemandeAide | ❌ | ✅ marqueur | ✅ liste | ❌ | ❌ | ✅ création | ❌ |
| AlerteVéhicule | ❌ | **❌ JAMAIS** | ✅ | ✅ | ✅ | ❌ | ❌ |
| Message | ❌ | ❌ | ✅ aperçu | ✅ liste | ✅ thread | ❌ | ❌ |
| Conversation | ❌ | ❌ | ✅ aperçu | ✅ liste | ✅ thread | ❌ | ❌ |
| DemandeAppel | ❌ | ❌ | ✅ discret | ✅ | ✅ | ❌ | ❌ |
| PréférenceAppel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Localisation | ❌ | ✅ marqueur | ❌ | ❌ | ❌ | ❌ | ❌ |

### Règles de visibilité Activité

**Onglet Reçus** :
- Alertes Route/Aide reçues (`!a._mine`)
- Messages reçus (`m._received === true`)
- Catégorie "vehicle" ou "all" → inclut les messages

**Onglet Envoyés** :
- Alertes Route/Aide créées par moi (`a._mine`, depuis `alertHistory`)
- Messages envoyés (`m._sent === true`)
- Catégorie "vehicle" ou "all" → inclut les messages

---

## Interaction Model

### Parcours Route

```
Conducteur A détecte un incident
→ Signaler → Route → Type
→ roadReport(type)
  ├── addCommunityAlert({group:'route', _mine:true}) → S.alerts + marqueur
  ├── saveReportRemote()                              → DB reports
  └── broadcast 'new_report'                          → conducteurs proches
      └── Conducteur B voit marqueur sur carte
          └── Activité → "Disparu"
              └── dismissAlert({silent:false})
                  ├── S.alerts retiré + marqueur retiré
                  ├── broadcast 'resolve_report' → B perd le marqueur
                  └── UPDATE reports SET status='resolved'
```

### Parcours Aide

```
Conducteur A en panne
→ Signaler → Aide → Type
→ assist(type) → addCommunityAlert({group:'assist', _mine:true}) + saveReportRemote
→ Conducteur B voit l'alerte
→ Seul A peut résoudre (_mine=true) → dismissAlert → resolved
```

### Parcours Véhicule (officiel)

```
Conducteur B reçoit une alerte véhicule
→ Activité > Reçus → alerte affichée
  ├── "Je m'arrête" → actQuickReply() → ImmatMessages.sendToPlate() → Message créé
  ├── "Je vérifie"  → actQuickReply() → ImmatMessages.sendToPlate() → Message créé
  ├── "Merci"       → actQuickReply() → ImmatMessages.sendToPlate() → Message créé
  └── "Contacter"   → CallManager.openContactOptions()
                          ├── "Message" → actOpenConv() → Conversation
                          └── "Appel"   → can_receive_calls() → DemandeAppel

NE PASSE JAMAIS PAR : reports / S.alerts / carte / markers
```

### Parcours Appel (officiel)

```
Prérequis : B a activé allow_calls=true dans Paramètres > Communication

A voit une alerte véhicule ou un message de B
→ "Contacter" → modal
→ "Appel" → can_receive_calls(B.uid)
    ├── false → modal "n'accepte pas les appels" → proposer Message
    └── true  → INSERT call_requests → toast discret "Demande envoyée"
                    └── B reçoit popup (Realtime INSERT)
                        ├── "Refuser" → status=refused → A reçoit "refusée"
                        │   └── cooldown 5 min pour A
                        └── "Accepter" → status=accepted → Conversation ouverte
                            └── Contexte : continuation de l'échange

PARCOURS INTERDIT :
Accueil → téléphone → appel
Carte → appel direct
```

### Parcours interdit — Véhicule sur carte

```
Signalement véhicule → marker carte    ❌
Signalement véhicule → S.alerts        ❌
Signalement véhicule → "Voir sur carte" ❌
```

---

## UX Model

### Accueil / Carte

**Autorisé :**
- Navigation GPS
- Marqueurs Route + Aide
- Marqueurs conducteurs proches
- Menu contextuel véhicule (Message, Signaler problème)
- Informations non bloquantes

**Interdit :**
- Bannière appel persistante couvrant la carte
- Overlay plein écran non sollicité
- Téléphone ou appel mis en avant comme action principale
- État non actionnable affiché en permanence

### Activité — Onglet Véhicule / Reçus

**Doit afficher pour chaque message reçu :**
```
[Je m'arrête]  [Je vérifie]  [Merci]  [Contacter]
```

**Ne doit jamais afficher :**
```
[📍 Voir sur la carte]
```

**Doit afficher pour chaque message envoyé :**
```
[💬 Répondre]  [Supprimer]
```

### Modal "Comment souhaitez-vous poursuivre l'échange ?"

```
Contacter [PLAQUE]
──────────────────
"Comment souhaitez-vous poursuivre l'échange ?"

[💬 Message]    [📞 Demande de contact]

               Annuler
```

**Note** : le bouton s'appelle "Demande de contact", pas "Appel" — pour éviter la confusion avec un appel téléphonique.

### Modal "Appels non autorisés"

```
🚫
Ce conducteur n'accepte pas les demandes de contact.
[PLAQUE] n'a pas activé cette fonctionnalité.

"Vous pouvez continuer par message."

[💬 Envoyer un message]
         Fermer
```

### Notification appel envoyé

**Remplacer la bannière persistante par un toast discret :**
```
toast("Demande de contact envoyée à [PLAQUE].", "ok")
```

Si l'utilisateur veut annuler : accéder via Activité.
La bannière `#callSentBanner` est à évaluer pour suppression (voir BUG D).

### Popup appel entrant

```
┌──────────────────────────────────┐
│ 💬  Demande de contact           │
│     [PLAQUE] souhaite            │
│     poursuivre l'échange.        │
│                                  │
│  [Refuser]        [Accepter]    │
└──────────────────────────────────┘
```

### Paramètres — Section Communication

```
─── Communication ─────────────────────
  [toggle] Autoriser les demandes de contact

  "Aucun contact ne démarre sans votre
   acceptation. Votre numéro n'est jamais
   partagé."
───────────────────────────────────────
```

**Comportement :**
- Défaut : `allow_calls = false`
- Toggle → `CallManager.setCallPreferences(bool)`
- Chargement → `CallManager.loadCallPreferences()` → `toggle.checked = val`

---

## Test Model

### Tests Invariants (1 invariant = 1 test minimum)

| ID | Invariant testé | Scénario |
|---|---|---|
| T-INV-001 | INV-001 | `upsertAlert({group:'vehicle'})` → retourne null, S.alerts intact |
| T-INV-002 | INV-002 | `actQuickReply(plate, msg)` → appelle `ImmatMessages.sendToPlate`, jamais `reports` |
| T-INV-003 | INV-003 | `roadReport('bouchon')` → S.alerts contient l'alerte, jamais messages |
| T-INV-010 | INV-010 | `actQuickReply(plate, 'Je m\'arrête.')` → message créé en DB |
| T-INV-011 | INV-011 | `renderCategoryFeed` appelé après `ImmatMessages.refresh()` → messages visibles |
| T-INV-012 | INV-012 | Badge = 0 si `S._actMessages` vide et `S.alerts` vide |
| T-INV-013 | INV-013 | Message reçu (`_received=true`) → visible dans tab "recus" |
| T-INV-014 | INV-014 | Message envoyé (`_sent=true`) → visible dans tab "envoyes" |
| T-INV-019 | INV-019 | `renderCategoryFeed` après refresh → ne produit pas de liste vide si messages existent |

### Tests Véhicule

| ID | Scénario | Attendu |
|---|---|---|
| TV-01 | Signalement véhicule reçu | Pas de marqueur carte |
| TV-02 | Signalement véhicule affiché en Activité | Boutons : Je m'arrête / Je vérifie / Merci / Contacter |
| TV-03 | "Voir sur la carte" absent pour véhicule | Absent du DOM pour `kind='alert', group='vehicle'` |
| TV-04 | `actQuickReply` ne passe pas par `roadReport` | Aucun appel `addCommunityAlert` |
| TV-05 | Message reçu apparaît dans Activité > Reçus | `items.filter(i=>!i._sent).length > 0` |
| TV-06 | Message envoyé apparaît dans Activité > Envoyés | `items.filter(i=>i._sent).length > 0` |

### Tests Appels

| ID | Scénario | Attendu |
|---|---|---|
| TA-01 | `allow_calls=false` → modal "non autorisé" | Pas d'INSERT `call_requests` |
| TA-02 | `allow_calls=true` → demande créée | INSERT réussi, bannière/toast |
| TA-03 | Double pending (même paire) | Erreur `23505` |
| TA-04 | 4e demande en 10 min | Erreur `spam_limit` |
| TA-05 | Refus → cooldown 5 min | Erreur `cooldown_active` |
| TA-06 | Demande entrante → popup visible | `#callIncomingPopup.show` |
| TA-07 | Accepter → popup disparaît, conversation ouvre | `actOpenConv(requester_plate)` |
| TA-08 | Refuser → popup disparaît | `classList.remove('show')` |
| TA-09 | Expiration 30s → popup disparaît | setTimeout depuis `expires_at` |
| TA-10 | Transition `accepted → refused` | Bloquée par trigger DB |
| TA-11 | Recovery après refresh → bannière restaurée si pending actif | `_recoverPendingRequest()` |
| TA-12 | Recovery → ne restaure pas si expiré | `expires_at < now()` → skip |
| TA-13 | Pas de bouton appel global (accueil/carte) | Absent du DOM hors contexte |

### Tests Paramètres

| ID | Scénario | Attendu |
|---|---|---|
| TP-01 | Toggle visible dans Paramètres | `#allowCallsToggle` présent dans le DOM |
| TP-02 | Toggle ON → `setCallPreferences(true)` → DB | `call_preferences.allow_calls = true` |
| TP-03 | Toggle OFF → `setCallPreferences(false)` → DB | `call_preferences.allow_calls = false` |
| TP-04 | Chargement Paramètres → toggle restauré | `loadCallPreferences()` → `toggle.checked = val` |
| TP-05 | Défaut si pas de ligne en DB | `allow_calls = false` |

### Tests Badges

| ID | Scénario | Attendu |
|---|---|---|
| TB-01 | `S._actMessages = []`, `S.alerts = []` | Badge = 0 |
| TB-02 | 1 message reçu non lu | Badge ≥ 1 |
| TB-03 | Message lu → `read_at` renseigné | Badge décrémenté |
| TB-04 | Badge > nombre éléments visibles | ❌ Impossible (invariant) |

### Tests Route/Aide (non-régression)

| ID | Scénario | Attendu |
|---|---|---|
| TR-01 | Création bouchon → marqueur carte | Marqueur dans `S.alertMarkersById` |
| TR-02 | Résolution A → marqueur disparu chez B | `removeLayer` sur marqueur B |
| TR-03 | Refresh après résolution | Alerte absente (`resolvedRemoteIds` protège) |
| TR-04 | Aide créée → résolution par tiers | Bloquée (`canResolveAlert=false`) |
| TR-05 | Aide créée → résolution par créateur | Acceptée (`_mine=true`) |

### Tests A/B/C

| ID | Scénario | Attendu |
|---|---|---|
| TABC-01 | A demande appel à B → C | C ne voit rien (RLS) |
| TABC-02 | C tente `SELECT call_requests` | 0 lignes |
| TABC-03 | C tente UPDATE `call_requests` | Erreur RLS |
| TABC-04 | A crée bouchon → B voit → A résout → B et C perdent le marqueur | Simultané Realtime |
| TABC-05 | A et B échangent → C lit messages | Erreur RLS |

---

## Audit Terrain

### BUG A — Activité > Reçus vide

**Constat** : badge présent ou interaction connue, mais onglet Reçus vide.

**Analyse du code** :

`renderCategoryFeed` (index.html:1080) construit les items "Reçus" depuis :
1. `activeAlerts.filter(a => !a._mine)` — alertes non-mine dans `S.alerts`
2. `msgs.filter(m => m._received)` — messages reçus dans `S._actMessages`

Le problème est une **course asynchrone** :

```
openActivite()                    (index.html:917)
  → renderActivityMain()          [synchrone — liste vide]
  → ImmatMessages.refresh()       [asynchrone]
      → S._actMessages = [...]    [résolu ~500ms plus tard]
      → renderActivityFeed()      [déclenché dans .then()]
```

Si le `.then()` échoue silencieusement (erreur dans `refresh()`, ou `ImmatMessages` non encore chargé), `S._actMessages` reste vide et le rendu ne se re-déclenche pas.

**Deuxième cause** : filtre `filterByCat`. Si `_actCat = 'route'`, la condition :
```js
if(cat==='vehicle'||cat==='all')  // ligne 1082
```
ne s'exécute pas → les messages n'apparaissent pas même s'ils existent.

**Règles violées** : INV-011, INV-013, INV-019, P-013

**Invariant manquant** : INV-019 (ajouté dans cette Constitution)

**Correctif** :
1. Garantir que `renderCategoryFeed` attend `S._actMessages` peuplé
2. Ou re-déclencher `renderCategoryFeed` depuis `ImmatMessages` après `refresh()` — même si le `.then()` initial a réussi
3. Ou appeler `await ImmatMessages.refresh()` dans `openActivite` avant le rendu

**Test manquant** : T-INV-011, T-INV-019

---

### BUG B — Activité > Envoyés vide

**Constat** : messages envoyés visibles dans le panel Messages mais absents de l'onglet Envoyés.

**Analyse du code** :

L'onglet Envoyés lit (index.html:1091-1098) :
1. `histAlerts.filter(a => a._mine)` — depuis `S.alertHistory`
2. `msgs.filter(m => m._sent)` — depuis `S._actMessages`

**Même race condition** que BUG A : si `ImmatMessages.refresh()` n'a pas encore peuplé `S._actMessages` quand `renderCategoryFeed` s'exécute, la liste est vide.

**Cause secondaire** : `S.alertHistory` est vide au démarrage si pas de signalement envoyé récemment — c'est normal. Mais si des messages envoyés existent, la liste devrait être peuplée.

**Cause tertiaire possible** : `_sent` calculé incorrectement si `myPlate()` est vide au moment du refresh (profil pas encore chargé → `_sent = false` pour tous les messages).

**Règles violées** : INV-014, INV-019, P-013

**Correctif** : idem BUG A + s'assurer que `getProfile()` est résolu avant `normalizeRows()` dans `ImmatMessages.refresh()`.

**Test manquant** : TV-06, T-INV-019

---

### BUG C — Réponses rapides invisibles

**Constat** : les boutons "Je m'arrête / Je vérifie / Merci" n'apparaissent pas.

**Analyse du code** :

Dans `_actModCard` (index.html:1132), les boutons rapides s'affichent seulement si :
```js
!item._sent   // l'item est un message REÇU
```

**Causes possibles** :
1. `item._sent = true` alors que l'utilisateur est le destinataire → erreur dans `normalizeRows()`
2. L'item n'apparaît pas du tout (BUG A/B) → les boutons ne peuvent pas s'afficher
3. Pour les alertes `kind='alert'` avec `group='vehicle'` : les boutons sont dans le bloc `_actModCard` à la ligne 1153 — ils dépendent de `a.group === 'vehicle' || a.type === 'vehicule'` ET que l'alerte soit dans `S.alerts`… mais INV-001 garantit que les alertes véhicule ne sont PAS dans `S.alerts` → ce bloc ne s'atteint jamais par ce chemin

**Conséquence** : les boutons rapides pour les alertes véhicule ne s'affichent que dans les **items de type `kind='msg'`** (messages reçus), et non depuis `S.alerts`. C'est correct architecturalement (V9), mais si les messages ne sont pas visibles (BUG A), les boutons n'apparaissent pas non plus.

**Règles violées** : INV-010 (indirect — le message est créé si l'utilisateur clique, mais l'accès au bouton est bloqué)

**Correctif** : résoudre BUG A/B → les boutons apparaîtront automatiquement.

---

### BUG D — Bannière "Demande envoyée"

**Constat** : bannière positionnée à `bottom: 82px`, visible sur l'accueil, couvre l'activité, icône 📞 ambiguë, durée 31s, pas toujours supprimable.

**Analyse** :

La bannière `#callSentBanner` (index.html:332, calls.css:174) :
- `position: fixed; bottom: 82px` — flotte au-dessus de la nav
- Affichée pendant 31s avec timeout automatique
- Bouton "Annuler" → `cancelCallRequest(id)`
- L'icône 📞 laisse croire à un vrai appel téléphonique

**Conformité Constitution** : INV-006 stipule qu'une demande d'appel **ne doit jamais créer de bannière persistante bloquant l'accueil**.

La bannière ne bloque pas techniquement (elle est au-dessus, pas modale), mais elle persiste 31s, ce qui viole P-008 ("l'utilisateur doit comprendre immédiatement ce qu'il voit") et INV-007 ("jamais un appel direct").

**Décision Constitution** : la bannière peut rester comme indicateur d'état, mais doit être :
1. Reformulée : "Demande de contact envoyée à [PLAQUE]" (pas "📞 Demande envoyée")
2. Positionnée de façon non-bloquante
3. Remplacée à terme par un toast + entrée dans Activité

**Test manquant** : TA-13 (pas de bannière à l'accueil si pas de demande en cours)

---

### BUG E — Confusion Vocabulaire "Appel"

**Constat** : l'utilisateur pense être en train d'initier un appel téléphonique.

**Analyse** : les termes utilisés actuellement :
- "📞 Appel" (bouton dans modal Contacter)
- "Demande d'appel envoyée" (bannière)
- "📞 Appel accepté ! Ouverture de la conversation…"
- "Demande d'appel refusée."
- "callContactModal", "callIncomingPopup"

**Tous ces termes** font référence à un appel téléphonique. Or ImmatConnect ne fait **aucun appel**. Il ouvre une conversation.

**Règles violées** : INV-007, INV-009, P-008, P-009

**Correctif — Vocabulaire officiel** :

| Terme actuel | Terme officiel |
|---|---|
| "📞 Appel" | "📲 Demande de contact" |
| "Demande d'appel envoyée" | "Demande de contact envoyée" |
| "Appel accepté" | "Contact accepté — conversation ouverte" |
| "Appel refusé" | "Demande de contact refusée" |
| "Appels internes" | "Contact direct" |
| "Autoriser les appels" | "Autoriser les demandes de contact" |

---

### BUG F — Paramètres Communication manquants

**Constat** : aucun toggle pour `allow_calls` dans l'interface Paramètres.

**Impact** : la fonctionnalité appels est entièrement opérationnelle en DB mais **inaccessible à l'utilisateur depuis l'interface**. `allow_calls = false` par défaut → personne ne peut recevoir de demandes.

**Règles violées** : INV-018

**Correctif** : ajouter dans le panel Settings :

```html
<div class="settings-section">
  <div class="settings-section-title">Communication</div>
  <div class="settings-row">
    <div>
      <div class="settings-row-label">Autoriser les demandes de contact</div>
      <div class="settings-row-sub">
        Aucune demande n'aboutit sans votre accord.<br>
        Votre numéro n'est jamais partagé.
      </div>
    </div>
    <input type="checkbox" id="allowCallsToggle"
           onchange="CallManager.setCallPreferences(this.checked)">
  </div>
</div>
```

Et charger l'état au chargement des Paramètres :
```js
CallManager.loadCallPreferences().then(v => {
  const el = document.getElementById('allowCallsToggle');
  if (el) el.checked = !!v;
});
```

---

## Audit des Tests Existants

### Pourquoi les tests n'ont pas attrapé les bugs terrain ?

| Bug | Tests existants | Pourquoi pas attrapé | Test à ajouter |
|---|---|---|---|
| **BUG A — Reçus vide** | CA-01 à CA-17, tests normalization | Tests testent la **logique de normalisation**, pas le **timing async** entre `refresh()` et `renderCategoryFeed()`. Pas de test sur l'état de `S._actMessages` avant rendu. | T-INV-019 : `renderCategoryFeed` après refresh produit des items |
| **BUG B — Envoyés vide** | Tests `_sent / _received` présents | Tests vérifient le calcul de `_sent`, mais pas que `_sent=true` → item visible dans tab Envoyés après délai async. | TV-06 : message `_sent=true` → dans Envoyés |
| **BUG C — Boutons rapides** | CA-09, CA-10 présents | Tests vérifient que `actQuickReply` ne crée pas de report. Ne vérifient pas que le **bouton est présent dans le DOM** pour un message reçu. | TV-02, TV-03 : boutons DOM présents |
| **BUG D — Bannière** | TA-11, TA-12 présents | Tests vérifient la recovery de `_pendingCallId`, pas le positionnement visuel ni le vocabulaire. | Test "bannière non bloquante" — difficile à automatiser sans browser |
| **BUG E — Vocabulaire** | Aucun test vocabulaire | Les tests vérifient la logique, jamais les chaînes de texte affichées. | Test sur les strings affichées (futur) |
| **BUG F — Paramètres** | Aucun test paramètres | Tests appelés TP-01 à TP-05 définis dans la Constitution mais pas encore implémentés. | TP-01 à TP-05 |

**Diagnostic général** :
Les tests existants sont des tests **logiques** (comportement des fonctions isolées). Ils ne testent pas :
1. L'ordre d'exécution async (timing `refresh()` → `render()`)
2. La présence d'éléments dans le DOM
3. Les chaînes de texte affichées à l'utilisateur
4. Le comportement sur mobile (visibilitychange, background/foreground)
5. L'état de l'interface après rechargement de page

---

## Tableau de Conformité

| Domaine | Conforme | Écart | Invariant violé | Correctif | Tests |
|---|:---:|---|---|---|---|
| **Route** | ✅ | — | — | — | TR-01 à TR-05 ✅ |
| **Aide** | ✅ | Résolution tiers bloquée | — | — | TR-04, TR-05 ✅ |
| **Véhicule** | ✅ | Boutons rapides dépendent d'un bug amont | INV-010 (indirect) | Fix BUG A | TV-01 à TV-06 ⚠️ partiels |
| **Messages** | ⚠️ | Reçus/Envoyés vides (timing async) | INV-011, INV-013, INV-014, INV-019 | Fix async + race condition | T-INV-011, TV-05, TV-06 ❌ manquants |
| **Activité** | ⚠️ | Vue vide avant que les sources soient prêtes | INV-011, INV-019 | Fix timing | T-INV-019 ❌ manquant |
| **Appels — Logique** | ✅ | — | — | — | CA-01 à CA-17 ✅ |
| **Appels — Vocabulaire** | ❌ | "Appel" vs "Contact" trompeur | INV-007, P-008, P-009 | Renommer les termes | Test strings (futur) |
| **Appels — Bannière** | ⚠️ | Bannière persistante visible à l'accueil | INV-006 | Reformuler ou remplacer par toast | TA-13 ❌ manquant |
| **Paramètres** | ❌ | Toggle `allow_calls` absent | INV-018 | Ajouter section Communication | TP-01 à TP-05 ❌ manquants |
| **Realtime** | ✅ | Reconnect auto en place | — | — | RT-01 à RT-07 ⚠️ partiels |
| **RLS** | ✅ | — | — | — | RLS-01 à RLS-07 (manuels) |
| **Tests** | ⚠️ | Tests logiques uniquement, pas async/DOM | — | Ajouter tests timing + DOM | Voir section précédente |
| **UX** | ❌ | Vocabulaire appel trompeur | P-008, P-009, INV-007 | Renommer | — |

---

## Plan de Correction Priorisé

### CRITIQUE — Blocage usage réel

#### C-01 — Paramètres Communication absents (BUG F)

| | |
|---|---|
| **Symptôme** | Aucun utilisateur ne peut activer les appels |
| **Cause racine** | Toggle `allow_calls` non exposé dans l'UI Settings |
| **Fichier** | `index.html` — panel paramètres |
| **Invariant** | INV-018 |
| **Impact** | Fonctionnalité appels inaccessible à 100% des utilisateurs |
| **Risque régression** | Nul |
| **Correctif** | Ajouter section Communication avec toggle + `loadCallPreferences()` au chargement |
| **Tests** | TP-01 à TP-05 |

---

### MAJEUR — Expérience dégradée

#### M-01 — Reçus et Envoyés vides (BUG A + BUG B)

| | |
|---|---|
| **Symptôme** | L'onglet Activité affiche "Aucune activité" même si des messages existent |
| **Cause racine** | Race condition : `renderCategoryFeed` s'exécute avant que `ImmatMessages.refresh()` ait peuplé `S._actMessages` |
| **Fichier** | `index.html` — `openActivite()` (ligne ~917) |
| **Invariants** | INV-011, INV-013, INV-014, INV-019 |
| **Impact** | Utilisateur pense que ses messages ont disparu |
| **Risque régression** | Moyen |
| **Correctif** | `openActivite` doit `await ImmatMessages.refresh()` avant `renderCategoryFeed`, OU `ImmatMessages.refresh()` doit toujours appeler `App.renderActivityFeed()` en fin d'exécution, même sans `.then()` externe |
| **Tests** | T-INV-011, T-INV-019, TV-05, TV-06 |

#### M-02 — Vocabulaire "Appel" trompeur (BUG E)

| | |
|---|---|
| **Symptôme** | L'utilisateur pense initier un appel téléphonique |
| **Cause racine** | Tous les termes utilisent "appel" au lieu de "contact" |
| **Fichiers** | `calls.js`, `index.html` (modaux + toasts), `calls.css` (classes non bloquantes) |
| **Invariants** | INV-007, P-008, P-009 |
| **Impact** | Confusion utilisateur, méfiance vis-à-vis de la vie privée |
| **Risque régression** | Faible (renommage de strings) |
| **Correctif** | Renommer tous les textes visibles selon le tableau du BUG E |
| **Tests** | Tests de strings (à créer) |

---

### MINEUR — Amélioration UX

#### m-01 — Bannière "Demande envoyée" (BUG D)

| | |
|---|---|
| **Symptôme** | Bannière avec 📞 persiste 31s, icône ambiguë |
| **Cause racine** | Design initial conservé sans validation UX |
| **Fichiers** | `calls.js`, `calls.css`, `index.html` |
| **Invariants** | INV-006, INV-007 |
| **Impact** | Inconfort UX, pas bloquant |
| **Risque régression** | Faible |
| **Correctif** | Remplacer par toast discret "Demande de contact envoyée à [PLAQUE]" + entrée dans Activité |
| **Tests** | TA-13 |

#### m-02 — Soft-delete messages côté client uniquement

| | |
|---|---|
| **Symptôme** | Messages réapparaissent après vidage cache |
| **Cause racine** | `deleteMessage` stocke les IDs supprimés dans `localStorage` uniquement |
| **Fichiers** | `messages.js:492` |
| **Impact** | Perte de cohérence inter-appareils |
| **Risque régression** | Moyen (nécessite migration DB) |
| **Correctif** | Colonne `deleted_at` ou table de tombstones en DB |
| **Tests** | Nouveau |

#### m-03 — pg_cron non activé

| | |
|---|---|
| **Symptôme** | Demandes `pending` expirées restent en DB |
| **Cause racine** | Documenté dans la migration mais non exécuté |
| **Fichiers** | `migration_calls_v2.sql:201` |
| **Impact** | Pression inutile sur l'unique index |
| **Risque régression** | Nul |
| **Correctif** | Exécuter les 2 lignes SQL pg_cron dans Supabase |
| **Tests** | Manuel |

---

## Tests à Ajouter

Priorité 1 (bloquants) :
- T-INV-019, TV-05, TV-06 (BUG A/B — timing async)
- TP-01 à TP-05 (BUG F — toggle Paramètres)

Priorité 2 (importants) :
- TV-02, TV-03 (boutons rapides présents dans DOM)
- TA-13 (pas de bannière globale bloquante)

Priorité 3 (futur) :
- Tests de strings affichées (vocabulaire)
- Tests browser (Playwright) pour comportements DOM réels

---

## Ce qui doit être testé manuellement sur deux téléphones

Les éléments suivants ne peuvent pas être automatisés sans browser réel :

| Scénario | Pourquoi manuel |
|---|---|
| Activité > Reçus / Envoyés bien peuplés | Timing async réel + réseau Supabase |
| Boutons rapides visibles en Activité | Rendu DOM mobile réel |
| Realtime appel entrant < 2s | WebSocket Supabase réel |
| App background → retour → recovery bannière | `visibilitychange` réel mobile |
| Reconnect après coupure réseau | CHANNEL_ERROR réel |
| RLS : compte C ne voit rien | 3 comptes Supabase réels |
| Toggle Paramètres → persistance refresh | Supabase upsert + reload |
| Vocabulaire compréhensible (qualitatif) | Jugement utilisateur |
| Bannière non-bloquante sur accueil | Positionnement visuel mobile |
| Popup appel entrant lisible et claire | Rendu mobile réel |

---

## Modèle Anti-Dérive

ImmatConnect ne doit jamais devenir ce qu'il n'est pas. Cette section documente explicitement les dérives interdites pour préserver son identité au fil des évolutions.

### D-001 — Réseau social

**Conséquences interdites :**
- profils sociaux
- abonnements
- likes
- fils d'actualité sociaux
- interactions sans contexte réel

### D-002 — WhatsApp

**Conséquences interdites :**
- discussions libres sans contexte
- conversations initiées sans événement conducteur
- messagerie généraliste

### D-003 — Application d'appels

**Conséquences interdites :**
- appel comme point d'entrée
- téléphone mis en avant
- bouton appel global
- appel sans contexte

### D-004 — Mélange Route/Aide/Véhicule

**Conséquences interdites :**
- véhicule dans `reports`
- véhicule dans `S.alerts`
- véhicule sur la carte
- route dans conversations privées

### D-005 — Sources de vérité multiples

**Conséquences interdites :**
- même donnée stockée et pilotée à plusieurs endroits
- logique critique uniquement DOM
- badges utilisés comme source métier

### D-006 — États invisibles

**Conséquences interdites :**
- interface affichant un état incompréhensible
- bannière sans action
- badge sans contenu réel

### D-007 — Fonctionnalité sans invariant

Toute nouvelle fonctionnalité doit définir **avant toute implémentation** :
- ses invariants
- ses états
- ses tests

---

## Gouvernance des Futures Évolutions

Avant toute PR, refactor ou nouvelle fonctionnalité, effectuer une revue de conformité sur ces 10 points :

| Check | Question | Réponse | Bloquant |
|---|---|:---:|:---:|
| **G-001** | La modification respecte-t-elle la Vision Produit ? | OUI / NON | ✅ si NON |
| **G-002** | La modification viole-t-elle un invariant ? | OUI / NON | ✅ si OUI |
| **G-003** | La modification crée-t-elle une nouvelle source de vérité ? | OUI / NON | ⚠️ justification obligatoire |
| **G-004** | La modification crée-t-elle une ambiguïté UX ? | OUI / NON | ⚠️ si OUI |
| **G-005** | La modification respecte-t-elle les parcours officiels ? | OUI / NON | ✅ si NON |
| **G-006** | La modification respecte-t-elle les règles de visibilité ? | OUI / NON | ✅ si NON |
| **G-007** | La séparation Route / Aide / Véhicule / Messages / Appels est-elle préservée ? | OUI / NON | ✅ si NON |
| **G-008** | Chaque nouvel état a-t-il un propriétaire, une source de vérité, une transition, un test ? | OUI / NON | ✅ si NON |
| **G-009** | Chaque nouvelle fonctionnalité a-t-elle un objectif métier, un invariant, un parcours, un test ? | OUI / NON | ✅ si NON |
| **G-010** | Le comportement reste-t-il compréhensible pour un utilisateur qui découvre l'application ? | OUI / NON | ✅ si NON |

---

## Critères de Validation PR

Une PR ne peut être considérée comme acceptable que si **tous** ces critères sont satisfaits :

1. Aucun invariant n'est violé.
2. Aucun parcours officiel n'est cassé.
3. Aucun test existant ne régresse.
4. Les nouveaux tests sont présents.
5. Les règles de visibilité sont respectées.
6. Les badges restent cohérents.
7. Les sources de vérité restent uniques.
8. Les comportements observés sur mobile sont expliqués.
9. Les comportements Realtime sont vérifiés.
10. La fonctionnalité reste alignée avec la raison d'être du produit.

**Si l'un de ces critères échoue : la PR doit être considérée comme non conforme.**

---

## Risques Restants

| Risque | Probabilité | Impact | Mitigation |
|---|:---:|:---:|---|
| Race condition async Activité vide | Haute | Haute | C-01 à corriger en priorité |
| Vocabulaire "appel" crée méfiance | Haute | Moyenne | M-02 à corriger rapidement |
| pg_cron non activé → index unique saturé | Faible | Faible | Exécuter 2 lignes SQL |
| Soft-delete local → réapparition messages | Moyenne | Faible | Documenter, corriger plus tard |
| Realtime KO en 3G/4G faible | Moyenne | Haute | Reconnect en place — monitoring prod nécessaire |
| Double inscription même plaque | Faible | Haute | Unicité `owner_plate` en place |

---

*Constitution ImmatConnect v1 — 2026-05-29*
*Maintenir ce document à chaque évolution fonctionnelle. Toute PR qui contredit un invariant doit être refusée.*
