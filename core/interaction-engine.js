/* interaction-engine.js — SESSION 27 (Phase 1→F) + Audit A-001→A-005
 * Objet Interaction central : create / history / status / notify / search / analytics
 * Backward compatible : ne remplace pas messages.js / calls.js (SESSION 28)
 * INV-OBD-001 : chaque Interaction émet un OBD event avec flow_id + invariant
 * INV-INT-001→008 : grammaire métier universelle
 * INV-CALL-002 : modèle Interaction extensible WebRTC sans migration (RÉSERVÉ SESSION 30)
 * INV-COM-029 : tout abus = Interaction · INV-COM-030 : tout contact = Interaction
 * INV-GUARD-001 : toute Recommendation Guardian référence une Interaction
 */
'use strict';
if (window.__InteractionEngineV2) return;
window.__InteractionEngineV2 = true;

const InteractionEngine = (function () {

  const STORAGE_KEY     = 'ic_interactions';
  const NOTIF_KEY       = 'ic_notifications';
  const MAX_INTERACTIONS = 200;
  const MAX_NOTIFS       = 100;

  // ── 27C — Statuts normalisés (INV-INT-003) ───────────────────────────────────
  const STATUSES = {
    PENDING:    'pending',
    RECEIVED:   'received',
    VIEWED:     'viewed',
    RESPONDED:  'responded',
    ACCEPTED:   'accepted',
    REJECTED:   'rejected',
    EXPIRED:    'expired',
    RESOLVED:   'resolved',
    ARCHIVED:   'archived',
    CANCELLED:  'cancelled',
    BLOCKED:    'blocked',
    FAILED:     'failed',
  };
  const VALID_STATUSES = new Set(Object.values(STATUSES));

  // ── TYPE_META — OBD event + flow + invariant (INV-OBD-001) ──────────────────
  const TYPE_META = {
    // Actions conducteur de base
    MESSAGE:          { obd: 'MSG_SENT',              flow: 'FLOW-001', invariants: ['INV-COM-001'] },
    THANKS:           { obd: 'MSG_SENT',              flow: 'FLOW-001', invariants: ['INV-COM-001'] },
    CALL:             { obd: 'CALL_INITIATED',         flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    VEHICLE_ALERT:    { obd: 'VEHICLE_MESSAGE_SENT',  flow: 'FLOW-005', invariants: ['INV-COM-001'] },
    ROAD_ALERT:       { obd: 'ROAD_CREATED',           flow: 'FLOW-007', invariants: ['INV-COM-011'] },
    HELP:             { obd: 'HELP_CREATED',           flow: 'FLOW-003', invariants: ['INV-COM-005'] },
    SOS:              { obd: 'SOS_TRIGGERED',          flow: 'FLOW-SOS', invariants: ['INV-COM-014'] },
    TRUST:            { obd: 'CONTACT_TRUSTED',        flow: 'FLOW-TRUST', invariants: ['INV-COM-018'] },
    BLOCK:            { obd: 'BLOCK_APPLIED',          flow: 'FLOW-BLOCK', invariants: ['INV-COM-019'] },
    ABUSE:            { obd: 'ABUSE_REPORTED',         flow: 'FLOW-ABUSE', invariants: ['INV-COM-026', 'INV-COM-029'] },
    // Cycle contact (INV-COM-030)
    CONTACT_REQUEST:  { obd: 'CONTACT_TRUSTED',        flow: 'FLOW-TRUST', invariants: ['INV-COM-018', 'INV-COM-030'] },
    CONTACT_ACCEPTED: { obd: 'CONTACT_TRUSTED',        flow: 'FLOW-TRUST', invariants: ['INV-COM-018', 'INV-COM-030'] },
    CONTACT_REJECTED: { obd: 'CONTACT_REVOKED',        flow: 'FLOW-TRUST', invariants: ['INV-COM-018', 'INV-COM-030'] },
    // Cycle appel granulaire Phase A
    CALL_REQUEST:     { obd: 'CALL_INITIATED',         flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    CALL_ACCEPTED:    { obd: 'CALL_ACCEPTED',           flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    CALL_REFUSED:     { obd: 'CALL_REFUSED',            flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    CALL_MISSED:      { obd: 'CALL_MISSED',             flow: 'FLOW-008', invariants: ['INV-COM-003', 'INV-CALL-001'] },
    CALL_CANCELLED:   { obd: 'CALL_CANCELLED',          flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    // ── A-002 WebRTC Phase B — RÉSERVÉ SESSION 30 (INV-CALL-002) ─────────────────
    // Le modèle Interaction est déjà prêt : aucune migration de structure requise.
    CALL_CONNECTED:    { obd: 'CALL_CONNECTED',    flow: 'FLOW-008-B', invariants: ['INV-COM-003', 'INV-CALL-002'], reserved: true },
    CALL_ENDED:        { obd: 'CALL_ENDED',         flow: 'FLOW-008-B', invariants: ['INV-COM-003', 'INV-CALL-002'], reserved: true },
    CALL_FAILED:       { obd: 'CALL_FAILED',        flow: 'FLOW-008-B', invariants: ['INV-COM-003', 'INV-CALL-002'], reserved: true },
    CALL_NETWORK_LOST: { obd: 'CALL_NETWORK_LOST',  flow: 'FLOW-008-B', invariants: ['INV-COM-003', 'INV-CALL-002'], reserved: true },
    CALL_RECONNECTED:  { obd: 'CALL_RECONNECTED',   flow: 'FLOW-008-B', invariants: ['INV-COM-003', 'INV-CALL-002'], reserved: true },
  };

  // ── Utilitaires ──────────────────────────────────────────────────────────────

  function _nPlate(p) {
    return String(p || '').replace(/[\s-]/g, '').toUpperCase();
  }

  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
  }

  function _save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_INTERACTIONS))); } catch(e) {}
  }

  function _emitObd(interaction) {
    const meta = TYPE_META[interaction.type];
    if (!meta) return;
    const flow = interaction.flow_id || meta.flow || 'FLOW-UNKNOWN';
    const inv  = (interaction.invariants || meta.invariants || [])[0] || null;
    try {
      window.ImmatOrganism?.observe?.(meta.obd, {
        interactionId: interaction.id,
        type:          interaction.type,
        flow_id:       flow,
        invariant:     inv,
        _src:          'ImmatConnect/InteractionEngine'
      });
    } catch(e) {}
  }

  // ── Phase 1 — Création ───────────────────────────────────────────────────────

  function create({ type, initiator, target, payload, status, journey_id, flow_id, invariants }) {
    const meta = TYPE_META[type] || {};
    const st = VALID_STATUSES.has(status) ? status : STATUSES.PENDING;
    const interaction = {
      id:          _uuid(),
      type:        type || 'MESSAGE',
      initiator:   _nPlate(initiator),
      target:      target ? _nPlate(target) : null,
      timestamp:   new Date().toISOString(),
      payload:     payload || {},
      status:      st,
      obd_events:  meta.obd ? [meta.obd] : [],
      journey_id:  journey_id || null,
      flow_id:     flow_id || meta.flow || null,
      invariants:  invariants || meta.invariants || [],
    };
    const list = _load();
    list.push(interaction);
    _save(list);
    _emitObd(interaction);
    return interaction;
  }

  // ── 27C — Mise à jour de statut normalisé (INV-INT-003) ─────────────────────

  function updateStatus(id, newStatus) {
    if (!VALID_STATUSES.has(newStatus)) return false;
    const list = _load();
    const item = list.find(i => i.id === id);
    if (item) { item.status = newStatus; _save(list); return true; }
    return false;
  }

  function resolve(id, newStatus) {
    return updateStatus(id, newStatus || STATUSES.RESOLVED);
  }

  // ── Phase 2 — Historique filtré (INV-COM-025) ────────────────────────────────

  function getHistory(plate, opts) {
    const p = _nPlate(plate);
    if (!p) return [];
    const { limit = 50, types = null, status = null } = opts || {};
    let list = _load();

    list = list.filter(i => _nPlate(i.initiator) === p || _nPlate(i.target || '') === p);
    list = list.filter(i => {
      const other = _nPlate(i.initiator) === p ? i.target : i.initiator;
      if (!other) return true;
      const bl = window.ImmatMessages?.getBlockLevel?.(other) || 'BLOCK_NONE';
      return bl !== 'BLOCK_ALL';
    });

    if (types)  list = list.filter(i => types.includes(i.type));
    if (status) list = list.filter(i => i.status === status);

    return list.slice(-limit).reverse();
  }

  // ── 27B — Historique unifié (INV-INT-001) ────────────────────────────────────

  function getHistoryUnified(plate, opts) {
    const interactions = getHistory(plate, { limit: 100, ...(opts || {}) });
    const unreadCount  = interactions.filter(i =>
      _nPlate(i.target || '') === _nPlate(plate) &&
      (i.status === STATUSES.PENDING || i.status === STATUSES.RECEIVED)
    ).length;
    const lastActivity = interactions.length ? interactions[0].timestamp : null;
    return { interactions, unreadCount, lastActivity };
  }

  // ── Phase 2 — Badge unifié ───────────────────────────────────────────────────

  function notifyPending(plate) {
    const p = _nPlate(plate);
    if (!p) return 0;
    return _load().filter(i => _nPlate(i.target || '') === p && i.status === STATUSES.PENDING).length;
  }

  // ── 27D — Notification Engine (INV-INT-002) ──────────────────────────────────

  function _loadNotifs() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch(e) { return []; }
  }

  function _saveNotifs(list) {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(-MAX_NOTIFS))); } catch(e) {}
  }

  function createNotification({ interaction_id, type, plate, message }) {
    const notif = {
      id:             _uuid(),
      interaction_id: interaction_id || null,
      type:           type || 'INFO',
      plate:          _nPlate(plate || ''),
      message:        message || '',
      created_at:     new Date().toISOString(),
      viewed:         false,
    };
    const list = _loadNotifs();
    list.push(notif);
    _saveNotifs(list);
    return notif;
  }

  function getNotifications({ viewed = null, limit = 50, plate = null } = {}) {
    let list = _loadNotifs();
    if (plate)          list = list.filter(n => _nPlate(n.plate) === _nPlate(plate));
    if (viewed !== null) list = list.filter(n => n.viewed === viewed);
    return list.slice(-limit).reverse();
  }

  function markNotificationViewed(id) {
    const list = _loadNotifs();
    const item = list.find(n => n.id === id);
    if (item) { item.viewed = true; _saveNotifs(list); return true; }
    return false;
  }

  function getPendingNotificationCount(plate) {
    return _loadNotifs().filter(n =>
      !n.viewed && (!plate || _nPlate(n.plate) === _nPlate(plate))
    ).length;
  }

  // ── 27E — Moteur de recherche (INV-INT-001) ──────────────────────────────────

  function search({ plate, type, types, dateFrom, dateTo, status, organ, limit = 100 } = {}) {
    let list = _load();

    if (plate) {
      const p = _nPlate(plate);
      list = list.filter(i => _nPlate(i.initiator) === p || _nPlate(i.target || '') === p);
    }
    if (type)     list = list.filter(i => i.type === type);
    if (types)    list = list.filter(i => types.includes(i.type));
    if (status)   list = list.filter(i => i.status === status);
    if (organ)    list = list.filter(i => (TYPE_META[i.type]?.organ || '') === organ);
    if (dateFrom) list = list.filter(i => new Date(i.timestamp) >= new Date(dateFrom));
    if (dateTo)   list = list.filter(i => new Date(i.timestamp) <= new Date(dateTo));

    return list.slice(-limit).reverse();
  }

  // ── 27F — Analytics Engine (INV-INT-007) ─────────────────────────────────────

  function getAnalytics(plate) {
    let list = _load();
    if (plate) {
      const p = _nPlate(plate);
      list = list.filter(i => _nPlate(i.initiator) === p || _nPlate(i.target || '') === p);
    }
    const counts = {};
    list.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return {
      total:              list.length,
      total_messages:     (counts.MESSAGE  || 0) + (counts.THANKS || 0),
      total_calls:        (counts.CALL     || 0) + (counts.CALL_REQUEST || 0) +
                          (counts.CALL_ACCEPTED || 0) + (counts.CALL_REFUSED || 0) +
                          (counts.CALL_MISSED || 0) + (counts.CALL_CANCELLED || 0),
      total_alerts:       (counts.VEHICLE_ALERT || 0) + (counts.ROAD_ALERT || 0),
      total_help:          counts.HELP     || 0,
      total_sos:           counts.SOS      || 0,
      total_trust:        (counts.TRUST    || 0) + (counts.CONTACT_REQUEST || 0) +
                          (counts.CONTACT_ACCEPTED || 0),
      total_blocks:        counts.BLOCK    || 0,
      total_abuse:         counts.ABUSE    || 0,
      by_type:             counts,
      by_status:           list.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {}),
    };
  }

  // ── observe() — alias public ─────────────────────────────────────────────────

  function observe(interaction) {
    _emitObd(interaction);
  }

  return {
    // Phase 1
    create, resolve, updateStatus, observe,
    // Phase 2
    getHistory, notifyPending,
    // 27B
    getHistoryUnified,
    // 27D
    createNotification, getNotifications, markNotificationViewed, getPendingNotificationCount,
    // 27E
    search,
    // 27F
    getAnalytics,
    // Constantes
    STATUSES, TYPE_META,
  };

})();

window.InteractionEngine = InteractionEngine;
