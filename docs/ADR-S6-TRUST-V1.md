# ADR — S6-TRUST V1 : Confirmation de signalement véhicule

**Statut :** Accepté (2026-06-28). Réouvre S6-TRUST (parqué le 2026-06-22) avec un périmètre strictement réduit.
**Décideurs :** propriétaire produit + revue d'architecture (archi / PM / Postgres / sécurité / UX).

---

## Invariants S6-TRUST (non négociables)

- **INV-TRUST-001 — Stockage unifié, sens jamais unifié.** `report_feedback` est un journal commun ; l'interprétation d'un événement dépend **obligatoirement** du `subject_type` (vehicle = validation par le destinataire ; route = corroboration collective ; aide = résolution/utilité). Interdiction permanente de produire un score unique mélangeant ces réalités ou de sommer les axes.
- **INV-TRUST-002 — Pas de réputation visible.** L'utilisateur ne voit jamais « note / réputation / score / indice de crédibilité ». Il voit uniquement le résultat d'un événement précis (ex. « ✅ Confirmé par le conducteur »). La réputation reste interne jusqu'à décision produit explicite.
- **INV-TRUST-003 — Enrichir, jamais redéfinir.** Toute évolution ajoute une information répondant à une nouvelle question, sans modifier ni remplacer un message existant. « Ce signalement est-il confirmé ? », « ce contributeur est-il fiable ? », « cette personne est-elle bien évaluée ? » restent des réponses distinctes, jamais fusionnées.
- **INV-COM-015 (rappel) — `reporter_id` / identités jamais exposés au client.**

---

## 1. Décision produit
Permettre au **signaleur** de savoir que **le conducteur concerné a confirmé** son signalement véhicule. On capte le signal le plus fort et le plus légitime — la validation par la seule personne capable de vérifier (le propriétaire). Ni réputation, ni vérité communautaire.

## 2. Périmètre V1
- Signalement **véhicule uniquement**.
- Persister le verdict du propriétaire (aujourd'hui local-only) côté serveur.
- Afficher **côté signaleur seulement**, sur son envoi : « ✅ Confirmé par le conducteur ». Rien sinon.
- Workflow propriétaire inchangé (ajout de l'écriture serveur uniquement).

## 3. Source de vérité
`report_feedback` : journal **append-only**, polymorphe, seule source de vérité. Tout affichage est dérivé par comptage. (Inverse l'ancienne décision D12 qui sacralisait `vehicle_trust_scores`.)

## 4. Schéma logique `report_feedback`
| Champ | Type | Rôle |
|---|---|---|
| `id` | uuid (PK) | identifiant de l'événement |
| `subject_type` | text ∈ {vehicle, route, aide} | domaine |
| `subject_id` | text | id du signalement jugé (V1 = `messages.id` du `vehicle_report`) |
| `voter_id` | uuid → auth.users | auteur du retour (le conducteur concerné en V1) |
| `verdict` | text | vocabulaire par domaine (vehicle : confirme/faux/disparu) |
| `created_at` | timestamptz | horodatage |
| contrainte | `UNIQUE(subject_type, subject_id, voter_id)` | un retour par personne et par signalement |

## 5. Pourquoi polymorphe
Forme identique des retours, sens différent. Une table unique évite trois tables jumelles, permet d'activer route/aide en V1.1 **sans changement de schéma**, et garde une seule source de vérité + un seul point d'anti-abus.

## 6. Sens interprété par domaine (INV-TRUST-001)
`vehicle` → fiabilité du signaleur · `route` → crédibilité du signalement · `aide` → utilité du helper. ⭐ = 4ᵉ axe séparé. Jamais de somme.

## 7. RLS / sécurité
- `report_feedback` : RLS activée, **deny-all** (aucun accès client direct).
- Écriture via RPC `submit_report_feedback(subject_type, subject_id, verdict)` `SECURITY DEFINER` : force `voter_id = auth.uid()` ; valide le vocabulaire ; **refuse l'auto-vote** (résout `messages.sender_id` et rejette si = appelant) ; upsert.
- Lecture via RPC `get_report_confirmations(subject_ids[])` `SECURITY DEFINER` : renvoie **uniquement** `{subject_id, confirmed_count}`, jamais d'identité.

## 8. Anti-abus V1
`UNIQUE` + upsert (multi-vote) · refus auto-vote · aucune écriture client directe · validation du vocabulaire. *(Pondération votants, anti-Sybil, anomalies : V1.1+. Acceptable car véhicule = 1-à-1.)*

## 9. Matrice verdict véhicule → sens
| Bouton propriétaire | verdict | Affiché V1 ? |
|---|---|---|
| ✅ Signalement confirmé | `confirme` | **Oui** → « ✅ Confirmé par le conducteur » |
| ❌ Faux signalement | `faux` | Non (stocké, jamais affiché) |
| ℹ️ Problème disparu | `disparu` | Non (jamais punitif) |
| ⏭️ Pas pu vérifier | *(non écrit)* | Non (exclu) |

## 10. Affichage côté signaleur
Onglet **Envoyés** : badge positif « ✅ Confirmé par le conducteur » si `confirmed_count ≥ 1` ; rien sinon. Lecture batch via RPC ; dégradation silencieuse si réseau échoue.

## 11. Exclusions explicites (hors V1)
Réputation par personne · score global · Wilson/niveaux · Route · Aide · corroboration collective · affichage négatif public · anti-Sybil avancé · pondération · décroissance · `vehicle_trust_scores` · modification de `driver_ratings`.

## 12. Migration
`supabase/migrations/20260628140000_report_feedback.sql` — additive, idempotente, horodatée après l'existant. Aucun `ALTER` de table existante. Auto-test structurel + tests fonctionnels documentés.

## 13. Relation `vehicle_trust_scores`
Aucune. Laissé parqué. La future réputation par-personne sera dérivée du journal ; `vehicle_trust_scores` sera alors reconverti ou déprécié (décision reportée).

## 14. Relation `driver_ratings` (⭐)
Aucune. Axe séparé (satisfaction). Non lu, non modifié.

## 15. Tests SQL minimaux
Voir la section commentée de la migration : submit→get=1 ; doublon=1 ; auto-vote rejeté ; verdict invalide rejeté ; id inconnu=0 ; jamais de `voter_id` ; `faux`/`disparu` n'incrémentent pas.

## 16. Risques de régression
`actVmVerdict` : appel RPC fire-and-forget non bloquant. Envoyés : lecture à dégradation silencieuse. Ne pas interférer avec `vehicle_response`/badges. Ne toucher ni `vehicle_trust_scores` ni `driver_ratings`. `subject_id = messages.id` cohérent (ligne unique partagée expéditeur/destinataire — vérifié).

## 17. Conditions de passage V1.1
V1 stable en prod + anti-abus de base validé + décision produit sur signal négatif/par-personne. Puis, **sans refonte** (mêmes table et RPC) : Route (« Confirmé par N » + bouton confirm), Aide (« assistance terminée »), réputation par-personne (Wilson, niveaux, seuil), affichage « contesté ».
