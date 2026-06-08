# CALL_PENDING_EXPIRY — Audit statique du code source

**Auteur** : Claude (analyse statique)  
**Branche** : `diagnostic/call-pending-expiry-obd`  
**Fichier analysé** : `calls.js` — commit main `68f322b`  
**À lire avec** : `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md` (diagnostic consolidé)

> Ce fichier documente uniquement ce qui est observable dans le code source.
> Aucune observation terrain, aucune donnée OBD runtime ici.
> Séparation stricte : code source ↔ observations terrain ↔ diagnostic consolidé.

---

## Périmètre de l'analyse

Fichier lu intégralement : `calls.js`  
Fichiers consultés partiellement : `core/call-screen.js` (non reproduit ici)

Fonctions analysées :
- `requestCall()` — émission d'un appel
- `_recoverPendingRequest()` — récupération après reload
- `_showSentBanner()` — bannière côté A
- `_onMissed()` — expiration côté B
- `_showIncomingPopup()` — réception côté B
- `subscribeIncomingCalls()` — subscription realtime
- `acceptCall()` / `refuseCall()` / `cancelCallRequest()` — transitions d'état

---

## 1. Inventaire des transitions de statut DB

### Ce que le code client écrit en DB

| Transition | Fonction | Ligne approx. | Condition |
|---|---|---|---|
| INSERT `pending` | `requestCall()` | 152–162 | Toujours (défaut DB) |
| UPDATE → `accepted` | `acceptCall()` | 194 | `.eq('status','pending')` |
| UPDATE → `refused` | `refuseCall()` | 214 | `.eq('status','pending')` |
| UPDATE → `cancelled` | `cancelCallRequest()` | 228 | `.eq('status','pending')` |
| UPDATE → `expired` | **AUCUNE FONCTION** | — | **N'existe pas** |

### Conclusion certaine

**Le client ne met jamais `status='expired'` en DB.**  
L'expiration côté client est uniquement locale (variable `_pendingCallId` nullée).  
Si le backend ne le fait pas non plus, toute ligne insérée reste `pending` jusqu'à réponse ou intervention manuelle.

---

## 2. Fonction `requestCall()` — lignes 130–186

### Ce que fait la fonction

```js
// Vérifie les préférences d'appel via RPC
await _sb.rpc('can_receive_calls', { target_uid: receiverId });

// Insère la ligne — pas de vérification préalable des pending expirés
await _sb.from('call_requests').insert({
  requester_id: _uid,
  receiver_id: receiverId,
  requester_plate: _myPlate || null,
  receiver_plate: receiverPlate || null,
  source: 'vehicle_contact',
}).select().maybeSingle();
```

### Gestion des erreurs (ligne 164–175)

```js
if (error.code === '23505') {
  _showError('Une demande est déjà en attente de réponse.');
} else if (error.message?.includes('spam_limit')) {
  _showError('Trop de demandes. Réessaie dans quelques minutes.');
} else if (error.message?.includes('cooldown_active')) {
  _showError('Demande refusée récemment. Réessaie dans quelques minutes.');
}
```

### Observations certaines

1. **Aucune vérification préalable** des lignes `pending` expirées avant le INSERT.  
   La fonction insère directement et laisse la contrainte DB rejeter si nécessaire.

2. **L'erreur `23505` est catchée** et présentée à l'utilisateur comme "déjà en attente" — sans distinction entre un pending actif et un pending expiré.

3. **Commentaire ligne 13** (en-tête du fichier) :  
   `"Anti-spam + unicité pending garantis par triggers DB (backend)"`  
   → La contrainte est entièrement côté DB. Le code client ne la connaît pas.

### Ce qui reste supposé

- La définition exacte de la contrainte (filtre sur `expires_at` ou non) est inconnue sans accès DB.

---

## 3. Fonction `_recoverPendingRequest()` — lignes 44–68

### Ce que fait la fonction

Appelée au démarrage (après reload/navigation). Restaure la bannière sortante si un appel pending est encore en cours.

```js
const { data } = await _sb
  .from('call_requests')
  .select('id, receiver_plate, receiver_id, expires_at')
  .eq('requester_id', _uid)
  .eq('status', 'pending')        // ← requête sans filtre expires_at
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (!data) return;

// Vérifie l'expiration LOCALEMENT
if (data.expires_at && new Date(data.expires_at) <= new Date()) return; // ← retour silencieux

// Si non expiré : restaure la bannière
_pendingCallId = data.id;
_showSentBanner(receiverPlate, data.id);
```

### Observation certaine — point critique

La fonction **requête sans filtre `expires_at`** (elle récupère tous les `pending` y compris expirés), puis **vérifie l'expiration localement** et **retourne sans mettre à jour la DB** si la ligne est expirée.

Résultat :
- La ligne reste `status='pending'` en DB.
- Le client ignore silencieusement la ligne expirée.
- Aucun nettoyage, aucun UPDATE, aucun DELETE.

C'est une **deuxième voie de confirmation** de HYP-001, indépendante de l'expiration normale via `_showSentBanner()`.

---

## 4. Fonction `_showSentBanner()` — lignes 320–342

### Ce que fait la fonction côté expiration

```js
// Nettoie _pendingCallId après 31s — LOCAL SEULEMENT
setTimeout(() => {
  if (_pendingCallId === requestId) _pendingCallId = null;
}, 31000);

// Fallback bannière legacy : auto-hide 8s + null local
setTimeout(() => {
  banner.classList.remove('show');
  if (_pendingCallId === requestId) _pendingCallId = null;
}, 8000);
```

### Observation certaine

Le timeout (31s) correspond à l'`expires_at` de la DB (+30s). Mais le seul effet est de nullifier `_pendingCallId` **localement**. Aucune écriture DB.

---

## 5. Fonction `_onMissed()` — lignes 287–292

### Contexte

`_onMissed` est le callback déclenché côté **B** quand l'appel expire sans réponse.

```js
const _onMissed = () => {
  if (_missedCallIds.has(req.id)) return;
  _missedCallIds.add(req.id);

  // Émet Bus + InteractionEngine uniquement
  window.ImmatOrganism?.observe?.('CALL_MISSED', { requestId: req.id, from: plate, ... });
  window.InteractionEngine?.create?.({ type: 'CALL_MISSED', ... });
  // ← AUCUN UPDATE DB
};
```

### Observation certaine

`_onMissed()` ne fait aucune écriture sur `call_requests`. Le statut `pending` reste en DB côté B également.

---

## 6. Fonction `_showIncomingPopup()` — lignes 282–313

### Ce que fait la fonction

```js
function _showIncomingPopup(req) {
  const plate = req.requester_plate || 'Conducteur';

  // Étape 1 : émettre via Bus
  window.ImmatOrganism?.observe?.('CALL_RECEIVED', { from: plate, requestId: req.id, ... });

  // Étape 2 : définir le callback expiration
  const _onMissed = () => { ... };

  // Étape 3 : déléguer à CallScreen si disponible
  if (window.CallScreen && typeof window.CallScreen.showIncoming === 'function') {
    const ms = Math.max(0, new Date(req.expires_at) - new Date());
    if (ms > 0) setTimeout(_onMissed, ms);
    return; // ← RETOURNE SANS APPELER CallScreen.showIncoming(req)
  }

  // Étape 4 (fallback) : popup legacy
  const popup = document.getElementById('callIncomingPopup');
  ...
}
```

### Observation certaine — point critique

**`CallScreen.showIncoming(req)` n'est jamais appelé directement ici.**

La fonction émet `CALL_RECEIVED` via `ImmatOrganism` et retourne. L'affichage de la popup entrante dépend entièrement de la chaîne :

```
ImmatOrganism.observe('CALL_RECEIVED')
  → ImmatBus.emit('CALL_RECEIVED')
  → listener dans CallScreen
  → CallScreen.showIncoming(req)
```

Si **un seul maillon** de cette chaîne est absent ou non initialisé au moment du fire, B ne voit rien — **sans erreur visible**.

### Ce qui reste supposé

- Que `CallScreen` possède bien un listener `CALL_RECEIVED` actif au moment de l'appel (non vérifié sans lecture de `core/call-screen.js` complet ou test ImmatBus.getJournal()).

---

## 7. Fonction `subscribeIncomingCalls()` — lignes 238–279

### Structure du channel

```js
_chCalls = _sb.channel('ic_calls_' + uid)
  // Écoute INSERT (appels entrants)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'call_requests',
    filter: 'receiver_id=eq.' + uid,  // ← filtre sur receiver_id
  }, p => {
    const r = p.new;
    if (!r || r.status !== 'pending') return;      // filtre status
    if (r.expires_at && new Date(r.expires_at) <= new Date()) return;  // filtre expiration
    _showIncomingPopup(r);
  })
  // Écoute UPDATE (réponses à mes demandes sortantes)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'call_requests',
    filter: 'requester_id=eq.' + uid,
  }, p => { ... })
  // Gestion erreur channel
  .subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      setTimeout(() => subscribeIncomingCalls(uid), 5000); // retry 5s
    }
  });
```

### Observations certaines

1. **Filtre `receiver_id=eq.uid`** : B ne reçoit QUE les lignes où `receiver_id` correspond exactement à son UID auth.
2. **Double filtre client** : status `pending` + `expires_at` non expiré — si la ligne arrive mais est déjà expirée, elle est ignorée silencieusement.
3. **Écoute uniquement les INSERTs** pour les appels entrants. Si B n'était pas connecté au moment du INSERT, l'événement est perdu (pas de replay).
4. **Retry CHANNEL_ERROR** : relance après 5s. `realtimeSubscribed=true` dans l'OBD prouve seulement qu'un channel a été créé — pas que l'événement INSERT a été reçu.

### Ce qui reste supposé

- Que le RLS Supabase autorise B à recevoir l'événement pour sa `receiver_id`.
- Que le channel était `SUBSCRIBED` (pas juste créé) au moment exact de l'INSERT.

---

## 8. Fonctions `acceptCall()` / `refuseCall()` / `cancelCallRequest()`

### Pattern commun

Toutes les trois font un `.update({ status: 'X' }).eq('status', 'pending')`.

```js
// acceptCall
.update({ status: 'accepted', responded_at: new Date().toISOString() })
.eq('id', requestId).eq('receiver_id', _uid).eq('status', 'pending')

// refuseCall
.update({ status: 'refused', responded_at: new Date().toISOString() })
.eq('id', requestId).eq('receiver_id', _uid).eq('status', 'pending')

// cancelCallRequest
.update({ status: 'cancelled' })
.eq('id', requestId).eq('requester_id', _uid).eq('status', 'pending')
```

### Observation certaine

Ces trois fonctions sont les **seuls chemins** qui mettent à jour `status` en DB. Aucune ne passe par `expired`. L'état `expired` n'existe pas côté client.

---

## 9. Synthèse — ce qui est certain vs supposé

### Certain (prouvé par lecture directe du code)

| Fait | Fonction | Ligne |
|---|---|---|
| Aucun chemin client ne fait UPDATE status='expired' | Toutes | — |
| _recoverPendingRequest() ignore les expirés sans update DB | `_recoverPendingRequest` | 56 |
| _showSentBanner() timeout = null local seulement | `_showSentBanner` | 323 |
| _onMissed() zéro écriture DB | `_onMissed` | 290–291 |
| _showIncomingPopup() ne call pas CallScreen.showIncoming() directement | `_showIncomingPopup` | 295–298 |
| Subscription filtre sur receiver_id (pas receiver_plate) | `subscribeIncomingCalls` | 248 |
| Erreur 23505 = unique constraint — contrainte entièrement côté DB | `requestCall` | 13, 165 |

### Supposé (non vérifiable sans SQL ou test runtime)

| Supposition | Vérification requise |
|---|---|
| La contrainte ne filtre pas expires_at | SQL : pg_get_constraintdef |
| Aucun cron/trigger DB ne fait UPDATE status='expired' | Supabase Dashboard → Cron |
| CallScreen possède un listener actif sur CALL_RECEIVED | ImmatBus.getJournal() côté B |
| Le channel était SUBSCRIBED au moment de l'appel | ImmatBus.getJournal() côté B |
| receiver_id inscrit = uid réel de B | SQL : vue paire A↔B |

---

## 10. Hypothèses générées à partir du code

Ces hypothèses découlent directement de la lecture du code, sans observation terrain.

**HYP-001** : ligne `pending` orpheline en DB  
→ Générée par : absence de UPDATE status=expired dans toutes les fonctions d'expiration

**HYP-001b** : `_recoverPendingRequest()` comme voie secondaire de persistance  
→ Générée par : ligne 56 — retour sans UPDATE sur ligne expirée

**HYP-006** : popup live ratée dans la chaîne ImmatOrganism → Bus → CallScreen  
→ Générée par : `_showIncomingPopup()` ligne 295–298 — retour sans appel direct à CallScreen

**HYP-005** (affaiblie) : subscription peut être créée sans être opérationnelle  
→ Générée par : `realtimeSubscribed=true` prouve création channel, pas réception d'événement

---

## Dernier état de l'analyse code

```
Date             : 2026-06-08
Fichier analysé  : calls.js sur main 68f322b
Lignes lues      : 1–420 (intégral)

Fait le plus important :
  Aucun code client ne fait UPDATE call_requests SET status='expired'.
  L'expiration est uniquement locale (_pendingCallId = null).
  La DB ne sait jamais qu'un appel a expiré, sauf si le backend le fait.

Preuve non disponible dans le code :
  Définition exacte de la contrainte anti-doublon (SQL requis).
  Existence d'un cron Supabase (Dashboard requis).
  Comportement de CallScreen sur CALL_RECEIVED (core/call-screen.js non lu intégralement).
```
