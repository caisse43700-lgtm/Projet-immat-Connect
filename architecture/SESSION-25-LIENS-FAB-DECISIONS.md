# Amélioration Navigation Fonctionnalités

> SESSION 25 — Liens opérationnels + DA-FAB-004 + DA-FAB-007
> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## CE QUI A ÉTÉ FAIT

### 1 — SESSION 25 : Ponts INTENTION → TUTORIAL + INTERACTION + FLOW

**Problème** : Les intentions, tutoriels, interactions et flows existaient mais ne se connaissaient pas.
Ange devait chercher par correspondance textuelle plutôt que par référence directe.

**Solution** : Champ `liens` ajouté dans chaque intention de `intentions.json` (_v:3).

```json
{
  "id": "INT-CONTACT-DRIVER",
  "chemin": "carte → marqueur → Envoyer message...",
  "liens": { "tutorial": "TUT-005", "interaction": "INT-001" }
}
```

**Résultat dans `knowledge-conducteur.ts`** (+12 lignes) :
```
## RESSOURCES PAR INTENTION
INT-CONTACT-DRIVER : 📚 TUT-005 (Envoyer un message à un conducteur) | ↔️ INT-001 (Message direct) | ⚙️ FLOW-DIRECT-MESSAGE
INT-SIGNAL-VEHICLE : 📚 TUT-003 (Prévenir un conducteur...) | ↔️ INT-002 (Alerte véhicule) | ⚙️ FLOW-VEHICLE-ALERT
INT-REQUEST-HELP   : 📚 TUT-004 (Demander de l'aide) | ↔️ INT-004 (Demande d'aide) | ⚙️ FLOW-ASSIST-REQUEST
INT-SIGNAL-ROAD    : 📚 TUT-002 (Signaler un danger sur la route) | ↔️ INT-003 (Signalement route)
INT-LOCATE-SELF    : 📚 TUT-001 (Localiser ma voiture sur la carte) | ⚙️ FLOW-MAP-SELF-MARKER
INT-NAVIGATE       : 📚 TUT-006 (Chercher un itinéraire)
INT-SOS            : 📚 TUT-007 (Déclencher le SOS)
INT-CHECK-ACTIVITY : 📚 TUT-008 (Voir mon activité et mes messages) | ⚙️ FLOW-BADGES
INT-MANAGE-PROFILE : 📚 TUT-009 (Passer en mode invisible)
```

**Résultat dans `knowledge-gardien.ts`** (+13 lignes) :
```
INTENTION → FLOW + TUTORIAL (diagnostic rapide) :
INT-SIGNAL-VEHICLE      FLOW-VEHICLE-ALERT      TUT-003
INT-SIGNAL-ROAD         —                       TUT-002
INT-REQUEST-HELP        FLOW-ASSIST-REQUEST     TUT-004
INT-CONTACT-DRIVER      FLOW-DIRECT-MESSAGE     TUT-005
INT-LOCATE-SELF         FLOW-MAP-SELF-MARKER    TUT-001
INT-NAVIGATE            —                       TUT-006
INT-SOS                 —                       TUT-007
INT-CHECK-ACTIVITY      FLOW-BADGES             TUT-008
INT-ASK-ANGE            —                       —
INT-MANAGE-PROFILE      —                       TUT-009
```

**Aucun fichier nouveau. Aucune logique nouvelle. Zéro dette créée.**

---

### 2 — DA-FAB-004 : Avertissement si signalement éloigné (> 10 km)

**Choix** : Option C — Avertissement non bloquant.

**Pourquoi** :
- Option A (libre) = risque de pollution de carte
- Option B (blocage) = frustrant si GPS inactif et signalement intentionnel
- Option C (avertissement) = préserve la liberté, informe le conducteur, laisse passer

**Correctif dans `roadReport(type)`** :

```javascript
// AVANT
const rLat=S.tapLat??S.myLat, rLng=S.tapLng??S.myLng;
S.tapLat=null; S.tapLng=null;
if(rLat===null){ ... }

// APRÈS
const rLat=S.tapLat??S.myLat, rLng=S.tapLng??S.myLng;
S.tapLat=null; S.tapLng=null;
if(rLat!==null&&S.myLat!==null){
  const _dKm=Math.hypot(rLat-S.myLat,rLng-S.myLng)*111;
  if(_dKm>10) toast('📍 Signalement à '+Math.round(_dKm)+' km de votre position.','warn');
}
if(rLat===null){ ... }
```

**Comportement** :
- Distance calculée uniquement si GPS actif et coordonnées tap présentes
- Seuil : 10 km (approximation haversine rapide : `Math.hypot * 111`)
- Toast `warn` (orange) — non bloquant — le signalement passe quand même
- Si GPS inactif (`S.myLat===null`) : pas de calcul, pas d'avertissement

---

### 3 — DA-FAB-007 : FAB désactivé en mode conduite

**Choix** : Option A — Désactivé quand `panelDrive` est actif.

**Pourquoi** :
- Option B (réduit) = pas assez clair, le conducteur voit encore le FAB
- Option C (inchangé) = risque distraction confirmé
- Option A = règle simple, univoque, sans ambiguité

**Correctif dans `showSignalHere(e)`** :

```javascript
// AVANT
showSignalHere(e){
  S.tapLat=e.latlng.lat; S.tapLng=e.latlng.lng;
  ...

// APRÈS
showSignalHere(e){
  if($('panelDrive')?.classList.contains('on')) return;
  S.tapLat=e.latlng.lat; S.tapLng=e.latlng.lng;
  ...
```

**Comportement** :
- Si `panelDrive` est le panneau actif → clic droit ignoré silencieusement
- Si l'utilisateur ferme panelDrive et revient sur la carte → FAB réactivé normalement
- Aucun toast (l'absence de réponse est suffisamment claire en mode conduite)

---

## FICHIERS MODIFIÉS

| Fichier | Modification |
|---|---|
| `knowledge/intentions.json` | _v:3 — champ `liens` sur les 10 intentions |
| `scripts/sync-knowledge.js` | Section `## RESSOURCES PAR INTENTION` (conducteur) + `INTENTION → FLOW + TUTORIAL` (gardien) |
| `supabase/functions/_shared/knowledge-conducteur.ts` | Régénéré (116 lignes, +12) |
| `supabase/functions/_shared/knowledge-gardien.ts` | Régénéré (211 lignes, +13) |
| `index.html` | DA-FAB-004 : avertissement distance > 10km dans roadReport() |
| `index.html` | DA-FAB-007 : guard panelDrive dans showSignalHere() |

---

## DÉCISIONS RESTANTES

| ID | Question | Statut |
|---|---|---|
| DA-FAB-004 | Signalement éloigné | ✅ Résolu (Option C — avertissement 10km) |
| DA-FAB-007 | FAB en mode conduite | ✅ Résolu (Option A — désactivé si panelDrive actif) |
| DA-004 | ic_blocked : DB ou localStorage ? | ⏳ Session dédiée |
| DEC-007 | Unifier statuts alertes → 3 statuts | ⏳ Session dédiée |

---

## COMMITS

```
feat(session25): liens intentions → tutorials + interactions + flows
fix(da-fab-004): avertissement toast si signalement > 10km du GPS
fix(da-fab-007): FAB désactivé quand panelDrive actif
```

---

## ÉTAT DES PROJECTIONS ANGE

```
knowledge-conducteur.ts : 116 lignes (+12 depuis SESSION 24)
knowledge-gardien.ts    : 211 lignes (+13 depuis SESSION 24)
```

Ange sait maintenant : pour chaque intention détectée, quelle ressource citer,
quel flow chercher, quel tutoriel proposer — sans chercher par correspondance textuelle.

---

## RÈGLE FINALE

> Les données existaient. Les ponts manquaient.
> SESSION 25 = créer les ponts, pas les couches.
> Ange ne possède rien. Ange relie tout.
