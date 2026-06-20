# IMMATEST — Roadmap du testeur automatisé bout-en-bout
## ImmatConnect Pro · Référence de construction

---

## 1. VISION

Immatest est un robot de test qui simule deux conducteurs réels (BZ-652-LL ↔ BE-521-MM) interagissant dans l'application. Il s'appuie sur tous les outils déjà en place et ajoute l'orchestration Playwright pour tester les scénarios croisés.

**Principe :** chaque test ouvre deux fenêtres de navigateur simultanément. Compte A fait une action → on vérifie chez B → on compare avec ce que l'OBD/GVC voit → si échec, l'IA (Ange/immat-brain-dialog) analyse et propose un fix.

---

## 2. INVENTAIRE DES OUTILS EXISTANTS (à réutiliser)

| Outil | Fichier | Ce qu'il fait | Usage dans Immatest |
|---|---|---|---|
| **177 tests unitaires** | `tests.js` | Vérifie le code statique (utils, appels, messages, audio) | Couche 1 — lancés en Node avant tout |
| **GlobalVerificationCenter** | `core/global-verification-center.js` | 8 sections live : App, Dashboard, Messages, Appels, Audio, WebRTC, Cache, Supabase | Appelé via `page.evaluate()` après chaque scénario |
| **MobileAutotest** | `core/mobile-autotest.js` | Inspecte le DOM, taps, handlers, marqueurs Leaflet | Vérifie l'état UI après chaque action |
| **ObdSession / ObdGateway** | `core/obdSession.js` / `core/obdGateway.js` | Session de diagnostic en temps réel | Capture l'état système pendant les tests |
| **GuardianLoop** | `core/guardian-loop.js` | Surveillance continue, détecte les anomalies | Écoute les violations pendant les scénarios |
| **CallsRuntimeDiagnostics** | `core/calls-runtime-diagnostics.js` | Diagnostique l'état des appels | Vérifie l'état post-appel |
| **MessagesRuntimeDiagnostics** | `core/messages-runtime-diagnostics.js` | Diagnostique l'état des messages | Vérifie la réception |
| **immat-brain-dialog** | `supabase/functions/immat-brain-dialog/` | Edge Function IA (ANTHROPIC_API_KEY) | Analyse les échecs et génère des fixes |

---

## 3. ARCHITECTURE IMMATEST

```
immatest/
  .env                  ← EMAIL_A, PWD_A, EMAIL_B, PWD_B, BASE_URL (non commité)
  runner.js             ← orchestrateur : lance tous les scénarios, génère le rapport
  config.js             ← lecture .env + constantes
  │
  scenarios/
    S01-auth.js         ← Login A et B, vérifier profil chargé
    S02-messages.js     ← Échange de messages A↔B (envoi, réception, onglets)
    S03-signalement.js  ← Signalement véhicule stationné + réponse conducteur
    S04-appels.js       ← Appel A→B : popup, accepter, raccrocher / refuser
    S05-activite.js     ← Vérification onglet Activité (bons items, bons onglets)
    S06-badges.js       ← Compteurs badges (Messages, Activité)
    S07-carte.js        ← Marqueurs carte, proches, FAB
    S08-parametres.js   ← Paramètres, préférences appels, son
    S09-obd.js          ← Lecture OBD/GVC des deux comptes post-scénarios
    S10-ai-review.js    ← Envoi des échecs à immat-brain-dialog + fixes
  │
  lib/
    browser.js          ← Setup Playwright (2 contextes, viewport iPhone 14)
    account.js          ← Login, navigation, helpers communs
    obd-bridge.js       ← page.evaluate() → GlobalVerificationCenter.run()
    ai-analyzer.js      ← Envoi payload à immat-brain-dialog, parse réponse
    reporter.js         ← Génération rapport HTML
  │
  report/
    template.html       ← Template rapport
    last-run.html       ← Dernier rapport généré (auto)
```

---

## 4. SCÉNARIOS DE TEST — DÉTAIL

### S01 — Authentification (2 comptes)
```
1. Ouvrir BASE_URL dans contexte A et contexte B
2. A : login avec EMAIL_A / PWD_A
3. B : login avec EMAIL_B / PWD_B
4. Vérifier : profil chargé (plaque, pseudo affichés)
5. Vérifier via OBD-Bridge : S.uid, S.profile.owner_plate non-null chez A et B
✅ PASS si les deux comptes sont connectés et profil visible
```

### S02 — Messages (cœur de l'application)
```
1. A envoie message "TEST-IMMATEST-[timestamp]" à B
2. Vérifier chez B : message visible dans onglet Messages → Reçus
3. Vérifier chez A : message visible dans Envoyés
4. B répond "REPONSE-[timestamp]"
5. Vérifier chez A : réponse reçue
6. Vérifier via MessagesRuntimeDiagnostics : pas d'erreur Realtime
7. Vérifier badge Messages chez B : décrémente après lecture
✅ PASS si 7 vérifications passent
```

### S03 — Signalement véhicule stationné
```
1. A ouvre panneau Signaler → Véhicule stationné
2. A entre la plaque de B, sélectionne "Feux allumés"
3. A envoie le signalement
4. Vérifier chez B : floating card reçue avec bonne plaque
5. B tape "J'arrive" (réponse rapide)
6. Vérifier chez A : réponse "J'arrive" visible
7. Vérifier onglet Activité chez B : signalement dans "Reçus"
8. Vérifier onglet Activité chez A : signalement dans "Envoyés"
✅ PASS si 8 vérifications passent
```

### S04 — Appels (signaling)
```
1. A appelle B (tap sur la plaque de B → Appeler)
2. Vérifier chez B : overlay appel entrant visible (sonnerie)
3. B accepte l'appel
4. Vérifier chez A : overlay "en communication" visible
5. A raccroche
6. Vérifier les deux : overlay fermé
7. Vérifier journal Appels chez A : appel émis visible
8. Vérifier journal Appels chez B : appel reçu/accepté visible
--- SOUS-SCÉNARIO : Refus ---
9. A rappelle B
10. B refuse
11. Vérifier chez A : toast "Appel refusé"
--- SOUS-SCÉNARIO : Manqué ---
12. A rappelle B (B ne décroche pas, timeout)
13. Vérifier chez A : toast "Appel manqué" chez B
✅ PASS si signaling correct (audio Agora non testé — hors périmètre robot)
```

### S05 — Onglet Activité
```
1. Vérifier que les signalements de S03 apparaissent dans Activité
2. Vérifier catégories : Route / Véhicule / Aide / Stationné
3. Vérifier filtres "Reçus" / "Envoyés" fonctionnels
4. Vérifier que les items ont le bon label, la bonne icône
✅ PASS si structure conforme à l'audit PRODUCT_ARCHITECTURE_V2
```

### S06 — Badges
```
1. Avant S02 : noter le badge Messages chez B
2. Après message reçu : badge +1
3. Après lecture : badge revient à 0
4. Même logique pour badge Activité
✅ PASS si compteurs cohérents
```

### S07 — Carte et marqueurs
```
1. Vérifier que le marqueur de A est visible sur la carte de B
2. Vérifier context menu sur marqueur : Message / Signaler / Bloquer
3. Vérifier FAB stack présent
✅ PASS si marqueurs visibles et interactifs
```

### S08 — Paramètres
```
1. Ouvrir Paramètres chez A
2. Vérifier toggle "Recevoir des appels" fonctionne
3. A désactive → B essaie d'appeler → vérifier bloqué avec message approprié
4. A réactive
✅ PASS si préférence respectée
```

### S09 — OBD / GVC lecture globale
```
Après tous les scénarios :
1. Lancer GlobalVerificationCenter.run() chez A et B
2. Lancer MobileAutotest.run() chez A et B
3. Capturer : sections critiques, warnings, actions suggérées
4. Comparer avec baseline (premier run)
✅ PASS si 0 section critique
```

### S10 — Analyse IA des échecs
```
Pour chaque scénario FAIL :
1. Collecter : message d'erreur + état GVC + état OBD + console Playwright
2. Envoyer à immat-brain-dialog (mode='diagnostic')
   Body : { message: "[contexte échec]", mode: "diagnostic", snapshot: {obd, gvc} }
3. Parser la réponse : cause probable + fichier incriminé + fix suggéré
4. Intégrer dans le rapport HTML
```

---

## 5. RAPPORT HTML GÉNÉRÉ

```html
Immatest — Run 2026-06-20 17:30
────────────────────────────────
RÉSUMÉ : 47 vérifications · 44 ✅ PASS · 3 ❌ FAIL · 0 ⚠️ WARN

S01 Auth          ✅ 4/4
S02 Messages      ✅ 7/7
S03 Signalement   ❌ 6/8  ← 2 échecs
S04 Appels        ✅ 11/11
S05 Activité      ✅ 4/4
S06 Badges        ❌ 1/4  ← 1 échec
S07 Carte         ✅ 3/3
S08 Paramètres    ✅ 4/4
S09 OBD/GVC       ✅ 8/8
S10 IA Analyse    ← fixes suggérés

ÉCHECS DÉTAILLÉS :
─────────────────
❌ S03-7 : Signalement absent dans Activité → Reçus chez B
  Cause IA : renderActivityCategoryFeed() non appelé après réception Realtime
  Fix suggéré : appeler schedFeed() dans le handler MSG_RECEIVED du bus
  Fichier : index.html ~ligne 1195

❌ S06-2 : Badge Messages ne s'incrémente pas après réception
  Cause IA : _unreadCount calcul filtre les context_type non null
  Fix suggéré : vérifier le filtre dans computeBadge()
  Fichier : badge.js ~ligne 47
```

---

## 6. PHASES DE CONSTRUCTION

| Phase | Contenu | Effort | Prérequis |
|---|---|---|---|
| **P1 — Fondations** | `runner.js`, `config.js`, `lib/browser.js`, `lib/account.js`, `S01-auth.js` | 3h | .env avec les 2 comptes |
| **P2 — Messages** | `S02-messages.js`, `lib/obd-bridge.js` | 3h | P1 |
| **P3 — Signalement** | `S03-signalement.js` | 3h | P2 |
| **P4 — Appels** | `S04-appels.js` | 2h | P3 |
| **P5 — Activité + Badges** | `S05`, `S06`, `S07`, `S08` | 3h | P4 |
| **P6 — OBD intégration** | `S09-obd.js`, `lib/obd-bridge.js` complet | 2h | P5 |
| **P7 — IA analyser** | `S10`, `lib/ai-analyzer.js` → immat-brain-dialog | 4h | P6 |
| **P8 — Rapport HTML** | `lib/reporter.js`, `report/template.html` | 2h | P7 |

**Total estimé : ~22h de développement**

---

## 7. DÉPENDANCES TECHNIQUES

- **Playwright** : `npm install playwright` (Node.js >= 18)
- **Fichier .env** (non commité) :
  ```
  EMAIL_A=compte1@example.com
  PWD_A=motdepasse1
  EMAIL_B=compte2@example.com
  PWD_B=motdepasse2
  BASE_URL=https://caisse43700-lgtm.github.io/Projet-immat-Connect/
  SUPABASE_URL=...
  ANON_KEY=...
  ```
- **immat-brain-dialog** déjà déployée → utilisée en mode `diagnostic`
- **Viewport** : 390×844 (iPhone 14) pour coller aux tests terrain

---

## 8. CE QU'IMMATEST NE PEUT PAS TESTER

| Limite | Raison | Alternative |
|---|---|---|
| Son Agora (voix réelle) | Pas de micro/HP dans Playwright | Test manuel 2 iPhones |
| Push notifications (app fermée) | SW Push ne s'active pas en automation | Test manuel + logs SW |
| GPS réel | Simulé (coordinates injectées) | Playwright peut injecter des coords fixes |
| Touch gestures complexes | Drag/swipe limité | Tester à la main |

---

## 9. ORDRE DE LANCEMENT RECOMMANDÉ

```bash
# 1. Tests statiques (Node, rapide)
node tests.js

# 2. Immatest complet (Playwright, ~5 min)
node immatest/runner.js

# 3. Ouvrir le rapport
open immatest/report/last-run.html
```

---

*Immatest s'appuie sur : tests.js (177 tests) · GlobalVerificationCenter (8 sections) · MobileAutotest · OBD/ObdSession · immat-brain-dialog (IA) · Playwright (2 contextes)*
