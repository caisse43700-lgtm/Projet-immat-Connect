# Amélioration Navigation Fonctionnalités

# UX-SCREENS — Tous les écrans, panels et overlays

**Date :** 2026-06-04  
**Source :** index.html (audit exhaustif)  
**Total :** 34 surfaces d'interface identifiées

---

## Hiérarchie des surfaces

```
LANDING (#sw)
  └── AUTH (#sa)
        └── PROFIL SETUP (#sp)
              └── APP SCREEN (#appScreen / #sm)
                    ├── PANELS PRINCIPAUX (bottom sheet tabs)
                    │     ├── panelAltet         ← défaut
                    │     ├── panelDrive
                    │     ├── panelMessages
                    │     ├── panelSettings
                    │     └── panelActivite
                    ├── OVERLAYS TEMPORAIRES
                    │     ├── reportPanel        ← signalement
                    │     ├── nearbyPanel        ← conducteurs proches
                    │     ├── onboardingOverlay
                    │     └── angeOverlay / angePanel
                    ├── MODAUX APPELS
                    │     ├── callContactModal
                    │     ├── callNotAllowedModal
                    │     ├── callIncomingPopup
                    │     └── callSentBanner
                    ├── MODAUX PROFIL
                    │     ├── drawer
                    │     ├── legal
                    │     ├── blocked
                    │     └── recent
                    ├── MESSAGES SUB-PANELS
                    │     ├── icComposePanel
                    │     ├── icThread
                    │     ├── icContextCard
                    │     ├── icBottomSheet
                    │     └── icSheetBackdrop
                    └── FLOTTANTS
                          ├── floatingCard
                          ├── fabSignalHere
                          ├── frontCarBanner
                          └── toast
```

---

## Pages principales (hors appScreen)

| ID | Nom | Ouverture | Fermeture |
|---|---|---|---|
| `#sw` | Landing / Bienvenue | Chargement initial | `App.goAuth()` |
| `#sa` | Authentification | `App.goAuth('login'/'signup')` | `App.afterAuth()` |
| `#sp` | Profil setup | Après auth, profil incomplet | `App.saveProfile()` |
| `#sm` / `#appScreen` | App principale | Profil complet | — permanent |

---

## Panels principaux (bottom tabs)

| ID | Organe | Ouverture | Fermeture |
|---|---|---|---|
| `panelAltet` | RADAR / SIGNAL | `App.panel('altet')` · `App.navMap()` | Autre panel |
| `panelDrive` | ROUTE | `App.panel('drive')` · drawer | Autre panel |
| `panelMessages` | CONTACT | `App.panel('messages')` · `App.startMsgs()` | Autre panel |
| `panelSettings` | MOI | `App.panel('settings')` · drawer | Autre panel |
| `panelActivite` | AIDE · CONTACT | `App.panel('activite')` · `App.navActivite()` | Autre panel |

---

## Sous-panels du signalement (dans panelAltet)

| ID | Description | Ouverture | Fermeture |
|---|---|---|---|
| `reportPanel` | Panel signalement — overlay | `App.navSignaler()` · `App.openReport()` | `App.closeOverlay('reportPanel')` · `App.sigDone()` |
| `sigStep1` | Étape 1 : choix catégorie | Ouvert par défaut dans reportPanel | `sigBack()` |
| `sigStep2Route` | Étape 2 : types route | `App.sigStepRoute()` | `App.sigBack()` |
| `sigStep2Vehicle` | Étape 2 : types véhicule | `App.sigStepVehicle()` | `App.sigBack()` |
| `sigStep2Aide` | Étape 2 : types aide | `App.sigStepAide()` | `App.sigBack()` |
| `alertHistoryBox` | Historique mes alertes | Visible si alertHistory.length > 0 | Auto-masqué |

---

## Sous-panels des messages (dans panelMessages)

| ID | Description | Ouverture | Fermeture |
|---|---|---|---|
| `icComposePanel` | Composer nouveau message | `ImmatMessages.setMode('compose')` | `ImmatMessages.closeCompose()` |
| `icThread` | Fil de conversation | `ImmatMessages.openThread(plate)` | `ImmatMessages.closeThread()` |
| `icContextCard` | Alerte active liée au contact | Automatique si alerte active sur plate | Auto-masqué |
| `icSheetBackdrop` | Fond semi-transparent bottom sheet | `ImmatMessages.openThreadMenu()` | `ImmatMessages.closeSheet()` · tap |
| `icBottomSheet` | Menu thread (fav/arch/trust/del) | `ImmatMessages.openThreadMenu()` | Action ou tap backdrop |

---

## Sous-panels de l'activité (dans panelActivite)

| ID | Description | Ouverture | Fermeture |
|---|---|---|---|
| `actMain` | Écran principal Activité | Défaut dans panelActivite | — |
| `actCatPanel` | Sous-catégorie (Route/Véhicule/Aide/Tout) | `App.openActivityCat(cat)` | `App.closeActivityCat()` |

---

## Overlays

| ID | Type | Ouverture | Fermeture |
|---|---|---|---|
| `nearbyPanel` | overlay | `App.openNearby()` | `App.closeOverlay('nearbyPanel')` · `×` |
| `onboardingOverlay` | overlay | Première connexion | `App.dismissOnboarding()` |
| `angeOverlay` / `angePanel` | overlay | Bouton Ange (FAB ou menu) | `×` |

---

## Modaux appels

| ID | Type | Ouverture | Fermeture |
|---|---|---|---|
| `callContactModal` | modal | `CallManager.openContactOptions(plate)` | `CallManager.closeContactModal()` · Annuler |
| `callNotAllowedModal` | modal | `CallManager._showCallsNotAllowed(plate)` | `CallManager.closeNotAllowedModal()` · Fermer |
| `callIncomingPopup` | popup | Realtime INSERT call_requests (receiver) | `acceptCall()` · `refuseCall()` · TTL expire |
| `callSentBanner` | banner | `CallManager._showSentBanner(plate,id)` | `cancelCallRequest()` · TTL 8s |

---

## Modaux profil / navigation

| ID | Type | Ouverture | Fermeture |
|---|---|---|---|
| `drawer` | drawer slide | `App.openDrawer()` · avatar tap | `App.closeDrawer()` · navigation |
| `legal` | modal | `App.openLegal()` | `App.closeLegal()` |
| `blocked` | modal | `App.openBlocked()` | `App.closeBlocked()` |
| `recent` | modal | `App.openRecent()` | `App.closeRecent()` |

---

## Éléments flottants permanents

| ID | Type | Condition d'affichage |
|---|---|---|
| `floatingCard` | floating card | `App.showFloatingCard(...)` — alerte, helper, message, SOS |
| `fabSignalHere` | FAB | Long press carte → tapLat/tapLng définis |
| `frontCarBanner` | banner | Véhicule < 30m détecté sur la même route |
| `toast` | toast | `App.toast(msg, type)` ou `toast()` global |

---

## Sheet principal (tabs navigation)

| ID | Description | Ouverture |
|---|---|---|
| `sheet` | Conteneur tabs bas d'écran | Permanent en appScreen |
| `sheetArrowOpen` | Flèche ouverture | Tap |

---

## Écran Gardien

| ID | Description | Condition |
|---|---|---|
| Dashboard Gardien | Overlay complet | `body.is-gardien` seulement · `App.openGardienDashboard()` |

---

## Résumé par catégorie

| Catégorie | Count |
|---|---|
| Pages (hors appScreen) | 3 |
| Panels principaux | 5 |
| Sous-panels signalement | 6 |
| Sous-panels messages | 5 |
| Sous-panels activité | 2 |
| Overlays | 3 |
| Modaux appels | 4 |
| Modaux profil | 4 |
| Éléments flottants | 4 |
| Sheet nav | 1 |
| **TOTAL** | **37** |
