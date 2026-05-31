# FEATURE MANIFESTS — ImmatConnect Pro
# Mémoire vivante des capacités de l'organisme

> Ce fichier est la Couche 2 de l'architecture ImmatOrganism V2.
> Il documente ce que ImmatConnect FAIT et pourquoi.
> Toute modification du code concernant une capacité doit être reflétée ici.
> Une modification n'est pas terminée tant que ce fichier n'est pas à jour.

---

## TABLE DES MATIÈRES

- [CAPACITÉ : COMMUNIQUER](#capacité-communiquer)
- [CAPACITÉ : SIGNALER](#capacité-signaler)
- [CAPACITÉ : GOUVERNER](#capacité-gouverner)

---

---

## CAPACITÉ : COMMUNIQUER

**Statut** : active
**createdAt** : 2025-05-31
**lastRevisedAt** : 2025-05-31
**lastEvaluatedAt** : —

### Mission

Permettre à deux entités responsables de véhicules d'échanger une information utile en situation réelle, avec consentement explicite et respect des tiers.

### Problème réel résolu

Un conducteur observe quelque chose concernant un autre véhicule (problème mécanique, comportement dangereux, besoin d'aide) et n'a aucun moyen de contacter l'autre conducteur sans exposer ses données personnelles ni celles du tiers.

### Intention utilisateur

Entrer en contact de façon simple, rapide et sûre avec un autre conducteur identifié par sa plaque.

### Conséquence si supprimée

L'application perd sa raison d'être principale. Les conducteurs ne peuvent plus se prévenir mutuellement. Les signalements deviennent des alertes sans suite.

### Exemples d'usage

- Prévenir un conducteur d'un problème visible sur son véhicule
- Répondre à une alerte reçue
- Demander ou proposer de l'aide en situation d'urgence
- Confirmer une information reçue

---

### Fonctionnalités rattachées

| Fonctionnalité | Fichier | Statut |
|---|---|---|
| Messages plaque-à-plaque | messages.js | active |
| Appels audio in-app | calls.js | active |
| Réponses rapides | index.html | candidate |

---

### Lois locales

---

#### LOI-COM-001

**Règle** : Toute communication doit être initiée volontairement par l'émetteur. Aucun message ou appel ne peut être déclenché sans action explicite de l'utilisateur.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-007 (consentement explicite)
**Tests** : Vérifier qu'aucun message ne part sans action bouton. Vérifier qu'aucun appel ne se déclenche sans confirmation.
**Condition de révision** : Si un mécanisme de réponse automatique est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-COM-002

**Règle** : Toute communication doit respecter les données personnelles des tiers. La plaque d'immatriculation est l'identifiant unique autorisé. Aucune donnée personnelle supplémentaire (nom, téléphone, localisation précise) ne doit transiter sans consentement documenté.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-010 (protection données personnelles), INV-014 (non-transfert sans consentement)
**Tests** : Vérifier que les payloads des messages ne contiennent que la plaque et le contenu. Vérifier l'anonymisation dans diagnose().
**Condition de révision** : Si un profil conducteur étendu est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-COM-003

**Règle** : Un message lu doit produire un effet immédiat et visible sur les badges et compteurs. L'interface ne peut pas afficher un badge qui ne reflète pas l'état réel persisté.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-005 (fidélité interface), INV-011 (unicité source de vérité)
**Tests** : Lire un message et vérifier que le badge se met à jour. Recharger l'app et vérifier que l'état est cohérent.
**Condition de révision** : Si un système de badges différés est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-COM-004

**Règle** : Une suppression ou un masquage de message doit être volontaire, confirmé par l'utilisateur, et sa trace doit être mémorisée. Une suppression définitive requiert une confirmation supplémentaire.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-007 (consentement explicite), INV-009 (confirmation avant action irréversible)
**Tests** : Tenter de supprimer un message et vérifier la présence d'une confirmation. Vérifier que la suppression est tracée.
**Condition de révision** : Si un mécanisme de swipe-to-delete est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-COM-005

**Règle** : Aucun message ne doit déclencher une notification mensongère ou non cohérente avec son contenu réel persisté.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-005 (fidélité interface), INV-012 (persistance avant affichage)
**Tests** : Envoyer un message et vérifier que la notification reçue correspond exactement au contenu persisté.
**Condition de révision** : Si un système de notifications push est ajouté.
**refusedAt** : —
**refusedReason** : —

---

### Événements bus associés

| Événement | Déclencheur | Fichier source |
|---|---|---|
| VEHICLE_MESSAGE_SENT | Envoi d'un message | messages.js |
| VEHICLE_MESSAGE_RECEIVED | Réception / lecture | messages.js |
| CALL_REQUESTED | Demande d'appel | index.html |
| CALL_ACCEPTED | Appel accepté | calls.js |
| CALL_REFUSED | Appel refusé | calls.js |
| CALL_EXPIRED | Appel expiré sans réponse | calls.js |
| BADGE_RECOMPUTED | Recalcul badge messages | index.html |

### Invariants concernés

INV-005, INV-007, INV-009, INV-010, INV-011, INV-012, INV-014

### Observations terrain

— *(aucune observation enregistrée à ce jour)*

### Frictions connues

— *(aucune friction enregistrée à ce jour)*

### Conditions de révision

- Une fonctionnalité de suppression par swipe est envisagée → réviser LOI-COM-004
- Un mécanisme de notifications push est ajouté → réviser LOI-COM-005
- Un profil conducteur étendu est envisagé → réviser LOI-COM-002

### Conditions d'archivage

La capacité Communiquer ne peut pas être archivée tant qu'elle constitue la fonctionnalité principale de l'application. Condition d'archivage : remplacement par une capacité de communication équivalente validée par le Gardien.

---

---

## CAPACITÉ : SIGNALER

**Statut** : active
**createdAt** : 2025-05-31
**lastRevisedAt** : 2025-05-31
**lastEvaluatedAt** : —

### Mission

Permettre à un conducteur d'alerter son environnement d'une situation réelle observée, en respectant l'exactitude de l'information et les droits des tiers.

### Problème réel résolu

Un conducteur observe un danger, un accident, un bouchon ou une situation nécessitant de l'aide et n'a aucun moyen simple et sécurisé d'alerter les conducteurs proches ou de demander une assistance.

### Intention utilisateur

Signaler rapidement une situation réelle pour protéger ou informer les autres conducteurs, ou obtenir de l'aide.

### Conséquence si supprimée

La dimension citoyenne et communautaire de l'application disparaît. L'app devient un simple outil de messagerie privée et perd sa valeur de service collectif.

### Exemples d'usage

- Signaler un accident ou un obstacle sur la route
- Demander de l'aide en cas de panne ou d'urgence
- Alerter les conducteurs proches d'un danger imminent
- Confirmer qu'un signalement a été résolu

---

### Fonctionnalités rattachées

| Fonctionnalité | Fichier | Statut |
|---|---|---|
| Signalement route | index.html | active |
| Demande d'aide | index.html | active |
| Alertes véhicule | index.html | active |

---

### Lois locales

---

#### LOI-SIG-001

**Règle** : Tout signalement doit correspondre à une situation réelle observée par l'émetteur. Un signalement inventé ou approximatif viole la confiance communautaire et peut mettre des conducteurs en danger.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-005 (fidélité interface), INV-012 (persistance avant affichage)
**Tests** : Créer un signalement et vérifier qu'il est persisté avant d'être affiché. Vérifier qu'aucun signalement fantôme n'apparaît sans persistance.
**Condition de révision** : Si un système de signalement automatique ou géolocalisé est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-SIG-002

**Règle** : Tout signalement doit être lié à une position géographique ou à un véhicule clairement identifié. Un signalement sans contexte localisable n'est pas valide.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-001 (cloisonnement canal véhicule), INV-002 (cloisonnement canal route)
**Tests** : Tenter de créer un signalement sans position et vérifier le refus. Vérifier que la position est persistée avec le signalement.
**Condition de révision** : Si une fonctionnalité de signalement hors ligne est envisagée.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-SIG-003

**Règle** : Un signalement résolu peut être marqué comme traité. Cette action est volontaire et mémorisée. Elle ne supprime pas l'historique.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-007 (consentement explicite), INV-013 (traçabilité complète)
**Tests** : Marquer un signalement comme traité et vérifier que l'historique est conservé. Vérifier que l'action est tracée avec timestamp.
**Condition de révision** : Si un système de résolution automatique par délai est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-SIG-004

**Règle** : Un signalement ne doit pas exposer inutilement les données personnelles de l'émetteur ni du véhicule signalé. La plaque est l'identifiant autorisé. Toute donnée supplémentaire requiert un consentement explicite.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-010 (protection données personnelles), INV-014 (non-transfert sans consentement)
**Tests** : Inspecter le payload d'un signalement et vérifier l'absence de données personnelles non consenties.
**Condition de révision** : Si un profil conducteur public est envisagé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-SIG-005

**Règle** : Aucun signalement ne doit créer une alerte sans trace persistée en base. L'affichage d'une alerte sans persistance est une violation de l'invariant de fidélité.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-005 (fidélité interface), INV-012 (persistance avant affichage)
**Tests** : Créer un signalement en mode dégradé réseau et vérifier le comportement. Vérifier qu'aucune alerte n'est affichée sans confirmation de persistance.
**Condition de révision** : Si un mode hors ligne avancé est envisagé.
**refusedAt** : —
**refusedReason** : —

---

### Événements bus associés

| Événement | Déclencheur | Fichier source |
|---|---|---|
| ROAD_CREATED | Création signalement route | index.html |
| ROAD_RESOLVED | Signalement marqué traité | index.html |
| HELP_CREATED | Demande d'aide créée | index.html |
| HELP_RESOLVED | Demande d'aide résolue | index.html |
| BADGE_RECOMPUTED | Recalcul badge activité | index.html |

### Invariants concernés

INV-001, INV-002, INV-005, INV-007, INV-010, INV-012, INV-013, INV-014

### Observations terrain

— *(aucune observation enregistrée à ce jour)*

### Frictions connues

— *(aucune friction enregistrée à ce jour)*

### Conditions de révision

- Observation terrain : majorité des signalements résolus en moins de 30 minutes → réviser la durée de visibilité
- Ajout d'un système de vote ou de confirmation communautaire → réviser LOI-SIG-001
- Fonctionnalité hors ligne avancée → réviser LOI-SIG-005

### Conditions d'archivage

Si la fonctionnalité de signalement est remplacée par un système tiers intégré, validé par le Gardien après évaluation terrain complète.

---

---

## CAPACITÉ : GOUVERNER

**Statut** : active
**createdAt** : 2025-05-31
**lastRevisedAt** : 2025-05-31
**lastEvaluatedAt** : —

### Mission

Garantir que ImmatConnect reste fidèle à sa mission, à son identité et à ses valeurs à travers le temps, les évolutions techniques et les changements de Gardien.

### Problème réel résolu

Sans gouvernance explicite, une application évolue selon les priorités du moment et dérive progressivement de son intention originale. Les décisions s'accumulent sans contexte, la mémoire se perd, et l'identité s'efface.

### Intention

Transmettre l'organisme intact à chaque Gardien successif, en conservant sa mission, sa mémoire et sa capacité d'évolution.

### Conséquence si supprimée

L'application perd son identité constitutionnelle. Les décisions futures ne peuvent plus être évaluées par rapport à une référence stable. L'organisme dérive sans signal.

---

### Rôle du Gardien

Le Gardien est serviteur de l'identité de l'application, pas son propriétaire. Il exerce la conscience opérationnelle de l'organisme. Il décide, valide et assume. Il ne délègue pas l'autorité finale.

Hiérarchie d'autorité : Coran → ADN → Invariants → Gardien → Application.

Le Gardien actuel est Kacem. Le rôle est transmissible via le protocole A-10.

---

### Fonctionnalités rattachées

| Fonctionnalité | Description | Statut |
|---|---|---|
| Atelier conversationnel | Boîte de dialogue admin connectée à Claude | candidate |
| diagnose() | Prise OBD — snapshot structuré du journal | active |
| query() | Interrogation OBD — traduction d'intention en filtre | active |

---

### Lois locales

---

#### LOI-GOV-001

**Règle** : Le Gardien est serviteur de l'identité, pas propriétaire. Il ne peut pas modifier l'ADN ni les Invariants sans révision constitutionnelle documentée et justifiée.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : tous (INV-001 à INV-014)
**Tests** : Vérifier que core/invariants.js n'est pas modifiable sans trace dans le journal des décisions constitutionnelles.
**Condition de révision** : Jamais, sauf révision constitutionnelle majeure.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-GOV-002

**Règle** : Claude traduit, questionne, alerte et propose. Claude ne valide jamais seul. Aucune règle n'est active sans validation explicite du Gardien.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-007 (consentement explicite), INV-009 (confirmation avant action irréversible)
**Tests** : Vérifier que l'Atelier ne modifie aucun fichier directement. Vérifier que chaque proposition de règle porte requiresGuardianValidation true.
**Condition de révision** : Si le rôle de Claude évolue vers un système de suggestions automatiques.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-GOV-003

**Règle** : Aucune modification durable (fonctionnalité, capacité, loi locale, comportement) n'est considérée comme terminée tant que le Feature Manifest correspondant n'est pas mis à jour. Une correction urgente peut être réalisée immédiatement mais reste ouverte jusqu'à sa documentation.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-013 (traçabilité complète)
**Tests** : Après chaque modification de code, vérifier que lastRevisedAt du Feature Manifest concerné a été mis à jour.
**Condition de révision** : Si un système de mise à jour automatique des Feature Manifests est développé.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-GOV-004

**Règle** : Un nouveau Gardien commence en phase d'observation. Il lit les Feature Manifests, le Testament et l'ADN avant d'agir. Il n'initie aucune modification de loi locale pendant les 30 premiers jours.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-004 (atomicité), INV-009 (confirmation avant action irréversible)
**Tests** : Vérifier que le protocole A-10 inclut explicitement cette période d'observation.
**Condition de révision** : Si la période de transition est jugée insuffisante ou excessive après une première transmission réelle.
**refusedAt** : —
**refusedReason** : —

---

#### LOI-GOV-005

**Règle** : Toute transmission du rôle de Gardien doit inclure : ADN, Invariants, Feature Manifests à jour, Testament du Gardien sortant, état des tensions ouvertes et angles morts connus.
**Statut** : active
**createdAt** : 2025-05-31
**lastEvaluatedAt** : —
**Invariants liés** : INV-013 (traçabilité complète)
**Tests** : Vérifier que le Testament est à jour au moment de la transmission. Vérifier que les tensions ouvertes sont documentées.
**Condition de révision** : Après la première transmission réelle de Gardien.
**refusedAt** : —
**refusedReason** : —

---

### Testament du Gardien

*Ce document est mis à jour régulièrement par le Gardien actif. Il facilite la transmission.*

**État actuel de l'organisme** : Phase 1 Observateur active. ImmatOrganism V2 en cours de déploiement. Feature Manifests créés pour Communiquer, Signaler et Gouverner.

**Tensions ouvertes** : L'Atelier conversationnel (boîte de dialogue admin connectée à Claude via Edge Function Supabase) est en phase candidate. L'Edge Function immat-brain-dialog n'est pas encore créée.

**Hypothèses en cours** : Le format Feature Manifest est testé pour la première fois. Sa lisibilité et son utilisabilité réelles ne sont pas encore confirmées.

**Angles morts connus** : Le signal du terrain repose entièrement sur la discipline du Gardien. Aucun mécanisme automatique ne peut capter les retours utilisateurs sans violer INV-010.

**Décisions majeures prises** : Fusion de Transmission dans la capacité Gouverner. Abandon du Conseil de Réalité, du Registre des Hypothèses et du Registre des Frictions comme composants autonomes. Tous vivent désormais dans les Feature Manifests.

---

### Contexte technique de reconstruction

Si le code source disparaît, une équipe peut reconstruire ImmatConnect à partir de ce document avec les informations suivantes.

**Stack technique** : PWA (Progressive Web App), HTML/CSS/JavaScript pur sans framework front-end, Supabase comme back-end (auth, base de données, Edge Functions, Realtime), Leaflet pour la cartographie.

**Contraintes non-fonctionnelles** : Mobile first, offline first dans la mesure du possible, pas de framework JS lourd, minimalisme technique volontaire.

**Analogie directrice** : ImmatOrganism est l'ordinateur de bord de l'application. Le bus d'événements est le système nerveux. diagnose() est la prise OBD. query() est l'interrogation OBD. Claude est la valise de diagnostic. Le Gardien est le technicien qui interprète et décide.

**Architecture en couches** : Mission → Identité (ADN + Invariants) → Organisme (ImmatOrganism + Bus + ImmatBrain + diagnose() + query()) → Capacités → Feature Manifests → Code.

---

### Protocole A-10 — Transmission du rôle de Gardien

1. Le Gardien sortant met à jour le Testament.
2. Le Gardien sortant documente les tensions ouvertes et angles morts connus.
3. Le Gardien entrant lit ADN, Invariants, Feature Manifests et Testament intégralement.
4. Le Gardien entrant entre en phase d'observation : 30 jours sans modification de loi locale.
5. Le Gardien entrant peut utiliser diagnose() et query() pour comprendre l'état de l'organisme.
6. À l'issue des 30 jours, le Gardien entrant rédige sa propre lecture des tensions ouvertes.
7. La transmission est complète lorsque le nouveau Gardien a documenté sa première observation terrain dans un Feature Manifest.

---

### Événements bus associés

| Événement | Déclencheur | Fichier source |
|---|---|---|
| AUDIT_REQUESTED | Demande d'audit complet | core/immatOrganism.js |
| INVARIANT_VIOLATED | Violation d'un invariant détectée | core/brain.js |

### Invariants concernés

Tous. La capacité Gouverner est responsable de la cohérence globale avec l'ensemble des 14 invariants.

### Observations terrain

— *(aucune observation enregistrée à ce jour)*

### Frictions connues

— *(aucune friction enregistrée à ce jour)*

### Conditions de révision

- Après la première transmission réelle de Gardien → réviser LOI-GOV-004 et LOI-GOV-005
- Après le premier usage réel de l'Atelier conversationnel → réviser LOI-GOV-002
- Si le format Feature Manifest s'avère trop lourd à maintenir → réviser LOI-GOV-003

### Conditions d'archivage

La capacité Gouverner ne peut pas être archivée. Elle est constitutive de l'identité de l'organisme.

---

---

## RÈGLE DE TRAÇABILITÉ GLOBALE

> Toute modification durable — fonctionnalité, capacité, loi locale, comportement utilisateur — doit être documentée dans ce fichier.
>
> Une correction urgente peut être réalisée immédiatement dans le code.
>
> Mais elle n'est pas considérée comme terminée tant que le Feature Manifest correspondant n'est pas mis à jour.
>
> Objectif : empêcher la dérive entre réalité, mémoire et code.

---

## TEST FINAL DU CHANTIER

1. **Le fichier est-il lisible par un Gardien non développeur ?** Oui. Chaque capacité commence par une mission et un problème réel avant tout élément technique.
2. **Les capacités sont-elles compréhensibles ?** Oui. Chaque capacité explique sa raison d'être et ce qui se passe si elle est supprimée.
3. **Les lois locales sont-elles testables ?** Oui. Chaque loi porte un champ Tests avec des actions vérifiables manuellement.
4. **Les événements bus sont-ils reliés ?** Oui. Chaque capacité liste ses événements avec leur déclencheur et leur fichier source.
5. **Les invariants sont-ils reliés ?** Oui. Chaque loi locale cite les invariants concernés par numéro.
6. **Ce fichier peut-il servir à la future boîte admin ?** Oui. L'Atelier conversationnel peut lire les lois locales et les invariants liés pour contextualiser chaque dialogue.
7. **Ce fichier permet-il de reconstruire l'intention de chaque capacité ?** Oui. La section contexte technique de la capacité Gouverner contient les informations nécessaires à une reconstruction fidèle.

---

*Dernière mise à jour : 2025-05-31*
*Gardien actuel : Kacem*
*Version : 1.0.0*
