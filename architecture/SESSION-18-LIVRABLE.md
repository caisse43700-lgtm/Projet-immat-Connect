# Amélioration Navigation Fonctionnalités

> SESSION 18 — Corrections post-audit — Commit `199c54d` — branche `claude/immatconnect-pro-app-dEKGR`

---

## Bilan audit SESSION 18

Avant toute modification, deux agents ont audité l'organisme en parallèle :

| Constat | Fichier | Impact |
|---|---|---|
| `brain.js` — return statement dupliqué orphelin | `core/brain.js` | Bug syntaxique silencieux — le module.exports pointait sur un IIFE incomplet |
| `canDisplayVehicleOnMap`, `canRequestCall`, `validateInvariant` jamais appelées en prod | `index.html` | Phase 3 inutilisable en l'état |
| `notifyAlert()` existe déjà (~ligne 409) | `index.html` | Pas besoin d'écrire une nouvelle fonction |
| TTLs par type : assist = 45min (sauf incendie = 30min) | `index.html` CATS | Confirm baseline pour la notification TTL |
| `ic_ange_feedback` en sessionStorage → perdu à chaque fermeture | `index.html` | Analyse feedback impossible à long terme |

---

## C1 — brain.js : return dupliqué supprimé

**Fichier** : `core/brain.js`

**Bug** : à la fin de brain.js existait un second bloc `return { ... }` + `})()` orphelin (hors de l'IIFE) — vestige d'un conflit de merge ou d'une édition partielle.

**Effet** : `module.exports = { ImmatBrain }` référençait un objet issu d'un IIFE incomplet (fermé sans `const ImmatBrain = ...`). Node.js aurait lancé une `ReferenceError` à l'import. En browser, `ImmatBrain` était bien défini mais le code orphelin était du bruit parsé inutilement.

**Fix** : suppression des 12 lignes orphelines (ancien `return` + `})()` hors IIFE).

---

## C2 — Notification TTL aide sans répondant

**Fichier** : `index.html` — `cleanupAlerts()`

Avant la suppression des alertes expirées, un filtre identifie les demandes d'aide :
- `group === 'assist'`
- créées par l'utilisateur courant (`_mine` ou `_own`)
- sans répondant (`status !== 'helper_coming'`)
- TTL dépassé

Pour chacune, `notifyAlert()` est appelée :

```
notifyAlert('Aide non répondue', 'Votre demande de Panne a expiré sans répondant.', 'urgent')
```

Effets de `notifyAlert()` en mode urgent :
- Toast visuel rouge
- Vibration 140ms + 60ms + 140ms (si autorisé)
- Web Notification native (si permission accordée)

Le check se fait à chaque passage du `setInterval(60 000ms)` existant — aucun nouveau timer créé.

---

## C3 — Feedback Ange : sessionStorage → localStorage

**Fichier** : `index.html` — `AngeDialog.feedback()` + lecture Dashboard gardien

| Avant | Après |
|---|---|
| `sessionStorage.getItem('ic_ange_feedback')` | `localStorage.getItem('ic_ange_feedback')` |
| `sessionStorage.setItem('ic_ange_feedback', ...)` | `localStorage.setItem('ic_ange_feedback', ...)` |

Les 20 derniers feedbacks 👍/👎 survivent maintenant aux fermetures d'onglet et rechargements. Le Dashboard gardien lit depuis le même storage — cohérence garantie.

---

## État de l'organisme après SESSION 18

```
brain.js return dupliqué ✅ supprimé
Notification TTL aide sans répondant ✅
Feedback Ange persistant (localStorage) ✅
Phase 3 ImmatBrain : NON activée (can*() ne sont pas appelées en prod)
```

---

## Ce qui reste (SESSION 19+)

| Priorité | Description | Complexité |
|---|---|---|
| A | ImmatBrain Phase 3 — refondre les méthodes can*() avec logique meaningful | Élevée |
| B | Analyse feedbacks Ange depuis localStorage pour améliorer knowledge files | Continue |
| C | Mise à jour knowledge-conducteur.ts depuis MEGA doc v16.1 | Faible |
| D | canDisplayVehicleOnMap / canRequestCall / validateInvariant — brancher en prod | Moyenne |
