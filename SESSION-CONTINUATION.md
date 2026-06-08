# SESSION CONTINUATION — ImmatConnect Pro

Ce fichier est le point d'entrée pour toute IA qui reprend ce projet.

> **RÈGLE OBLIGATOIRE** : Ce fichier doit être mis à jour après chaque action importante.
> Il doit refléter l'état exact du point de reprise.
> Objectif : permettre à Claude ou à une autre IA de reprendre exactement au bon endroit.

**Dernière mise à jour** : 2026-06-08 — BLOCAGE ACTIF `index.html` script inline #8 + actions ChatGPT consignées

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
   - identification du nouveau statut réel : CI/merge historique invalidé par un nouveau parse error ;
   - conclusion : ne plus dire “branche prête pour merge” tant que T05 actuel n'est pas corrigé.

2. Vérification GitHub :
   - lecture de SESSION-CONTINUATION.md existant ;
   - constat : le fichier disait encore “CI green / prêt pour merge”, donc reprise dangereuse ;
   - lecture de index.html lignes ~600-630 ;
   - confirmation de guillemets typographiques dans callsRuntimeHtml/runtimeHtml : `sv===’false’`, `return’...`, `.join(‘’)`.

3. Mise à jour du fichier de reprise :
   - SESSION-CONTINUATION.md a été modifié pour remplacer l'ancien état “prêt pour merge” par “BLOCAGE ACTIF index.html script inline #8” ;
   - commit de cette mise à jour : 82678e082300d3f004eb604d93f86c3a0554a133.

4. Décision de sécurité :
   - ChatGPT n'a pas corrigé index.html car le fetch complet du gros fichier est tronqué par l'outil ;
   - correction directe jugée trop risquée sans accès fiable à la portion complète ;
   - la cause est confirmée, mais la réparation doit être faite par l'agent ayant accès local complet ou un outil de patch ciblé fiable.
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
