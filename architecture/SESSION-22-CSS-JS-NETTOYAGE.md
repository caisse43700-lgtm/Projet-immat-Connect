# Amélioration Navigation Fonctionnalités

> SESSION 22 — Nettoyage CSS mort + références JS `topMsgBadge`
> Branche : `claude/immatconnect-pro-app-dEKGR`

---

## Contexte

Suite à la SESSION 21 (suppression `topMsgBadge` + `_actMsgCard` + `_actAlertCard`), des références orphelines subsistaient dans 4 fichiers. Audit ChatGPT point 5 résolu.

---

## CSS mort supprimé — `app.css`

| Sélecteur | Raison | Action |
|---|---|---|
| `body.night .act-card` | `.act-card` n'existe plus dans le DOM depuis SESSION 21 | ✅ supprimé |
| `body.night .act-filter` | `.act-filter` absente de tout fichier HTML/JS | ✅ supprimé |
| `.act-card-actions button` | `.act-card-actions` absente de tout fichier HTML/JS | ✅ supprimé |

**CSS conservé (vivant) :**
- `.act-ttl-bar` / `.act-ttl-fill` — utilisées dans `_actModCard` ligne ~1193
- `.nav-badge` — utilisée par `actBadge`
- `body.night .sig-cat-btn` — utilisée dans `panelAltet` (3 boutons)

---

## JS mort supprimé — `badge.js`

```javascript
// SUPPRIMÉ (bloc topMsgBadge — élément absent du DOM)
const badge = $('topMsgBadge');
if (badge) {
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.style.display = n > 0 ? 'flex' : 'none';
  badge.setAttribute('aria-label', `${n} unread messages`);
}
```

`setBadge()` met maintenant à jour uniquement `S.unreadMsgCount` + localStorage. L'affichage nav est géré exclusivement par `App.updateActBadge()` dans `index.html`.

---

## JS mort supprimé — `messages.js`

```javascript
// SUPPRIMÉ (setBadge — bloc topMsgBadge)
const b = $('topMsgBadge');
if(b){
  b.textContent = n > 99 ? '99+' : String(n);
  b.style.display = n > 0 ? 'flex' : 'none';
}
```

---

## JS mort supprimé — `ui.js`

```javascript
// SUPPRIMÉ (syncBadge — branche else topMsgBadge)
} else {
  const badge = $('topMsgBadge');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
```

La branche `if (typeof window.setUnreadMsgCount === 'function')` est conservée — elle est toujours le bon chemin.

---

## Documentation mise à jour — `AUDIT-UX-CLASSIFICATION.md`

| Item | Avant | Après |
|---|---|---|
| MORT-002 | 🔧 Orphelin actif | ✅ Résolu P2-015 SESSION 21 |
| Bilan MORT | 1 restant | 0 restant |
| Section 7 ajoutée | — | ✅ Récapitulatif SESSION 21 complet |

---

## État final

```
Références topMsgBadge dans le codebase :  0
CSS mort lié aux classes supprimées :       0
Boutons morts (MORT-*) restants :           0
```

### Flux badge actif (seul)

```
actBadge (onglet Activité nav) = unreadAlerts + S.unreadMsgCount
                                  ↑                ↑
                            S.alerts           setUnreadMsgCount()
                                                → updateActBadge()
```

---

## Fichiers modifiés

| Fichier | Nature |
|---|---|
| `app.css` | 3 règles CSS mortes supprimées |
| `badge.js` | Bloc `topMsgBadge` supprimé |
| `messages.js` | Bloc `topMsgBadge` supprimé |
| `ui.js` | Branche `else topMsgBadge` supprimée |
| `architecture/AUDIT-UX-CLASSIFICATION.md` | MORT-002 résolu + section SESSION 21 |
