# IMMATCONNECT — OBD CROSS-LINK AUDIT

## Objectif

Ce document applique la chaîne organique définie dans `OBD-ORGANIC-REFOUNDATION-AUDIT.md` pour vérifier que les éléments existants s'emboîtent sans oubli.

Il ne modifie aucune source canonique.
Il documente les liaisons fortes, les liaisons faibles et les risques futurs.

---

## Sources auditées

- `architecture/organism/ORGANISM-RULES.json`
- `immat-nervous-system.json`
- `knowledge/knowledge-index.json`
- `knowledge/organs.json`
- `knowledge/features.json`
- `knowledge/interactions.json`
- `knowledge/intentions.json`
- `architecture/IMMAT-FLOW-INDEX.json`
- `scripts/sync-knowledge.js`

---

## Résultat général

L'architecture organique est réelle et globalement cohérente.

La chaîne existe déjà :

```text
Intention
↓
Lois organiques
↓
Boucles vitales
↓
Organes
↓
Sens
↓
Features
↓
Flows
↓
Invariants
↓
Knowledge
↓
Ange / Gardien
```

Mais la chaîne n'est pas encore complète pour toutes les capacités actives.

Le risque principal n'est pas un bug immédiat.
Le risque principal est une perte progressive de traçabilité organique.

---

## Points solides

### 1. Racine intentionnelle claire

`knowledge/intentions.json` définit explicitement que la vraie racine n'est pas `features.json`, mais l'intention humaine.

Cela est cohérent avec la règle organique `INTENT_FIRST`.

### 2. Source nerveuse canonique claire

`immat-nervous-system.json` reste la source canonique du système nerveux.

Il contient :

- les sens ;
- la perception ;
- le routing ;
- les organes ;
- la gouvernance ;
- les invariants.

### 3. Lois organiques déjà formalisées

`ORGANISM-RULES.json` contient déjà :

- les règles organiques ;
- les boucles vitales ;
- les principes de non-dépendance à Ange ;
- la priorité de la réalité perçue sur la documentation.

### 4. Projection Gardien déjà protégée

`scripts/sync-knowledge.js` génère les projections conducteur et gardien.

Les fichiers générés ne doivent pas être modifiés directement.

### 5. Sync anti-dette déjà présent

Le script vérifie déjà une cohérence entre :

```text
architecture/organism/ORGANISM-RULES.json
↔
knowledge/decisions.json
```

C'est une excellente base pour éviter la dérive.

---

## Zones faibles détectées

### ZF-001 — Features actives sans flow explicite

Dans `knowledge/features.json`, plusieurs features actives n'ont pas encore de flow déclaré ou ont `flows: []`.

Features concernées :

```text
F-GPS
F-SIGNAL-ROUTE
F-APPEL
F-SOS
F-ANGE
F-PROFIL
```

Statut : dette de traçabilité légère à moyenne.

Impact :

```text
La feature existe,
mais son parcours organique complet n'est pas formalisé.
```

Correction recommandée :

Créer progressivement les flows manquants dans `architecture/IMMAT-FLOW-INDEX.json`, sans modifier le code métier.

Priorité :

1. `F-SIGNAL-ROUTE`
2. `F-SOS`
3. `F-APPEL`
4. `F-GPS`
5. `F-PROFIL`
6. `F-ANGE`

---

### ZF-002 — Intentions actives avec `flow: null`

Dans `knowledge/intentions.json`, plusieurs intentions importantes n'ont pas encore de flow rattaché.

Intentions concernées observées :

```text
INT-SIGNAL-ROAD
INT-NAVIGATE
INT-SOS
INT-ASK-ANGE
INT-MANAGE-PROFILE
INT-CONFIRM-DANGER
INT-RESOLVE-ALERT
INT-FEEL-SAFE
```

Statut : dette de diagnostic.

Impact :

```text
Un Gardien ou assistant externe peut comprendre l'intention,
mais ne peut pas toujours remonter vers un flow complet.
```

Correction recommandée :

Rattacher chaque intention active à un flow existant ou créer un flow minimal.

---

### ZF-003 — Flow index encore partiel

`architecture/IMMAT-FLOW-INDEX.json` contient actuellement seulement les flux suivants :

```text
FLOW-MAP-SELF-MARKER
FLOW-VEHICLE-ALERT
FLOW-ASSIST-REQUEST
FLOW-DIRECT-MESSAGE
FLOW-BADGES
```

Cela couvre une partie importante de l'organisme, mais pas toutes les capacités actives.

Correction recommandée :

Ajouter des flows documentaires, sans code, pour couvrir :

```text
FLOW-ROAD-REPORT
FLOW-GPS-NAVIGATION
FLOW-AUDIO-CALL
FLOW-SOS
FLOW-ANGE-DIALOG
FLOW-PROFILE-MANAGEMENT
FLOW-ALERT-CONFIRMATION
FLOW-ALERT-RESOLUTION
```

---

### ZF-004 — ANGE très central dans la compréhension

Ange est correctement défini comme assistant non décisionnaire.

Mais il est aussi le seul organe à cinq sens complets.

Risque futur :

```text
Ange devient la seule porte de compréhension du système.
```

Correction recommandée :

Maintenir strictement `ANGE_SURVIVAL_TEST` :

```text
Si Ange disparaît, l'application doit rester utilisable.
```

Toute fonctionnalité expliquée par Ange doit aussi être accessible par un chemin natif.

---

### ZF-005 — `sentir` encore incomplet

Le système nerveux définit `sentir` comme compréhension du contexte.

Mais l'implémentation semble encore partielle et principalement portée par Ange.

Risque futur :

```text
Le système observe et écoute,
mais comprend mal le contexte hors Ange.
```

Correction recommandée :

Ne pas activer de logique de décision contextuelle tant que `sentir` n'est pas rattaché à :

```text
snapshot
organes
flows
invariants
boucles vitales
```

---

## Problèmes futurs possibles et corrections intégrées

### P-001 — Nouvelle feature sans organe

Risque : organe fantôme.

Correction :

```text
Toute feature nouvelle doit déclarer organe + boucle vitale + flow.
```

---

### P-002 — Nouvelle règle hors lois organiques

Risque : Constitution parallèle.

Correction :

```text
Toute règle produit doit aller dans ORGANISM-RULES.json.
Toute contrainte non négociable doit aller dans les invariants.
```

---

### P-003 — Nouvelle donnée sans source canonique

Risque : duplication.

Correction :

```text
Toute donnée doit déclarer sa source canonique.
Sinon elle viole INV-011.
```

---

### P-004 — Nouveau fichier knowledge non indexé

Risque : knowledge invisible du Gardien.

Correction :

```text
Tout fichier knowledge doit être inscrit dans knowledge-index.json.
```

---

### P-005 — Nouveau flow non relié à une intention

Risque : flow technique sans besoin humain.

Correction :

```text
Tout flow doit répondre à une intention conducteur ou gardien.
```

---

### P-006 — Nouvelle projection modifiée manuellement

Risque : violation INV-015.

Correction :

```text
Modifier les JSON source.
Relancer sync-knowledge.js.
Ne jamais éditer les TS générés.
```

---

## Matrice minimale obligatoire par organe

Chaque organe doit pouvoir déclarer :

```text
mission
boucles_vitales
intentions
features
flows
senses
constraints
data
entry_points
risques
tests
```

État actuel :

```text
Auth          : fort mais peu représenté dans features.json
Profil        : présent, mais flow manquant
Carte         : solide pour position, incomplet pour GPS complet
Messages      : solide pour messages et badges, appels à formaliser
Signalements  : solide pour véhicule/aide, route/SOS à compléter
Ange          : solide conceptuellement, flow dialog à formaliser
```

---

## Priorités de stabilisation

### Priorité 1 — Ne pas toucher au code

La première stabilisation doit être documentaire et organique.

### Priorité 2 — Compléter les flows manquants

Ajouter les flows documentaires manquants dans `IMMAT-FLOW-INDEX.json`.

### Priorité 3 — Rattacher les intentions `flow:null`

Chaque intention active doit avoir :

```text
flow existant
ou
flow minimal à créer
ou
justification explicite si intention composite
```

### Priorité 4 — Étendre le check automatique

`scripts/sync-knowledge.js --check` pourrait plus tard vérifier :

```text
features actives sans flow
intentions actives sans flow
flows sans intention
features dont organe absent du NS
knowledge file non indexé
```

### Priorité 5 — Maintenir Ange non vital

Aucune capacité ne doit exister uniquement via Ange.

---

## Verdict

L'organisme est cohérent, mais pas encore totalement verrouillé.

La structure est saine.
La logique est bonne.
Les sources sont bien séparées.
Le mécanisme anti-duplication existe déjà.

Les risques restants sont des risques de complétude :

```text
features sans flow
intentions sans flow
flows partiels
sentir incomplet
Ange trop central dans la compréhension
```

Aucun de ces risques ne demande une refonte immédiate du code.

La meilleure action est de continuer à compléter la cartographie organique jusqu'à ce que chaque capacité active puisse remonter et redescendre la chaîne :

```text
Loi → Boucle → Organe → Sens → Feature → Flow → Invariant → Source → Test
```

Quand cette chaîne sera complète, l'application deviendra beaucoup plus difficile à casser, car toute évolution incomplète sera visible avant d'atteindre le code.
