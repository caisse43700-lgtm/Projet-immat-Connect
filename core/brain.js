/* core/brain.js — ImmatBrain : API de décision ImmatOrganism V1
 *
 * Phase 1 : toutes les méthodes journalisent et retournent true (observateur).
 * Phase 3 : certaines méthodes retourneront false pour bloquer les violations.
 */
'use strict';

const { INVARIANTS } = typeof require !== 'undefined'
  ? require('./invariants')
  : { INVARIANTS: (typeof window !== 'undefined' && window._INVARIANTS) || {} };

const { ImmatBus, EVENTS } = typeof require !== 'undefined'
  ? require('./bus')
  : { ImmatBus: (typeof window !== 'undefined' && window.ImmatBus), EVENTS: {} };

const ImmatBrain = (function () {
  let _phase = 1; // 1=Observateur 2=Conseiller 3=Gardien

  // ── Utilitaire interne ────────────────────────────────────────────
  function _audit(invId, context, violation) {
    const inv = INVARIANTS[invId];
    if (!inv) return;
    if (violation && ImmatBus) {
      ImmatBus.emit(EVENTS.INVARIANT_VIOLATED, {
        invariant: invId,
        label: inv.label,
        severity: inv.severity,
        context,
        phase: _phase,
      });
    }
  }

  // ── API publique ──────────────────────────────────────────────────

  function setPhase(phase) {
    _phase = phase;
  }

  function getPhase() {
    return _phase;
  }

  /**
   * Un véhicule peut-il apparaître sur la carte ?
   * INV-001 : jamais.
   */
  function canDisplayVehicleOnMap(context) {
    _audit('INV-001', context, true);
    if (_phase >= 3) return false;
    return true; // Phase 1-2 : observe seulement
  }

  /**
   * Un signalement véhicule peut-il entrer dans S.alerts ?
   * INV-001, INV-002 : jamais.
   */
  function canAddVehicleToAlerts(context) {
    _audit('INV-001', context, true);
    _audit('INV-002', context, true);
    if (_phase >= 3) return false;
    return true;
  }

  /**
   * Une demande de contact peut-elle être émise ?
   * INV-007 : uniquement via Contacter dans un contexte véhicule/route/aide.
   */
  function canRequestCall(context) {
    const hasContext = context && (context.plate || context.alertId || context.source === 'vehicle_contact');
    if (!hasContext) _audit('INV-007', context, true);
    if (_phase >= 3 && !hasContext) return false;
    return true;
  }

  /**
   * Une bannière de demande de contact peut-elle bloquer l'accueil ?
   * INV-008 : non.
   */
  function canShowPersistentCallBanner(context) {
    _audit('INV-008', context, true);
    if (_phase >= 3) return false;
    return true;
  }

  /**
   * Un badge peut-il afficher un compte > données réelles ?
   * INV-005 : non.
   */
  function computeBadge(realCount) {
    const n = Math.max(0, Number(realCount) || 0);
    return n;
  }

  /**
   * Vérifie un invariant par id et journalise si violation.
   */
  function validateInvariant(invId, passes, context) {
    _audit(invId, context, !passes);
    return passes;
  }

  /**
   * Classifie une entité pour déterminer son organe propriétaire.
   */
  function classifyEntity(entity) {
    if (!entity) return 'unknown';
    const group = entity.group || entity.type || '';
    if (group === 'vehicle' || group === 'vehicule') return 'VehicleOrgan';
    if (group === 'route') return 'RouteOrgan';
    if (group === 'assist' || group === 'aide') return 'HelpOrgan';
    return 'unknown';
  }

  /**
   * Émet un audit complet de l'état courant.
   */
  function audit(context) {
    if (ImmatBus) {
      ImmatBus.emit('AUDIT_REQUESTED', { context, phase: _phase, at: Date.now() });
    }
    return { phase: _phase, invariants: Object.keys(INVARIANTS).length };
  }

  return {
    setPhase,
    getPhase,
    canDisplayVehicleOnMap,
    canAddVehicleToAlerts,
    canRequestCall,
    canShowPersistentCallBanner,
    computeBadge,
    validateInvariant,
    classifyEntity,
    audit,
  };
})();

if (typeof module !== 'undefined') module.exports = { ImmatBrain };
