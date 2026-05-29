/* core/invariants.js — Invariants fondateurs ImmatOrganism V1
 *
 * Source de vérité des règles constitutionnelles.
 * Aucune logique métier ici — uniquement des déclarations.
 */
'use strict';

function _deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(k => {
    const v = obj[k];
    if (v && typeof v === 'object') _deepFreeze(v);
  });
  return Object.freeze(obj);
}

const INVARIANTS = _deepFreeze({
  'INV-001': {
    id: 'INV-001',
    label: 'Véhicule jamais carte',
    description: 'Un signalement véhicule ne crée jamais de marqueur, report ou entrée dans S.alerts.',
    severity: 'critical',
  },
  'INV-002': {
    id: 'INV-002',
    label: 'Véhicule = messages uniquement',
    description: 'Les données véhicule transitent uniquement par messages / ImmatMessages / S._actMessages.',
    severity: 'critical',
  },
  'INV-003': {
    id: 'INV-003',
    label: 'Route et Aide = reports / S.alerts',
    description: 'Les signalements route et aide ne passent jamais par le canal messages.',
    severity: 'critical',
  },
  'INV-004': {
    id: 'INV-004',
    label: 'Activité est une vue dérivée',
    description: 'Le panneau Activité ne produit aucune donnée — il les reflète uniquement.',
    severity: 'high',
  },
  'INV-005': {
    id: 'INV-005',
    label: 'Badge = contenu réel',
    description: 'Un badge ne peut jamais indiquer un élément absent de la liste correspondante.',
    severity: 'high',
  },
  'INV-006': {
    id: 'INV-006',
    label: 'Réponse rapide = message',
    description: 'Je m\'arrête / Je vérifie / Merci créent un message réel en base.',
    severity: 'high',
  },
  'INV-007': {
    id: 'INV-007',
    label: 'Appel uniquement via Contacter',
    description: 'Aucune demande de contact sans interaction conducteur contextualisée.',
    severity: 'critical',
  },
  'INV-008': {
    id: 'INV-008',
    label: 'Aucune bannière d\'appel persistante sur l\'accueil',
    description: 'La bannière de demande de contact est non-bloquante et temporaire.',
    severity: 'high',
  },
  'INV-009': {
    id: 'INV-009',
    label: 'Une demande d\'appel n\'est pas un appel',
    description: 'Toute demande de contact requiert acceptation explicite du destinataire.',
    severity: 'critical',
  },
  'INV-010': {
    id: 'INV-010',
    label: 'Aucun numéro exposé',
    description: 'Aucun numéro de téléphone n\'est transmis ou affiché à aucun stade.',
    severity: 'critical',
  },
  'INV-011': {
    id: 'INV-011',
    label: 'Une seule source de vérité',
    description: 'Chaque donnée a une et une seule source canonique.',
    severity: 'high',
  },
  'INV-012': {
    id: 'INV-012',
    label: 'Toute donnée visible existe réellement',
    description: 'Aucune donnée fictive ou estimée ne peut être présentée comme réelle.',
    severity: 'critical',
  },
  'INV-013': {
    id: 'INV-013',
    label: 'Toute interaction a un contexte réel',
    description: 'Aucune interaction hors contexte conducteur/véhicule/route.',
    severity: 'high',
  },
  'INV-014': {
    id: 'INV-014',
    label: 'L\'IA ne décide jamais seule',
    description: 'Toute action critique nécessite le consentement explicite de l\'humain.',
    severity: 'critical',
  },
});

if (typeof module !== 'undefined') module.exports = { INVARIANTS };
