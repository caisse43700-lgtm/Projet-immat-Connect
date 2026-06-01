# BRIEF ARCHITECTURE — ImmatConnect × ImmatOrganism
# Document de transmission — à copier-coller dans un assistant IA

---

## CONTEXTE PRODUIT

ImmatConnect Pro est une PWA mobile pour conducteurs.
Stack : HTML/CSS/JavaScript pur, Supabase, Leaflet.

Mission du produit :
- Permettre à des entités responsables de véhicules de communiquer
- Être notifiées d'incidents
- Signaler des dangers
- Comprendre ce qui se passe autour d'elles
- Tout en respectant les tiers

---

## CE QUI EST DÉJÀ CONSTRUIT

### L'application
- Signalement route (roadReport) → accidents, bouchons, obstacles, travaux, contrôles, dangers
- Demande d'aide (assist) → panne, carburant, batterie, moteur, incendie, perdu
- Messagerie entre conducteurs via plaque d'immatriculation (sendToPlate, markThreadRead)
- Appels audio in-app WebRTC (ImmatCall)
- Carte Leaflet avec conducteurs proches en temps réel
- Alertes communautaires en temps réel (Supabase Realtime)
- Badge de notifications (updateActBadge)

### ImmatOrganism V1 — le moteur interne
Cinq fichiers dans core/ :

- invariants.js — 14 règles constitutionnelles immuables (INV-001 à INV-014)
- bus.js — bus d'événements interne (emit / on / off / journal 200 entrées)
- brain.js — validateur des invariants (Phase 1 : observe, ne bloque pas)
- governance.js — cycle de vie et gouvernance
- immatOrganism.js — orchestrateur central

### Câblage bus (Phase 1 — déjà en place)
Toutes les fonctionnalités émettent des événements :

| Fonctionnalité        | Événement bus             | Source                              |
|-----------------------|---------------------------|-------------------------------------|
| Connexion             | init()                    | openMap()                           |
| Signalement route     | ROAD_CREATED              | roadReport()                        |
| Demande d'aide        | HELP_CREATED              | assist()                            |
| Info conducteurs      | VEHICLE_MESSAGE_SENT      | driverInfo()                        |
| Message envoyé        | VEHICLE_MESSAGE_SENT      | sendToPlate()                       |
| Message reçu/lu       | VEHICLE_MESSAGE_RECEIVED  | markThreadRead()                    |
| Badge recalculé       | BADGE_RECOMPUTED          | updateActBadge()                    |
| Appel initié          | CALL_REQUESTED            | ImmatCall.call()                    |
| Appel accepté         | CALL_ACCEPTED             | ImmatCall.accept()                  |
| Appel refusé          | CALL_REFUSED              | ImmatCall.reject()                  |

Chaque événement contient un champ _src qui identifie la fonction émettrice.
Exemple : _src: 'ImmatConnect/roadReport'

Phase actuelle : Phase 1 Observateur — journalise tout, ne bloque rien.

---

## LA VISION — ANALOGIE OBD

ImmatOrganism fonctionne comme l'ordinateur de bord d'un véhicule.

Application = corps
Fonctionnalités = organes
Bus d'événements = système nerveux
Mémoire = expérience (journal 200 événements)
ImmatOrganism = conscience opérationnelle
Claude / IA = valise de diagnostic
diagnose() = prise OBD

Le bus est la prise OBD.
Claude ne s'intègre pas dans l'app.
Il se branche sur la prise quand c'est utile : pour construire, diagnostiquer, détecter des anomalies.
Les violations d'invariants sont les voyants d'alerte — comme les codes défaut OBD.

---

## ARCHITECTURE FINALE RETENUE (4 couches)

```
╔══════════════════════════════════════╗
║  COUCHE 0 — IDENTITÉ                 ║
║  ADN + Invariants                    ║
║  Ce que ImmatConnect EST.            ║
║  Immuable. Tout dérive d'ici.        ║
╠══════════════════════════════════════╣
║  COUCHE 1 — ORGANISME                ║
║  ImmatOrganism + Bus                 ║
║  Ce que ImmatConnect VIT.            ║
║  Émet, reçoit, journalise.           ║
║  diagnose() = la prise OBD           ║
╠══════════════════════════════════════╣
║  COUCHE 2 — FONCTIONNALITÉS          ║
║  Feature Manifests                   ║
║  Ce que ImmatConnect FAIT.           ║
║  Chaque feature déclare son contrat. ║
╠══════════════════════════════════════╣
║  COUCHE 3 — TENSION                  ║
║  Tension Engine                      ║
║  Ce que ImmatConnect DEVRAIT faire.  ║
║  Mesure l'écart entre mission        ║
║  et comportement réel.               ║
╚══════════════════════════════════════╝

          ↕ prise OBD ↕

    Claude / IA / Humain / Outil
```

---

## DÉCISIONS ARCHITECTURALES CLÉS

### Ce qui survit
- ADN + Invariants (identité immuable)
- ImmatOrganism + Bus (déjà construit, opérationnel)
- Feature Manifests (version allégée des Feature Contracts)
- Tension Engine (pièce la plus originale — détecte la dérive de mission)
- diagnose() (la prise OBD — priorité immédiate)

### Ce qui disparaît
- OBD Constitutionnel séparé → les invariants SONT déjà les codes défaut
- Intent Registry formel → les EVENTS sont déjà le registre des intentions
- Immune System → prématuré, émergera du Tension Engine
- Constitution Engine comme couche séparée → ImmatBrain remplit déjà ce rôle

### Ce qui évolue
- Feature Contracts → Feature Manifests (plus légers)
- Mémoire vivante → journal bus + log humain des décisions
- ImmatOrganism → progressive (diagnose() d'abord, autres fonctions ensuite)

---

## CE QUI MANQUE — LA PIÈCE ABSENTE

Le flux actuel est unidirectionnel : l'app parle, Claude écoute.

Ce qui manque : le dialogue.
Claude doit pouvoir interroger l'app, pas seulement la lire.
Exemples :
- "Combien de ROAD_CREATED cette semaine ?"
- "Quel était l'état du badge quand cet invariant a été violé ?"
- "Rejoue la séquence des 10 derniers événements."

Ce n'est pas un monologue — c'est une session de diagnostic.
La prise OBD doit être bidirectionnelle.

---

## PROCHAINE ACTION CONCRÈTE

Écrire ImmatOrganism.diagnose()

C'est la prise. Tant qu'elle n'existe pas, tout le reste reste théorique.

La fonction doit retourner un objet structuré :

```javascript
ImmatOrganism.diagnose() → {
  phase: 1,
  initialized: true,
  health: 'ok' | 'degraded' | 'violated',
  events: [
    // derniers 20 événements du journal
    // format : { event, payload, at, ago }
  ],
  violations: [
    // invariants violés récemment
    // format : { invariant, label, severity, at }
  ],
  summary: "Texte lisible par un humain ou une IA décrivant l'état actuel"
}
```

Contraintes :
- 30-40 lignes maximum
- Zéro impact sur l'app existante
- Aucune donnée personnelle dans le résultat (plaques anonymisées, GPS arrondi)
- Lisible à la fois par un humain dans la console et par une IA via API

---

## CONTRAINTES PERMANENTES DU PROJET

- Ne pas toucher au schéma SQL ni à la base de données
- Ne pas faire de grosse refonte — modifications chirurgicales uniquement
- Phase 1 : le moteur ne bloque jamais l'app
- Les données personnelles ne sortent jamais sans anonymisation (INV-010, INV-014)
- Les invariants sont immuables sauf révision constitutionnelle explicite

---

## QUESTION POUR TOI

Implémente ImmatOrganism.diagnose() dans le fichier core/immatOrganism.js.

La fonction doit :
1. Lire le journal du bus (ImmatBus.getJournal())
2. Identifier les violations d'invariants parmi les événements récents
3. Calculer un état de santé global (ok / degraded / violated)
4. Retourner un objet structuré propre, lisible par un humain ou une IA
5. Anonymiser toute donnée sensible avant de l'inclure
6. Être appelable depuis la console navigateur : ImmatOrganism.diagnose()

Le fichier immatOrganism.js actuel expose déjà :
init, observe, canRequestCall, canDisplayVehicleOnMap,
classifyEntity, validateInvariant, getJournal

Il faut ajouter diagnose() à cette API publique.
