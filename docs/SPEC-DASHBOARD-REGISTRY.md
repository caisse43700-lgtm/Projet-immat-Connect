# SPEC — Registre de fonctionnalités (Dashboard Gardien V2)
## Étape « Spec registre » — documentation uniquement, aucun code applicatif

**Statut :** Spécification (2026-06-29). Découle de `docs/ADR-DASHBOARD-V2.md` (D22, figé).
**Périmètre :** définir la structure du registre, lister les fonctionnalités, établir le mapping complet flags → registre, et fixer pour chaque fonctionnalité `key / label / group / stage / scope / default / killSwitch`.
**Contrainte :** respecte INV-DASH-001 à 011 + les 20 points de vigilance de l'ADR. En particulier :
- **INV-DASH-008** — le registre est 100 % déclaratif (données seules, aucune logique).
- **INV-DASH-009** — une fonctionnalité = un seul chokepoint runtime officiel.

> Aucune ligne de code applicatif n'est écrite à cette étape. Ce document est la référence que l'étape 2 (introduction du registre en parallèle) implémentera à l'identique.

---

## 1. Structure d'une entrée du registre

Chaque fonctionnalité est **une entrée déclarative** :

```
Feature {
  key:            string    // identifiant stable, snake_case, immuable (clé de migration)
  label:          string    // libellé affiché (FR)
  group:          Group     // regroupement UI
  stage:          Stage     // cycle de vie
  scope:          Scope     // portée d'activation
  default:        boolean   // valeur si jamais réglé explicitement
  killSwitch:     string    // RÉFÉRENCE du chokepoint runtime officiel (id "CK-…"), pas du code
  description:    string    // OBLIGATOIRE — description courte
  behaviorWhenOff:string    // OBLIGATOIRE — comportement attendu si OFF
  owner:          string    // OBLIGATOIRE — responsable de la fonctionnalité (#17)
  riskLevel:      RiskLevel  // OBLIGATOIRE — low | medium | critical (pilote le défaut sûr #12 + gel #10/#18)
  dependsOn:      string[]  // optionnel — clés des features dont celle-ci dépend (#15)
  deprecatedAt:   string    // optionnel — date de dépréciation (#13)
  removedAt:      string    // optionnel — date de retrait / tombstone (#13)
  replaces:       string    // optionnel — ancien flag remplacé (traçabilité migration #12)
  since:          string    // optionnel — version/date d'introduction
}
```

Champs **obligatoires** : `key`, `label`, `group`, `stage`, `scope`, `default`, `killSwitch`, `description`, `behaviorWhenOff`, `owner`, `riskLevel`.

**Champs retenus volontairement** (apportent une vraie valeur, sans complexifier) : `owner` (#17), `riskLevel` (#12), `dependsOn` (#15), `deprecatedAt`/`removedAt` (#13).
**Champs explicitement REFUSÉS** (réintroduiraient de la logique → violent INV-DASH-008) : toute condition, callback, expression, `enabledIf`, fonction. Le registre **décrit**, il ne **décide** pas.

Règle INV-DASH-008 : aucune valeur de champ n'est une fonction. `killSwitch` est un **identifiant** (`"CK-AIDE"`), résolu ailleurs vers le vrai point runtime — le registre ne contient pas le contrôle lui-même. `dependsOn` est de la **donnée** ; sa résolution (masquer une préférence dépendante) vit dans le moteur de rendu, **jamais dans le registre**.

### 1.1 Énumérations

```
Stage     = alpha | beta | stable | deprecated | removed
Scope     = device | account | fleet
Group     = Carte | Signalements | Assistance | Communication | Présence | IA | Sécurité
RiskLevel = low | medium | critical
```

`RiskLevel` pilote le **défaut sûr** en cas de repli (§ Fallback) et marque les **modules cœur** non câblables sans précaution (§ Sécurité / exclusion Aide).

### 1.2 Résolution de l'état (définie ici, implémentée étape 2-4)

L'état effectif d'une fonctionnalité se résout par **une seule** fonction de lecture (future `isFeatureEnabled(key)`), dans cet ordre :

```
1. valeur stockée selon scope  (device → localStorage ; account/fleet → serveur feature_config, mis en cache)
2. sinon, repli serveur indisponible → dernière valeur connue en cache (point de vigilance #15)
3. sinon → default du registre
```

- **Déterministe, jamais aléatoire** (#15). Aucun rendu ne déclenche de requête serveur (#14) : le serveur est lu au démarrage puis mis en cache, invalidation ciblée à la modification.
- **Sécurité (#18)** : la lecture client peut refléter `fleet`/`account`, mais **l'écriture** de ces scopes est validée **côté serveur** (RLS + rôle). Le client n'active jamais une fonctionnalité `fleet` ; seul `device` est écrit localement.
- Cette fonction est l'**unique** porte de lecture. Le chokepoint officiel (`killSwitch`) l'appelle ; les masquages UI l'appellent aussi mais **à titre cosmétique seulement** (INV-DASH-009).

### 1.3 Observabilité (point de vigilance #13)

Le mode Développeur doit afficher, pour chaque fonctionnalité, **plus** qu'un ON/OFF :

- état déclaré dans le registre (`default`, `stage`, `scope`) ;
- **valeur réellement appliquée** (résultat de §1.2) ;
- **origine de la décision** (registre `default` / cache / `device` / `account` / `fleet`) ;
- raison de l'arrêt si OFF (référence `behaviorWhenOff`).

### 1.4 Définition du « terminé » (points de vigilance #19 et #20)

Une fonctionnalité ne peut passer `stable` que si elle fournit : **test registre**, **test kill-switch**, **test runtime**, **test UI**. Elle est considérée **incomplète** tant que : l'entrée registre n'est pas renseignée (champs obligatoires §1), le `killSwitch` n'est pas déclaré, et la documentation n'est pas à jour.

---

## 2. Registre initial — fonctionnalités déjà flaggées (7 entrées)

Ces 7 entrées correspondent aux flags-modules actuels. Elles sont prêtes à intégrer dès l'étape 2.

| key | label | group | stage | scope (cible) | default | killSwitch | replaces |
|---|---|---|---|---|---|---|---|
| `aide` | Demandes d'aide | Assistance | stable | account | true | CK-AIDE ⚠️gelé | demandes_aide |
| `signalement_route` | Signalements route | Signalements | stable | account | true | CK-ROUTE | alertes_route |
| `signalement_vehicule` | Signalements véhicule | Signalements | stable | account | true | CK-VEHICULE | alertes_vehicule |
| `zones_accidentogenes` | Zones accidentogènes | Carte | beta | account | false | CK-ZONES | zones_accidentogenes |
| `auto_status` | Auto-statut conduite | Présence | stable | device | true | CK-AUTOSTATUS | auto_status |
| `copilote_proactif` | Ange — analyses proactives | IA | beta | account | true | CK-ANGE-PROACTIF | ange_proactive |
| `copilote_monologue` | Ange — monologue conduite | IA | beta | device | true | CK-ANGE-MONOLOGUE | ange_monologue |

### 2.1 `description` + `behaviorWhenOff` des 7 entrées (champs obligatoires #9)

| key | description courte | comportement attendu si OFF |
|---|---|---|
| `aide` | Demander/proposer de l'aide entre conducteurs proches | Aucune demande créée/reçue, pas de marqueur carte, pas de push proximité, feed Aide vide. **Gelé : non câblé tant que « Go » non donné.** |
| `signalement_route` | Signaler un incident de circulation | Aucun signalement route créé/affiché, pas de notif route |
| `signalement_vehicule` | Prévenir un conducteur d'un problème sur son véhicule | Aucun envoi/réception de signalement véhicule, pas de notif |
| `zones_accidentogenes` | Afficher zones à risque + alertes préventives | Couche zones masquée, aucune alerte préventive émise |
| `auto_status` | Passer en présence « conduite » au-delà de 20 km/h | La présence ne change jamais automatiquement (réglage manuel seul) |
| `copilote_proactif` | Ange surveille le trajet et intervient spontanément | Aucune analyse proactive déclenchée |
| `copilote_monologue` | Ange pense à voix haute en conduite | Aucune prise de parole spontanée en conduite |

> ⚠️ **`aide` gelé (point de vigilance #10)** : l'entrée existe pour documentation, mais `CK-AIDE` **n'est pas câblé** dans le runtime Aide pendant la refonte Dashboard. (Factuellement, Lot B Aide est en production ; on ne touche pas son runtime ici.)

### 2.2 `owner` + `riskLevel` + `dependsOn` des 7 entrées (champs obligatoires)

| key | owner | riskLevel | dependsOn |
|---|---|---|---|
| `aide` | Produit / Aide | medium | — |
| `signalement_route` | Produit / Signalements | medium | — |
| `signalement_vehicule` | Produit / Signalements | medium | — |
| `zones_accidentogenes` | Produit / Carte | low | — |
| `auto_status` | Produit / Présence | low | — |
| `copilote_proactif` | Produit / IA | medium | — |
| `copilote_monologue` | Produit / IA | low | `copilote_proactif` *(le monologue n'a de sens que si l'analyse proactive est active)* |

> `owner` est ici une **équipe/domaine** (un seul propriétaire produit aujourd'hui) ; il sera affiné si l'équipe grandit. Aucune entrée n'est `critical` à ce stade — les modules cœur `critical` arrivent en §3.

Notes de décision (à confirmer au moment de l'implémentation, sans rouvrir l'ADR) :
- `zones_accidentogenes` : `default:false` (conforme à l'actuel `FEATURE_FLAGS`), donc `stage:beta` (opt-in) plutôt que stable.
- Ange (`copilote_*`) : proposés en `beta` (IA, maturité produit) bien qu'aujourd'hui ON par défaut. `monologue` reste `device` (confort personnel) ; `proactif` passe `account` (comportement du compte).
- `scope (cible)` = portée visée. **Tant que l'étape 5 (serveur `feature_config`) n'est pas faite, l'implémentation réelle reste `device`** ; l'UI affiche la portée cible et l'état « gouvernance locale en attendant ».

---

## 3. Modules existants à intégrer ultérieurement (non flaggés aujourd'hui)

Ces modules existent dans le code mais **n'ont pas de flag actuel**. Ils rejoindront le registre aux étapes suivantes (un chokepoint officiel devra être défini pour chacun). Listés ici pour la complétude (« lister toutes les fonctionnalités »), **non gouvernés tant que non intégrés**.

| key | label | group | stage proposé | scope (cible) | default | riskLevel | killSwitch (à créer) |
|---|---|---|---|---|---|---|---|
| `signalement_stationne` | Signalements stationné | Signalements | stable | account | true | medium | CK-STATION |
| `appels` | Appels vocaux | Communication | stable | account | true | **critical** | CK-APPELS |
| `trust` | Fiabilité conducteurs | Sécurité | stable | account | true | medium | CK-TRUST |
| `messages` | Messagerie | Communication | stable | account | true | **critical** | CK-MESSAGES |

> Prudence : `appels` et `messages` sont `riskLevel:critical` ; `trust`/`stationné` sont `medium`. Les passer OFF a un impact majeur ; leur intégration au registre se fera avec `default:true`, défaut **fail-open** (§ Fallback) et un câblage de chokepoint **manuel et prudent** — jamais d'auto-câblage (ne jamais casser un flux validé terrain — cf. D17 appels stables).

---

## 4. Préférences utilisateur — HORS registre (Paramètres uniquement)

Conformément à INV-DASH-003, ces éléments **ne sont pas** des fonctionnalités et **ne rejoignent jamais** le registre. Ils restent dans Paramètres, stockés en `device`.

| Préférence | Stockage actuel | Reste dans |
|---|---|---|
| Sons | `ic_sounds` | Paramètres |
| Voix GPS (+ genre, débit) | `ic_voice`, `ic_voice_gender`, `ic_voice_rate` | Paramètres |
| Réduction des effets | `ic_reduce_effects` | Paramètres |
| Économie batterie | `ic_battery_save` | Paramètres |
| Position approximée | `ic_approx_geo` | Paramètres |
| Rayon de détection | `ic_radius` | Paramètres |
| Notifs — messages reçus | `ic_notif_prefs.messages` | Paramètres |
| Notifs — appels manqués | `ic_notif_prefs.calls` | Paramètres |
| Notifs — route / véhicule / aide | `ic_notif_prefs.{route,vehicle,help}` | Paramètres (visibles si la capacité associée est disponible) |
| Présence / DND / niveau d'appel | via ImmatMessages | Paramètres |

---

## 5. Mapping complet : 12 flags actuels → cible

| Flag actuel | Nature | Cible | Détail |
|---|---|---|---|
| `demandes_aide` | module | **registre** `aide` | killSwitch CK-AIDE |
| `alertes_route` | module + canal notif | **registre** `signalement_route` | la préférence de notif route reste dans Paramètres |
| `alertes_vehicule` | module + canal notif | **registre** `signalement_vehicule` | idem |
| `zones_accidentogenes` | module | **registre** `zones_accidentogenes` | default false, beta |
| `auto_status` | module | **registre** `auto_status` | scope device |
| `ange_proactive` | module | **registre** `copilote_proactif` | beta |
| `ange_monologue` | module | **registre** `copilote_monologue` | beta, device |
| `sons` | préférence | **Paramètres** | hors registre |
| `voix_gps` | préférence | **Paramètres** | hors registre |
| `reduce_effects` | préférence | **Paramètres** | hors registre |
| `messages_notif` | canal notif | **Paramètres** | préférence de notif |
| `appels_notif` | canal notif | **Paramètres** | préférence de notif |

---

## 6. Chokepoints officiels (INV-DASH-009)

Pour chaque fonctionnalité, **un seul** chokepoint runtime officiel = source de vérité. Il appelle `isFeatureEnabled(key)` et, s'il est OFF, **bloque l'activation du module** (donc en cascade : création, Realtime, notifications, UI, traitements). Les masquages d'interface listés en « effets gouvernés » ne sont que cosmétiques.

| killSwitch | Fonctionnalité | Chokepoint officiel (source de vérité) | Effets gouvernés en cascade (cosmétiques / dérivés) |
|---|---|---|---|
| CK-AIDE | `aide` | activation du module Aide (porte unique appelée avant `assist()` et avant l'abonnement Realtime) | `assist()` (création), `subscribeRealtime` (écoute), `syncMapMarkers` (carte), `notifyNearby` + Edge `notify-help-request` (notif), `renderAideFeedV1` (UI) |
| CK-ROUTE | `signalement_route` | porte d'activation des signalements route (avant `roadReport()` et avant le rendu de la couche) | création, rendu marqueurs route, notifs route |
| CK-VEHICULE | `signalement_vehicule` | porte d'activation des signalements véhicule (avant `vehicleAlert()`/`driverInfo` et avant la réception) | envoi, réception, affichage |
| CK-ZONES | `zones_accidentogenes` | porte d'activation de la couche zones | rendu couche carte + alertes préventives |
| CK-AUTOSTATUS | `auto_status` | porte d'activation de la bascule auto de présence | logique vitesse > 20 → présence « conduite » |
| CK-ANGE-PROACTIF | `copilote_proactif` | porte d'activation des analyses proactives Ange | déclenchements d'analyses spontanées |
| CK-ANGE-MONOLOGUE | `copilote_monologue` | porte d'activation du monologue Ange | prises de parole en conduite |

(Modules de la §3 — CK-STATION, CK-APPELS, CK-TRUST, CK-MESSAGES — auront leur chokepoint défini au moment de leur intégration.)

> Principe : aujourd'hui le contrôle est éparpillé (masquages UI + `return` anticipés). L'étape 4 consolide chaque module derrière **sa** porte d'activation unique. La présente spec fige **où** se trouve cette porte ; elle n'écrit pas le code.

> ⚠️ **CK-AIDE gelé (point de vigilance #10) :** le chokepoint Aide est **documenté mais non câblé** pendant la refonte Dashboard. Aucune modification du runtime Aide (déjà en production) n'est autorisée ici tant qu'un « Go » explicite n'est pas donné. Câblage de CK-AIDE = hors périmètre de la refonte Dashboard.

---

## 7. Fallback — registre serveur indisponible (#11, #12, #15)

Comportement **déterministe**, jamais d'activation aléatoire.

Ordre de résolution (rappel §1.2) :

```
1. cache local de la dernière valeur serveur connue (scope account/fleet)
2. sinon → default du registre
```

Règles :

- **Cache-first** : si le serveur est injoignable, on **conserve** la dernière valeur connue. Le serveur KO ne **flippe jamais** un module `ON` en `OFF`.
- **Défaut sûr par `riskLevel`** (si aucune valeur connue) :
  - `critical` (appels, messages) → **fail-open** : reste `ON` (l'app continue de fonctionner) ;
  - `medium` → conserve `default` du registre ;
  - `low` / expérimental / `fleet` sensible → **fail-closed** : reste `OFF` (pas d'activation fantôme).
- **Aucun faux vert** (INV-DASH-007) : si la source serveur est injoignable, l'onglet Santé signale une **anomalie 🟠**, jamais un statut rassurant.
- **Performance** (#14) : la résolution lit un **cache mémoire** ; le serveur est interrogé au démarrage + invalidation ciblée à la modification, **jamais à chaque rendu**.

---

## 8. Sécurité — droits par scope (#10, #18)

| Scope | Lecture | Écriture | Contrôle |
|---|---|---|---|
| `device` | client | client (local) | aucun privilège requis |
| `account` | client | **serveur uniquement** (RPC) | rôle = propriétaire du compte |
| `fleet` | client (reflète l'état) | **serveur uniquement** (RPC) | rôle Gardien/admin, **jamais** le client |

Règles :

- **Le client ne peut JAMAIS activer une fonctionnalité `fleet`.** Toute écriture `account`/`fleet` passe par une **RPC `SECURITY DEFINER`** qui valide le rôle (RLS + `get_my_role`).
- Les **onglets Développeur** ne sont accessibles qu'au rôle Développeur ; un utilisateur normal ne voit ni ne modifie les outils dev.
- Une feature sensible ne peut **pas** être activée sans autorisation serveur (pas de bascule purement client pour `account`/`fleet`).

---

## 9. Audit — traçabilité des changements account / fleet (#9, #17)

- Scope `device` → **non audité** (réglage local propre à l'appareil).
- Scope `account` / `fleet` → **journal serveur obligatoire** : `feature_audit_log` (schéma défini à l'étape 5, ici figé comme exigence) :

```
feature_audit_log {
  id, feature_key, scope, actor_id,
  old_value, new_value, reason?, changed_at
}
```

- **Réversibilité** : toute valeur précédente est restaurable depuis le journal.
- Renseigne « qui / quand / ancienne valeur / nouvelle valeur / raison éventuelle » (#9).

---

## 10. Dépendances entre fonctionnalités (#15)

- Une dépendance se déclare **uniquement** via le champ `dependsOn` (donnée — INV-DASH-008).
- **Comportement quand une dépendance est OFF** : la feature dépendante est traitée comme **indisponible** (et donc OFF) tant que toutes ses dépendances ne sont pas ON. La **résolution** de cette règle vit dans le moteur de rendu/runtime, **pas** dans le registre.
- **Cohérence UI** : si un module est OFF, **sa préférence de notification associée est masquée** dans Paramètres (ex. `Notifs route` masquée si `signalement_route` OFF). C'est l'application concrète d'INV-DASH-005 (sens unique capacité → préférence) via `dependsOn`.
- Exemple registre : `copilote_monologue.dependsOn = ['copilote_proactif']` → le monologue est indisponible si l'analyse proactive est OFF.
- Pas de cycles : `dependsOn` doit former un graphe acyclique (vérifié par le `test registre`).

---

## 11. Observabilité — comprendre l'état réel (#8, #13)

Le mode Développeur affiche, pour chaque fonctionnalité, **bien plus** qu'un ON/OFF :

- `default` du registre, `stage`, `scope` ;
- **valeur effective** (résultat de la résolution §1.2 / §7) ;
- **origine de la décision** : `default` / cache / `device` / `account` / `fleet` ;
- **override éventuel** (quel scope a gagné) ;
- **dernier changement** (horodatage ; pour account/fleet : depuis `feature_audit_log`) ;
- **raison de l'arrêt** si OFF (référence `behaviorWhenOff`) et **dépendance OFF** éventuelle.

Objectif : un développeur diagnostique en quelques secondes **pourquoi** un module ne démarre pas (OFF par défaut ? par override ? par dépendance ? par repli serveur ?).

---

## 12. Tests — minimums par fonctionnalité et par kill-switch (#16, #19)

Gate de passage à `stable` : les 4 tests existent et passent.

| Test | Vérifie |
|---|---|
| **registre** | entrée valide, champs obligatoires renseignés, `key` unique, `dependsOn` acyclique |
| **kill-switch** | OFF ⇒ **aucune** création de données, **aucun** abonnement Realtime, **aucune** notification, **aucun** rendu carte/bandeau, **aucun** traitement interne |
| **runtime** | ON ⇒ le module démarre via **son** chokepoint officiel (un seul) |
| **UI** | ON ⇒ contrôles visibles ; OFF ⇒ contrôles **et** préférences dépendantes masqués |

Interdit : passer `stable` sans ces 4 tests. Une feature `critical` exige en plus une revue manuelle du chokepoint (non-régression des flux validés terrain).

---

## 13. Rappels d'invariants & exclusion Aide V1

Rappels non négociables (repris de l'ADR, opposables à l'implémentation) :

- **Registre 100 % déclaratif** (INV-DASH-008) : métadonnées seules, **jamais** de logique métier. `killSwitch`/`dependsOn` sont des références/données, leur résolution vit dans le moteur.
- **Un seul chokepoint runtime officiel par fonctionnalité** (INV-DASH-009) : source de vérité unique ; les masquages UI ne sont que cosmétiques.
- **Pas de dépendance circulaire entre couches** (INV-DASH-011) : le Dashboard **lit** la gouvernance et **consulte** les modules ; les modules ne dépendent **jamais** du Dashboard. Le Dashboard n'est pas une bibliothèque métier.

**Exclusion Aide V1 (gel — #18) :**

- La refonte Dashboard **ne modifie aucun runtime d'Aide** (`assist`, `subscribeRealtime`, `syncMapMarkers`, `notifyNearby`, `renderAideFeedV1`).
- L'entrée `aide` et `CK-AIDE` sont **documentées mais non câblées**.
- La génération automatique (étape 4) **exclut explicitement** `aide` **et toute entrée `riskLevel:critical`** du câblage automatique : leur kill-switch se câble manuellement, plus tard, sur « Go » explicite.
- *(Rappel factuel : Lot B Aide est en production ; « gel » = on ne touche pas son runtime pendant la refonte Dashboard.)*

---

## 14. Ce que le registre génère (rappel INV-DASH-004)

À partir des entrées ci-dessus, l'implémentation (étapes 2-3) dérive automatiquement :

- l'onglet **Fonctionnalités** du Dashboard (groupé par `group`, filtrable par `stage`, portée affichée) ;
- la **disponibilité** des réglages dans Paramètres (capacité éteinte → réglage absent côté utilisateur) ;
- les **contrôles runtime** (via le chokepoint officiel de chaque entrée) ;
- la **documentation** (description) et les **états de disponibilité**.

Ajouter une fonctionnalité = **ajouter une entrée**. Aucune autre édition.

---

## 15. Limites explicites de cette spec

- Ne définit **pas** le **schéma complet** du stockage serveur `feature_config` ni l'implémentation de `feature_audit_log` (étape 5 — seules les **exigences** sont figées ici).
- Ne définit **pas** l'agrégateur Santé ni le banc Dev (diagnostics — étape 6).
- Les `stage`, `scope`, `owner` et `riskLevel` proposés sont des recommandations ; ils peuvent être ajustés à l'implémentation **sans rouvrir l'ADR** tant que les invariants INV-DASH-001 à 011 sont respectés.
- Aucune décision d'architecture nouvelle : cette spec applique l'ADR figé. **Aucun code, aucune migration, aucun refactoring, aucune modification du comportement actuel.**
