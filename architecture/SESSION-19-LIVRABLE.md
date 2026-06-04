# Amélioration Navigation Fonctionnalités

> SESSION 19 — Implémentation des décisions DEC-001, DEC-003, DEC-006, DEC-008
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Décisions implémentées

### DEC-008 — Bouton "🙏 Merci" dédié (INT-006)

**Problème** : "Bien reçu" était le seul quick reply de gratitude, mêlant accusé de réception et remerciement social.

**Implémenté :**
| Emplacement | Avant | Après |
|---|---|---|
| `ic-quick` (messages) | 3 boutons : Je m'arrête / Je vérifie / Bien reçu | + 4ème bouton "🙏 Merci" |
| `_actModCard` messages reçus | Quick reply "Merci." | "🙏 Merci !" |
| `_actModCard` isOwn assist + helper_coming | ✓ Résolu / Retirer | + "🙏 Merci" vers `_helperPlate` |
| `_actAlertCard` isOwn aide + helper_coming | ✓ Résolu / Retirer | + "🙏 Merci" vers `_helperPlate` |

**Flux complet** : Conducteur A demande aide → Conducteur B répond "✋ J'arrive" → B arrive, A voit le badge "✋ En route · [plaque B]" → A peut maintenant cliquer "🙏 Merci" → message envoyé directement à B.

---

### DEC-001 — Indicateur de progression sigStep (FRI-008)

**Problème** : Le formulaire signalement `panelAltet` en 2 étapes n'avait aucun indicateur de position — l'utilisateur ne savait pas combien d'étapes restaient.

**Implémenté :**
- `sigStep1` : barre de progression 2 segments (segment 1 bleu = étape courante, segment 2 gris = étape suivante) + label "Étape 1 / 2"
- `sigStep2Route`, `sigStep2Vehicle`, `sigStep2Aide` : barre inversée (segment 1 gris, segment 2 bleu) + label "Étape 2 / 2"
- Zéro CSS ajouté — inline styles uniquement
- Le bouton "← Retour" déjà présent fait office de "Annuler"

---

### DEC-003 — Filtres type dans Activité (DA-003)

**Problème** : Dans `actCatPanel` (vue "Tout"), les messages et alertes étaient mélangés sans possibilité de filtrer.

**Implémenté :**
- Barre de filtres chips sous les onglets "Reçus" / "Envoyés" (visible seulement quand cat=all ou vehicle)
- 3 filtres : **Tout** | **💬 Messages** | **⚠️ Alertes**
- État `S._actTypeFilter` (réinitialisé à 'all' à chaque changement d'onglet et ouverture)
- `App.actTypeFilter(type)` — nouvelle méthode publique
- `App._renderTypeFilterBar(cat)` — rendu des chips
- `renderCategoryFeed` applique le filtre avant le rendu

---

### DEC-006 — Suppression alertsPanel DOM mort (INV-015)

**Problème** : `alertsPanel` overlay contenait `alertsListOverlay`, `alertsToolbarOverlay`, `alertHistoryListOverlay` — jamais populés, jamais ouverts. Violation INV-015 (un seul référentiel). Double du système `alertsList` dans `panelAltet`.

**Implémenté :**
- Suppression du `<div id="alertsPanel">` du DOM
- Suppression de `alertsPanel` dans `closeAllOverlays()`
- Suppression de `alertsPanel` dans le handler map click

**Impact zéro** : `openAlerts()` navigue vers `panelAltet` (pas alertsPanel). Aucune fonction n'ouvrait alertsPanel.

---

## Décisions sans action (confirmées)

| DEC | Raison |
|---|---|
| DEC-002 navPremium | Données toutes réelles (vitesse GPS, véhicules, alertes proches, recalcul) |
| DEC-004 blocage localStorage | INV-010 protège le droit de ne pas persister. Garder localStorage |
| DEC-007 unifier statuts | Refonte trop large pour cette session ("Ne fais pas de grosse refonte") |

---

## Décisions reportées

| DEC | Raison du report |
|---|---|
| DEC-005 trust unification | `reliability_score` DB et `S.trust` servent des rôles distincts (global vs local). Pas de duplication visible en UI. Risque > bénéfice. |
| DEC-007 statuts | 6→3 statuts nécessite migration donnée + retesting complet. Session dédiée. |

---

## Backlog mis à jour

| Item | Ancien statut | Nouveau statut |
|---|---|---|
| P2-013 Distinction messages/alertes Activité | 🔧 à implémenter | ✅ fait (DEC-003 filtres type) |
| P2-012 Séparer onglets Conversations/Alertes | 💬 à décider | ✅ fait (DEC-003 — filtres pragmatiques sans restructuration) |
| P3-021 INT-006 Remerciement formel | 🔲 à concevoir | ✅ fait (DEC-008 — 🙏 Merci dédié) |
| DEC-006 alertsPanel double DOM | — | ✅ éliminé |
| DEC-001 reportPanel accordéon | 💬 | ✅ fait (indicateur progression sigStep) |

---

## Bilan SESSION 19

**Fichier modifié :** `index.html` uniquement  
**Fichiers de doc :** `architecture/SESSION-19-LIVRABLE.md`  
**Backlog UX :** `architecture/ux/UX-BACKLOG.md`

**Impact organisme :**
- INV-015 : respecté (alertsPanel mort éliminé — un seul canal alertes)
- INV-003 (UX simple) : respecté (filtres inline, pas de composants)
- INV-008 (Ange informé) : S._actTypeFilter accessible via snapshot

**Sessions suivantes :**
- Implémenter `P2-015` : bouton "Voir sur carte" dans card alerte (MORT-002)
- Implémenter `P2-010` : supprimer code mort `_actMsgCard` + `_actAlertCard`
- Implémenter `P2-017` : supprimer badge `topMsgBadge` (déjà caché hors écran)
- DEC-007 : session dédiée unification statuts alertes
- Niveau 0 ADN cinq sens : section `senses` dans `immat-nervous-system.json` (_v:8)
