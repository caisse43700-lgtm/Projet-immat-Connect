# SESSION CONTINUATION — ImmatConnect Pro

Ce fichier est le point d'entrée pour toute IA qui reprend ce projet.

> **RÈGLE OBLIGATOIRE** : Ce fichier doit être mis à jour après chaque action importante.
> Il doit refléter l'état exact du point de reprise.
> Objectif : permettre à Claude ou à une autre IA de reprendre exactement au bon endroit.
>
> **RÈGLE D'AUTO-VÉRIFICATION** : après chaque modification, vérifier immédiatement que l'action n'a rien cassé ni empiré.
> Chaque entrée importante doit indiquer : AVANT → ACTION → VÉRIFICATION → RÉSULTAT → RISQUE RESTANT.

**Dernière mise à jour** : 2026-06-08 — règle d'auto-vérification ajoutée + blocage actif `index.html` script inline #8

---

## SITUATION EXACTE

```text
Dépôt    : caisse43700-lgtm/Projet-immat-Connect
Branche  : feature-calls-runtime-diagnostics
Statut   : NE PAS MERGER maintenant
Blocage  : Invalid or unexpected token
Fichier  : index.html
Zone     : script inline #8, autour des lignes ~619-621
Cause    : guillemets typographiques U+2018/U+2019 utilisés comme délimiteurs JavaScript
Fonctions concernées : callsRuntimeHtml, runtimeHtml, messagesRuntimeHtml
```

Important : les anciens blocs indiquant “CI green / prêt pour merge” sont historiques. Ils doivent être revalidés après correction du blocage courant.

---

## PROCHAINE ACTION UNIQUE

```text
Corriger uniquement les guillemets typographiques dans index.html script inline #8,
puis revérifier les scripts inline et relancer/inspecter CI.
```

---

## PROTOCOLE D'AUTO-VÉRIFICATION APRÈS CHAQUE ACTION

À chaque correction ou modification de documentation/code, ajouter une trace courte :

```text
AVANT:
Ce qui était vrai avant l'action.

ACTION:
Ce qui a été modifié exactement.

VÉRIFICATION:
Ce qui a été relu/testé/inspecté juste après.

RÉSULTAT:
OK / KO / Incomplet.

RISQUE RESTANT:
Ce qui n'est pas encore confirmé.
```

Règles :

```text
- Ne jamais supposer qu'une modification a réussi : relire le fichier après update.
- Ne jamais dire CI verte sans run exact ou preuve récente.
- Ne jamais corriger un symptôme avant la première erreur réelle.
- Ne jamais continuer vers merge si le fichier de continuité indique un blocage actif.
- Si l'outil tronque un gros fichier, ne pas patcher à l'aveugle.
```

---

## DERNIÈRE ACTION EFFECTUÉE

```text
Investigation Claude via captures :
- 9 failures observées : T05, T08, R01/R02/R03 ;
- T05 priorisée car parse error JS empêche l'app de s'initialiser ;
- cause racine trouvée : index.html script inline #8 ;
- guillemets typographiques U+2018/U+2019 visibles dans callsRuntimeHtml/runtimeHtml/messagesRuntimeHtml ;
- hypothèse : T08/R01/R02/R03 sont probablement des symptômes aval du parse error.

Vérification ChatGPT :
- fetch index.html confirme encore la présence de `sv===’false’`, `return’...`, `.join(‘’)` dans la zone callsRuntimeHtml/runtimeHtml ;
- correction non confirmée sur la branche au moment de cette mise à jour.
```

---

## ACTIONS EFFECTUÉES PAR CHATGPT APRÈS EXPIRATION SESSION CLAUDE

```text
1. Analyse des captures Claude :
   - AVANT : captures indiquaient CI/failures contradictoires avec ancien état “prêt pour merge”.
   - ACTION : identifier le nouveau statut réel : CI/merge historique invalidé par parse error.
   - VÉRIFICATION : comparaison avec SESSION-CONTINUATION.md existant.
   - RÉSULTAT : ancien état “prêt pour merge” dangereux.
   - RISQUE RESTANT : CI à revérifier après correction.

2. Vérification GitHub :
   - AVANT : cause racine seulement visible dans captures Claude.
   - ACTION : lecture de index.html lignes ~600-630.
   - VÉRIFICATION : présence confirmée de `sv===’false’`, `return’...`, `.join(‘’)`.
   - RÉSULTAT : cause guillemets typographiques confirmée.
   - RISQUE RESTANT : correction index.html non appliquée par ChatGPT.

3. Mise à jour du fichier de reprise :
   - AVANT : SESSION-CONTINUATION.md disait “CI green / prêt pour merge”.
   - ACTION : remplacement par “BLOCAGE ACTIF index.html script inline #8”.
   - VÉRIFICATION : relecture du fichier après update.
   - RÉSULTAT : état courant désormais visible en haut du fichier.
   - RISQUE RESTANT : docs/SESSION-LOG.md devra aussi être mis à jour après correction code.
   - Commit : 82678e082300d3f004eb604d93f86c3a0554a133.

4. Décision de sécurité :
   - AVANT : possibilité théorique de patcher index.html.
   - ACTION : refus de patcher sans accès complet fiable.
   - VÉRIFICATION : fetch complet tronqué par l'outil.
   - RÉSULTAT : pas de modification risquée du code.
   - RISQUE RESTANT : Claude/local agent doit appliquer le patch ciblé.

5. Ajout de la règle d'auto-vérification :
   - AVANT : le fichier listait l'état et la prochaine action, mais pas l'obligation de vérifier chaque action.
   - ACTION : ajout du protocole AVANT/ACTION/VÉRIFICATION/RÉSULTAT/RISQUE RESTANT.
   - VÉRIFICATION : relire ce fichier après commit.
   - RÉSULTAT : à confirmer par fetch après update.
   - RISQUE RESTANT : aucune CI déclenchée, car modification documentaire seulement.
```

---

## ACTION EN COURS

```text
Finaliser la réparation ciblée du parse error.
```

---

## VALIDATION REQUISE APRÈS CORRECTION

```text
1. Vérifier le script inline #8 seul.
2. Vérifier que les 27 scripts inline sont valides.
3. Mettre docs/SESSION-LOG.md à jour : cause, fichier, lignes, correction, risque, statut CI.
4. Relancer ou inspecter CI complète.
5. Si CI verte : PR + checklist pré-merge + squash merge.
6. Si CI rouge : lire le nouveau premier échec réel et corriger uniquement celui-ci.
```

---

## NE PAS FAIRE MAINTENANT

```text
- Ne pas merger tant que CI n'est pas verte après cette correction.
- Ne pas traiter T08/R01/R02/R03 comme bugs séparés avant un nouveau run.
- Ne pas toucher guardian-loop.js sauf preuve nouvelle.
- Ne pas ajouter Appel Visio maintenant.
- Ne pas ajouter audio assets maintenant.
- Ne pas refactorer calls.js maintenant.
- Ne pas toucher Supabase/RLS sans preuve.
- Ne pas toucher Service Worker sans preuve.
- Ne pas toucher map/GPS/panels/sheet/drawer sans preuve.
```

---

## HISTORIQUE UTILE — PHASES COMPLÉTÉES AVANT CE BLOCAGE

Ces statuts sont historiques et doivent être revalidés après le fix courant :

| Phase | Contenu | Commit connu | Statut historique |
|---|---|---|---|
| 0 | CI recovery / guardian-loop | `4950cb7` | green historique |
| 1 | Audit calls.js + getRuntimeState | `10c775c` | green historique |
| 2 | CallScreen squelette fermé par défaut | `a2cad44` | green historique |
| 2b | Délégation CallManager → CallScreen | `c810cea` | green historique |
| 3 | Registry / InteractionEngine calls | `f2e7b3d` | green historique |
| 4 | Messages contextuels | `c27c29d` | green historique |
| 5 | roadReport/assist/vehicleAlertQuick → IE | `5b26eab` | green historique |
| 7 | AudioManager + CallNotificationRuntime squelettes | `c40adcf` | green historique |
| 8 | Ange | `e154e43` | green historique |
| 9 | Guardian | `7ba25f3` | green historique |
| 10 | Autotest expansion | `792f31f` | green historique |

---

## TÂCHES RÉSIDUELLES — POST-MERGE / BASSE PRIORITÉ

| Tâche | Priorité | Note |
|---|---|---|
| `DIRECT_MESSAGE_RECEIVED` → InteractionEngine | Basse | Realtime subscription dans messages.js |
| Assets audio réels | Basse | Bloqué par stratégie Service Worker/cache |
| `App.blockPlate()` direct → InteractionEngine | Basse | Seuls blocages Ange-triggered loggés |
| `source_module`/`privacy_level` dans IE events | Basse | Champ structurel, non bloquant |
| Appel Visio | Future | Phase future post-merge seulement |

---

## FICHIERS À LIRE SI REPRISE LONGUE

```text
CLAUDE_START_HERE.md
docs/SESSION-LOG.md
docs/OBD-RECOVERY-PROTOCOL.md
docs/MASTER_IMPLEMENTATION_ROADMAP.md
docs/CODE_AUDIT_TARGETS.md
docs/OPEN_DECISIONS.md
docs/CALL_SOURCE_OF_TRUTH.md
docs/CALL_AUDIO_NOTIFICATION_ARCHITECTURE.md
docs/CALL_AUDIO_IMPLEMENTATION_SKELETON.md
```

---

## INVARIANTS — NE JAMAIS VIOLER

```text
Messages = relation humaine unique.
Calls = demande de contact contrôlée.
CallManager = source métier appels.
CallScreen = projection visuelle.
call_event = historique.
Audio = amélioration, jamais condition de réception.
OBD = diagnostic read-only.
Registry = mémoire/reconstruction, pas UI.
Ange = guide, pas propriétaire d'état.
Guardian = recommande, n'applique pas automatiquement.
```
