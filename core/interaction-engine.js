/* interaction-engine.js — SESSION 27-30
 * Moteur d'interactions unifié — stockage, OBD, historique filtré.
 * INV-OBD-001 : chaque interaction émet un événement OBD avec flow_id + invariant.
 * INV-COM-025 : getHistory() filtre les interactions BLOCK_ALL.
 */
(function(){
  'use strict';

  if (window.__InteractionEngineV2 && window.InteractionEngine) return;
  window.__InteractionEngineV2 = true;

  const STORAGE_KEY      = 'ic_interactions';
  const NOTIF_KEY        = 'ic_notifications';
  const MAX_INTERACTIONS = 200;
  const MAX_NOTIFS       = 100;

  const STATUSES = {
    PENDING:'pending', RECEIVED:'received', VIEWED:'viewed', RESPONDED:'responded',
    ACCEPTED:'accepted', REJECTED:'rejected', EXPIRED:'expired', RESOLVED:'resolved',
    ARCHIVED:'archived', CANCELLED:'cancelled', BLOCKED:'blocked', FAILED:'failed'
  };

  const VALID_STATUSES = new Set(Object.values(STATUSES));

  const TYPE_META = {
    MESSAGE:          { obd: 'MSG_SENT',             flow: 'FLOW-MESSAGE',        invariants: ['INV-COM-001'] },
    THANKS:           { obd: 'MSG_SENT',             flow: 'FLOW-MESSAGE',        invariants: ['INV-COM-001'] },
    CALL:             { obd: 'CALL_INITIATED',        flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003'] },
    VEHICLE_ALERT:    { obd: 'VEHICLE_MESSAGE_SENT', flow: 'FLOW-VEHICLE-ALERT',  invariants: ['INV-COM-001'] },
    ROAD_ALERT:       { obd: 'ROAD_CREATED',         flow: 'FLOW-ROAD-SIGNAL',    invariants: ['INV-COM-011'] },
    HELP:             { obd: 'HELP_CREATED',          flow: 'FLOW-ASSIST-REQUEST', invariants: ['INV-COM-005'] },
    SOS:              { obd: 'SOS_TRIGGERED',         flow: 'FLOW-SOS',            invariants: ['INV-COM-014'] },
    TRUST:            { obd: 'CONTACT_TRUSTED',       flow: 'FLOW-TRUST',          invariants: ['INV-COM-018'] },
    BLOCK:            { obd: 'BLOCK_APPLIED',         flow: 'FLOW-BLOCK',          invariants: ['INV-COM-019'] },
    ABUSE:            { obd: 'ABUSE_REPORTED',        flow: 'FLOW-ABUSE',          invariants: ['INV-COM-029'] },
    CONTACT_REQUEST:  { obd: 'CONTACT_TRUSTED',       flow: 'FLOW-TRUST',          invariants: ['INV-COM-030'] },
    CONTACT_ACCEPTED: { obd: 'CONTACT_TRUSTED',       flow: 'FLOW-TRUST',          invariants: ['INV-COM-030'] },
    CONTACT_REJECTED: { obd: 'CONTACT_REVOKED',       flow: 'FLOW-TRUST',          invariants: ['INV-COM-030'] },
    CALL_REQUEST:     { obd: 'CALL_INITIATED',        flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003'] },
    CALL_ACCEPTED:    { obd: 'CALL_ACCEPTED',         flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003'] },
    CALL_REFUSED:     { obd: 'CALL_REFUSED',          flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003'] },
    CALL_MISSED:      { obd: 'CALL_MISSED',           flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003','INV-CALL-001'] },
    CALL_CANCELLED:   { obd: 'CALL_CANCELLED',        flow: 'FLOW-CALL-REQUEST',   invariants: ['INV-COM-003'] },
    /* Phase B WebRTC — SESSION 30 — réservés, non activés (INV-CALL-002) */
    CALL_CONNECTED:   { obd: 'CALL_CONNECTED',        flow: 'FLOW-008-B',          invariants: ['INV-CALL-002'], reserved: true },
    CALL_ENDED:       { obd: 'CALL_ENDED',            flow: 'FLOW-008-B',          invariants: ['INV-CALL-002'], reserved: true },
    CALL_FAILED:      { obd: 'CALL_FAILED',           flow: 'FLOW-008-B',          invariants: ['INV-CALL-002'], reserved: true },
    CALL_NETWORK_LOST:{ obd: 'CALL_NETWORK_LOST',     flow: 'FLOW-008-B',          invariants: ['INV-CALL-002'], reserved: true },
    CALL_RECONNECTED: { obd: 'CALL_RECONNECTED',      flow: 'FLOW-008-B',          invariants: ['INV-CALL-002'], reserved: true }
  };

  const nPlate = p => String(p||'').replace(/[\s-]/g,'').toUpperCase();
  const _load  = key => { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch(e) { return []; } };
  const _save  = (key, list) => { try { localStorage.setItem(key, JSON.stringify((list||[]).slice(-MAX_INTERACTIONS))); } catch(e) {} };
  const _uuid  = () => (crypto?.randomUUID ? crypto.randomUUID() : 'ie-' + Date.now() + '-' + Math.random().toString(16).slice(2));

  function _emitObd(interaction) {
    const meta = TYPE_META[interaction?.type] || {};
    if (!meta.obd || meta.reserved) return;
    const flow = interaction.flow_id || meta.flow || null;
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

  function create(input) {
    input = input || {};
    const meta       = TYPE_META[input.type] || {};
    const flow_id    = input.flow_id || null;
    const invariants = input.invariants || null;
    const interaction = {
      id:          _uuid(),
      type:        input.type || 'MESSAGE',
      initiator:   nPlate(input.initiator),
      target:      input.target ? nPlate(input.target) : null,
      timestamp:   new Date().toISOString(),
      payload:     input.payload || {},
      status:      input.status || STATUSES.PENDING,
      obd_events:  meta.obd ? [meta.obd] : [],
      journey_id:  input.journey_id || null,
      flow_id:     flow_id || meta.flow || null,
      invariants:  invariants || meta.invariants || []
    };
    const list = _load(STORAGE_KEY);
    list.push(interaction);
    _save(STORAGE_KEY, list);
    _emitObd(interaction);
    return interaction;
  }

  function updateStatus(id, newStatus) {
    if (newStatus && !VALID_STATUSES.has(newStatus)) return false;
    const list = _load(STORAGE_KEY);
    const item = list.find(i => i.id === id);
    if (!item) return false;
    item.status = newStatus || STATUSES.RESOLVED;
    _save(STORAGE_KEY, list);
    return true;
  }

  function getHistory(plate, opts) {
    const p     = nPlate(plate);
    const limit = opts?.limit || 50;
    let list    = _load(STORAGE_KEY);
    // INV-COM-025 : exclure les interactions avec conducteurs BLOCK_ALL
    list = list.filter(i => {
      const bl = window.ImmatMessages?.getBlockLevel?.(nPlate(i.initiator)) || null;
      return bl !== 'BLOCK_ALL';
    });
    if (p) list = list.filter(i => nPlate(i.initiator) === p || nPlate(i.target) === p);
    return list.slice(-limit).reverse();
  }

  function createNotification(input) {
    input = input || {};
    const notif = {
      id:             _uuid(),
      interaction_id: input.interaction_id || null,
      type:           input.type || 'INFO',
      plate:          nPlate(input.plate),
      message:        input.message || '',
      created_at:     new Date().toISOString(),
      viewed:         false
    };
    const list = _load(NOTIF_KEY);
    list.push(notif);
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify((list||[]).slice(-MAX_NOTIFS))); } catch(e) {}
    return notif;
  }

  function getNotifications({viewed=null, limit=50, plate=null}={}) {
    let list = _load(NOTIF_KEY);
    if (plate)         list = list.filter(n => nPlate(n.plate) === nPlate(plate));
    if (viewed !== null) list = list.filter(n => n.viewed === viewed);
    return list.slice(-limit).reverse();
  }

  function markNotificationViewed(id) {
    const list = _load(NOTIF_KEY);
    const n    = list.find(x => x.id === id);
    if (!n) return false;
    n.viewed = true;
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list)); } catch(e) {}
    return true;
  }

  function search(opts={}) {
    let list = getHistory(opts.plate, {limit: opts.limit || 100});
    if (opts.type)     list = list.filter(i => i.type === opts.type);
    if (opts.dateFrom) list = list.filter(i => i.timestamp >= opts.dateFrom);
    if (opts.dateTo)   list = list.filter(i => i.timestamp <= opts.dateTo);
    return list;
  }

  function getAnalytics(plate) {
    const list      = getHistory(plate, {limit: 1000});
    const by_type   = {};
    const by_status = {};
    list.forEach(i => {
      by_type[i.type]     = (by_type[i.type]     || 0) + 1;
      by_status[i.status] = (by_status[i.status] || 0) + 1;
    });
    return {
      total:          list.length,
      by_type,
      by_status,
      total_messages: (by_type.MESSAGE||0) + (by_type.THANKS||0),
      total_calls:    (by_type.CALL||0) + (by_type.CALL_REQUEST||0),
      total_alerts:   (by_type.VEHICLE_ALERT||0) + (by_type.ROAD_ALERT||0),
      total_help:     by_type.HELP  || 0,
      total_sos:      by_type.SOS   || 0,
      total_trust:    by_type.TRUST || 0,
      total_blocks:   by_type.BLOCK || 0,
      total_abuse:    by_type.ABUSE || 0
    };
  }

  function getRuntimeState() {
    try {
      const list = _load(STORAGE_KEY);
      const notifs = _load(NOTIF_KEY);
      const byType = {};
      list.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
      return {
        hasLedger: true,
        eventCount: list.length,
        notificationCount: notifs.length,
        unviewedNotifications: notifs.filter(n => !n.viewed).length,
        byType,
        lastEventType: list.length ? list[list.length - 1].type : null,
        lastEventAt: list.length ? list[list.length - 1].timestamp : null,
        failedWrites: 0,
        lastLedgerError: null,
        canRebuildConversation: false,
      };
    } catch(e) {
      return { hasLedger: false, error: String(e?.message || e) };
    }
  }

  const InteractionEngine = {
    create,
    resolve:                     (id, status) => updateStatus(id, status || STATUSES.RESOLVED),
    updateStatus,
    observe:                     _emitObd,
    getHistory,
    getHistoryUnified:           (plate, opts) => ({
      interactions: getHistory(plate, opts),
      unreadCount:  0,
      lastActivity: getHistory(plate, opts)[0]?.timestamp || null
    }),
    notifyPending:               plate => getHistory(plate, {limit:100}).filter(i => i.status === STATUSES.PENDING).length,
    createNotification,
    getNotifications,
    markNotificationViewed,
    getPendingNotificationCount: plate => getNotifications({viewed:false, plate}).length,
    search,
    getAnalytics,
    getRuntimeState,
    STATUSES,
    VALID_STATUSES,
    TYPE_META
  };
  window.InteractionEngine = InteractionEngine;
})();
