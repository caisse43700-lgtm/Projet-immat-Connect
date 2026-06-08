# Référentiel des lois d’interaction — ImmatConnect

## Objectif

Créer un cadre clair, stable et non ambigu pour toutes les interactions de l’application : messages, appels, signalements route, signalements véhicule, demandes d’aide, activité, carte, suppression, notifications et diagnostic OBD.

Ce référentiel doit servir de base avant toute refonte ou correction, afin d’éviter les doublons, les incohérences et les régressions.

## Phrase directrice

```txt
Messages = relation humaine.
Signaler = création d’un événement.
Activité = suivi d’un événement.
Carte = contexte visuel.
Registry = mémoire / reconstruction / diagnostic.
```

Toute décision de code ou d’UX doit pouvoir se justifier par une de ces cinq responsabilités.

## Principes non négociables

- Ne pas refaire une messagerie complète dans Activité.
- Ne pas créer plusieurs fils parallèles pour la même conversation.
- Ne pas mélanger suppression de conversations et suppression d’activités.
- Ne pas supprimer chez l’autre utilisateur quand un utilisateur supprime chez lui.
- Ne pas casser les corrections récentes : sheet mini non bloquant, panels, carte, boutons flottants, véhicules proches.
- Ne pas modifier le service worker ou les règles Supabase/RLS sans audit clair.
- Procéder par petites PR auditables.

## Architecture cible

```txt
Carte
├── contexte visuel
├── véhicules proches
├── alertes autour
└── boutons flottants

Messages
├── conversations
├── nouveau message
├── appels
├── demandes de contact
├── suppression conversations/messages
└── historique communication

Signaler
├── route
├── véhicule
└── aide

Activité
├── route
├── véhicule
├── aide
├── nouveaux
├── en cours
├── traités
└── historique

Registry / Store
├── conversations
├── messages
├── appels
├── aides
├── signalements
├── quick replies
└── événements système
```

## Loi 1 — Responsabilité unique des espaces

Chaque espace a une responsabilité unique.

- Messages = parler / appeler.
- Signaler = créer une alerte.
- Activité = suivre les alertes, aides et signalements.
- Carte = contexte visuel.
- Registry = mémoire / reconstruction / diagnostic.

Aucun écran ne doit faire le travail complet d’un autre.

## Loi 2 — Une seule messagerie principale

Tous les messages écrits doivent converger vers l’espace Messages.

Sources possibles :

- Conducteurs proches → Contact.
- Véhicule sur carte → Message.
- Activité Véhicule → Msg.
- Activité Aide → Message.
- Onglet Messages → Nouveau message.

Destination finale : Messages.

## Loi 3 — Activité est un suivi, pas une conversation

Activité affiche le type d’événement, le statut, l’urgence, la dernière réponse, le dernier message résumé, les actions rapides et un bouton Msg si une conversation est nécessaire.

Activité ne doit pas afficher tout le fil de messages.

## Loi 4 — Route ne contacte pas

Un signalement Route est une information collective.

Route ne doit pas proposer : Message, Appel, Je m’arrête, Je vérifie, Merci.

Route doit proposer : Voir sur carte, Toujours là, Disparu.

## Loi 5 — Véhicule peut contacter

Un signalement Véhicule concerne une plaque ou un conducteur.

Actions autorisées : Je vérifie, Merci, Msg, Appel, Traité.

Le bouton Msg ouvre Messages avec le contexte du signalement. Le bouton Appel crée une demande de contact/appel.

## Loi 6 — Aide est une assistance humaine

Aide est un cas spécial.

Côté demandeur : demande d’aide, statut de prise en charge, Message, Appel, Problème réglé, Annuler.

Côté aidant : J’arrive, Je peux aider, Message, Appel, Impossible.

Quand un aidant clique J’arrive : le demandeur est notifié, le statut passe en cours, une conversation Messages est créée ou ouverte.

## Loi 7 — Tout message doit avoir un contexte

Chaque conversation/message doit pouvoir dire pourquoi il existe.

Types de contexte : direct, vehicle_report, help_request, call_request.

Identifiants : report_id, help_request_id, call_request_id, ou null pour message direct.

## Loi 8 — Une source de vérité par objet

Un événement ne doit exister qu’une fois.

Exemple : un signalement véhicule a un report_id unique. Activité, Messages, Notifications et Registry pointent vers ce report_id.

## Loi 9 — Conversations et messages ont des ID stables

Chaque conversation doit avoir un conversation_id stable.

Chaque message doit avoir un message_id stable.

Chaque message en cours d’envoi doit avoir un client_id temporaire pour éviter les doublons.

## Loi 10 — La mémoire prime sur l’interface

Avant de modifier l’UX, il faut fiabiliser ConversationStore, MessageRegistry, InteractionLedger, la persistance Supabase, le refresh/reload et la reconstruction des threads.

Si les messages disparaissent, ce n’est pas d’abord un problème d’interface : c’est un problème de mémoire, persistance ou reconstruction.

## Loi 11 — Suppression locale par défaut

Quand un utilisateur supprime une conversation ou un message, la suppression est locale à cet utilisateur.

Elle ne doit pas supprimer chez l’autre utilisateur.

Champs recommandés : conversation_user_state.deleted_at et message_user_state.deleted_at.

## Loi 12 — Suppression UX

Liste Messages : swipe gauche sur conversation → Supprimer.

Conversation : swipe gauche ou appui long sur un message → Supprimer.

Menu Messages : Supprimer toutes les conversations, avec confirmation forte.

## Loi 13 — Activité ne se supprime pas comme un message

Activité représente des événements.

Actions recommandées : Traité, Archiver, Masquer, Expiré, Supprimer de mon historique seulement avec confirmation.

Supprimer une conversation ne doit jamais supprimer signalement, aide, alerte ou historique d’activité.

## Loi 14 — Réponse rapide ≠ message écrit

Une réponse rapide est une action de statut.

Un message écrit est une conversation.

Une quick reply doit changer le statut dans Activité, être enregistrée dans le Registry et éventuellement apparaître comme événement système dans Messages.

## Loi 15 — Statuts clairs obligatoires

Ne pas se limiter à Vu.

Statuts recommandés : Nouveau, Vu, Répondu, En attente, En cours, Traité, Expiré, Échec.

## Loi 16 — Chaque événement a une fin

- Route : Confirmé, Disparu, Expiré.
- Véhicule : Traité, Ignoré, Expiré.
- Aide : Problème réglé, Annulé, Aide terminée, Expiré.
- Appel : Accepté, Refusé, Expiré.

## Loi 17 — Expiration automatique

Route, Aide, Appel et Véhicule doivent pouvoir expirer selon un délai adapté.

## Loi 18 — Appel = demande de contact par défaut

Pour la sécurité et la confidentialité, Appel ne doit pas forcément révéler directement le numéro.

Flux recommandé : demande → acceptation/refus → contact possible seulement après acceptation.

## Loi 19 — Conducteurs proches redirige vers Messages

Conducteurs proches → Contact ouvre une conversation existante dans Messages ou Nouveau message avec plaque préremplie.

## Loi 20 — Menu véhicule redirige vers les bons espaces

Depuis un véhicule sur la carte :

- Message → Messages.
- Signaler → Signaler Véhicule.
- Appel → Messages > Appels ou demande contact.
- Bloquer → action confiance/sécurité.

## Loi 21 — Messages a des badges de contexte

Badges possibles : Direct, Véhicule, Aide, Appel.

## Loi 22 — Voir activité liée

Si une conversation vient d’une aide ou d’un signalement, afficher Voir le signalement ou Voir la demande d’aide.

## Loi 23 — Voir sur carte

Les activités importantes doivent proposer Voir sur carte, surtout Route, Aide et Véhicule signalé.

## Loi 24 — Tri par urgence

Activité doit trier intelligemment : Urgent, Aide en cours, Nouveaux, En cours, Traités.

## Loi 25 — Notifications cohérentes

Notifier seulement les événements utiles : nouveau message, nouvelle demande d’appel, appel accepté/refusé, quelqu’un arrive, problème réglé, signalement confirmé/disparu, réponse rapide reçue.

## Loi 26 — Registry / Ledger obligatoire

Créer ou formaliser un registre InteractionLedger ou MessageRegistry.

Événements à tracer : MESSAGE_COMPOSE_OPENED, MESSAGE_SEND_CLICKED, MESSAGE_SEND_SUCCESS, MESSAGE_SEND_FAILED, MESSAGE_RECEIVED, CONVERSATION_OPENED, CONVERSATION_DELETED_FOR_ME, MESSAGE_DELETED_FOR_ME, CALL_REQUEST_CREATED, CALL_ACCEPTED, CALL_REFUSED, CALL_EXPIRED, ACTIVITY_QUICK_REPLY_SENT, HELP_ACCEPTED_JARRIVE, HELP_MARKED_RESOLVED, REPORT_MARKED_STILL_THERE, REPORT_MARKED_GONE, REPORT_MARKED_RESOLVED, PANEL_OPENED, PANEL_CLOSED.

Chaque événement contient event_id, type, user_id, plate, conversation_id, message_id si applicable, context_type, context_id, timestamp, result, error_message si erreur, client_id si applicable.

## Loi 27 — Reconstruction possible

Prévoir RebuildConversation, RepairConversation ou rebuildMessageThreads pour reconstruire une conversation à partir des messages persistés, appels, quick replies, événements d’activité et registry/ledger.

## Loi 28 — OBD messagerie obligatoire

Ajouter un bloc OBD messagesRuntime : hasImmatMessages, init, sendToPlate, refresh, activeConversationId, activePlate, conversationsCount, visibleConversationRows, currentThreadMessagesCount, localPendingMessagesCount, failedMessagesCount, lastSendError, icSendBtnExists, icComposePlateValue, icComposeTextValue, topElementIcSendBtn, currentFilters, deletedLocalCount, archivedCount.

Ajouter recentMessageEvents = 20 derniers événements du ledger.

## Loi 29 — Sécurité / abus

Chaque conversation ou activité sensible doit permettre Bloquer conducteur, Signaler abus, Masquer conducteur, Supprimer conversation, Supprimer message localement.

## Loi 30 — Privacy / RLS

Un utilisateur ne lit que ses conversations, ses messages, ses activités pertinentes, les signalements publics nécessaires et les véhicules visibles autorisés.

Il ne peut pas supprimer chez l’autre, lire les conversations d’autres utilisateurs, voir un téléphone sans acceptation, ou modifier un signalement non autorisé.

## Loi 31 — Compatibilité avec l’existant

Ne pas supprimer brutalement l’existant.

Procéder par couplage progressif : cartographier, créer registry/store, fiabiliser messages, rediriger les anciens boutons, clarifier UX, puis seulement renommer/remplacer les onglets.

## Loi 32 — Patchs progressifs

Ordre recommandé :

1. OBD messagesRuntime.
2. MessageRegistry / ConversationStore.
3. Correction disparition messages.
4. Suppression locale.
5. Redirection Conducteurs proches → Messages.
6. Redirection Activité → Messages avec contexte.
7. Appels sous Messages.
8. Remplacement onglet Carte par Messages.
9. Clarification Activité.
10. Tests complets.

## Loi 33 — Tests obligatoires

Avant merge : envoyer message direct à plaque, fermer/réouvrir conversation, recharger app, vérifier message encore présent, recevoir message, vérifier conversation côté destinataire, supprimer message localement, vérifier qu’il reste chez l’autre, supprimer conversation localement, vérifier qu’elle reste chez l’autre, message depuis Activité Véhicule, message depuis Aide, appel demandé, appel accepté/refusé/expiré, Route Toujours là/Disparu, Véhicule Je vérifie/Traité, Aide J’arrive/Problème réglé, carte récupérable, sheet non bloquant, OBD messagesRuntime OK.

## Loi 34 — Critères d’acceptation

La refonte est acceptable si : une seule messagerie principale, messages persistants après refresh, conversations/messages avec ID stables, contexte rattaché, Activité sans fil complet, Activité avec statut/résumé/actions, Msg depuis Activité ouvre Messages, Contact depuis Conducteurs proches ouvre Messages, Appel est dans Messages, suppression locale OK, Route sans Msg/Appel, Aide avec J’arrive/Message/Appel/Problème réglé, Véhicule avec Je vérifie/Msg/Appel/Traité, sheet/panels non bloquants, OBD capable de reconstituer les problèmes.

## Loi 35 — Priorité d’exécution

Si une seule priorité doit être choisie :

1. OBD messagesRuntime.
2. MessageRegistry / ConversationStore.
3. Correction disparition messages.
4. Suppression locale.
5. Refonte UX progressive.
