# REFONTE DASHBOARD GARDIEN — ImmatConnect Pro
## ADR D22 — Décision figée, implémentation non commencée

**Statut :** Accepté et figé (2026-06-29) — version consolidée validée par le propriétaire produit.
**Décideurs :** propriétaire produit + revue d'architecture multi-rôles (PM / UX / archi logiciel / front / back / qualité / gardien de cohérence).
**Portée :** refonte structurelle du Dashboard Gardien et du système de Feature Flags. **Non destructif.**
**Antécédent :** revue complète fondée sur le code réel (cartographie UI, Feature Flags bout-en-bout, panneau Paramètres, 8 moteurs de diagnostic).

> Cet ADR gèle les décisions. **Aucune ligne de code applicatif n'est modifiée** tant que l'étape 1 de la migration n'est pas validée.

---

## 1. Constat

Le Dashboard actuel n'a pas d'identité claire.

Il mélange plusieurs rôles :

- développement ;
- supervision ;
- banc de test ;
- modération ;
- feature flags ;
- raccourcis de configuration.

Résultat : l'écran n'est pas compréhensible rapidement et devient difficile à maintenir.

Deux problèmes majeurs ont été identifiés :

1. Les feature flags actuels ne gouvernent pas réellement les modules.
   Un flag OFF masque parfois une ligne d'interface, mais le runtime continue à fonctionner.

2. Les diagnostics sont redondants.
   Plusieurs moteurs testent les mêmes sous-systèmes, et certains statuts sont codés en dur, notamment le faux signal 100% OPTIMAL.

## 2. Décision

Le Dashboard devient l'écran de gouvernance de l'application.

Il est restructuré en 4 onglets à responsabilité unique :

- **Santé** : lecture seule, état global réel + anomalies actionnables ;
- **Modération** : abus, signalements, recommandations GuardianLoop ;
- **Fonctionnalités** : registre des capacités activables ;
- **Développeur** : dumps runtime, Immatest, autotests, outils internes.

**Niveaux d'accès (3, pas plus)** : Utilisateur (Paramètres) · Gardien/Modérateur (onglets Santé/Modération/Fonctionnalités) · Développeur (onglet Développeur).

## 3. Invariants non négociables

### INV-DASH-001 — Une seule source d'activation

Une fonctionnalité métier ne peut être activée ou désactivée que par :

Dashboard → registre → runtime.

Aucun localStorage, Paramètres ou if local ne peut gouverner seul une fonctionnalité métier.

### INV-DASH-002 — Kill-switch réel

Un flag OFF arrête réellement le module.

Il doit empêcher :

- création de données ;
- écoute Realtime ;
- notifications ;
- affichage UI ;
- traitements internes.

Le contrôle doit être placé au chokepoint runtime du module, pas seulement dans l'interface.

### INV-DASH-003 — Fonctionnalité ≠ Préférence

Le Dashboard gouverne les fonctionnalités métier.

Les préférences utilisateur restent dans Paramètres :

- sons ;
- voix ;
- animations ;
- effets ;
- notifications personnelles.

Une préférence ne doit jamais être traitée comme un feature flag métier.

### INV-DASH-004 — Registre unique

Le registre est la source de vérité unique.

Il génère :

- Dashboard ;
- disponibilité des réglages dans Paramètres ;
- contrôles runtime ;
- documentation ;
- états de disponibilité.

Ajouter une fonctionnalité = ajouter une entrée dans le registre.

### INV-DASH-005 — Sens unique capacité → préférence

Une capacité peut rendre une préférence disponible.

Mais une préférence ne peut jamais réactiver une capacité éteinte.

### INV-DASH-006 — Vérité serveur prioritaire

Quand une donnée métier possède une source serveur, le Dashboard affiche la vérité serveur.

Il ne doit pas afficher un cache local comme vérité.

### INV-DASH-007 — Pas de faux vert

Aucun statut ne doit être codé en dur.

Le Dashboard affiche uniquement :

- 🟢 Sain ;
- 🟠 Attention ;
- 🔴 Critique ;

avec des anomalies réellement détectées.

## 4. Registre cible

Chaque fonctionnalité est décrite par une entrée unique :

- `key` : identifiant stable ;
- `label` : libellé affiché ;
- `group` : regroupement UI ;
- `stage` : alpha | beta | stable | deprecated | removed ;
- `scope` : device | account | fleet ;
- `default` : valeur par défaut ;
- `killSwitch` : chokepoint runtime associé.

## 5. Reclassement des flags actuels

À intégrer au registre :

- zones_accidentogenes
- demandes_aide
- alertes_route
- alertes_vehicule
- auto_status
- ange_proactive
- ange_monologue

À retirer du Dashboard et laisser uniquement dans Paramètres :

- sons
- voix_gps
- reduce_effects
- messages_notif
- appels_notif

Nuance importante :
un module peut avoir deux niveaux légitimes :

- la capacité métier, gouvernée par le registre ;
- la préférence de notification, réglée dans Paramètres (visible seulement si la capacité est disponible — INV-DASH-005).

## 6. Kill-switches runtime

Chaque module doit avoir un chokepoint clair.

Exemples (repères runtime identifiés dans le code actuel) :

- **Aide** : `assist()`, `subscribeRealtime`, `syncMapMarkers`, notifications (`notifyNearby` + Edge `notify-help-request`), `renderAideFeedV1`
- **Signalement route** : création (`roadReport()`), rendu carte, notifications
- **Signalement véhicule** : création (`vehicleAlert()`/`driverInfo`), réception, affichage
- **Zones accidentogènes** : rendu couche + alertes préventives
- **Auto-status** : logique conduite (vitesse > 20 → présence « conduite »)
- **Copilote / Ange** : analyses proactives + monologue

Règle : le kill-switch est vérifié avant tout effet de bord. Toute nouvelle fonctionnalité déclare son `killSwitch` dans le registre.

## 7. Portée des fonctionnalités

Chaque entrée du registre possède une portée explicite :

- `device` : ce téléphone ;
- `account` : ce compte, tous appareils ;
- `fleet` : gouvernance globale produit.

L'UI doit afficher cette portée pour éviter l'illusion qu'un flag local gouverne toute la flotte.

## 8. Cycle de vie

Chaque fonctionnalité suit un cycle unique :

alpha → beta → stable → deprecated → removed

Les fonctionnalités supprimées restent comme tombstones pour l'audit et les migrations.

| Stage | Utilisateur | Gardien | Comportement |
|---|---|---|---|
| `stable` | visible (Paramètres) | visible | réglable |
| `beta` | visible + badge BÊTA, opt-in | visible | réglable |
| `alpha` | absent | visible (grisé activable) | Gardien-only |
| `deprecated` | absent | visible (marqué) | lecture seule, retrait planifié |
| `removed` | absent | historique only | tombstone (audit / anti-régression migration) |

## 9. Diagnostics

Les diagnostics actuels doivent être fusionnés.

Cible :

- 1 agrégateur Santé production ;
- 1 banc Développeur à la demande.

Les voyants métaphoriques ou non actionnables doivent être supprimés ou relégués au mode Développeur.

Le faux statut 100% OPTIMAL codé en dur doit disparaître.

## 10. Données métier

Les doublons local / serveur doivent être nettoyés.

Exemple connu :

ic_trust / ic_trust_scores

Le Dashboard doit afficher la réputation serveur, pas un cache local legacy.

## 11. Migration non destructive

Migration en 6 étapes :

1. Ranger le Dashboard en 4 onglets.
2. Introduire le registre en parallèle des flags existants.
3. Générer progressivement Dashboard et Paramètres depuis le registre.
4. Ajouter les kill-switches runtime module par module.
5. Introduire les portées serveur avec feature_config.
6. Supprimer les diagnostics redondants et la logique morte.

## 12. Objectif final

Le Dashboard doit devenir un outil de gouvernance clair, fiable et maintenable.

Objectif :

- Dashboard = gouvernance des fonctionnalités ;
- Paramètres = préférences utilisateur ;
- registre = source de vérité unique ;
- flag OFF = module réellement arrêté ;
- diagnostics = fiables et actionnables ;
- architecture extensible à long terme.
