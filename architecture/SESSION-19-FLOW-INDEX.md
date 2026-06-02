# Amélioration Navigation Fonctionnalités

> SESSION 19 — IMMAT-FLOW-INDEX v1 : Index des flux organiques
> Source : Audit ANGE — Fluidité, simplicité, intention, mémoire, action
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Ce qui a été créé

### `architecture/IMMAT-FLOW-INDEX.json`

Un seul fichier léger. Pas un graphe complet. Pas une carte de conscience.  
Un index de **circulation** : comment les intentions traversent l'organisme.

**Structure de chaque flux :**
```
id             → identifiant symbolique
intention      → pourquoi ce flux existe (plus stable que le code)
organes        → organes NS concernés
repérage       → ui · code · state · data (le chemin complet)
impact         → effets indirects à mesurer avant tout patch
options        → ce qu'on peut proposer au conducteur ou au Gardien
qui_peut_agir  → conducteur · gardien · organisme
validation     → qui valide et pourquoi
mémoire        → où ça persiste (localStorage / DB / runtime)
```

**5 flux critiques — niveau 0 :**

| ID | Intention |
|---|---|
| `FLOW-MAP-SELF-MARKER` | Repérer le conducteur sur la carte en temps réel |
| `FLOW-VEHICLE-ALERT` | Prévenir un conducteur d'un problème sur son véhicule |
| `FLOW-ASSIST-REQUEST` | Demander de l'aide aux conducteurs proches |
| `FLOW-DIRECT-MESSAGE` | Communication privée entre deux plaques |
| `FLOW-BADGES` | Signaler non-lus et actions en attente sans surcharge |

---

## Branchement Ange — lecture seulement

`knowledge-gardien.ts` a été mis à jour avec une section **FLUX ORGANIQUES** compacte.

L'Ange peut maintenant :
1. Identifier le FLOW concerné par une demande
2. Lire : repérage + impact + validation
3. Répondre : "Flux concerné : FLOW-xxx. Voici les options. Validation : [conducteur autonome | Gardien requis]."

**Règle câblée dans knowledge-gardien :**  
> Si aucun FLOW trouvé → demander au Gardien de créer ou rattacher un FLOW avant de patcher.

---

## La théorie du tout — version finale légère

```
Intention  = sens (stable même quand le code change)
Repérage   = où dans le code
Impact     = ce qu'on ne peut pas ignorer
Option     = ce qu'on peut proposer
Validation = qui décide
Action     = le code exécute
Mémoire    = continuité de l'organisme
```

**Repositionnement des cinq sens :**  
Les cinq sens ne sont pas la structure centrale — ils sont le *langage organique* de la boucle.
```
Entendre → identifier l'intention
Voir     → repérer les composants
Sentir   → comprendre le contexte
Toucher  → mesurer l'impact
Goûter   → tester les options
```

**La conscience :**  
Pas un fichier. La conscience est la *qualité de la boucle complète* quand l'organisme peut dire :  
"Je sais pourquoi j'agis. Je sais où. Je sais ce que je risque. Je sais ce que je dois demander au Gardien."

---

## Ce qui n'a PAS été créé (délibérément)

| Refusé | Raison |
|---|---|
| `consciousness.json` | Risque philosophique — c'est la qualité de la boucle, pas un fichier |
| `organic-graph.json` | Trop large — risque de devenir énorme |
| `runtime-map complète` | Hors portée niveau 0 — commencer petit |
| Duplication NS | Le Flow Index *pointe* vers le NS — ne le duplique pas (INV-015) |
| Duplication UX | Le Flow Index *pointe* vers l'UX — ne la duplique pas |

---

## Plan niveau 1 — prochaines sessions

| Étape | Action |
|---|---|
| 1 | Tester avec 5 demandes réelles à l'Ange (ex : "Remplace le rond par une voiture") |
| 2 | Identifier les FLOW manquants détectés pendant les tests |
| 3 | Ajouter uniquement les flux manquants (ne pas compléter le graphe entier) |
| 4 | Si FLOW-MAP-SELF-MARKER modifié → test impact P3-001 (heading GPS) |
| 5 | ADN _v:8 — section `senses` (niveau 0 cinq sens — indépendant du Flow Index) |

---

## Fichiers modifiés

| Fichier | Nature |
|---|---|
| `architecture/IMMAT-FLOW-INDEX.json` | Créé — 5 flux organiques v1 |
| `supabase/functions/_shared/knowledge-gardien.ts` | Mis à jour — section FLUX ORGANIQUES compact |
| `architecture/SESSION-19-FLOW-INDEX.md` | Ce document |
