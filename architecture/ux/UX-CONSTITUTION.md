# UX-CONSTITUTION — ImmatConnect
> Dérivée de : CONSTITUTION.md · INVENTAIRE-PRODUIT.md · SPEC.md
> Statut : vivante — mettre à jour à chaque décision validée
> Règle : ne jamais réécrire, toujours enrichir

---

## POURQUOI CE DOCUMENT EXISTE

L'UX ImmatConnect doit survivre :
- aux changements de code
- aux changements d'interface
- aux changements de modèle IA
- aux changements d'équipe

Comme l'ADN survit aux cellules, l'UX doit survivre aux écrans.

---

## FORMULE DIRECTRICE

ImmatConnect est organisé autour des **situations réelles** des conducteurs,
pas autour de ses boutons.

```
Situation
→ intention
→ interaction
→ bouton
→ fonction
→ donnée
→ retour
→ résolution
```

---

## VISION UX (WHY — depuis CONSTITUTION.md)

**WHY-001** — ImmatConnect résout des problèmes réels de conduite.
La communication est un moyen, pas le but.

**WHY-002** — Toute fonctionnalité doit répondre à :
"Quel problème réel d'un conducteur cette fonctionnalité résout-elle ?"

**WHY-003** — Vitesse de résolution > quantité d'interactions.

**WHY-004** — ImmatConnect est une plateforme d'assistance contextuelle entre conducteurs.
PAS : réseau social, WhatsApp, messagerie générale, application d'appel, contact indifférencié.
RÈGLE : toute interaction doit avoir un contexte réel.

---

## PRINCIPES UX FONDAMENTAUX (P-001 à P-011)

**P-001** — Toute interaction nécessite un contexte réel.
Pas de message sans raison. Pas d'alerte sans situation.

**P-002** — Le véhicule est l'unité d'interaction, pas la personne.
L'identifiant canonique est la plaque, pas le pseudo.

**P-003** — Message prioritaire sur l'appel.
L'appel est toujours secondaire, jamais central.

**P-004** — Pas de communication sans action explicite.
Le système ne contacte jamais à la place de l'utilisateur.

**P-005** — Une seule source de vérité par donnée.
Pas de doublon de données, pas de doublon d'écran.

**P-006** — Tout retour doit être clair et immédiat.
L'utilisateur sait toujours si son action a réussi.

**P-007** — La confiance évalue les interactions, pas les personnes.
Pas de score public. Pas de réputation personnelle.

**P-008** — Toute action irréversible requiert une confirmation.
Le conducteur décide toujours.

**P-009** — La carte est l'organe principal.
Elle n'est pas un fond. Elle est l'interface vivante.

**P-010** — L'aide doit être accessible en 1 geste depuis la carte.
Signalement · Aide · SOS — toujours à portée de main.

**P-011** — Les données de debug n'appartiennent pas aux paramètres utilisateur.
Elles appartiennent au Gardien.

---

## LES 6 ORGANES UX NATURELS

Dérivés de l'analyse des situations conducteur.
Distincts des organes code (Auth, Profil, Carte, Messages, Signalements, Ange).

| Organe | Rôle | Panels actuels |
|--------|------|----------------|
| **RADAR** | Voir les conducteurs proches, sa propre position | panelAltet (carte), nearbyPanel |
| **SIGNAL** | Alerter — véhicule, route, aide | reportPanel, panelAltet (alertes) |
| **CONTACT** | Communiquer — message, appel | panelMessages, callOverlay |
| **AIDE** | Demander et recevoir de l'aide | reportPanel (assist), panelActivite |
| **ROUTE** | Naviguer — GPS, POI, favoris | panelDrive |
| **MOI** | Profil, paramètres, historique | panelSettings, sp |

---

## HIÉRARCHIE DES ÉCRANS

```
LANDING (sw)
  └── AUTH (sa) → Connexion / Inscription
        └── PROFIL SETUP (sp)
              └── APP SCREEN (sm = appScreen)
                    ├── RADAR     → panelAltet (carte + conducteurs)
                    ├── SIGNAL    → reportPanel (overlay)
                    ├── CONTACT   → panelMessages
                    ├── AIDE      → reportPanel/assist + panelActivite
                    ├── ROUTE     → panelDrive
                    └── MOI       → panelSettings
                          ├── nearbyPanel (overlay)
                          ├── alertsPanel (overlay)
                          ├── callOverlay (appel en cours)
                          ├── callContactModal
                          ├── callNotAllowedModal
                          └── angePanel (Gardien seulement)
```

---

## RÈGLES DE NAVIGATION

**RN-001** — La navigation principale est par panels glissants, pas par pages.
L'URL ne change pas. L'état vit dans `S`.

**RN-002** — La carte (panelAltet) est le panel par défaut après connexion.
Elle est toujours présente sous les autres panels.

**RN-003** — Les overlays (reportPanel, nearbyPanel, alertsPanel) sont des couches temporaires.
Fermables par ×, jamais navigables.

**RN-004** — La navigation profonde (callContactModal, callNotAllowedModal) est modale.
Elle bloque le reste jusqu'à résolution.

**RN-005** — SOS et actions urgentes sont accessibles depuis la carte sans menu.

---

## QUESTION À POSER AVANT TOUT AJOUT

1. Crée-t-il un doublon ?
2. Simplifie-t-il l'expérience ?
3. Améliore-t-il la sécurité ?
4. Améliore-t-il la compréhension ?
5. Améliore-t-il la confiance ?
6. Améliore-t-il le retour utilisateur ?
7. Mérite-t-il réellement un bouton ?
8. Mérite-t-il réellement un écran ?
9. Mérite-t-il réellement une place permanente ?

**Si la réponse est non : ne pas l'ajouter.**

---

## DÉCISIONS MAJEURES VALIDÉES

Voir UX-DECISIONS.md pour la liste complète.

Résumé :
- panelContact → SUPPRIMER (obsolète, remplacé par panelMessages)
- reportPanel → FUSIONNER dans panneau unifié Signal
- navPremium → SUPPRIMER les données simulées (trafic, vitesse, voies)
- La confiance → interactions, jamais personnes
- Debug tools → hors paramètres utilisateur
- SOS → appui long ou bouton dédié protégé

---

## HYPOTHÈSES FUTURES

- Vue conduite (peu de boutons, gros contrastes, 1 main)
- Vue exploration (conducteurs, alertes, zones)
- Véhicules comme entités visuelles (silhouette, direction, état)
- Ange Protecteur (depth:2, sans données techniques)
- Observer (depth:1, usage seulement)
