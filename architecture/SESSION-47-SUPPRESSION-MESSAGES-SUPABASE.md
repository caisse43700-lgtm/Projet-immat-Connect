# Amélioration Navigation Fonctionnalités

# SESSION 47 — Suppression réelle des messages depuis Supabase
**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Objet :** Suppression Supabase des messages · bouton Tout supprimer · nettoyage interface

---

## Problème

Les fonctions `deleteMessage()` et `deleteThread()` dans `messages.js` n'effaçaient les messages qu'en local (via `ic_deleted_msgs` dans localStorage). Les messages restaient intacts dans la base Supabase. Au prochain chargement (autre appareil, reconnexion, vider cache), les ~100 messages réapparaissaient.

La fonction `refresh()` fetche jusqu'à 300 messages × 6 queries depuis Supabase → les messages localement "cachés" restaient en base.

---

## Corrections appliquées

### Fix 1 — `deleteMessage(id)` : suppression Supabase immédiate

**Fichier :** `messages.js` lignes 583-593

```javascript
// AVANT : suppression locale seulement
async function deleteMessage(id){
  if(!confirm('Supprimer ce message ?')) return;
  const sid = String(id);
  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  if(!deleted.includes(sid)) deleted.push(sid);
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-500))); }catch(e){}
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
}

// APRÈS : suppression Supabase + fallback local
async function deleteMessage(id){
  if(!confirm('Supprimer ce message ?')) return;
  const client = sb();
  if(client){ try{ await client.from('messages').delete().eq('id', id); }catch(e){} }
  const sid = String(id);
  let deleted = [];
  try{ deleted = JSON.parse(localStorage.getItem('ic_deleted_msgs') || '[]'); }catch(e){}
  if(!deleted.includes(sid)) deleted.push(sid);
  try{ localStorage.setItem('ic_deleted_msgs', JSON.stringify(deleted.slice(-500))); }catch(e){}
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
}
```

---

### Fix 2 — `deleteThread(plate)` : suppression en batch depuis Supabase

**Fichier :** `messages.js` lignes 595-612

```javascript
// AJOUT dans deleteThread() :
const client = sb();
if(client && ids.length){
  try{
    for(let i=0;i<ids.length;i+=100){
      await client.from('messages').delete().in('id', ids.slice(i,i+100));
    }
  }catch(e){}
}
```

Chunking par 100 pour éviter les limites de Supabase sur les `.in()`.

---

### Fix 3 — Nouveau `deleteAllMessages()` : vider tous les messages

**Fichier :** `messages.js` (après `deleteThread`)

```javascript
async function deleteAllMessages(){
  if(!confirm('Supprimer TOUS vos messages ? Cette action est irréversible.')) return;
  const client = sb();
  const ids = State.messages.map(m=>m.id).filter(Boolean);
  if(client && ids.length){
    try{
      for(let i=0;i<ids.length;i+=100){
        await client.from('messages').delete().in('id', ids.slice(i,i+100));
      }
    }catch(e){}
  }
  try{ localStorage.removeItem('ic_deleted_msgs'); }catch(e){}
  await refresh();
  try{ window.App?.updateActBadge?.(); }catch(e){}
  try{ window.App?.renderActivityFeed?.(); }catch(e){}
}
```

Opère sur `State.messages` (messages déjà chargés) → supprime exactement ce qui est affiché, pas plus. Exposé dans `window.ImmatMessages`.

---

### Fix 4 — Bouton "🗑 Tout" dans l'en-tête Messages

**Fichier :** `index.html` (panel `panelMessages`, barre d'onglets)

```html
<button type="button" onclick="ImmatMessages.deleteAllMessages()"
  style="margin-left:auto;background:rgba(239,68,68,.12);color:#ef4444;
         border:1px solid rgba(239,68,68,.3);border-radius:8px;
         padding:5px 9px;font-size:11px;cursor:pointer;flex-shrink:0">
  🗑 Tout
</button>
```

Positionné à droite via `margin-left:auto` dans la flexbox des onglets. Déclenche `deleteAllMessages()` avec confirmation.

---

### Fix 5 — Suppression du bouton "📨 Restaurer msgs"

Retiré des deux emplacements :
- **Settings panel** (`panelSettings`) : bouton `.gardien-debug-tool`
- **Dashboard Gardien** : bloc "Actions gardien"

Ce bouton appelait `App.restoreMessages()` qui effaçait `ic_deleted_msgs` → faisait réapparaître tous les messages cachés localement. Désormais inutile : la suppression est réelle en base.

---

### Fix 6 — Cache busting `messages.js?v=14`

`?v=13` → `?v=14` pour forcer le rechargement du script modifié.

---

## Règle à suivre

À chaque modification de `messages.js`, incrémenter le numéro de version dans `index.html` :
```html
<script src="messages.js?v=14"></script>  <!-- → v=15 à la prochaine modif -->
```

---

## État après SESSION 47

| Vérification | Statut |
|---|---|
| × sur un message → supprimé en Supabase | ✅ Implémenté |
| 🗑 (corbeille conversation) → supprimé en Supabase | ✅ Implémenté |
| "🗑 Tout" → confirmer → tous supprimés en Supabase | ✅ Implémenté |
| "Restaurer msgs" retiré de l'interface | ✅ Supprimé |
| Cache messages.js invalidé | ✅ v=14 |

---

## Contexte — Système d'appels WiFi interne

Le système `CallManager` / `calls.js` est conçu pour un **réseau de communication interne** entre conducteurs (WiFi local, Bluetooth, pair-à-pair). Ce n'est pas un appel téléphonique classique. Le bouton d'appel est accessible via le panneau Activité → alertes → "Contacter". Il n'apparaît pas dans le menu contextuel du véhicule sur la carte (3 actions : Message / Signaler / Bloquer). Cette absence est documentée mais ne sera pas modifiée dans cette session.
