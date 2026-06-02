# Amélioration Navigation Fonctionnalités

> SESSION 17 — Suite (P1→P7) — Toutes les priorités livrées
> Commits : `2469f0c` · `50fcd58` · `551f95f` — branche `claude/immatconnect-pro-app-dEKGR`

---

## P1 — Historique conversation Ange

**Fichiers** : `index.html` + `immat-brain-dialog/index.ts`

L'Ange garde le fil de la conversation dans la session en cours.

- Stockage : `sessionStorage.ic_ange_history` — 3 derniers échanges (6 messages)
- Chargé avant chaque appel, inclus dans le body de la requête Edge Function
- Anonymisé côté serveur avant envoi à Anthropic (anonymize() appliqué)
- Sauvegardé après chaque réponse réussie

Flux : `send() → charge history → passe à Edge Function → history dans messages[] Anthropic → sauvegarde échange`

---

## P2 — TTS réponse Ange

**Fichier** : `index.html` — `renderResponse()`

Après chaque réponse de l'Ange, le texte principal est lu à voix haute si `S.voice` est actif.

- Gate : `S.voice && typeof speak === 'function'`
- Limite : 200 premiers caractères (texte bref, adapté à la conduite)
- Délai : 200ms après rendu DOM
- Respecte le paramètre de voix GPS existant — cohérence avec `toggleVoice()`

---

## P3 — Feedback qualité 👍/👎

**Fichier** : `index.html` — `renderResponse()` + `AngeDialog.feedback()`

Chaque réponse Ange porte deux boutons discrets.

- Clic 👍 → "Merci !" (positif)
- Clic 👎 → "Noté — essaie de reformuler." (négatif)
- Tracé en `sessionStorage.ic_ange_feedback` (20 derniers, horodatés)
- Visible dans le Dashboard gardien (stats 👍/👎)

---

## P4 — Onboarding premier arrivant

**Fichier** : `index.html`

Un overlay de bienvenue apparaît une seule fois, 1.4s après la première connexion à la carte.

- Déclenché par : `!get('ic_onboarded','0')` dans `openMap()`
- Contenu : 5 fonctionnalités clés (Carte, Signalements, Messages, GPS, Ange)
- Bouton "C'est parti ! 🚗" → `App.dismissOnboarding()` → `ic_onboarded='1'`
- Ne réapparaît jamais après le premier dismiss

---

## P5 — Score fiabilité sur les cards d'alertes

**Fichier** : `index.html` — `_actAlertCard()`

Un point coloré ● apparaît à côté de la plaque sur chaque card d'alerte reçue (non-propre).

| Score | Couleur | Label |
|---|---|---|
| ≥ 75 | 🟢 vert | Fiable |
| ≥ 35 | 🟡 orange | Confirmé |
| < 35 | ⚫ gris | Inconnu |

Source : `S.trust[nPlate(plate)]` — localStorage `ic_trust_scores`.
Tooltip au survol : niveau + pourcentage exact.

---

## P6 — ImmatBrain Phase 2 (Conseiller)

**Fichiers** : `core/brain.js` + `core/bus.js`

Ajout de `warnIfPhase2(invId, context)` dans ImmatBrain :
- Émet `INVARIANT_WARNING` sur le bus sans bloquer le flux
- Phase 1 : observe et journalise
- Phase 2 : observe + émet des warnings (nouveau)
- Phase 3 : bloque (futur — nécessite tests approfondis)

`INVARIANT_WARNING` ajouté au registre officiel des événements du bus.

---

## P7 — Dashboard Gardien dédié

**Fichier** : `index.html`

Accessible via Réglages > 🔍 Dashboard (visible gardiens uniquement via `.gardien-debug-tool`).

Contenu dynamique généré depuis `ImmatOrganism.diagnose()` :

| Section | Contenu |
|---|---|
| État système | Santé (ok/dégradé/violé), phase ImmatBrain, compteurs |
| Violations récentes | 5 dernières avec invariant + label + âge |
| Événements bus | 5 derniers avec type + âge |
| Ange session | Appels utilisés (N/10), feedback 👍/👎 |
| Scores fiabilité | Toutes les plaques avec score coloré |
| Actions rapides | Restaurer msgs · Sync alertes · Vider cache · Actualiser |

---

## État de l'organisme après SESSION 17 complète

```
ADN _v:7 ✅ · NS sync ✅ · Invariants 15/15 ✅
Ange ouvert tous conducteurs ✅ · Depth routing ✅
Historique session ✅ · TTS réponse ✅ · Feedback ✅
Throttling 10/h ✅ · Snapshot enrichi ✅ · INV-014 respecté ✅
Onboarding ✅ · Score fiabilité ✅
Dashboard gardien ✅ · ImmatBrain Phase 2 ✅
Vocal 🎙️ ✅ · Message accueil ✅ · Proposals rendus ✅
```

---

## Ce qui reste (SESSION 18+)

| Priorité | Description | Complexité |
|---|---|---|
| A | ImmatBrain Phase 3 (bloquant violations) — nécessite tests | Élevée |
| B | Notifications "personne n'a répondu" à l'expiry TTL aide | Moyenne |
| C | Analyse des feedbacks Ange pour améliorer knowledge files | Continue |
| D | Mise à jour knowledge-conducteur.ts depuis MEGA doc v16.1 | Faible |
