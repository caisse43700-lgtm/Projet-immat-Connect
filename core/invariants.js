/**
 * Invariants constitutionnels d'ImmatConnect — deepFrozen
 * Dérivés de : ADN + F-01/F-22 + VEHICLE-001
 * Toute modification requiert une révision constitutionnelle de type Majeur (voir LIFECYCLE.md)
 *
 * CORR-1 appliquée : INV-011 severity = 'critical' (était 'high' — erreur de sévérité détectée en Audit Ω+)
 */

const invariants = Object.freeze({

  // INV-001 — Cloisonnement canal véhicule
  // Dérivé de : F-03 (Cloisonnement des domaines)
  'INV-001': Object.freeze({
    id: 'INV-001',
    name: 'Cloisonnement canal véhicule',
    rule: 'Les alertes véhicule transitent exclusivement par le canal véhicule.',
    derivedFrom: ['F-03'],
    severity: 'critical',
  }),

  // INV-002 — Cloisonnement canal route
  // Dérivé de : F-03
  'INV-002': Object.freeze({
    id: 'INV-002',
    name: 'Cloisonnement canal route',
    rule: 'Les alertes route transitent exclusivement par le canal route.',
    derivedFrom: ['F-03'],
    severity: 'critical',
  }),

  // INV-003 — Cloisonnement canal aide
  // Dérivé de : F-03
  'INV-003': Object.freeze({
    id: 'INV-003',
    name: 'Cloisonnement canal aide',
    rule: 'Les demandes d\'aide transitent exclusivement par le canal aide.',
    derivedFrom: ['F-03'],
    severity: 'critical',
  }),

  // INV-004 — Atomicité des transactions
  // Dérivé de : F-01 (Primauté de la réalité persistée)
  'INV-004': Object.freeze({
    id: 'INV-004',
    name: 'Atomicité des transactions',
    rule: 'Toute transaction est atomique — elle réussit entièrement ou échoue entièrement.',
    derivedFrom: ['F-01'],
    severity: 'critical',
  }),

  // INV-005 — Fidélité interface
  // Dérivé de : F-07 (Fidélité de l'interface)
  'INV-005': Object.freeze({
    id: 'INV-005',
    name: 'Fidélité interface',
    rule: 'L\'interface affiche uniquement ce qui est persisté en base. Aucun état calculé ou estimé.',
    derivedFrom: ['F-07'],
    severity: 'critical',
  }),

  // INV-006 — Immuabilité des identifiants
  // Dérivé de : ADN-2 (Primauté de l'identifiant officiel)
  'INV-006': Object.freeze({
    id: 'INV-006',
    name: 'Immuabilité des identifiants',
    rule: 'Un identifiant de véhicule ne peut pas être modifié après création. Seule une révision constitutionnelle peut autoriser une exception.',
    derivedFrom: ['ADN-2'],
    severity: 'critical',
  }),

  // INV-007 — Consentement explicite
  // Dérivé de : F-04 (Consentement explicite)
  'INV-007': Object.freeze({
    id: 'INV-007',
    name: 'Consentement explicite',
    rule: 'Aucune action engageante n\'est effectuée sans confirmation explicite de l\'utilisateur.',
    derivedFrom: ['F-04'],
    severity: 'high',
  }),

  // INV-008 — Miroir d'état
  // Dérivé de : F-07
  'INV-008': Object.freeze({
    id: 'INV-008',
    name: 'Miroir d\'état',
    rule: 'L\'interface ne peut pas modifier l\'état du système sans passer par la couche de persistance.',
    derivedFrom: ['F-07', 'F-01'],
    severity: 'critical',
  }),

  // INV-009 — Confirmation avant action irréversible
  // Dérivé de : F-04, F-10
  'INV-009': Object.freeze({
    id: 'INV-009',
    name: 'Confirmation avant action irréversible',
    rule: 'Toute action irréversible requiert une confirmation supplémentaire.',
    derivedFrom: ['F-04', 'F-10'],
    severity: 'high',
  }),

  // INV-010 — Protection données personnelles
  // Dérivé de : F-05
  'INV-010': Object.freeze({
    id: 'INV-010',
    name: 'Protection données personnelles',
    rule: 'Les données personnelles ne circulent jamais sans consentement explicite et documenté.',
    derivedFrom: ['F-05'],
    severity: 'critical',
  }),

  // INV-011 — Unicité de source de vérité
  // Dérivé de : F-02
  // CORR-1 : severity corrigée de 'high' à 'critical' (Audit Ω+)
  // Raison : une violation de l'unicité de source de vérité pour les données
  // d'immatriculation produit une incohérence irréversible dans les notifications.
  'INV-011': Object.freeze({
    id: 'INV-011',
    name: 'Unicité de source de vérité',
    rule: 'Chaque donnée a exactement une source canonique. Toute duplication non contrôlée est une violation.',
    derivedFrom: ['F-02'],
    severity: 'critical',
  }),

  // INV-012 — Persistance avant affichage
  // Dérivé de : F-01, VEHICLE-001
  'INV-012': Object.freeze({
    id: 'INV-012',
    name: 'Persistance avant affichage',
    rule: 'Un état n\'est affiché que s\'il est confirmé en base de données.',
    derivedFrom: ['F-01', 'VEHICLE-001'],
    severity: 'critical',
  }),

  // INV-013 — Traçabilité complète
  // Dérivé de : F-06
  'INV-013': Object.freeze({
    id: 'INV-013',
    name: 'Traçabilité complète',
    rule: 'Toute action est associée à un contexte identifiable (utilisateur, timestamp, session).',
    derivedFrom: ['F-06'],
    severity: 'high',
  }),

  // INV-014 — Non-transfert de données sans consentement
  // Dérivé de : F-04, F-05
  'INV-014': Object.freeze({
    id: 'INV-014',
    name: 'Non-transfert de données sans consentement',
    rule: 'Aucune donnée relative à un utilisateur n\'est transférée à un tiers sans son consentement explicite.',
    derivedFrom: ['F-04', 'F-05'],
    severity: 'critical',
  }),

});

if (typeof window !== 'undefined') window._INVARIANTS = invariants;
if (typeof module !== 'undefined') module.exports = { INVARIANTS: invariants };
