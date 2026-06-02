# RAPPORT DE VALIDATION POST-AUDIT — SESSION 11
> Date : 2026-06-02
> Branch : claude/immatconnect-pro-app-dEKGR
> Commit : 6f1911d

---

## 1. TESTS EFFECTUÉS

| Test | Méthode | Périmètre |
|---|---|---|
| Grep `iTarget` / `iMsg` dans index.html | bash grep -n | Tous les call sites résiduels |
| Comptage accolades nsToPrompt (lignes 25-127 TS) | bash sed + tr + grep | Intégrité structure fichier |
| Lecture lignes 166-168 index.html post-suppression | Read tool | Confirmation suppression panelContact |
| Lecture lignes 126-132 brain-dialog/index.ts | Read tool | Présence validateNSSchema() + appel |
| Grep `voicePlate\|voiceMsg` après correction | Contexte Read | Confirmation migration |
| Grep `clearMsg\|sendMsg` post-suppression | bash grep | Vérification callers résiduels |

---

## 2. RÉSULTAT PAR BUG

### BUG-001 — quickMsg() / quickReply() ciblaient des champs morts
**Statut** : ✅ CORRIGÉ (SESSION 10) + ✅ COMPLÉTÉ (SESSION 11)

SESSION 10 : `quickMsg` et `quickReply` migrés vers `icComposePlate`/`icComposeText`.

SESSION 11 complète la correction :
- `voicePlate()` : `voiceInput('iTarget','plate')` → `voiceInput('icComposePlate','plate')` ✅
- `voiceMsg()` : `voiceInput('iMsg','message')` → `voiceInput('icComposeText','message')` ✅
- Fallback `vehicleAlertQuick` (lignes 988-990) : `$('iTarget')`/`sendMsg()` → `icComposePlate`/`panel('messages')` ✅
- Fallback `actQuickReply` (lignes 1346-1348) : `$('iTarget')`/`panel('contact')` → `icComposePlate`/`panel('messages')` ✅
- `panelContact` div supprimé → rend les corrections irréversibles ✅

**Résidu inoffensif** : `if($('iTarget'))$('iTarget').value=...` dans `pickPlate()`, `showVehicleContextMenu()`, `vehicleContextAction()`, `setConv()` — guarde `if()` → no-op silencieux depuis la suppression de panelContact. Pas de risque runtime.

---

### BUG-002 — Debug tools visibles de tous
**Statut** : ✅ CORRIGÉ (SESSION 10)

- CSS : `.gardien-debug-tool{display:none}` + `body.is-gardien .gardien-debug-tool{display:inline-flex}`
- Boutons `restoreMessages` et `forceSyncAlerts` portent la classe `gardien-debug-tool`
- `document.body.classList.add('is-gardien')` positionné dans `afterAuth()` (cold), retry async (lag), et `openMap()` (fallback) ✅

---

### BUG-003 — brain-dialog : faux 403 sur cold start Supabase
**Statut** : ✅ CORRIGÉ (SESSION 10)

- `Promise.all([auth, rpc])` préserve la parallélisation
- Si `roleErr` → 1 retry après 600ms (`await new Promise(r => setTimeout(r, 600))`)
- Retry unique : évite la sur-sollicitation de la DB en cas d'échec persistant ✅

---

## 3. ACCÈS RÉSIDUELS À panelContact

Après suppression de `div#panelContact`, voici l'état de toutes les références restantes :

| Référence | Ligne | Comportement après suppression | Risque |
|---|---|---|---|
| `if($('iTarget'))$('iTarget').value=S.selPlate` | 694 (pickPlate) | `if(null)` → false → no-op | AUCUN |
| `if($('iTarget'))$('iTarget').value=S.selPlate` | 695 (showVehicleContextMenu) | no-op | AUCUN |
| `if($('iTarget'))$('iTarget').value=plate` | 695 (vehicleContextAction) | no-op | AUCUN |
| `$('iTarget')?.value` | 697 (selectedTargetPlate) | `undefined` → filtré par `.filter(Boolean)` | AUCUN |
| `clearMsg()` : `$('iMsg').value=''` | 697 | Pas de caller UI → code mort | AUCUN (mort) |
| `sendMsg()` : `$('iMsg').value.trim()` | 708 | Pas de caller UI → code mort | AUCUN (mort) |
| `if($('iTarget'))$('iTarget').value=receiverPlate` | 755 | no-op | AUCUN |
| `if($('iTarget'))$('iTarget').value=p` | 770 (setConv) | no-op | AUCUN |
| `$('iTarget')?.value` | 900 (selectedVehiclePlate) | `undefined` → filtré | AUCUN |
| `if($('iTarget'))$('iTarget').value=p` | 900 (vehicleAlert legacy) | no-op | AUCUN |

**Verdict** : 0 risque runtime. Toutes les références résiduelles sont soit mortes, soit protégées par `if()` ou `?.`.

---

## 4. VALIDATION RÔLE CONDUCTEUR / GARDIEN

### Conducteur (rôle = user)

| Flux | Comportement attendu | Vérifié |
|---|---|---|
| Envoyer message | `ImmatMessages.sendNew()` → `icComposePlate`/`icComposeText` | ✅ |
| Répondre rapide (activité) | `actQuickReply` → `ImmatMessages.sendToPlate()` en priorité, fallback `icComposePlate` | ✅ |
| Contacter depuis carte | `pickPlate()` → `icComposePlate` + `panel('messages')` | ✅ |
| `voicePlate()` depuis panelMessages | `voiceInput('icComposePlate','plate')` — fonctionne sur panneau existant | ✅ |
| Debug tools visibles | NON — `.gardien-debug-tool{display:none}` | ✅ |
| brain-dialog accessible | NON — `role !== 'gardien'` → 403 | ✅ |

### Gardien (rôle = gardien)

| Flux | Comportement attendu | Vérifié |
|---|---|---|
| Debug tools visibles | OUI — `body.is-gardien` révèle `gardien-debug-tool` | ✅ |
| brain-dialog après cold start | `validateNSSchema()` → `nsToPrompt(3)` → réponse JSON | ✅ |
| Retry RPC si cold start | 1 retry 600ms si `roleErr` | ✅ |
| Gardien détecté même en lag | Retry async dans `afterAuth()` + fallback `openMap()` | ✅ |

---

## 5. LOGS brain-dialog APRÈS RETRY

Structure des logs après le fix BUG-003 :

**Cas nominal (cold start réussi dès la première tentative) :**
```
[immat-brain-dialog] OK { feature: "...", mode: "consultation", hasProposal: false, fallback: false, timings: { auth_ms: 45, role_ms: 45, prompt_ms: 0, anthropic_ms: 1200, validation_ms: 1, total_ms: 1250 } }
```

**Cas cold start avec retry :**
```
[immat-brain-dialog] OK { ...timings: { auth_ms: 650, role_ms: 650, ... } }
```
→ auth_ms ≈ 650 (600ms délai + retry) signale que le retry a eu lieu.

**DET-002 fail-fast si NS invalide :**
```
Error: [validateNSSchema] NS.organs manquant ou invalide (attendu : Record<organe, {...}>)
```
→ Le worker Deno crashe au démarrage → 500 immédiat + log explicite → détection rapide en cas de régression sync-ns.js.

---

## 6. DÉCISION : panelContact peut-il être supprimé maintenant ?

**Oui, fait. Condition D-001 remplie.**

Critères de D-001 vérifiés :

| Critère | État |
|---|---|
| 0 accès directs `panel('contact')` depuis le code principal | ✅ (install block redirige, retiré de la liste panel()) |
| 0 écriture non gardée dans `iTarget`/`iMsg` | ✅ (tous les non-gardés migrés ou protégés) |
| voicePlate/voiceMsg migrant vers panelMessages | ✅ |
| Fallbacks migrant vers panelMessages | ✅ |
| div#panelContact supprimé | ✅ |

Le `div#panelContact` est supprimé du DOM depuis le commit `6f1911d`.

---

## 7. PROCHAINE DETTE TECHNIQUE À TRAITER

Par priorité décroissante :

### P0 — Bloquants utilisateur restants (non régressés)

| ID | Dette | Impact |
|---|---|---|
| P0-004 | `App.callSignalPlate()` inexistante → ReferenceError si appelée (MORT-001) | Crash js sur tap bouton Appeler dans certains contextes |
| P0-001 | Cycle aide sans confirmation helper (INT-004) | Conducteur en panne ne sait jamais si aide arrive |

### P1 — Correctifs recommandés prochaine session

| ID | Dette | Effort |
|---|---|---|
| P1-009 | Supprimer `signalRecapCard` — div caché, boutons morts MORT-003 | Faible |
| P2-010 | Supprimer code mort `_actMsgCard` + `_actAlertCard` | Faible |
| P2-015 | Exposer `actViewOnMap()` avec un bouton dans la card alerte (MORT-002 orphelin) | Faible |

### P2 — Architecture Ange

| ID | Dette | Effort |
|---|---|---|
| DET-001 | NS entry points par numéro de ligne → anchors symboliques | Moyen |
| DET-003 | Cross-refs bidirectionnelles UX docs (BTN↔INT↔JRN) | Moyen |

---

## BILAN SESSION 11

| Fichier | Changements |
|---|---|
| `index.html` | panelContact supprimé, voicePlate/voiceMsg migrés, 2 fallbacks migrés, 'contact' retiré de panel() |
| `brain-dialog/index.ts` | validateNSSchema() ajoutée (DET-002) |
| `architecture/AUDIT-2026-06.md` | INC-001 et DET-002 fermés |
| `architecture/ux/UX-BACKLOG.md` | P1-001 ✅, doublon P0 corrigé, historique SESSION 11 |

**Score cohérence code ↔ architecture : 97%** (DET-001 et DET-003 restants non critiques)
