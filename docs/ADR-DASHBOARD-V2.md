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

### INV-DASH-008 — Registre 100 % déclaratif

Le registre décrit les fonctionnalités (métadonnées) mais ne contient **jamais** de logique métier. Aucune fonction, condition ou effet de bord dans le registre : uniquement des données (`key`, `label`, `group`, `stage`, `scope`, `default`, `killSwitch`, descriptif). `killSwitch` est une **référence** vers un chokepoint, pas du code.

### INV-DASH-009 — Un seul chokepoint runtime officiel par fonctionnalité

Chaque fonctionnalité possède **un seul** chokepoint runtime officiel, qui est la source de vérité de son activation. Toute autre vérification éventuelle (masquage de bouton, garde d'affichage) n'est qu'une **optimisation d'interface** et ne constitue jamais la source de vérité. Couper le chokepoint officiel = couper réellement la fonctionnalité (INV-DASH-002).

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

## 13. Points de vigilance (contraintes d'implémentation — opposables à toute étape)

Aucune implémentation ne doit enfreindre ces points sans décision ADR explicite.

1. **Ne pas confondre registre et logique métier.** Le registre reste déclaratif (décrit fonctionnalités, état, portée, chokepoint) — jamais de logique métier. (= INV-DASH-008)
2. **Ne pas faire une grosse refonte d'un coup.** Respecter la migration non destructive : spec registre → réorganisation UI → registre en parallèle → kill-switches plus tard, module par module. (= §11)
3. **Ne pas casser les Paramètres.** Les Paramètres continuent de fonctionner. On ne retire jamais brutalement une préférence existante : reclassement **progressif**.
4. **Ne pas croire qu'un flag UI suffit.** Masquer une ligne n'est pas un kill-switch. Un module OFF est bloqué **au runtime** avant : création de données, Realtime, notifications, affichage, traitements. (= INV-DASH-002)
5. **Ne pas créer plusieurs sources de vérité.** Pas de double activation registre + localStorage + Paramètres. À terme : registre = source unique pour les fonctionnalités métier. (= INV-DASH-001)
6. **Bien distinguer scope device / account / fleet.** Un réglage local n'est jamais présenté comme une gouvernance globale. (= §7)
7. **Ne pas supprimer les anciens diagnostics trop tôt.** D'abord créer l'agrégateur Santé, **puis seulement** retirer les anciens panneaux redondants. (= §11 étape 6)
8. **Éviter les faux statuts rassurants.** Aucun « 100 % optimal » codé en dur ; tout statut provient de vraies sondes. (= INV-DASH-007)
9. **Documenter chaque feature du registre.** Chaque entrée possède : `key`, `label`, `group`, `stage`, `scope`, `default`, `killSwitch`, **description courte**, et **comportement attendu si OFF**.
10. **Garder Aide V1 gelé.** La refonte Dashboard **ne modifie pas le runtime d'Aide**. Le Dashboard peut documenter Aide comme feature (entrée `aide`, `CK-AIDE`), mais ne câble aucun contrôle dans son runtime tant qu'un « Go » explicite n'est pas donné. *(Note factuelle : le Lot B Aide est déjà en production ; ce point signifie « ne rien toucher au runtime Aide pendant la refonte Dashboard ».)*
11. **Pas de dépendance circulaire.** Le Dashboard peut consulter les modules ; les modules ne dépendent **jamais** du Dashboard. Le Dashboard est une interface de gouvernance, pas une bibliothèque métier. (Le sens des dépendances : module → lecture `isFeatureEnabled(key)` ; jamais module → Dashboard UI.)
12. **Compatibilité ascendante.** Chaque étape se déploie sans casser les anciennes données. Migrations **additives** autant que possible. Pas de renommage destructif (les `key` du registre sont immuables ; `replaces` trace l'ancien flag).
13. **Observabilité.** Chaque kill-switch sait expliquer **pourquoi** un module est arrêté. Le mode Développeur affiche : état du registre, **valeur réellement appliquée**, scope (device/account/fleet), **origine de la décision**. Jamais un simple ON/OFF sans contexte.
14. **Performance.** Le registre n'est jamais un point de ralentissement. Lecture en mémoire/cache ; pas de requête serveur répétée à chaque rendu (snapshot au démarrage + invalidation ciblée).
15. **Tolérance aux erreurs.** Si le registre serveur est momentanément indisponible : comportement **déterministe**, aucune activation aléatoire, **stratégie de repli documentée** (repli sur dernière valeur connue en cache, sinon `default` du registre).
16. **Évolutivité.** Le modèle gère plusieurs centaines de fonctionnalités **sans modification de son schéma** (groupage + filtrage par `stage`, rendu data-driven).
17. **Audit.** Toute modification d'une fonctionnalité de portée `account` ou `fleet` est **historisable** : qui, quand, ancienne valeur, nouvelle valeur. (Journal serveur côté `feature_config`, étape 5.)
18. **Sécurité.** Le client ne peut **jamais** activer une fonctionnalité `fleet`. Les scopes `account`/`fleet` sont **validés côté serveur** (RLS + contrôle de rôle). Le `device` reste local.
19. **Tests.** Avant de passer `stable`, une fonctionnalité fournit : test registre, test kill-switch, test runtime, test UI.
20. **Documentation = condition de complétude.** Une fonctionnalité est incomplète tant que : l'entrée registre n'est pas renseignée (champs obligatoires #9), le `killSwitch` n'est pas déclaré, et la documentation n'est pas à jour.
