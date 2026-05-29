/* core/organs/vehicleOrgan.js — VehicleOrgan ImmatOrganism V1
 *
 * Organe responsable des données véhicule.
 * Garde INV-001 (jamais carte) et INV-002 (messages uniquement).
 * Phase 2 — Conseiller : classe, bloque, émet. Ne touche pas à l'UI.
 */
'use strict';

const VehicleOrgan = (function () {

  // Plaques système → jamais des véhicules individuels
  const _SYSTEM_PLATES = Object.freeze(['ROUTE', 'ASSISTANCE', 'CONDUCTEURS']);

  const _log = [];
  const MAX_LOG = 100;

  function _record(type, payload) {
    _log.push({ type, payload: payload || {}, at: Date.now() });
    if (_log.length > MAX_LOG) _log.shift();
  }

  function _bus() {
    return (typeof ImmatBus !== 'undefined') ? ImmatBus : null;
  }

  // ── Classification ────────────────────────────────────────────
  function isVehicleEntity(entity) {
    if (!entity || typeof entity !== 'object') return false;
    const plate = String(entity.plate || entity.target_plate || '').trim().toUpperCase();
    const group = String(entity.group || entity.type || entity.category || '').toLowerCase();
    if (!plate) return false;
    if (_SYSTEM_PLATES.includes(plate)) return false;
    if (['route', 'assist', 'help', 'aide'].includes(group)) return false;
    return true;
  }

  // ── Garde INV-001 : véhicule jamais sur la carte ──────────────
  function guardMapMarker(entity) {
    if (!isVehicleEntity(entity)) return { allowed: true };
    const result = {
      allowed: false,
      invariant: 'INV-001',
      reason: 'Un signalement véhicule ne crée jamais de marqueur carte.',
      entity,
    };
    _record('INV-001-BLOCKED', result);
    const b = _bus();
    if (b) b.emit(b.EVENTS.INVARIANT_VIOLATED, { inv: 'INV-001', context: entity });
    return result;
  }

  // ── Garde INV-002 : véhicule = messages uniquement ────────────
  function guardChannel(entity, channel) {
    if (!isVehicleEntity(entity)) return { allowed: true };
    if (channel === 'messages') return { allowed: true };
    const result = {
      allowed: false,
      invariant: 'INV-002',
      reason: 'Les données véhicule transitent uniquement par messages.',
      entity,
      channel,
    };
    _record('INV-002-BLOCKED', result);
    const b = _bus();
    if (b) b.emit(b.EVENTS.INVARIANT_VIOLATED, { inv: 'INV-002', context: entity });
    return result;
  }

  // ── Événements métier ─────────────────────────────────────────
  function onMessageSent(plate, message) {
    if (!plate || !message) return;
    _record('VEHICLE_MESSAGE_SENT', { plate, message });
    const b = _bus();
    if (b) b.emit(b.EVENTS.VEHICLE_MESSAGE_SENT, { plate, message, at: Date.now() });
  }

  function onMessageReceived(plate, message) {
    if (!plate || !message) return;
    _record('VEHICLE_MESSAGE_RECEIVED', { plate, message });
    const b = _bus();
    if (b) b.emit(b.EVENTS.VEHICLE_MESSAGE_RECEIVED, { plate, message, at: Date.now() });
  }

  // ── Introspection ─────────────────────────────────────────────
  function getLog() { return [..._log]; }
  function clearLog() { _log.length = 0; }

  return {
    isVehicleEntity,
    guardMapMarker,
    guardChannel,
    onMessageSent,
    onMessageReceived,
    getLog,
    clearLog,
  };
})();

if (typeof module !== 'undefined') module.exports = { VehicleOrgan };
