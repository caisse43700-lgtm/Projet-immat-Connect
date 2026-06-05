# Amélioration Navigation Fonctionnalités

# ORGANE COMMUNICATION UNIFIÉ — IMMATCONNECT
# DAM-COMMUNICATION · VERSION CANONIQUE UNIFIÉE
# Sessions Phone 1 + Phone 2 + Phone 3 fusionnées

---

## VISION

La communication n'est pas une fonctionnalité.
C'est un organe vivant de l'organisme ImmatConnect.

Le conducteur ne doit jamais avoir l'impression d'utiliser une messagerie,
un journal d'appels, un système de permissions ou de confiance.

Il doit simplement ressentir : **"Je contacte un conducteur."**

---

## RÈGLE FONDAMENTALE

```
UNE RELATION = UNE CONVERSATION = UNE TIMELINE UNIQUE
```

Tout événement vit dans cette timeline : messages, appels, contexte, système.

---

## PHASE 1 — IMPLÉMENTATION IMMÉDIATE

### 1.1 Interface Messages (redesign iMessage-style)

**Vue liste conversations**
- Une ligne par relation
- Contenu : avatar véhicule · plaque · dernier événement · heure · badge non lu · niveau confiance · appel manqué · favori
- Tri : activité récente
- Actions : ouvrir · archiver · bloquer · favori
- Boutons : nouvelle conversation · recherche

**Vue thread (fil de discussion)**

Header :
- Retour · Avatar · Plaque · Statut relation · Bouton Appel · Menu

Timeline unifiée (tout fusionné, ordre chronologique) :
- Messages reçus → gauche
- Messages envoyés → droite
- Appels reçus → gauche
- Appels émis → droite
- Appels manqués → centré
- Appels refusés → centré
- Carte contexte signalement → visible en haut du fil si actif

Compositeur :
- Champ texte · Réponses rapides · Envoyer

**Réponses rapides selon contexte**

Signalement :
- Merci · Je vérifie · Je déplace le véhicule · C'est réglé

Demande aide :
- J'arrive · Je peux aider · Impossible pour moi

Général :
- Bien reçu · Je m'arrête · 🙏 Merci

---

### 1.2 Paramètres Appels (nouvelle section dans Settings)

**Niveau de permission appel**
- Niveau 1 : Personne
- Niveau 2 : Contacts de confiance uniquement
- Niveau 3 : Confiance + contexte actif
- Niveau 4 : Tout le monde

**Toggles**
- Recevoir demandes contact
- Recevoir appels confiance
- Recevoir appels contextuels
- Favoris prioritaires
- Blocage automatique spam
- Prévisualisation contexte

**Mode Ne pas déranger**
- Jours configurables
- Plage horaire (ex : 22h → 7h)
- Exceptions : confiance · favoris · urgence · contexte actif

---

### 1.3 Mise à jour referentiels knowledge

**Nouvelles features (knowledge/features.json)**

```
F-CONVERSATION-ENGINE  — Moteur unique de toute communication
F-TRUST                — Gestion confiance conducteurs
F-CALL-PERMISSIONS     — Paramètres et niveaux d'autorisation appel
F-PRESENCE             — Statuts disponibilité conducteur
F-FAVORITES            — Conversations épinglées
F-ARCHIVE              — Archivage local conversations
F-SEARCH               — Recherche dans les conversations
F-SPAM-PROTECTION      — Détection et blocage spam
```

**Nouvelles intentions (knowledge/intentions.json)**

```
INT-SEND-MESSAGE
INT-RECEIVE-MESSAGE
INT-CALL-DRIVER
INT-ANSWER-CALL
INT-REFUSE-CALL
INT-END-CALL
INT-MISS-CALL
INT-MANAGE-TRUST
INT-REVOKE-TRUST
INT-BLOCK-DRIVER
INT-UNBLOCK-DRIVER
INT-CONTACT-FROM-ALERT
INT-REPLY-TO-ALERT
INT-FIND-CONVERSATION
INT-ARCHIVE-CONVERSATION
INT-MANAGE-CALLS
INT-MANAGE-PRESENCE
INT-CONTEXTUAL-CALL
```

**Nouveaux flows (IMMAT-FLOW-INDEX.json)**

```
FLOW-CONVERSATION
FLOW-MESSAGE
FLOW-CALL
FLOW-CALL-CONTEXT
FLOW-TRUST
FLOW-BLOCK
FLOW-SEARCH
FLOW-ARCHIVE
FLOW-FAVORITE
FLOW-PRESENCE
FLOW-SPAM-PROTECTION
FLOW-ANGE-CALL
```

**Nouveaux invariants (knowledge/communication-invariants.json)**

```
INV-COM-001  Toute interaction appartient à une conversation.
INV-COM-002  Toute conversation possède au minimum deux participants.
INV-COM-003  Tout appel nécessite une permission valide.
INV-COM-004  Un blocage interdit toute communication.
INV-COM-005  Une autorisation contextuelle expire automatiquement.
INV-COM-006  Aucune fonctionnalité communication ne peut être orpheline.
INV-COM-007  Toute observation communication remonte à l'OBD.
INV-COM-008  Toute feature communication possède au minimum un test.
INV-COM-009  Aucune suppression physique d'historique utilisateur.
INV-COM-010  Aucune donnée privée ne remonte au Dashboard Gardien.
```

---

### 1.4 OBD — Événements observés Phase 1

```
MSG_SENT
MSG_RECEIVED
MSG_FAILED
CALL_REQUESTED
CALL_RINGING
CALL_ACCEPTED
CALL_REFUSED
CALL_MISSED
CALL_UNREACHABLE
CALL_CANCELLED
CALL_ENDED
CONTACT_TRUSTED
CONTACT_REVOKED
BLOCK_CREATED
BLOCK_REMOVED
SPAM_DETECTED
CONTEXT_GRANTED
CONTEXT_EXPIRED
```

---

### 1.5 Système de confiance (Trust)

Niveaux :
- NONE
- CONTEXT (lié à un signalement actif)
- TRUSTED (permanent)
- FAVORITE (épinglé + prioritaire)

Création :
- Appel accepté → CONTEXT ou TRUSTED selon config
- Signalement résolu → CONTEXT
- Validation manuelle → TRUSTED ou FAVORITE

Révocation :
- Manuelle uniquement

---

### 1.6 Présence

Statuts :
- Disponible · Conduite · Occupé · Invisible · Hors ligne

Règle : aucune géolocalisation visible dans les statuts.

---

### 1.7 Blocage

Bloque : messages · appels · demandes · notifications · rappels · contextes
Réversible. Conservation de l'historique (pas de suppression physique — INV-COM-009).

---

### 1.8 Anti-spam

Détection :
- Appels répétés · Refus répétés · Demandes excessives

Mesures :
- Cooldown automatique · Limitation · Alerte OBD · Alerte Gardien

---

### 1.9 Fichiers modifiés Phase 1

```
index.html                         — redesign panelMessages + settings appels
messages.js                        — ConversationEngine, timeline unifiée
calls.js                           — intégration timeline, permissions
knowledge/features.json            — 8 nouvelles features
knowledge/intentions.json          — 18 nouvelles intentions
knowledge/communication-invariants.json  — INV-COM-001/010 (nouveau fichier)
architecture/IMMAT-FLOW-INDEX.json — 12 nouveaux flows
tests/organism/organism-features.test.js — couverture nouvelles features
scripts/detect-orphan-features.js  — nouvelles whitelist OBD
scripts/detect-orphan-chain.js     — hints OBD nouvelles features
```

---

## PHASE 2 / PHASE B — VOLONTAIREMENT DIFFÉRÉ

| Composant | Raison |
|-----------|--------|
| WebRTC · CallTransportLayer | Phase B explicite. Infra P2P non prête. |
| DeviceManager | Multi-device — Supabase Realtime à étendre. |
| PushManager | Serveur push VAPID requis. |
| OfflineCommunicationQueue | Dépend DeviceManager. |
| ConflictResolutionPolicy | Multi-device uniquement. |
| ReputationEngine | Phase 3 — score interne. |
| CommunicationSimulator | Après interface stable. |
| CommunicationHealthScore | Après OBD Phase 1 complet. |
| EmergencyLayer | Intégration F-SOS existant. |

---

## CONTRAINTES PERMANENTES

- Aucune modification SQL / schéma DB.
- Tables utilisées : `messages` · `call_requests` · `call_preferences` · `profiles`.
- ANTHROPIC_API_KEY uniquement dans Supabase secrets.
- INV-ORG-001/008 et INV-COM-001/010 respectés.
- Score cohérence organisme : doit rester à 100% OPTIMAL après implémentation.
- Toute nouvelle feature déclarée avant implémentation.

---

## ARCHITECTURE ORGANISME FINALE

```
Conducteur
    ↓
Conversation Engine
    ↓
Messages · Calls · Trust · Block · Permissions · Presence · Notifications
    ↓
ImmatBus
    ↓
ImmatOrganism
    ↓
OBD → Dashboard Gardien
Ange accompagne.
Simulateur protège (Phase 2).
```

---

## CRITÈRE DE COMPLÉTUDE PHASE 1

L'implémentation Phase 1 est complète quand :

- [ ] Interface Messages redesignée (iMessage-style, timeline unifiée)
- [ ] Paramètres Appels implémentés (niveaux 1-4, DND)
- [ ] Confiance (NONE/CONTEXT/TRUSTED/FAVORITE) opérationnelle
- [ ] Features F-CONVERSATION-ENGINE à F-SPAM-PROTECTION déclarées
- [ ] 18 intentions déclarées dans intentions.json
- [ ] 12 flows déclarés dans FLOW-INDEX
- [ ] INV-COM-001/010 déclarés
- [ ] OBD : 18 événements observés
- [ ] Tests organism : score 100% OPTIMAL maintenu
- [ ] detect-orphan-chain → HIGH=0 MEDIUM=0

*DAM-COMMUNICATION — Phase 1 prête à implémenter*
