# AUDIT IMMATCONNECT — GLOBAL V2
## Vision Produit · UX · Code · DB · Sécurité · Roadmap

**Auditeur :** IA indépendante — perspectives architecte / Product Owner / UX / dev senior / expert mobile / expert sécurité / utilisateur final / auditeur fonctionnel
**Date :** 2026-06-13
**Version auditée :** calls.js v17 · call-screen.js v8 · agora-call-engine.js v5 · SW v21
**Basé sur :** code source complet + `docs/IMMATCONNECT_INTERACTION_ARCHITECTURE_MASTER_PLAN.md`
**Ce document complète V1** — il ne remplace pas le MASTER_PLAN.

---

## 1. ARCHITECTURE GLOBALE

### L'architecture proposée

```
COMMUNIQUER         SIGNALER            ACTIVITY    DASHBOARD   OBD
├── Messages        ├── Route           (unifié)    (technique) (conduite)
└── Appels          └── Stationnement
```

### Verdict : partiellement correcte, mal implémentée

La séparation conceptuelle COMMUNIQUER / SIGNALER est juste.
L'implémentation actuelle viole ses propres principes.

**Ce qui fonctionne dans la logique :**
- COMMUNIQUER et SIGNALER sont des domaines distincts — c'est correct.
- OBD comme couche d'observabilité séparée — c'est correct.
- Activity comme fil transversal — c'est correct en principe.

**Ce qui ne fonctionne pas :**

1. **Appels dans Messages** — La navigation actuelle place les Appels dans Messages.
   Or un appel vocal n'est pas un message. C'est un canal de communication distinct
   avec son propre cycle de vie, ses propres états, ses propres histoires.
   **Verdict : séparer immédiatement.**

2. **Signaler = un seul panneau** — Route, Stationnement et SOS sont traités dans
   le même formulaire par étapes. Le stationnement est un domaine entier
   (voir section 3) qui mérite son propre sous-module.
   **Verdict : créer un SignalCenter avec sous-domaines.**

3. **Activity = alertes seulement** — `panelActivite` affiche des alertes
   communautaires catégorisées, pas un vrai fil d'activité transverse.
   **Verdict : Activity doit être le fil unifié de toutes les interactions.**

4. **Inbox/Outbox absents** — Le MASTER_PLAN les mentionne. Sont-ils utiles ?
   **Verdict : non en tant qu'écrans séparés. L'Activity avec filtres directionnels les remplace avantageusement.**

### Recommandation d'architecture claire

```
NAVIGATION PRINCIPALE (5 onglets)
├── 🏠 Accueil (carte radar)
├── 💬 Communiquer
│   ├── Messages (fils par plaque)
│   └── Appels (historique + appel actif)
├── 🚨 Signaler
│   ├── Véhicule stationné (rapide — plaque puis type)
│   ├── Route (incident, accident, embouteillage)
│   └── SOS / Aide (urgence, panne)
├── 📋 Activity (fil unifié filtrable)
│   ├── Filtre: Tout | Messages | Appels | Signalements
│   └── Filtre directionnel: Reçus | Envoyés | Tous
└── ⚙️ Profil / Paramètres
    ├── Mon véhicule
    ├── Notifications
    ├── Confidentialité
    └── Dashboard technique (Gardien)
```

**Écrans inutiles à supprimer ou fusionner :**
- Inbox / Outbox séparés → remplacés par Activity + filtres
- OBD Drive panel → intégrer dans Paramètres / Dashboard

**Écrans manquants à créer :**
- Historique d'appels (onglet dans Communiquer/Appels)
- SignalCenter (sous-module Signaler dédié stationnement)
- ResolutionCenter (modal ou écran de suivi résolution)
- Préférences notification (dans Paramètres)

**Où risque-t-on de créer de la confusion :**
- Si Appels et Messages restent ensemble → l'utilisateur ne trouve pas ses appels manqués
- Si Activity et Alertes communautaires sont le même écran → confusion entre "ce qui me concerne" et "ce qui se passe autour de moi"
- Si Signaler route et Signaler stationnement ont le même formulaire → le stationnement nécessite une plaque cible, la route non

---

## 2. RÈGLE GÉNÉRIQUE : TYPE / DOMAIN / DIRECTION / STATUS

### Le problème actuel

Aucun objet ne suit une règle claire d'affichage. Les appels peuvent apparaître
dans Messages. Les signalements reçus et envoyés sont dans le même panneau.
Les alertes communautaires (pour tous) coexistent avec les alertes ciblées (pour moi).

### Règle proposée : 4 dimensions

Chaque objet possède 4 attributs qui déterminent où il s'affiche :

```
type      : MESSAGE | CALL | SIGNAL_VEHICLE | SIGNAL_ROUTE | SIGNAL_SOS
domain    : COMMUNIQUER | SIGNALER | SYSTEM
direction : INBOUND | OUTBOUND | BROADCAST
status    : PENDING | ACTIVE | SEEN | RESPONDED | RESOLVED | EXPIRED | ARCHIVED
```

### Matrice d'affichage

| type | direction | status | Où s'affiche |
|---|---|---|---|
| MESSAGE | INBOUND | PENDING/SEEN | Activity → reçus · fil Messages |
| MESSAGE | OUTBOUND | * | Activity → envoyés · fil Messages |
| CALL | INBOUND | PENDING | Overlay entrant (prioritaire) |
| CALL | INBOUND | MISSED | Activity → appels · badge rouge |
| CALL | INBOUND | ANSWERED | Activity → appels |
| CALL | OUTBOUND | PENDING | Overlay sortant |
| CALL | OUTBOUND | * | Activity → appels |
| SIGNAL_VEHICLE | INBOUND | PENDING | Notification push · FloatingCard |
| SIGNAL_VEHICLE | INBOUND | RESPONDED/RESOLVED | Activity → signalements reçus |
| SIGNAL_VEHICLE | OUTBOUND | * | Activity → signalements envoyés |
| SIGNAL_ROUTE | BROADCAST | ACTIVE | Carte radar · Activity communautaire |
| SIGNAL_ROUTE | OUTBOUND | * | Activity → mes signalements |
| SIGNAL_SOS | BROADCAST | ACTIVE | Carte radar · notification urgente |
| SIGNAL_SOS | OUTBOUND | * | Activity → mes signalements |

### Règle de non-apparition

- Un objet INBOUND n'apparaît JAMAIS dans "mes envois"
- Un objet OUTBOUND n'apparaît JAMAIS dans "mes reçus"
- Un SIGNAL_ROUTE (BROADCAST) n'apparaît JAMAIS dans un fil de conversation privé
- Un CALL ne s'affiche JAMAIS dans la liste des Messages
- Un objet ARCHIVED n'apparaît que si le filtre "Archivés" est actif

### Impact sur le code

```javascript
// Chaque entrée InteractionEngine doit inclure :
{
  type: 'CALL_MISSED',      // type actuel ✅
  domain: 'COMMUNIQUER',   // à ajouter
  direction: 'INBOUND',    // à ajouter
  status: 'pending',       // existant ✅
}

// La fonction d'affichage devient :
function shouldShowIn(interaction, screen, directionFilter) {
  return interaction.domain === screen.domain
      && interaction.direction === directionFilter
      && !['archived'].includes(interaction.status);
}
```

---

## 3. VÉHICULE STATIONNÉ — AUDIT COMPLET

### 18 cas identifiés et leur criticité

| Cas | Urgence | Appel requis ? | Message auto ? |
|---|---|---|---|
| Feux allumés | Faible | Non | Oui — discret |
| Fenêtre ouverte | Faible | Non | Oui |
| Coffre ouvert | Faible-Moyen | Non | Oui |
| Porte ouverte | Moyen | Non | Oui |
| Objet visible (risque vol) | Moyen | Non | Oui — discret |
| Pneu crevé | Moyen | Optionnel | Oui |
| Stationnement gênant | Moyen | Optionnel | Oui |
| Risque fourrière | Moyen-Haut | Optionnel | Oui — urgent |
| Véhicule bloquant sortie | Haut | Optionnel | Oui — urgent |
| Véhicule touché sur parking | Haut | Recommandé | Oui — urgent |
| Fuite (huile, carburant) | Haut | Recommandé | Oui — urgent |
| Tentative d'effraction | Haut | Oui — urgent | Oui — urgent |
| Vitre cassée | Haut | Recommandé | Oui — urgent |
| Alarme déclenchée | Haut | Oui | Oui — urgent |
| Travaux imminents | Haut | Oui | Oui — urgent |
| Fumée | CRITIQUE | APPEL D'ABORD | 15/18 EN PREMIER |
| Animal dans véhicule | CRITIQUE | APPEL D'ABORD | 17/15 EN PREMIER |
| Enfant dans véhicule | CRITIQUE | APPEL D'ABORD | 15/17 EN PREMIER |

### Parcours optimal (UX)

**Objectif : ≤ 3 clics pour envoyer un signalement standard, 1 clic pour urgence vitale.**

**Flux recommandé :**

```
Bouton "Signaler un véhicule" (depuis carte ou nav)
    ↓
[ÉCRAN 1] Plaque du véhicule
    → Champ plaque (clavier physique adaptatif)
    → Suggestions : véhicules récents proches
    → "Je ne connais pas la plaque" → mode anonyme
    ↓
[ÉCRAN 2] Que se passe-t-il ? (icônes grandes, 2 colonnes)
    ┌──────────────┬──────────────┐
    │ 🔦 Feux      │ 🪟 Fenêtre   │
    │ 🛞 Pneu      │ 🚗 Gêne      │
    │ ⚠️ Effraction │ 💧 Fuite     │
    │ 🔥 Fumée     │ 👶 URGENCE   │ ← rouge, grand
    └──────────────┴──────────────┘
    ↓
[ÉCRAN 3 — si non-urgence] Personnaliser
    → Message automatique pré-rempli (modifiable)
    → Photo facultative (Phase 2)
    → [Envoyer en 1 tap]

[ÉCRAN URGENCE] Si fumée/animal/enfant
    → ⚠️ URGENCE VITALE ⚠️
    → [📞 Appeler le 15 — SAMU]
    → [📞 Appeler le 17 — Police]
    → [📞 Appeler le 18 — Pompiers]
    → [Signaler aussi sur ImmatConnect] (secondaire)
```

### Messages automatiques par type (pré-rédigés, modifiables)

```
Feux allumés     : "Bonjour, vos feux de position sont restés allumés.
                    Votre batterie risque de se décharger."
Pneu crevé       : "Bonjour, votre pneu [avant gauche] semble crevé ou à plat."
Stationnement    : "Bonjour, votre véhicule gêne [la sortie / le passage].
                    Pourriez-vous le déplacer ?"
Risque fourrière : "⚠️ Votre véhicule risque la fourrière — zone réglementée."
Touché parking   : "Votre véhicule a été touché sur le parking.
                    Venez constater. Prenez des photos si possible."
Effraction       : "🚨 Quelqu'un tente d'ouvrir votre véhicule. Appelez le 17."
```

### Règles de limite

- Message personnel : max 200 caractères (lisible en notification)
- Appel vocal : uniquement pour urgences Moyen+ (bloquer Appeler si urgence = Faible)
- Photo : 1 seule photo par signalement en Phase 2 (évite abus)
- "Merci / Résolu / Besoin de précision" : disponibles comme réponses rapides pour le propriétaire

### Réponses rapides pour le propriétaire (côté récepteur)

```
[✅ J'arrive]         → met le statut à "en_route"
[✅ C'est réglé]      → résoud le signalement
[❓ Précisez...]      → ouvre un fil de message
[Bloquer cet envoi]  → signale un abus potentiel
```

---

## 4. PHOTO — STRATÉGIE EN 3 PHASES

### Phase 1 — Pas de photo (actuel, acceptable à court terme)

- Signalements textuels uniquement
- Avantage : simplicité technique, pas de problème RGPD photo
- Inconvénient : crédibilité réduite, difficile de prouver un sinistre

**Durée recommandée : jusqu'à la fin du Sprint 2**

### Phase 2 — Photo facultative, une seule, signalement stationnement uniquement

**Règles techniques :**
- Compression côté client avant upload : canvas → JPEG qualité 0.75, max 1024px grand côté
- Upload Supabase Storage → bucket `signal-photos` (RLS : `owner = auth.uid()`)
- URL signée à durée limitée (7 jours par défaut)
- Expiration automatique : `pg_cron` supprime les fichiers + entrées DB après 30 jours
- Quota : 1 photo par signalement, max 2 MB avant compression

**RGPD — obligations :**
- Alerte obligatoire avant upload : "Cette photo peut contenir des données personnelles.
  Elle sera visible par le destinataire et supprimée dans 30 jours."
- Floutage recommandé (pas obligatoire Phase 2) des visages et plaques tiers apparents
- Option "Supprimer ma photo" accessible dans l'historique du signalement
- Pas de photo dans les notifications push (risque exposition données)

**Ce qu'une photo peut légitimement montrer :**
- L'état du véhicule (pneu, porte ouverte, dommage visible)
- La situation de stationnement (marquage au sol, panneau)

**Ce qu'une photo ne doit jamais montrer :**
- Visages de personnes (floutage obligatoire Phase 3)
- Intérieur du véhicule avec personnes identifiables
- Plaque d'autres véhicules non liés

### Phase 3 — Photo multi-signalement + floutage automatique + IA modération

- Jusqu'à 3 photos par signalement
- Edge Function de floutage automatique (visages + plaques tiers via API Vision ou canvas)
- Modération IA : détection de photos abusives (nudité, violence)
- Photo visible dans l'historique de l'émetteur et du récepteur
- Photo supprimée automatiquement à la résolution + 7 jours
- Photo jamais incluse dans les exports RGPD sans consentement explicite

### Matrice d'accès aux photos

| Qui | Peut voir | Peut supprimer |
|---|---|---|
| Émetteur du signalement | Oui | Oui (7 jours) |
| Récepteur (propriétaire) | Oui (URL signée) | Non |
| Admin modération | Oui | Oui (abus) |
| Utilisateur tiers | Non | Non |
| Service après résolution | Non | N/A — suppression auto |

---

## 5. APPLICATION FERMÉE / NOTIFICATIONS

### Scénario par scénario

**Cas 1 : App en foreground**
→ Realtime WebSocket actif → sonnerie + overlay → tout fonctionne ✅

**Cas 2 : App en background (screen allumé, iOS)**
→ iOS suspend les WebSockets après ~10s en background pur
→ Aucun appel entrant, aucune alerte reçue
→ Solution : push notification APNs qui réveille l'app

**Cas 3 : Écran verrouillé (iOS)**
→ App suspendue → même situation que Cas 2
→ Seule solution : push notification système affichée sur l'écran verrouillé

**Cas 4 : Notifications désactivées par l'utilisateur**
→ Aucune notification possible (légalement obligé de respecter le choix)
→ Fallback : badge sur l'icône de l'app (si autorisé séparément)
→ Fallback : bannière in-app à la prochaine ouverture

**Cas 5 : Hors ligne au moment de l'alerte**
→ L'alerte est en DB Supabase → persistée
→ Au retour en ligne : `_recoverIncomingPendingCalls()` + `syncCommunityAlerts()`
→ L'alerte est récupérée si elle n'a pas expiré (expires_at > now)

**Cas 6 : Retour 24h plus tard**
→ call_request expiré (expires_at = created_at + 30s) → status = 'expired'
→ L'appel est perdu — aucune trace dans l'UI actuelle
→ Recommandation : créer une entrée CALL_MISSED dans InteractionEngine même sur expired
→ L'utilisateur voit "Appel manqué de BZ-652-LL · il y a 24h" dans Activity

### Architecture de notification recommandée

**Niveau 1 — In-app (actuel)**
- Overlay entrant avec sonnerie
- Toast pour messages
- FloatingCard pour alertes véhicule

**Niveau 2 — Push Web (à implémenter)**
```
service-worker.js :
self.addEventListener('push', event => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url, requestId: data.requestId },
      actions: [
        { action: 'accept', title: 'Accepter' },
        { action: 'refuse', title: 'Refuser' }
      ],
      requireInteraction: data.urgent // reste affichée jusqu'à interaction
    })
  );
});

self.addEventListener('notificationclick', event => {
  if (event.action === 'accept') {
    // ouvrir app sur l'overlay entrant
  }
  if (event.action === 'refuse') {
    // refuser sans ouvrir l'app (fetch Edge Function)
  }
});
```

**Niveau 3 — APNs iOS (push natif)**
- Prérequis : compte Apple Developer ($99/an)
- Prérequis : entitlement `aps-environment` dans le manifest PWA
- iOS 16.4+ : PWA installée sur l'écran d'accueil → push natif possible
- Supabase supporte les pushes APNs via la bibliothèque `@supabase/push`

**Niveau 4 — FCM Android**
- Supabase + Firebase Cloud Messaging
- Android : push possible même app fermée sans contrainte Apple

**Fallback DB (robustesse)**
```
À chaque ouverture de l'app :
1. _recoverPendingRequest()     → appel sortant en attente ?
2. _recoverIncomingPendingCalls() → appel entrant pending ?
3. syncCommunityAlerts()        → alertes communautaires manquées ?
4. Activity badge recalculé     → appels manqués / messages non lus
```

### Stratégie anti-perte d'alerte

```
Alerte véhicule → 3 canaux redondants :
  1. Push notification système (si push activé)
  2. Broadcast Supabase Realtime (si app ouverte)
  3. DB Supabase → récupérée au retour (fallback universel)

+ Badge à reconnexion : nombre d'alertes manquées depuis la dernière session
```

---

## 6. CYCLE DE VIE COMPLET

### Message

```
États DB (table messages) :
  draft → sent → delivered → read → replied → archived → deleted

Transitions :
  draft     → sent      : action utilisateur (tap Envoyer)
  sent      → delivered : confirmation Supabase INSERT OK
  delivered → read      : récepteur ouvre le fil (UPDATE read_at = now())
  read      → replied   : récepteur envoie un message en retour
  * → archived          : action utilisateur (swipe / menu)
  * → deleted           : action utilisateur (suppression) — soft delete uniquement

Colonnes DB recommandées :
  id, sender_id, receiver_plate, content, created_at, delivered_at,
  read_at, replied_at, archived_at, deleted_by_sender, deleted_by_receiver

Événements InteractionEngine :
  MESSAGE_SENT, MESSAGE_DELIVERED, MESSAGE_READ, MESSAGE_REPLIED, MESSAGE_ARCHIVED

Badges :
  count(status IN ('sent','delivered') AND receiver = me AND read_at IS NULL)

Logs Dashboard : dernier message envoyé, dernier lu, nb non lus
```

### Appel vocal

```
États DB (table call_requests) :
  pending → ringing → accepted → connected → ended → historized
  pending → refused
  pending → cancelled
  pending → expired
  pending → missed

Colonnes DB actuelles :
  id, requester_id, receiver_id, requester_plate, receiver_plate,
  status, created_at, expires_at, responded_at

Colonnes à ajouter :
  connected_at, ended_at, duration_seconds, end_reason (hangup|missed|refused|error),
  agora_channel, accepted_device_id

Transitions :
  pending    → ringing   : récepteur reçoit via Realtime (event local, pas DB)
  pending    → accepted  : UPDATE par receiver
  accepted   → connected : joinCall() Agora OK (event local, pas DB)
  connected  → ended     : leaveCall() ou user-left Agora (UPDATE par l'un ou l'autre)
  pending    → refused   : UPDATE par receiver
  pending    → cancelled : UPDATE par requester
  pending    → expired   : pg_cron ou client au retour

Événements InteractionEngine :
  CALL_REQUEST, CALL_ACCEPTED, CALL_REFUSED, CALL_CANCELLED, CALL_MISSED,
  CALL_CONNECTED(*), CALL_ENDED(*), CALL_FAILED(*)
  (* Phase B — reservés)

Badges :
  count(status = 'missed' AND receiver = me AND vu = false)

Logs Dashboard : lastCallId, durée, end_reason, Agora lastError
```

### Signalement Stationnement

```
États DB (table reports) :
  created → sent → delivered → read → actioned → resolved → archived → expired

Transitions :
  created   → sent     : saveReportRemote() OK
  sent      → delivered: broadcast vehicle_alert reçu par récepteur
  delivered → read     : récepteur ouvre la FloatingCard (UPDATE seen_at)
  read      → actioned : récepteur tap [J'arrive] (UPDATE status = 'in_progress')
  actioned  → resolved : récepteur tap [Résolu] (UPDATE status = 'resolved')
  * → archived         : action utilisateur
  * → expired          : pg_cron après TTL (48h pour stationnement)

Colonnes DB à ajouter :
  delivered_at, seen_at, actioned_at, resolved_at, resolution_note,
  resolver_id, photo_url, urgency_level

Événements InteractionEngine :
  VEHICLE_ALERT_SENT, VEHICLE_ALERT_RECEIVED, VEHICLE_ALERT_SEEN,
  VEHICLE_ALERT_ACTIONED, VEHICLE_ALERT_RESOLVED

Qui peut modifier chaque état :
  created → sent     : émetteur
  sent → delivered   : système (broadcast acknowledgment)
  delivered → read   : récepteur
  read → actioned    : récepteur seul
  actioned → resolved: récepteur seul (ou admin)
  * → expired        : système (pg_cron)
  * → archived       : les deux parties
```

### Signalement Route

```
États DB (table reports) :
  created → published → seen → confirmed → expired → archived

Transitions :
  created   → published: INSERT + broadcast new_report
  published → seen     : syncCommunityAlerts() chez un récepteur
  seen      → confirmed: un autre utilisateur clique "Confirmer" (vote)
  * → expired          : pg_cron après TTL (1-4h selon type)
  * → archived         : action utilisateur (mon signalement uniquement)

Colonnes DB à ajouter :
  confirmation_count, confirming_user_ids[], photo_url

Qui peut modifier :
  Émetteur : peut archiver son propre signalement
  Autres : peuvent confirmer
  Système : expire automatiquement
```

---

## 7. FUSION DES SIGNALEMENTS

### Le problème

3 conducteurs signalent les mêmes feux allumés sur la même plaque.
Sans fusion : 3 notifications pour le propriétaire, 3 marqueurs sur la carte,
confusion et fatigue d'alerte.

### Stratégie recommandée en 3 couches

**Couche 1 — Déduplication côté client (actuel, partiel)**
`alertKey()` utilise `[type, plate, lat, lng, at]` pour dédupliquer localement.
Problème : cross-device, les autres utilisateurs ne bénéficient pas de la déduplication locale.

**Couche 2 — Fusion serveur par fenêtre temporelle**
```sql
-- Avant INSERT dans reports :
-- Chercher un signalement existant pour la même plaque + même type
-- dans les 30 dernières minutes

SELECT id, confirmation_count FROM reports
WHERE plate = $plate
  AND type = $type
  AND status NOT IN ('resolved', 'expired', 'archived')
  AND created_at > now() - interval '30 minutes';

-- Si trouvé : incrémenter confirmation_count, ne pas créer de doublon
UPDATE reports SET confirmation_count = confirmation_count + 1,
                   last_confirmed_at = now()
WHERE id = $existing_id;

-- Si non trouvé : INSERT nouveau signalement
```

**Couche 3 — Affichage enrichi**
```
Sur la carte : un seul marqueur avec badge "3 personnes ont signalé"
Dans la notification : "⚠️ 3 personnes signalent vos feux allumés (AB-123-CD)"
Dans le fil du propriétaire : "BZ-652-LL et 2 autres ont signalé vos feux allumés"
```

**Fenêtre de fusion recommandée par type :**
| Type | Fenêtre fusion | Raison |
|---|---|---|
| Feux allumés | 60 min | Stable dans le temps |
| Stationnement gênant | 30 min | Peut se résoudre vite |
| Accident route | 15 min | Situation dynamique |
| Animal / Enfant | 0 min — PAS de fusion | Chaque signalement = urgence indépendante |

**Que faire si photos différentes :**
- Garder la photo de la première occurrence
- En Phase 3 : afficher "3 photos disponibles" avec galerie

**Que faire si une alerte est abusive :**
- Signalement d'abus → flag `is_disputed = true`
- Si 3+ signalements d'abus → suspension automatique (modération async)
- Retrait de la fusion — le signalement contesté sort du cluster

---

## 8. RESOLUTIONCENTER

### Proposition de ResolutionCenter

**Objectif :** Permettre à l'émetteur et au récepteur de clore proprement
un signalement et d'en conserver une trace lisible.

**États de résolution :**
```
PENDING_RESPONSE    → Le récepteur n'a pas encore réagi
IN_PROGRESS         → Le récepteur a réagi (J'arrive / Vu)
RESOLVED_BY_OWNER   → Le propriétaire confirme la résolution
RESOLVED_AUTO       → Expiration TTL sans réponse
RESOLVED_BY_SIGNAL  → L'émetteur confirme que le problème est résolu
UNRESOLVABLE        → Signalement incorrect / doublon / abus
```

**UX du ResolutionCenter (modal overlay) :**
```
┌─ SIGNALEMENT · Feux allumés · BZ-652-LL ──────────────────┐
│ Envoyé le 13/06/2026 à 14:32 par BE-521-MM                │
│ Statut : EN COURS — Le propriétaire a vu il y a 5 min     │
│                                                            │
│ ──────────────── RÉPONSES ────────────────                 │
│ 14:37 BZ-652-LL : "Merci, j'arrive dans 10 min"           │
│                                                            │
│ ──────────────── ACTIONS ─────────────────                 │
│ [✅ Marquer résolu]  [❌ Rouvrir]  [💬 Message]           │
│ [🚩 Signaler abus]                                        │
└────────────────────────────────────────────────────────────┘
```

**L'émetteur reçoit :**
- Notification push / in-app quand le propriétaire répond
- "✅ BZ-652-LL a résolu le signalement · Feux allumés" dans Activity
- Option "Confirmer la résolution depuis ma position" (si GPS)

**Peut-on rouvrir un signalement résolu ?**
- Oui — si le problème persiste, l'émetteur peut rouvrir dans les 24h
- Après 24h : nouveau signalement obligatoire (évite les abus de réouverture)

**Expiration automatique :**
- Stationnement : 48h sans réponse → RESOLVED_AUTO + notification à l'émetteur
- Route : selon TTL (1-4h)
- Réouverture impossible après expiration auto

**Notification à l'émetteur à la résolution :**
```
"✅ Résolu — BZ-652-LL a indiqué avoir traité le problème : Feux allumés"
                                    [OK]    [Voir les détails]
```

---

## 9. TRUST ENGINE / RÉPUTATION

### Le problème à résoudre

Sans système de confiance, un utilisateur malveillant peut :
- Envoyer 50 faux signalements par jour
- Harceler un conducteur spécifique
- Créer un compte fictif avec une plaque inventée

### MVP simple (Phase 1 — implémentable rapidement)

**Score de fiabilité implicite :**
```
score = signalements_confirmés / total_signalements_envoyés

Seuils :
  > 0.8 : Fiable (badge vert discret)
  0.5-0.8 : Neutre (pas de badge)
  < 0.5 et > 10 signalements : En observation (modération async)
  Signalé par 3+ utilisateurs : Suspendu temporairement
```

**Stockage DB recommandé :**
```sql
CREATE TABLE user_reputation (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  signals_sent INT DEFAULT 0,
  signals_confirmed INT DEFAULT 0,
  signals_disputed INT DEFAULT 0,
  abuse_reports INT DEFAULT 0,
  trust_score FLOAT GENERATED ALWAYS AS (
    CASE WHEN signals_sent = 0 THEN 0.5
    ELSE signals_confirmed::float / signals_sent
    END
  ) STORED,
  suspended_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Ce que l'utilisateur voit :**
- Pas de score numérique visible (évite le gamification négatif)
- Badge discret "Conducteur fiable" si score > 0.8 ET > 20 signalements
- En cas de suspension : "Votre compte est temporairement restreint"

### Version long terme (Phase 3)

**Niveaux utilisateur :**
```
🆕 Nouveau          : < 5 interactions, pas de badge
✅ Vérifié          : email + téléphone confirmés
⭐ Actif            : > 20 interactions, score > 0.7
🌟 Fiable           : > 100 interactions, score > 0.85, 0 suspension
🏆 Ambassadeur      : 500+ interactions, score > 0.9, modérateur communautaire
```

**Valorisation des bons comportements :**
- +1 point : signalement confirmé par le propriétaire
- +1 point : message de remerciement reçu
- +2 points : signalement critique qui a évité un danger (confirmé)
- -3 points : signalement signalé comme abusif
- -5 points : suspension pour spam

**Affichage du score :**
- Jamais le score brut
- Badge uniquement (Fiable / Ambassadeur)
- Dans les signalements : "BZ-652-LL (Conducteur fiable) signale : Feux allumés"

---

## 10. ANTI-ABUS — AUDIT COMPLET

### Surfaces d'abus et mitigations

**Spam d'appels**
- Actuel : RLS `spam_limit` côté serveur (référencé dans le code)
- Manquant : feedback UX quand bloqué ("Vous avez atteint la limite d'appels")
- Recommandé : max 3 appels vers la même plaque / 10 min, max 10 appels totaux / heure
- DB : `INSERT ONLY IF count(requester_id, 10min) < 3`

**Spam messages**
- Actuel : aucun rate limit visible côté messages
- Recommandé : max 5 messages vers la même plaque / 1 min (anti-flood)
- Recommandé : détection de copier-coller (hash du contenu, même message 5x → blocage)

**Faux signalements route**
- Actuel : aucune validation
- Recommandé : max 5 signalements route / heure par utilisateur
- Recommandé : géolocalisation requise pour les signalements route (validation position)

**Abus SOS**
- Actuel : aucun cooldown
- Recommandé : cooldown 15 min entre deux SOS (sauf annulation du premier)
- Recommandé : confirmation "Êtes-vous sûr ? Le SOS alerte tous les conducteurs proches"

**Harcèlement (ciblage répété)**
- Actuel : BLOCK_ALL / BLOCK_CALLS (localStorage — non persisté DB)
- Manquant : détection automatique (>10 interactions vers même plaque sans réponse)
- Recommandé : alerte modération si pattern détecté
- Recommandé : option "Ignorer toutes les alertes de cette plaque" (soft block)

**Usurpation (plaque d'un autre)**
- Actuel : `owner_plate` immuable (INV-006) → résolu pour les comptes enregistrés
- Risque résiduel : plaque fictive à l'inscription (pas de validation SIV)
- Recommandé : vérification format + délai de grâce 24h avant de pouvoir envoyer des alertes véhicule

**Photo abusive**
- Actuel : photos non implémentées → risque futur
- Recommandé Phase 2 : signalement photo (bouton "Signaler cette photo")
- Recommandé Phase 3 : modération IA automatique avant affichage

**Contournement du blocage**
- Actuel : localStorage seul — un utilisateur peut vider le cache et réapparaître
- Recommandé : blocages persistés en DB + vérifiés côté serveur avant chaque interaction
- Recommandé : blocage par `user_id` (pas par plaque) — résistant au changement de plaque

**Sanctions progressives recommandées :**
```
1er abus signalé   : avertissement in-app
3 abus en 7 jours  : restriction 24h (spam uniquement, messages OK)
5 abus en 30 jours : suspension 7 jours
10 abus totaux     : révision manuelle (modérateur communautaire ou admin)
Abus critique      : suspension immédiate + notification admin
```

**Logs anti-abus nécessaires en DB :**
```sql
CREATE TABLE abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users,
  reported_user_id UUID REFERENCES auth.users,
  reported_plate TEXT,
  event_type TEXT, -- 'spam_call', 'false_signal', 'harassment', 'abuse_sos'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID,
  action_taken TEXT
);
```

---

## 11. MULTI-VÉHICULES / FLOTTES

### Cas d'usage

| Profil | Situation | Besoin |
|---|---|---|
| Particulier | 2 voitures (voiture + moto) | Basculer entre ses véhicules |
| Famille | Voiture partagée (conjoint) | Les deux reçoivent les alertes |
| Auto-entrepreneur | Fourgon société | Séparation pro/perso |
| Garage | 20 véhicules en stock | Gestion de flotte |
| Location | Véhicule loué | Délégation temporaire |

### Modèle DB recommandé

```sql
-- Table des véhicules (1 utilisateur → N véhicules)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users,
  plate TEXT NOT NULL UNIQUE,    -- normalisé AB-123-CD
  label TEXT,                    -- "Ma Golf", "Le van pro"
  color TEXT,
  type TEXT DEFAULT 'car',       -- car, moto, truck, trailer
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Délégations (véhicule partagé / prêté)
CREATE TABLE vehicle_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles,
  delegate_user_id UUID REFERENCES auth.users,
  delegate_plate TEXT,            -- si non-utilisateur ImmatConnect
  role TEXT DEFAULT 'driver',     -- driver, co-owner, fleet_admin
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,        -- NULL = permanent
  granted_by UUID REFERENCES auth.users,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Qui reçoit les alertes :**
```
Alerte sur plaque AB-123-CD :
  → owner (role = co-owner) : toujours notifié
  → delegates actifs (valid_from <= now() <= valid_until) : notifiés
  → si delegate a préférence "ne pas notifier propriétaire" : owner silencié

Flotte :
  → fleet_admin : toujours notifié
  → driver actif : notifié en priorité
  → fleet_admin peut voir historique de tous les véhicules
```

**UX multi-véhicules :**
```
Profil → Mes véhicules
  [AB-123-CD — Ma Golf — Principal] ✓
  [BZ-652-LL — Le van — Pro]
  [+ Ajouter un véhicule]

Basculer de véhicule : tap sur la plaque souhaitée dans Paramètres
  → Toast "Vous utilisez maintenant BZ-652-LL"
  → Les appels et alertes arrivent désormais sur cette plaque
```

---

## 12. VÉHICULE PRÊTÉ / LOUÉ — DELEGATIONMANAGER

### Le problème

Si A prête sa voiture à B pour le week-end :
- Les appels arrivent chez A (il n'est pas dans la voiture)
- B ne peut pas recevoir les signalements (pas de compte ImmatConnect sur la plaque)
- Si un incident arrive, A est notifié mais ne peut rien faire

### DelegationManager — Proposition

**Flux UX délégation :**
```
A → Paramètres → Mon véhicule → [Prêter mon véhicule]
  ↓
Saisir le numéro de téléphone ou l'email de B (si B a un compte ImmatConnect)
OU
Saisir "Sans compte" (délégation anonyme — alertes arrivent sur A uniquement)
  ↓
Durée : [Ce week-end] [1 semaine] [1 mois] [Date personnalisée]
  ↓
Confirmation : "Les appels et alertes destinés à AB-123-CD seront transmis à B jusqu'au 15/06"
  ↓
B reçoit : "A vous a délégué son véhicule AB-123-CD jusqu'au 15/06"
  [Accepter la délégation] [Refuser]
```

**Pendant la délégation :**
- Appels entrants → reçus par B (comme si B était le propriétaire)
- Appels entrants → également notifiés à A en copie (mode "aussi notifié")
- Signalements → reçus par B EN PREMIER, A en secondaire
- Historique → visible par A et B (chacun ses interactions)

**Révocation :**
- A peut révoquer à tout moment (bouton "Reprendre le véhicule")
- La délégation expire automatiquement à `valid_until`
- B est notifié de la révocation

**Responsabilité :**
- La délégation ne transfère pas la propriété du compte
- Les interactions pendant la délégation sont tracées avec `delegated_by = A.id`
- En cas d'abus par B, A peut signaler et révoquer

---

## 13. CHANGEMENT DE PLAQUE

### INV-006 vs réalité

`owner_plate` immuable est une règle de sécurité correcte dans l'absolu
(évite l'usurpation). Mais dans la vraie vie, les plaques changent.

### Cas légitimes

| Situation | Fréquence | Solution recommandée |
|---|---|---|
| Véhicule vendu | Fréquent | Clôture de compte + nouveau compte |
| Plaque changée (erreur saisie) | Fréquent | Flow correction admin |
| Immatriculation européenne → française | Rare | Flow migration |
| Société (changement flotte) | Moyen | Multi-véhicules |
| Import véhicule | Rare | Flow plaque provisoire |

### Flow de changement de plaque

```
Utilisateur → Paramètres → [Demander un changement de plaque]
  ↓
Formulaire :
  Ancienne plaque : [AB-123-CD] (pré-rempli)
  Nouvelle plaque : [____] (saisie)
  Justificatif   : [Certificat de cession] [Carte grise] [Autre]
  Motif          : liste déroulante (vente, erreur, autre)
  ↓
Envoi à la modération (pas de changement automatique)
  ↓
Admin valide dans les 24-48h
  ↓
Si validé :
  - Nouvelle entrée dans `vehicles` (nouvelle plaque)
  - Ancienne plaque marquée `is_active = false` + `archived_at`
  - Historique migré vers nouvelle plaque (optionnel — demander à l'utilisateur)
  - Notification : "Votre plaque a été mise à jour"
```

**Protection contre l'usurpation :**
- La nouvelle plaque doit être LIBRE (non enregistrée par un autre compte actif)
- Si la plaque est prise → "Cette plaque est associée à un autre compte"
- Délai de grâce 30 jours : l'ancienne plaque est désactivée mais pas libérable
  (évite la réutilisation immédiate par un tiers malveillant)

---

## 14. PLAQUES INTERNATIONALES

### Phase France (actuel)

Format accepté : `AB-123-CD` (système d'immatriculation 2009+)
Format non géré : anciennes plaques françaises `1234 AB 75`, motos, remorques.

### Formats à supporter progressivement

```
France standard    : AB-123-CD      (regex: /^[A-Z]{2}-\d{3}-[A-Z]{2}$/)
France ancienne    : 1234-AB-75     (regex: /^\d{1,4}-[A-Z]{1,3}-\d{2,3}$/)
Plaque moto        : même format AB-123-CD (depuis 2009)
Plaque remorque    : même format AB-123-CD
Plaque temporaire  : WW-123-AA      (adminis. transitoire)
Belgique           : 1-ABC-234      (1 chiffre, 3 lettres, 3 chiffres)
Suisse             : ZH-12345       (canton + 5 chiffres)
Allemagne          : B-AB-1234      (ville + lettres + chiffres)
Luxembourg         : AB1234
Italie             : AB123CD
Espagne            : 1234-ABC
```

### Architecture extensible

```javascript
const PLATE_FORMATS = {
  FR: {
    regex: /^[A-Z]{2}-\d{3}-[A-Z]{2}$/,
    normalize: p => p.toUpperCase().replace(/[\s.]/g, '-'),
    validate: p => /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(p),
    country: 'France'
  },
  BE: {
    regex: /^\d-[A-Z]{3}-\d{3}$/,
    normalize: p => p.toUpperCase(),
    validate: p => /^\d-[A-Z]{3}-\d{3}$/.test(p),
    country: 'Belgique'
  },
  // ...
};

function detectAndNormalizePlate(input) {
  for (const [code, format] of Object.entries(PLATE_FORMATS)) {
    const normalized = format.normalize(input);
    if (format.validate(normalized)) return { plate: normalized, country: code };
  }
  return { plate: input.toUpperCase(), country: 'UNKNOWN' };
}
```

**Phase 1 :** France uniquement (actuel — correct)
**Phase 2 :** Belgique, Suisse, Luxembourg (frontaliers fréquents)
**Phase 3 :** UE complète (27 pays) + motos + remorques

**Stockage :** Ajouter `plate_country` dans `profiles` et `vehicles` pour filtrer les recherches.

---

## 15. ACCESSIBILITÉ

### VoiceOver iOS / TalkBack Android

**Problèmes identifiés :**

```html
<!-- Actuel — non accessible -->
<div id="callOverlay" style="display:flex">
  <div id="callOvPlate">BE-521-MM</div>
  <div id="callOvStatus">📞 Appel en cours</div>
  <div id="callOvActions">...</div>
</div>

<!-- Recommandé -->
<div id="callOverlay" role="dialog" aria-modal="true"
     aria-label="Appel en cours avec BE-521-MM"
     aria-live="assertive">
  <div id="callOvPlate" aria-label="Plaque : BE-521-MM">BE-521-MM</div>
  <div id="callOvStatus" role="status">📞 Appel en cours</div>
  <div id="callOvActions" role="group" aria-label="Actions d'appel">...</div>
</div>
```

**Corrections requises par ordre de priorité :**

1. **Overlays d'appel** : `role="dialog"`, `aria-modal="true"`, `aria-label` descriptif
2. **Toasts** : `role="alert"` ou `aria-live="polite"` (selon urgence)
3. **Boutons icônes** : `aria-label` sur tous les boutons sans texte visible
4. **Champ plaque** : `autocomplete="off"`, `aria-describedby` pointant vers l'aide format
5. **Navigation** : `aria-current="page"` sur l'onglet actif
6. **Formulaire signalement** : `fieldset` + `legend` pour grouper les types

### Contraste (WCAG 2.1 AA — ratio 4.5:1 minimum)

```
Éléments à vérifier en priorité :
  - Texte blanc sur fond bleu/violet (overlays appel)
  - Texte gris sur fond noir (statuts)
  - Badges badges rouges (petite taille → ratio 3:1 minimum pour grand UI, 4.5:1 texte)
  - Boutons désactivés (gris pâle potentiellement en dessous du ratio)
```

### Taille des zones de tap (iOS HIG : 44×44pt minimum)

```
Boutons critiques à vérifier :
  - Accepter / Refuser : ≥ 44pt chacun
  - Annuler / Raccrocher : ≥ 44pt
  - Boutons de la nav bar : ≥ 44pt
  - Bouton 🔬 (debug) : 40px actuel → à agrandir à 44px
```

### Mode sombre

L'app utilise `autoNight()` (détection automatique). Vérifier que :
- Les overlays d'appel sont lisibles en mode sombre
- Les icônes de carte sont visibles en mode sombre
- Les toasts (fond blanc/noir) s'adaptent correctement

### Situation de stress (urgence, personnes âgées)

En situation d'urgence, l'utilisateur est stressé. Règles à respecter :
- Police ≥ 16px pour les textes critiques (statut d'appel, plaque)
- Bouton Raccrocher : contraste rouge vif, toujours en bas (zone pouce)
- Bouton Urgence : ≥ 60pt, rouge, libellé clair "Urgence — Appeler les secours"
- Pas de confirmation intermédiaire pour les actions d'urgence (1 tap suffit)

### Vibrations

```javascript
// Accepter un appel
navigator.vibrate([100]);

// Refuser / Raccrocher
navigator.vibrate([200, 50, 200]);

// Alerte véhicule urgente
navigator.vibrate([300, 100, 300, 100, 300]);

// SOS
navigator.vibrate([500, 200, 500, 200, 500]);
```

---

## 16. SÉCURITÉ / CONFIDENTIALITÉ / RGPD

### Données personnelles collectées

| Donnée | Localisation | Sensibilité | Durée de conservation recommandée |
|---|---|---|---|
| Email | Supabase auth | Haute | Durée du compte + 30 jours |
| Téléphone | profiles.phone | Haute | Durée du compte |
| Plaque véhicule | profiles.owner_plate | Haute | Durée du compte + archivage |
| Position GPS | user_locations | Très haute | 30 min glissantes (effacement auto) |
| Messages | table messages | Haute | 1 an + suppression à la demande |
| Signalements | table reports | Moyenne | 30 jours après résolution |
| Photos (futur) | Supabase Storage | Très haute | 30 jours max |
| Historique appels | table call_requests | Haute | 90 jours |
| Interactions (InteractionEngine) | localStorage | Haute | Session navigateur |
| Scores confiance | ic_trust_scores localStorage | Moyenne | Session navigateur |

### Droits RGPD

**Droit d'accès (Art. 15) :**
Pas de bouton "Exporter mes données". À créer : Edge Function `export-user-data`
qui retourne un ZIP de toutes les données en DB + localStorage.

**Droit à l'effacement (Art. 17) :**
`logout()` efface le cache local mais pas les données en DB.
À implémenter : Edge Function `delete-account` qui :
1. Anonymise les messages (remplace contenu par "[supprimé]")
2. Supprime le profil et les call_requests
3. Supprime les reports associés
4. Révoque les tokens Agora
5. Désactive les push subscriptions
6. Efface le localStorage

**Droit de rectification (Art. 16) :**
Le pseudo peut être modifié. La plaque ne peut pas (INV-006) — voir section 13.

**Droit à la portabilité (Art. 20) :**
Export JSON des interactions, messages, signalements.

### Ce que l'utilisateur ne doit jamais voir appartenant à un tiers

- Position GPS exacte d'un autre conducteur (visible uniquement en rayon)
- Contenu des messages d'un autre utilisateur
- Photo d'un tiers sans consentement (future photo feature)
- Numéro de téléphone d'un autre conducteur (jamais affiché, utilisé uniquement pour notifications internes)

### Données dans localStorage — risque

```
Clés actuellement en localStorage :
  ic_interactions       (200 entrées max)
  ic_notifications      (100 entrées max)
  ic_alerts             (alertes géo — position approximative)
  ic_trust_scores       (scores de confiance par plaque)
  ic_blocked            (plaques bloquées)
  ic_block_levels       (niveaux de blocage)
  ic_pending_profile    (email, plaque, téléphone en clair pendant inscription)
  ic_last_state         (lat/lng dernière position)
  ic_gps_history        (historique GPS)
```

**Risques :**
- `ic_pending_profile` contient email + téléphone en clair — à effacer après création de compte
- `ic_last_state` avec lat/lng — position persistante entre sessions
- Tout le localStorage est accessible à n'importe quel JS de la page (XSS risk)

**Recommandation :**
- Effacer `ic_pending_profile` immédiatement après création de compte réussie
- Anonymiser `ic_last_state` (arrondir à 0.01° — ~1 km de précision)
- Migrer `ic_blocked` et `ic_block_levels` vers DB (sécurité et cross-device)

---

## 17. GÉOLOCALISATION

### Usage actuel

La position GPS de l'utilisateur est utilisée pour :
1. Afficher sa position sur la carte (marker)
2. Calculer le rayon de détection des véhicules proches
3. Associer une position aux signalements route
4. Filtrer les alertes communautaires par distance

### Recommandation : position approximative par défaut

**Principe :** L'utilisateur ne devrait jamais exposer sa position précise.
La précision requise pour ImmatConnect est de l'ordre du quartier / parking.

```javascript
function approximatePosition(lat, lng, precisionMeters = 200) {
  // Arrondit à ~200m de précision par défaut
  const factor = 111000 / precisionMeters; // 111km par degré lat
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor
  };
}
```

**Règles par cas d'usage :**

| Cas | Précision requise | Précision exposée | À qui |
|---|---|---|---|
| Radar véhicules proches | ~500m | Approximative 200m | Personne — calcul serveur |
| Signalement route | ~100m | Précise (nécessaire) | Communauté (rad. 5km) |
| Signalement stationnement | ~50m | Approximative 50m | Propriétaire du véhicule uniquement |
| Alerte véhicule via plaque | Aucune | Aucune | N/A |
| Fourrière (grand parking) | ~10m | Précise (optionnel) | Propriétaire uniquement |

**Durée d'exposition de la position :**
- Position dans `user_locations` : effacée ou mise à jour toutes les 5 min
- Position dans signalement route : conservée avec le signalement (30 jours)
- Position dans signalement stationnement : conservée avec le signalement (30 jours)
- Jamais stockée dans l'historique utilisateur sans consentement explicite

**Grand parking / zone sans GPS :**
- Position dégradée ou absente en sous-sol
- Fallback : saisie manuelle "Niveau P1 / Place 42" dans le signalement
- Future feature : QR code de place de parking → géolocalisation implicite

---

## 18. UX — AUDIT ÉCRAN PAR ÉCRAN

### Accueil (Welcome)

**Rôle :** Première impression. Convaincre de créer un compte.
**Contenu actuel :** Logo + baseline + 2 boutons (Connexion / Inscription)
**Ce qui manque :**
- 3 phrases d'accroche illustrant la valeur (ex: "Votre voisin de parking vous cherche ? Trouvez-le en 10 secondes")
- Capture d'écran ou animation de l'overlay d'appel
- Mention "Sans publicité · Sans abonnement · Gratuit"
**Ce qui ne doit jamais apparaître :** données d'autres utilisateurs, carte en preview (vie privée)
**Actions :** Connexion, Inscription
**Lien :** → Auth

### Auth

**Rôle :** Créer ou accéder à son compte.
**Contenu :** Formulaire email/mot de passe, onglets Login/Signup, validation plaque
**Ce qui manque :**
- Récupération mot de passe ("Mot de passe oublié")
- Confirmation "Email envoyé — vérifiez votre boîte"
- Connexion sociale (Google, Apple) — optionnel Phase 3
**Actions :** Se connecter, Créer un compte, Basculer mode
**Validations :** Email format, mot de passe 8+ car / 1 maj / 1 spécial, plaque format FR

### Carte radar (panelMap / appScreen)

**Rôle :** Vue principale de l'app. Voir les véhicules proches et les alertes.
**Contenu :** Carte Leaflet, marqueurs véhicules, marqueurs alertes, badge rayon
**Ce qui ne doit jamais apparaître :** position GPS précise d'un autre utilisateur, identifiant unique
**Actions :** Sélectionner un véhicule, Voir une alerte, Ajuster le rayon, Mode nuit
**Badges :** Compteur alertes actives (dans le rayon)
**Filtres :** Rayon (2/5/10/20 km)
**Manques :**
- Bouton "Signaler ici" contextuel (tap sur la carte)
- Regroupement marqueurs (cluster) pour zones denses
- Filtre par type d'alerte sur la carte

### Communiquer / Messages

**Rôle :** Conversations texte avec les conducteurs par plaque.
**Contenu :** Liste de conversations (plaque, dernier message, heure), fil de messages
**Ce qui ne doit jamais apparaître :** appels dans cette liste (les appels ont leur propre section)
**Actions :** Ouvrir conversation, Envoyer message, Supprimer conversation, Bloquer
**Badges :** Nb messages non lus (rouge)
**Filtres :** Tous / Non lus
**Manques :**
- Accusé de lecture (vu à X)
- Recherche dans les conversations
- Réponses rapides (suggestions contextuelles)

### Communiquer / Appels ← À CRÉER

**Rôle :** Historique et gestion des appels vocaux.
**Contenu :**
```
[Passer un appel]    ← bouton proéminent avec champ plaque
─────────────────────
📵 Manqué  BZ-652-LL  14:32  [Rappeler]
📞 Reçu    BE-521-MM  13:58  2m 14s
📤 Émis    BZ-652-LL  12:01  45s
📵 Manqué  BZ-652-LL  11:30  [Rappeler]  (non vu — badge rouge)
```
**Ce qui ne doit jamais apparaître :** messages texte dans cette liste
**Actions :** Rappeler, Voir le profil, Bloquer
**Badges :** Nb appels manqués non vus (rouge vif)
**Filtres :** Tous | Manqués | Émis | Reçus

### Signaler / Véhicule stationné

**Rôle :** Alerter le propriétaire d'un problème sur son véhicule.
**Contenu :**
- Étape 1 : champ plaque (grand, clavier adaptatif)
- Étape 2 : type de problème (icônes + libellés, 2 colonnes, bouton URGENCE en rouge)
- Étape 3 : message pré-rempli (modifiable), photo optionnelle (Phase 2)
**Ce qui ne doit jamais apparaître :** réponses des autres utilisateurs, localisation GPS de l'émetteur
**Actions :** Choisir type, Modifier message, Envoyer, Annuler
**Lien :** → ResolutionCenter après envoi

### Signaler / Route

**Rôle :** Alerter la communauté d'un incident sur la route.
**Contenu :**
- Type (accident, embouteillage, objet, travaux, verglas, faune...)
- Description courte (optionnel)
- Position GPS (automatique — demander confirmation)
- Photo (optionnel Phase 2)
**Ce qui ne doit jamais apparaître :** plaques de véhicules impliqués (vie privée)
**Actions :** Choisir type, Envoyer, Annuler

### Signaler / SOS - Aide

**Rôle :** Signaler une urgence ou demander de l'aide.
**Contenu :**
- URGENCE VITALE (15/17/18) — affiché EN PREMIER, en rouge
- J'ai besoin d'aide (panne, accident bénin)
- Proposer mon aide (à un autre)
**Ce qui ne doit jamais apparaître :** formulaire complexe (urgence = simplicité absolue)
**Actions :** Appeler les secours (lien tel://), Signaler SOS, Proposer aide
**Cooldown :** 15 min entre deux SOS

### Activity (fil unifié)

**Rôle :** Voir chronologiquement toutes mes interactions (reçues + envoyées).
**Contenu :**
```
[Filtres] Tout · Messages · Appels · Signalements
[Direction] Reçus · Envoyés · Tous
─────────────────────────────────────
📵 Appel manqué de BZ-652-LL · il y a 5 min      [Rappeler]
💬 Message de BE-521-MM · "Merci..." · il y a 1h  [Répondre]
🚗 J'ai signalé : Feux allumés · AB-123-CD · 2h   [Résolu ✓]
⚠️ Signalement reçu : Pneu crevé · il y a 3h      [Voir]
📤 Message envoyé à BZ-652-LL · il y a 6h
```
**Ce qui ne doit jamais apparaître :** alertes communautaires route (→ sur la carte)
**Actions :** Rappeler, Répondre, Voir détail, Marquer lu, Archiver
**Badges :** Total interactions non lues/non vues
**Filtres :** Type + Direction + Période

### Dashboard / Profil / Paramètres

**Rôle :** Gérer son compte, ses préférences, accéder aux diagnostics.
**Sections :**
```
Mon profil        : pseudo, email, plaque, couleur
Mon véhicule      : principal + autres (Phase 2) + délégations
Notifications     : push on/off, sons on/off, vibrations on/off
Confidentialité   : blocages, position, visibilité
Historique véhicule: interactions reçues sur ma plaque (Phase 2)
Dashboard Gardien : diagnostics techniques
Exporter mes données / Supprimer mon compte
```

---

## 19. DASHBOARD / OBD — AUDIT COMPLET

### Voyants actuels (8) + voyants manquants (14)

**Voyants à ajouter :**

```
MESSAGE HEALTH
  ✅ Canal Realtime messages actif
  ✅ Dernier message reçu (horodatage)
  ⚠️ Nb messages non lus
  ❌ Erreur : canal KO depuis Xs

CALL HEALTH
  ✅ CallManager initialisé
  ✅ Canal signal actif / fermé
  ✅ requestId en cours
  ✅ mode CallScreen (idle/outgoing/incoming/accepted)
  ✅ plate en cours
  ✅ missedTimers actifs
  ✅ Agora joined / channel / uid
  ❌ Agora lastError
  ❌ Agora remoteUsersCount

SIGNAL CENTER HEALTH
  ✅ Canal community reports actif
  ✅ Nb alertes actives dans le rayon
  ✅ Dernier signalement envoyé
  ❌ Nb signalements en attente de résolution

PARKED VEHICLE HEALTH
  ✅ Nb alertes véhicule non lues (inbound)
  ✅ Dernière alerte reçue
  ❌ Statut résolution des alertes récentes

ROAD SIGNAL HEALTH
  ✅ Nb signalements route actifs autour de moi
  ❌ Dernier signalement route envoyé
  ❌ Taux de confirmation de mes signalements

NOTIFICATION HEALTH
  ✅ Push permission status (granted/denied/default)
  ✅ SW push subscription active
  ❌ Dernier push envoyé / reçu
  ❌ Push FCM / APNs configuré

INBOX/ACTIVITY HEALTH
  ✅ Nb interactions non vues
  ✅ Nb appels manqués non vus
  ✅ Dernier timestamp interaction

ANTI-ABUSE HEALTH
  ✅ Nb abus reportés (par moi et vers moi)
  ✅ Statut de restriction (actif / non)
  ❌ Historique des sanctions

TRUST ENGINE HEALTH
  ✅ Score de confiance actuel
  ✅ Nb signalements confirmés vs total
  ✅ Niveau utilisateur (Nouveau/Vérifié/Fiable)

SW/CACHE HEALTH (existant — améliorer)
  ✅ Version SW actuelle vs réseau
  ✅ Cache cohérent
  ❌ Taille du cache (MB)
  ❌ Temps depuis dernier refresh

MULTI-DEVICE HEALTH
  ✅ device_id actuel
  ✅ Nb appareils actifs sur ce compte
  ❌ Dernier appareil ayant accepté un appel
  ❌ Conflits détectés

DB SYNC HEALTH
  ✅ Latence dernière requête Supabase
  ✅ Nb interactions en localStorage non syncées en DB
  ❌ Dernière sync réussie
```

**Format des voyants :**
```
🟢 Vert   : fonctionnel, pas d'anomalie
🟡 Orange : dégradé, attention requise
🔴 Rouge  : critique, action requise
⚪ Gris   : feature non activée / non implémentée
```

---

## 20. KPI PRODUIT

### Dashboard métier (à implémenter)

```
MÉTRIQUES JOURNALIÈRES (DAY)
  Messages envoyés    : N
  Messages reçus      : N
  Taux de lecture     : N% (read_at / delivered_at)

MÉTRIQUES APPELS
  Appels initiés      : N
  Appels acceptés     : N  (taux d'acceptation : N%)
  Appels manqués      : N
  Appels refusés      : N
  Durée moyenne       : Xm Ys
  Durée totale (Agora): Xmin (quota utilisé)

MÉTRIQUES SIGNALEMENTS
  Signalements envoyés   : N
  Signalements reçus     : N
  Taux de résolution     : N%
  Temps moyen résolution : Xh
  Catégories fréquentes  : [Feux: 34% | Pneu: 22% | Stationnement: 18% | ...]

MÉTRIQUES ABUS
  Signalements d'abus    : N
  Taux de signalements contestés : N%
  Comptes restreints actifs : N

MÉTRIQUES UTILISATEURS
  DAU (Daily Active Users)   : N
  MAU (Monthly Active Users) : N
  Véhicules actifs           : N
  Nouveaux comptes (7j)      : N
  Churn (30j)                : N%

MÉTRIQUES TECHNIQUE
  Quota Agora utilisé (mois) : Xmin / 10 000min (N%)
  Erreurs Edge Function      : N (taux N%)
  SW install rate            : N%
  Temps moyen chargement app : Xms
```

**Implémentation recommandée :**
- Supabase Analytics (natif) pour les métriques DB
- PostHog ou Plausible (privacy-first) pour les métriques UX
- Dashboard séparé accessible uniquement par l'admin (RLS + `is_admin` flag)

---

## 21. OFFLINE / RÉSEAU FAIBLE

### Ce qui fonctionne offline aujourd'hui

- Consultation des alertes en cache (`S.alerts` dans localStorage)
- Consultation des messages en cache
- Lecture de l'historique InteractionEngine (localStorage)
- Carte : tuiles cachées par le SW (jusqu'à quota)

### Ce qui ne fonctionne pas offline

- Envoi de messages → Supabase offline
- Appels vocaux → impossible (RTC + Supabase requis)
- Signalements → `S.offlineReports` : mécanisme de queue existe !

### Mécanisme offlineReports (existant — exploiter)

```javascript
// Déjà dans index.html :
S.offlineReports = jget('ic_offline_reports', []);

// syncOfflineReports() appelé sur 'online' event :
window.addEventListener('online', () => {
  App.syncOfflineReports?.(); // tente de syncer les signalements offline
});
```

**Ce qui manque :**
- UI claire "Signalement en attente d'envoi (hors ligne)" dans Activity
- Retry progressif si upload photo échoue (3 tentatives, délai exponentiel)
- "Envoi en cours..." pendant la reconnexion
- Fallback texte si appel audio impossible : proposer "Envoyer un message à la place"

### Stratégie offline complète

```
SIGNALEMENTS ROUTE :
  Offline → queue dans S.offlineReports
  Retour en ligne → syncOfflineReports() → INSERT + broadcast
  UI : badge "1 signalement en attente"

MESSAGES :
  Offline → toast "Hors ligne — message en attente"
  Retour en ligne → resend automatique
  UI : indicateur ⏳ sur le message non envoyé

APPELS :
  Offline → toast "Impossible de passer un appel hors ligne"
  Aucun fallback vocal
  Fallback suggéré : "Envoyer un message à la place ?"

PHOTOS (futur) :
  Offline → photo stockée localement (IndexedDB)
  Retour en ligne → upload automatique
  Si échoue 3x → notification "Photo non envoyée — retenter manuellement"
```

---

## 22. MULTI-APPAREILS — STRATÉGIE

### Problèmes identifiés

1. Double popup entrant (résolu v17 via `_seenIncomingCallIds`)
2. "Appel pris sur autre appareil" non géré
3. Blocages non cross-device (localStorage seul)
4. Interactions non synchronisées (localStorage seul)

### Stratégie device_id

```javascript
// Initialisation (1 fois par appareil)
function getOrCreateDeviceId() {
  let id = localStorage.getItem('ic_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ic_device_id', id);
  }
  return id;
}

const MY_DEVICE_ID = getOrCreateDeviceId();
```

### Stratégie "appel pris sur autre appareil"

```sql
-- Ajouter dans call_requests :
ALTER TABLE call_requests ADD COLUMN accepted_device_id TEXT;

-- À l'acceptation :
UPDATE call_requests
SET status = 'accepted', accepted_device_id = $myDeviceId
WHERE id = $requestId AND receiver_id = $uid;
```

```javascript
// Sur l'appareil B2 (postgres_changes UPDATE reçu) :
if (update.status === 'accepted' && update.accepted_device_id !== MY_DEVICE_ID) {
  CallScreen.hide();
  AudioManager.stopCallAudio('taken-on-other-device');
  toast('Appel accepté sur un autre appareil', 'ok');
}
```

### Lecture synchronisée (messages lus)

```
Appareil 1 ouvre le fil → UPDATE messages SET read_at = now()
→ postgres_changes reçu par appareil 2 → marque le message comme lu
→ badge mis à jour sur les deux appareils
```

### Notifications en double

Règle : envoyer la push notification à TOUS les appareils de l'utilisateur.
Le premier à répondre déclenche `accepted_device_id` → les autres voient "pris sur autre appareil".

### Session active

```javascript
// Heartbeat toutes les 30s — indique l'appareil actif
function heartbeat() {
  supabase.from('device_sessions').upsert({
    user_id: _uid,
    device_id: MY_DEVICE_ID,
    last_seen: new Date().toISOString(),
    platform: 'ios' // ou 'android', 'web'
  });
}
setInterval(heartbeat, 30000);
```

---

## 23. SERVICE WORKER / CACHE / VERSION

### Garantir que A et B testent la même version

**Problème :** A et B peuvent avoir des versions différentes si le SW n'a pas encore
migré sur l'un des appareils.

**Solution actuelle (SW v21 network-first) :**
Le SW sert TOUJOURS le JS depuis le réseau. Donc en théorie A et B ont toujours
la même version si les deux ont du réseau. ✅

**Mais :** Si A est hors ligne, il utilise la version cachée (potentiellement ancienne).
Et si B est en ligne avec la v17, une incompatibilité de protocole est possible
(ex: champs payload différents dans les broadcasts).

**Build version visible :**
```javascript
// À injecter dans index.html au build :
window.APP_BUILD = {
  version: '17',
  buildDate: '2026-06-13',
  swVersion: 'immatconnect-pro-v21',
  commitHash: '12df767'
};

// Affiché dans le Dashboard Gardien :
// "Version : 17 · Build : 2026-06-13 · SW : v21 · #12df767"
```

**Cache mismatch :**
```javascript
// SW : au fetch, comparer version réseau vs cache
const CURRENT_VERSION = 'v21';

// Dans le fetch handler :
const networkVersion = response.headers.get('X-App-Version');
if (networkVersion && networkVersion !== CURRENT_VERSION) {
  // Forcer la mise à jour
  self.registration.update();
  // Notifier l'app
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
  });
}
```

**Force refresh depuis le Dashboard :**
```javascript
// Bouton "Forcer la mise à jour" dans le Dashboard Gardien :
function forceUpdate() {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    Promise.all(registrations.map(r => r.update()))
      .then(() => window.location.reload());
  });
}
```

**Diagnostics dans le Dashboard :**
```
SW actuel         : immatconnect-pro-v21
SW réseau         : immatconnect-pro-v21 ✅ (ou ⚠️ si différent)
Build version app : 17
Commit hash       : 12df767
Dernière install SW : 2026-06-12 23:31
Cache size        : 3.2 MB / ~50 MB quota
Fichiers en cache : 42 / 42 ✅
```

---

## 24. ROADMAP PRIORISÉE

### P0 — Bloquants immédiat (Sprint 1 — 2 semaines)

```
P0-01 : Séparer Messages et Appels dans la navigation
        → Onglet dédié Appels avec historique
        → Badge appels manqués (rouge)
        → Bouton "Passer un appel" avec champ plaque

P0-02 : Notifications push — infrastructure
        → service-worker.js : event 'push' + showNotification
        → Supabase Web Push (VAPID)
        → Demande permission push au premier lancement

P0-03 : Bouton 🚨 Urgence — affichage 15/17/18 en premier
        → Dans Signaler / SOS
        → Dans Signaler / Véhicule (urgences critiques)
        → Avant tout formulaire ImmatConnect

P0-04 : Règle type/domain/direction/status implémentée
        → Ajouter domain + direction dans InteractionEngine
        → Filtres Activity basés sur ces dimensions
```

### P1 — Priorité haute (Sprint 2 — 2 semaines)

```
P1-01 : SignalCenter — Signalement véhicule repensé
        → Flux 3 clics max (plaque → type → envoyer)
        → Messages automatiques pré-rédigés
        → Réponses rapides pour le propriétaire

P1-02 : ResolutionCenter
        → Modal de suivi pour chaque signalement
        → Statuts in_progress / resolved / unresolvable
        → Notification à l'émetteur à la résolution

P1-03 : Corriger cause racine InteractionEngine double-émission
        → _emitObd() n'écrase plus CALL_* payloads sur ImmatBus

P1-04 : Persister blocages en DB Supabase
        → Migration localStorage → table user_blocks
        → Cross-device, résistant au clear cache

P1-05 : device_id + "appel pris sur autre appareil"
        → accepted_device_id dans call_requests
        → Fermeture overlay sur autres appareils

P1-06 : push notifications APNs iOS
        → Compte Apple Developer + certificat
        → Test sur iOS 16.4+ (PWA installée)
```

### P2 — Priorité moyenne (Sprint 3 — 3 semaines)

```
P2-01 : Photo signalement Phase 2
        → 1 photo par signalement stationnement
        → Compression canvas + Supabase Storage
        → Alerte RGPD + consentement

P2-02 : Activity Screen complète
        → Fil unifié messages + appels + signalements
        → Filtres type + direction + période
        → Horodatage relatif ("il y a 5 min")

P2-03 : Anti-abus rate limiting côté client
        → Max 3 appels / 10 min vers même plaque
        → Cooldown SOS 15 min
        → Bouton "Signaler ce contact"

P2-04 : Trust Engine MVP
        → Score implicite (confirmations / total)
        → Badge "Conducteur fiable" (invisible si score neutre)
        → Sanctions progressives (avertissement → restriction)

P2-05 : Multi-appareils synchronisation
        → Lectures messages synchronisées cross-device
        → Blocages cross-device (DB)
        → Heartbeat device_sessions

P2-06 : Haut-parleur Agora / setSinkId
        → Bouton haut-parleur fonctionnel
        → Fallback : "Contrôlé par le téléphone" si non supporté

P2-07 : Accessibilité P1
        → role="dialog" sur overlays
        → aria-live sur toasts
        → aria-label sur tous les boutons iconiques
        → Zones de tap ≥ 44pt
```

### P3 — Vision long terme (Sprint 4+ — 4+ semaines)

```
P3-01 : Multi-véhicules
        → Table vehicles (1 user → N plaques)
        → UX "Basculer de véhicule"
        → Historique par plaque

P3-02 : DelegationManager
        → Prêt de véhicule avec durée
        → Notifications déléguées
        → Révocation en 1 tap

P3-03 : Plaques internationales
        → Format BE, CH, LU, DE
        → Détection automatique du format
        → `plate_country` en DB

P3-04 : Fusion intelligente des signalements
        → Déduplication serveur par fenêtre temporelle
        → "3 personnes ont signalé..."
        → pg_cron expiration automatique

P3-05 : Photos Phase 3
        → Multi-photos (jusqu'à 3)
        → Floutage visages + plaques tiers (Edge Function)
        → Modération IA (contenu abusif)

P3-06 : Trust Engine complet
        → Niveaux utilisateur (Nouveau/Vérifié/Fiable/Ambassadeur)
        → Modération communautaire
        → Dashboard métier Trust

P3-07 : Changement de plaque
        → Flow demande + validation admin
        → Migration historique
        → Protection réutilisation 30 jours

P3-08 : Historique véhicule
        → Toutes les interactions reçues sur ma plaque
        → Export PDF "Historique de mon véhicule"
        → Partage lors d'une vente

P3-09 : RGPD complet
        → Export données utilisateur (ZIP)
        → Suppression compte avec anonymisation DB
        → Politique de rétention automatique (pg_cron)
```

---

## 25. LIVRABLE

### Chemin du fichier

`docs/AUDIT_IMMATCONNECT_GLOBAL_V2.md`

### Résumé exécutif (pour les prochaines IA)

ImmatConnect Pro est une PWA de communication inter-conducteurs par immatriculation.
L'infrastructure technique est solide (Agora RTC, Supabase Realtime, SW network-first)
et les bugs critiques d'appel ont été résolus en session 2026-06-12.

**Le problème central** n'est pas technique mais architecturel et produit :
l'implémentation représente ~30% du MASTER_PLAN. Les fonctionnalités qui existent
sont fragmentées (Appels dans Messages, Activity incomplète, pas de ResolutionCenter).

**Trois décisions bloquent l'adoption :**
1. Pas de notifications push → les utilisateurs ratent les appels si l'app est fermée
2. Appels et Messages mélangés → valeur de l'appel vocal masquée
3. Pas de bouton Urgence → risque éthique et légal pour les cas critiques (enfant/animal)

### Décisions recommandées (par ordre de priorité)

1. **Séparer Appels et Messages dans la navigation** — décision UX irréversible, à faire maintenant
2. **Implémenter le bouton Urgence 🚨** — décision éthique, coût technique minimal
3. **Lancer l'intégration push notifications** — décision infrastructure longue, à commencer maintenant
4. **Adopter la règle type/domain/direction/status** — décision architecturale pour éviter la confusion d'affichage
5. **Créer le ResolutionCenter** — décision produit pour compléter le cycle de vie des signalements
6. **Persister les blocages en DB** — décision sécurité, coût faible, impact fort

### Questions ouvertes pour les prochaines sessions

**Q1 :** Y a-t-il déjà un compte Apple Developer pour les push APNs iOS ?
**Q2 :** Le stockage Supabase Storage est-il activé sur le projet ?
**Q3 :** Qui valide les changements de plaque ? Un admin humain ou un flow automatisé ?
**Q4 :** Le quota Agora 10 000 min/mois est-il suffisant pour la phase de lancement ?
**Q5 :** Les analytics produit (DAU/MAU) sont-ils suivis quelque part aujourd'hui ?
**Q6 :** La modération du Trust Engine est-elle humaine ou algorithmique ?
**Q7 :** L'app doit-elle supporter des plaques non françaises dès le MVP ?
**Q8 :** La fonctionnalité multi-véhicules est-elle dans le scope des 6 prochains mois ?
**Q9 :** Y a-t-il un DPO ou un conseil juridique pour valider la politique RGPD photos ?
**Q10 :** Quand l'app sera-t-elle soumise à l'App Store / Play Store ?

---

*Audit V2 — IA indépendante — 2026-06-13*
*Complète l'Audit V1 (`docs/AUDIT_IMMATCONNECT_GLOBAL_V1.md`)*
*Ne remplace pas `docs/IMMATCONNECT_INTERACTION_ARCHITECTURE_MASTER_PLAN.md`*
*Branche : `claude/immatconnect-pro-app-dEKGR`*
