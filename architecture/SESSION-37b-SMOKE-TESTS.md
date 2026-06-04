# Amélioration Navigation Fonctionnalités

# SESSION 37b — Smoke Tests Post-Déploiement
**Date :** 2026-06-03  
**URL cible :** `https://caisse43700-lgtm.github.io/Projet-immat-Connect/`  
**Branche :** `claude/immatconnect-pro-app-dEKGR` (commit `426dd8c`)  
**Edge Function :** `immat-brain-dialog` déployée (Supabase `vemgdkkbldgyvaisudkd`)  

---

## Méthode d'exécution

GitHub Pages retourne **403 "Host not in allowlist"** — Pages non activé dans Settings du dépôt.

Deux types de vérification utilisés :
- **Code-level** : lecture directe du code déployé (vérifiable sans navigateur)
- **E2E** : requiert navigateur + comptes Supabase → EN ATTENTE Gardien

---

## RÉSULTATS DES 12 TESTS

### Test 1 — Ouverture application
**Méthode :** Serveur local (HTTP 200) + vérification titre  
**Résultat :** `PASS (code-level)`

```
HTTP 200 | <title>ImmatConnect Pro</title>
service-worker.js : HTTP 200
```
Scripts : 24 balises `<script>` présentes. index.html servi correctement.

**GitHub Pages :** 403 — inaccessible depuis l'URL de production. Requiert Settings → Pages → Source: GitHub Actions (action Gardien).

---

### Test 2 — Connexion conducteur
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

Code de connexion : `App.goAuth('login')` → `handleAuth()` → `sb.auth.signInWithPassword()`. Structure vérifiée identique aux sessions précédentes.

---

### Test 3 — Connexion gardien
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

Détection rôle : `sb.from('profiles').select('role')` → `isGardien = !roleErr && role === 'gardien'`. Structure inchangée.

---

### Test 4 — Ange conducteur
**Méthode :** Code-level — Edge Function `immat-brain-dialog`  
**Résultat :** `PASS (code-level)`

Vérification `validateOutput()` dans `index.ts` :
```typescript
if (!isGardien) {
  delete result.route;        // ✅ absent pour conducteur
  delete result.proposal;     // ✅ absent
  delete result.invariants;   // ✅ absent
  delete result.vigilance;    // ✅ absent
}
```

Prompt conducteur : `nsToPrompt(1)` → `level_1.what_user_sees` + `serves` uniquement.  
Un conducteur qui demande "Où est le code du GPS ?" ne recevra aucune référence technique — Ange répondra en termes UX.

---

### Test 5 — Ange gardien
**Méthode :** Code-level — Edge Function `immat-brain-dialog`  
**Résultat :** `PASS (code-level)`

```typescript
const STATIC_SYSTEM_GARDIEN = nsToPrompt(3) + '\n\n' + KNOWLEDGE_GARDIEN;
// depth 3 : entry · constraints · deps · serves · 2 failure_modes + inhibitions + invariants
const depth: 1 | 2 | 3 = role === 'gardien' ? 3 : role === 'protecteur' ? 2 : 1;
```

Un gardien qui demande "Où est implémenté le GPS ?" reçoit le NS complet + KNOWLEDGE_GARDIEN (255 lignes) incluant chemins de fichiers, points d'entrée, invariants, historique de décisions.

---

### Test 6 — Signalement route
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

Code signalement : `App.openReport()` → `saveReportRemote()`. `updateCommunityStatus()` appelée après chaque signalement via `syncDerivedAlertUI()`.

---

### Test 7 — Signalement véhicule
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

Séparation canal véhicule vérifiée : `group: 'vehicle'` distinct de `group: 'route'` dans `renderAlerts()`. Labels dans `_actAlertCard` corrects (sessions 15-16 corrigées).

---

### Test 8 — alertHistoryBox visible après signalement
**Méthode :** Code-level  
**Résultat :** `PASS (code-level)`

```html
<!-- Ligne 147 — hors sigStep2Route, toujours dans le DOM -->
<div id="alertHistoryBox" class="altet-history" style="display:none;margin-top:4px;...">
  <div class="sig-section-hd" style="margin-bottom:6px">Mes signalements</div>
  <div id="alertHistoryList" class="altet-list"></div>
</div>
```

Toggle dans `renderAlerts()` (ligne 801) :
```javascript
const histBox=$('alertHistoryBox');
if(histBox)histBox.style.display=S.alertHistory.length?'':'none';
```

Condition : `display:block` si `S.alertHistory.length > 0`, `display:none` sinon. Toujours présent dans le DOM. Corrigé en SESSION-33 (ex-bug : invisible car à l'intérieur de sigStep2Route).

---

### Test 9 — Messages
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

`setUnreadMsgCount` corrigé (BUG-001 S26). Badge cohérent avec `ic_unread_msg_count`. messages.js vérifié : tous les `innerHTML` utilisent `esc()`.

---

### Test 10 — Activité / actBadge
**Méthode :** E2E requis  
**Résultat :** `EN ATTENTE — GitHub Pages inactif + credentials requis`

`updateActBadge()` et `renderActivityFeed()` dans `ui.js`. Badge Activité déclenché par `schedBadge()` dans `syncDerivedAlertUI()`.

---

### Test 11 — Offline
**Méthode :** Code-level  
**Résultat :** `PASS (code-level)`

Initialisation : `S.networkOnline = navigator.onLine !== false` (ligne 371)

Event listener (ligne 879) :
```javascript
window.addEventListener('offline', () => {
  S.networkOnline = false;
  App.updateCommunityStatus?.();
  toast('Mode hors ligne.', 'bad')
});
```

Guard dans `updateCommunityStatus()` (ligne 864) :
```javascript
if(!S.networkOnline){
  el.textContent='Hors ligne · GPS actif · alertes en cache';
  return;
}
```

Résultat attendu : `communityStatus` affiche `"Hors ligne · GPS actif · alertes en cache"` → **confirmé dans le code**.

---

### Test 12 — Online (retour)
**Méthode :** Code-level  
**Résultat :** `PASS (code-level)`

Event listener (ligne 879) :
```javascript
window.addEventListener('online', () => {
  S.networkOnline = true;
  App.updateCommunityStatus?.();   // Repasse au comportement normal
  App.syncOfflineReports?.();       // Sync des signalements hors ligne
  App.syncCommunityAlerts?.();      // Sync des alertes communauté
  toast('Connexion retrouvée.', 'ok')
});
```

**Comportement confirme :** 3 actions enchaînées → updateCommunityStatus repasse en mode "conducteurs proches · alertes", signalements hors ligne synchronisés.

---

## SYNTHÈSE

| # | Test | Méthode | Résultat |
|---|---|---|---|
| 1 | Ouverture app | Code-level ✓ / E2E ⏳ | PASS (code) · EN ATTENTE (prod) |
| 2 | Connexion conducteur | E2E | EN ATTENTE |
| 3 | Connexion gardien | E2E | EN ATTENTE |
| 4 | Ange conducteur | Code-level | **PASS** ✅ |
| 5 | Ange gardien | Code-level | **PASS** ✅ |
| 6 | Signalement route | E2E | EN ATTENTE |
| 7 | Signalement véhicule | E2E | EN ATTENTE |
| 8 | alertHistoryBox | Code-level | **PASS** ✅ |
| 9 | Messages | E2E | EN ATTENTE |
| 10 | Activité / actBadge | E2E | EN ATTENTE |
| 11 | Offline | Code-level | **PASS** ✅ |
| 12 | Online (retour) | Code-level | **PASS** ✅ |

**Tests PASS (code) : 5/12**  
**Tests EN ATTENTE (E2E) : 7/12**

---

## Blocage unique : GitHub Pages

Tous les tests E2E sont bloqués par la même cause racine.

**Statut GitHub Pages :**
- URL cible : `https://caisse43700-lgtm.github.io/Projet-immat-Connect/`
- Réponse actuelle : `403 — Host not in allowlist`
- Tous les runs `deploy.yml` : `failure` (runner_id: 0 — environnement non alloué)

**Cause :** L'environnement `github-pages` de GitHub Actions n'est pas activé.

**Action requise :**
1. **Settings → Pages** du dépôt GitHub
2. **Source :** choisir `GitHub Actions`
3. **Sauvegarder**
4. Déclencher : Actions → `Déploiement GitHub Pages` → `Run workflow` → `claude/immatconnect-pro-app-dEKGR`

**Après activation :** les 7 tests E2E peuvent être exécutés avec les comptes test conducteur et gardien.

---

## Corrections nécessaires

Aucune correction identifiée sur les 5 tests vérifiés au code. Implémentations conformes aux specs des sessions 33, 36, 36c.

---

## Verdict

**5 tests PASS sur les fonctionnalités clés déployées** (offline, Ange, alertHistoryBox)  
**7 tests EN ATTENTE** — bloqués uniquement par l'absence d'activation GitHub Pages  
**Aucun FAIL identifié**

**→ Déploiement validé sur la partie vérifiable. Tests E2E en attente d'activation GitHub Pages.**
