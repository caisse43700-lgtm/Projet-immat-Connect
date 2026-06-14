# TEST_RESULTS — ImmatConnect Pro
Document opérationnel — À remplir lors des contrôles terrain

> **Référence :** docs/MASTER_COMPATIBILITY_MAP.md (Section 25 — 42 contrôles terrain)
> **Matériel requis :** 2 téléphones réels (iOS + Android), 2 comptes distincts, connexion 4G
> **Téléphones de référence :** BZ-652-LL ↔ BE-521-MM

---

## SESSION DE TEST #1 — DATE : À COMPLÉTER

**Opérateur :** Fondateur
**Téléphone A :** (modèle + iOS/Android version)
**Téléphone B :** (modèle + iOS/Android version)
**Connexion :** 4G / WiFi
**Pré-requis :** migrations 1-11 appliquées + EF déployées + Secrets configurés

---

### LÉGENDE

| Symbole | Signification |
|---------|---------------|
| ✅ | OK — comportement attendu observé |
| ❌ | KO — comportement inattendu — BLOQUER LE LANCEMENT |
| ⚠️ | Partiel — comportement dégradé acceptable en bêta |
| ⬜ | Non testé |

**Règle absolue : 0 ❌ sur les 11 contrôles critiques = condition GO MAIN**

---

### BLOC 1 — INSCRIPTION ET PROFIL

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C01 | Inscription + profil → public_profiles alimenté | ✓ | ⬜ | |
| C01b | public_profiles sans email/phone/user_id | — | ⬜ | |

### BLOC 2 — LOCALISATION ET CARTE

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C02 | Localisation carte — marqueur visible <60s | ✓ | ⬜ | |
| C02b | Clustering marqueurs | — | ⬜ | |

### BLOC 3 — SÉCURITÉ RLS ET COLONNES (RGPD)

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C03 | email/phone absents de /profiles (JSON) | ✓ RGPD | ⬜ | Code HTTP reçu : ___ |
| C03b | reporter_id absent de /reports pour tiers | ✓ RGPD | ⬜ | |
| C03c | reporter_id absent de /public_reports | ✓ RGPD | ⬜ | |
| C03d | get_my_profile() → email+phone pour soi uniquement | — | ⬜ | |

**Contrôle C03 — Requête exacte et réponse :**
```
GET /rest/v1/profiles?select=email,phone
Authorization: Bearer [JWT user1]

Réponse : ___________
email présent dans la réponse : OUI / NON
phone présent dans la réponse : OUI / NON
```

### BLOC 4 — MESSAGES

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C04 | Message reçu en temps réel <2s | ✓ | ⬜ | Délai mesuré : ___s |
| C04b | Statut lecture ✓✓ bleu | — | ⬜ | |
| C04c | Rate limit client 5/min (UX) | — | ⬜ | |

### BLOC 5 — APPELS AUDIO

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C05a | Appel complet A→B → audio → raccroche | ✓ | ⬜ | Erreur JS profiles : OUI/NON |
| C05b | Annulation → overlay B fermé <2s | ✓ | ⬜ | Délai : ___s |
| C05c | Refus → A voit "Refusé" | ✓ | ⬜ | |
| C05d | Manqué → badge callNavBadge incrémenté | ✓ | ⬜ | |
| C05e | App arrière-plan → appel reçu | ✓ | ⬜ | |
| C05f | Perte réseau 5s → pas de crash | — | ⬜ | |
| C05g | Multi-appareils → "Appel pris sur autre appareil" | — | ⬜ | |

### BLOC 6 — SIGNALEMENTS

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C06 | Signalement → alerte visible sans reporter_id | ✓ | ⬜ | |
| C06b | ResolutionCenter modal | — | ⬜ | |
| C06c | Bouton urgence 15/17/18 visible avant formulaire | — | ⬜ | Taille : ___px |

### BLOC 7 — TRUST ET NOTATION

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C07a | Notation conducteur → submit-rating 200 | — | ⬜ | |
| C07b | trust_score/level/avg/total affichés | — | ⬜ | |

### BLOC 8 — RGPD

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C07 | Suppression compte → données nettoyées | ✓ RGPD | ⬜ | Reconnexion impossible : OUI/NON |
| C08b | Export données → JSON complet | — | ⬜ | Champs présents : ___ |

**Contrôle C07 — Vérification SQL post-suppression :**
```sql
-- Remplacer {uid} par l'UUID de l'utilisateur supprimé
SELECT COUNT(*) FROM profiles WHERE id = '{uid}';            -- attendu 0
SELECT COUNT(*) FROM public_profiles WHERE owner_plate = '_'; -- attendu 0
SELECT COUNT(*) FROM messages WHERE sender_id = '{uid}';     -- attendu 0
SELECT COUNT(*) FROM push_subscriptions WHERE user_id = '{uid}'; -- attendu 0
```

| Table | Lignes trouvées | Attendu |
|-------|----------------|---------|
| profiles | ___ | 0 |
| public_profiles | ___ | 0 |
| messages | ___ | 0 |
| push_subscriptions | ___ | 0 |

### BLOC 9 — PLAQUE ET UNICITÉ

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C08 | Plaque déjà prise → erreur + blocage | ✓ | ⬜ | |

### BLOC 10 — OFFLINE ET SERVICE WORKER

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C09 | Mode hors ligne → offline.html, pas de crash | — | ⬜ | |
| C09b | SW version = immatconnect-pro-v25 | — | ⬜ | Version trouvée : ___ |

### BLOC 11 — PUSH NOTIFICATIONS

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C10 | Push app fermée → reçue <10s | ✓ | ⬜ | Délai : ___s — iOS/Android : ___ |
| C10b | Push appel entrant | — | ⬜ | |

### BLOC 12 — ANGE

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C11 | ANGE message courtois <3s, ≤3 phrases | — | ⬜ | Durée : ___s |
| C11b | ANGE refuse hors contexte | — | ⬜ | |
| C11c | Dégradation ANGE si EF KO | — | ⬜ | Message dégradation affiché : OUI/NON |

### BLOC 13 — ACCESSIBILITÉ ET PWA

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C12a | role=dialog sur modaux | — | ⬜ | |
| C12b | Shortcuts PWA (Android) | — | ⬜ | |
| C12c | Navigator badge | — | ⬜ | |

### BLOC 14 — BLOCAGES ET SYNCHRONISATION

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C15 | Blocage utilisateur → refus côté UI | — | ⬜ | Comportement serveur : ___ (RISK-017 documenté) |
| C16 | Sync profiles ↔ public_profiles | — | ⬜ | COUNT(*) = ___ (attendu 0) |
| C17 | Dégradation Realtime → interface stable | — | ⬜ | |

### BLOC 15 — DÉGRADATIONS FOURNISSEURS

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C18 | Supabase down → interface stable | — | ⬜ | |
| C19 | Agora down → appels KO uniquement | — | ⬜ | |
| C20 | Anthropic down → ANGE KO uniquement | — | ⬜ | |

### BLOC 16 — ROLLBACK ET RÉSILIENCE

| # | Contrôle | Critique | Résultat | Observations |
|---|---------|----------|---------|--------------|
| C21 | Rollback migration (env. test) → retour stable | — | ⬜ | Testé sur migration : ___ |

---

## BILAN SESSION #1

### Contrôles critiques (11)

| # | Contrôle | Résultat |
|---|---------|---------|
| C01 | Inscription + profil | ⬜ |
| C02 | Localisation carte | ⬜ |
| C03 | PII absentes /profiles | ⬜ |
| C03b | RLS reports auteur | ⬜ |
| C03c | public_reports sans reporter_id | ⬜ |
| C04 | Messages temps réel | ⬜ |
| C05a | Appel complet | ⬜ |
| C05b | Annulation | ⬜ |
| C05c | Refus | ⬜ |
| C05d | Appel manqué | ⬜ |
| C05e | App arrière-plan | ⬜ |
| C06 | Signalement communautaire | ⬜ |
| C07 | Suppression compte | ⬜ |
| C08 | Plaque unique | ⬜ |
| C10 | Push app fermée | ⬜ |

**KO critiques : ___ / 15**

### Décision

```
[ ] 0 KO critique → GO BÊTA FERMÉE (passer à DEPLOYMENT_LOG — Étape 5)
[ ] ≥1 KO critique → NO-GO — consigner dans INCIDENT_LOG.md
```

---

## SESSIONS DE TEST — HISTORIQUE

| # | Date | Opérateur | KO critiques | Décision |
|---|------|-----------|-------------|---------|
| 1 | — | — | — | — |

---

*TEST_RESULTS — ImmatConnect Pro*
*Référence : MASTER_COMPATIBILITY_MAP.md v1.3 — Section 25*
