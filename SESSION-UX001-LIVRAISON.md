# Amélioration Navigation Fonctionnalités

# SESSION UX-001 — Cartographie UX complète + Phases suivantes

**Date :** 2026-06-04  
**Branche :** `claude/immatconnect-pro-app-dEKGR`  
**Commit :** `c1e1adf`  
**Fichiers créés :** 12 (2383 lignes)

---

## PHASE UX-001 — 8 livrables produits

| Livrable | Fichier | Contenu |
|---|---|---|
| UX-ORGANS | `architecture/ux/UX-ORGANS.md` | 6 organes → code exact (panels, fonctions, Supabase, OBD, localStorage) |
| UX-SCREENS | `architecture/ux/UX-SCREENS.md` | 37 surfaces d'interface avec hiérarchie, ouverture, fermeture |
| UX-BUTTONS | `architecture/ux/UX-BUTTONS.md` | 152 boutons/contrôles avec onclick exhaustifs par panel |
| UX-INTERACTIONS | `architecture/ux/UX-INTERACTIONS.md` | 10 flux A↔B complets : JS → Supabase → Realtime → B → réponse → fin de cycle |
| UX-JOURNEYS | `architecture/ux/UX-JOURNEYS.md` | 10 parcours séquencés avec contrôles (doublons, trous, OBD manquants) |
| UX-TRUST | `architecture/ux/UX-TRUST.md` | Système confiance + blocage + callLevel + invariants + décisions ouvertes |
| UX-BACKLOG | `architecture/ux/UX-BACKLOG.md` | Statuts stales corrigés + P0-001 fermé + WebRTC ⚠️ STALE |
| UX-CONSTITUTION | (existant) | Validée conforme — inchangée |

---

## PHASE A↔B JOURNEYS — 10 flux documentés

| JRN | Flux | Statut | OBD manquant |
|---|---|---|---|
| JRN-001 | Inscription + premier message | 100% | — |
| JRN-002 | Signalement véhicule | 85% | — |
| JRN-003 | Demande d'aide | 95% | — |
| JRN-004 | Demande de contact (Appel Phase A) | 90% | CALL_MISSED |
| JRN-005 | Signalement route | 95% | — |
| JRN-006 | SOS | 80% | — |
| JRN-007 | Confiance | 75% | — |
| JRN-008 | Blocage | 70% | — |
| JRN-009 | Autorisation appel | 100% | — |
| JRN-010 | Interaction Ange | 60% | — |

---

## PHASE ANGE ↔ MESSAGES ↔ APPELS

**Fichier :** `architecture/ANGE-MESSAGES-APPELS.md`

- 10 intentions Ange détectables documentées (`INT-SIGNAL-VEHICLE`, `INT-SEND-MESSAGE`, etc.)
- API `AngeAction` complète spécifiée (6 méthodes : prepareMessage, prepareCall, prepareQuickReply, prepareContact, checkPermissions, getContext)
- Exemple complet : "Préviens le conducteur devant moi que son pneu semble dégonflé" → séquence Ange → prévisualisation → validation → exécution → OBD
- Contraintes techniques : INV-COM-015 (Ange ≠ messages), P-008 (validation obligatoire)
- Statut : Ange passif ✅ · AngeAction ❌ à implémenter

---

## PHASE OBD-003 — Interaction Engine

**Fichier :** `architecture/OBD-003-INTERACTION-ENGINE.md`

- 4 nouvelles règles : `NO_ORPHAN_INTERACTION`, `NO_ORPHAN_OBSERVATION`, `NO_ORPHAN_FLOW`, `NO_ORPHAN_TEST`
- 27 OBD events inventoriés avec source + invariant
- 6 events manquants : `CALL_MISSED`, `CALL_ENDED`, `ABUSE_REPORTED`, `VEHICLE_MESSAGE_RECEIVED`, `BLOCK_APPLIED`, `TRUST_LEVEL_CHANGED`
- 2 nouveaux invariants ajoutés à `knowledge/communication-invariants.json` : INV-COM-016 + INV-COM-017

---

## PHASE CALL ENGINE V2

**Fichier :** `architecture/CALL-ENGINE-V2.md`

- Audit Phase 1 : 100% des étapes vérifiées (demande, réception, réponse, préférences, journal)
- OBD Phase 1 : 5 events implémentés, 1 manquant (`CALL_MISSED`)
- Architecture Phase B (WebRTC) spécifiée : signaling Supabase Realtime + RTCPeerConnection + écran appel
- Conditions avant Phase B listées : CALL_MISSED + INV-COM-019 + tests organism calls

---

## PHASE KNOWLEDGE GRAPH ANGE

**Fichier :** `knowledge/immat-knowledge-graph.json`

- 10 intentions cartographiées : organe → interaction → journey → écrans → boutons → fonctions → fichiers → Supabase → OBD → invariants → patterns
- 14 écrans indexés
- 27 OBD events avec source et invariant
- 9 invariants référencés
- 7 GAPs ouverts avec priorité

---

## Corrections de statuts stales (UX-BACKLOG)

| Item | Avant | Après |
|---|---|---|
| P0-001 aide cycle | 💬 à concevoir | ✅ fait SESSION 22 |
| P2-005 "Je viens aider" | 💬 à concevoir | ✅ fait (actQuickReply "✋ J'arrive") |
| P2-006 Fil helper | 💬 à concevoir | ✅ fait (helper_coming + FloatingCard + HELP_RESPONDED) |
| Appel audio WebRTC SESSION 8 | ✅ fait | ⚠️ STALE — Phase 1 uniquement, aucun WebRTC |

---

## Prochaines sessions (ordre recommandé)

| Session | Action | Priorité |
|---|---|---|
| SESSION 23 | GAP-005 : CALL_MISSED OBD event | P2 |
| SESSION 24 | GAP-004 : Documenter 6 statuts alertes dans knowledge/ | P2 |
| SESSION 25 | DA-004/DA-005 : Décision blocage + trust → selon Gardien | P2 |
| Phase Ange Actif | AngeAction API + prévisualisation + confirmation | P2 |
| Phase B | WebRTC voix P2P (après Call Engine V2 complet) | P3 |
