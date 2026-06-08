# ARCHIVE — Phases 0–10 (terminées)

**Date de clôture** : 2026-06-08  
**Mergées sur main** : PR #260 (squash `4912734`) + PR #268 (squash `68f322b`)  
**CI final** : GREEN 4/4 sur main `68f322b`

## Cause racine résolue par phase

| Phase | Problème | Fix | Commit |
|---|---|---|---|
| 0 | IIFE guardian-loop — Illegal return | Wrappé en IIFE | `4950cb7` |
| 1 | calls.js — pas de getRuntimeState() | Audit + getRuntimeState() + CALL_SOURCE_OF_TRUTH | `10c775c` |
| 2 | CallScreen absent | Squelette CallScreen + délégation CallManager | `a2cad44`, `c810cea` |
| 3 | InteractionEngine non câblé | Câblage calls.js + registryRuntime | `f2e7b3d` |
| 4 | Messages sans contexte | sendToPlate(opts) + actQuickReply context | `c27c29d` |
| 5 | roadReport/assist hors IE | → InteractionEngine.create | `5b26eab` |
| 7 | Audio absent | AudioManager + CallNotificationRuntime squelettes | `c40adcf` |
| 8 | Ange snapshot incomplet | Snapshot enrichi + NAVIGATE_ACTIVITY/MAP + ANGE_SUGGESTION | `e154e43` |
| 9 | Guardian sans evidence | getRuntimeState() + _guardianBusSubscribe + guardianRuntime OBD | `7ba25f3` |
| 10 | Autotests manquants | 6 sections autotest | `792f31f` |

## Tâches résiduelles post-merge (terminées)

| Tâche | Commit |
|---|---|
| Parse error guillemets typographiques index.html | `1065bab` |
| Preflight statique scripts/preflight-inline-js.mjs | `ba6242e` |
| DIRECT_MESSAGE_RECEIVED → InteractionEngine | `f21e668` |
| App.blockPlate() → InteractionEngine ledger | `b545b50` |
| source_module + privacy_level dans IE events | `578593d` |

## Fichiers créés (références)

`core/call-screen.js`, `core/audio-manager.js`, `core/call-notification-runtime.js`,  
`core/calls-runtime-diagnostics.js`, `core/mobile-autotest.js`, `core/interaction-engine.js`

Docs : `docs/CALL_SOURCE_OF_TRUTH.md`, `docs/INTERACTION_LEDGER_REGISTRY.md`, `docs/SESSION-LOG.md`
