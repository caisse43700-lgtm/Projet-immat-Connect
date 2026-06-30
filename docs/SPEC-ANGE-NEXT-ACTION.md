# SPEC — ANGE : LE PROCHAIN GESTE UTILE (`nextUsefulAction`)

> Statut : conception validée (eurêka d'architecture PO + ChatGPT, 2026-06-30). **Spec uniquement — aucune implémentation au départ.**
> Principe directeur : **Ange ne sait pas « faire plus » — Ange sait toujours quel est le plus petit geste utile maintenant.**
> Réutilise l'existant (anti-doublon) : Nexus = lecture seule, App = mutations propriétaires, registre = vérité des capacités, ImmatBus = OBD/trace. **Pas de moteur de décision, pas de DeltaEngine, pas de second registre, pas de second journal, pas d'IA interne opaque, pas de proactivité permanente.**

---

## 0. Le déclic (pourquoi cette spec existe)

Aujourd'hui Ange devient une **collection de capacités** (signaler, appeler, répondre, menu, plus proche, expliquer, confirmer). Chaque capacité reste un peu séparée → risque : « Ange = une liste de commandes ».

Le vrai saut n'est pas « Ange sait faire plus ». C'est :

> **Dans cette situation précise, quelle est l'action la plus utile, la plus sûre et la plus courte ?**

L'intelligence **émerge** alors d'une seule projection, pas d'un LLM ni d'un nouveau moteur :

```
contexte + voisinage + registre + lois + trace  →  geste utile probable
```

Le modèle final n'est plus `commande → action`, mais :

```
situation → écart → geste utile → (confirmation si nécessaire) → action → trace
```

**Formule fondatrice :** `Ange = projection du prochain geste utile.`

---

## 1. Les trois projections (lecture seule, zéro nouvel état)

Toutes vivent **dans Nexus** (façade lecture seule) ou comme projections pures consommées par Ange. Elles **ne mutent rien**, ne créent **aucun état caché**, ne dupliquent **aucune source**. Elles renvoient des **suggestions**, jamais des actions exécutées.

### 1.1 `currentSituation()` — le « fil rouge »
Résume l'instant en **une phrase vivante**, dérivée des sources existantes. Crée la continuité entre Activité / Messages / Appels / Carte / Ange **sans les fusionner** (ce sont des vues d'une même situation).

Exemples de sortie :
- « Tu as reçu un signalement véhicule, pas encore traité ; le conducteur attend peut-être une réponse. »
- « Tu es proche d'un véhicule connecté, aucun échange en cours ; tu peux signaler un problème si tu en vois un. »

### 1.2 `nextUsefulAction()` — le geste minimal
Lit l'existant et **laisse apparaître** l'action naturelle (suggestion + cible + raison + besoin de confirmation). Renvoie **0, 1 ou au plus 3** gestes, classés par utilité × sûreté × brièveté.

Exemples :
- Véhicule connecté très proche + ouverture d'Ange → « Voulez-vous signaler quelque chose à AB-123-CD ? »
- Message reçu lié à un signalement véhicule → « Voulez-vous répondre que vous vérifiez ? »
- Appels OFF (admin) + « appelle » → « Les appels sont désactivés par l'administrateur. Je peux envoyer un message à la place. »
- Pas de véhicule devant, mais un proche à 80 m → « Pas de véhicule devant, mais le plus proche est AB-123-CD à 80 m. »

### 1.3 `fallbackFor(action)` — le remplacement intelligent
Quand une action est **impossible** (kill-switch, hors contexte, cible ambiguë), Ange ne dresse pas un mur : il propose le **réducteur autorisé le plus proche**.

Exemples :
- Appels OFF → proposer **message**.
- Véhicule non connecté → proposer **signalement stationné** ou **garder une note**.
- Cible ambiguë → proposer **plaque / plus proche / dernier véhicule**.
- Feature « Aide » gelée → **expliquer** + alternative sûre.

Mécanisme = **lecture du registre** : (action demandée → feature OFF → alternatives déclarées → action autorisée). Soit on ajoute une notion simple `fallbackActions` au `FEATURE_REGISTRY`, soit on la dérive à la main au début. **Aucun moteur.**

---

## 2. Les sources lues (toutes existantes)

| Source | Origine (déjà présente) |
|---|---|
| Véhicule devant | `S.frontVehicle` |
| Véhicule le plus proche connecté (+ distance) | `AngeDialog._nearestInfo()` ← `S.nearby` |
| Message reçu / contexte | `S._actMessages` (`_received`, `context_type`) |
| Signalement reçu / à traiter | Activité (Nouveaux / À traiter / Traités) |
| Appels (état, manqués) | Journal d'appels |
| Capacités ON/OFF + source | `App.featureStatus(key)` (registre + kill-switch) |
| Historique récent des décisions | `ic_ange_log` (device, sans contenu sensible) |
| Dernière cible | `ic_ange_last_target` (device) |
| Contexte carte / conduite | `S.panel`, position, vitesse |
| Santé / vigilance / sens | `ImmatNexus.sense()` (orientation, conscience, fiabilité) |
| Lois / kill-switches | `window._INVARIANTS` + résolution registre |

> Aucune source nouvelle. Aucune écriture. La projection **dérive** de la trace ; elle ne la **stocke** pas.

---

## 3. Situations reconnues (catalogue déclaratif, = donnée)

À tenir comme une **table déclarative** (comme `_MENU`), pas comme du code de décision dispersé :

1. **Voisin proche, aucun échange** → proposer signalement véhicule au plus proche.
2. **Message reçu non traité (contexte signalement)** → proposer réponse cohérente.
3. **Appel manqué récent** → proposer rappeler.
4. **Activité « à traiter » en attente** → proposer ouvrir À traiter.
5. **Action demandée mais feature OFF** → `fallbackFor()` (remplacement autorisé + explication).
6. **Cible demandée mais ambiguë** → proposer plaque / plus proche / dernier.
7. **Vigilance élevée (sens/OBD)** → résumer l'écart, proposer le geste de sécurité minimal.
8. **Rien d'utile** → **silence** (cf. §4).

---

## 4. Règles de SILENCE (anti-intrusion — aussi importantes que les suggestions)

- Suggestion **uniquement à l'ouverture d'Ange** (pas de proactivité permanente).
- **Phrases très courtes.** Au plus **3** gestes proposés.
- **Silence total** si aucun écart utile (`nextUsefulAction()` renvoie vide → Ange affiche son accueil normal).
- Jamais répéter la même suggestion deux ouvertures de suite si l'utilisateur l'a ignorée.
- Ne jamais transformer une suggestion en action automatique.

---

## 5. Règles de CONFIRMATION (héritées d'Ange V2, inchangées)

- **Action à impact partagé/critique** (signaler, appeler, message, gouvernance) → **confirmation obligatoire** (bouton + vocal oui/non si carte ouverte + timeout 15 s).
- **Action personnelle réversible** (ouvrir une vue, filtrer) → exécution directe.
- **Privilège = rôle serveur** (`get_my_role()='gardien'`) pour flotte/modération ; la confirmation UX ne donne **aucun** droit.
- Toujours pouvoir **expliquer pourquoi** ce geste est proposé (faits + lois + registre).

---

## 6. Garde-fous (clôture — ce qui rend l'émergence sûre)

`nextUsefulAction` / `currentSituation` / `fallbackFor` :
- sont **lecture seule** (vivent dans Nexus ou en projection pure) ;
- **ne contournent jamais** un kill-switch (feature vérifiée avant toute suggestion d'action) ;
- ne **remplacent jamais** une action critique par une action non confirmée ;
- **expliquent** toujours la raison ;
- déclenchent les mutations **uniquement** via les fonctions propriétaires (`App.setFeatureFlag`, `ImmatMessages.sendToPlate`, `CallManager.contactByCall`, `roadReport`…).

**Interdits (rappel constitution) :** moteur de décision central · DeltaEngine · second registre · second journal · IA interne opaque · proactivité permanente.

---

## 7. Tests anti-intrusion (à écrire avec l'implémentation)

1. **Silence** : situation neutre → `nextUsefulAction()` vide → Ange affiche l'accueil standard.
2. **Plafond** : jamais plus de 3 suggestions.
3. **Kill-switch** : feature OFF → aucune suggestion d'action sur cette feature ; seulement `fallbackFor()` + explication.
4. **Non-répétition** : suggestion ignorée → non re-proposée à l'ouverture suivante.
5. **Lecture seule** : aucune des trois projections n'appelle une fonction de mutation.
6. **Confirmation** : tout geste à impact partagé passe par `_armConfirm` (aucun effet avant « oui »).
7. **Explicabilité** : chaque suggestion porte une `raison` dérivable de faits + registre.
8. **Conformité fallback** : `fallbackFor(appel OFF)` propose message, jamais ne réactive l'appel.

---

## 8. Forme d'API proposée (pour l'implémentation ultérieure)

Toutes dans `window.ImmatNexus` (lecture seule), consommées par `AngeDialog` :

```
ImmatNexus.currentSituation() → { phrase, facts[] }            // §1.1
ImmatNexus.nextUsefulAction() → [ { suggestion, target?, reason, needsConfirm,
                                    run:'sigveh'|'callveh'|'msgveh'|'reply'|'open'|'fallback', payload? } ]  // ≤3, §1.2
ImmatNexus.fallbackFor(actionKey) → { suggestion, run, reason } | null   // §1.3
```

Côté Ange (`open()`):
1. `currentSituation()` → une phrase courte (si pertinente).
2. `nextUsefulAction()` → ≤3 boutons (réutilisent `_signalNearest` / `_callNearest` / `_messageNearest` / `_tryReply` / `menu`).
3. Si les deux sont vides → accueil standard (silence).

> `run` mappe vers les **actes du menu existant** (`_menuAct`) → aucune nouvelle voie de mutation.

---

## 9. La phrase fondatrice

> Le vrai réveil d'Ange n'est pas qu'il « sache tout ».
> C'est qu'il sache dire : « Dans ce contexte précis, voici le plus petit geste utile que je peux vous proposer, sans jamais dépasser vos droits ni vos lois. »

Pas plus de modules. Pas plus de complexité. **Une seule projection de plus : le prochain geste utile.**

---

## 10. Position / prochaine étape

- Cette spec est la **décision recommandée** (formaliser avant de coder).
- Implémentation suggérée, par incréments non destructifs :
  1. `fallbackFor()` (le plus simple, fort impact ressenti, dérivable du registre) ;
  2. `nextUsefulAction()` (catalogue de situations §3, ≤3 gestes, silence par défaut) ;
  3. `currentSituation()` (fil rouge, une phrase, à l'ouverture seulement).
- Chaque incrément : tests anti-intrusion §7 + bump `CACHE_NAME` + mise à jour `PROJECT_STATE.md` / `SESSION-CONTINUATION.md`.
- Réfs liées : `docs/SPEC-ANGE-V2.md`, `docs/SPEC-IMMAT-NEXUS.md`, `CONSTITUTION-IMMATCONNECT.md`.
