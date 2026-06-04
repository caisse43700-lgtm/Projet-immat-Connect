# AUDIT COMPLET — SESSION 13
> ImmatConnect · Interface, Interactions, Design, Ergonomie, Simulations A↔B
> Date : 2026-06-02
> Méthode : analyse statique index.html + 10 fichiers UX + simulations comportementales
> Filtre actif : TRF-006 — Quel coût réel cette modification réduit-elle ?

---

## CATÉGORIES DE L'AUDIT

1. [CARTE — Véhicules et alertes visuels](#cat-carte)
2. [ERGONOMIE — Boutons, disposition, densité](#cat-ergo)
3. [MODE PAYSAGE](#cat-paysage)
4. [INTERACTIONS A↔B — Simulations complètes](#cat-interactions)
5. [SOUS-MENUS ET OPTIONS EXISTANTS — Analyse](#cat-menus)
6. [NOUVELLES FONCTIONNALITÉS — Classement valeur/complexité](#cat-nouvelles)
7. [DESIGN — Couleurs, icônes, hiérarchie visuelle](#cat-design)
8. [SYNTHÈSE — Plan d'action par priorité](#cat-synthese)

---

<a name="cat-carte"></a>
## 1. CARTE — Véhicules et alertes visuels

### 1.1 État actuel

| Élément | Rendu actuel | Problème |
|---|---|---|
| Mon véhicule | Rond coloré + animation `selfPing` (pulse halo blanc) | Pas de direction, pas de silhouette |
| Autres véhicules | Rond coloré + plaque | Pas de direction, taille fixe quelle que soit la distance |
| Alertes route | Emoji ou SVG par type + TTL | Hiérarchie visuelle faible entre urgent / info |
| Alertes véhicule | FloatingCard en bas d'écran | Bonne, mais disparaît sans trace sur la carte |
| Demandes aide | Marqueur aide (type `assist`) | Pas de pulsation d'urgence, confondu avec alertes route |
| Conducteur stationnaire | Même rendu que conducteur en mouvement | Impossible de distinguer une panne d'un conducteur arrêté normal |

### 1.2 Ce qui manque sur la carte

#### A. Direction de déplacement
- Le GPS donne `heading` (cap en degrés).
- Les marqueurs `.car-pin` sont de simples cercles — la rotation `heading` n'est pas appliquée.
- **Fix** : `transform: rotate(${heading}deg)` sur un marqueur en forme de flèche ou de voiture de profil.
- **Coût** : Faible. L'info est déjà dans `S.others[plate].heading`.

#### B. Silhouette véhicule
- Actuellement : cercle coloré, neutre.
- Cible : icône SVG voiture (vue de dessus ou de profil) avec `fill: vehicle_color`.
- Les 3 états à distinguer visuellement :

| État | Rendu proposé | Déclencheur |
|---|---|---|
| Normal | Silhouette bleue/custom, halo léger | heading > 0 et speed > 5 km/h |
| Stationnaire | Silhouette avec croix ou bord pointillé | speed < 5 km/h pendant > 30s |
| Demande aide active | Silhouette + badge rouge pulsant | `a._mine && a.group === 'assist' && a.status === 'active'` |

#### C. Distance et taille relative
- Plus le véhicule est proche, plus son marqueur pourrait être légèrement plus grand.
- Un conducteur à 50m = marqueur 44px. Un conducteur à 2km = marqueur 30px.
- **Coût** : Faible avec `L.divIcon` dynamique + calcul `distanceTo`.
- **Valeur** : Améliore la lecture immédiate des distances sans ouvrir nearbyPanel.

#### D. Alertes autour d'un véhicule
- **Actuellement** : les alertes véhicule arrivent en FloatingCard en bas d'écran. Elles ne sont pas ancrées visuellement au marqueur du véhicule concerné.
- **Cible** : quand B signale une alerte sur le véhicule de A, un badge `⚠` apparaît **autour** du marqueur de A sur la carte (cf. `vehicleAlertOrbit` déjà prévu dans le DOM mais non utilisé à fond).
- **Comportement** :
  - Badge rouge pulsant autour du marqueur pendant 15 secondes
  - Disparaît quand A confirme "Vu"
  - Si A clique le badge → FloatingCard de détail

#### E. Distinction véhicule devant / derrière
- `frontCarBanner` détecte déjà le véhicule devant et propose un bouton "Contacter".
- **Manque** : aucune différenciation visuelle sur la carte entre "voiture devant moi" et "voiture quelconque".
- **Proposition** : quand `frontCarBanner.show === true`, le marqueur du véhicule détecté reçoit une bordure blanche épaisse (différente du `selfPing`) pour indiquer qu'il est "en interaction potentielle".
- **Coût** : Faible. Classe CSS conditionnelle sur le marqueur.

### 1.3 Hiérarchie visuelle des alertes sur la carte

Actuellement, toutes les alertes ont approximativement le même rendu visuel.

**Proposition de hiérarchie :**

| Niveau | Couleur | Animation | Taille icône | Exemples |
|---|---|---|---|---|
| Critique | Rouge `#e63946` | Pulse 1s infini | 40px | Incendie, SOS, accident grave |
| Urgent | Orange `#f4a261` | Pulse lent 2s | 34px | Panne, accident, obstacle |
| Important | Jaune `#f9c74f` | Statique | 30px | Bouchon, travaux, pneu |
| Info | Gris-bleu `#74b9c8` | Statique, réduit | 26px | Contrôle, feux allumés |
| Résolu | `#4a5568` transparent | Fondu sur 3s | 24px | Tout type résolu/expiré |

**Indicateur TTL** : arc de cercle autour du marqueur alerte, qui se vide au fil du temps (comme une minuterie visuelle). Coût : SVG + CSS stroke-dashoffset.

---

<a name="cat-ergo"></a>
## 2. ERGONOMIE — Boutons, disposition, densité

### 2.1 Inventaire des points d'entrée actuels

| Zone | Boutons présents | Problème ergonomique |
|---|---|---|
| FAB bas-droite | 4 boutons (recentrer, proches, vue, SOS) | Le SOS n'est pas assez distinctif — même taille que les autres |
| Nav bas | 3 boutons (Carte, Signaler, Activité) | "Signaler" au centre = bien. "Activité" à droite = logique |
| Top-bar droite | Badge messages + point online | Très discret, pas toujours trouvé par les nouveaux utilisateurs |
| Menu contextuel véhicule | 3 actions (Message, Signaler, Bloquer) | Bon. Mais manque "Voir sur carte" si on est dans une liste |
| FloatingCard | 2 boutons (Vu, →) | Bien. Mais "→" est ambigu (Répondre ? Naviguer ?) |
| reportPanel | 18 boutons en 3 blocs | Trop chargé. Scroll nécessaire. Contexte perdu. |
| panelActivite | Onglets Reçus/Envoyés + actions par card | Bien structuré mais dense |
| panelMessages | Onglets + compose + quick replies | Bien mais les quick replies ne sont pas toujours visibles |
| panelSettings | 10 boutons en grille | La grille mélange sécurité, debug, préférences, déconnexion |

### 2.2 Problèmes ergonomiques identifiés

#### P-ERGO-001 — SOS non différencié visuellement
- SOS et les autres FAB sont identiques en taille (52px).
- Le SOS doit être plus visible même sans l'activer.
- **Proposition** : SOS = bouton carré arrondi 60px, rouge plus vif, légère pulsation ambiante (pas le holding pulse — uniquement l'état repos).

#### P-ERGO-002 — FloatingCard : bouton "→" ambigu
- Le deuxième bouton de la FloatingCard (vert, `fcBtn2`) peut être "Répondre", "Voir sur carte" ou autre selon le contexte.
- L'icône `→` ne dit rien.
- **Proposition** : texte dynamique selon le type d'alerte :
  - Alerte véhicule → `"💬 Répondre"`
  - Alerte route → `"🗺 Voir"`
  - Demande aide → `"✋ J'aide"`

#### P-ERGO-003 — reportPanel trop long (DA-001)
- 3 blocs × 6 boutons = 18 boutons sur un seul overlay vertical.
- En portrait, nécessite de scroller.
- **Proposition de restructuration en 2 étapes** :

```
Étape 1 — Que se passe-t-il ?
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  🚗 Véhicule │  │  🛣️ Route    │  │  🆘 Aide     │
  │  (un conducteur)│ │  (tout le monde)│ │  (je suis bloqué)│
  └──────────────┘  └──────────────┘  └──────────────┘

Étape 2 — Type précis (selon choix étape 1)
  6 boutons du bloc correspondant seulement
```

- **Bénéfice** : 6 boutons au lieu de 18 dès l'ouverture. Contexte toujours clair.
- **Coût** : Faible. JS + CSS animation de transition.

#### P-ERGO-004 — panelSettings : mélange de catégories
**Actuellement dans panelSettings :**
- Bloqués, Récents (données personnelles)
- Confidentialité, Sons, Performance, Cache (préférences)
- Voix GPS (fonctionnel GPS)
- **Restaurer msgs, Sync alertes** (debug — ne devrait pas être là)
- Déconnexion (action critique)

**Proposition de réorganisation :**

```
panelSettings
├── MOI            : Bloqués · Récents · Confidentialité
├── PRÉFÉRENCES    : Sons · Voix GPS · Performance · Cache
├── COMMUNICATION  : Toggle appels entrants · Genre voix
└── COMPTE         : Déconnexion (en rouge, séparé)

[Gardien seulement — masqué sinon]
└── DEBUG          : Restaurer msgs · Sync alertes
```

#### P-ERGO-005 — Badge messages trop discret
- Le badge messages est dans la top-bar droite, petit, fond sombre sur fond sombre.
- Nouveau utilisateur : ne le trouve pas.
- **Proposition** : quand badge > 0, légère pulsation du point + couleur vert `#00d491` plus saturée.

#### P-ERGO-006 — Bouton "Contacter" dans nearbyPanel
- `nearbyPanel` affiche liste de conducteurs avec plaque + pseudo + distance.
- Le bouton "Contacter" ouvre `callContactModal` qui demande "Appel ou Message".
- 2 étapes pour envoyer un message = friction.
- **Proposition** : 2 micro-boutons par conducteur dans la liste :
  - `💬` → message direct (sans passer par le modal)
  - `🤝` → demande appel (modal conservé car consent requis)

### 2.3 Boutons qui manquent

| Manquant | Emplacement logique | Interaction complétée |
|---|---|---|
| `"J'arrive"` | card aide dans Activité (B) | INT-004 → 90% |
| `"Je ne peux pas"` | card aide dans Activité (B) | INT-004 → 90% |
| `"✓ Résolu"` | card alerte envoyée dans Activité (A, `_mine`) | IA-06 |
| `"⚑ Signaler abus"` | message reçu (thread ou liste) | INT-010 |
| `"Débloquer"` | liste bloqués dans Settings | INT-008 complété |
| `"Voir sur carte"` | card alerte Activité | MORT-002 (fonction existe, bouton absent) |

### 2.4 Boutons à supprimer ou simplifier

| Bouton | Problème | Action |
|---|---|---|
| `navSignaler` (nav bas) | Ouvre directement `reportPanel` — utile | **Garder** |
| Onglet "Nouveau" dans panelActivite | Redirige vers `navSignaler` — inattendu | **Supprimer l'onglet, pas l'action** |
| Debug tools dans Settings | Ne devraient pas être visibles des conducteurs | **Conditionner à `S.isGardien`** |

---

<a name="cat-paysage"></a>
## 3. MODE PAYSAGE

### 3.1 État actuel (media query existante)

```css
@media (orientation:landscape) and (max-height:560px) {
  .bottom-nav → vertical gauche (58px de large)
  .sheet → occupe tout l'espace à droite de la nav
}
```

Le mode paysage fonctionne structurellement, mais aucune adaptation **de contenu** n'est faite.

### 3.2 Problèmes en mode paysage

| Élément | Problème |
|---|---|
| reportPanel (overlay) | Prend toute la hauteur — 18 boutons encore plus compressés |
| panelMessages | Hauteur réduite — le compose est écrasé |
| FloatingCard | Positionnée en bas — peut se superposer au contenu |
| FAB stack | Repositionné mais sans tenir compte de la nav verticale |
| Carte | Gagne de l'espace horizontal mais le `map-shade` reste pour desktop uniquement |

### 3.3 Adaptations recommandées pour le mode paysage

#### A. reportPanel en 2 colonnes
En paysage, 18 boutons en grille 2×9 plutôt que 3×6.
Si on adopte les 2 étapes (P-ERGO-003), étape 1 = 3 grands boutons en ligne, étape 2 = 6 boutons en 2×3.

#### B. panelMessages en layout 2 colonnes
En paysage, si la largeur le permet (≥ 600px) :
- Colonne gauche : liste des conversations
- Colonne droite : thread ouvert

Identique à une messagerie desktop classique. Coût : media query + flex.

#### C. FloatingCard repositionnée
En paysage, la FloatingCard devrait apparaître en haut-droite (au lieu de bas) pour ne pas masquer la carte et les FABs.

#### D. Vue conduite optimisée paysage
En mode conduite actif (GPS lancé + `panelDrive` ouvert), le mode paysage devrait :
- Afficher la carte sur 60% de la largeur
- Afficher les infos de navigation sur 40% à droite
- Réduire tous les contrôles à 3 boutons maximum (Stop, Alerte rapide, Centrer)

---

<a name="cat-interactions"></a>
## 4. INTERACTIONS A↔B — SIMULATIONS COMPLÈTES

### SIM-001 — A signale un problème sur le véhicule de B

```
CONDUCTEUR A (signaleur)
  1. Voit le véhicule de B sur la carte (pneu crevé visible)
  2. Tape le marqueur de B → menu contextuel
  3. Choisit "⚠️ Signaler"
  → reportPanel s'ouvre sur le bloc Véhicule, plaque de B pré-remplie
  4. Choisit "🔴 Pneu / Roue"
  5. Appuie sur Envoyer

  CE QUE A VOIT :
  ✓ Toast : "Signalement envoyé à [plaque B]"
  ✓ Badge Activité Envoyés +1
  [MANQUE] Pas de retour si B a vu

CONDUCTEUR B (récepteur)
  CE QUE B REÇOIT :
  ✓ FloatingCard apparaît en bas :
    ⚠ [plaque A] vous signale : Pneu / Roue
    [Vu] [→ Répondre]
  ✓ Badge Activité Reçus +1
  ✓ Alerte dans Activité → onglet Véhicule

  OPTIONS B :
  ✓ "Vu" → dismiss FloatingCard, marque status=seen
  ✓ "→" → ouvre conversation avec A (quick reply disponible)
  ✓ "Info utile" → vote + score confiance A augmente
  ✓ "Faux signalement" → vote + score confiance A pénalisé
  ✓ Quick reply "Je vérifie" → message automatique vers A
  ✓ Quick reply "Je m'arrête" → message automatique vers A

  [MANQUE] A ne sait pas si B a vu et réagi

RETOUR ATTENDU VERS A (absent, à implémenter) :
  Quand B appuie "Vu" ou répond → notification silencieuse vers A :
  "✓ [plaque B] a vu votre signalement"
```

---

### SIM-002 — A demande de l'aide (panne)

```
CONDUCTEUR A (en panne)
  1. Appuie FAB Signaler
  2. reportPanel → Demander de l'aide → "Panne"
  3. Envoie

  CE QUE A VOIT :
  ✓ Marqueur aide apparaît sur sa propre carte
  ✓ Badge Activité +1
  ✓ Toast : "Demande d'aide envoyée"
  [MANQUE] A ne voit pas si quelqu'un vient
  [MANQUE] Pas de bouton "Résolu" ou "Annuler" visible facilement

CONDUCTEURS PROCHES (tous les B dans le rayon)
  CE QUE B REÇOIT :
  ✓ Marqueur aide sur la carte (icône distincte)
  ✓ Alerte dans Activité → onglet Aide
  ✓ Notification toast

  OPTIONS B ACTUELLES :
  ✓ "Je peux aider →" → ouvre conversation avec A

  OPTIONS B MANQUANTES :
  ❌ "J'arrive" → message structuré + badge "helper en route" sur le marqueur de A
  ❌ "Je ne peux pas" → message + alerte reste active pour autres B

RETOUR VERS A (manquant) :
  Quand B dit "J'arrive" :
  → A reçoit FloatingCard : "✋ [plaque B] arrive pour vous aider"
  → Badge spécial sur le marqueur de B côté A (distingue le helper en route)

CLÔTURE :
  [MANQUE] A doit pouvoir appuyer "✓ Résolu" dans Activité pour clore l'alerte
  → Marqueur disparaît pour tous
  → Optionnel : toast "Merci" vers B si B est venu aider
```

---

### SIM-003 — A envoie un message direct à B

```
CONDUCTEUR A
  Chemin 1 : carte → marqueur B → "💬 Message" → panelMessages (compose pré-rempli)
  Chemin 2 : nearbyPanel → [plaque B] → "💬" → panelMessages (compose pré-rempli)
  Chemin 3 : panelMessages → "Nouveau message" → saisir plaque manuellement

  CE QUE A VOIT :
  ✓ Compose pré-rempli avec plaque B
  ✓ Message dans onglet Envoyés après envoi
  ✓ Toast : "Message envoyé"
  [MANQUE] A ne sait pas si B a lu

CONDUCTEUR B
  CE QUE B REÇOIT :
  ✓ Badge messages top-bar +1
  ✓ Toast notification : "[plaque A] : aperçu du message"
  ✓ Message dans onglet Reçus

  OPTIONS B :
  ✓ Lire
  ✓ Répondre (ouvre thread)
  ✓ Quick reply (Je m'arrête, Je vérifie, Bien reçu)
  ✓ Supprimer
  ✓ Bloquer A

  CE QUE A VOIT APRÈS LECTURE PAR B :
  [MANQUE] Rien actuellement
  [À implémenter P2] : "✓ Lu" discret sous le message envoyé
```

---

### SIM-004 — A signale un danger sur la route (broadcast)

```
CONDUCTEUR A
  1. FAB Signaler → reportPanel → Route → "Accident"
  2. Envoie

  CE QUE A VOIT :
  ✓ Marqueur Accident apparaît sur SA carte
  ✓ Toast : "Signalement envoyé"
  ✓ TTL visible : alerte expirée dans 45min

TOUS LES CONDUCTEURS PROCHES (B, C, D...)
  CE QU'ILS REÇOIVENT :
  ✓ Marqueur sur la carte
  ✓ Toast si alerte urgente
  ✓ Badge alertes
  ✓ Alerte dans Activité → onglet Route

  OPTIONS :
  ✓ Tap marqueur → détail (type, âge, plaque signaleur)
  ✓ "Toujours là" / "Disparu" (vote)
  [MANQUE] Bouton "Voir sur carte" depuis Activité → `actViewOnMap()` existe mais orphelin
```

---

### SIM-005 — B bloque A

```
CONDUCTEUR B
  Suite à message indésirable de A :
  Option 1 : message → menu → "Bloquer [plaque A]"
  Option 2 : vehicleContextMenu → "🚫 Bloquer"

  RÉSULTAT :
  ✓ Plaque A disparaît de nearbyPanel
  ✓ Plaque A disparaît des marqueurs carte
  ✓ Messages de A filtrés
  ✓ Alertes véhicule de A ignorées

  [MANQUE] :
  ❌ Les alertes ROUTE de A sont-elles filtrées ? (broadcast anonyme — comportement à vérifier)
  ❌ Pas de bouton "Débloquer" facilement accessible
  ❌ Blocage perdu si cache effacé (DA-004)
```

---

<a name="cat-menus"></a>
## 5. SOUS-MENUS ET OPTIONS EXISTANTS — ANALYSE

### 5.1 Menu contextuel véhicule (tap sur marqueur carte)

**État actuel :**
```
┌─────────────────┐
│  [Plaque B]     │
├─────────────────┤
│ 💬 Message      │
│ ⚠️ Signaler     │
│ 🚫 Bloquer      │
└─────────────────┘
```

**Options manquantes et pertinentes :**
- `👁 Voir activité` → ouvre Activité filtrée sur cette plaque (messages + alertes avec B)
- `📍 Centrer sur carte` → zoom sur le marqueur de B si on l'a perdu de vue

**Options à ne pas ajouter :**
- Partager la position de B : violation vie privée
- "Signaler à la police" : hors scope
- Historique trajet : hors scope

**Proposition finale :**
```
┌─────────────────┐
│  [Plaque B]     │
├─────────────────┤
│ 💬 Message      │
│ ⚠️ Signaler     │
│ 🚫 Bloquer      │
│ 👁 Historique   │  ← nouveau, optionnel
└─────────────────┘
```

### 5.2 FloatingCard (alerte reçue)

**État actuel :**
```
[Icône] [Titre alerte] [Sous-titre]   [Vu]  [→]
```

**Problème** : `[→]` est ambigu selon le contexte.

**Proposition contextuelle :**

| Type alerte | Bouton 2 | Action |
|---|---|---|
| Alerte véhicule | `💬 Répondre` | Ouvre conversation avec l'émetteur |
| Alerte route | `🗺 Voir` | Centre la carte sur l'alerte |
| Demande aide | `✋ J'aide` | Envoie "J'arrive" et ouvre conversation |

### 5.3 Card dans Activité (alerte reçue, onglet Véhicule)

**État actuel :**
```
[Icône type] [Plaque] [Type problème] [Timestamp]
[Info utile] [Reçu] [Déjà réglé] [Faux]
[Quick reply: Je m'arrête · Je vérifie · Merci]
```

**Bien** : complet pour INT-002.

**Manque** : pour les alertes `_mine` (envoyées par A lui-même), il n'y a pas de bouton "Résolu" visible.

### 5.4 Card dans Activité (demande aide)

**État actuel :**
```
[🆘] [Plaque A] [Type aide] [Timestamp]
[Je peux aider →]
```

**À ajouter :**
- Côté B : `[✋ J'arrive]` · `[Je ne peux pas]` comme quick replies
- Côté A (`_mine`) : `[✓ Résolu]` pour clôturer l'alerte

### 5.5 Quick replies dans panelMessages

**État actuel :**
```
[Je m'arrête, merci.] [Je vérifie, merci.] [Bien reçu, merci.]
```

**Cohérents avec P-001 (contexte réel)**. Bien.

**À considérer** : ajouter un 4ème slot contextuel selon la dernière alerte reçue de l'interlocuteur :
- Si dernier message est une demande aide → `"J'arrive dans quelques minutes."`
- Si dernier message est alerte véhicule → `"Merci, je m'en occupe."`

---

<a name="cat-nouvelles"></a>
## 6. NOUVELLES FONCTIONNALITÉS — CLASSEMENT

### 6.1 Tier 1 — Essentiel (à implémenter sans attendre)

| # | Fonctionnalité | Coût | Valeur | Action |
|---|---|---|---|---|
| 1 | Quick replies "J'arrive" / "Je ne peux pas" dans card aide | Très faible | Critique | 2 lignes JS + template |
| 2 | Bouton "✓ Résolu" sur alertes `_mine` dans Activité | Très faible | Critique | Condition `_mine` + bouton |
| 3 | FloatingCard btn-2 contextuel (Répondre / Voir / J'aide) | Faible | Haute | `fcBtn2` texte dynamique |
| 4 | `actViewOnMap()` — ajouter le bouton manquant | Très faible | Haute | 1 bouton dans card alerte |
| 5 | reportPanel en 2 étapes (DA-001) | Faible | Haute | JS + CSS transitions |

### 6.2 Tier 2 — Utile (après validation terrain)

| # | Fonctionnalité | Coût | Valeur | Notes |
|---|---|---|---|---|
| 6 | Retour émetteur quand B confirme alerte | Faible | Moyenne | Push ou badge |
| 7 | Direction de déplacement sur les marqueurs | Faible | Moyenne | heading → rotate() |
| 8 | Badge alerte autour du marqueur véhicule | Moyen | Haute | vehicleAlertOrbit déjà prévu |
| 9 | Panneau Settings réorganisé en catégories | Faible | Moyenne | CSS + ordre HTML |
| 10 | Debug tools conditionnés à `isGardien` | Très faible | Haute | 2 classes CSS |

### 6.3 Tier 3 — Amélioration UX (P2/P3)

| # | Fonctionnalité | Coût | Valeur |
|---|---|---|---|
| 11 | Silhouette véhicule SVG avec direction | Moyen | Moyenne |
| 12 | TTL arc de cercle sur marqueurs alertes | Moyen | Faible |
| 13 | Confirmation lecture message (`read_at`) | Moyen | Faible |
| 14 | Signalement abus sur message (INT-010) | Moyen + backend | Moyenne |
| 15 | panelMessages 2 colonnes en paysage | Faible | Faible |
| 16 | Micro-boutons 💬 🤝 dans nearbyPanel | Faible | Faible |
| 17 | Remerciement formel (INT-006) | Faible | Très faible |
| 18 | Blocage DB vs local (DA-004) | Moyen + backend | Moyenne |

### 6.4 Tier 4 — À rejeter (TRF-006)

| Idée | Raison du rejet |
|---|---|
| Score réputation public | Contre ADN-6, INV-010, DR-001 |
| Messagerie hors contexte véhicule | Contre P-001 |
| Historique de trajet | Hors scope, vie privée |
| Demande rappel | Doublon appel, rarement utile |
| Refus d'un helper spécifique | Complexité sociale injustifiée |

---

<a name="cat-design"></a>
## 7. DESIGN — Couleurs, icônes, hiérarchie

### 7.1 Palette actuelle (confirmée dans CSS)

| Couleur | Hex | Usage |
|---|---|---|
| Fond principal | `#071018` | Fond app, panels |
| Vert succès | `#00d491` | Toast ok, bouton principal, online |
| Rouge danger | `#e63946` (--red) | SOS, bouton danger, toast bad |
| Orange alerte | `#ffb020` | Status "en attente", alertes medium |
| Bleu clair | `#eef6ff` | Texte sur fond sombre |
| Blanc halos | `rgba(255,255,255,.12)` | Boutons secondaires |

La palette est cohérente et bien contrastée. **Rien à changer.**

### 7.2 Icônes et sigles — problèmes identifiés

| Élément | Icône actuelle | Problème | Proposition |
|---|---|---|---|
| FloatingCard btn-2 | `→` | Ambigu | Texte contextuel (voir §5.2) |
| SOS FAB | Texte `SOS` | Lisible mais pas iconique | + silhouette d'urgence ou garder tel quel |
| "Conducteurs proches" FAB | SVG people | Bien | Garder |
| "Recentrer" FAB | SVG compass | Bien | Garder |
| Alerte véhicule FloatingCard | `🚘` | Générique | Icône selon type (pneu, feu, porte) |
| Bouton "→ Répondre" dans alerte | Texte "→" | Peu clair | `💬 Répondre` |
| Aide dans Activité | `🆘` | Fort et clair | Garder |

### 7.3 Hiérarchie des notifications (à corriger)

**Actuellement** : toast, FloatingCard, notification — 3 systèmes avec peu de hiérarchie.

**Proposition de hiérarchie unifiée :**

```
Niveau 1 — CRITIQUE (SOS, incendie)
  → FloatingCard rouge pulsante + son d'alerte
  → Ne disparaît pas seule

Niveau 2 — URGENT (alerte véhicule directe, accident proche)
  → FloatingCard orange + son discret
  → Disparaît après 8s sans interaction

Niveau 3 — IMPORTANT (message reçu, aide proche)
  → Toast vert avec icône + badge
  → Disparaît après 5s

Niveau 4 — INFO (conducteur rejoint la zone, confirmation)
  → Toast neutre sans son
  → Disparaît après 3s
```

### 7.4 Boutons — taille et accessibilité

| Contexte | Taille minimale recommandée | État actuel |
|---|---|---|
| FAB principal | 60px | 52px (trop petit pour pression rapide en conduite) |
| Boutons dans overlay | 48px min | Variable, certains à 36px |
| Quick replies | 36px min | OK |
| Boutons critiques (SOS, Raccrocher) | 68px | Non défini — se fonde dans la grille |
| Nav bottom | 64px hauteur | ✅ Correct |

**Règle d'or** : tout bouton susceptible d'être utilisé en conduite active doit mesurer ≥ 56px.

---

<a name="cat-synthese"></a>
## 8. SYNTHÈSE — PLAN D'ACTION

### Immédiat (sans décision Gardien, sans backend)

| Action | Fichier | Impact | Coût |
|---|---|---|---|
| Quick replies "J'arrive" / "Je ne peux pas" | index.html | INT-004 → 90% | Très faible |
| Bouton "✓ Résolu" sur alertes `_mine` | index.html | IA-06 résolu | Très faible |
| FloatingCard btn-2 texte contextuel | index.html | UX -1 friction | Très faible |
| Bouton "Voir sur carte" dans Activité | index.html | MORT-002 corrigé | Très faible |
| Debug tools → conditionner à `isGardien` | index.html | BUG-002 confirmé | Très faible |
| Débloquer conducteur dans Settings | index.html | INT-008 complet | Faible |

### Décision Gardien requise avant implémentation

| Décision | DA# | Options |
|---|---|---|
| reportPanel 2 étapes vs 3 blocs | DA-001 | Étapes (recommandé) vs accordéon |
| navPremium simulé | DA-002 | Supprimer vs marquer "futur" |
| Blocage DB vs local | DA-004 | DB (recommandé) vs local conservé |
| Direction véhicule sur carte | Nouvelle | Oui (heading SVG) vs Non |
| Badge alerte autour marqueur | Nouvelle | Oui (`vehicleAlertOrbit`) vs Non |

### Ne pas faire

- Score public de réputation
- Messagerie sans contexte véhicule
- Historique de trajet conducteur
- Refactoring architectural global
- Sur-architecture du système de notifications

---

## BILAN DE L'AUDIT

| Dimension | Score | Points forts | Lacunes |
|---|---|---|---|
| Interactions A→B | 7.5/10 | 6 interactions existantes bien implémentées | Boucle aide incomplète (55%), pas de retour lecture |
| Ergonomie | 7/10 | Nav bas claire, FABs bien positionnés | reportPanel trop chargé, FloatingCard btn ambigu |
| Carte vivante | 5/10 | Marqueurs colorés, clustering, TTL | Pas de direction, pas de silhouette, alertes non hiérarchisées |
| Design visuel | 8.5/10 | Palette cohérente, dark mode propre | SOS peu distinctif au repos, icônes génériques |
| Mode paysage | 6/10 | Layout structurellement fonctionnel | Aucune adaptation de contenu |
| Accessibilité | 6/10 | Nav bottom bonne taille | Certains boutons trop petits pour conduite |

**Score global** : 6.7/10

**Priorité absolue** : boucle aide (SIM-002) — la fonctionnalité d'aide est la plus critique et la plus incomplète. 4 interactions manquantes, coût très faible.
