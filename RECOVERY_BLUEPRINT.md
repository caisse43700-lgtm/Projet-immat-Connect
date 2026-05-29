# RECOVERY BLUEPRINT — ImmatConnect
> Document de transmission complet. Si tout est cassé, lis ça en premier.

---

## 1. RESTAURATION D'URGENCE

```bash
git checkout -b restauration-urgence immatrestore
node tests.js  # doit retourner 162 ✅
```

SHA de référence : `366332188bc9bfedbdd7afa5d7511ec6ba62b5aa`
Voir détails : `docs/project-brain/RESTORE_PROTOCOL.md`

---

## 2. VISION PRODUIT

ImmatConnect est une PWA mobile (iOS/Android) permettant à des conducteurs anonymes de communiquer entre eux via leur plaque d'immatriculation.

**Problème résolu :**
> "Mon pneu est à plat, comment prévenir le conducteur devant moi ?"
> "Je veux signaler un obstacle sur la route aux conducteurs derrière moi."

**Principes fondateurs :**
- Anonymat absolu (jamais de numéro de téléphone exposé)
- Communication contextuelle (uniquement entre conducteurs proches)
- Interactions non-bloquantes (l'app ne prend jamais le contrôle)

---

## 3. WHY MODEL

| Couche | Contenu |
|--------|---------|
| **Pourquoi** | Permettre aux conducteurs de s'entraider sans exposer leur identité |
| **Comment** | Via la plaque d'immatriculation comme identifiant anonyme |
| **Quoi** | Messages, signalements route, demandes de contact |

---

## 4. ORGANISATION GIT

```
immatrestore   ← COFFRE-FORT — jamais modifié
main           ← PRODUCTION — version réelle
immatv2        ← LABORATOIRE — expérimentation architecture
```

Règles complètes : `docs/project-brain/BRANCH_STRATEGY.md`

---

## 5. ARCHITECTURE HIÉRARCHIQUE

```
SAGESSE         — Vision, éthique, raison d'être
INTENTION       — Objectif produit
CONSCIENCE      — Connaissance du contexte
MISSION         — Ce qu'on construit aujourd'hui
ADN             — CONSTITUTION.md + Invariants
PROJECTBRAIN    — Gouvernance du dépôt et des versions
IMMATORGANISM   — Organisme logiciel de l'application
IMMATBRAIN      — Cerveau métier (règles, gardes)
IMMATBUS        — Canal de communication interne
ORGANES         — Modules fonctionnels (messages, appels, alertes)
SENS            — Capteurs (GPS, Realtime, réseau)
MÉMOIRE         — localStorage, Supabase, State
UI/UX           — Interface utilisateur
TESTS           — Validation continue
ÉVOLUTION       — Roadmap et phases
```

**Distinctions critiques :**
- **ProjectBrain** = gouverne le dépôt et les versions
- **ImmatOrganism** = organisme logiciel de l'application
- **ImmatBrain** = cerveau des règles métier de l'application

---

## 6. CONSTITUTION ET INVARIANTS

Le fichier `CONSTITUTION.md` est la source de vérité des règles.
Ne jamais dupliquer son contenu ici — toujours y référencer.

**Invariants critiques (résumé) :**

| ID | Règle |
|----|-------|
| INV-001 | Véhicule ne crée jamais de marqueur carte |
| INV-002 | Données véhicule = messages uniquement |
| INV-003 | Route/Aide = reports, jamais messages |
| INV-004 | Activité = vue dérivée, ne produit rien |
| INV-005 | Badge = contenu réel (jamais fictif) |
| INV-007 | Appel uniquement via Contacter contextualisé |
| INV-009 | Demande d'appel ≠ appel (acceptation requise) |
| INV-010 | Aucun numéro de téléphone exposé |
| INV-014 | L'IA ne décide jamais seule |

---

## 7. USER LAWS (lois utilisateur validées)

```
LOI-ROUTE-01  Tout signalement route est une donnée partagée, jamais privée
LOI-ROUTE-02  La carte est un miroir de la base — jamais une source locale
LOI-ROUTE-03  Un badge ne peut pas mentir par excès ni par défaut
LOI-ROUTE-04  La suppression est atomique et globale
LOI-ROUTE-05  Le canal Activité est une vue — pas de suppression propre

LOI-CONTACT-01 Tout signalement route d'un tiers ouvre le droit au contact

LOI-MSG-01    Un message ne peut pas disparaître sans action humaine
LOI-MSG-02    La suppression requiert un geste délibéré (swipe + tap)
LOI-MSG-03    Les onglets Envoyés/Reçus sont des archives, pas des corbeilles
```

---

## 8. ARCHITECTURE TECHNIQUE

### Stack
- **Frontend :** HTML/CSS/JS vanilla — PWA (manifest + service worker)
- **Backend :** Supabase (PostgreSQL + Realtime + Auth + RPC)
- **Déploiement :** GitHub Pages

### Fichiers clés

| Fichier | Rôle | Lignes |
|---------|------|--------|
| `index.html` | Monolithe principal (app + logique inline) | 1868 |
| `messages.js` | Module messages (threads, swipe) | 672 |
| `calls.js` | Module appels/contact | 343 |
| `app.css` | Styles principaux | 926 |
| `messages.css` | Styles messages | 528 |
| `calls.css` | Styles appels | 313 |
| `service-worker.js` | Cache PWA (v4) | 15 |
| `utils.js` | Utilitaires partagés | 62 |
| `tests.js` | Suite de 162 tests Node.js | 1656 |
| `core/invariants.js` | 14 invariants fondateurs | 104 |
| `core/bus.js` | ImmatBus événements | 70 |
| `core/brain.js` | ImmatBrain logique garde | ~120 |
| `core/governance.js` | Phases 1→5 + prérequis | 44 |
| `core/immatOrganism.js` | Façade ImmatOrganism | ~98 |

### Base de données Supabase

| Table | Usage |
|-------|-------|
| `reports` | Signalements route + aide (status: active/resolved) |
| `messages` | Messages entre conducteurs |
| `profiles` | Profils (owner_plate, prefs) |
| `call_requests` | Demandes de contact |
| `call_preferences` | Préférences d'appel |

**Canal Realtime :** `ic_community_live`
- `postgres_changes` INSERT/UPDATE sur `reports`
- Broadcast : `new_report`, `resolve_report`, `vehicle_alert`

**RPC sécurisée :** `can_receive_calls(target_uid)` — SECURITY DEFINER

### Ordre de chargement des scripts
```
utils.js → [code inline index.html] → calls.js → messages.js
→ core/invariants.js → core/bus.js → core/brain.js
→ core/governance.js → core/immatOrganism.js
```

---

## 9. IMMATORGANISM V1 — ÉTAT ACTUEL

**Phase active :** Phase 1 — Observateur

**Ce qui est implémenté :**
- `core/invariants.js` — 14 invariants `_deepFreeze`
- `core/bus.js` — ImmatBus (emit/on/off/journal 200 entrées)
- `core/brain.js` — ImmatBrain (canDisplayVehicleOnMap, canRequestCall, computeBadge, classifyEntity)
- `core/governance.js` — phases 1→5 avec prérequis
- `core/immatOrganism.js` — façade d'orchestration

**Ce qui n'est PAS encore branché :**
L'ImmatOrganism observe mais n'est pas encore connecté au code de `index.html`. C'est le travail de `immatv2` : extraire les organes du monolithe et les brancher sur ImmatBus.

**Prochaine phase :** Phase 2 — Conseiller
- Prérequis : `journal_ok`, `no_regressions`
- Action : brancher `ImmatOrganism.observe()` sur les vraies actions de l'app

---

## 10. LOIS PROJECTBRAIN

```
PROJECT-BRAIN-001  Toute évolution majeure est supervisée par ProjectBrain
PROJECT-BRAIN-002  ProjectBrain connaît l'état des 3 branches + différences
PROJECT-BRAIN-003  Toute IA/dev consulte Constitution + ProjectBrain avant modification majeure
PROJECT-BRAIN-004  Aucune expérimentation immatv2 ne met main en danger
PROJECT-BRAIN-005  Aucune fusion main ↔ immatv2 automatique
PROJECT-BRAIN-006  Toute bascule de branche précédée d'une sauvegarde
```

---

## 11. PROCÉDURES STANDARD

### Bascule vers main
```bash
git add -A && git commit -m "checkpoint-immatv2-$(date +%Y-%m-%d-%H%M)-description"
git checkout main && git pull origin main
```

### Bascule vers immatv2
```bash
git add -A && git commit -m "checkpoint-main-$(date +%Y-%m-%d-%H%M)-description"
git checkout immatv2
```

### Avant toute migration SQL
```
1. Décrire la modification
2. Identifier tables + fonctions impactées
3. Évaluer risques RLS et perte de données
4. Tester sur immatv2 seulement
5. Validation humaine → alors seulement appliquer sur main
```

---

## 12. ÉTAT TECHNIQUE AU 29 MAI 2026

| Composant | État |
|-----------|------|
| Tests | 162 ✅ / 0 ❌ |
| main SHA | `3663321` |
| immatrestore SHA | `3663321` (identique) |
| immatv2 SHA | `3663321` (identique au démarrage) |
| SW version | `immatconnect-pro-v4` |
| ImmatOrganism | Phase 1 Observateur (non branché) |
| Supabase | Un seul projet (partagé main + immatv2) |
