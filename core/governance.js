/* core/governance.js — Gouvernance ImmatOrganism V1
 *
 * Règles de transition de phase et garde-fous.
 * Une phase ne peut être montée que si les prérequis sont validés.
 */
'use strict';

const PHASE_REQUIREMENTS = Object.freeze({
  1: { label: 'Observateur', requires: [] },
  2: { label: 'Conseiller',  requires: ['journal_ok', 'no_regressions'] },
  3: { label: 'Gardien',     requires: ['journal_ok', 'no_regressions', 'tests_green', 'invariants_stable'] },
  4: { label: 'Coordinateur',requires: ['journal_ok', 'no_regressions', 'tests_green', 'invariants_stable', 'organs_wired'] },
  5: { label: 'Intelligence', requires: ['journal_ok', 'no_regressions', 'tests_green', 'invariants_stable', 'organs_wired', 'human_approval'] },
});

const ImmatGovernance = (function () {

  function canTransitionTo(targetPhase, evidence) {
    const req = PHASE_REQUIREMENTS[targetPhase];
    if (!req) return { allowed: false, reason: 'Phase inconnue' };
    const missing = req.requires.filter(r => !evidence || !evidence[r]);
    if (missing.length > 0) {
      return { allowed: false, reason: 'Prérequis manquants : ' + missing.join(', ') };
    }
    return { allowed: true, reason: 'OK' };
  }

  function describePhase(phase) {
    return PHASE_REQUIREMENTS[phase] || { label: 'Inconnue', requires: [] };
  }

  function listPhases() {
    return Object.entries(PHASE_REQUIREMENTS).map(([id, p]) => ({
      phase: Number(id),
      label: p.label,
      requires: p.requires,
    }));
  }

  return { canTransitionTo, describePhase, listPhases };
})();

if (typeof module !== 'undefined') module.exports = { ImmatGovernance, PHASE_REQUIREMENTS };
