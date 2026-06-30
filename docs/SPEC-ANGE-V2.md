# SPEC — ANGE V2 (copilote local-first, déterministe, explicable, sûr)

> Statut : conception validée par le PO (questions Ange V2). **Spec uniquement — aucune implémentation.**
> Principe directeur : **comprendre l'intention → décider → expliquer → agir si sûr, confirmer sinon.**
> Réutilise l'existant (anti-doublon) : Nexus = lecture seule, App = mutations propriétaires, registre = vérité des capacités, ImmatBus = OBD. Pas de second cerveau, pas de second registre, pas de LLM source de vérité.

---

## 1. Principes définitifs (les Lois d'Ange)

1. **Comprendre avant d'agir.** Ange reconnaît une *intention*, pas seulement des mots-clés.
2. **Expliquer avant d'exécuter** (et toujours pouvoir répondre « qu'ai-je compris ? »).
3. **Protéger sans bloquer.** Ange ne dit jamais « tu n'as pas le droit » par défaut ; il dit « ai-je bien compris ? » et n'empêche que l'illégitime (rôle/serveur/kill-switch).
4. **Ne jamais contourner une loi système** (kill-switch, RLS, invariants).
5. **Ne jamais inventer l'état de l'app** : tout état système vient du local (Nexus/registre/organisme).
6. **Apprendre les habitudes sans prendre le pouvoir** (vocabulaire/préférences device-only).
7. **Une seule question utile** en cas d'ambiguïté — jamais un dialogue interminable.
8. **Confirmer toute action à impact partagé ou critique** ; exécuter direct le personnel réversible.
9. **Local-first** pour tout état système ; LLM = secours hors-sujet/rédaction seulement.
10. **Dire « je ne sais pas »** quand l'info manque (plutôt qu'inventer).

**Vocabulaire :**
- *Commande* = formulation impérative (« désactive les appels »).
- *Intention* = le but reconnu, indépendamment des mots (« réactiver appels » = activer feature `appels`).
- *Action* = l'opération concrète exécutée par une **fonction propriétaire** (setFeatureFlag, sendToPlate, call…).
- *Décision* = le choix d'Ange : **exécuter / confirmer / clarifier / refuser**.

---

## 2. Gardien-utilisateur vs gardien-admin

- **Gardien-utilisateur** = souverain sur **ses propres** actions (envoyer un signalement, appeler, messages, ses réglages perso). → confirmation **UX** suffit, jamais de blocage de principe.
- **Gardien-admin** = rôle **serveur** (`get_my_role()='gardien'`, app_metadata) requis pour **flotte / modération / gouvernance**. → **validation serveur** (RPC SECURITY DEFINER) en plus de la confirmation UX.
- **Distinction nette** : la confirmation UX = « ai-je bien compris ? » (vérification), elle **n'accorde aucun privilège**. Le privilège vient **uniquement** du rôle serveur.
- Si l'utilisateur demande « pourquoi je ne peux pas ? » → Ange explique : « C'est une action d'administration de la flotte, réservée au rôle Gardien côté serveur. »

---

## 3. Cycle de décision (gardé simple)

`comprendre l'intention → cible → action → confiance → risque → réversibilité → DÉCISION (exécuter/confirmer/clarifier/refuser) → expliquer → apprendre (préférences autorisées seulement)`

Le cycle est **complet**. Données alimentant chaque étape (toutes déjà disponibles) :
- intention/cible/action : table d'intentions déclarative + `ImmatNexus.featureKeyFromText` + `S.frontVehicle`.
- confiance : netteté du match (intent regex + cible résolue sans ambiguïté).
- risque/réversibilité : **attribut figé par type d'action** (table §4/§5), pas calculé à la volée.
- disponibilité : `App.featureStatus(key)` (registre/kill-switch).
- droits : `S.isGardien` (UX) + RPC serveur (privilège).

---

## 4. Matrice confiance / risque / réversibilité → comportement

| Risque | Réversibilité | Confiance élevée | Confiance moyenne | Confiance faible |
|---|---|---|---|---|
| **Personnel** | réversible | **Exécute** | Exécute | Clarifie |
| **Personnel** | difficile/irréversible | Confirme | Confirme | Clarifie |
| **Partagé** (autre conducteur) | — | **Confirme** | Confirme | Clarifie |
| **Critique** (flotte/modération) | — | Confirme **+ rôle serveur** | Confirme + rôle | Clarifie/Refuse |
| toute | toute, **feature OFF** | **Refuse** (explique le kill-switch) | Refuse | Refuse |
| Critique sans droit serveur | — | **Refuse** (explique rôle) | Refuse | Refuse |

Règles d'équilibre :
- **Ne pas sur-confirmer** : le personnel réversible (réglages perso, navigation, lecture) s'exécute direct.
- **Ne pas exécuter trop vite** : tout ce qui touche **un autre utilisateur** ou **la flotte** = confirmation obligatoire, sans exception.

---

## 5. Actions sensibles (table de référence)

| Action | Confirmation | Risque | Réversible | Rollback | Droit | Message vocal type |
|---|---|---|---|---|---|---|
| Signaler un véhicule | **Oui** | partagé | non (parti) | non | utilisateur | « Je vais signaler à AB-123-CD : pneu dégonflé. Dis *oui* pour envoyer. » |
| Appeler un véhicule | **Oui** | partagé | n/a | n/a | utilisateur | « J'appelle AB-123-CD ? Dis *appelle*. » |
| Envoyer un message libre | **Oui** | partagé | non | non | utilisateur | « J'envoie « … » à AB-123-CD ? » |
| Clôturer une demande d'aide | **Oui** | partagé | oui (rouvrir) | oui | utilisateur | « Je clôture ta demande d'aide ? » |
| Annuler une demande | **Oui** | personnel | oui | oui | utilisateur | « J'annule ta demande ? » |
| Supprimer / masquer | **Oui** | personnel | oui (restaurer) | oui | utilisateur | « Je masque cet élément ? Tu pourras le restaurer. » |
| Modifier un réglage **perso** | **Non** (direct) | personnel | oui | oui | utilisateur | « C'est fait. » |
| Activer/désactiver une **fonctionnalité flotte** | **Oui** | critique | oui | oui | **admin serveur** | « Je désactive *Appels* pour toute la flotte ? » |
| Action de **modération** (suspendre) | **Oui** | critique | oui | oui | **admin serveur** | « Je suspends ce compte ? » |
| Action **flotte** | **Oui** | critique | oui | oui | **admin serveur** | idem |

---

## 6. Protocole de confirmation vocale

- **Forme** : Ange **répète exactement** l'action (cible + contenu) puis : « Dis **oui** pour envoyer, **non** pour annuler. » → c'est « **ai-je bien compris ?** », jamais « ai-je le droit ? ».
- **Validation** : `oui, confirme, envoie, vas-y, ok, appelle` (selon action).
- **Annulation** : `non, annule, stop, attends, laisse`.
- **Correction** : « non, <X> » → on **re-parse X** (nouveau motif ou nouvelle cible) et on re-prépare une confirmation. Ex. « non, portes ouvertes » → motif = Portes ouvertes ; « non, l'autre véhicule » → re-demande la cible.
- **Anti faux-positif** (« oui » entendu dans une conversation) : Ange **n'écoute pas en continu**. La validation vocale n'est prise en compte **que** pendant qu'une **carte de confirmation est ouverte** et **dans le délai**. Sinon, bouton **Envoyer** requis. (Pas de wake-word permanent — impossible en PWA iOS de toute façon.)
- **Délai** : **15 s** sans réponse → auto-annulation (« J'annule, tu n'as rien confirmé. »).
- **Pas de réponse** → annulation (jamais d'exécution par défaut).
- Confirmations **distinctes par type** (texte du message adapté) mais **même mécanisme**.

---

## 7. Local-first / Nexus / LLM

- Ange appelle **toujours** la résolution locale **avant** le LLM, dans l'ordre : **action** (intentions exécutables) → **Nexus.ask** (état système) → **LLM fallback**.
- **Nexus (lecture seule)** traite : statut d'une fonctionnalité, pourquoi bloqué, état organisme, anomalies/violations, événements récents, lois, danger, fiabilité, suspension, résumé, « que faire ».
- **LLM** : uniquement **hors-sujet** ou **aide rédactionnelle non critique**. **Interdit comme source de vérité système** (il ne reçoit aucun pouvoir d'action, et l'app indique « réponse générale » pour le fallback).
- Nexus **lit** (registre, organisme, bus, invariants, S._*) et **n'écrit jamais** (sauf émettre un finding d'audit `source:'nexus'`). Garde-fou anti-doublon : Nexus n'a ni journal propre, ni registre propre, ni décisions métier.

---

## 8. Apprentissage (device-only, sûr)

- **Autorisé** : vocabulaire du gardien (alias → clé), formulations habituelles, motifs fréquents, préférence d'affichage. Stockage **device** (`localStorage ic_ange_learn`), jamais `fleet`.
- **Interdit** : supprimer une confirmation d'action **sensible**, contourner un kill-switch/loi, modifier une règle métier, escalader un rôle.
- **Mode rapide** possible **uniquement** pour les actions **personnelles réversibles** (jamais partagé/critique).
- **Réinitialisation** : bouton « Réinitialiser ce qu'Ange a appris » (efface `ic_ange_learn`).
- Sécurité : l'apprentissage ne touche **que** la reconnaissance/le confort, **jamais** la grille de décision §4/§5.

---

## 9. Explicabilité — format standard

Réponse compacte (et extensible sur « pourquoi ? ») :

```
J'ai compris : <intention> (cible : <cible>).
→ <décision : je fais / je confirme / je clarifie / je refuse>
Parce que : <raison courte : registre / loi / organisme / événement / droit>
```

- En conduite : 1 ligne max. À l'arrêt + « pourquoi ? » : on détaille (règle/loi concernée, qui a désactivé, événement OBD récent).
- Origine d'un blocage toujours nommée : **utilisateur / administrateur / flotte / défaut** (via `featureStatus.by`).

---

## 10. Garde-fous sécurité

- Ange ne déclenche **jamais** une action touchant autrui **sans confirmation**.
- Ange ne modifie **jamais** la gouvernance flotte / modération **sans rôle serveur** (la RPC refuse côté serveur même si l'UX laissait passer).
- Ange ne **contourne jamais** un kill-switch : avant toute action, `featureStatus(key)` ; si OFF → refus + explication.
- Aucun **effet de bord avant confirmation** : `prepare()` ne fait que construire une action **en attente** + afficher la carte ; `execute()` seul mute.
- Registre indisponible → Ange **ne suppose pas** : « Je ne peux pas vérifier l'état de cette fonction, réessaie. »
- LLM **sans aucun pouvoir d'action**.

---

## 11. Contexte de conduite

- Détection : `S.driveMode` / vitesse (`S.lastSpeed`) / `S._brainState.isDriving`.
- En conduite : phrases **courtes**, **voix** privilégiée, **oui/non** plutôt que menus, moins de tactile, réponses non urgentes **reportées** (« Je te montre ça à l'arrêt »). Actions autorisées en conduite : signaler véhicule, appeler, répondre oui/non. Interdit : éditer un long texte, navigation profonde dans le Dashboard.

---

## 12. Erreurs & ambiguïtés (1 seule question utile)

| Cas | Réponse d'Ange |
|---|---|
| Plaque ambiguë / partielle | « Quelle plaque exactement ? » (ou propose la plus probable devant) |
| Aucun véhicule devant | « Aucun véhicule connecté devant. Donne-moi la plaque. » |
| Plusieurs véhicules | propose les **2-3** plus proches (liste courte) |
| Motif inconnu | boutons motifs (pneu/portes/feux…) |
| Dictée incertaine | répète ce qu'il a compris + « c'est bien ça ? » |
| Réseau coupé | « Pas de réseau, j'enverrai dès que possible / réessaie. » |
| Feature OFF | refus + qui l'a désactivée |
| Ange ne sait pas | « Je ne sais pas répondre à ça. » (pas d'invention) |

---

## 13. Messages / Appels / Activité (séparation stricte)

- **Activité** = événements métier (un signalement préparé par Ange y va, `context_type:'vehicle_report'`).
- **Messages** = conversations humaines (phrase libre).
- **Appels** = vocal (uniquement via CallManager).
- Pas de double pastille : un signalement compte dans Activité, pas dans Messages. Une réponse conversationnelle n'apparaît pas dans Activité.

---

## 14. Journalisation / audit

- Journaliser (device, `ic_ange_log`, ring ~50, ~7 j) : intention reconnue, action préparée, confirmation, annulation, refus, fallback LLM. **Pas** de contenu sensible (pas le texte privé), juste type+cible+résultat.
- Sert à l'explicabilité (« pourquoi tu as proposé ça ») et à l'amélioration, **sans surveillance** (local, effaçable).

---

## 15. Architecture (anti-doublon)

- **Pas de nouveau module/global.** La logique d'intention vit dans **AngeDialog** (déjà le cas : `_trySignal`, `_tryAction`). On la **structure** en une **table déclarative** d'intentions (interne à AngeDialog), pas un « AngeIntentEngine » concurrent.
- **Nexus** : reste lecture seule ; fournit les **helpers de résolution** (`featureKeyFromText`, lecture `featureStatus`) — ne décide rien, n'agit pas.
- **App / modules métier** : propriétaires des **mutations** (`setFeatureFlag`, `ImmatMessages.sendToPlate`, `CallManager.contactByCall`).

**Formes de données :**
```
Intention   = { intent, target, params, confidence }
ActionPréparée (pending) = { type, label, sensitive, run: ()=>Promise, explain }
Confirmation = { pending, timeoutId, openedAt }   // aucun effet tant que non confirmée
```

---

## 16. Matrice de tests (obligatoire par intention)

Pour chaque intention (statut feature, why-blocked, état organisme, signalement véhicule, appel véhicule, gouvernance) :

| Test | Attendu |
|---|---|
| Compréhension correcte | bonne intention + bonne cible |
| Ambiguïté | 1 question de clarification |
| Confirmation OUI | action exécutée une fois |
| Confirmation NON | aucune action |
| Correction vocale | re-préparation correcte |
| Timeout 15 s | auto-annulation |
| Feature OFF | refus + origine |
| Cible absente | demande la plaque |
| Mode conduite | réponse courte/vocale |
| Fallback | hors-sujet → LLM ; jamais d'état système inventé |
| Sécurité | action flotte sans rôle serveur → refus serveur |
| Pas d'effet avant confirmation | `prepare` ne mute pas |

---

## 17. Plan d'implémentation NON destructif

| Étape | Contenu | Fichiers | Risque | Rollback | iOS |
|---|---|---|---|---|---|
| 0 | **Spec** (ce doc) | docs/ | nul | — | — |
| 1 | Table d'intentions déclarative (refactor de `_trySignal`/`_tryAction`, comportement identique) | index.html (AngeDialog) | faible | revert | ok |
| 2 | **Carte de confirmation** générique (réutilise le pattern actuel) + timeout 15 s + ligne d'explication | index.html | faible | revert | ok |
| 3 | **Confirmation vocale** (oui/non/correction) liée à la carte ouverte | index.html | faible | revert | ok |
| 4 | Signalement véhicule **migré** sur la table (déjà livré v392) | index.html | faible | revert | ok |
| 5 | **Appel véhicule** (« appelle le véhicule devant ») → CallManager (gardé `appels`) | index.html | faible | revert | ok |
| 6 | Apprentissage léger (alias device) + reset | index.html | faible | revert | ok |
| 7 | Audit `ic_ange_log` | index.html | faible | revert | ok |
| 8 | Tests (harnais Node) | scratch | nul | — | — |

Aucune étape ne casse le flux actuel (tout est additif/structurant ; les détections existantes restent fonctionnelles).

---

## 18. Décisions à trancher par le PO

1. **Confirmation vocale** : activée par défaut, ou bouton d'abord puis vocal en option ? (reco : **bouton + vocal pendant la carte ouverte**, le plus sûr.)
2. **Mode rapide** (moins de confirmations) : l'autoriser pour le **personnel réversible** seulement ? (reco : oui.)
3. **Appel véhicule** : à inclure en V2 (étape 5) ? (reco : oui, faible risque.)
4. Délai de confirmation : **15 s** ok ?
5. Proactivité (« le coffre semble ouvert, prévenir ? ») : V2 ou plus tard ? (reco : **plus tard** — nécessite détection fiable ; risque d'intrusion.)
