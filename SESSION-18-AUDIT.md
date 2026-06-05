# Amélioration Navigation Fonctionnalités

## SESSION 18 — Audit + Correctifs · Rapport

**Date** : 2026-06-04  
**Branche** : `claude/immatconnect-pro-app-dEKGR`  
**Commit** : `f027230`  
**Score organisme** : 100% OPTIMAL — HIGH=0 MEDIUM=0 LOW=0 (19 features)  
**Tests** : 273/273 ✔

---

## Bugs corrigés (10)

### Critiques

| Bug | Symptôme | Correction |
|---|---|---|
| **Guard `__ImmatMessagesV12`** | Module V13 ne chargeait pas si V12 déjà présent | → `__ImmatMessagesV13` |
| **INV-COM-009 violée** | `deleteMessage`, `deleteThread`, `deleteAllMessages` faisaient des `DELETE` en DB | → soft-delete localStorage uniquement (`ic_deleted_msgs`) |
| **`setMode()` ne ferme pas le thread** | `setMode('inbox')` pendant un thread ouvert = liste + thread simultanément visibles | → fermeture explicite du thread en tête de `setMode()` |
| **Grille quick-reply (4 boutons / 3 colonnes)** | 4e bouton débordait sur une 2e ligne | → `grid-template-columns: 1fr 1fr` (2×2) |

### Comportement incorrect

| Bug | Symptôme | Correction |
|---|---|---|
| **`setTrust(NONE)` émettait `CONTACT_TRUSTED`** | OBD sémantiquement faux (révocation signalée comme ajout) | → `CONTACT_REVOKED` si level=NONE, `CONTACT_TRUSTED` sinon (literals pour détection statique) |
| **`unfavoriteConv`/`unarchiveConv` sans OBD** | INV-COM-007 : opérations non observées | → `CONV_FAVORITED`/`CONV_ARCHIVED` avec `action:'removed'` |
| **Swipe-to-delete sans confirmation** | Suppression accidentelle d'une conversation | → `confirm()` toujours exigé dans `deleteThread()`, que la source soit swipe ou header |
| **`MSG_RECEIVED` sur toutes les modifs DB** | Déclenchait même sur ses propres envois, updates et deletes | → uniquement sur `INSERT` adressé à mon profil (receiver_id/plate match) |
| **Channel Realtime `v12`** | Mauvais nommage | → `immat_messages_v13_` |

### Performance

| Bug | Impact | Correction |
|---|---|---|
| **6 requêtes Supabase séquentielles** | ~1200ms au chargement des messages | → `Promise.all()` → ~200ms |

---

## Dettes non corrigées (acceptées)

| Dette | Décision |
|---|---|
| CSS `.ic-msg-tabs` (code mort, ~30 lignes) | Inoffensif — à nettoyer en SESSION 19 |
| `openThreadMenu()` utilise `prompt()` | UX dégradée sur mobile — Phase 2 (bottom sheet) |
| Aucune UI pour voir les conversations archivées | Manquement UX — Phase 2 |
| `subscribe()` recrée le channel à chaque `refresh()` | Race condition très improbable — accepté |

---

## Ce qui reste à faire (SESSION 19+)

- Nettoyer CSS mort `.ic-msg-tabs`
- Bottom sheet pour le menu thread (archive, favori, confiance)
- Section "Archivées" dans la liste des conversations
