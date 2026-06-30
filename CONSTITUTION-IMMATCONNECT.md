# CONSTITUTION — ImmatConnect Pro
> Boussole d'architecture long terme. **Document de conception, pas de runtime.**
> Validée comme constitution génératrice de l'organisme logiciel (2026-06-30).
> Règle absolue : cette constitution ORIENTE l'architecture — elle ne crée AUCUN module.

---

## 1. Les principes (la constitution philosophique)

- **P0 — Distinction** : tout part d'une différence explicitement tracée (un événement,
  une capacité, un état, un écart). *Rien d'implicite.*
- **P1 — Récurrence / auto-référence** : le système observe ses propres distinctions
  (la trace, les projections, l'explication). *D'où la mémoire, la conscience, l'apprentissage.*
- **P2 — Clôture opérationnelle** : les opérations du système régénèrent le système et
  préservent sa frontière (ses invariants). *D'où l'organisme, la gouvernance, la viabilité.*
- **Dynamique dérivée — réduction de Δ** : sous clôture, le système agit ou apprend
  pour réduire l'écart entre « ce qui devrait être » et « ce qui est ». *C'est le mouvement,
  pas un principe à part.*

> Niveau 0 (plancher) : la distinction. Niveau dynamique : minimiser Δ. Le reste
> (organisme, lois, mémoire, intelligence) est une **manifestation**, pas un module.

---

## 2. INTERDICTIONS (ne jamais transformer la métaphore en surcouche technique)

Il est **interdit de créer** :
- un moteur de distinction ;
- un moteur d'auto-référence ;
- un moteur de clôture ;
- un moteur Δ central ;
- une couche philosophique au runtime.

La constitution se traduit en **discipline**, jamais en nouveau code abstrait.

---

## 3. RÈGLE D'INGÉNIERIE — 3 questions avant tout besoin

1. **Distinction** : quelle capacité / événement / état / écart est distingué explicitement ?
2. **Trace** : cette distinction est-elle observable dans la trace (un fait, un événement,
   un log, une projection permet-il de la reconstruire) ?
3. **Clôture** : renforce-t-elle l'organisme **sans** créer d'état caché, de doublon, ni de
   couplage direct ?

> **Si la réponse n'est pas claire, on ne code pas.**

---

## 4. TEST DE CLÔTURE — checklist à chaque évolution

Avant toute implémentation, vérifier (tout doit être « oui ») :
- [ ] L'état est-il **dérivable de la trace** (pas d'état caché) ?
- [ ] La capacité est-elle **déclarée dans le registre** (`FEATURE_REGISTRY`) ?
- [ ] L'action **émet-elle un fait observable** (`ImmatBus` / journal) ?
- [ ] La décision est-elle **explicable** par faits + lois + registre ?
- [ ] Le module **garde-t-il son rôle** sans dupliquer un autre organe ?
- [ ] L'évolution **ajoute-t-elle une projection** plutôt qu'un nouvel état caché ?
- [ ] Le système peut-il **expliquer pourquoi** il a agi ou refusé d'agir ?

---

## 5. VOCABULAIRE BIOLOGIQUE = langage de conception (pas une couche technique)

| Métaphore | Réalité technique dans ImmatConnect |
|---|---|
| ADN / gènes | invariants (`core/invariants.js` → `window._INVARIANTS`) |
| Système nerveux | le bus d'événements (`ImmatBus`) |
| Mémoire | la trace (journal du bus, logs, localStorage dérivable) |
| Organes | projections (lectures pures de la trace/état) |
| Cerveau / sens | projections de synthèse (`S._brainOrientation/_consciousness/_soul/_reliability`) |
| Immunité | projection des violations de lois |
| Ange | interface intentionnelle (lit tout, propose des intentions filtrées par les lois) |
| Dashboard | projection humaine de gouvernance/santé |
| Nexus | façade de **lecture / explication / audit** (jamais d'écriture) |
| Registre | génome = capacités déclarées (`FEATURE_REGISTRY`) |

On parle « organisme » pour CONCEVOIR ; on n'ajoute pas de module « organisme ».

---

## 6. RÈGLE D'OR

- Ne jamais ajouter un **nouvel organe** si une **projection** suffit.
- Ne jamais ajouter un **nouvel état** si la **trace** permet de le dériver.
- Ne jamais ajouter un **nouveau moteur** si une **source existante** peut être lue.
- Ne jamais créer une **intelligence centrale** si l'intelligence peut **émerger** de la
  cohérence entre trace, lois, registre et projections.

---

## 7. FORMULE OPÉRATIONNELLE

Pour l'implémentation, la constitution devient un cycle :

```
Déclarer → Observer → Projeter → Expliquer → Agir → Retracer
```

Et **non** : « créer un nouveau module à chaque nouvelle idée ».

---

## 8. COMMENT S'EN SERVIR (concrètement)

- À chaque demande/feature : appliquer §3 (3 questions) puis §4 (checklist).
- Si un point échoue → reformuler le besoin en termes de capacité déclarée + projection,
  ou ne pas le faire.
- Mesure de santé de l'architecture, une seule question : *« cet état est-il dérivable de
  la trace, ou caché quelque part ? »* Tant que c'est « caché », on s'éloigne de la constitution.
- Ange/Nexus restent **lecture seule** ; les **mutations** passent par les fonctions
  propriétaires (`setFeatureFlag`, `ImmatMessages.sendToPlate`, `CallManager`…).

---

## 9. POSITION FINALE

La constitution est validée comme **boussole long terme**. Elle ne déclenche **aucune
modification de runtime** par elle-même. La prochaine évolution reste concrète : appliquer
ces règles à chaque nouveau besoin. Objectif : **garder le « Eurêka » sans transformer
l'application en système abstrait impossible à maintenir.**

> Référence philosophique complète (théorie, hypothèse Δ, plancher Distinction/
> Auto-référence/Clôture) : voir l'historique de conception. Specs liées :
> `docs/SPEC-IMMAT-NEXUS.md`, `docs/SPEC-ANGE-V2.md`.
