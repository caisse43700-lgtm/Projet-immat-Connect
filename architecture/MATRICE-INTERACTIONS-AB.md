# MATRICE COMPLÈTE DES INTERACTIONS A ↔ B
> ImmatConnect · Conducteur A ↔ Conducteur B
> Source : UX-INTERACTIONS.json · UX-JOURNEYS.json · UX-BUTTONS.json · index.html (analyse code réel)
> Filtre : TRF-006 — Quel coût réel cette interaction réduit-elle ?

---

## 1. INTERACTIONS ACTUELLEMENT POSSIBLES

### INT-001 — Message personnel
**A envoie → B répond**

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| A → B | Envoie message texte | Compose + Envoyer (ImmatMessages) | ✅ |
| B reçoit | Notification + message visible | — | ✅ |
| B → A | Accepte la demande de contact | Bouton "Accepter" (tiny-btn-ok) | ✅ |
| B → A | Refuse la demande | Bouton "Refuser" (tiny-btn-no) | ✅ |
| B → A | Répond en ligne | Textarea + "Répondre" (tiny-btn) | ✅ |
| B → A | Réponse rapide | "Je m'arrête" · "Je vérifie" · "Merci" | ✅ |
| B | Supprime le message | Bouton "Supprimer" | ✅ (local) |
| B | Bloque A | Bouton "Bloquer" | ✅ (local) |
| A | Sait que B a lu | — | ❌ absent |

**Score : 88%** · Lacune : pas de read receipt côté A

---

### INT-002 — Alerte véhicule (A → B ciblé)
**A signale un problème sur le véhicule de B**

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| A → B | Envoie alerte (Pneu / Feu / Portière / Fumée / Objet / Autre) | vehicleAlert() via reportPanel ou vehicleAlertQuick() | ✅ |
| B reçoit | FloatingCard + message ⚠️ dans Activité | — | ✅ |
| B → A | "Info utile" | Bouton tiny-btn-ok | ✅ |
| B → A | "Reçu" | Bouton tiny-btn-ok | ✅ |
| B → A | "Déjà réglé" | signalFeedback 'regle' | ✅ |
| B → A | "Faux signalement" | signalFeedback 'faux' | ✅ |
| B → A | "Je vérifie" · "Je m'arrête" | Quick replies Activité | ✅ |
| A | Sait que B a confirmé/vu | — | ❌ absent |

**Score : 85%** · Lacune : A n'a pas de retour que B a vu et réagi

---

### INT-003 — Signalement route (broadcast)
**A informe tous les conducteurs proches**

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| A | Signale accident / bouchon / obstacle / travaux / contrôle / danger | roadReport() via reportPanel | ✅ |
| B (+ tous proches) | Reçoit marqueur sur carte + alerte Activité | — | ✅ |
| B | Confirme que c'est encore là | Bouton "Toujours là" (altet) | ✅ |
| B | Marque comme disparu | Bouton "Disparu" (altet) | ✅ |
| B → A | Réponse directe à A | — | ❌ non applicable (broadcast) |

**Score : 95%** · Broadcast sans retour individuel : comportement correct

---

### INT-004 — Demande d'aide (A → proches)
**A signale une panne ou urgence, B peut répondre**

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| A | Demande aide (Panne / Carburant / Batterie / Moteur / Incendie / Perdu) | assist() via reportPanel | ✅ |
| B reçoit | Marqueur sur carte + alerte Activité groupe "assist" | — | ✅ |
| B → A | "Je peux aider →" | actHelpReply() → ouvre conversation | ✅ |
| A | Sait que B arrive | — | ❌ absent |
| B → A | "J'arrive dans X minutes" | — | ❌ absent |
| B → A | "Je ne peux pas aider" | — | ❌ absent |
| A | Annule la demande | — | ❌ absent |
| A | Clôture (problème résolu) | — | ❌ absent |

**Score : 55%** · Lacune critique : boucle aide incomplète (FRI-009)

---

### INT-005 — Appel WebRTC (A demande → B accepte/refuse)

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| A → B | Demande appel | CallManager.openContactOptions() | ✅ |
| B reçoit | Popup entrant avec plaque A | callIncomingPopup | ✅ |
| B → A | Accepte | Bouton "Accepter" | ✅ |
| B → A | Refuse | Bouton "Refuser" | ✅ |
| B | N'autorise pas les appels | Toggle allowCalls dans settings | ✅ |
| Pendant appel | Raccrocher | Bouton "Raccrocher" | ✅ |

**Score : 95%** · Complet

---

### INT-007 — Résolution / Confirmation vue (B → A)
**B confirme avoir vu ou résolu une alerte**

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| B → A | "Info utile" | respondVehicleAlert('utile') | ✅ |
| B → A | "Reçu" | respondVehicleAlert('recu') | ✅ |
| B → A | "Déjà réglé" | signalFeedback('regle') | ✅ |
| Retour score | Score confiance mis à jour | trustDelta() | ✅ |

**Score : 90%**

---

### INT-008 — Blocage (B bloque A)

| Étape | Action | Bouton | Implémenté |
|---|---|---|---|
| B → A | Bloque la plaque | blockPlate() | ✅ (localStorage) |
| A | Ne sait pas qu'il est bloqué | — | ✅ (correct) |
| B | Voit toujours les alertes route de A | — | ⚠ comportement à vérifier |
| B | Débloquer | — | ❌ absent |

**Score : 65%** · Blocage local uniquement (DA-004)

---

## 2. INTERACTIONS INCOMPLÈTES

### IC-001 — Boucle aide (INT-004) ← CRITIQUE

```
A demande aide
↓
B voit dans Activité → "Je peux aider"
↓
Conversation ouverte
↓
B n'a aucun moyen structuré d'annoncer qu'il arrive
↓
A attend sans information
```

**Manque fonctionnel** : pas de statut "helper en route"
**Manque UX** : pas de bouton "J'arrive" ni durée estimée
**Impact** : A ne sait pas si quelqu'un vient. FRI-009.
**Coût réel réduit par le fix** : anxiété d'attente, risque de doublons helpers

---

### IC-002 — Retour émetteur alerte véhicule (INT-002)

```
A envoie alerte à B
↓
B répond "Reçu" ou "Déjà réglé"
↓
A ne reçoit aucune notification de retour
```

**Manque** : notification push ou badge pour A quand B confirme
**Impact** : A ne sait pas si son alerte a été utile. JRN-005.

---

### IC-003 — Confirmation lecture message (INT-001)

```
A envoie message
↓
B lit
↓
A voit toujours "en attente"
```

**Manque** : marqueur "lu" côté émetteur
**Impact** : A ne sait pas si B est au courant. FRI-006.

---

### IC-004 — Clôture demande d'aide

```
A a trouvé de l'aide ou résolu le problème
↓
Aucun moyen de clôturer sa propre demande
↓
Alerte reste active pour tous les proches
```

**Manque** : bouton "Problème résolu" côté A sur sa propre alerte
**Impact** : conducteurs continuent de voir une alerte obsolète

---

## 3. INTERACTIONS ABSENTES MAIS COHÉRENTES

### MATRICE DES ABSENCES

| ID | Action A | Réaction B attendue | Valeur réelle | Fréquence | Coût UX | Verdict TRF-006 |
|---|---|---|---|---|---|---|
| IA-01 | A remercie B | B reçoit confirmation sociale | Faible | Fréquente | Faible | CONFORT |
| IA-02 | A annule sa demande d'aide | B sait que ce n'est plus nécessaire | Haute | Moyenne | Très faible | ESSENTIELLE |
| IA-03 | B dit "J'arrive" après avoir vu demande aide | A sait que quelqu'un vient | Haute | Fréquente | Faible | ESSENTIELLE |
| IA-04 | B dit "Je ne peux pas aider" | A sait de chercher ailleurs | Haute | Fréquente | Faible | ESSENTIELLE |
| IA-05 | A signale abus sur message reçu | Système reçoit signalement | Moyenne | Rare | Faible | UTILE |
| IA-06 | A clôture sa demande d'aide | Alerte disparaît pour tous | Haute | Fréquente | Très faible | ESSENTIELLE |
| IA-07 | A rappelle B (suite à refus d'appel) | — | Faible | Rare | Nulle (bouton existant) | SUPERFLUE |
| IA-08 | A partage sa position précise | B reçoit coordonnées | Moyenne | Rare | Moyenne | CONFORT |
| IA-09 | A demande rappel à B | B reçoit demande de rappel | Faible | Très rare | Moyenne | SUPERFLUE |
| IA-10 | B confirme être arrivé sur place | A reçoit notification | Moyenne | Rare | Moyenne | CONFORT |
| IA-11 | A accepte l'aide de B | B sait qu'il est le seul helper | Moyenne | Rare | Faible | UTILE |
| IA-12 | A refuse l'aide d'un helper spécifique | B ne vient plus | Faible | Très rare | Haute | SUPERFLUE |
| IA-13 | A donne feedback sur l'aide reçue | Score confiance B mis à jour | Moyenne | Rare | Faible | UTILE |

---

## 4. INTERACTIONS RÉALISABLES SANS NOUVEAU BOUTON

Ces interactions peuvent être ajoutées **dans des cartes existantes** ou comme **état supplémentaire** sans nouveau bouton permanent dans l'UI.

### RB-01 — "J'arrive" et "Je ne peux pas" (IA-03 + IA-04)
**Sans nouveau bouton** : ajouter 2 quick replies dans la card aide de l'Activité, exactement comme les quick replies existants "Je m'arrête" / "Je vérifie" / "Merci".

Boutons existants dans actQuickReply :
```javascript
"Je m'arrête" · "Je vérifie" · "Merci"
```

Ajouter dans le groupe `assist` :
```javascript
"J'arrive" · "Je ne peux pas"
```

**Coût** : 2 lignes de code dans le template `actHelpReply` existant.

---

### RB-02 — "Problème résolu" / clôture demande (IA-02 + IA-06)
**Sans nouveau bouton permanent** : ajouter un bouton "✓ Résolu" dans la card alerte dans l'Activité, uniquement sur les alertes **envoyées par A lui-même** (`_mine: true`).

Logique existante : `a._mine` est déjà présent dans les alertes. `markAlertSeen(id)` existe déjà.

**Coût** : 1 condition + 1 bouton dans le template `renderMyAlertsBlock` existant.

---

### RB-03 — Retour émetteur quand B confirme (IC-002)
**Sans nouveau bouton** : quand `respondVehicleAlert` ou `signalFeedback` est appelé, envoyer un message système à l'émetteur original. Déjà fait partiellement (`respondVehicleAlert` insère un message dans `messages`).

**Manque** : le message inséré est un texte brut. Ajouter une notification visuelle dans l'Activité côté A.

**Coût** : modification du badge / rendering côté émetteur.

---

### RB-04 — Débloquer un conducteur (INT-008 complément)
**Sans nouveau bouton permanent** : option dans les settings ou dans la liste des bloqués. Pas besoin d'un bouton sur chaque message.

---

## 5. INTERACTIONS NÉCESSITANT UN NOUVEAU BOUTON

Uniquement les cas où aucun élément existant ne peut absorber le besoin.

### NB-01 — "Je peux aider" enrichi (BTN-MISS03)
**Bouton proposé** : dans la card alerte aide (Activité) — remplace le texte seul par 2 options :
- `"J'arrive"` → envoie message structuré + marque l'alerte
- `"Je ne peux pas"` → envoie message + laisse l'alerte active

**Emplacement** : Activité, group='assist', côté B
**Interaction** : INT-004 complétée
**Coût** : Faible — 2 quick replies dans un template existant
**Valeur** : Haute — FRI-009, P0-001

---

### NB-02 — "Résolu" sur alerte propre (IA-06)
**Bouton proposé** : dans la card alerte de l'Activité, uniquement si `a._mine === true`
- `"✓ Résolu"` → clôture l'alerte, envoie signal aux helpers

**Emplacement** : Activité, alertes envoyées par l'utilisateur courant
**Interaction** : IA-02 + IA-06 ensemble
**Coût** : Très faible — condition sur `_mine` déjà existante
**Valeur** : Haute — conducteurs voient encore des alertes obsolètes

---

### NB-03 — "Signaler abus" sur message (BTN-MISS04 / INT-010)
**Bouton proposé** : dans chaque message reçu (tiny-btn), côté B
- `"⚑ Signaler"` → ouvre modal simple (harcèlement / spam / faux signalement)

**Emplacement** : msgHtml() dans les messages reçus
**Interaction** : INT-010
**Coût** : Moyen — backend nécessaire (table reports)
**Valeur** : Moyenne — sécurité plateforme

---

## 6. MATRICE COMPLÈTE A ↔ B

| Action A | Réaction B possible | Existe | Complète | Priorité |
|---|---|---|---|---|
| Envoie message | Reçoit / Accepte / Refuse / Répond | ✅ | ⚠ 88% | P0 |
| Envoie message | Bloque A | ✅ | ⚠ local | P1 |
| Envoie message | Supprime | ✅ | ✅ | — |
| Alerte véhicule | "Info utile" / "Reçu" / "Déjà réglé" / "Faux" | ✅ | ⚠ 85% | P0 |
| Alerte véhicule | Quick reply "Je vérifie" / "Je m'arrête" | ✅ | ✅ | — |
| Signalement route | Voit sur carte + confirme / supprime | ✅ | ✅ 95% | — |
| Demande aide | "Je peux aider" → conversation | ✅ | ⚠ 55% | P0 |
| Demande aide | "J'arrive" | ❌ | ❌ | **P1 NB-01** |
| Demande aide | "Je ne peux pas" | ❌ | ❌ | **P1 NB-01** |
| Demande aide | A annule sa demande | ❌ | ❌ | **P1 NB-02** |
| Demande aide | A clôture (résolu) | ❌ | ❌ | **P1 NB-02** |
| Demande appel | Accepte / Refuse | ✅ | ✅ 95% | — |
| Demande appel | N'autorise pas les appels | ✅ | ✅ | — |
| Message reçu | Remercie | ❌ | ❌ | IA-01 CONFORT |
| Message reçu | Signale abus | ❌ | ❌ | P2 NB-03 |
| Message envoyé | Sait que B a lu | ❌ | ❌ | P2 IC-003 |
| Alerte reçue | A sait que B a répondu | ⚠ partiel | ⚠ | P1 IC-002 |

---

## 7. CLASSEMENT PAR RATIO VALEUR / COMPLEXITÉ

### Essentielles (coût réel fort · résolution facile)

| Rang | Interaction | Coût UX | Valeur | Action requise |
|---|---|---|---|---|
| 🥇 1 | B dit "J'arrive" après demande aide | Très faible | Haute | 2 quick replies dans actHelpReply |
| 🥈 2 | A clôture sa demande d'aide | Très faible | Haute | 1 bouton conditionnel `_mine` |
| 🥉 3 | B dit "Je ne peux pas aider" | Très faible | Haute | Idem #1 (même PR) |
| 4 | A sait que B a confirmé l'alerte | Faible | Moyenne | Notification retour émetteur |
| 5 | Débloquer un conducteur | Faible | Moyenne | Option dans settings |

### Utiles (valeur réelle · complexité raisonnable)

| Rang | Interaction | Complexité | Notes |
|---|---|---|---|
| 6 | Signalement abus sur message | Moyenne | Backend requis |
| 7 | Feedback sur aide reçue | Faible | Variation sur trustDelta existant |
| 8 | Confirmation lecture message | Moyenne | Champ `read_at` en DB |
| 9 | A accepte un helper spécifique | Faible | État supplémentaire |

### Confort (valeur faible · à différer)

- Remerciement formel (INT-006) — workaround "Merci" en quick reply suffit aujourd'hui
- Partage position précise — risque vie privée, faible besoin
- Rappel suite refus appel — bouton existant suffit

### Superflues (rejeter TRF-006)

- Demande rappel — rarissime, duplication du canal appel
- Refus aide d'un helper spécifique — complexité sociale non justifiée
- Historique détaillé des interactions — P3 au plus tôt

---

## 8. CONCLUSION

**5 prochaines interactions — meilleur ratio valeur/complexité :**

```
1. "J'arrive" / "Je ne peux pas"  → 2 quick replies, INT-004 complétée à 90%
2. "Résolu" sur alerte propre     → 1 bouton conditionnel, supprime alertes obsolètes
3. Retour émetteur alerte vue     → notification côté A, ferme JRN-005
4. Débloquer conducteur           → option settings, INT-008 complétée
5. Signalement abus               → modal simple, INT-010 (backend à créer)
```

Les interactions #1 et #2 peuvent être livrées dans le même commit, sans nouvelle edge function, sans nouvelle table DB.
