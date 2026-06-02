# Analyse — Conscience, Confiance, Décision
> Date : 2026-06-02
> Statut : analyse validée, implémentation future selon l'ordre de priorité

---

## Verdict global

Les deux propositions sont cohérentes avec l'ADN et la Constitution.
Elles peuvent être intégrées dans l'ordre proposé, sous conditions strictes.
Une troisième couche manquante a été identifiée — plus fondamentale encore.

---

## 1. immat-consciousness.json

### Cohérence
- ✅ ADN-1, ADN-5, ADN-6 : cohérent
- ⚠️ ADN-4 (non-autofondation) : risque si consciousness.json *définit* l'identité
  au lieu de la *dériver* de l'ADN existant
- ⚠️ TRF-005 / INV-015 : mission, vision, éthique existent déjà dans ADN.md,
  CONSTITUTION.md, immat-nervous-system.json#ange_identity
  → Consciousness doit transformer ces sources, jamais les réécrire

### Règle d'implémentation
```
consciousness.json est une projection de l'ADN + Constitution.
Pas un fondement. Pas une définition nouvelle.
L'ADN reste la couche immuable antérieure.
```

### Position dans l'architecture
```
ADN (immuable — antérieur)
  ↓
Constitution
  ↓
immat-consciousness.json  ← résumé dérivé pour les deux Anges
  ↓
immat-nervous-system.json
  ↓
Ange Gardien / Ange Protecteur
```

---

## 2. trust-system.json

### Cohérence
- ✅ ADN-3 : la confiance naît d'un événement réel (signal, signalement)
- ✅ ADN-6 : liberté sous contrainte tiers — la confiance ne peut pas être coercitive
- ✅ WHY-001 à WHY-003 : crédibilité d'un signalement est un vrai problème conducteur
- ⚠️ D-001 : un scoring public transforme ImmatConnect en réseau social → INTERDIT
- ⚠️ INV-010 : toute donnée comportementale requiert consentement explicite

### Règle d'implémentation
```
La confiance dans ImmatConnect est :
- privée (jamais publique)
- contextuelle (liée à un événement réel, pas à un profil)
- non-scorée (pas de note, pas de classement)
- consentie (l'utilisateur contrôle ce qu'il expose)

La confiance n'est jamais une réputation publique.
Elle est une propriété transversale des organes existants.
```

### Position dans l'architecture
```
Pas un nouvel organe isolé.
Une propriété transversale de : Signalements · Messages · Carte
```

---

## 3. Couche manquante identifiée — LA DÉCISION

### Observation
Toutes les couches existantes décrivent comment le système connaît et agit.
Aucune ne formalise comment l'humain décide.

```
ADN            → ce que le système est
Constitution   → ce que le système fait
Nervous System → comment le système perçoit et route
Consciousness  → qui est le système
Trust          → ce que le système croit des signaux

MANQUANT :
Agency Model   → comment l'humain décide
```

### Ce qui manque formellement
- Quelles informations sont nécessaires pour qu'une décision soit valide ?
- Quelle différence entre une décision du Gardien et du conducteur ?
- Quelle différence entre une suggestion de l'Ange et une décision ?
- Quand une décision est-elle irréversible ?

### Nom proposé
`agency-model.json` — ou couche DÉCISION dans l'architecture mère

### Priorité
Future. Bloquée par : niveaux 1 et 2 des organes + consciousness.json

### Pourquoi c'est plus fondamental que la confiance
"Puis-je lui faire confiance ?" est une question que l'humain tranche, pas le système.
La confiance est une entrée dans la décision.
La décision est ce qui précède l'action.
ADN-4 et ADN-7 la protègent déjà — elle n'est juste pas encore formalisée.

---

## Ordre de priorité validé

```
PRIORITÉ 1 — immat-nervous-system.json
  Ajouter level_1 et level_2 sur les 6 organes
  Formaliser la couche PERCEPTION
  → Prérequis de tout le reste

PRIORITÉ 2 — immat-consciousness.json
  Créer comme transformation dérivée de ADN.md + CONSTITUTION.md
  Définir roles.guardian (depth: 3) et roles.protector (depth: 2)
  → Racine commune des deux Anges

PRIORITÉ 3 — trust-system.json
  Formaliser la confiance comme propriété contextuelle privée
  Relier à : Signalements · Messages · Carte
  → Jamais réputation publique

PRIORITÉ 4 (future) — agency-model.json
  Formaliser la décision humaine dans l'architecture
  → Plus fondamental encore, mais peut attendre
```

---

## Risques récapitulatifs

| Risque | Couche | Mitigation |
|---|---|---|
| Duplication ADN | consciousness | Dériver, ne pas réécrire |
| Autofondation ADN-4 | consciousness | Résumé dérivé, pas fondement |
| Dérive réseau social D-001 | trust | Confiance privée, non-scorée |
| Violation INV-010 | trust | Consentement explicite requis |
| Décision non formalisée | toutes | agency-model.json (futur) |

---

```
status    : analyse validée
priority  : voir ordre ci-dessus
implement : non (PRIORITÉ 1 en attente)
blocked_by: level_1 et level_2 des organes
```
