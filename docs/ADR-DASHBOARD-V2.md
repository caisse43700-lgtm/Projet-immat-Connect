# ADR — Dashboard Gardien V2 : écran de gouvernance + registre unique de fonctionnalités

**Statut :** Accepté (2026-06-29). Gèle la direction d'architecture **avant toute implémentation**.
**Décideurs :** propriétaire produit + revue d'architecture multi-rôles (PM / UX / archi logiciel / front / back / qualité / gardien de cohérence).
**Portée :** refonte structurelle du Dashboard Gardien et du système de Feature Flags. Non destructif : conserve l'existant, le réorganise et le fiabilise.
**Antécédent :** revue complète fondée sur le code réel (cartographie UI, Feature Flags bout-en-bout, panneau Paramètres, 8 moteurs de diagnostic).

---

## Contexte (constat fondé sur le code actuel)

- Le Dashboard (`#gardienDashboard`, `openGardienDashboard`, gated `S.isGardien` via `get_my_role()`) mélange **6 rôles** : console développeur, supervision, banc de test, modération, gestion de flags, raccourcis config. Aucune identité unique. Test des 20 s échoué.
- **Feature Flags = théâtre, pas gouvernance** : un flag OFF ne fait que masquer une ligne de Paramètres (`applyFeatureFlags()` → `display:none`) et court-circuiter `saveNotifPref()`/`toggle*()`. Le runtime du module **continue** (ex. `demandes_aide` OFF : les demandes sont toujours créées, affichées sur la carte, reçues). Les flags sont **100 % locaux** (`localStorage.ic_feature_flags`) → n'affectent jamais la flotte.
- Les 12 flags **confondent 3 natures** : vrais modules / préférences perso (`sons`, `voix_gps`, `reduce_effects`) / canaux de notif.
- **8 moteurs de diagnostic redondants** sondent les mêmes sous-systèmes. `ORGANISM_COHERENCE 100% OPTIMAL` est **codé en dur** (faux signal de confiance).

---

## Invariants Dashboard V2 (non négociables)

- **INV-DASH-001 — Une seule source d'activation.** Une fonctionnalité métier n'est activée/désactivée que par le **registre** (Dashboard → registre → runtime). Aucun `if` local, `localStorage`, ni réglage Paramètres ne peut activer/désactiver un module métier indépendamment du registre.
- **INV-DASH-002 — Kill-switch réel.** `OFF = module réellement arrêté`. Le contrôle se fait au **chokepoint runtime** du module, jamais uniquement dans l'UI. Un OFF empêche : création de données, écoute Realtime, notifications, affichage UI, traitements internes.
- **INV-DASH-003 — Fonctionnalité ≠ Préférence.** Le Dashboard gouverne des **fonctionnalités métier** (registre). Les **préférences utilisateur** (sons, voix, animations, effets, notifs perso) vivent **uniquement dans Paramètres** et ne sont jamais des feature flags.
- **INV-DASH-004 — Le registre est l'unique source de vérité.** Il génère le Dashboard, la disponibilité des réglages Paramètres concernés, les contrôles runtime, la documentation et les états de disponibilité. Ajouter une fonctionnalité = **une entrée** dans le registre.
- **INV-DASH-005 — Dépendance à sens unique.** Capacité (registre) → préférence (Paramètres). Jamais l'inverse. Une préférence ne peut pas réactiver une capacité éteinte.
- **INV-DASH-006 — Vérité serveur prioritaire.** Pour toute donnée métier disposant d'une source serveur, le Dashboard affiche la **vérité serveur**, jamais un cache local. Aucune donnée métier ne doit avoir deux sources de vérité.
- **INV-DASH-007 — Pas de faux vert.** Le statut de santé n'affiche jamais une valeur optimale codée en dur. Il reflète des anomalies réellement détectées (🟢 Sain / 🟠 Attention / 🔴 Critique).

---

## 1. Identité du Dashboard — écran de gouvernance, 4 onglets, 1 responsabilité chacun

Un **seul** point d'entrée Gardien, structuré en 4 onglets à responsabilité unique :

| Onglet | Question unique | Contenu (réorganisé depuis l'existant) | Audience |
|--------|-----------------|----------------------------------------|----------|
| 🟢 **Santé** | « Tout va bien, là, maintenant ? » | UN statut global (🟢/🟠/🔴) + anomalies actionnables (lecture seule) | Exploitant |
| 🛡 **Modération** | « Qui demande une décision humaine ? » | Signalements d'abus + recommandations GuardianLoop (Valider/Rejeter/Reporter) | Modérateur |
| 🎛 **Fonctionnalités** | « Quels modules existent, dans quel état ? » | Le registre (groupé, filtrable par stage) | PM / Gardien |
| 🔧 **Développeur** | « Pourquoi ça casse ? » | Runtime dumps, Timeline OBD, Immatest, autotests, blockers DOM | Développeur |

---

## 2. Niveaux d'accès

Trois niveaux (pas cinq — refus explicite de la sur-ingénierie) :

| Niveau | Voit | Surface |
|--------|------|---------|
| **Utilisateur** | ses préférences | Paramètres |
| **Gardien / Modérateur** | Santé + Modération + Fonctionnalités (stable/beta/alpha) | Dashboard onglets 1-3 |
| **Développeur** | tout + Diagnostic brut | Dashboard onglet 4 |

---

## 3. Registre unique de fonctionnalités (source de vérité)

Aujourd'hui, ajouter un flag = éditer 4 endroits (`FEATURE_FLAGS`, `applyFeatureFlags`, rendu Dashboard, HTML Paramètres). Cible : **une seule structure de données** décrit tout ; l'UI + Paramètres + runtime en sont **générés**.

### Schéma d'une entrée du registre

| Champ | Type | Rôle |
|---|---|---|
| `key` | string | identifiant stable (ex. `aide`, `signalement_vehicule`, `trust`, `copilote`) |
| `label` | string | libellé affiché |
| `group` | string | regroupement UI (`Carte`, `Communication`, `Sécurité`, `Ange`…) |
| `stage` | enum | `alpha` \| `beta` \| `stable` \| `deprecated` \| `removed` |
| `scope` | enum | `device` \| `account` \| `fleet` |
| `default` | bool | valeur par défaut si jamais réglé |
| `killSwitch` | ref | **point runtime unique** (chokepoint) qui DOIT vérifier l'état avant tout effet |

### Ce que le registre génère (INV-DASH-004)
- le rendu de l'onglet **Fonctionnalités** (groupé par `group`, filtrable par `stage`) ;
- la **disponibilité** des réglages dans Paramètres (une capacité éteinte → réglage absent côté utilisateur) ;
- les **contrôles runtime** (chaque module lit le registre à son chokepoint) ;
- la **documentation** et les **états de disponibilité**.

---

## 4. Séparation Fonctionnalités / Préférences (INV-DASH-003)

### Fonctionnalités métier → registre + Dashboard
`aide`, `signalement_vehicule`, `signalement_route`, `signalement_stationne`, `trust`, `copilote/ange`, `zones_accidentogenes`, `auto_status`, `appels`… (gouvernables, cycle de vie, portée).

### Préférences utilisateur → Paramètres uniquement (NE SONT PAS des flags)
`sons` (`ic_sounds`), `voix_gps` (`ic_voice`/`ic_voice_gender`/`ic_voice_rate`), `reduce_effects` (`ic_reduce_effects`), `battery_save` (`ic_battery_save`), `approx_geo` (`ic_approx_geo`), rayon (`ic_radius`), notifs perso (`ic_notif_prefs`), présence/DND/call-level.

### Reclassement explicite des 12 flags actuels

| Flag actuel | Nature réelle | Cible V2 |
|---|---|---|
| `zones_accidentogenes` | module | **registre** |
| `demandes_aide` | module | **registre** (`aide`) |
| `alertes_route` | module (+ canal notif) | **registre** (`signalement_route`) ; le canal notif reste une préférence |
| `alertes_vehicule` | module (+ canal notif) | **registre** (`signalement_vehicule`) ; canal notif = préférence |
| `auto_status` | module | **registre** |
| `ange_proactive` | module | **registre** (`copilote.proactif`) |
| `ange_monologue` | module | **registre** (`copilote.monologue`) |
| `sons` | préférence | **Paramètres only** |
| `voix_gps` | préférence | **Paramètres only** |
| `reduce_effects` | préférence | **Paramètres only** |
| `messages_notif` | canal de notif | **préférence notif** (Paramètres) |
| `appels_notif` | canal de notif | **préférence notif** (Paramètres) |

> Nuance importante : pour un module qui possède aussi un canal de notification (route, véhicule, aide), **deux niveaux coexistent légitimement** : la *capacité* (registre, gouvernée) et la *préférence de notification* (Paramètres, réglée par l'utilisateur, visible seulement si la capacité est disponible). Ce n'est pas un doublon : c'est capacité vs préférence (INV-DASH-005).

---

## 5. Kill-switch réel — où vivent les chokepoints (INV-DASH-002)

Le contrôle se pose au **point d'entrée unique** de chaque module, pas dans l'UI. Repères runtime identifiés dans le code actuel :

| Module | Chokepoint(s) runtime à protéger | OFF doit empêcher |
|---|---|---|
| `aide` | `App.assist()` (création), `AideV1.subscribeRealtime` (écoute), `syncMapMarkers` (carte), `notifyNearby`/Edge `notify-help-request` (notif), `renderAideFeedV1` (UI) | création + Realtime + push + marqueurs + feed |
| `signalement_route` | `App.roadReport()`, rendu marqueurs route, notifs route | création + affichage + notif |
| `signalement_vehicule` | `App.vehicleAlert()`/`driverInfo`, réception | envoi + réception + notif |
| `zones_accidentogenes` | couche de rendu des zones + alertes préventives | affichage + alertes |
| `auto_status` | logique vitesse>20 → présence `conduite` | bascule auto de présence |
| `copilote/ange` | analyses proactives + monologue | déclenchements Ange |

**Règle de revue :** toute nouvelle fonctionnalité doit déclarer son `killSwitch` (le chokepoint) dans le registre, et ce chokepoint doit vérifier l'état **avant** tout effet de bord.

---

## 6. Portée explicite (INV-DASH-006 / décision #6)

| Portée | Stockage | Gouverne |
|---|---|---|
| `device` | localStorage | ce téléphone uniquement (préférences, opt-in local) |
| `account` | serveur (profil utilisateur) | ce compte sur tous ses appareils |
| `fleet` | serveur (`feature_config`) | la flotte entière (gouvernance produit, bêtas) |

L'UI **affiche la portée** de chaque fonctionnalité → fin de l'illusion « un flag local gouverne le produit ». Les bascules `fleet`/`account` nécessiteront une table serveur `feature_config` (introduite à l'étape 5 de la migration).

---

## 7. Cycle de vie (décision #7)

```
alpha → beta → stable → deprecated → removed
```

| Stage | Utilisateur | Gardien | Comportement |
|---|---|---|---|
| `stable` | visible (Paramètres) | visible | réglable |
| `beta` | visible + badge BÊTA, opt-in | visible | réglable |
| `alpha`/expérimental | **absent** | visible (grisé activable) | Gardien-only |
| `deprecated` | absent | visible (marqué) | lecture seule, retrait planifié |
| `removed` | absent | historique only | **tombstone** (entrée conservée pour audit / éviter les régressions de migration) |

---

## 8. Diagnostics — fusion (décision #8)

Les 8 moteurs actuels (GVC, Guardian Summary, Immatest, Mobile Autotest, Calls Runtime, Messages Runtime, Gardien Diagnostic, Immunité) deviennent **2 surfaces** :

| Cible | Rôle | Alimenté par |
|---|---|---|
| **Agrégateur Santé** (onglet Santé, production) | 1 statut 🟢/🟠/🔴 + anomalies réellement détectées | les sondes existantes deviennent de simples *fournisseurs* (realtime, cache, audio, supabase, GPS…), plus des panneaux concurrents |
| **Banc Développeur** (onglet Développeur) | tests profonds à la demande | Immatest (18 scénarios) + Mobile Autotest + dumps runtime |

Suppressions : voyants métaphoriques `organisme/âme/conscience/kernel` (non actionnables) relégués au banc Dev ou retirés ; **`100% OPTIMAL` codé en dur supprimé** (INV-DASH-007).

---

## 9. Source de vérité des données (décision #9)

- Nettoyer les doublons cache local ↔ serveur sur les **données métier**.
- Cas connu : `ic_trust` (legacy) vs `ic_trust_scores` → unifier ; le Dashboard affiche `S.trust` (local) alors que la réputation réelle est serveur (`vehicle_trust_scores`) → **afficher la vérité serveur, le local n'est qu'un cache** (INV-DASH-006).

---

## 10. Migration non destructive (décision #10)

Chaque étape est livrable seule et ne casse pas l'existant.

1. **Ranger** le Dashboard en 4 onglets (pur HTML/CSS, zéro risque).
2. **Introduire le registre** en parallèle des flags actuels (la donnée d'abord, sans débrancher l'ancien).
3. **Générer** progressivement le Dashboard et la disponibilité Paramètres depuis le registre ; sortir `sons`/`voix_gps`/`reduce_effects` du registre (→ Paramètres).
4. **Poser les kill-switches runtime** module par module (chaque chokepoint vérifie le registre).
5. **Introduire les portées serveur** (`feature_config` pour `account`/`fleet`).
6. **Supprimer** les anciens diagnostics redondants et la logique morte.

---

## Objectif final (critères d'acceptation)

- le Dashboard **gouverne** les fonctionnalités ;
- les Paramètres ne gèrent **que** les préférences utilisateur ;
- le **registre** est l'unique source de vérité ;
- un flag **OFF arrête réellement** un module (création / Realtime / notif / UI / traitements) ;
- chaque fonctionnalité a **une seule source d'activation** ;
- les diagnostics sont **fiables, simples, actionnables** (pas de faux vert) ;
- l'ensemble reste **extensible et maintenable** (ajout = 1 entrée registre).

---

## Conséquences

**Positives :** identité claire ; gouvernance réelle ; zéro état contradictoire ; ajout de fonctionnalité trivial ; diagnostics fiables ; évolutif à 100+ fonctionnalités.

**Coûts assumés :** pose des kill-switches module par module (effort réparti) ; table serveur `feature_config` pour les portées `account`/`fleet` ; migration en 6 étapes plutôt qu'un big-bang.

**Hors périmètre de cet ADR :** l'implémentation. Cet ADR gèle les décisions ; aucune ligne de code applicatif n'est modifiée tant que l'étape 1 n'est pas validée.
