# Registre des Features — ImmatConnect Pro

> **SESSION OBD-002** — Règle `NO_ORPHAN_FEATURE`
>
> Toute feature ajoutée au code DOIT être déclarée dans `knowledge/features.json`
> avant ou en même temps que son implémentation.
> Le détecteur `scripts/detect-orphan-features.js` vérifie cette règle automatiquement.

---

## Features déclarées

| ID | Nom | Organe | Statut | Flows |
|----|-----|--------|--------|-------|
| F-CARTE | Carte temps réel | Carte | actif | FLOW-MAP-SELF-MARKER |
| F-GPS | Navigation GPS | Carte | actif | — |
| F-SIGNAL-VEHICULE | Alerte véhicule | Signalements | actif | FLOW-VEHICLE-ALERT |
| F-SIGNAL-ROUTE | Signalement route | Signalements | actif | — |
| F-ASSIST | Demande d'aide | Signalements | actif | FLOW-ASSIST-REQUEST |
| F-MESSAGES | Messages directs | Messages | actif | FLOW-DIRECT-MESSAGE |
| F-ACTIVITE | Activité (notifications) | Messages | actif | FLOW-BADGES |
| F-APPEL | Appels audio | Messages | actif | — |
| F-SOS | SOS urgence | Signalements | actif | — |
| F-ANGE | Ange IA | Ange | actif | — |
| F-PROFIL | Profil conducteur | Profil | actif | — |

---

## Règle d'ajout de feature

Avant d'ajouter une nouvelle feature au code, compléter dans `knowledge/features.json` :

```json
{
  "id": "F-NOUVELLE",
  "nom": "Nom visible",
  "organe": "Organe responsable",
  "description": "Ce que le conducteur peut faire",
  "actions": ["Action 1", "Action 2"],
  "statut": "actif",
  "flows": []
}
```

Et si l'organe a un nouveau point d'entrée `App.*`, l'ajouter dans `knowledge/organs.json` → `code_entry`.

---

## Détection automatique

```bash
# Rapport complet (stdout)
node scripts/detect-orphan-features.js

# Rapport écrit dans reports/
node scripts/detect-orphan-features.js --save

# Mode CI — exit 1 si HIGH détectés
node scripts/detect-orphan-features.js --check

# Suite de tests
node tests/organism/no-orphan-feature.test.js
```

### Sévérités

| Sévérité | Exemples | Comportement CI |
|----------|----------|-----------------|
| HIGH | Nouveau panel HTML non déclaré, Edge Function inconnue | Bloque (--check exit 1) |
| MEDIUM | App.* non utilitaire non déclaré, événement OBD inconnu | Avertissement seulement |
| LOW | Clé localStorage ic_* inconnue | Informatif |

---

## Éléments whitelistés (déclarés hors features.json)

### Panels connus
`angeOverlay`, `angePanel`, `onboardingOverlay`, `icComposePanel`, `callOverlay`,
`actCatPanel`, `frontCarBanner`, `reportPanel`, `sosPanel`, `nearbyPanel`,
`callContactModal`, `callIncomingPopup`, `callSentBanner`, `callNotAllowedModal`,
`navPremium`, `gpsPanel`, `sigStep1`, `sigStep2`

### Événements OBD connus
`CALL_INITIATED`, `CALL_ACCEPTED`, `CALL_REFUSED`, `CALL_CANCELLED`,
`CALL_RECEIVED`, `CALL_REQUESTED`, `ALERT_SENT`, `ALERT_RESOLVED`, `ALERT_CONFIRMED`,
`MSG_SENT`, `MSG_RECEIVED`, `SOS_TRIGGERED`, `SOS_CANCELLED`,
`AUTH_OK`, `PROFILE_SAVED`, `MAP_LOCATED`, `REPORT_SENT`,
`ASSIST_REQUESTED`, `ASSIST_RESOLVED`

### Edge Functions connues
`immat-brain-dialog`, `create-call-request`, `respond-call-request`

### Clés localStorage ic_* connues
`deleted_msgs`, `muted`, `invisible`, `sounds`, `voice`,
`gps_favs`, `gps_hist`, `last_plate`, `last_role`,
`call_prefs`, `nearby_radius`, `unread_msg_count`, `last_state`

---

*Mis à jour automatiquement — SESSION OBD-002 — 2026-06-04*
