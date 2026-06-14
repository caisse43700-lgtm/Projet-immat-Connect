# BETA_READINESS_AUDIT — ImmatConnect Pro
## Audit d'Exploitation et de Préparation à la Bêta Réelle

> **Statut :** DOCUMENT OPÉRATIONNEL — à lire AVANT toute session de déploiement
> **Référence :** PROJECT_STATE.md + MASTER_COMPATIBILITY_MAP.md v1.3 + DEPLOYMENT_LOG.md
> **Date d'audit :** 2026-06-14
> **Condition :** Ce document est valide pour la bêta V1. Mettre à jour après chaque incident P1.

---

## SECTION 1 — FONCTIONNALITÉS CODÉES MAIS JAMAIS TESTÉES EN CONDITIONS RÉELLES

Ces fonctionnalités existent dans le code et sont commitées. Elles n'ont jamais été exécutées sur de vrais appareils avec de vraies données Supabase.

| # | Fonctionnalité | Fichier | Risque | Contrôle TEST_RESULTS |
|---|---------------|---------|--------|----------------------|
| F01 | Push notifications VAPID (app fermée) | service-worker.js + send-push-notification EF | **ÉLEVÉ** | C10 |
| F02 | Push appel entrant (app fermée) | calls.js + send-push-notification EF | **ÉLEVÉ** | C10b |
| F03 | delete-account complet (profil + données + Storage) | supabase/functions/delete-account/ | **TRÈS ÉLEVÉ** | C07 |
| F04 | export-user-data JSON (toutes tables) | supabase/functions/export-user-data/ | Moyen | C08b |
| F05 | submit-rating + refresh trust | supabase/functions/submit-rating/ | Moyen | C07a |
| F06 | Column-level security profiles (REVOKE + GRANT) | 20260615_profiles_column_security.sql | **TRÈS ÉLEVÉ** | C03 |
| F07 | get_my_profile() RPC (accès profil complet) | 20260615_profiles_column_security.sql | **ÉLEVÉ** | C03d |
| F08 | public_profiles sync trigger (sync_public_profile) | 20260614_public_profiles_secure.sql | **ÉLEVÉ** | C01 + C16 |
| F09 | public_reports VIEW (sans reporter_id) | 20260614_public_reports_secure.sql | **ÉLEVÉ** | C03b + C03c |
| F10 | Trust Engine (refresh_vehicle_trust + formula) | 20260614_user_trust.sql | Moyen | C07b |
| F11 | device_id + "appel pris sur autre appareil" | calls.js v18 | Moyen | C05g |
| F12 | device_sessions heartbeat 30s | app.js + 20260614_device_sessions.sql | Faible | — |
| F13 | Navigator.setAppBadge (badge icône PWA) | app.js | Faible | C12c |
| F14 | Clustering Leaflet.markercluster | app.js | Faible | C02b |
| F15 | Position approximée ±200m (fuzzy pos) | app.js ic_approx_geo | Faible | — |
| F16 | Web Share API (alertes route/aide) | app.js | Faible | — |
| F17 | ResolutionCenter modal (cycle vie signalements) | app.js | Faible | C06b |
| F18 | driver_ratings_summary vue matérialisée | 20260614_driver_ratings.sql | Moyen | — |
| F19 | Rate limit messages 5/min (ic_msg_times) | messages.js | Faible | C04c |
| F20 | Notification preferences (ic_notif_prefs) | app.js | Faible | — |

**Résumé critique :** F01, F02, F03, F06, F07, F08, F09 = non testés + risque élevé ou très élevé. Ces 7 fonctionnalités sont les conditions bloquantes de la bêta.

---

## SECTION 2 — FONCTIONNALITÉS DOCUMENTÉES MAIS JAMAIS EXÉCUTÉES

Ces éléments existent dans la documentation mais aucune exécution réelle n'a eu lieu.

### 2.1 Migrations SQL (0/11 appliquées en production)

| Migration | Statut | Bloquant |
|-----------|--------|---------|
| 20260613_push_subscriptions.sql | Jamais exécutée | Oui — push impossibles |
| 20260613_reports_enhancements.sql | Jamais exécutée | Oui — signalements incomplets |
| 20260613_user_blocks.sql | Jamais exécutée | Oui — blocages DB absents |
| 20260613_call_requests_device_id.sql | Jamais exécutée | Oui — device_id absent |
| 20260614_device_sessions.sql | Jamais exécutée | Partiel |
| 20260614_driver_ratings.sql | Jamais exécutée | Oui — notation impossible |
| 20260614_user_trust.sql | Jamais exécutée | Oui — trust absent |
| 20260614_public_profiles_secure.sql | Jamais exécutée | **OUI — profils publics absents** |
| 20260614_public_reports_secure.sql | Jamais exécutée | **OUI — RGPD reporter_id exposé** |
| 20260614_missing_indexes.sql | Jamais exécutée | Non — perf uniquement |
| 20260615_profiles_column_security.sql | Jamais exécutée | **OUI — PII exposées** |

### 2.2 Edge Functions non déployées

| EF | Statut | Impact |
|----|--------|--------|
| delete-account | Non déployée | RGPD bloquant |
| export-user-data | Non déployée | RGPD bloquant |
| submit-rating | Non déployée | Trust non fonctionnel |
| send-push-notification | Non déployée | Push app fermée impossible |

### 2.3 Secrets Supabase non confirmés

| Secret | Statut | Impact si absent |
|--------|--------|-----------------|
| AGORA_APP_CERTIFICATE | Non confirmé | Tokens Agora invalides → 0 appel possible |
| VAPID_PUBLIC_KEY | Non confirmé | Push ne s'abonne pas |
| VAPID_PRIVATE_KEY | Non confirmé | Push ne s'envoie pas |
| VAPID_SUBJECT | Non confirmé | Rejet VAPID |
| ANTHROPIC_API_KEY | Non confirmé | ANGE KO |
| AGORA_APP_ID | Déjà dans le code (public) | N/A |

### 2.4 Realtime non validé

| Table | Statut Realtime | Impact |
|-------|----------------|--------|
| messages | Non confirmé actif | Messages temps réel impossibles |
| user_locations | Non confirmé actif | Carte radar sans mise à jour |
| call_requests | Non confirmé | Appels dégradés (poll uniquement) |

---

## SECTION 3 — MIGRATIONS — ANALYSE DE RISQUE PAR ORDRE DÉCROISSANT

### RISQUE MAXIMUM : 20260615_profiles_column_security.sql (11/11)

```
REVOKE SELECT ON profiles FROM authenticated;
REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (id, owner_plate, pseudo, vehicle_color) ON profiles TO authenticated;
```

**Pourquoi c'est la plus dangereuse :**
- Toute query `SELECT email FROM profiles` → retourne {} vide sans erreur (pas d'exception)
- calls.js, messages.js, afterAuth() doivent utiliser get_my_profile() RPC pour email/phone
- Si get_my_profile() n'est pas déployée avant → connexion des utilisateurs partiellement cassée
- RISK-001 : appel vocal immédiat après cette migration = test C05a obligatoire dans les 5min

**Procédure rollback :**
```sql
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
```
**Durée rollback : 30 secondes. Toujours avoir cette commande prête dans un onglet SQL Editor.**

---

### RISQUE ÉLEVÉ : 20260614_public_profiles_secure.sql (08/11)

**Pourquoi :**
- Crée public_profiles table + sync_public_profile() trigger
- Si le trigger échoue ou si le backfill est incomplet → public_profiles vide → carte vide
- Contrôle RISK-013 obligatoire après exécution : `SELECT COUNT(*) FROM profiles p LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate WHERE pp.owner_plate IS NULL;` → doit valoir 0

**Procédure rollback :**
```sql
DROP TRIGGER IF EXISTS sync_public_profile_trigger ON profiles;
DROP FUNCTION IF EXISTS sync_public_profile();
DROP TABLE IF EXISTS public_profiles CASCADE;
```
**Durée rollback : 1 minute.**

---

### RISQUE ÉLEVÉ : 20260614_public_reports_secure.sql (09/11)

**Pourquoi :**
- RLS reports_select_own → si mal configurée, un utilisateur ne voit plus ses propres signalements
- public_reports VIEW → si mal créée, reporter_id reste exposé (faille RGPD)

**Contrôle obligatoire :**
```
GET /rest/v1/public_reports?select=reporter_id
→ la colonne reporter_id ne doit PAS apparaître dans la réponse JSON
```

---

### RISQUE MOYEN : 20260614_user_trust.sql (07/11)

**Pourquoi :**
- refresh_vehicle_trust() formula complexe → score peut être négatif ou > 100 si données initiales aberrantes
- Vérification : `SELECT MIN(trust_score), MAX(trust_score) FROM vehicle_trust_scores;` → doit être [0, 100]

---

### RISQUE MOYEN : 20260614_driver_ratings.sql (06/11)

**Pourquoi :**
- driver_ratings_summary = vue matérialisée → REFRESH CONCURRENTLY doit être planifié
- Pas de cron configuré en V1 → la vue peut être obsolète

---

### RISQUE FAIBLE : 20260613_push_subscriptions.sql (01/11)

Table simple, RLS basique. Risque principal : pas de secret VAPID → EF échoue silencieusement.

---

## SECTION 4 — EDGE FUNCTIONS — ANALYSE DE RISQUE PAR ORDRE DÉCROISSANT

### RISQUE MAXIMUM : delete-account

```
Irréversible. Supprime profil + messages + push_subscriptions + reports + user_blocks +
device_sessions + driver_ratings + vehicle_trust + public_profiles.
```

**Vecteurs de risque :**
- Appelée avec le mauvais user_id → supprime le mauvais compte
- Timeout Supabase en cours d'exécution → suppression partielle + état incohérent
- Storage cleanup échoue → PII résiduelle dans buckets (RGPD)
- Pas de delete_audit_log → aucune traçabilité de la suppression (RGPD art. 17)

**Protections à vérifier avant déploiement :**
- La fonction vérifie `auth.uid() === user_id` avant toute suppression
- Chaque DELETE est dans une transaction (ou au minimum loggé)
- Tester avec un compte test dédié — jamais en premier sur un vrai compte

**Procédure test :**
```
1. Créer un compte test avec plaque TEST-99-XX
2. Ajouter quelques messages, signalements
3. Appeler delete-account avec son JWT
4. Vérifier SQL (contrôle C07 dans TEST_RESULTS.md)
5. Tenter de se reconnecter → doit être impossible
```

---

### RISQUE ÉLEVÉ : send-push-notification

**Vecteurs de risque :**
- VAPID_PRIVATE_KEY incorrecte → 401 sur toutes les push, silencieux côté client
- Endpoint push expiré (410 Gone) → doit nettoyer push_subscriptions automatiquement
- User n'a jamais accordé la permission → subscription absente → pas d'erreur mais pas de push
- iOS Safari < 16.4 → push impossible (pas de support Web Push)

**Vérification :**
```
1. S'abonner depuis iOS Safari 16.4+
2. Vérifier qu'une entrée push_subscriptions est créée en DB
3. Appeler la EF manuellement (Supabase Dashboard → Edge Functions → Invoke)
4. Observer si la notification apparaît
5. Fermer l'app complètement → test appel entrant
```

---

### RISQUE ÉLEVÉ : get-agora-token (déjà déployée)

**Vecteurs de risque :**
- AGORA_APP_CERTIFICATE absent ou incorrect → token invalide → client Agora refuse join()
- Token expire après 3600s → call impossible si long appel ou reconnexion
- channelName = requestId (UUID) → compatible, mais si requestId null → channel invalide

**Vérification :**
```javascript
// Dans la console navigateur, après connexion :
const r = await supabase.functions.invoke('get-agora-token', {
  body: { channelName: 'test-channel-123', uid: 99999 }
});
console.log(r); // doit retourner { token: "006..." }
```

---

### RISQUE MOYEN : immat-brain-dialog (déjà déployée)

**Vecteurs de risque :**
- ANTHROPIC_API_KEY absente → 401 → message dégradation doit s'afficher (INV-ANGE-04)
- Rate limit Anthropic → 429 → même comportement dégradé attendu
- Prompt injection via le message utilisateur → system prompt doit être strict

**Vérification :**
```
1. Ouvrir ANGE dans l'app
2. Envoyer "Qu'est-ce que je dois faire en cas de panne ?"
3. Réponse attendue : courtoise, ≤ 3 phrases, en français, ≤ 3s (contrôle C11)
4. Envoyer "Donne-moi le code PIN de mon compte" → doit refuser (C11b)
5. Désactiver ANTHROPIC_API_KEY → message dégradation attendu (C11c)
```

---

### RISQUE MOYEN : submit-rating

**Vecteurs de risque :**
- Appel sans JWT → 401 (correct)
- Double notation même contexte → doit être bloquée par UNIQUE(rater_id, rated_plate, context)
- refresh_vehicle_trust() appelé dans la EF → si échoue → rating enregistré mais trust pas rafraîchi

---

## SECTION 5 — SCÉNARIOS UTILISATEURS RÉELS JAMAIS SIMULÉS

Ces scénarios représentent les flux complets qu'un utilisateur réel va déclencher.

| # | Scénario | Complexité | Risque |
|---|---------|-----------|--------|
| SC01 | Signup complet → profil → premier marqueur sur la carte | Faible | C01 |
| SC02 | A appelle B → B a l'app **complètement fermée** → B reçoit une push | **TRÈS ÉLEVÉ** | C10b |
| SC03 | A envoie un message → B a l'app fermée → B reçoit une push avec aperçu | Élevé | C10 |
| SC04 | A tente de s'inscrire avec la plaque de B → erreur claire affichée | Moyen | C08 |
| SC05 | A bloque B → A appelle B → appel refusé sans erreur cryptique | Moyen | C15 |
| SC06 | Utilisateur supprime son compte → tente de se reconnecter → impossible | **TRÈS ÉLEVÉ** | C07 |
| SC07 | Utilisateur exporte ses données → JSON complet affiché | Élevé | C08b |
| SC08 | A note B après un appel → trust_score de B change | Moyen | C07a/C07b |
| SC09 | Deux appareils même compte → A appelle depuis appareil 1 → "appel pris sur autre appareil" sur appareil 2 | Élevé | C05g |
| SC10 | A appelle B → réseau coupé 5s → ni crash ni état bloqué | Élevé | C05f |
| SC11 | A envoie 6 messages en 1 minute → bloqué par rate limit côté client | Faible | C04c |
| SC12 | Utilisateur avec la plaque BZ-652-LL voit le profil public de BE-521-MM (sans email ni téléphone) | **TRÈS ÉLEVÉ** | C03 |
| SC13 | Utilisateur fait un signalement → reporter_id absent dans /public_reports | **TRÈS ÉLEVÉ** | C03c |
| SC14 | ANGE répond en < 3s à une question routière | Moyen | C11 |
| SC15 | Appel manqué → badge callNavBadge s'incrémente | Moyen | C05d |
| SC16 | Utilisateur passe en mode hors ligne → offline.html affiché, pas de crash | Faible | C09 |
| SC17 | Mise à jour app (nouveau SW) → cache busted automatiquement | Faible | C09b |
| SC18 | Lifecycle complet : signup → premier appel → premier message → premier signalement → suppression compte | **CRITIQUE** | Combiné |

**SC18 est le test de référence avant toute mise en production.** Il couvre l'intégralité du parcours utilisateur.

---

## SECTION 6 — DÉPENDANCES EXTERNES CRITIQUES

### 6.1 Supabase

| Composant | Criticité | Point de défaillance | Indicateur KO |
|-----------|-----------|---------------------|---------------|
| Auth JWT | Maximum | Expiration ou révocation | Déconnexion soudaine utilisateur |
| PostgREST API | Maximum | DB overload ou maintenance | Toute requête retourne 503 |
| Realtime WebSocket | Élevée | Connexion WebSocket fermée | Messages + positions plus temps réel |
| Edge Functions | Élevée | Cold start > 5s ou crash | Push, delete, rating échouent |
| Storage | Moyenne | Quota ou indisponibilité | Avatars, photos inaccessibles |
| Status page | — | — | https://status.supabase.com |

**Comportement attendu si Supabase est down :**
- L'app affiche une interface stable (SW v25 en cache)
- Aucune action Supabase ne fonctionne
- Pas de crash JS, pas d'écran blanc
- Playbook : SUPABASE_DOWN_PLAYBOOK (Section 35b du MASTER_COMPATIBILITY_MAP)

---

### 6.2 Agora

| Composant | Criticité | Point de défaillance | Indicateur KO |
|-----------|-----------|---------------------|---------------|
| Token génération (get-agora-token EF) | Maximum | AGORA_APP_CERTIFICATE incorrect | join() échoue, pas d'audio |
| client.join() | Maximum | Réseau ou token invalide | Appel pas établi |
| Audio publish/subscribe | Maximum | getUserMedia refusé ou micro absent | Pas de son |
| Agora SDK iOS | Élevée | Background mode limité | Appel coupé si app en arrière-plan |
| Status Agora | — | — | https://status.agora.io |

**Token Agora expire après 3600s.** Un appel long (> 1h) sera coupé sans renouvellement de token. En bêta : acceptable. En production : DEBT-FUT-08.

**Comportement attendu si Agora est down :**
- get-agora-token retourne une erreur
- L'interface n'affiche pas de crash — le bouton d'appel reste visible
- Message dégradation si EF retourne 500
- Playbook : AGORA_DOWN_PLAYBOOK (Section 35d du MASTER_COMPATIBILITY_MAP)

---

### 6.3 Anthropic

| Composant | Criticité | Point de défaillance | Indicateur KO |
|-----------|-----------|---------------------|---------------|
| ANTHROPIC_API_KEY | Élevée | Absente ou expirée → 401 | ANGE KO |
| Rate limit API | Moyenne | > N req/min → 429 | ANGE temporairement KO |
| Latence modèle | Faible | > 10s | C11 KO (attendu < 3s) |
| Changement modèle | Faible | Dépréciation du modèle ciblé | Comportement non déterministe |

**Comportement attendu si Anthropic est down :**
- immat-brain-dialog retourne une erreur
- L'app affiche "Le conseiller est momentanément indisponible. Les autres fonctionnalités restent opérationnelles."
- Jamais d'écran vide, jamais de stack trace (INV-ANGE-04)
- Playbook : ANTHROPIC_DOWN_PLAYBOOK (Section 35e du MASTER_COMPATIBILITY_MAP)

---

### 6.4 Service Worker

| Composant | Criticité | Point de défaillance | Indicateur KO |
|-----------|-----------|---------------------|---------------|
| Installation SW v25 | Maximum | Cache.addAll() échoue → SW non installé | Push impossibles, offline cassé |
| Push handler | Maximum | Listener `push` absent ou erreur JS | Toutes les push silencieuses |
| notificationclick | Élevée | Listener absent | Tap push → rien ne se passe |
| Cache CACHE_NAME v25 | Moyenne | Stale cache | Ancienne version servie |

**Vérification SW dans DevTools :**
```
Application → Service Workers → vérifier "Activated and running"
Application → Cache Storage → "immatconnect-pro-v25" présent
```

**Signe de dysfonctionnement push :** Notification reçue mais aucun toast dans l'app. Vérifier le listener `notificationclick` dans service-worker.js.

---

### 6.5 Push iOS

**Contraintes iOS spécifiques :**

| Contrainte | Valeur | Impact |
|-----------|--------|--------|
| Version iOS minimum | 16.4 (Safari Web Push) | Utilisateurs iOS < 16.4 : 0 push |
| Contexte d'installation | L'utilisateur doit avoir "Ajouté à l'écran d'accueil" (A2HS) | Push impossibles si PWA non installée |
| Permission explicite | Doit être demandée dans un geste utilisateur | Permission refusée si popup automatique |
| APN via VAPID | VAPID signaling — pas de certificat Apple direct | VAPID_SUBJECT doit être valide (mailto:) |
| Background push | iOS tue les apps inactives | Push = seul moyen de réveiller l'app |

**Scénario test iOS obligatoire (C10 + C10b) :**
```
1. Ouvrir ImmatConnect sur Safari iOS 16.4+
2. Paramètres → Notification → Autoriser
3. "Ajouter à l'écran d'accueil"
4. Fermer complètement l'app (swipe up dans le gestionnaire)
5. Depuis un autre appareil, déclencher un appel ou message
6. Observer si la push arrive sur l'iOS en < 10s
```

---

### 6.6 Push Android

**Contraintes Android spécifiques :**

| Contrainte | Valeur | Impact |
|-----------|--------|--------|
| Version Android | Chrome 42+ | Très large couverture |
| Background push | FCM via VAPID | Fonctionne même sans A2HS |
| Doze mode | Android Doze peut retarder les push | Délai potentiel > 10s si Doze actif |
| Marques restrictives | Xiaomi, Huawei, OnePlus → battery saver agressif | Push bloquées par l'OS |
| Permission | Automatiquement accordée sur Android < 13, explicite sur Android 13+ | Demander la permission sur Android 13+ |

**Scénario test Android :**
```
1. Ouvrir ImmatConnect sur Chrome Android
2. Paramètres → Notification → Autoriser (Android 13+)
3. Tester avec l'app en arrière-plan (pas fermée)
4. Tester avec l'app complètement fermée
5. Tester après 30min d'inactivité (Doze)
```

---

## SECTION 7 — LES 10 PIRES SCÉNARIOS CATASTROPHE

### CATASTROPHE 1 — Migration 11/11 échoue à mi-chemin → Utilisateurs déconnectés

**Déclencheur :** REVOKE SELECT appliqué mais GRANT SELECT partiel ou non appliqué. Timeout SQL Editor.

**Symptômes :**
- Toutes les requêtes `SELECT * FROM profiles` → résultat vide ou 403
- L'app affiche des profils vides, des pseudo manquants
- Appels impossibles (calls.js ne peut plus lire le profil appelant)
- Connexion impossible pour les nouveaux utilisateurs

**Détection :**
```sql
-- Vérifier les grants actuels :
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_name = 'profiles'
ORDER BY grantee, column_name;
-- Attendu : id, owner_plate, pseudo, vehicle_color pour authenticated
```

**Procédure de reprise (< 2 minutes) :**
```sql
-- ROLLBACK IMMÉDIAT :
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
-- Puis reprendre la migration 11/11 depuis le début
```

**Sévérité :** P1 — bloquer toute session terrain immédiatement.

---

### CATASTROPHE 2 — Fuite RGPD : email et téléphone exposés via /profiles

**Déclencheur :** Migration 11/11 jamais appliquée. Quelqu'un fait `GET /rest/v1/profiles?select=email,phone`.

**Symptômes :**
- email et phone visibles dans la réponse JSON
- Un utilisateur (ou un robot) peut aspirar tous les emails de la base

**Détection (contrôle C03 obligatoire) :**
```
GET https://vemgdkkbldgyvaisudkd.supabase.co/rest/v1/profiles?select=email,phone
Authorization: Bearer [JWT]
apikey: [anon key]

Réponse attendue après migration 11/11 :
[{},{},{}...]  ← champs vides (GRANT ne couvre pas email/phone)
```

**Procédure de reprise :**
```
1. Appliquer immédiatement la migration 11/11
2. Documenter l'incident dans INCIDENT_LOG.md (P1)
3. Notifier les utilisateurs si la fuite dépasse 72h (RGPD art. 33 — notification CNIL)
4. Vérifier les logs Supabase pour identifier qui a accédé à /profiles?select=email
```

**Sévérité :** P1 RGPD — bloquer GO MAIN si cette vérification échoue.

---

### CATASTROPHE 3 — Panne Supabase complète

**Déclencheur :** Incident chez Supabase (maintenance, outage région eu-west-2).

**Symptômes :**
- Toutes les requêtes PostgREST → timeout ou 503
- Realtime → WebSocket fermé → messages plus temps réel
- Edge Functions → timeout

**Comportement attendu de l'app :**
- SW v25 sert les fichiers statiques (HTML, CSS, JS) depuis le cache
- `offline.html` affiché si la page principale ne charge pas
- Pas de crash JS — toutes les requêtes Supabase sont dans des try/catch
- L'utilisateur voit une interface stable mais vide (plus de données)

**Procédure de reprise (opérateur) :**
```
1. Vérifier https://status.supabase.com
2. Si incident Supabase confirmé → attendre la résolution (aucune action possible)
3. Si incident partiel (Realtime KO, API OK) → basculer vers le mode dégradé (contrôle C17)
4. À la résolution → tester le reconnect Realtime automatique
5. Documenter dans INCIDENT_LOG.md
```

**Sévérité :** P1 si > 30min — P2 si < 30min.

---

### CATASTROPHE 4 — Panne Agora : appels impossibles

**Déclencheur :** AGORA_APP_CERTIFICATE incorrect, ou panne Agora (status.agora.io).

**Symptômes :**
- Bouton d'appel → spinner puis timeout
- Console JS : `AgoraRTCError: OPERATION_ABORT` ou `join() failed`
- get-agora-token retourne 500

**Vérification rapide :**
```javascript
// Dans la console navigateur :
const r = await supabase.functions.invoke('get-agora-token', {
  body: { channelName: 'diag-' + Date.now(), uid: 1 }
});
console.log(r.data, r.error);
// Si r.error → problème EF ou secret
// Si r.data.token absent → problème signature
```

**Procédure de reprise :**
```
1. Vérifier AGORA_APP_CERTIFICATE dans Supabase Secrets (Settings → Secrets)
2. Si secret correct → vérifier https://status.agora.io
3. Si panne Agora confirmée → attendre résolution
4. Si secret incorrect → corriger le secret + appeler get-agora-token à nouveau
5. Tester C05a immédiatement après correction
```

**Sévérité :** P1 (feature principale KO).

---

### CATASTROPHE 5 — Push notifications silencieusement cassées

**Déclencheur :** VAPID_PRIVATE_KEY incorrecte, ou endpoint expiré (410 Gone) non nettoyé.

**Symptômes :**
- Les push ne sont jamais reçues
- Pas d'erreur visible côté client
- send-push-notification retourne 200 mais delivery = 0
- Logs EF : 401 VAPID ou 410 Gone sur les endpoints

**Détection :**
```
1. Invoquer send-push-notification depuis Supabase Dashboard
2. Vérifier les logs de la fonction (onglet Logs)
3. Chercher : "401" ou "410" dans les logs
```

**Procédure de reprise :**
```
Si 401 → VAPID_PRIVATE_KEY incorrect :
  1. Régénérer les clés VAPID : npx web-push generate-vapid-keys
  2. Mettre à jour VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY dans Supabase Secrets
  3. ATTENTION : Les anciennes subscriptions (push_subscriptions) sont invalidées
  4. Tous les utilisateurs doivent se ré-abonner → demande de permission à nouveau
  5. Documenter dans INCIDENT_LOG.md

Si 410 (Gone) → Endpoints expirés non nettoyés :
  1. Vérifier que le cleanup 410 est dans le code de send-push-notification
  2. Nettoyer manuellement : DELETE FROM push_subscriptions WHERE endpoint IN (...)
```

**Sévérité :** P1 (appels entrants impossibles si app fermée).

---

### CATASTROPHE 6 — Compte supprimé par erreur

**Déclencheur :** Bug dans delete-account EF, race condition, ou utilisateur déclenche delete sans comprendre.

**Symptômes :**
- Profil supprimé de profiles, public_profiles, messages
- L'utilisateur ne peut plus se connecter
- Ses données (messages, signalements) ont disparu

**Irréversibilité :** delete-account est irréversible par conception (RGPD).

**Procédure de reprise :**
```
Si dans les 24h (backup Supabase Point-in-Time Recovery) :
  1. Supabase Dashboard → Settings → Backups → Point-in-Time Recovery
  2. Identifier le snapshot avant la suppression
  3. Restaurer les tables profiles, public_profiles, messages pour cet user_id
  ATTENTION : La restauration affecte toutes les données depuis le snapshot.

Si > 24h ou si PITR non disponible :
  → Impossible de récupérer les données (irréversible)
  → Documenter dans INCIDENT_LOG.md
  → Notifier l'utilisateur
```

**Prévention :**
```
1. delete_audit_log obligatoire (Sprint 8) — traçabilité avant suppression
2. Confirmation double dans l'UI (modal + saisie du mot "SUPPRIMER")
3. Délai de grâce 30j avant suppression effective (soft delete envisageable)
```

**Sévérité :** P1 — prévention obligatoire avant bêta publique.

---

### CATASTROPHE 7 — Trust score corrompu (scores impossibles ou négatifs)

**Déclencheur :** Bug dans refresh_vehicle_trust(), données initiales aberrantes (0 ratings, score calculé hors [0,100]).

**Symptômes :**
- `SELECT * FROM vehicle_trust_scores WHERE trust_score < 0 OR trust_score > 100;` retourne des résultats
- Utilisateurs affichés comme "ambassador" sans critères remplis, ou "caution" sans raison

**Vérification immédiate :**
```sql
SELECT COUNT(*) FROM vehicle_trust_scores WHERE trust_score < 0;   -- attendu 0
SELECT COUNT(*) FROM vehicle_trust_scores WHERE trust_score > 100; -- attendu 0
SELECT COUNT(*) FROM vehicle_trust_scores WHERE trust_level NOT IN
  ('ambassador','trusted','neutral','caution');                      -- attendu 0
```

**Procédure de reprise :**
```sql
-- Recalculer tous les scores depuis les ratings existants :
SELECT refresh_vehicle_trust(owner_plate) FROM vehicle_trust_scores;
-- Vérifier à nouveau les bornes après recalcul
```

**Sévérité :** P2 (data incorrecte mais pas de perte).

---

### CATASTROPHE 8 — Migration incomplète (erreur SQL à mi-chemin)

**Déclencheur :** Timeout dans SQL Editor, erreur de syntaxe, contrainte violée pendant l'exécution.

**Symptômes :**
- La migration s'arrête à l'instruction fautive
- Les instructions avant → appliquées
- Les instructions après → non appliquées
- État de la DB incohérent

**Détection :**
```sql
-- Vérifier l'existence des objets attendus après chaque migration :
-- Exemple pour 20260614_public_profiles_secure.sql :
SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'public_profiles');
SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_public_profile');
SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_public_profile_trigger');
```

**Procédure de reprise :**
```
1. Identifier l'instruction fautive dans les logs SQL Editor
2. Si la migration est idempotente (CREATE IF NOT EXISTS) → réexécuter complètement
3. Si non idempotente → exécuter uniquement les instructions manquantes
4. Vérifier l'état complet avec les SELECT EXISTS ci-dessus
5. Ne jamais passer à la migration suivante avant que l'actuelle soit complète et vérifiée
```

**Prévention :** Copier chaque migration dans un éditeur texte avant exécution. Exécuter par blocs de 10-20 lignes si la migration est longue.

---

### CATASTROPHE 9 — Rollback partiel (migration N OK, migration N+1 KO)

**Déclencheur :** Migration 08/11 (public_profiles) appliquée. Migration 09/11 (public_reports) échoue.

**Symptômes :**
- public_profiles existe et fonctionne
- public_reports VIEW absente → reporter_id toujours exposé dans reports (RGPD)
- L'app peut afficher des résultats inconsistants

**Détection :**
```sql
SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'public_reports');
-- Si FALSE → migration 09/11 non appliquée
```

**Procédure de reprise :**
```
1. Ne pas rollback la migration 08/11 (public_profiles fonctionne)
2. Ré-exécuter uniquement la migration 09/11
3. Vérifier que reporter_id est absent de public_reports
4. Continuer avec 10/11 et 11/11
```

**Règle :** Ne jamais rollback une migration qui fonctionne pour en refaire une autre. Aller de l'avant avec l'état actuel.

---

### CATASTROPHE 10 — Incohérence multi-appareils (appel pris deux fois)

**Déclencheur :** Deux appareils connectés avec le même compte. L'un accepte l'appel. L'autre ne reçoit pas le signal "pris ailleurs".

**Symptômes :**
- L'appareil 2 continue de sonner après que l'appareil 1 a décroché
- Deux sessions Agora actives sur le même channel → feedback audio, écho
- accepted_device_id dans call_requests non reçu par l'appareil 2

**Détection :**
```
Test C05g : Connecter deux appareils avec le même compte.
A appelle B. B a deux appareils connectés.
L'un des deux accepte → l'autre doit afficher "Appel pris sur votre autre appareil".
```

**Procédure de reprise (incident en cours) :**
```
1. L'utilisateur raccroche sur les deux appareils
2. Vérifier que call_requests.status = 'ended' pour ce request_id
3. Si l'appel reste ouvert en DB → UPDATE call_requests SET status='ended' WHERE id = '...'
4. Redémarrer l'app sur les deux appareils
```

**Prévention :** Vérifier que le handler postgres_changes UPDATE sur call_requests est actif côté calls.js et que `accepted_device_id !== _deviceId` est correctement évalué.

---

## SECTION 8 — PROCÉDURES DE REPRISE SYNTHÈSE

| Catastrophe | Durée reprise estimée | Action immédiate | Irréversible |
|------------|----------------------|-----------------|-------------|
| C1 : Migration 11/11 mi-chemin | 2 min | GRANT SELECT ON profiles TO authenticated | Non |
| C2 : Fuite RGPD email/phone | 30 min | Appliquer migration 11/11 + INCIDENT_LOG | Non (si < 72h) |
| C3 : Panne Supabase | Inconnu | Attendre status.supabase.com | Non |
| C4 : Panne Agora | 5 min | Vérifier AGORA_APP_CERTIFICATE | Non |
| C5 : Push silencieuses | 15-60 min | Vérifier VAPID_PRIVATE_KEY + logs EF | Non (re-subscription) |
| C6 : Compte supprimé | Inconnu | PITR si < 24h, sinon irréversible | **OUI si > 24h** |
| C7 : Trust corrompu | 5 min | SELECT refresh_vehicle_trust() sur tous | Non |
| C8 : Migration incomplète | 10-30 min | Identifier instruction fautive + rejouer | Non si idempotent |
| C9 : Rollback partiel | 10 min | Continuer avec la migration manquante | Non |
| C10 : Multi-appareils | 2 min | UPDATE call_requests SET status='ended' | Non |

---

## SECTION 9 — MÉTRIQUES À SURVEILLER — 30 PREMIERS JOURS DE BÊTA

### 9.1 Métriques de santé (surveiller quotidiennement)

| Métrique | Outil | Seuil d'alerte | Seuil critique |
|---------|-------|---------------|----------------|
| Taux d'erreur Edge Functions | Supabase → Edge Functions → Logs | > 5% | > 20% |
| Latence PostgREST (p95) | Supabase → Reports | > 500ms | > 2000ms |
| Connexions Realtime actives | Supabase → Reports | — | 0 (si utilisateurs connectés) |
| Erreurs JS côté client | DevTools Console (bêta fermée) | Toute erreur | Stack trace visible |
| Push delivery rate | Logs send-push-notification | < 80% | < 50% |
| Taux d'échec appels Agora | Observation terrain | > 10% | > 30% |
| Latence ANGE (p95) | Logs immat-brain-dialog | > 5s | > 10s |
| Taille DB (croissance) | Supabase → Settings → Database | +50 Mo/jour | +200 Mo/jour |

### 9.2 Métriques produit (surveiller hebdomadairement)

| Métrique | Source | Objectif bêta |
|---------|--------|--------------|
| Inscriptions complètes (profil créé) | DB : COUNT(*) FROM profiles | > 0 |
| Appels vocaux établis (audio reçu) | DB : call_requests WHERE status='ended' | > 0 par jour |
| Messages envoyés | DB : COUNT(*) FROM messages | > 0 par jour |
| Signalements créés | DB : COUNT(*) FROM reports | > 0 |
| Push ouvertes (tap) | Logs notificationclick | > 30% des push envoyées |
| Trust scores calculés | DB : COUNT(*) FROM vehicle_trust_scores | = COUNT(*) FROM profiles |
| Suppressions de compte | delete_audit_log (Sprint 8) | Aucune non tracée |
| Erreurs ANGE (dégradation) | Logs immat-brain-dialog | < 5% des requêtes |

### 9.3 Requêtes SQL de monitoring quotidien

```sql
-- 1. Vérifier la cohérence profiles ↔ public_profiles (RISK-013)
SELECT COUNT(*) FROM profiles p
LEFT JOIN public_profiles pp ON pp.owner_plate = p.owner_plate
WHERE pp.owner_plate IS NULL;
-- Attendu : 0 en permanence

-- 2. Vérifier les bornes du trust score (RISK-TRUST)
SELECT MIN(trust_score), MAX(trust_score), AVG(trust_score)
FROM vehicle_trust_scores;
-- Attendu : MIN ≥ 0, MAX ≤ 100

-- 3. Vérifier les push_subscriptions actives
SELECT COUNT(*) FROM push_subscriptions WHERE created_at > NOW() - INTERVAL '7 days';
-- Croissance attendue chaque jour

-- 4. Vérifier les call_requests bloqués (status jamais terminé)
SELECT COUNT(*) FROM call_requests
WHERE status IN ('pending','accepted')
AND created_at < NOW() - INTERVAL '1 hour';
-- Attendu : 0 (sinon nettoyage nécessaire)

-- 5. Vérifier les suppressions de compte (une fois delete_audit_log déployé)
SELECT * FROM delete_audit_log ORDER BY requested_at DESC LIMIT 10;

-- 6. Vérifier les messages orphelins (sender_id supprimé)
SELECT COUNT(*) FROM messages m
LEFT JOIN profiles p ON p.id = m.sender_id
WHERE p.id IS NULL;
-- Attendu : 0 (delete-account doit tout nettoyer)
```

### 9.4 Alertes à configurer (Supabase + monitoring externe)

| Alerte | Déclencheur | Action |
|--------|------------|--------|
| EF error rate > 20% | 3 erreurs consécutives | Vérifier les logs + INCIDENT_LOG P1 |
| DB size > 500 Mo | Taille dépasse 500 Mo | Vérifier si les messages s'accumulent anormalement |
| push_subscriptions vides | COUNT(*) = 0 alors que utilisateurs actifs | VAPID cassé — INCIDENT_LOG P1 |
| call_requests bloqués | > 5 pending depuis > 1h | Nettoyage manuel + investigation |

---

## SECTION 10 — CHECKLIST OPÉRATIONNELLE — 7 PREMIERS JOURS APRÈS MISE EN PRODUCTION

### JOUR 1 — Déploiement (DEPLOYMENT_LOG.md)

```
□ Vérifier les 6 secrets dans Supabase Dashboard → Settings → Secrets
  □ AGORA_APP_ID (présent dans le code, vérification optionnelle)
  □ AGORA_APP_CERTIFICATE → tester get-agora-token depuis Dashboard
  □ VAPID_PUBLIC_KEY
  □ VAPID_PRIVATE_KEY → tester send-push-notification depuis Dashboard
  □ VAPID_SUBJECT (format : mailto:admin@...)
  □ ANTHROPIC_API_KEY → tester immat-brain-dialog depuis Dashboard

□ Exécuter les 11 migrations (ordre strict, DEPLOYMENT_LOG.md)
  □ 01/11 push_subscriptions
  □ 02/11 reports_enhancements
  □ 03/11 user_blocks
  □ 04/11 call_requests_device_id
  □ 05/11 device_sessions
  □ 06/11 driver_ratings
  □ 07/11 user_trust
  □ 08/11 public_profiles_secure → CONTRÔLE RISK-013 immédiat
  □ 09/11 public_reports_secure → vérifier absence reporter_id
  □ 10/11 missing_indexes
  □ 11/11 profiles_column_security → TEST C05a dans les 5 minutes

□ Déployer les 4 Edge Functions
  □ supabase functions deploy delete-account
  □ supabase functions deploy export-user-data
  □ supabase functions deploy submit-rating
  □ supabase functions deploy send-push-notification
  □ supabase functions list → vérifier 8 fonctions actives (get-turn-credentials absente)

□ Activer Realtime
  □ Dashboard → Database → Replication → messages → ON
  □ Dashboard → Database → Replication → user_locations → ON
  □ NE PAS activer reports (broadcast uniquement selon D18)
```

### JOUR 2 — Tests critiques sécurité et RGPD

```
□ C03 : GET /profiles?select=email,phone → email/phone absents de la réponse
□ C03b : Vérifier que reporter_id est absent de /reports pour un tiers
□ C03c : GET /public_reports?select=reporter_id → reporter_id absent
□ C01 : Inscription compte test → vérifier public_profiles alimenté
□ C02 : Localisation → marqueur visible sur la carte en < 60s
□ C08 : Tenter inscription avec plaque déjà prise → erreur claire
□ Contrôle RISK-013 SQL : COUNT(*) cohérence profiles ↔ public_profiles = 0
□ Contrôle trust : MIN/MAX trust_score dans [0, 100]
```

### JOUR 3 — Tests appels vocaux

```
□ C05a : Appel complet A→B → audio → raccroche (test sur BZ-652-LL ↔ BE-521-MM)
□ C05b : Annulation A → overlay B fermé en < 2s
□ C05c : Refus B → A voit "Refusé"
□ C05d : Appel manqué → badge callNavBadge incrémenté sur A
□ C05e : App arrière-plan → appel reçu (sonnerie + overlay)
□ Consigner les résultats dans TEST_RESULTS.md BLOC 5
```

### JOUR 4 — Tests push notifications

```
□ C10 : App complètement fermée sur iOS → push reçue en < 10s
□ C10 : App complètement fermée sur Android → push reçue en < 10s
□ C10b : Appel entrant app fermée → push spécifique appel
□ Vérifier les logs send-push-notification (aucun 401/410)
□ Vérifier que push_subscriptions contient les deux appareils de test
```

### JOUR 5 — Tests RGPD complets

```
□ C07 : Supprimer le compte test → vérifier SQL (4 requêtes TEST_RESULTS.md)
  □ profiles WHERE id = '{uid}' → 0
  □ public_profiles WHERE owner_plate = '_' → 0
  □ messages WHERE sender_id = '{uid}' → 0
  □ push_subscriptions WHERE user_id = '{uid}' → 0
□ C07 : Tenter de se reconnecter avec ce compte → impossible
□ C08b : Export données → JSON complet reçu → vérifier les champs présents
□ Recréer le compte test pour les jours suivants
```

### JOUR 6 — Bilan TEST_RESULTS.md complet

```
□ Exécuter les contrôles restants (BLOC 6 à BLOC 16)
□ Remplir toutes les cases ⬜ de TEST_RESULTS.md
□ Compter les KO critiques (objectif : 0)
□ Si 0 ❌ critiques → cocher GO BÊTA FERMÉE dans TEST_RESULTS.md
□ Si ≥ 1 ❌ → créer INC-XXX dans INCIDENT_LOG.md + NO-GO
□ Vérifier les 15 questions Section 37 de MASTER_COMPATIBILITY_MAP.md
```

### JOUR 7 — Décision GO / NO-GO MAIN

```
□ Vérifier :
  □ 0 ❌ critiques dans TEST_RESULTS.md
  □ 15 questions Section 37 MASTER_COMPATIBILITY_MAP.md → toutes OUI
  □ CGU publiées (URL valide)
  □ Canal modération opérationnel (qui répond aux signalements ?)
  □ Supabase Plan vérifié (quota pour la bêta)
  □ delete_audit_log déployé (Sprint 8 — si non, pas de GO)

□ Si toutes les conditions sont remplies :
  → Merge main réalisé
  → URL production vérifiée : https://caisse43700-lgtm.github.io/Projet-immat-Connect/
  → Inviter les premiers bêta-testeurs
  → Surveiller les métriques (Section 9) pendant 48h avant toute nouvelle feature

□ Si des conditions ne sont pas remplies :
  → Documenter dans DEPLOYMENT_LOG.md + INCIDENT_LOG.md
  → Corriger → retester → re-décider
  → Ne jamais merger main avec des KO critiques ouverts
```

---

## ANNEXE — COMMANDES DE DIAGNOSTIC RAPIDE

```bash
# Depuis Supabase CLI (si installé) :
supabase functions list                    # Vérifier les 8 EF actives
supabase functions logs send-push-notification --lines 50
supabase functions logs delete-account --lines 50
supabase functions logs get-agora-token --lines 20
```

```sql
-- Diagnostic complet post-déploiement (à exécuter dans SQL Editor) :

-- 1. Sécurité colonnes profiles
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_name = 'profiles' AND grantee = 'authenticated'
ORDER BY column_name;
-- Attendu : id, owner_plate, pseudo, vehicle_color uniquement

-- 2. Existence des objets critiques
SELECT 'public_profiles' AS obj, EXISTS(SELECT 1 FROM pg_tables WHERE tablename='public_profiles') AS exists
UNION ALL
SELECT 'public_reports', EXISTS(SELECT 1 FROM pg_views WHERE viewname='public_reports')
UNION ALL
SELECT 'sync_public_profile', EXISTS(SELECT 1 FROM pg_proc WHERE proname='sync_public_profile')
UNION ALL
SELECT 'get_my_profile', EXISTS(SELECT 1 FROM pg_proc WHERE proname='get_my_profile')
UNION ALL
SELECT 'vehicle_trust_scores', EXISTS(SELECT 1 FROM pg_tables WHERE tablename='vehicle_trust_scores')
UNION ALL
SELECT 'push_subscriptions', EXISTS(SELECT 1 FROM pg_tables WHERE tablename='push_subscriptions');
-- Attendu : toutes les lignes = TRUE

-- 3. Cohérence données
SELECT
  (SELECT COUNT(*) FROM profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public_profiles) AS total_public_profiles,
  (SELECT COUNT(*) FROM push_subscriptions) AS total_push_subs,
  (SELECT COUNT(*) FROM vehicle_trust_scores) AS total_trust_scores,
  (SELECT COUNT(*) FROM call_requests WHERE status IN ('pending','accepted')
     AND created_at < NOW() - INTERVAL '1 hour') AS stale_calls;
-- stale_calls doit être 0
```

---

*BETA_READINESS_AUDIT — ImmatConnect Pro*
*Référence : MASTER_COMPATIBILITY_MAP.md v1.3 — DEPLOYMENT_LOG.md — TEST_RESULTS.md*
*Mettre à jour après chaque incident P1 ou session terrain majeure.*
