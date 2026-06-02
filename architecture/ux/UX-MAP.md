# UX-MAP — Carte Immersive ImmatConnect
> Dérivé de : mission UX · panelDrive · analyse ChatGPT · inspirations Waze/Tesla/Google/Apple
> Statut : spécification cible — évolution progressive depuis l'état actuel

---

## ÉTAT ACTUEL

La carte est une carte Leaflet avec :
- Marqueurs SVG colorés (véhicule = rond coloré avec plaque)
- Marqueurs alertes (emoji ou SVG par type)
- Clustering basique
- Panel GPS séparé (panelDrive)

**Problème principal** : La carte est un fond avec des icônes.
Elle n'est pas une interface vivante.

---

## VISION CIBLE

La carte doit devenir l'**organe principal** d'ImmatConnect.
Tout commence et finit sur la carte.

```
Carte = interface vivante
  ├── véhicules comme entités avec état
  ├── alertes visibles et hiérarchisées
  └── actions accessibles sans navigation
```

---

## DEUX MODES CARTE

### Mode Conduite (Drive Mode)
**Usage** : Conduite active, attention limitée

| Principe | Détail |
|---|---|
| Boutons | Minimum — FAB Signaler + 1 action principale |
| Informations | Critiques uniquement (alerte urgente, aide proche) |
| Contrastes | Élevés — lisible au soleil |
| Ergonomie | Utilisable d'une main, pouces |
| Pas de | Menus, listes, panneaux lourds |

Éléments visibles :
- Ma position (marqueur grand, bien visible)
- Conducteurs proches (silhouettes légères)
- Alertes urgentes (badge rouge flottant)
- FAB Signaler (accessible 1 doigt)
- Vitesse actuelle (optionnel — GPS réel uniquement)

### Mode Exploration
**Usage** : Arrêté ou navigation lente

Éléments visibles :
- Tous les conducteurs connectés dans le rayon
- Toutes les alertes avec type et niveau
- Clustering si > 5 véhicules proches
- Interactions disponibles au tap
- Panel information latéral (sans quitter la carte)

---

## LES VÉHICULES COMME ENTITÉS VISUELLES

### État actuel
Simple rond coloré avec numéro de plaque.

### Cible
Chaque véhicule sur la carte doit avoir :

| Attribut | Implémentation |
|---|---|
| **Couleur** | couleur profil conducteur (déjà implémentée) |
| **Direction** | rotation selon heading GPS |
| **Silhouette** | icône voiture (side view) + couleur fill |
| **État** | normal · alerte reçue · demande aide · en conduite |
| **Proximité** | taille du marqueur selon distance (proche = plus grand) |
| **Alerte active** | badge rouge sur le marqueur si alerte envoyée |

### Chevauchement
- Si > 3 véhicules dans 100m : clustering visuel
- Tap sur cluster → expand
- Niveau de zoom : clusters s'ouvrent automatiquement

---

## LES ALERTES SUR LA CARTE

### Hiérarchie visuelle

| Niveau | Style | Exemples |
|---|---|---|
| Urgent | Rouge vif, animation pulse | Incendie, accident grave, SOS |
| Important | Orange, icône grande | Panne, bouchon, pneu |
| Info | Jaune/gris, icône normale | Travaux, contrôle, feux allumés |
| Résolu | Grisé, en fondu | Alerte expirée |

### Comportement
- TTL visible (badge temporisateur sur le marqueur)
- Disparition animée à expiration
- Tap marqueur alerte → mini fiche flottante (type, raison, âge)

---

## PANNEAUX FLOTTANTS (sans quitter la carte)

Remplacer les overlays lourds par des fiches légères :

| Déclencheur | Affichage |
|---|---|
| Tap marqueur véhicule | Fiche conducteur flottante (plaque, pseudo, distance, actions) |
| Tap marqueur alerte | Fiche alerte flottante (type, raison, depuis quand, résoudre) |
| Reçu alerte urgente | FloatingCard en overlay (déjà implémentée) |

---

## ORIENTATIONS ET INSPIRATIONS

### Waze
- Alertes en temps réel sur la carte ✅ (déjà implémenté)
- Icônes contextuelles par type ✅
- Mode nuit automatique 🔲 futur

### Tesla
- Interface minimaliste en conduite
- Peu de boutons, grands et accessibles
- État véhicule visible en permanence

### Google Maps / Apple Plans
- Carte immersive, pas de barres opaques
- Informations en couches selon le zoom
- Transitions fluides entre modes

### ImmatConnect spécifique
- Plaque = identité principale (pas le pseudo ni la photo)
- Communication > navigation (différent de Waze)
- Vie privée préservée — pas de photos, pas de profil public

---

## ÉVOLUTION PROGRESSIVE

```
MAINTENANT (V actuelle)
  Marqueurs SVG simples + panelDrive séparé

ÉTAPE 1 (P2)
  Véhicules avec direction (heading)
  Alertes hiérarchisées visuellement
  Fiches flottantes légères au tap

ÉTAPE 2 (P3)
  Mode conduite dédié (peu de boutons)
  Silhouette véhicule avec état
  Clustering intelligent

ÉTAPE 3 (Futur)
  Mode nuit automatique
  Vue 3D légère en conduite
  Chemin tracé en temps réel
```
