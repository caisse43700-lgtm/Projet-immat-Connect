# PROJET-INTEL — Mémoire Vivante ImmatConnect

**Rôle : porte d'entrée obligatoire de chaque session**
Toute session Claude ou Gardien commence par lire ce fichier.
Toute session termine en mettant ce fichier à jour.
Ce document ne remplace pas les fichiers détaillés — il les relie.

---

## PROTOCOLE DE SESSION

### En arrivant
1. Lire ce fichier en entier (5 minutes)
2. Lire les sections détaillées concernées par la tâche du jour
3. Vérifier les questions ouvertes — l'une d'elles concerne-t-elle la tâche ?

### En partant
1. Mettre à jour la section ÉTAT si quelque chose a changé
2. Ajouter une entrée dans le FIL CHRONOLOGIQUE
3. Mettre à jour les QUESTIONS OUVERTES (résolues ou nouvelles)
4. Mettre à jour TERRAIN-INTEL.md si une interaction a changé ou une incohérence corrigée

---

## ÉTAT DU PROJET — vue en un coup d'œil

| Dimension | État | Dernière mise à jour |
|-----------|------|---------------------|
| Fondation constitutionnelle | ✅ VERT — tous blocages critiques résolus | SESSION 5 (2026-05-31) |
| Application — stabilité | 🟡 EN COURS — 8 corrections SESSION 8 + 3 P0 | 2026-05-31 |
| Documentation technique | 🟡 EN COURS — TERRAIN-INTEL créé | 2026-05-31 |
| Incohérences connues | 5 actives, 4 corrigées | 2026-05-31 |
| Questions ouvertes | 4 (voir section dédiée) | 2026-05-31 |

---

## FONDATION — Ce qui gouverne tout

### Architecture souveraine (résolue SESSION 4)
```
Dieu (Souverain externe, immuable)
  ↓
Coran (ADN écrit du Souverain — fixé, préservé)
  ↓
ADN ImmatConnect (principes dérivés)
  ↓
Gardien (serviteur — Kacem actuellement)
  ↓
Application
```

### Décisions constitutionnelles actives

| ID | Décision | Session |
|----|----------|---------|
| MC-005 | A-2 résolu — Dieu = Souverain, Coran = référence | SESSION 4 |
| MC-006 | A-5 résolu — conflits axiomatiques arbitrés via le Coran | SESSION 5 |
| MC-007 | DR-3 résolu — Kacem est serviteur dès le début, pas fondateur-souverain | SESSION 5 |
| MC-008 | A-10 design validé — 7 qualifications du Gardien + protocole transmission | SESSION 5 |

### Principes fondateurs actifs (résumé)
- **ADN-1** : responsabilité — chaque entité répond de son véhicule
- **ADN-3** : obligation de notification correcte
- **ADN-6** : liberté de l'utilisateur sans nuire aux tiers
- **VEHICLE-001** : persist before notify — état persisté avant toute notification
- **A-(-1)** : non auto-fondation — le système ne se juge pas lui-même
- **T-01** : non autojuridiction
- **Conscience** : propriété du Gardien — capacité de reconnaître, comprendre et rechercher le bien révélé

### Lacunes actives prioritaires

| ID | Priorité | Statut | Bloque |
|----|----------|--------|--------|
| A-8 | HAUTE | Prêt à intégrer | MEMORY-REGISTER.md à créer |
| A-1 | HAUTE | Design en cours | Protocole d'autorisation |
| A-3 | HAUTE | Design en cours | Protocole de notification dans le code |
| A-10 | HAUTE | Design validé | Transmission Gardien |

**Détail complet :** `docs/constitution/CANDIDATES.md`
**Mémoires constitutionnelles :** `docs/constitution/MEMORY.md`
**Historique des sessions :** `docs/constitution/HISTORY.md`
**Corpus complet :** `docs/constitution/CORPUS-FINAL-CONSOLIDATED.md`

---

## APPLICATION — État technique

### Architecture fichiers

| Fichier | Rôle | Lignes |
|---------|------|--------|
| `index.html` | App object, état S, tous les panneaux | ~1970 (SESSION 8) |
| `messages.js` | Module ImmatMessages — messagerie P2P | 588 |
| `utils.js` | Fonctions partagées (esc, nPlate, km…) | 62 |
| `badge.js` | Module ImmatBadge — compteur non lus | 95 |
| `ui.js` | Module UIManager — navigation, panneaux | 391 |

### Incohérences actives (résumé)

| ID | Sévérité | Description courte | Statut |
|----|----------|--------------------|--------|
| INC-001 | MOYENNE | Double canal messages (postgres + broadcast) | Non corrigé |
| INC-002 | MOYENNE | Double canal signalements → doublons possibles dans S.alerts | Non corrigé |
| INC-003 | ✅ CORRIGÉ | Badge #topMsgBadge unifié sur updateActBadge() | 2026-05-31 |
| INC-004 | FAIBLE | App.panel() patchée 2 fois — ordre de chargement critique | Non corrigé |
| INC-005 | PERF | loadOthers() recrée tous les marqueurs à chaque update GPS | Non corrigé |
| INC-006 | ✅ CORRIGÉ | S.selPlate → classe act-mod-selected dans renderCategoryFeed | 2026-05-31 |
| INC-007 | MOYENNE | vehicleAlertQuick() — double envoi possible | Non corrigé |
| INC-008 | ✅ CORRIGÉ | messages.js unsubscribe() — scope client | 2026-05-31 |
| INC-009 | ✅ CORRIGÉ | XSS Nominatim searchGps() | 2026-05-31 |

**Détail complet des interactions et incohérences :** `docs/app/TERRAIN-INTEL.md`

### Zones floues connues
- `pendingSignalCount()` appelée dans index.html ligne 836 — non localisée dans les fichiers lus
- Comportement de App.panel() si UIManager pas encore chargé au boot
- RLS Supabase — clé publishable visible ligne 318, configuration non vérifiée

---

## FIL CHRONOLOGIQUE — Session par session

### SESSION 1-3 — Fondation V1
Création du corpus constitutionnel initial. ADN, axiomes, protocoles de base.
Résultat : CORPUS-FINAL-CONSOLIDATED.md, ADN.md, LIFECYCLE.md, ARCHIVE.md.

### SESSION 4 — Résolution A-2 (Le Souverain)
Problème : qui a autorité pour réviser N ? Toutes les options humaines échouaient à A-(-1).
Décision : Dieu = Souverain, Coran = ADN écrit, Gardien = serviteur.
MC-005 créé. CANDIDATES.md, MEMORY.md, HISTORY.md, PROTOCOLS.md, CORPUS-FINAL mis à jour.

### SESSION 5 — Architecture Conscience + résolutions
Missions :
- A-5 résolu : conflits axiomatiques → arbitrage via le Coran (3 niveaux)
- DR-3 résolu : Kacem est serviteur depuis le début, pas de transition fondateur
- Conscience définie : propriété du Gardien (pas couche séparée) — "capacité de reconnaître, comprendre et rechercher le bien révélé"
- A-10 design validé : 7 qualifications du Gardien + 5 étapes de transmission
MC-006, MC-007, MC-008 créés. Tous fichiers constitution mis à jour.
Diagnostic V1 : ROUGE → VERT.

### SESSION 8 — 8 corrections produit + ImmatCall WebRTC (2026-05-31)
Corrections réalisées :
- B1-1 : Appel audio WebRTC in-app (App.ImmatCall) — Supabase Broadcast + RTCPeerConnection + STUN
  - Bouton 📞 sur cartes Véhicule/Aide dans Activité, dans sigStep2Vehicle (recapCard), dans sigStep2Aide
- B2-1 : Indicateurs navPremium temps réel : Vitesse GPS / Conducteurs proches / Alertes actives (remplace Limite/Trafic/Voie simulés)
- B3-1 : Bouton × supprimer favori GPS individuel (renderFavs + deleteFav)
- B3-2 : Bouton × supprimer historique GPS individuel (renderHistory + deleteHistEntry)
- B4-1 : Bouton "Vider" liste véhicules récents (clearRecent)
- B5-1 : Bouton 🚫 Bloquer dans vehicleContextMenu (vehicleContextAction 'block')
- B6-1 : INC-006 corrigé — sélection carte → classe act-mod-selected dans renderCategoryFeed
- B7-1 : Suppression onglet "Nouveau" dans actCatPanel (doublon navSignaler)
Commits : 768a462, 6520ef3, 91ebeea, 8c2de9c, ed94590, 2648042, 8c5cc09, 3322e7b

### SESSION 7 — SYSTEM-KERNEL + INC-003 corrigé (2026-05-31)
Création de SYSTEM-KERNEL.md : noyau opérationnel, 10 domaines × 10 réponses précomputées.
Correction INC-003 : badge #topMsgBadge unifié sur updateActBadge() (suppression du double calcul dans updateCommunityStatus).
Réponse finale : le noyau est utile mais la vraie pièce manquante est la discipline d'exécution.
Commits : [voir git log]

### SESSION 6 — Audit application + P0 + TERRAIN-INTEL (2026-05-31)
Audit de l'application HTML (score 5.2/10).
Corrections P0 :
- INC-009 : XSS Nominatim corrigé (data-* attributes)
- INC-008 : Bug scope unsubscribe() messages.js corrigé
Réflexions :
- Pont corpus ↔ code : efficace pour les décisions architecturales, pas pour le bug-fixing quotidien
- Méthode : chaque décision architecturale → réflexe constitutionnel (quel ADN ça touche ?)
Créations :
- docs/app/TERRAIN-INTEL.md — adjoint terrain, carte complète de l'application
- docs/PROJET-INTEL.md — ce fichier, mémoire vivante du projet
Commits : 5ca4c22, 885a39a

---

## QUESTIONS OUVERTES — Décisions en attente

### Q-1 — INC-001/002 : doubles canaux intentionnels ou accidentels ?
Les canaux postgres_changes + broadcast pour messages et signalements sont-ils une redondance voulue (fiabilité) ou un accident d'architecture ?
**Qui décide :** Gardien (décision design)
**Impact :** si accidentel → supprimer l'un des deux, simplifie l'architecture

### Q-2 — INC-003 : unifier le badge ou accepter les 3 chemins ?
Badge #topMsgBadge mis à jour par badge.js, updateActBadge(), updateCommunityStatus().
**Qui décide :** Gardien
**Impact :** si unifié → choisir un seul chemin, risque de régression sur les 2 autres

### ~~Q-3~~ — RÉSOLUE (SESSION 8)
INC-006 corrigé : classe act-mod-selected ajoutée dans renderCategoryFeed quand nPlate(item.plate) === S.selPlate.

### Q-4 — RLS Supabase
La clé publishable est visible dans index.html. Acceptable seulement si Row Level Security est configuré.
**Action requise :** vérifier côté Supabase que RLS protège les tables messages, user_locations, profiles, reports
**Qui vérifie :** Gardien (accès dashboard Supabase)

### Q-5 — A-8 : créer MEMORY-REGISTER.md
A-8 est PRÊT À INTÉGRER depuis SESSION 5. Le format MC-ID existe dans MEMORY.md.
**Action requise :** créer docs/constitution/MEMORY-REGISTER.md, y consigner MC-001 à MC-008
**Priorité :** HAUTE

---

## PROCHAINES ACTIONS RECOMMANDÉES

### P0 restants (application)
- [ ] Vérifier RLS Supabase (Q-4) — aucun fichier à toucher, vérification dashboard
- [x] INC-006 corrigé (SESSION 8)

### V2 (corpus constitutionnel)
- [ ] Créer MEMORY-REGISTER.md (A-8, Q-5)
- [ ] Design A-3 (protocole notification dans le code)
- [ ] Résoudre Q-1 et Q-2 avec le Gardien

### V2 (application)
- [ ] Correction INC-002 (doublons signalements) si Q-1 tranchée accidentel
- [ ] Modifier profil conducteur depuis le drawer (PROP-10)
- [ ] Score fiabilité visible dans profil (PROP-09)
- [ ] Tester App.ImmatCall en conditions réelles (deux conducteurs connectés)

---

*Créé : SESSION 6, 2026-05-31*
*Mise à jour : SESSION 8, 2026-05-31*
*Fichier : docs/PROJET-INTEL.md*
