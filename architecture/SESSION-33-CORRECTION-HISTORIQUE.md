# Amélioration Navigation Fonctionnalités

# SESSION 33 — CORRECTION-1 : HISTORIQUE DES SIGNALEMENTS VISIBLE

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03
> Issue : SESSION-31 Correction 1 — alertHistory peu visible

---

## PROBLÈME

L'historique des signalements du conducteur (`S.alertHistory`, 150 entrées localStorage) était enfoui dans :

1. L'étape 2 du panneau Altet — accessible uniquement après avoir cliqué "Route"
2. Un `<details>` collapsed par défaut

Le conducteur devait : ouvrir Altet → cliquer Route → déplier le `<details>`.

**3 actions pour voir ses contributions passées.** Résultat : la boucle CONFIANCE ne se fermait pas — le conducteur n'avait aucun retour visible sur ses actions.

---

## CORRECTION

### Avant

```html
<!-- Dans sigStep2Route (visible UNIQUEMENT après clic "Route") -->
<details id="alertHistoryBox" class="altet-history" style="margin-top:12px">
  <summary>Historique des signalements</summary>
  <div id="alertHistoryList" class="altet-list"></div>
</details>
```

### Après

```html
<!-- En dehors de tous les sig-steps — toujours visible dans panelAltet -->
<div id="alertHistoryBox" class="altet-history" style="display:none;...">
  <div class="sig-section-hd" style="margin-bottom:6px">Mes signalements</div>
  <div id="alertHistoryList" class="altet-list"></div>
</div>
```

### Display toggle dans renderAlerts()

```javascript
const histBox=$('alertHistoryBox');
if(histBox)histBox.style.display=S.alertHistory.length?'':'none';
```

La section n'apparaît qu'après le premier signalement — pas de bruit pour les nouveaux conducteurs.

---

## COMPORTEMENT

| Situation | Avant | Après |
|---|---|---|
| Conducteur ouvre Altet (0 signalement) | Section cachée | Section cachée — aucun bruit |
| Conducteur ouvre Altet (signalements passés) | Caché dans "Route" > `<details>` fermé | **Visible immédiatement sous les boutons** |
| Conducteur envoie un signalement, revient à Altet | Inaccessible sans 3 actions | **Visible au retour** |

---

## FICHIERS MODIFIÉS

| Fichier | Modification |
|---|---|
| `index.html` | `alertHistoryBox` sorti de `sigStep2Route` + section permanente + display toggle |
| `knowledge/decisions.json` | SESSION-33 ajouté en `decisions_implementees` |
| `knowledge/commits.json` | Session 33 ajoutée |

---

## BOUCLE RENFORCÉE

**CONFIANCE** (était 2/5) — cette correction améliore la visibilité des contributions passées.

Le conducteur ouvre Altet → ses signalements passés sont visibles sans action supplémentaire.

**Sans modifier la DB.** **Sans toucher aux logiques de signalement.** Modification UI pure.

---

## À NE PAS CONFONDRE

- `alertHistoryBox` = historique *personnel* du conducteur (ses propres signalements)
- `alertsList` = alertes actives dans le rayon (signalements de la communauté)
- `myAlertsList` = ses alertes actives (dans sigStep2Vehicle)

Ces 3 listes restent distinctes et correctement scopées.
