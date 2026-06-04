# Amélioration Navigation Fonctionnalités

# SESSION 22 — Flux Aide : confirmation retour helper

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Fichiers modifiés :** `index.html`, `scripts/detect-orphan-features.js`  
**Commit :** `db09a34`  
**Clos :** GAP-001 (UX-001) · P0-001 restant

---

## Problème

Dans le flux aide A ↔ B :

1. A envoie une demande d'aide (`assist('panne')`)
2. B voit l'alerte, tape "✋ J'arrive" via `actQuickReply`
3. A reçoit le message → `helper_coming` → FloatingCard "Helper en route"
4. **B voyait uniquement le toast générique "Message envoyé à [plate]."** — aucun retour spécifique sur le fait que son aide était attendue

Le gap : B ne savait pas que sa proposition était enregistrée et notifiée à A.

---

## Correction — `index.html`, `actQuickReply`

Avant (toast générique pour tous les messages rapides) :
```javascript
await ImmatMessages.sendToPlate(plate, msg);
toast('Message envoyé à ' + plate + '.', 'ok');
```

Après (détection "J'arrive" → toast spécifique + OBD event) :
```javascript
await ImmatMessages.sendToPlate(plate, msg);
const isHelp = msg.startsWith("J'arrive") || msg.startsWith("J'arrive");
if (isHelp) {
  toast('✋ Aide proposée. Le conducteur sera notifié dès réception.', 'ok');
  try { window.ImmatOrganism?.observe?.('HELP_RESPONDED', { to: plate, _src: 'ImmatConnect/actQuickReply' }) } catch(e) {}
} else {
  toast('Message envoyé à ' + plate + '.', 'ok');
}
```

---

## `HELP_RESPONDED` ajouté au whitelist OBD

`scripts/detect-orphan-features.js` — `knownObserveEvents` :
```
'ROAD_CREATED', 'HELP_CREATED', 'HELP_RESPONDED',
```

---

## Flux aide complet après SESSION 22

```
A  →  assist('panne')               → alerte group=assist diffusée
B  →  voit alerte + FloatingCard    → bouton "✋ J'arrive"
B  →  actQuickReply("J'arrive...")  → message envoyé
       ├─ B : toast "✋ Aide proposée. Le conducteur sera notifié..."
       └─ OBD HELP_RESPONDED {to: plate}
A  →  refresh() détecte "J'arrive"  → helper_coming + FloatingCard "Helper en route"
A  →  voit "🙏 Merci" dans actModCard (si helper_coming + _helperPlate)
```

---

## Statuts backlog corrigés

| Item | Avant | Après |
|---|---|---|
| P2-005 "Je viens aider" | 💬 à concevoir | ✅ Implémenté (✋ J'arrive via actQuickReply) |
| P2-006 Fil de réponse helper | 💬 à concevoir | ✅ Complet — confirmation B + FloatingCard A + Merci A |
| P0-001 Aide cycle confirmation | 💬 à concevoir | ✅ Fermé |

---

## Ce qui reste (SESSION 23+)

| Gap | Priorité |
|---|---|
| GAP-002 Marqueur "lu" ✓✓ côté émetteur | P2 |
| GAP-004 Documenter les 6 statuts alertes dans `knowledge/` | P2 |
| GAP-003 Bouton "Signaler abus" sur message | P2 |
| GAP-006 WebRTC voix Phase B | P3 |
