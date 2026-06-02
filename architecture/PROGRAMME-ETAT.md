# IMMATCONNECT — ÉTAT DU PROGRAMME
> Mis à jour : 2026-06-02 · Décision Gardien

---

## PHASE 1 — ARCHITECTURE
**Statut : TERMINÉE ✅**

| Livrable | Statut |
|---|---|
| ADN produit | ✅ |
| Constitution v6 + invariants INV-001 → INV-015 | ✅ |
| Access Policy (Gardien / Protecteur / Observateur) | ✅ |
| NS v6 canonique (immat-nervous-system.json) | ✅ |
| sync-ns.js → nervous-system.ts | ✅ |
| nsToPrompt(depth:1/2/3) | ✅ |
| validateNSSchema() fail-fast | ✅ |
| validate-ns-refs.js CI | ✅ |
| Architecture UX modulaire (11 fichiers) | ✅ |
| UX-BACKLOG consolidé — source unique | ✅ |

---

## PHASE 2 — VALIDATION TERRAIN
**Statut : À COMMENCER**

**Objectif** : vérifier que le système produit de la valeur réelle en situation réelle.

**Flux testé :**
```
Question réelle
↓ Routage
↓ Organe
↓ nsToPrompt()
↓ Ange
↓ Réponse
↓ Décision Gardien
```

**Questions à valider :**

1. Les réponses de l'Ange sont-elles utiles ?
2. Le routage choisit-il le bon organe ?
3. Les sources citées sont-elles pertinentes ?
4. Les vigilances détectent-elles les vrais risques ?
5. Le Gardien gagne-t-il réellement du temps ?
6. Les réponses améliorent-elles les décisions ?
7. Quels faux positifs subsistent ?
8. Quels faux négatifs subsistent ?

---

## RÈGLE ACTIVE

> **TRF-006** — *Quel coût réel cette modification réduit-elle ?*
>
> Toute évolution future doit répondre à cette question avant d'être acceptée.

---

## DÉCISION GARDIEN

> On arrête de construire. On commence à utiliser.
>
> Le prochain audit doit porter sur le comportement réel du système, pas sur sa structure.
