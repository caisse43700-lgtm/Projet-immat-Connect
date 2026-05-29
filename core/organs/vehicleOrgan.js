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

  // ── État interne ──────────────────────────────────────────────
  const _sentAlerts = [];
  const _log = [];
  const MAX_LOG = 100;

  let _supabaseClient = null;
  let _injectedBus    = null;
  let _myPlate = '';
  let _userId  = '';

  function _record(type, payload) {
    _log.push({ type, payload: payload || {}, at: Date.now() });
    if (_log.length > MAX_LOG) _log.shift();
  }

  // Priorise le bus injecté via init() (tests Node.js), sinon global navigateur
  function _bus() {
    if (_injectedBus) return _injectedBus;
    return (typeof ImmatBus !== 'undefined') ? ImmatBus : null;
  }

  function _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Configuration ─────────────────────────────────────────────
  function init(client, opts) {
    _supabaseClient = client || null;
    _myPlate       = (opts && opts.myPlate) ? String(opts.myPlate).trim().toUpperCase() : '';
    _userId        = (opts && opts.userId)  ? String(opts.userId) : '';
    _injectedBus   = (opts && opts.bus)     ? opts.bus : _injectedBus;
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

  // ── VEHICLE-001 : Persist before notify ──────────────────────
  async function createAlert(plate, message, opts) {
    const urgent   = !!(opts && opts.urgent);
    const alertId  = _generateId();
    const b        = _bus();

    // 1. Signale l'intention — avant DB, autorisé
    _record('VEHICLE_ALERT_CREATED', { alertId, plate, message, urgent });
    if (b) b.emit(b.EVENTS.VEHICLE_ALERT_CREATED, { alertId, plate, message, urgent });

    // 2. Persist before notify : INSERT DB avant tout broadcast
    const client = _supabaseClient;
    if (!client) {
      _record('VEHICLE_ALERT_FAILED', { alertId, reason: 'NO_CLIENT' });
      return { alertId: null, error: 'NO_CLIENT' };
    }

    try {
      const rich = { target_plate: plate, receiver_plate: plate, message, status: 'accepted' };
      if (_myPlate)               { rich.sender_plate = _myPlate; rich.from_plate = _myPlate; }
      if (_userId)                  rich.sender_id    = _userId;
      if (opts && opts.receiverId)  rich.receiver_id  = opts.receiverId;

      let { error: dbError } = await client.from('messages').insert(rich);

      // Fallback : colonnes plates non présentes dans ce schéma DB
      if (dbError && /sender_plate|receiver_plate|from_plate|to_plate|column|schema/i.test(String(dbError.message || ''))) {
        const base = { target_plate: plate, message, status: 'accepted' };
        if (_userId)               base.sender_id   = _userId;
        if (opts && opts.receiverId) base.receiver_id = opts.receiverId;
        const r = await client.from('messages').insert(base);
        dbError = r.error;
      }

      if (dbError) {
        _record('VEHICLE_ALERT_FAILED', { alertId, reason: dbError.message || 'DB_ERROR' });
        return { alertId: null, error: dbError };
      }

      // 3. DB confirmé — persister l'état, puis notifier
      const now = Date.now();
      _sentAlerts.push({
        alertId,
        plate,
        senderPlate:  _myPlate,
        message,
        state:        'PERSISTED',
        createdAt:    now,
        persistedAt:  now,
        deliveredAt:  null,
        seenAt:       null,
        repliedAt:    null,
        urgent,
      });

      _record('VEHICLE_ALERT_PERSISTED', { alertId, plate, senderPlate: _myPlate });
      if (b) b.emit(b.EVENTS.VEHICLE_ALERT_PERSISTED, { alertId, plate, senderPlate: _myPlate, at: now });

      return { alertId };

    } catch (e) {
      _record('VEHICLE_ALERT_FAILED', { alertId, reason: e && e.message ? e.message : 'INSERT_FAILED' });
      return { alertId: null, error: e ? (e.message || 'INSERT_FAILED') : 'INSERT_FAILED' };
    }
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
    init,
    isVehicleEntity,
    guardMapMarker,
    guardChannel,
    createAlert,
    onMessageSent,
    onMessageReceived,
    getLog,
    clearLog,
  };
})();

if (typeof module !== 'undefined') module.exports = { VehicleOrgan };
