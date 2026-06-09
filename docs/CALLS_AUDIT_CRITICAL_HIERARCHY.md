# Audit critique hiérarchisé — appels ImmatConnect

Branche : `claude/immatconnect-pro-app-dEKGR`

Ce document complète `docs/CALLS_APP_OPEN_AUDIT_AUTOTEST_ROADMAP.md` avec une hiérarchie par catégorie, des questions nouvelles, des réponses probables et une validation précise de ce qui doit réellement être corrigé avant merge.

---

## 1. Hiérarchie des priorités

### P0 — Bloquant merge

Ces points doivent être corrigés ou explicitement prouvés avant merge :

1. `CallScreen.showIncoming()` déclenche bien `AudioManager.playIncomingRingtone()`.
2. `CallScreen.showOutgoing()` déclenche bien `AudioManager.playOutgoingTone()` ou choix volontaire documenté de ne pas sonner côté sortant.
3. `CallScreen.hide()` déclenche bien `AudioManager.stopCallAudio()`.
4. Le son ne reste jamais bloqué après accepter/refuser/annuler/expiration.
5. `core/audio-manager.js` et `core/call-screen.js` sont chargés dans le bon ordre et disponibles en runtime.
6. `service-worker.js` ne laisse pas iOS servir une ancienne version incompatible.
7. Le test C1 plaque sans tirets est validé ou couvert par preuve directe.

### P1 — Important avant validation terrain

1. `AudioManager.getRuntimeState()` expose assez d'informations pour comprendre un échec iOS.
2. `CallManager.getRuntimeState()` expose l'état realtime, recovery et UI.
3. `CallScreen.getState()` suffit à savoir si l'écran est idle/incoming/outgoing/missed.
4. Le recovery entrant ne déclenche pas double écran/double sonnerie.
5. Les textes UI ne promettent pas une vraie VoIP si l'app ne fait qu'une demande de contact.

### P2 — Dette UX à traiter juste après

1. Harmoniser “Appel”, “Contact”, “Demande de contact audio”.
2. Revoir les boutons “Haut-parleur” et “Sourdine” si absence de vraie VoIP.
3. Éviter “En communication” si aucun flux audio réel entre conducteurs.
4. Route ne doit pas proposer Appel/Msg selon le référentiel.
5. Ajouter réponses rapides liées à l'appel : “Je te rappelle”, “Écris-moi”, etc.

### P3 — Chantier futur séparé

1. Push notifications écran verrouillé/app fermée.
2. Clés VAPID.
3. Table `push_subscriptions`.
4. Edge Function `send-push`.
5. Handler `push` dans Service Worker.

---

## 2. Catégorie A — Audio / Sonnerie

### Question A1 — La sonnerie existe-t-elle vraiment ?

Réponse : oui, le moteur existe dans `AudioManager`.

Mais cela ne suffit pas. Un moteur audio inutilisé ne prouve pas que l'utilisateur entendra quelque chose.

Validation requise :

```js
AudioManager.getRuntimeState()
```

Doit prouver :

- module chargé ;
- Web Audio supporté ;
- sons activés ;
- dernier état audio lisible.

### Question A2 — La sonnerie est-elle appelée au moment exact de l'appel entrant ?

Réponse probable actuelle : à vérifier/corriger.

Condition d'acceptation :

```js
CallScreen.showIncoming()
  -> AudioManager.playIncomingRingtone()
```

Si absent : correction P0.

### Question A3 — La sonnerie peut-elle être bloquée par iOS ?

Réponse : oui.

Mais ce n'est pas une excuse pour ne pas la brancher. Il faut distinguer :

- `not_called` : bug code ;
- `called_but_blocked` : restriction iOS ;
- `called_and_playing` : OK.

OBD attendu :

```text
lastAudioRequest = incoming
lastAudioResult = started | blocked | failed | skipped_sounds_disabled
lastAudioError = null ou message
webAudioContextState = running | suspended | closed
```

### Question A4 — Le son s'arrête-t-il dans tous les chemins ?

Réponse à valider.

Chemins :

- B accepte ;
- B refuse ;
- A annule ;
- appel expire ;
- utilisateur ferme CallScreen ;
- navigation Messages ;
- page passe hidden.

Correction recommandée : centraliser l'arrêt dans `CallScreen.hide()`.

---

## 3. Catégorie B — CallScreen / UI appel

### Question B1 — CallScreen est-il la source UI principale ?

Réponse : oui si `window.CallScreen.showIncoming` existe. Dans ce cas `calls.js` délègue et ne doit pas afficher la popup legacy.

Implication : tous les comportements UX importants doivent être dans `CallScreen` : son, état, boutons, arrêt audio.

### Question B2 — Que doit afficher B ?

Réponse cible :

```text
Demande d'appel entrant
Plaque A
[Refuser] [Décrocher]
[Message] optionnel
Texte confidentialité : numéro non partagé
```

Éviter de faire croire à un vrai appel téléphonique si aucune VoIP n'existe.

### Question B3 — Que doit afficher A ?

Réponse cible :

```text
Demande envoyée à B
En attente...
[Raccrocher/Annuler]
[Message]
```

Si B accepte : ouvrir Messages ou afficher `Contact accepté`, pas forcément `En communication`.

### Question B4 — “En communication” est-il correct ?

Réponse : probablement non en Phase 1.

Si l'application n'ouvre pas un vrai canal audio, ce texte est trompeur. Préférer :

```text
Contact accepté
Conversation ouverte
```

### Question B5 — Haut-parleur / Sourdine sont-ils pertinents ?

Réponse : seulement si on assume qu'ils contrôlent la sonnerie, pas un appel vocal.

Options :

1. masquer en Phase 1 ;
2. renommer : `Sonnerie` / `Silence` ;
3. garder mais documenter comme dette UX.

---

## 4. Catégorie C — CallManager / realtime / recovery

### Question C1 — L'appel entrant dépend-il uniquement du realtime ?

Réponse : non, et c'est bien. Le recovery entrant existe.

À maintenir absolument : realtime est un accélérateur, pas la source unique.

### Question C2 — Le polling recovery peut-il créer un doublon ?

Réponse : oui théoriquement, mais le `Set` `_seenIncomingCallIds` doit empêcher.

Validation : le `Set` doit être consulté avant l'affichage et avant l'audio.

### Question C3 — L'appel manqué est-il enregistré une seule fois ?

Risque : double `CALL_MISSED` si plusieurs timers/recovery.

Réponse attendue : `_missedCallIds` protège.

À vérifier : tous les chemins de missed passent par le même garde-fou.

### Question C4 — Que se passe-t-il si `expires_at` est absent ?

Réponse à définir.

Comportement recommandé : fallback 30 secondes depuis `created_at`, ou refuser d'afficher avec trace OBD.

Ne pas laisser un appel pending rester indéfiniment en UI.

### Question C5 — Que se passe-t-il si l'horloge téléphone est décalée ?

Risque : expiration immédiate ou trop tardive.

Réponse : faible probabilité, mais OBD doit logger :

```text
clientNow
expiresAt
remainingMs
createdAt
```

---

## 5. Catégorie D — Plaques / résolution utilisateur

### Question D1 — Le fallback sans tirets couvre-t-il tous les cas ?

Réponse : il couvre probablement le format français courant `BE521MM -> BE-521-MM`.

À tester :

- `BE521MM` ;
- `BE-521-MM` ;
- espaces ;
- minuscules.

### Question D2 — Faut-il normaliser toutes les plaques avant requête DB ?

Réponse : oui à terme.

Proposition : une fonction unique :

```js
normalizePlateForLookup(input) -> [raw, dashed, compact]
```

Puis essayer les variantes autorisées.

### Question D3 — Le message “Conducteur introuvable” doit-il être plus diagnostique ?

Réponse : oui en OBD, non pour l'utilisateur.

Utilisateur :

```text
Conducteur introuvable.
```

OBD :

```text
lookupPlateRaw
lookupPlateDashed
receiverIdFound
profilesError
```

---

## 6. Catégorie E — Service Worker / cache iOS

### Question E1 — Les nouveaux fichiers sont-ils dans le cache critique ?

Réponse à valider.

Obligatoire si on veut éviter incohérence iOS :

```js
'./core/audio-manager.js',
'./core/call-screen.js',
```

### Question E2 — `CACHE_NAME` a-t-il changé ?

Réponse attendue : oui après ajout/modification de fichiers critiques.

Sans changement, Safari peut garder des versions mixtes.

### Question E3 — L'utilisateur voit-il la bannière de mise à jour ?

Réponse à tester.

Si non, l'utilisateur peut tester une ancienne version et croire que le fix ne marche pas.

---

## 7. Catégorie F — OBD / Autotest

### Question F1 — L'autotest doit-il être statique ou runtime ?

Réponse : les deux.

Statique : empêche d'oublier un branchement.
Runtime : prouve l'état réel dans Safari/iPhone.

### Question F2 — Que doit bloquer l'autotest statique ?

Bloquer si :

- `CallScreen.showIncoming` ne contient pas `playIncomingRingtone` ;
- `CallScreen.showOutgoing` ne contient pas `playOutgoingTone` ;
- `CallScreen.hide` ne contient pas `stopCallAudio` ;
- `calls.js` ne contient pas recovery entrant ;
- SW ne contient pas les fichiers critiques.

### Question F3 — Que doit collecter OBD terrain ?

```js
{
  callManager: CallManager.getRuntimeState(),
  callScreen: CallScreen.getState(),
  audio: AudioManager.getRuntimeState(),
  busTail: ImmatBus.getJournal().slice(-20)
}
```

### Question F4 — Que doit prouver C2 ?

C2 ne doit pas seulement dire “j'entends / je n'entends pas”.

Il doit donner :

- CallScreen mode ;
- AudioManager state ;
- lastAudioResult ;
- iOS/Safari/PWA ou navigateur ;
- app premier plan ou non ;
- geste utilisateur fait ou non.

---

## 8. Catégorie G — Produit / sécurité / promesse utilisateur

### Question G1 — Est-ce un appel ou une demande de contact ?

Réponse produit : Phase 1 = demande de contact avec expérience visuelle d'appel.

Donc le wording doit éviter de promettre un vrai appel téléphonique.

### Question G2 — Le numéro est-il exposé ?

Réponse attendue : non.

Le numéro/contact réel ne doit pas apparaître avant acceptation explicite, et même après acceptation il faut clarifier la règle produit.

### Question G3 — Que doit faire “Décrocher” ?

Réponse : accepter la demande et ouvrir Messages ou conversation/context contact.

Si pas de VoIP, ne pas laisser l'utilisateur penser qu'il parle déjà.

### Question G4 — Que doit faire “Message” pendant appel entrant ?

Réponse : ouvrir la conversation avec une réponse rapide possible :

- Je te rappelle plus tard ;
- Je ne peux pas répondre ;
- Écris-moi ;
- Rappelle-moi quand tu peux.

Ce point peut être P2, pas bloquant P0.

---

## 9. Catégorie H — Dettes hors périmètre

### H1 — Push notifications hors ligne

Ne pas corriger maintenant dans cette branche sauf décision explicite.

### H2 — Route avec Appel/Msg

Dette UX importante, mais ne doit pas bloquer C1/C2 sauf si elle casse les tests.

### H3 — Vraie VoIP

Hors périmètre. Ne pas mettre des contrôles qui promettent une VoIP si elle n'existe pas.

---

## 10. Décision finale — ce qui est vraiment à corriger maintenant

### À corriger avant merge

- Brancher sonnerie entrante dans `CallScreen.showIncoming()`.
- Brancher tonalité sortante ou documenter son absence.
- Arrêter audio dans `CallScreen.hide()`.
- Vérifier/ajouter `audio-manager.js` + `call-screen.js` dans SW.
- Incrémenter `CACHE_NAME` si SW modifié.
- Ajouter ou lancer autotest statique.
- Mettre à jour `SESSION-CONTINUATION.md` avec preuves et limites.

### À tester terrain avant merge

- C1 : BZ-652-LL appelle BE-521-MM sans `Conducteur introuvable`.
- C2 : B reçoit appel sur iOS app ouverte, CallScreen visible, sonnerie ou OBD explique blocage.
- C3 : audio s'arrête après chaque action.

### À documenter mais pas bloquer

- Push offline.
- Route sans Appel/Msg.
- Wording complet Appel vs Contact.
- Quick replies appel.
- Masquage haut-parleur/sourdine.

---

## 11. Mini matrice de validation

| Catégorie | Question | Statut attendu |
|---|---|---|
| Audio | `showIncoming -> playIncomingRingtone` | P0 obligatoire |
| Audio | `hide -> stopCallAudio` | P0 obligatoire |
| UI | CallScreen visible entrant | déjà probable, re-tester |
| Recovery | pending entrant récupérable | présent, surveiller doublons |
| Plaque | sans tirets résolu | test C1 requis |
| SW | fichiers critiques cache | vérifier/corriger |
| OBD | runtime state complet | renforcer si besoin |
| Produit | pas de fausse promesse VoIP | P2/P1 selon wording actuel |
| Push | app fermée/écran verrouillé | hors scope |

---

## 12. Phrase de synthèse pour Claude

La branche est solide sur realtime/recovery et proche de l'objectif, mais elle ne doit pas être validée uniquement parce que la popup apparaît. L'objectif réel est : app ouverte, appel entrant visible, sonnerie correctement branchée ou blocage iOS expliqué par OBD, arrêt audio garanti, plaque sans tirets validée. Tout le reste — push hors ligne, vraie VoIP, route sans appel — doit être hiérarchisé comme dette ou chantier séparé.
