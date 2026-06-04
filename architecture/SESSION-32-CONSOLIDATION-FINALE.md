# Amélioration Navigation Fonctionnalités

# SESSION 32 — CONSOLIDATION FINALE

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## OBJECTIF

Compléter les audits SESSION 21 → SESSION 31 par 4 ajouts stratégiques.

Ces ajouts ne modifient pas l'architecture.
Ils ne créent pas de nouvelle couche.
Ils renforcent les protections contre les dérives futures.

---

## AJOUT 1 — RESPONSABILITÉ DES ORGANES

**Problème** : Les organes, intentions et fonctionnalités étaient documentés séparément. La responsabilité explicite de chaque organe (quelles intentions il porte, quelles boucles il alimente) n'était pas formalisée.

**Risque sans correction** : Les fonctionnalités migrent progressivement entre organes. On ne sait plus qui est responsable de quoi. Dette de compréhension lente.

**Implémentation** : `knowledge/organs.json` _v:2 → _v:3

Chaque organe reçoit trois nouveaux champs :

| Organe | Intentions | Features | Boucles vitales |
|---|---|---|---|
| Auth | — | — | — |
| Profil | INT-MANAGE-PROFILE | — | — |
| **Carte** | INT-LOCATE-SELF, INT-NAVIGATE, INT-UNDERSTAND-ENV, INT-FEEL-SAFE | F-CARTE, F-GPS | **ORIENTATION** |
| **Messages** | INT-CONTACT-DRIVER, INT-CHECK-ACTIVITY | F-MESSAGES, F-APPEL, F-ACTIVITE | **COMMUNAUTÉ, CONFIANCE** |
| **Signalements** | INT-SIGNAL-ROAD, INT-SIGNAL-VEHICLE, INT-REQUEST-HELP, INT-HELP-DRIVER, INT-CONFIRM-DANGER, INT-RESOLVE-ALERT, INT-SOS | F-SIGNAL-ROUTE, F-SIGNAL-VEHICULE, F-ASSIST, F-SOS | **CONTRIBUTION, AIDE** |
| **Ange** | INT-ASK-ANGE | F-ANGE | **APPRENTISSAGE** |

**Règle résultante** : si une fonctionnalité est ajoutée à un organe sans intention ni boucle rattachée → violation NO_ORPHAN_FEATURE.

---

## AJOUT 2 — DISCOVERABILITY_TEST

**Problème** : Une fonctionnalité peut exister, fonctionner parfaitement, et rester invisible. Dans ce cas elle n'existe pas réellement pour le conducteur.

**Test** :

> Un conducteur qui découvre l'application peut-il trouver cette fonctionnalité en moins de 30 secondes ?

- **OUI** → acceptable
- **NON** → la fonctionnalité est cachée. Elle doit être : exposée, guidée, simplifiée — ou supprimée.

**Indicateur** : Fonctionnalité découverte naturellement > Fonctionnalité expliquée par tutoriel.

**Lien direct** : dette de compréhension. Le principal risque identifié dans les audits SESSION 21 → 31.

**Implémentation** : `ORGANISM-RULES.json` — règle `DISCOVERABILITY_TEST` ajoutée (règle 11/13).

---

## AJOUT 3 — ANGE_SURVIVAL_TEST

**Problème** : "Ange ne possède rien" est défini. Mais le test de vérification n'existait pas.

**Simulation** : Ange disparaît complètement.

**Questions** :
- Les signalements fonctionnent-ils encore ? ✅
- Les messages fonctionnent-ils encore ? ✅
- Les appels fonctionnent-ils encore ? ✅
- Le GPS fonctionne-t-il encore ? ✅
- L'aide fonctionne-t-elle encore ? ✅
- Les alertes fonctionnent-elles encore ? ✅

Si un **NON** → Ange est devenu une dépendance critique. Interdit.

**Définition d'Ange** :
- ✅ Interprète — il traduit l'organisme en langage conducteur
- ✅ Facilitateur — il raccourcit la courbe d'apprentissage
- ✅ Accélérateur de compréhension — il répond aux intentions non couvertes par l'UI
- ❌ Organe vital — interdit
- ❌ Dépendance fonctionnelle — interdit

**Implémentation** : `ORGANISM-RULES.json` — règle `ANGE_SURVIVAL_TEST` ajoutée (règle 12/13).

---

## AJOUT 4 — ATTENTION_IS_SCARCE

**Découverte des audits** : Ce qui circule réellement dans l'organisme, ce n'est pas la donnée, ni le message, ni l'événement. C'est l'**attention**.

L'attention du conducteur est la ressource rare.

**Règle** : Toute évolution doit justifier :
- le coût d'attention consommé
- la valeur apportée en retour

**Test** : Valeur perçue > Attention consommée — sinon refuser.

**Contre-exemples** :
- Badge qui s'allume sans contenu urgent
- Toast de confirmation après une action silencieuse
- Panel qui s'ouvre sans que le conducteur l'ait demandé
- Bouton présent mais jamais utilisé

**Implémentation** : `ORGANISM-RULES.json` — règle `ATTENTION_IS_SCARCE` ajoutée (règle 13/13).

---

## ÉTAT DES RÈGLES ORGANIQUES — 13/13

| # | ID | Principe |
|---|---|---|
| 1 | INTENT_FIRST | Partir de l'intention, jamais d'une fonctionnalité |
| 2 | NO_EMPTY_SCREEN | Aucun écran vide sans état clair |
| 3 | CALM_STATE | État calme par défaut |
| 4 | LOOP_CLOSURE | Toute boucle doit pouvoir se fermer |
| 5 | TRANSPARENCY | Le conducteur comprend ce qui se passe |
| 6 | REVERSIBILITY | Toute action peut être annulée |
| 7 | ANGE_ASSISTS | Ange assiste, ne décide pas |
| 8 | NO_ORPHAN_FEATURE | Pas de feature sans intention |
| 9 | NO_ORPHAN_INTENTION | Pas d'intention sans chemin navigable |
| 10 | SOCIAL_VISIBILITY | Consentement explicite pour ce qui est visible |
| **11** | **DISCOVERABILITY_TEST** | **Trouvable en 30s ou exposer/simplifier/supprimer** |
| **12** | **ANGE_SURVIVAL_TEST** | **L'organisme survit sans Ange** |
| **13** | **ATTENTION_IS_SCARCE** | **Valeur perçue > Attention consommée** |

---

## FICHIERS MODIFIÉS

| Fichier | Changement |
|---|---|
| `knowledge/organs.json` | _v:3 — intentions/features/boucles_vitales par organe |
| `architecture/organism/ORGANISM-RULES.json` | _v:2 — 3 nouvelles règles (11/12/13) |
| `knowledge/commits.json` | sessions 30/31/32 ajoutées |
| `supabase/functions/_shared/knowledge-gardien.ts` | Regénéré |

---

## CONCLUSION

Les audits SESSION 21 → SESSION 32 ont validé et protégé :

- ADN → Constitution → NS → Référentiel Opérationnel
- 6 organes avec responsabilités formalisées
- 15 intentions conducteur documentées
- 13 règles organiques actives
- 7 boucles vitales scorées
- Conscience, cinq sens, dette de compréhension

**L'organisme est vivant.**

Deux boucles restent incomplètes (CONTRIBUTION 2/5, CONFIANCE 2/5) — racine commune : le créateur d'un signalement ne sait pas s'il a été utile. Dette documentée. Non implémentable sans évolution DB.

**Les 3 nouvelles règles protègent contre les dérives les plus probables :**

1. Fonctionnalité cachée → DISCOVERABILITY_TEST
2. Dépendance Ange → ANGE_SURVIVAL_TEST
3. Surcharge cognitive → ATTENTION_IS_SCARCE
