# Amélioration Navigation Fonctionnalités

# SESSION 36 — AUDIT DES RISQUES SYSTÉMIQUES

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03
> Méthode : lecture code réel + scripts automatisés de vérification croisée

---

## AXE 1 — INVARIANTS

### INV-001/002/003 — Canaux séparés
**Protection réelle** : `group='vehicle'/'route'/'assist'` — présent dans tout le code. Canaux séparés au niveau DB (category='route'/'help'/'vehicle').
**Testable** : oui — il suffit de chercher tout appel roadReport() ou assist() avec le mauvais group.
**Risque** : `driverInfo()` crée une alerte group='vehicle' mais category non spécifiée. Cohérence partielle. **Gravité faible. Probabilité faible.**

---

### INV-005 + INV-012 — Tension locale/DB
**Protection réelle** : TENSION DOCUMENTÉE ET ACCEPTÉE.
Dans `roadReport()`, `assist()`, `vehicleAlertQuick()` : `addCommunityAlert()` (local) est appelé AVANT `saveReportRemote()` (DB). L'alerte est visible localement pendant 200–500ms avant la confirmation DB.

**Ce n'est pas un bug** — c'est un choix UX (réactivité) en tension avec INV-012 (persistance avant affichage).
**Scénario de casse silencieuse** : si `saveReportRemote` échoue (réseau coupé), l'alerte reste localement mais n'existe pas en DB. Elle disparaît à la prochaine session. Le conducteur l'a vue, cru l'avoir envoyée. **Gravité moyenne. Probabilité faible. Correction : le buffer offline (`ic_offline_reports`) couvre partiellement ce cas.**

---

### INV-014 — Vitesse exacte dans payload Ange
**Protection réelle** : ✅ confirmée. Le payload Ange utilise `speed_cat` (catégorie : "lent/normal/rapide") — jamais `S.lastSpeed` (valeur GPS exacte). INV-014 respecté.

---

### INV-008 — Miroir d'état
**Protection réelle** : tension. `S.alerts`, `S.trust`, `S.nearby` sont modifiables directement en JS. Aucun garde-fou empêche une modification locale sans DB. Seule la convention protège.
**Testable** : non automatiquement.
**Risque** : un futur développeur qui modifie S.alerts directement sans appeler saveAlerts(). **Gravité moyenne. Probabilité faible. Correction minimale : aucune sans refonte.**

---

## AXE 2 — GÉNÉRATEURS

### sync-ns.js — Aucun try/catch
`sync-ns.js` n'a aucune gestion d'erreur. Si `immat-nervous-system.json` est malformé : crash Node.js avec stack trace brute, aucun message utile.
**Gravité faible. Probabilité faible.**
**Correction minimale** : entourer `generate()` d'un try/catch avec message clair.

---

### sync-knowledge.js — Risque de sortie incomplète silencieuse
**Prouvé en SESSION 35** : 3 règles ajoutées dans ORGANISM-RULES.json SESSION 32 → non propagées dans decisions.json → knowledge-gardien.ts généré sans erreur mais incomplet.
Le script ne valide pas que les sources sont cohérentes entre elles.
**Scénario** : un champ optionnel dans decisions.json est null → le générateur produit un TS valide mais vide sur cette section. Aucune alerte.
**Gravité moyenne. Probabilité certaine si les deux sources évoluent indépendamment.**
**Correction minimale** : ajouter une vérification de cohérence au `--check` mode : comparer le nombre de règles dans decisions.json vs ORGANISM-RULES.json.

---

### Risque de désynchronisation progressive
Les deux générateurs ont des sources distinctes (immat-nervous-system.json pour sync-ns, knowledge/*.json pour sync-knowledge). Si l'on modifie l'une sans régénérer, le TS est silencieusement périmé. Il n'existe pas de CI qui bloque si les TS sont stale.
**Gravité faible (Ange seul impacté). Probabilité certaine à long terme. Correction : ajouter `node scripts/sync-ns.js --check && node scripts/sync-knowledge.js --check` dans un hook pre-push.**

---

## AXE 3 — DÉPENDANCES UNIQUES

| Dépendance | Nature | Si disparaît |
|---|---|---|
| **Supabase** | Auth + DB + Realtime | App inutilisable pour nouvelles sessions. Sessions actives : carte/GPS local fonctionne, signalements en offline buffer partiel. |
| **OSRM** | Routing GPS | Navigation GPS cassée. Carte reste. Localisation reste. |
| **Nominatim** | Geocoding | Recherche d'adresse cassée. Navigation manuelle par coordonnées impossible. |
| **Leaflet** | Carte | Carte entièrement cassée si CDN down. |
| **Gardien unique** | Gouvernance | Aucune décision architecturale ne peut être prise. L'organisme peut être exploité sans protection. |

**Risque Supabase** : élevé en probabilité (tout service cloud peut tomber), impact critique.
**Aucune correction possible sans changement d'architecture.** Documenter un plan de continuité minimal (cache + offline mode) suffit pour l'instant.

**Risque Gardien unique** : probabilité faible mais impact existentiel. Un second Gardien ou une documentation auto-suffisante (actuellement bien avancée) réduit ce risque.

---

## AXE 4 — SCALABILITÉ

| Donnée | Limite | Nettoyage | Risque |
|---|---|---|---|
| `S.alerts` / `ic_alerts` | 80 max | TTL + cleanupAlerts() toutes les 60s | ✅ Maîtrisé |
| `S.alertHistory` / `ic_alert_history` | 150 max | slice au push | ✅ Maîtrisé |
| `S.resolvedRemoteIds` | 200 max | slice | ✅ Maîtrisé |
| `S.favorites` / `ic_favorites` | 20 max | slice au push | ✅ Maîtrisé |
| `S.gpsHistory` | 20 max | slice au push | ✅ Maîtrisé |
| `S.recent` / `ic_recent_vehicles` | 20 max | slice au push | ✅ Maîtrisé |
| `S.offline_reports` | 50 max | slice | ✅ Maîtrisé |
| **`S.trust` / `ic_trust_scores`** | **Aucune limite** | **Uniquement au logout** | **⚠️ Croît sans fin entre sessions** |
| `S.nearby` | Pas persisté | Recalculé dynamiquement | ✅ Pas de risque localStorage |
| `knowledge/commits.json` | Aucune limite | Jamais nettoyé | Faible (fichier dev, non runtime) |

### Risque ic_trust_scores
`S.trust` = objet `{plate: score}` sauvegardé entier à chaque interaction. Un conducteur actif en zone dense peut croiser 100+ plaques par session. Sans logout, ces entrées s'accumulent indéfiniment.
**Gravité faible. Probabilité certaine à long terme.**
**Correction minimale** : limiter à 300 entrées dans `trustDelta()` avant `safeSet`.

---

## AXE 5 — OBSERVABILITÉ

### Ce qui est tracké
4 événements `ImmatOrganism.observe()` en runtime :
- `ROAD_CREATED` — signalement route envoyé
- `VEHICLE_MESSAGE_SENT` — alerte véhicule envoyée
- `HELP_CREATED` — demande d'aide envoyée
- `BADGE_RECOMPUTED` — badges mis à jour

### Ce qui ne l'est pas
- Utilisation d'Ange (questions posées, satisfaction)
- Navigation GPS (destinations recherchées, durée)
- Messages directs (volume, réponses)
- Retours Activité (actions confirmées, alertes vues)
- Taux d'onboarding complété

### Risque
Tous les événements sont **session-only** : `ImmatOrganism` est un objet runtime, non persisté, non envoyé au serveur. **Il est impossible de savoir si les fonctionnalités sont réellement utilisées, en quelle fréquence, et par combien de conducteurs.**

**Gravité moyenne. Probabilité certaine (c'est l'état actuel).**
**Correction minimale** : aucune sans infrastructure analytics. Documentation du gap suffit.

---

## AXE 6 — FLOWS

### FLOW-VEHICLE-ALERT — double chemin
Il existe deux fonctions pour l'alerte véhicule :
- `vehicleAlertQuick(label)` — depuis sigStep2Vehicle — crée l'alerte directement en DB
- `vehicleAlert(label)` — depuis overlay legacy — ouvre panel Messages en compose

Ces deux chemins produisent des résultats différents (DB report vs message direct). Le flow documenté (FLOW-VEHICLE-ALERT) décrit les deux mais l'ambiguïté persiste.
**Gravité faible. Correction : documentation uniquement — les deux chemins sont intentionnels et fonctionnels.**

### FLOW-ASSIST-REQUEST — parsing fragile J'arrive
La détection `_txt.startsWith("J'arrive")` pour déclencher `helper_coming` est fragile si le conducteur modifie le texte du bouton rapide. **Couvre 95% des cas via le bouton. Gravité faible.**

### Comportements hors flow documentés
- `actViewOnMap()` — non dans les flows mais présent dans toutes les cards
- `actQuickReply()` via card _actModCard — chemin non documenté dans FLOW-DIRECT-MESSAGE
- Mode invisible → le conducteur peut envoyer des signalements sans position partagée — conséquence documentée mais non dans les flows

---

## AXE 7 — ORGANISM RULES

### Vérifiabilité réelle des 14 règles

| Règle | Vérifiable ? | Comment |
|---|---|---|
| INTENT_FIRST | Manuellement | Demander "quelle intention ?" avant chaque PR |
| NO_EMPTY_SCREEN | Manuellement | Revue visuelle |
| CALM_STATE | Manuellement | Compter les alertes actives simultanées |
| LOOP_CLOSURE | Manuellement | Vérifier qu'un état peut se fermer |
| TRANSPARENCY | Manuellement | Test utilisateur |
| REVERSIBILITY | Semi-auto | Chercher toute action sans `confirm()` ou sans `annuler` |
| ANGE_ASSISTS | Manuellement | ANGE_SURVIVAL_TEST |
| NO_ORPHAN_FEATURE | **Semi-auto** | node -e "vérifier que chaque feature a une intention dans intentions.json" |
| NO_ORPHAN_INTENTION | **Semi-auto** | node -e "vérifier que chaque intention a un chemin dans l'app" |
| SOCIAL_VISIBILITY | Manuellement | Audit des données partagées |
| DISCOVERABILITY_TEST | Manuellement | Test utilisateur 30s |
| ANGE_SURVIVAL_TEST | **Testable** | Désactiver angeFab → tester toutes les fonctionnalités |
| ATTENTION_IS_SCARCE | Manuellement | Compter les éléments visibles à la fois |
| REALITY_OVER_DOCUMENTATION | Manuellement | Test utilisateur réel |

**Risque** : 12 règles sur 14 ne sont vérifiables que manuellement, par un humain, lors d'une revue. Aucune règle ne génère d'alerte automatique en CI. **Une règle peut être violée sans que personne ne s'en rende compte immédiatement.**
**Gravité moyenne. Probabilité certaine à mesure que le projet grandit.**
**Correction minimale** : implémenter un script de vérification pour NO_ORPHAN_FEATURE et NO_ORPHAN_INTENTION (les deux seules règles semi-automatisables avec les fichiers existants).

---

## AXE 8 — TEST DE SURVIE

### Ange disparaît
GPS ✅ · Signalements ✅ · Messages ✅ · Appels ✅ · Alertes ✅ · Aide ✅
**ANGE_SURVIVAL_TEST : passé.** Seule la capacité de découverte guidée disparaît. L'organisme survit.

### Supabase indisponible
- Nouvelles connexions : **bloquées** (auth impossible)
- Sessions actives : carte ✅ · GPS ✅ · Alertes cached ✅ · Signalements en offline buffer ⚠️ · Temps réel ❌ · Messages ❌
**Le conducteur connecté garde 60% de la valeur. Le conducteur déconnecté ne peut pas se reconnecter.**

### Réseau perdu (offline)
GPS ✅ · Carte (tiles cached) ⚠️ · Alertes localStorage ✅ · Signalements offline buffer ✅ · Messages ❌ · Navigation OSRM ❌ · Geocoding Nominatim ❌
**Le conducteur garde sa localisation et ses alertes. La navigation et les messages sont cassés.**

### Générateur cassé (sync stale)
L'Ange Gardien reçoit un knowledge incomplet ou périmé. **Toutes les fonctionnalités continuent de fonctionner.** Seule la qualité des réponses d'Ange se dégrade. Risque opérationnel (mauvaises décisions basées sur mauvais knowledge).

### Corruption d'un fichier knowledge
Si `knowledge-conducteur.ts` est corrompu → Ange conducteur répond mal ou ne répond pas. **Les fonctionnalités app ne sont pas impactées.** Seule l'assistance Ange disparaît.

---

## AXE 9 — REALITY_OVER_DOCUMENTATION

| Boucle | Score audit | Le conducteur perçoit-il la valeur ? |
|---|---|---|
| ORIENTATION | 3/5 | ✅ Oui — position, marqueurs, navigation visibles |
| CONTRIBUTION | 2/5 | ❌ Non — le créateur ne voit jamais l'impact de son signalement |
| AIDE | 3/5 | ✅ Oui — "✋ En route · PLAQUE" visible pour le demandeur |
| COMMUNAUTÉ | 3/5 | ✅ Oui — fil de messages visible, réponses reçues |
| CONFIANCE | 2/5 | ⚠️ Partiel — historique visible (SESSION 33), mais le score de confiance (`S.trust`) n'est jamais affiché au conducteur lui-même |
| APPRENTISSAGE | 3/5 | ⚠️ Partiel — Ange disponible mais passif. Le conducteur doit l'initier. |
| RÉTENTION | 2/5 | ❌ Non — en zone peu dense, aucune valeur perçue à la réouverture |

**CONTRIBUTION et RÉTENTION restent les deux boucles où la valeur est documentée mais non perçue.**
CONTRIBUTION : impossible sans évolution DB.
RÉTENTION : impossible sans service worker ou densité réseau.
**Ces deux dettes sont documentées, connues, et non implémentables en session.**

---

## AXE 10 — DERNIÈRE MAUVAISE IDÉE

**La mauvaise idée la plus probable : la gamification.**

Scénario : pour "résoudre" la boucle CONTRIBUTION (le créateur ne voit pas l'impact), quelqu'un proposera d'ajouter des points, badges, ou un classement de "meilleurs signaleurs".

**Pourquoi c'est dangereux** :
- Viole INTENT_FIRST : l'intention est la sécurité, pas la compétition
- Viole CALM_STATE : badges, notifications de progression = surcharge d'attention
- Viole ATTENTION_IS_SCARCE : points et classements consomment de l'attention sans valeur de sécurité
- Remplace la motivation intrinsèque (protéger) par une motivation extrinsèque (gagner des points) — fragile et réversible si les points arrêtent
- S'accompagnerait d'une évolution DB (table scores) et d'une couche logique → violation NO_ORPHAN_FEATURE si les points n'ont pas d'intention conducteur réelle

**Comment cette idée passe les protections** :
Elle semble résoudre CONTRIBUTION (2/5) sans toucher aux invariants DB. Elle serait présentée comme une "UI pure". Elle passerait DISCOVERABILITY_TEST (les badges seraient visibles). Elle serait défendable face à NO_ORPHAN_INTENTION ("l'intention : se sentir utile").

**Seule REALITY_OVER_DOCUMENTATION la bloque** : les points ne donnent pas l'information réelle ("ta route a été évitée par 3 conducteurs"). Ils donnent une représentation abstraite qui peut masquer l'absence de valeur réelle.

**La défense correcte** : demander "le conducteur perçoit-il que son signalement a protégé quelqu'un ?" Si la réponse est "il voit 42 points" → refuser. Si la réponse est "il voit que 3 conducteurs ont confirmé sa présence" → acceptable (mais nécessite DB, pas gamification).

---

## SYNTHÈSE — RISQUES SYSTÉMIQUES

| # | Risque | Gravité | Probabilité | Correction minimale |
|---|---|---|---|---|
| R-01 | INV-005/INV-012 tension locale/DB | Faible | Certaine (design) | Documenter — offline buffer couvre |
| **R-02** | **ic_trust_scores sans limite de taille** | **Faible** | **Certaine (long terme)** | **1 ligne : slice à 300 dans trustDelta()** |
| R-03 | sync-ns.js sans error handling | Faible | Faible | try/catch + message utile |
| **R-04** | **Générateurs : sortie incomplète silencieuse** | **Moyen** | **Certaine (prouvée SESSION 35)** | **Vérification croisée decisions.json ↔ ORGANISM-RULES.json en --check** |
| R-05 | Organic rules non automatisées (12/14) | Moyen | Certaine | Script NO_ORPHAN_FEATURE/INTENTION |
| R-06 | Observabilité nulle côté serveur | Moyen | Certaine | Non corrigeable sans infrastructure |
| R-07 | Supabase single point of failure | Élevée | Faible | Non corrigeable sans multi-provider |
| R-08 | CONTRIBUTION loop non perçue | Moyen | Certaine | Non corrigeable sans DB |
| R-09 | RÉTENTION réseau-dépendante | Moyen | Certaine | Non corrigeable sans service worker |
| R-10 | Gamification — mauvaise idée probable | Élevée | Moyen | REALITY_OVER_DOCUMENTATION + ce document |

---

## CORRECTIONS IMPLÉMENTABLES IMMÉDIATEMENT

**R-02** : 1 ligne dans `trustDelta()` — `S.trust` limité à 300 clés.
**R-03** : 3 lignes dans `sync-ns.js` — try/catch avec message clair.
**R-04** : Vérification croisée dans `sync-knowledge.js --check`.

Tout le reste est structurel ou documenté comme dette connue.
