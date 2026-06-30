# SPEC — ImmatNexus (tissu de connexion)

> Statut : validé (PO + revue ChatGPT). Façade fine, **lecture seule**, sans état métier.
> Principe : *Nexus ne pense pas à la place des modules. Il relie ce que les modules savent déjà.*

## Rôle exact

ImmatNexus permet à Ange et au Dashboard d'**expliquer l'état de l'organisme sans IA externe**, en
**reliant / agrégeant / expliquant / auditant** l'existant. L'intelligence n'est pas ajoutée par une
IA : elle **émerge** parce que l'application sait lire son propre système nerveux (bus), ses lois
(invariants), son registre (capacités), ses événements et ses contradictions.

## Limites (interdits absolus)

ImmatNexus NE DOIT JAMAIS :
- devenir un 2e organisme, 2e cerveau, 2e narrateur, 2e registre, 2e journal, 2e base de connaissance ;
- contenir de la logique métier ni piloter directement les modules métier ;
- écrire quoi que ce soit (aucune mutation d'état, aucun `setFeatureFlag`, aucune correction auto) ;
- démarrer un tick lourd ni stocker un journal.

## Sources LUES uniquement (read-only)

`ImmatBus` (getJournal/EVENTS), `ImmatOrganism` (diagnose), `ImmatBrain` (getPhase), `FeatureRegistry`
+ `App.featureStatus`, `S._consciousness/_soul/_reliability/_brainOrientation`, `GuardianLoop`
(getRuntimeState/getPending), `InteractionEngine` (getHistory), `knowledge/*` + `INVARIANTS`,
modération (`am_i_suspended` via état déjà connu). **Aucune écriture.**

## Modules propriétaires (Nexus n'y touche pas)

ImmatBrain (invariants/phases), ImmatOrganism (santé), Narrator (récit), GuardianLoop
(recommandations), FeatureRegistry+App (résolution + écriture), Consciousness/Soul/CoPilot/BrainEngine/
Kernel/Swarm (synthèse), InteractionEngine (log), ImmatBus (journal).

## API

- `ImmatNexus.init()` — branche les listeners d'invalidation de cache, prépare le cache. Ne modifie aucun module.
- `ImmatNexus.sense({fresh:false})` — snapshot unifié (cache court ~3 s) :
  `{governance, health, consciousness, soul, reliability, orientation, recentEvents, invariants, moderation, phase}`.
- `ImmatNexus.ask(question)` — réponse locale déterministe :
  `{answered:true, source:'local_nexus', intent, confidence, answer, facts[]}` ou `{answered:false, source:'local_nexus', reason:'unknown_intent'}`.
- `ImmatNexus.explain(featureKey)` — `{key,label,enabled,by,scope,origin,killSwitch,dependsOn,reason,lastChange}`.
- `ImmatNexus.audit()` — vérifie la cohérence et émet `FEATURE_AUDIT_FINDING` (source:'nexus') ; retourne la liste des findings.

## Intents V1 (déclaratifs : intent → resolver)

`feature_status`, `disabled_features`, `organism_health`, `recent_violations`, `governance_changes`,
`why_blocked`, `system_summary`. Les resolvers appellent l'existant ; aucune réponse inventée ;
si inconnu → `answered:false`.

## Events (figés dans ImmatBus.EVENTS)

`FEATURE_GOVERNANCE_CHANGED`, `FEATURE_BLOCKED`, `FLEET_CONFIG_LOADED`, `FEATURE_AUDIT_FINDING`.

## Ange local-first

1. `Ange.send()` appelle `ImmatNexus.ask()` d'abord. 2. Si répondu → réponse immédiate (0 réseau, 0 quota).
3. Sinon → fallback LLM edge (`immat-brain-dialog`). 4. Le LLM n'est **jamais** source de vérité sur l'état système.

## Garde-fous anti-boucle / mémoire

- Nexus écoute mais n'émet QUE `FEATURE_AUDIT_FINDING` (avec `source:'nexus'`) et **ignore ses propres events**.
- Pas de journal propre ; lit `ImmatBus.getJournal()` avec limite N. Aucun tick lourd. Aucune correction auto.

## Snapshot

À la demande, cache TTL 3 s. Invalidation sur : gouvernance changée, invariant violé, fleet config chargée,
suspension, anomalie santé.

## Exclusion Aide V1

Tant que le module Aide est gelé : Nexus peut lire/afficher que la feature `aide` existe, mais ne branche
aucun kill-switch Aide, ne modifie aucun runtime Aide, ne touche pas au flux Aide.

## Plan d'implémentation (non destructif)

0. Cette spec. 1. Events gouvernance dans `ImmatBus.EVENTS`. 2. Façade `core/immat-nexus.js` (inerte).
3. Panneau Dashboard Développeur (snapshot / explain / findings). 4. Ange local-first.
5. Consciousness lit la gouvernance ; Narrator verbalise les changements importants. 6. Audit à la demande (Dashboard Dev, pas d'auto-correction).
