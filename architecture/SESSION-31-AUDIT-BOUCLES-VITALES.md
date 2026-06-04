# Amélioration Navigation Fonctionnalités

# SESSION 31 — AUDIT DES BOUCLES VITALES

> Branche : `claude/immatconnect-pro-app-dEKGR`
> Date : 2026-06-03

---

## MÉTHODE

Lecture complète du code réel : `index.html`, `calls.js`, `messages.js`, `ui.js`.
Vérification de chaque boucle : démarrage → production de valeur → fermeture → retour conducteur.

Notation :
- **0** = inexistante
- **1** = fragile
- **2** = partielle
- **3** = correcte
- **4** = robuste
- **5** = exemplaire

---

## BOUCLE 1 — ORIENTATION — **3/5**

### Théorique
Je suis perdu → Je vois ma position → Je comprends ce qui m'entoure → Je retrouve ma direction

### Implémentation réelle

| Étape | Code | Comportement |
|---|---|---|
| Démarrage | `locate()` → `watchPosition()` | Marqueur + centrage auto au premier fix |
| Position | `S.myLat / S.myLng` | GPS temps réel, mis à jour en continu |
| Conducteurs proches | `loadOthers()` toutes les 8s min | Marqueurs colorés avec direction (heading) |
| Navigation | `pickDest()` + OSRM | Polyline + ETA + recalcul auto > 450m |
| Conduite | `updateNavPremium()` toutes les 5s | Vitesse, ETA, distance, alertes actives |

### Point de fermeture
`stopGps()` → toast "GPS arrêté" + suppression route + arrêt watchPosition. ✅

### Point de rupture
- Mode invisible désactive la localisation (intentionnel, correct)
- L'état "aucun conducteur proche" affiche "Aucun conducteur connecté" dans nearbyPanel — pas d'explication ni d'incitation
- **Gap** : les alertes route sur carte et les conducteurs proches sont bien visibles, mais le conducteur doit naviguer activement vers l'onglet Altet pour voir les incidents — aucun feed passif sur la carte

### Risque utilisateur
Faible. Le conducteur trouve sa position. La navigation fonctionne.

---

## BOUCLE 2 — CONTRIBUTION — **2/5**

### Théorique
Je vois un danger → Je le signale → Quelqu'un le voit → Quelqu'un le confirme → Le danger disparaît → Le signalement est clôturé

### Implémentation réelle

| Étape | Code | Comportement |
|---|---|---|
| Signalement | `roadReport(type)` | Envoi DB + toast ✅ + broadcast realtime |
| Réception par B | `addCommunityAlert()` | FloatingCard + badge Activité |
| Confirmation par B | `actConfirmAlert('present')` | Status local → 'present', broadcast vehicle_seen |
| Clôture par B | `actConfirmAlert('gone')` | Supprime local + UPDATE DB + broadcast |
| Clôture par créateur | `actConfirmAlert('resolved')` via `canResolveAlert()` | Supprime + DB |

### Point de fermeture
La boucle se ferme côté récepteur (B marque "Disparu"). Elle se ferme aussi par TTL (cleanup automatique). ✅

### Point de rupture — CRITIQUE

**Le créateur (A) ne voit jamais que son signalement a été utile.**

- Dans Activité, la card du créateur affiche "Mon signalement" — statut figé
- Quand B marque "Toujours là" ou "Disparu", A n'est pas notifié
- Les retours feedbacks (`signalFeedback()` : "Info utile", "Faux signalement") sont visibles par le récepteur pour évaluer le créateur — mais le créateur ne les voit pas
- Aucun compteur de "X conducteurs ont vu ce signalement"
- `ic_alert_history` garde une trace dans `<details>` déroulable — peu visible

**Exception** : pour alerte véhicule, le code détecte `"note confiance actuelle"` dans les messages reçus → `status='seen_by_driver'` + toast "Le conducteur a vu votre signalement". Mécanisme fragile (parsing textuel) mais présent.

### Risque utilisateur
Moyen. Le conducteur contribue sans savoir si sa contribution a de la valeur. À terme, risque de démotivation = boucle CONTRIBUTION affaiblie.

**Sans modification DB** : aucun compteur de confirmations n'est possible. Seul mécanisme disponible = messages entrants de feedback.

---

## BOUCLE 3 — AIDE — **3/5**

### Théorique
J'ai un problème → Je demande de l'aide → Quelqu'un répond → Quelqu'un arrive → Le problème est résolu

### Implémentation réelle

| Étape | Code | Comportement |
|---|---|---|
| Demande | `assist(type)` | Alerte `group='assist'` + DB + toast 🆘 |
| Réception helper | FloatingCard + Activité | Boutons "✋ J'arrive" / "Je ne peux pas" |
| Acceptation | `actQuickReply('J\'arrive...')` | Message envoyé → parsing "J'arrive" côté demandeur |
| Prise en charge | `_myAssist.status='helper_coming'` | Badge "✋ En route · PLATE" chez demandeur |
| Remerciement | Bouton "🙏 Merci" | Message automatique + toast |
| Résolution | `actConfirmAlert('resolved')` | Clôture + DB |
| Expiration | `cleanupAlerts()` | Notification "Aide non répondue" si TTL écoulé sans helper |

### Point de fermeture
Boucle bien fermée : demande → prise en charge visible → résolution ou expiration notifiée. ✅

### Point de rupture
- La détection "J'arrive" repose sur `_txt.startsWith("J'arrive")` — fonctionne avec le bouton rapide, fragile si texte manuel modifié
- SOS → `assist('panne')` + double confirmation `tel:112` — protection appropriée D-005 ✅
- Si GPS absent → `assist()` bloqué avec toast "Active le GPS" — boucle non démarrable

### Risque utilisateur
Faible-moyen. Le cycle est complet. La dépendance au GPS pour demander de l'aide est contraignante en cas de panne GPS.

---

## BOUCLE 4 — COMMUNAUTÉ — **3/5**

### Théorique
Je vois d'autres conducteurs → J'interagis → Je reçois une réponse → Je crée du lien

### Implémentation réelle

| Étape | Code | Comportement |
|---|---|---|
| Visibilité | Marqueurs Leaflet dans `loadOthers()` | Couleur + direction + distance |
| Nearby panel | `renderNearby()` | Liste avec pseudo, distance, bouton "Contacter" |
| Message | `ImmatMessages.sendToPlate()` | Direct par plaque |
| Appel | `CallManager.requestCall()` | RPC `can_receive_calls()` + bannière |
| Interaction carte | `vehicleContextMenu` | Message / Signaler / Bloquer |

### Point de fermeture
Conversation → réponse → fil visible dans Activité. ✅

### Point de rupture
- Aucun conducteur proche → "Aucun conducteur connecté." sans suggestion d'action
- Appel refusé ou `can_receive_calls=false` → échec silencieux ? (à vérifier)
- La communauté est visible sur la carte mais le conducteur n'a pas d'indicateur du réseau (combien de conducteurs actifs dans la zone, tendance)

### Risque utilisateur
Faible. Les interactions fonctionnent. L'état vide ("aucun proche") peut décourager les nouveaux utilisateurs.

---

## BOUCLE 5 — CONFIANCE — **2/5**

### Théorique
Je contribue → Je constate l'effet → Je comprends que l'app fonctionne → Je lui fais davantage confiance

### Implémentation réelle

| Mécanisme | Code | Comportement |
|---|---|---|
| Historique alertes | `S.alertHistory` (150 max, localStorage) | Persisté entre sessions |
| Affichage historique | `<details id="alertHistoryBox">` | Déroulable dans onglet Altet — **peu visible** |
| Score confiance | `trustDelta()` / `ic_trust_scores` | Calculé localement, affiché dans toast |
| Feedback reçu | `signalFeedback()` | "✅ Info utile · confiance 78%" — vu par le récepteur |
| Badge activité | `actBadge` | Compteur unread visible — signal de valeur reçue |

### Point de fermeture
**La boucle ne se ferme pas pour le créateur de signalement.** Elle se ferme pour le récepteur (il peut confirmer, remercier, évaluer) mais le créateur n'a aucun retour agrégé sur l'utilité de ses actions.

### Point de rupture — CRITIQUE

Même gap que CONTRIBUTION : **l'impact d'une action n'est pas visible à son auteur.**

Le score de confiance (`ic_trust_scores`) n'est jamais affiché proéminement au conducteur lui-même — il sert uniquement au contexte interne.

### Risque utilisateur
Moyen. Sans retour visible sur ses contributions, le conducteur ne perçoit pas la valeur de l'app. Dette de compréhension croissante.

---

## BOUCLE 6 — APPRENTISSAGE — **3/5**

### Théorique
Je découvre → Je comprends → J'utilise → Je maîtrise → J'utilise naturellement

### Implémentation réelle

| Mécanisme | Code | Comportement |
|---|---|---|
| Onboarding | `onboardingOverlay` (ic_onboarded) | Affiché une fois à la première connexion. 5 blocs. |
| Ange | `angeFab` | **Visible pour tous les rôles** via inline style — ✅ |
| États vides | Messages, Activité, Altet | Textes d'aide contextuels présents |
| Ange conducteur | `knowledge-conducteur.ts` 134 lignes | 15 intentions + 10 tutoriels + interactions |

**Clarification importante** : l'agent d'exploration a indiqué à tort que l'AngeFab était réservé aux Gardiens. Le code réel montre que `$('angeFab').style.display='flex'` est appelé pour **tous les rôles** (confirmé dans `knowledge-gardien.ts` : "AngeFab — visible pour TOUS les rôles — ce n'est pas un bug"). ✅

### Point de rupture
- `ic_onboarded` est binaire : l'onboarding ne peut pas être revu. L'accès se fait uniquement via Ange ensuite.
- Pas de tutoriels progressifs in-app (au-delà de l'onboarding unique)
- Fonctionnalités avancées (clic droit carte = FAB, mode invisible, score confiance) peu découvrables sans Ange

### Risque utilisateur
Faible-moyen. Ange est disponible et bien alimenté. Mais la découverte des fonctionnalités avancées dépend entièrement de Ange — aucun mécanisme de suggestion contextuelle automatique.

---

## BOUCLE 7 — RÉTENTION — **2/5**

### Théorique
L'app m'a été utile → Je m'en souviens → Je retrouve rapidement de la valeur → Je reviens naturellement

### Implémentation réelle

| Mécanisme | Code | Comportement |
|---|---|---|
| Badge unread | `actBadge` | Visible à la réouverture si unread |
| Alertes persistantes | `ic_alerts` localStorage | Alertes dans TTL affichées immédiatement |
| Historique alertes | `ic_alert_history` (150 items) | Persisté mais peu visible (déroulable) |
| Favoris GPS | `ic_favorites` | Affichés dans panelDrive |
| Conducteurs récents | `ic_recent_vehicles` | Affichés dans "Véhicules récents" |
| Cache position | `ic_last_state` | Lat/lng/view/radius — pour reprise rapide |
| Push notifications | `Notification.requestPermission()` | Web notifications si permission — pas de service worker |

### Point de fermeture
La valeur immédiate à la réouverture existe : badge + alertes actives + marqueurs. ✅

### Point de rupture
- **Mémoire de valeur** : le conducteur n'a pas de "souvenir de ce que l'app lui a apporté". L'historique est dans `<details>` peu visible.
- **Push web** sans service worker = non fiable sur mobile. L'app ne peut pas rappeler le conducteur hors session.
- La valeur est immédiate si d'autres conducteurs sont actifs. Seul la nuit ou hors zone dense : aucune valeur visible.

### Risque utilisateur
Moyen. La rétention repose entièrement sur la densité du réseau. Si le conducteur est seul dans sa zone, il ne perçoit aucune valeur et n'a aucune raison de revenir.

---

## SYNTHÈSE GLOBALE

| Boucle | Score | État |
|---|---|---|
| ORIENTATION | **3/5** | Correcte |
| CONTRIBUTION | **2/5** | Partielle — créateur sans retour |
| AIDE | **3/5** | Correcte |
| COMMUNAUTÉ | **3/5** | Correcte |
| CONFIANCE | **2/5** | Partielle — impact invisible |
| APPRENTISSAGE | **3/5** | Correcte |
| RÉTENTION | **2/5** | Partielle — réseau-dépendante |

**Score moyen : 2.6/5**

---

## CORRECTIONS RÉELLEMENT NÉCESSAIRES

### Correction 1 — CONTRIBUTION / CONFIANCE : alertHistory peu visible ⚠️

**Gap** : `<details id="alertHistoryBox">` déroulable dans l'onglet Altet — le conducteur ne voit pas facilement son historique de contributions.

**Sans toucher la DB** : l'historique personnel est déjà dans `S.alertHistory` (localStorage). Il est affiché mais enfoui. Une modification mineure de l'onglet Altet pourrait le rendre plus proéminent.

**Risque** : faible — modification UI pure, aucune logique touchée.

> **En attente de validation Gardien avant implémentation.**

### Correction 2 — CONTRIBUTION / CONFIANCE : feedback créateur absent 🔴

**Gap** : le créateur d'un signalement ne voit jamais "X conducteurs ont confirmé votre signalement".

**Impossible sans DB** : les confirmations (actConfirmAlert 'present') ne sont pas agrégées côté serveur. Chaque conducteur confirme localement. Aucune table de comptage n'existe.

**Conclusion** : dette UX documentée. Non implémentable sans évolution DB. À prioriser dans une future session.

### Correction 3 — RÉTENTION : dépendance réseau 🟡

**Gap** : valeur nulle si aucun conducteur proche. Pas de push web fiable.

**Sans service worker** : aucune solution technique disponible. C'est une limite structurelle du web.

**Conclusion** : risque documenté, non corrigeable en session. Stratégie à définir (service worker, PWA).

---

## À NE JAMAIS MODIFIER

- La logique `canResolveAlert()` — protège le créateur comme seul propriétaire de la clôture
- Les statuts `seen / present / gone / resolved` — DEC-007 clos
- `clearSignalHereContext()` — cycle de vie FAB
- `setUnreadMsgCount` inline dans index.html — BUG-001

---

## RISQUES RÉSIDUELS

| Risque | Probabilité | Impact |
|---|---|---|
| Créateur démotivé (contributions sans retour) | Moyen | Moyen — boucles CONTRIBUTION + CONFIANCE |
| Réseau vide (rétention nulle hors zone dense) | Moyen | Moyen — boucle RÉTENTION |
| Parsing "J'arrive" fragile | Faible | Faible — bouton rapide couvre le cas principal |
| Onboarding non rejoutable | Faible | Faible — Ange compense |

---

## RÉPONSE À LA QUESTION FINALE

### L'organisme est-il vivant ?

**Oui — avec deux boucles incomplètes.**

Les 7 boucles tournent. Aucune n'est inexistante (0) ni cassée (1). Les boucles ORIENTATION, AIDE, COMMUNAUTÉ et APPRENTISSAGE fonctionnent correctement.

**Mais deux boucles ne se referment pas complètement :**

1. **CONTRIBUTION** (2/5) : le conducteur agit, le signalement part, mais il ne sait jamais si son action a protégé quelqu'un. La boucle produit de la valeur pour les autres mais pas pour lui.

2. **CONFIANCE** (2/5) : l'impact des actions du conducteur n'est pas visible. Le score de confiance existe mais n'est pas restitué. L'historique existe mais est enfoui.

Ces deux gaps partagent la même racine : **l'absence de retour visible sur la contribution personnelle.**

C'est exactement la dette de compréhension identifiée dans DECISIONS-FINALES-CONSOLIDEES.md :

> *"Ajouter plus vite que le conducteur ne comprend."*

L'organisme n'a pas ajouté trop vite. Mais il n'a pas encore fermé la boucle qui dit au conducteur : **"Tu as été utile."**
