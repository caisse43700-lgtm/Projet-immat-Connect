# REGISTRE DES INTERACTIONS — Module Activité · Signalement véhicule
# Version V1 · 2026-06-25

═══════════════════════════════════════════════════════════════
FLUX COMPLET : A envoie un signalement à B
═══════════════════════════════════════════════════════════════

ÉTAPE 0 — Envoi du signalement
────────────────────────────────

Acteur : A, expéditeur.

Action :
A tape Signaler > Véhicule > envoie le signalement.

Résultat côté A :
Une carte apparaît dans Activité > Véhicule > Envoyés.

Résultat côté B :
Un message est reçu en base avec :

context_type = vehicle_report

─────────────────────────────────────────────────────────────
ÉTAPE 1 — B reçoit le signalement
─────────────────────────────────────────────────────────────

État côté B :
NOUVEAUX.

Carte liste côté B :
- badge rouge "X NOUVEAUX" ;
- dot rouge ;
- aucun chip statut.

Côté A :
Aucune pastille.
La carte Envoyés reste neutre.

Règle produit :
Badge rouge = information nouvelle non vue.

─────────────────────────────────────────────────────────────
ÉTAPE 2a — B ouvre la carte, sans cliquer "Je vérifierai"
─────────────────────────────────────────────────────────────

État côté B :
EN COURS.

Cause :
La lecture suffit à faire sortir le signalement de NOUVEAUX.

Action interne :
- le message est marqué comme lu ;
- son id entre dans ic_read_msg_ids ;
- le badge rouge disparaît.

Carte liste côté B :
- badge rouge disparaît ;
- dot rouge disparaît ;
- chip ⏳ "Vérification en attente" apparaît.

Important :
Le chip ⏳ ne signifie pas seulement "Je vérifierai a été cliqué".
Il signifie plus largement :

le signalement est vu, mais pas encore traité.

Côté A :
Aucun changement visible.

Règle produit :
Statut = action restante.

─────────────────────────────────────────────────────────────
ÉTAPE 2b — B tape "Je vérifierai dès que je serai arrêté"
─────────────────────────────────────────────────────────────

État côté B :
EN COURS.

Action interne :
- localStorage ic_vm_pending ← msgId ;
- Supabase INSERT message ;
- context_type = vehicle_response ;
- contenu : "Je vérifierai dès que je serai arrêté 👀" ;
- toast de confirmation côté B.

Carte liste côté B :
- chip ⏳ "Vérification en attente" reste affiché.

Côté A, liste Envoyés :
- badge vert 📩 "RÉPONSE" sur la carte de la plaque ;
- dot vert ;
- classe act-mod-unread activée.

Côté A, détail Envoyés après ouverture :
- section "Réponses reçues" ;
- carte verte avec le texte reçu ;
- badge 📩 "RÉPONSE" disparaît après consultation.

Règle produit :
Une réponse reçue doit toujours avoir un élément identifiable.

─────────────────────────────────────────────────────────────
ÉTAPE 3 — B donne son verdict
─────────────────────────────────────────────────────────────

4 verdicts possibles :

✅ Signalement confirmé
→ localStorage ic_vm_verdicts { v: 'confirmed', ts }
→ trustDelta(plate, +8)

ℹ️ Problème disparu
→ localStorage ic_vm_verdicts { v: 'gone', ts }

❌ Faux signalement
→ localStorage ic_vm_verdicts { v: 'false', ts }

⏭️ Je n'ai pas pu vérifier
→ localStorage ic_vm_verdicts { v: 'skip', ts }

État côté B après verdict :
TRAITÉS.

Carte liste côté B :
- chip ⏳ disparaît ;
- badge rouge absent ;
- carte affichée dans TRAITÉS ;
- verdict final visible.

Côté A :
Aucune notification automatique du verdict en V1.

Si B avait envoyé "Je vérifierai", A peut déjà avoir reçu cette réponse via vehicle_response.

Dette V1.1 :
Feedback automatique à A quand le verdict est donné, surtout si confirmé.

Règle produit :
Verdict = clôture.

─────────────────────────────────────────────────────────────
ÉTAPE 4 — B contacte A depuis TRAITÉS, optionnel
─────────────────────────────────────────────────────────────

Bouton "💬 Message"
→ ouvre Messages.

Bouton "📞 Appeler"
→ lance une demande d'appel Agora.

Statut produit :
Fonction disponible, mais faible valeur en V1.
À observer terrain.

═══════════════════════════════════════════════════════════════
RÉCAPITULATIF DES PASTILLES PAR ÉTAT
═══════════════════════════════════════════════════════════════

ÉTAT : NOUVEAUX
Côté B, Reçus :
🔴 "X NOUVEAUX"

Côté A, Envoyés :
—

────────────────────────────────

ÉTAT : EN COURS
Côté B, Reçus :
⏳ "Vérification en attente"

Côté A, Envoyés :
—

────────────────────────────────

ÉTAT : TRAITÉS
Côté B, Reçus :
—

Côté A, Envoyés :
—

────────────────────────────────

ÉTAT : Réponse reçue par A
Côté B, Reçus :
—

Côté A, Envoyés :
📩 "RÉPONSE" vert

═══════════════════════════════════════════════════════════════
CE QUI N'EXISTE PAS EN V1
═══════════════════════════════════════════════════════════════

- A ne reçoit aucune notification automatique quand B donne un verdict.
- A ne voit pas l'état NOUVEAUX / EN COURS / TRAITÉS de B.
- Il n'existe pas encore de fil de conversation multi-tours structuré.
- Il n'y a pas d'expiration automatique des EN COURS sans verdict.
- Il n'y a pas de synchronisation localStorage multi-appareils.
- vehicle_response reste dans Activité > Véhicule > Envoyés, pas dans Messages.

═══════════════════════════════════════════════════════════════
RÈGLES PRODUIT ASSOCIÉES
═══════════════════════════════════════════════════════════════

Badge = nouveauté / attention immédiate.

Statut = action restante.

Compteur = historique.

Verdict = clôture.

Une action utilisateur doit produire une conséquence visible.

Aucun badge ne doit exister sans élément identifiable.

L'application porte la mémoire de la tâche.
Le conducteur ne doit pas avoir à se souvenir.
