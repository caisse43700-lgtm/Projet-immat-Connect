# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

Ce fichier est le point d'entrée de reprise pour l'état de production `main`.

## ÉTAT PRODUCTION — 2026-06-10

```text
Dépôt                 : caisse43700-lgtm/Projet-immat-Connect
Branche production     : main — servie par GitHub Pages
URL terrain            : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
Produit actuel         : demande de contact temps réel, pas encore appel vocal WebRTC
Tests terrain          : deux iPhone/Safari, BZ-652-LL ↔ BE-521-MM
```

## Clarification produit

Le système actuel n'est pas encore un appel vocal type téléphone.

Il implémente :

```text
A demande un contact avec B
B reçoit une sonnerie / UI entrante
B accepte ou refuse
A et B voient l'état accepté
L'ouverture des messages doit être explicite via bouton Message
```

Le vrai appel vocal nécessitera une phase séparée WebRTC : micro, remote audio, mute, haut-parleur, raccrocher, signaling offer/answer/ICE.

## Correctifs production récents sur `main`

| Commit | Objet | Statut |
|---|---|---|
| `de35c060` | Supprime l'ouverture automatique conversation dans `calls.js` sur accepted | déployé |
| `a7f6d5f7` | `core/call-screen.js` : accepted doit afficher Message/Fermer au lieu de “conversation ouverte” | déployé |
| `f9088541` | Nettoie les anciens `pending` avant nouvel appel + retry 23505 | déployé |
| `ac53d3c` | Ajoute `docs/PROFESSIONAL_STABILIZATION_ROADMAP.md` | déployé |

## Constats terrain récents

### 1. Synchronisation acceptée fonctionne partiellement

Les deux téléphones ont atteint un état accepté, ce qui valide :

```text
Supabase Realtime actif
CALL_ACCEPTED circule
A et B reçoivent l'état accepté
```

### 2. Ancien wording / ancien comportement détecté

Avant `a7f6d5f7`, `main/core/call-screen.js` affichait :

```text
Contact accepté — conversation ouverte
```

et fermait l'overlay après 2 secondes. Ce comportement est contraire au périmètre actuel et a été corrigé.

### 3. Pending fantôme détecté

Guardian OBD a montré côté appelant :

```text
initialized = true
uidKnown = true
myPlate = BZ-652-LL
realtimeStatus = SUBSCRIBED
pendingCallId = null
hasPendingOutgoing = false
```

mais l'app affichait :

```text
Une demande est déjà en attente de réponse.
```

Interprétation : runtime local propre, mais ligne `call_requests.status='pending'` encore présente en DB. Mitigation appliquée : expirer les pending du même caller/receiver avant nouvel insert et retry après 23505.

### 4. Messages présents mais ouverture thread à vérifier

Guardian OBD a montré :

```text
conversationRowsCount = 1
threadBubblesCount = 201
```

Donc les données messages existent. Si l'ouverture par plaque échoue, auditer l'UI/panels/pointer-events plutôt que la donnée.

## Prochaine procédure terrain

Après propagation GitHub Pages, ouvrir sur les deux téléphones :

```text
https://caisse43700-lgtm.github.io/Projet-immat-Connect/?stabilize=f9088541
```

Puis :

1. Recharger une fois sur les deux téléphones.
2. Vérifier dans Guardian Dashboard :
   - `CallManager.loaded = true`
   - `initialized = true`
   - `uidKnown = true`
   - `myPlate` correct
   - `realtimeStatus = SUBSCRIBED`
   - `pendingCallId = null` avant appel
   - `callScreenMode = idle` avant appel
3. A appelle B.
4. B accepte.
5. Attendu :
   - A et B voient `Contact accepté`
   - pas de texte `conversation ouverte`
   - boutons `Message` / `Fermer` visibles
   - aucune ouverture automatique du thread
6. Tester ensuite :
   - rappel immédiat après accepted
   - refus
   - expiration
   - ouverture manuelle du thread via Message
   - ouverture manuelle du thread depuis liste Messages

## Définition de fini — phase demande de contact

```text
fresh reload
A appelle B
B accepte
A voit Contact accepté
B voit Contact accepté
Message thread ne s'ouvre pas automatiquement
Message ouvre le thread manuellement
Fermer ferme l'overlay
rappel immédiat fonctionne sans pending fantôme
refus fonctionne
expiration fonctionne
liste Messages ouvre encore le thread par plaque
Guardian Dashboard ne révèle aucun overlay bloquant
```

## Documents de référence

- `docs/PROFESSIONAL_STABILIZATION_ROADMAP.md` — roadmap professionnelle de stabilisation.
- `AGENTS.md` — panneau d'entrée IA.

## Invariants

```text
main = production GitHub Pages
ne pas confondre branche feature et environnement testé
pas d'ouverture automatique de messages sur accepted
pas de suppression DB destructive sans consentement
call_requests.pending doit toujours sortir vers accepted/refused/cancelled/expired
```
