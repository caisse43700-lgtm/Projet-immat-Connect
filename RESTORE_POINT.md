# RESTORE POINT — ImmatConnect v1 Stable
> État de référence : 29 mai 2026 — Application fonctionnelle complète

---

## Comment restaurer cet état en 1 commande

```bash
git reset --hard snapshot/v1-working-2026-05-29
```

Ou, pour restaurer sans perdre tes commits actuels (nouvelle branche) :

```bash
git checkout -b restauration-v1 snapshot/v1-working-2026-05-29
```

---

## Référence git

| Champ | Valeur |
|-------|--------|
| **Tag git** | `snapshot/v1-working-2026-05-29` |
| **Commit SHA** | `e0a923ea9200514a5d7e5f84711663170a4bf5aa` |
| **Branche d'origine** | `claude/v9-architecture` |
| **Date** | 29 mai 2026 |
| **Tests** | 162 ✅ pass — 0 ❌ fail |

---

## Ce qui fonctionne dans cet état

### Carte & Signalements route
- Signalement route créé → apparaît en temps réel sur les **deux cartes** (postgres_changes INSERT)
- Suppression depuis Activité → retiré des **deux cartes** (postgres_changes UPDATE status='resolved')
- Suppression depuis la carte → retiré des **deux Activités** (broadcast + UPDATE)
- Badge numérique synchronisé en temps réel sur les deux comptes
- Canal Supabase Realtime : `ic_community_live` sur table `reports`

### Signalements véhicule
- Ne crée jamais de marqueur sur la carte (INV-001)
- Transite uniquement par messages (INV-002)
- Bouton "Contacter" présent dans Activité (avec guard plaque non vide)

### Système de contact / appels
- Modal "Contacter" : 💬 Message + 🤝 Demande de contact
- Bannière "Demande envoyée" positionnée en haut (safe-area iOS)
- Plaque réelle affichée dans la bannière (pas "le conducteur")
- Bouton "Annuler" accessible (toast supprimé)
- Bannière disparaît après 8s
- Aucun numéro exposé (INV-010)

### Messages
- Onglets Reçus / Envoyés / Nouveau fonctionnels
- Swipe gauche sur un thread → bouton "Supprimer" rouge
- Aucune suppression automatique (LOI-MSG-01)
- Restauration possible depuis Paramètres

### Cache iOS
- Service Worker : `immatconnect-pro-v4`
- Cache-bust : `app.css?v=3`, `messages.css?v=4`, `calls.css?v=3`, `messages.js?v=13`

### Architecture ImmatOrganism V1 (Phase 1 Observateur)
- `core/invariants.js` — 14 invariants _deepFreeze
- `core/bus.js` — ImmatBus événements + journal 200 entrées
- `core/brain.js` — ImmatBrain logique de garde
- `core/governance.js` — phases 1→5 + prérequis
- `core/immatOrganism.js` — façade d'orchestration

### CONSTITUTION.md
- Sections Anti-Dérive (D-001→D-007) avec conséquences interdites
- Gouvernance des Évolutions (G-001→G-010) avec colonne OUI/NON
- Critères de Validation PR version officielle v2

---

## Fichiers et checksums MD5 (vérification d'intégrité)

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
| `core/brain.js` | — | `f29c4167f7b90f4e20f78df8840c6a37` |
| `core/governance.js` | 44 | `eab6b933a8d084d861c664eb99a22e3b` |
| `core/immatOrganism.js` | — | `9ddc7a59764ea86c0cddcec53e17162e` |

Pour vérifier l'intégrité d'un fichier :
```bash
md5sum index.html
# doit retourner : 8675da64f36f2ca2cee812f86c540ad6
```

---

## Architecture de la base de données (Supabase)

### Tables principales
| Table | Usage |
|-------|-------|
| `reports` | Signalements route + aide (`status`: active/resolved) |
| `messages` | Messages entre conducteurs (via plaque) |
| `profiles` | Profils conducteurs (owner_plate, prefs) |
| `call_requests` | Demandes de contact (`status`: pending/accepted/refused/expired) |
| `call_preferences` | Préférences d'appel par utilisateur |

### Canal Realtime
- `ic_community_live` — postgres_changes sur `reports` (INSERT + UPDATE)
- Broadcast fallback : `new_report`, `resolve_report`, `vehicle_alert`

### RPC sécurisées
- `can_receive_calls(target_uid)` — SECURITY DEFINER, vérifie call_preferences

---

## Architecture frontend

### Pattern IIFE modules
Tous les modules utilisent le pattern IIFE (Immediately Invoked Function Expression) :
```js
const MonModule = (function() {
  // privé
  return { méthodes publiques };
})();
```

### Ordre de chargement des scripts (index.html)
1. `utils.js?v=3` — utilitaires partagés
2. Code inline principal `<script>` — App, S (state), helpers
3. `calls.js?v=3` — CallManager
4. `messages.js?v=13` — ImmatMessages
5. `core/invariants.js` — INVARIANTS
6. `core/bus.js` — ImmatBus
7. `core/brain.js` — ImmatBrain
8. `core/governance.js` — ImmatGovernance
9. `core/immatOrganism.js` — ImmatOrganism

### Invariants fondateurs (résumé)
| ID | Règle |
|----|-------|
| INV-001 | Véhicule ne crée jamais de marqueur carte |
| INV-002 | Données véhicule = messages uniquement |
| INV-003 | Route/Aide = reports, jamais messages |
| INV-004 | Activité = vue dérivée, ne produit rien |
| INV-005 | Badge = contenu réel (jamais fictif) |
| INV-007 | Appel uniquement via Contacter contextualisé |
| INV-010 | Aucun numéro de téléphone exposé |
| INV-014 | L'IA ne décide jamais seule |

---

## Instructions pour Claude (restauration)

Si l'utilisateur dit **"remets l'ancienne version"** ou **"reviens au point de restauration"** :

1. Vérifier la branche courante : `git branch`
2. Créer une branche de sauvegarde de l'état actuel : `git checkout -b backup/avant-restauration-$(date +%Y%m%d)`
3. Revenir au tag : `git reset --hard snapshot/v1-working-2026-05-29`
4. Vérifier : `node tests.js` (doit retourner 162 ✅)
5. Pousser sur la branche : `git push -u origin <branche>`

**Le tag `snapshot/v1-working-2026-05-29` est immuable** — il pointe toujours sur ce commit exact, quoi qu'il arrive sur les branches.
