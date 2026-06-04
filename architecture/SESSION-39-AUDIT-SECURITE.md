# Amélioration Navigation Fonctionnalités

# SESSION 39 — Audit Sécurité Accès Code + Application
**Date :** 2026-06-03  
**Périmètre :** Dépôt GitHub · Frontend · Supabase · GitHub Pages · Secrets  
**Méthode :** Scan git history (365 commits) · analyse statique code · vérification API GitHub  

---

## AXE 1 — DÉPÔT GITHUB

### 1.1 Visibilité

```
private: false  →  DÉPÔT PUBLIC ⚠️
```

**Impact :** Tout le code est visible publiquement. L'URL Supabase, le project_ref, la clé anon, l'architecture complète sont accessibles à n'importe qui.

**Action requise : PASSER EN PRIVÉ**  
Settings → General → Danger Zone → Change repository visibility → Private

---

### 1.2 Forks

```
forks_count:   0       ✅  Aucun fork existant
allow_forking: true    ⚠️  N'importe qui peut forker
```

En passant le dépôt en privé, `allow_forking` devient automatiquement inopérant (on ne peut pas forker un dépôt privé sans accès).

---

### 1.3 Secrets commités dans git (365 commits scannés)

| Pattern scanné | Résultat |
|---|---|
| `service_role` key | ✅ Absent |
| `ANTHROPIC_API_KEY` valeur réelle | ✅ Absent |
| `sk-ant-*` | ✅ Absent |
| JWT hardcodé | ✅ Absent |
| Passwords en clair | ✅ Absent |
| Tokens privés | ✅ Absent |

**Aucun secret committé dans l'historique git.** ✅

---

### 1.4 Logs GitHub Actions

**Edge Function `immat-brain-dialog` — console.info :**
```typescript
console.info('[immat-brain-dialog] OK', {
  feature,         // nom de la fonctionnalité — non sensible
  mode,            // 'consultation' etc. — non sensible
  role: role ?? 'observer',  // 'conducteur' ou 'gardien' — non sensible
  depth,           // 1 ou 3 — non sensible
  historyLen,      // nombre de messages — non sensible
  hasProposal,     // boolean — non sensible
  fallback,        // boolean — non sensible
  timings,         // ms — non sensible
});
```

Aucun UID, email, plaque, message utilisateur, token dans les logs. ✅

**Logs frontend :** aucun `console.log/info` ne logue d'email, password, token, uid, téléphone. ✅

---

### 1.5 Branches présentes (8)

| Branche | Statut |
|---|---|
| `main` | Production |
| `claude/immatconnect-pro-app-dEKGR` | Notre branche de travail |
| `claude/audit-v6-improvements` | Ancienne branche audit |
| `claude/github-pages-deploy` | Ancienne branche deploy |
| `claude/v9-architecture` | Ancienne branche architecture |
| `immatrestore` | Branche de sauvegarde |
| `immatv2` | Ancienne version |
| `worktree-agent-a32150a443e797d84` | **⚠️ Worktree abandonné — à supprimer** |

**Action recommandée :** Supprimer `worktree-agent-a32150a443e797d84` (worktree abandonné, public, inutile).

---

## AXE 2 — FRONTEND

### 2.1 Scan de tous les fichiers (index.html, messages.js, ui.js, calls.js, badge.js, utils.js, core/*.js)

| Fichier | service_role | ANTHROPIC_API_KEY | Token privé | Verdict |
|---|---|---|---|---|
| index.html | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| messages.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| ui.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| calls.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| badge.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| utils.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |
| core/*.js | ✅ Absent | ✅ Absent | ✅ Absent | **CONFORME** |

### 2.2 Clé Supabase dans CFG

```javascript
const CFG = {
  url: 'https://vemgdkkbldgyvaisudkd.supabase.co',
  key: 'sb_publishable_4MiqXFtJgg20xm4KaxE_2Q_IsMdI6gJ',
  ...
};
```

**Analyse :**
- Préfixe `sb_publishable_` → clé **anon publique**, pas service_role ✅
- Cette clé est **conçue pour être dans le frontend** — c'est le pattern Supabase standard
- Elle donne uniquement accès aux données autorisées par les RLS policies
- **Sans RLS : risque réel.** Avec RLS strict : risque nul en pratique

**Verdict : CONFORME — sous condition de RLS strict sur toutes les tables.** ✅

---

## AXE 3 — SUPABASE

### 3.1 Auth dans l'Edge Function

```typescript
// JWT requis — 401 si absent/invalide
const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
);

const { data: { user }, error: authErr } = await sb.auth.getUser();
if (authErr || !user) {
  return Response.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
}
```

Tout appel sans JWT valide → 401 immédiat. ✅

### 3.2 Détermination du rôle gardien

```typescript
// Rôle lu depuis la DB — pas depuis le JWT (résistant au stale)
const { data: role } = await sb.rpc('get_my_role');
const isGardien = !roleErr && role === 'gardien';
```

**Conception sécurisée :**
- `get_my_role()` lit `raw_user_meta_data` directement en DB — contourne le cache JWT
- Si l'appel RPC échoue → `isGardien = false` (fallback conducteur sûr)
- Un conducteur **ne peut jamais simuler** le rôle gardien via un JWT modifié
- Retry automatique si erreur transitoire (cold start Supabase)

✅ **Conducteur impossible d'obtenir depth gardien** — enforcement côté serveur uniquement.

### 3.3 Séparation conducteur / gardien (6 axes — SESSION-36b)

```typescript
// Depth imposé côté serveur
const depth: 1 | 2 | 3 = role === 'gardien' ? 3 : 1;
const staticSystem = isGardien ? STATIC_SYSTEM_GARDIEN : STATIC_SYSTEM_CONDUCTEUR;

// Strippage actif avant retour
if (!isGardien) {
  delete result.route;       // jamais visible côté conducteur
  delete result.proposal;    // jamais visible
  delete result.invariants;  // jamais visible
  delete result.vigilance;   // jamais visible
}
```

✅ **Défense en profondeur** : profondeur + système + strippage output.

### 3.4 RLS (Row Level Security)

**Non vérifiable depuis le code** — les RLS policies sont définies dans le Supabase Dashboard, pas dans les fichiers committés.

**Tests RLS existants dans le projet** (`e2e/rls.spec.js`) :

| Test | Description | Statut |
|---|---|---|
| S01 | Compte A ne peut pas modifier le profil de B | Testable avec credentials |
| S02 | Compte A ne voit que ses propres messages | Testable avec credentials |
| S03 | Isolation localStorage entre deux comptes | Testable avec credentials |
| S04 | Pas de fuite de données après logout + reconnexion | Testable avec credentials |

**Action requise :** Vérifier dans le Supabase Dashboard que RLS est activé sur :
- `profiles` — modifier uniquement son propre profil
- `messages` — voir uniquement les messages impliquant sa plaque
- `reports` / `user_locations` — restreint par uid ou plaque
- `profiles.role` — **colonne non modifiable par l'utilisateur lui-même**

### 3.5 ANTHROPIC_API_KEY et secrets Edge Function

```typescript
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
// Utilisé uniquement côté serveur Supabase Edge — jamais retourné au client
```

- Jamais dans le code ✅
- Jamais loggée ✅
- Jamais retournée dans la réponse HTTP ✅
- Si absente → 500 `server_misconfigured` (pas d'exposition de la clé) ✅

---

## AXE 4 — GITHUB PAGES

### 4.1 État actuel

```
has_pages: true   →  Pages est configuré dans les settings GitHub
HTTP 403          →  "Host not in allowlist" — aucun contenu déployé
```

GitHub Pages est configuré mais aucun déploiement réussi. L'app n'est donc **pas publiquement accessible** actuellement.

### 4.2 Implications si activé

**Si GitHub Pages est activé et déployé :**
- L'app est accessible par n'importe qui ayant l'URL
- Le code source HTML/JS est téléchargeable publiquement (c'est un site statique)
- La clé anon (`sb_publishable`) serait visible — **mais c'est le cas déjà dans le dépôt public**
- Les utilisateurs peuvent s'inscrire et utiliser l'app (si l'inscription est ouverte)

**Conséquence :** GitHub Pages rend l'app utilisable par le public. Si l'objectif est une **beta fermée**, ne pas activer Pages ou protéger l'accès.

### 4.3 Recommandation spécifique Pages

**Ne pas activer GitHub Pages avant** de :
1. Passer le dépôt en privé
2. Confirmer que les RLS Supabase sont stricts
3. Décider si l'inscription est ouverte ou fermée (invitation only)

---

## AXE 5 — SECRETS

### 5.1 GitHub Secrets (référencés dans les workflows)

| Secret | Workflow | Usage | Niveau risque |
|---|---|---|---|
| `GITHUB_TOKEN` | Tous | Token automatique GitHub | Nul — standard |
| `SUPABASE_ACCESS_TOKEN` | deploy-edge-functions.yml | Déploiement CLI Supabase | Faible — CI only |
| `SUPABASE_URL` | e2e.yml | URL Supabase | Nul — déjà dans index.html |
| `SUPABASE_SERVICE_KEY` | e2e.yml | Reset données de test | **Moyen — voir §5.2** |
| `TEST_USER_A_EMAIL` | e2e.yml | Compte test | Faible — tests only |
| `TEST_USER_A_PASSWORD` | e2e.yml | Compte test | Faible — tests only |
| `TEST_USER_B_EMAIL` | e2e.yml | Compte test | Faible — tests only |
| `TEST_USER_B_PASSWORD` | e2e.yml | Compte test | Faible — tests only |

### 5.2 SUPABASE_SERVICE_KEY — analyse

Le `SUPABASE_SERVICE_KEY` est utilisé dans `e2e/helpers/reset.js` pour supprimer les données de test après chaque run CI :

```javascript
// reset.js — usage côté CI uniquement
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) return;  // Silencieux si non défini
// → Supprime uniquement les plaques ZZ-001-TT et ZZ-002-TT
```

**Points positifs :**
- Jamais utilisé dans le frontend ✅
- Jamais dans le code déployé ✅
- Scope limité : uniquement plages de test (`ZZ-001-TT`, `ZZ-002-TT`) ✅

**Point d'attention :**
- `reset.js` est du code public (dépôt public) → quiconque voit qu'une `service_role` key est utilisée dans les tests. La clé elle-même n'est pas exposée (elle est dans GitHub Secrets).
- Si le dépôt passe en privé, ce code devient invisible.

### 5.3 Résumé secrets

| Secret | Dans le code | Committé | Logué | Verdict |
|---|---|---|---|---|
| ANTHROPIC_API_KEY | `Deno.env.get()` uniquement | ✅ Non | ✅ Non | **CONFORME** |
| service_role / SUPABASE_SERVICE_KEY | Jamais dans frontend | ✅ Non | ✅ Non | **CONFORME** |
| sb_publishable (anon key) | CFG.key frontend | Dans index.html | N/A | **CONFORME** (clé publique) |
| Passwords utilisateurs | Jamais | ✅ Non | ✅ Non | **CONFORME** |

---

## SYNTHÈSE DES RISQUES

| # | Risque | Sévérité | Statut |
|---|---|---|---|
| R-SEC-01 | Dépôt public — code et architecture visibles | **ÉLEVÉ** | ⚠️ À corriger |
| R-SEC-02 | GitHub Pages non activé mais URL connue | Faible | ✅ Inactif |
| R-SEC-03 | allow_forking: true sur dépôt public | Moyen | ⚠️ Résolu si repo privé |
| R-SEC-04 | Branche worktree abandonnée publique | Faible | ⚠️ À supprimer |
| R-SEC-05 | RLS Supabase non vérifiable depuis le code | Moyen | ⚠️ Vérification Dashboard |
| R-SEC-06 | sb_publishable key dans index.html | Nul (clé publique) | ✅ Normal |
| R-SEC-07 | ANTHROPIC_API_KEY dans edge function | Nul (env.get) | ✅ Conforme |
| R-SEC-08 | service_role key dans le frontend | Nul (absent) | ✅ Conforme |
| R-SEC-09 | Données sensibles dans logs Actions | Nul | ✅ Conforme |
| R-SEC-10 | JWT stale → escalade rôle gardien | Nul (RPC DB) | ✅ Conforme |

---

## CORRECTIONS NÉCESSAIRES

### CRITIQUE — À faire maintenant

**C1 : Passer le dépôt en privé**  
`Settings → General → Danger Zone → Change repository visibility → Private`

Impact immédiat :
- Code source invisible
- allow_forking désactivé automatiquement
- reset.js avec pattern service_key invisible
- Branches archivées invisibles

---

### IMPORTANT — Avant activation Pages

**C2 : Vérifier RLS dans Supabase Dashboard**  
Confirmer que les tables `profiles`, `messages`, `reports`, `user_locations` ont RLS activé et des policies qui empêchent :
- Modification du profil d'un autre utilisateur
- Lecture des messages d'autres utilisateurs
- Modification de la colonne `role` dans `profiles`

**C3 : Supprimer la branche worktree abandonnée**  
```
git push origin --delete worktree-agent-a32150a443e797d84
```

---

### RECOMMANDÉ — Beta fermée

**C4 : Désactiver l'inscription ouverte dans Supabase**  
Si l'objectif est une beta fermée : désactiver les inscriptions publiques dans le Supabase Dashboard → Authentication → Providers → Email → Disable signups.  
Activer uniquement les invitations par email.

---

## RECOMMANDATION FINALE

### Option A — Repo privé + GitHub Pages public + auth stricte Supabase

**Fonctionnement :**
- Code invisible (dépôt privé) ✅
- App accessible via GitHub Pages (URL publique)
- Tout utilisateur peut accéder à l'URL
- Supabase auth obligatoire pour tout accès aux données
- RLS protège les données entre utilisateurs

**Convient si :**
- L'inscription est ouverte (ou par invitation)
- RLS Supabase est confirmé strict
- Acceptable que quiconque trouve l'URL puisse voir l'écran de connexion

**Architecture de sécurité :**
```
Internet → GitHub Pages (HTML/JS) → Supabase Auth (JWT) → RLS → Données
                                  ↘ Supabase Edge Function (JWT vérifié)
```

---

### Option B — Repo privé + hébergement privé/protégé + auth Supabase

**Fonctionnement :**
- Code invisible (dépôt privé) ✅
- App accessible uniquement via URL avec authentification d'accès (IP whitelist, Basic Auth, Cloudflare Access, VPN)
- Double couche : accès à l'URL + auth Supabase

**Convient si :**
- Beta très fermée (quelques testeurs connus)
- Besoin de cacher l'existence même de l'app
- Environnement professionnel avec accès réseau contrôlé

**Options hébergement privé :**
- Cloudflare Pages + Cloudflare Access (emails autorisés)
- Vercel + Password Protection (plan Pro)
- Netlify + Identity / IP restriction

---

## VERDICT SÉCURITÉ

| Point | Résultat |
|---|---|
| Secrets commités | ✅ Aucun |
| ANTHROPIC_API_KEY | ✅ Env uniquement |
| service_role côté navigateur | ✅ Absent |
| Edge Function auth | ✅ JWT requis + rôle vérifié DB |
| Séparation conducteur/gardien | ✅ Défense en profondeur (depth + system + strippage) |
| Logs GitHub Actions | ✅ Aucune donnée sensible |
| XSS frontend | ✅ esc() partout (SESSION-36e) |
| SQL injection | ✅ API Supabase uniquement |
| Dépôt public | ⚠️ **RISQUE — À corriger en priorité** |
| RLS Supabase | ⚠️ Non vérifiable depuis le code |
| GitHub Pages | ⚠️ Ne pas activer avant repo privé |

### Verdict global : **DÉPLOYABLE après C1 (repo privé) + C2 (RLS confirmé)**

**Recommandation : Option A**  
Dépôt privé (C1 immédiat) + GitHub Pages public + auth Supabase stricte.  
L'anon key dans le frontend est le pattern standard Supabase. La sécurité repose sur le JWT + RLS.  
Option B si beta très fermée avec liste d'accès explicite.

**Ordre d'actions :**
1. ✅ C1 — Repo privé (5 minutes — Settings GitHub)
2. ✅ C2 — Confirmer RLS dans Dashboard Supabase
3. ✅ C3 — Supprimer branche worktree abandonnée
4. ✅ C4 — Configurer inscription invitation-only si beta fermée
5. ✅ Activer GitHub Pages → déployer → tests E2E finaux
