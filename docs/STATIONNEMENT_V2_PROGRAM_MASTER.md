# STATIONNEMENT V2 — DOCUMENT MAÎTRE DE CONTINUITÉ

> **Document de référence unique pour le module Stationnement V2.**
> Toute IA ou développeur reprenant ce chantier doit lire ce fichier en premier.
> Hiérarchie : PROJECT_STATE.md → SESSION-CONTINUATION.md → ce fichier.

**Date de création :** 2026-06-14
**Statut :** DOCUMENTÉ / ARCHITECTURÉ — NON CODÉ
**Priorité :** V2 — après stabilisation GO LIVE V1

---

## 1. STATUT OFFICIEL DU MODULE

| Item | État |
|------|------|
| Code actif | ❌ Aucun |
| Migration active | ❌ Aucune |
| Table en production | ❌ Aucune |
| PR active | ❌ Aucune |
| Branche dédiée | ❌ Non créée |
| Déploiement production | ❌ Aucun |
| Impact utilisateur actuel | ❌ Zéro |

**Conclusion officielle :**
> Stationnement = DOCUMENTÉ / ARCHITECTURÉ / V2, mais **NON CODÉ** dans le code actif.
>
> Ne plus considérer ce module comme "déjà fait" tant qu'aucun commit, PR, migration ou fichier réel ne le prouve.

---

## 2. POURQUOI CE DOCUMENT EXISTE

Ce document évite de répéter le problème rencontré :
- souvenir que le module avait été "fait"
- impossibilité de retrouver la preuve en code
- confusion entre documentation, architecture et implémentation réelle
- perte de continuité entre IA / sessions / PR

Ce document permet à Claude, ChatGPT, toute autre IA ou développeur humain de reprendre le chantier dans plusieurs semaines sans perdre le contexte.

---

## 3. LEÇONS APPRISES DES BUGS RÉCENTS

### A. Bug Activité / drawer (PRs #305–#312+)

**Constat :**
- Plusieurs PRs successives nécessaires (cache Safari, translateY, height, panel switch, scrollTop)
- Le cache Safari a fait croire que certains fixes ne fonctionnaient pas
- La sheet s'ouvrait mal → puis s'ouvrait mais contenu vide → puis contenu masqué par scrollTop

**Décisions pour Stationnement :**
- Feature flag obligatoire
- APP_BUILD visible à chaque PR
- Diagnostics runtime possibles (console.log, toast temporaire)
- Ne jamais corriger plusieurs couches en même temps
- Distinguer : cache / CSS / DOM / JS / données / scroll

### B. Bug session multi-comptes A/B

**Constat :**
- Un compte A pouvait polluer l'état du compte B sur le même téléphone
- `S.uid`, `S.profile`, localStorage/sessionStorage peuvent rester incohérents

**Décisions Stationnement :**
- Ne jamais dépendre uniquement de l'état mémoire
- Source de vérité = DB
- Tests A/B obligatoires
- Nettoyage à logout/login
- Aucun stationnement ne doit se transférer d'un compte à l'autre

### C. Bug carte / user_locations

**Constat :**
- Position live et position mémorisée ont été confondues
- `user_locations` sert à la présence temps réel, pas au stockage

**Décisions :**
- Interdiction d'utiliser `user_locations` comme stockage stationnement
- Créer une table dédiée
- Ne jamais mélanger `loadOthers()` et stationnement privé

### D. Bug cache Safari / Service Worker

**Constat :**
- iOS Safari peut servir une ancienne version malgré SW update
- Il faut savoir exactement quel build tourne avant de diagnostiquer

**Décisions :**
- Toute PR de stationnement doit afficher/mettre à jour APP_BUILD
- Tester avec cache-buster (tuer Safari complètement)
- Ne jamais conclure avant preuve du build actif

### E. Bug Activité vide (contenu DOM présent mais invisible)

**Constat :**
- Un composant peut être présent dans le DOM mais invisible (display:none inline, scrollTop résiduel)
- Un bouton nav peut passer actif sans que le contenu se rende

**Décisions :**
- Tout ajout UI doit être validé par : DOM présent / CSS visible / handler appelé / contenu rendu / état vide affiché
- Réinitialiser `scrollTop = 0` à chaque changement de panel

---

## 4. DÉFINITION PRODUIT

### But du module
Permettre à l'utilisateur d'enregistrer l'endroit où il a laissé son véhicule, puis de le retrouver plus tard.

### Questions auxquelles répond le module
- Où ai-je laissé ma voiture ?
- Depuis quand est-elle stationnée ?
- Comment y retourner ?
- Puis-je supprimer cette position ?

### Ce module N'EST PAS
- Un système de parkings publics
- Un système de places disponibles
- Un partage communautaire
- Une fonctionnalité visible par les autres conducteurs
- Un signalement route
- Une localisation live

### Différence obligatoire

| Concept | Technologie | Visibilité |
|---------|-------------|------------|
| Parking public | POI / Nominatim / OSM | Tous |
| Stationnement privé | `vehicle_parking_status` DB | Moi seul |

---

## 5. ARCHITECTURE VALIDÉE

### Principe central

```
user_locations          = position live / présence temps réel
vehicle_parking_status  = position privée mémorisée
```

### Interdictions absolues

- ❌ Ne pas écrire dans `user_locations`
- ❌ Ne pas lire depuis `user_locations` pour retrouver le stationnement
- ❌ Ne pas ajouter de colonne parking dans `profiles`
- ❌ Ne pas exposer via `public_profiles`
- ❌ Ne pas mélanger avec `loadOthers()`
- ❌ Ne pas utiliser Realtime en Phase 1

---

## 6. BRANCHE ET STRATÉGIE DE DÉVELOPPEMENT

### Branche dédiée
```
feature/v2-stationnement
```

### Règles de branche
- Aucune PR vers `main` tant que le GO LIVE V1 n'est pas stabilisé
- Aucun merge automatique
- Aucun impact production
- Feature flag OFF par défaut
- Chaque phase validée séparément

### Conditions de blocage vers main
Le module ne peut pas merger tant que :
- Activité n'est pas corrigée et validée terrain
- Pastilles messages non validées
- Carte A/B non validée
- REVOKE Supabase non exécuté
- `delete-account` / `export-user-data` non mis à jour pour la nouvelle table

---

## 7. FEATURE FLAG

```js
const FEATURE_PARKING_V2 = false;
```

### Règles
- OFF par défaut
- Aucune UI visible si OFF
- Aucune erreur si table absente
- Aucun appel DB si OFF
- Activable uniquement sur branche de test

Le module doit être codable sans être visible en production.

---

## 8. FICHIERS À CRÉER

| Fichier | Phase |
|---------|-------|
| `docs/STATIONNEMENT_V2_PROGRAM_MASTER.md` | 0 — ✅ Ce fichier |
| `docs/STATIONNEMENT_V2_TEST_PLAN.md` | 0 |
| `docs/STATIONNEMENT_V2_SECURITY_AUDIT.md` | 0 |
| `supabase/migrations/YYYYMMDD_vehicle_parking_status.sql` | 1 |
| `parking.js` (si séparation possible) | 2 |
| Section isolée dans `index.html` (sinon) | 2 |

---

## 9. FICHIERS À NE PAS TOUCHER EN PHASE 0/1

- `profiles` / `public_profiles`
- `user_locations`
- `messages` / `messages.js`
- `calls.js`
- Edge Functions existantes
- Service Worker (sauf build/flag nécessaire)
- RLS existantes (hors nouvelle table)

**Objectif : zéro régression sur le cœur V1.**

---

## 10. CONVENTIONS DE NOMMAGE

### Table
```
vehicle_parking_status
```

### Feature flag
```js
FEATURE_PARKING_V2
```

### Fonctions JS
```js
markVehicleParked()
loadMyParkedVehicle()
clearVehicleParked()
renderParkedVehicleMarker()
removeParkedVehicleMarker()
syncPendingParking()
getParkingStatus()
```

### LocalStorage
```
ic_parking_pending
ic_parking_last
ic_parking_sync_error
```

### Classes CSS
```css
.parking-card
.parking-marker
.parking-actions
.parking-empty
.parking-error
```

---

## 11. SCHÉMA SQL PROPOSÉ

```sql
CREATE TABLE vehicle_parking_status (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_plate  text NOT NULL,
  latitude     double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude    double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy     double precision CHECK (accuracy >= 0),
  parked_at    timestamptz NOT NULL DEFAULT now(),
  cleared_at   timestamptz,
  note         text,
  source       text DEFAULT 'manual' CHECK (source IN ('manual','gps','offline_sync')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Un seul stationnement actif par utilisateur
CREATE UNIQUE INDEX idx_parking_one_active
  ON vehicle_parking_status (user_id)
  WHERE cleared_at IS NULL;

-- Index de performance
CREATE INDEX idx_vehicle_parking_user_id    ON vehicle_parking_status (user_id);
CREATE INDEX idx_vehicle_parking_owner_plate ON vehicle_parking_status (owner_plate);
CREATE INDEX idx_vehicle_parking_updated_at  ON vehicle_parking_status (updated_at);

ALTER TABLE vehicle_parking_status ENABLE ROW LEVEL SECURITY;
```

---

## 12. RLS (ROW LEVEL SECURITY)

```sql
-- SELECT : uniquement ses propres lignes
CREATE POLICY "parking_select_own" ON vehicle_parking_status
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT : uniquement pour soi-même
CREATE POLICY "parking_insert_own" ON vehicle_parking_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE : uniquement ses propres lignes
CREATE POLICY "parking_update_own" ON vehicle_parking_status
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : uniquement ses propres lignes
CREATE POLICY "parking_delete_own" ON vehicle_parking_status
  FOR DELETE USING (auth.uid() = user_id);
```

**Anon :** aucun accès.
**Service role :** uniquement pour delete/export si nécessaire.

---

## 13. TESTS SQL À PRÉVOIR

```sql
-- Vérifier que la table existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'vehicle_parking_status';

-- Vérifier RLS activé
SELECT relrowsecurity FROM pg_class WHERE relname = 'vehicle_parking_status';

-- Vérifier les policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'vehicle_parking_status';

-- Vérifier les index
SELECT indexname FROM pg_indexes
WHERE tablename = 'vehicle_parking_status';

-- Vérifier contrainte active unique
SELECT indexdef FROM pg_indexes
WHERE tablename = 'vehicle_parking_status' AND indexname LIKE '%active%';

-- Vérifier isolation utilisateur (à exécuter en tant qu'utilisateur B)
SELECT COUNT(*) FROM vehicle_parking_status; -- doit retourner 0 si aucune ligne de B

-- Vérifier qu'on ne peut pas écrire pour un autre user_id
INSERT INTO vehicle_parking_status (user_id, owner_plate, latitude, longitude)
VALUES ('<autre_user_id>', 'AB-123-CD', 48.8, 2.3); -- doit échouer (RLS)

-- Vérifier qu'un ancien stationnement est remplacé
-- (via contrainte partial unique sur cleared_at IS NULL)
```

---

## 14. SÉCURITÉ — MATRICE DES ATTAQUES

| # | Attaque | Vecteur | Protection | Test |
|---|---------|---------|------------|------|
| 1 | Spoof user_id | INSERT avec user_id d'autrui | RLS WITH CHECK | SQL ci-dessus |
| 2 | Lecture autre stationnement | SELECT direct | RLS USING | Test B lit données A |
| 3 | Énumération REST | GET /vehicle_parking_status | RLS + anon bloqué | Postman anon |
| 4 | Accès anon | Clé anon | Pas de policy anon | Curl sans auth |
| 5 | Lecture par plaque | SELECT WHERE owner_plate = '...' | RLS = user_id | Test isolation |
| 6 | Modification autre user | UPDATE avec user_id cible | RLS USING | SQL INSERT autre |
| 7 | Suppression autre user | DELETE autre ligne | RLS USING | SQL DELETE autre |
| 8 | JWT expiré | Token périmé | Supabase auth | Tester expiry |
| 9 | Multi-compte A/B pollué | localStorage partagé | Nettoyage logout | Test switch compte |
| 10 | Offline replay | ic_parking_pending replay | timestamp + dedup | Test double sync |
| 11 | Injection note | Champ `note` | Sanitize côté JS | Input XSS test |
| 12 | Données GPS invalides | lat/lng hors bornes | CHECK constraint | INSERT lat=999 |
| 13 | Accès via RPC future | Fonction non RLS-aware | Vérifier user_id dans RPC | Audit RPC |
| 14 | Fuite export autre compte | export-user-data | Filtrer par user_id | Test export B |
| 15 | Fuite logs console | console.log lat/lng | Ne pas logger coordonnées | Code review |

---

## 15. RGPD

**La position de stationnement est une donnée personnelle sensible (localisation précise).**

### Obligations
- ✅ Inclure dans `export-user-data`
- ✅ Supprimer dans `delete-account`
- ✅ Permettre suppression manuelle depuis l'app
- ✅ Ne jamais rendre public
- ✅ Ne jamais exposer par plaque
- ✅ Prévoir TTL ou politique de rétention
- ✅ Documenter la durée de conservation
- ❌ Ne pas envoyer à ANGE
- ❌ Ne pas utiliser pour entraînement IA
- ❌ Ne pas logger latitude/longitude publiquement

### TTL recommandé
**90 jours** — ou suppression manuelle uniquement avec rappel.

**Décision à prendre avant merge** : TTL automatique vs suppression manuelle.

---

## 16. DELETE ACCOUNT — OBLIGATION BLOQUANTE

Le module ne peut pas être mergé tant que `delete-account` (Edge Function) ne purge pas `vehicle_parking_status`.

```sql
-- Dans delete-account Edge Function
DELETE FROM vehicle_parking_status WHERE user_id = $user_id;
```

**Test obligatoire :**
1. Créer un stationnement
2. Exécuter delete account
3. Vérifier `SELECT COUNT(*) FROM vehicle_parking_status WHERE user_id = $uid` = 0

---

## 17. EXPORT USER DATA — OBLIGATION BLOQUANTE

Le module ne peut pas être mergé tant que `export-user-data` n'exporte pas :
- stationnement actif
- historique si conservé
- `parked_at`, `cleared_at`, `note`, coordonnées

**Test obligatoire :**
1. Créer un stationnement
2. Exécuter export
3. Vérifier présence dans le JSON exporté

---

## 18. OFFLINE

### Phase 1 : Online only (recommandé)

Si offline → toast :
```
Connexion requise pour enregistrer le stationnement.
```

### Phase 2 (future) : Pending sync possible

Si pending sync plus tard :
- Stocker dans `ic_parking_pending`
- Synchroniser au retour réseau
- Conflit : dernier timestamp gagne
- Afficher état "en attente de synchronisation"

**Ne pas implémenter offline en Phase 1 pour éviter dette technique.**

---

## 19. INTÉGRATION CARTE

### Marqueur
```
🅿️
```

### Règles du marqueur
- Visible uniquement par le propriétaire
- Jamais envoyé aux autres conducteurs
- Jamais dans `loadOthers()`
- Jamais dans `nearbyList`
- Jamais dans `public_profiles`
- Rechargé à `openMap()`
- Supprimé visuellement à `clearVehicleParked()`

### Variables d'état à prévoir
```js
S.parkedMarker   // référence Leaflet marker
S.parkedVehicle  // objet stationnement actif
```

### Nettoyage obligatoire
- À logout
- À changement de compte
- À `clearVehicleParked()`

---

## 20. INTÉGRATION MODE INVISIBLE

**Décision :** Le mode invisible masque la présence publique, pas le stationnement privé.

- ✅ Autoriser stationnement en mode invisible
- ❌ Ne pas écrire dans `user_locations`
- ❌ Ne pas rendre public

Message éventuel :
```
Stationnement privé enregistré — même en mode invisible.
```

---

## 21. INTÉGRATION ACTIVITÉ

**Décision Phase 1 :** Ne pas intégrer à Activité.

**Raison :** Activité est actuellement instable (bugs en cours de correction).

Stationnement doit rester accessible via : carte / profil / bouton dédié.

**Phase future :** Ajouter historique stationnement dans Activité seulement quand Activité est stable et validée terrain.

---

## 22. INTÉGRATION MESSAGES / APPELS / PUSH

**Phase 1 : Aucune intégration.**

- ❌ Pas de message automatique
- ❌ Pas d'appel
- ❌ Pas de push
- ❌ Pas de notification communautaire

**Raison :** stationnement privé uniquement.

---

## 23. UX MVP

### Boutons
```
📍  Stationner mon véhicule
🅿️  Retrouver mon véhicule
🗑️  Supprimer le stationnement   (confirmation obligatoire)
```

### États et messages

| Situation | Message |
|-----------|---------|
| Aucun stationnement | Aucun stationnement enregistré. |
| Stationnement actif | Véhicule stationné depuis X min |
| GPS refusé | Active la localisation pour enregistrer le stationnement. |
| Erreur DB | Impossible d'enregistrer pour le moment. |
| Session expirée | Reconnecte-toi pour enregistrer ton stationnement. |
| Suppression | Confirmation : Supprimer ce stationnement ? |

---

## 24. UX FUTURE

| Version | Fonctionnalité |
|---------|----------------|
| V2.1 | Navigation vers véhicule (itinéraire) |
| V2.2 | Photo du lieu |
| V2.3 | Note personnelle |
| V2.4 | Rappel horodateur / disque de stationnement |
| V2.5 | Historique des stationnements |
| V2.6 | Partage temporaire avec un proche |
| V2.7 | Stationnement communautaire (si RGPD validé) |

---

## 25. ROADMAP DÉTAILLÉE

### Phase 0 — Documentation
**Livrables :** document maître, plan de tests, security audit
**GO :** documentation complète et sans ambiguïté
**NO-GO :** ambiguïtés sur RGPD ou architecture

### Phase 1 — DB / RLS
**Livrables :** migration SQL, table, policies, tests SQL
**GO :** RLS validé, aucune fuite inter-utilisateurs
**NO-GO :** fuite d'un autre utilisateur

### Phase 2 — JS interne (feature flag OFF)
**Livrables :** `mark/load/clear`, catch erreurs, feature flag
**GO :** aucune erreur si flag OFF, aucun impact carte
**NO-GO :** impact carte, auth ou messages existants

### Phase 3 — UI privée
**Livrables :** boutons, états vides, toasts
**GO :** UX claire, état vide affiché
**NO-GO :** confusion avec Parking public

### Phase 4 — Carte privée
**Livrables :** marqueur 🅿️, cleanup, reload
**GO :** marqueur persist après reload, invisible depuis autre compte
**NO-GO :** visible par autre compte

### Phase 5 — RGPD (BLOQUANT)
**Livrables :** `delete-account` mis à jour, `export-user-data` mis à jour
**GO :** tests count=0 après delete OK, JSON export OK
**NO-GO :** donnée restante après suppression compte

### Phase 6 — Offline (optionnel)
**Livrables :** pending sync si décidé
**GO :** sync fiable, pas de doublon
**NO-GO :** doublons / conflit non géré

### Phase 7 — Navigation
**Livrables :** itinéraire vers véhicule (OSRM ou autre)
**GO :** itinéraire fonctionne
**NO-GO :** dépendance OSRM non maîtrisée

---

## 26. GO / NO-GO GLOBAL

### GO uniquement si
- ✅ RLS OK (isolation inter-utilisateurs prouvée)
- ✅ `delete-account` purge la table
- ✅ `export-user-data` inclut la table
- ✅ Marqueur privé (invisible depuis autre compte)
- ✅ Tests A/B isolation OK
- ✅ Feature flag OK (aucune UI si OFF)
- ✅ Aucun impact carte existante
- ✅ Aucun impact messages / appels
- ✅ Tests terrain OK (kill Safari, build prouvé)

### NO-GO si
- ❌ Fuite latitude/longitude
- ❌ Accès possible depuis un autre utilisateur
- ❌ Stationnement visible publiquement
- ❌ Dépendance `user_locations`
- ❌ Absence rollback
- ❌ Absence tests RLS

---

## 27. NON-RÉGRESSION

Tester après chaque PR stationnement :

- Auth (login / logout / signup)
- Profil
- Carte A/B (deux comptes simultanés)
- Messages
- Appels
- Activité
- Push notifications
- Realtime (positions des autres)
- `user_locations` (non modifié)
- `profiles` / `public_profiles` (non modifiés)
- `delete-account`
- `export-user-data`

---

## 28. ROLLBACK

| Niveau | Action |
|--------|--------|
| 1 | `FEATURE_PARKING_V2 = false` → UI disparaît |
| 2 | Masquer tous les éléments UI parking |
| 3 | Désactiver fonctions JS (return early si flag OFF) |
| 4 | Rollback migration (si pas encore en prod) |
| 5 | `DROP TABLE vehicle_parking_status` — **seulement si aucune donnée utilisateur réelle** |

**Aucune dépendance critique ne doit empêcher le rollback.**

---

## 29. CHECKLIST PR STATIONNEMENT

Chaque PR doit indiquer :

```
## Scope
- Fichiers modifiés :
- Scope exact :

## Tests
- Tests faits :
- Tests non faits (et pourquoi) :

## Risques
- Risques identifiés :
- Rollback possible : oui / non

## Impact
- Impact RGPD :
- Impact Supabase :
- Impact carte :
- Impact auth :
- Impact messages/appels :
```

### Interdit
- PR mélangeant stationnement + bug Activité
- PR mélangeant stationnement + messages
- PR mélangeant stationnement + REVOKE Supabase
- PR sans test RLS

---

## 30. FORMAT DE COMPTE RENDU CLAUDE

À chaque étape, Claude doit répondre :

1. Ce qui a été fait
2. Fichiers modifiés
3. Pourquoi
4. Risques
5. Tests réalisés
6. Tests impossibles
7. Prochaine action
8. Point exact de reprise si interruption

---

## 31. JOURNAL DES DÉCISIONS

| Date | Décision |
|------|----------|
| 2026-06-14 | Stationnement retrouvé comme documenté mais non codé |
| 2026-06-14 | Branche dédiée `feature/v2-stationnement` |
| 2026-06-14 | Feature flag OFF par défaut |
| 2026-06-14 | Pas d'intégration Activité en Phase 1 |
| 2026-06-14 | Pas de visibilité publique |
| 2026-06-14 | Interdiction d'utiliser `user_locations` |
| 2026-06-14 | Ne pas merger tant que GO LIVE V1 instable |
| 2026-06-14 | Online only en Phase 1 (pas d'offline sync) |
| 2026-06-14 | TTL 90 jours — décision à confirmer avant merge |

---

## 32. PIÈGES À NE PAS REPRODUIRE

- Croire qu'un module documenté est codé
- Corriger sans savoir quel build tourne
- Tester avec cache Safari ancien (tuer Safari complètement)
- Tester A/B avec session polluée (logout complet entre les deux comptes)
- Modifier plusieurs modules en même temps
- Oublier RLS
- Oublier `delete-account`
- Oublier `export-user-data`
- Confondre Parking public et Stationnement privé
- Confondre position live (`user_locations`) et position mémorisée (`vehicle_parking_status`)
- Ajouter un bouton sans état vide
- Ajouter une table sans rollback
- Ajouter une donnée sensible sans RGPD
- Ne pas réinitialiser `scrollTop` lors du changement de panel
- Corriger CSS + JS + données dans la même PR

---

## 33. PRIORITÉ ABSOLUE — NE PAS OUBLIER

La priorité immédiate du projet principal reste dans cet ordre :

1. **Activité** — bug panel / contenu (en cours)
2. **Pastilles messages** — non validées
3. **Carte A/B** — non validée
4. **REVOKE Supabase** — non exécuté
5. **B2–B5** — push, RGPD, messages BZ→BE, ANGE
6. **Stationnement V2** — seulement après

---

## 34. CONCLUSION

Le module Stationnement est un module V2 utile mais sensible.

**Il ne doit pas bloquer le GO LIVE V1.**

Il doit être développé :
- Isolément, sur branche dédiée
- Sous feature flag
- Avec RLS dès la première migration
- Avec RGPD (delete-account + export) avant tout merge vers main

**Ce document est la source de vérité unique pour ce module.**
Toute décision qui n'y figure pas doit y être ajoutée avant d'être implémentée.
