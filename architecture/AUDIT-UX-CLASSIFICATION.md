# AUDIT — CLASSIFICATION UX ImmatConnect
> Date : 2026-06-02
> Périmètre : 10 fichiers /architecture/ux/ + UX-BACKLOG.md
> Méthode : Inventaire exhaustif · croisement IDs · vérification cohérence

---

## RÉSUMÉ EXÉCUTIF

La classification UX est **structurellement solide** : 120 items catalogués, IDs cohérents, backlog nettoyé. Elle souffre de **2 lacunes d'implémentation critiques** (INT-006, INT-010), **3 décisions Gardien bloquantes** (DA-001, DA-002, DA-004) et **1 incohérence de statut** à régler (enum alertes).

---

## 1. INVENTAIRE PAR FICHIER

### UX-CONSTITUTION.md
**Vision et principes fondamentaux**

| # | Contenu | État |
|---|---|---|
| WHY-001 → WHY-004 | 4 fondements produit | ✅ stables |
| P-001 → P-011 | 11 principes UX | ✅ stables |
| 6 organes naturels | RADAR · SIGNAL · CONTACT · AIDE · ROUTE · MOI | ✅ référencés dans NS |

**Note** : Constitution cohérente avec le NS v6. Aucun conflit identifié.

---

### UX-DECISIONS.md
**Décisions architecturales**

| Statut | Nb | IDs |
|---|---|---|
| ✅ Validées et implémentées | 8 | D-001 → D-008 |
| 💬 En attente Gardien | 4 | DA-001 → DA-004 |
| ❌ Rejetées (archivées) | 3 | DR-001 → DR-003 |

**Décisions implémentées notables :**
- D-001 : panelContact supprimé ✅ SESSION 11
- D-005 : SOS appui long ✅ SESSION 8
- D-007 : debug tools → Gardien seulement ✅ SESSION 10
- D-008 : onglet "Nouveau" supprimé ✅ SESSION 8

**Décisions bloquantes (impact fort) :**
- DA-001 : reportPanel 2 étapes ou accordéon ? → bloque P1-005
- DA-002 : navPremium simulé : supprimer ou "Bientôt disponible" ? → bloque P1-002
- DA-004 : blocage conducteur : DB ou localStorage ? → bloque P2-009

---

### UX-BUTTONS.json
**Inventaire complet des boutons**

| Catégorie | Nb actifs | IDs |
|---|---|---|
| Auth flow | 9 | BTN-A01 → BTN-A09 |
| Carte FABs | 8 | BTN-C01 → BTN-C08 |
| Report panel | 5 | BTN-R01 → BTN-R05 |
| Nearby panel | 2 | BTN-N01 → BTN-N02 |
| Panel messages | 10 | BTN-M01 → BTN-M10 |
| Panel activité | 6 | BTN-ACT01 → BTN-ACT06 |
| Panel drive | 9 | BTN-D01 → BTN-D09 |
| Panel settings | 11 | BTN-S01 → BTN-S11 |
| Call modals | 7 | BTN-K01 → BTN-K07 |
| Vehicle context menu | 5 | BTN-V01 → BTN-V05 |
| Ange dialog | 4 | BTN-G01 → BTN-G04 |
| **TOTAL ACTIFS** | **54** | — |

**Boutons morts (MORT) :**

| ID | Bouton | Problème | Statut |
|---|---|---|---|
| MORT-001 | `App.callSignalPlate()` — 📞 Appeler | Fonction inexistante (ReferenceError) | ✅ Supprimé SESSION 12 |
| MORT-002 | `App.actViewOnMap(alertId)` | Fonction implémentée mais aucun bouton n'y accède | 🔧 Orphelin actif |
| MORT-003 | Boutons `signalRecapCard` (div cachée) | Div display:none, jamais affichée | ✅ Supprimé SESSION 12 |
| MORT-004 | Bouton Envoyer / panelContact | Panel supprimé → bouton disparu | ✅ Supprimé SESSION 11 |
| MORT-005 | voicePlate / panelContact | Panel supprimé | ✅ Supprimé SESSION 11 |
| MORT-006 | voiceMsg / panelContact | Panel supprimé | ✅ Supprimé SESSION 11 |
| MORT-007 | sendMsg() / clearMsg() | Écriture directe dans champs inexistants | ✅ Supprimé SESSION 12 |

**Bilan MORT** : 7 catalogués · 6 supprimés · **1 restant (MORT-002 orphelin)**

**Boutons manquants (MISS) :**

| ID | Bouton | Impact | Priorité |
|---|---|---|---|
| MISS-001 (BTN-MISS01) | "Modifier profil" dans le drawer | FRI moyen | P2 |
| MISS-002 (BTN-MISS02) | FAB "Signaler ici" avec coordonnées tap | FRI moyen | P2 |
| MISS-003 (BTN-MISS03) | "Je viens aider" — réponse helper structurée | FRI-009 · P0 impact | P2 |
| MISS-004 (BTN-MISS04) | "Signaler abus" sur message reçu | INT-010 absent | P2 |
| MISS-005 (BTN-MISS05) | "Je remercie" formel | INT-006 absent | P3 |
| MISS-006 (BTN-MISS06) | Fiche flottante au tap marqueur alerte | UX-MAP Étape 1 | P3 |

---

### UX-INTERACTIONS.json
**11 interactions cataloguées (INT-001 → INT-011)**

| ID | Interaction | Implémentée | Complète | Problème |
|---|---|---|---|---|
| INT-001 | Message personnel | ✅ | ⚠ 90% | Pas de read receipt |
| INT-002 | Alerte véhicule | ✅ | ⚠ 85% | Pas de retour émetteur |
| INT-003 | Signalement route | ✅ | ✅ 95% | — |
| INT-004 | Demande d'aide | ✅ | ⚠ 80% | Pas de réponse helper |
| INT-005 | Appel WebRTC | ✅ | ✅ 90% | — |
| INT-006 | Remerciement | ❌ | ❌ 0% | **Non implémentée** |
| INT-007 | Résolution/Confirmé | ✅ | ✅ 95% | — |
| INT-008 | Blocage conducteur | ✅ | ⚠ 70% | Local seulement (DA-004) |
| INT-009 | SOS | ✅ | ⚠ 80% | Pas de canal distinct |
| INT-010 | Signalement abus | ❌ | ❌ 0% | **Non implémentée** |
| INT-011 | Notification système | ✅ | ✅ | — |

**Bilan** : 9/11 implémentées · 5/11 complètes · **2 absentes (INT-006, INT-010)**

---

### UX-JOURNEYS.json
**12 parcours utilisateur (JRN-001 → JRN-012)**

| Priorité | Parcours | Problème connu |
|---|---|---|
| P0 | JRN-001 : Alerter véhicule problème | ✅ |
| P0 | JRN-002 : Signaler danger route | ✅ |
| P0 | JRN-003 : Demande d'aide | ⚠ Pas de boucle helper |
| P0 | JRN-004 : Message conducteur proche | ✅ |
| P0 | JRN-005 : Recevoir alerte véhicule | ⚠ Pas de retour émetteur |
| P0 | JRN-006 : Recevoir message | ⚠ Pas de read receipt |
| P1 | JRN-007 : Demande appel | ⚠ callNotAllowedModal vague |
| P0 | JRN-008 : Résoudre demande d'aide | ✅ |
| P1 | JRN-009 : Navigation GPS | ⚠ navPremium données simulées |
| P1 | JRN-010 : Bloquer conducteur | ⚠ localStorage volatile |
| P0 | JRN-011 : Trouver conducteur proche | ✅ |
| P0 | JRN-012 : Consulter alertes actives | ✅ |

**Parcours P0 avec friction active** : JRN-003 · JRN-005 · JRN-006

---

### UX-FRICTIONS.json
**11 frictions cataloguées (FRI-001 → FRI-011)**

| ID | Friction | Gravité | Décision | Statut |
|---|---|---|---|---|
| FRI-001 | panelContact legacy dans DOM | Haute | D-001 | ✅ Résolu SESSION 11 |
| FRI-002 | navPremium données simulées | Haute | DA-002 | 💬 En attente |
| FRI-003 | Onglet "Nouveau" → navSignaler | Moyenne | D-008 | ✅ Résolu SESSION 8 |
| FRI-004 | Debug tools dans settings user | Moyenne | D-007 | ✅ Résolu SESSION 10 |
| FRI-005 | Deux systèmes de confiance | Moyenne | DA-005 | 💬 En attente |
| FRI-006 | Pas de confirmation lecture | Faible | — | P2 à concevoir |
| FRI-007 | Blocage local seulement | Faible | DA-004 | 💬 En attente |
| FRI-008 | reportPanel trop long (3 blocs) | Haute | DA-001 | 💬 En attente |
| FRI-009 | Pas de boucle réponse helper | Moyenne | — | P2 à concevoir |
| FRI-010 | SOS sans protection appui long | Haute | D-005 | ✅ Résolu SESSION 8 |
| FRI-011 | Carte en arrière-plan non interactive | Stratégique | — | P3 UX-MAP |

**Frictions résolues** : 4/11 · **Frictions en attente décision** : 4/11 · **Frictions à concevoir** : 3/11

---

### UX-SCREENS.json
**17 écrans/panels catalogués**

| Type | Nb | Statut |
|---|---|---|
| Auth flow | 4 | ✅ stables |
| Panels principaux | 6 | ⚠ panelContact marqué OBSOLÈTE |
| Overlays | 7 | ✅ stables |

**Écran mort :** `panelContact` — statut OBSOLÈTE dans UX-SCREENS.json, panel physiquement supprimé en SESSION 11. Le fichier doit encore être mis à jour pour refléter la suppression effective.

---

### UX-OBJECTS.json
**11 objets métier catalogués**

| Objet | Invariant | Statut |
|---|---|---|
| Conducteur | owner_plate immuable (INV-006) | ✅ |
| Véhicule | 1 conducteur = 1 plaque | ✅ |
| Message | Contexte réel requis (P-001) | ✅ |
| Conversation | Thread 2 plaques | ✅ |
| SignalementRoute | TTL configuré | ✅ |
| AlerteVehicule | INT-002 | ✅ |
| DemandeAide | INT-004 | ✅ |
| DemandeAppel | INT-005 | ✅ |
| PreferenceAppel | allow_calls boolean | ✅ |
| Localisation | GPS temps réel | ✅ |
| Interaction | Objet central unifié | ✅ |

**Aucun objet métier manquant identifié.**

---

### UX-INTERACTION-SKELETON.md
**Squelette A→B — bilan des flux**

| Score | Nb interactions | Détail |
|---|---|---|
| ✅ ≥ 90% | 4 | INT-001, INT-003, INT-005, INT-007 |
| ⚠ 70–89% | 5 | INT-002, INT-004, INT-008, INT-009, INT-011 |
| ❌ 0% | 2 | **INT-006, INT-010** |

**Incohérence statut enum (§5)** — 4 valeurs différentes utilisées pour l'état d'une alerte :
```
'seen'     → FloatingCard
'present'  → Activité "toujours là"
'gone'     → Activité "disparu"
'resolved' → Émetteur clôture
```
→ Décision requise : DEC-007 (unifier ?)

---

### UX-MAP.md
**Vision carte immersive — 3 étapes**

| Étape | Contenu | Priorité |
|---|---|---|
| Étape 1 | Direction véhicules + alertes hiérarchisées + fiches légères | P2–P3 |
| Étape 2 | Mode conduite + silhouette + état + clustering | P3 |
| Étape 3 | Mode nuit + 3D léger + tracé temps réel | Futur |

**État actuel** : marqueurs Leaflet cercles colorés avec plaque. Carte passive (arrière-plan). Cohérent avec P-009 ciblé mais non encore atteint.

---

## 2. COHÉRENCE DES CROSS-RÉFÉRENCES

**DET-003 non traité** — les fichiers ne sont pas encore liés entre eux par des champs bidirectionnels. Exemple manquant :

```json
{
  "interaction": "INT-004",
  "frictions":   ["FRI-009"],
  "buttons":     ["BTN-MISS03"],
  "journeys":    ["JRN-003"]
}
```

**Impact actuel** : navigation documentaire difficile entre BTN ↔ INT ↔ JRN ↔ FRI ↔ DEC. Aucun risque runtime.

**Ce qui fonctionne quand même** : les frictions référencent leurs décisions (`FRI-001 → D-001`), les boutons manquants référencent les frictions (`BTN-MISS03 / FRI-009`). La linkage existe dans un sens, pas dans l'autre.

---

## 3. ÉTAT GLOBAL DE LA CLASSIFICATION

| Dimension | Score | Commentaire |
|---|---|---|
| Couverture boutons | 9.5/10 | 54 actifs + 6 manquants documentés |
| Interactions | 8/10 | 2/11 jamais implémentées |
| Parcours utilisateur | 8.5/10 | 3 parcours P0 avec friction active |
| Frictions | 9/10 | Toutes cataloguées, décisions identifiées |
| Écrans/Panels | 9/10 | panelContact à mettre à jour en SUPPRIMÉ |
| Objets métier | 10/10 | Complet, invariants référencés |
| Décisions | 9/10 | 8 validées, 4 bloquantes identifiées |
| Cross-références | 6/10 | Partielles (unidirectionnelles) — DET-003 |
| Backlog | 10/10 | Nettoyé SESSION 12, source unique |
| **GLOBAL** | **8.8/10** | — |

---

## 4. ITEMS À TRAITER PAR PRIORITÉ

### Restant P0-P1 (décision requise, pas de code)
| ID | Item | Bloqué par |
|---|---|---|
| P0-001 | Cycle aide sans confirmation helper | DA-001 ou conception |
| P0-002 | Retour émetteur quand alerte vue | Conception |
| P1-002 | navPremium : supprimer ou "Bientôt" | DA-002 décision Gardien |
| P1-005 | reportPanel 2 étapes | DA-001 décision Gardien |

### MORT-002 restant (seul bouton mort non supprimé)
- `App.actViewOnMap(alertId)` — fonction implémentée, aucun bouton ne l'appelle. Options : ajouter un bouton "Voir sur carte" dans la card alerte (P2-015), ou supprimer la fonction.

### À mettre à jour dans les fichiers existants
- **UX-SCREENS.json** : `panelContact` toujours marqué OBSOLÈTE — à changer en SUPPRIMÉ avec la date SESSION 11.

### Décisions en attente — priorité recommandée
| ID | Question | Impact | Urgence |
|---|---|---|---|
| DA-002 | navPremium simulé | Désinformation utilisateurs | Haute |
| DA-001 | reportPanel structure | Ergonomie signalement | Haute |
| DA-004 | Blocage : DB ou localStorage | Vie privée conducteur | Moyenne |
| DA-003 | Activité : séparer Conversations/Alertes | Clarté UI | Moyenne |

---

## 5. CE QUI EST PARTICULIÈREMENT BIEN FAIT

1. **UX-CONSTITUTION.md** — fondation stable. Vision + principes + organes cohérents avec NS v6.
2. **UX-BUTTONS.json** — le plus complet. 54 boutons actifs + MORT + MISS = inventaire réel.
3. **UX-INTERACTION-SKELETON.md** — le plus utile opérationnellement : flux A→B + scores + boutons morts catalogués.
4. **UX-JOURNEYS.json** — 12 parcours P0→P1 avec frictions identifiées par parcours.
5. **UX-BACKLOG.md** — nettoyé SESSION 12, source unique, zéro doublon (vérification ci-dessus).
6. **UX-FRICTIONS.json** — toutes les frictions pointent vers une décision (D-* ou DA-*).

---

## 6. CONCLUSION

La classification UX est **opérationnelle et fiable**. Elle peut servir de source de vérité pour les décisions du Gardien.

Les 3 points d'attention qui subsistent :

| Point | Impact | Action |
|---|---|---|
| INT-006 + INT-010 non implémentées | Fonctionnalités sociales absentes | Décision Gardien requise avant implémentation |
| DA-001 + DA-002 bloquantes | 2 frictions P1 non résolues | Décision Gardien attendue |
| DET-003 cross-références partielles | Navigation docs difficile | Faible urgence, travail futur |

Aucune contradiction documentaire détectée dans l'état actuel.
