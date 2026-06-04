# IMMATCONNECT — OBD ORGANIC REFOUNDATION AUDIT

## Rôle du document

Ce document est une **porte d'entrée de diagnostic** pour comprendre, auditer et faire évoluer ImmatConnect sans casser son architecture organique.

Il ne crée **aucune nouvelle source de vérité**.
Il ne remplace ni le système nerveux, ni les lois organiques, ni les invariants, ni le knowledge.

Il sert uniquement à répondre à une question :

> Par où entrer pour comprendre l'organisme, diagnostiquer un problème et proposer une évolution sans créer de dette ?

---

## Sources réelles à respecter

L'ordre de lecture obligatoire est :

1. `architecture/organism/ORGANISM-RULES.json`
   - lois organiques ;
   - boucles vitales ;
   - règles d'évolution du produit.

2. `immat-nervous-system.json`
   - système nerveux canonique ;
   - sens ;
   - organes ;
   - perception ;
   - gouvernance ;
   - invariants.

3. `knowledge/knowledge-index.json`
   - index maître ;
   - sources ;
   - projections conducteur/gardien ;
   - rappel anti-duplication.

4. `knowledge/*.json`
   - mémoire structurée ;
   - décisions ;
   - organes dérivés ;
   - intentions ;
   - features ;
   - interactions ;
   - écrans ;
   - commits.

5. `scripts/sync-knowledge.js`
   - transformation ;
   - génération ;
   - contrôle anti-désynchronisation.

6. `supabase/functions/_shared/knowledge-conducteur.ts`
   - projection générée conducteur ;
   - lecture seule.

7. `supabase/functions/_shared/knowledge-gardien.ts`
   - projection générée gardien ;
   - lecture seule.

---

## Loi supérieure de cohérence

Toute évolution doit rester rattachable à la chaîne suivante :

```text
Loi organique
↓
Boucle vitale
↓
Organe
↓
Sens
↓
Feature
↓
Flow
↓
Invariant
↓
Fichier source
↓
Test / preuve
```

Si un maillon manque, l'évolution n'est pas prête.

---

## Principe OBD

Dans cette architecture, OBD signifie :

```text
Organic Behavior Diagnostic
```

Il ne s'agit pas d'un nouveau moteur.
Il s'agit d'une méthode d'entrée dans l'organisme.

OBD sert à :

- diagnostiquer où vit un problème ;
- rattacher une évolution à l'ADN existant ;
- éviter les organes fantômes ;
- éviter les features orphelines ;
- éviter la duplication de vérité ;
- empêcher la dérive entre code, knowledge, Ange et Gardien.

---

## Chaîne de refondation sûre

Une refondation ne doit jamais commencer par le code.

Elle doit suivre cet ordre :

```text
1. Identifier l'intention conducteur.
2. Identifier la loi organique concernée.
3. Identifier la boucle vitale renforcée.
4. Identifier l'organe concerné.
5. Identifier les sens activés.
6. Identifier la feature existante ou à rattacher.
7. Identifier le flow concerné.
8. Identifier les invariants impactés.
9. Identifier les fichiers sources.
10. Définir la preuve ou le test.
11. Modifier uniquement la source correcte.
12. Régénérer les projections si nécessaire.
13. Vérifier que l'application reste utilisable sans Ange.
```

---

## Règles anti-dette

### R-OBD-001 — Entrée, pas vérité

Ce document explique où lire.
Il ne définit pas de règle métier nouvelle.

### R-OBD-002 — Source canonique préservée

`immat-nervous-system.json` reste la source canonique du système nerveux.

### R-OBD-003 — Lois organiques préservées

`ORGANISM-RULES.json` reste la source des règles organiques et boucles vitales.

### R-OBD-004 — Projections générées

Les fichiers `knowledge-conducteur.ts` et `knowledge-gardien.ts` ne doivent jamais être modifiés directement.
Ils doivent être régénérés par `scripts/sync-knowledge.js`.

### R-OBD-005 — Pas d'organe fantôme

Aucune capacité majeure ne doit exister hors du système nerveux.

### R-OBD-006 — Pas de feature orpheline

Toute feature doit être reliée à :

```text
intention → boucle vitale → organe → flow → invariant
```

### R-OBD-007 — Pas d'Ange vital

L'application doit rester opérationnelle si Ange disparaît.
Ange conseille, explique, oriente.
Il ne devient jamais une dépendance fonctionnelle critique.

### R-OBD-008 — Réalité avant documentation

Une boucle documentée mais invisible pour le conducteur n'est pas considérée comme réellement vivante.

### R-OBD-009 — Rigueur proportionnelle à l'impact

Toute modification doit être classée :

```text
Impact faible  → organe + fichier + test
Impact moyen   → organe + sens + invariant + test
Impact fort    → loi + boucle + organe + flow + invariant + test
```

### R-OBD-010 — Stop si chaîne incomplète

Si la chaîne organique ne peut pas être remontée jusqu'à une loi et redescendue jusqu'à un test, la modification doit être suspendue.

---

## Audit des risques futurs

### Risque 1 — Duplication du système nerveux

Symptôme :

```text
knowledge/*.json
≠
immat-nervous-system.json
```

Correction :

```text
Modifier la source canonique.
Régénérer.
Vérifier avec sync-knowledge.js --check.
```

---

### Risque 2 — Assistant externe perdu

Symptôme :

```text
L'IA commence par le code,
ignore les lois,
propose un patch hors ADN.
```

Correction :

```text
Toujours commencer par ce document,
puis ORGANISM-RULES,
puis immat-nervous-system,
puis knowledge-index.
```

---

### Risque 3 — Feature utile mais non rattachée

Symptôme :

```text
La feature fonctionne,
mais aucun organe ni boucle vitale ne la porte.
```

Correction :

```text
Rattacher à une boucle existante,
ou demander validation Gardien pour créer un nouvel organe.
```

---

### Risque 4 — Ange devient central

Symptôme :

```text
Une action devient possible uniquement via Ange.
```

Correction :

```text
Refuser.
Créer ou exposer le chemin natif dans l'app.
Ange peut guider vers ce chemin, jamais le remplacer.
```

---

### Risque 5 — Gouvernance trop lourde

Symptôme :

```text
Chaque petite correction devient bureaucratique.
```

Correction :

```text
Appliquer la rigueur proportionnelle à l'impact.
Ne pas traiter un fix UX mineur comme une mutation ADN.
```

---

### Risque 6 — Gouvernance trop faible

Symptôme :

```text
Des modifications passent sans invariant ni test.
```

Correction :

```text
Toute évolution moyenne ou forte doit déclarer :
loi, boucle, organe, sens, invariant, test.
```

---

### Risque 7 — Régression silencieuse

Symptôme :

```text
Le code marche,
mais une boucle vitale ne se ferme plus.
```

Correction :

```text
Tester la boucle complète :
perception → action → retour conducteur → état final.
```

---

## Check-list Gardien avant modification

Avant d'autoriser une modification, le Gardien doit pouvoir répondre :

```text
1. Quelle intention conducteur ?
2. Quelle loi organique ?
3. Quelle boucle vitale ?
4. Quel organe ?
5. Quels sens ?
6. Quelle feature ?
7. Quel flow ?
8. Quels invariants ?
9. Quels fichiers sources ?
10. Quels fichiers générés à ne pas toucher ?
11. Quel test prouve que la boucle reste vivante ?
12. L'application fonctionne-t-elle encore sans Ange ?
```

Si une réponse manque :

```text
STOP — audit incomplet.
```

---

## Définition de stabilité optimale

L'application est considérée organiquement stable si :

```text
Toutes les évolutions découlent d'une loi.
Toutes les features renforcent une boucle vitale.
Tous les organes sont déclarés.
Tous les sens activés sont connus.
Tous les invariants critiques sont respectés.
Tous les fichiers générés restent dérivés.
Aucune vérité n'est dupliquée.
Aucun organe fantôme n'apparaît.
Aucune feature orpheline n'existe.
Ange reste assistant, jamais dépendance vitale.
Le conducteur perçoit réellement la valeur produite.
```

---

## Théorie du tout opérationnelle

```text
Une loi donne une direction.
Une boucle vitale donne une raison d'exister.
Un organe donne un lieu.
Un sens donne une manière de percevoir ou d'agir.
Une feature donne une capacité.
Un flow donne un parcours.
Un invariant donne une limite.
Un fichier source donne une matérialisation.
Un test donne une preuve.
Le Gardien valide.
Ange conseille.
Le conducteur reste au centre.
```

---

## Conclusion

La refondation sûre d'ImmatConnect ne consiste pas à remplacer l'architecture.
Elle consiste à rendre impossible l'oubli d'un maillon.

Ce document est donc un OBD :

```text
un point d'entrée de diagnostic,
un garde-fou de cohérence,
un guide de refondation sans rupture.
```

Il doit rester léger, stable, et strictement rattaché aux sources existantes.

Si une future évolution ne découle pas naturellement de cette chaîne, elle ne doit pas être ajoutée à l'organisme.
