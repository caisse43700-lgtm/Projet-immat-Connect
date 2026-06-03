# Amélioration Navigation Fonctionnalités

> SESSION 29 — DEC-007 · Statuts alertes · Verdict non applicable
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## CONTEXTE

DEC-007 était en attente depuis SESSION 19 : "Unifier seen/present/gone/resolved → 3 statuts ?"
La décision était listée comme bloquant P2-016.

---

## INVENTAIRE COMPLET DES STATUTS UTILISÉS

| Statut | Qui l'assigne | Sémantique |
|---|---|---|
| `pending` | Création alerte | Alerte active, non confirmée par quiconque |
| `seen` | Conducteur voisin ou auto | "J'ai vu / je confirme" |
| `present` | Bouton "Toujours là" (group=route) | "Je confirme que le danger est encore là" |
| `gone` | Bouton "Disparu" (tout conducteur) | "L'obstacle a disparu" |
| `resolved` | Créateur uniquement via `canResolveAlert()` | "Je clôture mon propre signalement" |
| `helper_coming` | Réception message "J'arrive" | Spécifique group=assist — helper identifié |
| `seen_by_driver` | Alerte véhicule | Spécifique group=vehicle — conducteur ciblé a vu |

---

## ANALYSE — POURQUOI NE PAS UNIFIER

### Les comparaisons doubles (la "dette" visible)

```javascript
// 7 endroits dans index.html
a.status === 'seen' || a.status === 'present'   // "alerte confirmée"
a.status === 'gone' || a.status === 'resolved'  // "alerte terminée"
```

Ces comparaisons sont répétitives mais correctes. Le gain d'une unification serait uniquement de les éliminer.

### Ce qu'on perdrait en unifiant

**`gone` ≠ `resolved`** — sémantiques distinctes et protégées par code :

```javascript
// canResolveAlert() — réservé au créateur
if((status==='gone'||status==='resolved') && !canResolveAlert(a)) { return; }

// gone = n'importe quel conducteur peut déclarer "disparu"
// resolved = créateur uniquement (canResolveAlert vérifie a._own || a._mine)
```

Merger `gone` + `resolved` en un seul `done` supprimerait la distinction créateur/voisin.
Régression : un conducteur tiers pourrait marquer `done` une alerte qui appartient à quelqu'un d'autre.

**`seen` ≠ `present`** — intentions différentes :
- `seen` = "j'ai pris connaissance de l'alerte"
- `present` = "je confirme activement que le danger est toujours là" (bouton "Toujours là")

Merger ces deux statuts ferait disparaître la confirmation positive de présence du danger.

### Impact si refactoring quand même

| Zone touchée | Lignes | Risque |
|---|---|---|
| `upsertAlert()` | 409 | Filtre `['resolved','gone']` → à mettre à jour |
| `syncDerivedAlertUI()` | 898, 901, 1038-1042 | Logique auto-seen |
| `_actModCard()` | 1168, 1173, 1176-1179 | Affichage + boutons actions |
| `actConfirmAlert()` | 1222-1236 | Logique clôture + DB update |
| `actMarkAllSeen()` | 1208 | Marquer tout vu |
| `updateNavPremium()` | 619 | Comptage alertes actives |
| `canResolveAlert()` | 1004, 1085 | Garde créateur uniquement |
| Colonne DB `reports.status` | SQL | **Interdit en session** |

Total : 7 zones JS + 1 modification DB interdite.

---

## VERDICT

**DEC-007 clôturé comme non applicable.**

Les 7 statuts actuels ont chacun une sémantique précise et protègent des invariants comportementaux.
Les comparaisons doubles (`seen||present`, `gone||resolved`) sont de la logique métier correcte, pas de la dette.

Refactoriser imposerait :
- Toucher 7 zones dans index.html
- Modifier la colonne `status` en DB (interdit)
- Risque réel de régresser `canResolveAlert()` et la confirmation de présence route

**Rapport bénéfice/risque : nul / élevé. Ne pas toucher.**

P2-016 n'est pas bloqué par les statuts — si P2-016 a une description concrète, elle peut être traitée sans modifier le modèle de statuts.

---

## BILAN DÉCISIONS OUVERTES

| ID | Statut |
|---|---|
| DA-004 ic_blocked | ✅ Clôturé SESSION 28 — Option C |
| DEC-007 statuts alertes | ✅ Clôturé SESSION 29 — Non applicable |

**Aucune décision Gardien en attente.**
