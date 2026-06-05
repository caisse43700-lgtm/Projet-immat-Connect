/* interaction-engine.js — safe runtime shim
 * Correctif urgence : évite le `return` global illégal dans un script navigateur.
 * API minimale compatible avec AngeAction / OBD / historique local.
 */
(function(){
  'use strict';

  if (window.__InteractionEngineV2 && window.InteractionEngine) return;
  window.__InteractionEngineV2 = true;

  const STORAGE_KEY = 'ic_interactions';
  const NOTIF_KEY = 'ic_notifications';
  const MAX_INTERACTIONS = 200;
  const MAX_NOTIFS = 100;

  const STATUSES = {
    PENDING:'pending', RECEIVED:'received', VIEWED:'viewed', RESPONDED:'responded',
    ACCEPTED:'accepted', REJECTED:'rejected', EXPIRED:'expired', RESOLVED:'resolved',
    ARCHIVED:'archived', CANCELLED:'cancelled', BLOCKED:'blocked', FAILED:'failed'
  };

  const TYPE_META = {
    MESSAGE:{obd:'MSG_SENT',flow:'FLOW-001',invariants:['INV-COM-001']},
    THANKS:{obd:'MSG_SENT',flow:'FLOW-001',invariants:['INV-COM-001']},
    CALL:{obd:'CALL_INITIATED',flow:'FLOW-008',invariants:['INV-COM-003']},
    VEHICLE_ALERT:{obd:'VEHICLE_MESSAGE_SENT',flow:'FLOW-005',invariants:['INV-COM-001']},
    ROAD_ALERT:{obd:'ROAD_CREATED',flow:'FLOW-007',invariants:['INV-COM-011']},
    HELP:{obd:'HELP_CREATED',flow:'FLOW-003',invariants:['INV-COM-005']},
    SOS:{obd:'SOS_TRIGGERED',flow:'FLOW-SOS',invariants:['INV-COM-014']},
    TRUST:{obd:'CONTACT_TRUSTED',flow:'FLOW-TRUST',invariants:['INV-COM-018']},
    BLOCK:{obd:'BLOCK_APPLIED',flow:'FLOW-BLOCK',invariants:['INV-COM-019']},
    ABUSE:{obd:'ABUSE_REPORTED',flow:'FLOW-ABUSE',invariants:['INV-COM-026']},
    CONTACT_REQUEST:{obd:'CONTACT_TRUSTED',flow:'FLOW-TRUST',invariants:['INV-COM-018']},
    CONTACT_ACCEPTED:{obd:'CONTACT_TRUSTED',flow:'FLOW-TRUST',invariants:['INV-COM-018']},
    CONTACT_REJECTED:{obd:'CONTACT_REVOKED',flow:'FLOW-TRUST',invariants:['INV-COM-018']},
    CALL_REQUEST:{obd:'CALL_INITIATED',flow:'FLOW-008',invariants:['INV-COM-003']},
    CALL_ACCEPTED:{obd:'CALL_ACCEPTED',flow:'FLOW-008',invariants:['INV-COM-003']},
    CALL_REFUSED:{obd:'CALL_REFUSED',flow:'FLOW-008',invariants:['INV-COM-003']},
    CALL_MISSED:{obd:'CALL_MISSED',flow:'FLOW-008',invariants:['INV-COM-003','INV-CALL-001']},
    CALL_CANCELLED:{obd:'CALL_CANCELLED',flow:'FLOW-008',invariants:['INV-COM-003']}
  };

  const nPlate = p => String(p||'').replace(/[\s-]/g,'').toUpperCase();
  const load = key => { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch(e) { return []; } };
  const save = (key, list, max) => { try { localStorage.setItem(key, JSON.stringify((list||[]).slice(-max))); } catch(e) {} };
  const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'ie-' + Date.now() + '-' + Math.random().toString(16).slice(2));

  function emit(interaction){
    const meta = TYPE_META[interaction?.type] || {};
    if (!meta.obd) return;
    try {
      window.ImmatOrganism?.observe?.(meta.obd, {
        interactionId: interaction.id,
        type: interaction.type,
        flow_id: interaction.flow_id || meta.flow,
        invariant: (interaction.invariants || meta.invariants || [])[0] || null,
        _src: 'ImmatConnect/InteractionEngine'
      });
    } catch(e) {}
  }

  function create(input){
    input = input || {};
    const meta = TYPE_META[input.type] || {};
    const interaction = {
      id: uuid(),
      type: input.type || 'MESSAGE',
      initiator: nPlate(input.initiator),
      target: input.target ? nPlate(input.target) : null,
      timestamp: new Date().toISOString(),
      payload: input.payload || {},
      status: input.status || STATUSES.PENDING,
      obd_events: meta.obd ? [meta.obd] : [],
      journey_id: input.journey_id || null,
      flow_id: input.flow_id || meta.flow || null,
      invariants: input.invariants || meta.invariants || []
    };
    const list = load(STORAGE_KEY);
    list.push(interaction);
    save(STORAGE_KEY, list, MAX_INTERACTIONS);
    emit(interaction);
    return interaction;
  }

  function updateStatus(id, status){
    const list = load(STORAGE_KEY);
    const item = list.find(i => i.id === id);
    if (!item) return false;
    item.status = status || STATUSES.RESOLVED;
    save(STORAGE_KEY, list, MAX_INTERACTIONS);
    return true;
  }

  function getHistory(plate, opts){
    const p = nPlate(plate);
    const limit = opts?.limit || 50;
    let list = load(STORAGE_KEY);
    if (p) list = list.filter(i => nPlate(i.initiator) === p || nPlate(i.target) === p);
    return list.slice(-limit).reverse();
  }

  function createNotification(input){
    input = input || {};
    const notif = { id: uuid(), interaction_id: input.interaction_id || null, type: input.type || 'INFO', plate: nPlate(input.plate), message: input.message || '', created_at: new Date().toISOString(), viewed: false };
    const list = load(NOTIF_KEY);
    list.push(notif);
    save(NOTIF_KEY, list, MAX_NOTIFS);
    return notif;
  }

  function getNotifications({viewed=null, limit=50, plate=null}={}){
    let list = load(NOTIF_KEY);
    if (plate) list = list.filter(n => nPlate(n.plate) === nPlate(plate));
    if (viewed !== null) list = list.filter(n => n.viewed === viewed);
    return list.slice(-limit).reverse();
  }

  function markNotificationViewed(id){
    const list = load(NOTIF_KEY);
    const n = list.find(x => x.id === id);
    if (!n) return false;
    n.viewed = true;
    save(NOTIF_KEY, list, MAX_NOTIFS);
    return true;
  }

  function search(opts={}){ return getHistory(opts.plate, {limit: opts.limit || 100}).filter(i => !opts.type || i.type === opts.type); }
  function getAnalytics(plate){ const list = getHistory(plate, {limit: 1000}); const by_type = {}; const by_status = {}; list.forEach(i => { by_type[i.type]=(by_type[i.type]||0)+1; by_status[i.status]=(by_status[i.status]||0)+1; }); return {total:list.length, by_type, by_status, total_messages:(by_type.MESSAGE||0)+(by_type.THANKS||0), total_calls:(by_type.CALL||0)+(by_type.CALL_REQUEST||0), total_alerts:(by_type.VEHICLE_ALERT||0)+(by_type.ROAD_ALERT||0), total_help:by_type.HELP||0, total_sos:by_type.SOS||0, total_trust:by_type.TRUST||0, total_blocks:by_type.BLOCK||0, total_abuse:by_type.ABUSE||0}; }

  window.InteractionEngine = {
    create,
    resolve: (id, status) => updateStatus(id, status || STATUSES.RESOLVED),
    updateStatus,
    observe: emit,
    getHistory,
    getHistoryUnified: (plate, opts) => ({ interactions: getHistory(plate, opts), unreadCount: 0, lastActivity: getHistory(plate, opts)[0]?.timestamp || null }),
    notifyPending: plate => getHistory(plate, {limit:100}).filter(i => i.status === STATUSES.PENDING).length,
    createNotification,
    getNotifications,
    markNotificationViewed,
    getPendingNotificationCount: plate => getNotifications({viewed:false, plate}).length,
    search,
    getAnalytics,
    STATUSES,
    TYPE_META
  };
})();
