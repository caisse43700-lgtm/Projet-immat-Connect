# RESTORE PROTOCOL — ImmatConnect
> Comment restaurer la version stable v1

---

## Restauration d'urgence — 1 commande

```bash
git reset --hard 366332188bc9bfedbdd7afa5d7511ec6ba62b5ad
```

Ou depuis la branche immatrestore :

```bash
git checkout -b restauration-urgence immatrestore
```

---

## Référence du point de restauration

| Champ | Valeur |
|-------|--------|
| **Branche coffre-fort** | `immatrestore` |
| **SHA complet** | `366332188bc9bfedbdd7afa5d7511ec6ba62b5aa` |
| **SHA court** | `3663321` |
| **Date** | 29 mai 2026 |
| **Tests** | 162 ✅ pass — 0 ❌ fail |
| **Cache SW** | `immatconnect-pro-v4` |

---

## Procédure complète de restauration

```bash
# Étape 1 — Sauvegarder l'état actuel (si travail en cours)
git checkout main
git add -A
git commit -m "checkpoint-main-$(date +%Y-%m-%d-%H%M)-avant-restauration"
git push origin main

# Étape 2 — Vérifier qu'immatrestore est intact
git log --oneline immatrestore | head -3
# doit afficher : 3663321 merge: claude/v9-architecture → main

# Étape 3 — Restaurer (option A : reset hard)
git reset --hard immatrestore

# Étape 3 — Restaurer (option B : nouvelle branche propre)
git checkout -b restauration-$(date +%Y-%m-%d) immatrestore

# Étape 4 — Vérifier les tests
node tests.js
# doit retourner : 162 ✅ pass | 0 ❌ fail

# Étape 5 — Pousser si tout est bon
git push -u origin <nom-de-branche>
```

---

## Vérification d'intégrité des fichiers

| Fichier | Lignes | MD5 |
|---------|--------|-----|
| `index.html` | 1868 | `8675da64f36f2ca2cee812f86c540ad6` |
| `messages.js` | 672 | `037bcbf3a88eecdeb3284c767d5399b3` |
| `calls.js` | 343 | `8fcad98b9e48c6263186c3e42b7b772e` |
| `messages.css` | 528 | `354b556a93905a8c1c269009555265b0` |
| `calls.css` | 313 | `63fc528ea68e690fbcd0a1103149e607` |
| `app.css` | 926 | `7dcb1a181ae6819eb1c055db4c42cf54` |
| `service-worker.js` | 15 | `c11d3ecb179177473975fb9a4756a453` |
| `utils.js` | 62 | `5ad3ca8a7f130bcc7cf924c26ed4632b` |
| `tests.js` | 1656 | `5969a15f9458fc40be3f79af51c866ea` |
| `core/invariants.js` | 104 | `a3eb31fc3d5d110123c773a918bc9ef2` |
| `core/bus.js` | 70 | `7c76cdf4b7aa822597ac044741b5e935` |
| `core/governance.js` | 44 | `eab6b933a8d084d861c664eb99a22e3b` |

Pour vérifier :
```bash
md5sum index.html
# → 8675da64f36f2ca2cee812f86c540ad6
```

---

## Protocole Supabase — avant toute modification SQL

**Règle absolue :** Aucune modification de la base de données sans audit préalable.

Cela inclut :
- Migrations SQL (ALTER TABLE, CREATE TABLE, DROP)
- Modifications RLS (Row Level Security)
- Modifications de triggers
- Modifications de RPC / fonctions
- Edge Functions
- Configuration Realtime
- Policies et indexes

**Procédure d'audit SQL :**

```
1. Décrire la modification envisagée
2. Identifier toutes les tables et fonctions impactées
3. Identifier les risques de perte de données
4. Identifier les risques RLS (fuite de données)
5. Tester sur immatv2 uniquement en premier
6. Validation humaine explicite avant application sur main
```

---

## Fonctionnalités présentes dans cette version

### Carte & Signalements
- Signalements route → visible en temps réel sur les deux cartes
- Badge badge numérique synchronisé en temps réel
- Suppression → propagée aux deux cartes et deux Activités
- Canal Supabase Realtime : `ic_community_live` (table `reports`)

### Contact & Appels
- Modal "Contacter" : 💬 Message + 🤝 Demande de contact
- Bannière "Demande envoyée" en haut (safe-area iOS)
- Plaque réelle dans la bannière
- Bouton Annuler accessible
- Aucun numéro exposé (INV-010)

### Messages
- Onglets Reçus / Envoyés / Nouveau
- Swipe gauche → bouton "Supprimer" rouge
- Aucune suppression automatique

### Architecture
- ImmatOrganism V1 Phase 1 (Observateur)
- 14 invariants fondateurs (INV-001 → INV-014)
- CONSTITUTION.md v2 avec Anti-Dérive et Gouvernance
- Service Worker v4 (`immatconnect-pro-v4`)
