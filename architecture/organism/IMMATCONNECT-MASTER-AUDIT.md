# Amélioration Navigation Fonctionnalités

# IMMATCONNECT — MASTER AUDIT

> SESSION 30 — Consolidation finale · Audit exhaustif
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## MÉTHODE

Lecture complète de :
- `immat-nervous-system.json` (ADN _v:8)
- `core/invariants.js` (Constitution INV-001→INV-015)
- `knowledge/*.json` (10 fichiers référentiel)
- `architecture/IMMAT-FLOW-INDEX.json` (5 flows)
- `index.html`, `messages.js`, `ui.js`, `badge.js`, `calls.js`

---

## 1 — CONFORME ✅

### Source de vérité — hiérarchie respectée

| Niveau | Fichier | Statut |
|---|---|---|
| ADN | `immat-nervous-system.json` _v:8 | ✅ Source unique |
| Constitution | `core/invariants.js` INV-001→INV-015 | ✅ deepFrozen |
| NS | `supabase/functions/_shared/nervous-system.ts` | ✅ Dérivé via sync-ns.js |
| Référentiel | `knowledge/*.json` | ✅ Dérivé via sync-knowledge.js |
| Ange | `immat-brain-dialog/index.ts` | ✅ Lit NS + knowledge, ne possède rien |

Aucun doublon. Aucun référentiel parallèle.

### Ange — principes respectés

- `ange_identity` documenté dans ADN ✅
- Ange ne stocke pas d'état applicatif ✅
- Ange ne modifie jamais le DOM directement ✅
- `requiresGuardianValidation` contrôle l'accès ✅

### Cinq sens — formalisés dans ADN _v:8

| Sens | Phase | Statut |
|---|---|---|
| voir | 1 | ✅ Actif |
| entendre | 1 | ✅ Actif |
| goûter | 2 | ✅ Défini — non câblé prod |
| toucher | 3 | ✅ Défini — surface seulement |
| sentir | 4 | ✅ Actif dans Ange uniquement |

### Flows organiques — 5 flows présents

`FLOW-MAP-SELF-MARKER` · `FLOW-VEHICLE-ALERT` · `FLOW-ASSIST-REQUEST` · `FLOW-DIRECT-MESSAGE` · `FLOW-BADGES` ✅

### Décisions techniques — toutes vérifiées dans le code

| Session | Décision | Vérification code |
|---|---|---|
| S21 | `_actMsgCard` supprimé | ✅ Absent de index.html |
| S21 | `_actAlertCard` supprimé | ✅ Absent de index.html |
| S21 | `topMsgBadge` supprimé | ✅ Absent de index.html, badge.js, messages.js, ui.js |
| S23 | `S.tapLat` / `S.tapLng` | ✅ Présents ligne 753-754 |
| S23b | `clearSignalHereContext()` | ✅ Présent ligne 752 |
| S23b | Guard panelDrive dans `showSignalHere()` | ✅ Présent ligne 753 |
| S23b | Timer → `clearSignalHereContext` | ✅ Présent ligne 759 |
| S23b | `closeOverlay('reportPanel')` → clear | ✅ Présent ligne 870 |
| S26 | `badge.js` → `||` (BUG-001) | ✅ Corrigé |
| S26 | `km()` haversine (BUG-003) | ✅ Corrigé |
| S26 | `alertsPanel` absent de `ui.js` (MORT-001) | ✅ Absent |
| S28 | DA-004 — filtre bloqués dans `normalizeRows()` | ✅ Présent ligne 174 |
| S29 | DEC-007 — statuts `seen/present/gone/resolved` distincts | ✅ Non unifiés |

### Orientation mentale — invariant UX respecté

Carte = Maintenant · Activité = Passé · Messages = Communication ✅
Aucune fusion des rôles dans le code ou le référentiel.

---

## 2 — À COMPLÉTER

### 2a — 5 intentions manquantes dans `intentions.json`

Le référentiel documente 10 intentions. Les décisions validées en identifient 12. Manquent :

| Intention | ID proposé | Chemin UX existant |
|---|---|---|
| Confirmer un danger | `INT-CONFIRM-DANGER` | Activité → card alerte → "Toujours là" (`actConfirmAlert('present')`) |
| Dire que c'est terminé | `INT-RESOLVE-ALERT` | Activité → "Disparu" / "Résolu" (`actConfirmAlert('gone'/'resolved')`) |
| Aider quelqu'un | `INT-HELP-DRIVER` | FloatingCard / Activité → "✋ J'arrive" (`actHelpReply()`) |
| Comprendre l'environnement | `INT-UNDERSTAND-ENV` | Carte + Activité (composite) |
| Se sentir en sécurité | `INT-FEEL-SAFE` | Mode invisible + SOS (composite) |

**Note** : "Retrouver une information" est couvert par `INT-CHECK-ACTIVITY` enrichi. "Être prévenu" est passif (réception temps réel) — pas de chemin dédié.

**Action SESSION 30** : ces 5 intentions sont ajoutées dans `intentions.json` (_v:4).

### 2b — Règles organiques et boucles vitales absentes des JSONs

Les 10 règles organiques et 7 boucles vitales décidées dans `DECISIONS-FINALES-CONSOLIDEES.md` n'existaient pas dans les fichiers sources.

**Action SESSION 30** :
- Créées dans `architecture/organism/ORGANISM-RULES.json` ✅
- Ajoutées dans `knowledge/decisions.json` (_v:4) ✅
- Auto-générées dans `knowledge-gardien.ts` via sync-knowledge.js ✅

### 2c — 1 PRIM manquant dans `intentions_primaires`

"Proposer mon aide" n'avait pas de PRIM correspondant.

**Action SESSION 30** : PRIM-007 ajouté.

---

## 3 — À CORRIGER

**Aucune régression code détectée.** Toutes les décisions techniques de SESSION 21 à 29 sont implémentées et conformes.

---

## 4 — À NE JAMAIS MODIFIER

| Élément | Raison |
|---|---|
| `immat-nervous-system.json` directement | Passe par `scripts/sync-ns.js` → `nervous-system.ts` |
| `core/invariants.js` INV-001→INV-015 | Constitution — deepFrozen en production |
| `supabase/functions/_shared/nervous-system.ts` | Dérivé ADN via sync — INV-015 |
| `supabase/functions/_shared/knowledge-*.ts` | Dérivés knowledge/ via sync — INV-015 |
| Hiérarchie ADN→Constitution→NS→Référentiel | Source unique — toute duplication crée une divergence |
| Statuts alertes `seen/present/gone/resolved` | DEC-007 clos — sémantiques distinctes protégées |
| `canResolveAlert()` logique créateur | Protection créateur uniquement — INV-002 |
| `setUnreadMsgCount` dans `index.html` inline | BUG-001 — version avec `updateActBadge()` prioritaire sur badge.js |

---

## 5 — RISQUES RÉSIDUELS

| Risque | Niveau | Mitigation existante |
|---|---|---|
| DA-004 cross-device | Faible | ic_blocked localStorage — acceptable mono-appareil |
| `migration_calls_v2.sql` présent dans le dépôt | Faible | Fichier SQL non exécuté, non référencé dans le code |
| FAB guard panelDrive = UI uniquement | Faible | Guard `classList.contains('on')` — pas de protection serveur, mais signalement reste valide |
| Boucle APPRENTISSAGE portée uniquement par Ange | Moyen | Si Ange est désactivé, onboarding absent. Onboarding overlay présent mais pas encore guidé. |
| Intentions composites sans CTA dédié | Faible | INT-UNDERSTAND-ENV et INT-FEEL-SAFE documentées, non bloquantes |

---

## BILAN FINAL

| Axe | Score |
|---|---|
| Source de vérité unique | 10/10 |
| Décisions techniques respectées | 10/10 |
| Intentions conducteur couvertes | 10/12 → 12/12 après SESSION 30 |
| Règles organiques formalisées | 0/10 → 10/10 après SESSION 30 |
| Boucles vitales formalisées | 0/7 → 7/7 après SESSION 30 |
| Ange non-autonome | 10/10 |
| Cinq sens cohérents | 10/10 |
| Références parallèles | 0 détecté |
| Dette technique critique | 0 |
| **Dette de compréhension** | **À surveiller en permanence** |
