# SPEC — Registre de fonctionnalités (Dashboard Gardien V2)
## Étape « Spec registre » — documentation uniquement, aucun code applicatif

**Statut :** Spécification (2026-06-29). Découle de `docs/ADR-DASHBOARD-V2.md` (D22, figé).
**Périmètre :** définir la structure du registre, lister les fonctionnalités, établir le mapping complet flags → registre, et fixer pour chaque fonctionnalité `key / label / group / stage / scope / default / killSwitch`.
**Contrainte :** respecte INV-DASH-001 à 009. En particulier :
- **INV-DASH-008** — le registre est 100 % déclaratif (données seules, aucune logique).
- **INV-DASH-009** — une fonctionnalité = un seul chokepoint runtime officiel.

> Aucune ligne de code applicatif n'est écrite à cette étape. Ce document est la référence que l'étape 2 (introduction du registre en parallèle) implémentera à l'identique.

---

## 1. Structure d'une entrée du registre

Chaque fonctionnalité est **une entrée déclarative** :

```
Feature {
  key:         string    // identifiant stable, snake_case, immuable (clé de migration)
  label:       string    // libellé affiché (FR)
  group:       Group      // regroupement UI
  stage:       Stage      // cycle de vie
  scope:       Scope      // portée d'activation
  default:     boolean    // valeur si jamais réglé explicitement
  killSwitch:  string     // RÉFÉRENCE du chokepoint runtime officiel (id "CK-…"), pas du code
  description: string     // optionnel — alimente la doc générée
  replaces:    string     // optionnel — ancien flag remplacé (traçabilité migration)
  since:       string     // optionnel — version/date d'introduction
}
```

Règle INV-DASH-008 : aucune valeur de champ n'est une fonction. `killSwitch` est un **identifiant** (`"CK-AIDE"`), résolu ailleurs vers le vrai point runtime — le registre ne contient pas le contrôle lui-même.

### 1.1 Énumérations

```
Stage = alpha | beta | stable | deprecated | removed
Scope = device | account | fleet
Group = Carte | Signalements | Assistance | Communication | Présence | IA | Sécurité
```

### 1.2 Résolution de l'état (définie ici, implémentée étape 2-4)

L'état effectif d'une fonctionnalité se résout par **une seule** fonction de lecture (future `isFeatureEnabled(key)`), dans cet ordre :

```
1. valeur stockée selon scope  (device → localStorage ; account/fleet → serveur feature_config)
2. sinon → default du registre
```

Cette fonction est l'**unique** porte de lecture. Le chokebox officiel (`killSwitch`) l'appelle ; les masquages UI l'appellent aussi mais **à titre cosmétique seulement** (INV-DASH-009).

---

## 2. Registre initial — fonctionnalités déjà flaggées (7 entrées)

Ces 7 entrées correspondent aux flags-modules actuels. Elles sont prêtes à intégrer dès l'étape 2.

| key | label | group | stage | scope (cible) | default | killSwitch | replaces |
|---|---|---|---|---|---|---|---|
| `aide` | Demandes d'aide | Assistance | stable | account | true | CK-AIDE | demandes_aide |
| `signalement_route` | Signalements route | Signalements | stable | account | true | CK-ROUTE | alertes_route |
| `signalement_vehicule` | Signalements véhicule | Signalements | stable | account | true | CK-VEHICULE | alertes_vehicule |
| `zones_accidentogenes` | Zones accidentogènes | Carte | beta | account | false | CK-ZONES | zones_accidentogenes |
| `auto_status` | Auto-statut conduite | Présence | stable | device | true | CK-AUTOSTATUS | auto_status |
| `copilote_proactif` | Ange — analyses proactives | IA | beta | account | true | CK-ANGE-PROACTIF | ange_proactive |
| `copilote_monologue` | Ange — monologue conduite | IA | beta | device | true | CK-ANGE-MONOLOGUE | ange_monologue |

Notes de décision (à confirmer au moment de l'implémentation, sans rouvrir l'ADR) :
- `zones_accidentogenes` : `default:false` (conforme à l'actuel `FEATURE_FLAGS`), donc `stage:beta` (opt-in) plutôt que stable.
- Ange (`copilote_*`) : proposés en `beta` (IA, maturité produit) bien qu'aujourd'hui ON par défaut. `monologue` reste `device` (confort personnel) ; `proactif` passe `account` (comportement du compte).
- `scope (cible)` = portée visée. **Tant que l'étape 5 (serveur `feature_config`) n'est pas faite, l'implémentation réelle reste `device`** ; l'UI affiche la portée cible et l'état « gouvernance locale en attendant ».

---

## 3. Modules existants à intégrer ultérieurement (non flaggés aujourd'hui)

Ces modules existent dans le code mais **n'ont pas de flag actuel**. Ils rejoindront le registre aux étapes suivantes (un chokepoint officiel devra être défini pour chacun). Listés ici pour la complétude (« lister toutes les fonctionnalités »), **non gouvernés tant que non intégrés**.

| key | label | group | stage proposé | scope (cible) | default | killSwitch (à créer) |
|---|---|---|---|---|---|---|
| `signalement_stationne` | Signalements stationné | Signalements | stable | account | true | CK-STATION |
| `appels` | Appels vocaux | Communication | stable | account | true | CK-APPELS |
| `trust` | Fiabilité conducteurs | Sécurité | stable | account | true | CK-TRUST |
| `messages` | Messagerie | Communication | stable | account | true | CK-MESSAGES |

> Prudence : `appels`, `messages` et `trust` sont des modules cœur. Les passer OFF a un impact majeur ; leur intégration au registre se fera avec un `default:true` et une vigilance particulière sur le chokepoint (ne jamais casser un flux validé terrain — cf. D17 appels stables).

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

---

## 7. Ce que le registre génère (rappel INV-DASH-004)

À partir des entrées ci-dessus, l'implémentation (étapes 2-3) dérive automatiquement :

- l'onglet **Fonctionnalités** du Dashboard (groupé par `group`, filtrable par `stage`, portée affichée) ;
- la **disponibilité** des réglages dans Paramètres (capacité éteinte → réglage absent côté utilisateur) ;
- les **contrôles runtime** (via le chokepoint officiel de chaque entrée) ;
- la **documentation** (description) et les **états de disponibilité**.

Ajouter une fonctionnalité = **ajouter une entrée**. Aucune autre édition.

---

## 8. Limites explicites de cette spec

- Ne définit **pas** le format de stockage serveur `feature_config` (étape 5).
- Ne définit **pas** l'agrégateur Santé ni le banc Dev (diagnostics — étape 6).
- Les `stage` et `scope` proposés sont des recommandations ; ils peuvent être ajustés à l'implémentation **sans rouvrir l'ADR** tant que les invariants INV-DASH-001 à 009 sont respectés.
- Aucune décision d'architecture nouvelle : cette spec applique l'ADR figé.
