# Amélioration Navigation Fonctionnalités

# SESSION 36c — Audit Ange Conducteur / Gardien — 8 Axes
**Date :** 2026-06-03  
**Fichiers audités :**
- `index.html` lignes 1915–2037 (AngeDialog frontend)
- `supabase/functions/immat-brain-dialog/index.ts` (backend Edge Function)
- `supabase/functions/_shared/knowledge-conducteur.ts`
- `supabase/functions/_shared/knowledge-gardien.ts`

**Méthode :** Preuves observées dans le code. Aucune hypothèse théorique.

---

## AXE 1 — FIL DE DISCUSSION

### Stockage historique

**Preuve (index.html:1998–1999) :**
```javascript
const _hKey='ic_ange_history';
const _history=JSON.parse(sessionStorage.getItem(_hKey)||'[]');
```
→ Stockage dans **sessionStorage** (pas localStorage).

### Récupération et envoi

**Preuve (index.html:2014) :**
```javascript
history:_history.slice(-6)
```
→ Transmis à chaque appel. Max 6 messages envoyés.

### Sauvegarde après réponse

**Preuve (index.html:2023–2026) :**
```javascript
_history.push({role:'user',content:msg.slice(0,300)});
_history.push({role:'assistant',content:_respTxt});
while(_history.length>6)_history.shift();
sessionStorage.setItem(_hKey,JSON.stringify(_history));
```
→ Deux entrées poussées. Dépassement > 6 = shift. Sauvegardé immédiatement.

### Test Q1→Q2

Q1 "Comment signaler un danger ?"  
→ _history après R1 : `[{role:'user',content:'Comment signaler...'},{role:'assistant',content:'...'}]`

Q2 "Et si je veux le faire à un endroit précis ?"  
→ _history transmis = `[Q1, R1]` → Claude voit le contexte → "le faire" = signaler un danger → ✅

### Problème détecté

**sessionStorage est volatile.**  
Elle est effacée lors du rafraîchissement de page ou de la fermeture de l'onglet.  
Conséquence : si le conducteur rafraîchit entre deux questions, l'Ange n'a plus de contexte.  
Il ne répond pas mal — il répond sans mémoire des échanges précédents.

`ic_ange_feedback` est en localStorage (ligne 1971). `ic_ange_history` est en sessionStorage. **Le choix est asymétrique sans explication.**

**Tronquage asymétrique (observation secondaire) :**
- Question envoyée : `msg.slice(0,300)` (frontend) puis `m.content.slice(0,400)` (backend) → effectivement 300 chars
- Réponse stockée : `_respTxt=(data.juste||data.sources||'').slice(0,400)` → 400 chars
- Une question longue est plus tronquée que la réponse correspondante

---

## AXE 2 — CONDUCTEUR

### Prompt reçu

**Preuve (index.ts:135) :**
```typescript
const STATIC_SYSTEM_CONDUCTEUR = nsToPrompt(1) + '\n\n' + KNOWLEDGE_CONDUCTEUR;
```

**nsToPrompt(1) — contenu exact (index.ts:102–106) :**
```typescript
const serves = (o.serves ?? []).length ? `serves:[...]` : '';
const sees   = (o.level_1?.what_user_sees ?? []).join(' | ');
return `${name} [${keywords}] ${serves}\n  voit : ${sees}`;
```
→ Seul `what_user_sees` + `serves`. Aucun `entry`, `constraints`, `deps`, `failure_modes`.

**Sections techniques absentes (index.ts:110–112) :**
```typescript
const technicalSections = depth === 3
  ? `\nINHIBITIONS :\n...INVARIANTS :\n...`
  : '';
```
→ Vide à depth 1.

**KNOWLEDGE_CONDUCTEUR (knowledge-conducteur.ts) :**
Contient : tutoriels pas-à-pas (TUT-001→010), intentions (INT-001→008), features (F-CARTE→F-ANGE), interactions.  
Ne contient pas : fichier:ligne, variables `S.xxx`, invariants `INV-xxx`, inhibitions, constraints.

**FORMAT du prompt conducteur (index.ts:116) :**
```
FORMAT — JSON VALIDE UNIQUEMENT. 80 mots maximum.
CHAMPS OBLIGATOIRES : "juste" · "question"
CHAMPS SELON PERTINENCE : "vois" · "options"
```
→ `route`, `invariants`, `proposal`, `vigilance`, `sources` ne sont pas mentionnés.

### Test "Où est le code du GPS ?"

Claude reçoit depth 1 qui contient :
```
panelDrive [gps, nav, route, ...] serves:[ORIENTATION, AIDE]
  voit : barre recherche destination | boutons localiser / stop / alertes
```
→ Aucune entrée de code. Aucun fichier. Claude ne peut pas répondre avec une référence technique car elle n'est pas dans son contexte.

### Problème détecté (rendu frontend)

**Preuve (index.html:1944) :**
```javascript
if(r.proposal?.rule){html+=`<div>📋 Proposition · ${esc(r.proposal.id||'')}...`;}
```
→ `renderResponse()` affiche `proposal.rule` **sans vérification du rôle** côté frontend.  
Si un conducteur recevait un `proposal` (ne devrait pas arriver avec depth 1), le frontend l'afficherait.  
Protection actuelle : uniquement côté backend (depth 1 ne demande pas `proposal`).

---

## AXE 3 — GARDIEN

### Prompt reçu

**Preuve (index.ts:134) :**
```typescript
const STATIC_SYSTEM_GARDIEN = nsToPrompt(3) + '\n\n' + KNOWLEDGE_GARDIEN;
```

**nsToPrompt(3) — contenu (index.ts:79–88) :**
- `entry` — points d'entrée fonctions (ex. `App.vehicleAlert`)
- `constraints` — contraintes invariants
- `deps` — dépendances inter-organes
- `serves` — boucles vitales
- `failure_modes` (2 premiers)
- Section INHIBITIONS complète : `S._authRunning`, `S._reporting`, `S._recalcLock`
- Section INVARIANTS complète : `INV-001` → `INV-015` avec severity
- Traversée obligatoire : `Signal→routing→organe→deps→entry→constraints`

**KNOWLEDGE_GARDIEN (knowledge-gardien.ts) :**
- Fichiers clés avec lignes (`index.html:804`, etc.)
- Points d'entrée par organe (`App.afterAuth (~507)`)
- 14 règles organiques (INTENT_FIRST → REALITY_OVER_DOCUMENTATION)
- 7 boucles vitales avec features associées
- 5 flux organiques (FLOW-MAP-SELF-MARKER, FLOW-VEHICLE-ALERT, FLOW-ASSIST-REQUEST, FLOW-DIRECT-MESSAGE, FLOW-BADGES) avec code + state + validation
- Protocole modification 5 règles
- Tensions architecturales
- Historique décisions S8→S35

**Test "Où est implémenté le GPS ?"**  
Claude reçoit :
```
panelDrive [gps, nav, route, ...]
  App.searchGps@~604 · App.locate@~557 · constraints:INV-014
  deps:[geo_api, Leaflet] serves:[ORIENTATION, AIDE, RETENTION]
  ⚠ géolocalisation refusée — fallback carte statique / recalcul auto bloqué si _recalcLock
```
→ Référence fichier + fonctions + contraintes + dépendances → réponse technique possible. ✅

**Max tokens gardien :** 800 (ligne 317) vs 400 conducteur → gardien peut développer davantage.

---

## AXE 4 — SÉPARATION DES RÉFÉRENTIELS

### Sélection du prompt

**Preuve (index.ts:274–276) :**
```typescript
const isGardien = !roleErr && role === 'gardien';
const depth: 1 | 2 | 3 = role === 'gardien' ? 3 : role === 'protecteur' ? 2 : 1;
const staticSystem = isGardien ? STATIC_SYSTEM_GARDIEN : STATIC_SYSTEM_CONDUCTEUR;
```
→ Sélection stricte. Deux branches disjointes.

### Cas de contamination croisée

**Conducteur reçoit contenu gardien ?**  
→ Seulement si `role === 'gardien'`. Rôle lu depuis DB via `sb.rpc('get_my_role')`.  
Si get_my_role() échoue (roleErr=true) :
```typescript
const isGardien = !roleErr && role === 'gardien';  // false
const depth = role === 'gardien' ? 3 : ...1;  // 1
```
→ Fallback vers conducteur. **Échec de rôle = dégradation sécurisée vers conducteur.** ✅

**Gardien reçoit contenu conducteur ?**  
→ Non. Si rôle=`gardien`, isGardien=true, STATIC_SYSTEM_GARDIEN utilisé. Pas de mélange.

**Peuvent-ils être mélangés ?**  
→ STATIC_SYSTEM_CONDUCTEUR et STATIC_SYSTEM_GARDIEN sont des constantes calculées au démarrage de la function Edge (lignes 134–135). Immuables pendant l'exécution. **Pas de mélange possible.**

---

## AXE 5 — VALIDATION DE SORTIE

### Champs forcés par le serveur

**requiresGuardianValidation (index.ts:171) :**
```typescript
requiresGuardianValidation: isGardien,  // forcé — Claude ne peut pas l'altérer
```

**proposal.requiresGuardianValidation (index.ts:212) :**
```typescript
requiresGuardianValidation: true,  // toujours true dans proposal
```

### Champs techniques non strippés pour conducteur

**Preuve (index.ts:176–220) :**
Les champs `vois`, `juste`, `suppose`, `vigilance`, `invariants`, `route`, `options`, `proposal` sont ajoutés **si présents dans la réponse Claude** — sans distinction de rôle.

```typescript
if (typeof parsed.vois   === 'string' && parsed.vois.trim())    result.vois      = parsed.vois;
if (hasJuste)                                                     result.juste     = parsed.juste;
if (Array.isArray(parsed.suppose)    && parsed.suppose.length)  result.suppose   = parsed.suppose;
if (Array.isArray(parsed.vigilance)  && parsed.vigilance.length) result.vigilance = parsed.vigilance;
if (Array.isArray(parsed.invariants) && parsed.invariants.length) result.invariants = parsed.invariants;
// ... route, options, proposal aussi
```

**Protection actuelle :** passive uniquement. Claude ne génère pas ces champs avec depth 1 car le FORMAT ne les mentionne pas.  
**Gap :** si Claude hallucine `route` ou `proposal` malgré depth 1, ils atteindraient le conducteur.

### Correctif minimal identifié

```typescript
// Après construction de result, dans validateOutput()
if (!isGardien) {
  delete result.route;
  delete result.proposal;
  delete result.invariants;
  delete result.vigilance;
}
```
→ 4 lignes. Défense en profondeur. Zéro impact sur le flux normal.

---

## AXE 6 — TEST DE MÉMOIRE

### Simulation Q1→Q2→Q3

**Q1 "Je suis en panne."**  
_history avant envoi : `[]`  
_history après R1 : `[{user:"Je suis en panne."},{assistant:"..."}]`

**Q2 "Je suis sur l'autoroute."**  
_history transmis au backend : `[Q1, R1]`  
Claude voit : contexte panne. Enrichit avec : autoroute.  
_history après R2 : `[Q1, R1, Q2, R2]`

**Q3 "Que dois-je faire ?"**  
_history transmis : `[Q1, R1, Q2, R2]`  
Claude voit : conducteur en panne sur l'autoroute → répond avec SOS, demande d'aide, appel d'urgence.

**Verdict :** la mémoire de 3 échanges fonctionne correctement dans une session. ✅

**Rupture de contexte identifiée :**  
Si le conducteur ferme l'onglet ou rafraîchit la page entre Q2 et Q3 :  
sessionStorage effacée → _history = `[]` → Q3 "Que dois-je faire ?" sans contexte → Ange répond sur l'usage général.

---

## AXE 7 — TEST DE SURVIE

### Si KNOWLEDGE_CONDUCTEUR disparaît

```typescript
import { KNOWLEDGE_CONDUCTEUR } from '../_shared/knowledge-conducteur.ts';
```
→ Import Deno. Fichier absent = **erreur d'import au démarrage** → Edge Function entière refuse de démarrer → toutes les requêtes retournent 500.  
Pas de dégradation gracieuse. Ange totalement inactif.

### Si KNOWLEDGE_GARDIEN disparaît

Même comportement : import échoue → 500 pour toutes les requêtes, y compris conducteur.  
**Un fichier manquant côté gardien bloque aussi les conducteurs.**

### Si history est absent

**Preuve (index.ts:292–293) :**
```typescript
const rawHistory = Array.isArray(body.history) ? body.history : [];
```
→ Fallback `[]`. Appel réussi. Ange répond sans contexte. **Aucun crash.**

### Si role est absent (get_my_role retourne null ou erreur)

**Preuve (index.ts:274) :**
```typescript
const isGardien = !roleErr && role === 'gardien';  // false si roleErr
const depth = role === 'gardien' ? 3 : role === 'protecteur' ? 2 : 1;  // 1 si role=null
```
→ Fallback conducteur (depth 1). **Dégradation sécurisée.** ✅

### Résumé survie

| Cas | Comportement | Sécurisé ? |
|---|---|---|
| KNOWLEDGE_CONDUCTEUR absent | 500 — tous les appels bloqués | Non — ANGE_SURVIVAL_TEST non satisfait |
| KNOWLEDGE_GARDIEN absent | 500 — tous les appels bloqués | Non — même impact |
| history absent | Appel normal sans contexte | ✅ |
| role absent | Fallback conducteur | ✅ |

**Risque AXE 7 documenté :** si l'un des deux fichiers knowledge est corrompu ou absent, l'Ange entier tombe. Pas de fallback partiel. L'import direct est la cause.

---

## AXE 8 — REALITY_OVER_DOCUMENTATION

### Ce que le conducteur ressent réellement

**Aide d'Ange :**  
`renderResponse()` affiche `r.juste||r.sources` via `esc(main)` — texte brut. 80 mots max côté backend.  
→ Réponse visible, lisible, sans jargon. ✅  
Le TTS `speak(_tts, false)` lit la réponse si `S.voice=true` (ligne 1964). ✅

**Continuité de la conversation :**  
Pendant la session = ✅ fonctionnelle.  
Après rafraîchissement = ❌ perdue. sessionStorage volatile.  
Perception conducteur : "L'Ange a oublié." — documenté comme session, vécu comme bug.

**Simplicité :**  
80 mots max. Texte pur. Pas de markdown affiché. ✅  
Exception : si `r.options` existe, 3 options maximum sont rendues avec labels et bénéfices/risques. Potentiellement plus riche qu'attendu pour un conducteur.

### Ce que le Gardien ressent réellement

**Accès au référentiel :**  
KNOWLEDGE_GARDIEN contient 252 lignes de données techniques. Si le Gardien pose une question sur un organe, les flows, les invariants → les données sont là. ✅

**Liens avec les organes :**  
`ORGANES — POINTS D'ENTRÉE CODE` dans KNOWLEDGE_GARDIEN : 6 organes avec fonctions + lignes approximatives. ✅

**Liens avec les flows :**  
5 flows dans KNOWLEDGE_GARDIEN avec code (function names) + state (variables S.xxx) + validation. ✅

**Liens avec les invariants :**  
INV-001→INV-015 dans le prompt depth 3 (nsToPrompt) ET dans KNOWLEDGE_GARDIEN. ✅

**Nuance réelle :**  
Le Gardien voit les invariants et flows **dans son prompt système** — mais la réponse est limitée à 150 mots (FORMAT gardien, index.ts:117). Une réponse exhaustive nécessiterait plusieurs échanges. Le contexte est là, la fenêtre de sortie est contrainte.

---

## Synthèse

### Conforme

| Point | Preuve |
|---|---|
| Séparation conducteur/gardien | isGardien strict · deux STATIC_SYSTEM séparés · depth 1 vs 3 |
| Conducteur sans technique | depth 1 = level_1 uniquement · KNOWLEDGE_CONDUCTEUR = 100% UX |
| Gardien accès complet | depth 3 = entry+constraints+deps+inhibitions+invariants · KNOWLEDGE_GARDIEN complet |
| history transmis | _history.slice(-6) dans body · injecté avant message courant |
| Fallback sécurisé | role absent → conducteur · history absent → sans contexte |
| Mémoire dans une session | Q1→Q2→Q3 fonctionnel (3 échanges) |

### Problèmes détectés

| # | Axe | Problème | Sévérité |
|---|---|---|---|
| P-01 | AXE 1 | sessionStorage volatile — historique perdu au rafraîchissement | Moyenne |
| P-02 | AXE 1 | Tronquage asymétrique — questions à 300 chars, réponses à 400 chars | Faible |
| P-03 | AXE 5 | validateOutput ne supprime pas route/proposal/invariants/vigilance pour conducteur | Faible |
| P-04 | AXE 2 | renderResponse affiche proposal.rule sans guard de rôle frontend | Faible |
| P-05 | AXE 7 | Import KNOWLEDGE_CONDUCTEUR/GARDIEN — absence = 500 global, ANGE_SURVIVAL_TEST non satisfait | Moyenne |

### Risques détectés

| # | Risque | Mitigation actuelle |
|---|---|---|
| R-A | Claude hallucine route/proposal pour conducteur | Aucune — protection passive uniquement (depth 1 ne les demande pas) |
| R-B | sessionStorage perdue = "Ange amnésique" perçu | Aucune — documenté comme session, pas comme bug |
| R-C | Fichier knowledge corrompu = Ange totalement inactif | Aucune — pas de fallback à l'import |

### Corrections minimales nécessaires

**CORRECTION 1 — AXE 5 — 4 lignes dans validateOutput() (index.ts)**
```typescript
// après construction de result, avant return result
if (!isGardien) {
  delete result.route;
  delete result.proposal;
  delete result.invariants;
  delete result.vigilance;
}
```
Bénéfice : défense en profondeur contre hallucination Claude. Zéro impact flux normal.

**CORRECTION 2 — AXE 1 — localStorage pour ic_ange_history (index.html)**  
Remplacer `sessionStorage` par `localStorage` pour `ic_ange_history`.  
Bénéfice : historique conservé entre rafraîchissements.  
Contre-argument : sessionStorage peut être un choix délibéré de confidentialité (historique disparaît à fermeture onglet). **À valider par le Gardien.**

### Verdict final

| Critère | Verdict |
|---|---|
| Séparation Conducteur/Gardien | ✅ Fiable — rôle DB + depth + knowledge strictement séparés. Fallback sécurisé si erreur rôle. |
| Mémoire conversationnelle | ⚠️ Partielle — fiable dans une session ouverte. Perdue au rafraîchissement (sessionStorage). |
| Fuite d'informations techniques | ✅ Pas de fuite active — depth 1 ne contient aucune donnée technique. Défense passive seulement (gap mineur AXE 5). |
| Référentiel correctement exploité | ✅ Complet pour le Gardien — 14 règles, 7 boucles, 5 flows, 15 invariants, références fichier:ligne. |
