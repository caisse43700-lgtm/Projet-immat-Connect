# RESTORE POINT 2 — ImmatConnect Pro · Ange V2 + ImmatNexus
> État de référence : **30 juin 2026** — Organisme intelligent (Ange V2, Nexus, gouvernance, modération) en production.
> Si tout est perdu, **lis ce fichier en premier**, puis `PROJECT_STATE.md` et `SESSION-CONTINUATION.md`.

---

## 1. Restauration d'urgence (1 commande)

Le point d'ancrage fiable est le **commit SHA** (présent sur `origin/main`) :

```bash
# Le plus simple — branche-instantané présente sur GitHub :
git fetch origin
git checkout -b restauration-v2 origin/snapshot-v2-ange-v2-2026-06-30

# Ou par SHA (équivalent) :
git checkout -b restauration-v2 92b8e139b997ccc9edb69f4fad0756daa4bde7fe

# Ou repartir de la prod (équivalent à ce point) :
git fetch origin && git checkout -B local/merge-to-main origin/main
```

Vérifier que c'est le bon état :
```bash
npm test          # attendu : 177 ✅ pass | 0 ❌  (+ diagnostic 3 pass)
node tests/ange-v2.test.js   # attendu : 64 ok, 0 ko
grep CACHE_NAME service-worker.js   # attendu : immatconnect-pro-v401
```

> Pointeur de restauration sur GitHub : **branche `snapshot-v2-ange-v2-2026-06-30`**
> (les tags git sont refusés par le proxy de l'environnement → on utilise une branche
> figée, équivalente et visible sur GitHub). Le **SHA fait foi** dans tous les cas.

---

## 2. Référence git

| Champ | Valeur |
|---|---|
| **Commit SHA (point de restauration)** | `92b8e139b997ccc9edb69f4fad0756daa4bde7fe` |
| **Équivaut à** | PR #440 fusionnée (fix CI preflight v401) |
| **Branche de travail** | `local/merge-to-main` (synchro `origin/main` après chaque « Fusionner ») |
| **Branche production** | `main` (GitHub Pages) |
| **Prod URL** | https://caisse43700-lgtm.github.io/Projet-immat-Connect/ |
| **Dépôt** | caisse43700-lgtm/Projet-immat-Connect |
| **Branche-instantané (GitHub)** | `snapshot-v2-ange-v2-2026-06-30` → `92b8e139…` |
| **Tests** | `npm test` 177 ✅ · diagnostic 3 ✅ · `tests/ange-v2.test.js` 64 ✅ |

---

## 3. Versions des fichiers (au point de restauration)

```
SW (CACHE_NAME)         : immatconnect-pro-v401
ui.js                   : v16
bus.js                  : v51
narrator.js             : v6
immat-consciousness.js  : v2
immat-copilot.js        : v4
immat-nexus.js          : v9
messages.js v40 · calls.js v22 · audio-manager.js v9 · app.css v61 · messages.css v7
```
⚠️ Cache iOS : `index.html` est servi réseau (toujours frais) ; les `.js` sont cachés
→ tout changement d'un `.js` exige un bump `?v=N` (dans index.html **et** service-worker.js)
+ bump `CACHE_NAME`. Si l'appareil reste sur une vieille version : réinstaller la PWA.

---

## 4. Migrations Supabase appliquées (CI : deploy-edge-functions.yml sur push main)

```
20260629120000_feature_config.sql            (table feature_config + set_feature_flag_fleet, gardien)
20260630120000_secure_roles_app_metadata.sql (get_my_role lit app_metadata UNIQUEMENT — C1)
20260630140000_account_moderation.sql        (account_bans + am_i_suspended + check_signup_available
                                              + admin_list/suspend/unsuspend_user)
20260630150000_admin_list_users_role.sql     (admin_list_users expose is_gardien)
20260630160000_feature_config_audit.sql      (feature_config_audit + get_feature_audit ; set_feature_flag_fleet journalise)
```
⚠️ PRÉREQUIS C1 : le compte gardien doit avoir `raw_app_meta_data->>'role'='gardien'`.

---

## 5. CE QUI EST EN PRODUCTION À CE POINT

### Gouvernance / fonctionnalités
- Registre déclaratif `FEATURE_REGISTRY` (16 entrées) + `FeatureRegistry` (resolve/isEnabled).
- `App.featureStatus(key)` → {enabled, by:'admin'|'user'|null} ; `requireFeature` (toast + message source-aware).
- Gating par catégorie : Signaler (sigStepRoute/Vehicle/Aide/Station), Activité (openActivityCat
  + vues Nouveaux/À traiter/Traités/Voir tout), Messages, Appels, Ange, GPS, Stationné.
- ⚠️ Fix clé : `ui.js installCriticalButtonHotfix` respecte les gardes (ne rouvre plus les catégories).
- Dashboard : onglet **Fonctionnalités** = SEUL pilote (toggles, groupé par catégorie) ;
  onglet **Modération** = « Blocage par catégorie » en LECTURE SEULE + « Modifier dans Fonctionnalités → ».
- Journal de gouvernance : local `ic_gov_log` + serveur `feature_config_audit` (gardien).

### Modération comptes
- Dashboard → Modération → « 👥 Utilisateurs » : liste (plaque+pseudo+badge), Suspendre/Réactiver,
  tri suspendus→gardiens→actifs, recherche. Gardien non suspendable (badge + verrou serveur).
- Suspension LIVE : `am_i_suspended` au login (afterAuth) + poll 45 s + visibilitychange → éjection.
- Anti-recréation : `check_signup_available` (plaque/email/téléphone, banni) à l'inscription.

### ImmatNexus (core/immat-nexus.js) — tissu de connexion, LECTURE SEULE
- API : `init / sense / ask / explain / audit / featureKeyFromText`.
- Relie registre + santé (ImmatOrganism) + sens (S._brainOrientation/_consciousness/_soul/_reliability)
  + OBD (ImmatBus.getJournal) + lois (window._INVARIANTS).
- Intents : feature_status, why_blocked, disabled_features, organism_health, recent_violations,
  governance_changes, danger_urgency, reliability_status, phase_status, moderation_self,
  recommend_action, help_capabilities, system_summary, laws. Réponses SIMPLES (sans jargon).
- N'écrit jamais (sauf émettre FEATURE_AUDIT_FINDING). Cache 3 s.

### Ange V2 (dans index.html / AngeDialog) — local-first, déterministe, gouverné
- **Comprend l'intention** puis : exécute si sûr / confirme / clarifie / refuse.
- Intentions d'action : `_tryForget`, `_tryHistory`, `_tryMessage`, `_tryCall`, `_trySignal`, `_tryAction`
  (ordre dans send()), puis Nexus.ask (état système), puis LLM (fallback hors-sujet seulement).
- **Confirmation unifiée** : `_armConfirm / confirmYes / confirmNo / _clearPending` →
  carte + boutons + **vocal oui/non (carte ouverte uniquement)** + **timeout 15 s**.
- Actions : signaler véhicule (vehicle_report), appeler véhicule (CallManager), message libre
  (ImmatMessages.sendToPlate), gouvernance (setFeatureFlag, gardien). Cible : « devant »→frontVehicle,
  plaque, ou dernier (mémoire `ic_ange_last_target`).
- **Audit/explicabilité** : `_log` → `ic_ange_log` (device, sans contenu sensible) ; « qu'as-tu fait ».
- **Apprentissage léger** : dernière cible (device) ; « oublie ce que tu as appris » → reset.
- **Garde-fous** : aucun effet avant confirmation · kill-switch jamais contourné · rôle serveur pour
  flotte/modération · LLM sans pouvoir d'action · Nexus lecture seule · mutations = fonctions propriétaires.
- Bandeau d'état à l'ouverture d'Ange (#angeStatus) via Nexus.

### Lois / ADN
- `core/invariants.js` = `window._INVARIANTS` (15 invariants, dont 12 critiques).
- `ImmatBus.EVENTS` inclut FEATURE_GOVERNANCE_CHANGED / FEATURE_BLOCKED / FLEET_CONFIG_LOADED / FEATURE_AUDIT_FINDING.

---

## 6. Documents de conception (théorie / specs)
- `docs/SPEC-IMMAT-NEXUS.md` — façade lecture seule (rôle, limites, API, garde-fous).
- `docs/SPEC-ANGE-V2.md` — copilote local-first (lois d'Ange, grille confiance/risque/réversibilité,
  actions sensibles, confirmation vocale, apprentissage, plan non destructif).
- Théorie de l'organisme logiciel (réflexion, dans l'historique de session) : O = fold(L,E)+γ →
  hypothèse Δ → plancher « Distinction → Auto-référence → Clôture ».

---

## 7. Règle de reprise
1. Lire ce fichier, puis `PROJECT_STATE.md` (tableau de bord), puis `SESSION-CONTINUATION.md` (détail technique).
2. Vérifier les tests (section 1). 3. Travailler sur `local/merge-to-main`, fusionner vers `main` par PR
   (ou push direct fast-forward si autorisé). 4. Bump `?v=` + `CACHE_NAME` à chaque changement de `.js`.
5. Lancer `npm test` AVANT tout déploiement touchant `index.html` (le preflight interdit les guillemets courbes).
