# CALL_PENDING_EXPIRY — Audit critique complémentaire

**Branche** : `diagnostic/call-pending-expiry-obd`  
**Fichier complémentaire** : `docs/CALL_PENDING_EXPIRY_CRITICAL_REVIEW.md`  
**À lire avec** : `docs/CALL_PENDING_EXPIRY_DIAGNOSTIC.md`  
**Statut** : complément d'audit — ne pas corriger avant preuve SQL / OBD.

---

## 1. Objectif de cet addendum

Cet addendum sert à éviter un biais de confirmation.

Le diagnostic principal identifie fortement :

```text
HYP-001 : pending expiré resté pending en DB
HYP-002 : contrainte / trigger anti-doublon qui bloque encore les pending expirés
```

Ces hypothèses expliquent très bien le message :

```text
Une demande est déjà en attente de réponse.
```

Mais elles n'expliquent pas forcément à elles seules pourquoi B n'a pas vu de popup lors du premier appel.

Il faut donc distinguer deux problèmes potentiels :

```text
BUG A : blocage des nouveaux appels après expiration
BUG B : absence de notification entrante / popup côté B pendant le premier appel
```

Ils peuvent avoir la même cause. Ils peuvent aussi être deux bugs successifs.

---

## 2. Regard critique sur HYP-001

### Ce que HYP-001 explique très bien

```text
Historique : Appel émis · expired
Historique : Appel reçu · expired
Nouvel appel : Une demande est déjà en attente de réponse
```

Interprétation probable :

```text
UI / historique = expired
DB / anti-doublon = encore pending
```

### Ce que HYP-001 n'explique pas forcément

```text
Pourquoi B n'a pas reçu ou vu la popup au moment du premier appel.
```

Donc, même si HYP-001 est confirmée, il faudra refaire un test réel A → B après correction DB pour vérifier si la popup entrante fonctionne réellement.

---

## 3. Indice très important : `Appel reçu · expired`

La présence de :

```text
Appel reçu · expired
```

côté conversation/historique de B est un signal fort.

Elle suggère que B ou le système a eu connaissance de l'appel à un moment donné.

Cela affaiblit l'hypothèse :

```text
receiver_id totalement faux
```

car si `receiver_id` était totalement faux, B n'aurait probablement pas d'historique `Appel reçu`.

Mais attention : il faut vérifier quelle source alimente cet historique.

Question à résoudre :

```text
L'historique Appel reçu · expired vient-il de call_requests directement,
ou d'une autre source comme messages / activities / InteractionEngine ?
```

---

## 4. Nouvelle hypothèse HYP-006 — événement connu mais popup temps réel ratée

### HYP-006

```text
La demande existe et est historisée, mais la popup temps réel n'apparaît pas.
```

Scénario possible :

```text
INSERT call_requests
↓
B peut voir l'historique plus tard
↓
mais l'événement live n'a pas déclenché CallScreen.showIncoming
↓
aucune popup au moment réel
↓
plus tard l'historique affiche Appel reçu · expired
```

Confiance : moyenne à haute, à tester après HYP-001/HYP-002.

Preuves nécessaires :

```js
ImmatBus.getJournal()
CallScreen.getState()
ImmatCallsRuntimeDiagnostics.run()
```

Chercher :

```text
CALL_RECEIVED
CALL_MISSED
CallScreen.mode = incoming / idle
```

---

## 5. Nouvelle hypothèse HYP-007 — événement perdu à cause du mobile / arrière-plan

Même avec deux téléphones, si le téléphone B est :

```text
écran verrouillé
navigateur en arrière-plan
app non active
réseau faible
mode économie d'énergie
onglet suspendu
```

le realtime peut ne pas afficher la popup au moment exact, mais l'historique peut apparaître plus tard.

À vérifier lors du prochain test :

```text
B écran allumé ?
B application au premier plan ?
B connecté à Internet ?
B même URL main / branche test ?
B Dashboard Gardien ouvert ou app normale ?
B navigateur autorise audio / interaction utilisateur ?
```

Important : cette hypothèse n'explique pas le blocage `déjà en attente`, mais peut expliquer l'absence de popup du premier appel.

---

## 6. Nouvelle hypothèse HYP-008 — filtre realtime trop strict ou uid différent de la source historique

Le realtime écoute probablement :

```text
receiver_id = auth.uid()
```

Mais l'historique peut être affiché via :

```text
plaque
messages
InteractionEngine
autre projection
```

Risque :

```text
historique visible grâce à une plaque
mais realtime absent car receiver_id ne correspond pas exactement à auth.uid()
```

À vérifier dans SQL Priorité 3 :

```text
receiver_id correspond-il exactement à l'uid du compte B connecté ?
requester_id correspond-il exactement à l'uid du compte A connecté ?
requester_plate / receiver_plate correspondent-elles aux plaques affichées ?
```

---

## 7. Nouvelle hypothèse HYP-009 — deux sources de vérité pour l'historique et l'appel live

À vérifier :

```text
Appel reçu · expired
```

vient-il de :

```text
call_requests
```

ou de :

```text
InteractionEngine
messages
activities
registry
local cache
```

Si l'historique ne vient pas directement de `call_requests`, il peut y avoir une désynchronisation entre :

```text
source live d'appel
source historique affichée
```

Cela peut expliquer pourquoi l'historique affiche un état qui ne reflète pas exactement la réalité DB.

---

## 8. Limite de la preuve OBD `realtimeSubscribed=true`

La capture Dashboard Gardien montre :

```text
realtimeSubscribed = true
```

Mais cela prouve seulement :

```text
un channel a été créé / enregistré côté client
```

Cela ne prouve pas :

```text
channel réellement SUBSCRIBED côté Supabase au moment de l'appel
événement INSERT réellement reçu
handler exécuté
CALL_RECEIVED émis
CallScreen.showIncoming appelé
```

Donc il faut éviter la conclusion :

```text
realtimeSubscribed=true donc realtime OK
```

Le bon test est :

```js
ImmatBus.getJournal()
```

et la recherche :

```text
CALL_RECEIVED
```

---

## 9. Matrice critique des hypothèses

| Hypothèse | Explique le blocage du 2e appel | Explique l'absence de popup du 1er appel | Confiance actuelle |
|---|---:|---:|---:|
| HYP-001 pending expiré en DB | Oui | Non / indirectement | Très haute |
| HYP-002 anti-doublon sans expires_at | Oui | Non | Haute |
| HYP-003 UI expired ≠ DB pending | Oui | Partiellement | Haute |
| HYP-004 mauvais receiver_id | Possible | Oui | Moyenne, affaiblie par `Appel reçu · expired` |
| HYP-005 rupture ImmatOrganism → ImmatBus → CallScreen | Non | Oui | Moyenne |
| HYP-006 événement connu mais popup ratée | Non | Oui | Moyenne à haute |
| HYP-007 mobile / arrière-plan / suspension | Non | Oui | Moyenne |
| HYP-008 filtre realtime trop strict | Non | Oui | Moyenne |
| HYP-009 historique ≠ source live | Possible | Oui | Faible à moyenne |

---

## 10. Nouvelle consigne de diagnostic

Ne plus traiter le problème comme un bug unique.

Le découper explicitement :

```text
CAUSE RACINE A — pourquoi le nouvel appel est bloqué ?
CAUSE RACINE B — pourquoi B n'a pas vu de popup live ?
```

Ordre recommandé :

```text
1. Résoudre / confirmer CAUSE A par SQL : pending expiré + contrainte.
2. Après correction ou infirmation, refaire un test réel A → B.
3. Si B ne voit toujours pas de popup, ouvrir CAUSE B : realtime → CALL_RECEIVED → CallScreen.
4. Audio seulement après popup visuelle validée.
```

---

## 11. Tests complémentaires à demander après SQL

### Test live B au premier plan

Avant l'appel :

```js
CallManager.getRuntimeState()
ImmatBus.getJournal()
CallScreen.getState()
```

Puis A lance l'appel pendant que B reste :

```text
écran allumé
app au premier plan
même URL testée
connexion réseau stable
```

Après appel :

```js
ImmatBus.getJournal()
CallScreen.getState()
ImmatCallsRuntimeDiagnostics.run()
```

Résultat attendu si realtime live fonctionne :

```text
CALL_RECEIVED présent
CallScreen.mode = incoming
popup visible
```

### Test historique / source

Identifier le code qui affiche :

```text
Appel reçu · expired
Appel émis · expired
```

Question :

```text
Cette ligne vient-elle directement de call_requests ou d'une projection InteractionEngine/messages ?
```

---

## 12. Conclusion critique actuelle

Le scénario le plus probable n'est peut-être pas un seul bug, mais deux bugs successifs :

```text
BUG A : les appels expirés restent pending en DB et bloquent les nouveaux appels.
BUG B : la popup live côté B n'apparaît pas même si l'appel finit par être historisé.
```

HYP-001/HYP-002 doivent rester la priorité car elles bloquent les nouveaux essais propres.

Mais Claude doit garder en tête qu'après correction DB, il faudra refaire un vrai test live pour confirmer ou infirmer HYP-006/HYP-005.

---

## 13. Phrase de reprise pour Claude

```text
Ne t'arrête pas à HYP-001 si elle est confirmée.
HYP-001 explique le blocage du rappel, mais pas forcément l'absence de popup initiale.
Après preuve SQL et correction éventuelle, refaire un test live A→B au premier plan et vérifier CALL_RECEIVED / CallScreen.
```
