# PRODUCT_ARCHITECTURE_V2 — ImmatConnect Pro
## Roadmap d'Architecture Produit — Post-Validation Terrain V1

> **Statut :** DOCUMENT STRATÉGIQUE — en vigueur après validation terrain V1
> **Référence :** docs/MASTER_COMPATIBILITY_MAP.md v1.3 (GEL DOCUMENTAIRE FINAL)
> **Règle absolue :** Ce document n'autorise AUCUN développement, AUCUNE migration, AUCUNE Edge Function.
> **Usage :** orienter les décisions d'architecture AVANT que le code V2 n'existe.
> **Condition d'activation :** 0 ❌ critiques dans TEST_RESULTS.md + GO MAIN validé.

---

## 0. PRINCIPES DIRECTEURS DE LA V2

Trois règles héritées de la V1 — inviolables pour toute la V2 :

```
PRINCIPE-01 : owner_plate est la clé de continuité de l'identité véhicule.
              Tout module futur s'ancre sur owner_plate — jamais sur user_id seul.

PRINCIPE-02 : RGPD by design — jamais by retrofit.
              Toute nouvelle table est pensée RGPD avant d'être codée.
              delete-account et export-user-data sont mis à jour AVANT le déploiement.

PRINCIPE-03 : La sécurité routière reste gratuite et inaliénable.
              15/17/18, signalements d'urgence, push critiques, ANGE de base :
              JAMAIS derrière un mur premium. JAMAIS.
```

---

## SECTION 1 — MODULE VÉHICULE

### 1.1 Ce qui existe déjà

| Donnée | Table | Visibilité |
|--------|-------|-----------|
| owner_plate | public_profiles | Public — PK |
| pseudo | public_profiles | Public |
| vehicle_color | public_profiles | Public |
| trust_score / trust_level | vehicle_trust_scores | Public (via RPC) |
| avg_score / total_ratings | driver_ratings_summary | Public (via RPC) |

### 1.2 Ce qui manque

| Donnée | Besoin produit | Visibilité recommandée |
|--------|---------------|----------------------|
| vehicle_make (marque) | Identification, assistance, signalements | Public optionnel |
| vehicle_model | Identification précise | Public optionnel |
| vehicle_year (année) | Signalements, assistance technique | Public optionnel |
| fuel_type | Assistance batterie/essence/diesel/électrique | Public optionnel |
| vehicle_type | Filtres carte (voiture/moto/camion/utilitaire) | Public |
| avatar_url | Photo profil véhicule (UX, différenciation) | Public optionnel |
| color_detail | Complément de vehicle_color ("bleu métallisé") | Public optionnel |

### 1.3 Table future : vehicles

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 9
-- Pré-requis : validation terrain V1 complète + bucket vehicle-avatars configuré
CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate   TEXT NOT NULL UNIQUE
                  REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  make          TEXT,
  model         TEXT,
  year          INTEGER CHECK (year BETWEEN 1900 AND 2100),
  fuel_type     TEXT CHECK (fuel_type IN (
                  'essence','diesel','electrique','hybride','gpl','hydrogene','autre')),
  vehicle_type  TEXT CHECK (vehicle_type IN (
                  'voiture','moto','camion','utilitaire','velo','trottinette','autre')),
  color_detail  TEXT,
  avatar_url    TEXT,    -- bucket: vehicle-avatars — JAMAIS public via URL directe
  is_public     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- RLS obligatoire : SELECT public si is_public=true, UPDATE owner uniquement
-- INDEX : owner_plate (unique), vehicle_type (filtre carte)
```

### 1.4 Vue future : public_vehicles

```sql
-- RÉSERVÉ — complément de public_profiles
-- Seulement les champs publics — jamais owner user_id
CREATE VIEW public_vehicles AS
SELECT
  owner_plate,
  make,
  model,
  year,
  fuel_type,
  vehicle_type,
  avatar_url
FROM vehicles
WHERE is_public = true;
-- GRANT SELECT ON public_vehicles TO authenticated, anon
```

### 1.5 Dépendances

| Entité | Type de lien | Sens |
|--------|-------------|------|
| profiles | Source user_id → owner_plate | Lecture |
| public_profiles | owner_plate PK = FK vehicles | Cascade |
| vehicle_trust_scores | owner_plate = même PK → compatible direct | Lecture |
| reports | fuel_type utile pour signalement incendie/fumée | Lecture |
| assistance_requests (futur) | fuel_type critique pour diagnostic panne | Lecture |
| parking_sessions (futur) | owner_plate FK → compatible | Écriture |
| maintenance_reminders (futur) | owner_plate FK → compatible | Écriture |

### 1.6 RGPD — obligations nouvelles

| Obligation | Action | Priorité |
|-----------|--------|----------|
| delete-account | DELETE FROM vehicles WHERE owner_plate = p_plate | P0 |
| delete-account | Supprimer avatar_url dans Storage (bucket vehicle-avatars) | P0 |
| export-user-data | Inclure vehicles dans le JSON exporté | P0 |
| CGU | Mentionner la photo de véhicule et son usage | Avant déploiement |

### 1.7 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-VEH-01 | avatar_url non supprimé à delete-account → fuite RGPD | Helper Storage dans delete-account EF |
| RISK-VEH-02 | avatar_url accessible publiquement sans auth → exposition PII | Bucket privé + signed URLs uniquement |
| RISK-VEH-03 | make/model = données de profilage → ne pas indexer pour analytics | Pas d'index composite sur make+model |
| RISK-VEH-04 | is_public = false mais owner_plate visible en carte → distinction visibilité véhicule vs présence | Deux couches distinctes |
| RISK-VEH-05 | owner_plate changement forcé (erreur de saisie) = rupture tous FK | Procédure admin sécurisée obligatoire |

---

## SECTION 2 — MODULE STATIONNEMENT

### 2.1 Concept — trois besoins distincts

| Besoin | Description | Couverture actuelle |
|--------|-------------|-------------------|
| Signalement véhicule gênant | Véhicule bloque un accès | ✅ Couvert par reports |
| Stationnement temporaire | Minuterie pendant le stationnement | ❌ Absent |
| Partage de place | Proposer une place libre | ❌ Absent |

### 2.2 Table future : parking_sessions

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 11
-- Pré-requis : Module Véhicule déployé + cron Supabase activé
CREATE TABLE parking_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate   TEXT NOT NULL
                  REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  lat           DECIMAL(9,6) NOT NULL,
  lng           DECIMAL(9,6) NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ends_at       TIMESTAMPTZ,     -- NULL = durée indéterminée
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active','expired','ended')),
  is_shared     BOOLEAN DEFAULT false,
  notes         TEXT,            -- "Place sous porche, code XX" — jamais l'adresse exacte
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- RLS : SELECT public si is_shared=true, sinon owner uniquement
-- INDEX : owner_plate, status, ends_at (pour expire cron)
-- TTL : purge automatique sessions > 24h
```

### 2.3 Table future : parking_spots (partage longue durée)

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 16
-- Risque vie privée élevé — décision fondateur obligatoire avant
CREATE TABLE parking_spots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate   TEXT REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  lat           DECIMAL(9,6) NOT NULL,
  lng           DECIMAL(9,6) NOT NULL,
  address_hint  TEXT,      -- JAMAIS l'adresse exacte — ex: "Quartier République, 2e sous-sol"
  available_from TIME,
  available_to  TIME,
  days          TEXT[],    -- ['lun','mar','mer','jeu','ven']
  notes         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 Edge Functions réservées

| EF | Déclencheur | Rôle |
|----|-------------|------|
| `expire-parking-sessions` | Cron toutes les 5min | status → expired si ends_at < NOW() |
| `notify-parking-expiry` | Trigger post-expire | Push "Votre stationnement expire dans 10min" |

### 2.5 Interactions avec l'existant

| Entité | Interaction | Type |
|--------|------------|------|
| user_locations | Conflit potentiel : utilisateur stationnaire vs en mouvement | Décision architecture : désactiver broadcast si parking_session active ? |
| push_subscriptions | Notifications expiration → compatible direct | Écriture |
| trust | Partage régulier de place → bonus trust (à quantifier) | Lecture trust |
| reports | Signalement gênant → s'appuie sur l'existant, pas de doublon | Aucun lien direct |

### 2.6 RGPD — angles morts critiques

```
parking_sessions contient lat/lng = données de localisation = PII (RGPD art. 4)
parking_spots contient position habdomadaire régulière = habitudes de vie (RGPD art. 9)

Obligations :
- delete-account → DELETE FROM parking_sessions + parking_spots WHERE owner_plate = p_plate
- export-user-data → inclure les deux tables
- Ne JAMAIS stocker l'adresse exacte (domicile/travail identifiable)
- TTL automatique sur parking_sessions (24h max recommandé)
```

### 2.7 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-PKG-01 | parking_spots → déduit l'adresse domicile → RGPD art. 9 habitudes de vie | address_hint flou obligatoire (INV-V2-04) |
| RISK-PKG-02 | is_shared = true sans authentification du preneur → abus | Requiert connexion pour voir les détails |
| RISK-PKG-03 | expire-parking-sessions en retard → sessions fantômes sur la carte | Idempotence cron (INV-V2-06) |
| RISK-PKG-04 | Conflit user_locations ↔ parking_sessions — deux sources de position | Une seule source de vérité position à décider |
| RISK-PKG-05 | Horaires parking_spots → présence domicile déductible | Floutage horaire (granularité heure, pas minute) |

---

## SECTION 3 — MODULE MAINTENANCE VÉHICULE

### 3.1 Concept

Rappels proactifs pour les échéances réglementaires et l'entretien du véhicule. Strictement privé — jamais public.

### 3.2 Table future : maintenance_reminders

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 10
CREATE TABLE maintenance_reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate   TEXT NOT NULL
                  REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN (
                  'controle_technique','assurance','vidange','pneus',
                  'courroie_distribution','freins','revision','batterie',
                  'vignette_crit_air','climatisation','autre')),
  due_date      DATE NOT NULL,
  notified_30d  BOOLEAN DEFAULT false,
  notified_7d   BOOLEAN DEFAULT false,
  notified_1d   BOOLEAN DEFAULT false,
  done_at       DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- RLS : owner uniquement (SELECT, INSERT, UPDATE, DELETE)
-- INDEX : owner_plate, due_date, done_at IS NULL (pour cron)
```

### 3.3 Table future : maintenance_history

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 10
CREATE TABLE maintenance_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate   TEXT NOT NULL
                  REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  done_at       DATE NOT NULL,
  mileage_km    INTEGER,
  garage_name   TEXT,    -- déclaratif — pas lié à professional_profiles en V2
  cost_eur      DECIMAL(8,2),
  notes         TEXT,
  document_url  TEXT,    -- bucket: maintenance-docs — JAMAIS public
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- RLS : owner uniquement
-- document_url : signed URL à la demande, expiration 1h
```

### 3.4 Edge Function réservée

| EF | Déclencheur | Rôle |
|----|-------------|------|
| `send-maintenance-reminders` | Cron quotidien à 8h | Push si due_date dans 30j/7j/1j et !notified_Xd → marquer notified |

### 3.5 RGPD

| Donnée | Obligation |
|--------|-----------|
| maintenance_reminders | DELETE FROM WHERE owner_plate + export |
| maintenance_history | DELETE FROM WHERE owner_plate + export |
| document_url (Storage) | Supprimer l'objet bucket à delete-account |
| cost_eur | Donnée financière → DPO à informer |

### 3.6 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-MNT-01 | document_url non supprimé à delete-account | Helper Storage dans EF delete-account |
| RISK-MNT-02 | Bucket maintenance-docs public par erreur de config | Bucket policy = PRIVATE obligatoire |
| RISK-MNT-03 | Rappels doublonnés si cron relancé deux fois | Guards notified_Xd = idempotence |
| RISK-MNT-04 | CT expiré visible dans profil public | JAMAIS exposer maintenance_reminders en public |
| RISK-MNT-05 | cost_eur = habitude financière = PII comportementale | Mentionner dans CGU |

---

## SECTION 4 — MODULE ASSISTANCE ROUTIÈRE

### 4.1 Concept

Demande d'aide communautaire géolocalisée en cas de panne, avec matching actif.

### 4.2 Différence fondamentale avec reports

| Dimension | reports | assistance_requests |
|-----------|---------|---------------------|
| Nature | Signalement passif | Demande active d'aide |
| Expiration | Pas de TTL fonctionnel | TTL 30min puis expired |
| Matching | Aucun | Matching géographique actif |
| Canal de suivi | Aucun | messages existants (plate→plate) |
| Trust impact | Faible | Fort (helper +trust si résolu) |

### 4.3 Table future : assistance_requests

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 11
-- Décision RGPD anonymisation obligatoire avant implémentation (voir 4.6)
CREATE TABLE assistance_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_plate   TEXT NOT NULL
                      REFERENCES public_profiles(owner_plate),
  type              TEXT NOT NULL CHECK (type IN (
                      'panne','batterie','crevaison','remorquage',
                      'carburant','cle_bloquee','accident_mineur','autre')),
  lat               DECIMAL(9,6) NOT NULL,
  lng               DECIMAL(9,6) NOT NULL,
  description       TEXT,
  status            TEXT DEFAULT 'open'
                      CHECK (status IN ('open','matched','closed','expired')),
  helper_plate      TEXT REFERENCES public_profiles(owner_plate),
  matched_at        TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  rating_given      SMALLINT CHECK (rating_given BETWEEN 1 AND 5),
  expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- RLS : SELECT public si status='open' (lat/lng floutés jusqu'au match), owner + helper complet
-- INDEX : status, expires_at, owner_plate, (lat,lng) via PostGIS si disponible
```

### 4.4 Flux complet

```
1. requester crée assistance_request (status=open, position floue à 500m)
   → broadcast Realtime → conducteurs dans rayon 5km reçoivent alerte push
2. conducteur volontaire accepte (status=matched, helper_plate=...)
   → position exacte révélée au helper uniquement (via RPC SECURITY DEFINER)
   → canal de communication : messages existants plate→plate (aucun nouveau canal)
3. requester évalue l'aide (rating_given 1-5) → refresh_vehicle_trust(helper_plate)
4. requester ferme (status=closed) ou expire automatiquement après 30min
```

### 4.5 Interactions avec l'existant

| Entité | Interaction |
|--------|------------|
| messages | Canal de communication helper ↔ requester — aucun nouveau canal nécessaire |
| vehicle_trust_scores | helper résout → +trust ; helper accepte puis abandonne → -trust |
| push_subscriptions | Notifier conducteurs proches → compatible direct |
| call_requests | L'app peut proposer un appel vocal au helper → compatible |
| vehicles.fuel_type | Filtrer les helpers pertinents (panne batterie → électrique utile) |

### 4.6 RGPD — décision architecturale obligatoire avant implémentation

```
PROBLÈME : Si requester supprime son compte après une assistance reçue,
que faire de assistance_requests ?

Option A : DELETE direct
  → Avantage : RGPD propre
  → Inconvénient : helper perd la trace de l'assistance donnée

Option B : Anonymisation (SET requester_plate = 'COMPTE_SUPPRIME', lat = 0, lng = 0)
  → Avantage : conserve l'historique du helper
  → Inconvénient : résidu de donnée

Option C : Table d'audit séparée (assistance_audit) avec données helper uniquement
  → Avantage : équilibre RGPD + historique helper
  → Inconvénient : complexité

DÉCISION REQUISE PAR LE FONDATEUR AVANT SPRINT 11.
```

### 4.7 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-ASS-01 | Fausse panne = abus de confiance | trust_penalty si pattern > 3 fausses demandes |
| RISK-ASS-02 | Position exacte visible avant match | Fuzzy position jusqu'au match confirmé (500m) |
| RISK-ASS-03 | Helper accepte mais n'arrive pas | trust_penalty si fermeture non resolved |
| RISK-ASS-04 | Anonymisation vs effacement RGPD | Décision fondateur obligatoire (voir 4.6) |
| RISK-ASS-05 | Expire cron en retard → demandes fantômes | Idempotence obligatoire (INV-V2-06) |
| RISK-ASS-06 | Matching géographique = PostGIS recommandé mais non installé en V1 | Décision infra avant Sprint 11 |

---

## SECTION 5 — MODULE COMMUNAUTÉ

### 5.1 Ce qui existe déjà

| Mécanisme | Table | État |
|-----------|-------|------|
| Score de confiance 0-100 | vehicle_trust_scores | ✅ Déployé |
| Niveaux ambassador/trusted/neutral/caution | vehicle_trust_scores | ✅ Déployé |
| Notation conducteur | driver_ratings | ✅ Déployé |
| Blocage utilisateur | user_blocks | ✅ Déployé |

### 5.2 Table future : badges

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 12
CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_plate     TEXT NOT NULL
                    REFERENCES public_profiles(owner_plate) ON DELETE CASCADE,
  badge_type      TEXT NOT NULL CHECK (badge_type IN (
                    'first_help',          -- première aide assistante acceptée
                    'trusted_driver',      -- trust_level=trusted pendant 30j consécutifs
                    'ambassador',          -- trust_level=ambassador
                    'good_samaritan',      -- 10+ aides assistantes résolues
                    'early_adopter',       -- bêta fermée (attribué manuellement)
                    'veteran',             -- compte > 1 an avec activité régulière
                    'clean_record'         -- 0 signalement négatif reçu en 90j
                  )),
  awarded_at      TIMESTAMPTZ DEFAULT NOW(),
  awarded_by      TEXT DEFAULT 'system' CHECK (awarded_by IN ('system','moderator')),
  is_active       BOOLEAN DEFAULT true,    -- peut être retiré par modérateur
  UNIQUE (owner_plate, badge_type)
);
-- GRANT SELECT ON badges TO authenticated (badges visibles sur profil public)
```

### 5.3 Programme Ambassadeurs — critères V2

| Critère | Valeur seuil |
|---------|-------------|
| trust_score | ≥ 80 |
| trust_level | ambassador |
| Ancienneté compte | ≥ 90 jours d'activité |
| Zéro signalement P1 reçu | obligatoire |
| Interactions positives | ≥ 20 (notes ≥ 4) |
| Zéro user_block reçu de modérateur | obligatoire |

Bénéfices ambassadeur :
- Badge visible sur profil public
- Priorité dans le matching assistance routière
- Accès bêta fonctionnalités futures
- Canal modération communautaire (signalements prioritaires traités en premier)

### 5.4 Matrice anti-abus — état actuel vs futur

| Mécanisme | V1 | V2 |
|-----------|----|----|
| Rate limit messages | ✅ 5/min client | ✅ conserver |
| Rate limit appels | ✅ 3/10min client | ✅ conserver |
| SOS cooldown | ✅ 15min client | ✅ conserver |
| Blocage utilisateur | ✅ DB | ✅ conserver |
| Trust penalty automatique | ❌ | À créer Sprint 12 |
| Shadow ban modérateur | ❌ | À créer Sprint 12 |
| Signalement badge abusif | ❌ | À créer Sprint 12 |
| Rate limit serveur (EF) | ❌ | Obligatoire avant monétisation |

### 5.5 RGPD

| Donnée | Obligation |
|--------|-----------|
| badges | DELETE FROM badges WHERE owner_plate = p_plate à delete-account |
| badges | Inclure dans export-user-data |
| early_adopter | Preuve d'ancienneté d'inscription = PII comportementale → CGU |
| awarded_by = moderator | Traçabilité modération → archivage légal possible |

### 5.6 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-COM-01 | Notation croisée entre connaissances → manipulation trust | Détection pattern (mêmes paires récurrentes) |
| RISK-COM-02 | Badge early_adopter = preuve datée = PII comportementale | Mentionner dans CGU |
| RISK-COM-03 | Ambassadeur désactivé sans notification → UX dégradée | Push notification + explication |
| RISK-COM-04 | Modération manuelle = bottleneck sans équipe | Outils self-service pour les ambassadeurs |
| RISK-COM-05 | trust_score gamifié = création de comptes satellites | UNIQUE contrainte owner_plate + ancienneté minimale |

---

## SECTION 6 — MODULE MONÉTISATION

### 6.1 Règle inaliénable

```
INV-MON-01 (invariant) :
Toute fonctionnalité liée à la sécurité routière reste GRATUITE.
15/17/18, signalements d'urgence, messages de sécurité, ANGE de base, push critiques :
JAMAIS payants. JAMAIS conditionnels à un abonnement.
```

### 6.2 Matrice gratuit / premium

| Fonctionnalité | Tier | Justification |
|----------------|------|--------------|
| Appels vocaux (base) | **Gratuit** | Communication sécurité |
| Messages (base) | **Gratuit** | Communication sécurité |
| Signalements route/aide/véhicule | **Gratuit** | Sécurité communautaire |
| Bouton urgence 15/17/18 | **Gratuit — INALIÉNABLE** | Obligation éthique et légale |
| ANGE (réponses de base) | **Gratuit** | Service de base |
| Push notifications (base) | **Gratuit** | Sécurité |
| Localisation carte (base) | **Gratuit** | Sécurité |
| Trust score (lecture) | **Gratuit** | Transparence communautaire |
| Profil véhicule basique | **Gratuit** | Identité de base |
| Maintenance rappels | **Premium** | Service à valeur ajoutée |
| Parking partage | **Premium** | Service à valeur ajoutée |
| Assistance routière matching | **Freemium** (1/mois gratuit, illimité premium) | Équilibre |
| Badges avancés | **Premium** | Statut communautaire |
| ANGE étendu (mémoire, copilote) | **Premium** | Coût API variable |
| Accès professionnels (garages) | **Premium** | B2B |
| Historique étendu > 30j | **Premium** | Stockage |
| Export analytiques personnels | **Premium** | Traitement données |
| Photo profil véhicule | **Premium** | Coût Storage |

### 6.3 Table future : user_subscriptions

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 13
-- Décision DPO + conseil juridique obligatoire avant (archivage légal vs RGPD)
CREATE TABLE user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('free','premium','pro')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  payment_ref     TEXT,   -- référence externe Stripe/RevenueCat — JAMAIS données CB
  status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','expired','pending')),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- NOTE : user_subscriptions attaché à user_id — le premium suit la personne, pas le véhicule.
-- Jointure user_id → owner_plate nécessaire pour gates premium sur véhicule.
```

### 6.4 RPC future : is_premium

```sql
-- RÉSERVÉ — gate premium côté serveur obligatoire (jamais uniquement client)
CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND plan IN ('premium','pro')
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;
```

### 6.5 RGPD — tensions légales

```
TENSION : delete-account (effacement immédiat) vs archivage légal facturation (5 ans)

Cas 1 — Utilisateur sans abonnement payé : DELETE immédiat, pas de tension.
Cas 2 — Utilisateur avec historique de paiement :
  → Les données de facturation doivent être conservées 5 ans (Code de commerce art. L110-4)
  → MAIS les données personnelles doivent être effacées sur demande
  → Solution : pseudonymisation (conserver payment_ref anonymisé, effacer user_id et PII)

DÉCISION LÉGALE OBLIGATOIRE AVANT SPRINT 13.
DPO requis si traitement > 5000 personnes.
```

### 6.6 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-MON-01 | Gate premium côté client uniquement → bypassable | is_premium() SECURITY DEFINER côté serveur |
| RISK-MON-02 | Paiement = données financières → DPO requis | Conseil juridique avant Sprint 13 |
| RISK-MON-03 | delete-account + abonnement actif → procédure remboursement non définie | Politique remboursement dans CGU |
| RISK-MON-04 | is_premium() dans chaque EF → N+1 queries si mal indexé | Index user_id + status + expires_at |
| RISK-MON-05 | Freemium abuse → rotation de comptes (1 aide/mois gratuite) | Lier à owner_plate validée (pas user_id seul) |
| RISK-MON-06 | Conflit archivage légal 5 ans vs RGPD effacement | Pseudonymisation payment_ref |

---

## SECTION 7 — MODULE PROFESSIONNELS

### 7.1 Concept

Accès différencié pour les acteurs professionnels (garages, dépanneurs, assureurs) pouvant intervenir suite à des demandes d'assistance ou de maintenance.

### 7.2 Différences fondamentales avec le profil utilisateur

| Dimension | Utilisateur | Professionnel |
|-----------|-------------|--------------|
| Identifiant | owner_plate | user_id + SIRET |
| Trust | vehicle_trust_scores | professional_trust (futur, séparé) |
| Contact | messages app | phone_pro (public déclaratif) |
| Localisation | temps réel mouvante | zone d'intervention fixe |
| RGPD base | Individu | Société (sauf auto-entrepreneur) |
| Archivage légal | Non applicable | Possible (comptabilité) |

### 7.3 Table future : professional_profiles

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 14
-- Pré-requis : vérification SIRET définie + décision RGPD auto-entrepreneur
CREATE TABLE professional_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'garage','depanneur','assureur','remorqueur','partenaire')),
  company_name    TEXT NOT NULL,
  siret           TEXT,
  is_verified     BOOLEAN DEFAULT false,  -- après vérification SIRET
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  radius_km       INTEGER DEFAULT 20,
  phone_pro       TEXT,    -- numéro professionnel public — jamais le numéro personnel
  website         TEXT,
  hours_json      JSONB,   -- {"lun":{"open":"08:00","close":"18:00"}, ...}
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- RLS : SELECT public (is_active=true), UPDATE owner uniquement
-- INDEX : type, (lat,lng), is_verified, is_active
```

### 7.4 Flux assistance → professionnel

```
assistance_request (panne) [status=open]
  → broadcast à conducteurs proches (communauté)
  → broadcast à professionnels dans radius_km (type=depanneur/garage)
  → professionnel accepte (status=matched, helper_plate=professionnel.owner_plate)
  → rating professionnel séparé de driver_ratings (professional_ratings — futur)
  → tarif ? → hors scope V2 (décision monétisation B2B)
```

### 7.5 RGPD

```
CAS 1 — Professionnel = société (SIRET société) :
  → RGPD s'applique peu aux données de la société
  → phone_pro, website, company_name = données publiques professionnelles
  → delete-account possible mais archivage légal comptabilité (5 ans)

CAS 2 — Professionnel = auto-entrepreneur (SIRET personnel) :
  → RGPD individu s'applique intégralement
  → delete-account = effacement immédiat
  → Tension légale archivage identique au cas monétisation

DÉCISION LÉGALE OBLIGATOIRE AVANT SPRINT 14.
```

### 7.6 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-PRO-01 | Faux professionnels sans vérification SIRET | API vérification SIRET (INSEE, Pappers) avant is_verified |
| RISK-PRO-02 | Auto-entrepreneur = RGPD individu s'applique | Distinction légale dans les CGU pro |
| RISK-PRO-03 | phone_pro visible sans auth → spam | Rate limit appels téléphoniques hors app |
| RISK-PRO-04 | Trust professionnel ≠ trust conducteur → deux systèmes | professional_trust table séparée obligatoire |
| RISK-PRO-05 | radius_km déclaratif → pas de vérification réelle | Acceptable en V2, vérification terrain en V3 |
| RISK-PRO-06 | Professionnel qui accepte une assistance = concurrence déloyale si pas encadré | CGU professionnels spécifiques |

---

## SECTION 8 — MODULE IA / ANGE

### 8.1 État actuel (V1)

| Dimension | État |
|-----------|------|
| Modèle | Anthropic (EF immat-brain-dialog) |
| Mémoire | Aucune — chaque échange est indépendant |
| Contexte | Conducteur routier français uniquement |
| Dégradation | Gracieuse — message dégradation affiché si EF KO |
| Coût | Par requête — pas de monitoring volume en V1 |
| Secrets | ANTHROPIC_API_KEY dans Supabase Secrets uniquement |

### 8.2 Matrice évolutions possibles

| Évolution | Complexité | Risque RGPD | Valeur produit | Sprint cible |
|-----------|-----------|-------------|----------------|-------------|
| Contexte maintenance (rappels passés) | Faible | Faible | Élevée | 10 |
| Contexte assistance (type de panne) | Faible | Faible | Élevée | 11 |
| Mémoire de session (EF, TTL 1h, Redis) | Faible | Faible | Moyenne | 12 |
| Mémoire persistante (conversation_history) | Moyenne | **Élevé** | Moyenne | 15 |
| ANGE Pro (conseiller professionnel) | Élevée | Moyen | Élevée | 14 |
| Synthèse vocale TTS | Élevée | Faible | Moyenne | 16 |
| OCR reconnaissance plaque | Très élevée | **Très élevé** | Moyenne | JAMAIS sans DPO |

### 8.3 Table future : conversation_history (optionnelle — opt-in strict)

```sql
-- RÉSERVÉ — NE PAS CRÉER AVANT SPRINT 15
-- Consentement opt-in explicite OBLIGATOIRE avant création
-- Jamais opt-out — l'utilisateur doit activement choisir la mémoire
CREATE TABLE conversation_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL,
  role          TEXT CHECK (role IN ('user','assistant')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- TTL automatique : DELETE WHERE created_at < NOW() - INTERVAL '30 days'
-- RLS : owner uniquement — JAMAIS accessible à d'autres utilisateurs ni à l'admin
-- RLS : JAMAIS utilisé pour entraînement modèle sans consentement séparé explicite
```

### 8.4 Invariants ANGE à conserver en V2

```
INV-ANGE-01 : ANGE ne sort jamais du contexte conducteur routier français.
INV-ANGE-02 : ANGE ne donne jamais de conseil médical, juridique ou financier précis.
INV-ANGE-03 : ANGE ne révèle jamais d'informations d'un utilisateur à un autre.
INV-ANGE-04 : ANGE échoue gracieusement — jamais d'écran vide ni de stack trace.
INV-ANGE-05 : ANTHROPIC_API_KEY jamais dans le code client — EF uniquement.
INV-ANGE-06 : Le volume de requêtes ANGE est monitoré et limité (rate limit EF).
INV-ANGE-07 : conversation_history nécessite opt-in actif — jamais activé par défaut.
```

### 8.5 Évolution contextuelle sans mémoire (Sprint 10-11 — safe)

Sans créer conversation_history, ANGE peut être enrichi en passant du contexte dans le prompt système :
- Sprint 10 : inject le prochain rappel maintenance dans le prompt ("ton CT expire dans 12 jours")
- Sprint 11 : inject le type de panne de l'assistance_request en cours
- Ces données viennent de la DB de l'utilisateur — pas de stockage supplémentaire

### 8.6 Risques futurs

| # | Risque | Mitigation |
|---|--------|-----------|
| RISK-IA-01 | conversation_history = données ultra-sensibles → faille = catastrophe RGPD | Opt-in + TTL 30j + chiffrement application-level |
| RISK-IA-02 | ANGE avec mémoire → profilage comportemental illicite | Limiter le contexte injecté (pas de profilage) |
| RISK-IA-03 | Changement modèle Anthropic → comportement non déterministe | Tests de régression comportementale avant chaque changement |
| RISK-IA-04 | Coût API Anthropic sans monitoring → budget explosion | Rate limit par user_id dans EF + alerte seuil |
| RISK-IA-05 | OCR plaque = biométrique par assimilation → RGPD art. 9 | Ne pas implémenter sans DPO + avis CNIL |

---

## SECTION 9 — ARCHITECTURE CIBLE

### 9.1 Vision à 6 mois — Stabilisation et Module Véhicule

**Condition d'entrée :** 0 ❌ critiques terrain + GO MAIN validé.

| Sprint | Contenu | Priorité | Condition |
|--------|---------|----------|-----------|
| 8 | delete_audit_log RGPD (traçabilité effacements) | P0 | Validation terrain |
| 8 | Promise.allSettled() push (résilience envoi multiple) | P0 | Validation terrain |
| 8 | Bêta fermée — invitation 10-20 utilisateurs | P0 | GO MAIN |
| 9 | Module Véhicule — vehicles table + public_vehicles view | P1 | Sprint 8 terminé |
| 9 | Photo profil véhicule (avatar_url, bucket vehicle-avatars) | P2 | Sprint 9 véhicule |
| 10 | Module Maintenance — rappels CT/assurance/vidange via push | P2 | Sprint 9 terminé |
| 10 | ANGE contexte maintenance (inject due dates dans prompt) | P3 | Sprint 10 terminé |

**Objectif 6 mois :** L'application existe, est testée en conditions réelles, et offre la gestion de profil véhicule complète.

### 9.2 Vision à 12 mois — Croissance et Assistance

**Objectif :** Communauté active, premier modèle économique.

| Sprint | Contenu | Priorité | Condition |
|--------|---------|----------|-----------|
| 11 | Module Stationnement temporaire + cron expiration | P2 | Sprint 10 terminé |
| 11 | Module Assistance Routière (matching communautaire) | P1 | Décision RGPD anonymisation |
| 11 | ANGE contexte assistance (type panne dans prompt) | P3 | Sprint 11 terminé |
| 12 | Module Communauté — badges + ambassadeurs | P2 | Sprint 11 terminé |
| 12 | Trust Engine V2 — penalties automatiques | P2 | Sprint 12 terminé |
| 13 | Monétisation freemium — user_subscriptions + is_premium RPC | P2 | DPO + conseil légal |
| 13 | Gates premium côté serveur (maintenance illimitée, assistance illimitée) | P2 | Sprint 13 |

**Objectif 12 mois :** Modèle communautaire fonctionnel, revenu récurrent initial.

### 9.3 Vision à 24 mois — Marketplace et B2B

**Objectif :** Écosystème professionnel, ANGE étendu, données stratégiques.

| Sprint | Contenu | Priorité | Condition |
|--------|---------|----------|-----------|
| 14 | Module Professionnels — garages + dépanneurs vérifiés | P2 | SIRET API + légal |
| 14 | Intégration assistance ↔ professionnels | P2 | Sprint 14 profils |
| 15 | ANGE mémoire opt-in (conversation_history TTL 30j) | P3 | DPO + opt-in UI |
| 15 | ANGE Pro — conseiller maintenance et assistance | P3 | Sprint 15 mémoire |
| 16 | Stationnement longue durée + partage de place | P3 | Décision vie privée |
| 16 | Analytics personnels premium (historique > 30j) | P3 | Sprint 13 monétisation |

**Objectif 24 mois :** Plateforme complète, partenariats professionnels, ANGE avancé.

### 9.4 Ce qui ne doit PAS être planifié avant 24 mois

```
❌ OCR reconnaissance de plaque (biométrique par assimilation — RGPD art. 9)
❌ Géolocalisation continue en arrière-plan sans consentement actif
❌ Scoring assurantiel basé sur les comportements (données sensibles)
❌ Revente de données à des tiers (illicite sans consentement explicite séparé)
❌ Social graph complet (réseau de relations = PII sensible)
❌ Notation en temps réel visible publiquement (risque réputation)
❌ IA générative sans modération de contenu (risque hallucination public)
```

---

## SECTION 10 — MATRICE DE COMPATIBILITÉ V2

**Légende :**
- **R** = Reads
- **W** = Writes
- **RW** = Les deux
- **—** = Pas de lien direct
- **!** = Point d'attention RGPD — action obligatoire à delete-account / export

| Module | profiles | public_profiles | owner_plate | vehicle_trust_scores | reports | messages | calls | push | delete-account | export-data |
|--------|----------|----------------|------------|---------------------|---------|----------|-------|------|---------------|-------------|
| **Véhicule** | R (user_id) | RW (complément) | FK unique | RW | R (fuel) | — | — | — | **!W** (avatar Storage) | **!W** |
| **Stationnement** | R (user_id) | R | FK | R | W (gênant exist.) | — | — | W (expiry) | **!W** (lat/lng) | **!W** |
| **Maintenance** | R (user_id) | R | FK | — | — | — | — | W (rappels) | **!W** (docs Storage) | **!W** |
| **Assistance** | R (user_id) | R | FK | RW (trust helper) | R | RW (canal) | RW (appel) | W (nearby) | **!W** (anon. ?) | **!W** |
| **Communauté** | R (user_id) | RW (badges visibles) | FK | RW (trust penalty) | R | — | — | — | **!W** | **!W** |
| **Monétisation** | R (user_id) | — | — | — | — | — | — | W (renouveau) | **!W** (légal 5ans) | **!W** |
| **Professionnels** | R (user_id) | — | — | R | — | RW | RW | W (matching) | **!W** (légal ?) | **!W** |
| **IA/ANGE** | R (user_id) | R | — | R | R (contexte) | — | — | — | **!W** (history) | **!W** |

**Compatibilité confirmée :** Tous les modules futurs sont compatibles avec la base V1 via le pivot `owner_plate`. Aucun changement de schéma fondamental n'est nécessaire sur les tables existantes.

---

## SECTION 11 — FUTURS ANGLES MORTS

Ces angles morts n'existent pas encore mais **se produiront** sans anticipation.

| # | Angle mort | Module | Mitigation requise |
|---|-----------|--------|--------------------|
| AM-01 | delete-account non mis à jour à chaque nouveau module | Tous | Checklist pre-deploy : "delete-account couvre cette table ?" |
| AM-02 | export-user-data non mis à jour idem | Tous | Idem — checklist obligatoire |
| AM-03 | owner_plate changement forcé = rupture tous FK | Véhicule, Trust | Procédure admin sécurisée (migration owner_plate) |
| AM-04 | user_subscriptions (user_id) ↔ vehicles (owner_plate) = jointure double | Monétisation | RPC is_premium_for_plate(p_plate) — jointure interne |
| AM-05 | conversation_history non chiffrée au repos si compromise | IA/ANGE | Chiffrement application-level ou Column Encryption |
| AM-06 | Crons multiples concurrents → contention Supabase | Parking, Maintenance, Assistance | Planification décalée + monitoring actif |
| AM-07 | public_vehicles accessible sans RLS → exposition make/model | Véhicule | RLS vehicles séparée de profiles (deux politiques distinctes) |
| AM-08 | Badge early_adopter = preuve datée d'inscription → PII comportementale | Communauté | CGU mention obligatoire avant attribution |
| AM-09 | Professional auto-entrepreneur = RGPD individu appliqué sans distinction | Professionnels | Champ entity_type dans professional_profiles |
| AM-10 | delete-account + abonnement actif = remboursement non défini | Monétisation | Politique remboursement dans CGU avant Sprint 13 |
| AM-11 | assistance_requests lat/lng visible avant match = PII exposée | Assistance | Fuzzy position obligatoire jusqu'au match confirmé |
| AM-12 | Bucket vehicle-avatars et maintenance-docs sans TTL → croissance Storage infinie | Véhicule, Maintenance | TTL Storage automatique (Supabase Storage lifecycle) |

---

## SECTION 12 — FUTURES DETTES TECHNIQUES PROBABLES

| # | Dette | Module | Sprint probable |
|---|-------|--------|----------------|
| DEBT-FUT-01 | delete-account EF à étendre à chaque nouveau module → oubli systématique si pas de checklist | Tous | Sprint de chaque module |
| DEBT-FUT-02 | export-user-data EF idem | Tous | Sprint de chaque module |
| DEBT-FUT-03 | push_subscriptions = un seul endpoint → multicanal (email, SMS) non prévu | Push | Sprint 13 |
| DEBT-FUT-04 | driver_ratings_summary = vue matérialisée → refresh CONCURRENTLY à planifier (cron manquant) | Trust | Sprint 12 |
| DEBT-FUT-05 | vehicle_trust_scores.formula hardcodée → paramétrable nécessaire à l'échelle | Trust | Sprint 12 |
| DEBT-FUT-06 | rate_limit_counters = localStorage client → à migrer serveur si gates premium | Monétisation | Sprint 13 |
| DEBT-FUT-07 | ImmatBus = événements JS non persistés → audit trail absent | Appels | Sprint 14 |
| DEBT-FUT-08 | Agora token = expire 3600s → renouvellement mid-call non implémenté | Appels | Sprint 9 |
| DEBT-FUT-09 | SW version = constante manuelle → CI/CD automation nécessaire à l'échelle | PWA | Sprint 12 |
| DEBT-FUT-10 | Realtime = pas de compression → scalabilité > 10k users non validée | Infra | Sprint 13 |
| DEBT-FUT-11 | Pas d'observabilité EF (logs centralisés, alertes) | Tous | Sprint 10 |
| DEBT-FUT-12 | owner_plate en claire dans les logs Supabase → hachage pour analytics internes | Privacy | Sprint 11 |

---

## SECTION 13 — FUTURES TABLES RÉSERVÉES (SYNTHÈSE)

Tables à NE PAS créer avant la décision explicite. Ordre chronologique recommandé.

| Priorité | Table | Module | Sprint cible | Décision pré-requis |
|----------|-------|--------|-------------|---------------------|
| P0 | `delete_audit_log` | RGPD | 8 | Obligatoire avant GO MAIN |
| P1 | `vehicles` | Véhicule | 9 | bucket vehicle-avatars configuré |
| P1 | `maintenance_reminders` | Maintenance | 10 | Cron Supabase activé |
| P1 | `maintenance_history` | Maintenance | 10 | bucket maintenance-docs privé |
| P2 | `parking_sessions` | Stationnement | 11 | Décision user_locations ↔ parking |
| P2 | `assistance_requests` | Assistance | 11 | Décision RGPD anonymisation |
| P2 | `badges` | Communauté | 12 | Consentement dans CGU |
| P2 | `user_subscriptions` | Monétisation | 13 | DPO + conseil légal |
| P3 | `professional_profiles` | Professionnels | 14 | API SIRET + légal |
| P3 | `parking_spots` | Stationnement | 16 | Décision vie privée adresse |
| P3 | `conversation_history` | IA/ANGE | 15 | Opt-in UI + DPO |
| P3 | `moderation_actions` | Communauté | 14 | Équipe modération |
| P3 | `professional_trust` | Professionnels | 14 | Trust engine pro séparé |

---

## SECTION 14 — FUTURES EDGE FUNCTIONS RÉSERVÉES (SYNTHÈSE)

| EF | Module | Déclencheur | Sprint | Priorité |
|----|--------|-------------|--------|----------|
| `expire-parking-sessions` | Stationnement | Cron 5min | 11 | P2 |
| `notify-parking-expiry` | Stationnement | Trigger post-expire | 11 | P2 |
| `send-maintenance-reminders` | Maintenance | Cron quotidien 8h | 10 | P2 |
| `match-assistance-request` | Assistance | Realtime INSERT | 11 | P1 |
| `close-expired-assistance` | Assistance | Cron 5min | 11 | P1 |
| `award-badge` | Communauté | Trigger ou webhook trust | 12 | P2 |
| `verify-subscription` | Monétisation | Webhook Stripe/RevenueCat | 13 | P2 |
| `verify-siret` | Professionnels | API INSEE/Pappers | 14 | P2 |
| `ange-with-memory` | IA/ANGE | Client (remplacement immat-brain-dialog) | 15 | P3 |
| `cleanup-storage` | Tous | Cron hebdomadaire | 10 | P2 |

---

## SECTION 15 — FUTURS INVARIANTS À PROTÉGER

Ces invariants s'ajoutent aux INV-001→027 du MASTER_COMPATIBILITY_MAP.md v1.3.

```
INV-V2-01 : Toute table avec owner_plate FK → ON DELETE CASCADE obligatoire.
            Aucune orphelin de plaque autorisé.

INV-V2-02 : Toute table avec user_id FK → incluse dans delete-account EF
            avant le déploiement de cette table. JAMAIS après.

INV-V2-03 : Toute fonctionnalité de sécurité routière = GRATUITE.
            Jamais gatée premium (15/17/18, signalements urgence, push critiques).

INV-V2-04 : Toute donnée de localisation (lat/lng) = PII = nettoyage RGPD obligatoire.
            delete-account nettoie toutes les positions stockées.

INV-V2-05 : Tout bucket Storage créé → politique de suppression documentée
            avant le déploiement. Pas de bucket sans TTL ou sans cleanup delete-account.

INV-V2-06 : Tout cron créé → idempotence obligatoire.
            Un cron relancé deux fois ne doit pas doubler les effets.

INV-V2-07 : ANGE ne stocke jamais de données utilisateur sans opt-in explicite.
            conversation_history = opt-in actif uniquement, jamais par défaut.

INV-V2-08 : is_premium() vérifié côté serveur (RPC/EF SECURITY DEFINER).
            Jamais uniquement côté client. Jamais dans le JavaScript bundle.

INV-V2-09 : Toute table avec données comportementales = mentionnée dans CGU
            avant le déploiement. Jamais après.

INV-V2-10 : owner_plate reste le pivot de trust et de continuité véhicule.
            vehicle_trust_scores.owner_plate = PK. Ne jamais migrer vers user_id.

INV-V2-11 : Les fonctionnalités premium sont vérifiées côté serveur via is_premium().
            Un utilisateur qui supprime son compte perd accès au premium immédiatement.

INV-V2-12 : Toute position publique d'un utilisateur stationnaire = floue (≥ 200m).
            parking_sessions.is_shared = true → position approximative uniquement.
```

---

## SECTION 16 — ARBRE DE DÉCISION — PROCHAINE PHASE

```
VALIDATION TERRAIN V1 RÉUSSIE (0 ❌ critiques TEST_RESULTS.md)
  │
  ├─── Sprint 8 obligatoire (indépendant des modules futurs)
  │       ├── delete_audit_log (RGPD — traçabilité effacements)
  │       ├── Promise.allSettled() push (résilience multi-devices)
  │       └── Ouverture bêta fermée (10-20 utilisateurs)
  │
  ├─── Décision Module Véhicule [Sprint 9]
  │       Conditions : bucket vehicle-avatars configuré
  │                   RLS vehicles rédigée
  │                   delete-account étendu à vehicles
  │       → OUI → Sprint 9 (vehicles + public_vehicles)
  │       → NON → Reporter Sprint 10
  │
  ├─── Décision Module Maintenance [Sprint 10]
  │       Conditions : Cron Supabase activé
  │                   bucket maintenance-docs privé
  │                   delete-account étendu à maintenance_*
  │       → OUI → Sprint 10 (reminders + history + EF cron)
  │       → NON → Reporter Sprint 11
  │
  ├─── Décision Module Assistance [Sprint 11]
  │       Conditions : Décision RGPD anonymisation (voir Section 4.6)
  │                   Realtime validé en V1 (TEST_RESULTS.md)
  │                   Fuzzy position implémentée
  │       → OUI → Sprint 11 (assistance_requests + matching)
  │       → NON → Module Stationnement en priorité
  │
  ├─── Décision Monétisation [Sprint 13]
  │       Conditions : DPO consulté
  │                   Conseil légal facturation vs RGPD
  │                   CGU mise à jour (premium, remboursements)
  │       → OUI → Sprint 13 (user_subscriptions + is_premium)
  │       → NON → Reporter jusqu'à DPO disponible
  │
  └─── Décision Module Professionnels [Sprint 14]
          Conditions : API SIRET disponible (INSEE ou Pappers)
                      Décision légale auto-entrepreneur
                      CGU professionnels rédigées
          → OUI → Sprint 14 (professional_profiles)
          → NON → Reporter Sprint 15
```

---

## SECTION 17 — DÉCISION GO / NO-GO PAR MODULE

À compléter par le fondateur après validation terrain V1.

| Module | Décision | Date | Conditions remplies | Sprint cible |
|--------|----------|------|--------------------|-----------:|
| delete_audit_log | ⬜ | — | Validation terrain V1 | 8 |
| Bêta fermée | ⬜ | — | 0 ❌ critiques | 8 |
| Véhicule | ⬜ | — | Bucket + RLS + delete | 9 |
| Maintenance | ⬜ | — | Cron + bucket privé | 10 |
| Stationnement temporaire | ⬜ | — | Décision user_locations | 11 |
| Assistance Routière | ⬜ | — | Décision RGPD anon. | 11 |
| Communauté / Badges | ⬜ | — | CGU badges | 12 |
| Monétisation | ⬜ | — | DPO + légal | 13 |
| Professionnels | ⬜ | — | SIRET + légal | 14 |
| ANGE mémoire | ⬜ | — | DPO + opt-in UI | 15 |
| Stationnement longue durée | ⬜ | — | Décision vie privée | 16 |

---

*PRODUCT_ARCHITECTURE_V2 — ImmatConnect Pro*
*Référence : MASTER_COMPATIBILITY_MAP.md v1.3 — GEL DOCUMENTAIRE FINAL (commit cbef7de)*
*Ce document complète le MASTER_COMPATIBILITY_MAP — il ne le remplace pas.*
*Toute évolution de ce document nécessite un élément produit réel justificatif.*
