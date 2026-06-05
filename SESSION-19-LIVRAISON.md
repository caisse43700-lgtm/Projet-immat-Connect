# Amélioration Navigation Fonctionnalités

# SESSION 19 — UX Messages : Bottom Sheet + Archivées

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Fichiers modifiés :** `messages.js`, `messages.css`, `index.html`  
**Tests :** 0 régression — tous les tests OBD passent à 100%

---

## Dettes SESSION 18 soldées

| Dette | Statut SESSION 18 | Résolution SESSION 19 |
|---|---|---|
| CSS `.ic-msg-tabs` mort (~30 lignes) | Inoffensif — à nettoyer en SESSION 19 | ✔ Supprimé |
| `openThreadMenu()` utilise `prompt()` | UX dégradée sur mobile — Phase 2 | ✔ Remplacé par bottom sheet |
| Aucune UI pour voir les conversations archivées | Manquement UX — Phase 2 | ✔ Section "Archivées" ajoutée |
| `subscribe()` recrée le channel à chaque `refresh()` | Race condition très improbable — accepté | → reporté (improbable) |

---

## Modifications

### 1. Suppression CSS mort `.ic-msg-tabs` — `messages.css`

Bloc de 30 lignes supprimé (`.ic-msg-tabs`, `.ic-msg-tabs button`, `.ic-msg-tabs button:active`, `.ic-msg-tabs button.on`).  
La ligne JS orpheline `document.querySelectorAll('.ic-msg-tabs button').forEach(...)` dans `messages.js` (setMode) également supprimée.

---

### 2. Bottom sheet `openThreadMenu()` — `messages.js` + `messages.css` + `index.html`

**Avant :** `prompt()` — boîte native bloquante, illisible sur mobile, pas de style personnalisé.

**Après :** bottom sheet natif CSS/JS avec :
- Backdrop semi-transparent `#icSheetBackdrop` — ferme le sheet au tap
- Panel glissant depuis le bas `#icBottomSheet` — animation CSS `translateY`
- 4 actions : ⭐ Favoris · 📁 Archiver · ✓ Confiance · 🗑 Supprimer
- Labels dynamiques selon l'état (ex : "Retirer des favoris" si déjà favori)
- Bouton `⋯` ajouté dans le header du thread (remplace l'inaccessible `🗑` standalone)
- Supprimer la conversation a migré dans le sheet (avec confirmation)

Nouvelles fonctions exportées : `closeSheet()`, `_sheetAction(action)`, `_unarchiveFromList(plate)`

---

### 3. Section "Archivées" — `messages.js` + `messages.css`

**Avant :** Les conversations archivées étaient filtrées et disparaissaient sans retour possible depuis la liste.

**Après :** Section collapsée en bas de la liste, affichée uniquement si des archives existent :
- Toggle `📂 Archivées (N)` — clique pour déplier/replier
- Chaque ligne archivée : plaque, aperçu dernier message, bouton "Désarchiver"
- Tap sur la ligne ouvre le thread normalement (sans désarchiver)
- Style atténué (opacity 0.7) pour distinguer des conversations actives

---

## Architecture des nouveaux éléments HTML

```
<div id="icSheetBackdrop" class="ic-sheet-backdrop">     ← backdrop fixe
<div id="icBottomSheet"   class="ic-bottom-sheet">       ← sheet fixe
  <div class="ic-sheet-handle">                          ← poignée visuelle
  <button id="icSheetFav">   ⭐ Ajouter aux favoris
  <button id="icSheetArch">  📁 Archiver
  <button id="icSheetTrust"> ✓ Marquer de confiance
  <button id="icSheetDel" class="danger"> 🗑 Supprimer
```

---

## Ce qui reste (SESSION 20+)

| Élément | Décision |
|---|---|
| `subscribe()` recrée le channel à chaque `refresh()` | Race condition très improbable — accepté |
| Bottom sheet : swipe-to-dismiss (glisser vers le bas) | Confort mobile — Phase 3 |
| Section archivées : tri par date de la plus récente | Amélioration mineure — Phase 3 |
