# AUDIT CROISÉ — SESSION 14
> Croisement : MATRICE-INTERACTIONS-AB · AUDIT-SESSION-13 · UX-NOTIFICATION-MATRIX · index.html
> Date : 2026-06-02

---

## MÉTHODE

Pour chaque élément documenté dans les fichiers d'architecture, on vérifie :
1. Est-ce implémenté dans index.html ?
2. L'implémentation correspond-elle à la spec ?
3. Y a-t-il une incohérence entre les fichiers eux-mêmes ?

---

## PARTIE 1 — ÉTAT DES IMPLÉMENTATIONS

### ✅ CE QUI EST FAIT ET CONFORME

| Ref | Fonctionnalité | Fichier source | Code confirmé |
|---|---|---|---|
| SESSION 13 | FloatingCard btn2 contextuel | AUDIT-SESSION-13 | `saved.group==='assist'?'✋ J\'aide':'🗺 Voir'` — ligne 727 |
| IA-03 | B dit "J'arrive" (quick reply) | MATRICE-AB | `actQuickReply(...,'J\'arrive...')` — ligne 1089 |
| IA-04 | B dit "Je ne peux pas" (quick reply) | MATRICE-AB | `actQuickReply(...,'Je ne peux pas...')` — ligne 1089 |
| IA-06 | A clôture sa demande d'aide | MATRICE-AB | `actConfirmAlert(id,'resolved')` — lignes 1085, 1158 |
| MORT-002 | Bouton 📍 Voir sur carte | MATRICE-AB | `if(a.lat!=null)actions+=...📍 Voir...` — lignes 1090, 1170 |
| INT-004 | Compose pré-rempli sans auto-envoi | MATRICE-AB | `actHelpReply` — lignes 1258-1268 |
| DA-002 | navPremium labels corrigés | AUDIT-SESSION-13 | `km/h` / `Proches` — ligne 146 |
| SESSION 14 | actBadge = alertes uniquement | UX-NOTIFICATION-MATRIX | `unreadAlerts` — ligne 1286 |
| SESSION 14 | topMsgBadge = messages uniquement | UX-NOTIFICATION-MATRIX | `unreadMsgs` — ligne 1288 |
| SESSION 14 | catBadgeVehicle = alertes seules | UX-NOTIFICATION-MATRIX | ligne 940 |

---

### ❌ CE QUI EST DOCUMENTÉ MAIS NON IMPLÉMENTÉ

#### IC-002 — Retour "Vu par le conducteur" chez A

**Source :** MATRICE-AB IC-002 + FLOW-005 (UX-NOTIFICATION-MATRIX)

**Spec :** Quand B clique "Vu" sur alerte véhicule → card Activité Envoyés chez A passe à statut "Vu par le conducteur".

**Code actuel :** `actConfirmAlert(id,'seen')` met à jour le statut local de B. Rien n'est envoyé vers A.

**Impact :** A ne sait jamais si B a vu son alerte véhicule. Boucle ouverte.

---

#### IC-003 — Statut "Helper en route" chez A (FLOW-002)

**Source :** MATRICE-AB IC-003 + FLOW-002 (UX-NOTIFICATION-MATRIX)

**Spec :** Quand B dit "J'arrive" → card aide côté A se met à jour : "Helper en route". FloatingCard chez A.

**Code actuel :** `actQuickReply` envoie le message "J'arrive..." à A via Messages. Mais la card Activité aide côté A n'est pas mise à jour. Pas de FloatingCard chez A.

**Impact :** A ne sait pas visuellement qu'un helper arrive. Il doit aller dans Messages pour le voir.

---

#### IC-004 — notificationIntensity(distance, severity)

**Source :** UX-NOTIFICATION-MATRIX intensity_rules + FLOW-007

**Spec :**
- < 200m → FloatingCard + son
- < 1km → Toast fort + badge
- > 1km → Marqueur seul + badge discret

**Code actuel :** `addCommunityAlert` avec `opts.notify=true` → FloatingCard systématiquement, quelle que soit la distance.

**Impact :** Un bouchon à 15km génère la même FloatingCard qu'un accident à 50m. Surcharge cognitive.

---

#### Ange Conducteur — bouton visible pour tous les conducteurs

**Source :** Décision Gardien SESSION 14 (UX-NOTIFICATION-GRAMMAR v1)

**Spec :** Bouton ✦ visible pour tout conducteur authentifié (pas seulement gardien).

**Code actuel :**
```javascript
// ligne 492
if(r==='gardien'){...fab.style.display='flex';}
// ligne 1830
<button id="angeFab" onclick="AngeDialog.open()">✦</button>
```

`angeFab` est affiché uniquement si `role === 'gardien'`. Un conducteur normal ne voit jamais le bouton.

**Impact :** L'Ange Conducteur n'existe pas encore pour les utilisateurs finaux.

---

#### DA-001 — reportPanel overlay en 2 étapes

**Source :** AUDIT-SESSION-13 + décisions DA

**Spec :** Overlay de signalement en 2 étapes (type → détails), pas 3 blocs simultanés.

**Code actuel :** `panelAltet` avec `sigSteps` est déjà en 2 étapes. L'overlay `reportVehicleBlock` / `reportRouteBlock` / `reportAssistBlock` affiche encore les 3 blocs ensemble.

**Impact :** UX incohérente entre les deux chemins de signalement.

---

## PARTIE 2 — INCOHÉRENCES ENTRE FICHIERS

### INCOHÉRENCE MAJEURE — Alertes véhicule bloquées de S.alerts

**Constat :** `upsertAlert` (ligne 404) contient :
```javascript
if(alert.group==='vehicle')return null;
```

Les alertes véhicule sont **rejetées** de `S.alerts`. Elles ne sont jamais stockées.

**Conséquence :**
- `catBadgeVehicle` compte `activeAlerts.filter(a=>a.group==='vehicle')` → **toujours 0** (les véhicule ne sont pas dans S.alerts)
- `pendingSignalCount()` compte aussi des alertes véhicule dans S.alerts → **toujours 0** (fonction morte)
- Les boutons dans `_actModCard` / `_actAlertCard` pour `a.group==='vehicle'` ne seront jamais atteints depuis S.alerts

**Avant la SESSION 14 :** `catBadgeVehicle` comptait les messages non lus pour compenser — c'était un bug masqué par un autre bug.

**Après SESSION 14 :** `catBadgeVehicle` est toujours 0. Le bug masqué est devenu visible.

**Où arrivent vraiment les alertes véhicule ?** Via `subscribeCommunityReports` → `on('broadcast',{event:'vehicle_alert'})` → `showFloatingCard` directement. Jamais dans S.alerts. Jamais dans Activité.

**Décision nécessaire :** Soit les alertes véhicule entrent dans S.alerts (retirer `if(alert.group==='vehicle')return null`), soit `catBadgeVehicle` reflète un autre compteur.

---

### INCOHÉRENCE MINEURE — _actAlertCard vs FLOW-005

**FLOW-005 :** Actions B sur alerte véhicule = "Vu", "💬 Répondre", "Info utile", "Déjà réglé", "Faux signalement"

**Code actuel :** `_actAlertCard` pour `item.type==='vehicle'` :
```javascript
actions=`✓ Toujours là` + `✓ Résolu`
```

Ces libellés ("Toujours là", "Résolu") sont des libellés route, pas véhicule. Inadapté pour une alerte sur le véhicule de B.

---

### INCOHÉRENCE MINEURE — FloatingCard message, callback btn1 null

**Code ligne 722 :**
```javascript
showFloatingCard('💬','Message de...','Vu','Répondre →', null, async()=>{...})
```

`btn1` = "Vu" avec callback `null`. Cliquer "Vu" ne fait rien (pas de badge décrémenter, pas de marquage lu).

**FLOW-006 :** `topMsgBadge--` quand message lu.

---

## PARTIE 3 — TESTS FONCTIONNELS

### TEST-01 — Boucle aide complète (FLOW-001 → FLOW-002 → FLOW-004)

| Étape | Action | Résultat attendu | Résultat actuel | Statut |
|---|---|---|---|---|
| 1 | A crée demande aide | Toast "Demande envoyée" + marqueur carte | ✓ | ✅ |
| 2 | B voit demande dans Activité → Aide | Card avec J'arrive / Je ne peux pas | ✓ | ✅ |
| 3 | B dit "J'arrive" | Message envoyé + actBadge-- + catBadgeAide-- | Message envoyé ✓ — badge ❌ non décrémenté immédiatement | ⚠ |
| 4 | A reçoit notification "Helper en route" | FloatingCard chez A + card Activité mise à jour | ❌ rien chez A sauf message dans Messages | ❌ IC-003 |
| 5 | A clôture "✓ Résolu" | Marqueur retiré pour tous | ✓ | ✅ |
| 6 | actBadge chez A après résolution | actBadge-- | ✓ via updateActBadge | ✅ |

**Score : 4/6 — IC-003 manquant**

---

### TEST-02 — Alerte véhicule (FLOW-005)

| Étape | Action | Résultat attendu | Résultat actuel | Statut |
|---|---|---|---|---|
| 1 | A signale problème sur véhicule B | Toast chez A + FloatingCard chez B | FloatingCard chez B ✓ | ✅ |
| 2 | catBadgeVehicle s'incrémente | +1 | 0 toujours (bug upsertAlert) | ❌ |
| 3 | B voit alerte dans Activité → Véhicule | Card avec actions | ❌ pas dans Activité (rejeté de S.alerts) | ❌ |
| 4 | B clique "Vu" | Statut "Vu par le conducteur" chez A | ❌ rien chez A | ❌ IC-002 |
| 5 | B rate la FloatingCard | Retrouve dans Activité | ❌ pas dans Activité | ❌ |

**Score : 1/5 — Flux véhicule structurellement incomplet**

---

### TEST-03 — Séparation badges (SESSION 14)

| Scénario | actBadge attendu | topMsgBadge attendu | Statut |
|---|---|---|---|
| 3 alertes route + 0 messages | 3 | 0 | ✅ |
| 0 alertes + 5 messages | 0 | 5 | ✅ |
| 3 alertes + 5 messages | 3 | 5 | ✅ |
| Alerte véhicule reçue | 0 (bug upsertAlert) | 0 | ❌ bug connu |
| Message lu | 0 | 4 (après décrémentation) | ✅ si setUnreadMsgCount appelé |

---

### TEST-04 — FloatingCard intensité distance

| Distance alerte | Comportement attendu | Comportement actuel | Statut |
|---|---|---|---|
| < 200m, critique | FloatingCard + son | FloatingCard (son selon settings) | ✅ |
| < 1km, urgent | Toast fort | FloatingCard | ❌ trop intrusif |
| 1-3km, important | Toast discret | FloatingCard | ❌ trop intrusif |
| > 3km, info | Marqueur seul | FloatingCard | ❌ très trop intrusif |

---

### TEST-05 — Ange Conducteur (Gardien vs Conducteur)

| Rôle | Bouton ✦ visible | Comportement attendu | Statut |
|---|---|---|---|
| gardien | ✅ visible | Ange Gardien (brain-dialog, depth 3) | ✅ |
| conducteur | ❌ caché | Ange Conducteur (à implémenter) | ❌ |
| non connecté | ❌ caché | — | ✅ |

---

## PARTIE 4 — PRIORITÉS PAR IMPACT RÉEL

| Priorité | Ref | Description | TRF-006 — coût réduit |
|---|---|---|---|
| P0 | BUG-001 | alertes véhicule bloquées de S.alerts → catBadgeVehicle = 0 toujours | Confusion badge après SESSION 14 |
| P1 | IC-003 | "Helper en route" chez A quand B dit J'arrive | A ne sait pas si quelqu'un vient — boucle aide à 90% |
| P1 | IC-002 | "Vu par le conducteur" chez A | A ne sait pas si B a vu son alerte véhicule |
| P2 | IC-004 | notificationIntensity(distance, severity) | Surcharge FloatingCard pour alertes lointaines |
| P2 | Ange Conducteur | Bouton ✦ pour conducteurs (pas gardien seulement) | Fonctionnalité promise, inexistante côté conducteur |
| P3 | DA-001 | reportPanel overlay 2 étapes | Cohérence UX entre les deux chemins de signalement |
| P3 | FLOW-005 | Labels "Toujours là" / "Résolu" inadaptés pour alerte véhicule | Libellés trompeurs |
| P4 | FloatingCard msg | callback btn1 "Vu" = null | topMsgBadge pas décrémenté au clic |

---

## PARTIE 5 — RÉSUMÉ

### Ce qui fonctionne bien
- Boucle aide : 4/6 étapes correctes
- Séparation badges : conforme à UX-NOTIFICATION-MATRIX
- FloatingCard contextuelle : conforme
- Boutons J'arrive / Je ne peux pas : conformes
- Clôture aide : conforme
- Voir sur carte : conforme

### Ce qui doit être corrigé en priorité
1. **BUG-001** — `upsertAlert` rejette les alertes véhicule → catBadgeVehicle toujours 0
2. **IC-003** — A ne voit pas "Helper en route" quand B dit J'arrive
3. **IC-002** — A ne voit pas "Vu par le conducteur" après réponse de B

### Ce qui attend une décision terrain
- IC-004 — intensité selon distance (impact conduite réelle à mesurer)
- DA-001 — reportPanel 2 étapes (friction terrain à observer)

---

## PARTIE 6 — QUESTION OUVERTE BUG-001

`upsertAlert` bloque `group==='vehicle'` pour une raison non documentée.

Deux hypothèses :
1. Les alertes véhicule étaient gérées uniquement via FloatingCard par choix (éviter de polluer S.alerts avec des alertes personnelles qui ne concernent que B).
2. C'est un bug résiduel d'une ancienne architecture.

Si hypothèse 1 : `catBadgeVehicle` n'a pas de sens et devrait être supprimé ou remplacé par un compteur dédié.

Si hypothèse 2 : retirer `if(alert.group==='vehicle')return null` — décision Gardien requise.
