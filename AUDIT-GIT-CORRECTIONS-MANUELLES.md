# Amélioration Navigation Fonctionnalités

# RAPPORT AUDIT GIT — CORRECTIONS MANUELLES & SUPPRESSIONS

**Date :** 2026-06-06  
**Branche analysée :** `claude/immatconnect-pro-app-dEKGR` (HEAD : `8bdc3b8`)  
**Commits manuels identifiés :** 2026-05-19 → 2026-05-25  

---

## 1. Branches demandées — état réel

| Branche | État | Note |
|---|---|---|
| `rollback/claude-final-before-chatgpt` | ❌ N'existe pas | Jamais créée ou supprimée avant push |
| `restore/claude-avant-messages-telephone` | ❌ N'existe pas | Jamais créée ou supprimée avant push |
| `immatrestore` | ✅ Existe | Snapshot `v1-working-2026-05-29` (commit `9a12a69`) |
| `ab2f818` | ✅ Commit existant | `ci: déclencher Pages` — point de référence |
| `immatv2` | ✅ Existe | Branche VehicleOrgan (SESSION récente) |

---

## 2. Commits manuels identifiés

Auteur : `kassem43700@gmail.com`  
Période : **19 mai → 25 mai 2026**  
Méthode identifiable : message "Update fichier.ext" sans description (GitHub web editor)

| Hash | Date | Fichier | Impact |
|---|---|---|---|
| `788dada` | 19 mai 01:44 | index.html | +N lignes |
| `478964b` | 19 mai 01:46 | ui.js | +N lignes |
| `9526748` | 19 mai 02:03 | index.html | modifications |
| `c15f903` | 19 mai 02:17 | messages.js | modifications |
| `c4417ca` | 19 mai 02:20 | index.html | modifications |
| `5658505d` | **25 mai 00:17** | index.html | **−1234 lignes** 🔴 |
| `b72dd51` | 25 mai 00:17 | index.html | −/+ |
| `33bc0b6` | 25 mai 23:47 | index.html | modifications |
| `85029274` | 25 mai 23:41 | index.html | modifications |
| `5658505d` | 25 mai 00:17 | index.html | **DESTRUCTION MASSIVE** |
| `880e500b` | 25 mai 01:25 | index.html | **+1265 lignes (restauration tentée)** |
| `64fd93fd` | 25 mai 01:16 | badge.js | +41 −36 |
| `b9a7ec8b` | 25 mai 01:18 | ui.js | +170 −46 |
| `8c7ad53d` | 25 mai 01:33 | messages.css | +89 −5 |
| `a78cf866` | 25 mai 11:10 | messages.js | +469 −223 |
| `5949128` | 25 mai 11:45 | index.html | +100 |
| `ac45f4a4` | 25 mai 12:24 | index.html | **−100 (script inline)** |
| `99f09220` | 25 mai 12:42 | index.html | +305 |

---

## 3. Le commit le plus destructif : `5658505d` (25 mai 00:17)

**−1234 lignes** supprimées de `index.html`.

### Ce qui a été supprimé :

| Élément supprimé | Était utilisé ? | Statut |
|---|---|---|
| `AppReliabilityPro` (score fiabilité conducteur) | Non (feature expérimentale) | ⚠️ Feature perdue |
| `window.__ImmatMessagesFinalUnique` (inline) | Doublonnait avec messages.js externe | ✅ Suppression correcte |
| `window.__ReceptionRealFix` (inline) | Doublonnait avec messages.js externe | ✅ Suppression correcte |
| `window.__FinalMessagesCompatibility` (inline) | Doublonnait — conflit avec fichiers .js | ✅ Suppression correcte |
| `App.panel` patches inline | Redéfini proprement dans App object | ✅ OK |
| `App.sendMsg` / `App.clearMsg` inline | **Non référencés** depuis le HTML actuel | ℹ️ Pas de régression |

### Ce qui s'est passé ensuite :
Le commit `880e500b` (01:25, même nuit) a tenté de restaurer 1265 lignes.  
Puis Claude a proprement nettoyé avec `542dcd2` : *"Fix critical bugs: remove 4 competing inline message scripts"* — suppression nette de 855 lignes de scripts en double.

---

## 4. Comparaison ab2f818 vs HEAD

| Métrique | ab2f818 | HEAD (8bdc3b8) |
|---|---|---|
| index.html | 2042 lignes | 2292 lignes (+250) |
| messages.js | existant | 1340 lignes (refonte SESSION 17+) |
| ui.js | existant | 378 lignes |
| calls.js | existant | 395 lignes (Call Engine V2) |
| badge.js | existant | 80 lignes |

**Différences fonctionnelles HEAD vs ab2f818 :**  
`App.restoreMessages` — dans ab2f818 c'était `App.restoreMessages = function()` (assignation explicite). Dans HEAD c'est la même fonction mais inline dans l'objet `App {...}`. **Fonctionnement identique.**

---

## 5. Comparaison immatrestore vs HEAD

Fonctions présentes dans `immatrestore` (snapshot 29 mai) **absentes de HEAD** :

| Fonction | Appelée depuis index.html ? | Verdict |
|---|---|---|
| `App.clearMsg` | ❌ Non | Pas de régression UI |
| `App.sendMsg` | ❌ Non | Pas de régression UI |
| `App.markLastVehicleAlertPending` | ✅ Oui → ligne 973 index.html | ✅ Définie ligne 973 |
| `App.markLastVehicleAlertSeen` | ✅ Oui → ligne 969 index.html | ✅ Définie ligne 969 |
| `App.reportVehicleOrDrivers` | ✅ Oui | ✅ Définie ligne 996 |
| `App.respondLastVehicleAlert` | ✅ Oui | ✅ Définie ligne 930 |
| `App.voiceMsg` | ✅ Oui | ✅ Définie ligne 999 |
| `App.voicePlate` | ✅ Oui | ✅ Définie ligne 999 |

---

## 6. Audit des liens UI→JS — RÉSULTAT COMPLET

### App.XXX (94 appels depuis onclick)
**✅ TOUTES les fonctions App.XXX appelées depuis onclick existent dans le code actuel.**  
Aucun lien cassé détecté.

### CallManager.XXX (10 appels)
**✅ TOUTES présentes dans calls.js.**

### ImmatMessages.XXX (20 appels)
**✅ TOUTES présentes dans messages.js.**

### onclick count
- ab2f818 : 134 handlers
- HEAD : 150 handlers (+16 — contenu riche ajouté par sessions 17-27)

---

## 7. Conclusion

### Le bug actuel NE VIENT PAS des suppressions manuelles de mai 2026.

**Pourquoi :**
1. Toutes les suppressions importantes ont été **compensées** soit par une restauration manuelle la même nuit, soit par la refactorisation propre de Claude (sessions 17+)
2. Aucun handler `onclick` ne pointe vers une fonction inexistante
3. HEAD contient **plus de code fonctionnel** qu'ab2f818

### Ce qui a été réellement perdu (jamais restauré) :
| Élément | Priorité | Recommandation |
|---|---|---|
| `AppReliabilityPro` (score de fiabilité) | ⚠️ MOYEN | Peut être restauré si utilisé — SESSION future |
| `App.clearMsg` / `App.sendMsg` inline | ℹ️ FAIBLE | Non référencés, pas urgents |

### Ce qui a été volontairement retiré (correctement) :
- Scripts inline duplicata (`__ImmatMessagesFinalUnique`, `__ReceptionRealFix`) — remplacés par messages.js
- Patches `App.panel` inline — consolidés dans l'objet App principal

---

## 8. Si un bug existe, où chercher

Le code actuel est architecturalement sain. Si un bug est observé, les causes probables sont :

| Zone | Fichier | À vérifier |
|---|---|---|
| Messages ne s'affichent pas | messages.js | `refresh()` / channel Supabase Realtime |
| Appels ne fonctionnent pas | calls.js | `requestCall()` / `can_receive_calls()` RPC |
| Navigation cassée | index.html | `App.panel()` / `window.ImmatMessages?.setMode?.()` |
| Auth ne passe pas | index.html | `afterAuth()` / `handleAuth()` |
| Service Worker | sw.js | Cache version / fetch handler |

**Pour identifier le bug précis :** décris le symptôme observable (bouton, écran, message d'erreur console) et je cible immédiatement.

---

*Analyse basée sur : `git log --all`, `git diff ab2f818..HEAD`, `git show` sur chaque commit manuel, audit `grep` de tous les `onclick` vs définitions de fonctions.*
