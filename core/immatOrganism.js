/* core/immatOrganism.js — ImmatOrganism V1 : Phase 1 Observateur
 *
 * Noyau vivant d'ImmatConnect.
 * Phase 1 : observe, journalise, détecte. Ne bloque rien.
 *
 * Branchements actifs :
 *   - bus d'événements (ImmatBus)
 *   - validation invariants (ImmatBrain, phase 1)
 *   - journal de violations
 *
 * Usage :
 *   ImmatOrganism.init();
 *   ImmatOrganism.observe('CALL_REQUESTED', { plate, source });
 */
'use strict';

const ImmatOrganism = (function () {
  let _initialized = false;
  let _bus = null;
  let _brain = null;

  // ── Init ────────────────────────────────────────────────────────
  function init(options) {
    if (_initialized) return;
    _initialized = true;

    _bus   = (typeof ImmatBus   !== 'undefined') ? ImmatBus   : null;
    _brain = (typeof ImmatBrain !== 'undefined') ? ImmatBrain : null;

    if (_bus) {
      // Écouter toutes les violations et les journaliser
      _bus.on('INVARIANT_VIOLATED', entry => {
        _log('warn', '[INV] ' + entry.payload.invariant + ' — ' + entry.payload.label, entry.payload);
      });

      // Journal général de tous les événements (phase 1)
      _bus.on('*', entry => {
        _log('info', '[BUS] ' + entry.event, entry.payload);
      });
    }

    _log('info', 'ImmatOrganism V1 initialisé — Phase 1 Observateur', { phase: _brain?.getPhase?.() || 1 });
  }

  // ── Observation ──────────────────────────────────────────────────
  function observe(eventName, payload) {
    if (!_initialized) return;
    if (_bus) _bus.emit(eventName, payload);
  }

  // ── Validations exposées (délèguent à ImmatBrain) ────────────────

  function canRequestCall(context) {
    if (!_brain) return true;
    return _brain.canRequestCall(context);
  }

  function canDisplayVehicleOnMap(context) {
    if (!_brain) return true;
    return _brain.canDisplayVehicleOnMap(context);
  }

  function classifyEntity(entity) {
    if (!_brain) return 'unknown';
    return _brain.classifyEntity(entity);
  }

  function validateInvariant(invId, passes, context) {
    if (!_brain) return passes;
    return _brain.validateInvariant(invId, passes, context);
  }

  // ── Journal interne ──────────────────────────────────────────────
  function _log(level, msg, data) {
    const prefix = '[ImmatOrganism]';
    try {
      if (level === 'warn') console.warn(prefix, msg, data || '');
      else console.info(prefix, msg, data || '');
    } catch (e) {}
  }

  function getJournal() {
    return _bus ? _bus.getJournal() : [];
  }

  // ── API publique ─────────────────────────────────────────────────
  return {
    init,
    observe,
    canRequestCall,
    canDisplayVehicleOnMap,
    classifyEntity,
    validateInvariant,
    getJournal,
  };
})();

if (typeof module !== 'undefined') module.exports = { ImmatOrganism };
