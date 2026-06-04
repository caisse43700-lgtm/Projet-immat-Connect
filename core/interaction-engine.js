/* interaction-engine.js — SESSION 27 — Phase 1/2
 * Objet Interaction : stockage ic_interactions + historique unifié + badge unifié
 * Backward compatible : ne remplace pas messages.js / calls.js (SESSION 28)
 * INV-OBD-001 : chaque Interaction émet un OBD event avec flow_id + invariant
 */
'use strict';
if (window.__InteractionEngineV1) return;
window.__InteractionEngineV1 = true;

const InteractionEngine = (function () {

  const STORAGE_KEY     = 'ic_interactions';
  const MAX_INTERACTIONS = 200;

  // Type → OBD event + flow + invariant (INV-OBD-001)
  const TYPE_META = {
    MESSAGE:       { obd: 'MSG_SENT',             flow: 'FLOW-001', invariants: ['INV-COM-001'] },
    THANKS:        { obd: 'MSG_SENT',             flow: 'FLOW-001', invariants: ['INV-COM-001'] },
    CALL:          { obd: 'CALL_INITIATED',        flow: 'FLOW-008', invariants: ['INV-COM-003'] },
    VEHICLE_ALERT: { obd: 'VEHICLE_MESSAGE_SENT', flow: 'FLOW-005', invariants: ['INV-COM-001'] },
    ROAD_ALERT:    { obd: 'ROAD_CREATED',          flow: 'FLOW-007', invariants: ['INV-COM-011'] },
    HELP:          { obd: 'HELP_CREATED',          flow: 'FLOW-003', invariants: ['INV-COM-005'] },
    SOS:           { obd: 'SOS_TRIGGERED',         flow: 'FLOW-SOS', invariants: ['INV-COM-014'] },
    TRUST:         { obd: 'CONTACT_TRUSTED',       flow: 'FLOW-TRUST', invariants: ['INV-COM-018'] },
    BLOCK:         { obd: 'BLOCK_APPLIED',         flow: 'FLOW-BLOCK', invariants: ['INV-COM-019'] },
  };

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

  // ── Phase 1 : Création et stockage ─────────────────────────────────────────

  function create({ type, initiator, target, payload, status, journey_id, flow_id, invariants }) {
    const meta = TYPE_META[type] || {};
    const interaction = {
      id:          _uuid(),
      type:        type || 'MESSAGE',
      initiator:   _nPlate(initiator),
      target:      target ? _nPlate(target) : null,
      timestamp:   new Date().toISOString(),
      payload:     payload || {},
      status:      status || 'pending',
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

  function resolve(id, newStatus) {
    const list = _load();
    const item = list.find(i => i.id === id);
    if (item) { item.status = newStatus || 'resolved'; _save(list); }
  }

  // ── Phase 2 : Historique unifié ─────────────────────────────────────────────

  function getHistory(plate, opts) {
    const p = _nPlate(plate);
    if (!p) return [];
    const { limit = 50, types = null, status = null } = opts || {};
    let list = _load();

    // Filtrer par plaque (initiateur ou cible)
    list = list.filter(i => _nPlate(i.initiator) === p || _nPlate(i.target || '') === p);

    // Filtrer par Permissions Matrix (INV-COM-025 : block > trust)
    list = list.filter(i => {
      const other = _nPlate(i.initiator) === p ? i.target : i.initiator;
      if (!other) return true;
      const bl = window.ImmatMessages?.getBlockLevel?.(other) || 'BLOCK_NONE';
      return bl !== 'BLOCK_ALL';
    });

    if (types)  list = list.filter(i => types.includes(i.type));
    if (status) list = list.filter(i => i.status === status);

    return list.slice(-limit).reverse(); // DESC
  }

  // ── Phase 2 : Badge unifié ──────────────────────────────────────────────────

  function notifyPending(plate) {
    const p = _nPlate(plate);
    if (!p) return 0;
    const list = _load();
    return list.filter(i => _nPlate(i.target || '') === p && i.status === 'pending').length;
  }

  // ── observe() : alias public pour ré-émettre un OBD depuis une interaction ──

  function observe(interaction) {
    _emitObd(interaction);
  }

  return { create, resolve, getHistory, notifyPending, observe, TYPE_META };

})();

window.InteractionEngine = InteractionEngine;
