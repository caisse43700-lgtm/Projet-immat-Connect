# IMMATCONNECT INTERACTION ARCHITECTURE MASTER PLAN

Document de référence commun.

Ce document consolide l'architecture Communiquer / Signaler / Inbox / Outbox / Activity / Dashboard / OBD ainsi que le domaine Véhicule Stationné.

Principes clés :
- Séparé dans l'usage, relié dans l'architecture.
- Messages != Appels != Signalements.
- Inbox, Outbox et Activity sont distincts.
- Les signalements stationnement concernent un propriétaire absent.
- Les notifications ne doivent jamais être perdues.
- Toutes les interactions passent par InteractionEngine.

Compléments obligatoires inclus :
1. Cycle de vie complet des signalements.
2. Cycle de vie complet des messages.
3. Gestion multi-appareils.
4. Fusion intelligente des signalements.
5. ResolutionCenter.
6. Préférences utilisateur.
7. Trust Engine.
8. Règles UX.
9. Cohérence graphique.
10. Recherche globale.
11. Historique véhicule.
12. Gestion grands parkings.
13. Confidentialité et floutage.
14. Dashboard métier.
15. Vision stratégique ImmatConnect.
