# SESSION CONTINUATION — ImmatConnect Pro

## ⚑ POINT D'ENTRÉE OFFICIEL

> Ce fichier est **le seul point d'entrée** pour toute IA reprenant le projet.
> Aucun fichier de diagnostic, d'audit ou de roadmap ne remplace ce fichier.
> Un nouveau fichier créé pour un diagnostic reste une **annexe** — jamais un point d'entrée.

### Protocole obligatoire pour toute IA

```
AVANT de travailler  → lire ce fichier intégralement
PENDANT le travail   → les diagnostics détaillés sont dans leurs annexes (voir §DOCUMENTS)
AVANT de quitter     → mettre à jour ce fichier (état, preuves, prochain test, prochaine action)
```

**Dernière mise à jour** : 2026-06-11 — Audit post-WebRTC / priorités terrain

---

[CONTENU CONSERVÉ À L'IDENTIQUE]

---

## AUDIT COMPLÉMENTAIRE — APPELS FONCTIONNELS MAIS INCOHÉRENCES RESTANTES

### P0 — Annulation A → B

Constat :
- A annule correctement la demande.
- B peut continuer à sonner ou garder l'écran entrant.
- Dans certains cas B peut encore tenter d'accepter.

Hypothèse validée par audit :
- Listener UPDATE côté requester présent.
- Listener UPDATE équivalent côté receiver absent ou incomplet.

Objectif :
- cancelled / expired / refused / ended doivent fermer immédiatement l'UI de B.
- arrêter sonnerie.
- empêcher Accept.
- nettoyer timers.

### P0 — Acceptation après annulation

Vérifier :
- acceptCall() ne doit jamais lancer CALL_ACCEPTED si la ligne n'est plus pending.
- si UPDATE retourne 0 ligne :
  - fermer UI
  - stop audio
  - afficher "Appel annulé ou expiré"
  - ne jamais démarrer WebRTC

### P1 — Plaque absente côté A

Constat terrain :
- B voit A.
- A ne voit pas toujours B.

Audit :
- showOutgoing dépend de data.to.
- vérifier le passage systématique de la plaque cible jusqu'à CallScreen.

Résultat attendu :
- A voit toujours la plaque appelée.
- B voit toujours la plaque appelante.

### P1 — Raccrochage synchronisé

Tests obligatoires :
- A raccroche → fermeture immédiate chez B.
- B raccroche → fermeture immédiate chez A.
- aucune UI fantôme.
- aucun appel réouvert.

### P2 — Haut-parleur / écouteur

Constat :
- bouton speaker présent.
- comportement réel à vérifier sur iPhone et Android.

Exigence produit :
- mode privé (écouteur) par défaut si supporté.
- activation explicite du haut-parleur.
- mute indépendant du speaker.
- message clair si le navigateur ne permet pas le contrôle de sortie audio.

### ORDRE DE TRAITEMENT

1. Annulation propagée vers B.
2. Blocage acceptation après annulation.
3. Plaque visible côté A.
4. Raccrochage bidirectionnel.
5. Speaker / écouteur + diagnostics.

### TEST TERRAIN FINAL

1. A appelle B.
2. A annule avant réponse.
3. B ne doit plus pouvoir accepter.
4. A appelle B à nouveau.
5. Les deux plaques doivent être visibles.
6. B accepte.
7. Audio bidirectionnel.
8. A raccroche.
9. B ferme immédiatement.
10. Refaire dans l'autre sens.
