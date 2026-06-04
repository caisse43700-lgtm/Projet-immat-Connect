# IMMATCONNECT — OBD SIX CAPABILITIES AUDIT

## Objectif

Auditer les 6 capacités restantes identifiées comme manquantes dans la cartographie organique :

```text
FLOW-ROAD-REPORT
FLOW-SOS
FLOW-AUDIO-CALL
FLOW-GPS-NAVIGATION
FLOW-PROFILE-MANAGEMENT
FLOW-ANGE-DIALOG
```

But : rattacher chaque capacité à l'organisme sans modifier le comportement actuel de l'application.

Ce document ne modifie pas le runtime.
Il prépare les rattachements réels à faire ensuite dans :

```text
architecture/IMMAT-FLOW-INDEX.json
knowledge/features.json
knowledge/intentions.json
scripts/sync-knowledge.js --check
```

---

## Méthode

Chaque capacité est auditée selon le checksum organique :

```text
Loi organique
↓
Boucle vitale
↓
Organe
↓
Sens
↓
Intention
↓
Feature
↓
Flow
↓
Invariant
↓
Source
↓
Preuve
```

Statuts utilisés :

```text
COMPLETE     : chaîne complète
PARTIAL      : capacité réelle mais maillon manquant
PENDING      : rattachement proposé, à formaliser dans les sources
TO_VERIFY    : élément réel probable mais à confirmer dans le code
```

---

# 1. FLOW-ROAD-REPORT

## Capacité

Signalement route communautaire.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-SIGNAL-ROUTE`) et l'intention existe (`INT-SIGNAL-ROAD`), mais le flow est absent ou non formalisé.

## Checksum cible

```text
Loi organique : INTENT_FIRST · TRANSPARENCY · LOOP_CLOSURE · REALITY_OVER_DOCUMENTATION
Boucle vitale : CONTRIBUTION · ORIENTATION
Organe        : Signalements · Carte · Messages
Sens          : entendre · voir · sentir · goûter · toucher
Intention     : INT-SIGNAL-ROAD
Feature       : F-SIGNAL-ROUTE
Flow          : FLOW-ROAD-REPORT
Invariant     : INV-002 · INV-014 · INV-015
Source        : reports · S.alerts · S.alertMarkersById · ic_alerts
Preuve        : créer → afficher carte → badge activité → TTL/résolution → disparition cohérente
```

## Pourquoi ce flow est légitime

Il correspond à une capacité déjà active : informer les conducteurs proches d'un danger route.

Il ne crée pas une nouvelle fonctionnalité.
Il nomme un cycle vivant déjà présent.

## Risques à éviter

- ne pas confondre signalement route et alerte véhicule ;
- ne pas utiliser le canal véhicule ;
- ne pas inventer une résolution qui n'existe pas ;
- ne pas casser les TTL existants ;
- ne pas mélanger `tapLat/tapLng` avec l'aide.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-SIGNAL-ROUTE.flows = ["FLOW-ROAD-REPORT"]

knowledge/intentions.json
INT-SIGNAL-ROAD.flow = "FLOW-ROAD-REPORT"
INT-CONFIRM-DANGER.flow = "FLOW-ROAD-REPORT"
INT-RESOLVE-ALERT.flow = "FLOW-ROAD-REPORT"
```

---

# 2. FLOW-SOS

## Capacité

Alerte urgence protégée.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-SOS`) et l'intention existe (`INT-SOS`), mais le flow n'est pas formalisé.

## Checksum cible

```text
Loi organique : INTENT_FIRST · CALM_STATE · TRANSPARENCY · LOOP_CLOSURE
Boucle vitale : AIDE · RETENTION
Organe        : Signalements · Carte
Sens          : entendre · voir · goûter · toucher
Intention     : INT-SOS
Feature       : F-SOS
Flow          : FLOW-SOS
Invariant     : INV-003 · INV-010 · INV-015
Source        : panelDrive · SOS appui long 3s · reports/help future channel
Preuve        : appui long → confirmation → émission → visibilité → clôture/TTL
```

## Pourquoi ce flow est légitime

SOS est une capacité critique existante ou réservée.
Elle doit être séparée des demandes d'aide ordinaires pour éviter une confusion de priorité.

## Risques à éviter

- créer une alarme trop facile à déclencher ;
- mélanger SOS et assistance normale ;
- casser la règle d'état calme ;
- faire agir Ange à la place du conducteur ;
- transformer une future capacité en comportement non validé.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-SOS.flows = ["FLOW-SOS"]

knowledge/intentions.json
INT-SOS.flow = "FLOW-SOS"
INT-FEEL-SAFE.flow_pending = "FLOW-SOS"
```

---

# 3. FLOW-AUDIO-CALL

## Capacité

Appel audio conducteur à conducteur.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-APPEL`) et l'interaction existe (`INT-005`), mais le flow n'est pas formalisé dans `IMMAT-FLOW-INDEX.json`.

## Checksum cible

```text
Loi organique : INTENT_FIRST · SOCIAL_VISIBILITY · TRANSPARENCY · ANGE_SURVIVAL_TEST
Boucle vitale : COMMUNAUTE · CONFIANCE
Organe        : Messages
Sens          : entendre · voir · goûter · toucher
Intention     : INT-CONTACT-DRIVER
Feature       : F-APPEL
Flow          : FLOW-AUDIO-CALL
Invariant     : INV-010 · INV-CALL-002 · INV-015
Source        : CallManager · WebRTC reserved events · consentement explicite
Preuve        : appeler → sonnerie → accepter/refuser → session → fin/échec observable
```

## Pourquoi ce flow est légitime

L'appel audio est une extension naturelle de la boucle communauté.
Il reste dépendant du consentement explicite et ne doit pas être déclenché par Ange.

## Risques à éviter

- appel sans consentement ;
- appel déclenché automatiquement ;
- WebRTC hors Interaction ;
- événements non observables ;
- mélange appel/message sans statut clair.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-APPEL.flows = ["FLOW-AUDIO-CALL"]

knowledge/intentions.json
INT-CONTACT-DRIVER.flow reste FLOW-DIRECT-MESSAGE
ajouter flow_secondary = ["FLOW-AUDIO-CALL"] si le format est accepté
```

Si le format `flow_secondary` n'est pas retenu, garder le lien dans le flow lui-même via `intentions`.

---

# 4. FLOW-GPS-NAVIGATION

## Capacité

Navigation GPS / itinéraire.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-GPS`) et l'intention existe (`INT-NAVIGATE`), mais aucun flow n'est rattaché.

## Checksum cible

```text
Loi organique : INTENT_FIRST · TRANSPARENCY · ATTENTION_IS_SCARCE · REALITY_OVER_DOCUMENTATION
Boucle vitale : ORIENTATION · RETENTION
Organe        : Carte
Sens          : voir · sentir · toucher
Intention     : INT-NAVIGATE
Feature       : F-GPS
Flow          : FLOW-GPS-NAVIGATION
Invariant     : INV-014 · INV-015
Source        : panelDrive · recherche destination · itinéraire · S.lastSpeed si utilisé
Preuve        : rechercher → afficher route → suivre → arrêter → état stable
```

## Pourquoi ce flow est légitime

La navigation n'est pas un organe séparé.
Elle renforce l'organe Carte et la boucle ORIENTATION.

## Risques à éviter

- documenter des données simulées comme réelles ;
- mélanger navigation et premium simulé ;
- consommer trop d'attention ;
- exposer une vitesse exacte au lieu d'une catégorie.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-GPS.flows = ["FLOW-GPS-NAVIGATION"]

knowledge/intentions.json
INT-NAVIGATE.flow = "FLOW-GPS-NAVIGATION"
INT-FEEL-SAFE.flow_pending = "FLOW-GPS-NAVIGATION"
```

---

# 5. FLOW-PROFILE-MANAGEMENT

## Capacité

Gestion du profil conducteur.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-PROFIL`) et l'intention existe (`INT-MANAGE-PROFILE`), mais le flow n'est pas formalisé.

## Checksum cible

```text
Loi organique : TRANSPARENCY · SOCIAL_VISIBILITY · REVERSIBILITY
Boucle vitale : ORIENTATION · COMMUNAUTE · CONFIANCE
Organe        : Profil
Sens          : voir · entendre · goûter · toucher
Intention     : INT-MANAGE-PROFILE
Feature       : F-PROFIL
Flow          : FLOW-PROFILE-MANAGEMENT
Invariant     : INV-006 · INV-011 · INV-015
Source        : profiles table · panelSettings · colorHex/utils
Preuve        : modifier pseudo/couleur/téléphone → sauvegarder → affichage cohérent → plaque immuable
```

## Pourquoi ce flow est légitime

Le profil est un organe de stabilité identitaire.
Il impacte la carte, les messages et la confiance.

## Risques à éviter

- rendre la plaque modifiable ;
- exposer téléphone sans consentement ;
- désynchroniser couleur profil / marqueur carte ;
- modifier une information sociale sans transparence.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-PROFIL.flows = ["FLOW-PROFILE-MANAGEMENT"]

knowledge/intentions.json
INT-MANAGE-PROFILE.flow = "FLOW-PROFILE-MANAGEMENT"
```

---

# 6. FLOW-ANGE-DIALOG

## Capacité

Dialogue avec Ange.

## Statut actuel

```text
PARTIAL
```

La feature existe (`F-ANGE`) et l'intention existe (`INT-ASK-ANGE`), mais le flow n'est pas formalisé.

## Checksum cible

```text
Loi organique : ANGE_ASSISTS · ANGE_SURVIVAL_TEST · REALITY_OVER_DOCUMENTATION · ATTENTION_IS_SCARCE
Boucle vitale : APPRENTISSAGE · RETENTION
Organe        : Ange
Sens          : voir · entendre · sentir · goûter · toucher
Intention     : INT-ASK-ANGE
Feature       : F-ANGE
Flow          : FLOW-ANGE-DIALOG
Invariant     : INV-010 · INV-014 · INV-015
Source        : knowledge-conducteur.ts · knowledge-gardien.ts · immat-brain-dialog
Preuve        : question → réponse contextualisée → aucune décision autonome → chemin natif disponible
```

## Pourquoi ce flow est légitime

Ange est un assistant, pas un organe vital.
Le flow doit prouver qu'il conseille sans remplacer l'application.

## Risques à éviter

- faire d'Ange une dépendance fonctionnelle ;
- laisser Ange modifier un état ;
- créer une action accessible uniquement via Ange ;
- répondre hors knowledge ;
- perdre la séparation conducteur/gardien.

## Rattachements à appliquer ensuite

```text
knowledge/features.json
F-ANGE.flows = ["FLOW-ANGE-DIALOG"]

knowledge/intentions.json
INT-ASK-ANGE.flow = "FLOW-ANGE-DIALOG"
```

---

## Synthèse couverture après application future

Si les rattachements ci-dessus sont appliqués dans les sources :

```text
features actives sans flow : 0 attendu
intentions principales sans flow : fortement réduit
flows critiques non documentés : 0 attendu
Ange vital : non
runtime modifié : non
```

Score organique attendu :

```text
Avant rattachement : 91-95 %
Après rattachement documentaire : 98 %
Après warnings sync non bloquants : 99 %
```

---

## Étape suivante recommandée

Appliquer les rattachements dans cet ordre :

1. ajouter les 6 flows dans `architecture/IMMAT-FLOW-INDEX.json` ;
2. mettre à jour `knowledge/features.json` ;
3. mettre à jour `knowledge/intentions.json` ;
4. exécuter `node scripts/sync-knowledge.js --check` ;
5. régénérer seulement si nécessaire ;
6. ajouter plus tard des warnings non bloquants.

---

## Verdict

Les 6 capacités peuvent être reliées sans modifier le comportement de l'application.

La correction est organique :

```text
nommer ce qui existe déjà,
rattacher ce qui est réel,
refuser les liens artificiels,
garder Ange non vital,
préserver INV-015.
```

Ce document constitue la base de passage vers 98-99 % de cohérence organique.
