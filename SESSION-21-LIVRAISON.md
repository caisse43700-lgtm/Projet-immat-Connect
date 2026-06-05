# Amélioration Navigation Fonctionnalités

# SESSION 21 — Realtime : subscribe() ne recrée plus le channel à chaque refresh()

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Fichier modifié :** `messages.js`  
**Commit :** `1745068`

---

## Problème

`refresh()` appelait `subscribe()` à chaque exécution (ligne 225). `subscribe()` faisait :
1. `await client.removeChannel(State.channel)` — suppression asynchrone du channel existant
2. `State.channel = null`
3. Création + abonnement d'un nouveau channel

**Race condition :** si deux `refresh()` se chevauchaient (ex: message reçu pendant un envoi en cours), `State.channel` pouvait être non-null pour les deux appelants, les deux entraient dans le bloc teardown en parallèle, et deux channels étaient créés simultanément — entraînant potentiellement des messages dupliqués ou des callbacks fantômes.

---

## Correction

Deux gardes symétriques — `messages.js` uniquement :

**Dans `refresh()` (ligne 225) :**
```js
// Avant
subscribe();
// Après
if(!State.channel) subscribe();
```

**Dans `subscribe()` (début de fonction) :**
```js
if(!State.channel) return;   // ← ajouté
```

**Suppression du bloc teardown** (mort) :
```js
// Supprimé — devenu dead code
if(State.channel) {
  try{ await client.removeChannel(State.channel); }catch(e){}
  State.channel = null;
}
```

---

## Flux après correction

| Situation | Comportement |
|---|---|
| Premier `refresh()` | `State.channel` null → `subscribe()` crée le channel |
| `refresh()` suivants | `State.channel` défini → `subscribe()` ignoré |
| Erreur channel (CHANNEL_ERROR / TIMED_OUT) | `State.channel = null` → `setTimeout(subscribe, 5000)` recrée proprement |
| Logout (`unsubscribe()` public) | `removeChannel` + `State.channel = null` → channel fermé proprement |

---

## Ce qui reste

Aucune dette technique connue côté messagerie.
