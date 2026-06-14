<!-- DOCUMENT FIGÉ — Version 1.2 validée le 2026-06-13 — Ne plus modifier sauf bug bloquant, faille sécurité, risque RGPD ou KO terrain confirmé -->

# IMMATCONNECT PRO — PLAN D'EXÉCUTION PRODUCTION 30 JOURS
Version 1.2 — 2026-06-13 — FINALE

---

## PARTIE 1 — TOP 10 ACTIONS PRIORITAIRES (J0 à J30)

**#1 — Déployer les 11 migrations Supabase (J0–J2) — BLOQUANT**

Ordre chronologique strict. `20260615_profiles_column_security.sql` en DERNIER (11/11).

**#2 — Déployer les Edge Functions nouvelles ou modifiées (J0–J3) — BLOQUANT**

```bash
supabase functions deploy delete-account
supabase functions deploy export-user-data
supabase functions deploy submit-rating
supabase functions deploy send-push-notification
```

Vérifier ensuite :
```bash
supabase functions list
```

Fonctions attendues déjà existantes : `get-agora-token`, `create-call-request`, `respond-call-request`, `immat-brain-dialog`. Ne pas inventer de fonction absente du projet.

**#3 — Configurer les Supabase Secrets (J0–J1) — BLOQUANT**

- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE` ← jamais dans git
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` ← jamais dans git
- `VAPID_SUBJECT`
- `ANTHROPIC_API_KEY` ← jamais dans git

JAMAIS dans le code source. JAMAIS dans git.

**#4 — Activer Supabase Realtime sur les tables réellement utilisées (J2–J3) — BLOQUANT**

Vérifier dans le code quelles tables sont abonnées via `postgres_changes`. Activer uniquement :
- `messages` (abonnement confirmé)
- `user_locations` (abonnement confirmé)
- `call_requests` (à vérifier dans calls.js)
- `reports` (à vérifier : postgres_changes ou broadcast uniquement ?)

Ne pas activer Realtime sur une table inutile — réduire coût, bruit, surface d'exposition.

**#5 — Configurer et tester VAPID sur mobile réel (J3–J5) — BLOQUANT**

Sans notification push, l'app est morte en arrière-plan.

**#6 — Validation terrain 14 contrôles (J5–J10) — BLOQUANT**

2 téléphones réels (iOS + Android), 2 comptes distincts, connexion 4G. Cf. Partie 6.

**#7 — Rédiger et publier CGU + Politique de confidentialité (J5–J15) — BLOQUANT LÉGAL**

Fournisseurs à mentionner : Supabase, Agora, Anthropic, GitHub Pages. Ne pas mentionner OpenAI sauf si réellement utilisé.

**#8 — Mettre en place la modération manuelle J0 (J0–J5)**

Canal Slack/email pour signalements. Fondateur en astreinte. Suspension manuelle via Supabase Studio.

**#9 — Configurer les alertes coût Supabase + Agora (J3–J7)**

Seuils définis en Partie 5 — tous marqués comme estimations.

**#10 — Lancement bêta fermée 10–20 utilisateurs (J10–J20)**

Conditionnel : J0 à J9 complétés et 11/11 contrôles critiques validés.

---

## PARTIE 2 — PLAN ANTI-ABUS CONCRET

### Principes non négociables

- INV-COM-015 : aucun contenu de message en clair dans les Edge Functions.
- INV-COM-010 : les Edge Functions ne lisent pas le corps des messages.
- La modération est comportementale (fréquence, patterns), pas sémantique côté serveur.
- Le rate limit client est UX uniquement — il ne constitue PAS une protection de sécurité.
- Le rate limit serveur est la seule protection réelle — obligatoire pour toute action sensible.

### Rate limits — deux niveaux distincts

**NIVEAU A — Côté client (UX uniquement, contournable)**

Rôle : fluidité de l'interface, feedback immédiat. Ne jamais présenter comme une protection de sécurité. Conserver les limites client existantes en l'état.

**NIVEAU B — Côté serveur (protection réelle, obligatoire)**

À implémenter dès que possible. Implémentation : table dédiée `rate_limit_counters` (jamais dans `profiles`). `profiles` contient l'identité durable du compte ; les compteurs temporaires y créeraient du bruit, des conflits d'écriture et de la dette technique.

Seuils cibles :
- `reports` → 3 signalements / 10 min / user
- `messages` → 20 messages / 1 min / user
- `immat-brain-dialog` → 10 requêtes ANGE / 1 heure / user
- `send-push-notification` → 5 notifications / 1 min / user
- `submit-rating` → 3 notations / 1 heure / user
- `create-call-request` → 5 appels / 1 min / user

Phase 1 (J0–J30) : limites client conservées + rate limit serveur via table `rate_limit_counters` dédiée.
Phase 2 (J30+) : Upstash Redis via Edge Function si >50 users simultanés.

### Signalements — règle anti-abus

**DANGER** : ne jamais modifier `trust_level` automatiquement sur simple volume de reports. Un groupe de faux comptes pourrait abaisser injustement le score d'un conducteur innocent.

Règle sécurisée :
- >3 reports distincts sur même plaque en <24h :
  - si colonne `needs_review` existe : créer le flag (migration dédiée requise)
  - si colonne inexistante : notifier modération par email, sans modifier la base
  - NE PAS modifier `trust_level` directement dans les deux cas
- Impact trust uniquement après confirmation manuelle ou résolution d'un report (`status='resolved'`)

### Modération manuelle

Suspension temporaire ≠ suppression RGPD. Ne jamais utiliser `is_deleted=true` pour une suspension.

Colonne de suspension (décision future — migration dédiée requise) :
- `account_status` : `'active' | 'suspended' | 'banned'`
- `suspended_until` : timestamp

En attendant : suspension manuelle via Supabase Studio uniquement, sur champs existants confirmés.

---

## PARTIE 3 — PLAN RGPD CONCRET

### Durées de rétention

| Donnée | Durée | Méthode |
|---|---|---|
| messages | 12 mois | CRON DELETE WHERE created_at < NOW() - INTERVAL '12 months' |
| user_locations | 24h (upsert) | Pas de purge nécessaire |
| reports | 6 mois après résolution | CRON DELETE WHERE status='resolved' AND resolved_at < NOW() - INTERVAL '6 months' |
| call_requests | 3 mois | CRON DELETE WHERE created_at < NOW() - INTERVAL '3 months' |
| profiles | Durée compte + 30j | Vérifier si colonne is_deleted existe — soft delete J+30 = décision future si absente |
| Auth logs | 90j | Géré automatiquement par Supabase |

### Droit à l'effacement — Edge Function `delete-account`

Comportement à confirmer dans le code réel avant déploiement. Logique attendue :
1. Anonymiser profiles (email=NULL, phone=NULL) ou supprimer selon code existant
2. DELETE FROM messages WHERE sender_id=uid OR receiver_id=uid
3. DELETE FROM user_locations WHERE user_id=uid
4. DELETE FROM reports WHERE reporter_id=uid
5. DELETE FROM public_profiles WHERE owner_plate=(SELECT owner_plate FROM profiles WHERE id=uid)
6. supabase.auth.admin.deleteUser(uid) via service_role secret

### Droit à la portabilité — Edge Function `export-user-data`

Exporter messages envoyés ET messages reçus associés au compte. Minimisation des champs, pas d'enrichissement de données tiers.

Retourner JSON : `{ profile: {...}, messages_sent: [...], messages_received: [...], reports_filed: [...] }`

### Mentions CGU obligatoires

- Responsable de traitement : [Nom / société], [adresse]
- Finalités : coordination routière, signalements communautaires
- Base légale : consentement (inscription volontaire)
- Données : plaque, pseudo, couleur véhicule, localisation GPS temps réel, messages, signalements
- Durées : cf. tableau ci-dessus
- Destinataires : Supabase (EU), Agora (hors EU), Anthropic (hors EU), GitHub Pages
- Stockage local : aucun cookie publicitaire ; localStorage utilisé pour le fonctionnement de l'application ; information à inclure dans la politique de confidentialité
- Mineurs : interdit aux moins de 18 ans

### Déclaration CNIL

Pas de déclaration préalable requise (RGPD 2018). Tenir un Registre des Activités de Traitement (RAT) — obligatoire. DPO non requis en phase bêta.

---

## PARTIE 4 — PLAN ANGE CONCRET

**ANGE = Assistant Numérique de Guidage et d'Écoute** *(définition officielle unique)*

### System prompt officiel v1

```
Tu es ANGE (Assistant Numérique de Guidage et d'Écoute), assistant intégré à ImmatConnect Pro.

RÔLE : Tu aides les conducteurs à rédiger des messages courtois et constructifs à destination
d'autres conducteurs, identifiés uniquement par leur plaque d'immatriculation.

CONTRAINTES ABSOLUES :
1. Tu ne génères JAMAIS de contenu agressif, menaçant, discriminatoire, ou harcèlement.
2. Tu ne reproduis JAMAIS une plaque d'immatriculation dans ta réponse.
3. Tu ne fournis JAMAIS d'informations personnelles sur un conducteur.
4. Tu ne peux PAS aider à localiser, suivre, ou identifier physiquement une personne.
5. Tu travailles UNIQUEMENT sur des situations de conduite et de sécurité routière.
6. Tes réponses sont en français, concises (3 phrases maximum), et bienveillantes.

SITUATIONS AUTORISÉES :
- Signaler poliment un comportement dangereux
- Remercier un conducteur pour un geste courtois
- Avertir d'un problème visible sur le véhicule (feu éteint, pneu crevé, etc.)
- Coordonner une interaction de courtoisie (laissé passer, parking, etc.)

SITUATIONS REFUSÉES (répondre uniquement : "Je ne peux pas aider avec ça.") :
- Tout message pouvant constituer du harcèlement
- Demandes d'informations sur l'identité du conducteur
- Situations de route rage ou escalade de conflit
- Tout contenu hors contexte routier

FORMAT DE RÉPONSE : Un seul message rédigé, prêt à envoyer, sans explication ni préambule.
```

### Message d'erreur ANGE

> ANGE ne peut pas vous aider avec cette demande. Veillez à ce que votre message respecte les conditions d'utilisation d'ImmatConnect.

### Limites

| Paramètre | Valeur |
|---|---|
| Tokens input max | 150 tokens |
| Tokens output max | 100 tokens |
| Requêtes / user | 10 / heure (rate limit serveur) |
| Requêtes globales (bêta) | 500 / jour |
| Modèle | Claude via ANTHROPIC_API_KEY (immat-brain-dialog) |
| Temperature | 0.3 |

Seuil d'alerte coût : >$2/jour → couper ANGE, investiguer. Tarifs exacts à vérifier sur console.anthropic.com.

---

## PARTIE 5 — PLAN COÛTS ET SEUILS DE DÉCISION

> **Avertissement :** tous les chiffres sont des ordres de grandeur estimatifs. À vérifier dans les dashboards fournisseurs avant tout lancement public. Ne pas figer un budget sans validation contractuelle.

### Supabase

Free → Pro ($25/mois) si : stockage >400 MB, bandwidth >4 GB/mois, Realtime >1.5M msg/mois, Edge Functions >400K invocations/mois, Auth MAU >40K.

Décision : rester Free jusqu'à 30 MAU actifs. Upgrader Pro si >40 MAU ou bandwidth >4 GB.

### Agora

~$1.99 / 1 000 minutes audio HD (à vérifier). Crédit gratuit : $100 à la création du compte (à confirmer). Seuil d'alerte : >500 appels/mois.

### Anthropic / Claude

Tarifs à vérifier sur console.anthropic.com selon modèle dans immat-brain-dialog. Seuil d'alerte : >$2/jour → couper ANGE.

### GitHub Pages

Gratuit, 100 GB bandwidth/mois. Si >100K pages vues/mois → migrer vers Cloudflare Pages.

### Budget bêta estimé (3 mois — non contractuel)

Supabase $0 + Agora <$9 + Anthropic <$15 + domaine <$3 = **<$30 total estimé**.

---

## PARTIE 6 — PLAN VALIDATION TERRAIN (14 CONTRÔLES)

Matériel : 2 téléphones réels (iOS + Android), 2 comptes distincts, connexion 4G.

**Contrôle 1 — Inscription et profil [CRITIQUE]**
Action : créer un compte, saisir plaque + pseudo + couleur.
Attendu : profil créé, plaque visible sur carte, public_profiles alimenté.
Vérif : Supabase Studio → public_profiles → ligne présente.

**Contrôle 2 — Localisation carte [CRITIQUE]**
Action : activer géolocalisation, observer depuis téléphone 2.
Attendu : marqueur user1 visible chez user2 (<60s), plaque + pseudo affichés, pas d'email.
Vérif : marqueur cliquable, données non-PII uniquement.

**Contrôle 3 — Sécurité colonnes PII sur profiles [CRITIQUE — RGPD]**
Action : GET /rest/v1/profiles?select=email,phone avec JWT authentifié.
Attendu : email et phone absents de la réponse — aucune donnée sensible retournée.
Vérif : le critère est l'absence des champs dans le JSON, quel que soit le code HTTP (400, 401, 403, 42501, etc.).

**Contrôle 3b — Sécurité RLS reports [CRITIQUE — RGPD]**
Action : GET /rest/v1/reports?select=reporter_id avec JWT de user2.
Attendu : user2 ne voit que ses propres rows ou réponse vide. Jamais le reporter_id de user1.
Vérif : aucune ligne étrangère retournée.

**Contrôle 3c — Vue public_reports sans reporter_id [CRITIQUE — RGPD]**
Action : GET /rest/v1/public_reports?select=* avec JWT authentifié.
Attendu : toutes les alertes communautaires visibles, champ reporter_id absent.
Vérif : JSON ne contient aucun champ reporter_id.

**Contrôle 4 — Envoi de message [CRITIQUE]**
Action : user1 envoie un message à la plaque de user2.
Attendu : message reçu en temps réel (Realtime), notification push si app en arrière-plan.
Vérif : message visible, badge mis à jour.

**Contrôle 5 — Appel audio — conditions réelles [CRITIQUE]**
Tester : A. app ouverte → appel → accepté → audio → raccroché. B. app arrière-plan user2 → appel reçu → accepté. C. écran verrouillé user2 si possible. D. refus d'appel. E. appel manqué. F. perte réseau courte → retour réseau.
Attendu : tous les cas gèrent sans crash.
Objectif : confirmer que les corrections RLS n'ont pas cassé calls.js.
Vérif : aucune erreur JS liée à profiles dans DevTools.

**Contrôle 6 — Signalement communautaire [CRITIQUE]**
Action : user1 signale une plaque.
Attendu : alerte visible pour user2 via public_reports, sans reporter_id.
Vérif : identique au contrôle 3c.

**Contrôle 7 — Suppression de compte [CRITIQUE — RGPD]**
Action : user1 supprime son compte.
Attendu : données anonymisées/supprimées selon comportement réel de delete-account, plaque disparaît de public_profiles et de la carte.
Vérif : connexion impossible avec anciens identifiants.

**Contrôle 8 — Plaque déjà prise [CRITIQUE]**
Action : user2 tente d'enregistrer la même plaque que user1.
Attendu : erreur "plaque déjà utilisée", inscription bloquée.
Vérif : public_profiles ne contient qu'une ligne pour cette plaque.

**Contrôle 9 — Mode hors ligne [non critique]**
Action : couper le réseau après chargement.
Attendu : app affiche offline.html, pas de crash.
Vérif : Service Worker actif (DevTools → Application → Service Workers).

**Contrôle 10 — Notification push (app fermée) [CRITIQUE]**
Action : fermer l'app sur téléphone 2, envoyer un message depuis téléphone 1.
Attendu : notification push reçue dans les 10 secondes.
Vérif : tap sur notification → app s'ouvre sur la bonne conversation.

**Contrôle 11 — ANGE [non critique]**
Action : utiliser ANGE pour rédiger un message (feu éteint).
Attendu : message courtois en <3s, 3 phrases max, plaque non répétée.
Vérif : message affiché dans le champ, prêt à envoyer.

**Contrôle 12 — Anti-abus rate limit client [non critique]**
Action : envoyer 25 messages en rafale depuis user1.
Attendu : throttle UX côté client activé (bouton grisé ou délai).
Note : valide uniquement le feedback UX, pas la sécurité serveur.

**Règle : 0 KO sur les 11 contrôles critiques (1, 2, 3, 3b, 3c, 4, 5, 6, 7, 8, 10) avant tout lancement public.**

---

## PARTIE 7 — DÉCISIONS FINALES

### Cette semaine (J0–J7)

| Action | Décision |
|---|---|
| Déployer 11 migrations | OUI (ordre strict, 20260615 en dernier) |
| Déployer Edge Functions | OUI (Secrets configurés avant) |
| Activer Realtime tables utilisées | OUI (uniquement les tables confirmées) |
| Lancer validation terrain 14 contrôles | OUI |
| Ouvrir au public général | NON (attendre validation terrain) |

### Ce mois (J7–J30)

| Action | Décision |
|---|---|
| Bêta fermée 10–20 utilisateurs | OUI (après 11/11 critiques OK) |
| Rédiger et publier CGU | OUI (avant bêta fermée) |
| Créer le Registre RAT | OUI (obligatoire RGPD) |
| Canal de signalement manuel | OUI (fondateur en astreinte) |
| Upgrade Supabase Pro | ATTENDRE (seulement si seuils atteints) |
| Déployer ANGE | OUI conditionnel (après test 50 cas) |
| Rate limit serveur (table dédiée) | OUI (dès que possible) |
| S7-NEARBY | ATTENDRE (après bêta stabilisée) |

### À 3 mois (J30–J90)

- Upgrade Supabase Pro → si >40 MAU ou première limite atteinte
- Migration account_status/suspended_until → si modération manuelle insuffisante
- Migration needs_review sur reports → si volume le justifie
- Dépôt marque INPI "ImmatConnect" → si >50 users actifs confirmés
- Recruter modérateur → si >200 signalements/semaine
- Ouverture publique → 11/11 critiques OK + CGU + 30j bêta stable
- Levée de fonds → si >1 000 MAU en bêta ouverte

### Ne pas lancer si

- Un des 11 contrôles critiques est KO
- email ou phone retournés via REST API (contrôle 3 KO)
- reporter_id visible dans /reports pour autre user (contrôle 3b KO)
- reporter_id visible dans /public_reports (contrôle 3c KO)
- Notification push non fonctionnelle sur mobile réel (contrôle 10 KO)
- calls.js cassé par corrections RLS (contrôle 5 KO)
- CGU non publiées
- AGORA_APP_CERTIFICATE, VAPID_PRIVATE_KEY ou ANTHROPIC_API_KEY dans le code ou git

### Recommandation finale

GO bêta fermée sous 5 conditions :
1. 11 migrations déployées et validées (ordre strict)
2. Edge Functions déployées avec Secrets configurés
3. 11/11 contrôles critiques validés terrain (0 KO)
4. CGU publiées (Supabase, Agora, Anthropic — pas OpenAI)
5. Canal de modération manuelle opérationnel

Délai réaliste : J10 si travail continu — J20 si temps partiel.

---

*IMMATCONNECT PRO — PLAN D'EXÉCUTION PRODUCTION 30 JOURS — Version 1.2 — FINALE — 2026-06-13*
